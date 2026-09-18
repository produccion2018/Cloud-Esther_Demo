import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useInView, animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";
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

const stats = [
  { icon: Building2, k: "+320", v: "clínicas usando Cloud Esther" },
  { icon: CalendarCheck, k: "1.2M", v: "turnos gestionados" },
  { icon: ThumbsUp, k: "98%", v: "satisfacción del equipo" },
  { icon: Clock, k: "24/7", v: "disponibilidad en la nube" },
];

function zeroedValue(value: string, match: RegExpMatchArray) {
  const [, prefix, numStr, suffix] = match;
  const decimals = numStr.includes(".") ? numStr.split(".")[1].length : 0;
  return `${prefix}${(0).toFixed(decimals)}${suffix}`;
}

function StatCounter({ value }: { value: string }) {
  const match = value.match(/^([^\d]*)(\d+(?:\.\d+)?)(.*)$/);
  const ref = useRef<HTMLParagraphElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const hasAnimated = useRef(false);
  const [display, setDisplay] = useState(match ? zeroedValue(value, match) : value);

  useEffect(() => {
    if (!isInView || !match || hasAnimated.current) return;
    hasAnimated.current = true;

    const [, prefix, numStr, suffix] = match;
    const target = parseFloat(numStr);
    const decimals = numStr.includes(".") ? numStr.split(".")[1].length : 0;

    const controls = animate(0, target, {
      duration: 1.4,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(`${prefix}${v.toFixed(decimals)}${suffix}`),
    });

    return () => controls.stop();
  }, [isInView, match]);

  return (
    <p ref={ref} className="text-gradient font-display text-4xl font-bold">
      {display}
    </p>
  );
}

/**
 * Texto con degradado animado en loop infinito.
 * Usa @keyframes CSS nativo (no framer-motion) porque animar
 * background-position vía JS sobre background-clip:text tiene un bug
 * de repintado en varios navegadores: el texto queda invisible hasta
 * que algo fuerza un repaint (ej. seleccionarlo). CSS puro no tiene ese problema.
 */
function ShimmerText({ text }: { text: string }) {
  return (
    <span className="relative inline-block">
      <style>{`
        @keyframes ce-shimmer {
          from { background-position: 0% center; }
          to { background-position: 200% center; }
        }
      `}</style>
      <span
        className="inline-block bg-clip-text text-transparent"
        style={{
          backgroundImage:
            "linear-gradient(90deg, var(--color-primary), var(--color-brand), var(--color-primary))",
          backgroundSize: "200% auto",
          WebkitBackgroundClip: "text",
          animation: "ce-shimmer 4s linear infinite",
          willChange: "background-position",
        }}
      >
        {text}
      </span>
    </span>
  );
}

function Nosotros() {
  return (
    <PublicLayout>
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

<<<<<<< HEAD
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
              ease: [0.22, 1, 0.36, 1],
            }}
            className="inline-flex"
          >
            <span className="rounded-full border border-primary/15 bg-lavender px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-lavender-foreground">
              Nosotros
            </span>
          </motion.div>

          <div className="mt-6 overflow-hidden">
            <h1 className="text-4xl font-bold leading-[1.04] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
              {"Tecnología para clínicas".split("").map((char, index) => (
                <motion.span
                  key={`line1-${index}`}
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
                    delay: 0.1 + index * 0.025,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="inline-block"
                >
                  {char === " " ? "\u00A0" : char}
                </motion.span>
              ))}
            </h1>
          </div>

          <div className="mt-1 overflow-hidden">
            <h1 className="text-4xl font-bold leading-[1.04] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
              <span className="text-gradient">
                {"que quieren crecer.".split("").map((char, index) => (
                  <motion.span
                    key={`line2-${index}`}
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
                      delay: 0.65 + index * 0.035,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="inline-block"
                  >
                    {char === " " ? "\u00A0" : char}
                  </motion.span>
                ))}
              </span>
            </h1>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              delay: 1.25,
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
              delay: 1.5,
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
=======
      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          {[
            {
              icon: Target,
              title: "Nuestra misión",
              desc: "Ayudar a las clínicas a centralizar su gestión y trabajar de manera más eficiente.",
            },
            {
              icon: Eye,
              title: "Nuestra visión",
              desc: "Construir una plataforma integral para la gestión moderna de clínicas odontológicas.",
            },
          ].map((b, i) => (
            <Reveal key={b.title} delay={i * 0.12}>
              <motion.div
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="card-premium h-full p-8 transition-shadow duration-300 hover:shadow-glow"
              >
                <div className="relative flex size-12 items-center justify-center">
                  <motion.span
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.15, 0.5] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 rounded-2xl bg-primary/40 blur-md"
                  />
                  <span className="bg-brand relative flex size-12 items-center justify-center rounded-2xl">
                    <b.icon className="size-5.5 text-primary-foreground" />
                  </span>
                </div>
                <h2 className="mt-5 text-2xl font-bold">{b.title}</h2>
                <p className="mt-3 text-muted-foreground">{b.desc}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="bg-soft border-y border-border">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <Reveal className="text-center">
            <h2 className="text-3xl font-bold lg:text-4xl">
              ¿Por qué <ShimmerText text="Cloud Esther" />?
            </h2>
          </Reveal>
          <StaggerGroup className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {values.map((v) => (
              <StaggerItem key={v.title}>
                <motion.div
                  whileHover={{ y: -8 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="card-premium h-full p-6 transition-shadow duration-300 hover:shadow-glow"
                >
                  <div className="relative flex size-11 items-center justify-center">
                    <motion.span
                      animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.15, 0.5] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute inset-0 rounded-2xl bg-primary/40 blur-md"
                    />
                    <span className="bg-lavender relative flex size-11 items-center justify-center rounded-2xl ring-2 ring-primary/25">
                      <v.icon className="size-5 text-primary" />
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{v.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{v.desc}</p>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.v} delay={i * 0.1}>
              <div className="card-premium p-7 text-center transition-shadow duration-300 hover:shadow-glow">
                <span className="bg-lavender mx-auto flex size-10 items-center justify-center rounded-2xl">
                  <s.icon className="size-4.5 text-primary" />
                </span>
                <StatCounter value={s.k} />
                <p className="mt-2 text-sm text-muted-foreground">{s.v}</p>
>>>>>>> fb8de4ffb137cdb7a974f1aca44a370239a610d5
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
        <motion.div
          animate={{
            x: ["-20%", "120%"],
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
            {/* LÍNEA CENTRAL */}
            <div className="absolute left-0 right-0 top-8 hidden h-px bg-border lg:block" />

            <motion.div
              animate={{
                x: ["-10%", "110%"],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute left-0 top-[7px] hidden h-[3px] w-[18%] rounded-full bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_16px_rgba(124,58,237,0.55)] lg:block"
            />

            <StaggerGroup className="grid gap-12 sm:grid-cols-2 lg:grid-cols-5 lg:gap-5">
              {values.map((value, index) => {
                const Icon = value.icon;

                return (
                  <StaggerItem key={value.title}>
                    <motion.div
                      whileHover={{ y: -5 }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 20,
                      }}
                      className="relative text-center"
                    >
                      <motion.div
                        animate={{
                          scale: [1, 1.08, 1],
                          boxShadow: [
                            "0 0 0 rgba(124,58,237,0)",
                            "0 0 22px rgba(124,58,237,0.18)",
                            "0 0 0 rgba(124,58,237,0)",
                          ],
                        }}
                        transition={{
                          duration: 3.5,
                          delay: index * 0.6,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        className="relative z-10 mx-auto flex size-16 items-center justify-center rounded-full border border-primary/15 bg-card"
                      >
                        <span className="flex size-10 items-center justify-center rounded-xl bg-lavender">
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
          NÚMEROS — SIN CARDS
      ========================================================= */}
      <section className="relative overflow-hidden bg-background">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Cloud Esther en números
            </span>

            <h2 className="mt-4 text-3xl font-bold tracking-tight lg:text-4xl">
              Creciendo junto a las clínicas.
            </h2>
          </Reveal>

          <div className="relative mt-14">
            <div className="absolute left-0 right-0 top-0 hidden h-px bg-border sm:block" />

            <div className="grid sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat, index) => (
                <Reveal
                  key={stat.v}
                  delay={index * 0.1}
                  className="relative border-b border-border py-8 sm:border-r sm:px-8 sm:last:border-r-0 sm:nth-[3]:border-r-0 lg:border-b-0 lg:border-r"
                >
                  <motion.p
                    animate={{
                      y: [0, -3, 0],
                    }}
                    transition={{
                      duration: 4,
                      delay: index * 0.6,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="text-gradient font-display text-5xl font-bold tracking-tight"
                  >
                    {stat.k}
                  </motion.p>

                  <p className="mt-3 max-w-[180px] text-sm leading-6 text-muted-foreground">
                    {stat.v}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>

          {/* =====================================================
              CTA
          ===================================================== */}
          <Reveal className="mt-16 text-center">
            <motion.div
              animate={{
                boxShadow: [
                  "0 0 0 rgba(124,58,237,0)",
                  "0 0 35px rgba(124,58,237,0.12)",
                  "0 0 0 rgba(124,58,237,0)",
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
                  Solicitar demostración
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </motion.div>
          </Reveal>
        </div>
      </section>
    </PublicLayout>
  );
}