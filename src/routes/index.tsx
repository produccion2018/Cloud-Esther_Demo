import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AnimatePresence,
  MotionConfig,
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  HeartPulse,
  ReceiptText,
  Rocket,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/site/PublicLayout";
import { Reveal } from "@/components/site/Reveal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cloud Esther | Gestión inteligente para clínicas odontológicas" },
      {
        name: "description",
        content:
          "Cloud Esther centraliza la gestión de tu clínica odontológica: pacientes, agenda, tratamientos, facturación, reportes y mucho más.",
      },
      {
        property: "og:title",
        content: "Cloud Esther — Gestioná tu clínica. Hacela crecer.",
      },
      {
        property: "og:description",
        content:
          "La plataforma inteligente para administrar tu clínica, tus pacientes y todo tu equipo desde un solo lugar.",
      },
    ],
  }),
  component: Home,
});

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const modules = [
  {
    title: "Agenda",
    subtitle: "Turnos y horarios",
    icon: CalendarDays,
    position: "top-[4%] left-[45%] lg:left-[48%]",
    delay: 0,
    size: "large",
  },
  {
    title: "Pacientes",
    subtitle: "Toda tu información",
    icon: Users,
    position: "top-[19%] left-[4%] lg:left-[9%]",
    delay: 0.8,
    size: "medium",
  },
  {
    title: "Odontograma",
    subtitle: "Historia clínica",
    icon: Stethoscope,
    position: "top-[20%] right-[3%] lg:right-[8%]",
    delay: 1.4,
    size: "medium",
  },
  {
    title: "Tratamientos",
    subtitle: "Seguimiento y evolución",
    icon: HeartPulse,
    position: "top-[48%] left-[2%] lg:left-[6%]",
    delay: 0.5,
    size: "medium",
  },
  {
    title: "Reportes",
    subtitle: "Datos que impulsan",
    icon: BarChart3,
    position: "top-[52%] right-[2%] lg:right-[7%]",
    delay: 1.9,
    size: "medium",
  },
  {
    title: "Facturación",
    subtitle: "Ingresos y gastos",
    icon: ReceiptText,
    position: "bottom-[3%] left-[27%] lg:left-[30%]",
    delay: 1.1,
    size: "medium",
  },
];

const steps = [
  {
    title: "Registrá tu clínica",
    description: "Creá tu cuenta en pocos minutos.",
    icon: Building2,
  },
  {
    title: "Configurá tu equipo",
    description: "Agregá profesionales, usuarios y sucursales.",
    icon: Users,
  },
  {
    title: "Empezá a gestionar",
    description: "Administrá pacientes, turnos, tratamientos y mucho más.",
    icon: Rocket,
  },
];

const faqs = [
  {
    q: "¿Qué es Cloud Esther?",
    a: "Es una plataforma SaaS para centralizar la gestión diaria de clínicas odontológicas desde un solo lugar.",
  },
  {
    q: "¿Cloud Esther sirve para cualquier clínica?",
    a: "Sí. Funciona tanto para consultorios individuales como para clínicas con varias sucursales y equipos grandes.",
  },
  {
    q: "¿Puedo comenzar con un plan y agregar módulos después?",
    a: "Sí. Podés comenzar con el plan que necesitás y sumar módulos adicionales a medida que tu clínica crece.",
  },
  {
    q: "¿Puedo cambiar de plan?",
    a: "Podés subir o bajar de plan cuando lo necesites. Los módulos se activan al instante desde la administración.",
  },
  {
    q: "¿Puedo gestionar varias sucursales?",
    a: "Sí. Los planes superiores permiten administrar múltiples sucursales, equipos, agendas y reportes.",
  },
  {
    q: "¿Puedo agregar diferentes usuarios?",
    a: "Sí, con roles y permisos diferenciados para profesionales, recepción, administración y dirección.",
  },
  {
    q: "¿Puedo migrar la información de mi clínica?",
    a: "Acompañamos la migración de pacientes, historias clínicas y agenda dentro del proceso de implementación.",
  },
  {
    q: "¿Existe un período de prueba?",
    a: "Podés explorar una demo completa de la plataforma con datos de ejemplo antes de contratar.",
  },
  {
    q: "¿Necesito instalar algún programa?",
    a: "No. Cloud Esther funciona en la nube y podés acceder desde cualquier navegador.",
  },
  {
    q: "¿Mis datos están protegidos?",
    a: "Trabajamos con cifrado, control de accesos por rol y registros de auditoría de cada acción.",
  },
  {
    q: "¿Cloud Esther tiene inteligencia artificial?",
    a: "Esther IA te ayuda con resúmenes clínicos, sugerencias de agenda y análisis del rendimiento de la clínica.",
  },
];

/* =========================================================
   LOGO — DIENTE
========================================================= */
function ToothIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="12 12 40 42"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M23 14 C17.5 14 14 18 14 23.5 C14 28 15.6 31 17 35.5 C18.6 40.5 18.6 47 20.6 50 C22.2 52.4 25.2 51.6 26 48.4 C27 44.4 28.4 40.6 32 40.6 C35.6 40.6 37 44.4 38 48.4 C38.8 51.6 41.8 52.4 43.4 50 C45.4 47 45.4 40.5 47 35.5 C48.4 31 50 28 50 23.5 C50 18 46.5 14 41 14 C37.6 14 35 15.6 32 15.6 C29 15.6 26.4 14 23 14 Z"
      />
      <path
        d="M20 22 C20 19.6 21.6 18.4 23.6 18.4"
        stroke="#8B5CF6"
        strokeOpacity="0.35"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* =========================================================
   TÍTULO ANIMADO (por palabra, liviano)
========================================================= */
function AnimatedLine({
  text,
  delay,
  className = "text-foreground",
  shimmer = false,
}: {
  text: string;
  delay: number;
  className?: string;
  shimmer?: boolean;
}) {
  const words = text.split(" ");

  return (
    <span className="block overflow-hidden pb-[0.06em]">
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.55,
            delay: delay + index * 0.08,
            ease: EASE,
          }}
          style={
            shimmer ? { animationDelay: `${index * 0.45}s` } : undefined
          }
          className={`inline-block text-[3.8rem] font-bold leading-[0.92] tracking-[-0.055em] sm:text-6xl lg:text-[4.7rem] ${
            index < words.length - 1 ? "mr-[0.22em]" : ""
          } ${className}`}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}

/* =========================================================
   ANIMACIÓN DEL TÍTULO (CSS liviano, respeta reduced-motion)
========================================================= */
const TITLE_CSS = `
.ce-title-gradient {
  background-image: linear-gradient(110deg, #6d28d9 0%, #9333ea 30%, #d8b4fe 50%, #9333ea 70%, #6d28d9 100%);
  background-size: 250% 100%;
  background-position: 0% 50%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: ce-title-shimmer 5.5s ease-in-out infinite alternate;
}
@keyframes ce-title-shimmer {
  from { background-position: 0% 50%; }
  to { background-position: 100% 50%; }
}
.ce-bar-shine {
  animation: ce-bar-shine 3.4s ease-in-out infinite;
}
@keyframes ce-bar-shine {
  from { transform: translateX(-120%); }
  to { transform: translateX(380%); }
}
@media (prefers-reduced-motion: reduce) {
  .ce-title-gradient, .ce-bar-shine { animation: none; }
}
`;

/* =========================================================
   CONTADOR ANIMADO (arranca cuando aparece en pantalla)
========================================================= */
function CountUp({
  to,
  prefix = "",
  suffix = "",
  duration = 2,
  delay = 0.5,
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduceMotion = useReducedMotion();
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    if (!inView) return undefined;

    if (reduceMotion) {
      count.set(to);
      return undefined;
    }

    const controls = animate(count, to, {
      duration,
      delay,
      ease: "easeOut",
    });

    return () => controls.stop();
  }, [inView, reduceMotion, count, to, duration, delay]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}

/* =========================================================
   MÓDULO FLOTANTE
========================================================= */
function FloatingModule({ module }: { module: (typeof modules)[number] }) {
  const Icon = module.icon;

  const isLarge = module.size === "large";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: [0, -7, 0],
      }}
      transition={{
        opacity: { duration: 0.5, delay: 0.3 + module.delay * 0.3 },
        scale: { duration: 0.5, delay: 0.3 + module.delay * 0.3 },
        y: {
          duration: 5 + module.delay,
          repeat: Infinity,
          ease: "easeInOut",
        },
      }}
      className={`absolute ${module.position} z-20 ${
        isLarge ? "w-[132px] sm:w-[145px]" : "w-[116px] sm:w-[132px]"
      }`}
    >
      <div
        className={`relative overflow-hidden rounded-[20px] border border-white/80 bg-white/90 shadow-[0_18px_45px_rgba(88,28,135,0.14)] ${
          isLarge ? "p-3.5" : "p-3"
        }`}
      >
        <div
          className="pointer-events-none absolute -right-6 -top-6 size-16 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(124,58,237,0.22) 0%, transparent 70%)",
          }}
        />

        <div className="relative">
          <div
            className={`flex ${
              isLarge ? "size-10" : "size-9"
            } items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-purple-500/20 shadow-[0_6px_18px_rgba(124,58,237,0.12)]`}
          >
            <Icon
              className={`${isLarge ? "size-5" : "size-4.5"} text-primary`}
            />
          </div>

          <p
            className={`mt-2.5 ${
              isLarge ? "text-sm" : "text-xs sm:text-sm"
            } font-bold text-foreground`}
          >
            {module.title}
          </p>

          <p className="mt-0.5 truncate text-[9px] leading-4 text-muted-foreground sm:text-[10px]">
            {module.subtitle}
          </p>

          <motion.span
            animate={{
              opacity: [0.45, 1, 0.45],
              scale: [0.85, 1, 0.85],
            }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute right-0 top-0 size-1.5 rounded-full bg-emerald-400"
          />
        </div>
      </div>
    </motion.div>
  );
}

/* =========================================================
   PREGUNTA FRECUENTE (acordeón animado)
========================================================= */
function FaqItem({
  faq,
  index,
  open,
  onToggle,
}: {
  faq: (typeof faqs)[number];
  index: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="py-5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`faq-panel-${index}`}
        className="flex w-full items-center justify-between gap-5 rounded-md text-left text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        {faq.q}

        <span
          className={`flex size-7 shrink-0 items-center justify-center rounded-full bg-lavender text-primary transition-transform duration-300 ${
            open ? "rotate-45" : ""
          }`}
        >
          <span className="text-lg font-light leading-none">+</span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`faq-panel-${index}`}
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: EASE }}
            className="overflow-hidden"
          >
            <p className="mt-3 max-w-3xl pr-10 text-sm leading-relaxed text-muted-foreground">
              {faq.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <MotionConfig reducedMotion="user">
      <style>{TITLE_CSS}</style>

      <PublicLayout>
        {/* =========================================================
            HERO
        ========================================================= */}
        <section className="relative isolate min-h-[690px] overflow-hidden bg-soft lg:min-h-[720px]">
          {/* BACKGROUND GLOWS (estáticos, sin blur pesado) */}
          <div
            className="pointer-events-none absolute left-[48%] top-[-180px] size-[620px] -translate-x-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 68%)",
            }}
          />

          <div
            className="pointer-events-none absolute -left-40 bottom-[-180px] size-[420px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(192,132,252,0.16) 0%, transparent 70%)",
            }}
          />

          <div
            className="pointer-events-none absolute -right-40 top-[20%] size-[460px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(232,121,249,0.14) 0%, transparent 70%)",
            }}
          />

          <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 pb-14 pt-12 lg:min-h-[720px] lg:grid-cols-[0.92fr_1.08fr] lg:gap-3 lg:px-8 lg:pb-12 lg:pt-14">
            {/* =====================================================
                HERO COPY
            ===================================================== */}
            <div className="relative z-30 max-w-2xl">
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: EASE }}
                className="inline-flex"
              >
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-lavender px-4 py-1.5 text-xs font-semibold text-lavender-foreground shadow-[0_0_22px_rgba(124,58,237,0.12)]">
                  <motion.span
                    animate={{
                      scale: [0.8, 1.2, 0.8],
                      opacity: [0.45, 1, 0.45],
                    }}
                    transition={{
                      duration: 2.2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="size-1.5 rounded-full bg-primary"
                  />
                  Software SaaS para clínicas odontológicas
                </span>
              </motion.div>

              <div className="mt-7">
                <h1>
                  <AnimatedLine text="Gestiona tu" delay={0.1} />
                  <AnimatedLine text="clínica." delay={0.25} />
                  <AnimatedLine
                    text="Hazla crecer."
                    delay={0.4}
                    shimmer
                    className="ce-title-gradient"
                  />
                </h1>

                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "82%", opacity: 1 }}
                  transition={{
                    duration: 0.9,
                    delay: 0.8,
                    ease: EASE,
                  }}
                  className="relative mt-3 h-1 overflow-hidden rounded-full bg-gradient-to-r from-primary via-purple-400 to-fuchsia-300 shadow-[0_0_16px_rgba(168,85,247,0.35)]"
                >
                  <span className="ce-bar-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent" />
                </motion.div>
              </div>

              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.55, ease: EASE }}
                className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg"
              >
                La plataforma inteligente para administrar tu clínica, tus
                pacientes y todo tu equipo desde un solo lugar.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.65 }}
                className="mt-7 flex flex-col gap-3 sm:flex-row"
              >
                <div className="rounded-xl shadow-[0_10px_30px_rgba(124,58,237,0.22)]">
                  <Button asChild variant="hero" size="xl">
                    <Link to="/registro">
                      Probar demo
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </div>

                <Button asChild variant="outlineBrand" size="xl">
                  <Link to="/demostracion">Solicitar demostración</Link>
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.75 }}
                className="mt-8 flex items-center gap-5 sm:gap-7"
              >
                <div>
                  <p className="text-2xl font-bold text-primary">
                    <CountUp to={320} prefix="+" />
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Clínicas
                  </p>
                </div>

                <div className="h-9 w-px bg-border" />

                <div>
                  <p className="text-2xl font-bold text-primary">
                    <CountUp to={98} suffix="%" />
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Satisfacción
                  </p>
                </div>

                <div className="h-9 w-px bg-border" />

                <div>
                  <p className="text-2xl font-bold text-primary">
                    <CountUp to={24} />/<CountUp to={7} />
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    En la nube
                  </p>
                </div>
              </motion.div>
            </div>

            {/* =====================================================
                ECOSISTEMA 3D
            ===================================================== */}
            <div className="relative mx-auto h-[520px] w-full max-w-[650px] lg:h-[650px] lg:max-w-[700px]">
              {/* GLOW CENTRAL */}
              <motion.div
                animate={{
                  scale: [0.92, 1.08, 0.92],
                  opacity: [0.6, 1, 0.6],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="pointer-events-none absolute left-1/2 top-1/2 size-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full sm:size-[470px]"
                style={{
                  background:
                    "radial-gradient(circle, rgba(124,58,237,0.22) 0%, transparent 68%)",
                }}
              />

              {/* ÓRBITA EXTERIOR */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 32,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="absolute left-1/2 top-1/2 size-[430px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/10 sm:size-[520px] lg:size-[570px]"
              >
                <span className="absolute left-[8%] top-[15%] size-2 rounded-full bg-primary shadow-[0_0_14px_rgba(124,58,237,0.7)]" />

                <span className="absolute bottom-[12%] right-[13%] size-1.5 rounded-full bg-fuchsia-400 shadow-[0_0_14px_rgba(217,70,239,0.65)]" />
              </motion.div>

              {/* ÓRBITA INTERIOR */}
              <motion.div
                animate={{ rotate: -360 }}
                transition={{
                  duration: 23,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="absolute left-1/2 top-1/2 size-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/15 sm:size-[390px] lg:size-[430px]"
              >
                <span className="absolute left-1/2 top-[-3px] size-1.5 -translate-x-1/2 rounded-full bg-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.8)]" />
              </motion.div>

              {/* CONEXIONES */}
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-[330px] w-[330px] -translate-x-1/2 -translate-y-1/2 sm:h-[430px] sm:w-[430px]">
                <div className="absolute left-1/2 top-1/2 h-px w-full -translate-x-1/2 rotate-[22deg] bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-40" />

                <div className="absolute left-1/2 top-1/2 h-px w-full -translate-x-1/2 -rotate-[35deg] bg-gradient-to-r from-transparent via-purple-400/40 to-transparent opacity-35" />

                <div className="absolute left-1/2 top-1/2 h-px w-full -translate-x-1/2 rotate-[82deg] bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-40" />
              </div>

              {/* NÚCLEO CENTRAL */}
              <motion.div
                animate={{
                  y: [0, -5, 0],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2"
              >
                <motion.div
                  animate={{
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="absolute -inset-7 rounded-full border border-primary/15"
                />

                <motion.div
                  animate={{
                    rotate: [360, 0],
                  }}
                  transition={{
                    duration: 17,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="absolute -inset-4 rounded-full border border-purple-400/20"
                />

                <div className="relative flex size-[125px] items-center justify-center rounded-full border border-white/70 bg-gradient-to-br from-white via-purple-50 to-purple-100 shadow-[0_22px_65px_rgba(124,58,237,0.26),inset_0_0_35px_rgba(124,58,237,0.08)] sm:size-[150px]">
                  <div className="absolute inset-3 rounded-full border border-primary/10 bg-gradient-to-br from-primary/15 to-purple-500/10" />

                  <motion.div
                    animate={{
                      scale: [1, 1.05, 1],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="relative flex size-[76px] items-center justify-center rounded-full bg-gradient-to-br from-primary via-violet-600 to-fuchsia-500 shadow-[0_10px_35px_rgba(124,58,237,0.35)] sm:size-[90px]"
                  >
                    <ToothIcon className="size-9 text-white sm:size-11" />

                    <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/25 via-transparent to-transparent" />
                  </motion.div>
                </div>

                <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap text-center">
                  <span className="font-display text-sm font-bold text-foreground">
                    Cloud Esther
                  </span>
                </div>
              </motion.div>

              {/* MÓDULOS */}
              {modules.map((module) => (
                <FloatingModule key={module.title} module={module} />
              ))}

              {/* INDICADOR SUPERIOR */}
              <motion.div
                animate={{
                  y: [0, -6, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute right-[2%] top-[2%] z-30 hidden rounded-full border border-white/80 bg-white/90 px-3 py-1.5 text-[10px] font-semibold text-muted-foreground shadow-[0_10px_30px_rgba(88,28,135,0.1)] sm:flex"
              >
                <span className="mr-1.5 inline-block size-1.5 rounded-full bg-emerald-400" />
                Todo conectado
              </motion.div>
            </div>
          </div>
        </section>

        {/* =========================================================
            CÓMO FUNCIONA
        ========================================================= */}
        <section className="relative overflow-hidden border-y border-border/60 bg-soft">
          <div
            className="pointer-events-none absolute left-1/2 top-0 size-[520px] -translate-x-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 68%)",
            }}
          />

          <div className="relative mx-auto max-w-6xl px-5 py-20 lg:px-8">
            <Reveal className="mx-auto max-w-2xl text-center">
              <span className="inline-flex rounded-full border border-primary/15 bg-lavender px-3.5 py-1.5 text-xs font-semibold text-lavender-foreground">
                Cómo funciona
              </span>

              <h2 className="mt-5 text-3xl font-bold tracking-tight lg:text-4xl">
                Simplificá la gestión de tu clínica.
              </h2>

              <p className="mt-4 text-muted-foreground">
                Empezá rápido y llevá toda la operación a un solo lugar.
              </p>
            </Reveal>

            <div className="relative mt-14">
              {/* LÍNEA CONECTORA (desktop) */}
              <div className="pointer-events-none absolute left-[16.66%] right-[16.66%] top-8 hidden h-0.5 md:block">
                <div className="absolute inset-0 rounded-full bg-primary/15" />

                <motion.div
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 1.3, delay: 0.3, ease: EASE }}
                  style={{ originX: 0 }}
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-primary via-purple-400 to-fuchsia-400"
                />
              </div>

              <div className="grid gap-10 md:grid-cols-3">
                {steps.map((step, index) => {
                  const StepIcon = step.icon;

                  return (
                    <Reveal key={step.title} delay={index * 0.12}>
                      <div className="relative flex items-start gap-5 md:flex-col md:items-center md:gap-0 md:text-center">
                        {/* LÍNEA CONECTORA (mobile) */}
                        {index < steps.length - 1 && (
                          <span className="pointer-events-none absolute left-[31px] top-[68px] h-[calc(100%-32px)] w-0.5 rounded-full bg-primary/20 md:hidden" />
                        )}

                        <div className="relative z-10 shrink-0">
                          <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-fuchsia-500 text-white shadow-[0_14px_34px_rgba(124,58,237,0.32)]">
                            <StepIcon className="size-7" />

                            <span className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/25 via-transparent to-transparent" />
                          </div>

                          <span className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full border border-primary/15 bg-white text-xs font-bold text-primary shadow-sm">
                            {index + 1}
                          </span>
                        </div>

                        <div className="md:mt-6">
                          <h3 className="text-lg font-bold">{step.title}</h3>

                          <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground md:mx-auto">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            FAQ
        ========================================================= */}
        <section className="mx-auto max-w-5xl px-5 py-20 lg:px-8">
          <Reveal className="text-center">
            <span className="inline-flex rounded-full border border-primary/15 bg-lavender px-3.5 py-1.5 text-xs font-semibold text-lavender-foreground">
              Preguntas frecuentes
            </span>

            <h2 className="mt-5 text-3xl font-bold tracking-tight lg:text-4xl">
              Todo claro desde el comienzo.
            </h2>
          </Reveal>

          <div className="mt-10 divide-y divide-border rounded-3xl border border-border/70 bg-card px-6 shadow-[0_15px_45px_rgba(88,28,135,0.06)]">
            {faqs.map((faq, index) => (
              <Reveal key={faq.q} delay={index * 0.03}>
                <FaqItem
                  faq={faq}
                  index={index}
                  open={openFaq === index}
                  onToggle={() =>
                    setOpenFaq(openFaq === index ? null : index)
                  }
                />
              </Reveal>
            ))}
          </div>
        </section>

        {/* =========================================================
            CTA FINAL
        ========================================================= */}
        <section className="px-5 pb-16 lg:px-8 lg:pb-20">
          <Reveal>
            <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#5520a0] via-[#7c3aed] to-[#b56bea] px-6 py-12 text-center shadow-[0_25px_70px_rgba(88,28,135,0.22)] sm:px-10 lg:py-14">
              <div
                className="pointer-events-none absolute -left-32 -top-32 size-[380px] rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)",
                }}
              />

              <div
                className="pointer-events-none absolute -bottom-32 -right-32 size-[400px] rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%)",
                }}
              />

              <div className="relative">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white/10 text-white">
                  <ShieldCheck className="size-5" />
                </div>

                <h2 className="mx-auto mt-5 max-w-3xl text-3xl font-bold tracking-tight text-white lg:text-4xl">
                  Empezá a gestionar tu clínica con Cloud Esther
                </h2>

                <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/75 lg:text-base">
                  Explorá la plataforma con datos de ejemplo o coordiná una
                  demostración personalizada.
                </p>

                <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                  <Button
                    asChild
                    size="xl"
                    className="rounded-xl bg-white text-primary shadow-lg shadow-black/10 hover:bg-white/90"
                  >
                    <Link to="/registro">
                      Probar demo
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>

                  <Button
                    asChild
                    size="xl"
                    variant="outline"
                    className="rounded-xl border-white/35 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                  >
                    <Link to="/demostracion">Solicitar demostración</Link>
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </PublicLayout>
    </MotionConfig>
  );
}