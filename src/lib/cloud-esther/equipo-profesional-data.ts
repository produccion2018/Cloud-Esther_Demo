export type TeamRole = "odontologo" | "asistente" | "secretaria" | "administrador"
export type MemberStatus = "activo" | "pendiente" | "inactivo"

export interface ScheduleDay {
  day: "Lunes" | "Martes" | "Miércoles" | "Jueves" | "Viernes" | "Sábado"
  active: boolean
  start: string
  end: string
  breakStart?: string
  breakEnd?: string
}

export interface Commission {
  service: string
  percentage: number
}

export interface Permission {
  key: string
  label: string
  enabled: boolean
}

export interface TeamMember {
  id: string
  firstName: string
  lastName: string
  role: TeamRole
  specialties?: string[]
  licenseNumber?: string
  office?: string
  email: string
  phone: string
  avatarUrl?: string
  status: MemberStatus
  schedule: ScheduleDay[]
  assistantOf?: string[]
  assistants?: string[]
  permissions: Permission[]
  commissions?: Commission[]
  nextAppointment?: string
  todayAppointments?: number
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
]

const fullWeek = (start: string, end: string, breakStart?: string, breakEnd?: string): ScheduleDay[] =>
  (["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"] as const).map((day, i) => ({
    day,
    active: i < 5,
    start,
    end,
    breakStart,
    breakEnd,
  }))

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
  }
  const enabledByRole: Record<TeamRole, string[]> = {
    odontologo: ["ver_pacientes", "editar_pacientes", "gestionar_turnos", "gestionar_agenda", "ver_historias", "crear_historias", "ver_reportes", "acceder_mensajes"],
    asistente: ["ver_pacientes", "gestionar_turnos", "acceder_mensajes"],
    secretaria: ["ver_pacientes", "gestionar_turnos", "gestionar_agenda", "acceder_mensajes"],
    administrador: Object.keys(base),
  }
  return Object.entries(base).map(([key, label]) => ({
    key,
    label,
    enabled: enabledByRole[role].includes(key),
  }))
}

export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: "1",
    firstName: "Laura",
    lastName: "Martínez",
    role: "odontologo",
    specialties: ["Ortodoncia"],
    licenseNumber: "M.P. 45872",
    office: "Consultorio 1",
    email: "laura.martinez@cloudesther.com",
    phone: "+54 11 4455-1200",
    status: "activo",
    schedule: fullWeek("08:00", "16:00", "12:00", "13:00"),
    assistants: ["3"],
    permissions: permsFor("odontologo"),
    commissions: [
      { service: "Consultas", percentage: 20 },
      { service: "Tratamientos", percentage: 15 },
      { service: "Implantes", percentage: 10 },
    ],
    nextAppointment: "Hoy 10:30 · Juan Pérez",
    todayAppointments: 6,
  },
  {
    id: "2",
    firstName: "Martín",
    lastName: "González",
    role: "odontologo",
    specialties: ["Implantología", "Cirugía oral"],
    licenseNumber: "M.P. 39281",
    office: "Consultorio 2",
    email: "martin.gonzalez@cloudesther.com",
    phone: "+54 11 4455-1201",
    status: "activo",
    schedule: fullWeek("10:00", "18:00", "13:30", "14:30"),
    assistants: ["3"],
    permissions: permsFor("odontologo"),
    commissions: [
      { service: "Consultas", percentage: 20 },
      { service: "Implantes", percentage: 12 },
    ],
    nextAppointment: "Hoy 11:15 · María Sosa",
    todayAppointments: 4,
  },
  {
    id: "3",
    firstName: "Carolina",
    lastName: "López",
    role: "asistente",
    office: "Consultorios 1 y 2",
    email: "carolina.lopez@cloudesther.com",
    phone: "+54 11 4455-1202",
    status: "activo",
    schedule: fullWeek("08:00", "16:00"),
    assistantOf: ["1", "2"],
    permissions: permsFor("asistente"),
    todayAppointments: 10,
  },
  {
    id: "4",
    firstName: "Sofía",
    lastName: "Rodríguez",
    role: "secretaria",
    office: "Recepción",
    email: "sofia.rodriguez@cloudesther.com",
    phone: "+54 11 4455-1203",
    status: "activo",
    schedule: fullWeek("08:00", "17:00"),
    permissions: permsFor("secretaria"),
  },
  {
    id: "5",
    firstName: "Diego",
    lastName: "Fernández",
    role: "administrador",
    office: "Administración",
    email: "diego.fernandez@cloudesther.com",
    phone: "+54 11 4455-1204",
    status: "activo",
    schedule: fullWeek("09:00", "18:00"),
    permissions: permsFor("administrador"),
  },
  {
    id: "6",
    firstName: "Bruno",
    lastName: "Aguirre",
    role: "odontologo",
    specialties: ["Endodoncia"],
    licenseNumber: "M.P. 51023",
    office: "Consultorio 3",
    email: "bruno.aguirre@cloudesther.com",
    phone: "+54 11 4455-1205",
    status: "pendiente",
    schedule: fullWeek("14:00", "20:00"),
    permissions: permsFor("odontologo"),
    commissions: [{ service: "Tratamientos", percentage: 15 }],
  },
  {
    id: "7",
    firstName: "Valentina",
    lastName: "Ríos",
    role: "asistente",
    office: "Consultorio 3",
    email: "valentina.rios@cloudesther.com",
    phone: "+54 11 4455-1206",
    status: "inactivo",
    schedule: fullWeek("08:00", "14:00"),
    assistantOf: ["6"],
    permissions: permsFor("asistente"),
  },
]

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
  }
}

export { permsFor }