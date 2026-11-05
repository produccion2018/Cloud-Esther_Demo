import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";

/* Ubicación: src/lib/cloud-esther/marketing-store.ts

   Marketing y captación, separado por empresa: leads (CRM), campañas de publicidad,
   promociones y cupones, programa de referidos, reseñas y formulario web.
   Arranca vacío: cada clínica carga sus propios datos.
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

export const storeMarketing = crearStorePorEmpresa<EstadoMarketing>(
  () => ({
    leads: [],
    campanias: [],
    promos: [],
    resenas: [],
    solicitudes: [],
    // El programa de referidos arranca apagado y sin beneficios: cada clínica define los suyos.
    referidos: {
      activo: false,
      recompensaReferente: "",
      beneficioReferido: "",
    },
    // Textos base del formulario web (la clínica los puede editar).
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