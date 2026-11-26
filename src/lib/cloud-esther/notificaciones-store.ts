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
};

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

export type Preferencias = {
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
const esPersona = (n: string) => !!n.trim() && !["recordatorios", "automatizaciones", "sistema", "esther"].includes(normNombre(n));

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
    for (const n of items) sig[n.id] = { ...sig[n.id], ...cambio };
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