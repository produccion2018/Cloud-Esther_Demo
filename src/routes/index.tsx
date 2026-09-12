import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarCheck,
  Users,
  Stethoscope,
  Wallet,
  BarChart3,
  ShieldCheck,
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

const benefits = [
  {
    icon: CalendarCheck,
    title: "Agenda inteligente",
    desc: "Organizá turnos y disponibilidad.",
  },
  { icon: Users, title: "Gestión de pacientes", desc: "Toda la información en un solo lugar." },
  { icon: Stethoscope, title: "Gestión clínica", desc: "Tratamientos, historias y evolución." },
  {
    icon: Wallet,
    title: "Facturación y pagos",
    desc: "Control de ingresos, presupuestos y pagos.",
  },
  { icon: BarChart3, title: "Analítica", desc: "Información para tomar mejores decisiones." },
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
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-lavender px-3.5 py-1.5 text-xs font-semibold text-lavender-foreground"
            >
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
              <span className="text-gradient">Hazla crecer.</span>
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
                  <p className="font-display text-2xl font-bold text-primary">{s.k}</p>
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
                className="card-premium group h-full p-6 transition-shadow duration-300 hover:shadow-glow"
              >
                <span className="bg-lavender flex size-12 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                  <b.icon className="size-5.5 text-primary" />
                </span>
                <h3 className="mt-5 text-lg font-semibold">{b.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{b.desc}</p>
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
          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.12}>
                <div className="card-premium relative h-full p-7">
                  <span className="text-gradient font-display text-4xl font-bold">{s.n}</span>
                  <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
                </div>
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
          <div className="bg-brand shadow-glow relative overflow-hidden rounded-3xl px-8 py-14 text-center">
            <h2 className="text-3xl font-bold text-balance text-primary-foreground lg:text-4xl">
              Empezá a gestionar tu clínica con Cloud Esther
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
              Explorá la plataforma con datos de ejemplo o coordiná una demostración personalizada.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link to="/registro">Probar demo</Link>
              </Button>
              <Button asChild size="lg" variant="outlineBrand">
                <Link to="/demostracion">Solicitar demostración</Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </PublicLayout>
  );
}
