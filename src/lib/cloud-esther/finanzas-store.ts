import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";

/* Ubicación: src/lib/cloud-esther/finanzas-store.ts
   Finanzas de la clínica: cuentas (bancos, billeteras y efectivo), movimientos manuales,
   cuentas a pagar a proveedores, gastos fijos, presupuesto mensual, comisiones de profesionales
   y conciliación bancaria. Los cobros de Facturación, la nómina de RRHH y las compras de
   Inventario se leen de sus propios módulos (no se copian). Cada empresa tiene su copia.
   Arranca vacío: cada clínica carga su propia información.
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

/* ───────────── Estado inicial (vacío) ───────────── */

const GENERAL = "General";

export const storeFinanzas = crearStorePorEmpresa<EstadoFinanzas>(
  () => ({
    // Se mantienen las 3 cuentas base (mismos ids que usan otros módulos), sin datos ni saldos.
    cuentas: [
      {
        id: "banco",
        nombre: "Cuenta bancaria",
        tipo: "Banco",
        detalle: "",
        saldoInicial: 0,
      },
      {
        id: "mp",
        nombre: "Mercado Pago",
        tipo: "Billetera",
        detalle: "",
        saldoInicial: 0,
      },
      {
        id: "efectivo",
        nombre: "Caja (efectivo)",
        tipo: "Efectivo",
        detalle: "",
        saldoInicial: 0,
      },
    ],
    movimientos: [],
    cuentasPagar: [],
    gastosFijos: [],
    generados: [],
    presupuesto: {},
    comisiones: {},
    comisionPorDefecto: 35,
    liquidaciones: [],
    extracto: [],
    conciliados: [],
    ordenesRegistradas: [],
    laboratorioRegistrado: [],
    historico: [],
    umbralSaldo: 0,
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