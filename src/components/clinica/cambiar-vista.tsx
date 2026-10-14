import { Link } from "@tanstack/react-router";
import { Briefcase, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

/* Ubicación: src/components/clinica/cambiar-vista.tsx
   LAS DOS VISTAS DEL DUEÑO de una clínica real:
   - «Centro de operaciones» (/demo): el banner con el equipo y las tarjetas de cada módulo.
   - «Administración» (/equipo): el escritorio administrativo del portal.
   Las dos trabajan con LOS MISMOS datos (los de la clínica en el servidor): lo que se cambia
   en una se ve en la otra. Los invitados (odontólogo, secretaría, asistente) usan solo el
   Centro de operaciones, así que este selector es solo del Administrador. */

export type VistaDueno = "centro" | "administracion";

const OPCIONES: { id: VistaDueno; label: string; corto: string; to: string; icon: typeof Briefcase }[] = [
  { id: "centro", label: "Centro de operaciones", corto: "Operaciones", to: "/demo", icon: LayoutDashboard },
  { id: "administracion", label: "Administración", corto: "Administración", to: "/equipo", icon: Briefcase },
];

export function CambiarVista({
  actual,
  compacto = false,
  className,
  demo = false,
}: {
  actual: VistaDueno;
  /** Demo: la Administración se abre como Dueño/a con los datos de ejemplo */
  demo?: boolean;
  /** Solo íconos (menú lateral angosto) */
  compacto?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)}>
      {!compacto && (
        <p className="flex items-center gap-2 px-1 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-sidebar-foreground/45">
          <span className="h-1 w-3 rounded-full bg-gradient-to-r from-primary to-fuchsia-500" />
          Tu vista
        </p>
      )}
      <div
        role="tablist"
        aria-label="Cambiar de vista"
        className={cn(
          "relative grid gap-1 rounded-2xl border border-sidebar-border bg-sidebar-accent/50 p-1 shadow-inner",
          compacto ? "grid-cols-1" : "grid-cols-2",
        )}
      >
        {OPCIONES.map((o) => {
          const on = o.id === actual;
          const clase = cn(
            "group flex min-h-[3.25rem] flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-1.5 text-center text-[10.5px] font-semibold leading-tight transition-all duration-200",
            on
              ? "bg-gradient-to-r from-primary to-fuchsia-500 text-white shadow-[0_8px_20px_-10px_rgba(124,58,237,0.9)]"
              : "text-sidebar-foreground/70 hover:bg-sidebar hover:text-sidebar-foreground",
          );
          const contenido = (
            <>
              <o.icon className={cn("size-4 shrink-0 transition-transform", !on && "group-hover:scale-110")} />
              {!compacto && <span className="max-w-full truncate">{o.corto}</span>}
            </>
          );
          // En el demo, la Administración se abre como Dueño/a (sin pedir usuario del equipo)
          if (demo && o.id === "administracion") {
            return (
              <a key={o.id} href="/equipo?vista=dueno" role="tab" aria-selected={on} title={o.label} className={clase}>
                {contenido}
              </a>
            );
          }
          return (
            <Link key={o.id} to={o.to as never} role="tab" aria-selected={on} title={o.label} className={clase}>
              {contenido}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
