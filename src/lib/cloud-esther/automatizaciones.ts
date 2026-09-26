import { useSyncExternalStore } from "react";

export type EstadoAutomatizacion = "Activa" | "Pausada";

export interface Automatizacion {
  id: number;
  nombre: string;
  disparador: string;
  accion: string;
  conector: string;
  estado: EstadoAutomatizacion;
  ejecucionesHoy: number;
  ultimaEjecucion: string; // "Hoy 09:14" o vacío si nunca corrió
}

/* Un solo dato de ejemplo, listo para reemplazar por datos reales de n8n vía API/webhook. */
const DATOS_INICIALES: Automatizacion[] = [
  {
    id: 1,
    nombre: "Recordatorio de turno 24hs antes",
    disparador: "Turno agendado",
    accion: "Enviar WhatsApp al paciente",
    conector: "n8n",
    estado: "Activa",
    ejecucionesHoy: 8,
    ultimaEjecucion: "Hoy 09:14",
  },
];

/* ───────────── Store a nivel módulo (mismo patrón que pacientes.ts) ───────────── */

let automatizaciones: Automatizacion[] = DATOS_INICIALES;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return automatizaciones;
}

function setAutomatizacionesGlobal(
  actualizar:
    | Automatizacion[]
    | ((prev: Automatizacion[]) => Automatizacion[]),
) {
  automatizaciones =
    typeof actualizar === "function"
      ? (actualizar as (prev: Automatizacion[]) => Automatizacion[])(
          automatizaciones,
        )
      : actualizar;

  emit();
}

export function useAutomatizaciones() {
  const lista = useSyncExternalStore(subscribe, getSnapshot);

  return {
    automatizaciones: lista,
    setAutomatizaciones: setAutomatizacionesGlobal,
  };
}