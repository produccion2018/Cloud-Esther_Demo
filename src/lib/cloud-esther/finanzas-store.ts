import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";

/* Ubicación: src/lib/cloud-esther/finanzas-store.ts
   Finanzas de la clínica: cuentas (bancos, billeteras y efectivo), movimientos manuales,
   cuentas a pagar a proveedores, gastos fijos, presupuesto mensual, comisiones de profesionales
   y conciliación bancaria. Los cobros de Facturación, la nómina de RRHH y las compras de
   Inventario se leen de sus propios módulos (no se copian). Cada empresa tiene su copia.
   TODO backend: /finanzas/* con los mismos tipos. */

export const CATEGORIAS_INGRESO = [
  "Prestaciones",
  "Obras sociales",
  "Venta de productos",
  "Alquiler de consultorio",
  "Otros ingresos",
] as const;

export const CATEGORIAS_EGRESO = [
  "Insumos",
  "Laboratorio",
  "Honorarios profesionales",
  "Sueldos y cargas sociales",
  "Alquiler",
  "Servicios (luz, agua, internet)",
  "Software y suscripciones",
  "Marketing",
  "Mantenimiento y limpieza",
  "Seguros",
  "Honorarios contables y legales",
  "Impuestos y tasas",
  "Gastos bancarios",
  "Otros gastos",
] as const;

export type CategoriaIngreso = (typeof CATEGORIAS_INGRESO)[number];
export type CategoriaEgreso = (typeof CATEGORIAS_EGRESO)[number];
export type Categoria = CategoriaIngreso | CategoriaEgreso;
export type TipoMov = "Ingreso" | "Egreso";

/** Costos directos de la atención (van antes del margen bruto en el estado de resultados). */
export const COSTOS_DIRECTOS: CategoriaEgreso[] = [
  "Insumos",
  "Laboratorio",
  "Honorarios profesionales",
];

export type TipoCuenta = "Banco" | "Billetera" | "Efectivo";
export type CuentaFin = {
  id: string;
  nombre: string;
  tipo: TipoCuenta;
  detalle: string; // CBU, alias o ubicación
  saldoInicial: number;
};

export type OrigenMov = "Manual" | "Proveedores" | "Comisiones" | "Transferencia";
export type MovFin = {
  id: string;
  fecha: string;
  tipo: TipoMov;
  categoria: Categoria;
  concepto: string;
  monto: number;
  cuentaId: string;
  sucursal: string;
  origen: OrigenMov;
  comprobante: string;
  ref?: string;
};

export type OrigenPago = "Manual" | "Orden de compra" | "Gasto fijo" | "Laboratorio";
export type CuentaPagar = {
  id: string;
  proveedor: string;
  numero: string;
  concepto: string;
  categoria: CategoriaEgreso;
  sucursal: string;
  emision: string;
  vence: string;
  monto: number;
  estado: "Pendiente" | "Pagada";
  pagada: string;
  movId: string;
  origen: OrigenPago;
  ref: string;
};

export type GastoFijo = {
  id: string;
  concepto: string;
  proveedor: string;
  categoria: CategoriaEgreso;
  monto: number;
  dia: number;
  sucursal: string;
  activo: boolean;
};

export type LineaExtracto = {
  id: string;
  cuentaId: string;
  fecha: string;
  descripcion: string;
  monto: number; // positivo: crédito, negativo: débito
};

export type LiquidacionComision = {
  id: string;
  profesional: string;
  periodo: string;
  facturado: number;
  pct: number;
  monto: number;
  fecha: string;
  movId: string;
};

export type EstadoFinanzas = {
  cuentas: CuentaFin[];
  movimientos: MovFin[];
  cuentasPagar: CuentaPagar[];
  gastosFijos: GastoFijo[];
  generados: string[]; // `${gastoFijoId}:${aaaa-mm}`
  presupuesto: Partial<Record<CategoriaEgreso, number>>;
  comisiones: Record<string, number>; // profesional → %
  comisionPorDefecto: number;
  liquidaciones: LiquidacionComision[];
  extracto: LineaExtracto[];
  conciliados: string[]; // ids de asientos conciliados con el banco
  ordenesRegistradas: string[]; // órdenes de compra de Inventario ya cargadas como deuda
  laboratorioRegistrado: string[]; // `${pacienteId}:${trabajoId}`
  historico: { mes: string; ingresos: number; egresos: number }[];
  umbralSaldo: number;
};

/* ───────────── Fechas ───────────── */

export function diaISO(n = 0) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
export function mesISO(n = 0) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
/** Día `dia` del mes de hace `n` meses (ajustado al último día del mes). */
export function diaDelMes(n: number, dia: number) {
  const [a = "2026", m = "1"] = mesISO(n).split("-");
  const ultimo = new Date(Number(a), Number(m), 0).getDate();
  return `${a}-${m}-${String(Math.min(dia, ultimo)).padStart(2, "0")}`;
}
export function nombreMes(mes: string, largo = false) {
  const [a = "2026", m = "1"] = mes.split("-");
  const t = new Date(Number(a), Number(m) - 1, 1).toLocaleDateString("es-AR", {
    month: largo ? "long" : "short",
    ...(largo ? { year: "numeric" } : {}),
  });
  return t.charAt(0).toUpperCase() + t.slice(1).replace(".", "");
}

/* ───────────── Datos de ejemplo ───────────── */

const CENTRO = "Clínica Centro";
const NORTE = "Clínica Norte";
const SUR = "Clínica Sur";
const GENERAL = "General";

function movimientosEjemplo(): MovFin[] {
  const hoy = diaISO();
  const out: MovFin[] = [];
  let n = 0;
  const add = (
    mesAtras: number,
    dia: number,
    tipo: TipoMov,
    categoria: Categoria,
    concepto: string,
    monto: number,
    cuentaId: string,
    sucursal: string,
    comprobante = "",
  ) => {
    const fecha = diaDelMes(mesAtras, dia);
    if (fecha > hoy) return;
    out.push({
      id: `mf${++n}`,
      fecha,
      tipo,
      categoria,
      concepto,
      monto,
      cuentaId,
      sucursal,
      origen: "Manual",
      comprobante,
    });
  };
  for (const m of [1, 0]) {
    const k = m === 1 ? 0.96 : 1;
    // Acreditaciones semanales de cobros con tarjeta y depósitos de efectivo de las sedes.
    for (const [dia, suc, monto] of [
      [4, CENTRO, 3_150_000],
      [11, CENTRO, 3_420_000],
      [18, CENTRO, 3_080_000],
      [25, CENTRO, 3_560_000],
      [5, NORTE, 1_940_000],
      [12, NORTE, 2_110_000],
      [19, NORTE, 1_870_000],
      [26, NORTE, 2_240_000],
      [6, SUR, 1_180_000],
      [20, SUR, 1_260_000],
    ] as const)
      add(
        m,
        dia,
        "Ingreso",
        "Prestaciones",
        `Acreditación de cobros con tarjeta · ${suc}`,
        Math.round(monto * k),
        "banco",
        suc,
      );
    add(
      m,
      14,
      "Ingreso",
      "Prestaciones",
      "Cobros por Mercado Pago (quincena)",
      Math.round(1_320_000 * k),
      "mp",
      CENTRO,
    );
    add(
      m,
      28,
      "Ingreso",
      "Prestaciones",
      "Cobros por Mercado Pago (quincena)",
      Math.round(1_410_000 * k),
      "mp",
      NORTE,
    );
    add(
      m,
      9,
      "Ingreso",
      "Venta de productos",
      "Venta de kits de higiene y cepillos",
      64_000,
      "efectivo",
      CENTRO,
    );
    add(
      m,
      1,
      "Egreso",
      "Alquiler",
      "Alquiler Clínica Centro",
      850_000,
      "banco",
      CENTRO,
      "Recibo 0001-000" + (231 + m),
    );
    add(m, 1, "Egreso", "Alquiler", "Alquiler Clínica Norte", 620_000, "banco", NORTE);
    add(m, 2, "Egreso", "Alquiler", "Alquiler Clínica Sur", 480_000, "banco", SUR);
    add(
      m,
      8,
      "Egreso",
      "Servicios (luz, agua, internet)",
      "Edenor · luz Clínica Centro",
      96_000,
      "banco",
      CENTRO,
    );
    add(
      m,
      10,
      "Egreso",
      "Servicios (luz, agua, internet)",
      "Fibertel · internet",
      38_000,
      "banco",
      GENERAL,
    );
    add(
      m,
      12,
      "Egreso",
      "Marketing",
      "Meta Ads · campaña de blanqueamiento",
      150_000,
      "mp",
      GENERAL,
    );
    add(
      m,
      15,
      "Egreso",
      "Impuestos y tasas",
      "Ingresos Brutos (anticipo)",
      Math.round(640_000 * k),
      "banco",
      GENERAL,
    );
    add(m, 16, "Egreso", "Software y suscripciones", "Google Workspace", 42_000, "banco", GENERAL);
    add(
      m,
      22,
      "Egreso",
      "Insumos",
      "Compra en Dental Medrano",
      Math.round(310_000 * k),
      "banco",
      CENTRO,
      "A-0004-0001" + (2300 + m),
    );
    add(
      m,
      24,
      "Egreso",
      "Laboratorio",
      "Laboratorio Prótesis Sur · coronas",
      420_000,
      "banco",
      CENTRO,
    );
    add(
      m,
      29,
      "Egreso",
      "Gastos bancarios",
      "Comisiones y mantenimiento de cuenta",
      18_500,
      "banco",
      GENERAL,
    );
  }
  add(
    1,
    18,
    "Egreso",
    "Mantenimiento y limpieza",
    "Service del autoclave",
    75_000,
    "efectivo",
    NORTE,
  );
  add(0, 3, "Egreso", "Seguros", "Seguro de mala praxis", 45_000, "banco", GENERAL);
  add(
    0,
    5,
    "Egreso",
    "Mantenimiento y limpieza",
    "Servicio de limpieza",
    160_000,
    "banco",
    GENERAL,
  );
  out.push({
    id: "mf-cp1",
    fecha: diaISO(-20),
    tipo: "Egreso",
    categoria: "Insumos",
    concepto: "Dental Medrano · A-0004-00012288",
    monto: 132_000,
    cuentaId: "banco",
    sucursal: NORTE,
    origen: "Proveedores",
    comprobante: "A-0004-00012288",
    ref: "cp1",
  });
  return out;
}

function cuentasPagarEjemplo(): CuentaPagar[] {
  const base = {
    estado: "Pendiente" as const,
    pagada: "",
    movId: "",
    origen: "Manual" as OrigenPago,
    ref: "",
  };
  return [
    {
      ...base,
      id: "cp1",
      proveedor: "Dental Medrano",
      numero: "A-0004-00012288",
      concepto: "Resinas, adhesivos y descartables",
      categoria: "Insumos",
      sucursal: NORTE,
      emision: diaISO(-35),
      vence: diaISO(-20),
      monto: 132_000,
      estado: "Pagada",
      pagada: diaISO(-20),
      movId: "mf-cp1",
    },
    {
      ...base,
      id: "cp2",
      proveedor: "Laboratorio Prótesis Sur",
      numero: "B-0002-00004411",
      concepto: "Coronas de disilicato (3 unidades)",
      categoria: "Laboratorio",
      sucursal: CENTRO,
      emision: diaISO(-18),
      vence: diaISO(-3),
      monto: 240_000,
    },
    {
      ...base,
      id: "cp3",
      proveedor: "Dental Medrano",
      numero: "A-0004-00012401",
      concepto: "Anestésicos y agujas",
      categoria: "Insumos",
      sucursal: CENTRO,
      emision: diaISO(-10),
      vence: diaISO(5),
      monto: 185_000,
    },
    {
      ...base,
      id: "cp4",
      proveedor: "Estudio Pérez & Asociados",
      numero: "C-0001-00000877",
      concepto: "Honorarios contables del mes",
      categoria: "Honorarios contables y legales",
      sucursal: GENERAL,
      emision: diaISO(-2),
      vence: diaISO(8),
      monto: 180_000,
    },
    {
      ...base,
      id: "cp5",
      proveedor: "Edenor",
      numero: "0120-45667788",
      concepto: "Luz Clínica Norte",
      categoria: "Servicios (luz, agua, internet)",
      sucursal: NORTE,
      emision: diaISO(-1),
      vence: diaISO(12),
      monto: 74_000,
    },
  ];
}

export const storeFinanzas = crearStorePorEmpresa<EstadoFinanzas>(
  () => ({
    cuentas: [
      {
        id: "banco",
        nombre: "Banco Galicia · Cuenta corriente",
        tipo: "Banco",
        detalle: "CBU 0070 0999 2000 0012 3456 78 · alias ESTHER.CLINICA",
        saldoInicial: 8_400_000,
      },
      {
        id: "mp",
        nombre: "Mercado Pago",
        tipo: "Billetera",
        detalle: "alias esther.mp",
        saldoInicial: 620_000,
      },
      {
        id: "efectivo",
        nombre: "Caja fuerte (efectivo)",
        tipo: "Efectivo",
        detalle: "Clínica Centro · administración",
        saldoInicial: 350_000,
      },
    ],
    movimientos: movimientosEjemplo(),
    cuentasPagar: cuentasPagarEjemplo(),
    gastosFijos: [
      {
        id: "gf1",
        concepto: "Alquiler Clínica Centro",
        proveedor: "Inmobiliaria Palermo",
        categoria: "Alquiler",
        monto: 850_000,
        dia: 1,
        sucursal: CENTRO,
        activo: true,
      },
      {
        id: "gf2",
        concepto: "Alquiler Clínica Norte",
        proveedor: "Consorcio Cabildo 2100",
        categoria: "Alquiler",
        monto: 620_000,
        dia: 1,
        sucursal: NORTE,
        activo: true,
      },
      {
        id: "gf3",
        concepto: "Alquiler Clínica Sur",
        proveedor: "Raúl Benítez",
        categoria: "Alquiler",
        monto: 480_000,
        dia: 2,
        sucursal: SUR,
        activo: true,
      },
      {
        id: "gf4",
        concepto: "Internet",
        proveedor: "Fibertel",
        categoria: "Servicios (luz, agua, internet)",
        monto: 38_000,
        dia: 10,
        sucursal: GENERAL,
        activo: true,
      },
      {
        id: "gf5",
        concepto: "Servicio de limpieza",
        proveedor: "Limpiezas del Sur",
        categoria: "Mantenimiento y limpieza",
        monto: 160_000,
        dia: 5,
        sucursal: GENERAL,
        activo: true,
      },
      {
        id: "gf6",
        concepto: "Seguro de mala praxis",
        proveedor: "Seguros Rivadavia",
        categoria: "Seguros",
        monto: 45_000,
        dia: 3,
        sucursal: GENERAL,
        activo: true,
      },
      {
        id: "gf7",
        concepto: "Honorarios del contador",
        proveedor: "Estudio Pérez & Asociados",
        categoria: "Honorarios contables y legales",
        monto: 180_000,
        dia: 18,
        sucursal: GENERAL,
        activo: true,
      },
      {
        id: "gf8",
        concepto: "Recolección de residuos patogénicos",
        proveedor: "Ecohospitalaria",
        categoria: "Mantenimiento y limpieza",
        monto: 52_000,
        dia: 20,
        sucursal: GENERAL,
        activo: true,
      },
    ],
    generados: ["gf1", "gf2", "gf3", "gf4", "gf5", "gf6", "gf7"].map((g) => `${g}:${mesISO(0)}`),
    presupuesto: {
      Insumos: 650_000,
      Laboratorio: 700_000,
      "Honorarios profesionales": 1_200_000,
      "Sueldos y cargas sociales": 15_000_000,
      Alquiler: 1_950_000,
      "Servicios (luz, agua, internet)": 220_000,
      "Software y suscripciones": 60_000,
      Marketing: 140_000,
      "Mantenimiento y limpieza": 230_000,
      Seguros: 45_000,
      "Honorarios contables y legales": 180_000,
      "Impuestos y tasas": 700_000,
      "Gastos bancarios": 25_000,
      "Otros gastos": 100_000,
    },
    comisiones: {
      "Martín González": 40,
      "Jesús Méndez": 35,
      "Laura Martínez": 40,
      "Dr. Carlos Rodríguez": 30,
    },
    comisionPorDefecto: 35,
    liquidaciones: [],
    extracto: [],
    conciliados: [],
    ordenesRegistradas: [],
    laboratorioRegistrado: [],
    historico: [
      { mes: mesISO(5), ingresos: 24_300_000, egresos: 20_950_000 },
      { mes: mesISO(4), ingresos: 25_100_000, egresos: 21_400_000 },
      { mes: mesISO(3), ingresos: 23_800_000, egresos: 21_900_000 },
      { mes: mesISO(2), ingresos: 26_200_000, egresos: 22_100_000 },
    ],
    umbralSaldo: 2_000_000,
  }),
  { persistir: "finanzas" },
);

export function setFinanzas<K extends keyof EstadoFinanzas>(
  clave: K,
  fn: (prev: EstadoFinanzas[K]) => EstadoFinanzas[K],
) {
  const actual = storeFinanzas.leer();
  storeFinanzas.poner({ ...actual, [clave]: fn(actual[clave]) });
}

export const SUCURSAL_GENERAL = GENERAL;
