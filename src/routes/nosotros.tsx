import { Fragment, useEffect, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  animate,
  motion,
  MotionConfig,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import {
  Target,
  Eye,
  Feather,
  Blocks,
  TrendingUp,
  ShieldCheck,
  BriefcaseBusiness,
  ArrowRight,
  Building2,
  CalendarCheck,
  ThumbsUp,
  Clock,
  Sparkles,
  Rocket,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/site/PublicLayout";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/site/Reveal";

export const Route = createFileRoute("/nosotros")({
  head: () => ({
    meta: [
      { title: "Nosotros | Cloud Esther" },
      {
        name: "description",
        content:
          "Conocé la misión y la visión de Cloud Esther: tecnología para clínicas odontológicas que quieren crecer.",
      },
      { property: "og:title", content: "Nosotros — Cloud Esther" },
      {
        property: "og:description",
        content: "Tecnología para clínicas que quieren crecer.",
      },
    ],
  }),
  component: Nosotros,
});

const EASE = [0.22, 1, 0.36, 1] as const;

const values = [
  {
    icon: Feather,
    title: "Simple",
    desc: "Una interfaz clara que el equipo aprende en un día.",
  },
  {
    icon: Blocks,
    title: "Modular",
    desc: "Activá solo los módulos que tu clínica necesita.",
  },
  {
    icon: TrendingUp,
    title: "Escalable",
    desc: "De un consultorio a un grupo con varias sedes.",
  },
  {
    icon: ShieldCheck,
    title: "Seguro",
    desc: "Permisos por rol, cifrado y auditoría de accesos.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Profesional",
    desc: "Pensado junto a odontólogos y equipos de gestión.",
  },
];

type Stat = {
  icon: typeof Building2;
  to: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** Porcentaje al que llega la barra de progreso (0 a 100) */
  fill: number;
  v: string;
};

const stats: Stat[] = [
  {
    icon: Building2,
    to: 320,
    prefix: "+",
    fill: 86,
    v: "clínicas usando Cloud Esther",
  },
  {
    icon: CalendarCheck,
    to: 1.2,
    decimals: 1,
    suffix: "M",
    fill: 72,
    v: "turnos gestionados",
  },
  {
    icon: ThumbsUp,
    to: 98,
    suffix: "%",
    fill: 98,
    v: "satisfacción del equipo",
  },
  {
    icon: Clock,
    to: 24,
    suffix: "/7",
    fill: 100,
    v: "disponibilidad en la nube",
  },
];

/* Historia de Cloud Esther, contada por etapas (sin fechas ni logros inventados). */
const HISTORIA = [
  {
    icon: Target,
    etapa: "El punto de partida",
    texto:
      "Nace de una necesidad real: la gestión diaria de una clínica odontológica. Quienes la viven de cerca sabían qué faltaba, y quisimos resolverlo con tecnología.",
  },
  {
    icon: Blocks,
    etapa: "Construcción",
    texto:
      "Desarrollamos una plataforma modular: pacientes, agenda, odontograma, tratamientos, facturación y reportes, en un solo lugar y en la nube.",
  },
  {
    icon: Sparkles,
    etapa: "Esther Infinity",
    texto:
      "Sumamos inteligencia artificial que asiste al profesional: resúmenes clínicos, sugerencias de agenda y lectura del rendimiento de la clínica.",
  },
  {
    icon: Rocket,
    etapa: "Hoy",
    texto:
      "Una plataforma integral, modular y segura, pensada para crecer con cada clínica, del consultorio individual al grupo con varias sedes.",
  },
];

/* Equipo. Perfiles redactados sin inventar títulos, empresas, años ni logros extra. */
const EQUIPO = [
  {
    iniciales: "MB",
    nombre: "Mireya Becerra Méndez",
    rol: "Asistente e higienista dental",
    bio: "Más de 30 años de experiencia en el ámbito odontológico. Su trayectoria y el contacto con distintas especialidades le permiten conocer las necesidades reales de las clínicas y de los profesionales.",
  },
  {
    iniciales: "MP",
    nombre: "Mauro Pinto",
    rol: "CEO",
    bio: "Licenciado en Comunicación Audiovisual y programador full stack, con especialización y enfoque en inteligencia artificial. Impulsa la visión del producto, la experiencia digital y el desarrollo de soluciones tecnológicas para el sector odontológico.",
  },
  {
    iniciales: "AB",
    nombre: "Alejandro Becerra Méndez Tobar",
    rol: "Tecnólogo en ingeniería electrónica · Especialista en IA",
    bio: "Aporta el perfil técnico y la mirada de innovación: desarrollo tecnológico e integración de soluciones inteligentes dentro de Cloud Esther.",
  },
];

/* ---------------------------------------------------------------
   Duración (en segundos) del ciclo del haz de luz de "Lo que nos
   define". Los círculos se iluminan justo cuando el haz pasa por
   arriba de cada uno.
---------------------------------------------------------------- */
const BEAM_CYCLE = 7;
const BEAM_WIDTH = 18; // % del ancho del contenedor (w-[18%])

/* Partículas flotantes de fondo en Misión / Visión */
const MV_PARTICLES = [
  { left: "8%", top: "22%", size: 6, delay: 0, duration: 7 },
  { left: "18%", top: "72%", size: 4, delay: 1.4, duration: 8 },
  { left: "31%", top: "34%", size: 5, delay: 2.8, duration: 6.5 },
  { left: "44%", top: "82%", size: 4, delay: 0.7, duration: 7.5 },
  { left: "57%", top: "14%", size: 5, delay: 3.6, duration: 8 },
  { left: "69%", top: "66%", size: 6, delay: 2.1, duration: 7 },
  { left: "81%", top: "28%", size: 4, delay: 4.2, duration: 6.5 },
  { left: "92%", top: "78%", size: 5, delay: 1.1, duration: 8 },
];

/* ---------------------------------------------------------------
   Texto animado letra por letra.
   - Agrupa por palabras para que nunca se corte una palabra a la
     mitad en pantallas chicas.
---------------------------------------------------------------- */
function AnimatedChars({
  text,
  delay = 0,
  stagger = 0.03,
}: {
  text: string;
  delay?: number;
  stagger?: number;
}) {
  const words = text.split(" ");
  let n = 0;

  return (
    <>
      {words.map((word, wi) => (
        <Fragment key={`${word}-${wi}`}>
          <span className="inline-block whitespace-nowrap">
            {Array.from(word).map((char) => {
              const i = n++;
              return (
                <motion.span
                  key={i}
                  initial={{
                    opacity: 0,
                    y: 34,
                    rotateX: -80,
                    filter: "blur(6px)",
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    rotateX: 0,
                    filter: "blur(0px)",
                  }}
                  transition={{
                    duration: 0.8,
                    delay: delay + i * stagger,
                    ease: EASE,
                  }}
                  style={{ transformOrigin: "50% 100%" }}
                  className="inline-block"
                >
                  {char}
                </motion.span>
              );
            })}
          </span>
          {wi < words.length - 1 && " "}
        </Fragment>
      ))}
    </>
  );
}

/* ---------------------------------------------------------------
   Título de Misión / Visión.
   - Cada palabra entra con rotación y desenfoque cuando aparece en
     pantalla.
   - Desde "highlightFrom" las palabras llevan un degradé violeta
     que se mueve en loop infinito.
---------------------------------------------------------------- */
function AnimatedTitle({
  text,
  highlightFrom,
  delay = 0,
  className = "",
}: {
  text: string;
  highlightFrom: number;
  delay?: number;
  className?: string;
}) {
  const words = text.split(" ");

  return (
    <h2
      className={`mt-7 text-3xl font-bold tracking-tight lg:text-4xl ${className}`}
    >
      <span className="sr-only">{text}</span>

      <span aria-hidden="true" className="block [perspective:800px]">
        {words.map((word, i) => {
          const highlighted = i >= highlightFrom;

          return (
            <Fragment key={`${word}-${i}`}>
              <motion.span
                initial={{
                  opacity: 0,
                  y: 30,
                  rotateX: -60,
                  filter: "blur(8px)",
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                  rotateX: 0,
                  filter: "blur(0px)",
                }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.7,
                  delay: delay + i * 0.1,
                  ease: EASE,
                }}
                style={{ transformOrigin: "50% 100%" }}
                className="inline-block"
              >
                {highlighted ? (
                  <motion.span
                    animate={{
                      backgroundPosition: ["0% center", "200% center"],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="inline-block bg-[linear-gradient(90deg,var(--color-primary),var(--color-primary-glow),var(--color-primary))] bg-[length:200%_auto] bg-clip-text text-transparent [-webkit-text-fill-color:transparent]"
                  >
                    {word}
                  </motion.span>
                ) : (
                  word
                )}
              </motion.span>
              {i < words.length - 1 && " "}
            </Fragment>
          );
        })}
      </span>
    </h2>
  );
}

/* ---------------------------------------------------------------
   Ícono circular con ondas de pulso.
---------------------------------------------------------------- */
function PulseIcon({
  icon: Icon,
  delay = 0,
}: {
  icon: typeof Target;
  delay?: number;
}) {
  return (
    <div className="relative size-12 shrink-0">
      <motion.span
        aria-hidden="true"
        animate={{ scale: [1, 2.1], opacity: [0.5, 0] }}
        transition={{
          duration: 3,
          delay,
          repeat: Infinity,
          ease: "easeOut",
        }}
        className="pointer-events-none absolute inset-0 rounded-full border border-primary/40"
      />
      <motion.span
        aria-hidden="true"
        animate={{ scale: [1, 2.1], opacity: [0.5, 0] }}
        transition={{
          duration: 3,
          delay: delay + 1.5,
          repeat: Infinity,
          ease: "easeOut",
        }}
        className="pointer-events-none absolute inset-0 rounded-full border border-primary/40"
      />

      <motion.span
        animate={{
          boxShadow: [
            "0 0 0 rgba(124,58,237,0)",
            "0 0 28px rgba(124,58,237,0.38)",
            "0 0 0 rgba(124,58,237,0)",
          ],
        }}
        transition={{
          duration: 4,
          delay,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-700 text-white"
      >
        <motion.span
          animate={{ rotate: [-8, 8, -8], scale: [1, 1.08, 1] }}
          transition={{
            duration: 5,
            delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="inline-flex"
        >
          <Icon className="size-5" />
        </motion.span>

        <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/25 via-transparent to-transparent" />
      </motion.span>
    </div>
  );
}

/* ---------------------------------------------------------------
   Conexión central entre Misión y Visión.
---------------------------------------------------------------- */
function CenterLink() {
  return (
    <div className="relative mx-auto hidden h-56 w-10 lg:block">
      {/* Línea */}
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-primary/30 to-transparent" />

      {/* Punto de luz que viaja de arriba hacia abajo */}
      <motion.span
        animate={{ y: ["-10%", "1080%"], opacity: [0, 1, 1, 0] }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute left-1/2 top-0 size-2 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_16px_rgba(124,58,237,0.85)]"
      />

      {/* Nodo central */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <motion.span
          aria-hidden="true"
          animate={{ scale: [1, 2.6], opacity: [0.5, 0] }}
          transition={{
            duration: 3.2,
            repeat: Infinity,
            ease: "easeOut",
          }}
          className="pointer-events-none absolute inset-0 rounded-full border border-primary/40"
        />

        <motion.span
          animate={{ rotate: 360 }}
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: "linear",
          }}
          className="relative flex size-9 items-center justify-center rounded-full border border-dashed border-primary/35 bg-card shadow-[0_8px_24px_rgba(124,58,237,0.15)]"
        >
          <span className="size-2.5 rounded-full bg-gradient-to-br from-primary to-fuchsia-500" />
        </motion.span>
      </div>

      {/* Nodos en los extremos */}
      <motion.span
        animate={{ opacity: [0.4, 1, 0.4], scale: [0.85, 1.15, 0.85] }}
        transition={{
          duration: 2.4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute left-1/2 top-0 size-2 -translate-x-1/2 rounded-full bg-primary/60"
      />
      <motion.span
        animate={{ opacity: [0.4, 1, 0.4], scale: [0.85, 1.15, 0.85] }}
        transition={{
          duration: 2.4,
          delay: 1.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute bottom-0 left-1/2 size-2 -translate-x-1/2 rounded-full bg-primary/60"
      />
    </div>
  );
}

/* ---------------------------------------------------------------
   Tarjeta de número con contador.
   - Cada vez que la tarjeta entra en pantalla, cuenta desde 0 hasta
     el valor final y llena la barra de progreso.
   - Si salís de la pantalla y volvés (subís y bajás el scroll),
     vuelve a arrancar desde cero.
---------------------------------------------------------------- */
function StatCard({ stat, index }: { stat: Stat; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-80px" });
  const reduceMotion = useReducedMotion();

  const { to, decimals = 0, prefix = "", suffix = "", fill } = stat;
  const Icon = stat.icon;

  const value = useMotionValue(0);
  const text = useTransform(
    value,
    (v) => `${prefix}${v.toFixed(decimals)}${suffix}`,
  );
  const barWidth = useTransform(value, (v) => `${(v / to) * fill}%`);

  useEffect(() => {
    if (!inView) {
      value.set(0);
      return undefined;
    }

    if (reduceMotion) {
      value.set(to);
      return undefined;
    }

    value.set(0);

    const controls = animate(value, to, {
      duration: 2.2,
      delay: 0.15 + index * 0.12,
      ease: [0.16, 1, 0.3, 1],
    });

    return () => controls.stop();
  }, [inView, reduceMotion, to, index, value]);

  return (
    <div
      ref={ref}
      className="group relative h-full overflow-hidden rounded-3xl border border-border/70 bg-card p-7 shadow-[0_12px_40px_rgba(88,28,135,0.06)] transition-all duration-500 hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-[0_24px_60px_rgba(124,58,237,0.16)]"
    >
      {/* Línea de color superior (se dibuja al pasar el mouse) */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-primary via-violet-500 to-fuchsia-400 transition-transform duration-500 group-hover:scale-x-100" />

      {/* Mancha de luz decorativa */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full opacity-70 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(circle, rgba(124,58,237,0.16) 0%, transparent 70%)",
        }}
      />

      {/* Brillo que cruza la tarjeta al pasar el mouse */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary/10 to-transparent transition-transform duration-1000 ease-out group-hover:translate-x-full"
      />

      <div className="relative">
        {/* Ícono */}
        <motion.span
          animate={{ y: [0, -4, 0] }}
          transition={{
            duration: 4,
            delay: index * 0.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="relative flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-fuchsia-500 text-white shadow-[0_10px_26px_rgba(124,58,237,0.32)]"
        >
          <Icon className="size-5" />

          <span className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/25 via-transparent to-transparent" />
        </motion.span>

        {/* Número */}
        <p className="text-gradient mt-6 font-display text-5xl font-bold tabular-nums tracking-tight">
          <motion.span>{text}</motion.span>
        </p>

        {/* Descripción */}
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {stat.v}
        </p>

        {/* Barra de progreso que se llena mientras cuenta */}
        <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-primary/10">
          <motion.div
            style={{ width: barWidth }}
            className="h-full rounded-full bg-gradient-to-r from-primary via-violet-500 to-fuchsia-400 shadow-[0_0_12px_rgba(124,58,237,0.45)]"
          />
        </div>
      </div>
    </div>
  );
}

function Nosotros() {
  return (
    <PublicLayout>
      <MotionConfig reducedMotion="user">
        {/* =========================================================
            HERO
        ========================================================= */}
        <section className="relative isolate overflow-hidden bg-soft">
          {/* GLOW AMBIENTAL */}
          <motion.div
            animate={{
              x: [-80, 80, -80],
              y: [0, 35, 0],
              scale: [1, 1.12, 1],
              opacity: [0.12, 0.25, 0.12],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="pointer-events-none absolute -left-40 -top-40 size-[520px] rounded-full bg-violet-300/20 blur-[120px]"
          />

          <motion.div
            animate={{
              x: [80, -70, 80],
              y: [0, -30, 0],
              scale: [1, 1.08, 1],
              opacity: [0.08, 0.2, 0.08],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="pointer-events-none absolute -right-40 bottom-[-180px] size-[560px] rounded-full bg-fuchsia-300/15 blur-[120px]"
          />

          <div className="relative mx-auto max-w-5xl px-5 pb-14 pt-12 text-center lg:px-8 lg:pb-16 lg:pt-16">
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.6,
                ease: EASE,
              }}
              className="inline-flex"
            >
              <span className="rounded-full border border-primary/15 bg-lavender px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-lavender-foreground">
                Nosotros
              </span>
            </motion.div>

            {/* Un solo <h1> (mejor para SEO y accesibilidad). El texto
                animado es solo visual; los lectores de pantalla leen
                la frase completa desde el sr-only. */}
            <h1 className="mt-6 text-4xl font-bold leading-[1.04] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
              <span className="sr-only">
                Tecnología para clínicas que quieren crecer.
              </span>

              <span
                aria-hidden="true"
                className="block [perspective:800px]"
              >
                <AnimatedChars
                  text="Tecnología para clínicas"
                  delay={0.1}
                  stagger={0.026}
                />
              </span>

              <span
                aria-hidden="true"
                className="mt-1 block [perspective:800px]"
              >
                <span className="text-gradient">
                  <AnimatedChars
                    text="que quieren crecer."
                    delay={0.75}
                    stagger={0.038}
                  />
                </span>
              </span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.7,
                delay: 1.35,
                ease: EASE,
              }}
              className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground lg:text-lg"
            >
              Construimos Cloud Esther junto a profesionales que viven la
              gestión diaria de una clínica odontológica.
            </motion.p>

            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 64, opacity: 1 }}
              transition={{
                duration: 0.8,
                delay: 1.6,
                ease: EASE,
              }}
              className="mx-auto mt-7 h-0.5 rounded-full bg-primary/50"
            />
          </div>
        </section>

        {/* =========================================================
            MISIÓN + VISIÓN — SIN CARDS
        ========================================================= */}
        <section className="relative overflow-hidden bg-background">
          {/* Glow central que respira */}
          <motion.div
            animate={{
              opacity: [0.05, 0.13, 0.05],
              scale: [0.95, 1.08, 0.95],
            }}
            transition={{
              duration: 9,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="pointer-events-none absolute left-1/2 top-1/2 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]"
          />

          {/* Órbitas giratorias de fondo */}
          <motion.div
            aria-hidden="true"
            animate={{ rotate: 360 }}
            transition={{
              duration: 60,
              repeat: Infinity,
              ease: "linear",
            }}
            className="pointer-events-none absolute left-1/2 top-1/2 hidden size-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-primary/10 lg:block"
          >
            <span className="absolute left-[10%] top-[16%] size-2 rounded-full bg-primary/50 shadow-[0_0_14px_rgba(124,58,237,0.6)]" />
            <span className="absolute bottom-[14%] right-[8%] size-1.5 rounded-full bg-fuchsia-400/60 shadow-[0_0_12px_rgba(217,70,239,0.6)]" />
          </motion.div>

          <motion.div
            aria-hidden="true"
            animate={{ rotate: -360 }}
            transition={{
              duration: 42,
              repeat: Infinity,
              ease: "linear",
            }}
            className="pointer-events-none absolute left-1/2 top-1/2 hidden size-[430px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/10 lg:block"
          >
            <span className="absolute left-1/2 top-[-3px] size-1.5 -translate-x-1/2 rounded-full bg-violet-400/70 shadow-[0_0_12px_rgba(139,92,246,0.7)]" />
          </motion.div>

          {/* Partículas flotantes */}
          {MV_PARTICLES.map((p, index) => (
            <motion.span
              key={index}
              aria-hidden="true"
              animate={{
                y: [0, -34, 0],
                opacity: [0, 0.8, 0],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="pointer-events-none absolute rounded-full bg-primary/60 shadow-[0_0_12px_rgba(124,58,237,0.55)]"
              style={{
                left: p.left,
                top: p.top,
                width: p.size,
                height: p.size,
              }}
            />
          ))}

          <div className="relative mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-24">
            <div className="grid gap-16 lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-10">
              {/* MISIÓN */}
              <Reveal>
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 22,
                  }}
                  className="relative"
                >
                  {/* Ícono de fondo gigante, apenas visible */}
                  <motion.div
                    aria-hidden="true"
                    animate={{ y: [0, -12, 0], rotate: [0, 6, 0] }}
                    transition={{
                      duration: 9,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="pointer-events-none absolute -left-10 -top-14 text-primary/[0.05]"
                  >
                    <Target className="size-56" strokeWidth={1} />
                  </motion.div>

                  <div className="relative">
                    <div className="flex items-center gap-4">
                      <PulseIcon icon={Target} />

                      <motion.span
                        initial={{ opacity: 0, x: -14 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-60px" }}
                        transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
                        className="text-xs font-bold uppercase tracking-[0.18em] text-primary"
                      >
                        Nuestra misión
                      </motion.span>
                    </div>

                    <AnimatedTitle
                      text="Hacer simple lo complejo."
                      highlightFrom={3}
                      delay={0.2}
                    />

                    <motion.p
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-60px" }}
                      transition={{ duration: 0.7, delay: 0.7, ease: EASE }}
                      className="mt-5 max-w-lg text-base leading-7 text-muted-foreground"
                    >
                      Ayudar a las clínicas a centralizar su gestión y
                      trabajar de manera más eficiente.
                    </motion.p>

                    <div className="relative mt-7 h-px w-full max-w-[280px] overflow-hidden rounded-full bg-primary/10">
                      <motion.span
                        animate={{ x: ["-100%", "260%"] }}
                        transition={{
                          duration: 3.6,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        className="absolute inset-y-0 left-0 w-2/5 bg-gradient-to-r from-transparent via-primary to-transparent"
                      />
                    </div>
                  </div>
                </motion.div>
              </Reveal>

              {/* CONEXIÓN CENTRAL */}
              <CenterLink />

              {/* VISIÓN */}
              <Reveal delay={0.12}>
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 22,
                  }}
                  className="relative lg:text-right"
                >
                  {/* Ícono de fondo gigante, apenas visible */}
                  <motion.div
                    aria-hidden="true"
                    animate={{ y: [0, 12, 0], rotate: [0, -6, 0] }}
                    transition={{
                      duration: 10,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="pointer-events-none absolute -right-10 -top-14 text-primary/[0.05]"
                  >
                    <Eye className="size-56" strokeWidth={1} />
                  </motion.div>

                  <div className="relative">
                    <div className="flex items-center gap-4 lg:justify-end">
                      <motion.span
                        initial={{ opacity: 0, x: 14 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-60px" }}
                        transition={{ duration: 0.6, delay: 0.3, ease: EASE }}
                        className="text-xs font-bold uppercase tracking-[0.18em] text-primary"
                      >
                        Nuestra visión
                      </motion.span>

                      <PulseIcon icon={Eye} delay={1.2} />
                    </div>

                    <AnimatedTitle
                      text="Una nueva forma de gestionar."
                      highlightFrom={4}
                      delay={0.35}
                    />

                    <motion.p
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-60px" }}
                      transition={{ duration: 0.7, delay: 0.9, ease: EASE }}
                      className="mt-5 max-w-lg text-base leading-7 text-muted-foreground lg:ml-auto"
                    >
                      Construir una plataforma integral para la gestión
                      moderna de clínicas odontológicas.
                    </motion.p>

                    <div className="relative mt-7 h-px w-full max-w-[280px] overflow-hidden rounded-full bg-primary/10 lg:ml-auto">
                      <motion.span
                        animate={{ x: ["260%", "-100%"] }}
                        transition={{
                          duration: 3.6,
                          delay: 1.2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        className="absolute inset-y-0 left-0 w-2/5 bg-gradient-to-r from-transparent via-primary to-transparent"
                      />
                    </div>
                  </div>
                </motion.div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* =========================================================
            VALORES — RECORRIDO SIN CARDS
        ========================================================= */}
        <section className="relative overflow-hidden border-y border-border/60 bg-soft">
          {/* Haz de luz superior: ahora recorre todo el ancho */}
          <motion.div
            animate={{
              x: ["-100%", "333%"],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: "linear",
            }}
            className="pointer-events-none absolute top-0 h-px w-[30%] bg-gradient-to-r from-transparent via-primary/40 to-transparent"
          />

          <div className="relative mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
            <Reveal className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                Nuestra forma de trabajar
              </span>

              <h2 className="mt-4 text-3xl font-bold tracking-tight lg:text-4xl">
                Lo que nos define.
              </h2>

              <p className="mt-4 text-muted-foreground">
                Principios que están presentes en cada parte de Cloud Esther.
              </p>
            </Reveal>

            <div className="relative mx-auto mt-16 max-w-6xl">
              {/* LÍNEA CENTRAL — se dibuja al entrar en pantalla */}
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 1.3, ease: EASE }}
                className="absolute left-0 right-0 top-8 hidden h-px origin-left bg-border lg:block"
              />

              {/* HAZ DE LUZ — recorre la línea completa, alineado con ella */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                animate={{
                  x: ["-100%", `${(100 / BEAM_WIDTH) * 100 + 5}%`],
                }}
                transition={{
                  x: {
                    duration: BEAM_CYCLE,
                    repeat: Infinity,
                    ease: "linear",
                  },
                  opacity: { duration: 0.6, delay: 1 },
                }}
                style={{ width: `${BEAM_WIDTH}%` }}
                className="absolute left-0 top-[31px] hidden h-[3px] rounded-full bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_16px_rgba(124,58,237,0.55)] lg:block"
              />

              <StaggerGroup className="grid gap-12 sm:grid-cols-2 lg:grid-cols-5 lg:gap-5">
                {values.map((value, index) => {
                  const Icon = value.icon;

                  // Momento del ciclo (0 a 1) en que el haz pasa por este círculo
                  const centerPct = ((index + 0.5) * 100) / values.length;
                  const total = 100 + BEAM_WIDTH;
                  const hit = (centerPct + BEAM_WIDTH / 2) / total;

                  return (
                    <StaggerItem key={value.title}>
                      <motion.div
                        whileHover={{ y: -6 }}
                        transition={{
                          type: "spring",
                          stiffness: 260,
                          damping: 20,
                        }}
                        className="group relative text-center"
                      >
                        <motion.div
                          animate={{
                            scale: [1, 1, 1.14, 1, 1],
                            boxShadow: [
                              "0 0 0 rgba(124,58,237,0)",
                              "0 0 0 rgba(124,58,237,0)",
                              "0 0 28px rgba(124,58,237,0.35)",
                              "0 0 0 rgba(124,58,237,0)",
                              "0 0 0 rgba(124,58,237,0)",
                            ],
                          }}
                          transition={{
                            duration: BEAM_CYCLE,
                            repeat: Infinity,
                            ease: "easeInOut",
                            times: [
                              0,
                              Math.max(hit - 0.08, 0.01),
                              hit,
                              Math.min(hit + 0.12, 0.99),
                              1,
                            ],
                          }}
                          className="relative z-10 mx-auto flex size-16 items-center justify-center rounded-full border border-primary/15 bg-card"
                        >
                          <span className="flex size-10 items-center justify-center rounded-xl bg-lavender transition-transform duration-500 ease-out group-hover:-rotate-6 group-hover:scale-110">
                            <Icon className="size-5 text-primary" />
                          </span>
                        </motion.div>

                        <h3 className="mt-5 text-base font-semibold">
                          {value.title}
                        </h3>

                        <p className="mx-auto mt-2 max-w-[190px] text-sm leading-6 text-muted-foreground">
                          {value.desc}
                        </p>
                      </motion.div>
                    </StaggerItem>
                  );
                })}
              </StaggerGroup>
            </div>
          </div>
        </section>

        {/* =========================================================
            HISTORIA — LÍNEA DE TIEMPO
        ========================================================= */}
        <section className="relative overflow-hidden bg-background">
          <div className="relative mx-auto max-w-4xl px-5 py-20 lg:px-8 lg:py-24">
            <Reveal className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                Nuestra historia
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight lg:text-4xl">
                Cómo nació Cloud Esther.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Una idea que creció desde la clínica hacia la tecnología.
              </p>
            </Reveal>

            <div className="relative mt-14">
              {/* Línea vertical que se dibuja al entrar en pantalla */}
              <motion.span
                aria-hidden="true"
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 1.2, ease: EASE }}
                className="absolute left-6 top-2 h-[calc(100%-1rem)] w-px origin-top bg-gradient-to-b from-primary/50 via-primary/25 to-transparent sm:left-8"
              />

              <div className="space-y-8">
                {HISTORIA.map((h, i) => {
                  const Icon = h.icon;
                  return (
                    <Reveal key={h.etapa} delay={i * 0.08}>
                      <div className="relative flex items-start gap-5 pl-0 sm:gap-6">
                        <motion.span
                          whileInView={{ scale: [0.8, 1.1, 1] }}
                          viewport={{ once: true, margin: "-80px" }}
                          transition={{ duration: 0.6, ease: EASE }}
                          className="relative z-10 grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-fuchsia-500 text-white shadow-[0_10px_26px_rgba(124,58,237,0.32)] sm:size-16"
                        >
                          <Icon className="size-5 sm:size-6" />
                        </motion.span>
                        <div className="flex-1 rounded-2xl border border-border/70 bg-card p-5 shadow-[0_12px_40px_rgba(88,28,135,0.05)] transition-all duration-300 hover:border-primary/25 hover:shadow-[0_18px_50px_rgba(124,58,237,0.12)]">
                          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
                            {h.etapa}
                          </p>
                          <p className="mt-1.5 text-sm leading-7 text-foreground/85">{h.texto}</p>
                        </div>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            </div>

            {/* ORIGEN — Buenos Aires */}
            <Reveal className="mt-14">
              <div className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-lavender/60 via-card to-card p-6 text-center lg:p-8">
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3.5 py-1.5 text-xs font-semibold text-primary">
                  <MapPin className="size-3.5" />
                  Buenos Aires, Argentina
                </span>
                <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-foreground/85">
                  Cloud Esther es una empresa desarrollada en Buenos Aires, Argentina, enfocada en
                  tecnología para la gestión odontológica.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* =========================================================
            EQUIPO
        ========================================================= */}
        <section className="relative overflow-hidden border-y border-border/60 bg-soft">
          <div className="relative mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-24">
            <Reveal className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                Nuestro equipo
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight lg:text-4xl">
                Las personas detrás de Cloud Esther.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Experiencia clínica, visión de producto e innovación tecnológica.
              </p>
            </Reveal>

            <StaggerGroup className="mt-14 grid gap-6 md:grid-cols-3">
              {EQUIPO.map((p) => (
                <StaggerItem key={p.nombre}>
                  <div className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border/70 bg-card p-7 shadow-[0_12px_40px_rgba(88,28,135,0.06)] transition-all duration-500 hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-[0_24px_60px_rgba(124,58,237,0.16)]">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full opacity-70 transition-opacity duration-500 group-hover:opacity-100"
                      style={{
                        background:
                          "radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 70%)",
                      }}
                    />
                    <div className="relative flex items-center gap-4">
                      <motion.span
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-fuchsia-500 font-display text-lg font-bold text-white shadow-[0_10px_26px_rgba(124,58,237,0.32)]"
                      >
                        {p.iniciales}
                      </motion.span>
                      <div className="min-w-0">
                        <p className="font-display text-lg font-bold leading-tight">{p.nombre}</p>
                        <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
                          {p.rol}
                        </p>
                      </div>
                    </div>
                    <p className="relative mt-5 text-sm leading-7 text-muted-foreground">{p.bio}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        </section>

        {/* =========================================================
            NÚMEROS — TARJETAS CON CONTADOR
        ========================================================= */}
        <section className="relative overflow-hidden bg-background">
          {/* Luz ambiental que respira detrás de las tarjetas */}
          <motion.div
            aria-hidden="true"
            animate={{
              opacity: [0.06, 0.16, 0.06],
              scale: [0.95, 1.1, 0.95],
            }}
            transition={{
              duration: 9,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="pointer-events-none absolute left-1/2 top-[55%] size-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]"
          />

          <div className="relative mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
            <Reveal className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                Cloud Esther en números
              </span>

              <h2 className="mt-4 text-3xl font-bold tracking-tight lg:text-4xl">
                Creciendo junto a las clínicas.
              </h2>
            </Reveal>

            <div className="relative mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat, index) => (
                <Reveal key={stat.v} delay={index * 0.1} className="h-full">
                  <StatCard stat={stat} index={index} />
                </Reveal>
              ))}
            </div>

            {/* =====================================================
                CTA
            ===================================================== */}
            <Reveal className="mt-16 text-center">
              <motion.div
                animate={{
                  boxShadow: [
                    "0 0 0 #7c3aed00",
                    "0 0 35px #7c3aed1f",
                    "0 0 0 #7c3aed00",
                  ],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="inline-flex rounded-2xl"
              >
                <Button asChild variant="hero" size="xl">
                  <Link to="/demostracion">
                    Contratar servicio
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </motion.div>
            </Reveal>
          </div>
        </section>
      </MotionConfig>
    </PublicLayout>
  );
}