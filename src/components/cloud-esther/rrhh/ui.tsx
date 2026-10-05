import { useEffect } from "react";
import type { ReactNode } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TeamMember } from "@/lib/cloud-esther/equipo-profesional-data";

/* Piezas compartidas del módulo de Recursos Humanos (mismo lenguaje visual que Marketing e Inventario). */

export type SeccionRRHH =
  | "resumen"
  | "personas"
  | "asistencia"
  | "licencias"
  | "nomina"
  | "desarrollo"
  | "comunicacion"
  | "documentos"
  | "gestion";

export type Ctx = {
  onToast: (m: string) => void;
  usuario: string;
  sucursales: string[];
  ir: (s: SeccionRRHH) => void;
  abrirPersona: (id: string) => void;
  preguntar: (q: string) => void;
};

export function ars(n: number) {
  return `$ ${Math.round(n).toLocaleString("es-AR")}`;
}
export function fecha(iso: string) {
  return iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—";
}
export function fechaHora(iso: string) {
  const d = new Date(iso);
  return `${fecha(iso)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
export function hace(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 60) return `hace ${Math.max(1, min)} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}
export function titulo(t: string) {
  return t
    .trim()
    .toLocaleLowerCase("es")
    .replace(/(^|\s)\p{L}/gu, (c) => c.toUpperCase());
}
export function descargarCSV(nombre: string, filas: (string | number)[][]) {
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
/** Abre una ventana con HTML listo para imprimir o guardar como PDF. */
export function imprimirHTML(tituloDoc: string, cuerpo: string) {
  const w = window.open("", "_blank", "width=820,height=900");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${tituloDoc}</title>
<style>body{font-family:system-ui,sans-serif;color:#1f1b2e;padding:32px;font-size:13px}h1{color:#6d28d9;margin:0 0 4px}h2{font-size:15px;margin:22px 0 8px}table{width:100%;border-collapse:collapse}th,td{padding:7px 8px;border-bottom:1px solid #e9e3fb;text-align:left}th{background:#f5f1ff}.r{text-align:right}.tot td{font-weight:700;color:#6d28d9;font-size:15px}.meta{display:flex;justify-content:space-between;gap:24px;margin-top:12px}.firma{margin-top:60px;display:flex;justify-content:space-between}.firma span{border-top:1px solid #999;padding-top:6px;width:40%;text-align:center}</style>
</head><body>${cuerpo}<script>window.onload=()=>window.print()</script></body></html>`);
  w.document.close();
}

export const INPUT =
  "h-9 w-full rounded-xl border border-primary/12 bg-white px-3 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary/45 focus:ring-4 focus:ring-primary/10";
export const BTN_PRIMARIO =
  "btn-ce focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
export const BTN_SECUNDARIO =
  "btn-ce-outline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
export const BTN_ICONO =
  "grid size-8 shrink-0 place-items-center rounded-full border border-primary/12 bg-white text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary/10 hover:text-primary disabled:opacity-40";
export const CHIP = (activo: boolean) =>
  `inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
    activo
      ? "bg-primary text-primary-foreground"
      : "text-muted-foreground hover:bg-card hover:text-foreground"
  }`;

export const ROL_LABEL: Record<TeamMember["role"], string> = {
  odontologo: "Odontólogo/a",
  asistente: "Asistente",
  secretaria: "Recepción",
  administrador: "Administración",
};

export function Pill({ children, clase }: { children: ReactNode; clase: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${clase}`}
    >
      {children}
    </span>
  );
}
export function Avatar({
  m,
  tam = "size-10",
}: {
  m: Pick<TeamMember, "firstName" | "lastName">;
  tam?: string;
}) {
  return (
    <span
      className={`grid ${tam} shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500 text-xs font-bold text-white shadow-[0_8px_18px_-10px_rgba(124,58,237,0.9)]`}
    >
      {`${m.firstName[0] ?? ""}${m.lastName[0] ?? ""}`.toUpperCase()}
    </span>
  );
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
export function Sel<T extends string>({
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
export function Modal({
  titulo: t,
  onClose,
  children,
  ancho = "max-w-xl",
  modulo = "Recursos humanos",
}: {
  titulo: string;
  onClose: () => void;
  children: ReactNode;
  ancho?: string;
  modulo?: string;
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
        aria-label={t}
        className={`scroll-sutil max-h-[92vh] w-full overflow-y-auto rounded-3xl border border-border bg-card p-5 shadow-2xl ${ancho}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {modulo}
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">{t}</h2>
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
export function Acciones({
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
export function Mini({
  label,
  valor,
  icon: Icon,
  tono = "text-foreground",
  sub,
}: {
  label: string;
  valor: string;
  icon: LucideIcon;
  tono?: string;
  sub?: string;
}) {
  return (
    <div className="card-grad flex items-start justify-between p-3.5">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
        <p className={`mt-1 truncate text-xl font-bold ${tono}`}>{valor}</p>
        {sub && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{sub}</p>}
      </div>
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
    </div>
  );
}
export function Encabezado({
  icon: Icon,
  titulo: t,
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
          <h2 className="text-lg font-semibold tracking-tight">{t}</h2>
          <p className="text-sm text-muted-foreground">{descripcion}</p>
        </div>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
export function Vacio({ icon: Icon, texto }: { icon: LucideIcon; texto: string }) {
  return (
    <div className="card-grad flex flex-col items-center gap-2 p-8 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <p className="text-sm text-muted-foreground">{texto}</p>
    </div>
  );
}
export function Barra({
  pct,
  clase = "bg-gradient-to-r from-primary to-fuchsia-500",
}: {
  pct: number;
  clase?: string;
}) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-primary/10">
      <div
        className={`h-full rounded-full ${clase}`}
        style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
      />
    </div>
  );
}
