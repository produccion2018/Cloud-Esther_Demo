import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
} from "framer-motion";
import { useEffect, useState } from "react";
import {
  Check,
  Sparkles,
  Plus,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Layers3,
} from "lucide-react";
import { PublicLayout } from "@/components/site/PublicLayout";
import { PlanGrid } from "@/components/site/PlanCards";
import { Reveal } from "@/components/site/Reveal";
import {
  additionalModules,
  comparison,
  plans,
} from "@/lib/site-data";

export const Route = createFileRoute("/planes")({
  head: () => ({
    meta: [
      { title: "Planes | Cloud Esther" },
      {
        name: "description",
        content:
          "Cuatro planes para clínicas odontológicas, desde consultorios que comienzan hasta grupos odontológicos y organizaciones multiempresa.",
      },
      {
        property: "og:title",
        content: "Planes de Cloud Esther",
      },
      {
        property: "og:description",
        content:
          "Elegí el plan que corresponde a la escala de tu organización y ampliá Cloud Esther a medida que tu operación crece.",
      },
    ],
  }),
  component: Planes,
});

const heroLine = "Un plan para cada etapa";
const heroLineTwo = "de tu clínica.";

type AdditionalModule = (typeof additionalModules)[number];

/* =========================================================
   MÓDULOS ADICIONALES — ARCADA DENTAL
   - Los datos vienen de additionalModules (no se toca su forma).
   - Funciona con cualquier cantidad de módulos.
   - Hasta 9 módulos: arcada en desktop. Si hay más, se usa la
     lista de dientes en todas las pantallas.
========================================================= */
const TOOTH_PATH =
  "M23 14 C17.5 14 14 18 14 23.5 C14 28 15.6 31 17 35.5 C18.6 40.5 18.6 47 20.6 50 C22.2 52.4 25.2 51.6 26 48.4 C27 44.4 28.4 40.6 32 40.6 C35.6 40.6 37 44.4 38 48.4 C38.8 51.6 41.8 52.4 43.4 50 C45.4 47 45.4 40.5 47 35.5 C48.4 31 50 28 50 23.5 C50 18 46.5 14 41 14 C37.6 14 35 15.6 32 15.6 C29 15.6 26.4 14 23 14 Z";

const CTA_TOOTH_PATH =
  "M12 2C8.5 2 6 4 6 7.5c0 2.2.6 3.8 1.1 5.6.5 1.7.9 3.6 1.1 6.1.1 1.2 1 2.1 1.9 1.7.7-.3.9-1.3 1.1-2.2.3-1.4.6-2.9 1.8-2.9s1.5 1.5 1.8 2.9c.2.9.4 1.9 1.1 2.2.9.4 1.8-.5 1.9-1.7.2-2.5.6-4.4 1.1-6.1.5-1.8 1.1-3.4 1.1-5.6C18 4 15.5 2 12 2z";

const ARCH_DEPTH = 64;
const ARCH_PAD_TOP = 14;
const ARCH_TOOTH_H = 104;
const ARCH_LABEL_H = 50;
const ARCH_HEIGHT = ARCH_PAD_TOP + ARCH_DEPTH + ARCH_TOOTH_H + ARCH_LABEL_H + 16;
const ARCH_MAX_TEETH = 9;
const ARCH_AUTOPLAY_MS = 6000;

/* Partículas de luz que suben en el CTA final */
const CTA_SPARKS = [
  { left: "6%", size: 6, delay: 0, duration: 7 },
  { left: "17%", size: 4, delay: 2.2, duration: 6 },
  { left: "29%", size: 8, delay: 4.1, duration: 8 },
  { left: "41%", size: 5, delay: 1.1, duration: 6.5 },
  { left: "54%", size: 7, delay: 3.3, duration: 7.5 },
  { left: "66%", size: 4, delay: 0.6, duration: 6 },
  { left: "78%", size: 6, delay: 2.8, duration: 7 },
  { left: "90%", size: 5, delay: 4.8, duration: 8 },
];

function safeId(value: string | number) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "");
}

function archPoint(index: number, total: number) {
  const t = total <= 1 ? 0.5 : index / (total - 1);
  const u = (t - 0.5) * 2;

  return {
    left: 8 + t * 84,
    top: ARCH_PAD_TOP + ARCH_DEPTH * (1 - u * u),
    rotate: -u * 14,
  };
}

function ToothShape({
  active,
  uid,
  className = "",
}: {
  active: boolean;
  uid: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="12 12 40 42"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`tooth-fill-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="55%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#c026d3" />
        </linearGradient>
      </defs>

      <path
        d={TOOTH_PATH}
        className="fill-card stroke-primary/40"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      <motion.path
        d={TOOTH_PATH}
        fill={`url(#tooth-fill-${uid})`}
        initial={false}
        animate={{ opacity: active ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />

      <path
        d="M20 22 C20 19.6 21.6 18.4 23.6 18.4"
        stroke={active ? "#ffffff" : "#8B5CF6"}
        strokeOpacity={active ? 0.65 : 0.35}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AdditionalModulesTeeth({
  modules,
  onConsult,
}: {
  modules: AdditionalModule[];
  onConsult: () => void;
}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();

  const total = modules.length;
  const safeActive = total > 0 ? Math.min(active, total - 1) : 0;
  const archMode = total <= ARCH_MAX_TEETH;

  // Rotación automática; se frena al pasar el mouse por encima.
  useEffect(() => {
    if (total < 2 || paused || reduceMotion) return undefined;

    const id = window.setTimeout(() => {
      setActive((prev) => (prev + 1) % total);
    }, ARCH_AUTOPLAY_MS);

    return () => window.clearTimeout(id);
  }, [active, paused, reduceMotion, total]);

  if (total === 0) return null;

  const current = modules[safeActive];
  const centerY = ARCH_PAD_TOP + ARCH_TOOTH_H * 0.5;

  const goPrev = () => setActive((safeActive - 1 + total) % total);
  const goNext = () => setActive((safeActive + 1) % total);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="mt-10"
    >
      {/* ARCADA (desktop) */}
      {archMode && (
        <div
          className="relative mx-auto hidden w-full max-w-6xl lg:block"
          style={{ height: ARCH_HEIGHT }}
        >
          {/* Línea de la arcada */}
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 w-full"
            height={ARCH_HEIGHT}
            viewBox={`0 0 100 ${ARCH_HEIGHT}`}
            preserveAspectRatio="none"
          >
            <motion.path
              d={`M 8 ${centerY} Q 50 ${centerY + 2 * ARCH_DEPTH} 92 ${centerY}`}
              fill="none"
              strokeWidth={1.5}
              strokeDasharray="4 7"
              vectorEffect="non-scaling-stroke"
              className="stroke-primary/30"
              animate={{ strokeDashoffset: [0, -22] }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          </svg>

          {modules.map((module, index) => {
            const point = archPoint(index, total);
            const isActive = index === safeActive;
            const uid = `arch-${safeId(module.id)}-${index}`;

            return (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, y: 30, scale: 0.8 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.55,
                  delay: index * 0.07,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="absolute"
                style={{
                  left: `${point.left}%`,
                  top: point.top,
                  marginLeft: -60,
                  width: 120,
                  zIndex: isActive ? 20 : 10,
                }}
              >
                <motion.button
                  type="button"
                  aria-pressed={isActive}
                  aria-label={module.name}
                  onClick={() => setActive(index)}
                  onMouseEnter={() => setActive(index)}
                  onFocus={() => setActive(index)}
                  animate={
                    reduceMotion
                      ? { y: isActive ? -12 : 0, scale: isActive ? 1.14 : 1 }
                      : {
                          y: isActive ? -12 : [0, -4, 0],
                          scale: isActive ? 1.14 : 1,
                        }
                  }
                  transition={{
                    scale: { type: "spring", stiffness: 260, damping: 18 },
                    y:
                      isActive || reduceMotion
                        ? { type: "spring", stiffness: 260, damping: 18 }
                        : {
                            duration: 4 + (index % 3) * 0.6,
                            delay: index * 0.2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          },
                  }}
                  className="group relative flex w-full flex-col items-center rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <span
                    className="relative block"
                    style={{ width: 84, height: ARCH_TOOTH_H }}
                  >
                    {/* Resplandor del diente activo */}
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute -inset-4 rounded-full bg-primary/30 blur-2xl transition-opacity duration-500 ${
                        isActive ? "opacity-100" : "opacity-0"
                      }`}
                    />

                    {isActive && !reduceMotion && (
                      <motion.span
                        aria-hidden="true"
                        animate={{ scale: [1, 1.5], opacity: [0.45, 0] }}
                        transition={{
                          duration: 2.2,
                          repeat: Infinity,
                          ease: "easeOut",
                        }}
                        className="pointer-events-none absolute inset-3 rounded-full border border-primary/50"
                      />
                    )}

                    <span
                      className="relative block size-full"
                      style={{ transform: `rotate(${point.rotate}deg)` }}
                    >
                      <ToothShape
                        uid={uid}
                        active={isActive}
                        className="size-full drop-shadow-[0_10px_18px_rgba(124,58,237,0.22)]"
                      />

                      <Plus
                        className={`absolute left-1/2 top-[34%] size-5 -translate-x-1/2 -translate-y-1/2 transition-colors duration-300 ${
                          isActive ? "text-white" : "text-primary"
                        }`}
                      />
                    </span>
                  </span>

                  <span
                    className={`mt-2 line-clamp-2 w-full text-center text-[12px] font-semibold leading-tight transition-colors duration-300 ${
                      isActive ? "text-primary" : "text-foreground/70"
                    }`}
                  >
                    {module.name}
                  </span>
                </motion.button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* LISTA DE DIENTES (mobile, o si hay muchos módulos) */}
      <ul
        className={`grid gap-x-10 ${
          archMode
            ? "sm:grid-cols-2 lg:hidden"
            : "sm:grid-cols-2 lg:grid-cols-3"
        }`}
      >
        {modules.map((module, index) => {
          const uid = `list-${safeId(module.id)}-${index}`;

          return (
            <motion.li
              key={module.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                duration: 0.5,
                delay: Math.min(index * 0.05, 0.3),
                ease: [0.22, 1, 0.36, 1],
              }}
              className="flex gap-4 border-b border-border/60 py-5 last:border-0"
            >
              <span className="relative block h-[58px] w-[54px] shrink-0">
                <ToothShape
                  uid={uid}
                  active
                  className="size-full drop-shadow-[0_8px_14px_rgba(124,58,237,0.22)]"
                />
                <Plus className="absolute left-1/2 top-[34%] size-4 -translate-x-1/2 -translate-y-1/2 text-white" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-semibold">{module.name}</h3>

                  <span className="shrink-0 rounded-full border border-border/70 bg-muted/50 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                    Adicional
                  </span>
                </div>

                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {module.description}
                </p>

                <p className="mt-3 text-sm">
                  <span className="text-lg font-bold text-foreground">
                    {module.price}
                  </span>{" "}
                  <span className="text-[11px] text-muted-foreground">
                    {module.billing}
                  </span>
                </p>
              </div>
            </motion.li>
          );
        })}
      </ul>

      {/* PANEL DE DETALLE DEL DIENTE ACTIVO (desktop con arcada) */}
      {archMode && (
        <div className="relative mx-auto mt-6 hidden max-w-4xl lg:block">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="group relative overflow-hidden rounded-3xl border border-primary/15 bg-card/85 p-8 shadow-[0_20px_60px_rgba(88,28,135,0.1)] backdrop-blur-xl"
            >
              <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-primary/15 blur-[80px]" />
              <div className="pointer-events-none absolute -bottom-20 -left-16 size-56 rounded-full bg-violet-300/15 blur-[80px]" />

              <span className="pointer-events-none absolute right-6 top-2 text-8xl font-extrabold leading-none text-primary/[0.07]">
                {String(safeActive + 1).padStart(2, "0")}
              </span>

              <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full border border-border/70 bg-muted/50 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                      Adicional
                    </span>

                    <span className="text-xs font-semibold text-primary">
                      Módulo {String(safeActive + 1).padStart(2, "0")} de{" "}
                      {String(total).padStart(2, "0")}
                    </span>
                  </div>

                  <h3 className="mt-3 text-2xl font-bold tracking-tight lg:text-3xl">
                    {current.name}
                  </h3>

                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground lg:text-base">
                    {current.description}
                  </p>
                </div>

                <div className="flex flex-col items-start gap-4 md:items-end md:text-right">
                  <div>
                    <span className="text-3xl font-bold text-foreground">
                      {current.price}
                    </span>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {current.billing}
                    </p>
                  </div>

                  <motion.button
                    type="button"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onConsult}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-shadow hover:shadow-primary/40"
                  >
                    Consultar por este módulo
                    <ArrowRight className="size-4" />
                  </motion.button>
                </div>
              </div>

              {/* Barra de progreso de la rotación automática */}
              {total > 1 && !paused && !reduceMotion && (
                <motion.span
                  key={`progress-${safeActive}`}
                  aria-hidden="true"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{
                    duration: ARCH_AUTOPLAY_MS / 1000,
                    ease: "linear",
                  }}
                  style={{ originX: 0 }}
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-primary to-brand"
                />
              )}
            </motion.div>
          </AnimatePresence>

          {total > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={goPrev}
                aria-label="Módulo anterior"
                className="flex size-9 items-center justify-center rounded-full border border-border/70 bg-card text-primary transition-colors hover:border-primary/30 hover:bg-lavender"
              >
                <ChevronLeft className="size-4" />
              </button>

              <div className="flex items-center gap-1.5">
                {modules.map((module, index) => (
                  <button
                    key={module.id}
                    type="button"
                    onClick={() => setActive(index)}
                    aria-label={module.name}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index === safeActive
                        ? "w-6 bg-primary"
                        : "w-1.5 bg-primary/25 hover:bg-primary/50"
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={goNext}
                aria-label="Módulo siguiente"
                className="flex size-9 items-center justify-center rounded-full border border-border/70 bg-card text-primary transition-colors hover:border-primary/30 hover:bg-lavender"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   CTA FINAL — banner violeta animado
========================================================= */
function CtaFinal({ onContract }: { onContract: () => void }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative mx-auto mt-12 max-w-4xl overflow-hidden rounded-3xl border border-white/10 p-8 text-center text-white shadow-[0_25px_70px_rgba(88,28,135,0.35)] lg:p-12">
        {/* Fondo degradé que fluye */}
        <motion.div
          aria-hidden="true"
          animate={{
            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
          }}
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,#4c1d95_0%,#6d28d9_22%,#8b3fe8_42%,#b56bea_62%,#7c3aed_82%,#4c1d95_100%)] bg-[length:300%_100%]"
        />

        {/* Blobs de luz que flotan */}
        <motion.div
          aria-hidden="true"
          animate={{
            x: [0, 50, -20, 0],
            y: [0, 30, 55, 0],
            scale: [1, 1.18, 0.94, 1],
          }}
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute -left-24 -top-24 size-[340px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.22) 0%, transparent 70%)",
          }}
        />

        <motion.div
          aria-hidden="true"
          animate={{
            x: [0, -55, 25, 0],
            y: [0, -35, -60, 0],
            scale: [1, 0.92, 1.16, 1],
          }}
          transition={{
            duration: 16,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute -bottom-28 -right-24 size-[360px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)",
          }}
        />

        <motion.div
          aria-hidden="true"
          animate={{
            opacity: [0.25, 0.6, 0.25],
            scale: [0.9, 1.15, 0.9],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute left-1/2 top-1/2 size-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(232,121,249,0.3) 0%, transparent 65%)",
          }}
        />

        {/* Haz de luz que barre el banner */}
        <motion.span
          aria-hidden="true"
          initial={{ x: "-150%" }}
          animate={{ x: ["-150%", "520%"] }}
          transition={{
            duration: 5.5,
            repeat: Infinity,
            repeatDelay: 1.5,
            ease: "easeInOut",
          }}
          style={{ skewX: -20 }}
          className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-white/25 to-transparent"
        />

        {/* Dientes flotantes de fondo */}
        <motion.div
          aria-hidden="true"
          animate={{ y: [0, -16, 0], rotate: [-10, 8, -10] }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute left-[6%] top-[16%] hidden text-white/15 sm:block"
        >
          <svg viewBox="0 0 24 24" className="size-14 fill-current">
            <path d={CTA_TOOTH_PATH} />
          </svg>
        </motion.div>

        <motion.div
          aria-hidden="true"
          animate={{ y: [0, 18, 0], rotate: [12, -8, 12] }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute bottom-[12%] right-[7%] hidden text-white/15 sm:block"
        >
          <svg viewBox="0 0 24 24" className="size-20 fill-current">
            <path d={CTA_TOOTH_PATH} />
          </svg>
        </motion.div>

        {/* Partículas que suben */}
        {CTA_SPARKS.map((spark, index) => (
          <motion.span
            key={index}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{
              y: [0, -300],
              opacity: [0, 0.85, 0],
              scale: [0.6, 1.1],
            }}
            transition={{
              duration: spark.duration,
              delay: spark.delay,
              repeat: Infinity,
              ease: "linear",
            }}
            className="pointer-events-none absolute bottom-2 rounded-full bg-white shadow-[0_0_14px_rgba(255,255,255,0.9)]"
            style={{
              left: spark.left,
              width: spark.size,
              height: spark.size,
            }}
          />
        ))}

        <div className="relative">
          {/* Diente con ondas de pulso */}
          <div className="relative mx-auto size-12">
            <motion.span
              aria-hidden="true"
              animate={{ scale: [1, 2.4], opacity: [0.55, 0] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeOut",
              }}
              className="pointer-events-none absolute inset-0 rounded-2xl border border-white/50"
            />
            <motion.span
              aria-hidden="true"
              animate={{ scale: [1, 2.4], opacity: [0.55, 0] }}
              transition={{
                duration: 3,
                delay: 1.5,
                repeat: Infinity,
                ease: "easeOut",
              }}
              className="pointer-events-none absolute inset-0 rounded-2xl border border-white/50"
            />

            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{
                duration: 3.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative flex size-12 items-center justify-center rounded-2xl bg-white/15 shadow-[0_0_30px_rgba(255,255,255,0.25)]"
            >
              <motion.svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                animate={{ scale: [1, 1.15, 1] }}
                transition={{
                  duration: 2.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="size-6 fill-white"
              >
                <path d={CTA_TOOTH_PATH} />
              </motion.svg>
            </motion.div>
          </div>

          <motion.h3
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-5 max-w-2xl text-2xl font-bold text-white lg:text-3xl"
          >
            Cloud Esther crece con tu{" "}
            <motion.span
              animate={{
                backgroundPosition: ["0% center", "200% center"],
              }}
              transition={{
                duration: 4.5,
                repeat: Infinity,
                ease: "linear",
              }}
              className="inline-block bg-[linear-gradient(90deg,#ffffff_0%,#f5c2ff_25%,#ffffff_50%,#f5c2ff_75%,#ffffff_100%)] bg-[length:200%_auto] bg-clip-text text-transparent"
            >
              organización.
            </motion.span>
          </motion.h3>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/80"
          >
            Comenzá con el plan que corresponde a tu operación y evolucioná
            hacia una gestión más completa a medida que tu clínica o grupo
            odontológico crece.
          </motion.p>

          <div className="mt-7 flex justify-center">
            {/* Pulso de luz alrededor del botón */}
            <motion.div
              animate={{
                boxShadow: [
                  "0 0 0 0 rgba(255,255,255,0.55)",
                  "0 0 0 20px rgba(255,255,255,0)",
                ],
              }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: "easeOut",
              }}
              className="rounded-xl"
            >
              <motion.button
                type="button"
                whileHover={{ y: -2, scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={onContract}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-primary shadow-lg shadow-black/10 transition-shadow hover:shadow-black/20"
              >
                Contratar servicio
                <motion.span
                  animate={{ x: [0, 5, 0] }}
                  transition={{
                    duration: 1.4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="inline-flex"
                >
                  <ArrowRight className="size-4" />
                </motion.span>
              </motion.button>
            </motion.div>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}

function Planes() {
  const navigate = useNavigate();

  return (
    <PublicLayout>
      {/* =========================================================
          HERO
      ========================================================= */}
      <section className="relative isolate overflow-hidden bg-soft">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.25, 0.42, 0.25],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute left-1/2 top-[-180px] h-[430px] w-[760px] -translate-x-1/2 rounded-full bg-primary/10 blur-[110px]"
        />

        <motion.div
          animate={{
            x: [-30, 30, -30],
            y: [0, 20, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute -left-40 top-28 size-[330px] rounded-full bg-violet-300/10 blur-[100px]"
        />

        <motion.div
          animate={{
            x: [30, -30, 30],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute -right-40 top-20 size-[360px] rounded-full bg-purple-300/10 blur-[100px]"
        />

        <div className="relative mx-auto max-w-5xl px-5 pb-10 pt-10 text-center sm:pt-12 lg:px-8 lg:pb-12 lg:pt-14">
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.6,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="inline-flex"
          >
            <motion.span
              animate={{
                boxShadow: [
                  "0 0 0 rgba(124,58,237,0)",
                  "0 0 24px rgba(124,58,237,0.2)",
                  "0 0 0 rgba(124,58,237,0)",
                ],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-lavender px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-lavender-foreground"
            >
              <motion.span
                animate={{
                  scale: [0.85, 1.15, 0.85],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="size-1.5 rounded-full bg-primary"
              />

              Planes
            </motion.span>
          </motion.div>

          <div className="mt-6 text-4xl font-bold leading-[1.05] tracking-[-0.04em] text-foreground sm:text-5xl lg:text-6xl">
            <div className="overflow-hidden">
              {heroLine.split("").map((char, index) => (
                <motion.span
                  key={`${char}-${index}`}
                  initial={{
                    opacity: 0,
                    y: 30,
                    rotateX: -70,
                    filter: "blur(5px)",
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    rotateX: 0,
                    filter: "blur(0px)",
                  }}
                  transition={{
                    duration: 0.65,
                    delay: 0.15 + index * 0.035,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="inline-block"
                >
                  {char === " " ? "\u00A0" : char}
                </motion.span>
              ))}
            </div>

            <div className="relative mt-1 overflow-hidden">
              <span className="relative inline-block bg-[linear-gradient(110deg,#111827_0%,#111827_35%,#7c3aed_52%,#a855f7_64%,#111827_82%)] bg-[length:250%_100%] bg-clip-text text-transparent">
                {heroLineTwo.split("").map((char, index) => (
                  <motion.span
                    key={`${char}-${index}`}
                    initial={{
                      opacity: 0,
                      y: 30,
                      rotateX: -70,
                      filter: "blur(5px)",
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      rotateX: 0,
                      filter: "blur(0px)",
                    }}
                    transition={{
                      duration: 0.65,
                      delay: 0.75 + index * 0.045,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="inline-block"
                  >
                    {char === " " ? "\u00A0" : char}
                  </motion.span>
                ))}

                <motion.span
                  animate={{
                    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                  }}
                  transition={{
                    duration: 7,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(110deg,transparent,rgba(168,85,247,0.2),transparent)] bg-[length:220%_100%]"
                />
              </span>
            </div>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              delay: 1.45,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground lg:text-lg"
          >
            Compará los módulos de cada plan, con implementación acompañada y
            una plataforma que crece con tu organización.
          </motion.p>

          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 56, opacity: 1 }}
            transition={{
              duration: 0.8,
              delay: 1.7,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mx-auto mt-7 h-0.5 rounded-full bg-primary/50"
          />
        </div>
      </section>

      {/* =========================================================
          PLANES
      ========================================================= */}
      <section className="relative mx-auto max-w-7xl px-5 pb-14 pt-6 lg:px-8 lg:pb-18 lg:pt-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative mb-8 text-center"
        >
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/10 bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
            <Sparkles className="size-3.5 text-primary" />
            Elegí cómo querés crecer
          </div>
        </motion.div>

        <div className="relative">
          <motion.div
            animate={{
              opacity: [0.15, 0.28, 0.15],
              scale: [0.98, 1.03, 0.98],
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="pointer-events-none absolute left-1/2 top-1/2 size-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-[100px]"
          />

          <div className="relative">
            <PlanGrid
              onSelect={(plan) =>
                navigate({
                  to: "/registro",
                  search: { plan: plan.id },
                })
              }
            />
          </div>
        </div>
      </section>

      {/* =========================================================
          MÓDULOS ADICIONALES
      ========================================================= */}
      <section className="relative overflow-hidden border-y border-border/60 bg-soft/60">
        <motion.div
          animate={{
            opacity: [0.15, 0.3, 0.15],
            scale: [1, 1.08, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute left-1/2 top-0 size-[520px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]"
        />

        <div className="relative mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <Reveal className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-lavender px-3.5 py-1.5 text-xs font-semibold text-lavender-foreground">
              <Layers3 className="size-3.5" />
              Módulos adicionales
            </span>

            <h2 className="mt-5 text-3xl font-bold tracking-tight lg:text-4xl">
              Ampliá Cloud Esther.{" "}
              <span className="text-gradient">Sumá nuevas capacidades.</span>
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground lg:text-lg">
              Algunos módulos pueden contratarse adicionalmente cuando estén
              disponibles para el plan correspondiente. Así podés ampliar la
              plataforma sin cambiar innecesariamente de nivel.
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <motion.div
              whileHover={{ y: -4 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 22,
              }}
              className="group relative mx-auto mt-8 max-w-3xl overflow-hidden rounded-2xl border border-primary/15 bg-card/80 p-5 shadow-[0_18px_50px_rgba(88,28,135,0.08)] backdrop-blur-xl transition-shadow duration-300 hover:shadow-[0_22px_60px_rgba(88,28,135,0.14)] sm:p-6"
            >
              <motion.div
                animate={{
                  opacity: [0.12, 0.28, 0.12],
                  scale: [0.9, 1.08, 0.9],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-primary/20 blur-[70px]"
              />

              <div className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />

              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <motion.span
                    animate={{ rotate: [0, 8, -8, 0] }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10"
                  >
                    <Plus className="size-5 text-primary" />
                  </motion.span>

                  <div>
                    <p className="text-sm font-semibold">
                      Ejemplo de ampliación
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Plan Start + módulo adicional disponible
                    </p>
                  </div>
                </div>

                <motion.span
                  animate={{
                    boxShadow: [
                      "0 0 0px rgba(124,58,237,0.25)",
                      "0 0 14px rgba(124,58,237,0.4)",
                      "0 0 0px rgba(124,58,237,0.25)",
                    ],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="shrink-0 rounded-full bg-lavender px-3 py-1.5 text-xs font-semibold text-lavender-foreground"
                >
                  Según disponibilidad del plan
                </motion.span>
              </div>
            </motion.div>
          </Reveal>

          <AdditionalModulesTeeth
            modules={additionalModules}
            onConsult={() => navigate({ to: "/demostracion" })}
          />

          <Reveal delay={0.15}>
            <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-relaxed text-muted-foreground">
              Los módulos adicionales se agregan al plan contratado cuando
              estén disponibles para ese nivel. Para conocer las condiciones
              comerciales, escribinos y te asesoramos.
            </p>
          </Reveal>
        </div>
      </section>

      {/* =========================================================
          COMPARADOR
      ========================================================= */}
      <section className="relative overflow-hidden bg-soft">
        <motion.div
          animate={{
            opacity: [0.15, 0.3, 0.15],
            scale: [1, 1.08, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute left-1/2 top-0 size-[520px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]"
        />

        <div className="relative mx-auto max-w-7xl px-5 pb-24 pt-20 lg:px-8">
          <Reveal className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-lavender px-3.5 py-1.5 text-xs font-semibold text-lavender-foreground">
              <Check className="size-3.5" />
              Comparación completa
            </span>

            <h2 className="mt-4 text-3xl font-bold tracking-tight lg:text-4xl">
              Compará los planes
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Conocé los límites, módulos y capacidades disponibles en cada
              nivel de Cloud Esther.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="relative mt-8 overflow-hidden rounded-3xl border border-border/70 bg-card/80 shadow-[0_20px_60px_rgba(88,28,135,0.08)] backdrop-blur-xl">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/5 to-transparent" />

              <div className="relative overflow-x-auto">
                <table className="w-full min-w-[820px] text-[13px]">
                  <thead>
                    <tr className="border-b border-border/70">
                      <th className="p-5 text-left font-semibold">
                        Función
                      </th>

                      {plans.map((plan) => (
                        <th
                          key={plan.id}
                          className={`p-5 text-center font-semibold ${
                            plan.featured ? "text-primary" : ""
                          }`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            {plan.featured && (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                                Más elegido
                              </span>
                            )}

                            <span>{plan.name}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {comparison.map((row, index) => (
                      <tr
                        key={row.feature}
                        className={`border-b border-border/60 transition-colors last:border-0 hover:bg-lavender/50 ${
                          index % 2 ? "bg-muted/20" : ""
                        }`}
                      >
                        <td className="p-4 font-medium text-foreground/85">
                          {row.feature}
                        </td>

                        {row.values.map((value, valueIndex) => (
                          <td
                            key={valueIndex}
                            className={`p-4 text-center ${
                              value === "—"
                                ? "text-muted-foreground/50"
                                : value === "Adicional"
                                  ? "text-primary"
                                  : "text-foreground"
                            }`}
                          >
                            {value === "✓" ? (
                              <span className="mx-auto flex size-6 items-center justify-center rounded-full bg-primary/10">
                                <Check className="size-3.5 text-primary" />
                              </span>
                            ) : value === "Adicional" ? (
                              <span className="inline-flex rounded-full bg-lavender px-2.5 py-1 text-[10px] font-semibold text-lavender-foreground">
                                Disponible aparte
                              </span>
                            ) : (
                              value
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>

          {/* =====================================================
              CTA FINAL
          ===================================================== */}
          <Reveal delay={0.15}>
            <CtaFinal
              onContract={() =>
                navigate({
                  to: "/demostracion",
                })
              }
            />
          </Reveal>
        </div>
      </section>
    </PublicLayout>
  );
}