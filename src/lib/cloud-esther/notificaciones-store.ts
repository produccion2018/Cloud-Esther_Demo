import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";

/* Ubicación: src/lib/cloud-esther/notificaciones-store.ts

   Estado del centro de notificaciones, separado por empresa: avisos creados a mano,
   qué se leyó/completó/pospuso, preferencias de aviso e historial de acciones.
   Las alertas automáticas se calculan en vivo desde los otros módulos
   (ver useNotificaciones). TODO backend: API de notificaciones por clinicId + push. */

export const CATEGORIAS_NOTIF = [
  "Agenda",
  "Pacientes",
  "Comunicación",
  "Laboratorio",
  "Insumos",
  "Administración",
  "Equipo",
] as const;
export type CategoriaNotif = (typeof CATEGORIAS_NOTIF)[number];

export const PRIORIDADES_NOTIF = ["Urgente", "Alta", "Normal", "Baja"] as const;
export type PrioridadNotif = (typeof PRIORIDADES_NOTIF)[number];

export type NotifManual = {
  id: string;
  titulo: string;
  detalle: string;
  categoria: CategoriaNotif;
  prioridad: PrioridadNotif;
  asignado: string;
  vence: string; // yyyy-mm-dd o ""
  horaVence: string; // hh:mm o ""
  creada: string; // ISO
  creadaPor: string;
  /** Lista de pasos para tildar (las tareas que salen de una rutina) */
  checklist?: { texto: string; hecho: boolean; quien?: string }[];
  /** Rutina de la que salió (apertura, cierre, esterilización…) */
  rutinaId?: string;
};

/* ───────────── RUTINAS: tareas que se crean solas (apertura, cierre, esterilización…) ───────────── */
export type FrecuenciaRutina = "diaria" | "semanal" | "mensual";
export type Rutina = {
  id: string;
  nombre: string;
  pasos: string[];
  asignado: string;
  categoria: CategoriaNotif;
  prioridad: PrioridadNotif;
  frecuencia: FrecuenciaRutina;
  /** Diaria: qué días de la semana (0 = domingo … 6 = sábado). Semanal: el día (uno solo). */
  dias: number[];
  /** Mensual: el día del mes (1 a 28) */
  diaMes: number;
  /** Hora límite (opcional) */
  hora: string;
  activa: boolean;
  creadaPor: string;
  creada: string;
};
export const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/** Rutinas listas para usar (la clínica las cambia a su manera). */
export const PLANTILLAS_RUTINA: { nombre: string; pasos: string[]; asignado: string; categoria: CategoriaNotif; frecuencia: FrecuenciaRutina; hora: string }[] = [
  {
    nombre: "Apertura del consultorio",
    pasos: ["Encender equipos y compresor", "Revisar la agenda del día", "Preparar los consultorios", "Controlar insumos de cada sillón"],
    asignado: "Recepción",
    categoria: "Agenda",
    frecuencia: "diaria",
    hora: "09:00",
  },
  {
    nombre: "Cierre del día",
    pasos: ["Confirmar los turnos de mañana", "Cerrar la caja", "Apagar equipos y compresor", "Dejar los consultorios ordenados"],
    asignado: "Recepción",
    categoria: "Administración",
    frecuencia: "diaria",
    hora: "19:00",
  },
  {
    nombre: "Esterilización",
    pasos: ["Lavar y secar el instrumental", "Embolsar y rotular", "Cargar la autoclave", "Registrar el ciclo"],
    asignado: "",
    categoria: "Insumos",
    frecuencia: "diaria",
    hora: "",
  },
  {
    nombre: "Control de heladera",
    pasos: ["Anotar la temperatura", "Revisar vencimientos", "Avisar si algo falta"],
    asignado: "",
    categoria: "Insumos",
    frecuencia: "semanal",
    hora: "",
  },
  {
    nombre: "Revisión de stock",
    pasos: ["Contar lo que está por debajo del mínimo", "Armar el pedido al proveedor"],
    asignado: "Administración",
    categoria: "Insumos",
    frecuencia: "mensual",
    hora: "",
  },
];

const diaLocalRutina = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** ¿A esta rutina le toca hoy? */
export function rutinaTocaHoy(r: Rutina, d = new Date()): boolean {
  if (!r.activa) return false;
  if (r.frecuencia === "mensual") return d.getDate() === Math.min(28, Math.max(1, r.diaMes || 1));
  return r.dias.includes(d.getDay());
}

/** Crea las tareas de hoy de cada rutina que toca (una sola vez por día: el id lleva la fecha). */
export function generarRutinasDeHoy(): number {
  const est = storeNotificaciones.leer();
  const rutinas = est.rutinas ?? [];
  if (rutinas.length === 0) return 0;
  const hoy = diaLocalRutina();
  const existentes = new Set(est.manuales.map((m) => m.id));
  const nuevas: NotifManual[] = rutinas
    .filter((r) => rutinaTocaHoy(r) && !existentes.has(`rut-${r.id}-${hoy}`))
    .map((r) => ({
      id: `rut-${r.id}-${hoy}`,
      titulo: r.nombre,
      detalle: r.frecuencia === "diaria" ? "Rutina de todos los días." : r.frecuencia === "semanal" ? "Rutina semanal." : "Rutina mensual.",
      categoria: r.categoria,
      prioridad: r.prioridad,
      asignado: r.asignado,
      vence: hoy,
      horaVence: r.hora,
      creada: new Date().toISOString(),
      creadaPor: "Rutinas",
      checklist: r.pasos.filter(Boolean).map((texto) => ({ texto, hecho: false })),
      rutinaId: r.id,
    }));
  if (nuevas.length) setNotificaciones("manuales", (prev) => [...nuevas, ...prev]);
  return nuevas.length;
}

/** DEMO (sin servidor): sube a Dirección las tareas urgentes o altas sin atender.
    En una clínica real lo hace el servidor cada 15 minutos (aunque nadie tenga la app abierta). */
export function subirTareasSinAtenderLocal(): number {
  const est = storeNotificaciones.leer();
  const cfg = { ...ESCALAR_POR_DEFECTO, ...(est.preferencias.escalar ?? {}) };
  if (!cfg.activo) return 0;
  const ids = new Set(est.manuales.map((m) => m.id));
  const ahora = Date.now();
  const hoy = diaLocalRutina();
  const nuevas: NotifManual[] = [];
  for (const m of est.manuales) {
    if (m.id.startsWith("esc-") || m.id.startsWith("hecha-") || ids.has(`esc-${m.id}`)) continue;
    if (est.estados[m.id]?.completada || est.estados[m.id]?.oculta) continue;
    const horas = m.prioridad === "Urgente" ? cfg.horasUrgente : m.prioridad === "Alta" ? cfg.horasAlta : 0;
    const creada = Date.parse(m.creada);
    if (!horas || !Number.isFinite(creada) || ahora - creada < horas * 3_600_000) continue;
    nuevas.push({
      id: `esc-${m.id}`,
      titulo: `Sin atender: ${m.titulo}`.slice(0, 160),
      detalle: `Es ${m.prioridad.toLowerCase()} y nadie la completó en ${horas} h.${m.asignado ? ` Estaba para ${m.asignado}.` : " No tiene responsable."}`,
      categoria: m.categoria,
      prioridad: "Urgente",
      asignado: cfg.a || "Dirección",
      vence: hoy,
      horaVence: "",
      creada: new Date().toISOString(),
      creadaPor: "Cloud Esther",
    });
  }
  if (nuevas.length) setNotificaciones("manuales", (prev) => [...nuevas, ...prev]);
  return nuevas.length;
}

/** Tilda o destilda un paso de la lista. Devuelve true si con esto quedó todo hecho. */
export function marcarPaso(notifId: string, indice: number, hecho: boolean, usuario: string): boolean {
  let completa = false;
  setNotificaciones("manuales", (prev) =>
    prev.map((m) => {
      if (m.id !== notifId || !m.checklist) return m;
      const checklist = m.checklist.map((p, i) => (i === indice ? { ...p, hecho, quien: hecho ? usuario : "" } : p));
      completa = checklist.length > 0 && checklist.every((p) => p.hecho);
      return { ...m, checklist };
    }),
  );
  return completa;
}

export type EstadoNotif = {
  leida?: boolean;
  completada?: string; // ISO de cuándo se completó
  pospuestaHasta?: string; // ISO
  oculta?: boolean;
};

export type PreferenciaCategoria = {
  activa: boolean;
  app: boolean;
  email: boolean;
  whatsapp: boolean;
};

/** Si una tarea Urgente o Alta nadie la completa en X horas, se avisa a Dirección (Pro en adelante). */
export type EscalarTareas = { activo: boolean; horasUrgente: number; horasAlta: number; a: string };
export const ESCALAR_POR_DEFECTO: EscalarTareas = { activo: true, horasUrgente: 2, horasAlta: 24, a: "Dirección" };

export type Preferencias = {
  escalar?: EscalarTareas;
  categorias: Record<CategoriaNotif, PreferenciaCategoria>;
  resumenDiario: { activo: boolean; hora: string };
  noMolestar: { activo: boolean; desde: string; hasta: string };
  sonido: boolean;
};

export type EventoNotif = {
  id: string;
  fecha: string;
  usuario: string;
  accion: string;
  titulo: string;
};

export type EstadoNotificaciones = {
  manuales: NotifManual[];
  estados: Record<string, EstadoNotif>;
  preferencias: Preferencias;
  historial: EventoNotif[];
  /** Tareas que se repiten (apertura, cierre…) */
  rutinas?: Rutina[];
};

const PREF = (email = false, whatsapp = false): PreferenciaCategoria => ({
  activa: true,
  app: true,
  email,
  whatsapp,
});

const PREFERENCIAS: Preferencias = {
  categorias: {
    Agenda: PREF(true, false),
    Pacientes: PREF(),
    Comunicación: PREF(),
    Laboratorio: PREF(true, false),
    Insumos: PREF(true, false),
    Administración: PREF(true, false),
    Equipo: PREF(),
  },
  resumenDiario: { activo: true, hora: "08:00" },
  noMolestar: { activo: false, desde: "21:00", hasta: "07:00" },
  sonido: true,
};

/* Estado inicial: sin avisos ni historial de ejemplo, igual que producción.
   Se usa tanto para el demo como para una clínica real. */
const estadoInicial = (): EstadoNotificaciones => ({
  manuales: [],
  estados: {},
  preferencias: PREFERENCIAS,
  historial: [],
});

export const storeNotificaciones = crearStorePorEmpresa<EstadoNotificaciones>(estadoInicial, {
  persistir: "notificaciones",
  vacio: estadoInicial,
});

type Actualizar<T> = T | ((prev: T) => T);

export function setNotificaciones<K extends keyof EstadoNotificaciones>(
  clave: K,
  a: Actualizar<EstadoNotificaciones[K]>,
) {
  const actual = storeNotificaciones.leer();
  const valor =
    typeof a === "function"
      ? (a as (p: EstadoNotificaciones[K]) => EstadoNotificaciones[K])(actual[clave])
      : a;
  storeNotificaciones.poner({ ...actual, [clave]: valor });
}

/* ───────────── «Mis tareas»: qué es de cada persona ───────────── */
const normNombre = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
/** Áreas a las que se asignan tareas y qué rol las atiende. */
export const AREAS_TAREAS: Record<string, string[]> = { recepcion: ["secretaria"], administracion: ["admin"], direccion: ["admin"] };
/** ¿Esta tarea es mía? (asignada a mi nombre o a mi área) */
export function esParaMi(asignado: string, miNombre: string, miRol?: string | null): boolean {
  const a = normNombre(asignado);
  if (!a) return false;
  if (miNombre && a === normNombre(miNombre)) return true;
  return !!miRol && (AREAS_TAREAS[a] ?? []).includes(miRol);
}
/** Quién creó una tarea es una persona (no un recordatorio automático del sistema) */
const esPersona = (n: string) => !!n.trim() && !["recordatorios", "rutinas", "automatizaciones", "sistema", "esther"].includes(normNombre(n));

/** Cambia el estado de una o varias notificaciones y lo deja en el historial. */
export function cambiarEstadoNotif(
  items: { id: string; titulo: string }[],
  cambio: EstadoNotif,
  accion: string | null,
  usuario: string,
) {
  const antes = storeNotificaciones.leer();
  setNotificaciones("estados", (prev) => {
    const sig = { ...prev };
    for (const n of items) {
      sig[n.id] = { ...sig[n.id], ...cambio };
      // Si se resuelve una tarea que había «subido» a Dirección, el aviso de Dirección también
      if (cambio.completada && antes.manuales.some((m) => m.id === `esc-${n.id}`)) sig[`esc-${n.id}`] = { ...sig[`esc-${n.id}`], completada: cambio.completada, leida: true };
    }
    return sig;
  });
  // Tarea hecha → aviso a quien la creó (le llega en la app y, si lo activó, en el celular)
  if (cambio.completada) {
    const hechas = items
      .map((n) => antes.manuales.find((m) => m.id === n.id))
      .filter(
        (m): m is NotifManual =>
          !!m &&
          !m.id.startsWith("hecha-") &&
          !antes.estados[m.id]?.completada &&
          esPersona(m.creadaPor) &&
          normNombre(m.creadaPor) !== normNombre(usuario),
      );
    if (hechas.length) {
      const ahora = new Date();
      const dia = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;
      setNotificaciones("manuales", (prev) => [
        ...hechas.map((m) => ({
          id: `hecha-${m.id}`,
          titulo: `${usuario} completó: ${m.titulo}`.slice(0, 160),
          detalle: m.asignado ? `Era para ${m.asignado}.` : "",
          categoria: m.categoria,
          prioridad: "Baja" as PrioridadNotif,
          asignado: m.creadaPor,
          vence: dia,
          horaVence: "",
          creada: ahora.toISOString(),
          creadaPor: usuario,
        })),
        ...prev.filter((x) => !hechas.some((h) => x.id === `hecha-${h.id}`)),
      ]);
    }
  }
  if (accion) {
    const ahora = new Date().toISOString();
    setNotificaciones("historial", (prev) => [
      ...items.map((n, i) => ({
        id: `${Date.now()}-${i}`,
        fecha: ahora,
        usuario,
        accion,
        titulo: n.titulo,
      })),
      ...prev,
    ]);
  }
}