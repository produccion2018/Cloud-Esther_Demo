import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";

export type EstadoConector = "Conectado" | "Desconectado";

export type CategoriaConector =
  "Comunicación" | "Pagos y facturación" | "Clínico" | "Automatización";

export interface Conector {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: CategoriaConector;
  icon: string; // clave, se mapea a un ícono de lucide en el componente
  estado: EstadoConector;
  /** Datos de conexión cargados en «Configurar» (por empresa). TODO backend: guardar cifrado. */
  config?: Record<string, string>;
  ultimaPrueba?: string;
}

/* De ejemplo quedan conectados n8n y WhatsApp Business (este último lo usa el módulo
   Comunicación); el resto queda listo para conectar de verdad más adelante. */
const DATOS_INICIALES: Conector[] = [
  {
    id: "whatsapp",
    nombre: "WhatsApp Business",
    descripcion: "Envío de mensajes y recordatorios automáticos al paciente.",
    categoria: "Comunicación",
    icon: "message",
    estado: "Conectado",
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

/* Separado por empresa: cada clínica tiene su propia lista y nunca ve la de otra. */
const store = crearStorePorEmpresa<Conector[]>(() => DATOS_INICIALES, {
  persistir: "integraciones",
});

function setConectoresGlobal(actualizar: Conector[] | ((prev: Conector[]) => Conector[])) {
  store.poner(typeof actualizar === "function" ? actualizar(store.leer()) : actualizar);
}

export function useIntegraciones() {
  const lista = store.usar();

  return {
    conectores: lista,
    setConectores: setConectoresGlobal,
  };
}
