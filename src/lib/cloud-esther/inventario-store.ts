import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";
import { SUCURSALES } from "@/lib/cloud-esther/agenda-store";
import type { PlanId } from "@/lib/cloud-esther/data";

/* Ubicación: src/lib/cloud-esther/inventario-store.ts

   Inventario por empresa: insumos por sucursal, movimientos (entradas, salidas, ajustes,
   transferencias y mermas), proveedores, órdenes de compra, kits de consumo por tratamiento
   y pedidos de reposición del equipo (desde el portal del equipo).
   Arranca vacío, igual que producción: lo carga cada clínica.
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
/** Límite de sucursales (sedes) por plan (igual que la configuración de planes). */
export const LIMITE_SUCURSALES: Record<PlanId, number> = {
  inicial: 1,
  profesional: 3,
  avanzada: 6,
  grupo: 20,
};

/** Sucursales de la clínica (las que cargó el dueño), acotadas al límite del plan. */
export function sucursalesDelPlan(plan: PlanId): string[] {
  const limite = LIMITE_SUCURSALES[plan] ?? 1;
  return SUCURSALES.slice(0, Math.min(limite, SUCURSALES.length));
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

/* ───────────── Estado inicial ───────────── */

/* Sin insumos, proveedores, órdenes, movimientos, kits ni pedidos de ejemplo:
   el cliente carga lo suyo. Es el mismo estado para el demo y para una clínica real. */
const estadoInicial = (): EstadoInventario => ({
  insumos: [],
  movimientos: [],
  proveedores: [],
  ordenes: [],
  kits: [],
  pedidos: [],
});

export const storeInventario = crearStorePorEmpresa<EstadoInventario>(estadoInicial, {
  persistir: "inventario",
  vacio: estadoInicial,
});

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