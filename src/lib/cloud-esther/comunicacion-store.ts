import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";

/* Ubicación: src/lib/cloud-esther/comunicacion-store.ts

   Datos del módulo Comunicación (bandeja, recordatorios, plantillas,
   campañas, historial y canales), separados por empresa: lo que una clínica
   escribe o configura nunca aparece en otra.
   TODO backend: reemplazar por la API de mensajería filtrada por clinicId
   (WhatsApp Business API, proveedor de SMS y servidor de correo). */

export type Canal = "WhatsApp" | "SMS" | "Email";
export const CANALES: Canal[] = ["WhatsApp", "SMS", "Email"];

export type EstadoConversacion = "Abierta" | "Pendiente" | "Resuelta";
export type EstadoEntrega = "enviado" | "entregado" | "leido" | "fallido";

export type Mensaje = {
  id: number;
  de: "paciente" | "clinica" | "nota" | "sistema";
  texto: string;
  fecha: string; // ISO
  estado?: EstadoEntrega;
  autor?: string;
  adjunto?: string;
};

export type Conversacion = {
  id: number;
  paciente: string;
  telefono: string;
  email: string;
  canal: Canal;
  estado: EstadoConversacion;
  asignado: string;
  etiquetas: string[];
  noLeidos: number;
  fijada: boolean;
  mensajes: Mensaje[];
};

export const CATEGORIAS_PLANTILLA = [
  "Turnos",
  "Presupuestos",
  "Seguimiento",
  "Cobranzas",
  "Marketing",
  "General",
] as const;
export type CategoriaPlantilla = (typeof CATEGORIAS_PLANTILLA)[number];

export type Plantilla = {
  id: number;
  nombre: string;
  categoria: CategoriaPlantilla;
  canal: Canal;
  asunto?: string;
  texto: string;
  usos: number;
};

export type EstadoCampana = "Borrador" | "Programada" | "Enviada";
export type Audiencia =
  "activos" | "obra-social" | "sucursal" | "sin-visita" | "cumpleanos" | "presupuesto";

export type Campana = {
  id: number;
  nombre: string;
  canal: Canal;
  audiencia: Audiencia;
  filtro: string; // obra social o sucursal elegida
  texto: string;
  estado: EstadoCampana;
  programada: string; // ISO fecha-hora o ""
  destinatarios: number;
  entregados: number;
  leidos: number;
  respondidos: number;
  turnos: number;
};

export type TipoEnvio = "Mensaje" | "Recordatorio" | "Campaña" | "Automático";
export type Envio = {
  id: number;
  fecha: string; // ISO
  paciente: string;
  canal: Canal;
  tipo: TipoEnvio;
  texto: string;
  estado: EstadoEntrega;
};

export type EstadoRecordatorio = "Enviado" | "Confirmado" | "Reprogramar";
export type RecordatorioTurno = { estado: EstadoRecordatorio; fecha: string; canal: Canal };

export type ConfigCanal = {
  conectado: boolean;
  remitente: string;
  enviadosMes: number;
  costoUnitario: number;
};

export type ConfigComunicacion = {
  canales: Record<Canal, ConfigCanal>;
  recordatorios: {
    activo: boolean;
    anticipacion: 24 | 48 | 72;
    canal: Canal;
    plantillaId: number;
    segundoAviso: boolean;
  };
  horario: { desde: string; hasta: string; dias: number[] };
  autoRespuesta: { activa: boolean; texto: string };
  firma: string;
};

export type EstadoComunicacion = {
  conversaciones: Conversacion[];
  plantillas: Plantilla[];
  campanas: Campana[];
  envios: Envio[];
  recordatorios: Record<number, RecordatorioTurno>; // por id de turno de la Agenda
  config: ConfigComunicacion;
};

/* ───────────── Datos base ───────────── */

/* Las plantillas son textos listos para usar (no son datos de pacientes). */
const PLANTILLAS: Plantilla[] = [
  {
    id: 1,
    nombre: "Recordatorio de turno",
    categoria: "Turnos",
    canal: "WhatsApp",
    texto:
      "Hola {{paciente}} 👋 Te recordamos tu turno del {{fecha}} a las {{hora}} hs con {{profesional}} en {{clinica}}. Respondé SI para confirmar o escribinos para reprogramar.",
    usos: 1284,
  },
  {
    id: 2,
    nombre: "Confirmación de turno",
    categoria: "Turnos",
    canal: "SMS",
    texto:
      "{{clinica}}: tu turno quedó agendado el {{fecha}} {{hora}} hs. Respondé SI para confirmar.",
    usos: 968,
  },
  {
    id: 3,
    nombre: "Turno reprogramado",
    categoria: "Turnos",
    canal: "WhatsApp",
    texto:
      "Hola {{paciente}}, tu turno fue reprogramado para el {{fecha}} a las {{hora}} hs. ¡Te esperamos!",
    usos: 214,
  },
  {
    id: 4,
    nombre: "Presupuesto enviado",
    categoria: "Presupuestos",
    canal: "Email",
    asunto: "Tu presupuesto en {{clinica}}",
    texto:
      "Hola {{paciente}}, te adjuntamos el presupuesto de tu tratamiento. Podés aprobarlo respondiendo este correo o desde el portal del paciente.",
    usos: 233,
  },
  {
    id: 5,
    nombre: "Presupuesto pendiente",
    categoria: "Presupuestos",
    canal: "WhatsApp",
    texto:
      "Hola {{paciente}}, ¿pudiste ver el presupuesto que te enviamos? Si querés lo revisamos juntos o te contamos las opciones de pago.",
    usos: 187,
  },
  {
    id: 6,
    nombre: "Indicaciones post-operatorias",
    categoria: "Seguimiento",
    canal: "WhatsApp",
    texto:
      "Hola {{paciente}}, ¿cómo te sentís? Recordá: frío local las primeras horas, dieta blanda y evitar enjuagues fuertes por 24 h. Ante cualquier duda escribinos.",
    usos: 152,
  },
  {
    id: 7,
    nombre: "Encuesta de satisfacción",
    categoria: "Seguimiento",
    canal: "Email",
    asunto: "¿Cómo fue tu atención?",
    texto:
      "Hola {{paciente}}, gracias por atenderte en {{clinica}}. ¿Nos contás cómo fue tu experiencia? Nos lleva 1 minuto y nos ayuda mucho.",
    usos: 410,
  },
  {
    id: 8,
    nombre: "Saldo pendiente",
    categoria: "Cobranzas",
    canal: "WhatsApp",
    texto:
      "Hola {{paciente}}, te recordamos que tenés un saldo pendiente en tu cuenta. Podés abonarlo en recepción o por transferencia. ¡Gracias!",
    usos: 96,
  },
  {
    id: 9,
    nombre: "Control semestral",
    categoria: "Marketing",
    canal: "WhatsApp",
    texto:
      "Hola {{paciente}} 😁 Ya pasaron 6 meses desde tu último control. ¿Te reservamos un turno? Respondé este mensaje y te pasamos horarios.",
    usos: 520,
  },
  {
    id: 10,
    nombre: "Feliz cumpleaños",
    categoria: "Marketing",
    canal: "WhatsApp",
    texto: "¡Feliz cumpleaños {{paciente}}! 🎉 Todo el equipo de {{clinica}} te desea un gran día.",
    usos: 342,
  },
];

const CONFIG: ConfigComunicacion = {
  canales: {
    WhatsApp: {
      conectado: true,
      remitente: "+54 11 4000-1234",
      enviadosMes: 1860,
      costoUnitario: 45,
    },
    SMS: { conectado: true, remitente: "CLINICA", enviadosMes: 420, costoUnitario: 30 },
    Email: {
      conectado: true,
      remitente: "turnos@miclinica.com",
      enviadosMes: 730,
      costoUnitario: 0,
    },
  },
  recordatorios: {
    activo: true,
    anticipacion: 24,
    canal: "WhatsApp",
    plantillaId: 1,
    segundoAviso: false,
  },
  horario: { desde: "08:00", hasta: "20:00", dias: [1, 2, 3, 4, 5, 6] },
  autoRespuesta: {
    activa: true,
    texto:
      "¡Gracias por escribirnos! Estamos fuera del horario de atención. Te respondemos apenas abramos.",
  },
  firma: "Equipo de {{clinica}}",
};

/* Estado inicial: sin mensajes, campañas ni envíos, y con los canales sin conectar.
   Es el mismo para el demo y para una clínica real (el demo se ve igual que producción). */
function estadoInicial(): EstadoComunicacion {
  return {
    conversaciones: [],
    plantillas: PLANTILLAS,
    campanas: [],
    envios: [],
    recordatorios: {},
    config: {
      ...CONFIG,
      canales: {
        WhatsApp: { ...CONFIG.canales.WhatsApp, conectado: false, remitente: "", enviadosMes: 0 },
        SMS: { ...CONFIG.canales.SMS, conectado: false, remitente: "", enviadosMes: 0 },
        Email: { ...CONFIG.canales.Email, conectado: false, remitente: "", enviadosMes: 0 },
      },
      recordatorios: { ...CONFIG.recordatorios, activo: false },
    },
  };
}

export const storeComunicacion = crearStorePorEmpresa<EstadoComunicacion>(estadoInicial, {
  persistir: "comunicacion",
  vacio: estadoInicial,
});

type Actualizar<T> = T | ((prev: T) => T);

/** Actualiza una parte del estado de Comunicación de la empresa activa. */
export function setComunicacion<K extends keyof EstadoComunicacion>(
  clave: K,
  a: Actualizar<EstadoComunicacion[K]>,
) {
  const actual = storeComunicacion.leer();
  const valor =
    typeof a === "function"
      ? (a as (p: EstadoComunicacion[K]) => EstadoComunicacion[K])(actual[clave])
      : a;
  storeComunicacion.poner({ ...actual, [clave]: valor });
}