import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";
import { SUCURSALES } from "@/lib/cloud-esther/agenda-store";
import type { PlanId } from "@/lib/cloud-esther/data";
import type { Turno } from "@/lib/cloud-esther/agenda-store";

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
  /** Descontar el kit solo cuando el turno se marca «Atendida» en la Agenda (desde ese día en adelante) */
  kitsAuto?: { activo: boolean; desde: string };
  /** Último conteo físico de cada sucursal (fecha ISO) */
  conteos?: Record<string, string>;
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
const claveNombre = (t: string) =>
  t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Kit que corresponde al tratamiento del turno (mismo nombre, o el turno lo incluye). */
export function kitDeTratamiento(kits: Kit[], tratamiento: string): Kit | undefined {
  const t = claveNombre(tratamiento);
  if (!t) return undefined;
  return kits.find((k) => claveNombre(k.tratamiento) === t) ?? kits.find((k) => {
    const n = claveNombre(k.tratamiento);
    return n.length >= 4 && t.includes(n);
  });
}

/** Al atender un turno, se descuenta solo su kit (una vez por turno, desde el día en que se activó).
    Devuelve cuántos turnos se descontaron. */
export function descontarKitsDeTurnos(turnos: Turno[], hoy: string): number {
  const estado = storeInventario.leer();
  if (!estado.kits.length) return 0;
  // La primera vez se activa desde hoy (nunca se descuenta lo atendido antes)
  const cfg = estado.kitsAuto ?? { activo: true, desde: hoy };
  if (!estado.kitsAuto) storeInventario.poner({ ...estado, kitsAuto: cfg });
  if (!cfg.activo) return 0;
  const desde = cfg.desde;
  const hechos = new Set(estado.movimientos.map((m) => m.referencia).filter((r) => r.startsWith("turno-")));
  let n = 0;
  for (const t of turnos) {
    if (t.estado !== "Atendida" || t.fecha < desde || hechos.has(`turno-${t.id}`)) continue;
    const kit = kitDeTratamiento(estado.kits, t.tratamiento);
    if (!kit) continue;
    const actual = storeInventario.leer();
    const sedes = [...new Set(actual.insumos.map((i) => i.sucursal))];
    let algo = false;
    for (const it of kit.items) {
      const ins =
        actual.insumos.find((i) => i.nombre === it.nombre && i.sucursal === t.sucursal) ??
        (sedes.length === 1 ? actual.insumos.find((i) => i.nombre === it.nombre) : undefined);
      if (!ins || it.cantidad <= 0) continue;
      registrarMovimiento({
        insumoId: ins.id,
        tipo: "Salida",
        cantidad: -Math.round(it.cantidad * 100) / 100,
        motivo: `${kit.tratamiento} · ${t.paciente} (turno atendido)`,
        usuario: "Agenda (automático)",
        referencia: `turno-${t.id}`,
      });
      algo = true;
    }
    if (algo) n++;
  }
  return n;
}
