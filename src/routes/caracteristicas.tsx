import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  CalendarCheck,
  Users,
  Stethoscope,
  Wallet,
  Building2,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/site/PublicLayout";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/site/Reveal";

export const Route = createFileRoute("/caracteristicas")({
  head: () => ({
    meta: [
      { title: "Características | Cloud Esther" },
      {
        name: "description",
        content:
          "Agenda, pacientes, gestión clínica, administración, analítica, seguridad e inteligencia artificial en Cloud Esther.",
      },
      { property: "og:title", content: "Características de Cloud Esther" },
      {
        property: "og:description",
        content: "Todos los módulos de gestión para tu clínica odontológica.",
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
    items: ["Facturación", "Pagos", "Presupuestos", "Caja / Finanzas"],
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
    items: ["Usuarios", "Permisos", "Control de accesos", "Auditoría"],
  },
];

const titleLines = [
  "Todo el poder de tu",
  "clínica en un solo lugar.",
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
      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-soft">
        {/* Ambient glow */}
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

          {/* TITLE */}
          <div
            className="perspective-[1000px] mt-6 text-4xl font-bold leading-[1.05] tracking-[-0.035em] text-foreground sm:text-5xl lg:text-6xl"
          >
            <div>
              <AnimatedLetters text={titleLines[0]} delay={0.15} />
            </div>

            <div className="relative mt-1">
              <AnimatedLetters
                text={titleLines[1]}
                delay={0.5}
                gradient
              />

              {/* Animated light sweep */}
              <motion.span
                initial={{ x: "-120%", opacity: 0 }}
                animate={{
                  x: ["-120%", "120%"],
                  opacity: [0, 0.65, 0],
                }}
                transition={{
                  duration: 2.2,
                  delay: 1.5,
                  repeat: Infinity,
                  repeatDelay: 4,
                  ease: "easeInOut",
                }}
                className="pointer-events-none absolute inset-y-0 left-0 w-1/3 skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/60 to-transparent blur-md"
              />
            </div>
          </div>

          {/* SUBTITLE */}
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
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

          {/* Decorative line */}
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 56, opacity: 1 }}
            transition={{
              duration: 0.8,
              delay: 1.55,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mx-auto mt-7 h-0.5 rounded-full bg-primary/50"
          />
        </div>
      </section>

      {/* MÓDULOS */}
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-5 lg:px-8 lg:pb-20 lg:pt-7">
        <Reveal>
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-sm font-semibold text-primary"
            >
              Todo conectado
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.08 }}
              className="mt-1.5 text-2xl font-bold tracking-tight lg:text-3xl"
            >
              Herramientas para cada parte de tu clínica
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.16 }}
              className="mt-2 text-sm text-muted-foreground lg:text-base"
            >
              Elegí el módulo que querés explorar.
            </motion.p>
          </div>
        </Reveal>

        <StaggerGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <StaggerItem key={cat.title}>
              <motion.div
                whileHover={{ y: -4 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 22,
                }}
                className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-primary/20 hover:shadow-[0_14px_35px_rgba(124,58,237,0.10)]"
              >
                <div className="pointer-events-none absolute -right-10 -top-10 size-24 rounded-full bg-primary/10 blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                <div className="relative flex items-center gap-3">
                  <motion.span
                    whileHover={{
                      rotate: -4,
                      scale: 1.08,
                    }}
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-lavender text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground"
                  >
                    <cat.icon className="size-5" />
                  </motion.span>

                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold lg:text-base">
                      {cat.title}
                    </h3>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {cat.items.length} herramientas
                    </p>
                  </div>

                  <motion.span className="ml-auto translate-x-1 text-primary opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
                    <ArrowRight className="size-4" />
                  </motion.span>
                </div>

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
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </section>

      {/* ESTHER IA */}
      <section className="mx-auto max-w-7xl px-5 pb-24 lg:px-8">
        <Reveal>
          <div className="card-premium relative overflow-hidden p-8 lg:p-14">
            <div className="bg-glow pointer-events-none absolute inset-0" />

            <div className="relative grid items-center gap-10 lg:grid-cols-2">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-lavender px-3.5 py-1.5 text-xs font-semibold text-lavender-foreground">
                  Inteligencia artificial
                </span>

                <h2 className="mt-5 text-3xl font-bold lg:text-4xl">
                  <span className="text-gradient">Esther IA</span>, el
                  asistente inteligente de tu clínica
                </h2>

                <p className="mt-4 text-muted-foreground">
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
                    <Link to="/planes">Ver planes</Link>
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  "Resumen automático de la historia clínica de Laura Gómez",
                  "Sugerencia: 3 huecos libres el jueves por la tarde",
                  "12 pacientes sin turno hace más de 8 meses",
                  "Los tratamientos de ortodoncia crecieron 22% este trimestre",
                ].map((t, i) => (
                  <motion.div
                    key={t}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.5,
                      delay: i * 0.12,
                    }}
                    className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4"
                  >
                    <span className="bg-brand flex size-8 shrink-0 items-center justify-center rounded-xl">
                      <Sparkles className="size-4 text-primary-foreground" />
                    </span>

                    <p className="text-sm text-muted-foreground">{t}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </PublicLayout>
  );
}