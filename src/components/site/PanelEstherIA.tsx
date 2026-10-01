import { motion } from "framer-motion";
import {
  ArrowUpRight,
  CalendarClock,
  ClipboardList,
  Sparkles,
  TrendingUp,
  UserX,
  type LucideIcon,
} from "lucide-react";
import { usePanelCaracteristicas, type TipoHallazgo } from "@/lib/site-contenido";

/* Vista del panel de Esther IA en la sección de características. Los datos vienen de
   site-contenido (datos de prueba hoy; el panel administrativo los podrá actualizar). */

const ICONO: Record<TipoHallazgo, LucideIcon> = {
  historia: ClipboardList,
  agenda: CalendarClock,
  pacientes: UserX,
  crecimiento: TrendingUp,
};

function cuando(iso: string) {
  if (!iso) return "Hoy";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "Hoy"
    : d.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
}

export function PanelEstherIA() {
  const panel = usePanelCaracteristicas();
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55 }}
      className="overflow-hidden rounded-[28px] border border-primary/15 bg-card shadow-[0_28px_70px_-40px_rgba(88,28,135,0.55)]"
    >
      {/* Barra de ventana */}
      <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-gradient-to-r from-lavender/70 via-card to-card px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-brand text-primary-foreground shadow-[0_8px_20px_-8px_rgba(124,58,237,0.7)]">
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{panel.titulo}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {panel.clinica} · Actualizado {cuando(panel.actualizado)}
            </p>
          </div>
        </div>
        {panel.ejemplo ? (
          <span className="shrink-0 rounded-full border border-primary/20 bg-lavender px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-lavender-foreground">
            Datos de ejemplo
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
            <span className="size-1.5 rounded-full bg-emerald-500" /> Actualizado
          </span>
        )}
      </div>

      <div className="space-y-4 p-5">
        {/* Indicadores */}
        <div className="grid grid-cols-3 gap-2.5">
          {panel.indicadores.slice(0, 3).map((k, i) => (
            <motion.div
              key={k.etiqueta}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
              className="rounded-2xl border border-primary/10 bg-gradient-to-br from-card to-lavender/60 p-3"
            >
              <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {k.etiqueta}
              </p>
              <p className="mt-1 text-xl font-bold tracking-tight text-foreground">{k.valor}</p>
              {k.variacion && (
                <p className="text-[11px] font-semibold text-emerald-600">{k.variacion}</p>
              )}
            </motion.div>
          ))}
        </div>

        {/* Hallazgos */}
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
                className="group flex items-start gap-3 rounded-2xl border border-border bg-card p-3.5 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_10px_30px_rgba(124,58,237,0.08)]"
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
      </div>
      <p className="border-t border-border/70 bg-lavender/30 px-5 py-2.5 text-[11px] text-muted-foreground">
        Esther IA trabaja solo con los datos de tu clínica y asiste al profesional: no reemplaza su
        criterio.
      </p>
    </motion.div>
  );
}
