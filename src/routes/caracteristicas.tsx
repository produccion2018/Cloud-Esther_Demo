import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { Fragment, useEffect, useState } from "react";
import {
  CalendarCheck,
  Users,
  Stethoscope,
  Wallet,
  Building2,
  ShieldCheck,
  ArrowRight,
  Bot,
  CalendarDays,
  Clock,
  Bell,
  UserCheck,
  FileText,
  Activity,
  Globe,
  ClipboardList,
  Microscope,
  FolderOpen,
  FlaskConical,
  ReceiptText,
  CreditCard,
  Calculator,
  Landmark,
  BarChart3,
  Megaphone,
  Package,
  UserCog,
  Network,
  KeyRound,
  Lock,
  ScrollText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/site/PublicLayout";
import { PanelEstherIA } from "@/components/site/PanelEstherIA";
import { Reveal } from "@/components/site/Reveal";

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
    tagline: "Que ningún turno se pierda.",
    description:
      "Organizá la agenda de toda la clínica, evitá superposiciones y reducí las ausencias con avisos automáticos a tus pacientes.",
    items: [
      {
        icon: CalendarDays,
        name: "Agenda y gestión de turnos",
        desc: "Vista diaria, semanal y por profesional, con alta de turnos en segundos.",
      },
      {
        icon: Clock,
        name: "Turnos",
        desc: "Reservas, reprogramaciones y cancelaciones sin superposiciones.",
      },
      {
        icon: Bell,
        name: "Recordatorios",
        desc: "Avisos automáticos por WhatsApp, SMS o correo antes de cada turno.",
      },
      {
        icon: UserCheck,
        name: "Disponibilidad profesional",
        desc: "Cada profesional define sus días, horarios y bloqueos.",
      },
    ],
  },
  {
    icon: Users,
    title: "Pacientes",
    tagline: "Toda la información en un solo lugar.",
    description:
      "Fichas completas, historia clínica y seguimiento para conocer a cada paciente y mantener el vínculo en el tiempo.",
    items: [
      {
        icon: Users,
        name: "Gestión de pacientes",
        desc: "Fichas con datos de contacto, obra social y sucursal.",
      },
      {
        icon: FileText,
        name: "Historia clínica",
        desc: "Odontograma, evolución y antecedentes siempre a mano.",
      },
      {
        icon: Activity,
        name: "Seguimiento",
        desc: "Controles pendientes y pacientes inactivos para retomar el contacto.",
      },
      {
        icon: Globe,
        name: "Portal del paciente",
        desc: "Tus pacientes ven turnos, recetas y documentos desde su celular.",
      },
    ],
  },
  {
    icon: Stethoscope,
    title: "Gestión clínica",
    tagline: "Del diagnóstico al alta, ordenado.",
    description:
      "Seguí cada tratamiento con sus etapas, estudios y documentos, y coordiná el trabajo con el laboratorio.",
    items: [
      {
        icon: ClipboardList,
        name: "Tratamientos",
        desc: "Planes con etapas, estado y evolución de cada paciente.",
      },
      {
        icon: Microscope,
        name: "Estudios y diagnóstico",
        desc: "Galería de imágenes, comparación de estudios y anotaciones.",
      },
      {
        icon: FolderOpen,
        name: "Documentos",
        desc: "Recetas, consentimientos y archivos del paciente, ordenados.",
      },
      {
        icon: FlaskConical,
        name: "Laboratorio",
        desc: "Pedidos con seguimiento de estado y fecha de entrega.",
      },
    ],
  },
  {
    icon: Wallet,
    title: "Administración",
    tagline: "Tus ingresos, bajo control.",
    description:
      "Presupuestá, cobrá y facturá sin planillas sueltas, con el movimiento de caja siempre claro.",
    items: [
      {
        icon: ReceiptText,
        name: "Facturación",
        desc: "Comprobantes e ingresos de la clínica en un solo lugar.",
      },
      {
        icon: CreditCard,
        name: "Pagos",
        desc: "Cobros, cuenta corriente y saldos por paciente.",
      },
      {
        icon: Calculator,
        name: "Presupuestos",
        desc: "Presupuestos claros que tu paciente puede revisar y aprobar.",
      },
      {
        icon: Landmark,
        name: "Caja / Finanzas",
        desc: "Ingresos, egresos y cierre de caja diario.",
      },
    ],
  },
  {
    icon: Building2,
    title: "Gestión empresarial",
    tagline: "Hacé crecer tu clínica con datos.",
    description:
      "Herramientas para dirigir el negocio: indicadores, equipo, stock y varias sucursales desde un único panel.",
    items: [
      {
        icon: BarChart3,
        name: "Analítica",
        desc: "Indicadores de turnos, ingresos y rendimiento de la clínica.",
      },
      {
        icon: Megaphone,
        name: "Marketing",
        desc: "Campañas y recontacto de pacientes para sumar consultas.",
      },
      {
        icon: Package,
        name: "Inventario",
        desc: "Insumos con control de stock y alertas de reposición.",
      },
      {
        icon: UserCog,
        name: "Recursos Humanos",
        desc: "Equipo, asistencia, vacaciones y nómina.",
      },
      {
        icon: Network,
        name: "Administración multiempresa",
        desc: "Varias sucursales o empresas gestionadas desde un solo lugar.",
      },
    ],
  },
  {
    icon: ShieldCheck,
    title: "Seguridad",
    tagline: "Cada dato, protegido.",
    description:
      "Definí quién ve y quién hace qué, y dejá registro de cada acción dentro de la plataforma.",
    items: [
      {
        icon: Users,
        name: "Usuarios",
        desc: "Altas y bajas del equipo con sus roles asignados.",
      },
      {
        icon: KeyRound,
        name: "Permisos",
        desc: "Qué ve y qué puede hacer cada rol: profesional, recepción, administración.",
      },
      {
        icon: Lock,
        name: "Control de accesos",
        desc: "Acceso ordenado a la información sensible de tus pacientes.",
      },
      {
        icon: ScrollText,
        name: "Auditoría",
        desc: "Registro de las acciones realizadas dentro del sistema.",
      },
    ],
  },
];

const AUTOPLAY_MS = 7000;

const titleLines = [
  "Todo el poder de tu clínica,",
  "en un solo lugar.",
] as const;

/* =========================================================
   TÍTULO ANIMADO
   Se anima cada vez que entra en pantalla y se oculta al salir,
   así que al subir y bajar con el scroll vuelve a repetirse.
========================================================= */
const letraVariants: Variants = {
  oculto: {
    opacity: 0,
    y: 30,
    rotateX: -80,
    scale: 0.9,
    filter: "blur(8px)",
    transition: { duration: 0.25 },
  },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    rotateX: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.6,
      delay: i * 0.035,
      ease: "easeOut",
    },
  }),
};

// Violeta oscuro -> violeta claro, letra por letra (colores sólidos).
function colorVioleta(t: number) {
  const desde = [91, 33, 182];
  const hasta = [168, 85, 247];
  const rgb = desde.map((c, i) => Math.round(c + (hasta[i] - c) * t));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

function TituloAnimado() {
  const reducir = useReducedMotion();

  if (reducir) {
    return (
      <>
        <div>{titleLines[0]}</div>
        <div className="mt-1 text-primary">{titleLines[1]}</div>
      </>
    );
  }

  let indice = 0;

  const renderLinea = (texto: string, violeta: boolean) => {
    const palabras = texto.split(" ");
    const totalLetras = texto.replace(/ /g, "").length;
    let letraN = 0;

    return palabras.map((palabra, pi) => (
      <Fragment key={`${palabra}-${pi}`}>
        <span className="inline-block whitespace-nowrap">
          {palabra.split("").map((letra, li) => {
            const i = indice++;
            const t = totalLetras > 1 ? letraN++ / (totalLetras - 1) : 0;

            return (
              <motion.span
                key={`${letra}-${li}`}
                custom={i}
                variants={letraVariants}
                className="inline-block"
                style={violeta ? { color: colorVioleta(t) } : undefined}
              >
                {letra}
              </motion.span>
            );
          })}
        </span>
        {pi < palabras.length - 1 && " "}
      </Fragment>
    ));
  };

  return (
    <motion.div
      aria-label={`${titleLines[0]} ${titleLines[1]}`}
      initial="oculto"
      whileInView="visible"
      viewport={{ once: false, amount: 0.6 }}
      style={{ perspective: 1000 }}
    >
      <div aria-hidden="true">{renderLinea(titleLines[0], false)}</div>
      <div aria-hidden="true" className="mt-1">
        {renderLinea(titleLines[1], true)}
      </div>
    </motion.div>
  );
}

/* =========================================================
   EXPLORADOR DE MÓDULOS (lista + panel de detalle)
========================================================= */
function ModulosExplorer() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();

  // Rotación automática: se frena al pasar el mouse por encima.
  useEffect(() => {
    if (paused || reduceMotion) return undefined;

    const id = window.setTimeout(() => {
      setActive((prev) => (prev + 1) % categories.length);
    }, AUTOPLAY_MS);

    return () => window.clearTimeout(id);
  }, [active, paused, reduceMotion]);

  const current = categories[active];
  const CurrentIcon = current.icon;

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="grid gap-4 lg:grid-cols-[0.82fr_1.38fr] lg:gap-6"
    >
      {/* LISTA DE MÓDULOS */}
      <div
        role="tablist"
        aria-label="Módulos de Cloud Esther"
        className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
      >
        {categories.map((cat, index) => {
          const Icon = cat.icon;
          const isActive = index === active;

          return (
            <button
              key={cat.title}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(index)}
              className={`group relative shrink-0 overflow-hidden rounded-2xl border px-4 py-3 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 lg:w-full lg:shrink ${
                isActive
                  ? "border-primary/30 bg-card shadow-[0_14px_36px_rgba(124,58,237,0.14)]"
                  : "border-transparent bg-card/40 hover:border-primary/15 hover:bg-card/80"
              }`}
            >
              <span
                className={`pointer-events-none absolute right-3 top-0.5 text-4xl font-extrabold leading-none transition-colors duration-300 ${
                  isActive ? "text-primary/[0.12]" : "text-primary/[0.06]"
                }`}
              >
                {String(index + 1).padStart(2, "0")}
              </span>

              <span className="relative flex items-center gap-3">
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-[0_8px_20px_rgba(124,58,237,0.3)]"
                      : "bg-lavender text-primary"
                  }`}
                >
                  <Icon className="size-5" />
                </span>

                <span className="min-w-0 pr-8">
                  <span className="block whitespace-nowrap text-sm font-semibold lg:text-base">
                    {cat.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {cat.items.length} herramientas
                  </span>
                </span>

                <ArrowRight
                  className={`ml-auto hidden size-4 shrink-0 text-primary transition-all duration-300 lg:block ${
                    isActive
                      ? "translate-x-0 opacity-100"
                      : "-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-60"
                  }`}
                />
              </span>

              {/* Barra de progreso de la rotación automática */}
              {isActive && !paused && !reduceMotion && (
                <motion.span
                  key={`progress-${active}`}
                  aria-hidden="true"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: AUTOPLAY_MS / 1000, ease: "linear" }}
                  style={{ originX: 0 }}
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-primary to-brand"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* PANEL DE DETALLE */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/15 bg-card/80 p-6 shadow-[0_20px_60px_rgba(88,28,135,0.08)] backdrop-blur-sm sm:p-8 lg:min-h-[430px]">
        <div className="pointer-events-none absolute -right-24 -top-24 size-[300px] rounded-full bg-primary/10 blur-[90px]" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 size-[260px] rounded-full bg-violet-300/10 blur-[90px]" />

        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            role="tabpanel"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            {/* Número grande de fondo */}
            <span className="pointer-events-none absolute right-0 top-0 text-8xl font-extrabold leading-none text-primary/[0.07] sm:text-9xl">
              {String(active + 1).padStart(2, "0")}
            </span>

            <div className="relative">
              <div className="flex items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-fuchsia-500 text-white shadow-[0_12px_28px_rgba(124,58,237,0.32)]">
                  <CurrentIcon className="size-6" />
                </span>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                    Módulo {String(active + 1).padStart(2, "0")}
                  </p>
                  <h3 className="text-xl font-bold tracking-tight sm:text-2xl">
                    {current.title}
                  </h3>
                </div>
              </div>

              <p className="mt-5 text-lg font-semibold leading-snug text-foreground">
                {current.tagline}
              </p>

              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                {current.description}
              </p>

              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {current.items.map((item, itemIndex) => {
                  const ItemIcon = item.icon;

                  return (
                    <motion.li
                      key={item.name}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.4,
                        delay: 0.08 + itemIndex * 0.06,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="flex gap-3 rounded-2xl border border-border/70 bg-background/70 p-3.5 transition-colors duration-300 hover:border-primary/30"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-lavender text-primary">
                        <ItemIcon className="size-4" />
                      </span>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{item.name}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                          {item.desc}
                        </p>
                      </div>
                    </motion.li>
                  );
                })}
              </ul>

              <div className="mt-7 flex flex-wrap items-center gap-3">
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
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
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

          {/* TITULO (se anima cada vez que entra en pantalla) */}
          <div className="relative mt-6 text-4xl font-bold leading-[1.1] tracking-[-0.035em] text-foreground sm:text-5xl lg:text-7xl">
            <TituloAnimado />
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
              delay: 0.3,
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
              delay: 0.5,
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

        <Reveal>
          <ModulosExplorer />
        </Reveal>
      </section>

      {/* =========================================================
          ESTHER INFINITY
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
                    Esther Infinity
                  </motion.span>
                  , el asistente inteligente de tu clínica
                </h2>

                <p className="mt-4 leading-relaxed text-muted-foreground">
                  Esther Infinity resume historias clínicas, sugiere horarios
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

              {/* Panel IA (datos administrables desde el panel; hoy de prueba) */}
              <PanelEstherIA />
            </div>
          </div>
        </Reveal>
      </section>
    </PublicLayout>
  );
}