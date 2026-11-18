import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";

/* Ubicación: src/lib/cloud-esther/agente-ia-store.ts
   Estado y configuración del Agente de IA 24/7 (atención por WhatsApp) de cada clínica.
   Es por empresa (multiempresa): nunca se mezclan datos entre clínicas.
   HONESTO: el agente arranca DESCONECTADO y WhatsApp sin conectar. No se finge actividad:
   las métricas salen de conversaciones reales (incluidas las del Probador, marcadas como prueba),
   y el canal real de WhatsApp queda "pendiente de conexión" hasta integrar los servicios externos. */

export type EstadoAgente = "activo" | "pausado" | "desconectado";

/** Resultado de una conversación atendida por el agente. */
export type ResultadoConv = "consulta" | "turno" | "urgencia" | "derivada" | "abierta";

export type MensajeConv = {
  de: "paciente" | "agente";
  texto: string;
  hora: string;
};

export type Conversacion = {
  id: number;
  paciente: string;
  /** De dónde vino: whatsapp (real) o probador (prueba interna). */
  canal: "whatsapp" | "probador";
  /** true cuando viene del Probador: es una prueba, no una conversación real de un paciente. */
  prueba: boolean;
  resultado: ResultadoConv;
  mensajes: MensajeConv[];
  fecha: string;
};

export type RespuestaFrecuente = { pregunta: string; respuesta: string };

export type ConfigAgente = {
  bienvenida: string;
  atiende24_7: boolean;
  horarioAutoDesde: string;
  horarioAutoHasta: string;
  anticipacionRecordatorioHoras: number;
  duracionTurnoMin: number;
  tiposConsulta: string[];
  respuestasFrecuentes: RespuestaFrecuente[];
  /** Palabras/frases que disparan el protocolo de urgencia. */
  palabrasUrgencia: string[];
  /** A quién se deriva una urgencia o una conversación compleja. */
  derivarA: string;
};

export type EstadoAgenteIA = {
  estado: EstadoAgente;
  /** HONESTO: false hasta que se conecte WhatsApp Business de verdad. */
  whatsappConectado: boolean;
  config: ConfigAgente;
  conversaciones: Conversacion[];
};

export const CONFIG_INICIAL: ConfigAgente = {
  bienvenida:
    "¡Hola! Soy la asistente virtual de la clínica. Puedo ayudarte a sacar un turno, " +
    "responder consultas o derivarte con un profesional. ¿En qué te ayudo?",
  atiende24_7: true,
  horarioAutoDesde: "00:00",
  horarioAutoHasta: "23:59",
  anticipacionRecordatorioHoras: 24,
  duracionTurnoMin: 30,
  tiposConsulta: ["Consulta general", "Urgencia", "Control", "Limpieza", "Tratamiento en curso"],
  respuestasFrecuentes: [
    { pregunta: "¿Dónde quedan?", respuesta: "Te paso la dirección y la ubicación de la clínica." },
    { pregunta: "¿Atienden obras sociales?", respuesta: "Consultá con recepción las obras sociales vigentes." },
  ],
  palabrasUrgencia: [
    "dolor", "duele", "inflama", "hinchado", "sangra", "sangrado", "golpe", "trauma",
    "fractura", "se rompió", "absceso", "flemón", "pus", "infección", "urgencia", "emergencia",
  ],
  derivarA: "Recepción",
};

const INICIAL: EstadoAgenteIA = {
  estado: "desconectado",
  whatsappConectado: false,
  config: CONFIG_INICIAL,
  conversaciones: [],
};

export const storeAgenteIA = crearStorePorEmpresa<EstadoAgenteIA>(() => INICIAL, {
  persistir: "agente-ia",
});

/** Métricas derivadas de conversaciones reales (nunca inventadas). */
export function metricasAgente(e: EstadoAgenteIA) {
  const c = e.conversaciones;
  return {
    mensajesAtendidos: c.reduce((n, x) => n + x.mensajes.filter((m) => m.de === "paciente").length, 0),
    nuevosPacientes: c.filter((x) => x.resultado === "turno").length, // aprox: los que terminaron en turno
    turnosGenerados: c.filter((x) => x.resultado === "turno").length,
    urgencias: c.filter((x) => x.resultado === "urgencia").length,
    derivadas: c.filter((x) => x.resultado === "derivada").length,
    conversaciones: c.length,
  };
}
