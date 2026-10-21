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
  Stethoscope,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/site/PublicLayout";
import { Reveal } from "@/components/site/Reveal";
import { PortalesEnterprise } from "@/components/site/PortalesEnterprise";
import { LaptopCta } from "@/components/site/LaptopCta";

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
    a: "Esther Infinity te ayuda con resúmenes clínicos, sugerencias de agenda y análisis del rendimiento de la clínica.",
  },
];

/* Partículas violetas que suben en el Hero */
const HERO_SPARKS = [
  { left: "4%", size: 5, delay: "0s", duration: "10s" },
  { left: "13%", size: 4, delay: "3.4s", duration: "9s" },
  { left: "23%", size: 7, delay: "6.2s", duration: "11s" },
  { left: "36%", size: 4, delay: "1.6s", duration: "9.5s" },
  { left: "47%", size: 6, delay: "4.8s", duration: "10.5s" },
  { left: "58%", size: 5, delay: "2.4s", duration: "9s" },
  { left: "69%", size: 7, delay: "7.4s", duration: "11s" },
  { left: "79%", size: 4, delay: "0.9s", duration: "10s" },
  { left: "88%", size: 6, delay: "5.3s", duration: "9.5s" },
  { left: "95%", size: 5, delay: "8.1s", duration: "10.5s" },
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
          className={`inline-block text-[3.8rem] font-bold leading-[0.92] tracking-[-0.055em] sm:text-6xl lg:text-[4.7rem] ${
            index < words.length - 1 ? "mr-[0.22em]" : ""
          }`}
        >
          <span
            className={`inline-block ${className}`}
            style={
              shimmer
                ? { animationDelay: `${(index * 0.45).toFixed(2)}s` }
                : undefined
            }
          >
            {word}
          </span>
        </motion.span>
      ))}
    </span>
  );
}

/* =========================================================
   ANIMACIONES CSS (livianas, respetan reduced-motion)
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

/* ---------- HERO ---------- */
.ce-hero-spark {
  opacity: 0;
  animation: ce-hero-rise 10s linear infinite;
}
@keyframes ce-hero-rise {
  0% { transform: translateY(0) scale(0.6); opacity: 0; }
  15% { opacity: 0.75; }
  85% { opacity: 0.5; }
  100% { transform: translateY(-560px) scale(1.1); opacity: 0; }
}
.ce-hero-ring {
  animation: ce-hero-ring 4.2s ease-out infinite;
}
@keyframes ce-hero-ring {
  0% { transform: scale(1); opacity: 0.55; }
  100% { transform: scale(2.4); opacity: 0; }
}
.ce-line-pulse {
  animation: ce-line-pulse 4.5s ease-in-out infinite;
}
@keyframes ce-line-pulse {
  0% { transform: translateX(-120%); opacity: 0; }
  15% { opacity: 1; }
  85% { opacity: 1; }
  100% { transform: translateX(900%); opacity: 0; }
}
.ce-card-shine {
  transform: translateX(-160%) skewX(-18deg);
  animation: ce-card-shine 6s ease-in-out infinite;
}
@keyframes ce-card-shine {
  0% { transform: translateX(-160%) skewX(-18deg); }
  40%, 100% { transform: translateX(480%) skewX(-18deg); }
}
.ce-badge-shine {
  transform: translateX(-160%) skewX(-18deg);
  animation: ce-badge-shine 4.5s ease-in-out infinite;
}
@keyframes ce-badge-shine {
  0% { transform: translateX(-160%) skewX(-18deg); }
  50%, 100% { transform: translateX(520%) skewX(-18deg); }
}
.ce-hero-btn-glow {
  animation: ce-hero-btn-glow 2.6s ease-out infinite;
}
@keyframes ce-hero-btn-glow {
  0% { box-shadow: 0 10px 30px rgba(124, 58, 237, 0.22), 0 0 0 0 rgba(124, 58, 237, 0.45); }
  100% { box-shadow: 0 10px 30px rgba(124, 58, 237, 0.22), 0 0 0 18px rgba(124, 58, 237, 0); }
}

/* ---------- ÓRBITAS DEL CARRUSEL ---------- */
.ce-orbit-spin {
  animation: ce-orbit-spin 32s linear infinite;
}
.ce-orbit-spin-rev {
  animation: ce-orbit-spin 46s linear infinite reverse;
}
@keyframes ce-orbit-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .ce-title-gradient,
  .ce-bar-shine,
  .ce-hero-spark,
  .ce-hero-ring,
  .ce-line-pulse,
  .ce-card-shine,
  .ce-badge-shine,
  .ce-hero-btn-glow,
  .ce-orbit-spin,
  .ce-orbit-spin-rev {
    animation: none;
  }
  .ce-hero-spark,
  .ce-hero-ring,
  .ce-line-pulse,
  .ce-card-shine,
  .ce-badge-shine {
    display: none;
  }
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
  // Sin "once": cada vez que la sección vuelve a entrar en pantalla, el contador arranca de 0.
  const inView = useInView(ref, { margin: "-40px" });
  const reduceMotion = useReducedMotion();
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    if (!inView) {
      count.set(0);
      return undefined;
    }

    if (reduceMotion) {
      count.set(to);
      return undefined;
    }

    count.set(0);
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
const ORBITA_SEG = 46; // segundos por vuelta de la órbita (lento y elegante)

function FloatingModule({ module, spin = 1 }: { module: (typeof modules)[number]; spin?: number }) {
  const Icon = module.icon;

  const isLarge = module.size === "large";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: [0, -7, 0],
        // Contra-rota para quedar derecha mientras el contenedor orbita.
        rotate: spin * -360,
      }}
      transition={{
        opacity: { duration: 0.5, delay: 0.3 + module.delay * 0.3 },
        scale: { duration: 0.5, delay: 0.3 + module.delay * 0.3 },
        y: {
          duration: 5 + module.delay,
          repeat: Infinity,
          ease: "easeInOut",
        },
        rotate: { duration: ORBITA_SEG, repeat: Infinity, ease: "linear" },
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

        {/* BRILLO QUE RECORRE LA TARJETA */}
        <span
          aria-hidden="true"
          className="ce-card-shine pointer-events-none absolute inset-y-0 left-0 z-10 w-1/3 bg-gradient-to-r from-transparent via-primary/15 to-transparent"
          style={{ animationDelay: `${(module.delay * 1.6).toFixed(2)}s` }}
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

/* Tarjeta de módulo para el carrusel del hero (compacta, con hover). */
function ModuleCard({
  module,
  active,
}: {
  module: (typeof modules)[number];
  active: boolean;
}) {
  const Icon = module.icon;
  return (
    <div
      className={`group relative w-[138px] overflow-hidden rounded-[20px] border bg-white/95 p-4 backdrop-blur transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-[0_26px_60px_rgba(124,58,237,0.32)] sm:w-[150px] ${
        active
          ? "border-primary/30 shadow-[0_28px_64px_rgba(124,58,237,0.28)]"
          : "border-white/80 shadow-[0_16px_40px_rgba(88,28,135,0.14)]"
      }`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-7 -top-7 size-20 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)" }}
      />
      <span className="absolute right-3 top-3 size-1.5 rounded-full bg-emerald-400" />
      <div className="relative">
        <div
          className={`flex size-10 items-center justify-center rounded-xl transition-colors duration-300 ${
            active
              ? "bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow-[0_8px_20px_rgba(124,58,237,0.35)]"
              : "bg-gradient-to-br from-primary/15 to-purple-500/20 text-primary"
          }`}
        >
          <Icon className="size-5" />
        </div>
        <p className="mt-3.5 text-sm font-bold text-foreground">{module.title}</p>
        <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">{module.subtitle}</p>
        <ArrowRight className="mt-3 size-3.5 text-primary transition-transform duration-300 group-hover:translate-x-1" />
      </div>
    </div>
  );
}

/* Carrusel del hero: las tarjetas giran de forma CONTINUA e infinita en arco alrededor del
   diente central (sin flechas). Frena suave al pasar el mouse. Respeta reduced-motion. */
const VELOCIDAD_TARJETAS = 0.36; // tarjetas que pasan por el centro por segundo

function CarruselModulos() {
  const reduce = useReducedMotion();
  const n = modules.length;
  const [spacing, setSpacing] = useState(150);
  const [centro, setCentro] = useState(1);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const pausedRef = useRef(false);

  useEffect(() => {
    const calc = () => setSpacing(window.innerWidth < 640 ? 96 : 150);
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let progress = 1; // posición (decimal) de la tarjeta que está al centro
    let speed = reduce ? 0 : VELOCIDAD_TARJETAS;
    let centroActual = -1;

    const colocar = () => {
      for (let i = 0; i < n; i += 1) {
        const el = cardRefs.current[i];
        if (!el) continue;

        // Distancia circular (decimal) de la tarjeta i al centro: -n/2 .. n/2
        let off = i - progress;
        off = (((off + n / 2) % n) + n) % n - n / 2;
        const abs = Math.abs(off);

        const x = off * spacing;
        const y = abs * abs * 9 - 22 * Math.max(0, 1 - abs);
        const scale =
          1.14 -
          0.17 * Math.min(abs, 1) -
          0.07 * Math.max(0, Math.min(abs, 3) - 1);
        const opacity = Math.max(0, Math.min(1, 1 - Math.max(0, abs - 1.6) / 1.2));
        const rotY = Math.max(-40, Math.min(40, -off * 14));
        const blur = abs > 1.5 ? (abs - 1.5) * 1.5 : 0;

        el.style.transform = `translate3d(${x}px, ${y}px, 0) rotateY(${rotY}deg) scale(${scale})`;
        el.style.opacity = String(opacity);
        el.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none";
        el.style.zIndex = String(Math.round(100 - abs * 10));
        el.style.pointerEvents = abs < 2.4 ? "auto" : "none";
      }

      const c = Math.round(progress) % n;
      if (c !== centroActual) {
        centroActual = c;
        setCentro(c);
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const objetivo = reduce || pausedRef.current ? 0 : VELOCIDAD_TARJETAS;
      speed += (objetivo - speed) * Math.min(1, dt * 5);
      progress = (progress + speed * dt) % n;

      colocar();
      raf = window.requestAnimationFrame(tick);
    };

    colocar();
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [n, spacing, reduce]);

  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-center"
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
    >
      {/* Escenario */}
      <div className="relative h-[340px] w-full [perspective:1200px] sm:h-[380px]">
        {/* Anillos + puntos orbitando */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[58%] size-[400px] -translate-x-1/2 -translate-y-1/2 sm:size-[520px]"
        >
          <div className="absolute inset-0 rounded-full border border-primary/15" />
          <div className="absolute inset-[14%] rounded-full border border-primary/12" />
          <div className="absolute inset-[28%] rounded-full border border-primary/10" />

          <div className="ce-orbit-spin absolute inset-0">
            <span className="absolute left-1/2 top-0 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_12px_rgba(124,58,237,0.8)]" />
            <span className="absolute bottom-[14%] right-[6%] size-1.5 rounded-full bg-fuchsia-400 shadow-[0_0_10px_rgba(232,121,249,0.8)]" />
          </div>
          <div className="ce-orbit-spin-rev absolute inset-[14%]">
            <span className="absolute left-0 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_12px_rgba(124,58,237,0.8)]" />
            <span className="absolute bottom-0 left-[58%] size-1.5 rounded-full bg-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
          </div>
        </div>

        {/* Halo con diente central */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[66%] size-[130px] -translate-x-1/2 -translate-y-1/2 sm:size-[150px]"
        >
          <span className="ce-hero-ring absolute inset-0 rounded-full border border-primary/40" />
          <span
            className="ce-hero-ring absolute inset-0 rounded-full border border-primary/40"
            style={{ animationDelay: "2.1s" }}
          />
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
            className="relative grid size-full place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#c4b5fd,#7c3aed_70%)] shadow-[0_30px_70px_rgba(124,58,237,0.45)]"
          >
            <div className="grid size-[62%] place-items-center rounded-full bg-white text-primary shadow-[inset_0_-6px_14px_rgba(124,58,237,0.15)]">
              <ToothIcon className="size-[52%]" />
            </div>
          </motion.div>
        </div>

        {/* Tarjetas girando en arco (posición, escala y opacidad las maneja el bucle de arriba) */}
        {modules.map((m, i) => (
          <div
            key={m.title}
            className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2"
          >
            <div
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              style={{ opacity: 0, willChange: "transform, opacity" }}
            >
              <ModuleCard module={m} active={i === centro} />
            </div>
          </div>
        ))}
      </div>

      {/* Indicador (solo informativo) */}
      <div aria-hidden="true" className="mt-3 flex items-center gap-2">
        {modules.map((m, i) => (
          <span
            key={m.title}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === centro ? "w-6 bg-fuchsia-500" : "w-2 bg-primary/25"
            }`}
          />
        ))}
      </div>

      <p className="mt-3 text-xs font-medium text-muted-foreground">
        Explorá todos los módulos de la plataforma
      </p>
    </div>
  );
}

function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  // Sentido de giro de la órbita de módulos (+1 avanza, -1 retrocede).
  const [giroDir, setGiroDir] = useState(1);

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

          {/* AURORA EN MOVIMIENTO (se suma a los glows estáticos) */}
          <motion.div
            aria-hidden="true"
            animate={{
              x: [0, 80, -30, 0],
              y: [0, 40, 80, 0],
              scale: [1, 1.18, 0.94, 1],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="pointer-events-none absolute left-[6%] top-[8%] size-[440px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(167,139,250,0.24) 0%, transparent 70%)",
            }}
          />

          <motion.div
            aria-hidden="true"
            animate={{
              x: [0, -70, 30, 0],
              y: [0, -45, -80, 0],
              scale: [1, 0.92, 1.15, 1],
            }}
            transition={{
              duration: 21,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="pointer-events-none absolute bottom-[2%] right-[8%] size-[460px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(232,121,249,0.2) 0%, transparent 70%)",
            }}
          />

          {/* PARTÍCULAS DE LUZ QUE SUBEN */}
          {HERO_SPARKS.map((spark, index) => (
            <span
              key={index}
              aria-hidden="true"
              className="ce-hero-spark pointer-events-none absolute bottom-6 rounded-full bg-primary/70 shadow-[0_0_14px_rgba(124,58,237,0.6)]"
              style={{
                left: spark.left,
                width: spark.size,
                height: spark.size,
                animationDelay: spark.delay,
                animationDuration: spark.duration,
              }}
            />
          ))}

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
                <span className="relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-primary/20 bg-lavender px-4 py-1.5 text-xs font-semibold text-lavender-foreground shadow-[0_0_22px_rgba(124,58,237,0.12)]">
                  <span
                    aria-hidden="true"
                    className="ce-badge-shine pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-white/70 to-transparent"
                  />

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
                    className="relative size-1.5 rounded-full bg-primary"
                  />
                  <span className="relative">
                    Software SaaS para clínicas odontológicas
                  </span>
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
                <div className="ce-hero-btn-glow rounded-xl shadow-[0_10px_30px_rgba(124,58,237,0.22)]">
                  <Button asChild variant="hero" size="xl">
                    <Link to="/registro">
                      Probar demo
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
                    </Link>
                  </Button>
                </div>

                <Button asChild variant="outlineBrand" size="xl">
                  <Link to="/demostracion">Contratar servicio</Link>
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
            <div className="relative mx-auto flex h-[440px] w-full max-w-[650px] items-center lg:h-[540px] lg:max-w-[700px]">
              <CarruselModulos />
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
              <div className="pointer-events-none absolute left-[16.66%] right-[16.66%] top-8 hidden h-0.5 overflow-visible md:block">
                <div className="absolute inset-0 rounded-full bg-primary/15" />

                <motion.div
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 1.3, delay: 0.3, ease: EASE }}
                  style={{ originX: 0 }}
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-primary via-purple-400 to-fuchsia-400"
                />

                {/* Brillo que recorre la línea (infinito) */}
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-y-0 w-24 rounded-full bg-gradient-to-r from-transparent via-white/80 to-transparent"
                  animate={{ x: ["-25%", "560%"] }}
                  transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* Luz que viaja de paso en paso (infinita) */}
                <motion.span
                  aria-hidden="true"
                  className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,0.95)]"
                  animate={{ left: ["0%", "50%", "100%"], scale: [1, 1.3, 1] }}
                  transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
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
                          <motion.div
                            animate={{ y: [0, -7, 0] }}
                            transition={{ duration: 3.2 + index * 0.4, repeat: Infinity, ease: "easeInOut" }}
                            className="relative"
                          >
                            {/* Anillos que laten (infinito) */}
                            <motion.span
                              aria-hidden="true"
                              className="absolute inset-0 rounded-2xl border-2 border-primary/30"
                              animate={{ scale: [1, 1.35, 1], opacity: [0.55, 0, 0.55] }}
                              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: index * 0.5 }}
                            />
                            <motion.span
                              aria-hidden="true"
                              className="pointer-events-none absolute -inset-3 rounded-[26px]"
                              animate={{ opacity: [0.25, 0.6, 0.25], scale: [0.92, 1.08, 0.92] }}
                              transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut", delay: index * 0.5 }}
                              style={{ background: "radial-gradient(circle, rgba(124,58,237,0.28) 0%, transparent 70%)" }}
                            />

                            <div className="relative flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-fuchsia-500 text-white shadow-[0_14px_34px_rgba(124,58,237,0.32)]">
                              <motion.span
                                animate={{ rotate: [-6, 6, -6] }}
                                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: index * 0.3 }}
                                className="inline-flex"
                              >
                                <StepIcon className="size-7" />
                              </motion.span>

                              <span className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/25 via-transparent to-transparent" />
                            </div>

                            <span className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full border border-primary/15 bg-white text-xs font-bold text-primary shadow-sm">
                              {index + 1}
                            </span>
                          </motion.div>
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
            PORTALES (exclusivo Enterprise)
        ========================================================= */}
        <PortalesEnterprise />

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
            CTA FINAL — LAPTOP QUE SE CIERRA/ABRE CON EL SCROLL
        ========================================================= */}
        <LaptopCta />
      </PublicLayout>
    </MotionConfig>
  );
}