import {
  BrainCircuit,
  Briefcase,
  Megaphone,
  Newspaper,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";

import type { ArticuloBlog } from "@/lib/blog/blog";
import { cn } from "@/lib/utils";

/* Ubicación: src/components/blog/PortadaBlog.tsx
   Portada de un artículo: la foto que cargó el equipo o, si no tiene, una ilustración propia de
   Cloud Esther según la categoría (aurora violeta, grilla de puntos y el ícono en vidrio). */

type Estilo = { icon: LucideIcon; desde: string; hasta: string; brillo: string };

const ESTILOS: Record<string, Estilo> = {
  "Odontología digital": { icon: ScanLine, desde: "#4c1d95", hasta: "#2563eb", brillo: "#a78bfa" },
  "Gestión de la clínica": { icon: Briefcase, desde: "#3b0764", hasta: "#7c3aed", brillo: "#f0abfc" },
  Clínica: { icon: Stethoscope, desde: "#1e1b4b", hasta: "#0e7490", brillo: "#67e8f9" },
  "Inteligencia artificial": { icon: BrainCircuit, desde: "#2e1065", hasta: "#c026d3", brillo: "#f5d0fe" },
  "Seguridad y datos": { icon: ShieldCheck, desde: "#0f172a", hasta: "#4338ca", brillo: "#a5b4fc" },
  "Marketing dental": { icon: Megaphone, desde: "#4a044e", hasta: "#db2777", brillo: "#fbcfe8" },
  Novedades: { icon: Sparkles, desde: "#312e81", hasta: "#9333ea", brillo: "#e9d5ff" },
};
const POR_DEFECTO: Estilo = { icon: Newspaper, desde: "#2e1065", hasta: "#7c3aed", brillo: "#ddd6fe" };

export function estiloCategoria(categoria: string): Estilo {
  return ESTILOS[categoria] ?? POR_DEFECTO;
}

export function PortadaBlog({
  articulo,
  className,
  grande = false,
  prioridad = false,
}: {
  articulo: Pick<ArticuloBlog, "coverUrl" | "coverAlt" | "category" | "title">;
  className?: string;
  grande?: boolean;
  prioridad?: boolean;
}) {
  if (articulo.coverUrl) {
    return (
      <div className={cn("relative overflow-hidden bg-[#1b1233]", className)}>
        <img
          src={articulo.coverUrl}
          alt={articulo.coverAlt || articulo.title}
          loading={prioridad ? "eager" : "lazy"}
          decoding="async"
          className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
      </div>
    );
  }

  const e = estiloCategoria(articulo.category);
  const Icono = e.icon;
  return (
    <div
      role="img"
      aria-label={articulo.coverAlt || `Ilustración: ${articulo.category}`}
      className={cn("relative isolate overflow-hidden", className)}
      style={{ background: `linear-gradient(135deg, ${e.desde} 0%, ${e.hasta} 100%)` }}
    >
      <div
        aria-hidden
        className="absolute -left-1/4 -top-1/3 size-[80%] rounded-full opacity-60 blur-3xl transition-transform duration-700 group-hover:translate-x-4"
        style={{ background: e.brillo }}
      />
      <div aria-hidden className="absolute -bottom-1/3 -right-1/4 size-[70%] rounded-full bg-fuchsia-500/40 blur-3xl" />
      <div
        aria-hidden
        className="absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
      />
      {/* Contorno de diente, muy suave */}
      <svg
        aria-hidden
        viewBox="0 0 100 120"
        className={cn(
          "absolute text-white/15 transition-transform duration-700 group-hover:rotate-3",
          grande ? "-right-6 -top-4 h-[120%]" : "-right-4 -top-3 h-[115%]",
        )}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <path d="M50 12c-9-6-24-7-32 2-9 10-6 27-2 39 3 9 4 18 5 30 1 14 4 27 11 27 8 0 8-17 10-27 1-6 4-9 8-9s7 3 8 9c2 10 2 27 10 27 7 0 10-13 11-27 1-12 2-21 5-30 4-12 7-29-2-39-8-9-23-8-32-2z" />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span
          className={cn(
            "grid place-items-center rounded-3xl border border-white/25 bg-white/10 text-white shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-md transition-transform duration-500 group-hover:-translate-y-1",
            grande ? "size-24 sm:size-28" : "size-16",
          )}
        >
          <Icono className={grande ? "size-11 sm:size-12" : "size-7"} strokeWidth={1.6} />
        </span>
      </div>
    </div>
  );
}
