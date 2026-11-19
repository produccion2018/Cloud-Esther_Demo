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
  Check,
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
import { EstherInfinityShowcase } from "@/components/site/EstherInfinityShowcase";
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
    accent: "violet",
    gradient: "from-violet-500/35 via-fuchsia-500/20 to-transparent",
    glow: "bg-violet-500/20",
    badge: "Agenda inteligente",
    highlight: ["Turnos", "Disponibilidad", "Recordatorios"],
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
    accent: "sky",
    gradient: "from-sky-500/30 via-cyan-500/15 to-transparent",
    glow: "bg-sky-500/20",
    badge: "Historia clínica",
    highlight: ["Fichas", "Seguimiento", "Portal"],
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
    accent: "emerald",
    gradient: "from-emerald-500/30 via-teal-500/15 to-transparent",
    glow: "bg-emerald-500/20",
    badge: "Diagnósticos",
    highlight: ["Tratamientos", "Estudios", "Laboratorio"],
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
    accent: "amber",
    gradient: "from-amber-500/30 via-orange-500/15 to-transparent",
    glow: "bg-amber-500/20",
    badge: "Finanzas",
    highlight: ["Facturación", "Pagos", "Caja"],
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
    accent: "rose",
    gradient: "from-rose-500/30 via-pink-500/15 to-transparent",
    glow: "bg-rose-500/20",
    badge: "Negocio",
    highlight: ["Analítica", "Sucursal", "Inventario"],
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
    accent: "indigo",
    gradient: "from-indigo-500/30 via-violet-500/20 to-transparent",
    glow: "bg-indigo-500/20",
    badge: "Protección",
    highlight: ["Permisos", "Usuarios", "Auditoría"],
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

function ModulosExplorer() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (paused || reduceMotion) return undefined;

    const id = window.setTimeout(() => {
      setActive((prev) => (prev + 1) % categories.length);
    }, AUTOPLAY_MS);

    return () => window.clearTimeout(id);
  }, [active, paused, reduceMotion]);

  const current = categories[active];
  const CurrentIcon = current.icon;

  const accentMap = {
    violet: {
      ring: "ring-violet-400/40",
      panel: "from-violet-500/20 via-violet-500/10 to-transparent",
      text: "text-violet-300",
      badge: "bg-violet-500/10 text-violet-200 border-violet-400/30",
      dot: "bg-violet-400",
    },
    sky: {
      ring: "ring-sky-400/40",
      panel: "from-sky-500/20 via-cyan-500/10 to-transparent",
      text: "text-sky-300",
      badge: "bg-sky-500/10 text-sky-200 border-sky-400/30",
      dot: "bg-sky-400",
    },
    emerald: {
      ring: "ring-emerald-400/40",
      panel: "from-emerald-500/20 via-teal-500/10 to-transparent",
      text: "text-emerald-300",
      badge: "bg-emerald-500/10 text-emerald-200 border-emerald-400/30",
      dot: "bg-emerald-400",
    },
    amber: {
      ring: "ring-amber-400/40",
      panel: "from-amber-500/20 via-orange-500/10 to-transparent",
      text: "text-amber-300",
      badge: "bg-amber-500/10 text-amber-200 border-amber-400/30",
      dot: "bg-amber-400",
    },
    rose: {
      ring: "ring-rose-400/40",
      panel: "from-rose-500/20 via-pink-500/10 to-transparent",
      text: "text-rose-300",
      badge: "bg-rose-500/10 text-rose-200 border-rose-400/30",
      dot: "bg-rose-400",
    },
    indigo: {
      ring: "ring-indigo-400/40",
      panel: "from-indigo-500/20 via-violet-500/10 to-transparent",
      text: "text-indigo-300",
      badge: "bg-indigo-500/10 text-indigo-200 border-indigo-400/30",
      dot: "bg-indigo-400",
    },
  } as const;

  const theme = accentMap[current.accent as keyof typeof accentMap];

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="grid gap-4 lg:grid-cols-[0.82fr_1.38fr] lg:gap-6"
    >
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

      <div className="relative overflow-hidden rounded-[28px] border border-primary/15 bg-card/80 p-5 shadow-[0_20px_60px_rgba(88,28,135,0.08)] backdrop-blur-sm sm:p-7 lg:min-h-[460px]">
        <div className={`absolute inset-0 bg-gradient-to-br ${current.gradient}`} />
        <motion.div
          aria-hidden="true"
          animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute -right-20 -top-16 size-64 rounded-full blur-[90px] ${current.glow}`}
        />
        <motion.div
          aria-hidden="true"
          animate={{ y: [0, -14, 0], x: [0, 10, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute -bottom-24 -left-10 size-56 rounded-full blur-[90px] ${current.glow}`}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            role="tabpanel"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div className="absolute right-2 top-0 text-7xl font-extrabold leading-none text-primary/[0.08] sm:text-8xl">
              {String(active + 1).padStart(2, "0")}
            </div>

            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <motion.span
                    animate={{ rotate: [0, 8, -8, 0], y: [0, -8, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    className={`flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br ${current.panel} ${theme.ring} ring-1 text-white shadow-[0_12px_28px_rgba(124,58,237,0.25)]`}
                  >
                    <CurrentIcon className="size-6" />
                  </motion.span>

                  <div>
                    <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${theme.text}`}>
                      Módulo {String(active + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                      {current.title}
                    </h3>
                  </div>
                </div>

                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${theme.badge}`}>
                  {current.badge}
                </span>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {current.highlight.map((item) => (
                  <motion.span
                    key={item}
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/80"
                  >
                    {item}
                  </motion.span>
                ))}
              </div>

              <p className="mt-5 text-lg font-semibold leading-snug text-foreground">
                {current.tagline}
              </p>

              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                {current.description}
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {current.items.map((item, itemIndex) => {
                  const ItemIcon = item.icon;

                  return (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.4,
                        delay: 0.08 + itemIndex * 0.06,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-3.5"
                    >
                      <motion.div
                        aria-hidden="true"
                        animate={{ opacity: [0.15, 0.35, 0.15] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: itemIndex * 0.4 }}
                        className={`absolute inset-0 bg-gradient-to-br ${current.gradient}`}
                      />

                      <div className="relative flex gap-3">
                        <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${theme.badge}`}>
                          <ItemIcon className="size-4" />
                        </span>

                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">{item.name}</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

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
      <section className="relative isolate overflow-hidden bg-soft">
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

          <div className="relative mt-6 text-4xl font-bold leading-[1.1] tracking-[-0.035em] text-foreground sm:text-5xl lg:text-7xl">
            <TituloAnimado />
          </div>

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

        <Reveal>
          <ModulosExplorer />
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-primary/15 bg-card/80 p-8 shadow-[0_20px_60px_rgba(88,28,135,0.08)] backdrop-blur-xl lg:p-14">
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
                    className="inline-block whitespace-nowrap pb-[0.14em] leading-[1.2] bg-[linear-gradient(90deg,var(--color-primary),var(--color-primary-glow),var(--color-primary))] bg-[length:200%_auto] bg-clip-text text-transparent [-webkit-text-fill-color:transparent]"
                    animate={{
                      backgroundPosition: ["0% center", "200% center"],
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

              <EstherInfinityShowcase />
            </div>
          </div>
        </Reveal>
      </section>
    </PublicLayout>
  );
}

export default Caracteristicas;