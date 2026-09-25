// src/components/cloud-esther/Finanzas.tsx

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

export const FINANZAS_PERMISOS = {
  ver: "finanzas.ver",
  crear: "finanzas.crear",
  editar: "finanzas.editar",
  administrar: "finanzas.administrar",
} as const;

type EventoTrace = {
  modulo: string;
  accion: string;
  entidad: string;
  antes?: string;
  despues?: string;
};

export function registrarEvento(evento: EventoTrace) {
  console.log("[Esther Trace]", { ...evento, fecha: new Date().toISOString() });
}

const CLINIC_ID = "clinic_demo_001";

type EstadoCobro = "Pagada" | "Pendiente" | "Vencida";

type Categoria =
  | "Insumos"
  | "Laboratorio"
  | "Alquiler"
  | "Sueldos"
  | "Servicios";

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
  {
    id: "m1",
    clinic_id: CLINIC_ID,
    hora: "09:15",
    detalle: "Cobro FAC-0001 — María González",
    tipo: "ingreso",
    monto: 85000,
  },
  {
    id: "m2",
    clinic_id: CLINIC_ID,
    hora: "11:40",
    detalle: "Seña — Turno de Sofía Ruiz",
    tipo: "ingreso",
    monto: 40000,
  },
  {
    id: "m3",
    clinic_id: CLINIC_ID,
    hora: "13:05",
    detalle: "Compra de insumos — Dental Norte",
    tipo: "egreso",
    monto: 27000,
  },
];

const HISTORICO = [
  { mes: "Abr", ingresos: 310000, egresos: 190000 },
  { mes: "May", ingresos: 385000, egresos: 210000 },
  { mes: "Jun", ingresos: 342000, egresos: 205000 },
  { mes: "Jul", ingresos: 420000, egresos: 230000 },
  { mes: "Ago", ingresos: 440000, egresos: 240000 },
  { mes: "Sep", ingresos: 290000, egresos: 150000 },
];

const CATEGORIAS: Categoria[] = [
  "Insumos",
  "Laboratorio",
  "Alquiler",
  "Sueldos",
  "Servicios",
];

const METODOS = [
  "Efectivo",
  "Transferencia",
  "Tarjeta",
  "Débito automático",
];

const pesos = (n: number) =>
  "$ " +
  new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
  }).format(n);

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

/* ───────────────────────── Fondo Finanzas ───────────────────────── */

function FondoFinanzas() {
  return (
    <>
      <style>{`
        @keyframes financeFloatOne {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(18px, -12px, 0) scale(1.04); }
        }

        @keyframes financeFloatTwo {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-15px, 12px, 0) scale(1.05); }
        }

        @keyframes financeBar {
          from { transform: scaleY(0); transform-origin: bottom; opacity: .35; }
          to { transform: scaleY(1); transform-origin: bottom; opacity: 1; }
        }

        @keyframes financeLine {
          from { stroke-dashoffset: 900; opacity: .2; }
          to { stroke-dashoffset: 0; opacity: 1; }
        }

        @keyframes financeFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .finance-float-one {
          animation: financeFloatOne 12s ease-in-out infinite;
        }

        .finance-float-two {
          animation: financeFloatTwo 15s ease-in-out infinite;
        }

        .finance-bar {
          animation: financeBar .7s cubic-bezier(.2,.8,.2,1) both;
        }

        .finance-line {
          stroke-dasharray: 900;
          stroke-dashoffset: 900;
          animation: financeLine 1.5s ease-out .2s forwards;
        }

        .finance-fade-up {
          animation: financeFadeUp .5s ease-out both;
        }
      `}</style>

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.025] via-transparent to-emerald-500/[0.025]" />

        <div
          className="finance-float-one absolute -left-32 top-20 h-96 w-96 rounded-full bg-primary/[0.035] blur-3xl"
        />

        <div
          className="finance-float-two absolute -right-32 top-1/3 h-[30rem] w-[30rem] rounded-full bg-emerald-400/[0.035] blur-3xl"
        />

        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-rose-300/[0.025] blur-3xl" />

        <svg
          className="absolute right-[-90px] top-20 h-[520px] w-[520px] text-primary/[0.025]"
          viewBox="0 0 500 500"
          fill="none"
        >
          <circle cx="250" cy="250" r="190" stroke="currentColor" strokeWidth="1" />
          <circle cx="250" cy="250" r="135" stroke="currentColor" strokeWidth="1" />
          <path
            d="M250 60V440M60 250H440M116 116L384 384M384 116L116 384"
            stroke="currentColor"
            strokeWidth="1"
          />
        </svg>
      </div>
    </>
  );
}

/* ───────────────────────── Cards ───────────────────────── */

type StatTone = "primary" | "success" | "neutral" | "danger";

const STAT_TONES: Record<
  StatTone,
  {
    value: string;
    blob: string;
    icon: string;
    pillUp: string;
    pillDown: string;
  }
> = {
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
  delta?: string;
}) {
  const t = STAT_TONES[tone];
  const deltaPositive = delta?.trim().startsWith("-") ? false : true;

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-primary/10 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md">
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full ${t.blob} transition-transform duration-200 group-hover:scale-110`}
      />

      <div className="relative flex items-start justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>

        <Icon className={`h-4 w-4 shrink-0 ${t.icon}`} />
      </div>

      <div
        className={`relative mt-3 text-[26px] font-bold leading-none ${t.value}`}
      >
        {value}
      </div>

      <div className="relative mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        {delta && (
          <span
            className={`font-semibold ${
              deltaPositive ? t.pillUp : t.pillDown
            }`}
          >
            {delta}
          </span>
        )}

        <span className="truncate">{hint}</span>
      </div>
    </div>
  );
}

/* ───────────────────────── UI ───────────────────────── */

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-primary/15 bg-card/85 p-6 shadow-sm backdrop-blur-md">
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
    <div className="group flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/10 bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-sm">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-105">
          <Icon className="h-5 w-5" />
        </span>

        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">
            {titulo}
          </div>

          <div className="truncate text-xs text-muted-foreground">
            {detalle}
          </div>
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

/* ───────────────────────── Gráfico principal ───────────────────────── */

function GraficoIngresosEgresos() {
  const max = Math.max(
    ...HISTORICO.flatMap((h) => [h.ingresos, h.egresos]),
  );

  const chartWidth = 760;
  const chartHeight = 250;
  const left = 48;
  const right = 18;
  const top = 20;
  const bottom = 34;

  const usableWidth = chartWidth - left - right;
  const usableHeight = chartHeight - top - bottom;

  const points = HISTORICO.map((item, index) => {
    const x =
      left +
      (index / (HISTORICO.length - 1)) * usableWidth;

    const y =
      top +
      usableHeight -
      (item.ingresos / max) * usableHeight;

    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="overflow-hidden rounded-2xl border border-primary/10 bg-card/60">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-primary/10 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <p className="text-sm font-semibold text-foreground">
              Evolución financiera
            </p>
          </div>

          <p className="mt-1 text-xs text-muted-foreground">
            Ingresos, egresos y tendencia del período
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            Ingresos
          </span>

          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
            Egresos
          </span>
        </div>
      </div>

      <div className="px-3 pb-4 pt-5 sm:px-5">
        <div className="relative h-[290px]">
          <div className="absolute inset-0 flex flex-col justify-between pb-9 pl-12">
            {[100, 75, 50, 25, 0].map((value) => (
              <div
                key={value}
                className="flex items-center gap-3"
              >
                <div className="h-px flex-1 bg-primary/[0.08]" />
              </div>
            ))}
          </div>

          <div className="absolute bottom-9 left-0 top-0 flex w-10 flex-col justify-between text-right">
            {[100, 75, 50, 25, 0].map((value) => (
              <span
                key={value}
                className="text-[9px] text-muted-foreground"
              >
                {pesos((max * value) / 100).replace("$ ", "$")}
              </span>
            ))}
          </div>

          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="none"
            className="absolute inset-x-0 bottom-9 left-12 h-[250px] w-[calc(100%-48px)]"
          >
            <defs>
              <linearGradient
                id="financeArea"
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop offset="0%" stopColor="currentColor" stopOpacity=".14" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>

            <polygon
              points={`${left},${top + usableHeight} ${points} ${
                left + usableWidth
              },${top + usableHeight}`}
              fill="url(#financeArea)"
              className="text-primary"
            />

            <polyline
              points={points}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="finance-line text-primary"
            />

            {HISTORICO.map((item, index) => {
              const x =
                left +
                (index / (HISTORICO.length - 1)) * usableWidth;

              const ingresosY =
                top +
                usableHeight -
                (item.ingresos / max) * usableHeight;

              return (
                <g key={item.mes}>
                  <circle
                    cx={x}
                    cy={ingresosY}
                    r="5"
                    className="fill-card stroke-primary"
                    strokeWidth="3"
                  />

                  <circle
                    cx={x}
                    cy={
                      top +
                      usableHeight -
                      (item.egresos / max) * usableHeight
                    }
                    r="4"
                    className="fill-card stroke-rose-400"
                    strokeWidth="2.5"
                  />
                </g>
              );
            })}
          </svg>

          <div className="absolute bottom-0 left-12 right-0 flex justify-between">
            {HISTORICO.map((item) => (
              <span
                key={item.mes}
                className="text-[11px] font-medium text-muted-foreground"
              >
                {item.mes}
              </span>
            ))}
          </div>

          <div className="absolute bottom-9 left-12 right-0 top-0 flex items-end justify-between gap-2 pointer-events-none">
            {HISTORICO.map((item, index) => (
              <div
                key={item.mes}
                className="flex h-full flex-1 items-end justify-center gap-1 opacity-0"
              >
                <div
                  className="finance-bar w-1 rounded-full bg-primary"
                  style={{
                    height: `${Math.max(
                      10,
                      (item.ingresos / max) * 100,
                    )}%`,
                    animationDelay: `${index * 70}ms`,
                  }}
                />
                <div
                  className="finance-bar w-1 rounded-full bg-rose-400"
                  style={{
                    height: `${Math.max(
                      8,
                      (item.egresos / max) * 100,
                    )}%`,
                    animationDelay: `${index * 70 + 120}ms`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 border-t border-primary/10 bg-primary/[0.025]">
        <div className="px-5 py-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Mayor ingreso
          </div>
          <div className="mt-1 text-lg font-bold text-foreground">
            {pesos(Math.max(...HISTORICO.map((h) => h.ingresos)))}
          </div>
        </div>

        <div className="border-l border-primary/10 px-5 py-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Mayor egreso
          </div>
          <div className="mt-1 text-lg font-bold text-foreground">
            {pesos(Math.max(...HISTORICO.map((h) => h.egresos)))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Ranking ───────────────────────── */

function GraficoRanking({
  items,
  icon: Icon,
}: {
  items: { label: string; valor: number }[];
  icon: typeof Wallet;
}) {
  const max = Math.max(...items.map((x) => x.valor), 1);

  return (
    <div className="space-y-5">
      {items.map((item, index) => {
        const percentage = Math.max(
          8,
          Math.round((item.valor / max) * 100),
        );

        return (
          <div
            key={item.label}
            className="finance-fade-up"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-3.5 w-3.5" />
                </span>

                <div className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {item.label}
                  </span>

                  <span className="text-[10px] text-muted-foreground">
                    Posición #{index + 1}
                  </span>
                </div>
              </div>

              <span className="shrink-0 text-sm font-bold text-foreground">
                {pesos(item.valor)}
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-primary/10">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{
                  width: `${percentage}%`,
                  animationDelay: `${index * 80}ms`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ───────────────────────── Tratamientos ───────────────────────── */

function GraficoTratamientos({ cobros }: { cobros: Cobro[] }) {
  const items = cobros
    .map((c) => ({
      label: c.concepto,
      paciente: c.paciente,
      profesional: c.profesional,
      estado: c.estado,
      valor: c.monto,
    }))
    .sort((a, b) => b.valor - a.valor);

  const max = Math.max(...items.map((x) => x.valor), 1);

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {items.map((item, index) => (
        <div
          key={`${item.label}-${item.paciente}`}
          className="finance-fade-up group rounded-2xl border border-primary/10 bg-card p-4 transition-all duration-200 hover:-translate-y-1 hover:border-primary/20 hover:shadow-sm"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Tratamiento
              </div>

              <div className="mt-1 truncate text-sm font-semibold text-foreground">
                {item.label}
              </div>

              <div className="mt-0.5 truncate text-xs text-muted-foreground">
                {item.paciente}
              </div>
            </div>

            <span
              className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${estadoStyles[item.estado]}`}
            >
              {item.estado}
            </span>
          </div>

          <div className="mb-2 flex items-end justify-between">
            <span className="text-lg font-bold text-foreground">
              {pesos(item.valor)}
            </span>

            <span className="text-[10px] text-muted-foreground">
              {Math.round((item.valor / max) * 100)}%
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-primary/10">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700"
              style={{
                width: `${Math.max(10, (item.valor / max) * 100)}%`,
              }}
            />
          </div>

          <div className="mt-3 truncate text-[10px] text-muted-foreground">
            {item.profesional}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────── Modal ───────────────────────── */

function ModalEgreso({
  onClose,
  onGuardar,
}: {
  onClose: () => void;
  onGuardar: (e: Egreso) => void;
}) {
  const [fecha, setFecha] = useState("2026-09-24");
  const [categoria, setCategoria] = useState<Categoria>("Insumos");
  const [proveedor, setProveedor] = useState("");
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState(METODOS[0]);
  const [notas, setNotas] = useState("");
  const [archivo, setArchivo] = useState("");

  const campo =
    "w-full rounded-xl border border-primary/20 bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  function guardar() {
    const valor = Number(
      monto.replace(/\./g, "").replace(",", "."),
    );

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
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-primary/20 bg-card p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            Nuevo egreso
          </h3>

          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-primary/5"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-medium text-foreground/80">
            Fecha
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={`${campo} mt-1`}
            />
          </label>

          <label className="text-xs font-medium text-foreground/80">
            Categoría
            <select
              value={categoria}
              onChange={(e) =>
                setCategoria(e.target.value as Categoria)
              }
              className={`${campo} mt-1`}
            >
              {CATEGORIAS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>

          <label className="text-xs font-medium text-foreground/80 sm:col-span-2">
            Proveedor
            <input
              value={proveedor}
              onChange={(e) => setProveedor(e.target.value)}
              placeholder="Ej: Dental Norte"
              className={`${campo} mt-1`}
            />
          </label>

          <label className="text-xs font-medium text-foreground/80">
            Monto
            <input
              inputMode="decimal"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0"
              className={`${campo} mt-1`}
            />
          </label>

          <label className="text-xs font-medium text-foreground/80">
            Método de pago
            <select
              value={metodo}
              onChange={(e) => setMetodo(e.target.value)}
              className={`${campo} mt-1`}
            >
              {METODOS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>

          <label className="text-xs font-medium text-foreground/80 sm:col-span-2">
            Comprobante (opcional)
            <input
              type="file"
              onChange={(e) =>
                setArchivo(e.target.files?.[0]?.name ?? "")
              }
              className={`${campo} mt-1 file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-xs file:font-medium file:text-primary`}
            />
          </label>

          <label className="text-xs font-medium text-foreground/80 sm:col-span-2">
            Notas
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              className={`${campo} mt-1 resize-none`}
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full border border-primary/20 bg-card px-4 py-2 text-sm font-medium text-foreground/80 hover:bg-primary/5"
          >
            Cancelar
          </button>

          <button
            onClick={guardar}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
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
  const [periodo, setPeriodo] =
    useState<(typeof PERIODOS)[number]>("Mes");
  const [sucursal, setSucursal] = useState("Todas");
  const [cobros] = useState<Cobro[]>(COBROS_INICIALES);
  const [egresos, setEgresos] =
    useState<Egreso[]>(EGRESOS_INICIALES);
  const [movimientos, setMovimientos] =
    useState<MovimientoCaja[]>(MOVIMIENTOS_INICIALES);
  const [cajaAbierta, setCajaAbierta] = useState(true);
  const [modalEgreso, setModalEgreso] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const totales = useMemo(() => {
    const cobrado = cobros
      .filter((c) => c.estado === "Pagada")
      .reduce((s, c) => s + c.monto, 0);

    const pendiente = cobros
      .filter((c) => c.estado !== "Pagada")
      .reduce((s, c) => s + c.monto, 0);

    const vencido = cobros
      .filter((c) => c.estado === "Vencida")
      .reduce((s, c) => s + c.monto, 0);

    const egr = egresos.reduce((s, e) => s + e.monto, 0);

    const pagadas = cobros.filter(
      (c) => c.estado === "Pagada",
    ).length;

    const saldoCaja = movimientos.reduce(
      (s, m) =>
        s + (m.tipo === "ingreso" ? m.monto : -m.monto),
      0,
    );

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
        valor: egresos
          .filter((e) => e.categoria === c)
          .reduce((s, e) => s + e.monto, 0),
      }))
        .filter((x) => x.valor > 0)
        .sort((a, b) => b.valor - a.valor),
    [egresos],
  );

  const porProfesional = useMemo(() => {
    const mapa = new Map<string, number>();

    cobros.forEach((c) =>
      mapa.set(
        c.profesional,
        (mapa.get(c.profesional) ?? 0) + c.monto,
      ),
    );

    return [...mapa.entries()]
      .map(([label, valor]) => ({ label, valor }))
      .sort((a, b) => b.valor - a.valor);
  }, [cobros]);

  const cobrosFiltrados = cobros.filter((c) =>
    `${c.paciente} ${c.concepto} ${c.comprobante}`
      .toLowerCase()
      .includes(busqueda.toLowerCase()),
  );

  function guardarEgreso(e: Egreso) {
    setEgresos((prev) => [e, ...prev]);

    setMovimientos((prev) => [
      ...prev,
      {
        id: `m${Date.now()}`,
        clinic_id: CLINIC_ID,
        hora: new Date().toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        detalle: `${e.categoria} — ${e.proveedor}`,
        tipo: "egreso",
        monto: e.monto,
      },
    ]);

    registrarEvento({
      modulo: "Finanzas",
      accion: "Creación de egreso",
      entidad: "Egreso",
      despues: `${e.categoria} · ${pesos(e.monto)}`,
    });

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
    <div className="relative mx-auto w-full max-w-6xl space-y-5 p-4 md:p-6">
      <FondoFinanzas />

      {/* Header */}

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Finanzas
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Ingresos, egresos y rentabilidad de la clínica.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-primary/20 bg-card/80 p-1 backdrop-blur">
            {PERIODOS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                  periodo === p
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/80 hover:bg-primary/5"
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
          >
            <option>Todas</option>
            <option>Sucursal Centro</option>
            <option>Sucursal Norte</option>
          </select>
        </div>
      </header>

      {/* Cards — sin modificar */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Ingresos"
          value={pesos(totales.cobrado)}
          hint="Comprobantes pagados"
          icon={ArrowUpRight}
          tone="success"
          delta="+14%"
        />

        <StatCard
          label="Egresos"
          value={pesos(totales.egresos)}
          hint={`${egresos.length} gastos`}
          icon={ArrowDownRight}
          tone="danger"
          delta="-6%"
        />

        <StatCard
          label="Resultado neto"
          value={pesos(totales.neto)}
          hint="Ingresos − egresos"
          icon={Scale}
          tone="primary"
          delta="+9%"
        />

        <StatCard
          label="Ticket promedio"
          value={pesos(totales.ticket)}
          hint="Por comprobante pagado"
          icon={Receipt}
          tone="neutral"
        />

        <StatCard
          label="Cuentas a cobrar"
          value={pesos(totales.pendiente)}
          hint={`Vencido ${pesos(totales.vencido)}`}
          icon={Wallet}
          tone="danger"
          delta="-4%"
        />
      </div>

      {/* Navegación */}

      <nav
        className="flex flex-wrap justify-center gap-1 rounded-2xl border border-primary/10 bg-muted/60 p-2"
        aria-label="Secciones de Finanzas"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              tab === t.id
                ? "border-2 border-primary bg-card text-foreground shadow-sm"
                : "border-2 border-transparent text-foreground/80 hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* ───────────────────────── RESUMEN ───────────────────────── */}

      {tab === "resumen" && (
        <div className="space-y-5">
          <Panel
            title="Panorama financiero"
            action={
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {periodo}
              </span>
            }
          >
            <GraficoIngresosEgresos />
          </Panel>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel
              title="Ingresos por profesional"
              action={
                <span className="text-xs text-muted-foreground">
                  Distribución
                </span>
              }
            >
              {porProfesional.length === 0 ? (
                <Vacio texto="Todavía no hay ingresos cargados." />
              ) : (
                <GraficoRanking
                  items={porProfesional}
                  icon={TrendingUp}
                />
              )}
            </Panel>

            <Panel
              title="Egresos por categoría"
              action={
                <span className="text-xs text-muted-foreground">
                  Distribución
                </span>
              }
            >
              {porCategoria.length === 0 ? (
                <Vacio texto="Todavía no hay egresos cargados." />
              ) : (
                <GraficoRanking
                  items={porCategoria}
                  icon={ArrowDownRight}
                />
              )}
            </Panel>
          </div>

          <Panel
            title="Ingresos por tratamiento"
            action={
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {cobros.length} tratamientos
              </span>
            }
          >
            <GraficoTratamientos cobros={cobros} />
          </Panel>
        </div>
      )}

      {/* ───────────────────────── INGRESOS ───────────────────────── */}

      {tab === "ingresos" && (
        <Panel
          title="Cobros"
          action={
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar paciente, comprobante..."
                className="w-56 rounded-full border border-primary/20 bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
          }
        >
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-primary/[0.04] p-4">
              <div className="text-xs text-muted-foreground">
                Cobrado
              </div>
              <div className="mt-1 text-xl font-bold text-emerald-600">
                {pesos(totales.cobrado)}
              </div>
            </div>

            <div className="rounded-2xl bg-primary/[0.04] p-4">
              <div className="text-xs text-muted-foreground">
                Pendiente
              </div>
              <div className="mt-1 text-xl font-bold text-foreground">
                {pesos(totales.pendiente)}
              </div>
            </div>

            <div className="rounded-2xl bg-rose-500/[0.04] p-4">
              <div className="text-xs text-muted-foreground">
                Vencido
              </div>
              <div className="mt-1 text-xl font-bold text-rose-600">
                {pesos(totales.vencido)}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {cobrosFiltrados.length === 0 && (
              <Vacio texto="No hay cobros que coincidan con la búsqueda." />
            )}

            {cobrosFiltrados.map((c) => (
              <Fila
                key={c.id}
                icon={Receipt}
                titulo={
                  <span className="flex items-center gap-2">
                    {c.comprobante}

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoStyles[c.estado]}`}
                    >
                      {c.estado}
                    </span>
                  </span>
                }
                detalle={`${c.paciente} · ${c.concepto} · ${c.fecha} · ${c.metodo}`}
                derecha={
                  <span className="text-base font-bold text-foreground">
                    {pesos(c.monto)}
                  </span>
                }
              />
            ))}
          </div>
        </Panel>
      )}

      {/* ───────────────────────── EGRESOS ───────────────────────── */}

      {tab === "egresos" && (
        <Panel
          title="Egresos"
          action={
            <button
              onClick={() => setModalEgreso(true)}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Nuevo egreso
            </button>
          }
        >
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-rose-500/[0.04] p-4">
              <div className="text-xs text-muted-foreground">
                Total egresos
              </div>
              <div className="mt-1 text-xl font-bold text-rose-600">
                {pesos(totales.egresos)}
              </div>
            </div>

            <div className="rounded-2xl bg-primary/[0.04] p-4">
              <div className="text-xs text-muted-foreground">
                Movimientos
              </div>
              <div className="mt-1 text-xl font-bold text-foreground">
                {egresos.length}
              </div>
            </div>

            <div className="rounded-2xl bg-primary/[0.04] p-4">
              <div className="text-xs text-muted-foreground">
                Categorías activas
              </div>
              <div className="mt-1 text-xl font-bold text-foreground">
                {porCategoria.length}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {egresos.length === 0 && (
              <Vacio texto="Todavía no hay egresos. Cargá el primero con “Nuevo egreso”." />
            )}

            {egresos.map((e) => (
              <Fila
                key={e.id}
                icon={Banknote}
                titulo={
                  <span className="flex items-center gap-2">
                    {e.proveedor}

                    <span className="rounded-full border border-primary/20 px-2.5 py-0.5 text-xs font-medium text-foreground/80">
                      {e.categoria}
                    </span>
                  </span>
                }
                detalle={`${e.fecha} · ${e.metodo}${
                  e.notas ? ` · ${e.notas}` : ""
                }${e.comprobante ? ` · ${e.comprobante}` : ""}`}
                derecha={
                  <span className="text-base font-bold text-rose-600">
                    − {pesos(e.monto)}
                  </span>
                }
              />
            ))}
          </div>
        </Panel>
      )}

      {/* ───────────────────────── CAJA ───────────────────────── */}

      {tab === "caja" && (
        <Panel
          title="Caja diaria"
          action={
            <button
              onClick={alternarCaja}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
                cajaAbierta
                  ? "border border-primary/20 bg-card text-foreground/80 hover:bg-primary/5"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {cajaAbierta ? (
                <Lock className="h-4 w-4" />
              ) : (
                <LockOpen className="h-4 w-4" />
              )}

              {cajaAbierta ? "Cerrar caja" : "Abrir caja"}
            </button>
          }
        >
          <div className="mb-5 grid gap-4 md:grid-cols-[1fr_auto]">
            <div className="rounded-2xl bg-primary/[0.04] p-5">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    cajaAbierta
                      ? "bg-emerald-500"
                      : "bg-rose-500"
                  }`}
                />

                <span className="text-xs text-muted-foreground">
                  Estado actual
                </span>
              </div>

              <div className="mt-2 text-xl font-bold text-foreground">
                {cajaAbierta ? "Caja abierta" : "Caja cerrada"}
              </div>

              <div className="mt-1 text-xs text-muted-foreground">
                Últimos movimientos registrados durante la jornada.
              </div>
            </div>

            <div className="rounded-2xl border border-primary/10 bg-card px-6 py-5 text-right">
              <div className="text-xs text-muted-foreground">
                Saldo disponible
              </div>

              <div className="mt-1 text-2xl font-bold text-foreground">
                {pesos(totales.saldoCaja)}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {movimientos.map((m) => (
              <Fila
                key={m.id}
                icon={
                  m.tipo === "ingreso"
                    ? ArrowUpRight
                    : ArrowDownRight
                }
                titulo={m.detalle}
                detalle={`${m.hora} · ${
                  m.tipo === "ingreso" ? "Ingreso" : "Egreso"
                }`}
                derecha={
                  <span
                    className={`text-base font-bold ${
                      m.tipo === "ingreso"
                        ? "text-emerald-600"
                        : "text-rose-600"
                    }`}
                  >
                    {m.tipo === "ingreso" ? "+" : "−"}{" "}
                    {pesos(m.monto)}
                  </span>
                }
              />
            ))}
          </div>
        </Panel>
      )}

      {/* ───────────────────────── CUENTAS A COBRAR ───────────────────────── */}

      {tab === "cobrar" && (
        <Panel
          title="Cuentas a cobrar"
          action={
            <span className="rounded-full bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-600">
              {cobros.filter((c) => c.estado !== "Pagada").length} pendientes
            </span>
          }
        >
          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-primary/[0.04] p-5">
              <div className="text-xs text-muted-foreground">
                Total pendiente
              </div>

              <div className="mt-1 text-2xl font-bold text-foreground">
                {pesos(totales.pendiente)}
              </div>
            </div>

            <div className="rounded-2xl bg-rose-500/[0.04] p-5">
              <div className="text-xs text-muted-foreground">
                Total vencido
              </div>

              <div className="mt-1 text-2xl font-bold text-rose-600">
                {pesos(totales.vencido)}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {cobros.filter((c) => c.estado !== "Pagada").length ===
              0 && <Vacio texto="No hay cuentas pendientes." />}

            {cobros
              .filter((c) => c.estado !== "Pagada")
              .map((c) => (
                <Fila
                  key={c.id}
                  icon={CalendarDays}
                  titulo={
                    <span className="flex items-center gap-2">
                      {c.paciente}

                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoStyles[c.estado]}`}
                      >
                        {c.estado}
                      </span>
                    </span>
                  }
                  detalle={`${c.comprobante} · ${c.concepto} · vence ${
                    c.vence ?? "—"
                  }`}
                  derecha={
                    <>
                      <span className="text-base font-bold text-foreground">
                        {pesos(c.monto)}
                      </span>

                      <button
                        onClick={() => {
                          registrarEvento({
                            modulo: "Finanzas",
                            accion: "Recordatorio de cobro",
                            entidad: "Comprobante",
                            despues: c.comprobante,
                          });

                          toast.success(
                            `Recordatorio enviado a ${c.paciente}`,
                          );
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

      {/* ───────────────────────── REPORTES ───────────────────────── */}

      {tab === "reportes" && (
        <Panel title="Reportes financieros">
          <div className="mb-5 rounded-2xl bg-primary/[0.035] p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <FileDown className="h-5 w-5" />
              </span>

              <div>
                <div className="text-sm font-semibold text-foreground">
                  Información financiera
                </div>

                <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Generá reportes sobre ingresos, egresos,
                  rentabilidad y cuentas pendientes.
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: FileDown,
                titulo: "Informe financiero mensual",
                detalle:
                  "Ingresos, egresos y resultado neto del período.",
                formato: "PDF",
              },
              {
                icon: FileSpreadsheet,
                titulo: "Detalle de movimientos",
                detalle:
                  "Todos los cobros, egresos y movimientos de caja.",
                formato: "CSV",
              },
              {
                icon: TrendingUp,
                titulo: "Rentabilidad por profesional",
                detalle:
                  "Ingresos generados por cada integrante del equipo.",
                formato: "PDF",
              },
              {
                icon: Wallet,
                titulo: "Cuentas a cobrar",
                detalle:
                  "Pendientes y vencidos con seguimiento.",
                formato: "CSV",
              },
            ].map((r, index) => (
              <div
                key={r.titulo}
                className="finance-fade-up group flex items-center justify-between gap-3 rounded-2xl border border-primary/10 bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-sm"
                style={{
                  animationDelay: `${index * 80}ms`,
                }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-105">
                    <r.icon className="h-5 w-5" />
                  </span>

                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">
                      {r.titulo}
                    </div>

                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {r.detalle}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    registrarEvento({
                      modulo: "Finanzas",
                      accion: "Exportación de reporte",
                      entidad: "Reporte",
                      despues: r.titulo,
                    });

                    toast.info(
                      `Exportación a ${r.formato} disponible cuando conectemos el backend.`,
                    );
                  }}
                  className="shrink-0 rounded-full border border-primary/20 bg-card px-4 py-1.5 text-xs font-semibold text-foreground/80 hover:bg-primary/5"
                >
                  {r.formato}
                </button>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {modalEgreso && (
        <ModalEgreso
          onClose={() => setModalEgreso(false)}
          onGuardar={guardarEgreso}
        />
      )}
    </div>
  );
}