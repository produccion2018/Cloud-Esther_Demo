import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, ArrowUpRight, CloudSun } from "lucide-react";
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
   Briefing proactivo de Esther Infinity: al entrar a un módulo aparece ARRIBA (al centro)
   con el saludo por hora, el clima real, lo básico de la clínica (hallazgos reales del plan)
   y en qué módulo estás. Se queda unos segundos y después se va solo "hacia abajo", donde
   queda el botón flotante de Esther normal. No inventa datos: clima real (o sin clima) y
   hallazgos calculados sobre los datos de la clínica. */

const SEGUNDOS_VISIBLE = 9;

export function EstherBriefing({ moduloId, modulo }: { moduloId: string; modulo: string }) {
  const { plan } = useCloudEsther();
  const { usuario } = useSesion();
  const clima = useClima();
  const primerNombre = primerNombreDe(usuario?.nombre ?? "Andrés Becerra");

  // Hallazgos reales de la clínica (los mismos que usa Esther): hasta 3.
  const hallazgos = useMemo(() => hallazgosEsther(plan), [plan]);

  // Se vuelve a mostrar cada vez que cambia el módulo.
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), SEGUNDOS_VISIBLE * 1000);
    return () => window.clearTimeout(t);
  }, [moduloId]);

  const frase = fraseClima(clima);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={moduloId}
          initial={{ opacity: 0, y: -28, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 140, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className="fixed left-1/2 top-[76px] z-[55] w-[min(540px,calc(100vw-2rem))] -translate-x-1/2"
          role="status"
          aria-live="polite"
        >
          <div className="relative overflow-hidden rounded-3xl border border-primary/15 bg-card/95 p-4 shadow-[0_30px_70px_-30px_rgba(76,29,149,0.65)] backdrop-blur-md">
            {/* luz de fondo */}
            <span
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-primary/20 blur-[70px]"
            />
            <div className="relative flex items-start gap-3">
              <span className="relative grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-fuchsia-500 text-white shadow-[0_10px_24px_-10px_rgba(124,58,237,0.9)]">
                <Sparkles className="size-5" />
                <span className="absolute -bottom-px -right-px flex size-3">
                  <span className="absolute inline-flex size-full rounded-full bg-emerald-400 opacity-70 motion-safe:animate-ping [animation-duration:2.2s]" />
                  <span className="relative inline-flex size-3 rounded-full border-2 border-card bg-emerald-500" />
                </span>
              </span>

              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold leading-tight">
                  {saludoHora()}
                  {primerNombre ? `, ${primerNombre}` : ""} 👋
                </p>
                {frase && (
                  <p className="mt-0.5 inline-flex items-center gap-1 text-[12px] text-muted-foreground">
                    <CloudSun className="size-3.5 text-primary" />
                    {frase}
                  </p>
                )}
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  Estás en <span className="font-semibold text-foreground">{modulo}</span>.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setVisible(false)}
                aria-label="Cerrar"
                className="grid size-7 shrink-0 place-items-center rounded-full bg-card/80 text-muted-foreground transition hover:text-primary"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {/* Lo básico de la clínica (hallazgos reales) */}
            {hallazgos.length > 0 && (
              <div className="relative mt-3 flex flex-col gap-1.5">
                {hallazgos.map((h) => (
                  <div
                    key={h.texto}
                    className="flex items-center gap-2 rounded-xl border border-primary/10 bg-lavender/40 px-2.5 py-1.5"
                  >
                    <span
                      className={`size-1.5 shrink-0 rounded-full ${h.tono === "alerta" ? "bg-fuchsia-500" : "bg-primary"}`}
                    />
                    <span className="min-w-0 flex-1 truncate text-[12px] text-foreground/85">
                      {h.texto}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="relative mt-3 flex items-center justify-between">
              <Link
                to={"/demo/ia" as never}
                onClick={() => setVisible(false)}
                className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary to-fuchsia-500 px-3 py-1.5 text-[12px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(124,58,237,0.9)] transition hover:-translate-y-0.5"
              >
                Preguntarle a Esther
                <ArrowUpRight className="size-3.5" />
              </Link>
              <span className="text-[10px] text-muted-foreground">Esther Infinity</span>
            </div>

            {/* barra de tiempo: al llenarse, el briefing se va abajo */}
            <motion.span
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-gradient-to-r from-primary to-fuchsia-500"
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: SEGUNDOS_VISIBLE, ease: "linear" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
