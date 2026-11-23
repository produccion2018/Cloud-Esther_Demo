import { useEffect, useState, useSyncExternalStore } from "react";
import { setTareasStore } from "@/lib/cloud-esther/agenda-store";
import { storeAgenteIA } from "@/lib/cloud-esther/agente-ia-store";
import { storeN8n } from "@/lib/cloud-esther/n8n-store";
import { CATEGORIAS_NOTIF, setNotificaciones, type CategoriaNotif } from "@/lib/cloud-esther/notificaciones-store";
import { cambiarRegistro } from "@/components/cloud-esther/PacienteSecciones";
import {
  sincronizarFlujos,
  tomarBandejaAutomatizaciones,
  verEstadoAutomatizaciones,
  type EstadoAutomatizaciones,
} from "@/lib/clinica/api";
import { useClinicaReal } from "@/lib/clinica/modo-clinica";
import { moduloCargado } from "@/lib/clinica/sincronizar";

/* Ubicación: src/lib/clinica/automatizaciones.ts
   AUTOMATIZACIONES DE VERDAD (clínica real). El motor corre en el SERVIDOR (aunque nadie tenga la
   app abierta). Acá:
   · useSincronizarAutomatizaciones: cada vez que el Administrador cambia un flujo o el Agente IA,
     se lo manda al servidor (que es quien los ejecuta).
   · useBandejaAutomatizaciones: lo que las automatizaciones dejan para la clínica (tareas para la
     Agenda, avisos para Notificaciones, seguimientos de presupuestos) se toma del servidor y se
     guarda en los módulos de siempre (así el servidor nunca pisa lo que la clínica edita).
   · useEstadoAutomatizaciones: si WhatsApp Business, n8n y la IA están conectados. */

/* ───────────── Estado (compartido entre pantallas) ───────────── */
let estado: EstadoAutomatizaciones | null = null;
const oyentes = new Set<() => void>();
let pedido: Promise<void> | null = null;

export function ponerEstadoAutomatizaciones(e: EstadoAutomatizaciones) {
  estado = e;
  oyentes.forEach((o) => o());
}
export async function recargarEstadoAutomatizaciones(slug: string) {
  pedido ??= verEstadoAutomatizaciones(slug)
    .then(ponerEstadoAutomatizaciones)
    .catch(() => undefined)
    .finally(() => {
      pedido = null;
    });
  return pedido;
}
export function leerEstadoAutomatizaciones() {
  return estado;
}

/** Estado de la conexión (null en el demo o mientras carga). */
export function useEstadoAutomatizaciones(): EstadoAutomatizaciones | null {
  const real = useClinicaReal();
  const e = useSyncExternalStore(
    (f) => {
      oyentes.add(f);
      return () => oyentes.delete(f);
    },
    () => estado,
    () => null,
  );
  useEffect(() => {
    if (real && !estado) void recargarEstadoAutomatizaciones(real.slug);
  }, [real?.slug]);
  return real ? e : null;
}

/* ───────────── Flujos y Agente → servidor ───────────── */

export function useSincronizarAutomatizaciones() {
  const real = useClinicaReal();
  const esAdmin = real?.rol === "admin";
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!real || !esAdmin) return;
    let timer: number | null = null;
    let ultimo = "";
    const mandar = () => {
      // Recién cuando los dos módulos llegaron del servidor (si no, se pisaría con datos vacíos)
      if (!moduloCargado("n8n") || !moduloCargado("agente-ia")) {
        storeN8n.leer();
        storeAgenteIA.leer();
        programar();
        return;
      }
      const n8n = storeN8n.leer();
      const ag = storeAgenteIA.leer();
      const cuerpo = {
        flujos: n8n.flujos.map((f) => ({ id: f.id, nombre: f.nombre, evento: f.evento, pasos: f.pasos, activo: f.activo, sedes: f.sedes })),
        agente: { estado: ag.estado, config: ag.config },
      };
      const texto = JSON.stringify(cuerpo);
      if (texto === ultimo) return;
      ultimo = texto;
      sincronizarFlujos(real.slug, cuerpo)
        .then(() => {
          setError(null);
          void recargarEstadoAutomatizaciones(real.slug);
        })
        .catch((e: unknown) => {
          ultimo = ""; // se reintenta en el próximo cambio
          setError(e instanceof Error ? e.message : "No se pudieron guardar las automatizaciones en el servidor.");
        });
    };
    const programar = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(mandar, 1500);
    };
    const quitar1 = storeN8n.suscribir(programar);
    const quitar2 = storeAgenteIA.suscribir(programar);
    // OJO: no se manda nada al entrar (los flujos todavía se están cargando y se pisarían con
    // una lista vacía). Se manda cuando terminan de cargar o cuando el Administrador cambia algo.
    return () => {
      if (timer) window.clearTimeout(timer);
      quitar1();
      quitar2();
    };
  }, [real?.slug, esAdmin]);
  return error;
}

/* ───────────── Bandeja del servidor → módulos de la clínica ───────────── */

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const s = (v: unknown) => (typeof v === "string" ? v : "");

export function useBandejaAutomatizaciones() {
  const real = useClinicaReal();
  const puede = !!real && ["admin", "secretaria", "odontologo"].includes(real.rol);
  useEffect(() => {
    if (!real || !puede) return;
    let vivo = true;
    const tomar = async () => {
      if (document.visibilityState === "hidden") return;
      let items;
      try {
        items = await tomarBandejaAutomatizaciones(real.slug);
      } catch {
        return;
      }
      if (!vivo || !items.length) return;
      const tareas = items.filter((i) => i.tipo === "tarea");
      if (tareas.length) {
        setTareasStore((prev) => {
          let id = Math.max(0, ...prev.map((t) => t.id));
          return [
            ...prev,
            ...tareas.map((t) => ({
              id: ++id,
              texto: s(t.datos["texto"]) || "Seguimiento",
              categoria: s(t.datos["categoria"]) || "Automatización",
              paciente: s(t.datos["paciente"]),
              fecha: hoyISO(),
              hecha: false,
            })),
          ];
        });
      }
      const avisos = items.filter((i) => i.tipo === "aviso");
      if (avisos.length) {
        setNotificaciones("manuales", (prev) => [
          ...avisos.map((a) => {
            const cat = s(a.datos["categoria"]);
            return {
              id: `auto-${a.id}`,
              titulo: s(a.datos["titulo"]) || "Automatización",
              detalle: s(a.datos["detalle"]),
              categoria: (CATEGORIAS_NOTIF as readonly string[]).includes(cat) ? (cat as CategoriaNotif) : "Pacientes",
              prioridad: s(a.datos["prioridad"]) === "Alta" ? ("Alta" as const) : ("Normal" as const),
              asignado: "Recepción",
              vence: hoyISO(),
              horaVence: "",
              creada: a.fecha,
              creadaPor: "Automatizaciones",
            };
          }),
          ...prev.filter((p) => !avisos.some((a) => p.id === `auto-${a.id}`)),
        ]);
      }
      for (const sg of items.filter((i) => i.tipo === "seguimiento")) {
        const pacienteId = Number(sg.datos["pacienteId"]);
        const presupuestoId = Number(sg.datos["presupuestoId"]);
        if (!pacienteId || !presupuestoId) continue;
        cambiarRegistro(pacienteId, "presupuestos", (prev) =>
          (prev ?? []).map((pr) =>
            pr.id === presupuestoId
              ? { ...pr, seguimientos: [...(pr.seguimientos ?? []), { fecha: sg.fecha, texto: s(sg.datos["texto"]) || "Seguimiento automático", autor: "Automatización" }] }
              : pr,
          ),
        );
      }
    };
    void tomar();
    const t = window.setInterval(() => void tomar(), 60_000);
    return () => {
      vivo = false;
      window.clearInterval(t);
    };
  }, [real?.slug, puede]);
}
