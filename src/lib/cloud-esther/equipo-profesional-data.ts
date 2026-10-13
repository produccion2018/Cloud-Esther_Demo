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

/* Equipo de la clínica de ejemplo del demo: dos odontólogos y una secretaria (pedido de Camilo, 13 oct:
   pocos nombres para que el cliente no se complique). Los pacientes de ejemplo son Mauro Pinto y
   Alejo Becerra. */
export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: "1",
    firstName: "Mireya",
    lastName: "Becerra",
    role: "odontologo",
    specialties: ["Ortodoncia", "Odontología general"],
    licenseNumber: "M.P. 45872",
    office: "Consultorio 1",
    email: "mireya.becerra@cloudesther.com",
    phone: "+54 11 4455-1200",
    status: "activo",
    schedule: fullWeek("08:00", "16:00", "12:00", "13:00"),
    permissions: permsFor("odontologo"),
    commissions: [
      { service: "Consultas", percentage: 20 },
      { service: "Tratamientos", percentage: 15 },
      { service: "Implantes", percentage: 10 },
    ],
    nextAppointment: "Hoy 10:30 · Mauro Pinto",
    todayAppointments: 2,
  },
  {
    id: "2",
    firstName: "Andrés",
    lastName: "Becerra",
    role: "odontologo",
    specialties: ["Implantología", "Cirugía oral"],
    licenseNumber: "M.P. 39281",
    office: "Consultorio 2",
    email: "andres.becerra@cloudesther.com",
    phone: "+54 11 4455-1201",
    status: "activo",
    schedule: fullWeek("10:00", "18:00", "13:30", "14:30"),
    permissions: permsFor("odontologo"),
    commissions: [
      { service: "Consultas", percentage: 20 },
      { service: "Implantes", percentage: 12 },
    ],
    nextAppointment: "Hoy 15:00 · Alejo Becerra",
    todayAppointments: 1,
  },
  {
    id: "4",
    firstName: "Ketty",
    lastName: "Margarita",
    role: "secretaria",
    office: "Recepción",
    email: "ketty.margarita@cloudesther.com",
    phone: "+54 11 4455-1203",
    status: "activo",
    schedule: fullWeek("08:00", "17:00"),
    permissions: permsFor("secretaria"),
  },
];

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
