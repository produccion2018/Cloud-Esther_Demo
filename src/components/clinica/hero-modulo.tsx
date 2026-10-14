import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/* Ubicación: src/components/clinica/hero-modulo.tsx
   Encabezado de módulo con el MISMO diseño de Historia clínica, Odontograma, Recetas…
   (tarjeta con franja de color, chip, título grande, bajada y 4 indicadores). Así las
   pantallas de la clínica real (Accesos del equipo, Mi cuenta) se ven como el resto. */

export type KpiModulo = { l: string; v: ReactNode; s: string; i: LucideIcon };

export function HeroModulo({
  chip,
  icon: Icon,
  titulo,
  descripcion,
  acciones,
  kpis,
}: {
  chip: string;
  icon: LucideIcon;
  titulo: string;
  descripcion: string;
  acciones?: ReactNode;
  kpis?: KpiModulo[];
}) {
  return (
    <section className="relative overflow-hidden rounded-[30px] border border-primary/15 bg-gradient-to-br from-white via-white/96 to-primary/[0.045] shadow-[0_20px_55px_-38px_rgba(76,29,149,0.55)] dark:from-card dark:via-card dark:to-primary/10">
      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary/55 via-primary to-pink-400/60" />
      <div className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-primary/[0.055] blur-2xl" />
      <div className="relative p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-primary/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
            <Icon className="size-3.5" />
            {chip}
          </span>
          {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
        </div>
        <h1 className="mt-4 text-[30px] font-bold tracking-[-0.035em] md:text-[40px]">{titulo}</h1>
        <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-foreground md:text-sm">{descripcion}</p>
        {kpis && kpis.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
            {kpis.map((k) => (
              <div
                key={k.l}
                className="group relative min-h-[100px] overflow-hidden rounded-[22px] border border-primary/25 bg-gradient-to-br from-white via-white to-primary/[0.065] p-4 shadow-[0_12px_28px_-20px_rgba(124,58,237,0.48)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_-20px_rgba(124,58,237,0.6)] dark:from-card dark:via-card"
              >
                <div className="pointer-events-none absolute -right-7 -top-9 size-[100px] rounded-full bg-primary/[0.035] ring-[13px] ring-primary/[0.035]" />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-primary/75">{k.l}</p>
                    <p
                      className={`mt-2 font-bold tracking-tight text-primary tabular-nums ${
                        typeof k.v === "string" && k.v.length > 16
                          ? "break-all text-[15px] leading-tight"
                          : typeof k.v === "string" && k.v.length > 6
                            ? "line-clamp-2 break-words text-[19px] leading-tight"
                            : "truncate text-[27px] leading-none"
                      }`}
                    >
                      {k.v}
                    </p>
                    <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{k.s}</p>
                  </div>
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/[0.08] text-primary transition group-hover:bg-gradient-to-br group-hover:from-primary group-hover:to-fuchsia-500 group-hover:text-white">
                    <k.i className="size-4" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
