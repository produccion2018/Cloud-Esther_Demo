export type TeamRole = "odontologo" | "asistente" | "secretaria" | "administrador";
export type MemberStatus = "activo" | "pendiente" | "inactivo";

export interface ScheduleDay {
  day: "Lunes" | "Martes" | "Miércoles" | "Jueves" | "Viernes" | "Sábado";
  active: boolean;
  start: string;
  end: string;
  breakStart?: string;
  breakEnd?: string;
}

export interface Commission {
  service: string;
  percentage: number;
}

export interface Permission {
  key: string;
  label: string;
  enabled: boolean;
}

export interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  role: TeamRole;
  specialties?: string[];
  licenseNumber?: string;
  office?: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  status: MemberStatus;
  schedule: ScheduleDay[];
  assistantOf?: string[];
  assistants?: string[];
  permissions: Permission[];
  commissions?: Commission[];
  nextAppointment?: string;
  todayAppointments?: number;
}

export const ESPECIALIDADES = [
  "Odontología general",
  "Ortodoncia",
  "Implantología",
  "Endodoncia",
  "Periodoncia",
  "Odontopediatría",
  "Cirugía oral",
  "Prótesis",
];

const fullWeek = (
  start: string,
  end: string,
  breakStart?: string,
  breakEnd?: string,
): ScheduleDay[] =>
  (["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"] as const).map((day, i) => ({
    day,
    active: i < 5,
    start,
    end,
    breakStart,
    breakEnd,
  }));

function permsFor(role: TeamRole): Permission[] {
  const base: Record<string, string> = {
    ver_pacientes: "Ver pacientes",
    editar_pacientes: "Editar pacientes",
    gestionar_turnos: "Gestionar turnos",
    gestionar_agenda: "Gestionar agenda",
    ver_historias: "Ver historias clínicas",
    crear_historias: "Crear historias clínicas",
    gestionar_facturacion: "Gestionar facturación",
    ver_reportes: "Ver reportes",
    gestionar_inventario: "Gestionar inventario",
    acceder_mensajes: "Acceder a mensajes",
    acceder_configuracion: "Acceder a configuración",
  };
  const enabledByRole: Record<TeamRole, string[]> = {
    odontologo: [
      "ver_pacientes",
      "editar_pacientes",
      "gestionar_turnos",
      "gestionar_agenda",
      "ver_historias",
      "crear_historias",
      "ver_reportes",
      "acceder_mensajes",
    ],
    asistente: ["ver_pacientes", "gestionar_turnos", "acceder_mensajes"],
    // Sin áreas sensibles por defecto (facturación, finanzas, RRHH, auditoría): las habilita el
    // propietario. Caja y cobros se asignan en «Permisos por módulo y acción».
    secretaria: ["ver_pacientes", "gestionar_turnos", "gestionar_agenda", "acceder_mensajes"],
    administrador: Object.keys(base),
  };
  return Object.entries(base).map(([key, label]) => ({
    key,
    label,
    enabled: enabledByRole[role].includes(key),
  }));
}

/* Equipo inicial vacío: cada clínica da de alta a sus propios integrantes. */
export const TEAM_MEMBERS: TeamMember[] = [];

export function emptyMember(): TeamMember {
  return {
    id: crypto.randomUUID(),
    firstName: "",
    lastName: "",
    role: "odontologo",
    specialties: [],
    licenseNumber: "",
    office: "",
    email: "",
    phone: "",
    status: "activo",
    schedule: fullWeek("09:00", "17:00"),
    permissions: permsFor("odontologo"),
    commissions: [],
  };
}

export { permsFor };