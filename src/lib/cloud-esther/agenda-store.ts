import { claveTenant, crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";
import { TEAM_MEMBERS } from "@/lib/cloud-esther/equipo-profesional-data";
import { capitalizarNombre } from "@/lib/utils";

/* Ubicación: src/lib/cloud-esther/agenda-store.ts

   Agenda compartida entre "Agenda y turnos" y el Dashboard (lo que se agenda en uno
   se ve en el otro), separada por empresa. TODO backend: API de turnos por clinicId. */

export type EstadoTurno = "Atendida" | "Confirmada" | "Pendiente" | "Ausente" | "Cancelada";

export type Turno = {
  id: number;
  fecha: string;
  hora: string;
  paciente: string;
  tratamiento: string;
  odontologo: string;
  sucursal: string;
  gabinete: string;
  estado: EstadoTurno;
  notas: string;
  /** Hora en que el paciente llegó a la clínica (ISO). Mientras no lo atienden, está "en sala". */
  llegada?: string;
  /** Hora en que pasó al consultorio (ISO), para saber cuánto esperó. */
  atendidoEn?: string;
  /** Minutos que dura el turno (si falta, la duración habitual de la clínica). */
  duracion?: number;
  /** Turnos repetidos (p. ej. ortodoncia cada 30 días): misma serie, número y total. */
  serie?: string;
  serieN?: number;
  serieTotal?: number;
  /** Turno de una sesión de un tratamiento del paciente (para registrar la sesión al atenderlo). */
  tratamientoId?: number;
  /** Lo que respondió el paciente con el enlace del recordatorio (confirmó, pidió cambiar o canceló). */
  respuestaPaciente?: { tipo: "confirmo" | "cambiar" | "cancelo"; fecha: string; nota?: string; avisada?: boolean };
};

export type Repeticion = { cada: number; unidad: "dias" | "semanas" | "meses"; veces: number };
/* Fechas de una serie a partir de la primera (incluida). Los meses respetan el día (31 → último día). */
export function fechasDeSerie(desde: string, r: Repeticion): string[] {
  const [y = 2000, m = 1, d = 1] = desde.split("-").map(Number);
  const out: string[] = [];
  for (let i = 0; i < r.veces; i++) {
    let f: Date;
    if (r.unidad === "meses") {
      const mes = m - 1 + i * r.cada;
      const ultimo = new Date(y, mes + 1, 0).getDate();
      f = new Date(y, mes, Math.min(d, ultimo));
    } else {
      f = new Date(y, m - 1, d + i * r.cada * (r.unidad === "semanas" ? 7 : 1));
    }
    out.push(`${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`);
  }
  return out;
}

/* Tiempos de la agenda: los define cada clínica a su criterio (profesionales o administración). */
export type AjustesAgenda = {
  /** Cada cuántos minutos se ofrecen horarios (5, 10, 15, 20, 30…). */
  intervaloMin?: number;
  /** Duración habitual de un turno, en minutos. */
  duracionMin?: number;
  /** "Para volver a llamar": meses sin venir para sugerir un control (lo elige la clínica). */
  recallMeses?: number;
  /** Pacientes ya avisados para volver (id del paciente → fecha del aviso). */
  recallAvisados?: Record<string, string>;
};
export const INTERVALO_DEFECTO = 30;
export function tiemposAgenda(a?: AjustesAgenda) {
  const intervalo = Math.min(240, Math.max(5, Math.round(a?.intervaloMin ?? INTERVALO_DEFECTO)));
  const duracion = Math.min(480, Math.max(5, Math.round(a?.duracionMin ?? intervalo)));
  return { intervalo, duracion };
}
export function aMinutos(hora: string) {
  const [h = 0, m = 0] = (hora ?? "").split(":").map(Number);
  return h * 60 + m;
}
export function aHora(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}
/* Horarios del día (08:00 a 20:00) cada `intervalo` minutos */
export function horariosDelDia(intervalo: number) {
  const out: string[] = [];
  for (let m = 8 * 60; m < 20 * 60; m += intervalo) out.push(aHora(m));
  return out;
}
/* ¿El turno ocupa algo entre [desde, hasta)? (minutos del día) */
export function turnoSolapa(t: Turno, desde: number, hasta: number, duracionDefecto: number) {
  const ini = aMinutos(t.hora);
  const fin = ini + (t.duracion ?? duracionDefecto);
  return ini < hasta && fin > desde;
}

export type NuevaCita = Omit<Turno, "id" | "estado">;
export type Bloqueo = {
  id: number;
  fecha: string;
  desde: string;
  hasta: string;
  motivo: string;
};
export type Espera = {
  id: number;
  nombre: string;
  motivo: string;
  franja: string;
  sucursal: string;
  /* Preferencias para la recuperación inteligente. Opcionales: los registros guardados antes
     no las traen, y "" / vacío significa "cualquiera". */
  /** Profesional preferido ("" = cualquiera). */
  odontologo?: string;
  /** Especialidad preferida ("" = cualquiera). */
  especialidad?: string;
  /** Días de la semana preferidos (0=Dom … 6=Sáb). Vacío = cualquiera. */
  dias?: number[];
  /** Prioridad para ordenar a quién se le ofrece primero. */
  prioridad?: "normal" | "urgente";
  /** Teléfono/contacto para el aviso (WhatsApp cuando se conecte el canal). */
  telefono?: string;
  /** Alta en la lista (ISO). */
  creada?: string;
};

/** Oferta de un turno liberado (por una cancelación) a un paciente de la lista de espera.
    Es el corazón de la recuperación automática de turnos. */
export type EstadoOferta = "ofrecida" | "aceptada" | "vencida" | "rechazada" | "cancelada";
export type Oferta = {
  id: number;
  // Datos del turno liberado
  fecha: string;
  hora: string;
  odontologo: string;
  sucursal: string;
  tratamiento: string;
  // A quién se le ofrece
  candidato: string;
  esperaId?: number;
  telefono?: string;
  // Estado del ofrecimiento
  estado: EstadoOferta;
  /** Canal por el que se avisó ("Aviso interno" siempre; WhatsApp/Email cuando se conecten). */
  canal: string;
  creada: string; // ISO
  vence: string; // ISO
};
export type Recordatorio = {
  id: number;
  canal: string;
  cuando: string;
  activo: boolean;
};
export type Tarea = {
  id: number;
  texto: string;
  categoria: string;
  paciente: string;
  fecha: string;
  hecha: boolean;
  /** Integrante a cargo (portal administrativo). */
  responsable?: string;
  /** Fecha límite (ISO, día). */
  vence?: string;
};
export type NuevaTarea = Omit<Tarea, "id" | "hecha">;

// Sedes de la clínica. El dueño las define en Configuración → Sucursales; acá queda la lista
// "viva" que usan la agenda, el inventario, etc. Por defecto, una sola sede.
export const SUCURSALES = ["Sede principal"];
/* Odontólogos de ejemplo = los del equipo de ejemplo. En la agenda se usan los del
   equipo real de la empresa (useEquipo), así que si agregás uno en Equipo aparece acá. */
export const ODONTOLOGOS = TEAM_MEMBERS.filter((m) => m.role === "odontologo").map((m) =>
  `${m.firstName} ${m.lastName}`.trim(),
);
/* Consultorios (antes "gabinetes"): el box o sillón donde se atiende el turno. */
export const GABINETES = ["Consultorio 1", "Consultorio 2", "Consultorio 3", "Consultorio 4"];
/* Los turnos guardados con el nombre viejo ("Gabinete 2") se muestran como "Consultorio 2". */
export function nombreConsultorio(g: string) {
  return (g ?? "").replace(/^Gabinete\b/i, "Consultorio");
}

/* Clínica real (Etapa 8b): sin sucursales ni odontólogos de ejemplo. La sucursal es la clínica
   y los odontólogos son los que cargue en Equipo. (Se ajusta al abrir las pantallas.) */
export function ajustarCatalogosClinica(nombreClinica: string, sucursalesDueno?: string[]) {
  // Sucursales que definió el dueño (sin vacíos ni repetidos). Si no cargó ninguna, la sede es la
  // clínica (una sola), así nunca aparecen nombres de ejemplo como "Norte/Sur".
  const propias = (sucursalesDueno ?? [])
    .map((s) => s.trim())
    .filter((s, i, a) => s && a.indexOf(s) === i);
  const destino = propias.length ? propias : [nombreClinica];
  const igual =
    SUCURSALES.length === destino.length && destino.every((s, i) => SUCURSALES[i] === s);
  if (!igual) SUCURSALES.splice(0, SUCURSALES.length, ...destino);
  if (ODONTOLOGOS.length) ODONTOLOGOS.splice(0, ODONTOLOGOS.length);
}
export const TRATAMIENTOS = [
  "Primera consulta",
  "Control",
  "Limpieza dental",
  "Restauración",
  "Endodoncia",
  "Extracción",
  "Control de ortodoncia",
  "Blanqueamiento",
  "Evaluación de implante",
  "Urgencia",
];

/* Estado de la agenda separado por empresa: se conserva al navegar por el demo
   y ninguna clínica ve los turnos de otra. TODO backend: API de turnos por clinicId. */
/** Feriado o día que la clínica no atiende (lo carga cada clínica: varían por país y ciudad). */
export type Feriado = { id: number; fecha: string; nombre: string };

export type EstadoAgenda = {
  turnos: Turno[];
  bloqueos: Bloqueo[];
  espera: Espera[];
  recordatorios: Recordatorio[];
  tareas: Tarea[];
  /** Feriados y cierres de la clínica (opcional: los datos guardados antes no lo traen). */
  feriados?: Feriado[];
  /** Ofertas de recuperación de turnos liberados (opcional en datos viejos). */
  ofertas?: Oferta[];
  /** Tiempos de la agenda de la clínica (opcional en datos viejos). */
  ajustes?: AjustesAgenda;
};

/* Arranca vacío (sin turnos, lista de espera ni tareas de ejemplo), igual que producción. */
export const storeAgenda = crearStorePorEmpresa<EstadoAgenda>(
  () => ({
    turnos: [],
    bloqueos: [],
    espera: [],
    recordatorios: RECORDATORIOS_INICIAL,
    tareas: [],
    ofertas: [],
  }),
  { persistir: "agenda", normalizar: nombresProlijosAgenda },
);

/* El nombre del paciente en turnos, lista de espera y tareas: mayúscula inicial siempre. */
function arreglarLista<X>(lista: X[] | undefined, campo: keyof X): [X[] | undefined, boolean] {
  if (!Array.isArray(lista)) return [lista, false];
  let cambio = false;
  const nueva = lista.map((x) => {
    const v = x[campo];
    if (typeof v !== "string") return x;
    const bien = capitalizarNombre(v);
    if (bien === v) return x;
    cambio = true;
    return { ...x, [campo]: bien };
  });
  return [cambio ? nueva : lista, cambio];
}
function nombresProlijosAgenda(e: EstadoAgenda): EstadoAgenda {
  if (!e || typeof e !== "object") return e;
  const [turnos, a] = arreglarLista(e.turnos, "paciente");
  const [espera, b] = arreglarLista(e.espera, "nombre");
  const [tareas, c] = arreglarLista(e.tareas, "paciente");
  // "Gabinete N" pasa a llamarse "Consultorio N"
  let d = false;
  const turnosFinal = turnos?.map((t) => {
    const g = nombreConsultorio(t.gabinete);
    if (g === t.gabinete) return t;
    d = true;
    return { ...t, gabinete: g };
  });
  return a || b || c || d ? ({ ...e, turnos: turnosFinal, espera, tareas } as EstadoAgenda) : e;
}

type Actualizar<T> = T | ((prev: T) => T);
function setterAgenda<K extends keyof EstadoAgenda>(clave: K) {
  return (a: Actualizar<EstadoAgenda[K]>) => {
    const actual = storeAgenda.leer();
    const valor =
      typeof a === "function" ? (a as (p: EstadoAgenda[K]) => EstadoAgenda[K])(actual[clave]) : a;
    storeAgenda.poner({ ...actual, [clave]: valor });
  };
}
export const setTurnosStore = setterAgenda("turnos");
export const setBloqueosStore = setterAgenda("bloqueos");
export const setEsperaStore = setterAgenda("espera");
export const setRecordatoriosStore = setterAgenda("recordatorios");
export const setTareasStore = setterAgenda("tareas");
export const setFeriadosStore = setterAgenda("feriados");
export const setOfertasStore = setterAgenda("ofertas");
export const setAjustesAgendaStore = setterAgenda("ajustes");

const RECORDATORIOS_INICIAL: Recordatorio[] = [
  { id: 1, canal: "WhatsApp", cuando: "24 h antes del turno", activo: true },
  { id: 2, canal: "SMS", cuando: "2 h antes del turno", activo: true },
  { id: 3, canal: "Correo", cuando: "Al confirmar el turno", activo: true },
];
/* Profesional elegido para "ver el día de…": se comparte entre el Dashboard y la Agenda
   mientras dure la sesión del navegador, así no hay que elegirlo dos veces. */
// Por empresa: en multiempresa cada clínica recuerda su propio profesional elegido
const CLAVE_PROFESIONAL_BASE = "cloud-esther:profesional-visto";
const CLAVE_PROFESIONAL = () => claveTenant(CLAVE_PROFESIONAL_BASE);
export function leerProfesionalVisto(): string {
  try {
    return typeof window === "undefined" ? "" : (window.sessionStorage.getItem(CLAVE_PROFESIONAL()) ?? "");
  } catch {
    return "";
  }
}
export function guardarProfesionalVisto(nombre: string) {
  try {
    if (nombre) window.sessionStorage.setItem(CLAVE_PROFESIONAL(), nombre);
    else window.sessionStorage.removeItem(CLAVE_PROFESIONAL());
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
}
