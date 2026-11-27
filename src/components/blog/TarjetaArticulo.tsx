import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Clock } from "lucide-react";

import { PortadaBlog } from "@/components/blog/PortadaBlog";
import { fechaLarga, minutosLectura, type ArticuloBlog } from "@/lib/blog/blog";

/* Ubicación: src/components/blog/TarjetaArticulo.tsx
   Tarjeta de un artículo para las grillas del blog (lista y «seguí leyendo»). */

/** claro = sobre una foto o un fondo oscuro: vidrio OSCURO con texto blanco (se lee sobre cualquier foto, también clara). */
export function CategoriaChip({ categoria, claro = false }: { categoria: string; claro?: boolean }) {
  return (
    <span
      className={
        claro
          ? "inline-flex items-center rounded-full border border-white/20 bg-[#140c2b]/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white shadow-[0_6px_18px_-6px_rgba(0,0,0,0.6)] backdrop-blur-md"
          : "inline-flex items-center rounded-full bg-violet-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-700"
      }
    >
      {categoria}
    </span>
  );
}

export function TarjetaArticulo({ articulo }: { articulo: ArticuloBlog }) {
  return (
    <Link
      to="/blog/$slug"
      params={{ slug: articulo.slug }}
      className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-violet-100 bg-white shadow-[0_24px_60px_-40px_rgba(76,29,149,0.45)] transition-all duration-500 hover:-translate-y-1.5 hover:border-violet-200 hover:shadow-[0_40px_80px_-40px_rgba(124,58,237,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
    >
      <div className="relative">
        <PortadaBlog articulo={articulo} className="aspect-[16/10] w-full" />
        <div className="absolute left-4 top-4">
          <CategoriaChip categoria={articulo.category} claro />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center gap-2 text-[12.5px] text-[#1b1233]/50">
          <span>{fechaLarga(articulo.publishedAt)}</span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" /> {minutosLectura(articulo)} min de lectura
          </span>
        </div>
        <h3 className="mt-3 font-display text-xl font-bold leading-snug tracking-tight text-[#1b1233] transition-colors group-hover:text-violet-700">
          {articulo.title}
        </h3>
        <p className="mt-3 line-clamp-3 text-[15px] leading-relaxed text-[#1b1233]/60">{articulo.excerpt}</p>
        <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-violet-700">
          Leer artículo
          <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
