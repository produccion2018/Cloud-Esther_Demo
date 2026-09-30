import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";
import { storeEquipo, type Ausencia, type TipoAusencia } from "@/lib/cloud-esther/equipo-store";
import { storeEquipoPortal } from "@/lib/cloud-esther/portal-equipo-store";
import { SUCURSALES } from "@/lib/cloud-esther/agenda-store";
import type { TeamMember, TeamRole } from "@/lib/cloud-esther/equipo-profesional-data";

/* Ubicación: src/lib/cloud-esther/rrhh-store.ts

   Recursos Humanos por empresa. Las personas son los integrantes de Equipo (mismo id):
   RRHH les suma el legajo, contrato, sueldo, documentos, capacitaciones y evaluaciones.
   Las licencias aprobadas se guardan como ausencias de Equipo (se ven en Agenda y Equipo)
   y la asistencia combina los fichajes del portal del equipo con el historial de RRHH.
   TODO backend: tablas legajos / liquidaciones / capacitaciones / evaluaciones por clinicId. */

/* ───────────── Tipos ───────────── */

export const MODALIDADES = [
  "Relación de dependencia",
  "Plazo fijo",
  "Monotributo",
  "Pasantía",
] as const;
export type Modalidad = (typeof MODALIDADES)[number];
export const DEPARTAMENTOS = ["Clínico", "Recepción", "Administración", "Dirección"] as const;
export type Departamento = (typeof DEPARTAMENTOS)[number];

export type Legajo = {
  miembroId: string;
  numero: string;
  dni: string;
  cuil: string;
  nacimiento: string;
  direccion: string;
  emergencia: string;
  obraSocial: string;
  cbu: string;
  puesto: string;
  departamento: Departamento;
  sucursal: string;
  ingreso: string;
  modalidad: Modalidad;
  finContrato: string;
  jornada: number; // horas semanales
  basico: number; // sueldo u honorario mensual
  convenio: string;
  baja: { fecha: string; motivo: string } | null;
  historial: { fecha: string; texto: string }[];
};

export type EstadoSolicitud = "Pendiente" | "Aprobada" | "Rechazada";
export type SolicitudLicencia = {
  id: string;
  miembroId: string;
  tipo: TipoAusencia;
  desde: string;
  hasta: string;
  motivo: string;
  estado: EstadoSolicitud;
  creada: string;
  origen: "RRHH" | "Portal del equipo";
  respuesta: string;
};

export type FichajeRRHH = {
  id: string;
  miembroId: string;
  fecha: string;
  entrada: string;
  salida: string;
  origen: "Portal" | "Manual";
  nota: string;
};

export type EstadoPeriodo = "Borrador" | "Liquidada" | "Pagada";
export type AjusteRecibo = { horasExtra: number; bono: number; adelanto: number };
export type Periodo = {
  periodo: string; // yyyy-mm
  estado: EstadoPeriodo;
  pagado: string;
  ajustes: Record<string, AjusteRecibo>;
};

export type EstadoCurso = "Pendiente" | "En curso" | "Completada";
export type Capacitacion = {
  id: string;
  titulo: string;
  tipo: "Obligatoria" | "Opcional";
  modalidad: "Presencial" | "Virtual";
  horas: number;
  fecha: string;
  vigenciaMeses: number; // 0 = no vence
  asignados: { miembroId: string; estado: EstadoCurso; completada: string }[];
};

export const COMPETENCIAS = [
  "Atención al paciente",
  "Calidad técnica",
  "Trabajo en equipo",
  "Puntualidad",
  "Comunicación",
] as const;
export type Competencia = (typeof COMPETENCIAS)[number];
export type Evaluacion = {
  id: string;
  miembroId: string;
  ciclo: string;
  fecha: string;
  evaluador: string;
  puntajes: Record<Competencia, number>;
  fortalezas: string;
  mejoras: string;
  objetivos: string;
  estado: "Borrador" | "Cerrada";
};

export type Comunicado = {
  id: string;
  titulo: string;
  texto: string;
  fecha: string;
  autor: string;
  destino: "Todos" | TeamRole;
  fijado: boolean;
  leidos: string[];
};

export const TIPOS_DOCUMENTO = [
  "DNI",
  "Contrato firmado",
  "Título",
  "Matrícula profesional",
  "Seguro de mala praxis",
  "Vacuna hepatitis B",
  "Alta ART",
  "CV",
  "Certificado de curso",
] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];
export type DocumentoRRHH = {
  id: string;
  miembroId: string;
  tipo: TipoDocumento;
  archivo: string;
  subido: string;
  vence: string;
};

export type FlujoRRHH = {
  id: string;
  nombre: string;
  detalle: string;
  activo: boolean;
  ejecuciones: number;
};
export type EventoAuditoria = {
  id: string;
  fecha: string;
  usuario: string;
  accion: string;
  detalle: string;
};

export type ConfigRRHH = {
  toleranciaMin: number;
  presentismoPct: number;
  aportesPct: number; // jubilación 11 + obra social 3 + PAMI 3
  contribucionesPct: number;
  recargoExtraPct: number;
  diaPago: number;
  antiguedadPct: number; // por año
};

export type EstadoRRHH = {
  legajos: Record<string, Legajo>;
  solicitudes: SolicitudLicencia[];
  fichajes: FichajeRRHH[];
  periodos: Periodo[];
  capacitaciones: Capacitacion[];
  evaluaciones: Evaluacion[];
  comunicados: Comunicado[];
  documentos: DocumentoRRHH[];
  flujos: FlujoRRHH[];
  auditoria: EventoAuditoria[];
  config: ConfigRRHH;
};

/* ───────────── Fechas ───────────── */

export function diaISO(n = 0, base?: string) {
  const d = base ? new Date(`${base}T12:00:00`) : new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function periodoActual() {
  return diaISO().slice(0, 7);
}
export function periodoAnterior(p: string, n = 1) {
  const [y, m] = p.split("-").map(Number) as [number, number];
  const d = new Date(y, m - 1 - n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
export function nombrePeriodo(p: string) {
  const [y, m] = p.split("-").map(Number) as [number, number];
  const mes = new Date(y, m - 1, 1).toLocaleDateString("es-AR", { month: "long" });
  return `${mes[0]!.toUpperCase()}${mes.slice(1)} ${y}`;
}
export function diasEntre(desde: string, hasta: string) {
  return Math.round(
    (new Date(`${hasta}T12:00:00`).getTime() - new Date(`${desde}T12:00:00`).getTime()) /
      86_400_000,
  );
}
/** Mismo mes/día del año `anios` atrás (para cumpleaños e ingresos de ejemplo). */
function haceAnios(anios: number, masDias = 0) {
  const d = new Date();
  d.setDate(d.getDate() + masDias);
  d.setFullYear(d.getFullYear() - anios);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const DIAS_SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;
export function diaSemana(iso: string) {
  return DIAS_SEMANA[new Date(`${iso}T12:00:00`).getDay()]!;
}
export function aMinutos(h: string) {
  const [a, b] = h.split(":").map(Number);
  return (a ?? 0) * 60 + (b ?? 0);
}

/* ───────────── Datos de ejemplo ───────────── */

const [CENTRO = "Clínica Centro", NORTE = "Clínica Norte"] = SUCURSALES;

function legajo(
  l: Partial<Legajo> &
    Pick<
      Legajo,
      "miembroId" | "numero" | "puesto" | "departamento" | "ingreso" | "modalidad" | "basico"
    >,
): Legajo {
  return {
    dni: "",
    cuil: "",
    nacimiento: "",
    direccion: "",
    emergencia: "",
    obraSocial: "OSDE",
    cbu: "",
    sucursal: CENTRO,
    finContrato: "",
    jornada: 40,
    convenio: "Sanidad (FATSA)",
    baja: null,
    historial: [],
    ...l,
  };
}

function legajosEjemplo(): Record<string, Legajo> {
  const lista: Legajo[] = [
    legajo({
      miembroId: "1",
      numero: "L-0001",
      puesto: "Odontóloga · Ortodoncista",
      departamento: "Clínico",
      ingreso: haceAnios(6, -40),
      modalidad: "Relación de dependencia",
      basico: 1_650_000,
      dni: "30.112.456",
      cuil: "27-30112456-3",
      nacimiento: haceAnios(41, 3),
      direccion: "Av. Corrientes 2450, CABA",
      emergencia: "Pablo Martínez · +54 11 5512-0098",
      obraSocial: "OSDE 310",
      cbu: "0070 0999 2000 0012 3456 78",
      historial: [
        { fecha: haceAnios(6, -40), texto: "Ingreso como odontóloga general" },
        { fecha: haceAnios(3, -10), texto: "Pasa a coordinar Ortodoncia" },
      ],
    }),
    legajo({
      miembroId: "2",
      cbu: "0170 0999 4000 0033 2211 09",
      numero: "L-0002",
      puesto: "Implantólogo",
      departamento: "Clínico",
      ingreso: haceAnios(3, 60),
      modalidad: "Monotributo",
      basico: 1_200_000,
      dni: "28.765.332",
      cuil: "20-28765332-1",
      nacimiento: haceAnios(45, 80),
      direccion: "Cabildo 1820, CABA",
      emergencia: "Ana González · +54 11 4455-2211",
      obraSocial: "Swiss Medical",
      sucursal: NORTE,
      jornada: 30,
      convenio: "Sin convenio (factura honorarios)",
    }),
    legajo({
      miembroId: "3",
      cbu: "0110 0999 3000 0045 6677 12",
      numero: "L-0003",
      puesto: "Asistente dental",
      departamento: "Clínico",
      ingreso: diaISO(-340),
      modalidad: "Plazo fijo",
      finContrato: diaISO(18),
      basico: 890_000,
      dni: "40.221.908",
      cuil: "27-40221908-5",
      nacimiento: haceAnios(26, 12),
      direccion: "Rivadavia 5320, CABA",
      emergencia: "Marta López · +54 11 6011-4432",
      obraSocial: "OSPSA",
    }),
    legajo({
      miembroId: "4",
      cbu: "0720 0999 1100 0098 1234 55",
      numero: "L-0004",
      puesto: "Recepcionista",
      departamento: "Recepción",
      ingreso: haceAnios(4, 5),
      modalidad: "Relación de dependencia",
      basico: 920_000,
      dni: "35.998.120",
      cuil: "27-35998120-9",
      nacimiento: haceAnios(33, 150),
      direccion: "Scalabrini Ortiz 980, CABA",
      emergencia: "Juan Rodríguez · +54 11 5099-1102",
      obraSocial: "OSPSA",
    }),
    legajo({
      miembroId: "5",
      cbu: "0150 0999 7700 0011 2233 44",
      numero: "L-0005",
      puesto: "Administrador",
      departamento: "Administración",
      ingreso: haceAnios(8, -100),
      modalidad: "Relación de dependencia",
      basico: 1_380_000,
      dni: "27.554.001",
      cuil: "20-27554001-7",
      nacimiento: haceAnios(47, -20),
      direccion: "Av. Santa Fe 3100, CABA",
      emergencia: "Clara Fernández · +54 11 4788-9012",
      obraSocial: "OSDE 210",
      convenio: "Fuera de convenio",
    }),
    legajo({
      miembroId: "6",
      numero: "L-0006",
      puesto: "Endodoncista",
      departamento: "Clínico",
      ingreso: diaISO(-20),
      modalidad: "Monotributo",
      basico: 780_000,
      dni: "36.441.207",
      cuil: "20-36441207-4",
      nacimiento: haceAnios(34, 200),
      jornada: 30,
      convenio: "Sin convenio (factura honorarios)",
    }),
    legajo({
      miembroId: "7",
      numero: "L-0007",
      puesto: "Asistente dental",
      departamento: "Clínico",
      ingreso: haceAnios(2, 30),
      modalidad: "Relación de dependencia",
      basico: 860_000,
      dni: "41.335.790",
      cuil: "27-41335790-2",
      nacimiento: haceAnios(24, 90),
      jornada: 30,
      baja: { fecha: diaISO(-45), motivo: "Renuncia (se muda al interior)" },
    }),
    legajo({
      miembroId: "8",
      cbu: "0340 0999 5500 0077 8899 01",
      numero: "L-0008",
      puesto: "Odontólogo general",
      departamento: "Clínico",
      ingreso: haceAnios(2, 150),
      modalidad: "Relación de dependencia",
      basico: 1_520_000,
      dni: "95.193.944",
      cuil: "20-95193944-6",
      nacimiento: haceAnios(38, 45),
      direccion: "Av. Belgrano 1450, CABA",
      emergencia: "María Méndez · +54 11 6677-3344",
      obraSocial: "Galeno",
    }),
  ];
  return Object.fromEntries(lista.map((l) => [l.miembroId, l]));
}

/** Historial de fichajes de las últimas dos semanas (hoy lo aporta el portal del equipo). */
function fichajesEjemplo(): FichajeRRHH[] {
  const horarios: Record<string, [string, string]> = {
    "1": ["08:00", "16:00"],
    "2": ["10:00", "18:00"],
    "3": ["08:00", "16:00"],
    "4": ["08:00", "17:00"],
    "5": ["09:00", "18:00"],
    "8": ["09:00", "17:00"],
  };
  const tardes: Record<string, number[]> = { "3": [2, 5, 9], "4": [7], "8": [4] };
  const lista: FichajeRRHH[] = [];
  for (let d = 1; d <= 14; d++) {
    const fecha = diaISO(-d);
    const dia = new Date(`${fecha}T12:00:00`).getDay();
    if (dia === 0 || dia === 6) continue;
    for (const [id, [ent, sal]] of Object.entries(horarios)) {
      if (id === "1" && d === 3) continue; // ausencia sin fichaje
      const tarde = tardes[id]?.includes(d) ? 18 + d : 0;
      const m = aMinutos(ent) - 6 + ((d * 7 + Number(id)) % 9) + tarde;
      const s = aMinutos(sal) + ((d * 5 + Number(id)) % 25);
      const hh = (x: number) =>
        `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
      lista.push({
        id: `fh-${id}-${d}`,
        miembroId: id,
        fecha,
        entrada: hh(m),
        salida: hh(s),
        origen: "Portal",
        nota: "",
      });
    }
  }
  return lista;
}

function puntajes(
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
): Record<Competencia, number> {
  return {
    "Atención al paciente": a,
    "Calidad técnica": b,
    "Trabajo en equipo": c,
    Puntualidad: d,
    Comunicación: e,
  };
}

const CAPACITACIONES: Capacitacion[] = [
  {
    id: "c1",
    titulo: "Bioseguridad y control de infecciones",
    tipo: "Obligatoria",
    modalidad: "Presencial",
    horas: 6,
    fecha: diaISO(-120),
    vigenciaMeses: 12,
    asignados: [
      { miembroId: "1", estado: "Completada", completada: diaISO(-120) },
      { miembroId: "3", estado: "Completada", completada: diaISO(-120) },
      { miembroId: "4", estado: "Completada", completada: diaISO(-118) },
      { miembroId: "8", estado: "Pendiente", completada: "" },
    ],
  },
  {
    id: "c2",
    titulo: "RCP y primeros auxilios",
    tipo: "Obligatoria",
    modalidad: "Presencial",
    horas: 4,
    fecha: diaISO(-350),
    vigenciaMeses: 12,
    asignados: [
      { miembroId: "1", estado: "Completada", completada: diaISO(-350) },
      { miembroId: "2", estado: "Completada", completada: diaISO(-350) },
      { miembroId: "5", estado: "Completada", completada: diaISO(-349) },
    ],
  },
  {
    id: "c3",
    titulo: "Atención al paciente y manejo de reclamos",
    tipo: "Opcional",
    modalidad: "Virtual",
    horas: 8,
    fecha: diaISO(10),
    vigenciaMeses: 0,
    asignados: [
      { miembroId: "4", estado: "En curso", completada: "" },
      { miembroId: "3", estado: "Pendiente", completada: "" },
    ],
  },
  {
    id: "c4",
    titulo: "Radioprotección en consultorio",
    tipo: "Obligatoria",
    modalidad: "Virtual",
    horas: 10,
    fecha: diaISO(25),
    vigenciaMeses: 24,
    asignados: [
      { miembroId: "1", estado: "Pendiente", completada: "" },
      { miembroId: "8", estado: "En curso", completada: "" },
      { miembroId: "2", estado: "Pendiente", completada: "" },
    ],
  },
];

const EVALUACIONES: Evaluacion[] = [
  {
    id: "e1",
    miembroId: "1",
    ciclo: "2026 · 1er semestre",
    fecha: diaISO(-90),
    evaluador: "Diego Fernández",
    puntajes: puntajes(5, 5, 4, 5, 4),
    fortalezas: "Excelente trato con pacientes de ortodoncia y muy ordenada con las historias.",
    mejoras: "Delegar más tareas a las asistentes.",
    objetivos: "Formar a una asistente en ortodoncia preventiva.",
    estado: "Cerrada",
  },
  {
    id: "e2",
    miembroId: "3",
    ciclo: "2026 · 1er semestre",
    fecha: diaISO(-88),
    evaluador: "Laura Martínez",
    puntajes: puntajes(4, 4, 5, 3, 4),
    fortalezas: "Muy buena predisposición y trabajo en equipo.",
    mejoras: "Mejorar la puntualidad al inicio del turno.",
    objetivos: "Completar el curso de atención al paciente.",
    estado: "Cerrada",
  },
  {
    id: "e3",
    miembroId: "4",
    ciclo: "2026 · 1er semestre",
    fecha: diaISO(-85),
    evaluador: "Diego Fernández",
    puntajes: puntajes(5, 4, 4, 5, 5),
    fortalezas: "Resuelve la agenda con mucha agilidad y es clara con los pacientes.",
    mejoras: "Documentar mejor las derivaciones.",
    objetivos: "Bajar el ausentismo de turnos con confirmaciones.",
    estado: "Cerrada",
  },
  {
    id: "e4",
    miembroId: "8",
    ciclo: "2026 · 2do semestre",
    fecha: diaISO(-2),
    evaluador: "Laura Martínez",
    puntajes: puntajes(5, 4, 4, 4, 4),
    fortalezas: "Muy buena comunicación con pacientes nuevos.",
    mejoras: "",
    objetivos: "",
    estado: "Borrador",
  },
];

const COMUNICADOS: Comunicado[] = [
  {
    id: "co1",
    titulo: "Nuevo protocolo de esterilización",
    texto:
      "Desde el lunes, cada ciclo de autoclave se registra en el portal del equipo (Gabinete). Gracias por sumarse.",
    fecha: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    autor: "Diego Fernández",
    destino: "Todos",
    fijado: true,
    leidos: ["1", "3", "5"],
  },
  {
    id: "co2",
    titulo: "Cierre por feriado",
    texto:
      "La clínica permanecerá cerrada el próximo feriado nacional. Reprogramen los turnos con tiempo.",
    fecha: new Date(Date.now() - 6 * 86_400_000).toISOString(),
    autor: "Diego Fernández",
    destino: "Todos",
    fijado: false,
    leidos: ["1", "2", "3", "4", "5", "8"],
  },
  {
    id: "co3",
    titulo: "Reunión clínica mensual",
    texto: "El jueves a las 18 h revisamos casos complejos del mes. Traigan sus dudas.",
    fecha: new Date(Date.now() - 1 * 86_400_000).toISOString(),
    autor: "Laura Martínez",
    destino: "odontologo",
    fijado: false,
    leidos: ["1"],
  },
];

const DOCUMENTOS: DocumentoRRHH[] = [
  {
    id: "d1",
    miembroId: "1",
    tipo: "Matrícula profesional",
    archivo: "matricula-martinez.pdf",
    subido: diaISO(-340),
    vence: diaISO(24),
  },
  {
    id: "d2",
    miembroId: "1",
    tipo: "Seguro de mala praxis",
    archivo: "poliza-martinez-2026.pdf",
    subido: diaISO(-200),
    vence: diaISO(165),
  },
  {
    id: "d3",
    miembroId: "2",
    tipo: "Seguro de mala praxis",
    archivo: "poliza-gonzalez.pdf",
    subido: diaISO(-370),
    vence: diaISO(-5),
  },
  {
    id: "d4",
    miembroId: "2",
    tipo: "Matrícula profesional",
    archivo: "matricula-gonzalez.pdf",
    subido: diaISO(-100),
    vence: diaISO(265),
  },
  {
    id: "d5",
    miembroId: "3",
    tipo: "Contrato firmado",
    archivo: "contrato-plazo-fijo-lopez.pdf",
    subido: diaISO(-340),
    vence: diaISO(18),
  },
  {
    id: "d6",
    miembroId: "3",
    tipo: "Vacuna hepatitis B",
    archivo: "vacuna-lopez.jpg",
    subido: diaISO(-330),
    vence: "",
  },
  {
    id: "d7",
    miembroId: "4",
    tipo: "DNI",
    archivo: "dni-rodriguez.pdf",
    subido: diaISO(-900),
    vence: "",
  },
  {
    id: "d8",
    miembroId: "8",
    tipo: "Matrícula profesional",
    archivo: "matricula-mendez.pdf",
    subido: diaISO(-560),
    vence: diaISO(170),
  },
  {
    id: "d9",
    miembroId: "8",
    tipo: "Título",
    archivo: "titulo-mendez.pdf",
    subido: diaISO(-560),
    vence: "",
  },
  {
    id: "d10",
    miembroId: "5",
    tipo: "Alta ART",
    archivo: "art-fernandez.pdf",
    subido: diaISO(-1200),
    vence: "",
  },

  {
    id: "d11",
    miembroId: "1",
    tipo: "DNI",
    archivo: "dni-martinez.pdf",
    subido: diaISO(-2100),
    vence: "",
  },
  {
    id: "d12",
    miembroId: "1",
    tipo: "Título",
    archivo: "titulo-martinez.pdf",
    subido: diaISO(-2100),
    vence: "",
  },
  {
    id: "d13",
    miembroId: "1",
    tipo: "Vacuna hepatitis B",
    archivo: "vacuna-martinez.jpg",
    subido: diaISO(-1500),
    vence: "",
  },
  {
    id: "d14",
    miembroId: "2",
    tipo: "DNI",
    archivo: "dni-gonzalez.pdf",
    subido: diaISO(-1000),
    vence: "",
  },
  {
    id: "d15",
    miembroId: "2",
    tipo: "Título",
    archivo: "titulo-gonzalez.pdf",
    subido: diaISO(-1000),
    vence: "",
  },
  {
    id: "d16",
    miembroId: "3",
    tipo: "DNI",
    archivo: "dni-lopez.pdf",
    subido: diaISO(-340),
    vence: "",
  },
  {
    id: "d17",
    miembroId: "3",
    tipo: "Alta ART",
    archivo: "art-lopez.pdf",
    subido: diaISO(-340),
    vence: "",
  },
  {
    id: "d18",
    miembroId: "4",
    tipo: "Alta ART",
    archivo: "art-rodriguez.pdf",
    subido: diaISO(-1400),
    vence: "",
  },
  {
    id: "d19",
    miembroId: "4",
    tipo: "Contrato firmado",
    archivo: "contrato-rodriguez.pdf",
    subido: diaISO(-1400),
    vence: "",
  },
  {
    id: "d20",
    miembroId: "5",
    tipo: "DNI",
    archivo: "dni-fernandez.pdf",
    subido: diaISO(-2800),
    vence: "",
  },
  {
    id: "d21",
    miembroId: "8",
    tipo: "DNI",
    archivo: "dni-mendez.pdf",
    subido: diaISO(-560),
    vence: "",
  },
];

const FLUJOS: FlujoRRHH[] = [
  {
    id: "f1",
    nombre: "Aviso de contrato por vencer",
    detalle: "30 días antes avisa a administración y al integrante.",
    activo: true,
    ejecuciones: 14,
  },
  {
    id: "f2",
    nombre: "Alta de legajo y acceso al portal",
    detalle: "Al dar de alta a una persona crea su legajo y el código del portal del equipo.",
    activo: true,
    ejecuciones: 9,
  },
  {
    id: "f3",
    nombre: "Saludo de cumpleaños",
    detalle: "Publica un comunicado para todo el equipo el día del cumpleaños.",
    activo: true,
    ejecuciones: 22,
  },
  {
    id: "f4",
    nombre: "Documento vencido",
    detalle:
      "Si vence la matrícula o el seguro, bloquea la agenda del profesional hasta renovarlo.",
    activo: false,
    ejecuciones: 0,
  },
  {
    id: "f5",
    nombre: "Recibo de sueldo por correo",
    detalle: "Al marcar el período como pagado envía el recibo a cada persona.",
    activo: true,
    ejecuciones: 36,
  },
];

export const storeRRHH = crearStorePorEmpresa<EstadoRRHH>(
  () => {
    const actual = periodoActual();
    return {
      legajos: legajosEjemplo(),
      solicitudes: [
        {
          id: "s1",
          miembroId: "4",
          tipo: "Vacaciones",
          desde: diaISO(20),
          hasta: diaISO(30),
          motivo: "Viaje familiar",
          estado: "Pendiente",
          creada: new Date(Date.now() - 86_400_000).toISOString(),
          origen: "Portal del equipo",
          respuesta: "",
        },
        {
          id: "s2",
          miembroId: "8",
          tipo: "Trámite personal",
          desde: diaISO(6),
          hasta: diaISO(6),
          motivo: "Renovación de pasaporte",
          estado: "Pendiente",
          creada: new Date(Date.now() - 3 * 3_600_000).toISOString(),
          origen: "Portal del equipo",
          respuesta: "",
        },
        {
          id: "s3",
          miembroId: "2",
          tipo: "Vacaciones",
          desde: diaISO(12),
          hasta: diaISO(19),
          motivo: "",
          estado: "Aprobada",
          creada: diaISO(-15),
          origen: "RRHH",
          respuesta: "Aprobada. Cubre Jesús Méndez.",
        },
      ],
      fichajes: fichajesEjemplo(),
      periodos: [
        { periodo: periodoAnterior(actual, 2), estado: "Pagada", pagado: diaISO(-55), ajustes: {} },
        {
          periodo: periodoAnterior(actual, 1),
          estado: "Pagada",
          pagado: diaISO(-25),
          ajustes: { "4": { horasExtra: 6, bono: 0, adelanto: 0 } },
        },
        {
          periodo: actual,
          estado: "Borrador",
          pagado: "",
          ajustes: {
            "3": { horasExtra: 4, bono: 0, adelanto: 150_000 },
            "8": { horasExtra: 0, bono: 120_000, adelanto: 0 },
          },
        },
      ],
      capacitaciones: CAPACITACIONES,
      evaluaciones: EVALUACIONES,
      comunicados: COMUNICADOS,
      documentos: DOCUMENTOS,
      flujos: FLUJOS,
      auditoria: [
        {
          id: "au1",
          fecha: new Date(Date.now() - 86_400_000).toISOString(),
          usuario: "Portal del equipo",
          accion: "Solicitud",
          detalle: "Sofía Rodríguez pidió vacaciones",
        },
        {
          id: "au2",
          fecha: new Date(Date.now() - 25 * 86_400_000).toISOString(),
          usuario: "Diego Fernández",
          accion: "Nómina",
          detalle: `Período ${nombrePeriodo(periodoAnterior(actual, 1))} pagado`,
        },
      ],
      config: {
        toleranciaMin: 10,
        presentismoPct: 8.33,
        aportesPct: 17,
        contribucionesPct: 24,
        recargoExtraPct: 50,
        diaPago: 5,
        antiguedadPct: 1,
      },
    };
  },
  { persistir: "rrhh" },
);

export function setRRHH<K extends keyof EstadoRRHH>(
  clave: K,
  fn: (prev: EstadoRRHH[K]) => EstadoRRHH[K],
) {
  const actual = storeRRHH.leer();
  storeRRHH.poner({ ...actual, [clave]: fn(actual[clave]) });
}

export function auditar(usuario: string, accion: string, detalle: string) {
  setRRHH("auditoria", (p) =>
    [
      {
        id: `au-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        fecha: new Date().toISOString(),
        usuario,
        accion,
        detalle,
      },
      ...p,
    ].slice(0, 400),
  );
}

/* ───────────── Cálculos ───────────── */

export function nombreDe(m: Pick<TeamMember, "firstName" | "lastName">) {
  return `${m.firstName} ${m.lastName}`.trim();
}

const PUESTO_POR_ROL: Record<
  TeamRole,
  { puesto: string; departamento: Departamento; basico: number }
> = {
  odontologo: { puesto: "Odontólogo/a", departamento: "Clínico", basico: 1_450_000 },
  asistente: { puesto: "Asistente dental", departamento: "Clínico", basico: 850_000 },
  secretaria: { puesto: "Recepcionista", departamento: "Recepción", basico: 900_000 },
  administrador: { puesto: "Administración", departamento: "Administración", basico: 1_250_000 },
};

/** Legajo guardado o uno básico (para integrantes dados de alta desde Equipo). */
export function legajoDe(m: TeamMember, legajos: Record<string, Legajo>): Legajo {
  const guardado = legajos[m.id];
  if (guardado) return guardado;
  const base = PUESTO_POR_ROL[m.role];
  return legajo({
    miembroId: m.id,
    numero: "Sin número",
    puesto: base.puesto,
    departamento: base.departamento,
    ingreso: diaISO(),
    modalidad: "Relación de dependencia",
    basico: base.basico,
    obraSocial: "",
    convenio: "",
  });
}
export function legajoIncompleto(l: Legajo) {
  return !l.dni || !l.cuil || !l.nacimiento || !l.cbu || !l.emergencia || l.numero === "Sin número";
}

export function antiguedad(ingreso: string, a = diaISO()) {
  return Math.max(0, Math.floor(diasEntre(ingreso, a) / 365.25));
}
/** Días de vacaciones anuales según Ley de Contrato de Trabajo (art. 150). */
export function vacacionesAnuales(ingreso: string) {
  const a = antiguedad(ingreso);
  if (diasEntre(ingreso, diaISO()) < 180)
    return Math.max(1, Math.floor(diasEntre(ingreso, diaISO()) / 20));
  return a < 5 ? 14 : a < 10 ? 21 : a < 20 ? 28 : 35;
}
export function diasAusencia(a: Pick<Ausencia, "desde" | "hasta">, anio = diaISO().slice(0, 4)) {
  const desde = a.desde < `${anio}-01-01` ? `${anio}-01-01` : a.desde;
  const hasta = a.hasta > `${anio}-12-31` ? `${anio}-12-31` : a.hasta;
  return hasta < desde ? 0 : diasEntre(desde, hasta) + 1;
}
export function saldoVacaciones(miembroId: string, ingreso: string, ausencias: Ausencia[]) {
  const usados = ausencias
    .filter((a) => a.miembroId === miembroId && a.tipo === "Vacaciones")
    .reduce((s, a) => s + diasAusencia(a), 0);
  const total = vacacionesAnuales(ingreso);
  return { total, usados, disponibles: Math.max(0, total - usados) };
}

export function horarioDe(m: TeamMember, fecha: string) {
  const d = m.schedule.find((s) => s.day === diaSemana(fecha));
  return d?.active ? d : null;
}

export type Marca = FichajeRRHH & { tarde: number; horas: number };
/** Fichajes combinados: historial de RRHH + los del portal del equipo (sin duplicar día). */
export function marcas(
  fichajes: FichajeRRHH[],
  miembros: TeamMember[],
  tolerancia: number,
): Marca[] {
  const portal = storeEquipoPortal.leer().fichajes;
  const deRRHH = new Set(fichajes.map((f) => `${f.miembroId}:${f.fecha}`));
  const todos: FichajeRRHH[] = [
    ...fichajes,
    ...portal
      .filter((f) => !deRRHH.has(`${f.miembroId}:${f.fecha}`))
      .map((f) => ({
        id: f.id,
        miembroId: f.miembroId,
        fecha: f.fecha,
        entrada: f.entrada,
        salida: f.salida ?? "",
        origen: "Portal" as const,
        nota: "",
      })),
  ];
  return todos.map((f) => {
    const m = miembros.find((x) => x.id === f.miembroId);
    const h = m ? horarioDe(m, f.fecha) : null;
    const tarde = h ? Math.max(0, aMinutos(f.entrada) - aMinutos(h.start) - tolerancia) : 0;
    const horas = f.salida ? Math.max(0, (aMinutos(f.salida) - aMinutos(f.entrada)) / 60) : 0;
    return { ...f, tarde: tarde > 0 ? tarde + tolerancia : 0, horas };
  });
}

export type Recibo = {
  miembroId: string;
  periodo: string;
  modalidad: Modalidad;
  basico: number;
  antiguedad: number;
  presentismo: number;
  horasExtra: number;
  bono: number;
  comisiones: number;
  bruto: number;
  aportes: number;
  adelanto: number;
  neto: number;
  contribuciones: number;
  costo: number;
  llegadasTarde: number;
  pierdePresentismo: boolean;
};

/** Recibo del período: básico + antigüedad + presentismo + extras + bono − aportes − adelantos. */
export function calcularRecibo(
  m: TeamMember,
  l: Legajo,
  periodo: Periodo,
  config: ConfigRRHH,
  todasLasMarcas: Marca[],
  ausencias: Ausencia[],
): Recibo {
  const aj = periodo.ajustes[m.id] ?? { horasExtra: 0, bono: 0, adelanto: 0 };
  const deps = l.modalidad === "Relación de dependencia" || l.modalidad === "Plazo fijo";
  const delMes = todasLasMarcas.filter(
    (f) => f.miembroId === m.id && f.fecha.startsWith(periodo.periodo),
  );
  const llegadasTarde = delMes.filter((f) => f.tarde > 0).length;
  const injustificadas = ausencias.filter(
    (a) =>
      a.miembroId === m.id && a.tipo === "Trámite personal" && a.desde.startsWith(periodo.periodo),
  ).length;
  const pierdePresentismo = llegadasTarde >= 3 || injustificadas > 1;
  const basico = l.basico;
  const antig = deps
    ? Math.round((basico * config.antiguedadPct * antiguedad(l.ingreso)) / 100)
    : 0;
  const presentismo =
    deps && !pierdePresentismo ? Math.round(((basico + antig) * config.presentismoPct) / 100) : 0;
  const valorHora = basico / Math.max(1, l.jornada * 4.33);
  const horasExtra = Math.round(aj.horasExtra * valorHora * (1 + config.recargoExtraPct / 100));
  const comisiones = deps ? 0 : Math.round((m.commissions?.[0]?.percentage ?? 0) * 12_000);
  const bruto = basico + antig + presentismo + horasExtra + aj.bono + comisiones;
  const aportes = deps ? Math.round((bruto * config.aportesPct) / 100) : 0;
  const contribuciones = deps ? Math.round((bruto * config.contribucionesPct) / 100) : 0;
  return {
    miembroId: m.id,
    periodo: periodo.periodo,
    modalidad: l.modalidad,
    basico,
    antiguedad: antig,
    presentismo,
    horasExtra,
    bono: aj.bono,
    comisiones,
    bruto,
    aportes,
    adelanto: aj.adelanto,
    neto: bruto - aportes - aj.adelanto,
    contribuciones,
    costo: bruto + contribuciones,
    llegadasTarde,
    pierdePresentismo,
  };
}

/** Aprueba una solicitud y la registra como ausencia de Equipo (se ve en Agenda y Equipo). */
export function aprobarSolicitud(id: string, usuario: string, respuesta: string) {
  const s = storeRRHH.leer().solicitudes.find((x) => x.id === id);
  if (!s) return;
  setRRHH("solicitudes", (p) =>
    p.map((x) => (x.id === id ? { ...x, estado: "Aprobada", respuesta } : x)),
  );
  const eq = storeEquipo.leer();
  storeEquipo.poner({
    ...eq,
    ausencias: [
      ...eq.ausencias,
      {
        id: `a-${Date.now()}`,
        miembroId: s.miembroId,
        tipo: s.tipo,
        desde: s.desde,
        hasta: s.hasta,
        nota: s.motivo,
      },
    ],
  });
  const m = eq.miembros.find((x) => x.id === s.miembroId);
  auditar(
    usuario,
    "Licencia aprobada",
    `${m ? nombreDe(m) : s.miembroId}: ${s.tipo} del ${s.desde} al ${s.hasta}`,
  );
}

export function solicitarLicencia(
  s: Omit<SolicitudLicencia, "id" | "creada" | "estado" | "respuesta">,
) {
  setRRHH("solicitudes", (p) => [
    {
      ...s,
      id: `s-${Date.now()}`,
      creada: new Date().toISOString(),
      estado: "Pendiente",
      respuesta: "",
    },
    ...p,
  ]);
}

/* ───────────── Alertas e inteligencia (Esther) ───────────── */

export type InsightRRHH = {
  id: string;
  nivel: "alta" | "media" | "info";
  titulo: string;
  detalle: string;
  seccion: string;
};

export function proximoAniversario(iso: string) {
  if (!iso) return null;
  const hoy = diaISO();
  let f = `${hoy.slice(0, 4)}${iso.slice(4)}`;
  if (f < hoy) f = `${Number(hoy.slice(0, 4)) + 1}${iso.slice(4)}`;
  return {
    fecha: f,
    dias: diasEntre(hoy, f),
    anios: Number(f.slice(0, 4)) - Number(iso.slice(0, 4)),
  };
}

/** Todo lo que RRHH necesita mirar, leído de los stores de la empresa actual. */
export function datosRRHH() {
  const r = storeRRHH.leer();
  const eq = storeEquipo.leer();
  const activos = eq.miembros.filter((m) => m.status === "activo" && !r.legajos[m.id]?.baja);
  const hoy = diaISO();
  const lista = activos.map((m) => ({ m, l: legajoDe(m, r.legajos) }));
  const todasMarcas = marcas(r.fichajes, eq.miembros, r.config.toleranciaMin);
  const ausentesHoy = eq.ausencias.filter(
    (a) => a.desde <= hoy && a.hasta >= hoy && activos.some((m) => m.id === a.miembroId),
  );
  const deHoy = todasMarcas.filter((f) => f.fecha === hoy);
  const periodo = r.periodos.find((p) => p.periodo === periodoActual()) ?? {
    periodo: periodoActual(),
    estado: "Borrador" as const,
    pagado: "",
    ajustes: {},
  };
  const recibos = lista.map(({ m, l }) =>
    calcularRecibo(m, l, periodo, r.config, todasMarcas, eq.ausencias),
  );
  return { r, eq, activos, lista, hoy, todasMarcas, ausentesHoy, deHoy, periodo, recibos };
}

export function insightsRRHH(): InsightRRHH[] {
  const { r, eq, lista, todasMarcas, hoy } = datosRRHH();
  const out: InsightRRHH[] = [];
  const pend = r.solicitudes.filter((s) => s.estado === "Pendiente");
  if (pend.length)
    out.push({
      id: "sol",
      nivel: "alta",
      titulo: `${pend.length} solicitudes de licencia sin responder`,
      detalle: pend
        .map((s) =>
          nombreDe(
            eq.miembros.find((m) => m.id === s.miembroId) ?? { firstName: "?", lastName: "" },
          ),
        )
        .join(", "),
      seccion: "licencias",
    });
  for (const { m, l } of lista) {
    if (l.finContrato) {
      const d = diasEntre(hoy, l.finContrato);
      if (d <= 30)
        out.push({
          id: `ct-${m.id}`,
          nivel: d < 0 ? "alta" : "media",
          titulo: `Contrato de ${nombreDe(m)} ${d < 0 ? "vencido" : `vence en ${d} días`}`,
          detalle: `${l.modalidad}. Decidí si se renueva o pasa a tiempo indeterminado.`,
          seccion: "personas",
        });
    }
    const tarde = todasMarcas.filter(
      (f) => f.miembroId === m.id && f.tarde > 0 && diasEntre(f.fecha, hoy) <= 14,
    ).length;
    if (tarde >= 2)
      out.push({
        id: `tr-${m.id}`,
        nivel: tarde >= 3 ? "alta" : "media",
        titulo: `${nombreDe(m)} llegó tarde ${tarde} veces en 2 semanas`,
        detalle:
          tarde >= 3
            ? "Con 3 o más pierde el presentismo del mes."
            : "Conviene una charla antes de que pierda el presentismo.",
        seccion: "asistencia",
      });
    if (legajoIncompleto(l))
      out.push({
        id: `lg-${m.id}`,
        nivel: "info",
        titulo: `Legajo incompleto: ${nombreDe(m)}`,
        detalle: "Faltan datos personales, bancarios o de emergencia.",
        seccion: "personas",
      });
  }
  for (const d of r.documentos) {
    if (!d.vence || d.tipo === "Contrato firmado") continue;
    const dias = diasEntre(hoy, d.vence);
    const m = eq.miembros.find((x) => x.id === d.miembroId);
    if (!m || m.status === "inactivo" || dias > 30) continue;
    out.push({
      id: `doc-${d.id}`,
      nivel: dias < 0 ? "alta" : "media",
      titulo: `${d.tipo} de ${nombreDe(m)} ${dias < 0 ? `venció hace ${-dias} días` : `vence en ${dias} días`}`,
      detalle:
        d.tipo.includes("Seguro") || d.tipo.includes("Matrícula")
          ? "Sin esto no puede atender pacientes."
          : "Pedile la renovación.",
      seccion: "documentos",
    });
  }
  for (const c of r.capacitaciones.filter((c) => c.tipo === "Obligatoria")) {
    const falta = c.asignados.filter((a) => a.estado !== "Completada");
    if (falta.length && diasEntre(hoy, c.fecha) <= 30)
      out.push({
        id: `cap-${c.id}`,
        nivel: "media",
        titulo: `${c.titulo}: ${falta.length} sin completar`,
        detalle: "Capacitación obligatoria.",
        seccion: "desarrollo",
      });
  }
  // Cobertura: vacaciones que se superponen
  const prox = eq.ausencias.filter((a) => a.hasta >= hoy && diasEntre(hoy, a.desde) <= 30);
  for (const a of prox)
    for (const b of prox)
      if (a.id < b.id && a.desde <= b.hasta && b.desde <= a.hasta) {
        const ma = eq.miembros.find((m) => m.id === a.miembroId);
        const mb = eq.miembros.find((m) => m.id === b.miembroId);
        if (ma && mb && ma.role === mb.role)
          out.push({
            id: `cob-${a.id}-${b.id}`,
            nivel: "media",
            titulo: `Cobertura baja: ${nombreDe(ma)} y ${nombreDe(mb)} ausentes a la vez`,
            detalle: `Coinciden desde el ${(a.desde > b.desde ? a.desde : b.desde).split("-").reverse().join("/")}.`,
            seccion: "licencias",
          });
      }
  const orden = { alta: 0, media: 1, info: 2 };
  return out.sort((a, b) => orden[a.nivel] - orden[b.nivel]);
}

function ars(n: number) {
  return `$ ${Math.round(n).toLocaleString("es-AR")}`;
}
function fechaCorta(iso: string) {
  return iso.slice(0, 10).split("-").reverse().join("/");
}

export const PREGUNTAS_RRHH = [
  "¿Quién falta hoy?",
  "Resumen del equipo",
  "¿Qué vence este mes?",
  "Costo laboral del mes",
  "¿Quién llega tarde?",
  "Saldo de vacaciones",
  "Próximos cumpleaños",
  "¿Qué tengo que resolver?",
] as const;

/** Esther responde preguntas de RRHH con los datos reales de la empresa (sin inventar). */
export function responderRRHH(pregunta: string): string {
  const q = pregunta
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const { r, eq, lista, ausentesHoy, deHoy, recibos, periodo, todasMarcas, hoy } = datosRRHH();
  const nombre = (id: string) => {
    const m = eq.miembros.find((x) => x.id === id);
    return m ? nombreDe(m) : "Alguien";
  };
  const persona = lista.find(({ m }) =>
    q.includes(
      m.firstName
        .toLocaleLowerCase("es")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""),
    ),
  );

  if (/falta|ausent|hoy|presente|fich/.test(q)) {
    const conHorario = lista.filter(({ m }) => horarioDe(m, hoy));
    const sinFichar = conHorario.filter(
      ({ m }) =>
        !deHoy.some((f) => f.miembroId === m.id) && !ausentesHoy.some((a) => a.miembroId === m.id),
    );
    return [
      `Hoy trabajan ${conHorario.length} personas.`,
      deHoy.length
        ? `Ya ficharon: ${deHoy.map((f) => `${nombre(f.miembroId)} (${f.entrada}${f.tarde ? `, ${f.tarde} min tarde` : ""})`).join(", ")}.`
        : "Todavía nadie fichó.",
      ausentesHoy.length
        ? `Con licencia: ${ausentesHoy.map((a) => `${nombre(a.miembroId)} (${a.tipo.toLowerCase()})`).join(", ")}.`
        : "No hay licencias para hoy.",
      sinFichar.length
        ? `Sin fichar todavía: ${sinFichar.map(({ m }) => nombreDe(m)).join(", ")}.`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  }
  if (/venc|contrato|document|matricul|seguro/.test(q)) {
    const items = insightsRRHH().filter((i) => i.id.startsWith("ct-") || i.id.startsWith("doc-"));
    return items.length
      ? `Esto vence o está vencido en los próximos 30 días:\n${items.map((i) => `• ${i.titulo}`).join("\n")}`
      : "No hay contratos ni documentos por vencer en los próximos 30 días.";
  }
  if (/costo|sueldo|nomina|liquid|masa|pagar/.test(q)) {
    const neto = recibos.reduce((a, x) => a + x.neto, 0);
    const costo = recibos.reduce((a, x) => a + x.costo, 0);
    const top = [...recibos].sort((a, b) => b.costo - a.costo)[0];
    const sinPres = recibos.filter((x) => x.pierdePresentismo);
    return [
      `Período ${nombrePeriodo(periodo.periodo)} (${periodo.estado.toLowerCase()}):`,
      `• Neto a pagar: ${ars(neto)}`,
      `• Costo laboral total (con contribuciones): ${ars(costo)}`,
      top ? `• Mayor costo: ${nombre(top.miembroId)} con ${ars(top.costo)}` : "",
      sinPres.length
        ? `• Pierden presentismo: ${sinPres.map((x) => nombre(x.miembroId)).join(", ")}`
        : "• Nadie pierde el presentismo este mes.",
    ]
      .filter(Boolean)
      .join("\n");
  }
  if (/tarde|puntual|llegad/.test(q)) {
    const conteo = lista
      .map(({ m }) => ({
        m,
        n: todasMarcas.filter(
          (f) => f.miembroId === m.id && f.tarde > 0 && diasEntre(f.fecha, hoy) <= 30,
        ).length,
      }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n);
    return conteo.length
      ? `Llegadas tarde en los últimos 30 días (tolerancia ${r.config.toleranciaMin} min):\n${conteo.map((x) => `• ${nombreDe(x.m)}: ${x.n}`).join("\n")}`
      : "Nadie llegó tarde en los últimos 30 días. ¡Muy bien el equipo!";
  }
  if (/vacacion|saldo|dias/.test(q)) {
    const filas = (persona ? [persona] : lista).map(({ m, l }) => {
      const s = saldoVacaciones(m.id, l.ingreso, eq.ausencias);
      return `• ${nombreDe(m)}: ${s.disponibles} de ${s.total} días disponibles`;
    });
    return `Saldo de vacaciones ${diaISO().slice(0, 4)}:\n${filas.join("\n")}`;
  }
  if (/cumple|aniversario|evento/.test(q)) {
    const prox = lista
      .flatMap(({ m, l }) => {
        const c = proximoAniversario(l.nacimiento);
        const i = proximoAniversario(l.ingreso);
        return [
          c && c.dias <= 60
            ? { d: c.dias, t: `🎂 ${nombreDe(m)} cumple ${c.anios} el ${fechaCorta(c.fecha)}` }
            : null,
          i && i.dias <= 60 && i.anios > 0
            ? {
                d: i.dias,
                t: `🎉 ${nombreDe(m)} cumple ${i.anios} ${i.anios === 1 ? "año" : "años"} en la clínica el ${fechaCorta(i.fecha)}`,
              }
            : null,
        ];
      })
      .filter((x): x is { d: number; t: string } => !!x)
      .sort((a, b) => a.d - b.d);
    return prox.length
      ? `Próximos 60 días:\n${prox.map((x) => x.t).join("\n")}`
      : "No hay cumpleaños ni aniversarios en los próximos 60 días.";
  }
  if (/resolver|pendiente|alerta|urgente|hacer/.test(q)) {
    const ins = insightsRRHH();
    return ins.length
      ? `Tenés ${ins.length} temas abiertos. Lo más importante:\n${ins
          .slice(0, 6)
          .map((i) => `• ${i.titulo}`)
          .join("\n")}`
      : "No hay nada pendiente en RRHH. Todo al día.";
  }
  if (persona) {
    const { m, l } = persona;
    const s = saldoVacaciones(m.id, l.ingreso, eq.ausencias);
    const ev = r.evaluaciones.filter((e) => e.miembroId === m.id && e.estado === "Cerrada").at(-1);
    const prom = ev ? Object.values(ev.puntajes).reduce((a, b) => a + b, 0) / 5 : null;
    const rec = recibos.find((x) => x.miembroId === m.id);
    return [
      `${nombreDe(m)} · ${l.puesto} (${l.sucursal})`,
      `• Ingresó el ${fechaCorta(l.ingreso)} (${antiguedad(l.ingreso)} años) · ${l.modalidad}`,
      `• Vacaciones: ${s.disponibles} días disponibles`,
      prom !== null
        ? `• Última evaluación: ${prom.toFixed(1)}/5 (${ev?.ciclo})`
        : "• Sin evaluaciones cerradas",
      rec
        ? `• Neto estimado del mes: ${ars(rec.neto)}${rec.pierdePresentismo ? " (pierde presentismo)" : ""}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  }
  // Resumen general por defecto
  const porRol = lista.reduce<Record<string, number>>(
    (a, { m }) => ({ ...a, [m.role]: (a[m.role] ?? 0) + 1 }),
    {},
  );
  const rotulos: Record<string, string> = {
    odontologo: "odontólogos",
    asistente: "asistentes",
    secretaria: "recepción",
    administrador: "administración",
  };
  return [
    `El equipo tiene ${lista.length} personas activas: ${Object.entries(porRol)
      .map(([k, v]) => `${v} ${rotulos[k] ?? k}`)
      .join(", ")}.`,
    `Hoy: ${deHoy.length} fichadas, ${ausentesHoy.length} con licencia.`,
    `Solicitudes pendientes: ${r.solicitudes.filter((s) => s.estado === "Pendiente").length}.`,
    `Costo laboral estimado del mes: ${ars(recibos.reduce((a, x) => a + x.costo, 0))}.`,
    "Podés preguntarme por una persona (ej. «¿Cómo está Sofía?»), vencimientos, llegadas tarde, vacaciones o costos.",
  ].join("\n");
}
