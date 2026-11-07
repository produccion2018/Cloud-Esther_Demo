import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowUpRight, CalendarDays, CloudSun, AlertTriangle, Activity, Volume2, Square, PhoneCall } from "lucide-react";
import estherSaludando from "@/assets/esther-pose-waving.png";
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
   Esther "te llama" al entrar al dashboard: aparece su dibujo en la esquina y, como si te
   hablara por teléfono, sale un GLOBO de mensaje con el saludo del día y lo básico de la
   clínica. Se puede escuchar en AUDIO (botón 🔊, voz del navegador) y leer escrito. Dura
   poco (se va solo) o se cierra con la X. No inventa datos: hallazgos reales del plan.
   Solo se monta en el dashboard (lo decide AppShell). */

const SEGUNDOS_VISIBLE = 14;

/** Voz en español (síntesis del navegador) para que Esther "hable" el mensaje. */
function vozEspanol(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voces = window.speechSynthesis.getVoices();
  return (
    voces.find((v) => v.lang === "es-AR") ??
    voces.find(
      (v) => v.lang.startsWith("es") && /female|mujer|paulina|helena|sabina|monica/i.test(v.name),
    ) ??
    voces.find((v) => v.lang.startsWith("es")) ??
    null
  );
}

export function EstherBriefing({ moduloId, modulo }: { moduloId: string; modulo: string }) {
  void modulo;
  const { plan } = useCloudEsther();
  const { usuario } = useSesion();
  const clima = useClima();
  const primerNombre = primerNombreDe(usuario?.nombre ?? "");

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
  const [hablando, setHablando] = useState(false);

  // Texto que Esther lee en voz alta: el saludo + lo de la clínica.
  const textoVoz = useMemo(() => {
    const saludo = `${saludoHora()}${primerNombre ? `, ${primerNombre}` : ""}.`;
    const items = hallazgos.map((h) => h.texto).join(". ");
    return items ? `${saludo} ${items}.` : saludo;
  }, [hallazgos, primerNombre]);

  useEffect(() => {
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), SEGUNDOS_VISIBLE * 1000);
    return () => window.clearTimeout(t);
  }, [moduloId]);

  // Al salir de la pantalla, cortar la voz si estaba hablando.
  useEffect(
    () => () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window)
        window.speechSynthesis.cancel();
    },
    [],
  );

  const alternarVoz = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (hablando) {
      window.speechSynthesis.cancel();
      setHablando(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(textoVoz.slice(0, 600));
    const v = vozEspanol();
    if (v) u.voice = v;
    u.lang = v?.lang ?? "es-AR";
    u.rate = 1.02;
    u.onend = () => setHablando(false);
    u.onerror = () => setHablando(false);
    window.speechSynthesis.cancel();
    setHablando(true);
    window.speechSynthesis.speak(u);
  };

  const cerrar = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window)
      window.speechSynthesis.cancel();
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={moduloId}
          initial={{ opacity: 0, y: 40, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 240, damping: 26 }}
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-3 z-[55] flex w-[min(440px,calc(100vw-1.5rem))] items-end gap-1.5 lg:bottom-6 lg:right-6"
          role="status"
          aria-live="polite"
        >
          {/* Esther, como si te estuviera llamando */}
          <div className="relative hidden shrink-0 sm:block">
            <motion.img
              src={estherSaludando}
              alt="Esther"
              className="h-[150px] w-auto origin-bottom object-contain drop-shadow-[0_18px_22px_rgba(76,29,149,0.28)]"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Chapita de "en llamada" */}
            <span className="absolute -right-1 top-6 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-md">
              <PhoneCall className="size-2.5" />
              En línea
            </span>
          </div>

          {/* Globo de mensaje (lo que Esther "dice") */}
          <div className="relative min-w-0 flex-1 rounded-[22px] rounded-bl-md border border-primary/15 bg-card p-4 shadow-[0_26px_60px_-28px_rgba(76,29,149,0.6)]">
            {/* Colita del globo apuntando a Esther */}
            <span
              aria-hidden
              className="absolute -left-1.5 bottom-4 hidden size-3.5 rotate-45 rounded-sm border-b border-l border-primary/15 bg-card sm:block"
            />

            {/* Encabezado: quién habla + audio + cerrar */}
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center overflow-hidden rounded-full bg-lavender/70 ring-1 ring-primary/15 sm:hidden">
                <img src={estherSaludando} alt="" className="h-5 w-auto object-contain" />
              </span>
              <p className="flex-1 text-[13px] font-bold tracking-[-0.01em] text-foreground">
                Esther
                <span className="ml-1.5 align-middle text-[10.5px] font-medium text-emerald-600">
                  · te saluda
                </span>
              </p>
              <button
                type="button"
                onClick={alternarVoz}
                aria-label={hablando ? "Detener audio" : "Escuchar el mensaje"}
                title={hablando ? "Detener" : "Escuchar"}
                className={`grid size-7 shrink-0 place-items-center rounded-full ring-1 transition ${
                  hablando
                    ? "bg-primary text-white ring-primary"
                    : "bg-card text-primary ring-primary/20 hover:ring-primary/40"
                }`}
              >
                {hablando ? <Square className="size-3" /> : <Volume2 className="size-3.5" />}
              </button>
              <button
                type="button"
                onClick={cerrar}
                aria-label="Cerrar"
                className="grid size-7 shrink-0 place-items-center rounded-full bg-card text-muted-foreground ring-1 ring-border transition hover:text-foreground hover:ring-primary/30"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {/* Saludo */}
            <p className="mt-2 font-display text-[16px] font-bold leading-tight tracking-[-0.01em]">
              {saludoHora()}
              {primerNombre ? `, ${primerNombre}` : ""} 👋
            </p>

            {/* Fecha + clima */}
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

            {/* Lo de la clínica (hallazgos reales) */}
            {hallazgos.length > 0 && (
              <div className="mt-3 flex flex-col gap-1.5">
                {hallazgos.map((h) => {
                  const alerta = h.tono === "alerta";
                  const Icono = alerta ? AlertTriangle : Activity;
                  return (
                    <div
                      key={h.texto}
                      className="flex items-center gap-2 rounded-xl border border-primary/10 bg-lavender/30 px-2.5 py-1.5"
                    >
                      <span
                        className={`grid size-6 shrink-0 place-items-center rounded-lg ${
                          alerta
                            ? "bg-fuchsia-500/12 text-fuchsia-600 dark:text-fuchsia-300"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        <Icono className="size-3" />
                      </span>
                      <span className="min-w-0 flex-1 text-[12px] font-medium leading-tight text-foreground/90">
                        {h.texto}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* CTA */}
            <div className="mt-3">
              <Link
                to={"/demo/ia" as never}
                onClick={cerrar}
                className="group inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition hover:-translate-y-0.5"
              >
                Hablar con Esther
                <ArrowUpRight className="size-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>

            {/* Barra de tiempo: al llenarse, el globo se va solo */}
            <motion.span
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-[3px] origin-left rounded-b-[22px] bg-gradient-to-r from-primary to-fuchsia-500"
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
