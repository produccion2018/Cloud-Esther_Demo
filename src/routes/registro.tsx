import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { MailCheck, ArrowRight, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PublicLayout } from "@/components/site/PublicLayout";
import { plans } from "@/lib/site-data";
import { mapSitePlanToPlanId, setStoredPlan } from "@/lib/cloud-esther/data";

export const Route = createFileRoute("/registro")({
  validateSearch: (search: Record<string, unknown>): { plan?: string } => {
    const plan = search["plan"];
    return typeof plan === "string" ? { plan } : {};
  },
  head: () => ({
    meta: [
      { title: "Probar demo | Cloud Esther" },
      {
        name: "description",
        content:
          "Creá tu cuenta de prueba en Cloud Esther y explorá el panel de gestión de tu clínica odontológica.",
      },
      { property: "og:title", content: "Probá Cloud Esther con tu propia clínica" },
      { property: "og:description", content: "Creá tu cuenta y explorá la plataforma." },
    ],
  }),
  component: Registro,
});

function Registro() {
  const { plan } = Route.useSearch();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(plan ?? "profesional");
  const [sent, setSent] = useState(false);

  return (
    <PublicLayout>
      <section className="relative overflow-hidden bg-soft">
        <div className="bg-glow pointer-events-none absolute inset-x-0 top-0 h-96" />
        <div className="relative mx-auto max-w-3xl px-5 py-16 lg:px-8 lg:py-24">
          <AnimatePresence mode="wait">
            {!sent ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.45 }}
              >
                <div className="text-center">
                  <h1 className="text-3xl font-bold text-balance lg:text-4xl">
                    Probá Cloud Esther con tu propia clínica.
                  </h1>
                  <p className="mt-4 text-muted-foreground">
                    Creá tu cuenta y explorá la plataforma.
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setStoredPlan(mapSitePlanToPlanId(selected));
                    setSent(true);
                  }}
                  className="card-premium mt-10 space-y-5 p-6 lg:p-8"
                >
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="clinica">Nombre de la clínica</Label>
                      <Input id="clinica" required placeholder="Clínica Dental Esther" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contacto">Nombre de contacto</Label>
                      <Input id="contacto" required placeholder="Esther Méndez" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Correo electrónico</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        placeholder="esther.mendez@esther.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pass">Contraseña</Label>
                      <Input id="pass" type="password" required placeholder="••••••••" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Seleccioná tu plan</Label>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {plans.map((p) => (
                        <motion.button
                          type="button"
                          key={p.id}
                          whileHover={{ y: -4 }}
                          onClick={() => setSelected(p.id)}
                          className={`cursor-pointer rounded-2xl border p-4 text-left transition-all duration-300 ${
                            selected === p.id
                              ? "border-primary bg-lavender shadow-soft"
                              : "border-border bg-card hover:border-primary/40"
                          }`}
                        >
                          <span className="block text-sm font-semibold">{p.name}</span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {p.price} / mes
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <Button type="submit" variant="hero" size="xl" className="w-full">
                    Crear cuenta y entrar al panel <ArrowRight className="size-4" />
                  </Button>

                  <p className="text-center text-xs text-muted-foreground">
                    ¿Ya tenés una cuenta?{" "}
                    <Link to="/login" className="font-medium text-primary hover:underline">
                      Iniciar sesión
                    </Link>
                  </p>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="sent"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.45 }}
                className="card-premium p-8 text-center lg:p-12"
              >
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 220, damping: 16, delay: 0.1 }}
                  className="bg-brand mx-auto flex size-16 items-center justify-center rounded-3xl"
                >
                  <MailCheck className="size-7 text-primary-foreground" />
                </motion.span>
                <h1 className="mt-6 text-2xl font-bold lg:text-3xl">
                  Revisá tu correo electrónico
                </h1>
                <p className="mt-3 text-muted-foreground">
                  Te enviamos un correo de confirmación.
                </p>

                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.5 }}
                  className="mx-auto mt-8 max-w-md rounded-2xl border border-border bg-muted/40 p-5 text-left"
                >
                  <div className="flex items-center gap-2 border-b border-border pb-3">
                    <span className="bg-brand flex size-8 items-center justify-center rounded-lg">
                      <Sparkles className="size-4 text-primary-foreground" />
                    </span>
                    <div className="leading-tight">
                      <p className="text-xs font-semibold">Cloud Esther</p>
                      <p className="text-[11px] text-muted-foreground">
                        hola@cloudesther.com · para vos
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm font-semibold">Confirmá tu cuenta</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Hola Esther, tu cuenta de Clínica Dental Esther está casi lista. Confirmá
                    tu correo para entrar al panel de Cloud Esther.
                  </p>
                  <span className="bg-brand mt-4 inline-block rounded-lg px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                    Confirmar cuenta
                  </span>
                  <p className="mt-3 text-[10px] text-muted-foreground">
                    Correo de ejemplo. No se envía ningún email real.
                  </p>
                </motion.div>

                <Button
                  variant="hero"
                  size="xl"
                  className="mt-8"
                  onClick={() => navigate({ to: "/demo" })}
                >
                  Continuar <ArrowRight className="size-4" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </PublicLayout>
  );
}