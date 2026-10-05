import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Boxes,
  Building2,
  CalendarClock,
  Check,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  Download,
  History,
  Mail,
  MessageCircle,
  Minus,
  Package,
  PackageCheck,
  Pencil,
  Phone,
  Plus,
  Printer,
  Search,
  Send,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  TrendingDown,
  Truck,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  CATEGORIAS,
  ESTADOS_ORDEN,
  TIPOS_MOVIMIENTO,
  UNIDADES,
  cantidadSugerida,
  diaISO,
  diasParaVencer,
  nivelStock,
  registrarMovimiento,
  setInventario,
  siguienteNumeroOrden,
  storeInventario,
  sucursalesDelPlan,
  totalOrden,
  type Categoria,
  type EstadoOrden,
  type Insumo,
  type ItemOrden,
  type Kit,
  type Movimiento,
  type NivelStock,
  type OrdenCompra,
  type Proveedor,
  type TipoMovimiento,
  type Unidad,
} from "@/lib/cloud-esther/inventario-store";
import { TRATAMIENTOS } from "@/lib/cloud-esther/agenda-store";
import { useCloudEsther } from "@/lib/cloud-esther/data";
import { useSesion } from "@/lib/cloud-esther/auth-store";
import { normalizarBusqueda } from "@/lib/utils";
import { IconoWhatsApp } from "@/components/cloud-esther/IconoWhatsApp";

/* Ubicación: src/components/cloud-esther/Inventario.tsx
   Inventario por empresa: stock por sucursal, movimientos, alertas, órdenes de compra,
   proveedores, consumo por tratamiento y (plan Grupo) comparativo entre sedes. */

/* ───────────── Utilidades ───────────── */

function ars(n: number) {
  return `$ ${Math.round(n).toLocaleString("es-AR")}`;
}
function num(n: number) {
  return Number.isInteger(n)
    ? n.toLocaleString("es-AR")
    : n.toLocaleString("es-AR", { maximumFractionDigits: 2 });
}
function fecha(iso: string) {
  return iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—";
}
function fechaHora(iso: string) {
  const d = new Date(iso);
  return `${fecha(iso)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function sumarDias(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function mayuscula(t: string) {
  const s = t.trim();
  return s ? s[0]!.toUpperCase() + s.slice(1) : s;
}
function wa(tel: string, texto: string) {
  return `https://wa.me/${tel.replace(/[^\d]/g, "")}?text=${encodeURIComponent(texto)}`;
}
function descargarCSV(nombre: string, filas: (string | number)[][]) {
  const csv = filas
    .map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
    .join("\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

/* ───────────── Estilos y piezas ───────────── */

const INPUT =
  "h-9 w-full rounded-xl border border-primary/12 bg-white px-3 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary/45 focus:ring-4 focus:ring-primary/10";
const BTN_PRIMARIO =
  "btn-ce focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
const BTN_SECUNDARIO =
  "btn-ce-outline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
const BTN_ICONO =
  "grid size-8 shrink-0 place-items-center rounded-full border border-primary/12 bg-white text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary/10 hover:text-primary disabled:opacity-40";
const CHIP = (activo: boolean) =>
  `inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
    activo
      ? "bg-primary text-primary-foreground"
      : "text-muted-foreground hover:bg-card hover:text-foreground"
  }`;

const NIVEL_ESTILO: Record<NivelStock, { chip: string; barra: string }> = {
  Agotado: { chip: "bg-rose-100 text-rose-700", barra: "bg-rose-500" },
  Bajo: {
    chip: "bg-amber-100 text-amber-700",
    barra: "bg-gradient-to-r from-amber-400 to-orange-500",
  },
  Normal: {
    chip: "bg-emerald-100 text-emerald-700",
    barra: "bg-gradient-to-r from-primary to-fuchsia-500",
  },
  Exceso: { chip: "bg-sky-100 text-sky-700", barra: "bg-gradient-to-r from-sky-400 to-primary" },
};
const ORDEN_ESTILO: Record<EstadoOrden, string> = {
  Borrador: "bg-muted text-muted-foreground",
  Enviada: "bg-violet-100 text-violet-700",
  "En tránsito": "bg-sky-100 text-sky-700",
  Recibida: "bg-emerald-100 text-emerald-700",
  Cancelada: "bg-rose-100 text-rose-700",
};
const MOV_ESTILO: Record<TipoMovimiento, { icon: LucideIcon; clase: string }> = {
  Entrada: { icon: ArrowDownLeft, clase: "bg-emerald-100 text-emerald-700" },
  Salida: { icon: ArrowUpRight, clase: "bg-violet-100 text-violet-700" },
  Ajuste: { icon: SlidersHorizontal, clase: "bg-sky-100 text-sky-700" },
  Transferencia: { icon: ArrowLeftRight, clase: "bg-fuchsia-100 text-fuchsia-700" },
  Merma: { icon: Trash2, clase: "bg-rose-100 text-rose-700" },
};

function Pill({ children, clase }: { children: ReactNode; clase: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${clase}`}
    >
      {children}
    </span>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
function Sel<T extends string>({
  value,
  onChange,
  opciones,
  etiqueta,
}: {
  value: T;
  onChange: (v: T) => void;
  opciones: readonly (T | { value: T; label: string })[];
  etiqueta?: string;
}) {
  return (
    <div className="relative">
      <select
        aria-label={etiqueta}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={`${INPUT} appearance-none pr-8`}
      >
        {opciones.map((o) =>
          typeof o === "string" ? (
            <option key={o} value={o}>
              {o}
            </option>
          ) : (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ),
        )}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
function Modal({
  titulo,
  onClose,
  children,
  ancho = "max-w-xl",
}: {
  titulo: string;
  onClose: () => void;
  children: ReactNode;
  ancho?: string;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-3xl border border-border bg-card p-5 shadow-2xl ${ancho}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              Inventario
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">{titulo}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid size-8 place-items-center rounded-xl text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Acciones({
  etiqueta,
  onCancel,
  icon: Icon = Check,
  extra,
}: {
  etiqueta: string;
  onCancel: () => void;
  icon?: LucideIcon;
  extra?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2 pt-1">
      <button type="button" className={BTN_SECUNDARIO} onClick={onCancel}>
        Cancelar
      </button>
      {extra}
      <button type="submit" className={BTN_PRIMARIO}>
        <Icon className="size-4" />
        {etiqueta}
      </button>
    </div>
  );
}
function Mini({
  label,
  valor,
  icon: Icon,
  tono = "text-foreground",
}: {
  label: string;
  valor: string;
  icon: LucideIcon;
  tono?: string;
}) {
  return (
    <div className="card-grad flex items-start justify-between p-3.5">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
        <p className={`mt-1 truncate text-xl font-bold ${tono}`}>{valor}</p>
      </div>
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
    </div>
  );
}
function Encabezado({
  icon: Icon,
  titulo,
  descripcion,
  children,
}: {
  icon: LucideIcon;
  titulo: string;
  descripcion: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/15 via-primary/8 to-primary/[0.03] text-primary ring-1 ring-primary/15">
          <Icon className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{titulo}</h2>
          <p className="text-sm text-muted-foreground">{descripcion}</p>
        </div>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
function Vacio({ icon: Icon, texto }: { icon: LucideIcon; texto: string }) {
  return (
    <div className="card-grad flex flex-col items-center gap-2 p-8 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <p className="text-sm text-muted-foreground">{texto}</p>
    </div>
  );
}
function Barra({ pct, clase }: { pct: number; clase: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-primary/10">
      <div
        className={`h-full rounded-full ${clase}`}
        style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

/* ───────────── Contexto de la página ───────────── */

type Seccion =
  "stock" | "movimientos" | "alertas" | "ordenes" | "proveedores" | "consumo" | "sedes";

type Ctx = {
  onToast: (m: string) => void;
  usuario: string;
  sucursales: string[];
  insumos: Insumo[]; // solo los de las sucursales del plan
  abrirInsumo: (id: string) => void;
  movimiento: (m: { insumoId?: string; tipo?: TipoMovimiento; destino?: string }) => void;
  nuevaOrden: (o: { proveedorId?: string; sucursal?: string; items?: ItemOrden[] }) => void;
  ir: (s: Seccion) => void;
};

/** Agrega el insumo a una orden en borrador del proveedor y sucursal (o crea una). */
function reponer(ins: Insumo[], usuario: string): string[] {
  const estado = storeInventario.leer();
  let ordenes = [...estado.ordenes];
  const tocadas = new Set<string>();
  for (const i of ins) {
    const cantidad = cantidadSugerida(i);
    const idx = ordenes.findIndex(
      (o) =>
        o.estado === "Borrador" && o.proveedorId === i.proveedorId && o.sucursal === i.sucursal,
    );
    if (idx >= 0) {
      const o = ordenes[idx]!;
      const ya = o.items.find((it) => it.insumoId === i.id);
      const items = ya
        ? o.items.map((it) =>
            it.insumoId === i.id ? { ...it, cantidad: Math.max(it.cantidad, cantidad) } : it,
          )
        : [...o.items, { insumoId: i.id, cantidad, precio: i.costo }];
      ordenes[idx] = { ...o, items };
      tocadas.add(o.id);
    } else {
      const prov = estado.proveedores.find((p) => p.id === i.proveedorId);
      const id = siguienteNumeroOrden(ordenes);
      ordenes = [
        {
          id,
          proveedorId: i.proveedorId,
          sucursal: i.sucursal,
          fecha: diaISO(),
          esperada: sumarDias(diaISO(), prov?.plazo ?? 3),
          estado: "Borrador",
          items: [{ insumoId: i.id, cantidad, precio: i.costo }],
          nota: `Reposición sugerida por ${usuario}`,
        },
        ...ordenes,
      ];
      tocadas.add(id);
    }
  }
  storeInventario.poner({ ...estado, ordenes });
  return [...tocadas];
}

/** Mueve stock entre sucursales; crea el insumo en la sede destino si no existe. */
function transferir(
  insumoId: string,
  destino: string,
  cantidad: number,
  usuario: string,
  motivo: string,
) {
  const estado = storeInventario.leer();
  const origen = estado.insumos.find((i) => i.id === insumoId);
  if (!origen) return;
  const cant = Math.min(cantidad, origen.stock);
  let dest = estado.insumos.find(
    (i) => i.sucursal === destino && (i.codigo === origen.codigo || i.nombre === origen.nombre),
  );
  if (!dest) {
    dest = { ...origen, id: `i-${Date.now()}`, sucursal: destino, stock: 0, ubicacion: "Depósito" };
    storeInventario.poner({ ...estado, insumos: [...estado.insumos, dest] });
  }
  registrarMovimiento({
    insumoId: origen.id,
    tipo: "Transferencia",
    cantidad: -cant,
    motivo: `Hacia ${destino}${motivo ? ` · ${motivo}` : ""}`,
    usuario,
    referencia: dest.id,
  });
  registrarMovimiento({
    insumoId: dest.id,
    tipo: "Transferencia",
    cantidad: cant,
    motivo: `Desde ${origen.sucursal}${motivo ? ` · ${motivo}` : ""}`,
    usuario,
    referencia: origen.id,
  });
}

/* ───────────── Página ───────────── */

export function Inventario() {
  const { plan } = useCloudEsther();
  const { usuario: u } = useSesion();
  const estado = storeInventario.usar();
  const [montado, setMontado] = useState(false);
  const [seccion, setSeccion] = useState<Seccion>("stock");
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const [insumoAbierto, setInsumoAbierto] = useState<string | null>(null);
  const [editarInsumo, setEditarInsumo] = useState<Insumo | "nuevo" | null>(null);
  const [mov, setMov] = useState<{
    insumoId?: string;
    tipo?: TipoMovimiento;
    destino?: string;
  } | null>(null);
  const [orden, setOrden] = useState<{ base: Partial<OrdenCompra>; editando: boolean } | null>(
    null,
  );
  useEffect(() => setMontado(true), []);

  const esGrupo = plan === "grupo";
  const sucursales = sucursalesDelPlan(esGrupo);
  const insumos = estado.insumos.filter((i) => sucursales.includes(i.sucursal));
  const ids = new Set(insumos.map((i) => i.id));

  const onToast = (m: string) => {
    setToast(m);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 2800);
  };
  const ctx: Ctx = {
    onToast,
    usuario: u?.nombre ?? "Administración",
    sucursales,
    insumos,
    abrirInsumo: setInsumoAbierto,
    movimiento: setMov,
    nuevaOrden: (o) =>
      setOrden({
        base: {
          ...(o.proveedorId ? { proveedorId: o.proveedorId } : {}),
          ...(o.sucursal ? { sucursal: o.sucursal } : {}),
          ...(o.items ? { items: o.items } : {}),
        },
        editando: false,
      }),
    ir: setSeccion,
  };

  const valor = insumos.reduce((a, i) => a + i.stock * i.costo, 0);
  const alertas = insumos.filter((i) => ["Bajo", "Agotado"].includes(nivelStock(i)));
  const porVencer = insumos.filter((i) => {
    const d = diasParaVencer(i);
    return d !== null && d <= 60 && i.stock > 0;
  });
  const abiertas = estado.ordenes.filter(
    (o) =>
      sucursales.includes(o.sucursal) && ["Borrador", "Enviada", "En tránsito"].includes(o.estado),
  );
  const hace30 = Date.now() - 30 * 86_400_000;
  const consumo30 = estado.movimientos.filter(
    (m) =>
      ids.has(m.insumoId) &&
      ["Salida", "Merma"].includes(m.tipo) &&
      new Date(m.fecha).getTime() >= hace30,
  );
  const costoDe = (id: string) => estado.insumos.find((i) => i.id === id)?.costo ?? 0;
  const consumoValor = consumo30.reduce(
    (a, m) => a + Math.abs(m.cantidad) * costoDe(m.insumoId),
    0,
  );
  const pedidosPend = estado.pedidos.filter(
    (p) => p.estado === "Pendiente" && sucursales.includes(p.sucursal),
  );

  const SECCIONES: { id: Seccion; label: string; icon: LucideIcon; badge?: number }[] = [
    { id: "stock", label: "Stock", icon: Boxes },
    { id: "movimientos", label: "Movimientos", icon: History },
    {
      id: "alertas",
      label: "Alertas",
      icon: AlertTriangle,
      badge: alertas.length + porVencer.length + pedidosPend.length,
    },
    { id: "ordenes", label: "Órdenes de compra", icon: ShoppingCart, badge: abiertas.length },
    { id: "proveedores", label: "Proveedores", icon: Truck },
    { id: "consumo", label: "Consumo y kits", icon: TrendingDown },
    ...(esGrupo ? [{ id: "sedes" as const, label: "Comparativo por sede", icon: Building2 }] : []),
  ];

  const kpis = [
    {
      l: "Valor del inventario",
      v: ars(valor),
      t: `${insumos.length} insumos`,
      d: `en ${sucursales.length} sucursales`,
      i: CircleDollarSign,
    },
    {
      l: "Alertas de stock",
      v: String(alertas.length),
      t: `${insumos.filter((i) => nivelStock(i) === "Agotado").length} agotados`,
      d: `· ${porVencer.length} por vencer`,
      i: AlertTriangle,
    },
    {
      l: "Órdenes en curso",
      v: String(abiertas.length),
      t: ars(abiertas.reduce((a, o) => a + totalOrden(o), 0)),
      d: "en órdenes abiertas",
      i: ShoppingCart,
    },
    {
      l: "Consumo (30 días)",
      v: ars(consumoValor),
      t: `${consumo30.length} salidas`,
      d: "valorizadas al costo",
      i: TrendingDown,
    },
  ];

  return (
    <div className="relative min-h-full overflow-clip bg-[#faf9ff]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_5%,rgba(124,58,237,0.15),transparent_28%),radial-gradient(circle_at_92%_12%,rgba(236,72,153,0.10),transparent_27%),linear-gradient(135deg,#f8f6ff_0%,#f3effd_48%,#faf8ff_100%)]"
      />
      <div className="relative mx-auto w-full max-w-[1420px] px-4 py-6 md:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[30px] border border-primary/15 bg-gradient-to-br from-white via-white/96 to-primary/[0.045] shadow-[0_20px_55px_-38px_rgba(76,29,149,0.55)]">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary/55 via-primary to-pink-400/60" />
          <div className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-primary/[0.055] blur-2xl" />
          <div className="relative p-5 md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-primary/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                    <Package className="size-3.5" />
                    Operación
                  </span>
                  {montado && alertas.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSeccion("alertas")}
                      className="rounded-full border border-amber-200/70 bg-amber-50/80 px-3 py-1.5 text-[11px] font-bold text-amber-700"
                    >
                      {alertas.length} insumos para reponer
                    </button>
                  )}
                </div>
                <h1 className="mt-4 text-[34px] font-bold tracking-[-0.035em] md:text-[42px]">
                  Inventario
                </h1>
                <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-foreground md:text-sm">
                  Stock por sucursal, entradas y salidas, vencimientos, compras a proveedores y
                  cuánto consume cada tratamiento. Todo queda registrado con quién y cuándo.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button type="button" className={BTN_SECUNDARIO} onClick={() => setMov({})}>
                  <ArrowLeftRight className="size-4" />
                  Registrar movimiento
                </button>
                <button
                  type="button"
                  className={BTN_PRIMARIO}
                  onClick={() => setEditarInsumo("nuevo")}
                >
                  <Plus className="size-4" />
                  Nuevo insumo
                </button>
              </div>
            </div>
            {montado && (
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {kpis.map((c) => (
                  <div
                    key={c.l}
                    className="group relative min-h-[112px] overflow-hidden rounded-[22px] border border-primary/25 bg-gradient-to-br from-white via-white to-primary/[0.065] p-4 shadow-[0_12px_28px_-20px_rgba(124,58,237,0.48)] transition-all hover:-translate-y-0.5 hover:border-primary/45"
                  >
                    <div className="pointer-events-none absolute -right-7 -top-9 size-[100px] rounded-full bg-primary/[0.035] ring-[13px] ring-primary/[0.035]" />
                    <div className="relative flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-primary/75">
                          {c.l}
                        </p>
                        <p className="mt-2 text-[27px] font-bold leading-none tracking-tight text-primary">
                          {c.v}
                        </p>
                        <p className="mt-2 text-[11px]">
                          <span className="font-semibold text-primary">{c.t}</span>{" "}
                          <span className="text-muted-foreground">{c.d}</span>
                        </p>
                      </div>
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/[0.08] text-primary">
                        <c.i className="size-4" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <nav
              className="mt-4 flex flex-wrap gap-1.5 rounded-2xl border border-primary/10 bg-primary/[0.025] p-1.5"
              aria-label="Secciones de inventario"
            >
              {SECCIONES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSeccion(s.id)}
                  aria-pressed={seccion === s.id}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                    seccion === s.id
                      ? "bg-primary text-primary-foreground shadow-[0_8px_18px_-10px_rgba(124,58,237,0.8)]"
                      : "text-muted-foreground hover:bg-card hover:text-foreground"
                  }`}
                >
                  <s.icon className="size-3.5" />
                  {s.label}
                  {montado && !!s.badge && (
                    <span
                      className={`grid min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold ${
                        seccion === s.id ? "bg-white/25 text-white" : "bg-amber-500 text-white"
                      }`}
                    >
                      {s.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </section>

        <div className="mt-5">
          {!montado ? (
            <div className="card-grad h-[480px] animate-pulse" />
          ) : seccion === "stock" ? (
            <Stock ctx={ctx} onEditar={setEditarInsumo} />
          ) : seccion === "movimientos" ? (
            <Movimientos ctx={ctx} />
          ) : seccion === "alertas" ? (
            <Alertas ctx={ctx} />
          ) : seccion === "ordenes" ? (
            <Ordenes ctx={ctx} onEditar={(o) => setOrden({ base: o, editando: true })} />
          ) : seccion === "proveedores" ? (
            <Proveedores ctx={ctx} />
          ) : seccion === "consumo" ? (
            <Consumo ctx={ctx} />
          ) : (
            <Sedes ctx={ctx} />
          )}
        </div>
      </div>

      {insumoAbierto && (
        <DetalleInsumo
          id={insumoAbierto}
          ctx={ctx}
          onClose={() => setInsumoAbierto(null)}
          onEditar={(i) => {
            setInsumoAbierto(null);
            setEditarInsumo(i);
          }}
        />
      )}
      {editarInsumo && (
        <Modal
          titulo={editarInsumo === "nuevo" ? "Nuevo insumo" : `Editar ${editarInsumo.nombre}`}
          onClose={() => setEditarInsumo(null)}
          ancho="max-w-2xl"
        >
          <InsumoForm
            inicial={editarInsumo === "nuevo" ? null : editarInsumo}
            ctx={ctx}
            onCancel={() => setEditarInsumo(null)}
            onGuardado={(m) => {
              setEditarInsumo(null);
              onToast(m);
            }}
          />
        </Modal>
      )}
      {mov && (
        <Modal titulo="Registrar movimiento" onClose={() => setMov(null)}>
          <MovimientoForm
            ctx={ctx}
            inicial={mov}
            onCancel={() => setMov(null)}
            onGuardado={(m) => {
              setMov(null);
              onToast(m);
            }}
          />
        </Modal>
      )}
      {orden && (
        <Modal
          titulo={orden.editando ? `Editar orden ${orden.base.id ?? ""}` : "Nueva orden de compra"}
          onClose={() => setOrden(null)}
          ancho="max-w-3xl"
        >
          <OrdenForm
            ctx={ctx}
            base={orden.base}
            editando={orden.editando}
            onCancel={() => setOrden(null)}
            onGuardado={(m) => {
              setOrden(null);
              setSeccion("ordenes");
              onToast(m);
            }}
          />
        </Modal>
      )}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background shadow-xl"
          role="status"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

/* ───────────── Stock ───────────── */

type FiltroEstado = "" | "Bajo" | "Agotado" | "Vence" | "Exceso";

function Stock({ ctx, onEditar }: { ctx: Ctx; onEditar: (i: Insumo) => void }) {
  const { proveedores } = storeInventario.usar();
  const [q, setQ] = useState("");
  const [suc, setSuc] = useState("");
  const [cat, setCat] = useState("");
  const [est, setEst] = useState<FiltroEstado>("");
  const [conteo, setConteo] = useState(false);
  const [borrar, setBorrar] = useState<Insumo | null>(null);

  const lista = ctx.insumos
    .filter(
      (i) =>
        !q ||
        normalizarBusqueda(`${i.nombre} ${i.codigo} ${i.lote}`).includes(normalizarBusqueda(q)),
    )
    .filter((i) => !suc || i.sucursal === suc)
    .filter((i) => !cat || i.categoria === cat)
    .filter((i) => {
      if (!est) return true;
      if (est === "Vence") {
        const d = diasParaVencer(i);
        return d !== null && d <= 60;
      }
      return nivelStock(i) === est;
    })
    .sort((a, b) => {
      const orden: Record<NivelStock, number> = { Agotado: 0, Bajo: 1, Normal: 2, Exceso: 3 };
      return orden[nivelStock(a)] - orden[nivelStock(b)] || a.nombre.localeCompare(b.nombre);
    });
  const prov = (id: string) => proveedores.find((p) => p.id === id);
  const cuenta = (e: FiltroEstado) =>
    ctx.insumos.filter((i) =>
      e === "Vence" ? (diasParaVencer(i) ?? 999) <= 60 : e ? nivelStock(i) === e : true,
    ).length;

  return (
    <div className="space-y-3">
      <Encabezado
        icon={Boxes}
        titulo="Stock por sucursal"
        descripcion="Tocá una tarjeta para ver su historial. Con − y + registrás salidas y entradas rápidas."
      >
        <button type="button" className={BTN_SECUNDARIO} onClick={() => setConteo(true)}>
          <ClipboardCheck className="size-4" />
          Conteo físico
        </button>
        <button
          type="button"
          className={BTN_SECUNDARIO}
          onClick={() =>
            descargarCSV(`inventario-${diaISO()}.csv`, [
              [
                "Código",
                "Insumo",
                "Categoría",
                "Sucursal",
                "Stock",
                "Unidad",
                "Mínimo",
                "Ideal",
                "Costo",
                "Valor",
                "Lote",
                "Vencimiento",
                "Proveedor",
              ],
              ...lista.map((i) => [
                i.codigo,
                i.nombre,
                i.categoria,
                i.sucursal,
                i.stock,
                i.unidad,
                i.minimo,
                i.ideal,
                i.costo,
                i.stock * i.costo,
                i.lote,
                fecha(i.vencimiento),
                prov(i.proveedorId)?.nombre ?? "",
              ]),
            ])
          }
        >
          <Download className="size-4" />
          Exportar
        </button>
      </Encabezado>

      <div className="card-grad space-y-2.5 p-3">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_200px_200px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary/60" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, código o lote"
              className={`${INPUT} pl-9`}
            />
          </div>
          <Sel
            value={suc}
            onChange={setSuc}
            etiqueta="Sucursal"
            opciones={[
              { value: "", label: "Todas las sucursales" },
              ...ctx.sucursales.map((s) => ({ value: s, label: s })),
            ]}
          />
          <Sel
            value={cat}
            onChange={setCat}
            etiqueta="Categoría"
            opciones={[
              { value: "", label: "Todas las categorías" },
              ...CATEGORIAS.map((c) => ({ value: c, label: c })),
            ]}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {(
            [
              ["", "Todos"],
              ["Agotado", "Agotados"],
              ["Bajo", "Bajo mínimo"],
              ["Vence", "Por vencer"],
              ["Exceso", "Exceso"],
            ] as const
          ).map(([v, l]) => (
            <button key={v} type="button" className={CHIP(est === v)} onClick={() => setEst(v)}>
              {l} <span className="opacity-70">({cuenta(v)})</span>
            </button>
          ))}
        </div>
      </div>

      {lista.length === 0 ? (
        <Vacio icon={Search} texto="No hay insumos con esos filtros." />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {lista.map((i) => {
            const n = nivelStock(i);
            const dv = diasParaVencer(i);
            const tope = Math.max(i.ideal, i.minimo * 2, i.stock, 1);
            return (
              <li key={i.id} className="card-grad flex flex-col p-4">
                <button type="button" onClick={() => ctx.abrirInsumo(i.id)} className="text-left">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{i.nombre}</p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {i.codigo} · {i.categoria} · {i.sucursal}
                      </p>
                    </div>
                    <Pill clase={NIVEL_ESTILO[n].chip}>{n === "Bajo" ? "Bajo mínimo" : n}</Pill>
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <p className="text-[26px] font-bold leading-none tracking-tight">
                      {num(i.stock)}{" "}
                      <span className="text-xs font-semibold text-muted-foreground">
                        {i.unidad}
                      </span>
                    </p>
                    <p className="text-right text-[11px] text-muted-foreground">
                      mín. {i.minimo} · ideal {i.ideal}
                      <br />
                      <b className="text-foreground">{ars(i.stock * i.costo)}</b>
                    </p>
                  </div>
                  <div className="relative mt-2">
                    <Barra pct={(i.stock / tope) * 100} clase={NIVEL_ESTILO[n].barra} />
                    <span
                      className="absolute top-[-2px] h-3 w-0.5 rounded bg-rose-400"
                      style={{ left: `${(i.minimo / tope) * 100}%` }}
                      title="Mínimo"
                    />
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span>{prov(i.proveedorId)?.nombre ?? "Sin proveedor"}</span>
                    <span>·</span>
                    <span>{i.ubicacion}</span>
                    {dv !== null && (
                      <Pill
                        clase={
                          dv < 0
                            ? "bg-rose-100 text-rose-700"
                            : dv <= 60
                              ? "bg-amber-100 text-amber-700"
                              : "bg-muted text-muted-foreground"
                        }
                      >
                        <CalendarClock className="size-3" />
                        {dv < 0 ? `Vencido hace ${-dv} d` : `Vence ${fecha(i.vencimiento)}`}
                      </Pill>
                    )}
                  </div>
                </button>
                <div className="mt-auto flex items-center gap-1.5 border-t border-primary/10 pt-3">
                  <button
                    type="button"
                    aria-label={`Salida de 1 ${i.nombre}`}
                    className={BTN_ICONO}
                    disabled={i.stock <= 0}
                    onClick={() => {
                      registrarMovimiento({
                        insumoId: i.id,
                        tipo: "Salida",
                        cantidad: -1,
                        motivo: "Uso en gabinete",
                        usuario: ctx.usuario,
                        referencia: "",
                      });
                      ctx.onToast(`Salida: 1 ${i.unidad} de ${i.nombre}`);
                    }}
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Entrada de 1 ${i.nombre}`}
                    className={BTN_ICONO}
                    onClick={() => {
                      registrarMovimiento({
                        insumoId: i.id,
                        tipo: "Entrada",
                        cantidad: 1,
                        motivo: "Ingreso manual",
                        usuario: ctx.usuario,
                        referencia: "",
                      });
                      ctx.onToast(`Entrada: 1 ${i.unidad} de ${i.nombre}`);
                    }}
                  >
                    <Plus className="size-3.5" />
                  </button>
                  {n === "Normal" || n === "Exceso" ? (
                    <button
                      type="button"
                      className={`${BTN_SECUNDARIO} ml-auto`}
                      onClick={() => ctx.movimiento({ insumoId: i.id })}
                    >
                      <ArrowLeftRight className="size-4" />
                      Movimiento
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        aria-label="Registrar movimiento"
                        title="Registrar movimiento"
                        className={`${BTN_ICONO} ml-auto`}
                        onClick={() => ctx.movimiento({ insumoId: i.id })}
                      >
                        <ArrowLeftRight className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        className={BTN_PRIMARIO}
                        onClick={() => {
                          const o = reponer([i], ctx.usuario);
                          ctx.onToast(`Agregado a la orden ${o.join(", ")}`);
                        }}
                      >
                        <ShoppingCart className="size-4" />
                        Reponer
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    aria-label="Editar insumo"
                    className={BTN_ICONO}
                    onClick={() => onEditar(i)}
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Eliminar insumo"
                    className={BTN_ICONO}
                    onClick={() => setBorrar(i)}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {conteo && (
        <Modal titulo="Conteo físico" onClose={() => setConteo(false)} ancho="max-w-3xl">
          <ConteoFisico
            ctx={ctx}
            onCancel={() => setConteo(false)}
            onListo={(m) => {
              setConteo(false);
              ctx.onToast(m);
            }}
          />
        </Modal>
      )}
      {borrar && (
        <Modal titulo={`Eliminar ${borrar.nombre}`} onClose={() => setBorrar(null)}>
          <p className="text-sm text-muted-foreground">
            Se quita de <b className="text-foreground">{borrar.sucursal}</b> junto con su historial.
            Si solo querés dejar el stock en cero, registrá una merma o un ajuste.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className={BTN_SECUNDARIO} onClick={() => setBorrar(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className={`${BTN_PRIMARIO} !bg-rose-600`}
              onClick={() => {
                const id = borrar.id;
                setInventario("insumos", (p) => p.filter((x) => x.id !== id));
                setInventario("movimientos", (p) => p.filter((m) => m.insumoId !== id));
                ctx.onToast(`${borrar.nombre} eliminado`);
                setBorrar(null);
              }}
            >
              <Trash2 className="size-4" />
              Eliminar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ConteoFisico({
  ctx,
  onCancel,
  onListo,
}: {
  ctx: Ctx;
  onCancel: () => void;
  onListo: (m: string) => void;
}) {
  const [suc, setSuc] = useState(ctx.sucursales[0] ?? "");
  const [contado, setContado] = useState<Record<string, string>>({});
  const items = ctx.insumos.filter((i) => i.sucursal === suc);
  const difs = items
    .map((i) => ({ i, c: contado[i.id] }))
    .filter(
      (x): x is { i: Insumo; c: string } =>
        x.c !== undefined && x.c !== "" && Number(x.c) !== x.i.stock,
    );
  const valorDif = difs.reduce((a, { i, c }) => a + (Number(c) - i.stock) * i.costo, 0);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!difs.length) return onListo("Conteo sin diferencias: el stock coincide");
        for (const { i, c } of difs)
          registrarMovimiento({
            insumoId: i.id,
            tipo: "Ajuste",
            cantidad: Math.max(0, Number(c)) - i.stock,
            motivo: `Conteo físico (sistema ${i.stock}, contado ${c})`,
            usuario: ctx.usuario,
            referencia: "",
          });
        onListo(`Conteo aplicado: ${difs.length} ajustes en ${suc}`);
      }}
      className="space-y-3"
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-60">
          <Field label="Sucursal">
            <Sel
              value={suc}
              onChange={(v) => {
                setSuc(v);
                setContado({});
              }}
              opciones={ctx.sucursales}
            />
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">
          Cargá lo que contaste en el depósito. Solo se ajustan los que difieren.
        </p>
      </div>
      <ul className="max-h-[48vh] space-y-1.5 overflow-y-auto pr-1">
        {items.map((i) => {
          const c = contado[i.id];
          const d = c !== undefined && c !== "" ? Number(c) - i.stock : 0;
          return (
            <li
              key={i.id}
              className="flex items-center gap-3 rounded-xl bg-primary/[0.035] px-3 py-2 ring-1 ring-primary/10"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{i.nombre}</p>
                <p className="text-[11px] text-muted-foreground">
                  Sistema: {num(i.stock)} {i.unidad} · {i.ubicacion}
                </p>
              </div>
              {d !== 0 && (
                <Pill
                  clase={d > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}
                >
                  {d > 0 ? "+" : ""}
                  {num(d)}
                </Pill>
              )}
              <input
                type="number"
                min={0}
                aria-label={`Contado ${i.nombre}`}
                value={c ?? ""}
                placeholder={String(i.stock)}
                onChange={(e) => setContado((p) => ({ ...p, [i.id]: e.target.value }))}
                className={`${INPUT} w-24 text-right`}
              />
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-primary/[0.05] px-3 py-2 text-xs">
        <span>
          <b>{difs.length}</b> diferencias
        </span>
        <span>
          Impacto:{" "}
          <b className={valorDif < 0 ? "text-rose-600" : "text-emerald-600"}>{ars(valorDif)}</b>
        </span>
      </div>
      <Acciones etiqueta="Aplicar conteo" onCancel={onCancel} icon={ClipboardCheck} />
    </form>
  );
}

/* ───────────── Formularios ───────────── */

const PREFIJO: Record<Categoria, string> = {
  Protección: "PRO",
  Anestesia: "ANE",
  Operatoria: "OPE",
  Endodoncia: "END",
  Ortodoncia: "ORT",
  Cirugía: "CIR",
  Esterilización: "EST",
  Higiene: "HIG",
  Descartables: "DES",
};

function InsumoForm({
  inicial,
  ctx,
  onCancel,
  onGuardado,
}: {
  inicial: Insumo | null;
  ctx: Ctx;
  onCancel: () => void;
  onGuardado: (m: string) => void;
}) {
  const { proveedores, insumos } = storeInventario.usar();
  const [f, setF] = useState({
    nombre: inicial?.nombre ?? "",
    codigo: inicial?.codigo ?? "",
    categoria: inicial?.categoria ?? ("Protección" as Categoria),
    sucursal: inicial?.sucursal ?? ctx.sucursales[0] ?? "",
    proveedorId: inicial?.proveedorId ?? proveedores[0]?.id ?? "",
    stock: String(inicial?.stock ?? 0),
    unidad: inicial?.unidad ?? ("cajas" as Unidad),
    minimo: String(inicial?.minimo ?? 5),
    ideal: String(inicial?.ideal ?? 15),
    costo: String(inicial?.costo ?? ""),
    lote: inicial?.lote ?? "",
    vencimiento: inicial?.vencimiento ?? "",
    ubicacion: inicial?.ubicacion ?? "Depósito",
  });
  const [error, setError] = useState("");
  const set = (c: Partial<typeof f>) => setF((p) => ({ ...p, ...c }));
  const generarCodigo = () => {
    const pref = PREFIJO[f.categoria];
    const n = insumos
      .filter((i) => i.codigo.startsWith(pref))
      .map((i) => Number(i.codigo.split("-")[1]) || 0);
    set({ codigo: `${pref}-${String(Math.max(0, ...n) + 1).padStart(3, "0")}` });
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!f.nombre.trim()) return setError("Escribí el nombre del insumo.");
        if (Number(f.minimo) < 0 || Number(f.ideal) < Number(f.minimo))
          return setError("El stock ideal tiene que ser mayor o igual al mínimo.");
        if (!(Number(f.costo) > 0)) return setError("Indicá el costo por unidad.");
        const datos = {
          nombre: mayuscula(f.nombre),
          codigo:
            f.codigo.trim().toUpperCase() ||
            `${PREFIJO[f.categoria]}-${Date.now().toString().slice(-3)}`,
          categoria: f.categoria,
          sucursal: f.sucursal,
          proveedorId: f.proveedorId,
          unidad: f.unidad,
          minimo: Number(f.minimo),
          ideal: Number(f.ideal),
          costo: Number(f.costo),
          lote: f.lote.trim(),
          vencimiento: f.vencimiento,
          ubicacion: f.ubicacion.trim() || "Depósito",
        };
        if (inicial) {
          setInventario("insumos", (p) =>
            p.map((i) => (i.id === inicial.id ? { ...i, ...datos } : i)),
          );
          const nuevoStock = Math.max(0, Number(f.stock));
          if (nuevoStock !== inicial.stock)
            registrarMovimiento({
              insumoId: inicial.id,
              tipo: "Ajuste",
              cantidad: nuevoStock - inicial.stock,
              motivo: "Corrección desde la ficha",
              usuario: ctx.usuario,
              referencia: "",
            });
          return onGuardado(`${datos.nombre} actualizado`);
        }
        const id = `i-${Date.now()}`;
        setInventario("insumos", (p) => [...p, { ...datos, id, stock: 0 }]);
        const stock = Math.max(0, Number(f.stock));
        if (stock > 0)
          registrarMovimiento({
            insumoId: id,
            tipo: "Entrada",
            cantidad: stock,
            motivo: "Stock inicial",
            usuario: ctx.usuario,
            referencia: "",
          });
        onGuardado(`${datos.nombre} agregado a ${datos.sucursal}`);
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_170px]">
        <Field label="Nombre *">
          <input
            autoFocus
            value={f.nombre}
            onChange={(e) => set({ nombre: e.target.value })}
            className={INPUT}
            placeholder="Ej: Guantes de nitrilo talle S"
          />
        </Field>
        <Field label="Código">
          <div className="flex gap-1.5">
            <input
              value={f.codigo}
              onChange={(e) => set({ codigo: e.target.value })}
              className={`${INPUT} font-mono uppercase`}
              placeholder="PRO-003"
            />
            <button
              type="button"
              title="Generar código"
              aria-label="Generar código"
              className={BTN_ICONO}
              onClick={generarCodigo}
            >
              <Sparkles className="size-3.5" />
            </button>
          </div>
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Categoría">
          <Sel value={f.categoria} onChange={(v) => set({ categoria: v })} opciones={CATEGORIAS} />
        </Field>
        <Field label="Sucursal">
          <Sel
            value={f.sucursal}
            onChange={(v) => set({ sucursal: v })}
            opciones={ctx.sucursales}
          />
        </Field>
        <Field label="Proveedor">
          <Sel
            value={f.proveedorId}
            onChange={(v) => set({ proveedorId: v })}
            opciones={proveedores.map((p) => ({ value: p.id, label: p.nombre }))}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Field label={inicial ? "Stock actual" : "Stock inicial"}>
          <input
            type="number"
            min={0}
            value={f.stock}
            onChange={(e) => set({ stock: e.target.value })}
            className={INPUT}
          />
        </Field>
        <Field label="Unidad">
          <Sel value={f.unidad} onChange={(v) => set({ unidad: v })} opciones={UNIDADES} />
        </Field>
        <Field label="Mínimo">
          <input
            type="number"
            min={0}
            value={f.minimo}
            onChange={(e) => set({ minimo: e.target.value })}
            className={INPUT}
          />
        </Field>
        <Field label="Ideal">
          <input
            type="number"
            min={0}
            value={f.ideal}
            onChange={(e) => set({ ideal: e.target.value })}
            className={INPUT}
          />
        </Field>
        <Field label="Costo unit. *">
          <input
            type="number"
            min={0}
            value={f.costo}
            onChange={(e) => set({ costo: e.target.value })}
            className={INPUT}
            placeholder="0"
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Lote">
          <input
            value={f.lote}
            onChange={(e) => set({ lote: e.target.value })}
            className={INPUT}
            placeholder="Opcional"
          />
        </Field>
        <Field label="Vencimiento">
          <input
            type="date"
            value={f.vencimiento}
            onChange={(e) => set({ vencimiento: e.target.value })}
            className={INPUT}
          />
        </Field>
        <Field label="Ubicación">
          <input
            value={f.ubicacion}
            onChange={(e) => set({ ubicacion: e.target.value })}
            className={INPUT}
            placeholder="Ej: Estante A1"
          />
        </Field>
      </div>
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      <Acciones etiqueta={inicial ? "Guardar cambios" : "Agregar insumo"} onCancel={onCancel} />
    </form>
  );
}

function MovimientoForm({
  ctx,
  inicial,
  onCancel,
  onGuardado,
}: {
  ctx: Ctx;
  inicial: { insumoId?: string; tipo?: TipoMovimiento; destino?: string };
  onCancel: () => void;
  onGuardado: (m: string) => void;
}) {
  const [tipo, setTipo] = useState<TipoMovimiento>(inicial.tipo ?? "Salida");
  const primero = ctx.insumos.find((i) => i.id === inicial.insumoId) ?? ctx.insumos[0];
  const [suc, setSuc] = useState(primero?.sucursal ?? ctx.sucursales[0] ?? "");
  const [insumoId, setInsumoId] = useState(primero?.id ?? "");
  const [cantidad, setCantidad] = useState("1");
  const [motivo, setMotivo] = useState("");
  const [destino, setDestino] = useState(
    inicial.destino ?? ctx.sucursales.find((s) => s !== primero?.sucursal) ?? "",
  );
  const [lote, setLote] = useState("");
  const [venc, setVenc] = useState("");
  const [error, setError] = useState("");
  const delSuc = ctx.insumos.filter((i) => i.sucursal === suc);
  const ins = ctx.insumos.find((i) => i.id === insumoId);
  const MOTIVOS: Record<TipoMovimiento, string[]> = {
    Entrada: ["Compra a proveedor", "Devolución", "Muestra gratis"],
    Salida: ["Uso en gabinete", "Tratamiento de paciente", "Uso en esterilización"],
    Ajuste: ["Conteo físico", "Error de carga"],
    Transferencia: ["Falta en la sede destino", "Redistribución de stock"],
    Merma: ["Vencido", "Roto o dañado", "Contaminado"],
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!ins) return setError("Elegí un insumo.");
        const n = Number(cantidad);
        if (tipo === "Ajuste") {
          if (!(n >= 0)) return setError("Indicá el stock real contado.");
          if (n === ins.stock) return setError("El stock contado es igual al del sistema.");
          registrarMovimiento({
            insumoId: ins.id,
            tipo,
            cantidad: n - ins.stock,
            motivo: motivo || "Ajuste de stock",
            usuario: ctx.usuario,
            referencia: "",
          });
          return onGuardado(`Stock de ${ins.nombre} ajustado a ${n}`);
        }
        if (!(n > 0)) return setError("La cantidad tiene que ser mayor a cero.");
        if (tipo !== "Entrada" && n > ins.stock)
          return setError(`Solo hay ${ins.stock} ${ins.unidad} disponibles.`);
        if (tipo === "Transferencia") {
          if (!destino || destino === ins.sucursal)
            return setError("Elegí una sucursal destino distinta.");
          transferir(ins.id, destino, n, ctx.usuario, motivo);
          return onGuardado(`${n} ${ins.unidad} de ${ins.nombre} enviados a ${destino}`);
        }
        registrarMovimiento({
          insumoId: ins.id,
          tipo,
          cantidad: tipo === "Entrada" ? n : -n,
          motivo: motivo || MOTIVOS[tipo][0]!,
          usuario: ctx.usuario,
          referencia: "",
        });
        if (tipo === "Entrada" && (lote || venc))
          setInventario("insumos", (p) =>
            p.map((i) =>
              i.id === ins.id
                ? { ...i, ...(lote ? { lote } : {}), ...(venc ? { vencimiento: venc } : {}) }
                : i,
            ),
          );
        onGuardado(`${tipo} registrada: ${n} ${ins.unidad} de ${ins.nombre}`);
      }}
      className="space-y-3"
    >
      <div className="flex flex-wrap gap-1 rounded-2xl bg-primary/[0.04] p-1">
        {TIPOS_MOVIMIENTO.filter((t) => t !== "Transferencia" || ctx.sucursales.length > 1).map(
          (t) => {
            const I = MOV_ESTILO[t].icon;
            return (
              <button
                key={t}
                type="button"
                className={CHIP(tipo === t)}
                onClick={() => {
                  setTipo(t);
                  setMotivo("");
                  setError("");
                }}
              >
                <I className="size-3.5" /> {t}
              </button>
            );
          },
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Sucursal">
          <Sel
            value={suc}
            onChange={(v) => {
              setSuc(v);
              setInsumoId(ctx.insumos.find((i) => i.sucursal === v)?.id ?? "");
              if (destino === v) setDestino(ctx.sucursales.find((s) => s !== v) ?? "");
            }}
            opciones={ctx.sucursales}
          />
        </Field>
        <Field label="Insumo">
          <Sel
            value={insumoId}
            onChange={setInsumoId}
            etiqueta="Insumo"
            opciones={delSuc.map((i) => ({
              value: i.id,
              label: `${i.nombre} (${num(i.stock)} ${i.unidad})`,
            }))}
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={tipo === "Ajuste" ? "Stock real contado" : "Cantidad"}>
          <input
            type="number"
            min={0}
            step="any"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            className={INPUT}
            aria-label="Cantidad"
          />
        </Field>
        {tipo === "Transferencia" ? (
          <Field label="Sucursal destino">
            <Sel
              value={destino}
              onChange={setDestino}
              opciones={ctx.sucursales.filter((s) => s !== suc)}
            />
          </Field>
        ) : (
          <Field label="Motivo">
            <input
              list="motivos-mov"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className={INPUT}
              placeholder={MOTIVOS[tipo][0]}
            />
            <datalist id="motivos-mov">
              {MOTIVOS[tipo].map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </Field>
        )}
      </div>
      {tipo === "Entrada" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Lote (opcional)">
            <input
              value={lote}
              onChange={(e) => setLote(e.target.value)}
              className={INPUT}
              placeholder={ins?.lote || "Ej: LD-8001"}
            />
          </Field>
          <Field label="Vencimiento (opcional)">
            <input
              type="date"
              value={venc}
              onChange={(e) => setVenc(e.target.value)}
              className={INPUT}
            />
          </Field>
        </div>
      )}
      {ins && (
        <p className="rounded-xl bg-primary/[0.05] px-3 py-2 text-xs text-muted-foreground">
          Stock actual en {ins.sucursal}:{" "}
          <b className="text-foreground">
            {num(ins.stock)} {ins.unidad}
          </b>
          {tipo !== "Ajuste" && Number(cantidad) > 0 && (
            <>
              {" "}
              → queda en{" "}
              <b className="text-foreground">
                {num(
                  Math.max(
                    0,
                    ins.stock + (tipo === "Entrada" ? Number(cantidad) : -Number(cantidad)),
                  ),
                )}
              </b>
            </>
          )}
        </p>
      )}
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      <Acciones etiqueta="Registrar" onCancel={onCancel} icon={MOV_ESTILO[tipo].icon} />
    </form>
  );
}

function OrdenForm({
  ctx,
  base,
  editando,
  onCancel,
  onGuardado,
}: {
  ctx: Ctx;
  base: Partial<OrdenCompra>;
  editando: boolean;
  onCancel: () => void;
  onGuardado: (m: string) => void;
}) {
  const { proveedores, ordenes } = storeInventario.usar();
  const [proveedorId, setProveedorId] = useState(base.proveedorId ?? proveedores[0]?.id ?? "");
  const [sucursal, setSucursal] = useState(base.sucursal ?? ctx.sucursales[0] ?? "");
  const prov = proveedores.find((p) => p.id === proveedorId);
  const [esperada, setEsperada] = useState(base.esperada ?? sumarDias(diaISO(), prov?.plazo ?? 3));
  const [items, setItems] = useState<ItemOrden[]>(base.items ?? []);
  const [nota, setNota] = useState(base.nota ?? "");
  const [error, setError] = useState("");
  const delSuc = ctx.insumos.filter((i) => i.sucursal === sucursal);
  const sugeridos = delSuc.filter(
    (i) =>
      i.proveedorId === proveedorId &&
      ["Bajo", "Agotado"].includes(nivelStock(i)) &&
      !items.some((it) => it.insumoId === i.id),
  );
  const total = items.reduce((a, it) => a + it.cantidad * it.precio, 0);
  const guardar = (estado: EstadoOrden) => {
    const validos = items.filter((it) => it.insumoId && it.cantidad > 0);
    if (!validos.length) return setError("Agregá al menos un insumo con cantidad.");
    const datos = { proveedorId, sucursal, esperada, items: validos, nota: nota.trim() };
    if (editando && base.id) {
      const id = base.id;
      setInventario("ordenes", (p) => p.map((o) => (o.id === id ? { ...o, ...datos, estado } : o)));
      return onGuardado(
        estado === "Enviada" ? `Orden ${id} enviada a ${prov?.nombre}` : `Orden ${id} actualizada`,
      );
    }
    const id = siguienteNumeroOrden(ordenes);
    setInventario("ordenes", (p) => [{ id, fecha: diaISO(), estado, ...datos }, ...p]);
    onGuardado(
      estado === "Enviada"
        ? `Orden ${id} enviada a ${prov?.nombre}`
        : `Orden ${id} guardada como borrador`,
    );
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        guardar("Enviada");
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Proveedor">
          <Sel
            value={proveedorId}
            onChange={(v) => {
              setProveedorId(v);
              setEsperada(sumarDias(diaISO(), proveedores.find((p) => p.id === v)?.plazo ?? 3));
            }}
            opciones={proveedores.map((p) => ({ value: p.id, label: p.nombre }))}
          />
        </Field>
        <Field label="Entregar en">
          <Sel
            value={sucursal}
            onChange={(v) => {
              setSucursal(v);
              setItems([]);
            }}
            opciones={ctx.sucursales}
          />
        </Field>
        <Field label="Entrega esperada">
          <input
            type="date"
            value={esperada}
            onChange={(e) => setEsperada(e.target.value)}
            className={INPUT}
          />
        </Field>
      </div>
      {sugeridos.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
          <Sparkles className="size-3.5" />
          {sugeridos.length} insumos de este proveedor están bajo mínimo.
          <button
            type="button"
            className="font-semibold underline"
            onClick={() =>
              setItems((p) => [
                ...p,
                ...sugeridos.map((i) => ({
                  insumoId: i.id,
                  cantidad: cantidadSugerida(i),
                  precio: i.costo,
                })),
              ])
            }
          >
            Agregarlos
          </button>
        </div>
      )}
      <div className="space-y-1.5">
        <div className="hidden grid-cols-[1fr_90px_120px_110px_32px] gap-2 px-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground sm:grid">
          <span>Insumo</span>
          <span>Cantidad</span>
          <span>Precio unit.</span>
          <span className="text-right">Subtotal</span>
          <span />
        </div>
        {items.map((it, n) => (
          <div
            key={n}
            className="grid grid-cols-[1fr_32px] gap-2 rounded-xl bg-primary/[0.035] p-2 ring-1 ring-primary/10 sm:grid-cols-[1fr_90px_120px_110px_32px] sm:items-center"
          >
            <Sel
              value={it.insumoId}
              etiqueta="Insumo de la orden"
              onChange={(v) =>
                setItems((p) =>
                  p.map((x, k) =>
                    k === n
                      ? {
                          ...x,
                          insumoId: v,
                          precio: delSuc.find((i) => i.id === v)?.costo ?? x.precio,
                        }
                      : x,
                  ),
                )
              }
              opciones={[
                { value: "", label: "Elegí un insumo" },
                ...delSuc.map((i) => ({ value: i.id, label: `${i.nombre} (${num(i.stock)})` })),
              ]}
            />
            <button
              type="button"
              aria-label="Quitar renglón"
              className={`${BTN_ICONO} sm:order-last`}
              onClick={() => setItems((p) => p.filter((_, k) => k !== n))}
            >
              <X className="size-3.5" />
            </button>
            <input
              type="number"
              min={1}
              aria-label="Cantidad del renglón"
              value={it.cantidad}
              onChange={(e) =>
                setItems((p) =>
                  p.map((x, k) => (k === n ? { ...x, cantidad: Number(e.target.value) } : x)),
                )
              }
              className={INPUT}
            />
            <input
              type="number"
              min={0}
              aria-label="Precio del renglón"
              value={it.precio}
              onChange={(e) =>
                setItems((p) =>
                  p.map((x, k) => (k === n ? { ...x, precio: Number(e.target.value) } : x)),
                )
              }
              className={INPUT}
            />
            <span className="text-right text-sm font-semibold">{ars(it.cantidad * it.precio)}</span>
          </div>
        ))}
        <button
          type="button"
          className={BTN_SECUNDARIO}
          onClick={() =>
            setItems((p) => [
              ...p,
              { insumoId: delSuc[0]?.id ?? "", cantidad: 1, precio: delSuc[0]?.costo ?? 0 },
            ])
          }
        >
          <Plus className="size-4" />
          Agregar renglón
        </button>
      </div>
      <Field label="Nota para el proveedor">
        <input
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          className={INPUT}
          placeholder="Opcional"
        />
      </Field>
      <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-primary/[0.08] to-fuchsia-500/[0.06] px-4 py-3">
        <span className="text-sm text-muted-foreground">{items.length} renglones</span>
        <span className="text-lg font-bold text-primary">{ars(total)}</span>
      </div>
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      <Acciones
        etiqueta="Guardar y enviar"
        onCancel={onCancel}
        icon={Send}
        extra={
          <button type="button" className={BTN_SECUNDARIO} onClick={() => guardar("Borrador")}>
            <ClipboardList className="size-4" />
            Guardar borrador
          </button>
        }
      />
    </form>
  );
}

/* ───────────── Detalle de insumo ───────────── */

function DetalleInsumo({
  id,
  ctx,
  onClose,
  onEditar,
}: {
  id: string;
  ctx: Ctx;
  onClose: () => void;
  onEditar: (i: Insumo) => void;
}) {
  const { insumos, movimientos, proveedores } = storeInventario.usar();
  const i = insumos.find((x) => x.id === id);
  if (!i) return null;
  const movs = movimientos.filter((m) => m.insumoId === id);
  const prov = proveedores.find((p) => p.id === i.proveedorId);
  const hace30 = Date.now() - 30 * 86_400_000;
  const uso30 = movs
    .filter((m) => ["Salida", "Merma"].includes(m.tipo) && new Date(m.fecha).getTime() >= hace30)
    .reduce((a, m) => a - m.cantidad, 0);
  const diario = uso30 / 30;
  const dias = diario > 0 ? Math.floor(i.stock / diario) : null;
  const n = nivelStock(i);
  return (
    <Modal titulo={i.nombre} onClose={onClose} ancho="max-w-2xl">
      <div className="flex flex-wrap items-center gap-2">
        <Pill clase={NIVEL_ESTILO[n].chip}>{n}</Pill>
        <Pill clase="bg-muted text-muted-foreground">{i.codigo}</Pill>
        <Pill clase="bg-primary/10 text-primary">{i.sucursal}</Pill>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Stock", `${num(i.stock)} ${i.unidad}`],
          ["Valorizado", ars(i.stock * i.costo)],
          ["Uso 30 días", `${num(uso30)} ${i.unidad}`],
          ["Alcanza para", dias === null ? "Sin consumo" : `${dias} días`],
          ["Mínimo / ideal", `${i.minimo} / ${i.ideal}`],
          ["Costo unit.", ars(i.costo)],
          ["Lote", i.lote || "—"],
          ["Vence", fecha(i.vencimiento)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-primary/[0.045] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {k}
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold">{v}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Proveedor: <b className="text-foreground">{prov?.nombre ?? "—"}</b>
        {prov && ` · entrega en ${prov.plazo} días · ${prov.telefono}`} · Ubicación:{" "}
        <b className="text-foreground">{i.ubicacion}</b>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={BTN_SECUNDARIO}
          onClick={() => {
            onClose();
            ctx.movimiento({ insumoId: i.id });
          }}
        >
          <ArrowLeftRight className="size-4" />
          Movimiento
        </button>
        <button type="button" className={BTN_SECUNDARIO} onClick={() => onEditar(i)}>
          <Pencil className="size-4" />
          Editar
        </button>
        <button
          type="button"
          className={BTN_PRIMARIO}
          onClick={() => {
            const o = reponer([i], ctx.usuario);
            ctx.onToast(`Agregado a la orden ${o.join(", ")}`);
          }}
        >
          <ShoppingCart className="size-4" />
          Reponer {cantidadSugerida(i)}
        </button>
      </div>
      <p className="mt-4 text-sm font-semibold">Historial</p>
      {movs.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">Todavía no tiene movimientos.</p>
      ) : (
        <ul className="mt-2 max-h-64 space-y-1.5 overflow-y-auto pr-1">
          {movs.map((m) => (
            <FilaMovimiento key={m.id} m={m} />
          ))}
        </ul>
      )}
    </Modal>
  );
}

function FilaMovimiento({ m, insumo }: { m: Movimiento; insumo?: Insumo | undefined }) {
  const E = MOV_ESTILO[m.tipo];
  return (
    <li className="flex items-center gap-3 rounded-xl bg-white/80 px-3 py-2 ring-1 ring-primary/10">
      <span className={`grid size-8 shrink-0 place-items-center rounded-full ${E.clase}`}>
        <E.icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold">
          {insumo ? `${insumo.nombre} · ${insumo.sucursal}` : m.tipo}
          {m.referencia.startsWith("OC-") && (
            <span className="font-normal text-muted-foreground"> · {m.referencia}</span>
          )}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {insumo ? `${m.tipo} · ` : ""}
          {m.motivo} · {m.usuario} · {fechaHora(m.fecha)}
        </p>
      </div>
      <span
        className={`shrink-0 text-sm font-bold ${m.cantidad >= 0 ? "text-emerald-600" : "text-rose-600"}`}
      >
        {m.cantidad > 0 ? "+" : ""}
        {num(m.cantidad)}
      </span>
    </li>
  );
}

/* ───────────── Movimientos ───────────── */

function Movimientos({ ctx }: { ctx: Ctx }) {
  const { movimientos, insumos } = storeInventario.usar();
  const [tipo, setTipo] = useState<"" | TipoMovimiento>("");
  const [suc, setSuc] = useState("");
  const [q, setQ] = useState("");
  const [limite, setLimite] = useState(25);
  const porId = useMemo(() => new Map(insumos.map((i) => [i.id, i])), [insumos]);
  const visibles = movimientos.filter((m) => {
    const i = porId.get(m.insumoId);
    if (!i || !ctx.sucursales.includes(i.sucursal)) return false;
    if (tipo && m.tipo !== tipo) return false;
    if (suc && i.sucursal !== suc) return false;
    return (
      !q ||
      normalizarBusqueda(`${i.nombre} ${m.motivo} ${m.usuario}`).includes(normalizarBusqueda(q))
    );
  });
  const entradas = visibles
    .filter((m) => m.cantidad > 0)
    .reduce((a, m) => a + m.cantidad * (porId.get(m.insumoId)?.costo ?? 0), 0);
  const salidas = visibles
    .filter((m) => m.cantidad < 0)
    .reduce((a, m) => a - m.cantidad * (porId.get(m.insumoId)?.costo ?? 0), 0);
  return (
    <div className="space-y-3">
      <Encabezado
        icon={History}
        titulo="Movimientos de stock"
        descripcion="Cada entrada, salida, ajuste, transferencia y merma con quién la hizo y cuándo."
      >
        <button
          type="button"
          className={BTN_SECUNDARIO}
          onClick={() =>
            descargarCSV(`movimientos-${diaISO()}.csv`, [
              [
                "Fecha",
                "Tipo",
                "Insumo",
                "Sucursal",
                "Cantidad",
                "Motivo",
                "Usuario",
                "Referencia",
              ],
              ...visibles.map((m) => {
                const i = porId.get(m.insumoId);
                return [
                  fechaHora(m.fecha),
                  m.tipo,
                  i?.nombre ?? "",
                  i?.sucursal ?? "",
                  m.cantidad,
                  m.motivo,
                  m.usuario,
                  m.referencia.startsWith("OC-") ? m.referencia : "",
                ];
              }),
            ])
          }
        >
          <Download className="size-4" />
          Exportar
        </button>
        <button type="button" className={BTN_PRIMARIO} onClick={() => ctx.movimiento({})}>
          <Plus className="size-4" />
          Registrar movimiento
        </button>
      </Encabezado>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Mini label="Movimientos" valor={String(visibles.length)} icon={History} />
        <Mini
          label="Ingresó (valorizado)"
          valor={ars(entradas)}
          icon={ArrowDownLeft}
          tono="text-emerald-600"
        />
        <Mini
          label="Salió (valorizado)"
          valor={ars(salidas)}
          icon={ArrowUpRight}
          tono="text-rose-600"
        />
      </div>
      <div className="card-grad space-y-2.5 p-3">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary/60" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar insumo, motivo o persona"
              className={`${INPUT} pl-9`}
            />
          </div>
          <Sel
            value={suc}
            onChange={setSuc}
            etiqueta="Sucursal"
            opciones={[
              { value: "", label: "Todas las sucursales" },
              ...ctx.sucursales.map((s) => ({ value: s, label: s })),
            ]}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <button type="button" className={CHIP(!tipo)} onClick={() => setTipo("")}>
            Todos
          </button>
          {TIPOS_MOVIMIENTO.map((t) => (
            <button key={t} type="button" className={CHIP(tipo === t)} onClick={() => setTipo(t)}>
              {t}
            </button>
          ))}
        </div>
        {visibles.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No hay movimientos con esos filtros.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {visibles.slice(0, limite).map((m) => (
              <FilaMovimiento key={m.id} m={m} insumo={porId.get(m.insumoId)} />
            ))}
          </ul>
        )}
        {visibles.length > limite && (
          <div className="text-center">
            <button
              type="button"
              className={BTN_SECUNDARIO}
              onClick={() => setLimite((l) => l + 25)}
            >
              Ver más ({visibles.length - limite})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────── Alertas ───────────── */

function Alertas({ ctx }: { ctx: Ctx }) {
  const { proveedores, pedidos } = storeInventario.usar();
  const reponerLista = ctx.insumos.filter((i) => ["Bajo", "Agotado"].includes(nivelStock(i)));
  const vence = ctx.insumos
    .map((i) => ({ i, d: diasParaVencer(i) }))
    .filter((x): x is { i: Insumo; d: number } => x.d !== null && x.d <= 60 && x.i.stock > 0)
    .sort((a, b) => a.d - b.d);
  const exceso = ctx.insumos.filter((i) => nivelStock(i) === "Exceso");
  const pend = pedidos.filter(
    (p) => p.estado === "Pendiente" && ctx.sucursales.includes(p.sucursal),
  );
  const prov = (id: string) => proveedores.find((p) => p.id === id)?.nombre ?? "—";

  return (
    <div className="space-y-3">
      <Encabezado
        icon={AlertTriangle}
        titulo="Alertas"
        descripcion="Lo que hay que reponer, lo que está por vencer y lo que pidió el equipo."
      >
        {reponerLista.length > 0 && (
          <button
            type="button"
            className={BTN_PRIMARIO}
            onClick={() => {
              const o = reponer(reponerLista, ctx.usuario);
              ctx.onToast(`Listo: ${o.length} órdenes en borrador (${o.join(", ")})`);
              ctx.ir("ordenes");
            }}
          >
            <Sparkles className="size-4" />
            Generar órdenes sugeridas
          </button>
        )}
      </Encabezado>

      {pend.length > 0 && (
        <div className="card-grad p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <MessageCircle className="size-4 text-primary" /> Pedidos del equipo
          </p>
          <ul className="mt-2 space-y-1.5">
            {pend.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-3 rounded-xl bg-white/80 px-3 py-2 ring-1 ring-primary/10"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{p.detalle}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {p.autor} · {p.sucursal} · {fechaHora(p.fecha)}
                  </p>
                </div>
                <button
                  type="button"
                  className={BTN_SECUNDARIO}
                  onClick={() => {
                    setInventario("pedidos", (prev) =>
                      prev.map((x) => (x.id === p.id ? { ...x, estado: "Resuelto" } : x)),
                    );
                    ctx.onToast(`Pedido de ${p.autor} marcado como resuelto`);
                  }}
                >
                  <Check className="size-4" />
                  Resuelto
                </button>
                <button
                  type="button"
                  className={BTN_PRIMARIO}
                  onClick={() => ctx.nuevaOrden({ sucursal: p.sucursal })}
                >
                  <ShoppingCart className="size-4" />
                  Crear orden
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="card-grad p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Package className="size-4 text-amber-600" /> Para reponer ({reponerLista.length})
          </p>
          {reponerLista.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Todo el stock está sobre el mínimo.
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {reponerLista.map((i) => (
                <li
                  key={i.id}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 ring-1 ${nivelStock(i) === "Agotado" ? "bg-rose-50/80 ring-rose-200" : "bg-amber-50/70 ring-amber-200"}`}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => ctx.abrirInsumo(i.id)}
                  >
                    <p className="truncate text-sm font-semibold">{i.nombre}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {i.sucursal} · quedan{" "}
                      <b className="text-foreground">
                        {num(i.stock)} {i.unidad}
                      </b>{" "}
                      (mín. {i.minimo}) · {prov(i.proveedorId)}
                    </p>
                  </button>
                  <button
                    type="button"
                    className={BTN_PRIMARIO}
                    onClick={() => {
                      const o = reponer([i], ctx.usuario);
                      ctx.onToast(`${cantidadSugerida(i)} ${i.unidad} agregados a ${o.join(", ")}`);
                    }}
                  >
                    <ShoppingCart className="size-4" />
                    Reponer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card-grad p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <CalendarClock className="size-4 text-rose-600" /> Vencimientos (60 días)
          </p>
          {vence.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">No hay insumos por vencer.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {vence.map(({ i, d }) => (
                <li
                  key={i.id}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 ring-1 ${d < 0 ? "bg-rose-50/80 ring-rose-200" : "bg-white/80 ring-primary/10"}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{i.nombre}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {i.sucursal} · lote {i.lote || "—"} · {num(i.stock)} {i.unidad} ·{" "}
                      <b className={d < 0 ? "text-rose-600" : "text-amber-700"}>
                        {d < 0
                          ? `vencido hace ${-d} días`
                          : d === 0
                            ? "vence hoy"
                            : `vence en ${d} días`}
                      </b>
                    </p>
                  </div>
                  {d < 0 ? (
                    <button
                      type="button"
                      className={BTN_SECUNDARIO}
                      onClick={() => {
                        registrarMovimiento({
                          insumoId: i.id,
                          tipo: "Merma",
                          cantidad: -i.stock,
                          motivo: `Vencido (lote ${i.lote || "s/d"})`,
                          usuario: ctx.usuario,
                          referencia: "",
                        });
                        ctx.onToast(`${i.nombre}: se dio de baja el lote vencido`);
                      }}
                    >
                      <Trash2 className="size-4" />
                      Dar de baja
                    </button>
                  ) : (
                    ctx.sucursales.length > 1 && (
                      <button
                        type="button"
                        className={BTN_SECUNDARIO}
                        onClick={() => ctx.movimiento({ insumoId: i.id, tipo: "Transferencia" })}
                      >
                        <ArrowLeftRight className="size-4" />
                        Transferir
                      </button>
                    )
                  )}
                </li>
              ))}
            </ul>
          )}
          {exceso.length > 0 && (
            <>
              <p className="mt-4 flex items-center gap-2 text-sm font-semibold">
                <Boxes className="size-4 text-sky-600" /> Stock en exceso
              </p>
              <ul className="mt-2 space-y-1.5">
                {exceso.map((i) => (
                  <li
                    key={i.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-sky-50/70 px-3 py-2 text-xs ring-1 ring-sky-200"
                  >
                    <span className="truncate">
                      <b>{i.nombre}</b> · {i.sucursal}
                    </span>
                    <span className="shrink-0 font-semibold text-sky-700">
                      {num(i.stock)} / ideal {i.ideal}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────── Órdenes de compra ───────────── */

function imprimirOrden(o: OrdenCompra, p: Proveedor | undefined, insumos: Insumo[]) {
  const w = window.open("", "_blank", "width=820,height=900");
  if (!w) return;
  const filas = o.items
    .map((it) => {
      const i = insumos.find((x) => x.id === it.insumoId);
      return `<tr><td>${i?.codigo ?? ""}</td><td>${i?.nombre ?? ""}</td><td style="text-align:right">${it.cantidad} ${i?.unidad ?? ""}</td><td style="text-align:right">${ars(it.precio)}</td><td style="text-align:right">${ars(it.cantidad * it.precio)}</td></tr>`;
    })
    .join("");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${o.id}</title>
<style>body{font-family:system-ui,sans-serif;color:#1f1b2e;padding:32px}h1{color:#6d28d9;margin:0}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{padding:8px;border-bottom:1px solid #e9e3fb;font-size:13px}th{text-align:left;background:#f5f1ff}.tot{font-size:18px;font-weight:700;text-align:right;margin-top:14px;color:#6d28d9}.meta{display:flex;justify-content:space-between;margin-top:16px;font-size:13px}</style>
</head><body><h1>Orden de compra ${o.id}</h1><div class="meta"><div><b>Proveedor:</b> ${p?.nombre ?? ""}<br>${p?.contacto ?? ""} · ${p?.telefono ?? ""}<br>${p?.email ?? ""}</div><div><b>Fecha:</b> ${fecha(o.fecha)}<br><b>Entrega:</b> ${fecha(o.esperada)} en ${o.sucursal}<br><b>Condición:</b> ${p?.condicion ?? ""}</div></div>
<table><thead><tr><th>Código</th><th>Insumo</th><th style="text-align:right">Cantidad</th><th style="text-align:right">Precio</th><th style="text-align:right">Subtotal</th></tr></thead><tbody>${filas}</tbody></table>
<p class="tot">Total ${ars(totalOrden(o))}</p>${o.nota ? `<p><b>Nota:</b> ${o.nota}</p>` : ""}<script>window.onload=()=>window.print()</script></body></html>`);
  w.document.close();
}

function Ordenes({ ctx, onEditar }: { ctx: Ctx; onEditar: (o: OrdenCompra) => void }) {
  const { ordenes, proveedores, insumos } = storeInventario.usar();
  const [filtro, setFiltro] = useState<"" | EstadoOrden>("");
  const [recibir, setRecibir] = useState<OrdenCompra | null>(null);
  const propias = ordenes.filter((o) => ctx.sucursales.includes(o.sucursal));
  const lista = propias.filter((o) => !filtro || o.estado === filtro);
  const prov = (id: string) => proveedores.find((p) => p.id === id);
  const estado = (o: OrdenCompra, e: EstadoOrden, m: string) => {
    setInventario("ordenes", (p) => p.map((x) => (x.id === o.id ? { ...x, estado: e } : x)));
    ctx.onToast(m);
  };
  const textoPedido = (o: OrdenCompra) =>
    `Hola ${prov(o.proveedorId)?.contacto ?? ""}, les enviamos la orden ${o.id} para entregar en ${o.sucursal} el ${fecha(o.esperada)}:\n${o.items
      .map((it) => {
        const i = insumos.find((x) => x.id === it.insumoId);
        return `• ${it.cantidad} ${i?.unidad ?? ""} ${i?.nombre ?? ""}`;
      })
      .join("\n")}\nTotal: ${ars(totalOrden(o))}. ¡Gracias!`;
  const comprometido = propias
    .filter((o) => ["Enviada", "En tránsito"].includes(o.estado))
    .reduce((a, o) => a + totalOrden(o), 0);
  const hace30 = diaISO(-30);
  const comprado = propias
    .filter((o) => o.estado === "Recibida" && o.fecha >= hace30)
    .reduce((a, o) => a + totalOrden(o), 0);

  return (
    <div className="space-y-3">
      <Encabezado
        icon={ShoppingCart}
        titulo="Órdenes de compra"
        descripcion="Del borrador a la recepción: al recibir, el stock se suma solo."
      >
        <button type="button" className={BTN_PRIMARIO} onClick={() => ctx.nuevaOrden({})}>
          <Plus className="size-4" />
          Nueva orden
        </button>
      </Encabezado>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Mini
          label="En curso"
          valor={String(
            propias.filter((o) => ["Borrador", "Enviada", "En tránsito"].includes(o.estado)).length,
          )}
          icon={Truck}
        />
        <Mini label="Comprometido" valor={ars(comprometido)} icon={CircleDollarSign} />
        <Mini
          label="Comprado (30 días)"
          valor={ars(comprado)}
          icon={PackageCheck}
          tono="text-emerald-600"
        />
      </div>
      <div className="card-grad flex flex-wrap gap-1 p-2">
        <button type="button" className={CHIP(!filtro)} onClick={() => setFiltro("")}>
          Todas ({propias.length})
        </button>
        {ESTADOS_ORDEN.map((e) => (
          <button key={e} type="button" className={CHIP(filtro === e)} onClick={() => setFiltro(e)}>
            {e} ({propias.filter((o) => o.estado === e).length})
          </button>
        ))}
      </div>
      {lista.length === 0 ? (
        <Vacio icon={ShoppingCart} texto="No hay órdenes en este estado." />
      ) : (
        <ul className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {lista.map((o) => {
            const p = prov(o.proveedorId);
            const atrasada = ["Enviada", "En tránsito"].includes(o.estado) && o.esperada < diaISO();
            return (
              <li key={o.id} className="card-grad flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500 text-white">
                      <ShoppingCart className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {o.id} · {p?.nombre ?? "—"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {o.sucursal} · emitida {fecha(o.fecha)} · entrega {fecha(o.esperada)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Pill clase={ORDEN_ESTILO[o.estado]}>{o.estado}</Pill>
                    {atrasada && <Pill clase="bg-rose-100 text-rose-700">Atrasada</Pill>}
                  </div>
                </div>
                <ul className="mt-3 space-y-1 rounded-xl bg-white/70 p-2.5 ring-1 ring-primary/10">
                  {o.items.map((it) => {
                    const i = insumos.find((x) => x.id === it.insumoId);
                    return (
                      <li key={it.insumoId} className="flex justify-between gap-2 text-xs">
                        <span className="truncate">
                          {it.cantidad} {i?.unidad} · {i?.nombre ?? "Insumo eliminado"}
                        </span>
                        <span className="shrink-0 font-medium">{ars(it.cantidad * it.precio)}</span>
                      </li>
                    );
                  })}
                  <li className="flex justify-between border-t border-primary/10 pt-1.5 text-sm font-bold text-primary">
                    <span>Total</span>
                    <span>{ars(totalOrden(o))}</span>
                  </li>
                </ul>
                {o.nota && (
                  <p className="mt-2 text-[11px] italic text-muted-foreground">“{o.nota}”</p>
                )}
                <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
                  {o.estado === "Borrador" && (
                    <>
                      <button
                        type="button"
                        className={BTN_PRIMARIO}
                        onClick={() => estado(o, "Enviada", `Orden ${o.id} enviada a ${p?.nombre}`)}
                      >
                        <Send className="size-4" />
                        Enviar
                      </button>
                      <button type="button" className={BTN_SECUNDARIO} onClick={() => onEditar(o)}>
                        <Pencil className="size-4" />
                        Editar
                      </button>
                    </>
                  )}
                  {o.estado === "Enviada" && (
                    <button
                      type="button"
                      className={BTN_SECUNDARIO}
                      onClick={() => estado(o, "En tránsito", `${o.id} en camino`)}
                    >
                      <Truck className="size-4" />
                      En tránsito
                    </button>
                  )}
                  {["Enviada", "En tránsito"].includes(o.estado) && (
                    <button type="button" className={BTN_PRIMARIO} onClick={() => setRecibir(o)}>
                      <PackageCheck className="size-4" />
                      Recibir
                    </button>
                  )}
                  {p && o.estado !== "Cancelada" && (
                    <a
                      href={wa(p.telefono, textoPedido(o))}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Enviar por WhatsApp"
                      className="btn-wa-icono"
                    >
                      <IconoWhatsApp />
                    </a>
                  )}
                  <button
                    type="button"
                    aria-label="Imprimir orden"
                    className={BTN_ICONO}
                    onClick={() => imprimirOrden(o, p, insumos)}
                  >
                    <Printer className="size-3.5" />
                  </button>
                  {["Borrador", "Enviada", "En tránsito"].includes(o.estado) && (
                    <button
                      type="button"
                      aria-label="Cancelar orden"
                      className={`${BTN_ICONO} ml-auto`}
                      onClick={() => estado(o, "Cancelada", `Orden ${o.id} cancelada`)}
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {recibir && (
        <Modal titulo={`Recibir ${recibir.id}`} onClose={() => setRecibir(null)} ancho="max-w-2xl">
          <RecibirOrden
            o={recibir}
            ctx={ctx}
            onCancel={() => setRecibir(null)}
            onListo={(m) => {
              setRecibir(null);
              ctx.onToast(m);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function RecibirOrden({
  o,
  ctx,
  onCancel,
  onListo,
}: {
  o: OrdenCompra;
  ctx: Ctx;
  onCancel: () => void;
  onListo: (m: string) => void;
}) {
  const { insumos } = storeInventario.usar();
  const [rec, setRec] = useState(
    o.items.map((it) => ({ ...it, recibido: String(it.cantidad), lote: "", venc: "" })),
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        let total = 0;
        for (const r of rec) {
          const n = Math.max(0, Number(r.recibido));
          if (!n) continue;
          total += n;
          registrarMovimiento({
            insumoId: r.insumoId,
            tipo: "Entrada",
            cantidad: n,
            motivo: "Recepción de orden",
            usuario: ctx.usuario,
            referencia: o.id,
          });
          setInventario("insumos", (p) =>
            p.map((i) =>
              i.id === r.insumoId
                ? {
                    ...i,
                    costo: r.precio || i.costo,
                    ...(r.lote ? { lote: r.lote } : {}),
                    ...(r.venc ? { vencimiento: r.venc } : {}),
                  }
                : i,
            ),
          );
        }
        const incompleta = rec.some((r) => Number(r.recibido) < r.cantidad);
        setInventario("ordenes", (p) =>
          p.map((x) =>
            x.id === o.id
              ? {
                  ...x,
                  estado: "Recibida",
                  nota: incompleta ? `${x.nota ? `${x.nota} · ` : ""}Recibida incompleta` : x.nota,
                }
              : x,
          ),
        );
        onListo(`${o.id} recibida: ${total} unidades ingresaron a ${o.sucursal}`);
      }}
      className="space-y-3"
    >
      <p className="text-xs text-muted-foreground">
        Controlá lo que llegó. Si falta algo, cargá la cantidad real: queda registrado.
      </p>
      <ul className="space-y-1.5">
        {rec.map((r, n) => {
          const i = insumos.find((x) => x.id === r.insumoId);
          return (
            <li
              key={r.insumoId}
              className="grid grid-cols-2 gap-2 rounded-xl bg-primary/[0.035] p-2.5 ring-1 ring-primary/10 sm:grid-cols-[1fr_90px_120px_140px] sm:items-center"
            >
              <div className="col-span-2 min-w-0 sm:col-span-1">
                <p className="truncate text-sm font-medium">{i?.nombre}</p>
                <p className="text-[11px] text-muted-foreground">
                  Pedido: {r.cantidad} {i?.unidad}
                </p>
              </div>
              <input
                type="number"
                min={0}
                aria-label={`Recibido ${i?.nombre}`}
                value={r.recibido}
                onChange={(e) =>
                  setRec((p) => p.map((x, k) => (k === n ? { ...x, recibido: e.target.value } : x)))
                }
                className={INPUT}
              />
              <input
                value={r.lote}
                placeholder="Lote"
                onChange={(e) =>
                  setRec((p) => p.map((x, k) => (k === n ? { ...x, lote: e.target.value } : x)))
                }
                className={INPUT}
              />
              <input
                type="date"
                aria-label="Vencimiento"
                value={r.venc}
                onChange={(e) =>
                  setRec((p) => p.map((x, k) => (k === n ? { ...x, venc: e.target.value } : x)))
                }
                className={`${INPUT} col-span-2 sm:col-span-1`}
              />
            </li>
          );
        })}
      </ul>
      <Acciones etiqueta="Confirmar recepción" onCancel={onCancel} icon={PackageCheck} />
    </form>
  );
}

/* ───────────── Proveedores ───────────── */

function Proveedores({ ctx }: { ctx: Ctx }) {
  const { proveedores, ordenes, insumos } = storeInventario.usar();
  const [editar, setEditar] = useState<Proveedor | "nuevo" | null>(null);
  return (
    <div className="space-y-3">
      <Encabezado
        icon={Truck}
        titulo="Proveedores"
        descripcion="Contacto, plazos de entrega, condiciones y todo lo que les compraste."
      >
        <button type="button" className={BTN_PRIMARIO} onClick={() => setEditar("nuevo")}>
          <Plus className="size-4" />
          Nuevo proveedor
        </button>
      </Encabezado>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {proveedores.map((p) => {
          const suyas = ordenes.filter(
            (o) => o.proveedorId === p.id && ctx.sucursales.includes(o.sucursal),
          );
          const comprado = suyas
            .filter((o) => o.estado === "Recibida")
            .reduce((a, o) => a + totalOrden(o), 0);
          const abiertas = suyas.filter((o) =>
            ["Borrador", "Enviada", "En tránsito"].includes(o.estado),
          ).length;
          const cant = insumos.filter(
            (i) => i.proveedorId === p.id && ctx.sucursales.includes(i.sucursal),
          ).length;
          return (
            <li key={p.id} className="card-grad flex flex-col p-4">
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500 text-sm font-bold text-white">
                  {(p.nombre.includes(" ")
                    ? p.nombre
                        .split(" ")
                        .slice(0, 2)
                        .map((x) => x[0])
                        .join("")
                    : p.nombre.slice(0, 2)
                  ).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.nombre}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{p.contacto}</p>
                  <span className="mt-0.5 inline-flex">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`size-3 ${n <= p.calificacion ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                      />
                    ))}
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="Editar proveedor"
                  className={BTN_ICONO}
                  onClick={() => setEditar(p)}
                >
                  <Pencil className="size-3.5" />
                </button>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[
                  ["Insumos", String(cant)],
                  ["Entrega", `${p.plazo} d`],
                  ["Abiertas", String(abiertas)],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-white/80 py-2 ring-1 ring-primary/10">
                    <p className="text-sm font-bold">{v}</p>
                    <p className="text-[10px] text-muted-foreground">{k}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2.5 text-[11px] text-muted-foreground">
                Pago: <b className="text-foreground">{p.condicion}</b> · Comprado:{" "}
                <b className="text-foreground">{ars(comprado)}</b>
              </p>
              <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
                <button
                  type="button"
                  className={BTN_PRIMARIO}
                  onClick={() => ctx.nuevaOrden({ proveedorId: p.id })}
                >
                  <ShoppingCart className="size-4" />
                  Nueva orden
                </button>
                <a
                  href={wa(p.telefono, `Hola ${p.contacto}, te escribo de la clínica.`)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="WhatsApp"
                  className="btn-wa-icono"
                >
                  <IconoWhatsApp />
                </a>
                <a
                  href={`tel:${p.telefono.replace(/[^\d+]/g, "")}`}
                  aria-label="Llamar"
                  className={BTN_ICONO}
                >
                  <Phone className="size-3.5" />
                </a>
                <a href={`mailto:${p.email}`} aria-label="Correo" className={BTN_ICONO}>
                  <Mail className="size-3.5" />
                </a>
              </div>
            </li>
          );
        })}
      </ul>
      {editar && (
        <Modal
          titulo={editar === "nuevo" ? "Nuevo proveedor" : `Editar ${editar.nombre}`}
          onClose={() => setEditar(null)}
        >
          <ProveedorForm
            inicial={editar === "nuevo" ? null : editar}
            onCancel={() => setEditar(null)}
            onGuardado={(m) => {
              setEditar(null);
              ctx.onToast(m);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function ProveedorForm({
  inicial,
  onCancel,
  onGuardado,
}: {
  inicial: Proveedor | null;
  onCancel: () => void;
  onGuardado: (m: string) => void;
}) {
  const { insumos } = storeInventario.usar();
  const [f, setF] = useState({
    nombre: inicial?.nombre ?? "",
    contacto: inicial?.contacto ?? "",
    telefono: inicial?.telefono ?? "",
    email: inicial?.email ?? "",
    plazo: String(inicial?.plazo ?? 3),
    condicion: inicial?.condicion ?? "30 días",
    calificacion: inicial?.calificacion ?? 4,
  });
  const [error, setError] = useState("");
  const set = (c: Partial<typeof f>) => setF((p) => ({ ...p, ...c }));
  const enUso = inicial ? insumos.some((i) => i.proveedorId === inicial.id) : false;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!f.nombre.trim()) return setError("Escribí el nombre del proveedor.");
        if (f.telefono.replace(/\D/g, "").length < 8) return setError("Cargá un teléfono válido.");
        const datos = {
          nombre: mayuscula(f.nombre),
          contacto: f.contacto.trim().replace(/\b\p{L}/gu, (c) => c.toUpperCase()),
          telefono: f.telefono.trim(),
          email: f.email.trim().toLowerCase(),
          plazo: Math.max(0, Number(f.plazo) || 0),
          condicion: f.condicion.trim(),
          calificacion: f.calificacion,
        };
        if (inicial) {
          setInventario("proveedores", (p) =>
            p.map((x) => (x.id === inicial.id ? { ...x, ...datos } : x)),
          );
          return onGuardado(`${datos.nombre} actualizado`);
        }
        setInventario("proveedores", (p) => [...p, { ...datos, id: `p-${Date.now()}` }]);
        onGuardado(`${datos.nombre} agregado`);
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Empresa *">
          <input
            autoFocus
            value={f.nombre}
            onChange={(e) => set({ nombre: e.target.value })}
            className={INPUT}
            placeholder="Ej: Dental Supply"
          />
        </Field>
        <Field label="Contacto">
          <input
            value={f.contacto}
            onChange={(e) => set({ contacto: e.target.value })}
            className={INPUT}
            placeholder="Nombre y apellido"
          />
        </Field>
        <Field label="Teléfono / WhatsApp *">
          <input
            value={f.telefono}
            onChange={(e) => set({ telefono: e.target.value })}
            className={INPUT}
            placeholder="+54 11 …"
          />
        </Field>
        <Field label="Correo">
          <input
            type="email"
            value={f.email}
            onChange={(e) => set({ email: e.target.value })}
            className={INPUT}
            placeholder="ventas@…"
          />
        </Field>
        <Field label="Plazo de entrega (días)">
          <input
            type="number"
            min={0}
            value={f.plazo}
            onChange={(e) => set({ plazo: e.target.value })}
            className={INPUT}
          />
        </Field>
        <Field label="Condición de pago">
          <input
            value={f.condicion}
            onChange={(e) => set({ condicion: e.target.value })}
            className={INPUT}
          />
        </Field>
      </div>
      <Field label="Calificación">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} estrellas`}
              onClick={() => set({ calificacion: n })}
            >
              <Star
                className={`size-6 ${n <= f.calificacion ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
              />
            </button>
          ))}
        </div>
      </Field>
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      <Acciones
        etiqueta={inicial ? "Guardar cambios" : "Agregar proveedor"}
        onCancel={onCancel}
        extra={
          inicial && !enUso ? (
            <button
              type="button"
              className={BTN_SECUNDARIO}
              onClick={() => {
                setInventario("proveedores", (p) => p.filter((x) => x.id !== inicial.id));
                onGuardado(`${inicial.nombre} eliminado`);
              }}
            >
              <Trash2 className="size-4" />
              Eliminar
            </button>
          ) : undefined
        }
      />
    </form>
  );
}

/* ───────────── Consumo y kits ───────────── */

function Consumo({ ctx }: { ctx: Ctx }) {
  const { movimientos, kits } = storeInventario.usar();
  const [dias, setDias] = useState(30);
  const [registrar, setRegistrar] = useState<string | null>(null);
  const [editarKit, setEditarKit] = useState<Kit | "nuevo" | null>(null);
  const porId = new Map(ctx.insumos.map((i) => [i.id, i]));
  const desde = Date.now() - dias * 86_400_000;
  const salidas = movimientos.filter(
    (m) =>
      porId.has(m.insumoId) &&
      ["Salida", "Merma"].includes(m.tipo) &&
      new Date(m.fecha).getTime() >= desde,
  );
  const valorDe = (m: Movimiento) => Math.abs(m.cantidad) * (porId.get(m.insumoId)?.costo ?? 0);
  const total = salidas.reduce((a, m) => a + valorDe(m), 0);
  const mermas = salidas.filter((m) => m.tipo === "Merma").reduce((a, m) => a + valorDe(m), 0);
  const agrupar = (clave: (m: Movimiento) => string) =>
    Object.entries(
      salidas.reduce<Record<string, number>>((acc, m) => {
        const k = clave(m);
        acc[k] = (acc[k] ?? 0) + valorDe(m);
        return acc;
      }, {}),
    ).sort((a, b) => b[1] - a[1]);
  const porInsumo = agrupar((m) => porId.get(m.insumoId)?.nombre ?? "").slice(0, 6);
  const porCategoria = agrupar((m) => porId.get(m.insumoId)?.categoria ?? "");
  const porSucursal = agrupar((m) => porId.get(m.insumoId)?.sucursal ?? "");
  const max = (l: [string, number][]) => Math.max(1, ...l.map(([, v]) => v));

  const Ranking = ({
    titulo,
    lista,
    icon: Icon,
  }: {
    titulo: string;
    lista: [string, number][];
    icon: LucideIcon;
  }) => (
    <div className="card-grad h-full p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 text-primary" /> {titulo}
      </p>
      {lista.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">Sin consumos en el período.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {lista.map(([k, v]) => (
            <li key={k}>
              <div className="mb-1 flex justify-between gap-2 text-xs">
                <span className="truncate">{k}</span>
                <b className="shrink-0">{ars(v)}</b>
              </div>
              <Barra
                pct={(v / max(lista)) * 100}
                clase="bg-gradient-to-r from-primary to-fuchsia-500"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      <Encabezado
        icon={TrendingDown}
        titulo="Consumo y kits por tratamiento"
        descripcion="Cuánto se gasta en insumos y cuánto lleva cada tratamiento."
      >
        <div className="flex gap-1 rounded-full bg-white/80 p-1 ring-1 ring-primary/10">
          {[7, 30, 90].map((d) => (
            <button key={d} type="button" className={CHIP(dias === d)} onClick={() => setDias(d)}>
              {d} días
            </button>
          ))}
        </div>
      </Encabezado>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Mini label="Consumo valorizado" valor={ars(total)} icon={CircleDollarSign} />
        <Mini label="Promedio por día" valor={ars(total / dias)} icon={TrendingDown} />
        <Mini
          label="Mermas"
          valor={ars(mermas)}
          icon={Trash2}
          tono={mermas ? "text-rose-600" : "text-foreground"}
        />
        <Mini label="Salidas" valor={String(salidas.length)} icon={ArrowUpRight} />
      </div>
      <div
        className={`grid grid-cols-1 gap-3 ${ctx.sucursales.length > 1 ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}
      >
        <Ranking titulo="Insumos más consumidos" lista={porInsumo} icon={Package} />
        <Ranking titulo="Por categoría" lista={porCategoria} icon={Boxes} />
        {ctx.sucursales.length > 1 && (
          <Ranking titulo="Por sucursal" lista={porSucursal} icon={Building2} />
        )}
      </div>
      <div className="card-grad p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">Kits por tratamiento</p>
            <p className="text-xs text-muted-foreground">
              Registrá los tratamientos realizados y el stock se descuenta solo.
            </p>
          </div>
          <button type="button" className={BTN_SECUNDARIO} onClick={() => setEditarKit("nuevo")}>
            <Plus className="size-4" />
            Nuevo kit
          </button>
        </div>
        <ul className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {kits.map((k) => {
            const costo = k.items.reduce(
              (a, it) =>
                a + it.cantidad * (ctx.insumos.find((i) => i.nombre === it.nombre)?.costo ?? 0),
              0,
            );
            return (
              <li
                key={k.tratamiento}
                className="flex flex-col rounded-2xl bg-white/80 p-3 ring-1 ring-primary/10"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{k.tratamiento}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Costo en insumos: <b className="text-primary">{ars(costo)}</b>
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Editar kit ${k.tratamiento}`}
                    className={BTN_ICONO}
                    onClick={() => setEditarKit(k)}
                  >
                    <Pencil className="size-3.5" />
                  </button>
                </div>
                <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                  {k.items.map((it) => (
                    <li key={it.nombre} className="flex justify-between gap-2">
                      <span className="truncate">{it.nombre}</span>
                      <span className="shrink-0">× {num(it.cantidad)}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className={`${BTN_PRIMARIO} mt-3 self-start`}
                  onClick={() => setRegistrar(k.tratamiento)}
                >
                  <Check className="size-4" />
                  Registrar realizado
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {registrar && (
        <Modal titulo={`Registrar ${registrar}`} onClose={() => setRegistrar(null)}>
          <RegistrarKit
            ctx={ctx}
            kit={kits.find((k) => k.tratamiento === registrar)!}
            onCancel={() => setRegistrar(null)}
            onListo={(m) => {
              setRegistrar(null);
              ctx.onToast(m);
            }}
          />
        </Modal>
      )}
      {editarKit && (
        <Modal
          titulo={editarKit === "nuevo" ? "Nuevo kit" : `Kit de ${editarKit.tratamiento}`}
          onClose={() => setEditarKit(null)}
        >
          <KitForm
            ctx={ctx}
            inicial={editarKit === "nuevo" ? null : editarKit}
            onCancel={() => setEditarKit(null)}
            onListo={(m) => {
              setEditarKit(null);
              ctx.onToast(m);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function RegistrarKit({
  ctx,
  kit,
  onCancel,
  onListo,
}: {
  ctx: Ctx;
  kit: Kit;
  onCancel: () => void;
  onListo: (m: string) => void;
}) {
  const [suc, setSuc] = useState(ctx.sucursales[0] ?? "");
  const [veces, setVeces] = useState("1");
  const [paciente, setPaciente] = useState("");
  const n = Math.max(1, Number(veces) || 1);
  const lineas = kit.items.map((it) => ({
    it,
    ins: ctx.insumos.find((i) => i.sucursal === suc && i.nombre === it.nombre),
  }));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        let ok = 0;
        for (const { it, ins } of lineas) {
          if (!ins) continue;
          registrarMovimiento({
            insumoId: ins.id,
            tipo: "Salida",
            cantidad: -Math.round(it.cantidad * n * 100) / 100,
            motivo: `${kit.tratamiento}${n > 1 ? ` ×${n}` : ""}${paciente.trim() ? ` · ${paciente.trim().replace(/\b\p{L}/gu, (c) => c.toUpperCase())}` : ""}`,
            usuario: ctx.usuario,
            referencia: "",
          });
          ok++;
        }
        onListo(`${kit.tratamiento}: se descontaron ${ok} insumos en ${suc}`);
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Sucursal">
          <Sel value={suc} onChange={setSuc} opciones={ctx.sucursales} />
        </Field>
        <Field label="Cantidad">
          <input
            type="number"
            min={1}
            value={veces}
            onChange={(e) => setVeces(e.target.value)}
            className={INPUT}
          />
        </Field>
        <Field label="Paciente (opcional)">
          <input
            value={paciente}
            onChange={(e) => setPaciente(e.target.value)}
            className={INPUT}
            placeholder="Nombre"
          />
        </Field>
      </div>
      <ul className="space-y-1.5">
        {lineas.map(({ it, ins }) => (
          <li
            key={it.nombre}
            className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs ring-1 ${ins ? "bg-primary/[0.035] ring-primary/10" : "bg-rose-50 ring-rose-200"}`}
          >
            <span className="truncate">{it.nombre}</span>
            <span className="shrink-0 font-semibold">
              {ins
                ? `−${num(Math.round(it.cantidad * n * 100) / 100)} ${ins.unidad} (quedan ${num(Math.max(0, Math.round((ins.stock - it.cantidad * n) * 100) / 100))})`
                : "No hay en esta sucursal"}
            </span>
          </li>
        ))}
      </ul>
      <Acciones etiqueta="Descontar del stock" onCancel={onCancel} />
    </form>
  );
}

function KitForm({
  ctx,
  inicial,
  onCancel,
  onListo,
}: {
  ctx: Ctx;
  inicial: Kit | null;
  onCancel: () => void;
  onListo: (m: string) => void;
}) {
  const { kits } = storeInventario.usar();
  const nombres = [...new Set(ctx.insumos.map((i) => i.nombre))].sort();
  const libres = TRATAMIENTOS.filter((t) => !kits.some((k) => k.tratamiento === t));
  const [trat, setTrat] = useState(inicial?.tratamiento ?? libres[0] ?? "Otro tratamiento");
  const [items, setItems] = useState(inicial?.items ?? [{ nombre: nombres[0] ?? "", cantidad: 1 }]);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const validos = items.filter((i) => i.nombre && i.cantidad > 0);
        if (!validos.length) return;
        setInventario("kits", (p) =>
          inicial
            ? p.map((k) =>
                k.tratamiento === inicial.tratamiento ? { tratamiento: trat, items: validos } : k,
              )
            : [...p, { tratamiento: trat, items: validos }],
        );
        onListo(`Kit de ${trat} guardado`);
      }}
      className="space-y-3"
    >
      <Field label="Tratamiento">
        {inicial ? (
          <input value={trat} readOnly className={`${INPUT} bg-muted/40`} />
        ) : (
          <Sel
            value={trat}
            onChange={setTrat}
            opciones={libres.length ? libres : ["Otro tratamiento"]}
          />
        )}
      </Field>
      <ul className="space-y-1.5">
        {items.map((it, n) => (
          <li key={n} className="grid grid-cols-[1fr_90px_32px] items-center gap-2">
            <Sel
              value={it.nombre}
              etiqueta="Insumo del kit"
              onChange={(v) =>
                setItems((p) => p.map((x, k) => (k === n ? { ...x, nombre: v } : x)))
              }
              opciones={nombres}
            />
            <input
              type="number"
              min={0}
              step="0.01"
              aria-label="Cantidad por tratamiento"
              value={it.cantidad}
              onChange={(e) =>
                setItems((p) =>
                  p.map((x, k) => (k === n ? { ...x, cantidad: Number(e.target.value) } : x)),
                )
              }
              className={INPUT}
            />
            <button
              type="button"
              aria-label="Quitar"
              className={BTN_ICONO}
              onClick={() => setItems((p) => p.filter((_, k) => k !== n))}
            >
              <X className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={BTN_SECUNDARIO}
        onClick={() => setItems((p) => [...p, { nombre: nombres[0] ?? "", cantidad: 1 }])}
      >
        <Plus className="size-4" />
        Agregar insumo
      </button>
      <Acciones
        etiqueta="Guardar kit"
        onCancel={onCancel}
        extra={
          inicial ? (
            <button
              type="button"
              className={BTN_SECUNDARIO}
              onClick={() => {
                setInventario("kits", (p) =>
                  p.filter((k) => k.tratamiento !== inicial.tratamiento),
                );
                onListo(`Kit de ${inicial.tratamiento} eliminado`);
              }}
            >
              <Trash2 className="size-4" />
              Eliminar
            </button>
          ) : undefined
        }
      />
    </form>
  );
}

/* ───────────── Comparativo por sede (plan Grupo) ───────────── */

function Sedes({ ctx }: { ctx: Ctx }) {
  const { movimientos } = storeInventario.usar();
  const hace30 = Date.now() - 30 * 86_400_000;
  const filas = ctx.sucursales.map((s) => {
    const ins = ctx.insumos.filter((i) => i.sucursal === s);
    const ids = new Set(ins.map((i) => i.id));
    const consumo = movimientos
      .filter(
        (m) =>
          ids.has(m.insumoId) &&
          ["Salida", "Merma"].includes(m.tipo) &&
          new Date(m.fecha).getTime() >= hace30,
      )
      .reduce(
        (a, m) => a + Math.abs(m.cantidad) * (ins.find((i) => i.id === m.insumoId)?.costo ?? 0),
        0,
      );
    return {
      s,
      cant: ins.length,
      valor: ins.reduce((a, i) => a + i.stock * i.costo, 0),
      alertas: ins.filter((i) => ["Bajo", "Agotado"].includes(nivelStock(i))).length,
      consumo,
    };
  });
  const codigos = [...new Set(ctx.insumos.map((i) => i.codigo))].filter(
    (c) => ctx.insumos.filter((i) => i.codigo === c).length > 1,
  );
  const maxValor = Math.max(1, ...filas.map((f) => f.valor));
  return (
    <div className="space-y-3">
      <Encabezado
        icon={Building2}
        titulo="Comparativo por sede"
        descripcion="Valor, alertas y consumo de cada sucursal, y el mismo insumo en todas las sedes."
      />
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {filas.map((f) => (
          <li key={f.s} className="card-grad p-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Building2 className="size-4 text-primary" /> {f.s}
            </p>
            <p className="mt-2 text-2xl font-bold text-primary">{ars(f.valor)}</p>
            <div className="mt-2">
              <Barra
                pct={(f.valor / maxValor) * 100}
                clase="bg-gradient-to-r from-primary to-fuchsia-500"
              />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {f.cant} insumos ·{" "}
              <b className={f.alertas ? "text-amber-700" : "text-emerald-600"}>
                {f.alertas} alertas
              </b>{" "}
              · consumo 30 d {ars(f.consumo)}
            </p>
          </li>
        ))}
      </ul>
      <div className="card-grad overflow-x-auto p-4">
        <p className="text-sm font-semibold">Mismo insumo en todas las sedes</p>
        <table className="mt-3 w-full min-w-[640px] text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              <th className="pb-2 font-semibold">Insumo</th>
              {ctx.sucursales.map((s) => (
                <th key={s} className="pb-2 text-center font-semibold">
                  {s.replace("Clínica ", "")}
                </th>
              ))}
              <th className="pb-2 text-right font-semibold">Sugerencia</th>
            </tr>
          </thead>
          <tbody>
            {codigos.map((c) => {
              const ins = ctx.insumos.filter((i) => i.codigo === c);
              const bajo = ins.find((i) => ["Bajo", "Agotado"].includes(nivelStock(i)));
              const sobra = [...ins].sort((a, b) => b.stock - b.minimo - (a.stock - a.minimo))[0];
              const puede = bajo && sobra && sobra.id !== bajo.id && sobra.stock - sobra.minimo > 0;
              return (
                <tr key={c} className="border-t border-primary/10">
                  <td className="py-2 font-medium">{ins[0]?.nombre}</td>
                  {ctx.sucursales.map((s) => {
                    const i = ins.find((x) => x.sucursal === s);
                    return (
                      <td key={s} className="py-2 text-center">
                        {i ? (
                          <Pill clase={NIVEL_ESTILO[nivelStock(i)].chip}>{num(i.stock)}</Pill>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-2 text-right">
                    {puede ? (
                      <button
                        type="button"
                        className="font-semibold text-primary underline-offset-2 hover:underline"
                        onClick={() =>
                          ctx.movimiento({
                            insumoId: sobra.id,
                            tipo: "Transferencia",
                            destino: bajo.sucursal,
                          })
                        }
                      >
                        Pasar de {sobra.sucursal.replace("Clínica ", "")} a{" "}
                        {bajo.sucursal.replace("Clínica ", "")}
                      </button>
                    ) : (
                      <span className="text-muted-foreground">Equilibrado</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
