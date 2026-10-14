import { useSyncExternalStore } from "react";
import { toast } from "sonner";

import { ErrorClinica, pedirAClinica } from "@/lib/clinica/api";
import { clinicaReal } from "@/lib/clinica/modo-clinica";

/* Ubicación: src/lib/clinica/sincronizar.ts
   GUARDADO EN EL SERVIDOR de los módulos de una clínica real (Etapa 8b).
   Cada módulo del demo (pacientes, agenda, equipo…) se registra acá con su clave. Entonces:
   - al abrirlo se trae del servidor (si no hay nada, empieza vacío);
   - cada cambio se guarda en el servidor (agrupado: medio segundo después del último cambio);
   - si otra persona guardó en el medio, el servidor lo rechaza: se trae lo nuevo y se avisa;
   - cada 20 segundos se fija si alguien de la clínica cambió algo y lo actualiza.
   Nada de esto se guarda en el navegador (son datos de pacientes). */

type Modulo = {
  aplicar: (datos: unknown) => void;
  vacio: () => unknown;
  /** Lo que se manda (sin lo que es solo de esta pantalla, ej. el paciente elegido) */
  paraGuardar: (valor: unknown) => unknown;
};

const modulos = new Map<string, Modulo>();
const versiones = new Map<string, number>(); // -1 = sin permiso para leer
const cargando = new Map<string, Promise<void>>();
const pendientes = new Map<string, { valor: unknown; timer: ReturnType<typeof setTimeout> }>();
const enVuelo = new Set<string>();
// Lo último que se sabe que está en el servidor (para no mandar algo que no cambió)
const ultimo = new Map<string, string>();
const avisadoSinPermiso = new Set<string>();

/* Estado visible ("Guardando…", "Guardado", "Sin conexión") */
type EstadoGuardado = "listo" | "guardando" | "error";
let estado: EstadoGuardado = "listo";
const oyentes = new Set<() => void>();
function ponerEstado(e: EstadoGuardado) {
  if (estado === e) return;
  estado = e;
  oyentes.forEach((o) => o());
}
export function useEstadoGuardado(): EstadoGuardado {
  return useSyncExternalStore(
    (cb) => {
      oyentes.add(cb);
      return () => oyentes.delete(cb);
    },
    () => estado,
    () => "listo",
  );
}
const recalcular = () => ponerEstado(pendientes.size > 0 || enVuelo.size > 0 ? "guardando" : estado === "error" ? "error" : "listo");

export function registrarModulo(clave: string, m: Modulo) {
  modulos.set(clave, m);
  iniciarRevision();
}

/** Trae el módulo del servidor (una sola vez a la vez por módulo). */
export function cargarModulo(clave: string): Promise<void> {
  const ya = cargando.get(clave);
  if (ya) return ya;
  const p = (async () => {
    const c = clinicaReal();
    const m = modulos.get(clave);
    if (!c || !m) return;
    try {
      const r = await pedirAClinica<{ version: number; datos: unknown }>(c.slug, "GET", `/datos/${clave}`);
      versiones.set(clave, r.version);
      ultimo.set(clave, JSON.stringify(r.datos));
      m.aplicar(r.datos);
    } catch (e) {
      const status = e instanceof ErrorClinica ? e.status : 0;
      if (status === 404) {
        versiones.set(clave, 0);
        ultimo.set(clave, JSON.stringify(m.paraGuardar(m.vacio())));
        m.aplicar(m.vacio());
      } else if (status === 403) {
        versiones.set(clave, -1);
        m.aplicar(m.vacio());
      } else if (status !== 401) {
        toast.error("No pudimos traer los datos. Revisá tu internet: se reintenta solo.");
      }
    }
  })().finally(() => cargando.delete(clave));
  cargando.set(clave, p);
  return p;
}

/** Guarda el módulo en el servidor (agrupa los cambios de medio segundo). */
export function guardarModulo(clave: string, valor: unknown) {
  const m = modulos.get(clave);
  // Si lo que se guardaría es igual a lo del servidor (ej. solo cambió el paciente elegido), no se manda nada
  if (m && JSON.stringify(m.paraGuardar(valor)) === ultimo.get(clave)) {
    const previo = pendientes.get(clave);
    if (previo) {
      clearTimeout(previo.timer);
      pendientes.delete(clave);
      recalcular();
    }
    return;
  }
  const previo = pendientes.get(clave);
  if (previo) clearTimeout(previo.timer);
  const timer = setTimeout(() => void enviar(clave), 500);
  pendientes.set(clave, { valor, timer });
  recalcular();
}

async function enviar(clave: string) {
  const p = pendientes.get(clave);
  const c = clinicaReal();
  const m = modulos.get(clave);
  if (!p || !c || !m) return;
  pendientes.delete(clave);
  const version = versiones.get(clave);
  if (version === undefined || version < 0) {
    // Todavía no se trajo, o no tiene permiso: no se guarda nada
    recalcular();
    if (version === -1) {
      // Un aviso por módulo (algunas pantallas guardan solas al abrirse)
      if (!avisadoSinPermiso.has(clave)) toast.error("No tenés permiso para cambiar esto. Hablá con el Administrador de tu clínica.");
      avisadoSinPermiso.add(clave);
    }
    else toast.warning("Esperá un segundo: se están cargando los datos. Después repetí el cambio.");
    return;
  }
  const datos = m.paraGuardar(p.valor);
  enVuelo.add(clave);
  recalcular();
  try {
    const r = await pedirAClinica<{ version: number }>(c.slug, "PUT", `/datos/${clave}`, {
      version,
      datos,
    });
    versiones.set(clave, r.version);
    ultimo.set(clave, JSON.stringify(datos));
    enVuelo.delete(clave);
    ponerEstado(pendientes.size > 0 || enVuelo.size > 0 ? "guardando" : "listo");
  } catch (e) {
    enVuelo.delete(clave);
    const status = e instanceof ErrorClinica ? e.status : 0;
    if (status === 409 || status === 403) {
      toast.warning(e instanceof Error ? e.message : "Otra persona guardó cambios. Repetí el último cambio.");
      await cargarModulo(clave);
      ponerEstado("listo");
    } else if (status === 401) {
      ponerEstado("listo");
    } else {
      ponerEstado("error");
      toast.error(e instanceof Error && e.message ? e.message : "No se pudo guardar. Revisá tu internet.");
      // Se reintenta en 5 segundos con lo último
      pendientes.set(clave, { valor: p.valor, timer: setTimeout(() => void enviar(clave), 5000) });
    }
  }
}

/* Cada 20 segundos (con la pestaña a la vista): ¿alguien de la clínica guardó algo? */
let revisando: ReturnType<typeof setInterval> | null = null;
function iniciarRevision() {
  if (revisando || typeof window === "undefined") return;
  const revisar = async () => {
    const c = clinicaReal();
    if (!c || document.visibilityState !== "visible") return;
    try {
      const servidor = await pedirAClinica<Record<string, number>>(c.slug, "GET", "/datos");
      for (const [clave, v] of Object.entries(servidor)) {
        const local = versiones.get(clave);
        if (local === undefined || local < 0 || !modulos.has(clave)) continue;
        if (v > local && !pendientes.has(clave) && !enVuelo.has(clave)) void cargarModulo(clave);
      }
    } catch {
      /* sin conexión: se vuelve a probar en 20 segundos */
    }
  };
  revisando = setInterval(() => void revisar(), 20_000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void revisar();
  });
}

/** ¿Hay cambios sin guardar? (para avisar antes de cerrar la pestaña) */
export const hayCambiosSinGuardar = () => pendientes.size > 0 || enVuelo.size > 0;

/** ¿Ya se trajo este módulo del servidor (o se sabe que no hay permiso)? */
export function moduloCargado(clave: string): boolean {
  return versiones.has(clave);
}
