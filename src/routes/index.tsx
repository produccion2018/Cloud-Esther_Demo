import { createFileRoute, Link } from "@tanstack/react-router";
import { animate, motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarCheck,
  Users,
  Stethoscope,
  Wallet,
  BarChart3,
  ShieldCheck,
  FileText,
  FlaskConical,
  Briefcase,
  BellRing,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/site/PublicLayout";
import { DashboardMockup } from "@/components/site/DashboardMockup";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/site/Reveal";
import { FaqCards } from "@/components/site/FaqCards";
import { faqs } from "@/lib/site-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cloud Esther — Gestioná tu clínica odontológica" },
      {
        name: "description",
        content:
          "Plataforma inteligente para administrar pacientes, turnos, tratamientos y finanzas de tu clínica desde un solo lugar.",
      },
      { property: "og:title", content: "Cloud Esther — Gestioná tu clínica. Hacela crecer." },
      {
        property: "og:description",
        content: "Agenda, pacientes, tratamientos, facturación y analítica en una sola plataforma.",
      },
    ],
  }),
  component: Index,
});

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
  },
  {
    n: "03",
    title: "Empezá a gestionar",
    desc: "Administrá pacientes, turnos, tratamientos y mucho más.",
  },
];

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
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.24 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Button asChild variant="hero" size="xl">
                <Link to="/registro">
                  Probar demo <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outlineBrand" size="xl">
                <Link to="/demostracion">Solicitar demostración</Link>
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="mt-10 grid max-w-md grid-cols-3 gap-4"
            >
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
            </motion.div>
          </div>

          <div className="lg:pr-12 lg:pl-6">
            <DashboardMockup />
          </div>
        </div>
      </section>

      {/* BENEFICIOS */}
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-balance lg:text-4xl">
            Todo lo que tu clínica necesita.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Módulos pensados para el día a día de una clínica odontológica moderna.
          </p>
        </Reveal>

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
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-balance lg:text-4xl">
              Simplificá la gestión de tu clínica.
            </h2>
          </Reveal>
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
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ RESUMIDA */}
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold lg:text-4xl">Preguntas frecuentes</h2>
          <p className="mt-4 text-muted-foreground">
            Las consultas más habituales sobre Cloud Esther.
          </p>
        </Reveal>
        <div className="mt-12">
          <FaqCards items={faqs.slice(0, 4)} />
        </div>
        <Reveal className="mt-10 text-center">
          <Button asChild variant="soft" size="lg">
            <Link to="/preguntas-frecuentes">
              Ver todas las preguntas <ArrowRight className="size-4" />
            </Link>
          </Button>
        </Reveal>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-5 pb-24 lg:px-8">
        <Reveal>
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
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </PublicLayout>
  );
}