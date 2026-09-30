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

function hoyMas(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function haceHoras(h: number) {
  return new Date(Date.now() - h * 3_600_000).toISOString();
}

function manualesEjemplo(): NotifManual[] {
  return [
    {
      id: "m-1",
      titulo: "Llamar al proveedor de implantes",
      detalle: "Confirmar la entrega del kit de implantes para la cirugía del jueves.",
      categoria: "Insumos",
      prioridad: "Alta",
      asignado: "Administración",
      vence: hoyMas(0),
      horaVence: "12:00",
      creada: haceHoras(3),
      creadaPor: "Recepción",
    },
    {
      id: "m-2",
      titulo: "Enviar factura a obra social",
      detalle: "Presentar las prestaciones del mes de OSDE antes del cierre.",
      categoria: "Administración",
      prioridad: "Normal",
      asignado: "Administración",
      vence: hoyMas(2),
      horaVence: "",
      creada: haceHoras(20),
      creadaPor: "Administración",
    },
    {
      id: "m-3",
      titulo: "Revisar autoclave",
      detalle: "Service técnico programado: dejar el equipo libre a las 18 h.",
      categoria: "Equipo",
      prioridad: "Normal",
      asignado: "",
      vence: hoyMas(1),
      horaVence: "18:00",
      creada: haceHoras(26),
      creadaPor: "Dirección",
    },
    {
      id: "m-4",
      titulo: "Actualizar precios de la lista",
      detalle: "Aplicar el aumento acordado a partir del día 1.",
      categoria: "Administración",
      prioridad: "Baja",
      asignado: "",
      vence: hoyMas(-1),
      horaVence: "",
      creada: haceHoras(50),
      creadaPor: "Dirección",
    },
  ];
}

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

export const storeNotificaciones = crearStorePorEmpresa<EstadoNotificaciones>(() => ({
  manuales: manualesEjemplo(),
  estados: { "m-4": { completada: haceHoras(10), leida: true } },
  preferencias: PREFERENCIAS,
  historial: [
    {
      id: "h-1",
      fecha: haceHoras(10),
      usuario: "Administración",
      accion: "Completó",
      titulo: "Actualizar precios de la lista",
    },
    {
      id: "h-2",
      fecha: haceHoras(20),
      usuario: "Administración",
      accion: "Creó",
      titulo: "Enviar factura a obra social",
    },
    {
      id: "h-3",
      fecha: haceHoras(3),
      usuario: "Recepción",
      accion: "Creó",
      titulo: "Llamar al proveedor de implantes",
    },
  ],
}), { persistir: "notificaciones" });

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

/** Cambia el estado de una o varias notificaciones y lo deja en el historial. */
export function cambiarEstadoNotif(
  items: { id: string; titulo: string }[],
  cambio: EstadoNotif,
  accion: string | null,
  usuario: string,
) {
  setNotificaciones("estados", (prev) => {
    const sig = { ...prev };
    for (const n of items) sig[n.id] = { ...sig[n.id], ...cambio };
    return sig;
  });
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
