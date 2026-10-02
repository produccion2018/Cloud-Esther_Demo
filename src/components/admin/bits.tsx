import type { ReactNode } from "react";
import { Inbox, Loader2 } from "lucide-react";

import { ETIQUETA_PAGO, type Interes } from "@/lib/admin/formato";
import type { EstadoDemo, EstadoPago } from "@/lib/admin/tipos";
import { cn } from "@/lib/utils";

/* Piezas visuales comunes del panel (mismo lenguaje que Cloud Esther). */

const PILDORA =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold";

export function StatusBadge({ status }: { status: EstadoPago }) {
  const estilos: Record<EstadoPago, string> = {
    "al-dia": "border-success/25 bg-success/10 text-success",
    pendiente: "border-warning/40 bg-warning/15 text-warning-foreground",
    mora: "border-destructive/25 bg-destructive/10 text-destructive",
    suspendida: "border-border bg-muted text-muted-foreground",
  };
  const punto: Record<EstadoPago, string> = {
    "al-dia": "bg-success",
    pendiente: "bg-warning",
    mora: "bg-destructive",
    suspendida: "bg-muted-foreground",
  };
  return (
    <span className={cn(PILDORA, estilos[status])}>
      <span className={cn("h-1.5 w-1.5 rounded-full", punto[status])} />
      {ETIQUETA_PAGO[status]}
    </span>
  );
}

export function EstadoDemoBadge({ estado }: { estado: EstadoDemo }) {
  const estilos: Record<EstadoDemo, string> = {
    "En curso": "border-primary/25 bg-primary/10 text-primary",
    "Sin actividad": "border-border bg-muted text-muted-foreground",
    Contactada: "border-warning/40 bg-warning/15 text-warning-foreground",
    Convertida: "border-success/25 bg-success/10 text-success",
    Descartada: "border-border bg-muted text-muted-foreground line-through",
  };
  return <span className={cn(PILDORA, estilos[estado])}>{estado}</span>;
}

export function InteresBadge({ interes }: { interes: Interes }) {
  const estilos: Record<Interes, string> = {
    Alto: "border-success/25 bg-success/10 text-success",
    Medio: "border-warning/40 bg-warning/15 text-warning-foreground",
    Bajo: "border-border bg-muted text-muted-foreground",
  };
  const barras = interes === "Alto" ? 3 : interes === "Medio" ? 2 : 1;
  return (
    <span
      className={cn(PILDORA, estilos[interes])}
      title="Según ingresos, tiempo de uso y módulos recorridos"
    >
      <span className="flex items-end gap-px">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={cn(
              "w-[3px] rounded-sm bg-current",
              n <= barras ? "opacity-100" : "opacity-25",
            )}
            style={{ height: 4 + n * 2 }}
          />
        ))}
      </span>
      Interés {interes.toLowerCase()}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  icon,
  accent,
  tono,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  accent?: boolean;
  tono?: "success" | "warning" | "destructive";
}) {
  const color =
    tono === "success"
      ? "text-success"
      : tono === "warning"
        ? "text-warning-foreground"
        : tono === "destructive"
          ? "text-destructive"
          : "text-primary";
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[22px] border p-4 transition-transform hover:-translate-y-0.5",
        accent
          ? "border-transparent text-primary-foreground"
          : "border-primary/20 bg-gradient-to-br from-card to-primary/[0.06]",
      )}
      style={
        accent
          ? { background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }
          : { boxShadow: "var(--shadow-card)" }
      }
    >
      <div className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-primary/[0.05] ring-[12px] ring-primary/[0.04]" />
      <div className="relative flex items-start justify-between gap-3">
        <p
          className={cn(
            "text-[10.5px] font-bold uppercase tracking-[0.1em]",
            accent ? "text-white/80" : "text-primary/75",
          )}
        >
          {label}
        </p>
        {icon && (
          <span
            className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-full",
              accent ? "bg-white/15" : "bg-primary/[0.08] text-primary",
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <p
        className={cn(
          "relative mt-1 text-[22px] font-extrabold leading-tight tracking-tight tabular-nums sm:text-[28px]",
          accent ? "" : color,
        )}
      >
        {value}
      </p>
      {hint && (
        <p
          className={cn(
            "relative mt-0.5 text-xs",
            accent ? "text-white/80" : "text-muted-foreground",
          )}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

/** Tarjeta de sección con título, ayuda y acciones. */
export function Seccion({
  titulo,
  descripcion,
  acciones,
  children,
  className,
  sinPadding,
}: {
  titulo: string;
  descripcion?: string;
  acciones?: ReactNode;
  children: ReactNode;
  className?: string;
  sinPadding?: boolean;
}) {
  return (
    <section
      className={cn("overflow-hidden rounded-[24px] border border-border/80 bg-card", className)}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold tracking-tight">{titulo}</h2>
          {descripcion && <p className="mt-0.5 text-xs text-muted-foreground">{descripcion}</p>}
        </div>
        {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
      </div>
      <div className={sinPadding ? "" : "p-5"}>{children}</div>
    </section>
  );
}

export function Vacio({ titulo, texto }: { titulo: string; texto?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-primary/20 bg-primary/[0.025] px-4 py-10 text-center">
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Inbox className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-semibold">{titulo}</p>
      {texto && <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">{texto}</p>}
    </div>
  );
}

export function Cargando() {
  return (
    <div className="grid place-items-center py-16 text-sm text-muted-foreground">
      <span className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
      </span>
    </div>
  );
}

/** Barra de uso contra el límite del plan. */
export function BarraUso({ usado, limite }: { usado: number; limite: number }) {
  const pct = Math.min(100, Math.round((usado / Math.max(1, limite)) * 100));
  return (
    <div className="min-w-[90px]">
      <div className="flex justify-between text-[11px]">
        <span className="font-semibold tabular-nums">
          {usado.toLocaleString("es-AR")}
          <span className="font-normal text-muted-foreground">
            {" "}
            / {limite.toLocaleString("es-AR")}
          </span>
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full",
            pct >= 100 ? "bg-destructive" : pct >= 85 ? "bg-warning" : "bg-primary",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export const tooltipGrafico = {
  contentStyle: {
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--card)",
    fontSize: 12,
  },
};
