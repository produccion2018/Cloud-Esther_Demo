import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  CalendarCheck,
  Users,
  Stethoscope,
  Wallet,
  Building2,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  CalendarClock,
  UserX,
  TrendingUp,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/site/PublicLayout";
import {
  Reveal,
  StaggerGroup,
  StaggerItem,
} from "@/components/site/Reveal";

export const Route = createFileRoute("/caracteristicas")({
  head: () => ({
    meta: [
      { title: "Características | Cloud Esther" },
      {
        name: "description",
        content:
          "Agenda, pacientes, gestión clínica, administración, analítica, seguridad e inteligencia artificial en Cloud Esther.",
      },
      {
        property: "og:title",
        content: "Características de Cloud Esther",
      },
      {
        property: "og:description",
        content:
          "Todos los módulos de gestión para tu clínica odontológica.",
      },
    ],
  }),
  component: Caracteristicas,
});

const categories = [
  {
    icon: CalendarCheck,
    title: "Agenda",
    items: [
      "Agenda y gestión de citas",
      "Turnos",
      "Recordatorios",
      "Disponibilidad profesional",
    ],
  },
  {
    icon: Users,
    title: "Pacientes",
    items: [
      "Gestión de pacientes",
      "Historia clínica",
      "Seguimiento",
      "Portal del paciente",
    ],
  },
  {
    icon: Stethoscope,
    title: "Gestión clínica",
    items: [
      "Tratamientos",
      "Estudios y diagnóstico",
      "Documentos",
      "Laboratorio",
    ],
  },
  {
    icon: Wallet,
    title: "Administración",
    items: [
      "Facturación",
      "Pagos",
      "Presupuestos",
      "Caja / Finanzas",
    ],
  },
  {
    icon: Building2,
    title: "Gestión empresarial",
    items: [
      "Analítica",
      "Marketing",
      "Inventario",
      "Recursos Humanos",
      "Administración multiempresa",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Seguridad",
    items: [
      "Usuarios",
      "Permisos",
      "Control de accesos",
      "Auditoría",
    ],
  },
];

const titleLines = [
  "Todo el poder de tu clínica,",
  "en un solo lugar.",
] as const;

const aiInsights = [
  {
    icon: ClipboardList,
    text: "Resumen automático de la historia clínica de Laura Gómez",
  },
  {
    icon: CalendarClock,
    text: "Sugerencia: 3 huecos libres el jueves por la tarde",
  },
  {
    icon: UserX,
    text: "12 pacientes sin turno hace más de 8 meses",
  },
  {
    icon: TrendingUp,
    text: "Los tratamientos de ortodoncia crecieron 22% este trimestre",
  },
];

function AnimatedLetters({
  text,
  delay = 0,
  gradient = false,
}: {
  text: string;
  delay?: number;
  gradient?: boolean;
}) {
  return (
    <span
      className={
        gradient
          ? "inline-block bg-[linear-gradient(110deg,#111827_0%,#111827_38%,#7c3aed_52%,#a855f7_62%,#111827_78%)] bg-[length:250%_100%] bg-clip-text text-transparent"
          : "inline-block"
      }
    >
      {text.split("").map((char, index) => (
        <motion.span
          key={`${char}-${index}`}
          initial={{
            opacity: 0,
            y: 24,
            rotateX: -70,
            filter: "blur(6px)",
          }}
          animate={{
            opacity: 1,
            y: 0,
            rotateX: 0,
            filter: "blur(0px)",
          }}
          transition={{
            duration: 0.65,
            delay: delay + index * 0.035,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="inline-block"
          style={{
            whiteSpace: char === " " ? "pre" : undefined,
          }}
        >
          {char}
        </motion.span>
      ))}
    </span>
  );
}

function Caracteristicas() {
  return (
    <PublicLayout>
      {/* =========================================================
          HERO
      ========================================================= */}
      <section className="relative isolate overflow-hidden bg-soft">
        {/* Glow central */}
        <motion.div
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.35, 0.5, 0.35],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute left-1/2 top-[-180px] h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-primary/10 blur-[100px]"
        />

        {/* Glow izquierdo */}
        <motion.div
          animate={{
            x: [-30, 30, -30],
            y: [0, 20, 0],
          }}
          transition={{
            duration: 11,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute -left-40 top-20 size-[320px] rounded-full bg-violet-300/10 blur-[90px]"
        />

        {/* Glow derecho */}
        <motion.div
          animate={{
            x: [30, -30, 30],
            y: [0, -15, 0],
          }}
          transition={{
            duration: 13,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute -right-40 top-32 size-[360px] rounded-full bg-purple-300/10 blur-[100px]"
        />

        <div className="relative mx-auto max-w-5xl px-5 pb-10 pt-10 text-center sm:pt-12 lg:px-8 lg:pb-12 lg:pt-14">
          {/* EYEBROW */}
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.6,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="relative mx-auto inline-flex"
          >
            <motion.span
              animate={{
                boxShadow: [
                  "0 0 0 rgba(124,58,237,0)",
                  "0 0 22px rgba(124,58,237,0.18)",
                  "0 0 0 rgba(124,58,237,0)",
                ],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative inline-flex items-center rounded-full border border-primary/20 bg-lavender px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-lavender-foreground"
            >
              <motion.span
                animate={{
                  opacity: [0.5, 1, 0.5],
                  scale: [0.9, 1.15, 0.9],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="mr-2 size-1.5 rounded-full bg-primary"
              />

              Características
            </motion.span>
          </motion.div>

          {/* TITULO */}
          <div className="perspective-[1000px] relative mt-6 text-4xl font-bold leading-[1.05] tracking-[-0.035em] text-foreground sm:text-5xl lg:text-7xl">
            {/* Glow detrás del título */}
            <motion.div
              animate={{
                opacity: [0.15, 0.35, 0.15],
                scale: [0.92, 1.05, 0.92],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[220px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[90px]"
            />

            <div>
              <AnimatedLetters
                text={titleLines[0]}
                delay={0.15}
              />
            </div>

            <div className="relative mt-1 inline-block">
              <AnimatedLetters
                text={titleLines[1]}
                delay={0.5}
                gradient
              />

              {/* Chispa decorativa */}
              <motion.span
                initial={{ opacity: 0, scale: 0.4, rotate: -20 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  scale: [0.4, 1.1, 1, 0.4],
                  rotate: [-20, 8, 0, -20],
                }}
                transition={{
                  duration: 3.2,
                  delay: 1.4,
                  repeat: Infinity,
                  repeatDelay: 2.5,
                  ease: "easeInOut",
                }}
                className="pointer-events-none absolute -right-7 -top-3 text-primary sm:-right-9 sm:-top-4"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-5 fill-current sm:size-6"
                  aria-hidden="true"
                >
                  <path d="M12 2C8.5 2 6 4 6 7.5c0 2.2.6 3.8 1.1 5.6.5 1.7.9 3.6 1.1 6.1.1 1.2 1 2.1 1.9 1.7.7-.3.9-1.3 1.1-2.2.3-1.4.6-2.9 1.8-2.9s1.5 1.5 1.8 2.9c.2.9.4 1.9 1.1 2.2.9.4 1.8-.5 1.9-1.7.2-2.5.6-4.4 1.1-6.1.5-1.8 1.1-3.4 1.1-5.6C18 4 15.5 2 12 2z" />
                </svg>
              </motion.span>

              {/* Barrido de luz infinito */}
              <motion.span
                initial={{
                  x: "-120%",
                  opacity: 0,
                }}
                animate={{
                  x: ["-120%", "120%"],
                  opacity: [0, 0.75, 0],
                }}
                transition={{
                  duration: 1.9,
                  delay: 1.5,
                  repeat: Infinity,
                  repeatDelay: 3,
                  ease: "easeInOut",
                }}
                className="pointer-events-none absolute inset-y-0 left-0 w-1/3 skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/70 to-transparent blur-md"
              />

              {/* Segundo barrido, más sutil y desfasado */}
              <motion.span
                initial={{
                  x: "-120%",
                  opacity: 0,
                }}
                animate={{
                  x: ["-120%", "120%"],
                  opacity: [0, 0.35, 0],
                }}
                transition={{
                  duration: 1.9,
                  delay: 2.9,
                  repeat: Infinity,
                  repeatDelay: 3,
                  ease: "easeInOut",
                }}
                className="pointer-events-none absolute inset-y-0 left-0 w-1/4 skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/50 to-transparent blur-sm"
              />
            </div>
          </div>

          {/* SUBTITULO */}
          <motion.p
            initial={{
              opacity: 0,
              y: 18,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.7,
              delay: 1.25,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground lg:text-lg"
          >
            Módulos que se activan según lo que tu clínica necesita, hoy y a
            medida que crece.
          </motion.p>

          {/* Línea decorativa */}
          <motion.div
            initial={{
              width: 0,
              opacity: 0,
            }}
            animate={{
              width: 56,
              opacity: 1,
            }}
            transition={{
              duration: 0.8,
              delay: 1.55,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mx-auto mt-7 h-0.5 rounded-full bg-primary/50"
          />
        </div>
      </section>

      {/* =========================================================
          MÓDULOS
      ========================================================= */}
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-5 lg:px-8 lg:pb-20 lg:pt-7">
        <Reveal>
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <motion.p
              initial={{
                opacity: 0,
                y: 10,
              }}
              whileInView={{
                opacity: 1,
                y: 0,
              }}
              viewport={{
                once: true,
              }}
              transition={{
                duration: 0.5,
              }}
              className="text-sm font-semibold text-primary"
            >
              Todo conectado
            </motion.p>

            <motion.h2
              initial={{
                opacity: 0,
                y: 14,
              }}
              whileInView={{
                opacity: 1,
                y: 0,
              }}
              viewport={{
                once: true,
              }}
              transition={{
                duration: 0.6,
                delay: 0.08,
              }}
              className="mt-1.5 text-2xl font-bold tracking-tight lg:text-3xl"
            >
              Herramientas para cada parte de tu clínica
            </motion.h2>

            <motion.p
              initial={{
                opacity: 0,
                y: 12,
              }}
              whileInView={{
                opacity: 1,
                y: 0,
              }}
              viewport={{
                once: true,
              }}
              transition={{
                duration: 0.6,
                delay: 0.16,
              }}
              className="mt-2 text-sm text-muted-foreground lg:text-base"
            >
              Elegí el módulo que querés explorar.
            </motion.p>
          </div>
        </Reveal>

        <StaggerGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat, index) => (
            <StaggerItem key={cat.title}>
              <motion.div
                whileHover={{
                  y: -6,
                  rotate: -0.4,
                  scale: 1.015,
                }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 22,
                }}
                className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-[0_18px_40px_rgba(124,58,237,0.14)]"
              >
                {/* Número */}
                <span className="pointer-events-none absolute right-4 top-1 text-6xl font-extrabold leading-none text-primary/[0.08] transition-all duration-500 group-hover:scale-110 group-hover:text-primary/[0.14]">
                  {String(index + 1).padStart(2, "0")}
                </span>

                {/* Glow */}
                <div className="pointer-events-none absolute -right-10 -top-10 size-24 rounded-full bg-primary/10 blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                {/* Brillo en barrido al pasar el mouse */}
                <div className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />

                {/* Borde con resplandor sutil */}
                <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 shadow-[inset_0_0_0_1px_rgba(124,58,237,0.35)] transition-opacity duration-500 group-hover:opacity-100" />

                <div className="relative flex items-center gap-3">
                  {/* Icono */}
                  <motion.span
                    animate={{
                      y: [0, -3, 0],
                    }}
                    transition={{
                      default: { type: "spring", stiffness: 300, damping: 20 },
                      y: {
                        duration: 2.6 + index * 0.15,
                        repeat: Infinity,
                        ease: "easeInOut",
                      },
                    }}
                    whileHover={{
                      rotate: -6,
                      scale: 1.12,
                    }}
                    className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-lavender text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground"
                  >
                    <motion.span
                      animate={{
                        scale: [1, 1.15, 1],
                        opacity: [0.3, 0.12, 0.3],
                      }}
                      transition={{
                        duration: 2.8,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="pointer-events-none absolute inset-0 rounded-xl bg-primary blur-md"
                    />

                    <cat.icon className="relative size-5" />
                  </motion.span>

                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold lg:text-base">
                      {cat.title}
                    </h3>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {cat.items.length} herramientas
                    </p>
                  </div>

                  <motion.span
                    animate={{
                      x: [0, 3, 0],
                    }}
                    transition={{
                      duration: 1.8,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="ml-auto translate-x-1 text-primary opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                  >
                    <ArrowRight className="size-4" />
                  </motion.span>
                </div>

                {/* Lista desplegable al hover */}
                <div className="grid grid-rows-[0fr] opacity-0 transition-all duration-300 group-hover:grid-rows-[1fr] group-hover:opacity-100">
                  <div className="overflow-hidden">
                    <div className="mt-3 border-t border-border/60 pt-3">
                      <ul className="space-y-1.5">
                        {cat.items.map((item) => (
                          <li
                            key={item}
                            className="flex items-center gap-2 text-xs text-muted-foreground"
                          >
                            <span className="size-1 rounded-full bg-primary/70" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Línea inferior */}
                <div className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-30 bg-gradient-to-r from-primary to-brand opacity-40 transition-all duration-500 group-hover:scale-x-100 group-hover:opacity-100" />
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </section>

      {/* =========================================================
          ESTHER IA
      ========================================================= */}
      <section className="mx-auto max-w-7xl px-5 pb-24 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-primary/15 bg-card/80 p-8 shadow-[0_20px_60px_rgba(88,28,135,0.08)] backdrop-blur-xl lg:p-14">
            {/* Fondo animado */}
            <motion.div
              animate={{
                scale: [1, 1.08, 1],
                opacity: [0.18, 0.3, 0.18],
              }}
              transition={{
                duration: 7,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="pointer-events-none absolute -left-24 -top-24 size-[320px] rounded-full bg-primary/15 blur-[100px]"
            />

            <motion.div
              animate={{
                scale: [1.08, 1, 1.08],
                opacity: [0.15, 0.28, 0.15],
              }}
              transition={{
                duration: 9,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="pointer-events-none absolute -bottom-28 -right-24 size-[340px] rounded-full bg-violet-400/15 blur-[110px]"
            />

            <div className="relative grid items-center gap-10 lg:grid-cols-2">
              {/* Texto */}
              <div>
                <motion.span
                  initial={{
                    opacity: 0,
                    y: 10,
                  }}
                  whileInView={{
                    opacity: 1,
                    y: 0,
                  }}
                  viewport={{
                    once: true,
                  }}
                  transition={{
                    duration: 0.5,
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-lavender px-3.5 py-1.5 text-xs font-semibold text-lavender-foreground"
                >
                  <Bot className="size-3.5" />
                  Inteligencia artificial
                </motion.span>

                <h2 className="mt-5 text-3xl font-bold lg:text-4xl">
                  <motion.span
                    className="inline-block bg-[linear-gradient(90deg,var(--color-primary),var(--color-brand),var(--color-primary))] bg-[length:200%_auto] bg-clip-text text-transparent"
                    animate={{
                      backgroundPosition: [
                        "0% center",
                        "200% center",
                      ],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    Esther IA
                  </motion.span>
                  , el asistente inteligente de tu clínica
                </h2>

                <p className="mt-4 leading-relaxed text-muted-foreground">
                  Esther IA resume historias clínicas, sugiere horarios
                  óptimos para la agenda, detecta pacientes inactivos y te
                  muestra qué está pasando con el rendimiento de la clínica en
                  lenguaje simple.
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <Button asChild variant="hero" size="lg">
                    <Link to="/registro">
                      Probar demo
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>

                  <Button asChild variant="outlineBrand" size="lg">
                    <Link to="/planes">
                      Ver planes
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Panel IA */}
              <div className="relative">
                <div className="absolute -top-5 right-3 z-10 flex items-center">
                  {/* Anillos tipo radar detrás del badge */}
                  <motion.span
                    animate={{
                      scale: [1, 2.1],
                      opacity: [0.45, 0],
                    }}
                    transition={{
                      duration: 2.2,
                      repeat: Infinity,
                      ease: "easeOut",
                    }}
                    className="absolute inset-0 rounded-full bg-brand"
                  />
                  <motion.span
                    animate={{
                      scale: [1, 2.1],
                      opacity: [0.45, 0],
                    }}
                    transition={{
                      duration: 2.2,
                      repeat: Infinity,
                      delay: 1.1,
                      ease: "easeOut",
                    }}
                    className="absolute inset-0 rounded-full bg-brand"
                  />

                  <motion.span
                    initial={{
                      opacity: 0,
                      scale: 0.6,
                      y: -8,
                    }}
                    whileInView={{
                      opacity: 1,
                      scale: 1,
                      y: 0,
                    }}
                    viewport={{
                      once: true,
                    }}
                    animate={{
                      boxShadow: [
                        "0 0 0px rgba(124,58,237,0.35)",
                        "0 0 20px rgba(124,58,237,0.6)",
                        "0 0 0px rgba(124,58,237,0.35)",
                      ],
                    }}
                    transition={{
                      default: { duration: 0.5, type: "spring" },
                      boxShadow: {
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      },
                    }}
                    className="relative inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-brand px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-primary-foreground"
                  >
                    <motion.span
                      animate={{ opacity: [1, 0.25, 1] }}
                      transition={{
                        duration: 1.3,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="size-1.5 rounded-full bg-white"
                    />
                    En vivo
                  </motion.span>
                </div>

                <div className="rounded-3xl border border-primary/15 bg-card/60 p-4 backdrop-blur-sm">
                  {aiInsights.map((insight, index) => {
                    const Icon = insight.icon;

                    return (
                      <motion.div
                        key={insight.text}
                        initial={{
                          opacity: 0,
                          x: 20,
                        }}
                        whileInView={{
                          opacity: 1,
                          x: 0,
                        }}
                        viewport={{
                          once: true,
                        }}
                        transition={{
                          duration: 0.5,
                          delay: index * 0.12,
                        }}
                        className="group flex items-start gap-3 rounded-2xl border border-border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_10px_30px_rgba(124,58,237,0.08)]"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand shadow-sm">
                          <Icon className="size-4 text-primary-foreground" />
                        </span>

                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {insight.text}
                        </p>

                        <CheckCircle2 className="mt-0.5 ml-auto size-4 shrink-0 text-primary/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </PublicLayout>
  );
}