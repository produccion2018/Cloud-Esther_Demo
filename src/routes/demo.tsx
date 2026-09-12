import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  TrendingUp,
  Users,
  CalendarDays,
  Stethoscope,
  Activity,
  PartyPopper,
  ArrowLeft,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Reveal } from "@/components/site/Reveal";
import { PlanGrid } from "@/components/site/PlanCards";
import type { Plan } from "@/lib/site-data";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Panel demo | Cloud Esther" },
      {
        name: "description",
        content:
          "Recorré el panel de Cloud Esther con datos de ejemplo: ingresos, pacientes, turnos, tratamientos y actividad de la clínica.",
      },
      { property: "og:title", content: "Panel demo de Cloud Esther" },
      {
        property: "og:description",
        content: "Ingresos, agenda, pacientes y actividad de la clínica con datos ficticios.",
      },
    ],
  }),
  component: Demo,
});

const kpis = [
  { label: "Ingresos del mes", value: "$2.480.500", delta: "+12,4%", icon: TrendingUp },
  { label: "Pacientes", value: "1.284", delta: "+42 nuevos", icon: Users },
  { label: "Turnos de hoy", value: "27", delta: "4 pendientes", icon: CalendarDays },
  { label: "Tratamientos activos", value: "96", delta: "+8 esta semana", icon: Stethoscope },
];

const bars = [48, 62, 55, 81, 70, 92, 76, 68, 85, 74, 90, 83];
const meses = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

const agenda = [
  { hora: "09:00", paciente: "Laura Gómez", trat: "Limpieza", prof: "Dra. Paula Arriaga" },
  { hora: "10:30", paciente: "Marcos Ruiz", trat: "Conducto", prof: "Dr. Iván Solís" },
  { hora: "12:00", paciente: "Sofía Paz", trat: "Ortodoncia", prof: "Dra. Paula Arriaga" },
  { hora: "15:15", paciente: "Martín Fernández", trat: "Control", prof: "Dra. Nadia Ríos" },
  { hora: "17:00", paciente: "Laura Gómez", trat: "Blanqueamiento", prof: "Dr. Iván Solís" },
];

const pacientes = [
  { nombre: "Laura Gómez", ultima: "Hoy", estado: "En tratamiento" },
  { nombre: "Marcos Ruiz", ultima: "Ayer", estado: "Control" },
  { nombre: "Sofía Paz", ultima: "Hace 3 días", estado: "Ortodoncia" },
  { nombre: "Martín Fernández", ultima: "Hace 1 semana", estado: "Alta" },
];

const actividad = [
  "Dra. Paula Arriaga cerró la historia clínica de Sofía Paz",
  "Recepción confirmó 6 turnos para mañana",
  "Se registró un pago de $86.000 de Marcos Ruiz",
  "Esther IA detectó 12 pacientes sin turno hace 8 meses",
];

function Demo() {
  const [selected, setSelected] = useState<Plan | null>(null);

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <Header />

      {/*
        ÁREA DE PANEL — sin sidebar.
        El layout deja libre la columna izquierda para integrar el sidebar propio:
        envolvé <main> en un flex y montá tu sidebar como primer hijo.
      */}
      <main className="flex-1 bg-soft">
        <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Clínica Dental Sonrisa</p>
                <h1 className="mt-1 text-3xl font-bold lg:text-4xl">Buenos días, Dra. Paula</h1>
              </div>
              <Button asChild variant="outlineBrand" size="sm">
                <Link to="/">
                  <ArrowLeft className="size-4" /> Volver al sitio
                </Link>
              </Button>
            </div>
          </Reveal>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((k, i) => (
              <Reveal key={k.label} delay={i * 0.08}>
                <motion.div
                  whileHover={{ y: -6 }}
                  className="card-premium h-full p-5 transition-shadow duration-300 hover:shadow-glow"
                >
                  <span className="bg-lavender flex size-10 items-center justify-center rounded-xl">
                    <k.icon className="size-5 text-primary" />
                  </span>
                  <p className="mt-4 text-2xl font-bold">{k.value}</p>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className="mt-2 text-xs font-medium text-primary">{k.delta}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-5">
            <Reveal className="lg:col-span-3">
              <div className="card-premium h-full p-6">
                <h2 className="text-sm font-semibold">Ingresos por mes</h2>
                <div className="mt-6 flex h-48 items-end gap-2">
                  {bars.map((b, i) => (
                    <motion.span
                      key={i}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${b}%` }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05, duration: 0.6, ease: "easeOut" }}
                      className="bg-brand flex-1 rounded-t-md"
                    />
                  ))}
                </div>
                <div className="mt-2 flex gap-2 text-[10px] text-muted-foreground">
                  {meses.map((m, i) => (
                    <span key={i} className="flex-1 text-center">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.1} className="lg:col-span-2">
              <div className="card-premium h-full p-6">
                <h2 className="text-sm font-semibold">Agenda de hoy</h2>
                <ul className="mt-4 space-y-3">
                  {agenda.map((a, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: 14 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08, duration: 0.45 }}
                      className="flex items-center gap-3 rounded-xl border border-border p-2.5 transition-colors hover:bg-lavender/60"
                    >
                      <span className="rounded-lg bg-lavender px-2 py-1 text-[11px] font-semibold text-lavender-foreground">
                        {a.hora}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{a.paciente}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {a.trat} · {a.prof}
                        </span>
                      </span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Reveal>
              <div className="card-premium h-full p-6">
                <h2 className="text-sm font-semibold">Pacientes recientes</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[380px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="py-2 text-left font-medium">Paciente</th>
                        <th className="py-2 text-left font-medium">Última visita</th>
                        <th className="py-2 text-left font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pacientes.map((p) => (
                        <tr
                          key={p.nombre}
                          className="border-b border-border transition-colors last:border-0 hover:bg-lavender/60"
                        >
                          <td className="py-2.5 font-medium">{p.nombre}</td>
                          <td className="py-2.5 text-muted-foreground">{p.ultima}</td>
                          <td className="py-2.5">
                            <span className="rounded-full bg-lavender px-2.5 py-1 text-[11px] font-medium text-lavender-foreground">
                              {p.estado}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="card-premium h-full p-6">
                <h2 className="text-sm font-semibold">Actividad</h2>
                <ul className="mt-4 space-y-3">
                  {actividad.map((a, i) => (
                    <motion.li
                      key={a}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08, duration: 0.45 }}
                      className="flex items-start gap-3"
                    >
                      <span className="bg-lavender mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg">
                        <Activity className="size-3.5 text-primary" />
                      </span>
                      <span className="text-sm text-muted-foreground">{a}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>

          {/* SELECCIÓN DE PLAN */}
          <section className="mt-16">
            <Reveal className="text-center">
              <h2 className="text-2xl font-bold text-balance lg:text-3xl">
                Elegí el plan que mejor se adapta a tu clínica.
              </h2>
              <p className="mt-3 text-muted-foreground">
                Podés cambiar de plan en cualquier momento desde la administración.
              </p>
            </Reveal>
            <div className="mt-10">
              <PlanGrid cta="Solicitar este plan" onSelect={(p) => setSelected(p)} />
            </div>
          </section>
        </div>
      </main>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
            className="fixed inset-0 z-100 flex items-center justify-center bg-foreground/40 p-5 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 240, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
              className="card-premium w-full max-w-md p-8 text-center"
            >
              <motion.span
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 240, damping: 14, delay: 0.1 }}
                className="bg-brand mx-auto flex size-16 items-center justify-center rounded-3xl"
              >
                <PartyPopper className="size-7 text-primary-foreground" />
              </motion.span>
              <h3 className="mt-6 text-2xl font-bold">¡Excelente elección!</h3>
              <p className="mt-2 text-sm text-muted-foreground">Has seleccionado:</p>
              <p className="text-gradient mt-1 text-xl font-bold">Plan {selected.name}</p>
              <Button
                variant="hero"
                size="lg"
                className="mt-7 w-full"
                onClick={() => setSelected(null)}
              >
                Continuar
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}
