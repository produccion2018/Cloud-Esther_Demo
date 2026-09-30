import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";

/* Ubicación: src/lib/cloud-esther/comunicacion-store.ts

   Datos de práctica del módulo Comunicación (bandeja, recordatorios, plantillas,
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

/* ───────────── Datos de ejemplo ───────────── */

function haceMin(min: number) {
  return new Date(Date.now() - min * 60_000).toISOString();
}

let idMsj = 1;
const m = (
  de: Mensaje["de"],
  texto: string,
  min: number,
  extra: Partial<Mensaje> = {},
): Mensaje => ({
  id: idMsj++,
  de,
  texto,
  fecha: haceMin(min),
  ...(de === "clinica" ? { estado: "leido" as const } : {}),
  ...extra,
});

function conversacionesEjemplo(): Conversacion[] {
  return [
    {
      id: 1,
      paciente: "Lucía Paz",
      telefono: "+54 11 5174-2826",
      email: "lucia.paz@example.com",
      canal: "WhatsApp",
      estado: "Pendiente",
      asignado: "",
      etiquetas: ["Turno"],
      noLeidos: 2,
      fijada: true,
      mensajes: [
        m(
          "clinica",
          "Hola Lucía 👋 Te recordamos tu turno de hoy a las 10:30 hs para Limpieza dental. ¿Nos confirmás tu asistencia?",
          190,
          { autor: "Recordatorio automático" },
        ),
        m("paciente", "Hola! Sí, voy. ¿Puedo llegar 10 minutos tarde?", 24),
        m("paciente", "Salgo del trabajo justo a las 10.", 23),
      ],
    },
    {
      id: 2,
      paciente: "Julián Ortega",
      telefono: "+54 11 5137-2413",
      email: "julian.ortega@example.com",
      canal: "WhatsApp",
      estado: "Abierta",
      asignado: "",
      etiquetas: ["Presupuesto"],
      noLeidos: 1,
      fijada: false,
      mensajes: [
        m(
          "clinica",
          "Hola Julián, te enviamos el presupuesto del tratamiento de ortodoncia. Cualquier duda nos escribís.",
          60 * 26,
        ),
        m("paciente", "Gracias. ¿Se puede pagar en cuotas?", 58),
      ],
    },
    {
      id: 3,
      paciente: "Mauro Pinto",
      telefono: "+54 11 5555-8899",
      email: "mauro.pinto@example.com",
      canal: "WhatsApp",
      estado: "Resuelta",
      asignado: "",
      etiquetas: ["Turno"],
      noLeidos: 0,
      fijada: false,
      mensajes: [
        m("paciente", "Buen día, quería sacar un turno de control.", 60 * 30),
        m(
          "clinica",
          "¡Hola Mauro! Te agendamos el control para dentro de 2 días a las 11:30 hs. ¿Te queda bien?",
          60 * 29,
        ),
        m("paciente", "Perfecto, gracias 🙌", 60 * 29 - 5),
        m("sistema", "Conversación marcada como resuelta", 60 * 29 - 4),
      ],
    },
    {
      id: 4,
      paciente: "Paula Medina",
      telefono: "+54 11 5211-3239",
      email: "paula.medina@example.com",
      canal: "SMS",
      estado: "Abierta",
      asignado: "",
      etiquetas: [],
      noLeidos: 0,
      fijada: false,
      mensajes: [
        m(
          "clinica",
          "Clínica: recordá tu turno de hoy 15:00 hs (Restauración). Respondé SI para confirmar.",
          60 * 3,
          { estado: "entregado" },
        ),
      ],
    },
    {
      id: 5,
      paciente: "Ana Torres",
      telefono: "+54 11 5322-4478",
      email: "ana.torres@example.com",
      canal: "Email",
      estado: "Pendiente",
      asignado: "",
      etiquetas: ["Consulta"],
      noLeidos: 1,
      fijada: false,
      mensajes: [
        m(
          "paciente",
          "Hola, mañana tengo el blanqueamiento. ¿Tengo que evitar algo antes de ir? ¿Puedo tomar café?",
          95,
        ),
      ],
    },
    {
      id: 6,
      paciente: "Diego Ruiz",
      telefono: "+54 11 5433-5891",
      email: "diego.ruiz@example.com",
      canal: "WhatsApp",
      estado: "Abierta",
      asignado: "",
      etiquetas: ["Post-operatorio"],
      noLeidos: 0,
      fijada: false,
      mensajes: [
        m(
          "clinica",
          "Hola Diego, ¿cómo seguís después de la consulta? Recordá las indicaciones: frío local y nada de comidas calientes hoy.",
          60 * 5,
        ),
        m("paciente", "Bien, un poco de molestia nada más.", 60 * 4),
        m("nota", "Si mañana sigue con dolor, ofrecerle sobreturno con el Dr.", 60 * 4 - 3, {
          autor: "Recepción",
        }),
      ],
    },
  ];
}

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

const CAMPANAS: Campana[] = [
  {
    id: 1,
    nombre: "Control semestral de septiembre",
    canal: "WhatsApp",
    audiencia: "sin-visita",
    filtro: "",
    texto: PLANTILLAS[8]?.texto ?? "",
    estado: "Enviada",
    programada: "",
    destinatarios: 48,
    entregados: 46,
    leidos: 39,
    respondidos: 14,
    turnos: 9,
  },
  {
    id: 2,
    nombre: "Saludo de cumpleaños del mes",
    canal: "WhatsApp",
    audiencia: "cumpleanos",
    filtro: "",
    texto: PLANTILLAS[9]?.texto ?? "",
    estado: "Programada",
    programada: "",
    destinatarios: 0,
    entregados: 0,
    leidos: 0,
    respondidos: 0,
    turnos: 0,
  },
  {
    id: 3,
    nombre: "Promoción blanqueamiento",
    canal: "Email",
    audiencia: "activos",
    filtro: "",
    texto:
      "Hola {{paciente}}, este mes tenemos 15% de descuento en blanqueamiento. ¡Reservá tu turno!",
    estado: "Borrador",
    programada: "",
    destinatarios: 0,
    entregados: 0,
    leidos: 0,
    respondidos: 0,
    turnos: 0,
  },
];

function enviosEjemplo(convs: Conversacion[]): Envio[] {
  const desdeChats = convs.flatMap((c) =>
    c.mensajes
      .filter((x) => x.de === "clinica")
      .map((x) => ({
        id: x.id,
        fecha: x.fecha,
        paciente: c.paciente,
        canal: c.canal,
        tipo: (x.autor === "Recordatorio automático" ? "Recordatorio" : "Mensaje") as TipoEnvio,
        texto: x.texto,
        estado: x.estado ?? "leido",
      })),
  );
  const extra: Envio[] = [
    {
      id: 9001,
      fecha: haceMin(60 * 22),
      paciente: "Valeria Gómez",
      canal: "Email",
      tipo: "Automático",
      texto: "Encuesta de satisfacción",
      estado: "leido",
    },
    {
      id: 9002,
      fecha: haceMin(60 * 23),
      paciente: "Sergio Luna",
      canal: "SMS",
      tipo: "Recordatorio",
      texto: "Recordatorio de turno",
      estado: "fallido",
    },
    {
      id: 9003,
      fecha: haceMin(60 * 48),
      paciente: "Florencia Díaz",
      canal: "WhatsApp",
      tipo: "Campaña",
      texto: "Control semestral de septiembre",
      estado: "leido",
    },
  ];
  return [...desdeChats, ...extra].sort((a, b) => b.fecha.localeCompare(a.fecha));
}

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

export const storeComunicacion = crearStorePorEmpresa<EstadoComunicacion>(() => {
  const conversaciones = conversacionesEjemplo();
  return {
    conversaciones,
    plantillas: PLANTILLAS,
    campanas: CAMPANAS,
    envios: enviosEjemplo(conversaciones),
    recordatorios: {},
    config: CONFIG,
  };
}, { persistir: "comunicacion" });

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
