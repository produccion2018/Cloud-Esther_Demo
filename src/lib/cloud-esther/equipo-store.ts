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

function diaISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const store = crearStorePorEmpresa<EstadoEquipo>(
  () => ({
    miembros: TEAM_MEMBERS,
    especialidades: ESPECIALIDADES,
    ausencias: [
      {
        id: "a-1",
        miembroId: "3",
        tipo: "Capacitación",
        desde: diaISO(0),
        hasta: diaISO(0),
        nota: "Curso de bioseguridad",
      },
      {
        id: "a-2",
        miembroId: "2",
        tipo: "Vacaciones",
        desde: diaISO(12),
        hasta: diaISO(19),
        nota: "",
      },
    ],
  }),
  { persistir: "equipo" },
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

/** Acceso directo al store (lectura/escritura fuera de componentes, ej. RRHH o Esther). */
export const storeEquipo = store;
