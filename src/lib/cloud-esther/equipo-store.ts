import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";
import {
  ESPECIALIDADES,
  TEAM_MEMBERS,
  type TeamMember,
} from "@/lib/cloud-esther/equipo-profesional-data";

/* Ubicación: src/lib/cloud-esther/equipo-store.ts

   Equipo profesional compartido entre "Integrantes", "Especialidades", "Agendas y
   horarios" y "Permisos y accesos", separado por empresa (cada clínica tiene su equipo).
   TODO backend: reemplazar por GET/PUT /equipo filtrado por clinicId. */

type EstadoEquipo = { miembros: TeamMember[]; especialidades: string[] };

const store = crearStorePorEmpresa<EstadoEquipo>(() => ({
  miembros: TEAM_MEMBERS,
  especialidades: ESPECIALIDADES,
}));

type Actualizar<T> = T | ((prev: T) => T);
const aplicar = <T>(prev: T, a: Actualizar<T>) =>
  typeof a === "function" ? (a as (p: T) => T)(prev) : a;

export function useEquipo() {
  const { miembros, especialidades } = store.usar();

  const setMiembros = (a: Actualizar<TeamMember[]>) => {
    const actual = store.leer();
    store.poner({ ...actual, miembros: aplicar(actual.miembros, a) });
  };

  const setEspecialidades = (a: Actualizar<string[]>) => {
    const actual = store.leer();
    store.poner({ ...actual, especialidades: aplicar(actual.especialidades, a) });
  };

  const actualizarMiembro = (id: string, fn: (m: TeamMember) => TeamMember) =>
    setMiembros((prev) => prev.map((m) => (m.id === id ? fn(m) : m)));

  return { miembros, especialidades, setMiembros, setEspecialidades, actualizarMiembro };
}
