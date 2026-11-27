import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";
import type { Turno } from "@/lib/cloud-esther/agenda-store";

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
  /** Paciente creado o encontrado al darle turno */
  pacienteId?: number;
  /** Turno que se le dio (cuando se atiende, el lead pasa solo a «Convertido») */
  turnoId?: number;
};

/** Horas sin respuesta para avisar que hay que volver a escribirle. */
export const HORAS_SEGUIMIENTO_LEAD = 48;
/** Último contacto con el lead (la actividad más reciente o, si no hay, cuando se cargó) */
export const ultimoContactoLead = (l: Lead) => [l.creado, ...l.actividad.map((a) => a.fecha)].sort().at(-1) ?? l.creado;
/** ¿Hace más de 48 h que nadie le escribe a este lead (y sigue abierto)? */
export function leadSinRespuesta(l: Lead, ahora = Date.now()): boolean {
  if (l.etapa !== "Nuevo" && l.etapa !== "Contactado") return false;
  const t = Date.parse(ultimoContactoLead(l));
  return Number.isFinite(t) && ahora - t >= HORAS_SEGUIMIENTO_LEAD * 3_600_000;
}

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

export type CodigoReferido = { pacienteId: number; nombre: string; creado: string };

export type ConfigReferidos = {
  activo: boolean;
  recompensaReferente: string;
  beneficioReferido: string;
  /** Link personal de cada paciente: código al azar → quién es (no se puede adivinar) */
  codigos?: Record<string, CodigoReferido>;
  /** Premios ya entregados a quien recomendó: id del lead que vino → fecha */
  premiosEntregados?: Record<string, string>;
};

const LETRAS_CODIGO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
/** Código del link de referido: 4 letras del nombre + 4 al azar (ej. MARI7K2Q) */
export function nuevoCodigoReferido(nombre: string): string {
  const base = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 4)
    .padEnd(2, "X");
  const azar = new Uint32Array(4);
  crypto.getRandomValues(azar);
  return base + Array.from(azar, (n) => LETRAS_CODIGO[n % LETRAS_CODIGO.length]).join("");
}

/** El código del paciente (si la clínica ya le creó su link) */
export function codigoDePaciente(r: ConfigReferidos, pacienteId: number): string | null {
  return Object.entries(r.codigos ?? {}).find(([, c]) => c.pacienteId === pacienteId)?.[0] ?? null;
}

export type FormatoRed = "Publicación" | "Historia" | "Reel";
/** Idea para redes que la clínica guardó (para publicar después) */
export type IdeaRed = {
  id: string;
  formato: FormatoRed;
  titulo: string;
  texto: string;
  imagen: string;
  creado: string;
  /** Día en que la piensan publicar (yyyy-mm-dd) o "" */
  fecha: string;
  publicada: boolean;
};

export type EstadoMarketing = {
  /** Ideas para redes guardadas (Esther las propone, la clínica decide) */
  ideasRedes?: IdeaRed[];
  leads: Lead[];
  campanias: CampaniaAds[];
  promos: Promocion[];
  resenas: Resena[];
  solicitudes: SolicitudResena[];
  referidos: ConfigReferidos;
  formulario: { titulo: string; subtitulo: string; boton: string; tratamientos: string[] };
  /** Enlace de la ficha de Google de la clínica para dejar reseñas (se ofrece a quien puntúa 4 o 5). */
  enlaceResenas?: string;
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
export type DatosFuente = {
  f: Fuente;
  leads: number;
  pacientes: number;
  perdidos: number;
  /** % de leads que terminaron siendo pacientes */
  conversion: number;
  /** Suma del valor estimado que cargó la clínica en los leads convertidos */
  valor: number;
  /** Días promedio desde que llegó hasta que fue paciente (null si todavía no hay) */
  dias: number | null;
};

/** Cuándo pasó a «Convertido» (la última actividad de etapa que lo dice) */
function fechaConversion(l: Lead): string | null {
  const a = l.actividad.find((x) => x.tipo === "Etapa" && x.texto.includes("Convertido"));
  return a?.fecha ?? null;
}

/** ¿De dónde vienen los pacientes? Leads, pacientes y conversión por canal, en el período elegido. */
export function analisisPorFuente(leads: Lead[], desdeDias: number | null, ahora = Date.now()): DatosFuente[] {
  const corte = desdeDias == null ? 0 : ahora - desdeDias * 86_400_000;
  const delPeriodo = leads.filter((l) => new Date(l.creado).getTime() >= corte);
  return FUENTES.map((f) => {
    const suyos = delPeriodo.filter((l) => l.fuente === f);
    const conv = suyos.filter((l) => l.etapa === "Convertido");
    const tiempos = conv
      .map((l) => {
        const fc = fechaConversion(l);
        return fc ? (new Date(fc).getTime() - new Date(l.creado).getTime()) / 86_400_000 : null;
      })
      .filter((d): d is number => d != null && d >= 0);
    return {
      f,
      leads: suyos.length,
      pacientes: conv.length,
      perdidos: suyos.filter((l) => l.etapa === "Perdido").length,
      conversion: suyos.length ? Math.round((conv.length / suyos.length) * 100) : 0,
      valor: conv.reduce((a, l) => a + (l.valor || 0), 0),
      dias: tiempos.length ? Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length) : null,
    };
  })
    .filter((x) => x.leads > 0)
    .sort((a, b) => b.pacientes - a.pacientes || b.leads - a.leads);
}

export type EstadoLeadAgenda = "vino" | "falto" | "proximo" | "cancelo" | "sin-turno";

const nombreClave = (n: string) =>
  n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Turnos de la Agenda que corresponden a este lead: el que se le dio y los que tuvo después con su nombre. */
export function turnosDelLead(l: Lead, turnos: Turno[]): Turno[] {
  const desde = l.creado.slice(0, 10);
  const clave = nombreClave(l.nombre);
  return turnos.filter(
    (t) => (l.turnoId != null && t.id === l.turnoId) || (t.fecha >= desde && nombreClave(t.paciente) === clave),
  );
}

/** Qué pasó en la Agenda con este lead (vino, faltó, tiene turno, canceló o nunca pidió turno). */
export function estadoLeadEnAgenda(l: Lead, turnos: Turno[]): { estado: EstadoLeadAgenda; turno?: Turno } {
  const suyos = turnosDelLead(l, turnos).sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  const vino = suyos.find((t) => t.estado === "Atendida");
  if (vino) return { estado: "vino", turno: vino };
  const proximo = suyos.find((t) => t.estado === "Pendiente" || t.estado === "Confirmada");
  if (proximo) return { estado: "proximo", turno: proximo };
  const falto = [...suyos].reverse().find((t) => t.estado === "Ausente");
  if (falto) return { estado: "falto", turno: falto };
  const cancelo = [...suyos].reverse().find((t) => t.estado === "Cancelada");
  if (cancelo) return { estado: "cancelo", turno: cancelo };
  return { estado: "sin-turno" };
}

/** Resultado real de una campaña medido con la Agenda: cuántos pidieron turno, vinieron o faltaron. */
export function campaniaEnAgenda(c: CampaniaAds, leads: Lead[], turnos: Turno[]) {
  const suyos = leads.filter((l) => l.campaniaId === c.id);
  const detalle = suyos.map((l) => ({ lead: l, ...estadoLeadEnAgenda(l, turnos) }));
  const cuenta = (e: EstadoLeadAgenda) => detalle.filter((d) => d.estado === e).length;
  const vinieron = cuenta("vino");
  return {
    leads: suyos.length,
    conTurno: suyos.length - cuenta("sin-turno"),
    vinieron,
    faltaron: cuenta("falto"),
    proximos: cuenta("proximo"),
    cancelaron: cuenta("cancelo"),
    /** Lo que costó cada paciente que efectivamente vino (null si todavía no vino nadie) */
    costoPorPaciente: vinieron && c.gastado ? Math.round(c.gastado / vinieron) : null,
    detalle,
  };
}
