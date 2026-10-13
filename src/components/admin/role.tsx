import { createContext, useContext, useState, type ReactNode } from "react";

import { leerSesion, useSesionAdmin } from "@/lib/admin/sesion";
import type { AdminRole, Permiso } from "@/lib/admin/tipos";

export type { AdminRole };

export const roleLabel: Record<AdminRole, string> = {
  owner: "Dueño",
  partner: "Socio",
  support: "Soporte técnico",
  "customer-care": "Asistente / Secretaría",
};

export const roleDescription: Record<AdminRole, string> = {
  owner: "Acceso total: negocio, importes, planes y precios, equipo y configuración.",
  partner: "Acceso total, igual que el Dueño: negocio, importes, planes y precios, equipo y configuración.",
  support: "Técnico en sistemas / desarrollo: tickets, clínicas, consumo de IA y registros.",
  "customer-care": "Atención y seguimiento: demos para contactar, clínicas, pagos y tickets.",
};

export const roleInitials: Record<AdminRole, string> = {
  owner: "DU",
  partner: "SO",
  support: "ST",
  "customer-care": "AS",
};

export const ROLES: AdminRole[] = ["owner", "partner", "support", "customer-care"];

/** Roles que se pueden dar desde "Equipo y accesos" (el Dueño se crea una sola vez, en el servidor). */
export const ROLES_ASIGNABLES: AdminRole[] = ["partner", "support", "customer-care"];

/** Dueño y Socio ven y administran TODO el panel, sin restricciones (decisión del 9 oct). */
export const accesoTotal = (r: AdminRole) => r === "owner" || r === "partner";

/* ───────────── Permisos por persona (pedido de Camilo, 13 oct) ─────────────
   Dueño y Socio: todo. El resto: lo que el Dueño o el Socio les tildaron en «Equipo y accesos».
   El rol solo da las casillas iniciales. Esto controla lo que se VE: el servidor valida igual. */
export const PERMISOS: { id: Permiso; nombre: string; detalle: string }[] = [
  { id: "demos", nombre: "Demos e interesados", detalle: "Ver los demos, dar más tiempo o ingresos y responder pedidos." },
  { id: "contrataciones", nombre: "Contrataciones", detalle: "Ver las solicitudes, dejar notas, activar y rechazar." },
  { id: "cobranza", nombre: "Pagos y cobranza", detalle: "Estado de pagos de las clínicas y recordatorios de pago." },
  { id: "importes", nombre: "Importes y facturación", detalle: "Montos de cada clínica y cobros en línea (Paddle)." },
  { id: "atencion", nombre: "Atención a clínicas", detalle: "Casos, mensajes y seguimientos con las clínicas." },
  { id: "soporte", nombre: "Soporte técnico", detalle: "Tickets, incidentes y tareas internas." },
  { id: "personal", nombre: "Personal", detalle: "Empleados, asistencia, ausencias y documentos." },
  { id: "nomina", nombre: "Nómina y sueldos", detalle: "Liquidaciones, pagos de sueldos y anticipos." },
  { id: "gastos", nombre: "Gastos, proveedores y contratos", detalle: "Gastos de la empresa, proveedores y contratos." },
  { id: "paises", nombre: "Países", detalle: "Ver los países donde se vende (cambiarlos: solo Dueño y Socio)." },
  { id: "ia", nombre: "Consumo de IA", detalle: "Minutos de IA usados por las clínicas." },
  { id: "reportes", nombre: "Reportes", detalle: "Reportes del negocio." },
  { id: "auditoria", nombre: "Auditoría", detalle: "Ingresos al panel, sesiones e intentos fallidos." },
  { id: "actividad", nombre: "Actividad del equipo", detalle: "Qué hizo cada persona del equipo." },
];
const TODOS: Permiso[] = PERMISOS.map((p) => p.id);

/** Casillas iniciales de cada rol (las mismas que usa el servidor). */
export const PERMISOS_DEL_ROL: Record<AdminRole, Permiso[]> = {
  owner: TODOS,
  partner: TODOS,
  "customer-care": ["demos", "contrataciones", "cobranza", "atencion", "soporte", "paises"],
  support: ["soporte", "ia", "auditoria"],
};

/** Permisos de quien está usando el panel (vista previa de otro rol: los iniciales de ese rol). */
export function permisosDe(r: AdminRole): Permiso[] {
  if (accesoTotal(r)) return TODOS;
  const s = leerSesion();
  if (s && s.usuario.rol === r && s.usuario.permisos) return s.usuario.permisos;
  return PERMISOS_DEL_ROL[r];
}
export const puede = (r: AdminRole, ...p: Permiso[]) => {
  const mios = permisosDe(r);
  return p.some((x) => mios.includes(x));
};

const TODOS_LOS_ROLES = (_r: AdminRole) => true;
const SOLO_DUENO_Y_SOCIO = (r: AdminRole) => accesoTotal(r);
const con =
  (...p: Permiso[]) =>
  (r: AdminRole) =>
    puede(r, ...p);

/**
 * Qué se necesita para entrar a cada sección del panel.
 * Ruta que no figura acá = nadie accede (denegado por defecto).
 */
export const sectionAccess: Record<string, (r: AdminRole) => boolean> = {
  "/admin": TODOS_LOS_ROLES,
  "/admin/demos": con("demos"),
  "/admin/clinicas": TODOS_LOS_ROLES,
  "/admin/pagos": con("cobranza", "importes"),
  "/admin/planes": SOLO_DUENO_Y_SOCIO,
  "/admin/paises": con("paises"),
  "/admin/ia": con("ia"),
  "/admin/soporte": con("soporte"),
  "/admin/atencion": con("atencion", "soporte"),
  "/admin/personal": con("personal"),
  "/admin/nomina": con("nomina"),
  "/admin/gastos": con("gastos"),
  "/admin/reportes": con("reportes"),
  "/admin/auditoria": con("auditoria"),
  "/admin/actividad": con("actividad"),
  "/admin/notificaciones": TODOS_LOS_ROLES,
  "/admin/cuenta": TODOS_LOS_ROLES,
  "/admin/accesos": SOLO_DUENO_Y_SOCIO,
};

export function canAccess(role: AdminRole, path: string): boolean {
  const regla = sectionAccess[path];
  return regla ? regla(role) : false;
}

/** Permisos finos dentro de las secciones. */
export const permisos = {
  verImportes: (r: AdminRole) => puede(r, "importes"),
  editarPlanes: (r: AdminRole) => accesoTotal(r),
  /** Habilitar países y cambiar sus datos fiscales: Dueño y Socio. */
  editarPaises: (r: AdminRole) => accesoTotal(r),
  /** Límites del período de prueba (duración, espera, cuentas sin límite). */
  configurarDemo: (r: AdminRole) => accesoTotal(r),
  gestionarDemos: (r: AdminRole) => puede(r, "demos"),
  /** Ver las contrataciones y escribir notas. */
  verContrataciones: (r: AdminRole) => puede(r, "contrataciones"),
  /** Botón «Activar» (y «Rechazar») de una contratación. */
  activarContrataciones: (r: AdminRole) => puede(r, "contrataciones"),
  /** Recordatorios de pago a las clínicas. */
  cobranza: (r: AdminRole) => puede(r, "cobranza"),
  /** Sueldos e importes de nómina. */
  verSueldos: (r: AdminRole) => puede(r, "nomina"),
  /** Datos del personal (cargar y editar empleados). */
  editarPersonal: (r: AdminRole) => puede(r, "personal"),
  gestionarTickets: (r: AdminRole) => puede(r, "soporte", "atencion"),
  /** Atención a clínicas (secretaría de Cloud Esther): registrar y gestionar casos. */
  gestionarAtencion: (r: AdminRole) => puede(r, "atencion"),
  verActividad: (r: AdminRole) => puede(r, "actividad"),
};

const RoleContext = createContext<{
  role: AdminRole;
  /** Solo en desarrollo: ver el panel como otro rol (no cambia permisos del backend). */
  setRole: (r: AdminRole | null) => void;
  vistaPrevia: boolean;
}>({ role: "owner", setRole: () => {}, vistaPrevia: false });

export function RoleProvider({ children }: { children: ReactNode }) {
  const sesion = useSesionAdmin();
  const [vista, setVista] = useState<AdminRole | null>(null);
  const propio = sesion?.usuario.rol ?? "customer-care";
  const role = import.meta.env.DEV && vista ? vista : propio;
  return (
    <RoleContext.Provider value={{ role, setRole: setVista, vistaPrevia: role !== propio }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
