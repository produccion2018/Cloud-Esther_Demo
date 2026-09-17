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
  CheckCircle2,
  ClipboardList,
  CalendarClock,
  UserX,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout, PageHero } from "@/components/site/PublicLayout";
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
    items: ["Agenda y gestión de citas", "Turnos", "Recordatorios", "Disponibilidad profesional"],
  },
  {
    icon: Users,
    title: "Pacientes",
    items: ["Gestión de pacientes", "Historia clínica", "Seguimiento", "Portal del paciente"],
  },
  {
    icon: Stethoscope,
    title: "Gestión clínica",
    items: ["Tratamientos", "Estudios y diagnóstico", "Documentos", "Laboratorio"],
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

function Caracteristicas() {
  return (
    <PublicLayout>
      <PageHero
        eyebrow="Características"
        title="Todo el poder de tu clínica en un solo lugar."
        subtitle="Módulos que se activan según lo que tu clínica necesita, hoy y a medida que crece."
      />

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <StaggerGroup className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat, index) => (
            <StaggerItem key={cat.title}>
              <motion.div
                whileHover={{ y: -8 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="card-premium group relative h-full overflow-hidden p-6 transition-shadow duration-300 hover:shadow-glow"
              >
                <span className="pointer-events-none absolute right-4 top-2 text-6xl font-extrabold leading-none text-primary/[0.10] transition-all duration-300 group-hover:scale-110 group-hover:text-primary/20">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div className="relative flex size-12 items-center justify-center">
                  <motion.span
                    animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.15, 0.5] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 rounded-2xl bg-primary/40 blur-md"
                  />
                  <span className="bg-lavender relative flex size-12 items-center justify-center rounded-2xl shadow-sm ring-2 ring-primary/25 transition-all duration-300 group-hover:scale-110 group-hover:ring-primary/60">
                    <cat.icon className="size-5.5 text-primary" />
                  </span>
                </div>

                <h3 className="relative mt-5 text-lg font-semibold">{cat.title}</h3>

                <ul className="relative mt-3 space-y-2.5">
                  {cat.items.map((it) => (
                    <li key={it} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="size-4 shrink-0 text-primary/60" />
                      {it}
                    </li>
                  ))}
                </ul>

                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary to-brand opacity-40 transition-opacity duration-300 group-hover:opacity-100" />
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24 lg:px-8">
        <Reveal>
          <div className="card-premium relative overflow-hidden p-8 lg:p-14">
            <div className="bg-glow pointer-events-none absolute inset-0" />

            <div className="relative grid items-center gap-10 lg:grid-cols-2">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-lavender px-3.5 py-1.5 text-xs font-semibold text-lavender-foreground">
                  <Sparkles className="size-3.5" />
                  Inteligencia artificial
                </span>
                <h2 className="mt-5 text-3xl font-bold lg:text-4xl">
                  <motion.span
                    className="bg-[linear-gradient(90deg,var(--color-primary),var(--color-brand),var(--color-primary))] bg-[length:200%_auto] bg-clip-text text-transparent"
                    animate={{ backgroundPosition: ["0% center", "200% center"] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  >
                    Esther IA
                  </motion.span>
                  , el asistente inteligente de tu clínica
                </h2>
                <p className="mt-4 text-muted-foreground">
                  Esther IA resume historias clínicas, sugiere horarios óptimos para la agenda,
                  detecta pacientes inactivos y te muestra qué está pasando con el rendimiento de la
                  clínica en lenguaje simple.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Button asChild variant="hero" size="lg">
                    <Link to="/registro">
                      Probar demo <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outlineBrand" size="lg">
                    <Link to="/planes">Ver planes</Link>
                  </Button>
                </div>
              </div>

              <div className="relative">
                <motion.span
                  initial={{ opacity: 0, scale: 0.6, y: -8 }}
                  whileInView={{ opacity: 1, scale: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, type: "spring" }}
                  className="absolute -top-4 right-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-lift"
                >
                  <Sparkles className="size-3.5" />
                  En vivo
                </motion.span>

                <div className="space-y-3 rounded-3xl border border-primary/15 bg-card/60 p-4 backdrop-blur-sm">
                  {aiInsights.map((insight, i) => (
                    <motion.div
                      key={insight.text}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.12 }}
                      className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 transition-colors duration-300 hover:border-primary/30"
                    >
                      <span className="bg-brand flex size-8 shrink-0 items-center justify-center rounded-xl">
                        <insight.icon className="size-4 text-primary-foreground" />
                      </span>
                      <p className="text-sm text-muted-foreground">{insight.text}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </PublicLayout>
  );
}