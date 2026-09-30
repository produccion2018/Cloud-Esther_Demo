import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";
import { SUCURSALES } from "@/lib/cloud-esther/agenda-store";
import type { PlanId } from "@/lib/cloud-esther/data";

/* Ubicación: src/lib/cloud-esther/facturacion-store.ts

   Facturación por empresa: comprobantes electrónicos (según el país fiscal de la clínica),
   cobros, caja diaria por sucursal, liquidaciones a obras sociales y datos fiscales.
   Los cobros y notas de crédito de pacientes también se registran en su cuenta corriente.
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

/* ───────────── Datos de ejemplo ───────────── */

const [CENTRO = "Clínica Centro", NORTE = "Clínica Norte"] = SUCURSALES;

function comprobante(
  c: Partial<Comprobante> & Pick<Comprobante, "id" | "numero" | "fecha" | "cliente" | "items">,
): Comprobante {
  return {
    tipo: "Factura B",
    clase: "Factura",
    puntoVenta: 3,
    vencimiento: c.fecha,
    pacienteId: null,
    descuentoPct: 0,
    cae: codigoFijo(c.id),
    caeVto: c.fecha,
    pagos: [],
    anulada: false,
    profesional: "",
    sucursal: CENTRO,
    origen: "Manual",
    asociadaA: "",
    linkPago: "",
    ...c,
  };
}
function codigoFijo(semilla: string) {
  let h = 7;
  for (const ch of semilla) h = (h * 31 + ch.charCodeAt(0)) % 1_000_000_007;
  return `7${String(h).padStart(13, "4")}`.slice(0, 14);
}
const cf = (
  nombre: string,
  documento: string,
  email = "",
  telefono = "",
): Comprobante["cliente"] => ({
  nombre,
  documento,
  condicion: "Consumidor Final",
  email,
  telefono,
});
const pago = (
  id: string,
  dias: number,
  monto: number,
  medio: MedioPago,
  referencia = "",
): Pago => ({ id, fecha: diaISO(-dias), monto, medio, referencia, usuario: "Sofía Rodríguez" });

function comprobantesEjemplo(): Comprobante[] {
  return [
    comprobante({
      id: "c1",
      numero: 1041,
      fecha: diaISO(-40),
      vencimiento: diaISO(-25),
      pacienteId: 1,
      cliente: cf("Mauro Pinto", "95193944", "mauro.pinto@example.com", "+54 11 5555-8899"),
      items: [
        { descripcion: "Restauración estética pieza 21", cantidad: 1, precio: 60000, ivaPct: 0 },
      ],
      pagos: [pago("p1", 38, 25000, "Transferencia")],
      profesional: "Dr. Carlos Rodríguez",
      origen: "Presupuesto PR-0001",
    }),
    comprobante({
      id: "c2",
      numero: 1042,
      fecha: diaISO(-22),
      vencimiento: diaISO(-7),
      pacienteId: 3,
      cliente: cf("Julián Ortega", "28444555", "julian.ortega@example.com", "+54 11 5174-2826"),
      items: [
        { descripcion: "Implante de titanio pieza 46", cantidad: 1, precio: 650000, ivaPct: 0 },
        { descripcion: "Pilar protésico", cantidad: 1, precio: 180000, ivaPct: 0 },
      ],
      pagos: [pago("p2", 20, 415000, "Tarjeta de crédito", "Visa 6 cuotas")],
      profesional: "Martín González",
      origen: "Presupuesto PR-0003",
    }),
    comprobante({
      id: "c3",
      numero: 1043,
      fecha: diaISO(-15),
      vencimiento: diaISO(0),
      pacienteId: 2,
      cliente: cf("Marina Delgado", "30111222", "marina.delgado@example.com", "+54 11 5100-2000"),
      items: [
        { descripcion: "Limpieza y profilaxis", cantidad: 1, precio: 45000, ivaPct: 0 },
        { descripcion: "Aplicación de flúor", cantidad: 1, precio: 18000, ivaPct: 0 },
      ],
      pagos: [pago("p3", 15, 63000, "Efectivo")],
      profesional: "Jesús Méndez",
    }),
    comprobante({
      id: "c4",
      numero: 1044,
      fecha: diaISO(-9),
      vencimiento: diaISO(6),
      pacienteId: 9,
      cliente: cf("Diego Ruiz", "27999888", "diego.ruiz@example.com", "+54 11 5359-4478"),
      items: [
        { descripcion: "Raspaje y alisado por cuadrante", cantidad: 4, precio: 60000, ivaPct: 0 },
      ],
      pagos: [pago("p4", 9, 80000, "Mercado Pago", "Cuota 1/3")],
      profesional: "Jesús Méndez",
      origen: "Presupuesto PR-0010",
    }),
    comprobante({
      id: "c5",
      numero: 1045,
      fecha: diaISO(-6),
      vencimiento: diaISO(9),
      pacienteId: 6,
      cliente: cf("Paula Medina", "33222111", "paula.medina@example.com", "+54 11 5248-3239"),
      items: [
        {
          descripcion: "Kit de blanqueamiento domiciliario",
          cantidad: 1,
          precio: 38000,
          ivaPct: 21,
        },
        { descripcion: "Blanqueamiento en consultorio", cantidad: 1, precio: 90000, ivaPct: 0 },
      ],
      profesional: "Jesús Méndez",
    }),
    comprobante({
      id: "c6",
      numero: 1046,
      fecha: diaISO(-3),
      vencimiento: diaISO(12),
      pacienteId: 8,
      cliente: cf("Ana Torres", "40123456", "ana.torres@example.com", "+54 11 5322-4652"),
      items: [
        {
          descripcion: "Endodoncia multirradicular pieza 26",
          cantidad: 1,
          precio: 180000,
          ivaPct: 0,
        },
      ],
      pagos: [pago("p5", 3, 180000, "Transferencia")],
      profesional: "Jesús Méndez",
      sucursal: NORTE,
      origen: "Presupuesto PR-0009",
    }),
    comprobante({
      id: "c7",
      numero: 1047,
      fecha: diaISO(-1),
      vencimiento: diaISO(14),
      cliente: {
        nombre: "Laboratorio Dental Sur SRL",
        documento: "30-71234567-9",
        condicion: "Responsable Inscripto",
        email: "admin@labsur.com.ar",
        telefono: "",
      },
      tipo: "Factura A",
      items: [
        {
          descripcion: "Alquiler de consultorio (septiembre)",
          cantidad: 1,
          precio: 250000,
          ivaPct: 21,
        },
      ],
      profesional: "",
    }),
    comprobante({
      id: "c8",
      numero: 1048,
      fecha: diaISO(-2),
      vencimiento: diaISO(-2),
      pacienteId: 12,
      cliente: cf("Florencia Díaz", "38444333"),
      items: [{ descripcion: "Consulta y diagnóstico", cantidad: 1, precio: 25000, ivaPct: 0 }],
      anulada: true,
      profesional: "Laura Martínez",
    }),
    comprobante({
      id: "c9",
      numero: 21,
      clase: "Nota de crédito",
      tipo: "Nota de crédito B",
      fecha: diaISO(-2),
      vencimiento: diaISO(-2),
      pacienteId: 12,
      cliente: cf("Florencia Díaz", "38444333"),
      items: [
        {
          descripcion: "Anula factura 0003-00001048 (cargada por error)",
          cantidad: 1,
          precio: 25000,
          ivaPct: 0,
        },
      ],
      asociadaA: "c8",
      profesional: "Laura Martínez",
    }),
  ];
}

function liquidacionesEjemplo(): LiquidacionOS[] {
  const periodo = (n: number) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const pr = (
    pacienteId: number,
    paciente: string,
    dias: number,
    codigo: string,
    descripcion: string,
    importe: number,
    debitado = false,
    motivoDebito = "",
  ): Prestacion => ({
    pacienteId,
    paciente,
    fecha: diaISO(-dias),
    codigo,
    descripcion,
    importe,
    debitado,
    motivoDebito,
  });
  return [
    {
      id: "l1",
      obraSocial: "OSDE",
      periodo: periodo(1),
      estado: "Pagada",
      presentada: diaISO(-28),
      cobrada: diaISO(-4),
      prestaciones: [
        pr(1, "Mauro Pinto", 45, "01.01", "Consulta", 18000),
        pr(3, "Julián Ortega", 40, "05.02", "Limpieza", 32000),
        pr(8, "Ana Torres", 36, "03.01", "Obturación", 41000),
      ],
    },
    {
      id: "l2",
      obraSocial: "Swiss Medical",
      periodo: periodo(1),
      estado: "Con débitos",
      presentada: diaISO(-27),
      cobrada: diaISO(-2),
      prestaciones: [
        pr(2, "Marina Delgado", 44, "01.01", "Consulta", 17500),
        pr(
          10,
          "Valeria Gómez",
          38,
          "08.04",
          "Radiografía panorámica",
          26000,
          true,
          "Falta orden médica",
        ),
      ],
    },
    {
      id: "l3",
      obraSocial: "OSDE",
      periodo: periodo(0),
      estado: "Borrador",
      presentada: "",
      cobrada: "",
      prestaciones: [
        pr(1, "Mauro Pinto", 12, "01.01", "Consulta", 18000),
        pr(3, "Julián Ortega", 8, "05.02", "Limpieza", 32000),
        pr(8, "Ana Torres", 3, "04.01", "Endodoncia", 95000),
      ],
    },
    {
      id: "l4",
      obraSocial: "Galeno",
      periodo: periodo(0),
      estado: "Presentada",
      presentada: diaISO(-1),
      cobrada: "",
      prestaciones: [
        pr(4, "Lucía Paz", 14, "01.01", "Consulta", 16000),
        pr(12, "Florencia Díaz", 6, "05.02", "Limpieza", 30000),
      ],
    },
  ];
}

export const storeFacturacion = crearStorePorEmpresa<EstadoFacturacion>(
  () => ({
    comprobantes: comprobantesEjemplo(),
    liquidaciones: liquidacionesEjemplo(),
    sesiones: [
      {
        id: "s1",
        sucursal: CENTRO,
        abierta: new Date(new Date().setHours(8, 0, 0, 0)).toISOString(),
        inicial: 50000,
        cerrada: "",
        contado: 0,
        usuario: "Sofía Rodríguez",
      },
    ],
    movimientos: [
      {
        id: "m1",
        sesionId: "s1",
        fecha: new Date(new Date().setHours(9, 40, 0, 0)).toISOString(),
        tipo: "Ingreso",
        concepto: "Consulta · Sergio Luna",
        medio: "Efectivo",
        monto: 25000,
        comprobanteId: "",
      },
      {
        id: "m2",
        sesionId: "s1",
        fecha: new Date(new Date().setHours(10, 15, 0, 0)).toISOString(),
        tipo: "Egreso",
        concepto: "Compra de insumos de limpieza",
        medio: "Efectivo",
        monto: 8500,
        comprobanteId: "",
      },
    ],
    cargosFacturados: ["1:1"],
    historico: [
      { mes: mesISO(5), facturado: 1420000, cobrado: 1290000 },
      { mes: mesISO(4), facturado: 1585000, cobrado: 1460000 },
      { mes: mesISO(3), facturado: 1370000, cobrado: 1405000 },
      { mes: mesISO(2), facturado: 1710000, cobrado: 1530000 },
      { mes: mesISO(1), facturado: 1640000, cobrado: 1580000 },
    ],
    suscripcion: suscripcionEjemplo(),
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
