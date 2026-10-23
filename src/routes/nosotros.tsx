import { useEffect, useRef, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AnimatePresence,
  motion,
  MotionConfig,
  useMotionTemplate,
  useMotionValue,
  useScroll,
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
  ArrowUp,
  ArrowUpRight,
  Sparkles,
  Rocket,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/site/PublicLayout";
import { Reveal } from "@/components/site/Reveal";

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

/* ------------------------------ FOTOS DEL EQUIPO ------------------------------
   Archivos en: public/equipo/
   mireya.jpg · mauro.jpg · alejandro.jpg
------------------------------------------------------------------------------- */
const FOTOS: Record<string, string> = {
  mireya: "/equipo/mireya.jpg",
  mauro: "/equipo/mauro.jpg",
  alejandro: "/equipo/alejandro.jpg",
};

function fotoDe(id: string, manual?: string) {
  return manual ?? FOTOS[id];
}

/* ------------------------------ CONTENIDO ------------------------------ */

type Item = { icon: typeof Target; title: string; text: string; light?: boolean };

const ANCLAS = [
  { label: "Origen", href: "#origen" },
  { label: "Misión y visión", href: "#mision" },
  { label: "Valores", href: "#valores" },
  { label: "Equipo", href: "#equipo" },
];

const ORIGEN: Item[] = [
  {
    icon: Target,
    title: "El punto de partida",
    text: "Nace de una necesidad real: la gestión diaria de una clínica odontológica. Quienes la viven de cerca sabían qué faltaba, y quisimos resolverlo con tecnología.",
  },
  {
    icon: Blocks,
    title: "Construcción",
    text: "Desarrollamos una plataforma modular: pacientes, agenda, odontograma, tratamientos, facturación y reportes, en un solo lugar y en la nube.",
  },
  {
    icon: Sparkles,
    title: "Esther Infinity",
    text: "Sumamos inteligencia artificial que asiste al profesional: resúmenes clínicos, sugerencias de agenda y lectura del rendimiento de la clínica.",
  },
  {
    icon: MapPin,
    title: "Una empresa de Buenos Aires",
    text: "Cloud Esther se desarrolla en Buenos Aires, Argentina, enfocada en tecnología para la gestión odontológica.",
  },
  {
    icon: Rocket,
    title: "Hoy",
    text: "Una plataforma integral, modular y segura, pensada para crecer con cada clínica, del consultorio individual al grupo con varias sedes.",
    light: true,
  },
];

type MV = {
  icon: typeof Target;
  num: string;
  eyebrow: string;
  title: string;
  text: string;
  chips: string[];
};

const MISION: MV = {
  icon: Target,
  num: "01",
  eyebrow: "Nuestra misión",
  title: "Hacer simple lo complejo.",
  text: "Ayudar a las clínicas a centralizar su gestión y trabajar de manera más eficiente.",
  chips: ["Centralizar", "Eficiencia", "Simplicidad"],
};

const VISION: MV = {
  icon: Eye,
  num: "02",
  eyebrow: "Nuestra visión",
  title: "Una nueva forma de gestionar.",
  text: "Construir una plataforma integral para la gestión moderna de clínicas odontológicas.",
  chips: ["Integral", "Moderna", "Odontología"],
};

const VALORES = [
  {
    icon: Feather,
    title: "Simple",
    desc: "Una interfaz clara que el equipo aprende en un día.",
    detail:
      "Menos clics y menos capacitación: recepción y profesionales trabajan desde el primer día, sin manuales eternos.",
  },
  {
    icon: Blocks,
    title: "Modular",
    desc: "Activá solo los módulos que tu clínica necesita.",
    detail:
      "Empezás con lo esencial y sumás odontograma, facturación o reportes cuando los necesitás. Pagás y usás lo que tu clínica realmente usa.",
  },
  {
    icon: TrendingUp,
    title: "Escalable",
    desc: "De un consultorio a un grupo con varias sedes.",
    detail:
      "La misma plataforma acompaña a un consultorio individual y a un grupo con varias sedes, con la información unificada.",
  },
  {
    icon: ShieldCheck,
    title: "Seguro",
    desc: "Permisos por rol, cifrado y auditoría de accesos.",
    detail:
      "Cada persona ve solo lo que le corresponde: permisos por rol, información cifrada y registro de quién accedió a qué.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Profesional",
    desc: "Pensado junto a odontólogos y equipos de gestión.",
    detail:
      "Cada módulo se diseñó junto a odontólogos y equipos de gestión, mirando el día a día real de una clínica.",
  },
];

const EQUIPO: {
  id: string;
  iniciales: string;
  nombre: string;
  rol: string;
  bio: string;
  chips: string[];
  foto?: string;
  links?: { label: string; href: string }[];
}[] = [
  {
    id: "mireya",
    iniciales: "MB",
    nombre: "Mireya Becerra Méndez",
    rol: "Asistente e higienista dental",
    bio: "Más de 30 años de experiencia en el ámbito odontológico. Su trayectoria y el contacto con distintas especialidades le permiten conocer las necesidades reales de las clínicas y de los profesionales.",
    chips: ["Higiene dental", "Asistencia clínica"],
    links: [],
  },
  {
    id: "mauro",
    iniciales: "MP",
    nombre: "Mauro Pinto",
    rol: "CEO",
    bio: "Licenciado en Comunicación Audiovisual y programador full stack, con especialización y enfoque en inteligencia artificial. Impulsa la visión del producto, la experiencia digital y el desarrollo de soluciones tecnológicas para el sector odontológico.",
    chips: ["Full stack", "Inteligencia artificial", "Comunicación audiovisual"],
    links: [],
  },
  {
    id: "alejandro",
    iniciales: "AB",
    nombre: "Alejandro Becerra Méndez Tobar",
    rol: "Tecnólogo en ingeniería electrónica · Especialista en IA",
    bio: "Aporta el perfil técnico y la mirada de innovación: desarrollo tecnológico e integración de soluciones inteligentes dentro de Cloud Esther.",
    chips: ["Electrónica", "Inteligencia artificial"],
    links: [],
  },
];

const GLOWS = ["bg-rose-700/35", "bg-violet-600/35", "bg-sky-600/30"];

/* ------------------------------ PIEZAS ------------------------------ */

function GradientText({ children }: { children: ReactNode }) {
  return (
    <motion.span
      animate={{ backgroundPosition: ["0% center", "200% center"] }}
      transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      className="bg-[linear-gradient(90deg,#a78bfa,#60a5fa,#c084fc,#a78bfa)] bg-[length:200%_auto] bg-clip-text text-transparent [-webkit-text-fill-color:transparent]"
    >
      {children}
    </motion.span>
  );
}

function Aurora() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <motion.div
        animate={{ x: [-60, 90, -60], y: [0, 50, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -left-32 top-0 size-[560px] rounded-full bg-violet-600/35 blur-[130px]"
      />
      <motion.div
        animate={{ x: [80, -70, 80], y: [0, -40, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 19, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -right-24 top-20 size-[520px] rounded-full bg-sky-500/25 blur-[130px]"
      />
      <motion.div
        animate={{ x: [0, 60, 0], y: [0, -50, 0], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[-160px] left-1/3 size-[480px] rounded-full bg-fuchsia-600/25 blur-[130px]"
      />
      <div className="absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,.05)_1px,transparent_1px)] [background-size:28px_28px]" />
    </div>
  );
}

function SectionHead({
  title,
  sub,
  eyebrow,
  light,
}: {
  title: string;
  sub?: string;
  eyebrow?: string;
  light?: boolean;
}) {
  return (
    <Reveal className="mx-auto mb-14 max-w-2xl text-center">
      {eyebrow && (
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-violet-600">
          {eyebrow}
        </p>
      )}
      <h2
        className={`font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl ${
          light ? "text-[#1b1233]" : ""
        }`}
      >
        {title}
      </h2>
      {sub && <p className={`mt-4 ${light ? "text-[#1b1233]/55" : "text-white/60"}`}>{sub}</p>}
    </Reveal>
  );
}

function Timeline({ items }: { items: Item[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 65%", "end 55%"],
  });
  const height = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <div ref={ref} className="relative mx-auto max-w-5xl">
      <div className="absolute left-5 top-0 h-full w-px bg-white/10 lg:left-1/2" />
      <motion.div
        style={{ height }}
        className="absolute left-5 top-0 w-px bg-gradient-to-b from-violet-400 via-indigo-400 to-sky-400 shadow-[0_0_14px_rgba(139,92,246,.9)] lg:left-1/2"
      />

      <ul className="space-y-8">
        {items.map((it, i) => {
          const Icon = it.icon;
          const left = i % 2 === 0;

          return (
            <motion.li
              key={it.title}
              initial={{ opacity: 0, x: left ? -24 : 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, ease: EASE }}
              className="relative pl-14 lg:grid lg:grid-cols-2 lg:pl-0"
            >
              <span className="absolute left-5 top-10 z-10 grid -translate-x-1/2 -translate-y-1/2 place-items-center lg:left-1/2">
                <motion.span
                  animate={{ scale: [1, 2.6], opacity: [0.6, 0] }}
                  transition={{ duration: 2.6, delay: i * 0.4, repeat: Infinity, ease: "easeOut" }}
                  className="absolute size-3 rounded-full bg-violet-400"
                />
                <span className="size-3 rounded-full bg-white shadow-[0_0_14px_#a78bfa]" />
              </span>

              <div
                className={`relative ${
                  left ? "lg:col-start-1 lg:pr-14" : "lg:col-start-2 lg:pl-14"
                }`}
              >
                <span
                  className={`absolute top-10 hidden h-px w-14 bg-white/25 lg:block ${
                    left ? "right-0" : "left-0"
                  }`}
                />

                <div
                  className={`rounded-3xl border p-5 transition-all duration-300 hover:-translate-y-1 ${
                    it.light
                      ? "border-white bg-white text-slate-900 shadow-[0_20px_60px_rgba(139,92,246,.35)]"
                      : "border-white/10 bg-white/[0.04] backdrop-blur-md hover:border-violet-400/40 hover:bg-white/[0.07]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                        it.light
                          ? "bg-violet-100 text-violet-700"
                          : "bg-gradient-to-br from-violet-500 to-sky-500 text-white"
                      }`}
                    >
                      <Icon className="size-5" />
                    </span>
                    <h3 className="text-lg font-semibold leading-snug">{it.title}</h3>
                  </div>
                  <p
                    className={`mt-3 text-sm leading-7 ${
                      it.light ? "text-slate-600" : "text-white/65"
                    }`}
                  >
                    {it.text}
                  </p>
                </div>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

const PARTICLES = [
  { x: "6%", y: "18%", s: 6, d: 0 },
  { x: "30%", y: "14%", s: 4, d: 1.2 },
  { x: "26%", y: "78%", s: 9, d: 0.6 },
  { x: "58%", y: "66%", s: 5, d: 2 },
  { x: "70%", y: "30%", s: 6, d: 0.3 },
  { x: "78%", y: "82%", s: 7, d: 1.6 },
  { x: "92%", y: "22%", s: 5, d: 0.9 },
  { x: "48%", y: "90%", s: 4, d: 2.4 },
];

function MVBlock({ data, align }: { data: MV; align: "left" | "right" }) {
  const Icon = data.icon;
  const right = align === "right";

  const mx = useMotionValue(200);
  const my = useMotionValue(120);
  const spotlight = useMotionTemplate`radial-gradient(340px circle at ${mx}px ${my}px, rgba(167,139,250,.22), transparent 70%)`;

  return (
    <motion.div
      initial={{ opacity: 0, x: right ? 40 : -40, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, ease: EASE }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set(e.clientX - r.left);
        my.set(e.clientY - r.top);
      }}
      className={`group relative overflow-hidden rounded-[32px] border border-violet-100 bg-white/70 p-7 shadow-[0_24px_70px_rgba(124,58,237,.10)] backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_30px_90px_rgba(124,58,237,.20)] sm:p-9 ${
        right ? "lg:text-right" : ""
      }`}
    >
      <motion.span
        aria-hidden="true"
        style={{ background: spotlight }}
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />

      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -top-4 select-none font-display text-[9rem] font-bold leading-none text-violet-500/[0.07] ${
          right ? "left-4" : "right-4"
        }`}
      >
        {data.num}
      </span>

      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/60 to-transparent"
      />

      <div className="relative">
        <div className={`flex items-center gap-4 ${right ? "lg:flex-row-reverse" : ""}`}>
          <div className="relative grid size-16 shrink-0 place-items-center">
            <motion.span
              aria-hidden="true"
              animate={{ scale: [1, 1.7], opacity: [0.45, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
              className="absolute inset-0 rounded-full border border-violet-400"
            />
            <motion.span
              aria-hidden="true"
              animate={{ scale: [1, 1.7], opacity: [0.45, 0] }}
              transition={{ duration: 3, delay: 1.5, repeat: Infinity, ease: "easeOut" }}
              className="absolute inset-0 rounded-full border border-violet-400"
            />
            <span className="relative grid size-14 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-[0_12px_32px_rgba(124,58,237,.45)]">
              <Icon className="size-6" />
            </span>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-violet-600">
            {data.eyebrow}
          </span>
        </div>

        <h3 className="mt-7 font-display text-3xl font-bold leading-[1.1] tracking-tight text-[#1b1233] sm:text-4xl lg:text-[2.6rem]">
          {data.title}
        </h3>
        <p
          className={`mt-5 max-w-md text-base leading-8 text-[#1b1233]/60 ${
            right ? "lg:ml-auto" : ""
          }`}
        >
          {data.text}
        </p>

        <div className={`mt-6 flex flex-wrap gap-2 ${right ? "lg:justify-end" : ""}`}>
          {data.chips.map((c) => (
            <span
              key={c}
              className="rounded-full border border-violet-200/80 bg-violet-50/70 px-3.5 py-1 text-xs font-medium text-violet-700"
            >
              {c}
            </span>
          ))}
        </div>

        <motion.span
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, delay: 0.4, ease: EASE }}
          style={{ transformOrigin: right ? "right" : "left" }}
          className={`mt-8 block h-px w-full max-w-sm bg-gradient-to-r ${
            right
              ? "from-transparent via-violet-300 to-violet-600 lg:ml-auto"
              : "from-violet-600 via-violet-300 to-transparent"
          }`}
        />
      </div>
    </motion.div>
  );
}

function MisionVision() {
  return (
    <div className="relative mx-auto max-w-6xl">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {PARTICLES.map((p, i) => (
          <motion.span
            key={i}
            animate={{ y: [0, -14, 0], opacity: [0.35, 0.9, 0.35] }}
            transition={{ duration: 5 + (i % 3), delay: p.d, repeat: Infinity, ease: "easeInOut" }}
            style={{ left: p.x, top: p.y, width: p.s, height: p.s }}
            className="absolute rounded-full bg-violet-400/70"
          />
        ))}
      </div>

      <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_190px_1fr] lg:gap-4">
        <MVBlock data={MISION} align="left" />

        <div aria-hidden="true" className="relative mx-auto hidden h-[380px] w-[190px] lg:block">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
              className="relative size-[420px] rounded-full border border-dashed border-violet-300/60"
            >
              <span className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-violet-500 shadow-[0_0_14px_rgba(139,92,246,.9)]" />
              <span className="absolute -bottom-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-fuchsia-400" />
            </motion.div>
          </div>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
              className="relative size-[300px] rounded-full border border-violet-200"
            >
              <span className="absolute -left-1 top-1/2 size-2 -translate-y-1/2 rounded-full bg-violet-400" />
              <span className="absolute -right-1 top-[30%] size-1.5 rounded-full bg-sky-400" />
            </motion.div>
          </div>
          <div className="absolute left-1/2 top-1/2 size-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-300/20 blur-[90px]" />

          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-violet-300 to-transparent" />
          <span className="absolute left-1/2 top-[8%] size-2 -translate-x-1/2 rounded-full bg-violet-300" />
          <span className="absolute left-1/2 top-[24%] size-2.5 -translate-x-1/2 rounded-full bg-violet-600" />
          <span className="absolute left-1/2 top-[88%] size-2.5 -translate-x-1/2 rounded-full bg-violet-300" />

          <div className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center">
            <motion.span
              animate={{ scale: [1, 2], opacity: [0.5, 0] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeOut" }}
              className="absolute size-14 rounded-full border border-violet-400"
            />
            <span className="grid size-14 place-items-center rounded-full border border-dashed border-violet-300 bg-white/90 shadow-[0_10px_30px_rgba(124,58,237,.25)]">
              <Sparkles className="size-5 text-violet-600" />
            </span>
          </div>
        </div>

        <MVBlock data={VISION} align="right" />
      </div>
    </div>
  );
}

const CICLO = 3.2;

function Valores() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setActive((a) => (a + 1) % VALORES.length), CICLO * 1000);
    return () => clearInterval(t);
  }, [paused, active]);

  const progress = (active / (VALORES.length - 1)) * 80;
  const current = VALORES[active];

  return (
    <div className="relative mx-auto max-w-6xl" onMouseLeave={() => setPaused(false)}>
      <div
        aria-hidden="true"
        className="absolute left-[10%] right-[10%] top-[44px] hidden h-px bg-violet-200/80 lg:block"
      />
      <motion.div
        aria-hidden="true"
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.9, ease: EASE }}
        className="absolute left-[10%] top-[44px] hidden h-[2px] -translate-y-1/2 bg-gradient-to-r from-violet-700 via-violet-500 to-transparent lg:block"
      />

      <ul className="relative grid grid-cols-2 gap-x-4 gap-y-12 lg:grid-cols-5">
        {VALORES.map((v, i) => {
          const Icon = v.icon;
          const on = i === active;

          return (
            <motion.li
              key={v.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, delay: i * 0.08, ease: EASE }}
              onMouseEnter={() => {
                setPaused(true);
                setActive(i);
              }}
              onClick={() => setActive(i)}
              className="flex cursor-pointer flex-col items-center text-center"
            >
              <motion.div
                animate={{ scale: on ? 1.12 : 1, y: on ? -4 : 0 }}
                transition={{ type: "spring", stiffness: 240, damping: 18 }}
                className={`relative grid size-[88px] place-items-center rounded-full border bg-white transition-shadow duration-500 ${
                  on
                    ? "border-violet-200 shadow-[0_0_0_10px_rgba(167,139,250,.14),0_18px_50px_rgba(124,58,237,.35)]"
                    : "border-violet-100 shadow-[0_6px_20px_rgba(124,58,237,.08)]"
                }`}
              >
                {on && (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 88 88"
                    className="pointer-events-none absolute inset-0 -rotate-90"
                  >
                    <motion.circle
                      key={`${active}-${paused}`}
                      cx="44"
                      cy="44"
                      r="42"
                      fill="none"
                      stroke="#7c3aed"
                      strokeWidth="2"
                      strokeLinecap="round"
                      initial={{ pathLength: paused ? 1 : 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: paused ? 0.4 : CICLO, ease: "linear" }}
                    />
                  </svg>
                )}
                <span
                  className={`grid size-12 place-items-center rounded-full transition-colors duration-500 ${
                    on
                      ? "bg-gradient-to-br from-violet-500 to-purple-700 text-white"
                      : "bg-violet-50 text-violet-600"
                  }`}
                >
                  <Icon className="size-5" />
                </span>
              </motion.div>

              <h3
                className={`mt-6 font-display text-base font-bold transition-colors duration-500 ${
                  on ? "text-violet-700" : "text-[#1b1233]"
                }`}
              >
                {v.title}
              </h3>
              <p className="mt-2 max-w-[200px] text-sm leading-6 text-[#1b1233]/55">{v.desc}</p>
            </motion.li>
          );
        })}
      </ul>

      <div className="mx-auto mt-16 max-w-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
            transition={{ duration: 0.45, ease: EASE }}
            className="relative overflow-hidden rounded-3xl border border-violet-100 bg-white/80 p-7 text-center shadow-[0_24px_70px_rgba(124,58,237,.14)] backdrop-blur-xl"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/70 to-transparent"
            />
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-violet-600">
              {String(active + 1).padStart(2, "0")} / {String(VALORES.length).padStart(2, "0")} ·{" "}
              {current.title}
            </p>
            <p className="mt-3 text-lg leading-8 text-[#1b1233]/75">{current.detail}</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Equipo() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 65%", "end 60%"],
  });
  const height = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <div ref={ref} className="relative mx-auto max-w-6xl">
      <div className="absolute left-[41.667%] top-0 hidden h-full w-px bg-white/10 lg:block" />
      <motion.div
        style={{ height }}
        className="absolute left-[41.667%] top-0 hidden w-px bg-gradient-to-b from-white via-violet-300 to-sky-400 shadow-[0_0_14px_rgba(167,139,250,.9)] lg:block"
      />

      <ul className="space-y-24 lg:space-y-32">
        {EQUIPO.map((p, i) => {
          const foto = fotoDe(p.id, p.foto);

          return (
            <motion.li
              key={p.id}
              initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.9, ease: EASE, delay: i * 0.12 }}
              animate={{ y: [0, -10, 0] }}
              style={{ willChange: "transform" }}
              className="relative lg:grid lg:grid-cols-12"
            >
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute right-0 top-1/2 -z-10 size-[420px] -translate-y-1/2 rounded-full blur-[130px] ${GLOWS[i % GLOWS.length]}`}
              />

              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{
                  duration: 4.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.6,
                }}
                className="lg:col-span-5"
              >
                <h3 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                  {p.nombre}
                </h3>

                <span className="mt-10 block size-1.5 rounded-full bg-white" />

                <div className="relative mt-5 size-60 sm:size-72 lg:size-80">
                  <motion.span
                    aria-hidden="true"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                    className="absolute -inset-1 rounded-full bg-[conic-gradient(from_0deg,transparent,#a78bfa,#38bdf8,transparent_60%)] opacity-80"
                  />

                  <motion.div
                    animate={{ scale: [1, 1.04, 1] }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.9,
                    }}
                    className="absolute inset-0 grid place-items-center overflow-hidden rounded-full bg-[#0d0a1f] text-6xl font-bold text-white/80 ring-1 ring-white/10"
                  >
                    {foto ? (
                      <img
                        src={foto}
                        alt={p.nombre}
                        loading="lazy"
                        className="size-full object-cover grayscale transition duration-700 hover:scale-105 hover:grayscale-0"
                      />
                    ) : (
                      <span className="bg-gradient-to-br from-white to-violet-300 bg-clip-text text-transparent">
                        {p.iniciales}
                      </span>
                    )}
                  </motion.div>
                </div>
              </motion.div>

              <div className="relative mt-10 lg:col-span-7 lg:mt-0 lg:pl-12 lg:pt-24">
                <span className="absolute left-0 top-[8.6rem] z-10 hidden -translate-x-1/2 place-items-center lg:grid">
                  <motion.span
                    animate={{ scale: [1, 2.6], opacity: [0.6, 0] }}
                    transition={{ duration: 2.6, delay: i * 0.5, repeat: Infinity, ease: "easeOut" }}
                    className="absolute size-3 rounded-full bg-violet-300"
                  />
                  <span className="size-3 rounded-full bg-white shadow-[0_0_14px_#a78bfa]" />
                </span>
                <span className="absolute left-0 top-[8.6rem] hidden h-px w-12 bg-white/40 lg:block" />

                <motion.div
                  initial={{ opacity: 0, x: 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.9, delay: 0.15, ease: EASE }}
                  animate={{ y: [0, -6, 0] }}
                  className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.09] to-white/[0.02] p-7 shadow-[0_30px_80px_rgba(0,0,0,.45)] backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-violet-300/30 sm:p-8"
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"
                  />
                  <motion.span
                    aria-hidden="true"
                    animate={{ opacity: [0.2, 0.8, 0.2] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
                    className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-violet-500/20 blur-[70px]"
                  />

                  <h4 className="font-display text-xl font-semibold text-white">{p.rol}</h4>
                  <p className="mt-4 text-[15px] leading-7 text-white/65">{p.bio}</p>

                  <div className="mt-6 flex flex-wrap gap-2.5">
                    {p.chips.map((c) => (
                      <span
                        key={c}
                        className="rounded-full border border-white/20 bg-white/[0.03] px-4 py-1.5 text-xs text-white/75 transition-colors hover:border-violet-300/60 hover:text-white"
                      >
                        {c}
                      </span>
                    ))}
                  </div>

                  {p.links && p.links.length > 0 && (
                    <div className="mt-7 flex flex-wrap gap-x-8 gap-y-3">
                      {p.links.map((l) => (
                        <a
                          key={l.href}
                          href={l.href}
                          target="_blank"
                          rel="noreferrer"
                          className="group/link inline-flex items-center gap-2 text-sm font-medium text-white transition-colors hover:text-violet-300"
                        >
                          {l.label}
                          <ArrowUpRight className="size-4 transition-transform group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5" />
                        </a>
                      ))}
                    </div>
                  )}
                </motion.div>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

function ScrollRing() {
  const { scrollYProgress } = useScroll();

  return (
    <button
      type="button"
      aria-label="Volver arriba"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-40 grid size-12 place-items-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur transition hover:border-violet-400/60"
    >
      <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90">
        <motion.circle
          cx="24"
          cy="24"
          r="22"
          fill="none"
          stroke="#a78bfa"
          strokeWidth="2"
          strokeLinecap="round"
          style={{ pathLength: scrollYProgress }}
        />
      </svg>
      <ArrowUp className="size-4" />
    </button>
  );
}

function Nosotros() {
  return (
    <PublicLayout>
      <MotionConfig reducedMotion="user">
        <div className="relative bg-[#07060f] text-white">
          <section className="relative isolate overflow-hidden">
            <Aurora />

            <div className="mx-auto max-w-6xl px-5 pb-24 pt-20 lg:px-8 lg:pb-32 lg:pt-28">
              <h1 className="font-display text-5xl font-bold leading-[1.03] tracking-[-0.03em] sm:text-6xl lg:text-7xl">
                <motion.span
                  initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.9, ease: EASE }}
                  className="block"
                >
                  Tecnología para clínicas
                </motion.span>
                <motion.span
                  initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.9, delay: 0.25, ease: EASE }}
                  className="block"
                >
                  <GradientText>que quieren crecer.</GradientText>
                </motion.span>
              </h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.7 }}
                className="mt-7 max-w-xl text-base leading-8 text-white/65 lg:text-lg"
              >
                Construimos Cloud Esther junto a profesionales que viven la gestión diaria de una
                clínica odontológica.
              </motion.p>

              <motion.nav
                aria-label="Secciones de la página"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.95 }}
                className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm"
              >
                {ANCLAS.map((a) => (
                  <a
                    key={a.href}
                    href={a.href}
                    className="text-white/50 underline-offset-8 transition-colors hover:text-white hover:underline"
                  >
                    {a.label}
                  </a>
                ))}
              </motion.nav>
            </div>
          </section>

          <section id="origen" className="scroll-mt-20 px-5 py-20 lg:px-8 lg:py-28">
            <SectionHead title="De dónde viene" sub="Una idea que creció desde la clínica hacia la tecnología." />
            <Timeline items={ORIGEN} />
          </section>

          <section
            id="mision"
            className="relative scroll-mt-20 overflow-hidden bg-gradient-to-b from-[#fbf8ff] via-white to-[#f7f2ff] px-5 py-24 text-[#1b1233] lg:px-8 lg:py-32"
          >
            <SectionHead
              light
              eyebrow="Nuestra misión y visión"
              title="Hacer simple lo complejo."
              sub="Creamos Cloud Esther para que cada clínica pueda organizarse mejor, crecer con más claridad y cuidar a sus pacientes con una experiencia más humana."
            />
            <MisionVision />
          </section>

          <section
            id="valores"
            className="relative scroll-mt-20 overflow-hidden bg-gradient-to-b from-[#f7f2ff] via-[#fbf8ff] to-white px-5 py-24 text-[#1b1233] lg:px-8 lg:py-32"
          >
            <motion.div
              aria-hidden="true"
              animate={{ x: ["-100%", "300%"] }}
              transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
              className="pointer-events-none absolute top-0 h-px w-1/3 bg-gradient-to-r from-transparent via-violet-400/70 to-transparent"
            />
            <SectionHead
              light
              eyebrow="Nuestros valores"
              title="Principios que guían cada decisión."
              sub="La simplicidad, modularidad, escalabilidad y seguridad son el criterio con el que construimos cada parte de la plataforma."
            />
            <Valores />
          </section>

          <section
            id="equipo"
            className="relative scroll-mt-20 overflow-hidden px-5 py-24 lg:px-8 lg:py-32"
          >
            <SectionHead
              title="Las personas detrás de Cloud Esther"
              sub="Experiencia clínica, visión de producto e innovación tecnológica."
            />
            <Equipo />
          </section>

          <section className="relative isolate overflow-hidden px-5 py-24 text-center lg:px-8">
            <motion.div
              aria-hidden="true"
              animate={{ opacity: [0.25, 0.55, 0.25], scale: [0.95, 1.1, 0.95] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/30 blur-[130px]"
            />
            <Reveal>
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                <GradientText>Llevá tu clínica a Cloud Esther.</GradientText>
              </h2>
              <motion.div
                animate={{
                  boxShadow: ["0 0 0 #7c3aed00", "0 0 40px #7c3aed55", "0 0 0 #7c3aed00"],
                }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="mt-8 inline-flex rounded-2xl"
              >
                <Button asChild variant="hero" size="xl">
                  <Link to="/demostracion">
                    Contratar servicio
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </motion.div>
            </Reveal>
          </section>

          <ScrollRing />
        </div>
      </MotionConfig>
    </PublicLayout>
  );
}

export default Nosotros;