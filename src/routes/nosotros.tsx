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
  Sparkles,
  BriefcaseBusiness,
  ArrowRight,
  Building2,
  CalendarCheck,
  ThumbsUp,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout, PageHero } from "@/components/site/PublicLayout";
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
  { icon: Feather, title: "Simple", desc: "Una interfaz clara que el equipo aprende en un día." },
  { icon: Blocks, title: "Modular", desc: "Activá solo los módulos que tu clínica necesita." },
  { icon: TrendingUp, title: "Escalable", desc: "De un consultorio a un grupo con varias sedes." },
  { icon: ShieldCheck, title: "Seguro", desc: "Permisos por rol, cifrado y auditoría de accesos." },
  { icon: Sparkles, title: "Inteligente", desc: "Esther IA acompaña las decisiones del día a día." },
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
      <PageHero
        eyebrow="Nosotros"
        title="Tecnología para clínicas que quieren crecer."
        subtitle="Construimos Cloud Esther junto a profesionales que viven la gestión diaria de una clínica odontológica."
      />

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
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-12 text-center">
          <Button asChild variant="hero" size="xl">
            <Link to="/demostracion">
              Solicitar demostración <ArrowRight className="size-4" />
            </Link>
          </Button>
        </Reveal>
      </section>
    </PublicLayout>
  );
}