// src/components/cloud-esther/Finanzas.tsx
// Módulo FINANZAS de Cloud Esther — solo frontend, datos ficticios.
// Dependencias: react, lucide-react y sonner (las que ya usás). No instala nada nuevo.

import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  FileDown,
  FileSpreadsheet,
  Lock,
  LockOpen,
  Plus,
  Receipt,
  Scale,
  Search,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";

/* ───────────────────────── Permisos (se conectan luego con Roles y Permisos) ───────────────────────── */
export const FINANZAS_PERMISOS = {
  ver: "finanzas.ver",
  crear: "finanzas.crear",
  editar: "finanzas.editar",
  administrar: "finanzas.administrar",
} as const;

/* ───────────────────────── Esther Trace (placeholder) ───────────────────────── */
type EventoTrace = {
  modulo: string;
  accion: string;
  entidad: string;
  antes?: string;
  despues?: string;
};

export function registrarEvento(evento: EventoTrace) {
  // TODO: conectar con Esther Trace cuando exista el backend de auditoría.
  console.log("[Esther Trace]", { ...evento, fecha: new Date().toISOString() });
}

/* ───────────────────────── Tipos (todos con clinic_id para multi-tenant) ───────────────────────── */
const CLINIC_ID = "clinic_demo_001";

type EstadoCobro = "Pagada" | "Pendiente" | "Vencida";
type Categoria = "Insumos" | "Laboratorio" | "Alquiler" | "Sueldos" | "Servicios";

type Cobro = {
  id: string;
  clinic_id: string;
  comprobante: string;
  paciente: string;
  concepto: string;
  metodo: string;
  fecha: string;
  monto: number;
  estado: EstadoCobro;
  profesional: string;
  vence?: string;
};

type Egreso = {
  id: string;
  clinic_id: string;
  fecha: string;
  categoria: Categoria;
  proveedor: string;
  monto: number;
  metodo: string;
  notas?: string;
  comprobante?: string;
};

type MovimientoCaja = {
  id: string;
  clinic_id: string;
  hora: string;
  detalle: string;
  tipo: "ingreso" | "egreso";
  monto: number;
};

/* ───────────────────────── Datos ficticios (coinciden con Facturación: $440.000 facturado, $85.000 cobrado) ───────────────────────── */
const COBROS_INICIALES: Cobro[] = [
  {
    id: "c1",
    clinic_id: CLINIC_ID,
    comprobante: "FAC-0001",
    paciente: "María González",
    concepto: "Limpieza + consulta",
    metodo: "Transferencia",
    fecha: "2026-08-21",
    monto: 85000,
    estado: "Pagada",
    profesional: "Dra. Lucía Paz",
  },
  {
    id: "c2",
    clinic_id: CLINIC_ID,
    comprobante: "FAC-0002",
    paciente: "Carlos Rodríguez",
    concepto: "Restauración dental",
    metodo: "Tarjeta",
    fecha: "2026-08-20",
    monto: 145000,
    estado: "Pendiente",
    profesional: "Dr. Martín Sosa",
    vence: "2026-09-30",
  },
  {
    id: "c3",
    clinic_id: CLINIC_ID,
    comprobante: "FAC-0003",
    paciente: "Laura Fernández",
    concepto: "Ortodoncia — cuota inicial",
    metodo: "Efectivo",
    fecha: "2026-08-12",
    monto: 210000,
    estado: "Vencida",
    profesional: "Dra. Lucía Paz",
    vence: "2026-08-25",
  },
];

const EGRESOS_INICIALES: Egreso[] = [
  {
    id: "e1",
    clinic_id: CLINIC_ID,
    fecha: "2026-08-21",
    categoria: "Insumos",
    proveedor: "Dental Norte",
    monto: 27000,
    metodo: "Efectivo",
    notas: "Guantes, anestesia y composite",
  },
  {
    id: "e2",
    clinic_id: CLINIC_ID,
    fecha: "2026-08-18",
    categoria: "Laboratorio",
    proveedor: "Laboratorio Prótesis Sur",
    monto: 18000,
    metodo: "Transferencia",
  },
  {
    id: "e3",
    clinic_id: CLINIC_ID,
    fecha: "2026-08-10",
    categoria: "Servicios",
    proveedor: "Edenor",
    monto: 12000,
    metodo: "Débito automático",
  },
];

const MOVIMIENTOS_INICIALES: MovimientoCaja[] = [
  { id: "m1", clinic_id: CLINIC_ID, hora: "09:15", detalle: "Cobro FAC-0001 — María González", tipo: "ingreso", monto: 85000 },
  { id: "m2", clinic_id: CLINIC_ID, hora: "11:40", detalle: "Seña — Turno de Sofía Ruiz", tipo: "ingreso", monto: 40000 },
  { id: "m3", clinic_id: CLINIC_ID, hora: "13:05", detalle: "Compra de insumos — Dental Norte", tipo: "egreso", monto: 27000 },
];

const HISTORICO = [
  { mes: "Abr", ingresos: 310000, egresos: 190000 },
  { mes: "May", ingresos: 385000, egresos: 210000 },
  { mes: "Jun", ingresos: 342000, egresos: 205000 },
  { mes: "Jul", ingresos: 420000, egresos: 230000 },
  { mes: "Ago", ingresos: 440000, egresos: 240000 },
  { mes: "Sep", ingresos: 290000, egresos: 150000 },
];

const CATEGORIAS: Categoria[] = ["Insumos", "Laboratorio", "Alquiler", "Sueldos", "Servicios"];
const METODOS = ["Efectivo", "Transferencia", "Tarjeta", "Débito automático"];

/* ───────────────────────── Utilidades ───────────────────────── */
const pesos = (n: number) =>
  "$ " + new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);

const TABS = [
  { id: "resumen", label: "Resumen" },
  { id: "ingresos", label: "Ingresos" },
  { id: "egresos", label: "Egresos" },
  { id: "caja", label: "Caja" },
  { id: "cobrar", label: "Cuentas a cobrar" },
  { id: "reportes", label: "Reportes" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const PERIODOS = ["Hoy", "Semana", "Mes", "Año"] as const;

const estadoStyles: Record<EstadoCobro, string> = {
  Pagada: "bg-primary/10 text-primary",
  Pendiente: "border border-primary/20 bg-card text-foreground/80",
  Vencida: "bg-rose-100 text-rose-700",
};

/* ───────────────────────── Piezas de UI ───────────────────────── */
type StatTone = "primary" | "success" | "neutral" | "danger";

const STAT_TONES: Record<StatTone, { value: string; blob: string; icon: string; pillUp: string; pillDown: string }> = {
  primary: {
    value: "text-primary",
    blob: "bg-primary/10",
    icon: "text-primary/70",
    pillUp: "text-emerald-600",
    pillDown: "text-rose-600",
  },
  success: {
    value: "text-emerald-600",
    blob: "bg-emerald-500/10",
    icon: "text-emerald-500/70",
    pillUp: "text-emerald-600",
    pillDown: "text-rose-600",
  },
  neutral: {
    value: "text-foreground",
    blob: "bg-foreground/5",
    icon: "text-foreground/50",
    pillUp: "text-emerald-600",
    pillDown: "text-rose-600",
  },
  danger: {
    value: "text-rose-600",
    blob: "bg-rose-500/10",
    icon: "text-rose-500/70",
    pillUp: "text-emerald-600",
    pillDown: "text-rose-600",
  },
};

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  delta,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Wallet;
  tone: StatTone;
  /** Variación mostrada como pastilla, ej. "+9%" o "-4%". Omitila si la métrica no aplica. */
  delta?: string;
}) {
  const t = STAT_TONES[tone];
  const deltaPositive = delta?.trim().startsWith("-") ? false : true;

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-primary/10 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md">
      {/* Blob decorativo, como en la referencia */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full ${t.blob} transition-transform duration-200 group-hover:scale-110`}
      />

      <div className="relative flex items-start justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 shrink-0 ${t.icon}`} />
      </div>

      <div className={`relative mt-3 text-[26px] font-bold leading-none ${t.value}`}>{value}</div>

      <div className="relative mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        {delta && (
          <span className={`font-semibold ${deltaPositive ? t.pillUp : t.pillDown}`}>{delta}</span>
        )}
        <span className="truncate">{hint}</span>
      </div>
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
  icon: typeof Wallet;
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

/* ───────────────────────── Modal: Nuevo egreso ───────────────────────── */
function ModalEgreso({ onClose, onGuardar }: { onClose: () => void; onGuardar: (e: Egreso) => void }) {
  const [fecha, setFecha] = useState("2026-09-24");
  const [categoria, setCategoria] = useState<Categoria>("Insumos");
  const [proveedor, setProveedor] = useState("");
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState(METODOS[0]);
  const [notas, setNotas] = useState("");
  const [archivo, setArchivo] = useState<string>("");

  const campo =
    "w-full rounded-xl border border-primary/20 bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  function guardar() {
    const valor = Number(monto.replace(/\./g, "").replace(",", "."));
    if (!proveedor.trim() || !valor || valor <= 0) {
      toast.error("Completá proveedor y un monto mayor a 0.");
      return;
    }
    onGuardar({
      id: `e${Date.now()}`,
      clinic_id: CLINIC_ID,
      fecha,
      categoria,
      proveedor: proveedor.trim(),
      monto: valor,
      metodo,
      notas: notas.trim() || undefined,
      comprobante: archivo || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-primary/20 bg-card p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Nuevo egreso</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-primary/5" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-medium text-foreground/80">
            Fecha
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={`${campo} mt-1`} />
          </label>
          <label className="text-xs font-medium text-foreground/80">
            Categoría
            <select value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria)} className={`${campo} mt-1`}>
              {CATEGORIAS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-foreground/80 sm:col-span-2">
            Proveedor
            <input value={proveedor} onChange={(e) => setProveedor(e.target.value)} placeholder="Ej: Dental Norte" className={`${campo} mt-1`} />
          </label>
          <label className="text-xs font-medium text-foreground/80">
            Monto
            <input inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0" className={`${campo} mt-1`} />
          </label>
          <label className="text-xs font-medium text-foreground/80">
            Método de pago
            <select value={metodo} onChange={(e) => setMetodo(e.target.value)} className={`${campo} mt-1`}>
              {METODOS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-foreground/80 sm:col-span-2">
            Comprobante (opcional)
            <input
              type="file"
              onChange={(e) => setArchivo(e.target.files?.[0]?.name ?? "")}
              className={`${campo} mt-1 file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-xs file:font-medium file:text-primary`}
            />
          </label>
          <label className="text-xs font-medium text-foreground/80 sm:col-span-2">
            Notas
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} className={`${campo} mt-1 resize-none`} />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-primary/20 bg-card px-4 py-2 text-sm font-medium text-foreground/80 hover:bg-primary/5">
            Cancelar
          </button>
          <button onClick={guardar} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            Guardar egreso
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Página ───────────────────────── */
export function Finanzas() {
  const [tab, setTab] = useState<TabId>("resumen");
  const [periodo, setPeriodo] = useState<(typeof PERIODOS)[number]>("Mes");
  const [sucursal, setSucursal] = useState("Todas");
  const [cobros] = useState<Cobro[]>(COBROS_INICIALES);
  const [egresos, setEgresos] = useState<Egreso[]>(EGRESOS_INICIALES);
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>(MOVIMIENTOS_INICIALES);
  const [cajaAbierta, setCajaAbierta] = useState(true);
  const [modalEgreso, setModalEgreso] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const totales = useMemo(() => {
    const cobrado = cobros.filter((c) => c.estado === "Pagada").reduce((s, c) => s + c.monto, 0);
    const pendiente = cobros.filter((c) => c.estado !== "Pagada").reduce((s, c) => s + c.monto, 0);
    const vencido = cobros.filter((c) => c.estado === "Vencida").reduce((s, c) => s + c.monto, 0);
    const egr = egresos.reduce((s, e) => s + e.monto, 0);
    const pagadas = cobros.filter((c) => c.estado === "Pagada").length;
    const saldoCaja = movimientos.reduce((s, m) => s + (m.tipo === "ingreso" ? m.monto : -m.monto), 0);
    return {
      cobrado,
      pendiente,
      vencido,
      egresos: egr,
      neto: cobrado - egr,
      ticket: pagadas ? Math.round(cobrado / pagadas) : 0,
      saldoCaja,
    };
  }, [cobros, egresos, movimientos]);

  const porCategoria = useMemo(
    () =>
      CATEGORIAS.map((c) => ({
        label: c,
        valor: egresos.filter((e) => e.categoria === c).reduce((s, e) => s + e.monto, 0),
      })).filter((x) => x.valor > 0),
    [egresos],
  );

  const porProfesional = useMemo(() => {
    const mapa = new Map<string, number>();
    cobros.forEach((c) => mapa.set(c.profesional, (mapa.get(c.profesional) ?? 0) + c.monto));
    return [...mapa.entries()].map(([label, valor]) => ({ label, valor }));
  }, [cobros]);

  const cobrosFiltrados = cobros.filter((c) =>
    `${c.paciente} ${c.concepto} ${c.comprobante}`.toLowerCase().includes(busqueda.toLowerCase()),
  );

  const maxHist = Math.max(...HISTORICO.flatMap((h) => [h.ingresos, h.egresos]));

  function guardarEgreso(e: Egreso) {
    setEgresos((prev) => [e, ...prev]);
    setMovimientos((prev) => [
      ...prev,
      {
        id: `m${Date.now()}`,
        clinic_id: CLINIC_ID,
        hora: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
        detalle: `${e.categoria} — ${e.proveedor}`,
        tipo: "egreso",
        monto: e.monto,
      },
    ]);
    registrarEvento({ modulo: "Finanzas", accion: "Creación de egreso", entidad: "Egreso", despues: `${e.categoria} · ${pesos(e.monto)}` });
    setModalEgreso(false);
    toast.success("Egreso registrado");
  }

  function alternarCaja() {
    const abrir = !cajaAbierta;
    setCajaAbierta(abrir);
    registrarEvento({
      modulo: "Finanzas",
      accion: abrir ? "Apertura de caja" : "Cierre de caja",
      entidad: "Caja",
      antes: abrir ? "Cerrada" : "Abierta",
      despues: abrir ? "Abierta" : "Cerrada",
    });
    toast.success(abrir ? "Caja abierta" : "Caja cerrada");
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-4 md:p-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Finanzas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ingresos, egresos y rentabilidad de la clínica.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-primary/20 bg-card/80 p-1">
            {PERIODOS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                  periodo === p ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-primary/5"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <select
            value={sucursal}
            onChange={(e) => setSucursal(e.target.value)}
            className="rounded-full border border-primary/20 bg-card px-4 py-2 text-xs font-medium text-foreground/80"
            aria-label="Sucursal"
          >
            <option>Todas</option>
            <option>Sucursal Centro</option>
            <option>Sucursal Norte</option>
          </select>
        </div>
      </header>

      {/* Cards de resumen */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Ingresos" value={pesos(totales.cobrado)} hint="Comprobantes pagados" icon={ArrowUpRight} tone="success" delta="+14%" />
        <StatCard label="Egresos" value={pesos(totales.egresos)} hint={`${egresos.length} gastos`} icon={ArrowDownRight} tone="danger" delta="-6%" />
        <StatCard label="Resultado neto" value={pesos(totales.neto)} hint="Ingresos − egresos" icon={Scale} tone="primary" delta="+9%" />
        <StatCard label="Ticket promedio" value={pesos(totales.ticket)} hint="Por comprobante pagado" icon={Receipt} tone="neutral" />
        <StatCard label="Cuentas a cobrar" value={pesos(totales.pendiente)} hint={`Vencido ${pesos(totales.vencido)}`} icon={Wallet} tone="danger" delta="-4%" />
      </div>

      {/* Pestañas */}
      <nav className="flex flex-wrap justify-center gap-1 rounded-2xl bg-muted/60 p-2" aria-label="Secciones de Finanzas">
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
          <Panel
            title="Ingresos vs egresos"
            action={
              <div className="flex items-center gap-4 text-xs text-foreground/80">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary" />Ingresos</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-400" />Egresos</span>
              </div>
            }
          >
            <div className="flex h-56 items-end gap-3 overflow-x-auto sm:gap-6">
              {HISTORICO.map((h) => (
                <div key={h.mes} className="flex min-w-[48px] flex-1 flex-col items-center gap-2">
                  <div className="flex h-44 w-full items-end justify-center gap-1.5">
                    <div
                      className="w-1/2 max-w-[28px] rounded-t-lg bg-primary"
                      style={{ height: `${(h.ingresos / maxHist) * 100}%` }}
                      title={`Ingresos ${pesos(h.ingresos)}`}
                    />
                    <div
                      className="w-1/2 max-w-[28px] rounded-t-lg bg-rose-400"
                      style={{ height: `${(h.egresos / maxHist) * 100}%` }}
                      title={`Egresos ${pesos(h.egresos)}`}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{h.mes}</span>
                </div>
              ))}
            </div>
          </Panel>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Ingresos por profesional">
              <div className="space-y-4">
                {porProfesional.map((p) => (
                  <BarraH key={p.label} label={p.label} valor={p.valor} max={Math.max(...porProfesional.map((x) => x.valor))} />
                ))}
              </div>
            </Panel>
            <Panel title="Egresos por categoría">
              {porCategoria.length === 0 ? (
                <Vacio texto="Todavía no hay egresos cargados." />
              ) : (
                <div className="space-y-4">
                  {porCategoria.map((c) => (
                    <BarraH key={c.label} label={c.label} valor={c.valor} max={Math.max(...porCategoria.map((x) => x.valor))} />
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <Panel title="Ingresos por tratamiento">
            <div className="space-y-4">
              {cobros.map((c) => (
                <BarraH key={c.id} label={c.concepto} valor={c.monto} max={Math.max(...cobros.map((x) => x.monto))} />
              ))}
            </div>
          </Panel>
        </div>
      )}

      {/* Ingresos */}
      {tab === "ingresos" && (
        <Panel
          title="Cobros"
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
            {cobrosFiltrados.length === 0 && <Vacio texto="No hay cobros que coincidan con la búsqueda." />}
            {cobrosFiltrados.map((c) => (
              <Fila
                key={c.id}
                icon={Receipt}
                titulo={
                  <span className="flex items-center gap-2">
                    {c.comprobante}
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoStyles[c.estado]}`}>{c.estado}</span>
                  </span>
                }
                detalle={`${c.paciente} · ${c.concepto} · ${c.fecha} · ${c.metodo}`}
                derecha={<span className="text-base font-bold text-foreground">{pesos(c.monto)}</span>}
              />
            ))}
          </div>
        </Panel>
      )}

      {/* Egresos */}
      {tab === "egresos" && (
        <Panel
          title="Egresos"
          action={
            <button
              onClick={() => setModalEgreso(true)}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Nuevo egreso
            </button>
          }
        >
          <div className="space-y-3">
            {egresos.length === 0 && <Vacio texto="Todavía no hay egresos. Cargá el primero con “Nuevo egreso”." />}
            {egresos.map((e) => (
              <Fila
                key={e.id}
                icon={Banknote}
                titulo={
                  <span className="flex items-center gap-2">
                    {e.proveedor}
                    <span className="rounded-full border border-primary/20 px-2.5 py-0.5 text-xs font-medium text-foreground/80">{e.categoria}</span>
                  </span>
                }
                detalle={`${e.fecha} · ${e.metodo}${e.notas ? ` · ${e.notas}` : ""}${e.comprobante ? ` · ${e.comprobante}` : ""}`}
                derecha={<span className="text-base font-bold text-rose-600">− {pesos(e.monto)}</span>}
              />
            ))}
          </div>
        </Panel>
      )}

      {/* Caja */}
      {tab === "caja" && (
        <Panel
          title="Caja diaria"
          action={
            <button
              onClick={alternarCaja}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
                cajaAbierta ? "border border-primary/20 bg-card text-foreground/80 hover:bg-primary/5" : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {cajaAbierta ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
              {cajaAbierta ? "Cerrar caja" : "Abrir caja"}
            </button>
          }
        >
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-primary/5 p-4">
            <div>
              <div className="text-xs text-muted-foreground">Estado</div>
              <div className="text-sm font-semibold text-foreground">{cajaAbierta ? "Caja abierta" : "Caja cerrada"}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Saldo de caja</div>
              <div className="text-2xl font-bold text-foreground">{pesos(totales.saldoCaja)}</div>
            </div>
          </div>
          <div className="space-y-3">
            {movimientos.map((m) => (
              <Fila
                key={m.id}
                icon={m.tipo === "ingreso" ? ArrowUpRight : ArrowDownRight}
                titulo={m.detalle}
                detalle={`${m.hora} · ${m.tipo === "ingreso" ? "Ingreso" : "Egreso"}`}
                derecha={
                  <span className={`text-base font-bold ${m.tipo === "ingreso" ? "text-emerald-600" : "text-rose-600"}`}>
                    {m.tipo === "ingreso" ? "+" : "−"} {pesos(m.monto)}
                  </span>
                }
              />
            ))}
          </div>
        </Panel>
      )}

      {/* Cuentas a cobrar */}
      {tab === "cobrar" && (
        <Panel title="Cuentas a cobrar">
          <div className="space-y-3">
            {cobros.filter((c) => c.estado !== "Pagada").length === 0 && <Vacio texto="No hay cuentas pendientes." />}
            {cobros
              .filter((c) => c.estado !== "Pagada")
              .map((c) => (
                <Fila
                  key={c.id}
                  icon={CalendarDays}
                  titulo={
                    <span className="flex items-center gap-2">
                      {c.paciente}
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoStyles[c.estado]}`}>{c.estado}</span>
                    </span>
                  }
                  detalle={`${c.comprobante} · ${c.concepto} · vence ${c.vence ?? "—"}`}
                  derecha={
                    <>
                      <span className="text-base font-bold text-foreground">{pesos(c.monto)}</span>
                      <button
                        onClick={() => {
                          registrarEvento({ modulo: "Finanzas", accion: "Recordatorio de cobro", entidad: "Comprobante", despues: c.comprobante });
                          toast.success(`Recordatorio enviado a ${c.paciente}`);
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

      {/* Reportes */}
      {tab === "reportes" && (
        <Panel title="Reportes">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: FileDown, titulo: "Informe financiero mensual", detalle: "Ingresos, egresos y resultado neto del período.", formato: "PDF" },
              { icon: FileSpreadsheet, titulo: "Detalle de movimientos", detalle: "Todos los cobros, egresos y movimientos de caja.", formato: "CSV" },
              { icon: TrendingUp, titulo: "Rentabilidad por profesional", detalle: "Ingresos generados por cada integrante del equipo.", formato: "PDF" },
              { icon: Wallet, titulo: "Cuentas a cobrar", detalle: "Pendientes y vencidos con seguimiento.", formato: "CSV" },
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
                    registrarEvento({ modulo: "Finanzas", accion: "Exportación de reporte", entidad: "Reporte", despues: r.titulo });
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

      {modalEgreso && <ModalEgreso onClose={() => setModalEgreso(false)} onGuardar={guardarEgreso} />}
    </div>
  );
}