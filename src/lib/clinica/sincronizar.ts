import { useSyncExternalStore } from "react";
import { toast } from "sonner";

import { ErrorClinica, pedirAClinica } from "@/lib/clinica/api";
import { clinicaReal, esModoSoporte } from "@/lib/clinica/modo-clinica";

/* Ubicación: src/lib/clinica/sincronizar.ts
   GUARDADO EN EL SERVIDOR de los módulos de una clínica real (Etapa 8b).
   Cada módulo del demo (pacientes, agenda, equipo…) se registra acá con su clave. Entonces:
   - al abrirlo se trae del servidor (si no hay nada, empieza vacío);
   - cada cambio se guarda en el servidor (agrupado: medio segundo después del último cambio);
   - si otra persona guardó en el medio, se trae lo nuevo y se JUNTAN los dos cambios solos
     (cada paciente, turno o registro por separado): no se pierde nada y nadie tiene que repetir;
     solo si los dos cambiaron EXACTAMENTE el mismo dato, queda el último y se avisa;
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

/* ───────────── Juntar cambios hechos al mismo tiempo ─────────────
   base = lo que había en el servidor cuando esta pantalla empezó a cambiar
   mio  = lo que quiere guardar esta pantalla
   suyo = lo que guardó otra persona en el medio
   Se compara dato por dato; en las listas con «id» (pacientes, turnos, registros…), registro
   por registro. Si los dos tocaron lo mismo, queda lo de esta pantalla (es el último cambio). */
type Json = unknown;
const esObjeto = (v: Json): v is Record<string, Json> => typeof v === "object" && v !== null && !Array.isArray(v);
const igual = (a: Json, b: Json) => a === b || JSON.stringify(a) === JSON.stringify(b);
const idDe = (v: Json): string | null =>
  esObjeto(v) && (typeof v["id"] === "string" || typeof v["id"] === "number") ? String(v["id"]) : null;
const listaConIds = (v: Json): v is Json[] => Array.isArray(v) && v.every((x) => idDe(x) !== null);

let choques = 0;
export function juntarCambios(base: Json, mio: Json, suyo: Json): Json {
  if (igual(mio, suyo)) return mio;
  if (igual(base, mio)) return suyo; // esta pantalla no cambió esto
  if (igual(base, suyo)) return mio; // la otra persona no cambió esto
  if (esObjeto(mio) && esObjeto(suyo)) {
    const b = esObjeto(base) ? base : {};
    const out: Record<string, Json> = {};
    for (const k of new Set([...Object.keys(suyo), ...Object.keys(mio)])) {
      const enMio = k in mio;
      const enSuyo = k in suyo;
      if (!enMio && enSuyo && k in b && igual(b[k], suyo[k])) continue; // lo borré yo
      if (enMio && !enSuyo && k in b && igual(b[k], mio[k])) continue; // lo borró el otro
      out[k] = juntarCambios(b[k], enMio ? mio[k] : b[k], enSuyo ? suyo[k] : b[k]);
    }
    return out;
  }
  if (listaConIds(mio) && listaConIds(suyo)) {
    const b = new Map((listaConIds(base) ? base : []).map((x) => [idDe(x)!, x]));
    const m = new Map(mio.map((x) => [idDe(x)!, x]));
    const t = new Map(suyo.map((x) => [idDe(x)!, x]));
    const out: Json[] = [];
    const orden = [...suyo.map((x) => idDe(x)!), ...mio.map((x) => idDe(x)!).filter((id) => !t.has(id))];
    for (const id of orden) {
      const xb = b.get(id);
      const xm = m.get(id);
      const xt = t.get(id);
      if (xm === undefined && xb !== undefined && (xt === undefined || igual(xb, xt))) continue; // lo borré yo
      if (xt === undefined && xb !== undefined && (xm === undefined || igual(xb, xm))) continue; // lo borró el otro
      out.push(juntarCambios(xb, xm ?? xb ?? xt, xt ?? xb ?? xm));
    }
    return out;
  }
  // Los dos cambiaron el mismo dato: queda el último (el de esta pantalla)
  choques++;
  return mio;
}

/** Otra persona guardó en el medio: se trae lo nuevo, se juntan los cambios y se vuelve a guardar. */
async function guardarJuntando(slug: string, clave: string, m: Modulo, mio: Json): Promise<boolean> {
  const base = JSON.parse(ultimo.get(clave) ?? "null") as Json;
  for (let intento = 0; intento < 6; intento++) {
    // Si hay mucha gente guardando a la vez, se espera un poquito (distinto para cada uno)
    if (intento > 0) await new Promise((ok) => setTimeout(ok, 150 + Math.random() * 350 * intento));
    const r = await pedirAClinica<{ version: number; datos: Json }>(slug, "GET", `/datos/${clave}`);
    choques = 0;
    const junto = juntarCambios(base, mio, r.datos);
    try {
      const g = await pedirAClinica<{ version: number }>(slug, "PUT", `/datos/${clave}`, { version: r.version, datos: junto });
      versiones.set(clave, g.version);
      ultimo.set(clave, JSON.stringify(junto));
      // Si mientras tanto esta pantalla siguió cambiando cosas, esos cambios se suman a lo juntado
      const pendiente = pendientes.get(clave);
      if (pendiente) {
        pendiente.valor = juntarCambios(mio, m.paraGuardar(pendiente.valor), junto);
        m.aplicar(pendiente.valor);
      } else {
        m.aplicar(junto);
      }
      if (choques > 0) toast.info("Otra persona cambió el mismo dato al mismo tiempo: quedó tu cambio.");
      return true;
    } catch (e) {
      if (!(e instanceof ErrorClinica) || e.status !== 409) throw e;
      // Volvió a guardar alguien justo ahora: se repite con lo más nuevo
    }
  }
  return false;
}

const avisadoSoporte = new Set<string>();
async function enviar(clave: string) {
  const p = pendientes.get(clave);
  const c = clinicaReal();
  const m = modulos.get(clave);
  if (!p || !c || !m) return;
  pendientes.delete(clave);
  if (esModoSoporte()) {
    // Modo soporte (solo lectura): no se manda nada; la pantalla vuelve a lo guardado
    recalcular();
    if (!avisadoSoporte.has(clave)) toast.info("Modo soporte: solo lectura. Este cambio no se guarda.");
    avisadoSoporte.add(clave);
    await cargarModulo(clave);
    ponerEstado("listo");
    return;
  }
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
    if (status === 409) {
      // Otra persona guardó en el medio: se juntan los dos cambios solos (no se pierde nada)
      enVuelo.add(clave);
      try {
        const ok = await guardarJuntando(c.slug, clave, m, datos);
        if (!ok) {
          toast.warning("Hay mucha gente guardando a la vez en este módulo. Revisá tu último cambio.");
          await cargarModulo(clave);
        }
      } catch (e2) {
        const st = e2 instanceof ErrorClinica ? e2.status : 0;
        if (st === 413) toast.error(e2 instanceof Error ? e2.message : "Hay demasiados datos en este módulo.");
        else toast.warning("No se pudo juntar tu cambio con el de otra persona. Revisá tu último cambio.");
        await cargarModulo(clave);
      } finally {
        enVuelo.delete(clave);
      }
      ponerEstado(pendientes.size > 0 || enVuelo.size > 0 ? "guardando" : "listo");
    } else if (status === 422 || status === 413) {
      // Límite del plan (ej. pacientes activos) o módulo demasiado grande: el cambio no entra
      toast.error(e instanceof Error ? e.message : "Este cambio no entra en tu plan.", { duration: 9000 });
      await cargarModulo(clave);
      ponerEstado("listo");
    } else if (status === 403) {
      toast.warning(e instanceof Error ? e.message : "No tenés permiso para cambiar esto.");
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
