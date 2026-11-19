import {
  BarChart3,
  Boxes,
  FlaskConical,
  Layers3,
  Megaphone,
  MessageSquare,
  Plug,
  ScanLine,
  ShieldCheck,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { CaraEsther } from "@/components/cloud-esther/esther-ai/CaraEsther";
import type { AdditionalModule } from "@/lib/site-data";

/* Ubicación: src/components/site/ModulosMarquee.tsx
   Carrusel INFINITO y premium de los módulos adicionales (página pública /planes).
   Reemplaza al listado con «+/agregar»: acá solo se LUCEN los módulos (la contratación real se
   hace dentro de la app). Dos filas que se deslizan solas en sentidos opuestos, loop sin corte,
   se pausan al pasar el mouse, con los bordes desvaneciéndose hacia el fondo. Responsive. */

const ICONOS: Record<string, LucideIcon> = {
  auditoria: ShieldCheck,
  marketing: Megaphone,
  comunicacion: MessageSquare,
  inventario: Boxes,
  "recursos-humanos": Users,
  "analitica-avanzada": BarChart3,
  laboratorio: FlaskConical,
  "estudios-diagnostico": ScanLine,
  integraciones: Plug,
  "automatizaciones-n8n": Workflow,
};

function Icono({ id }: { id: string }) {
  if (id === "esther-ia") return <CaraEsther className="size-5 text-white" />;
  const Ico = ICONOS[id] ?? Layers3;
  return <Ico className="size-5 text-white" />;
}

function Tarjeta({ m }: { m: AdditionalModule }) {
  return (
    <article
      className="group/card relative flex w-[270px] shrink-0 flex-col gap-3 overflow-hidden rounded-2xl border border-primary/12 bg-card/85 p-4 shadow-[0_18px_44px_-30px_rgba(88,28,135,0.5)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_26px_60px_-28px_rgba(124,58,237,0.6)] sm:w-[300px]"
    >
      <span aria-hidden className="pointer-events-none absolute -right-8 -top-10 size-24 rounded-full bg-primary/10 blur-2xl transition-opacity duration-300 group-hover/card:opacity-100" />
      <div className="relative flex items-center justify-between gap-2">
        <span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-[0_12px_26px_-12px_rgba(124,58,237,0.9)]">
          <Icono id={m.id} />
        </span>
        <span className="rounded-full border border-primary/15 bg-primary/[0.06] px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-primary/80">
          Adicional
        </span>
      </div>
      <div className="relative">
        <h3 className="text-[15px] font-bold tracking-tight text-foreground">{m.name}</h3>
        <p className="mt-1 line-clamp-3 text-[12.5px] leading-relaxed text-muted-foreground">
          {m.description}
        </p>
      </div>
    </article>
  );
}

function Fila({ modulos, reversa }: { modulos: AdditionalModule[]; reversa?: boolean }) {
  // El contenido se duplica para que el loop a -50% no tenga salto visible.
  const items = [...modulos, ...modulos];
  return (
    <div className="flex w-max gap-4 pr-4">
      <div className={`flex w-max gap-4 ${reversa ? "ce-marquee-track ce-marquee-track--rev" : "ce-marquee-track"}`}>
        {items.map((m, i) => (
          <Tarjeta key={`${reversa ? "b" : "a"}-${m.id}-${i}`} m={m} />
        ))}
      </div>
    </div>
  );
}

export function ModulosMarquee({ modules }: { modules: AdditionalModule[] }) {
  if (!modules.length) return null;
  // Dos filas con distinto arranque para que no vayan sincronizadas.
  const mitad = Math.ceil(modules.length / 2);
  const fila1 = [...modules.slice(0, mitad), ...modules.slice(mitad)];
  const fila2 = [...modules.slice(mitad), ...modules.slice(0, mitad)];
  return (
    <div
      className="ce-marquee group relative mt-10 flex flex-col gap-4 overflow-hidden"
      style={{
        maskImage:
          "linear-gradient(to right, transparent, #000 7%, #000 93%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, #000 7%, #000 93%, transparent)",
      }}
    >
      <Fila modulos={fila1} />
      <Fila modulos={fila2} reversa />
    </div>
  );
}
