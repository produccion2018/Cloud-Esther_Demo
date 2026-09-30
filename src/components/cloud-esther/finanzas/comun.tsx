import type { ReactNode } from "react";
import { Modal as ModalBase } from "@/components/cloud-esther/rrhh/ui";
import { SUCURSAL_GENERAL } from "@/lib/cloud-esther/finanzas-store";
import type { Asiento } from "@/components/cloud-esther/finanzas/libro";

/* Piezas compartidas de Finanzas. */

export type SeccionFin =
  | "resumen"
  | "movimientos"
  | "pagar"
  | "bancos"
  | "flujo"
  | "presupuesto"
  | "rentabilidad"
  | "resultados";

export type CtxFin = {
  onToast: (m: string) => void;
  usuario: string;
  $: (n: number) => string;
  nivel: number;
  sucursal: string; // "Todas" o una sucursal
  sucursales: string[];
  ir: (s: SeccionFin) => void;
};

export function M(props: Parameters<typeof ModalBase>[0]) {
  return <ModalBase {...props} modulo="Finanzas" />;
}

/** Filtra por la sucursal elegida arriba (los gastos generales solo se ven en "Todas"). */
export function deSucursal<T extends { sucursal: string }>(xs: T[], sucursal: string) {
  return sucursal === "Todas" ? xs : xs.filter((x) => x.sucursal === sucursal);
}

export function Tarjeta({
  titulo,
  children,
  accion,
  className = "",
}: {
  titulo: string;
  children: ReactNode;
  accion?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`card-grad p-4 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{titulo}</p>
        {accion}
      </div>
      {children}
    </div>
  );
}

/** Barras dobles (ingresos / egresos) con etiqueta por columna. */
export function BarrasDobles({
  serie,
  $,
  alto = 170,
}: {
  serie: { etiqueta: string; a: number; b: number; resaltar?: boolean }[];
  $: (n: number) => string;
  alto?: number;
}) {
  const max = Math.max(1, ...serie.flatMap((s) => [s.a, s.b]));
  return (
    <div>
      <div className="flex items-end gap-2" style={{ height: alto }}>
        {serie.map((s) => (
          <div key={s.etiqueta} className="flex h-full flex-1 items-end justify-center gap-1">
            <div
              title={`Ingresos ${$(s.a)}`}
              className={`w-1/2 max-w-7 rounded-t-lg bg-gradient-to-t from-emerald-500 to-emerald-300 ${s.resaltar ? "" : "opacity-80"}`}
              style={{ height: `${Math.max(2, (s.a / max) * 100)}%` }}
            />
            <div
              title={`Egresos ${$(s.b)}`}
              className={`w-1/2 max-w-7 rounded-t-lg bg-gradient-to-t from-primary to-fuchsia-400 ${s.resaltar ? "" : "opacity-80"}`}
              style={{ height: `${Math.max(2, (s.b / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-2">
        {serie.map((s) => (
          <p
            key={s.etiqueta}
            className={`flex-1 text-center text-[10.5px] ${s.resaltar ? "font-bold text-primary" : "text-muted-foreground"}`}
          >
            {s.etiqueta}
          </p>
        ))}
      </div>
      <div className="mt-2 flex gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-emerald-400" /> Ingresos
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-primary" /> Egresos
        </span>
      </div>
    </div>
  );
}

export const ORIGEN_ESTILO: Record<Asiento["origen"], string> = {
  Manual: "bg-muted text-muted-foreground",
  Proveedores: "bg-amber-100 text-amber-700",
  Comisiones: "bg-fuchsia-100 text-fuchsia-700",
  Transferencia: "bg-sky-100 text-sky-700",
  Facturación: "bg-violet-100 text-violet-700",
  "Obras sociales": "bg-teal-100 text-teal-700",
  "Caja diaria": "bg-orange-100 text-orange-700",
  Nómina: "bg-indigo-100 text-indigo-700",
};

export const GENERAL = SUCURSAL_GENERAL;
