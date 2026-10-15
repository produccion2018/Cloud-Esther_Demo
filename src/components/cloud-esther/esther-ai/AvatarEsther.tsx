import { estherPoses } from "./esther-states";
import { cn } from "@/lib/utils";

/* Ubicación: src/components/cloud-esther/esther-ai/AvatarEsther.tsx
   LA CARA DE ESTHER, animada (la misma en todo el sistema): flota, respira, inclina la cabeza,
   anillo de luz que gira, una lucecita que orbita y el punto verde de «en línea».
   Con «menos movimiento» queda solo un respirar suave (las clases están en styles.css). */

const TAMANOS = {
  sm: { caja: "size-9", orbita: "-inset-[4px]", punto: "size-2.5" },
  md: { caja: "size-10", orbita: "-inset-[5px]", punto: "size-3" },
  lg: { caja: "size-12", orbita: "-inset-[6px]", punto: "size-3.5" },
} as const;

export function AvatarEsther({
  tam = "md",
  enLinea = true,
  /** Sobre fondos de color (degradé violeta): anillo blanco en vez del de la tarjeta */
  sobreColor = false,
  className,
}: {
  tam?: keyof typeof TAMANOS;
  enLinea?: boolean;
  sobreColor?: boolean;
  className?: string;
}) {
  const t = TAMANOS[tam];
  const anillo = sobreColor ? "ring-white/70" : "ring-card";
  return (
    <span aria-hidden className={cn("ce-esther-flotar relative grid shrink-0 place-items-center", t.caja, className)}>
      <span className="ce-esther-halo absolute -inset-1 rounded-full bg-gradient-to-br from-violet-500/45 via-fuchsia-500/35 to-sky-400/40 blur-[6px]" />
      <span className="ce-esther-giro absolute -inset-[2.5px] rounded-full bg-[conic-gradient(from_0deg,#8b5cf6,#d946ef,#ec4899,#38bdf8,#8b5cf6)]" />
      <span className={cn("ce-esther-orbita pointer-events-none absolute z-10", t.orbita)}>
        <span className="absolute left-1/2 top-0 size-1.5 -translate-x-1/2 rounded-full bg-white shadow-[0_0_6px_2px_rgba(217,70,239,0.85)]" />
      </span>
      <span
        className={cn("ce-esther-cara relative overflow-hidden rounded-full bg-gradient-to-b from-primary/15 to-primary/35 bg-no-repeat ring-2", t.caja, anillo)}
        style={{
          backgroundImage: `url(${estherPoses.resting.url})`,
          backgroundSize: "auto 440%",
          backgroundPosition: "50% 3%",
        }}
      />
      {enLinea && (
        <span className={cn("absolute -bottom-px -right-px z-10 flex", t.punto)}>
          <span className="absolute inline-flex size-full rounded-full bg-emerald-400 opacity-60 motion-safe:animate-ping [animation-duration:2.4s]" />
          <span className={cn("relative inline-flex rounded-full border-2 bg-emerald-500", t.punto, sobreColor ? "border-white" : "border-card")} />
        </span>
      )}
    </span>
  );
}
