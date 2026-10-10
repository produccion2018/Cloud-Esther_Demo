import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { MailCheck, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PublicLayout } from "@/components/site/PublicLayout";
import { plans } from "@/lib/site-data";
import { mapSitePlanToPlanId, setStoredPlan } from "@/lib/cloud-esther/data";
import { existeCuentaLocal, registrarCuenta } from "@/lib/cloud-esther/auth-store";
import {
  DEMO_EN_SERVIDOR,
  PAISES_DEMO,
  registrarDemoEnServidor,
} from "@/lib/cloud-esther/demo-servidor";
import { formatearPrecio, textoLimites, useConfigPlanes } from "@/lib/cloud-esther/planes-config";

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
  const config = useConfigPlanes();
  const [error, setError] = useState<string | null>(null);
  const [cuenta, setCuenta] = useState<{ nombre: string; clinica: string } | null>(null);
  const [entrando, setEntrando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const router = useRouter();
  // Apenas se crea la cuenta se descarga el panel, así "Continuar" entra con un solo clic.
  useEffect(() => {
    if (sent) void router.preloadRoute({ to: "/demo" }).catch(() => {});
  }, [sent, router]);

  const primerNombre = cuenta?.nombre.split(" ")[0] ?? "";

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
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (enviando) return;
                    const form = new FormData(e.currentTarget);
                    const clinica = String(form.get("clinica") ?? "");
                    const nombre = String(form.get("contacto") ?? "");
                    const email = String(form.get("email") ?? "");
                    const passDemo = String(form.get("pass") ?? "");
                    const pais = String(form.get("pais") ?? "");
                    const telefono = String(form.get("telefono") ?? "");

                    if (existeCuentaLocal(email)) {
                      setError("Ya existe una cuenta con ese correo. Iniciá sesión.");
                      return;
                    }
                    // Con servidor: el demo (y su tiempo) lo crea el servidor primero.
                    if (DEMO_EN_SERVIDOR) {
                      setEnviando(true);
                      const srv = await registrarDemoEnServidor({
                        nombre,
                        email,
                        telefono,
                        clinica,
                        pais,
                        plan: mapSitePlanToPlanId(selected),
                      });
                      setEnviando(false);
                      if (!srv.ok) {
                        setError(srv.error);
                        return;
                      }
                    }

                    const res = registrarCuenta({ clinica, nombre, email, passDemo });
                    if (!res.ok) {
                      setError(res.error);
                      return;
                    }

                    setError(null);
                    setStoredPlan(mapSitePlanToPlanId(selected));
                    setCuenta({
                      nombre: res.sesion.usuario.nombre,
                      clinica: res.sesion.clinica.nombre,
                    });
                    setSent(true);
                  }}
                  className="card-premium mt-10 space-y-5 p-6 lg:p-8"
                >
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="clinica">Nombre de la clínica</Label>
                      <Input
                        id="clinica"
                        name="clinica"
                        required
                        placeholder="Clínica Dental Esther"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contacto">Nombre de contacto</Label>
                      <Input id="contacto" name="contacto" required placeholder="Esther Méndez" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Correo electrónico</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        placeholder="esther.mendez@esther.com"
                      />
                    </div>
                    {DEMO_EN_SERVIDOR && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="pais">País</Label>
                          <select
                            id="pais"
                            name="pais"
                            required
                            defaultValue=""
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                          >
                            <option value="" disabled>
                              Elegí tu país
                            </option>
                            {PAISES_DEMO.map((p) => (
                              <option key={p.codigo} value={p.codigo}>
                                {p.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="telefono">Teléfono / WhatsApp (opcional)</Label>
                          <Input
                            id="telefono"
                            name="telefono"
                            type="tel"
                            maxLength={40}
                            placeholder="+54 9 11 5555 5555"
                          />
                        </div>
                      </>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="pass">Contraseña</Label>
                      {/* Demo: la contraseña de prueba queda visible y se recuerda en el login. */}
                      <Input
                        id="pass"
                        name="pass"
                        type="text"
                        required
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="Ej.: Demo2026"
                        className="font-mono"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Es tu contraseña de prueba: la vas a ver tal cual (con mayúsculas) al volver
                        a entrar al demo.
                      </p>
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
                            {formatearPrecio(config[mapSitePlanToPlanId(p.id)].precioMensual)} / mes
                          </span>
                          <span className="mt-1.5 block text-[11px] leading-4 text-foreground/80">
                            {textoLimites(config[mapSitePlanToPlanId(p.id)]).pacientes}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {error && (
                    <p role="alert" className="text-sm font-medium text-destructive">
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    variant="hero"
                    size="xl"
                    className="w-full"
                    disabled={enviando}
                  >
                    {enviando ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Creando tu demo…
                      </>
                    ) : (
                      <>
                        Crear cuenta y entrar al panel <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>

                  <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                    {DEMO_EN_SERVIDOR
                      ? "El demo es gratis y tiene un tiempo de prueba; si necesitás más, lo pedís desde el demo."
                      : "Cada ingreso al demo dura 30 minutos."}{" "}
                    Para el seguimiento comercial registramos cuándo entrás, cuánto tiempo usás el
                    demo y qué módulos visitás. No registramos datos de pacientes.
                  </p>

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
                <p className="mt-3 text-muted-foreground">Te enviamos un correo de confirmación.</p>

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
                    Hola {primerNombre}, tu cuenta de {cuenta?.clinica} está casi lista. Confirmá tu
                    correo para entrar al panel de Cloud Esther.
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
                  disabled={entrando}
                  onClick={() => {
                    // Un solo clic: se marca enseguida y se navega (el panel ya quedó precargado).
                    setEntrando(true);
                    void navigate({ to: "/demo" });
                  }}
                >
                  {entrando ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Entrando al panel…
                    </>
                  ) : (
                    <>
                      Continuar <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </PublicLayout>
  );
}
