import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  CalendarDays,
  Users,
  Stethoscope,
  BarChart3,
  Workflow,
  Globe,
  ClipboardList,
  CalendarClock,
  UserX,
  TrendingUp,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import { usePanelCaracteristicas, type TipoHallazgo } from "@/lib/site-contenido";

/* Ubicación: src/components/site/EstherInfinityShowcase.tsx
   Presentación de Esther Infinity como un NÚCLEO de IA conectado a todos los módulos de la clínica:
   líneas de conexión animadas, procesamiento en tiempo real y los hallazgos reales rotando.
   Comunica que es una asistente de IA integrada (no un chatbot ni una imagen decorativa).
   Usa los datos reales del panel (usePanelCaracteristicas): no inventa capacidades. */

const ICONO: Record<TipoHallazgo, LucideIcon> = {
  historia: ClipboardList,
  agenda: CalendarClock,
  pacientes: UserX,
  crecimiento: TrendingUp,
};

/* Módulos a los que Esther está conectada (nodos alrededor del núcleo). */
const NODOS: { icon: LucideIcon; label: string }[] = [
  { icon: CalendarDays, label: "Agenda" },
  { icon: Users, label: "Pacientes" },
  { icon: Stethoscope, label: "Odontograma" },
  { icon: BarChart3, label: "Reportes" },
  { icon: Workflow, label: "Automatizaciones" },
  { icon: Globe, label: "Portal" },
];

/* Posición de cada nodo en un círculo alrededor del centro (en % del cuadro). */
const POS = NODOS.map((_, i) => {
  const ang = ((-90 + i * (360 / NODOS.length)) * Math.PI) / 180;
  return { x: 50 + 42 * Math.cos(ang), y: 50 + 42 * Math.sin(ang) };
});

const CSS = `
.ei-line { stroke: url(#ei-grad); stroke-width: 0.5; stroke-dasharray: 3 5; animation: ei-flow 1.5s linear infinite; }
@keyframes ei-flow { to { stroke-dashoffset: -16; } }
`;

export function EstherInfinityShowcase() {
  const panel = usePanelCaracteristicas();
  const [i, setI] = useState(0);
  const n = panel.hallazgos.length;

  useEffect(() => {
    if (n < 2) return undefined;
    const id = window.setInterval(() => setI((v) => (v + 1) % n), 3200);
    return () => window.clearInterval(id);
  }, [n]);

  const h = panel.hallazgos[i] ?? panel.hallazgos[0];
  const HIcon = h ? ICONO[h.tipo] : Sparkles;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55 }}
      className="relative overflow-hidden rounded-[28px] border border-primary/15 bg-gradient-to-br from-card via-card to-lavender/50 shadow-[0_30px_80px_-40px_rgba(88,28,135,0.6)]"
    >
      <style>{CSS}</style>

      {/* Luces de fondo */}
      <motion.div aria-hidden animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.34, 0.2] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-primary/20 blur-[80px]" />
      <motion.div aria-hidden animate={{ scale: [1.1, 1, 1.1], opacity: [0.14, 0.26, 0.14] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full bg-fuchsia-400/20 blur-[80px]" />

      {/* Encabezado */}
      <div className="relative flex items-center justify-between gap-3 px-5 pt-5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary via-violet-600 to-fuchsia-500 text-white shadow-[0_8px_20px_-8px_rgba(124,58,237,0.8)]">
            <Sparkles className="size-4" />
          </span>
          <div className="leading-tight">
            <p className="font-display text-sm font-bold">Esther Infinity</p>
            <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <span className="relative flex size-2">
                <motion.span className="absolute inline-flex size-full rounded-full bg-emerald-400" animate={{ scale: [1, 2, 1], opacity: [0.7, 0, 0.7] }} transition={{ duration: 1.8, repeat: Infinity }} />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              Procesando en tiempo real
            </p>
          </div>
        </div>
        {panel.ejemplo && (
          <span className="shrink-0 rounded-full border border-primary/20 bg-card px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
            Datos de ejemplo
          </span>
        )}
      </div>

      {/* Núcleo de IA conectado a los módulos */}
      <div className="relative mx-auto mt-2 aspect-square w-full max-w-[440px]">
        {/* Líneas de conexión animadas */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full">
          <defs>
            <linearGradient id="ei-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgb(124,58,237)" stopOpacity="0.15" />
              <stop offset="100%" stopColor="rgb(217,70,239)" stopOpacity="0.85" />
            </linearGradient>
          </defs>
          {POS.map((p, k) => (
            <line key={k} className="ei-line" x1="50" y1="50" x2={p.x} y2={p.y} />
          ))}
        </svg>

        {/* Nodos (módulos) */}
        {NODOS.map((nodo, k) => {
          const NIcon = nodo.icon;
          return (
            <motion.div
              key={nodo.label}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${POS[k].x}%`, top: `${POS[k].y}%` }}
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 3 + k * 0.3, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="flex flex-col items-center gap-1">
                <span className="grid size-11 place-items-center rounded-2xl border border-primary/15 bg-card text-primary shadow-[0_10px_24px_-14px_rgba(124,58,237,0.8)]">
                  <NIcon className="size-5" />
                </span>
                <span className="rounded-full bg-card/80 px-2 py-0.5 text-[10px] font-semibold text-foreground/80 shadow-sm backdrop-blur">
                  {nodo.label}
                </span>
              </div>
            </motion.div>
          );
        })}

        {/* Núcleo: Esther */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          {[0, 1].map((r) => (
            <motion.span
              key={r}
              aria-hidden
              className="absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/25"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: r * 1.5 }}
            />
          ))}
          <motion.span aria-hidden className="absolute left-1/2 top-1/2 size-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-primary/20" animate={{ rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: "linear" }} />
          <motion.span
            className="relative grid size-20 place-items-center rounded-full bg-gradient-to-br from-primary via-violet-600 to-fuchsia-500 text-white shadow-[0_20px_45px_-14px_rgba(124,58,237,0.9)]"
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="size-8" />
            <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
              <motion.span className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent" animate={{ x: ["-120%", "240%"] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }} />
            </span>
          </motion.span>
        </div>
      </div>

      {/* Hallazgo actual (rota entre los reales) */}
      <div className="relative px-5 pb-5">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">Esther detectó</p>
        <div className="relative min-h-[76px]">
          <AnimatePresence mode="wait">
            {h && (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-start gap-3 rounded-2xl border border-primary/12 bg-card/90 p-3.5 shadow-[0_14px_36px_-24px_rgba(124,58,237,0.7)] backdrop-blur"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-lavender text-primary">
                  <HIcon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">{h.categoria}</p>
                  <p className="mt-0.5 text-sm leading-snug text-foreground/85">{h.texto}</p>
                </div>
                <span className="mt-0.5 hidden shrink-0 items-center gap-0.5 rounded-full border border-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary sm:inline-flex">
                  {h.accion}
                  <ArrowUpRight className="size-3" />
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* puntitos de progreso */}
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {panel.hallazgos.map((x, k) => (
            <span key={x.texto} className={`h-1.5 rounded-full transition-all duration-300 ${k === i ? "w-5 bg-primary" : "w-1.5 bg-primary/25"}`} />
          ))}
        </div>
      </div>

      <p className="relative border-t border-primary/10 bg-lavender/30 px-5 py-2.5 text-[11px] text-muted-foreground">
        Esther Infinity está integrada en Cloud Esther y asiste al profesional: no reemplaza su criterio.
      </p>
    </motion.div>
  );
}
