import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";

/* Ubicación: src/lib/cloud-esther/marketing-store.ts

   Marketing y captación, separado por empresa: leads (CRM), campañas de publicidad,
   promociones y cupones, programa de referidos, reseñas y formulario web.
   TODO backend: integrar Meta Ads / Google Ads, Google Business Profile y webhooks del formulario. */

export const FUENTES = [
  "Instagram",
  "Facebook",
  "Google",
  "WhatsApp",
  "Sitio web",
  "Referido",
  "Doctoralia",
  "Presencial",
] as const;
export type Fuente = (typeof FUENTES)[number];

export const ETAPAS = ["Nuevo", "Contactado", "Turno agendado", "Convertido", "Perdido"] as const;
export type Etapa = (typeof ETAPAS)[number];

export type ActividadLead = {
  id: string;
  fecha: string;
  tipo: "Nota" | "Llamada" | "WhatsApp" | "Correo" | "Etapa";
  texto: string;
  autor: string;
};

export type Lead = {
  id: string;
  nombre: string;
  telefono: string;
  email: string;
  fuente: Fuente;
  interes: string;
  valor: number;
  etapa: Etapa;
  responsable: string;
  creado: string; // ISO
  seguimiento: string; // yyyy-mm-dd o ""
  campaniaId: string;
  referidoPor: string;
  motivoPerdida: string;
  actividad: ActividadLead[];
};

export const CANALES_ADS = [
  "Instagram Ads",
  "Facebook Ads",
  "Google Ads",
  "WhatsApp",
  "Correo",
  "Volantes",
] as const;
export type CanalAds = (typeof CANALES_ADS)[number];
export type EstadoCampania = "Activa" | "Pausada" | "Programada" | "Finalizada";

export type CampaniaAds = {
  id: string;
  nombre: string;
  canal: CanalAds;
  objetivo: string;
  tratamiento: string;
  presupuesto: number;
  gastado: number;
  impresiones: number;
  clics: number;
  inicio: string;
  fin: string;
  estado: EstadoCampania;
};

export type Promocion = {
  id: string;
  titulo: string;
  codigo: string;
  descuento: number; // %
  tratamiento: string;
  desde: string;
  hasta: string;
  limite: number;
  usos: number;
  activa: boolean;
};

export type Resena = {
  id: string;
  autor: string;
  fuente: "Google" | "Doctoralia" | "Facebook";
  estrellas: number;
  texto: string;
  fecha: string;
  respuesta: string;
};

export type SolicitudResena = { paciente: string; fecha: string; estado: "Enviada" | "Respondida" };

export type ConfigReferidos = {
  activo: boolean;
  recompensaReferente: string;
  beneficioReferido: string;
};

export type EstadoMarketing = {
  leads: Lead[];
  campanias: CampaniaAds[];
  promos: Promocion[];
  resenas: Resena[];
  solicitudes: SolicitudResena[];
  referidos: ConfigReferidos;
  formulario: { titulo: string; subtitulo: string; boton: string; tratamientos: string[] };
};

function dia(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function hace(dias: number, horas = 0) {
  return new Date(Date.now() - dias * 86_400_000 - horas * 3_600_000).toISOString();
}

const act = (
  tipo: ActividadLead["tipo"],
  texto: string,
  dias: number,
  autor = "Recepción",
): ActividadLead => ({
  id: `${tipo}-${dias}-${texto.length}`,
  fecha: hace(dias),
  tipo,
  texto,
  autor,
});

function leadsEjemplo(): Lead[] {
  const base = (
    l: Partial<Lead> & Pick<Lead, "id" | "nombre" | "fuente" | "interes" | "etapa">,
  ): Lead => ({
    telefono: "",
    email: "",
    valor: 0,
    responsable: "Sofía Rodríguez",
    creado: hace(3),
    seguimiento: "",
    campaniaId: "",
    referidoPor: "",
    motivoPerdida: "",
    actividad: [],
    ...l,
  });
  return [
    base({
      id: "l1",
      nombre: "Camila Herrera",
      telefono: "+54 11 6123-4410",
      email: "camila.herrera@example.com",
      fuente: "Instagram",
      interes: "Blanqueamiento",
      valor: 90000,
      etapa: "Nuevo",
      creado: hace(0, 3),
      campaniaId: "c1",
      actividad: [
        act("Nota", "Completó el formulario de Instagram: quiere precio de blanqueamiento.", 0),
      ],
    }),
    base({
      id: "l2",
      nombre: "Matías Quiroga",
      telefono: "+54 11 6234-8812",
      fuente: "Google",
      interes: "Implante",
      valor: 650000,
      etapa: "Nuevo",
      creado: hace(0, 6),
      campaniaId: "c2",
      seguimiento: dia(0),
    }),
    base({
      id: "l3",
      nombre: "Rocío Benítez",
      telefono: "+54 11 6345-1190",
      email: "rocio.b@example.com",
      fuente: "WhatsApp",
      interes: "Ortodoncia",
      valor: 480000,
      etapa: "Contactado",
      creado: hace(2),
      seguimiento: dia(1),
      actividad: [
        act("WhatsApp", "Se le enviaron opciones de ortodoncia invisible y brackets.", 1),
        act("Etapa", "Pasó a Contactado", 1),
      ],
    }),
    base({
      id: "l4",
      nombre: "Tomás Aguirre",
      telefono: "+54 11 6456-7723",
      fuente: "Referido",
      interes: "Limpieza dental",
      valor: 25000,
      etapa: "Contactado",
      creado: hace(3),
      referidoPor: "Mauro Pinto",
      actividad: [act("Llamada", "Pidió turno para la semana que viene por la tarde.", 2)],
    }),
    base({
      id: "l5",
      nombre: "Lucas Ferreyra",
      telefono: "+54 11 6567-3308",
      fuente: "Facebook",
      interes: "Blanqueamiento",
      valor: 90000,
      etapa: "Turno agendado",
      creado: hace(5),
      campaniaId: "c1",
      actividad: [act("Etapa", "Turno agendado para evaluación", 3)],
    }),
    base({
      id: "l6",
      nombre: "Julieta Sánchez",
      telefono: "+54 11 6678-9051",
      fuente: "Doctoralia",
      interes: "Endodoncia",
      valor: 120000,
      etapa: "Turno agendado",
      creado: hace(6),
    }),
    base({
      id: "l7",
      nombre: "Nicolás Paredes",
      telefono: "+54 11 6789-2267",
      fuente: "Google",
      interes: "Implante",
      valor: 650000,
      etapa: "Convertido",
      creado: hace(12),
      campaniaId: "c2",
      actividad: [act("Etapa", "Se convirtió en paciente", 8)],
    }),
    base({
      id: "l8",
      nombre: "Agustina Molina",
      telefono: "+54 11 6890-4416",
      fuente: "Referido",
      interes: "Ortodoncia",
      valor: 480000,
      etapa: "Convertido",
      creado: hace(15),
      referidoPor: "Julián Ortega",
    }),
    base({
      id: "l9",
      nombre: "Franco Ibáñez",
      telefono: "+54 11 6901-7784",
      fuente: "Instagram",
      interes: "Carillas",
      valor: 380000,
      etapa: "Perdido",
      creado: hace(10),
      motivoPerdida: "Precio",
      campaniaId: "c1",
    }),
    base({
      id: "l11",
      nombre: "Valentina Ríos",
      telefono: "+54 11 6123-9087",
      fuente: "Instagram",
      interes: "Blanqueamiento",
      valor: 90000,
      etapa: "Convertido",
      creado: hace(9),
      campaniaId: "c1",
      actividad: [act("Etapa", "Se convirtió en paciente", 6)],
    }),
    base({
      id: "l10",
      nombre: "Brenda Castro",
      telefono: "+54 11 6012-5530",
      fuente: "Sitio web",
      interes: "Primera consulta",
      valor: 15000,
      etapa: "Convertido",
      creado: hace(20),
    }),
  ];
}

const CAMPANIAS: CampaniaAds[] = [
  {
    id: "c1",
    nombre: "Blanqueamiento primavera",
    canal: "Instagram Ads",
    objetivo: "Leads",
    tratamiento: "Blanqueamiento",
    presupuesto: 180000,
    gastado: 124000,
    impresiones: 48200,
    clics: 1320,
    inicio: dia(-20),
    fin: dia(10),
    estado: "Activa",
  },
  {
    id: "c2",
    nombre: "Implantes: evaluación sin cargo",
    canal: "Google Ads",
    objetivo: "Llamadas y turnos",
    tratamiento: "Implante",
    presupuesto: 250000,
    gastado: 210500,
    impresiones: 21400,
    clics: 860,
    inicio: dia(-30),
    fin: dia(0),
    estado: "Activa",
  },
  {
    id: "c3",
    nombre: "Ortodoncia invisible",
    canal: "Facebook Ads",
    objetivo: "Mensajes",
    tratamiento: "Ortodoncia",
    presupuesto: 120000,
    gastado: 0,
    impresiones: 0,
    clics: 0,
    inicio: dia(5),
    fin: dia(35),
    estado: "Programada",
  },
  {
    id: "c4",
    nombre: "Volantes barrio Centro",
    canal: "Volantes",
    objetivo: "Reconocimiento",
    tratamiento: "Primera consulta",
    presupuesto: 40000,
    gastado: 40000,
    impresiones: 3000,
    clics: 0,
    inicio: dia(-60),
    fin: dia(-40),
    estado: "Finalizada",
  },
];

const PROMOS: Promocion[] = [
  {
    id: "p1",
    titulo: "Blanqueamiento -20%",
    codigo: "BLANCO20",
    descuento: 20,
    tratamiento: "Blanqueamiento",
    desde: dia(-10),
    hasta: dia(20),
    limite: 50,
    usos: 14,
    activa: true,
  },
  {
    id: "p2",
    titulo: "Primera consulta bonificada",
    codigo: "BIENVENIDA",
    descuento: 100,
    tratamiento: "Primera consulta",
    desde: dia(-30),
    hasta: dia(60),
    limite: 200,
    usos: 61,
    activa: true,
  },
  {
    id: "p3",
    titulo: "Limpieza en familia",
    codigo: "FAMILIA15",
    descuento: 15,
    tratamiento: "Limpieza dental",
    desde: dia(-90),
    hasta: dia(-5),
    limite: 100,
    usos: 38,
    activa: false,
  },
];

const RESENAS: Resena[] = [
  {
    id: "r1",
    autor: "María G.",
    fuente: "Google",
    estrellas: 5,
    texto:
      "Excelente atención, la doctora me explicó todo y no me dolió nada. ¡Súper recomendable!",
    fecha: dia(-2),
    respuesta: "",
  },
  {
    id: "r2",
    autor: "Pablo R.",
    fuente: "Google",
    estrellas: 4,
    texto: "Muy buena atención. Tuve que esperar 15 minutos, pero el tratamiento fue impecable.",
    fecha: dia(-6),
    respuesta: "¡Gracias Pablo! Estamos trabajando para reducir las esperas.",
  },
  {
    id: "r3",
    autor: "Sol B.",
    fuente: "Doctoralia",
    estrellas: 5,
    texto: "Me hice un blanqueamiento y quedé feliz. Consultorio muy limpio y moderno.",
    fecha: dia(-9),
    respuesta: "",
  },
  {
    id: "r4",
    autor: "Ezequiel M.",
    fuente: "Facebook",
    estrellas: 3,
    texto: "Buena atención, pero me costó conseguir turno por teléfono.",
    fecha: dia(-15),
    respuesta: "",
  },
];

export const storeMarketing = crearStorePorEmpresa<EstadoMarketing>(
  () => ({
    leads: leadsEjemplo(),
    campanias: CAMPANIAS,
    promos: PROMOS,
    resenas: RESENAS,
    solicitudes: [],
    referidos: {
      activo: true,
      recompensaReferente: "Limpieza dental sin cargo",
      beneficioReferido: "Primera consulta bonificada",
    },
    formulario: {
      titulo: "Reservá tu evaluación",
      subtitulo: "Dejanos tus datos y te contactamos en menos de 24 h.",
      boton: "Quiero que me contacten",
      tratamientos: [
        "Primera consulta",
        "Limpieza dental",
        "Blanqueamiento",
        "Ortodoncia",
        "Implante",
        "Urgencia",
      ],
    },
  }),
  { persistir: "marketing" },
);

export function setMarketing<K extends keyof EstadoMarketing>(
  clave: K,
  fn: (prev: EstadoMarketing[K]) => EstadoMarketing[K],
) {
  const actual = storeMarketing.leer();
  storeMarketing.poner({ ...actual, [clave]: fn(actual[clave]) });
}

/** Leads atribuidos a una campaña y cuántos se convirtieron. */
export function resultadosCampania(c: CampaniaAds, leads: Lead[]) {
  const suyos = leads.filter((l) => l.campaniaId === c.id);
  const convertidos = suyos.filter((l) => l.etapa === "Convertido");
  const ingresos = convertidos.reduce((a, l) => a + l.valor, 0);
  return {
    leads: suyos.length,
    convertidos: convertidos.length,
    ingresos,
    cpl: suyos.length ? Math.round(c.gastado / suyos.length) : 0,
    ctr: c.impresiones ? (c.clics / c.impresiones) * 100 : 0,
    roi: c.gastado ? Math.round(((ingresos - c.gastado) / c.gastado) * 100) : 0,
  };
}
