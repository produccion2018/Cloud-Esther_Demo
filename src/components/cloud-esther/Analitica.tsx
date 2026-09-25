// src/components/cloud-esther/Analitica.tsx
// Módulo ANALÍTICA de Cloud Esther — solo frontend, datos ficticios.
// Misma ADN visual que Finanzas + background propio de Analítica.
// Dependencias: react, lucide-react, sonner. No instala nada nuevo.

import { useMemo, useState } from "react";
import {
  Activity,
  Award,
  CalendarCheck2,
  FileDown,
  FileSpreadsheet,
  Percent,
  Repeat2,
  Search,
  Star,
  TrendingUp,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

/* ───────────────────────── Permisos ───────────────────────── */

export const ANALITICA_PERMISOS = {
  ver: "analitica.ver",
  exportar: "analitica.exportar",
  administrar: "analitica.administrar",
} as const;

/* ───────────────────────── Esther Trace ───────────────────────── */

type EventoTrace = {
  modulo: string;
  accion: string;
  entidad: string;
  antes?: string;
  despues?: string;
};

function registrarEvento(evento: EventoTrace) {
  console.log("[Esther Trace]", {
    ...evento,
    fecha: new Date().toISOString(),
  });
}

/* ───────────────────────── Datos ficticios ───────────────────────── */

const CLINIC_ID = "clinic_demo_001";

type TendenciaMes = {
  mes: string;
  turnos: number;
  cancelados: number;
};

const TENDENCIA: TendenciaMes[] = [
  { mes: "Abr", turnos: 142, cancelados: 12 },
  { mes: "May", turnos: 158, cancelados: 9 },
  { mes: "Jun", turnos: 149, cancelados: 15 },
  { mes: "Jul", turnos: 171, cancelados: 11 },
  { mes: "Ago", turnos: 186, cancelados: 14 },
  { mes: "Sep", turnos: 121, cancelados: 7 },
];

type OrigenPaciente = {
  clinic_id: string;
  canal: string;
  pacientes: number;
};

const ORIGENES: OrigenPaciente[] = [
  { clinic_id: CLINIC_ID, canal: "Recomendación", pacientes: 34 },
  { clinic_id: CLINIC_ID, canal: "Instagram", pacientes: 27 },
  { clinic_id: CLINIC_ID, canal: "Google", pacientes: 19 },
  { clinic_id: CLINIC_ID, canal: "Obra social", pacientes: 12 },
  { clinic_id: CLINIC_ID, canal: "Portal del paciente", pacientes: 8 },
];

type OcupacionDia = {
  dia: string;
  ocupacion: number;
};

const OCUPACION_SEMANA: OcupacionDia[] = [
  { dia: "Lun", ocupacion: 82 },
  { dia: "Mar", ocupacion: 91 },
  { dia: "Mié", ocupacion: 76 },
  { dia: "Jue", ocupacion: 88 },
  { dia: "Vie", ocupacion: 95 },
  { dia: "Sáb", ocupacion: 58 },
];

type Profesional = {
  clinic_id: string;
  nombre: string;
  especialidad: string;
  turnosAtendidos: number;
  ingresosGenerados: number;
  calificacion: number;
};

const PROFESIONALES: Profesional[] = [
  {
    clinic_id: CLINIC_ID,
    nombre: "Dra. Lucía Paz",
    especialidad: "Odontología general",
    turnosAtendidos: 58,
    ingresosGenerados: 1240000,
    calificacion: 4.9,
  },
  {
    clinic_id: CLINIC_ID,
    nombre: "Dr. Martín Sosa",
    especialidad: "Ortodoncia",
    turnosAtendidos: 41,
    ingresosGenerados: 980000,
    calificacion: 4.7,
  },
  {
    clinic_id: CLINIC_ID,
    nombre: "Dra. Carla Ibáñez",
    especialidad: "Implantología",
    turnosAtendidos: 33,
    ingresosGenerados: 1510000,
    calificacion: 4.8,
  },
  {
    clinic_id: CLINIC_ID,
    nombre: "Dr. Carlos Medina",
    especialidad: "Endodoncia",
    turnosAtendidos: 27,
    ingresosGenerados: 640000,
    calificacion: 4.6,
  },
];

const PERIODOS = ["Semana", "Mes", "Trimestre", "Año"] as const;

type TabId =
  | "resumen"
  | "pacientes"
  | "turnos"
  | "profesionales"
  | "reportes";

const TABS: { id: TabId; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "pacientes", label: "Pacientes" },
  { id: "turnos", label: "Turnos" },
  { id: "profesionales", label: "Profesionales" },
  { id: "reportes", label: "Reportes" },
];

/* ───────────────────────── Utilidades ───────────────────────── */

const pesos = (n: number) =>
  "$ " +
  new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
  }).format(n);

const numero = (n: number) =>
  new Intl.NumberFormat("es-AR").format(n);

/* ───────────────────────── Animaciones ───────────────────────── */

function AnimacionesAnalitica() {
  return (
    <style>{`
      @keyframes analyticsFadeUp {
        from {
          opacity: 0;
          transform: translateY(9px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes analyticsScale {
        from {
          opacity: 0;
          transform: scale(.95);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      @keyframes analyticsGrowX {
        from {
          width: 0;
        }
        to {
          width: var(--bar-width);
        }
      }

      @keyframes analyticsGrowY {
        from {
          transform: scaleY(0);
          transform-origin: bottom;
        }
        to {
          transform: scaleY(1);
          transform-origin: bottom;
        }
      }

      @keyframes analyticsDraw {
        from {
          stroke-dashoffset: 1000;
        }
        to {
          stroke-dashoffset: 0;
        }
      }

      @keyframes analyticsFloat {
        0%, 100% {
          transform: translateY(0);
          opacity: .45;
        }
        50% {
          transform: translateY(-4px);
          opacity: .8;
        }
      }

      .analytics-fade-up {
        animation: analyticsFadeUp .5s cubic-bezier(.2,.7,.2,1) both;
      }

      .analytics-scale {
        animation: analyticsScale .55s cubic-bezier(.2,.7,.2,1) both;
      }

      .analytics-grow-x {
        width: 0;
        animation: analyticsGrowX .8s cubic-bezier(.2,.7,.2,1) forwards;
      }

      .analytics-grow-y {
        animation: analyticsGrowY .7s cubic-bezier(.2,.7,.2,1) both;
      }

      .analytics-line {
        stroke-dasharray: 1000;
        stroke-dashoffset: 1000;
        animation: analyticsDraw 1.2s ease-out .15s forwards;
      }

      .analytics-float {
        animation: analyticsFloat 3s ease-in-out infinite;
      }

      @media (prefers-reduced-motion: reduce) {
        .analytics-fade-up,
        .analytics-scale,
        .analytics-grow-x,
        .analytics-grow-y,
        .analytics-line,
        .analytics-float {
          animation: none !important;
        }
      }
    `}</style>
  );
}

/* ───────────────────────── Fondo de módulo ───────────────────────── */
/*
 * Este NO es un simple background genérico.
 * La idea es que cada módulo tenga su propia "huella" visual.
 * Analítica utiliza una red de datos + línea de tendencia,
 * extremadamente transparente para no competir con el contenido.
 */

function FondoAnalitica() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Base */}
      <div className="absolute inset-0 bg-background" />

      {/* Red de datos muy sutil */}
      <div
        className="absolute inset-0 opacity-[0.42]"
        style={{
          backgroundImage: `
            linear-gradient(
              90deg,
              hsl(var(--primary) / 0.018) 1px,
              transparent 1px
            ),
            linear-gradient(
              0deg,
              hsl(var(--primary) / 0.018) 1px,
              transparent 1px
            )
          `,
          backgroundSize: "48px 48px",
          maskImage:
            "linear-gradient(to bottom, black, transparent 88%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black, transparent 88%)",
        }}
      />

      {/* Halo superior del módulo */}
      <div
        className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 opacity-[0.7]"
        style={{
          background:
            "radial-gradient(ellipse, hsl(var(--primary) / 0.045), transparent 68%)",
        }}
      />

      {/* Huella de analítica: tendencia */}
      <svg
        className="absolute right-[2%] top-[12%] h-[420px] w-[620px] opacity-[0.022]"
        viewBox="0 0 620 420"
        fill="none"
      >
        <defs>
          <linearGradient
            id="analytics-bg-line"
            x1="0"
            y1="0"
            x2="620"
            y2="0"
          >
            <stop offset="0" stopColor="currentColor" stopOpacity="0" />
            <stop offset=".45" stopColor="currentColor" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path
          d="M20 350 C90 330 110 286 170 300 C225 313 250 225 305 245 C365 267 385 170 440 190 C495 210 520 105 600 45"
          stroke="url(#analytics-bg-line)"
          strokeWidth="2"
          className="text-primary"
        />

        <path
          d="M20 350 C90 330 110 286 170 300 C225 313 250 225 305 245 C365 267 385 170 440 190 C495 210 520 105 600 45 L600 420 L20 420 Z"
          fill="currentColor"
          className="text-primary"
          opacity=".22"
        />

        {[90, 170, 250, 330, 410, 490, 570].map((x, index) => (
          <circle
            key={x}
            cx={x}
            cy={[325, 295, 265, 235, 205, 150, 70][index]}
            r="4"
            fill="currentColor"
            className="text-primary"
          />
        ))}
      </svg>

      {/* Halo inferior */}
      <div
        className="absolute -bottom-52 -left-40 h-[600px] w-[600px] rounded-full opacity-[0.45]"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--primary) / 0.035), transparent 65%)",
        }}
      />

      {/* Pequeños nodos decorativos */}
      <span className="analytics-float absolute right-[11%] top-[34%] h-1.5 w-1.5 rounded-full bg-primary/20" />
      <span
        className="analytics-float absolute right-[18%] top-[39%] h-1 w-1 rounded-full bg-primary/15"
        style={{ animationDelay: "800ms" }}
      />
      <span
        className="analytics-float absolute left-[8%] top-[48%] h-1.5 w-1.5 rounded-full bg-primary/10"
        style={{ animationDelay: "1400ms" }}
      />
    </div>
  );
}

/* ───────────────────────── ADN de cards secundarias ───────────────────────── */

function InsightCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "primary",
  delay = 0,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  detail: string;
  tone?: "primary" | "success" | "warning";
  delay?: number;
}) {
  const styles = {
    primary: {
      blob: "bg-primary/10",
      icon: "bg-primary/10 text-primary",
      value: "text-foreground",
    },
    success: {
      blob: "bg-emerald-500/10",
      icon: "bg-emerald-500/10 text-emerald-600",
      value: "text-foreground",
    },
    warning: {
      blob: "bg-amber-500/10",
      icon: "bg-amber-500/10 text-amber-600",
      value: "text-foreground",
    },
  }[tone];

  return (
    <div
      className="analytics-fade-up group relative overflow-hidden rounded-3xl border border-primary/10 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -right-7 -top-8 h-24 w-24 rounded-full ${styles.blob} transition-transform duration-300 group-hover:scale-125`}
      />

      <div className="relative flex items-start justify-between">
        <span
          className={`grid h-10 w-10 place-items-center rounded-2xl ${styles.icon}`}
        >
          <Icon className="h-5 w-5" />
        </span>

        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Analítica
        </span>
      </div>

      <div className={`relative mt-5 text-2xl font-bold ${styles.value}`}>
        {value}
      </div>

      <div className="relative mt-1 text-sm font-medium text-foreground/80">
        {label}
      </div>

      <div className="relative mt-1 text-xs text-muted-foreground">
        {detail}
      </div>
    </div>
  );
}

/* ───────────────────────── StatCard ───────────────────────── */

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
  icon: typeof Users;
  tone: StatTone;
  delta?: string;
}) {
  const t = STAT_TONES[tone];
  const deltaPositive = !delta?.trim().startsWith("-");

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

/* ───────────────────────── Panel ───────────────────────── */

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
    <section className="rounded-3xl border border-primary/10 bg-card p-5 shadow-sm transition-all duration-200 hover:border-primary/15 hover:shadow-md md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {action}
      </div>

      {children}
    </section>
  );
}

/* ───────────────────────── Barra ───────────────────────── */

function BarraH({
  label,
  valor,
  max,
  formato = numero,
  delay = 0,
}: {
  label: string;
  valor: number;
  max: number;
  formato?: (n: number) => string;
  delay?: number;
}) {
  const pct =
    max > 0 ? Math.max(4, Math.round((valor / max) * 100)) : 0;

  return (
    <div>
      <div className="mb-1.5 flex justify-between gap-3 text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="font-semibold text-foreground">
          {formato(valor)}
        </span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-primary/10">
        <div
          className="analytics-grow-x h-2.5 rounded-full bg-primary"
          style={
            {
              "--bar-width": `${pct}%`,
              animationDelay: `${delay}ms`,
            } as React.CSSProperties
          }
        />
      </div>
    </div>
  );
}

/* ───────────────────────── Vacío ───────────────────────── */

function Vacio({ texto }: { texto: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-primary/20 py-10 text-center text-sm text-muted-foreground">
      {texto}
    </div>
  );
}

/* ───────────────────────── Gráfico evolución ───────────────────────── */

function GraficoEvolucion() {
  const width = 820;
  const height = 310;

  const padding = {
    left: 42,
    right: 20,
    top: 25,
    bottom: 45,
  };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue =
    Math.max(...TENDENCIA.map((t) => t.turnos)) + 20;

  const puntos = TENDENCIA.map((t, index) => {
    const x =
      padding.left +
      (index / (TENDENCIA.length - 1)) * chartWidth;

    const y =
      padding.top +
      (1 - t.turnos / maxValue) * chartHeight;

    const yCancelados =
      padding.top +
      (1 - t.cancelados / maxValue) * chartHeight;

    return {
      ...t,
      x,
      y,
      yCancelados,
    };
  });

  const lineaTurnos = puntos
    .map(
      (p, index) =>
        `${index === 0 ? "M" : "L"} ${p.x} ${p.y}`,
    )
    .join(" ");

  const lineaCancelados = puntos
    .map(
      (p, index) =>
        `${index === 0 ? "M" : "L"} ${p.x} ${p.yCancelados}`,
    )
    .join(" ");

  const areaTurnos = `
    M ${puntos[0].x} ${padding.top + chartHeight}
    L ${puntos.map((p) => `${p.x} ${p.y}`).join(" L ")}
    L ${puntos[puntos.length - 1].x} ${padding.top + chartHeight}
    Z
  `;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">
            Ritmo de agenda
          </div>

          <div className="mt-0.5 text-xs text-muted-foreground">
            Evolución de actividad y cancelaciones
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Turnos
          </span>

          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-400" />
            Cancelados
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[300px] min-w-[650px] w-full"
          role="img"
          aria-label="Evolución de turnos y cancelaciones"
        >
          {[0, 25, 50, 75, 100].map((tick) => {
            const y =
              padding.top +
              ((100 - tick) / 100) * chartHeight;

            const value = Math.round((tick / 100) * maxValue);

            return (
              <g key={tick}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeDasharray="3 7"
                  className="text-primary/10"
                />

                <text
                  x={padding.left - 9}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  className="fill-muted-foreground"
                >
                  {value}
                </text>
              </g>
            );
          })}

          <path
            d={areaTurnos}
            fill="currentColor"
            className="text-primary/[0.06]"
          />

          <path
            d={lineaTurnos}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="1000"
            className="analytics-line text-primary"
          />

          <path
            d={lineaCancelados}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="5 7"
            pathLength="1000"
            className="analytics-line text-rose-400"
          />

          {puntos.map((p, index) => (
            <g key={p.mes}>
              <circle
                cx={p.x}
                cy={p.y}
                r="8"
                fill="currentColor"
                className="text-primary/10"
              />

              <circle
                cx={p.x}
                cy={p.y}
                r="4.5"
                fill="currentColor"
                className="analytics-scale text-primary"
                style={{
                  animationDelay: `${index * 90}ms`,
                }}
              />

              <text
                x={p.x}
                y={height - 15}
                textAnchor="middle"
                fontSize="11"
                className="fill-muted-foreground"
              >
                {p.mes}
              </text>

              <title>
                {p.mes}: {p.turnos} turnos · {p.cancelados} cancelados
              </title>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

/* ───────────────────────── Gráfico captación ───────────────────────── */

const ORIGEN_COLORES = [
  "hsl(var(--primary))",
  "#10b981",
  "#60a5fa",
  "#f59e0b",
  "#f43f5e",
];

function GraficoCaptacion({
  datos,
}: {
  datos: { label: string; valor: number }[];
}) {
  const total = datos.reduce((sum, item) => sum + item.valor, 0);

  let acumulado = 0;

  const segmentos = datos.map((item, index) => {
    const inicio = total ? (acumulado / total) * 360 : 0;

    acumulado += item.valor;

    const fin = total ? (acumulado / total) * 360 : 0;

    return {
      ...item,
      inicio,
      fin,
      color: ORIGEN_COLORES[index % ORIGEN_COLORES.length],
    };
  });

  const gradient =
    segmentos.length > 0
      ? segmentos
          .map(
            (segmento) =>
              `${segmento.color} ${segmento.inicio}deg ${segmento.fin}deg`,
          )
          .join(", ")
      : "hsl(var(--primary) / 0.08) 0deg 360deg";

  return (
    <div className="grid gap-6 md:grid-cols-[220px_1fr] md:items-center">
      <div className="flex justify-center">
        <div
          className="analytics-scale relative h-48 w-48 rounded-full"
          style={{
            background: `conic-gradient(${gradient})`,
          }}
        >
          <div className="absolute inset-[22px] flex flex-col items-center justify-center rounded-full border border-primary/10 bg-card shadow-inner">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {numero(total)}
            </span>

            <span className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              pacientes
            </span>
          </div>

          <span className="analytics-float absolute -right-1 top-5 h-3 w-3 rounded-full bg-primary/30" />
        </div>
      </div>

      <div className="space-y-2.5">
        {segmentos.map((segmento, index) => {
          const porcentaje = total
            ? Math.round((segmento.valor / total) * 100)
            : 0;

          return (
            <div
              key={segmento.label}
              className="analytics-fade-up rounded-2xl border border-primary/10 bg-card p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-sm"
              style={{
                animationDelay: `${index * 70}ms`,
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: segmento.color }}
                  />

                  <span className="truncate text-sm text-foreground/80">
                    {segmento.label}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {numero(segmento.valor)}
                  </span>

                  <span className="min-w-9 text-right text-sm font-bold text-foreground">
                    {porcentaje}%
                  </span>
                </div>
              </div>

              <div className="mt-2 h-1 overflow-hidden rounded-full bg-primary/10">
                <div
                  className="analytics-grow-x h-full rounded-full"
                  style={
                    {
                      "--bar-width": `${porcentaje}%`,
                      backgroundColor: segmento.color,
                      animationDelay: `${150 + index * 80}ms`,
                    } as React.CSSProperties
                  }
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────────── Ocupación ───────────────────────── */

function GraficoOcupacion() {
  const max = Math.max(
    ...OCUPACION_SEMANA.map((item) => item.ocupacion),
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-6 gap-2">
        {OCUPACION_SEMANA.map((item, index) => {
          const intensidad = item.ocupacion / 100;

          return (
            <div
              key={item.dia}
              className="analytics-fade-up group text-center"
              style={{
                animationDelay: `${index * 70}ms`,
              }}
            >
              <div
                className="relative mx-auto flex h-28 w-full max-w-[72px] items-end overflow-hidden rounded-2xl border border-primary/10 bg-card p-1.5 transition-all duration-200 group-hover:-translate-y-1 group-hover:border-primary/20 group-hover:shadow-sm"
                title={`${item.dia}: ${item.ocupacion}%`}
              >
                <div
                  className="analytics-grow-y w-full rounded-xl bg-primary transition-all duration-300 group-hover:bg-primary/80"
                  style={{
                    height: `${Math.max(12, item.ocupacion)}%`,
                    opacity: 0.25 + intensidad * 0.7,
                    animationDelay: `${index * 80}ms`,
                  }}
                />

                <span className="absolute inset-x-0 top-2 text-xs font-bold text-foreground">
                  {item.ocupacion}%
                </span>
              </div>

              <div className="mt-2 text-xs font-medium text-muted-foreground">
                {item.dia}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Menor ocupación</span>

        <div className="flex items-center gap-1.5">
          <span className="h-2 w-7 rounded-full bg-primary/20" />
          <span className="h-2 w-7 rounded-full bg-primary/40" />
          <span className="h-2 w-7 rounded-full bg-primary/70" />
          <span className="h-2 w-7 rounded-full bg-primary" />
        </div>

        <span>Mayor ocupación</span>
      </div>

      <div className="rounded-2xl border border-primary/10 bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Día de mayor demanda
          </span>

          <span className="text-sm font-bold text-foreground">
            {OCUPACION_SEMANA.reduce((prev, current) =>
              current.ocupacion > prev.ocupacion ? current : prev,
            ).dia}
          </span>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Ocupación máxima
          </span>

          <span className="text-sm font-bold text-emerald-600">
            {max}%
          </span>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Página ───────────────────────── */

export function Analitica() {
  const [tab, setTab] = useState<TabId>("resumen");
  const [periodo, setPeriodo] =
    useState<(typeof PERIODOS)[number]>("Mes");
  const [sucursal, setSucursal] = useState("Todas");
  const [busqueda, setBusqueda] = useState("");

  const totales = useMemo(() => {
    const turnos = TENDENCIA.reduce(
      (sum, item) => sum + item.turnos,
      0,
    );

    const cancelados = TENDENCIA.reduce(
      (sum, item) => sum + item.cancelados,
      0,
    );

    const ocupacionProm = Math.round(
      OCUPACION_SEMANA.reduce(
        (sum, item) => sum + item.ocupacion,
        0,
      ) / OCUPACION_SEMANA.length,
    );

    const pacientesNuevos = ORIGENES.reduce(
      (sum, item) => sum + item.pacientes,
      0,
    );

    const ingresoTotal = PROFESIONALES.reduce(
      (sum, item) => sum + item.ingresosGenerados,
      0,
    );

    const ingresoPromedioPaciente = pacientesNuevos
      ? Math.round(ingresoTotal / pacientesNuevos)
      : 0;

    return {
      turnos,
      cancelados,
      tasaCancelacion: turnos
        ? Math.round((cancelados / turnos) * 100)
        : 0,
      ocupacionProm,
      pacientesNuevos,
      ingresoPromedioPaciente,
      ingresoTotal,
    };
  }, []);

  const maxIngresoProf = Math.max(
    ...PROFESIONALES.map((p) => p.ingresosGenerados),
  );

  const profesionalesFiltrados = PROFESIONALES.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()),
  );

  const profesionalTop = useMemo(
    () =>
      [...PROFESIONALES].sort(
        (a, b) => b.ingresosGenerados - a.ingresosGenerados,
      )[0],
    [],
  );

  const ocupacionTop = useMemo(
    () =>
      [...OCUPACION_SEMANA].sort(
        (a, b) => b.ocupacion - a.ocupacion,
      )[0],
    [],
  );

  function exportar(nombre: string, formato: string) {
    registrarEvento({
      modulo: "Analítica",
      accion: "Exportación de reporte",
      entidad: "Reporte",
      despues: nombre,
    });

    toast.info(
      `Exportación a ${formato} disponible cuando conectemos el backend.`,
    );
  }

  return (
    <>
      <FondoAnalitica />
      <AnimacionesAnalitica />

      <div className="relative mx-auto w-full max-w-6xl space-y-5 p-4 md:p-6">
        {/* Header */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-xl bg-primary/10 text-primary">
                <Activity className="h-4 w-4" />
              </span>

              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary/70">
                Inteligencia de clínica
              </span>
            </div>

            <h1 className="font-display text-3xl font-bold text-foreground">
              Analítica
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Métricas y tendencias de tu clínica.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-full border border-primary/20 bg-card p-1 shadow-sm">
              {PERIODOS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriodo(p)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                    periodo === p
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <select
              value={sucursal}
              onChange={(e) => setSucursal(e.target.value)}
              className="rounded-full border border-primary/20 bg-card px-3.5 py-2 text-[11px] font-semibold text-foreground/80 shadow-sm outline-none transition focus:border-primary"
              aria-label="Sucursal"
            >
              <option>Todas</option>
              <option>Sucursal Centro</option>
              <option>Sucursal Norte</option>
            </select>
          </div>
        </header>

        {/* Cards principales */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Turnos del mes"
            value={numero(totales.turnos)}
            hint="vs. período anterior"
            icon={CalendarCheck2}
            tone="primary"
            delta="+8%"
          />

          <StatCard
            label="Ocupación de agenda"
            value={`${totales.ocupacionProm}%`}
            hint="Promedio semanal"
            icon={Percent}
            tone="success"
            delta="+3%"
          />

          <StatCard
            label="Pacientes nuevos"
            value={numero(totales.pacientesNuevos)}
            hint="En el período"
            icon={UserPlus}
            tone="success"
            delta="+11%"
          />

          <StatCard
            label="Ingreso por paciente"
            value={pesos(totales.ingresoPromedioPaciente)}
            hint="Promedio del período"
            icon={TrendingUp}
            tone="neutral"
          />

          <StatCard
            label="Cancelaciones"
            value={`${totales.tasaCancelacion}%`}
            hint={`${totales.cancelados} turnos cancelados`}
            icon={XCircle}
            tone="danger"
            delta="-2%"
          />
        </div>

        {/* Tabs */}
        <nav
          className="flex flex-wrap justify-center gap-1 rounded-2xl border border-primary/10 bg-card p-1.5 shadow-sm"
          aria-label="Secciones de Analítica"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition ${
                tab === t.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {/* ───────────────────── RESUMEN ───────────────────── */}

        {tab === "resumen" && (
          <div className="space-y-5">
            <Panel
              title="Evolución de la agenda"
              action={
                <div className="rounded-full border border-primary/10 bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground shadow-sm">
                  {periodo} · {sucursal}
                </div>
              }
            >
              <GraficoEvolucion />
            </Panel>

            <div className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
              <Panel
                title="Captación de pacientes"
                action={
                  <span className="rounded-full bg-primary/5 px-3 py-1 text-[11px] font-semibold text-primary">
                    {numero(totales.pacientesNuevos)} nuevos
                  </span>
                }
              >
                <GraficoCaptacion
                  datos={ORIGENES.map((o) => ({
                    label: o.canal,
                    valor: o.pacientes,
                  }))}
                />
              </Panel>

              <Panel
                title="Ocupación de agenda"
                action={
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
                    {totales.ocupacionProm}% promedio
                  </span>
                }
              >
                <GraficoOcupacion />
              </Panel>
            </div>

            {/* Cards secundarias con el mismo ADN */}
            <div className="grid gap-4 md:grid-cols-3">
              <InsightCard
                icon={CalendarCheck2}
                label="Actividad registrada"
                value={numero(totales.turnos)}
                detail="turnos registrados en el período"
                tone="primary"
              />

              <InsightCard
                icon={Award}
                label="Profesional destacado"
                value={profesionalTop.nombre}
                detail={`${pesos(
                  profesionalTop.ingresosGenerados,
                )} generados`}
                tone="success"
                delay={80}
              />

              <InsightCard
                icon={TrendingUp}
                label="Mayor demanda"
                value={`${ocupacionTop.ocupacion}%`}
                detail={`${ocupacionTop.dia} es el día más ocupado`}
                tone="warning"
                delay={160}
              />
            </div>
          </div>
        )}

        {/* ───────────────────── PACIENTES ───────────────────── */}

        {tab === "pacientes" && (
          <div className="space-y-5">
            <Panel
              title="Origen de los pacientes nuevos"
              action={
                <span className="rounded-full bg-primary/5 px-3 py-1 text-[11px] font-semibold text-primary">
                  {numero(totales.pacientesNuevos)} pacientes
                </span>
              }
            >
              <GraficoCaptacion
                datos={ORIGENES.map((o) => ({
                  label: o.canal,
                  valor: o.pacientes,
                }))}
              />
            </Panel>

            <div className="grid gap-4 md:grid-cols-2">
              {ORIGENES.map((o, index) => {
                const porcentaje = Math.round(
                  (o.pacientes / totales.pacientesNuevos) * 100,
                );

                return (
                  <div
                    key={o.canal}
                    className="analytics-fade-up group relative overflow-hidden rounded-3xl border border-primary/10 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md"
                    style={{
                      animationDelay: `${index * 70}ms`,
                    }}
                  >
                    <span className="pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full bg-primary/5 transition-transform duration-300 group-hover:scale-125" />

                    <div className="relative flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                          <Repeat2 className="h-5 w-5" />
                        </span>

                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-foreground">
                            {o.canal}
                          </div>

                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {numero(o.pacientes)} pacientes
                          </div>
                        </div>
                      </div>

                      <span className="text-base font-bold text-foreground">
                        {porcentaje}%
                      </span>
                    </div>

                    <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-primary/10">
                      <div
                        className="analytics-grow-x h-full rounded-full bg-primary"
                        style={
                          {
                            "--bar-width": `${porcentaje}%`,
                            animationDelay: `${200 + index * 70}ms`,
                          } as React.CSSProperties
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ───────────────────── TURNOS ───────────────────── */}

        {tab === "turnos" && (
          <div className="space-y-5">
            <Panel
              title="Mapa de ocupación semanal"
              action={
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-600">
                  Promedio {totales.ocupacionProm}%
                </span>
              }
            >
              <GraficoOcupacion />
            </Panel>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {OCUPACION_SEMANA.map((d, index) => (
                <div
                  key={d.dia}
                  className="analytics-fade-up group relative overflow-hidden rounded-3xl border border-primary/10 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md"
                  style={{
                    animationDelay: `${index * 70}ms`,
                  }}
                >
                  <span className="pointer-events-none absolute -right-5 -top-7 h-20 w-20 rounded-full bg-primary/5 transition-transform duration-300 group-hover:scale-125" />

                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
                        <CalendarCheck2 className="h-5 w-5" />
                      </span>

                      <span className="text-sm font-semibold text-foreground">
                        {d.dia}
                      </span>
                    </div>

                    <span
                      className={`text-lg font-bold ${
                        d.ocupacion >= 85
                          ? "text-emerald-600"
                          : "text-foreground"
                      }`}
                    >
                      {d.ocupacion}%
                    </span>
                  </div>

                  <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-primary/10">
                    <div
                      className="analytics-grow-x h-full rounded-full bg-primary"
                      style={
                        {
                          "--bar-width": `${d.ocupacion}%`,
                          animationDelay: `${250 + index * 80}ms`,
                        } as React.CSSProperties
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ───────────────────── PROFESIONALES ───────────────────── */}

        {tab === "profesionales" && (
          <div className="space-y-5">
            <Panel
              title="Rendimiento de profesionales"
              action={
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />

                  <input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar profesional..."
                    className="w-56 rounded-full border border-primary/20 bg-card py-1.5 pl-8 pr-3 text-xs outline-none transition focus:border-primary"
                  />
                </div>
              }
            >
              <div className="space-y-3">
                {profesionalesFiltrados.length === 0 && (
                  <Vacio texto="No hay profesionales que coincidan con la búsqueda." />
                )}

                {profesionalesFiltrados.map((p, index) => (
                  <div
                    key={p.nombre}
                    className="analytics-fade-up group relative overflow-hidden rounded-3xl border border-primary/10 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md"
                    style={{
                      animationDelay: `${index * 70}ms`,
                    }}
                  >
                    <span className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-primary/5 transition-transform duration-300 group-hover:scale-125" />

                    <div className="relative flex flex-wrap items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                          <Award className="h-5 w-5" />
                        </span>

                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-foreground">
                            {p.nombre}
                          </div>

                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {p.especialidad} · {p.turnosAtendidos} turnos
                          </div>

                          <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-amber-600">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {p.calificacion}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-base font-bold text-foreground">
                          {pesos(p.ingresosGenerados)}
                        </div>

                        <div className="text-[11px] text-muted-foreground">
                          ingresos generados
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Distribución de ingresos por profesional">
              <div className="space-y-5">
                {PROFESIONALES.map((p, index) => (
                  <BarraH
                    key={p.nombre}
                    label={p.nombre}
                    valor={p.ingresosGenerados}
                    max={maxIngresoProf}
                    formato={pesos}
                    delay={index * 90}
                  />
                ))}
              </div>
            </Panel>
          </div>
        )}

        {/* ───────────────────── REPORTES ───────────────────── */}

        {tab === "reportes" && (
          <div className="space-y-5">
            <Panel
              title="Centro de reportes"
              action={
                <span className="rounded-full bg-primary/5 px-3 py-1 text-[11px] font-semibold text-primary">
                  {periodo} · {sucursal}
                </span>
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  {
                    icon: FileDown,
                    titulo: "Informe de gestión mensual",
                    detalle:
                      "Turnos, ocupación y cancelaciones del período.",
                    formato: "PDF",
                  },
                  {
                    icon: Users,
                    titulo: "Origen de pacientes",
                    detalle:
                      "Pacientes nuevos por canal de captación.",
                    formato: "CSV",
                  },
                  {
                    icon: Award,
                    titulo: "Productividad por profesional",
                    detalle:
                      "Turnos atendidos e ingresos generados.",
                    formato: "PDF",
                  },
                  {
                    icon: FileSpreadsheet,
                    titulo: "Detalle de turnos",
                    detalle:
                      "Listado completo de turnos del período.",
                    formato: "CSV",
                  },
                ].map((r, index) => (
                  <div
                    key={r.titulo}
                    className="analytics-fade-up group relative overflow-hidden rounded-3xl border border-primary/10 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md"
                    style={{
                      animationDelay: `${index * 70}ms`,
                    }}
                  >
                    <span className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-primary/5 transition-transform duration-300 group-hover:scale-125" />

                    <div className="relative flex items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                          <r.icon className="h-5 w-5" />
                        </span>

                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-foreground">
                            {r.titulo}
                          </div>

                          <div className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                            {r.detalle}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          exportar(r.titulo, r.formato)
                        }
                        className="shrink-0 rounded-full border border-primary/20 bg-card px-3 py-1.5 text-[11px] font-bold text-foreground/80 transition hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
                      >
                        {r.formato}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <div className="grid gap-4 sm:grid-cols-3">
              <InsightCard
                icon={Users}
                label="Pacientes analizados"
                value={numero(totales.pacientesNuevos)}
                detail="pacientes nuevos registrados"
              />

              <InsightCard
                icon={TrendingUp}
                label="Ingresos generados"
                value={pesos(totales.ingresoTotal)}
                detail="total generado por profesionales"
                tone="success"
                delay={80}
              />

              <InsightCard
                icon={Award}
                label="Profesionales"
                value={numero(PROFESIONALES.length)}
                detail="profesionales incluidos"
                tone="warning"
                delay={160}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}