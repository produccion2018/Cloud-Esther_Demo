import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";
import type { TeamMember, TeamRole } from "@/lib/cloud-esther/equipo-profesional-data";

/* Ubicación: src/lib/cloud-esther/permisos-portal.ts
   Permisos por MÓDULO y ACCIÓN de los portales del equipo (Plan 4).
   Regla principal: el propietario / administrador de la clínica decide qué puede ver y qué puede
   hacer cada usuario. Nada sensible es automático: una secretaria no tiene Finanzas, RRHH ni
   Auditoría hasta que se lo habiliten. Lo que se ve por defecto es solo un punto de partida por
   rol, que el propietario ajusta en Equipo → Permisos y accesos.
   Se guarda por empresa (cada clínica, sus permisos).
   TODO backend: los permisos viajan en el token del usuario y el servidor valida cada acción. */

export type Accion = "ver" | "crear" | "editar" | "eliminar" | "aprobar" | "gestionar";

export const ACCIONES: { id: Accion; label: string }[] = [
  { id: "ver", label: "Lectura" },
  { id: "crear", label: "Creación" },
  { id: "editar", label: "Edición" },
  { id: "eliminar", label: "Eliminación" },
  { id: "aprobar", label: "Aprobación" },
  { id: "gestionar", label: "Gestión" },
];

export type GrupoModulo = "general" | "clinico" | "administrativo" | "finanzas";

export const GRUPOS: { id: GrupoModulo; label: string; detalle: string }[] = [
  { id: "general", label: "General", detalle: "Agenda, pacientes, comunicación y jornada" },
  { id: "clinico", label: "Portal profesional", detalle: "Atención clínica" },
  { id: "administrativo", label: "Portal administrativo", detalle: "Secretaría y administración" },
  {
    id: "finanzas",
    label: "Finanzas y administración",
    detalle: "Áreas sensibles: solo si el propietario las habilita",
  },
];

export const MODULOS_PORTAL = [
  { id: "agenda", label: "Agenda y turnos", grupo: "general" },
  { id: "pacientes", label: "Pacientes (alta, búsqueda, ficha)", grupo: "general" },
  { id: "mensajes", label: "Mensajes y comunicación", grupo: "general" },
  { id: "autorizaciones", label: "Autorizaciones", grupo: "general" },
  { id: "reportes", label: "Reportes", grupo: "general" },
  { id: "jornada", label: "Jornada y fichaje", grupo: "general" },
  { id: "historia", label: "Historia clínica", grupo: "clinico" },
  { id: "odontograma", label: "Odontograma 3D", grupo: "clinico" },
  { id: "tratamientos", label: "Tratamientos", grupo: "clinico" },
  { id: "recetas", label: "Recetas y órdenes", grupo: "clinico" },
  { id: "estudios", label: "Estudios", grupo: "clinico" },
  { id: "ia", label: "IA asistencial (Esther)", grupo: "clinico" },
  { id: "cobros", label: "Caja y cobros", grupo: "administrativo" },
  { id: "presupuestos", label: "Presupuestos", grupo: "administrativo" },
  { id: "documentos", label: "Documentos y plantillas", grupo: "administrativo" },
  { id: "tareas", label: "Tareas administrativas", grupo: "administrativo" },
  { id: "equipo", label: "Gestión de equipo", grupo: "administrativo" },
  { id: "auditoria", label: "Auditoría", grupo: "administrativo" },
  { id: "facturacion", label: "Facturación y comprobantes", grupo: "finanzas" },
  { id: "finanzas", label: "Finanzas y cuentas corrientes", grupo: "finanzas" },
  { id: "liquidaciones", label: "Liquidaciones y comisiones", grupo: "finanzas" },
  { id: "proveedores", label: "Proveedores", grupo: "finanzas" },
  { id: "rrhh", label: "Recursos Humanos", grupo: "finanzas" },
  { id: "sueldos", label: "Sueldos y honorarios", grupo: "finanzas" },
] as const satisfies readonly { id: string; label: string; grupo: GrupoModulo }[];

export type ModuloPortal = (typeof MODULOS_PORTAL)[number]["id"];
export type MapaPermisos = Partial<Record<ModuloPortal, Accion[]>>;

const V: Accion[] = ["ver"];
const VC: Accion[] = ["ver", "crear"];
const VCE: Accion[] = ["ver", "crear", "editar"];
const TODO: Accion[] = ["ver", "crear", "editar", "eliminar", "aprobar", "gestionar"];

/** Punto de partida sugerido por rol. El propietario lo cambia por integrante. */
export function permisosSugeridos(rol: TeamRole): MapaPermisos {
  switch (rol) {
    case "odontologo":
      return {
        agenda: VCE,
        pacientes: ["ver", "editar"],
        mensajes: VC,
        autorizaciones: VC,
        reportes: V,
        jornada: VC,
        historia: VCE,
        odontograma: ["ver", "editar"],
        tratamientos: VCE,
        recetas: VC,
        estudios: VC,
        // Esther IA asistencial (solo en planes con IA: Plus y Enterprise). Nunca decide sola.
        ia: VC,
      };
    case "asistente":
      return {
        agenda: V,
        pacientes: V,
        mensajes: VC,
        jornada: VC,
        historia: V,
        odontograma: V,
        tratamientos: V,
        estudios: VC,
      };
    case "secretaria":
      return {
        agenda: ["ver", "crear", "editar", "gestionar"],
        pacientes: VCE,
        mensajes: VC,
        autorizaciones: ["ver", "gestionar"],
        reportes: V,
        jornada: VC,
        cobros: VC,
        presupuestos: VCE,
        documentos: VC,
        tareas: VCE,
      };
    case "administrador":
      return Object.fromEntries(MODULOS_PORTAL.map((m) => [m.id, TODO])) as MapaPermisos;
  }
}

type Estado = { porMiembro: Record<string, MapaPermisos> };

export const storePermisosPortal = crearStorePorEmpresa<Estado>(() => ({ porMiembro: {} }), {
  persistir: "permisos-portal",
});

/** Permisos efectivos del integrante: los asignados por el propietario o, si todavía no se
 *  configuraron, el punto de partida de su rol. */
export function permisosDe(m: Pick<TeamMember, "id" | "role">, estado?: Estado): MapaPermisos {
  const e = estado ?? storePermisosPortal.leer();
  return e.porMiembro[m.id] ?? permisosSugeridos(m.role);
}

export function puedeEn(mapa: MapaPermisos, modulo: ModuloPortal, accion: Accion = "ver") {
  return !!mapa[modulo]?.includes(accion);
}

/** Hook: permisos del integrante y ayudante `puede(modulo, accion)`. */
export function usePermisosPortal(m: Pick<TeamMember, "id" | "role">) {
  const estado = storePermisosPortal.usar();
  const mapa = permisosDe(m, estado);
  const configurados = !!estado.porMiembro[m.id];
  return {
    mapa,
    configurados,
    puede: (modulo: ModuloPortal, accion: Accion = "ver") => puedeEn(mapa, modulo, accion),
  };
}

export function guardarPermisosMiembro(miembroId: string, mapa: MapaPermisos) {
  const e = storePermisosPortal.leer();
  storePermisosPortal.poner({ ...e, porMiembro: { ...e.porMiembro, [miembroId]: mapa } });
}

export function cambiarPermiso(
  m: Pick<TeamMember, "id" | "role">,
  modulo: ModuloPortal,
  accion: Accion,
  activo: boolean,
) {
  const mapa = { ...permisosDe(m) };
  const actuales = new Set(mapa[modulo] ?? []);
  if (activo) {
    actuales.add(accion);
    // Cualquier acción implica poder ver el módulo.
    actuales.add("ver");
  } else {
    actuales.delete(accion);
    // Sin lectura no queda ninguna otra acción.
    if (accion === "ver") actuales.clear();
  }
  mapa[modulo] = ACCIONES.map((a) => a.id).filter((a) => actuales.has(a));
  guardarPermisosMiembro(m.id, mapa);
}
