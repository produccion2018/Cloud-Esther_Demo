import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";
import { SUCURSALES } from "@/lib/cloud-esther/agenda-store";

/* Ubicación: src/lib/cloud-esther/inventario-store.ts

   Inventario por empresa: insumos por sucursal, movimientos (entradas, salidas, ajustes,
   transferencias y mermas), proveedores, órdenes de compra, kits de consumo por tratamiento
   y pedidos de reposición del equipo (desde el portal del equipo).
   TODO backend: tablas insumos / movimientos / proveedores / ordenes_compra por clinicId. */

export const CATEGORIAS = [
  "Protección",
  "Anestesia",
  "Operatoria",
  "Endodoncia",
  "Ortodoncia",
  "Cirugía",
  "Esterilización",
  "Higiene",
  "Descartables",
] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export const UNIDADES = ["cajas", "unidades", "kits", "frascos", "jeringas", "rollos"] as const;
export type Unidad = (typeof UNIDADES)[number];

/** Sede extra que solo aparece en el plan Grupo Odontológico (multi-sede). */
export const SUCURSAL_GRUPO = "Clínica Belgrano";
export function sucursalesDelPlan(esGrupo: boolean): string[] {
  return esGrupo ? [...SUCURSALES, SUCURSAL_GRUPO] : [...SUCURSALES];
}

export type Insumo = {
  id: string;
  codigo: string;
  nombre: string;
  categoria: Categoria;
  sucursal: string;
  proveedorId: string;
  stock: number;
  unidad: Unidad;
  minimo: number;
  ideal: number;
  costo: number; // por unidad de stock
  lote: string;
  vencimiento: string; // yyyy-mm-dd o ""
  ubicacion: string;
};

export const TIPOS_MOVIMIENTO = ["Entrada", "Salida", "Ajuste", "Transferencia", "Merma"] as const;
export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];

export type Movimiento = {
  id: string;
  fecha: string; // ISO
  insumoId: string;
  tipo: TipoMovimiento;
  cantidad: number; // positivo entra, negativo sale
  motivo: string;
  usuario: string;
  referencia: string;
};

export type Proveedor = {
  id: string;
  nombre: string;
  contacto: string;
  telefono: string;
  email: string;
  plazo: number; // días de entrega
  condicion: string;
  calificacion: number; // 1..5
};

export const ESTADOS_ORDEN = [
  "Borrador",
  "Enviada",
  "En tránsito",
  "Recibida",
  "Cancelada",
] as const;
export type EstadoOrden = (typeof ESTADOS_ORDEN)[number];
export type ItemOrden = { insumoId: string; cantidad: number; precio: number };
export type OrdenCompra = {
  id: string;
  proveedorId: string;
  sucursal: string;
  fecha: string; // yyyy-mm-dd
  esperada: string; // yyyy-mm-dd
  estado: EstadoOrden;
  items: ItemOrden[];
  nota: string;
};

export type Kit = { tratamiento: string; items: { nombre: string; cantidad: number }[] };

export type PedidoEquipo = {
  id: string;
  fecha: string;
  autor: string;
  sucursal: string;
  detalle: string;
  estado: "Pendiente" | "Resuelto";
};

export type EstadoInventario = {
  insumos: Insumo[];
  movimientos: Movimiento[];
  proveedores: Proveedor[];
  ordenes: OrdenCompra[];
  kits: Kit[];
  pedidos: PedidoEquipo[];
};

/* ───────────── Utilidades ───────────── */

export function diaISO(n = 0) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function haceISO(dias: number, hora = 10) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(hora, (dias * 7) % 60, 0, 0);
  return d.toISOString();
}

export type NivelStock = "Agotado" | "Bajo" | "Normal" | "Exceso";
export function nivelStock(i: Insumo): NivelStock {
  if (i.stock <= 0) return "Agotado";
  if (i.stock <= i.minimo) return "Bajo";
  if (i.ideal && i.stock > i.ideal * 1.5) return "Exceso";
  return "Normal";
}
/** Días hasta el vencimiento (negativo = vencido); null si no vence. */
export function diasParaVencer(i: Insumo): number | null {
  if (!i.vencimiento) return null;
  const hoy = new Date(`${diaISO()}T00:00:00`).getTime();
  return Math.round((new Date(`${i.vencimiento}T00:00:00`).getTime() - hoy) / 86_400_000);
}
export function cantidadSugerida(i: Insumo) {
  return Math.max(1, Math.ceil((i.ideal || i.minimo * 2) - i.stock));
}
export function totalOrden(o: OrdenCompra) {
  return o.items.reduce((a, it) => a + it.cantidad * it.precio, 0);
}

/* ───────────── Datos de ejemplo ───────────── */

const PROVEEDORES: Proveedor[] = [
  {
    id: "p1",
    nombre: "Dental Supply",
    contacto: "Marcela Ruiz",
    telefono: "+54 11 4789-2200",
    email: "ventas@dentalsupply.com.ar",
    plazo: 2,
    condicion: "30 días",
    calificacion: 5,
  },
  {
    id: "p2",
    nombre: "OdontoMed",
    contacto: "Germán Álvarez",
    telefono: "+54 11 4312-8870",
    email: "pedidos@odontomed.com.ar",
    plazo: 3,
    condicion: "Contado",
    calificacion: 4,
  },
  {
    id: "p3",
    nombre: "OrthoPro",
    contacto: "Lucía Benítez",
    telefono: "+54 11 5263-1144",
    email: "hola@orthopro.com.ar",
    plazo: 5,
    condicion: "15 días",
    calificacion: 4,
  },
  {
    id: "p4",
    nombre: "Esteril Sur",
    contacto: "Ramiro Paz",
    telefono: "+54 11 4021-5566",
    email: "comercial@esterilsur.com.ar",
    plazo: 1,
    condicion: "30 días",
    calificacion: 3,
  },
  {
    id: "p5",
    nombre: "Implant Line",
    contacto: "Paula Ferro",
    telefono: "+54 11 6099-3021",
    email: "ventas@implantline.com.ar",
    plazo: 7,
    condicion: "50% anticipo",
    calificacion: 5,
  },
];

const [CENTRO = "Clínica Centro", NORTE = "Clínica Norte", SUR = "Clínica Sur"] = SUCURSALES;

function insumo(i: Omit<Insumo, "lote" | "vencimiento" | "ubicacion"> & Partial<Insumo>): Insumo {
  return { lote: "", vencimiento: "", ubicacion: "Depósito", ...i };
}

const INSUMOS: Insumo[] = [
  insumo({
    id: "i1",
    codigo: "PRO-001",
    nombre: "Guantes de nitrilo talle M",
    categoria: "Protección",
    sucursal: CENTRO,
    proveedorId: "p1",
    stock: 24,
    unidad: "cajas",
    minimo: 10,
    ideal: 30,
    costo: 8500,
    lote: "GN-2291",
    vencimiento: diaISO(420),
    ubicacion: "Estante A1",
  }),
  insumo({
    id: "i2",
    codigo: "ANE-001",
    nombre: "Anestesia lidocaína 2%",
    categoria: "Anestesia",
    sucursal: CENTRO,
    proveedorId: "p2",
    stock: 6,
    unidad: "cajas",
    minimo: 10,
    ideal: 20,
    costo: 21000,
    lote: "LD-7781",
    vencimiento: diaISO(38),
    ubicacion: "Heladera",
  }),
  insumo({
    id: "i3",
    codigo: "OPE-001",
    nombre: "Resina composite A2",
    categoria: "Operatoria",
    sucursal: CENTRO,
    proveedorId: "p1",
    stock: 3,
    unidad: "jeringas",
    minimo: 8,
    ideal: 16,
    costo: 14500,
    lote: "RC-3310",
    vencimiento: diaISO(210),
    ubicacion: "Gabinete 1",
  }),
  insumo({
    id: "i4",
    codigo: "PRO-002",
    nombre: "Barbijos tricapa",
    categoria: "Protección",
    sucursal: CENTRO,
    proveedorId: "p1",
    stock: 42,
    unidad: "cajas",
    minimo: 15,
    ideal: 30,
    costo: 3900,
    ubicacion: "Estante A2",
  }),
  insumo({
    id: "i5",
    codigo: "END-001",
    nombre: "Limas endodónticas K",
    categoria: "Endodoncia",
    sucursal: CENTRO,
    proveedorId: "p2",
    stock: 12,
    unidad: "kits",
    minimo: 5,
    ideal: 12,
    costo: 18000,
    ubicacion: "Gabinete 2",
  }),
  insumo({
    id: "i6",
    codigo: "EST-001",
    nombre: "Bolsas de esterilización",
    categoria: "Esterilización",
    sucursal: CENTRO,
    proveedorId: "p4",
    stock: 9,
    unidad: "rollos",
    minimo: 4,
    ideal: 10,
    costo: 12500,
    ubicacion: "Esterilización",
  }),
  insumo({
    id: "i7",
    codigo: "HIG-001",
    nombre: "Pasta profiláctica",
    categoria: "Higiene",
    sucursal: CENTRO,
    proveedorId: "p1",
    stock: 5,
    unidad: "frascos",
    minimo: 3,
    ideal: 8,
    costo: 6200,
    lote: "PP-1102",
    vencimiento: diaISO(-4),
    ubicacion: "Gabinete 1",
  }),
  insumo({
    id: "i8",
    codigo: "DES-001",
    nombre: "Eyectores de saliva",
    categoria: "Descartables",
    sucursal: CENTRO,
    proveedorId: "p4",
    stock: 0,
    unidad: "cajas",
    minimo: 5,
    ideal: 12,
    costo: 2800,
    ubicacion: "Estante B1",
  }),
  insumo({
    id: "i9",
    codigo: "ORT-001",
    nombre: "Brackets metálicos",
    categoria: "Ortodoncia",
    sucursal: NORTE,
    proveedorId: "p3",
    stock: 18,
    unidad: "kits",
    minimo: 8,
    ideal: 15,
    costo: 32000,
    ubicacion: "Ortodoncia",
  }),
  insumo({
    id: "i10",
    codigo: "PRO-001",
    nombre: "Guantes de nitrilo talle M",
    categoria: "Protección",
    sucursal: NORTE,
    proveedorId: "p1",
    stock: 7,
    unidad: "cajas",
    minimo: 8,
    ideal: 20,
    costo: 8500,
    lote: "GN-2291",
    vencimiento: diaISO(420),
    ubicacion: "Estante 1",
  }),
  insumo({
    id: "i11",
    codigo: "ANE-001",
    nombre: "Anestesia lidocaína 2%",
    categoria: "Anestesia",
    sucursal: NORTE,
    proveedorId: "p2",
    stock: 14,
    unidad: "cajas",
    minimo: 6,
    ideal: 14,
    costo: 21000,
    lote: "LD-7802",
    vencimiento: diaISO(160),
    ubicacion: "Heladera",
  }),
  insumo({
    id: "i12",
    codigo: "OPE-001",
    nombre: "Resina composite A2",
    categoria: "Operatoria",
    sucursal: SUR,
    proveedorId: "p1",
    stock: 10,
    unidad: "jeringas",
    minimo: 6,
    ideal: 12,
    costo: 14500,
    lote: "RC-3310",
    vencimiento: diaISO(210),
    ubicacion: "Gabinete 1",
  }),
  insumo({
    id: "i13",
    codigo: "CIR-001",
    nombre: "Sutura reabsorbible 4-0",
    categoria: "Cirugía",
    sucursal: SUR,
    proveedorId: "p5",
    stock: 4,
    unidad: "cajas",
    minimo: 3,
    ideal: 6,
    costo: 26500,
    lote: "SR-4410",
    vencimiento: diaISO(55),
    ubicacion: "Quirófano",
  }),
  insumo({
    id: "i14",
    codigo: "EST-002",
    nombre: "Indicadores biológicos autoclave",
    categoria: "Esterilización",
    sucursal: SUR,
    proveedorId: "p4",
    stock: 30,
    unidad: "unidades",
    minimo: 10,
    ideal: 15,
    costo: 1900,
    ubicacion: "Esterilización",
  }),
];

const INSUMO_GRUPO: Insumo[] = [
  insumo({
    id: "i15",
    codigo: "PRO-001",
    nombre: "Guantes de nitrilo talle M",
    categoria: "Protección",
    sucursal: SUCURSAL_GRUPO,
    proveedorId: "p1",
    stock: 15,
    unidad: "cajas",
    minimo: 8,
    ideal: 20,
    costo: 8500,
    ubicacion: "Estante 1",
  }),
  insumo({
    id: "i16",
    codigo: "OPE-001",
    nombre: "Resina composite A2",
    categoria: "Operatoria",
    sucursal: SUCURSAL_GRUPO,
    proveedorId: "p1",
    stock: 2,
    unidad: "jeringas",
    minimo: 5,
    ideal: 10,
    costo: 14500,
    ubicacion: "Gabinete 1",
  }),
];

function movimientosEjemplo(): Movimiento[] {
  const salidas: [string, number, number, string][] = [
    ["i1", 1, 2, "Uso diario en gabinetes"],
    ["i2", 1, 1, "Endodoncia · Mauro Pinto"],
    ["i3", 2, 1, "Restauración · Julián Ortega"],
    ["i4", 2, 3, "Uso diario en gabinetes"],
    ["i1", 4, 3, "Uso diario en gabinetes"],
    ["i5", 5, 1, "Endodoncia · Ana Torres"],
    ["i2", 6, 2, "Extracciones de la semana"],
    ["i8", 7, 4, "Uso diario en gabinetes"],
    ["i3", 8, 2, "Restauraciones de la semana"],
    ["i9", 9, 2, "Control de ortodoncia"],
    ["i10", 10, 3, "Uso diario en gabinetes"],
    ["i12", 11, 2, "Restauración · Lucía Paz"],
    ["i13", 12, 1, "Cirugía de implante"],
    ["i6", 13, 1, "Ciclos de autoclave"],
    ["i1", 15, 2, "Uso diario en gabinetes"],
    ["i2", 17, 2, "Endodoncias"],
    ["i7", 18, 1, "Limpiezas dentales"],
    ["i4", 20, 4, "Uso diario en gabinetes"],
    ["i3", 22, 3, "Restauraciones"],
    ["i14", 24, 4, "Control semanal de autoclave"],
  ];
  const lista: Movimiento[] = salidas.map(([insumoId, dias, cant, motivo], n) => ({
    id: `m${n + 1}`,
    fecha: haceISO(dias, 9 + (n % 8)),
    insumoId,
    tipo: "Salida",
    cantidad: -cant,
    motivo,
    usuario: n % 2 ? "Carla Gómez" : "Sofía Rodríguez",
    referencia: "",
  }));
  lista.push(
    {
      id: "m21",
      fecha: haceISO(14, 11),
      insumoId: "i1",
      tipo: "Entrada",
      cantidad: 20,
      motivo: "Recepción de orden",
      usuario: "Administración",
      referencia: "OC-0001",
    },
    {
      id: "m22",
      fecha: haceISO(14, 11),
      insumoId: "i4",
      tipo: "Entrada",
      cantidad: 30,
      motivo: "Recepción de orden",
      usuario: "Administración",
      referencia: "OC-0001",
    },
    {
      id: "m23",
      fecha: haceISO(3, 18),
      insumoId: "i7",
      tipo: "Merma",
      cantidad: -1,
      motivo: "Frasco abierto contaminado",
      usuario: "Carla Gómez",
      referencia: "",
    },
    {
      id: "m24",
      fecha: haceISO(16, 12),
      insumoId: "i10",
      tipo: "Transferencia",
      cantidad: 5,
      motivo: `Desde ${CENTRO}`,
      usuario: "Administración",
      referencia: "i1",
    },
    {
      id: "m25",
      fecha: haceISO(16, 12),
      insumoId: "i1",
      tipo: "Transferencia",
      cantidad: -5,
      motivo: `Hacia ${NORTE}`,
      usuario: "Administración",
      referencia: "i10",
    },
    {
      id: "m26",
      fecha: haceISO(21, 17),
      insumoId: "i6",
      tipo: "Ajuste",
      cantidad: -1,
      motivo: "Conteo físico mensual",
      usuario: "Administración",
      referencia: "",
    },
  );
  return lista.sort((a, b) => b.fecha.localeCompare(a.fecha));
}

const ORDENES: OrdenCompra[] = [
  {
    id: "OC-0004",
    proveedorId: "p2",
    sucursal: CENTRO,
    fecha: diaISO(-1),
    esperada: diaISO(2),
    estado: "Enviada",
    items: [
      { insumoId: "i2", cantidad: 14, precio: 21000 },
      { insumoId: "i5", cantidad: 2, precio: 18000 },
    ],
    nota: "Urgente: anestesia bajo mínimo.",
  },
  {
    id: "OC-0003",
    proveedorId: "p1",
    sucursal: SUR,
    fecha: diaISO(-3),
    esperada: diaISO(-1),
    estado: "En tránsito",
    items: [{ insumoId: "i12", cantidad: 6, precio: 14500 }],
    nota: "",
  },
  {
    id: "OC-0002",
    proveedorId: "p4",
    sucursal: CENTRO,
    fecha: diaISO(0),
    esperada: diaISO(1),
    estado: "Borrador",
    items: [{ insumoId: "i8", cantidad: 12, precio: 2800 }],
    nota: "",
  },
  {
    id: "OC-0001",
    proveedorId: "p1",
    sucursal: CENTRO,
    fecha: diaISO(-16),
    esperada: diaISO(-14),
    estado: "Recibida",
    items: [
      { insumoId: "i1", cantidad: 20, precio: 8200 },
      { insumoId: "i4", cantidad: 30, precio: 3800 },
    ],
    nota: "",
  },
];

const KITS: Kit[] = [
  {
    tratamiento: "Limpieza dental",
    items: [
      { nombre: "Guantes de nitrilo talle M", cantidad: 0.1 },
      { nombre: "Pasta profiláctica", cantidad: 0.1 },
      { nombre: "Eyectores de saliva", cantidad: 0.02 },
    ],
  },
  {
    tratamiento: "Restauración",
    items: [
      { nombre: "Resina composite A2", cantidad: 0.25 },
      { nombre: "Anestesia lidocaína 2%", cantidad: 0.05 },
      { nombre: "Guantes de nitrilo talle M", cantidad: 0.1 },
    ],
  },
  {
    tratamiento: "Endodoncia",
    items: [
      { nombre: "Limas endodónticas K", cantidad: 0.5 },
      { nombre: "Anestesia lidocaína 2%", cantidad: 0.1 },
      { nombre: "Guantes de nitrilo talle M", cantidad: 0.1 },
    ],
  },
  {
    tratamiento: "Extracción",
    items: [
      { nombre: "Anestesia lidocaína 2%", cantidad: 0.1 },
      { nombre: "Sutura reabsorbible 4-0", cantidad: 0.1 },
      { nombre: "Guantes de nitrilo talle M", cantidad: 0.1 },
    ],
  },
];

export const storeInventario = crearStorePorEmpresa<EstadoInventario>(
  () => ({
    insumos: [...INSUMOS, ...INSUMO_GRUPO],
    movimientos: movimientosEjemplo(),
    proveedores: PROVEEDORES,
    ordenes: ORDENES,
    kits: KITS,
    pedidos: [
      {
        id: "pe1",
        fecha: haceISO(0, 8),
        autor: "Carla Gómez",
        sucursal: CENTRO,
        detalle: "Faltan eyectores de saliva en Gabinete 2",
        estado: "Pendiente",
      },
    ],
  }),
  { persistir: "inventario" },
);

export function setInventario<K extends keyof EstadoInventario>(
  clave: K,
  fn: (prev: EstadoInventario[K]) => EstadoInventario[K],
) {
  const actual = storeInventario.leer();
  storeInventario.poner({ ...actual, [clave]: fn(actual[clave]) });
}

/** Registra un movimiento y actualiza el stock del insumo (nunca queda negativo). */
export function registrarMovimiento(m: Omit<Movimiento, "id" | "fecha"> & { fecha?: string }) {
  const actual = storeInventario.leer();
  const ins = actual.insumos.find((i) => i.id === m.insumoId);
  if (!ins) return;
  const cantidad = Math.max(m.cantidad, -ins.stock);
  storeInventario.poner({
    ...actual,
    insumos: actual.insumos.map((i) => (i.id === ins.id ? { ...i, stock: i.stock + cantidad } : i)),
    movimientos: [
      {
        ...m,
        cantidad,
        id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        fecha: m.fecha ?? new Date().toISOString(),
      },
      ...actual.movimientos,
    ],
  });
}

/** Pedido de reposición enviado desde el portal del equipo. */
export function registrarPedidoEquipo(autor: string, sucursal: string, detalle: string) {
  setInventario("pedidos", (prev) => [
    {
      id: `pe-${Date.now()}`,
      fecha: new Date().toISOString(),
      autor,
      sucursal,
      detalle,
      estado: "Pendiente",
    },
    ...prev,
  ]);
}

export function siguienteNumeroOrden(ordenes: OrdenCompra[]) {
  const max = ordenes.reduce((a, o) => Math.max(a, Number(o.id.replace(/\D/g, "")) || 0), 0);
  return `OC-${String(max + 1).padStart(4, "0")}`;
}
