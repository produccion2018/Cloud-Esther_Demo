import { capitalizarNombre } from "@/lib/utils";
import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";
import { ESPECIALIDADES, emptyMember, permsFor, type TeamMember } from "@/lib/cloud-esther/equipo-profesional-data";

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
  /** El aviso de "especialidades sugeridas" se muestra una vez por clínica; al cerrarlo
      queda en true y no vuelve a aparecer (se guarda en el servidor como el resto del equipo). */
  avisoEspecialidadesVisto?: boolean;
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
  const { miembros, especialidades, ausencias, avisoEspecialidadesVisto } = store.usar();

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

  /** Marca el aviso de especialidades sugeridas como leído (no vuelve a aparecer). */
  const ocultarAvisoEspecialidades = () => {
    const actual = store.leer();
    if (actual.avisoEspecialidadesVisto) return;
    store.poner({ ...actual, avisoEspecialidadesVisto: true });
  };

  return {
    miembros,
    especialidades,
    ausencias,
    avisoEspecialidadesVisto: avisoEspecialidadesVisto ?? false,
    setMiembros,
    setEspecialidades,
    setAusencias,
    actualizarMiembro,
    ocultarAvisoEspecialidades,
  };
}

/** Usuarios internos que ocupan lugar en el plan: activos e invitaciones pendientes. */
export function usuariosInternos(miembros: TeamMember[]) {
  return miembros.filter((m) => m.status !== "inactivo").length;
}

/** Acceso directo al store (lectura/escritura fuera de componentes, ej. RRHH o Esther). */
export const storeEquipo = store;

/** El administrador/dueño de la cuenta se agrega solo al equipo (si todavía no está), para que su
    nombre aparezca en «Agendas y horarios» y pueda cargar sus días y horarios —el admin también
    puede ser odontólogo/dueño que atiende—. Igual que en producción, donde queda al registrarse.
    Es idempotente: si ya hay un integrante con ese correo, no hace nada. */
export function asegurarAdminEnEquipo(usuario: { id?: string; nombre: string; email: string }) {
  const correo = usuario.email.trim().toLowerCase();
  if (!correo || !usuario.nombre.trim()) return;
  const actual = store.leer();
  const yaEsta = actual.miembros.some((m) => (m.email ?? "").trim().toLowerCase() === correo);
  if (yaEsta) return;
  const partes = capitalizarNombre(usuario.nombre).split(/\s+/);
  const firstName = partes[0] ?? usuario.nombre.trim();
  const lastName = partes.slice(1).join(" ");
  const admin: TeamMember = {
    ...emptyMember(),
    id: usuario.id || crypto.randomUUID(),
    firstName,
    lastName,
    role: "administrador",
    email: correo,
    status: "activo",
    permissions: permsFor("administrador"),
  };
  store.poner({ ...actual, miembros: [admin, ...actual.miembros] });
}