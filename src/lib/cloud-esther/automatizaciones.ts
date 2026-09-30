import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";

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

/* Separado por empresa: cada clínica tiene su propia lista y nunca ve la de otra. */
const store = crearStorePorEmpresa<Automatizacion[]>(() => DATOS_INICIALES, { persistir: "automatizaciones" });

function setAutomatizacionesGlobal(
  actualizar: Automatizacion[] | ((prev: Automatizacion[]) => Automatizacion[]),
) {
  store.poner(
    typeof actualizar === "function" ? actualizar(store.leer()) : actualizar,
  );
}

export function useAutomatizaciones() {
  const lista = store.usar();

  return {
    automatizaciones: lista,
    setAutomatizaciones: setAutomatizacionesGlobal,
  };
}