// src/components/cloud-esther/Facturacion.tsx
// Módulo FACTURACIÓN de Cloud Esther — solo frontend, datos ficticios.
// Pensado para conectar después con backend multi-tenant real (clinic_id en toda entidad)
// y con facturación electrónica AFIP (CAE hoy simulado, marcado explícitamente).
// Dependencias: react, lucide-react y sonner (las que ya usás). No instala nada nuevo.

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Ban,
  CalendarClock,
  FileDown,
  FileSpreadsheet,
  FileText,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

/* ───────────────────────── Permisos (se conectan luego con Roles y Permisos) ───────────────────────── */
export const FACTURACION_PERMISOS = {
  ver: "facturacion.ver",
  crear: "facturacion.crear",
  anular: "facturacion.anular",
  administrar: "facturacion.administrar",
} as const;

/* ───────────────────────── Esther Trace (placeholder) ─────────────────────────
   TODO: reemplazar por el cliente real de auditoría cuando exista el backend. */
type EventoTrace = {
  modulo: string;
  accion: string;
  entidad: string;
  antes?: string;
  despues?: string;
};

function registrarEvento(evento: EventoTrace) {
  console.log("[Esther Trace]", { ...evento, fecha: new Date().toISOString() });
}

/* ───────────────────────── Tipos (todos con clinic_id para multi-tenant) ───────────────────────── */
const CLINIC_ID = "clinic_demo_001";

type TipoComprobante = "Factura A" | "Factura B" | "Factura C" | "Nota de crédito" | "Nota de débito" | "Recibo";
type EstadoFactura = "Pagada" | "Pendiente" | "Vencida" | "Anulada";
type CondicionIva = "Responsable Inscripto" | "Monotributo" | "Exento" | "Consumidor Final";

type ItemFactura = {
  id: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
};

type Factura = {
  id: string;
  clinic_id: string;
  numero: string;
  tipo: TipoComprobante;
  cliente: string;
  cuitCliente?: string;
  condicionIva: CondicionIva;
  fecha: string;
  vencimiento?: string;
  items: ItemFactura[];
  subtotal: number;
  iva: number;
  total: number;
  estado: EstadoFactura;
  metodoPago: string;
  profesional: string;
  sucursal: string;
  cae?: string;
  caeVencimiento?: string;
  notas?: string;
  facturaRelacionada?: string; // para notas de crédito/débito: número de la factura original
};

/* ───────────────────────── Catálogos ─────────────────────────
   Sucursales y profesionales NO se inventan acá: quedan vacíos hasta
   que el backend los provea (se cargan en Configuración > Sucursales / Equipo). */
const SUCURSALES: string[] = [];
const PROFESIONALES: string[] = [];

const METODOS = ["Efectivo", "Transferencia", "Tarjeta", "Débito automático"];
const CONDICIONES_IVA: CondicionIva[] = ["Responsable Inscripto", "Monotributo", "Exento", "Consumidor Final"];
const TIPOS_COMPROBANTE: TipoComprobante[] = ["Factura A", "Factura B", "Factura C", "Recibo"];
const IVA_RATE = 0.21; // simplificado para demo: en producción depende del tipo de comprobante y condición del cliente

/* ───────────────────────── Un solo dato de ejemplo ───────────────────────── */
const FACTURAS_INICIALES: Factura[] = [
  {
    id: "f1",
    clinic_id: CLINIC_ID,
    numero: "0001-00000001",
    tipo: "Factura B",
    cliente: "María González",
    condicionIva: "Consumidor Final",
    fecha: "2026-08-21",
    vencimiento: "2026-09-05",
    items: [{ id: "i1", descripcion: "Limpieza + consulta", cantidad: 1, precioUnitario: 85000 }],
    subtotal: 70248,
    iva: 14752,
    total: 85000,
    estado: "Pagada",
    metodoPago: "Transferencia",
    profesional: "Dra. Lucía Paz",
    sucursal: "Casa Central",
    cae: "72345678901234",
    caeVencimiento: "2026-09-01",
  },
];

/* ───────────────────────── Utilidades ───────────────────────── */
const pesos = (n: number) =>
  "$ " + new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);

function calcularTotales(items: ItemFactura[]) {
  const subtotal = items.reduce((s, it) => s + it.cantidad * it.precioUnitario, 0) / (1 + IVA_RATE);
  const iva = items.reduce((s, it) => s + it.cantidad * it.precioUnitario, 0) - subtotal;
  const total = items.reduce((s, it) => s + it.cantidad * it.precioUnitario, 0);
  return { subtotal: Math.round(subtotal), iva: Math.round(iva), total: Math.round(total) };
}

function numeroSiguiente(facturas: Factura[]) {
  const max = facturas.reduce((m, f) => {
    const n = Number(f.numero.split("-")[1] ?? "0");
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  return `0001-${String(max + 1).padStart(8, "0")}`;
}

function caeSimulado() {
  // TODO: reemplazar por la respuesta real del webservice de AFIP.
  return Array.from({ length: 14 }, () => Math.floor(Math.random() * 10)).join("");
}

const TABS = [
  { id: "resumen", label: "Resumen" },
  { id: "facturas", label: "Facturas emitidas" },
  { id: "notas", label: "Notas de crédito/débito" },
  { id: "vencer", label: "Por vencer" },
  { id: "fiscal", label: "Configuración fiscal" },
  { id: "reportes", label: "Reportes" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const estadoStyles: Record<EstadoFactura, string> = {
  Pagada: "bg-primary/10 text-primary",
  Pendiente: "border border-primary/20 bg-card text-foreground/80",
  Vencida: "bg-rose-100 text-rose-700",
  Anulada: "bg-muted text-muted-foreground line-through",
};

/* ───────────────────────── Fondo temático (Facturación) ─────────────────────────
   Blobs sutiles primary/sky (documento electrónico = tono "digital") +
   marca de agua de Receipt casi invisible. pointer-events-none, -z-10. */
function FondoFacturacion() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -right-24 top-6 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute left-0 top-1/2 h-96 w-96 rounded-full bg-sky-400/10 blur-3xl" />
      <div className="absolute bottom-0 right-1/3 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <Receipt className="absolute -bottom-8 -left-8 h-72 w-72 text-primary/[0.04]" strokeWidth={1} />
    </div>
  );
}

/* ───────────────────────── Piezas de UI ───────────────────────── */
type StatTone = "primary" | "success" | "neutral" | "danger";

const STAT_TONES: Record<StatTone, { value: string; blob: string; icon: string }> = {
  primary: { value: "text-primary", blob: "bg-primary/10", icon: "text-primary/70" },
  success: { value: "text-emerald-600", blob: "bg-emerald-500/10", icon: "text-emerald-500/70" },
  neutral: { value: "text-foreground", blob: "bg-foreground/5", icon: "text-foreground/50" },
  danger: { value: "text-rose-600", blob: "bg-rose-500/10", icon: "text-rose-500/70" },
};

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Receipt;
  tone: StatTone;
}) {
  const t = STAT_TONES[tone];
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-primary/10 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md">
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full ${t.blob} transition-transform duration-200 group-hover:scale-110`}
      />
      <div className="relative flex items-start justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 shrink-0 ${t.icon}`} />
      </div>
      <div className={`relative mt-3 text-[26px] font-bold leading-none ${t.value}`}>{value}</div>
      <div className="relative mt-2.5 truncate text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-primary/20 bg-card/80 p-6 shadow-sm backdrop-blur">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Fila({
  icon: Icon,
  titulo,
  detalle,
  derecha,
}: {
  icon: typeof Receipt;
  titulo: React.ReactNode;
  detalle: string;
  derecha: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/10 bg-card p-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">{titulo}</div>
          <div className="truncate text-xs text-muted-foreground">{detalle}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">{derecha}</div>
    </div>
  );
}

function Vacio({ texto }: { texto: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-primary/20 py-10 text-center text-sm text-muted-foreground">
      {texto}
    </div>
  );
}

function BarraH({ label, valor, max }: { label: string; valor: number; max: number }) {
  const pct = max > 0 ? Math.max(4, Math.round((valor / max) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-foreground/80">
        <span>{label}</span>
        <span className="font-semibold text-foreground">{pesos(valor)}</span>
      </div>
      <div className="h-2.5 rounded-full bg-primary/10">
        <div className="h-2.5 rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const campo =
  "w-full rounded-xl border border-primary/20 bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function CampoVacioCatalogo({ texto }: { texto: string }) {
  return <p className="mt-1 text-[11px] text-muted-foreground">{texto}</p>;
}

/* ───────────────────────── Modal: Nueva factura ───────────────────────── */
function ModalFactura({
  numeroSugerido,
  onClose,
  onGuardar,
}: {
  numeroSugerido: string;
  onClose: () => void;
  onGuardar: (f: Factura) => void;
}) {
  const [tipo, setTipo] = useState<TipoComprobante>("Factura B");
  const [cliente, setCliente] = useState("");
  const [cuitCliente, setCuitCliente] = useState("");
  const [condicionIva, setCondicionIva] = useState<CondicionIva>("Consumidor Final");
  const [fecha, setFecha] = useState("2026-09-25");
  const [vencimiento, setVencimiento] = useState("");
  const [metodoPago, setMetodoPago] = useState(METODOS[0]);
  const [profesional, setProfesional] = useState("");
  const [sucursal, setSucursal] = useState("");
  const [notas, setNotas] = useState("");
  const [items, setItems] = useState<ItemFactura[]>([{ id: "it1", descripcion: "", cantidad: 1, precioUnitario: 0 }]);

  const totales = useMemo(() => calcularTotales(items), [items]);

  function actualizarItem(id: string, cambios: Partial<ItemFactura>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...cambios } : it)));
  }

  function agregarItem() {
    setItems((prev) => [...prev, { id: `it${Date.now()}`, descripcion: "", cantidad: 1, precioUnitario: 0 }]);
  }

  function quitarItem(id: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev));
  }

  function guardar() {
    const itemsValidos = items.filter((it) => it.descripcion.trim() && it.precioUnitario > 0);
    if (!cliente.trim() || itemsValidos.length === 0) {
      toast.error("Completá el cliente y al menos un ítem con descripción y precio.");
      return;
    }
    const t = calcularTotales(itemsValidos);
    onGuardar({
      id: `f${Date.now()}`,
      clinic_id: CLINIC_ID,
      numero: numeroSugerido,
      tipo,
      cliente: cliente.trim(),
      cuitCliente: cuitCliente.trim() || undefined,
      condicionIva,
      fecha,
      vencimiento: vencimiento || undefined,
      items: itemsValidos,
      subtotal: t.subtotal,
      iva: t.iva,
      total: t.total,
      estado: vencimiento ? "Pendiente" : "Pagada",
      metodoPago,
      profesional: profesional || "Sin asignar",
      sucursal: sucursal || "Sin asignar",
      cae: caeSimulado(),
      caeVencimiento: fecha,
      notas: notas.trim() || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-primary/20 bg-card p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Nueva factura</h3>
            <p className="text-xs text-muted-foreground">Comprobante {numeroSugerido} — CAE simulado hasta conectar AFIP</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-primary/5" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-medium text-foreground/80">
            Tipo de comprobante
            <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoComprobante)} className={`${campo} mt-1`}>
              {TIPOS_COMPROBANTE.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-foreground/80">
            Condición frente al IVA
            <select value={condicionIva} onChange={(e) => setCondicionIva(e.target.value as CondicionIva)} className={`${campo} mt-1`}>
              {CONDICIONES_IVA.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-foreground/80">
            Cliente / paciente
            <input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nombre y apellido" className={`${campo} mt-1`} />
          </label>
          <label className="text-xs font-medium text-foreground/80">
            CUIT/CUIL (opcional)
            <input value={cuitCliente} onChange={(e) => setCuitCliente(e.target.value)} placeholder="20-12345678-9" className={`${campo} mt-1`} />
          </label>
          <label className="text-xs font-medium text-foreground/80">
            Fecha de emisión
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={`${campo} mt-1`} />
          </label>
          <label className="text-xs font-medium text-foreground/80">
            Vencimiento (dejar vacío si se cobra en el acto)
            <input type="date" value={vencimiento} onChange={(e) => setVencimiento(e.target.value)} className={`${campo} mt-1`} />
          </label>
          <label className="text-xs font-medium text-foreground/80">
            Método de pago
            <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className={`${campo} mt-1`}>
              {METODOS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-foreground/80">
            Profesional
            <select value={profesional} onChange={(e) => setProfesional(e.target.value)} className={`${campo} mt-1`} disabled={PROFESIONALES.length === 0}>
              <option value="">— Seleccionar —</option>
              {PROFESIONALES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            {PROFESIONALES.length === 0 && <CampoVacioCatalogo texto="Todavía no hay profesionales cargados." />}
          </label>
          <label className="text-xs font-medium text-foreground/80 sm:col-span-2">
            Sucursal
            <select value={sucursal} onChange={(e) => setSucursal(e.target.value)} className={`${campo} mt-1`} disabled={SUCURSALES.length === 0}>
              <option value="">— Seleccionar —</option>
              {SUCURSALES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            {SUCURSALES.length === 0 && <CampoVacioCatalogo texto="Todavía no hay sucursales cargadas." />}
          </label>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-foreground/80">Ítems</span>
            <button onClick={agregarItem} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              <Plus className="h-3.5 w-3.5" /> Agregar ítem
            </button>
          </div>
          <div className="space-y-2">
            {items.map((it) => (
              <div key={it.id} className="grid grid-cols-12 items-center gap-2">
                <input
                  value={it.descripcion}
                  onChange={(e) => actualizarItem(it.id, { descripcion: e.target.value })}
                  placeholder="Descripción"
                  className={`${campo} col-span-6`}
                />
                <input
                  type="number"
                  min={1}
                  value={it.cantidad}
                  onChange={(e) => actualizarItem(it.id, { cantidad: Number(e.target.value) || 1 })}
                  className={`${campo} col-span-2`}
                  aria-label="Cantidad"
                />
                <input
                  type="number"
                  min={0}
                  value={it.precioUnitario || ""}
                  onChange={(e) => actualizarItem(it.id, { precioUnitario: Number(e.target.value) || 0 })}
                  placeholder="Precio"
                  className={`${campo} col-span-3`}
                  aria-label="Precio unitario"
                />
                <button
                  onClick={() => quitarItem(it.id)}
                  className="col-span-1 grid place-items-center rounded-lg p-2 text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
                  aria-label="Quitar ítem"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <label className="mt-4 block text-xs font-medium text-foreground/80">
          Notas
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} className={`${campo} mt-1 resize-none`} />
        </label>

        <div className="mt-5 flex items-center justify-between rounded-2xl bg-primary/5 p-4">
          <div className="text-xs text-muted-foreground">
            Subtotal {pesos(totales.subtotal)} · IVA {pesos(totales.iva)}
          </div>
          <div className="text-lg font-bold text-foreground">Total {pesos(totales.total)}</div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-primary/20 bg-card px-4 py-2 text-sm font-medium text-foreground/80 hover:bg-primary/5">
            Cancelar
          </button>
          <button onClick={guardar} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            Emitir factura
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Modal: Nota de crédito/débito ───────────────────────── */
function ModalNota({
  factura,
  onClose,
  onGuardar,
}: {
  factura: Factura;
  onClose: () => void;
  onGuardar: (n: Factura) => void;
}) {
  const [tipo, setTipo] = useState<"Nota de crédito" | "Nota de débito">("Nota de crédito");
  const [monto, setMonto] = useState(String(factura.total));
  const [motivo, setMotivo] = useState("");

  function guardar() {
    const valor = Number(monto);
    if (!motivo.trim() || !valor || valor <= 0) {
      toast.error("Completá el motivo y un monto mayor a 0.");
      return;
    }
    onGuardar({
      id: `n${Date.now()}`,
      clinic_id: CLINIC_ID,
      numero: `NC-${factura.numero}`,
      tipo,
      cliente: factura.cliente,
      condicionIva: factura.condicionIva,
      fecha: "2026-09-25",
      items: [{ id: "n1", descripcion: motivo.trim(), cantidad: 1, precioUnitario: valor }],
      subtotal: Math.round(valor / (1 + IVA_RATE)),
      iva: Math.round(valor - valor / (1 + IVA_RATE)),
      total: valor,
      estado: "Pagada",
      metodoPago: factura.metodoPago,
      profesional: factura.profesional,
      sucursal: factura.sucursal,
      cae: caeSimulado(),
      caeVencimiento: "2026-09-25",
      facturaRelacionada: factura.numero,
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-3xl border border-primary/20 bg-card p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Nota sobre {factura.numero}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-primary/5" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4">
          <label className="block text-xs font-medium text-foreground/80">
            Tipo
            <select value={tipo} onChange={(e) => setTipo(e.target.value as "Nota de crédito" | "Nota de débito")} className={`${campo} mt-1`}>
              <option>Nota de crédito</option>
              <option>Nota de débito</option>
            </select>
          </label>
          <label className="block text-xs font-medium text-foreground/80">
            Motivo
            <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: Anulación parcial del servicio" className={`${campo} mt-1`} />
          </label>
          <label className="block text-xs font-medium text-foreground/80">
            Monto
            <input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} className={`${campo} mt-1`} />
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-primary/20 bg-card px-4 py-2 text-sm font-medium text-foreground/80 hover:bg-primary/5">
            Cancelar
          </button>
          <button onClick={guardar} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            Emitir nota
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Página ───────────────────────── */
export function Facturacion() {
  const [tab, setTab] = useState<TabId>("resumen");
  const [facturas, setFacturas] = useState<Factura[]>(FACTURAS_INICIALES);
  const [busqueda, setBusqueda] = useState("");
  const [modalFactura, setModalFactura] = useState(false);
  const [notaSobre, setNotaSobre] = useState<Factura | null>(null);

  // Configuración fiscal — datos propios de la clínica, editables acá pero
  // todavía no persistidos: se conectan al backend/AFIP más adelante.
  const [razonSocial, setRazonSocial] = useState("");
  const [cuitClinica, setCuitClinica] = useState("");
  const [condicionClinica, setCondicionClinica] = useState<CondicionIva>("Responsable Inscripto");
  const [puntoVenta, setPuntoVenta] = useState("0001");
  const [conectadoAfip, setConectadoAfip] = useState(false);

  const comprobantes = facturas.filter((f) => f.tipo !== "Nota de crédito" && f.tipo !== "Nota de débito");
  const notas = facturas.filter((f) => f.tipo === "Nota de crédito" || f.tipo === "Nota de débito");

  const totales = useMemo(() => {
    const facturado = comprobantes.filter((f) => f.estado !== "Anulada").reduce((s, f) => s + f.total, 0);
    const pendiente = comprobantes.filter((f) => f.estado === "Pendiente").reduce((s, f) => s + f.total, 0);
    const vencido = comprobantes.filter((f) => f.estado === "Vencida").reduce((s, f) => s + f.total, 0);
    const notasTotal = notas.reduce((s, n) => s + n.total, 0);
    const emitidas = comprobantes.filter((f) => f.estado !== "Anulada").length;
    return {
      facturado,
      pendiente,
      vencido,
      notasTotal,
      emitidas,
      promedio: emitidas ? Math.round(facturado / emitidas) : 0,
    };
  }, [comprobantes, notas]);

  const porTipo = useMemo(() => {
    const mapa = new Map<string, number>();
    comprobantes
      .filter((f) => f.estado !== "Anulada")
      .forEach((f) => mapa.set(f.tipo, (mapa.get(f.tipo) ?? 0) + f.total));
    return [...mapa.entries()].map(([label, valor]) => ({ label, valor }));
  }, [comprobantes]);

  const filtradas = comprobantes.filter((f) =>
    `${f.cliente} ${f.numero} ${f.tipo}`.toLowerCase().includes(busqueda.toLowerCase()),
  );

  const porVencer = comprobantes.filter((f) => f.estado === "Pendiente" || f.estado === "Vencida");

  function guardarFactura(f: Factura) {
    setFacturas((prev) => [f, ...prev]);
    registrarEvento({ modulo: "Facturación", accion: "Emisión de comprobante", entidad: "Factura", despues: `${f.numero} · ${pesos(f.total)}` });
    setModalFactura(false);
    toast.success(`${f.tipo} ${f.numero} emitida (CAE simulado)`);
  }

  function guardarNota(n: Factura) {
    setFacturas((prev) => [n, ...prev]);
    registrarEvento({ modulo: "Facturación", accion: "Emisión de nota", entidad: "Nota", despues: `${n.numero} · ${pesos(n.total)}` });
    setNotaSobre(null);
    toast.success(`${n.tipo} emitida sobre ${n.facturaRelacionada}`);
  }

  function anularFactura(id: string) {
    setFacturas((prev) => prev.map((f) => (f.id === id ? { ...f, estado: "Anulada" } : f)));
    registrarEvento({ modulo: "Facturación", accion: "Anulación de comprobante", entidad: "Factura", antes: "Vigente", despues: "Anulada" });
    toast.success("Comprobante anulado");
  }

  return (
    <div className="relative mx-auto w-full max-w-6xl space-y-5 p-4 md:p-6">
      <FondoFacturacion />

      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Facturación</h1>
          <p className="mt-1 text-sm text-muted-foreground">Comprobantes electrónicos, notas y estado fiscal de la clínica.</p>
        </div>
        <button
          onClick={() => setModalFactura(true)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Nueva factura
        </button>
      </header>

      {/* Cards de resumen */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Facturado" value={pesos(totales.facturado)} hint={`${totales.emitidas} comprobantes`} icon={Receipt} tone="success" />
        <StatCard label="Pendiente de cobro" value={pesos(totales.pendiente)} hint="Comprobantes sin cobrar" icon={CalendarClock} tone="danger" />
        <StatCard label="Vencido" value={pesos(totales.vencido)} hint="Requiere seguimiento" icon={AlertTriangle} tone="danger" />
        <StatCard label="Notas emitidas" value={pesos(totales.notasTotal)} hint={`${notas.length} notas`} icon={RotateCcw} tone="neutral" />
        <StatCard label="Promedio por comprobante" value={pesos(totales.promedio)} hint="Sobre comprobantes vigentes" icon={FileText} tone="primary" />
      </div>

      {/* Pestañas */}
      <nav className="flex flex-wrap justify-center gap-1 rounded-2xl bg-muted/60 p-2" aria-label="Secciones de Facturación">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              tab === t.id ? "border-2 border-primary bg-card text-foreground" : "border-2 border-transparent text-foreground/80 hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Resumen */}
      {tab === "resumen" && (
        <div className="space-y-5">
          <Panel title="Facturación por tipo de comprobante">
            {porTipo.length === 0 ? (
              <Vacio texto="Todavía no hay comprobantes emitidos." />
            ) : (
              <div className="space-y-4">
                {porTipo.map((p) => (
                  <BarraH key={p.label} label={p.label} valor={p.valor} max={Math.max(...porTipo.map((x) => x.valor))} />
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Últimos comprobantes">
            <div className="space-y-3">
              {comprobantes.slice(0, 5).map((f) => (
                <Fila
                  key={f.id}
                  icon={FileText}
                  titulo={
                    <span className="flex items-center gap-2">
                      {f.numero} · {f.tipo}
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoStyles[f.estado]}`}>{f.estado}</span>
                    </span>
                  }
                  detalle={`${f.cliente} · ${f.fecha}`}
                  derecha={<span className="text-base font-bold text-foreground">{pesos(f.total)}</span>}
                />
              ))}
            </div>
          </Panel>
        </div>
      )}

      {/* Facturas emitidas */}
      {tab === "facturas" && (
        <Panel
          title="Facturas emitidas"
          action={
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar..."
                className="w-56 rounded-full border border-primary/20 bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
          }
        >
          <div className="space-y-3">
            {filtradas.length === 0 && <Vacio texto="No hay comprobantes que coincidan con la búsqueda." />}
            {filtradas.map((f) => (
              <Fila
                key={f.id}
                icon={FileText}
                titulo={
                  <span className="flex items-center gap-2">
                    {f.numero} · {f.tipo}
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoStyles[f.estado]}`}>{f.estado}</span>
                  </span>
                }
                detalle={`${f.cliente} · ${f.fecha}${f.vencimiento ? ` · vence ${f.vencimiento}` : ""} · CAE ${f.cae ?? "—"}`}
                derecha={
                  <>
                    <span className="text-base font-bold text-foreground">{pesos(f.total)}</span>
                    {f.estado !== "Anulada" && (
                      <>
                        <button
                          onClick={() => setNotaSobre(f)}
                          className="rounded-full border border-primary/20 bg-card px-3 py-1.5 text-xs font-semibold text-foreground/80 hover:bg-primary/5"
                        >
                          Nota
                        </button>
                        <button
                          onClick={() => anularFactura(f.id)}
                          className="grid place-items-center rounded-full p-2 text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
                          aria-label="Anular comprobante"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </>
                }
              />
            ))}
          </div>
        </Panel>
      )}

      {/* Notas de crédito/débito */}
      {tab === "notas" && (
        <Panel title="Notas de crédito y débito">
          <div className="space-y-3">
            {notas.length === 0 && <Vacio texto="Todavía no se emitió ninguna nota." />}
            {notas.map((n) => (
              <Fila
                key={n.id}
                icon={RotateCcw}
                titulo={`${n.numero} · ${n.tipo}`}
                detalle={`${n.cliente} · sobre ${n.facturaRelacionada} · ${n.fecha}`}
                derecha={<span className="text-base font-bold text-foreground">{pesos(n.total)}</span>}
              />
            ))}
          </div>
        </Panel>
      )}

      {/* Por vencer */}
      {tab === "vencer" && (
        <Panel title="Comprobantes por vencer">
          <div className="space-y-3">
            {porVencer.length === 0 && <Vacio texto="No hay comprobantes pendientes de cobro." />}
            {porVencer.map((f) => (
              <Fila
                key={f.id}
                icon={CalendarClock}
                titulo={
                  <span className="flex items-center gap-2">
                    {f.cliente}
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoStyles[f.estado]}`}>{f.estado}</span>
                  </span>
                }
                detalle={`${f.numero} · vence ${f.vencimiento ?? "—"}`}
                derecha={
                  <>
                    <span className="text-base font-bold text-foreground">{pesos(f.total)}</span>
                    <button
                      onClick={() => {
                        registrarEvento({ modulo: "Facturación", accion: "Recordatorio de cobro", entidad: "Factura", despues: f.numero });
                        toast.success(`Recordatorio enviado a ${f.cliente}`);
                      }}
                      className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      Enviar recordatorio
                    </button>
                  </>
                }
              />
            ))}
          </div>
        </Panel>
      )}

      {/* Configuración fiscal */}
      {tab === "fiscal" && (
        <div className="space-y-5">
          <Panel title="Datos fiscales de la clínica">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-medium text-foreground/80">
                Razón social
                <input value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} placeholder="Ej: Cloud Esther S.R.L." className={`${campo} mt-1`} />
              </label>
              <label className="text-xs font-medium text-foreground/80">
                CUIT
                <input value={cuitClinica} onChange={(e) => setCuitClinica(e.target.value)} placeholder="30-12345678-9" className={`${campo} mt-1`} />
              </label>
              <label className="text-xs font-medium text-foreground/80">
                Condición frente al IVA
                <select value={condicionClinica} onChange={(e) => setCondicionClinica(e.target.value as CondicionIva)} className={`${campo} mt-1`}>
                  {CONDICIONES_IVA.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-foreground/80">
                Punto de venta
                <input value={puntoVenta} onChange={(e) => setPuntoVenta(e.target.value)} className={`${campo} mt-1`} />
              </label>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Estos datos hoy solo viven en esta pantalla; se guardan en el backend cuando esté conectado.
            </p>
          </Panel>

          <Panel title="Conexión con AFIP">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-primary/5 p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-sm font-semibold text-foreground">{conectadoAfip ? "Conectado" : "No conectado"}</div>
                  <div className="text-xs text-muted-foreground">El CAE de los comprobantes se simula hasta conectar el webservice real.</div>
                </div>
              </div>
              <button
                onClick={() => {
                  toast.info("La conexión con AFIP se habilita cuando el backend esté listo.");
                }}
                className="rounded-full border border-primary/20 bg-card px-4 py-2 text-sm font-semibold text-foreground/80 hover:bg-primary/5"
              >
                Conectar
              </button>
            </div>
          </Panel>
        </div>
      )}

      {/* Reportes */}
      {tab === "reportes" && (
        <Panel title="Reportes">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: FileDown, titulo: "Libro IVA ventas", detalle: "Detalle fiscal de todos los comprobantes del período.", formato: "PDF" },
              { icon: FileSpreadsheet, titulo: "Detalle de facturación", detalle: "Todas las facturas, notas y su estado de cobro.", formato: "CSV" },
              { icon: Ban, titulo: "Comprobantes anulados", detalle: "Historial de anulaciones con motivo y usuario.", formato: "CSV" },
              { icon: CalendarClock, titulo: "Vencimientos", detalle: "Comprobantes pendientes y vencidos.", formato: "PDF" },
            ].map((r) => (
              <div key={r.titulo} className="flex items-center justify-between gap-3 rounded-2xl border border-primary/10 bg-card p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
                    <r.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{r.titulo}</div>
                    <div className="text-xs text-muted-foreground">{r.detalle}</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    registrarEvento({ modulo: "Facturación", accion: "Exportación de reporte", entidad: "Reporte", despues: r.titulo });
                    toast.info(`Exportación a ${r.formato} disponible cuando conectemos el backend.`);
                  }}
                  className="rounded-full border border-primary/20 bg-card px-4 py-1.5 text-xs font-semibold text-foreground/80 hover:bg-primary/5"
                >
                  {r.formato}
                </button>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {modalFactura && (
        <ModalFactura numeroSugerido={numeroSiguiente(facturas)} onClose={() => setModalFactura(false)} onGuardar={guardarFactura} />
      )}
      {notaSobre && <ModalNota factura={notaSobre} onClose={() => setNotaSobre(null)} onGuardar={guardarNota} />}
    </div>
  );
}