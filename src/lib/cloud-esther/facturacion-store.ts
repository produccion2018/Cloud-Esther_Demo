import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";
import type { PlanId } from "@/lib/cloud-esther/data";

/* Ubicación: src/lib/cloud-esther/facturacion-store.ts

   Facturación por empresa: comprobantes electrónicos (según el país fiscal de la clínica),
   cobros, caja diaria por sucursal, liquidaciones a obras sociales y datos fiscales.
   Los cobros y notas de crédito de pacientes también se registran en su cuenta corriente.
   Arranca vacío, igual que producción: lo carga cada clínica.
   TODO backend: integración real con el ente fiscal (ARCA/AFIP, DIAN, SAT, SII, DGI, SUNAT,
   Verifactu) y con Mercado Pago / pasarelas de pago. */

/* ───────────── Países fiscales ───────────── */

export type PaisFiscalId = "AR" | "CO" | "MX" | "CL" | "UY" | "PE" | "ES" | "US";
export type PaisFiscal = {
  id: PaisFiscalId;
  nombre: string;
  bandera: string;
  moneda: string;
  ente: string;
  idFiscal: string; // CUIT, NIT, RFC, RUT…
  codigoAutorizacion: string; // CAE, CUFE, UUID…
  comprobantes: string[];
  tasas: number[]; // alícuotas de IVA/IGV disponibles
  tasaSalud: number; // prestaciones de salud (en general exentas)
};

export const PAISES_FISCALES: PaisFiscal[] = [
  {
    id: "AR",
    nombre: "Argentina",
    bandera: "🇦🇷",
    moneda: "ARS",
    ente: "ARCA (ex AFIP)",
    idFiscal: "CUIT",
    codigoAutorizacion: "CAE",
    comprobantes: ["Factura A", "Factura B", "Factura C", "Recibo X"],
    tasas: [0, 10.5, 21],
    tasaSalud: 0,
  },
  {
    id: "CO",
    nombre: "Colombia",
    bandera: "🇨🇴",
    moneda: "COP",
    ente: "DIAN",
    idFiscal: "NIT",
    codigoAutorizacion: "CUFE",
    comprobantes: ["Factura electrónica de venta", "Documento soporte"],
    tasas: [0, 5, 19],
    tasaSalud: 0,
  },
  {
    id: "MX",
    nombre: "México",
    bandera: "🇲🇽",
    moneda: "MXN",
    ente: "SAT (CFDI 4.0)",
    idFiscal: "RFC",
    codigoAutorizacion: "UUID",
    comprobantes: ["CFDI de ingreso", "Recibo de honorarios"],
    tasas: [0, 16],
    tasaSalud: 0,
  },
  {
    id: "CL",
    nombre: "Chile",
    bandera: "🇨🇱",
    moneda: "CLP",
    ente: "SII",
    idFiscal: "RUT",
    codigoAutorizacion: "Folio SII",
    comprobantes: ["Boleta electrónica", "Factura electrónica", "Boleta exenta"],
    tasas: [0, 19],
    tasaSalud: 0,
  },
  {
    id: "UY",
    nombre: "Uruguay",
    bandera: "🇺🇾",
    moneda: "UYU",
    ente: "DGI (CFE)",
    idFiscal: "RUT",
    codigoAutorizacion: "CAE DGI",
    comprobantes: ["e-Ticket", "e-Factura"],
    tasas: [0, 10, 22],
    tasaSalud: 10,
  },
  {
    id: "PE",
    nombre: "Perú",
    bandera: "🇵🇪",
    moneda: "PEN",
    ente: "SUNAT",
    idFiscal: "RUC",
    codigoAutorizacion: "CDR SUNAT",
    comprobantes: ["Boleta de venta electrónica", "Factura electrónica"],
    tasas: [0, 18],
    tasaSalud: 18,
  },
  {
    id: "ES",
    nombre: "España",
    bandera: "🇪🇸",
    moneda: "EUR",
    ente: "AEAT (Verifactu)",
    idFiscal: "NIF",
    codigoAutorizacion: "Huella Verifactu",
    comprobantes: ["Factura", "Factura simplificada"],
    tasas: [0, 10, 21],
    tasaSalud: 0,
  },
  {
    id: "US",
    nombre: "Estados Unidos",
    bandera: "🇺🇸",
    moneda: "USD",
    ente: "Sin ente (invoice)",
    idFiscal: "EIN",
    codigoAutorizacion: "Invoice ID",
    comprobantes: ["Invoice", "Receipt"],
    tasas: [0],
    tasaSalud: 0,
  },
];
export function paisFiscal(id: string | undefined): PaisFiscal {
  return PAISES_FISCALES.find((p) => p.id === id) ?? PAISES_FISCALES[0]!;
}

/* ───────────── Tipos ───────────── */

export const CONDICIONES_IVA = [
  "Consumidor Final",
  "Responsable Inscripto",
  "Monotributista",
  "Exento",
] as const;
export type CondicionIva = (typeof CONDICIONES_IVA)[number];
export const MEDIOS_PAGO = [
  "Efectivo",
  "Transferencia",
  "Tarjeta de débito",
  "Tarjeta de crédito",
  "Mercado Pago",
  "Obra social",
] as const;
export type MedioPago = (typeof MEDIOS_PAGO)[number];

export type ItemFactura = { descripcion: string; cantidad: number; precio: number; ivaPct: number };
export type Pago = {
  id: string;
  fecha: string;
  monto: number;
  medio: MedioPago;
  referencia: string;
  usuario: string;
};
export type EstadoComprobante = "Emitida" | "Parcial" | "Pagada" | "Vencida" | "Anulada";

export type Comprobante = {
  id: string;
  tipo: string;
  clase: "Factura" | "Nota de crédito" | "Recibo";
  puntoVenta: number;
  numero: number;
  fecha: string;
  vencimiento: string;
  pacienteId: number | null;
  cliente: {
    nombre: string;
    documento: string;
    condicion: CondicionIva;
    email: string;
    telefono: string;
  };
  items: ItemFactura[];
  descuentoPct: number;
  cae: string;
  caeVto: string;
  pagos: Pago[];
  anulada: boolean;
  profesional: string;
  sucursal: string;
  origen: string; // "Manual", "Presupuesto PR-0011", "Obra social OSDE"…
  asociadaA: string; // id del comprobante que anula (notas de crédito)
  linkPago: string;
};

export type Prestacion = {
  pacienteId: number;
  paciente: string;
  fecha: string;
  codigo: string;
  descripcion: string;
  importe: number;
  debitado: boolean;
  motivoDebito: string;
};
export type EstadoLiquidacion = "Borrador" | "Presentada" | "Pagada" | "Con débitos";
export type LiquidacionOS = {
  id: string;
  obraSocial: string;
  periodo: string; // yyyy-mm
  estado: EstadoLiquidacion;
  presentada: string;
  cobrada: string;
  prestaciones: Prestacion[];
};

export type SesionCaja = {
  id: string;
  sucursal: string;
  abierta: string;
  inicial: number;
  cerrada: string;
  contado: number;
  usuario: string;
};
export type MovimientoCaja = {
  id: string;
  sesionId: string;
  fecha: string;
  tipo: "Ingreso" | "Egreso";
  concepto: string;
  medio: MedioPago;
  monto: number;
  comprobanteId: string;
};

export type ConfigFiscal = {
  pais: PaisFiscalId;
  razonSocial: string;
  idFiscal: string;
  condicion: CondicionIva;
  puntoVenta: number;
  domicilio: string;
  inicioActividades: string;
  conectado: boolean;
  vencimientoDias: number;
  leyenda: string;
};

export type EstadoFacturacion = {
  comprobantes: Comprobante[];
  liquidaciones: LiquidacionOS[];
  sesiones: SesionCaja[];
  movimientos: MovimientoCaja[];
  cargosFacturados: string[]; // `${pacienteId}:${movimientoId}` de la cuenta corriente
  config: ConfigFiscal;
  /** Totales mensuales importados del sistema anterior (solo para reportes). */
  historico?: { mes: string; facturado: number; cobrado: number }[];
  /** Suscripción de la clínica a Cloud Esther (lo que la clínica le paga a Cloud Esther). */
  suscripcion?: Suscripcion;
};

/* ───────────── Suscripción a Cloud Esther ───────────── */

export type CicloPlan = "Mensual" | "Anual";
export type MedioSuscripcion = "Tarjeta" | "Mercado Pago" | "Transferencia";
export type FacturaSuscripcion = {
  id: string;
  numero: string;
  periodo: string; // AAAA-MM
  fecha: string;
  vence: string;
  planId: PlanId;
  ciclo: CicloPlan;
  estado: "Pagada" | "Pendiente";
  pagada?: string;
  medio?: string;
};
export type Suscripcion = {
  ciclo: CicloPlan;
  medio: { tipo: MedioSuscripcion; detalle: string } | null;
  debitoAutomatico: boolean;
  facturas: FacturaSuscripcion[];
};

/** Ya no se usa para arrancar el demo (queda exportada por si otra pantalla la importa). */
export function suscripcionEjemplo(): Suscripcion {
  const dia = (d: Date) => d.toISOString().slice(0, 10);
  const facturas: FacturaSuscripcion[] = [4, 3, 2, 1, 0].map((n, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - n);
    const vence = new Date(d);
    vence.setDate(10);
    return {
      id: `fs${i + 1}`,
      numero: `CE-0001-${String(4180 + i * 37).padStart(8, "0")}`,
      periodo: mesISO(n),
      fecha: dia(d),
      vence: dia(vence),
      planId: "avanzada",
      ciclo: "Mensual",
      estado: "Pagada",
      pagada: dia(new Date(vence.getTime() - 3 * 86_400_000)),
      medio: "Visa •••• 4242",
    };
  });
  // Factura del próximo período, emitida hoy y a pagar en 5 días.
  const hoy = new Date();
  facturas.push({
    id: "fs6",
    numero: `CE-0001-${String(4180 + 5 * 37).padStart(8, "0")}`,
    periodo: mesISO(-1),
    fecha: dia(hoy),
    vence: dia(new Date(hoy.getTime() + 5 * 86_400_000)),
    planId: "avanzada",
    ciclo: "Mensual",
    estado: "Pendiente",
  });
  return {
    ciclo: "Mensual",
    medio: { tipo: "Tarjeta", detalle: "Visa •••• 4242" },
    debitoAutomatico: false,
    facturas,
  };
}

/** "AAAA-MM" de hace `n` meses. */
export function mesISO(n = 0) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/* ───────────── Utilidades ───────────── */

export function diaISO(n = 0) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function totalesComprobante(c: Pick<Comprobante, "items" | "descuentoPct">) {
  const bruto = c.items.reduce((a, i) => a + i.cantidad * i.precio, 0);
  const factor = 1 - (c.descuentoPct ?? 0) / 100;
  const neto = Math.round(bruto * factor);
  const iva = Math.round(
    c.items.reduce((a, i) => a + i.cantidad * i.precio * factor * (i.ivaPct / 100), 0),
  );
  return { bruto, descuento: bruto - neto, neto, iva, total: neto + iva };
}
export function pagado(c: Comprobante) {
  return c.pagos.reduce((a, p) => a + p.monto, 0);
}
export function saldo(c: Comprobante) {
  if (c.anulada || c.clase !== "Factura") return 0;
  return Math.max(0, totalesComprobante(c).total - pagado(c));
}
export function estadoComprobante(c: Comprobante): EstadoComprobante {
  if (c.anulada) return "Anulada";
  if (c.clase !== "Factura") return "Pagada";
  const s = saldo(c);
  if (s <= 0) return "Pagada";
  if (c.vencimiento && c.vencimiento < diaISO()) return "Vencida";
  return pagado(c) > 0 ? "Parcial" : "Emitida";
}
export function numeroComprobante(c: Pick<Comprobante, "puntoVenta" | "numero">) {
  return `${String(c.puntoVenta).padStart(4, "0")}-${String(c.numero).padStart(8, "0")}`;
}
/** Código de autorización simulado (CAE de 14 dígitos, CUFE/UUID alfanumérico, etc.). */
export function codigoAutorizacion(pais: PaisFiscalId) {
  const r = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");
  const hex = (n: number) =>
    Array.from({ length: n }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
  if (pais === "AR" || pais === "UY") return r(14);
  if (pais === "MX") return `${hex(8)}-${hex(4)}-${hex(4)}-${hex(4)}-${hex(12)}`.toUpperCase();
  if (pais === "CO") return hex(40);
  if (pais === "CL") return r(8);
  return `${pais}-${r(10)}`;
}
/** Tipo de comprobante que corresponde en Argentina según emisor y receptor. */
export function tipoSugerido(config: ConfigFiscal, receptor: CondicionIva) {
  const p = paisFiscal(config.pais);
  if (p.id !== "AR") return p.comprobantes[0]!;
  if (config.condicion === "Monotributista" || config.condicion === "Exento") return "Factura C";
  return receptor === "Responsable Inscripto" ? "Factura A" : "Factura B";
}

/* ───────────── Estado inicial ───────────── */

/* Sin comprobantes, liquidaciones, caja, histórico ni facturas de suscripción de ejemplo:
   el cliente carga lo suyo. La configuración fiscal queda con sus valores de siempre. */
export const storeFacturacion = crearStorePorEmpresa<EstadoFacturacion>(
  () => ({
    comprobantes: [],
    liquidaciones: [],
    sesiones: [],
    movimientos: [],
    cargosFacturados: [],
    historico: [],
    suscripcion: {
      ciclo: "Mensual",
      medio: null,
      debitoAutomatico: false,
      facturas: [],
    },
    config: {
      pais: "AR",
      razonSocial: "Clínica Dental Esther S.A.",
      idFiscal: "30-71555444-2",
      condicion: "Responsable Inscripto",
      puntoVenta: 3,
      domicilio: "Av. Santa Fe 1234, CABA",
      inicioActividades: "2018-03-01",
      conectado: true,
      vencimientoDias: 15,
      leyenda: "Prestaciones de salud exentas de IVA (Ley 23.349, art. 7).",
    },
  }),
  { persistir: "facturacion" },
);

export function setFacturacion<K extends keyof EstadoFacturacion>(
  clave: K,
  fn: (prev: EstadoFacturacion[K]) => EstadoFacturacion[K],
) {
  const actual = storeFacturacion.leer();
  storeFacturacion.poner({ ...actual, [clave]: fn(actual[clave]) });
}

export function siguienteNumero(
  comprobantes: Comprobante[],
  clase: Comprobante["clase"],
  puntoVenta: number,
) {
  return (
    comprobantes
      .filter((c) => c.clase === clase && c.puntoVenta === puntoVenta)
      .reduce((a, c) => Math.max(a, c.numero), 0) + 1
  );
}