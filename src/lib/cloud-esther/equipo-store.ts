import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";
import { ESPECIALIDADES, type TeamMember } from "@/lib/cloud-esther/equipo-profesional-data";

/* Ubicación: src/lib/cloud-esther/equipo-store.ts

   Equipo profesional compartido entre "Integrantes", "Especialidades", "Agendas y
   horarios" y "Permisos y accesos", separado por empresa (cada clínica tiene su equipo).
   Arranca vacío: cada clínica carga sus propios integrantes.
   TODO backend: reemplazar por GET/PUT /equipo filtrado por clinicId. */

export const TIPOS_AUSENCIA = [
  "Vacaciones",
  "Licencia médica",
  "Capacitación",
  "Trámite personal",
] as const;
export type TipoAusencia = (typeof TIPOS_AUSENCIA)[number];
export type Ausencia = {
  id: string;
  miembroId: string;
  tipo: TipoAusencia;
  desde: string;
  hasta: string;
  nota: string;
};

export type EstadoEquipo = {
  miembros: TeamMember[];
  especialidades: string[];
  ausencias: Ausencia[];
};

const store = crearStorePorEmpresa<EstadoEquipo>(
  () => ({
    miembros: [],
    especialidades: ESPECIALIDADES,
    ausencias: [],
  }),
  {
    persistir: "equipo",
    // Sin integrantes de ejemplo, pero con la lista de especialidades para elegir
    vacio: () => ({ miembros: [], especialidades: ESPECIALIDADES, ausencias: [] }),
  },
);

type Actualizar<T> = T | ((prev: T) => T);
const aplicar = <T>(prev: T, a: Actualizar<T>) =>
  typeof a === "function" ? (a as (p: T) => T)(prev) : a;

export function useEquipo() {
  const { miembros, especialidades, ausencias } = store.usar();

  const setMiembros = (a: Actualizar<TeamMember[]>) => {
    const actual = store.leer();
    store.poner({ ...actual, miembros: aplicar(actual.miembros, a) });
  };

  const setEspecialidades = (a: Actualizar<string[]>) => {
    const actual = store.leer();
    store.poner({ ...actual, especialidades: aplicar(actual.especialidades, a) });
  };

  const setAusencias = (a: Actualizar<Ausencia[]>) => {
    const actual = store.leer();
    store.poner({ ...actual, ausencias: aplicar(actual.ausencias, a) });
  };

  const actualizarMiembro = (id: string, fn: (m: TeamMember) => TeamMember) =>
    setMiembros((prev) => prev.map((m) => (m.id === id ? fn(m) : m)));

  return {
    miembros,
    especialidades,
    ausencias,
    setMiembros,
    setEspecialidades,
    setAusencias,
    actualizarMiembro,
  };
}

/** Usuarios internos que ocupan lugar en el plan: activos e invitaciones pendientes. */
export function usuariosInternos(miembros: TeamMember[]) {
  return miembros.filter((m) => m.status !== "inactivo").length;
}

/** Acceso directo al store (lectura/escritura fuera de componentes, ej. RRHH o Esther). */
export const storeEquipo = store;