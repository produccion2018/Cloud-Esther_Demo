import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Check, CircleCheckBig, ArrowRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PublicLayout } from "@/components/site/PublicLayout";
import { modulesOfInterest } from "@/lib/site-data";

export const Route = createFileRoute("/demostracion")({
  head: () => ({
    meta: [
      { title: "Solicitar demostración | Cloud Esther" },
      {
        name: "description",
        content:
          "Coordiná una demostración personalizada de Cloud Esther: recorrido por el panel, plan de implementación y presupuesto.",
      },
      { property: "og:title", content: "Conocé Cloud Esther en una demostración personalizada" },
      {
        property: "og:description",
        content: "Recorrido por el panel, implementación, presupuesto y migración de historias.",
      },
    ],
  }),
  component: Demostracion,
});

const benefits = [
  "Recorrido por el panel",
  "Plan de implementación",
  "Presupuesto personalizado",
  "Plan de migración de historias",
];

function Demostracion() {
  const [selected, setSelected] = useState<string[]>([]);
  const [sent, setSent] = useState(false);

  const toggle = (m: string) =>
    setSelected((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));

  return (
    <PublicLayout>
      <section className="relative overflow-hidden bg-soft">
        <div className="bg-glow pointer-events-none absolute inset-x-0 top-0 h-96" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-16 lg:grid-cols-2 lg:px-8 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="lg:sticky lg:top-28 lg:self-start"
          >
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-lavender px-3.5 py-1.5 text-xs font-semibold text-lavender-foreground">
              Demostración personalizada
            </span>
            <h1 className="mt-5 text-3xl font-bold text-balance lg:text-4xl">
              Conocé Cloud Esther en una demostración personalizada.
            </h1>
            <p className="mt-4 text-muted-foreground">
              Un especialista te muestra la plataforma con el foco puesto en cómo trabaja tu
              clínica.
            </p>
            <ul className="mt-8 space-y-3">
              {benefits.map((b, i) => (
                <motion.li
                  key={b}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.45 }}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5"
                >
                  <span className="bg-lavender flex size-8 items-center justify-center rounded-lg">
                    <Check className="size-4 text-primary" />
                  </span>
                  <span className="text-sm font-medium">{b}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <AnimatePresence mode="wait">
            {!sent ? (
              <motion.form
                key="form"
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                onSubmit={(e) => {
                  e.preventDefault();
                  setSent(true);
                }}
                className="card-premium space-y-5 p-6 lg:p-8"
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre de contacto</Label>
                    <Input id="nombre" required placeholder="Dra. Paula Arriaga" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mail">Correo electrónico</Label>
                    <Input id="mail" type="email" required placeholder="paula@clinica.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tel">Teléfono</Label>
                    <Input id="tel" required placeholder="+54 11 5555 5555" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="suc">Número de sucursales</Label>
                    <select
                      id="suc"
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      {["1", "2", "3–4", "5–6", "7–15", "Más de 15"].map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="emp">Cantidad de empleados</Label>
                    <select
                      id="emp"
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      {["1–5", "6–15", "16–40", "41–100", "Más de 100"].map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Módulos de interés</Label>
                  <div className="flex flex-wrap gap-2">
                    {modulesOfInterest.map((m) => {
                      const active = selected.includes(m);
                      return (
                        <motion.button
                          type="button"
                          key={m}
                          onClick={() => toggle(m)}
                          whileTap={{ scale: 0.96 }}
                          className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-300 ${
                            active
                              ? "border-primary bg-lavender text-lavender-foreground shadow-soft"
                              : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                          }`}
                        >
                          <AnimatePresence initial={false}>
                            {active && (
                              <motion.span
                                initial={{ scale: 0, width: 0 }}
                                animate={{ scale: 1, width: "auto" }}
                                exit={{ scale: 0, width: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <Check className="size-3.5 text-primary" />
                              </motion.span>
                            )}
                          </AnimatePresence>
                          {m}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coment">Comentarios</Label>
                  <Textarea
                    id="coment"
                    rows={4}
                    placeholder="Contanos cómo trabaja tu clínica hoy."
                  />
                </div>

                <Button type="submit" variant="hero" size="xl" className="w-full">
                  Solicitar demostración <ArrowRight className="size-4" />
                </Button>
              </motion.form>
            ) : (
              <motion.div
                key="ok"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.45 }}
                className="card-premium flex flex-col items-center justify-center p-10 text-center"
              >
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 220, damping: 16, delay: 0.1 }}
                  className="bg-brand flex size-16 items-center justify-center rounded-3xl"
                >
                  <CircleCheckBig className="size-7 text-primary-foreground" />
                </motion.span>
                <h2 className="mt-6 text-2xl font-bold">¡Solicitud recibida!</h2>
                <p className="mt-3 text-muted-foreground">
                  Gracias por contactar a Cloud Esther. Nuestro equipo se pondrá en contacto contigo
                  para coordinar la demostración.
                </p>
                <Button asChild variant="outlineBrand" size="lg" className="mt-8">
                  <Link to="/">Volver al inicio</Link>
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </PublicLayout>
  );
}
