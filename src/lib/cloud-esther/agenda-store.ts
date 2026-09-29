import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";
import { TEAM_MEMBERS } from "@/lib/cloud-esther/equipo-profesional-data";

/* Ubicación: src/lib/cloud-esther/agenda-store.ts

   Agenda compartida entre "Agenda y turnos" y el Dashboard (lo que se agenda en uno
   se ve en el otro), separada por empresa. TODO backend: API de turnos por clinicId. */

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export type EstadoTurno = "Atendida" | "Confirmada" | "Pendiente" | "Ausente" | "Cancelada";

export type Turno = {
  id: number;
  fecha: string;
  hora: string;
  paciente: string;
  tratamiento: string;
  odontologo: string;
  sucursal: string;
  gabinete: string;
  estado: EstadoTurno;
  notas: string;
};

export type NuevaCita = Omit<Turno, "id" | "estado">;
export type Bloqueo = {
  id: number;
  fecha: string;
  desde: string;
  hasta: string;
  motivo: string;
};
export type Espera = {
  id: number;
  nombre: string;
  motivo: string;
  franja: string;
  sucursal: string;
};
export type Recordatorio = {
  id: number;
  canal: string;
  cuando: string;
  activo: boolean;
};
export type Tarea = {
  id: number;
  texto: string;
  categoria: string;
  paciente: string;
  fecha: string;
  hecha: boolean;
};
export type NuevaTarea = Omit<Tarea, "id" | "hecha">;

export const SUCURSALES = ["Clínica Centro", "Clínica Norte", "Clínica Sur"];
/* Odontólogos de ejemplo = los del equipo de ejemplo. En la agenda se usan los del
   equipo real de la empresa (useEquipo), así que si agregás uno en Equipo aparece acá. */
export const ODONTOLOGOS = TEAM_MEMBERS.filter((m) => m.role === "odontologo").map((m) =>
  `${m.firstName} ${m.lastName}`.trim(),
);
export const GABINETES = ["Gabinete 1", "Gabinete 2", "Gabinete 3"];
export const TRATAMIENTOS = [
  "Primera consulta",
  "Control",
  "Limpieza dental",
  "Restauración",
  "Endodoncia",
  "Extracción",
  "Control de ortodoncia",
  "Blanqueamiento",
  "Evaluación de implante",
  "Urgencia",
];

const ESPERA_EJEMPLO: Espera[] = [
  {
    id: 1,
    nombre: "Carla Núñez",
    motivo: "Primera consulta",
    franja: "Tardes",
    sucursal: "Clínica Centro",
  },
  {
    id: 2,
    nombre: "Tomás Herrera",
    motivo: "Limpieza dental",
    franja: "Mañanas",
    sucursal: "Clínica Norte",
  },
];

/* Turnos de ejemplo para practicar: varios hoy y otros en la semana. */
function turnosEjemplo(hoy: string): Turno[] {
  const od = (i: number) => ODONTOLOGOS[i % ODONTOLOGOS.length] ?? "Odontólogo/a";
  const dia = (n: number) => {
    const d = new Date(`${hoy}T12:00:00`);
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const base: [number, string, string, string, number, string, EstadoTurno][] = [
    [0, "09:00", "Marina Delgado", "Primera consulta", 0, "Gabinete 1", "Confirmada"],
    [0, "09:30", "Julián Ortega", "Control", 1, "Gabinete 2", "Atendida"],
    [0, "10:30", "Lucía Paz", "Limpieza dental", 0, "Gabinete 1", "Pendiente"],
    [0, "11:30", "Ramiro Sosa", "Endodoncia", 2, "Gabinete 3", "Confirmada"],
    [0, "15:00", "Paula Medina", "Restauración", 1, "Gabinete 2", "Pendiente"],
    [0, "16:30", "Sergio Luna", "Control de ortodoncia", 2, "Gabinete 3", "Ausente"],
    [1, "10:00", "Ana Torres", "Blanqueamiento", 0, "Gabinete 1", "Pendiente"],
    [1, "14:00", "Diego Ruiz", "Extracción", 1, "Gabinete 2", "Confirmada"],
    [2, "09:30", "Valeria Gómez", "Evaluación de implante", 2, "Gabinete 3", "Pendiente"],
    [3, "11:00", "Carlos Méndez", "Control", 0, "Gabinete 1", "Pendiente"],
    [-1, "12:00", "Florencia Díaz", "Limpieza dental", 1, "Gabinete 2", "Atendida"],
    [2, "11:30", "Mauro Pinto", "Control", 0, "Gabinete 1", "Pendiente"],
    [-32, "15:00", "Mauro Pinto", "Restauración", 0, "Gabinete 1", "Atendida"],
    [-50, "10:30", "Mauro Pinto", "Primera consulta", 0, "Gabinete 1", "Atendida"],
  ];
  return base.map(([d, hora, paciente, tratamiento, o, gabinete, estado], i) => ({
    id: i + 1,
    fecha: dia(d),
    hora,
    paciente,
    tratamiento,
    odontologo: od(o),
    sucursal: i % 3 === 2 ? "Clínica Norte" : "Clínica Centro",
    gabinete,
    estado,
    notas: "",
  }));
}

/* Estado de la agenda separado por empresa: se conserva al navegar por el demo
   y ninguna clínica ve los turnos de otra. TODO backend: API de turnos por clinicId. */
export type EstadoAgenda = {
  turnos: Turno[];
  bloqueos: Bloqueo[];
  espera: Espera[];
  recordatorios: Recordatorio[];
  tareas: Tarea[];
};
export const storeAgenda = crearStorePorEmpresa<EstadoAgenda>(() => {
  const hoy = hoyISO();
  return {
    turnos: turnosEjemplo(hoy),
    bloqueos: [],
    espera: ESPERA_EJEMPLO,
    recordatorios: RECORDATORIOS_INICIAL,
    tareas: [{ ...TAREA_EJEMPLO, id: 1, fecha: hoy }],
  };
});

type Actualizar<T> = T | ((prev: T) => T);
function setterAgenda<K extends keyof EstadoAgenda>(clave: K) {
  return (a: Actualizar<EstadoAgenda[K]>) => {
    const actual = storeAgenda.leer();
    const valor =
      typeof a === "function" ? (a as (p: EstadoAgenda[K]) => EstadoAgenda[K])(actual[clave]) : a;
    storeAgenda.poner({ ...actual, [clave]: valor });
  };
}
export const setTurnosStore = setterAgenda("turnos");
export const setBloqueosStore = setterAgenda("bloqueos");
export const setEsperaStore = setterAgenda("espera");
export const setRecordatoriosStore = setterAgenda("recordatorios");
export const setTareasStore = setterAgenda("tareas");

const TAREA_EJEMPLO: Omit<Tarea, "id" | "fecha"> = {
  texto: "Llamar para confirmar el turno",
  categoria: "Llamar al paciente",
  paciente: "Marina Delgado",
  hecha: false,
};

const RECORDATORIOS_INICIAL: Recordatorio[] = [
  { id: 1, canal: "WhatsApp", cuando: "24 h antes de la cita", activo: true },
  { id: 2, canal: "SMS", cuando: "2 h antes de la cita", activo: true },
  { id: 3, canal: "Correo", cuando: "Al confirmar la cita", activo: true },
];
