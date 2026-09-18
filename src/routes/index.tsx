import { createFileRoute, Link } from "@tanstack/react-router";
import { animate, motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  FileText,
  HeartPulse,
  ReceiptText,
  ShieldCheck,
<<<<<<< HEAD
  Stethoscope,
  Users,
=======
  FileText,
  FlaskConical,
  Briefcase,
  BellRing,
  MessageCircle,
>>>>>>> fb8de4ffb137cdb7a974f1aca44a370239a610d5
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

<<<<<<< HEAD
const modules = [
  {
    title: "Agenda",
    subtitle: "Turnos y horarios",
    icon: CalendarDays,
    position: "top-[4%] left-[45%] lg:left-[48%]",
    delay: 0,
    size: "large",
=======
function ToothIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2c-2.2 0-3.5 1.1-4.6 1.1-1.4 0-2.9-1-4-.2-1.2.9-1.4 3-1.2 4.6.3 2.6 1.3 4.4 1.9 7.1.4 1.8.6 4.3 2.1 4.4 1.7.1 1.5-3.3 2.5-3.3s.8 3.4 2.5 3.3c1.5-.1 1.7-2.6 2.1-4.4.6-2.7 1.6-4.5 1.9-7.1.2-1.6 0-3.7-1.2-4.6-1.1-.8-2.6.2-4 .2C15.5 3.1 14.2 2 12 2z"
        fill="currentColor"
      />
    </svg>
  );
}

const benefits = [
  {
    icon: CalendarCheck,
    title: "Agenda inteligente",
    desc: "Organizá turnos y disponibilidad.",
  },
  { icon: Users, title: "Gestión de pacientes", desc: "Toda la información en un solo lugar." },
  { icon: Stethoscope, title: "Historia clínica", desc: "Tratamientos, historias y evolución." },
  { icon: ToothIcon, title: "Odontograma y 3D", desc: "Registro visual completo de cada pieza." },
  { icon: FileText, title: "Recetas", desc: "Emití y gestioná recetas digitales." },
  { icon: FlaskConical, title: "Estudios y diagnóstico", desc: "Carga y seguimiento de estudios." },
  { icon: Briefcase, title: "Recursos Humanos", desc: "Gestioná tu equipo y su documentación." },
  {
    icon: Wallet,
    title: "Facturación y pagos",
    desc: "Control de ingresos, presupuestos y pagos.",
  },
  { icon: BarChart3, title: "Analítica", desc: "Información para tomar mejores decisiones." },
  { icon: BellRing, title: "Recordatorios", desc: "Avisos automáticos de turnos y vencimientos." },
  { icon: MessageCircle, title: "Comunicaciones", desc: "Mensajería directa con tus pacientes." },
  { icon: ShieldCheck, title: "Seguridad", desc: "Control de acceso y protección de información." },
];

const steps = [
  { n: "01", title: "Registrá tu clínica", desc: "Creá tu cuenta en pocos minutos." },
  {
    n: "02",
    title: "Configurá tu equipo",
    desc: "Agregá profesionales, usuarios y sucursales.",
>>>>>>> fb8de4ffb137cdb7a974f1aca44a370239a610d5
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

<<<<<<< HEAD
const faqs = [
  {
    q: "¿Qué es Cloud Esther?",
    a: "Es una plataforma SaaS para centralizar la gestión diaria de clínicas odontológicas desde un solo lugar.",
  },
  {
    q: "¿Puedo comenzar con un plan y agregar módulos después?",
    a: "Sí. Podés comenzar con el plan que necesitás y sumar módulos adicionales a medida que tu clínica crece.",
  },
  {
    q: "¿Puedo gestionar varias sucursales?",
    a: "Sí. Los planes superiores permiten administrar múltiples sucursales, equipos, agendas y reportes.",
  },
  {
    q: "¿Necesito instalar algún programa?",
    a: "No. Cloud Esther funciona en la nube y podés acceder desde cualquier navegador.",
  },
];

function FloatingModule({
  module,
}: {
  module: (typeof modules)[number];
}) {
  const Icon = module.icon;

  const isLarge = module.size === "large";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{
        opacity: 1,
        scale: [1, 1.025, 1],
        y: [0, -7, 0],
      }}
      transition={{
        opacity: {
          duration: 0.7,
          delay: module.delay,
        },
        scale: {
          duration: 5 + module.delay,
          repeat: Infinity,
          ease: "easeInOut",
        },
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
        className={`relative overflow-hidden rounded-[20px] border border-white/80 bg-white/75 shadow-[0_18px_45px_rgba(88,28,135,0.14)] backdrop-blur-xl ${
          isLarge ? "p-3.5" : "p-3"
        }`}
      >
        <motion.div
          animate={{
            opacity: [0.15, 0.35, 0.15],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute -right-6 -top-6 size-16 rounded-full bg-primary/25 blur-2xl"
        />

        <div className="relative">
          <motion.div
            animate={{
              boxShadow: [
                "0 5px 15px rgba(124,58,237,0.08)",
                "0 7px 22px rgba(124,58,237,0.2)",
                "0 5px 15px rgba(124,58,237,0.08)",
              ],
            }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className={`flex ${
              isLarge ? "size-10" : "size-9"
            } items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-purple-500/20`}
          >
            <Icon
              className={`${
                isLarge ? "size-5" : "size-4.5"
              } text-primary`}
            />
          </motion.div>

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

function Home() {
  return (
    <PublicLayout>
      {/* =========================================================
          HERO
      ========================================================= */}
      <section className="relative isolate min-h-[690px] overflow-hidden bg-soft lg:min-h-[720px]">
        {/* BACKGROUND GLOWS */}
        <motion.div
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.18, 0.32, 0.18],
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute left-[48%] top-[-180px] size-[620px] -translate-x-1/2 rounded-full bg-primary/15 blur-[130px]"
        />

        <motion.div
          animate={{
            x: [-30, 30, -30],
            y: [0, 25, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute -left-40 bottom-[-180px] size-[420px] rounded-full bg-purple-400/10 blur-[110px]"
        />

        <motion.div
          animate={{
            x: [30, -30, 30],
            y: [0, -25, 0],
          }}
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute -right-40 top-[20%] size-[460px] rounded-full bg-fuchsia-300/10 blur-[120px]"
        />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 pb-14 pt-12 lg:min-h-[720px] lg:grid-cols-[0.92fr_1.08fr] lg:gap-3 lg:px-8 lg:pb-12 lg:pt-14">
          {/* =====================================================
              HERO COPY
          ===================================================== */}
          <div className="relative z-30 max-w-2xl">
=======
function CountUpStat({ value }: { value: string }) {
  const match = value.match(/^([+]?)(\d+)(.*)$/);
  const [display, setDisplay] = useState(match ? `${match[1]}0${match[3]}` : value);

  useEffect(() => {
    if (!match) return;
    const prefix = match[1];
    const target = parseInt(match[2], 10);
    const suffix = match[3];
    const controls = animate(0, target, {
      duration: 1.6,
      delay: 0.7,
      ease: "easeOut",
      onUpdate(v) {
        setDisplay(`${prefix}${Math.round(v)}${suffix}`);
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{display}</>;
}

function Index() {
  return (
    <PublicLayout>
      {/* HERO */}
      <section className="relative overflow-hidden bg-soft">
        <div className="bg-glow pointer-events-none absolute inset-x-0 -top-20 h-[520px]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-5 py-16 lg:grid-cols-2 lg:gap-10 lg:px-8 lg:py-24">
          <div>
            <motion.span
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="relative inline-flex items-center gap-2 rounded-full border border-primary/20 bg-lavender px-3.5 py-1.5 text-xs font-semibold text-lavender-foreground"
            >
              <motion.span
                aria-hidden
                className="absolute inset-0 -z-10 rounded-full bg-primary/30 blur-md"
                animate={{ opacity: [0.25, 0.6, 0.25], scale: [1, 1.08, 1] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
              />
              Software SaaS para clínicas odontológicas
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.08 }}
              className="mt-5 text-4xl leading-[1.08] font-bold text-balance sm:text-5xl lg:text-6xl"
            >
              Gestiona tu clínica.
              <br />
              <motion.span
                className="text-gradient bg-[length:200%_100%] bg-clip-text"
                animate={{ backgroundPositionX: ["0%", "200%"] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              >
                Hazla crecer.
              </motion.span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.16 }}
              className="mt-5 max-w-xl text-base text-muted-foreground lg:text-lg"
            >
              La plataforma inteligente para administrar tu clínica, tus pacientes y todo tu equipo
              desde un solo lugar.
            </motion.p>
>>>>>>> fb8de4ffb137cdb7a974f1aca44a370239a610d5
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
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
                    "0 0 22px rgba(124,58,237,0.18)",
                    "0 0 0 rgba(124,58,237,0)",
                  ],
                }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-lavender px-4 py-1.5 text-xs font-semibold text-lavender-foreground"
              >
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
              </motion.span>
            </motion.div>

            <div className="mt-7">
              <div className="overflow-hidden">
                {"Gestiona tu".split("").map((char, index) => (
                  <motion.span
                    key={`line-one-${index}`}
                    initial={{
                      opacity: 0,
                      y: 38,
                      rotateX: -65,
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
                    className="inline-block text-[3.8rem] font-bold leading-[0.92] tracking-[-0.055em] text-foreground sm:text-6xl lg:text-[4.7rem]"
                  >
                    {char === " " ? "\u00A0" : char}
                  </motion.span>
                ))}
              </div>

              <div className="overflow-hidden">
                {"clínica.".split("").map((char, index) => (
                  <motion.span
                    key={`line-two-${index}`}
                    initial={{
                      opacity: 0,
                      y: 38,
                      rotateX: -65,
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
                      delay: 0.55 + index * 0.04,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="inline-block text-[3.8rem] font-bold leading-[0.92] tracking-[-0.055em] text-foreground sm:text-6xl lg:text-[4.7rem]"
                  >
                    {char}
                  </motion.span>
                ))}
              </div>

              <div className="relative mt-1 overflow-hidden pb-2">
                <span className="relative inline-block bg-[linear-gradient(110deg,#6d28d9_0%,#9333ea_30%,#c084fc_48%,#7c3aed_68%,#6d28d9_100%)] bg-[length:250%_100%] bg-clip-text text-[3.8rem] font-bold leading-[0.92] tracking-[-0.055em] text-transparent sm:text-6xl lg:text-[4.7rem]">
                  {"Hazla crecer.".split("").map((char, index) => (
                    <motion.span
                      key={`line-three-${index}`}
                      initial={{
                        opacity: 0,
                        y: 38,
                        rotateX: -65,
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
                        delay: 0.9 + index * 0.045,
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
                      duration: 6,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.45),transparent)] bg-[length:220%_100%]"
                  />
                </span>

                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "82%", opacity: 1 }}
                  transition={{
                    duration: 1,
                    delay: 1.55,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="mt-3 h-1 rounded-full bg-gradient-to-r from-primary via-purple-400 to-fuchsia-300 shadow-[0_0_16px_rgba(168,85,247,0.35)]"
                />
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
              className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg"
            >
              La plataforma inteligente para administrar tu clínica, tus
              pacientes y todo tu equipo desde un solo lugar.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.7,
                delay: 1.6,
              }}
              className="mt-7 flex flex-col gap-3 sm:flex-row"
            >
              <motion.div
                animate={{
                  boxShadow: [
                    "0 8px 24px rgba(124,58,237,0.16)",
                    "0 12px 34px rgba(124,58,237,0.28)",
                    "0 8px 24px rgba(124,58,237,0.16)",
                  ],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="rounded-xl"
              >
                <Button asChild variant="hero" size="xl">
                  <Link to="/registro">
                    Probar demo
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </motion.div>

              <Button asChild variant="outlineBrand" size="xl">
                <Link to="/demostracion">Solicitar demostración</Link>
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.7,
                delay: 1.8,
              }}
              className="mt-8 flex items-center gap-5 sm:gap-7"
            >
<<<<<<< HEAD
              <div>
                <p className="text-2xl font-bold text-primary">+320</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Clínicas
                </p>
              </div>

              <div className="h-9 w-px bg-border" />

              <div>
                <p className="text-2xl font-bold text-primary">98%</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Satisfacción
                </p>
              </div>

              <div className="h-9 w-px bg-border" />

              <div>
                <p className="text-2xl font-bold text-primary">24/7</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  En la nube
                </p>
              </div>
=======
              {[
                { k: "+320", v: "clínicas" },
                { k: "98%", v: "satisfacción" },
                { k: "24/7", v: "en la nube" },
              ].map((s) => (
                <div key={s.v}>
                  <p className="font-display text-2xl font-bold text-primary">
                    <CountUpStat value={s.k} />
                  </p>
                  <p className="text-xs text-muted-foreground">{s.v}</p>
                </div>
              ))}
>>>>>>> fb8de4ffb137cdb7a974f1aca44a370239a610d5
            </motion.div>
          </div>

          {/* =====================================================
              ECOSISTEMA 3D
          ===================================================== */}
          <div className="relative mx-auto h-[520px] w-full max-w-[650px] lg:h-[650px] lg:max-w-[700px]">
            {/* GLOW CENTRAL */}
            <motion.div
              animate={{
                scale: [0.9, 1.1, 0.9],
                opacity: [0.16, 0.3, 0.16],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="pointer-events-none absolute left-1/2 top-1/2 size-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[80px] sm:size-[370px]"
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
              <motion.span
                animate={{
                  scale: [0.8, 1.2, 0.8],
                  opacity: [0.35, 1, 0.35],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute left-[8%] top-[15%] size-2 rounded-full bg-primary shadow-[0_0_14px_rgba(124,58,237,0.7)]"
              />

              <motion.span
                animate={{
                  scale: [1, 0.7, 1],
                  opacity: [1, 0.35, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute bottom-[12%] right-[13%] size-1.5 rounded-full bg-fuchsia-400 shadow-[0_0_14px_rgba(217,70,239,0.65)]"
              />
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
              <motion.div
                animate={{ opacity: [0.2, 0.5, 0.2] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute left-1/2 top-1/2 h-px w-full -translate-x-1/2 rotate-[22deg] bg-gradient-to-r from-transparent via-primary/40 to-transparent"
              />

              <motion.div
                animate={{ opacity: [0.15, 0.45, 0.15] }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute left-1/2 top-1/2 h-px w-full -translate-x-1/2 -rotate-[35deg] bg-gradient-to-r from-transparent via-purple-400/40 to-transparent"
              />

              <motion.div
                animate={{ opacity: [0.2, 0.45, 0.2] }}
                transition={{
                  duration: 4.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute left-1/2 top-1/2 h-px w-full -translate-x-1/2 rotate-[82deg] bg-gradient-to-r from-transparent via-primary/30 to-transparent"
              />
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

              <motion.div
                animate={{
                  boxShadow: [
                    "0 20px 55px rgba(124,58,237,0.18)",
                    "0 25px 75px rgba(124,58,237,0.34)",
                    "0 20px 55px rgba(124,58,237,0.18)",
                  ],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="relative flex size-[125px] items-center justify-center rounded-full border border-white/70 bg-gradient-to-br from-white via-purple-50 to-purple-100 shadow-[inset_0_0_35px_rgba(124,58,237,0.08)] backdrop-blur-xl sm:size-[150px]"
              >
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
                  <span className="font-display text-4xl font-bold text-white sm:text-5xl">
                    C
                  </span>

                  <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/25 via-transparent to-transparent" />
                </motion.div>
              </motion.div>

              <motion.div
                animate={{
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap text-center"
              >
                <span className="font-display text-sm font-bold text-foreground">
                  Cloud Esther
                </span>
              </motion.div>
            </motion.div>

            {/* MÓDULOS */}
            {modules.map((module) => (
              <FloatingModule key={module.title} module={module} />
            ))}

            {/* INDICADOR SUPERIOR */}
            <motion.div
              animate={{
                y: [0, -6, 0],
                opacity: [0.8, 1, 0.8],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute right-[2%] top-[2%] z-30 hidden rounded-full border border-white/80 bg-white/75 px-3 py-1.5 text-[10px] font-semibold text-muted-foreground shadow-[0_10px_30px_rgba(88,28,135,0.1)] backdrop-blur-xl sm:flex"
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
        <motion.div
          animate={{
            opacity: [0.12, 0.22, 0.12],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute left-1/2 top-0 size-[420px] -translate-x-1/2 rounded-full bg-primary/10 blur-[110px]"
        />

<<<<<<< HEAD
        <div className="relative mx-auto max-w-7xl px-5 py-20 lg:px-8">
=======
        <StaggerGroup className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b) => (
            <StaggerItem key={b.title}>
              <motion.div
                whileHover={{ y: -8 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="group relative h-full rounded-2xl p-[1.5px]"
              >
                <motion.span
                  aria-hidden
                  className="absolute inset-0 rounded-2xl bg-[conic-gradient(from_0deg,theme(colors.primary.DEFAULT),theme(colors.brand.DEFAULT),theme(colors.primary.DEFAULT))] opacity-60 blur-[2px] transition-opacity duration-300 group-hover:opacity-100"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                />
                <div
                  style={{ background: "#ffffff" }}
                  className="relative h-full rounded-2xl p-6 shadow-sm transition-shadow duration-300 group-hover:shadow-glow"
                >
                  <motion.span
                    className="relative flex size-14 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3"
                    style={{
                      background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
                    }}
                  >
                    <motion.span
                      aria-hidden
                      className="absolute inset-0 -z-10 rounded-2xl blur-lg"
                      style={{ background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)" }}
                      animate={{ opacity: [0.35, 0.7, 0.35], scale: [1, 1.25, 1] }}
                      transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <b.icon className="size-6 text-white" />
                  </motion.span>
                  <h3 className="mt-5 text-lg font-semibold">{b.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{b.desc}</p>
                </div>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="bg-soft border-y border-border">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
>>>>>>> fb8de4ffb137cdb7a974f1aca44a370239a610d5
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
<<<<<<< HEAD

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              {
                number: "01",
                title: "Registrá tu clínica",
                description: "Creá tu cuenta en pocos minutos.",
              },
              {
                number: "02",
                title: "Configurá tu equipo",
                description:
                  "Agregá profesionales, usuarios y sucursales.",
              },
              {
                number: "03",
                title: "Empezá a gestionar",
                description:
                  "Administrá pacientes, turnos, tratamientos y mucho más.",
              },
            ].map((step, index) => (
              <Reveal key={step.number} delay={index * 0.1}>
                <motion.div
                  whileHover={{ y: -5 }}
                  className="relative text-center"
                >
                  <motion.div
                    animate={{
                      opacity: [0.7, 1, 0.7],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: index * 0.5,
                    }}
                    className="text-5xl font-bold tracking-tight text-primary/85"
                  >
                    {step.number}
                  </motion.div>

                  <h3 className="mt-4 text-lg font-bold">
                    {step.title}
                  </h3>

                  <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>

                  {index < 2 && (
                    <div className="absolute right-[-8%] top-8 hidden h-px w-[16%] bg-gradient-to-r from-primary/20 to-transparent md:block" />
                  )}
=======
          <div className="relative mt-14 grid gap-6 lg:grid-cols-3">
            <div className="pointer-events-none absolute inset-x-0 top-14 hidden h-px lg:block">
              <motion.div
                className="h-full w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent"
                style={{ backgroundSize: "200% 100%" }}
                animate={{ backgroundPositionX: ["0%", "200%"] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
              />
            </div>

            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.12}>
                <motion.div
                  whileHover={{ y: -8 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="group relative h-full rounded-2xl p-[1.5px]"
                >
                  <motion.span
                    aria-hidden
                    className="absolute inset-0 rounded-2xl bg-[conic-gradient(from_0deg,theme(colors.primary.DEFAULT),theme(colors.brand.DEFAULT),theme(colors.primary.DEFAULT))] opacity-50 blur-[2px] transition-opacity duration-300 group-hover:opacity-100"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 7, repeat: Infinity, ease: "linear", delay: i * 0.4 }}
                  />
                  <div className="relative h-full rounded-2xl bg-card p-7">
                    <span className="relative inline-block">
                      <motion.span
                        aria-hidden
                        className="absolute inset-0 -z-10 rounded-full blur-xl"
                        style={{
                          background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
                        }}
                        animate={{ opacity: [0.25, 0.55, 0.25], scale: [1, 1.3, 1] }}
                        transition={{
                          duration: 2.8,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: i * 0.3,
                        }}
                      />
                      <span className="text-gradient font-display text-4xl font-bold">{s.n}</span>
                    </span>
                    <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
                  </div>
>>>>>>> fb8de4ffb137cdb7a974f1aca44a370239a610d5
                </motion.div>
              </Reveal>
            ))}
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

        <div className="mt-10 divide-y divide-border rounded-3xl border border-border/70 bg-card/70 px-6 shadow-[0_15px_45px_rgba(88,28,135,0.06)] backdrop-blur-xl">
          {faqs.map((faq, index) => (
            <Reveal key={faq.q} delay={index * 0.05}>
              <details className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-sm font-semibold">
                  {faq.q}

                  <motion.span
                    whileHover={{ scale: 1.1 }}
                    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-lavender text-primary transition-transform group-open:rotate-45"
                  >
                    <span className="text-lg font-light leading-none">
                      +
                    </span>
                  </motion.span>
                </summary>

                <p className="mt-3 max-w-3xl pr-10 text-sm leading-relaxed text-muted-foreground">
                  {faq.a}
                </p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>

      {/* =========================================================
          CTA FINAL
      ========================================================= */}
      <section className="px-5 pb-16 lg:px-8 lg:pb-20">
        <Reveal>
<<<<<<< HEAD
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#5520a0] via-[#7c3aed] to-[#b56bea] px-6 py-12 text-center shadow-[0_25px_70px_rgba(88,28,135,0.22)] sm:px-10 lg:py-14">
            <motion.div
              animate={{
                x: [-40, 40, -40],
                y: [0, 20, 0],
                scale: [1, 1.08, 1],
                opacity: [0.12, 0.25, 0.12],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="pointer-events-none absolute -left-32 -top-32 size-[300px] rounded-full bg-white/20 blur-[90px]"
            />

            <motion.div
              animate={{
                x: [40, -40, 40],
                y: [0, -20, 0],
                scale: [1, 1.08, 1],
                opacity: [0.1, 0.22, 0.1],
              }}
              transition={{
                duration: 12,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="pointer-events-none absolute -bottom-32 -right-32 size-[320px] rounded-full bg-white/20 blur-[100px]"
            />

            <div className="relative">
              <motion.div
                animate={{
                  scale: [1, 1.04, 1],
                  opacity: [0.8, 1, 0.8],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white/10 text-white backdrop-blur-md"
              >
                <ShieldCheck className="size-5" />
              </motion.div>

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
                  <Link to="/demostracion">
                    Solicitar demostración
                  </Link>
=======
          <div className="relative overflow-hidden rounded-3xl">
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -inset-10 -z-10 rounded-[40px] bg-brand/50 blur-3xl"
              animate={{ opacity: [0.4, 0.75, 0.4], scale: [1, 1.08, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="bg-brand shadow-glow relative overflow-hidden rounded-3xl px-8 py-14 text-center">
              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.25) 35%, transparent 50%)",
                  backgroundSize: "250% 100%",
                }}
                animate={{ backgroundPositionX: ["0%", "-150%"] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
              />
              <h2 className="relative text-3xl font-bold text-balance text-primary-foreground lg:text-4xl">
                Empezá a gestionar tu clínica con Cloud Esther
              </h2>
              <p className="relative mx-auto mt-4 max-w-xl text-primary-foreground/80">
                Explorá la plataforma con datos de ejemplo o coordiná una demostración
                personalizada.
              </p>
              <div className="relative mt-8 flex flex-wrap justify-center gap-3">
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="shadow-[0_0_25px_-3px_rgba(255,255,255,0.7)]"
                >
                  <Link to="/registro">Probar demo</Link>
                </Button>
                <Button asChild size="lg" variant="outlineBrand">
                  <Link to="/demostracion">Solicitar demostración</Link>
>>>>>>> fb8de4ffb137cdb7a974f1aca44a370239a610d5
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </PublicLayout>
  );
}