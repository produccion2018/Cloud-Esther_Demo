import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/* Piezas comunes de formularios y navegación interna de las secciones del panel. */

export const INPUT =
  "h-10 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 disabled:opacity-60";

export function Pestanas<T extends string>({
  valor,
  opciones,
  onCambiar,
}: {
  valor: T;
  opciones: { id: T; label: string; cantidad?: number }[];
  onCambiar: (v: T) => void;
}) {
  return (
    <div
      className="flex flex-wrap gap-1 rounded-2xl border border-primary/10 bg-primary/[0.03] p-1.5"
      role="tablist"
    >
      {opciones.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={valor === o.id}
          onClick={() => onCambiar(o.id)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition",
            valor === o.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-card hover:text-foreground",
          )}
        >
          {o.label}
          {o.cantidad !== undefined && (
            <span
              className={cn(
                "rounded-full px-1.5 text-[10px]",
                valor === o.id ? "bg-white/25" : "bg-primary/10 text-primary",
              )}
            >
              {o.cantidad}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Campo({
  label,
  ayuda,
  children,
  className,
}: {
  label: string;
  ayuda?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-xs font-semibold text-foreground">{label}</span>
      {children}
      {ayuda && <span className="block text-[11px] text-muted-foreground">{ayuda}</span>}
    </label>
  );
}

export function DialogoFormulario({
  abierto,
  titulo,
  descripcion,
  onCerrar,
  onGuardar,
  guardando,
  error,
  children,
  textoGuardar = "Guardar",
  ancho = "sm:max-w-lg",
}: {
  abierto: boolean;
  titulo: string;
  descripcion?: string;
  onCerrar: () => void;
  onGuardar: () => void;
  guardando?: boolean;
  error?: string | null;
  children: ReactNode;
  textoGuardar?: string;
  ancho?: string;
}) {
  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className={cn("max-h-[90vh] overflow-y-auto", ancho)}>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {descripcion && <DialogDescription>{descripcion}</DialogDescription>}
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            onGuardar();
          }}
        >
          {children}
          {error && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {textoGuardar}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Tabla con encabezado del estilo del panel. */
export function Tabla({
  columnas,
  children,
  minimo = 760,
}: {
  columnas: string[];
  children: ReactNode;
  minimo?: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth: minimo }}>
        <thead>
          <tr className="bg-primary/[0.035] text-left text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            {columnas.map((c, i) => (
              <th
                key={c}
                className={cn(
                  "px-3 py-2.5",
                  i === 0 && "pl-5",
                  i === columnas.length - 1 && "pr-5",
                )}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Pildora({
  tono = "neutro",
  children,
}: {
  tono?: "ok" | "alerta" | "peligro" | "neutro" | "primario";
  children: ReactNode;
}) {
  const c = {
    ok: "border-success/25 bg-success/10 text-success",
    alerta: "border-warning/40 bg-warning/15 text-warning-foreground",
    peligro: "border-destructive/25 bg-destructive/10 text-destructive",
    neutro: "border-border bg-muted text-muted-foreground",
    primario: "border-primary/25 bg-primary/10 text-primary",
  }[tono];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
        c,
      )}
    >
      {children}
    </span>
  );
}

/** Pide confirmación antes de una acción importante. */
export function confirmar(texto: string) {
  return typeof window === "undefined" ? false : window.confirm(texto);
}

/** Descarga una tabla como CSV (abre bien en Excel y Google Sheets). */
export function descargarCSV(nombre: string, filas: (string | number | null)[][]) {
  const texto = filas
    .map((f) => f.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";"))
    .join("\n");
  const blob = new Blob([`\ufeff${texto}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nombre}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
