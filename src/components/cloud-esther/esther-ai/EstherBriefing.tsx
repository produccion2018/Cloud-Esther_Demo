import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  X,
  ArrowUpRight,
  CloudSun,
  CalendarDays,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { useCloudEsther } from "@/lib/cloud-esther/data";
import { useSesion } from "@/lib/cloud-esther/auth-store";
import { hallazgosEsther } from "@/lib/cloud-esther/esther-conexiones";
import {
  primerNombreDe,
  saludoHora,
  useClima,
  fraseClima,
} from "@/lib/cloud-esther/saludo-clima";

/* Ubicación: src/components/cloud-esther/esther-ai/EstherBriefing.tsx
   Briefing proactivo de Esther Infinity: aparece ARRIBA al entrar al dashboard con un saludo
   por hora, el clima real, la fecha y lo básico de la clínica (hallazgos reales del plan). Se
   queda unos segundos y se va solo "hacia abajo", donde queda el botón flotante de Esther.
   No inventa datos: clima real (o sin clima) y hallazgos calculados sobre los datos reales.
   Diseño premium. Solo se monta en el dashboard (lo decide AppShell). */

const SEGUNDOS_VISIBLE = 10;

export function EstherBriefing({ moduloId, modulo }: { moduloId: string; modulo: string }) {
  void modulo;
  const { plan } = useCloudEsther();
  const { usuario } = useSesion();
  const clima = useClima();
  const primerNombre = primerNombreDe(usuario?.nombre ?? "Andrés Becerra");

  const hallazgos = useMemo(() => hallazgosEsther(plan), [plan]);
  const frase = fraseClima(clima);
  const fecha = useMemo(
    () =>
      new Date().toLocaleDateString("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    [],
  );

  const [visible, setVisible] = useState(true);
  useEffect(() => {
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), SEGUNDOS_VISIBLE * 1000);
    return () => window.clearTimeout(t);
  }, [moduloId]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={moduloId}
          initial={{ opacity: 0, y: -34, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 160, scale: 0.88 }}
          transition={{ type: "spring", stiffness: 240, damping: 24 }}
          className="fixed left-1/2 top-[74px] z-[55] w-[min(560px,calc(100vw-1.75rem))] -translate-x-1/2"
          role="status"
          aria-live="polite"
        >
          {/* Borde degradado premium */}
          <div className="relative rounded-[26px] bg-gradient-to-br from-primary/60 via-fuchsia-500/40 to-sky-400/50 p-px shadow-[0_40px_90px_-38px_rgba(76,29,149,0.75)]">
            <div className="relative overflow-hidden rounded-[25px] bg-gradient-to-br from-card via-card to-lavender/60 backdrop-blur-xl">
              {/* Luces de fondo animadas */}
              <motion.span
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full bg-primary/25 blur-[70px]"
                animate={{ scale: [1, 1.2, 1], opacity: [0.25, 0.4, 0.25] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.span
                aria-hidden
                className="pointer-events-none absolute -bottom-20 -left-12 size-44 rounded-full bg-fuchsia-400/20 blur-[70px]"
                animate={{ scale: [1.15, 1, 1.15], opacity: [0.15, 0.3, 0.15] }}
                transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
              />

              <div className="relative p-4 sm:p-5">
                {/* Encabezado */}
                <div className="flex items-start gap-3.5">
                  {/* Avatar con anillo que gira + halo */}
                  <span className="relative grid size-12 shrink-0 place-items-center">
                    <motion.span
                      aria-hidden
                      className="absolute -inset-[3px] rounded-full bg-[conic-gradient(from_0deg,#8b5cf6,#d946ef,#ec4899,#38bdf8,#8b5cf6)] opacity-80 blur-[1px]"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                    />
                    <motion.span
                      aria-hidden
                      className="absolute -inset-2 rounded-full border border-primary/25"
                      animate={{ scale: [1, 1.35, 1], opacity: [0.55, 0, 0.55] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <span className="relative grid size-12 place-items-center rounded-full bg-gradient-to-br from-primary via-violet-600 to-fuchsia-500 text-white ring-2 ring-card">
                      <Sparkles className="size-5" />
                    </span>
                    <span className="absolute -bottom-0.5 -right-0.5 flex size-3.5">
                      <span className="absolute inline-flex size-full rounded-full bg-emerald-400 opacity-70 motion-safe:animate-ping [animation-duration:2.2s]" />
                      <span className="relative inline-flex size-3.5 rounded-full border-2 border-card bg-emerald-500" />
                    </span>
                  </span>

                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="font-display text-[16px] font-bold leading-tight tracking-[-0.01em]">
                      {saludoHora()}
                      {primerNombre ? `, ${primerNombre}` : ""} 👋
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-lavender/70 px-2 py-0.5 text-[11px] font-medium text-primary">
                        <CalendarDays className="size-3" />
                        <span className="capitalize">{fecha}</span>
                      </span>
                      {frase && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-600 dark:text-sky-300">
                          <CloudSun className="size-3" />
                          {frase.replace(/\.$/, "")}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setVisible(false)}
                    aria-label="Cerrar"
                    className="grid size-7 shrink-0 place-items-center rounded-full bg-card/70 text-muted-foreground ring-1 ring-primary/10 transition hover:text-primary hover:ring-primary/30"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>

                {/* Resumen de la clínica (hallazgos reales) */}
                {hallazgos.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                      Tu clínica hoy
                    </p>
                    <div className="flex flex-col gap-2">
                      {hallazgos.map((h, k) => {
                        const alerta = h.tono === "alerta";
                        const Icono = alerta ? AlertTriangle : Activity;
                        return (
                          <motion.div
                            key={h.texto}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.15 + k * 0.08 }}
                            className="flex items-center gap-2.5 rounded-2xl border border-primary/10 bg-card/70 px-3 py-2 shadow-[0_10px_26px_-22px_rgba(76,29,149,0.9)]"
                          >
                            <span
                              className={`grid size-7 shrink-0 place-items-center rounded-xl ${
                                alerta
                                  ? "bg-fuchsia-500/12 text-fuchsia-600 dark:text-fuchsia-300"
                                  : "bg-primary/10 text-primary"
                              }`}
                            >
                              <Icono className="size-3.5" />
                            </span>
                            <span className="min-w-0 flex-1 text-[12.5px] font-medium leading-tight text-foreground/90">
                              {h.texto}
                            </span>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Pie */}
                <div className="mt-4 flex items-center justify-between gap-3">
                  <Link
                    to={"/demo/ia" as never}
                    onClick={() => setVisible(false)}
                    className="group inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-fuchsia-500 px-3.5 py-2 text-[12.5px] font-semibold text-white shadow-[0_12px_26px_-12px_rgba(124,58,237,0.95)] transition hover:-translate-y-0.5"
                  >
                    Preguntarle a Esther
                    <ArrowUpRight className="size-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>
                  <span className="inline-flex items-center gap-1.5 text-[10.5px] font-medium text-muted-foreground">
                    <span className="relative flex size-1.5">
                      <span className="absolute inline-flex size-full rounded-full bg-emerald-400 opacity-70 motion-safe:animate-ping" />
                      <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                    </span>
                    Esther Infinity
                  </span>
                </div>
              </div>

              {/* Barra de tiempo: al llenarse, el briefing se va abajo */}
              <motion.span
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-[3px] origin-left bg-gradient-to-r from-primary via-fuchsia-500 to-sky-400"
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: SEGUNDOS_VISIBLE, ease: "linear" }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
