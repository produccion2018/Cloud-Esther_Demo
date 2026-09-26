import { useSyncExternalStore } from "react";

export type EstadoConector = "Conectado" | "Desconectado";

export type CategoriaConector =
  | "Comunicación"
  | "Pagos y facturación"
  | "Clínico"
  | "Automatización";

export interface Conector {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: CategoriaConector;
  icon: string; // clave, se mapea a un ícono de lucide en el componente
  estado: EstadoConector;
}

/* Un solo conector conectado de ejemplo (n8n), el resto listo para
   conectar de verdad más adelante. Nada de datos falsos de más. */
const DATOS_INICIALES: Conector[] = [
  {
    id: "whatsapp",
    nombre: "WhatsApp Business",
    descripcion: "Envío de mensajes y recordatorios automáticos al paciente.",
    categoria: "Comunicación",
    icon: "message",
    estado: "Desconectado",
  },
  {
    id: "google-calendar",
    nombre: "Google Calendar",
    descripcion: "Sincroniza turnos y agenda con el calendario del profesional.",
    categoria: "Comunicación",
    icon: "calendar",
    estado: "Desconectado",
  },
  {
    id: "pasarela-pagos",
    nombre: "Pasarela de pagos",
    descripcion: "Cobros online de turnos, presupuestos y cuenta corriente.",
    categoria: "Pagos y facturación",
    icon: "wallet",
    estado: "Desconectado",
  },
  {
    id: "facturacion-electronica",
    nombre: "Facturación electrónica",
    descripcion: "Emisión de comprobantes fiscales válidos ante AFIP.",
    categoria: "Pagos y facturación",
    icon: "receipt",
    estado: "Desconectado",
  },
  {
    id: "n8n",
    nombre: "n8n",
    descripcion: "Motor de automatización — conecta y dispara los flujos de Automatización.",
    categoria: "Automatización",
    icon: "workflow",
    estado: "Conectado",
  },
  {
    id: "doctoralia",
    nombre: "Doctoralia",
    descripcion: "Sincroniza turnos reservados desde tu perfil público de Doctoralia.",
    categoria: "Clínico",
    icon: "stethoscope",
    estado: "Desconectado",
  },
  {
    id: "dicom",
    nombre: "DICOM",
    descripcion: "Importa estudios e imágenes desde equipos y software de diagnóstico.",
    categoria: "Clínico",
    icon: "scan",
    estado: "Desconectado",
  },
  {
    id: "webhooks",
    nombre: "Webhooks",
    descripcion: "Enviá eventos de Cloud Esther a sistemas externos propios.",
    categoria: "Automatización",
    icon: "plug",
    estado: "Desconectado",
  },
];

/* ───────────── Store a nivel módulo (mismo patrón que pacientes.ts / automatizaciones.ts) ───────────── */

let conectores: Conector[] = DATOS_INICIALES;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return conectores;
}

function setConectoresGlobal(
  actualizar: Conector[] | ((prev: Conector[]) => Conector[]),
) {
  conectores =
    typeof actualizar === "function"
      ? (actualizar as (prev: Conector[]) => Conector[])(conectores)
      : actualizar;

  emit();
}

export function useIntegraciones() {
  const lista = useSyncExternalStore(subscribe, getSnapshot);

  return {
    conectores: lista,
    setConectores: setConectoresGlobal,
  };
}