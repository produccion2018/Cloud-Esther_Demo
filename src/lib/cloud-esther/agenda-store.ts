import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";
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
};

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

const RECORDATORIOS_INICIAL: Recordatorio[] = [
  { id: 1, canal: "WhatsApp", cuando: "24 h antes del turno", activo: true },
  { id: 2, canal: "SMS", cuando: "2 h antes del turno", activo: true },
  { id: 3, canal: "Correo", cuando: "Al confirmar el turno", activo: true },
];
/* Profesional elegido para "ver el día de…": se comparte entre el Dashboard y la Agenda
   mientras dure la sesión del navegador, así no hay que elegirlo dos veces. */
const CLAVE_PROFESIONAL = "cloud-esther:profesional-visto";
export function leerProfesionalVisto(): string {
  try {
    return typeof window === "undefined" ? "" : (window.sessionStorage.getItem(CLAVE_PROFESIONAL) ?? "");
  } catch {
    return "";
  }
}
export function guardarProfesionalVisto(nombre: string) {
  try {
    if (nombre) window.sessionStorage.setItem(CLAVE_PROFESIONAL, nombre);
    else window.sessionStorage.removeItem(CLAVE_PROFESIONAL);
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
}
