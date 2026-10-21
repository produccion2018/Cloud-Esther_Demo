import { motion } from "framer-motion";
import {
  ArrowUpRight,
  CalendarClock,
  ClipboardList,
  Sparkles,
  TrendingUp,
  UserX,
  Workflow,
  Bell,
  MessageSquareText,
  type LucideIcon,
} from "lucide-react";
import { usePanelCaracteristicas, type TipoHallazgo } from "@/lib/site-contenido";

/* Ubicación: src/components/site/EstherInfinityShowcase.tsx
   Presentación visual de Esther Infinity como asistente de IA odontológica (sección Características
   de la web pública). Usa los datos reales del panel (usePanelCaracteristicas): no inventa
   capacidades. Muestra a Esther "procesando" y entregando sus hallazgos como una asistente, con
   animaciones continuas y livianas (solo transform/opacity). No es una computadora ni un odontograma. */

const ICONO: Record<TipoHallazgo, LucideIcon> = {
  historia: ClipboardList,
  agenda: CalendarClock,
  pacientes: UserX,
  crecimiento: TrendingUp,
};

/** Lo que Esther sabe hacer (coherente con el producto real). */
const CAPACIDADES: { icon: LucideIcon; label: string }[] = [
  { icon: ClipboardList, label: "Resúmenes clínicos" },
  { icon: CalendarClock, label: "Agenda inteligente" },
  { icon: Workflow, label: "Automatizaciones" },
  { icon: Bell, label: "Alertas y seguimiento" },
];

export function EstherInfinityShowcase() {
  const panel = usePanelCaracteristicas();

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55 }}
      className="relative overflow-hidden rounded-[28px] border border-primary/15 bg-gradient-to-br from-card via-card to-lavender/50 shadow-[0_28px_70px_-40px_rgba(88,28,135,0.55)]"
    >
      {/* Halos de fondo (profundidad y luz, con moderación) */}
      <motion.div
        aria-hidden
        animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.32, 0.2] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-primary/20 blur-[90px]"
      />
      <motion.div
        aria-hidden
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.14, 0.26, 0.14] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -bottom-24 -left-16 size-64 rounded-full bg-fuchsia-400/20 blur-[90px]"
      />

      {/* Esther: orbe de IA con anillos, partículas en órbita y estado "procesando" */}
      <div className="relative flex flex-col items-center gap-3 px-6 pt-8">
        <div className="relative grid size-28 place-items-center">
          {/* anillos que laten */}
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              aria-hidden
              className="absolute inset-0 rounded-full border border-primary/25"
              animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.6 }}
            />
          ))}
          {/* partículas en órbita */}
          <motion.div
            aria-hidden
            className="absolute inset-[-10px]"
            animate={{ rotate: 360 }}
            transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
          >
            {[0, 120, 240].map((deg) => (
              <span
                key={deg}
                className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/70 shadow-[0_0_10px_rgba(124,58,237,0.8)]"
                style={{ transform: `rotate(${deg}deg) translateY(-62px)` }}
              />
            ))}
          </motion.div>
          {/* núcleo */}
          <motion.span
            className="relative grid size-20 place-items-center rounded-full bg-[linear-gradient(135deg,var(--color-primary),var(--color-primary-glow))] text-primary-foreground shadow-[0_18px_40px_-14px_rgba(124,58,237,0.8)]"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="size-8" />
          </motion.span>
        </div>

        <div className="text-center">
          <p className="font-display text-lg font-bold">Esther Infinity</p>
          <p className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
            <span className="relative flex size-2">
              <motion.span
                className="absolute inline-flex size-full rounded-full bg-emerald-400"
                animate={{ scale: [1, 2, 1], opacity: [0.7, 0, 0.7] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            Analizando tu clínica
            <motion.span
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            >
              …
            </motion.span>
          </p>
        </div>
      </div>

      <div className="relative space-y-4 p-6 pt-5">
        {/* Indicadores reales, con brillo sutil de "procesando" */}
        <div className="grid grid-cols-3 gap-2.5">
          {panel.indicadores.slice(0, 3).map((k, i) => (
            <motion.div
              key={k.etiqueta}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
              className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-card to-lavender/60 p-3"
            >
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.45),transparent)]"
                animate={{ x: ["-120%", "160%"] }}
                transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
              />
              <p className="relative truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {k.etiqueta}
              </p>
              <p className="relative mt-1 text-xl font-bold tracking-tight text-foreground">{k.valor}</p>
              {k.variacion && (
                <p className="relative text-[11px] font-semibold text-emerald-600">{k.variacion}</p>
              )}
            </motion.div>
          ))}
        </div>

        {/* Hallazgos reales, presentados como salidas de la asistente */}
        <ul className="space-y-2">
          {panel.hallazgos.map((h, i) => {
            const Icon = ICONO[h.tipo];
            return (
              <motion.li
                key={h.texto}
                initial={{ opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.45 }}
                className="group flex items-start gap-3 rounded-2xl border border-border bg-card/90 p-3.5 backdrop-blur transition-all duration-300 hover:border-primary/30 hover:shadow-[0_10px_30px_rgba(124,58,237,0.08)]"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-lavender text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                    {h.categoria}
                  </p>
                  <p className="mt-0.5 text-sm leading-snug text-foreground/85">{h.texto}</p>
                </div>
                <span className="mt-0.5 hidden shrink-0 items-center gap-0.5 rounded-full border border-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary sm:inline-flex">
                  {h.accion}
                  <ArrowUpRight className="size-3" />
                </span>
              </motion.li>
            );
          })}
        </ul>

        {/* Qué puede hacer Esther (chips animados) */}
        <div className="flex flex-wrap gap-2 pt-1">
          {CAPACIDADES.map((c, i) => (
            <motion.span
              key={c.label}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + i * 0.07, duration: 0.4 }}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-lavender/60 px-3 py-1.5 text-[11.5px] font-semibold text-foreground/80"
            >
              <c.icon className="size-3.5 text-primary" />
              {c.label}
            </motion.span>
          ))}
        </div>
      </div>

      {/* Pie: "escribiendo" + aclaración y badge de datos */}
      <div className="relative flex items-center justify-between gap-3 border-t border-border/70 bg-lavender/40 px-6 py-3">
        <p className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
          <MessageSquareText className="size-3.5 text-primary" />
          <span>Esther asiste al profesional; no reemplaza su criterio.</span>
        </p>
        {panel.ejemplo && (
          <span className="shrink-0 rounded-full border border-primary/20 bg-card px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
            Datos de ejemplo
          </span>
        )}
      </div>
    </motion.div>
  );
}
