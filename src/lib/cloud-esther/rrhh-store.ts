import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";
import { storeEquipo, type Ausencia, type TipoAusencia } from "@/lib/cloud-esther/equipo-store";
import { storeEquipoPortal } from "@/lib/cloud-esther/portal-equipo-store";
import { SUCURSALES } from "@/lib/cloud-esther/agenda-store";
import { type TeamMember, type TeamRole } from "@/lib/cloud-esther/equipo-profesional-data";
import {
  COTIZACIONES_INICIALES,
  contratoDe,
  contratoPorNombre,
  formatoMoneda,
  paisDe,
  type ClaseContrato,
  type ContratoDef,
  type EsquemaPago,
  type PaisId,
} from "@/lib/cloud-esther/nomina-paises";

/* Ubicación: src/lib/cloud-esther/rrhh-store.ts

   Recursos Humanos por empresa. Las personas son los integrantes de Equipo (mismo id):
   RRHH les suma el legajo, contrato, sueldo, documentos, capacitaciones y evaluaciones.
   Las licencias aprobadas se guardan como ausencias de Equipo (se ven en Agenda y Equipo)
   y la asistencia combina los fichajes del portal del equipo con el historial de RRHH.
   Arranca vacío: cada clínica carga su propia información.
   TODO backend: tablas legajos / liquidaciones / capacitaciones / evaluaciones por clinicId. */

/* ───────────── Tipos ───────────── */

export const MODALIDADES = [
  "Relación de dependencia",
  "Plazo fijo",
  "Monotributo",
  "Pasantía",
] as const;
/** Nombre del tipo de contrato (depende del país; ver nomina-paises.ts). */
export type Modalidad = string;
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
  pais: PaisId;
  contratoId: string;
  esquema: EsquemaPago;
  valorHora: number;
  comisionPct: number;
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
export type AjusteRecibo = {
  horasExtra: number;
  bono: number;
  adelanto: number;
  descuento?: number;
  horas?: number; // horas trabajadas (si no, se toman de los fichajes)
  produccion?: number; // facturación del profesional para la comisión
  nota?: string;
};

export type EstadoLote = "Preparado" | "Enviado al banco" | "Pagado";
export type ItemPago = {
  miembroId: string;
  moneda: string;
  monto: number;
  cuenta: string;
  requiereFactura: boolean;
  factura: string;
  pagado: boolean;
};
export type LotePago = {
  id: string;
  periodo: string;
  creado: string;
  estado: EstadoLote;
  items: ItemPago[];
};
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
  cotizaciones?: Record<string, number>; // unidades por 1 USD
  tasas?: Record<string, { aportesPct: number; patronalPct: number; retencionPct: number }>;
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
  lotes?: LotePago[];
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

/* ───────────── Estado inicial (vacío) ───────────── */

const [CENTRO = "Clínica Centro"] = SUCURSALES;

function legajo(
  l: Partial<Legajo> &
    Pick<
      Legajo,
      "miembroId" | "numero" | "puesto" | "departamento" | "ingreso" | "modalidad" | "basico"
    >,
): Legajo {
  return {
    pais: "AR",
    contratoId: contratoPorNombre(l.modalidad).id,
    esquema: "Mensual",
    valorHora: 0,
    comisionPct: 0,
    dni: "",
    cuil: "",
    nacimiento: "",
    direccion: "",
    emergencia: "",
    obraSocial: "",
    cbu: "",
    sucursal: CENTRO,
    finContrato: "",
    jornada: 40,
    convenio: "",
    baja: null,
    historial: [],
    ...l,
  };
}

/* Flujos automáticos de RRHH: son funciones del sistema (se pueden activar o desactivar),
   no datos de ejemplo. Arrancan con cero ejecuciones. */
const FLUJOS: FlujoRRHH[] = [
  {
    id: "f1",
    nombre: "Aviso de contrato por vencer",
    detalle: "30 días antes avisa a administración y al integrante.",
    activo: true,
    ejecuciones: 0,
  },
  {
    id: "f2",
    nombre: "Alta de legajo y acceso al portal",
    detalle: "Al dar de alta a una persona crea su legajo y el código del portal del equipo.",
    activo: true,
    ejecuciones: 0,
  },
  {
    id: "f3",
    nombre: "Saludo de cumpleaños",
    detalle: "Publica un comunicado para todo el equipo el día del cumpleaños.",
    activo: true,
    ejecuciones: 0,
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
    ejecuciones: 0,
  },
];

export const storeRRHH = crearStorePorEmpresa<EstadoRRHH>(
  () => ({
    legajos: {},
    solicitudes: [],
    fichajes: [],
    periodos: [{ periodo: periodoActual(), estado: "Borrador", pagado: "", ajustes: {} }],
    capacitaciones: [],
    evaluaciones: [],
    comunicados: [],
    documentos: [],
    flujos: FLUJOS,
    auditoria: [],
    config: {
      toleranciaMin: 10,
      presentismoPct: 8.33,
      aportesPct: 17,
      contribucionesPct: 24,
      recargoExtraPct: 50,
      diaPago: 5,
      antiguedadPct: 1,
      cotizaciones: COTIZACIONES_INICIALES,
      tasas: {},
    },
    lotes: [],
  }),
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

/** Completa campos nuevos en legajos guardados antes (país, contrato y esquema de pago). */
export function normalizarLegajo(l: Legajo): Legajo {
  const contrato = l.contratoId ? contratoDe(l.contratoId, l.pais) : contratoPorNombre(l.modalidad);
  const pais = (l.pais ?? (PAISES_CONTRATO[contrato.id] as PaisId | undefined) ?? "AR") as PaisId;
  return {
    ...l,
    pais,
    contratoId: contrato.id,
    modalidad: contrato.nombre,
    esquema: l.esquema ?? "Mensual",
    valorHora: l.valorHora ?? 0,
    comisionPct: l.comisionPct ?? 0,
  };
}
const PAISES_CONTRATO: Record<string, string> = Object.fromEntries(
  ["AR", "CO", "MX", "CL", "UY", "PE", "ES", "US"].flatMap((p) =>
    paisDe(p).contratos.map((k) => [k.id, p]),
  ),
);

/** Legajo guardado o uno básico (para integrantes dados de alta desde Equipo). */
export function legajoDe(m: TeamMember, legajos: Record<string, Legajo>): Legajo {
  const guardado = legajos[m.id];
  if (guardado) return normalizarLegajo(guardado);
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
  const d = (m.schedule ?? []).find((s) => s.day === diaSemana(fecha));
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
  pais: PaisId;
  moneda: string;
  clase: ClaseContrato;
  esquema: EsquemaPago;
  requiereFactura: boolean;
  horasTrabajadas: number;
  basico: number; // remuneración base del esquema (mensual, horas × valor, etc.)
  antiguedad: number;
  presentismo: number;
  horasExtra: number;
  bono: number;
  comisiones: number;
  descuento: number;
  bruto: number;
  aportes: number;
  retencion: number;
  adelanto: number;
  neto: number;
  contribuciones: number;
  costo: number;
  netoBase: number; // neto convertido a pesos argentinos (moneda base del tablero)
  costoBase: number;
  llegadasTarde: number;
  pierdePresentismo: boolean;
};

export const MONEDA_BASE = "ARS";
/** Convierte un monto a la moneda base usando las cotizaciones configuradas. */
export function aMonedaBase(monto: number, moneda: string, config: ConfigRRHH) {
  const cot = config.cotizaciones ?? COTIZACIONES_INICIALES;
  if (moneda === MONEDA_BASE) return monto;
  const porUsd = cot[moneda] ?? COTIZACIONES_INICIALES[moneda] ?? 1;
  const base = cot[MONEDA_BASE] ?? COTIZACIONES_INICIALES[MONEDA_BASE] ?? 1;
  return (monto / porUsd) * base;
}

/** Tasas del contrato: las configuradas por la clínica o las de referencia del país. */
export function tasasDe(contrato: ContratoDef, config: ConfigRRHH) {
  const propia = config.tasas?.[contrato.id];
  if (propia) return propia;
  if (contrato.id === "ar-dep" || contrato.id === "ar-plazo" || contrato.id === "ar-eventual")
    return {
      aportesPct: config.aportesPct,
      patronalPct: config.contribucionesPct,
      retencionPct: 0,
    };
  return {
    aportesPct: contrato.aportesPct,
    patronalPct: contrato.patronalPct,
    retencionPct: contrato.retencionPct,
  };
}

/** Recibo del período según país, tipo de contrato y esquema de pago:
    base (mensual / horas × valor hora / comisión / mixto) + adicionales de convenio (Argentina)
    + horas extra + bono − descuento = bruto; − aportes − retención − adelanto = neto. */
export function calcularRecibo(
  m: TeamMember,
  lOriginal: Legajo,
  periodo: Periodo,
  config: ConfigRRHH,
  todasLasMarcas: Marca[],
  ausencias: Ausencia[],
): Recibo {
  const l = normalizarLegajo(lOriginal);
  const pais = paisDe(l.pais);
  const contrato = contratoDe(l.contratoId, l.pais);
  const tasas = tasasDe(contrato, config);
  const aj = periodo.ajustes[m.id] ?? { horasExtra: 0, bono: 0, adelanto: 0 };
  const deps = contrato.clase === "dependencia";
  const delMes = todasLasMarcas.filter(
    (f) => f.miembroId === m.id && f.fecha.startsWith(periodo.periodo),
  );
  const horasFichadas = Math.round(delMes.reduce((a, f) => a + f.horas, 0) * 10) / 10;
  const horasTrabajadas = aj.horas ?? horasFichadas;
  const llegadasTarde = delMes.filter((f) => f.tarde > 0).length;
  const injustificadas = ausencias.filter(
    (a) =>
      a.miembroId === m.id && a.tipo === "Trámite personal" && a.desde.startsWith(periodo.periodo),
  ).length;
  const conAdicionales = deps && pais.adicionalesAR;
  const pierdePresentismo = conAdicionales && (llegadasTarde >= 3 || injustificadas > 1);
  const produccion = aj.produccion ?? 0;
  const porHora = l.esquema === "Por hora";
  const basico =
    l.esquema === "Por hora"
      ? Math.round(horasTrabajadas * l.valorHora)
      : l.esquema === "Por comisión"
        ? 0
        : l.basico;
  const comisiones =
    l.esquema === "Por comisión" || l.esquema === "Mixto"
      ? Math.round((produccion * l.comisionPct) / 100)
      : 0;
  const antig =
    conAdicionales && !porHora
      ? Math.round((basico * config.antiguedadPct * antiguedad(l.ingreso)) / 100)
      : 0;
  const presentismo =
    conAdicionales && !pierdePresentismo && !porHora
      ? Math.round(((basico + antig) * config.presentismoPct) / 100)
      : 0;
  const valorHora = porHora ? l.valorHora : l.basico / Math.max(1, l.jornada * 4.33);
  const horasExtra = Math.round(
    aj.horasExtra * valorHora * (1 + (deps ? config.recargoExtraPct : 0) / 100),
  );
  const descuento = aj.descuento ?? 0;
  const bruto = Math.max(
    0,
    basico + antig + presentismo + horasExtra + aj.bono + comisiones - descuento,
  );
  const aportes = Math.round((bruto * tasas.aportesPct) / 100);
  const retencion = Math.round((bruto * tasas.retencionPct) / 100);
  const contribuciones = Math.round((bruto * tasas.patronalPct) / 100);
  const neto = bruto - aportes - retencion - aj.adelanto;
  const costo = bruto + contribuciones;
  return {
    miembroId: m.id,
    periodo: periodo.periodo,
    modalidad: contrato.nombre,
    pais: pais.id,
    moneda: pais.moneda,
    clase: contrato.clase,
    esquema: l.esquema,
    requiereFactura: contrato.requiereFactura,
    horasTrabajadas,
    basico,
    antiguedad: antig,
    presentismo,
    horasExtra,
    bono: aj.bono,
    comisiones,
    descuento,
    bruto,
    aportes,
    retencion,
    adelanto: aj.adelanto,
    neto,
    contribuciones,
    costo,
    netoBase: aMonedaBase(neto, pais.moneda, config),
    costoBase: aMonedaBase(costo, pais.moneda, config),
    llegadasTarde,
    pierdePresentismo,
  };
}

export function montoRecibo(r: Pick<Recibo, "neto" | "moneda">) {
  return formatoMoneda(r.neto, r.moneda);
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
  return `$\u00a0${Math.round(n).toLocaleString("es-AR")}`;
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
    const neto = recibos.reduce((a, x) => a + x.netoBase, 0);
    const costo = recibos.reduce((a, x) => a + x.costoBase, 0);
    const top = [...recibos].sort((a, b) => b.costoBase - a.costoBase)[0];
    const sinPres = recibos.filter((x) => x.pierdePresentismo);
    return [
      `Período ${nombrePeriodo(periodo.periodo)} (${periodo.estado.toLowerCase()}):`,
      `• Neto a pagar: ${ars(neto)}`,
      `• Costo laboral total (con contribuciones): ${ars(costo)}`,
      top
        ? `• Mayor costo: ${nombre(top.miembroId)} con ${formatoMoneda(top.costo, top.moneda)}`
        : "",
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
        ? `• Neto estimado del mes: ${formatoMoneda(rec.neto, rec.moneda)}${rec.pierdePresentismo ? " (pierde presentismo)" : ""}`
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
    `Costo laboral estimado del mes: ${ars(recibos.reduce((a, x) => a + x.costoBase, 0))}.`,
    "Podés preguntarme por una persona del equipo (por su nombre), vencimientos, llegadas tarde, vacaciones o costos.",
  ].join("\n");
}