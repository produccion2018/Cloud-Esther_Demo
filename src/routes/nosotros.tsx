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

/* ---------------------------------------------------------------
   Duración (en segundos) del ciclo del haz de luz de "Lo que nos
   define". Los círculos se iluminan justo cuando el haz pasa por
   arriba de cada uno.
---------------------------------------------------------------- */
const BEAM_CYCLE = 7;
const BEAM_WIDTH = 18; // % del ancho del contenedor (w-[18%])

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

          <div className="relative mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-24">
            <div className="grid gap-16 lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-14">
              {/* MISIÓN */}
              <Reveal>
                <div className="relative">
                  <div className="flex items-center gap-4">
                    <motion.span
                      animate={{
                        boxShadow: [
                          "0 0 0 rgba(124,58,237,0)",
                          "0 0 25px rgba(124,58,237,0.25)",
                          "0 0 0 rgba(124,58,237,0)",
                        ],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 text-white"
                    >
                      <Target className="size-5" />
                    </motion.span>

                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                      Nuestra misión
                    </span>
                  </div>

                  <h2 className="mt-7 text-3xl font-bold tracking-tight lg:text-4xl">
                    Hacer simple lo complejo.
                  </h2>

                  <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
                    Ayudar a las clínicas a centralizar su gestión y trabajar
                    de manera más eficiente.
                  </p>

                  <motion.div
                    animate={{
                      width: ["15%", "55%", "15%"],
                      opacity: [0.35, 0.8, 0.35],
                    }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="mt-7 h-px rounded-full bg-gradient-to-r from-primary to-transparent"
                  />
                </div>
              </Reveal>

              {/* CONEXIÓN CENTRAL */}
              <div className="relative hidden h-40 w-px lg:block">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/25 to-transparent" />

                <motion.span
                  animate={{
                    y: ["-20%", "120%"],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 3.5,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="absolute left-1/2 size-2 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_16px_rgba(124,58,237,0.8)]"
                />
              </div>

              {/* VISIÓN */}
              <Reveal delay={0.12}>
                <div className="relative lg:text-right">
                  <div className="flex items-center gap-4 lg:justify-end">
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                      Nuestra visión
                    </span>

                    <motion.span
                      animate={{
                        boxShadow: [
                          "0 0 0 rgba(124,58,237,0)",
                          "0 0 25px rgba(124,58,237,0.25)",
                          "0 0 0 rgba(124,58,237,0)",
                        ],
                      }}
                      transition={{
                        duration: 4,
                        delay: 1.2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 text-white"
                    >
                      <Eye className="size-5" />
                    </motion.span>
                  </div>

                  <h2 className="mt-7 text-3xl font-bold tracking-tight lg:text-4xl">
                    Una nueva forma de gestionar.
                  </h2>

                  <p className="mt-5 ml-auto max-w-lg text-base leading-7 text-muted-foreground">
                    Construir una plataforma integral para la gestión moderna
                    de clínicas odontológicas.
                  </p>

                  <motion.div
                    animate={{
                      width: ["15%", "55%", "15%"],
                      opacity: [0.35, 0.8, 0.35],
                    }}
                    transition={{
                      duration: 5,
                      delay: 1.2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="ml-auto mt-7 h-px rounded-full bg-gradient-to-l from-primary to-transparent"
                  />
                </div>
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