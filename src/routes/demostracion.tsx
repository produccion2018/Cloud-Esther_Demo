import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  CircleCheckBig,
  FileSignature,
  Headset,
  Loader2,
  Rocket,
  ShieldCheck,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PublicLayout } from "@/components/site/PublicLayout";
import { additionalModules, plans } from "@/lib/site-data";
import {
  enviarSolicitudContratacion,
  type SolicitudContratacion,
  type SolicitudGuardada,
} from "@/lib/contratacion";

/* La ruta se mantiene en /demostracion para no romper enlaces existentes, pero la página es
   la de contratación: el demo se prueba desde «Probar demo» (/registro). */
export const Route = createFileRoute("/demostracion")({
  validateSearch: (search: Record<string, unknown>): { plan?: string } => {
    const plan = search["plan"];
    return typeof plan === "string" ? { plan } : {};
  },
  head: () => ({
    meta: [
      { title: "Contratar servicio | Cloud Esther" },
      {
        name: "description",
        content:
          "Contratá Cloud Esther para tu clínica: elegí el plan, sumá módulos y un asesor te acompaña en la activación.",
      },
      { property: "og:title", content: "Contratá Cloud Esther para tu clínica" },
      {
        property: "og:description",
        content: "Elegí tu plan, sumá módulos y activá tu clínica con acompañamiento.",
      },
    ],
  }),
  component: Contratacion,
});

const PASOS = [
  {
    icon: FileSignature,
    titulo: "Elegís el plan",
    texto: "Y los módulos adicionales que necesites.",
  },
  {
    icon: Headset,
    titulo: "Te contacta un asesor",
    texto: "Confirmamos la propuesta y el contrato.",
  },
  {
    icon: Rocket,
    titulo: "Activamos tu clínica",
    texto: "Con la migración de tus datos incluida.",
  },
];
const SELECT =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none";

function Contratacion() {
  const { plan: planInicial } = Route.useSearch();
  const [plan, setPlan] = useState(
    plans.some((p) => p.id === planInicial)
      ? (planInicial as string)
      : (plans.find((p) => p.featured)?.id ?? plans[0]?.id ?? ""),
  );
  const [modulos, setModulos] = useState<string[]>([]);
  const [periodo, setPeriodo] = useState<SolicitudContratacion["periodo"]>("Mensual");
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState<SolicitudGuardada | null>(null);
  const elegido = plans.find((p) => p.id === plan);

  const toggle = (m: string) =>
    setModulos((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));

  const enviar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "").trim();
    setEnviando(true);
    const r = await enviarSolicitudContratacion({
      plan: elegido?.name ?? plan,
      modulos,
      periodo,
      clinica: v("clinica"),
      pais: v("pais"),
      sucursales: v("sucursales"),
      profesionales: v("profesionales"),
      contacto: v("contacto"),
      email: v("email"),
      telefono: v("telefono"),
      comentarios: v("comentarios"),
    });
    setEnviando(false);
    setListo(r);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <PublicLayout>
      <section className="relative overflow-hidden bg-soft">
        <div className="bg-glow pointer-events-none absolute inset-x-0 top-0 h-96" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-16 lg:grid-cols-[0.85fr_1.15fr] lg:px-8 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="lg:sticky lg:top-28 lg:self-start"
          >
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-lavender px-3.5 py-1.5 text-xs font-semibold text-lavender-foreground">
              Contratación
            </span>
            <h1 className="mt-5 text-3xl font-bold text-balance lg:text-4xl">
              Contratá Cloud Esther para tu clínica.
            </h1>
            <p className="mt-4 text-muted-foreground">
              Elegí el plan que corresponde a tu operación. Un asesor confirma la propuesta con vos
              y activamos tu clínica. ¿Todavía querés explorar?{" "}
              <Link to="/registro" className="font-semibold text-primary hover:underline">
                Probá el demo
              </Link>
              .
            </p>
            <ol className="mt-8 space-y-3">
              {PASOS.map((p, i) => (
                <motion.li
                  key={p.titulo}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.45 }}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5"
                >
                  <span className="bg-lavender flex size-9 shrink-0 items-center justify-center rounded-xl">
                    <p.icon className="size-4 text-primary" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">
                      {i + 1}. {p.titulo}
                    </span>
                    <span className="block text-xs text-muted-foreground">{p.texto}</span>
                  </span>
                </motion.li>
              ))}
            </ol>
            <p className="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              Los precios y condiciones se confirman en la propuesta. No se realiza ningún cobro al
              enviar esta solicitud.
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {!listo ? (
              <motion.form
                key="form"
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                onSubmit={(e) => void enviar(e)}
                className="card-premium space-y-7 p-6 lg:p-8"
              >
                <fieldset className="space-y-3">
                  <legend className="text-sm font-semibold">1. Plan</legend>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {plans.map((p) => {
                      const activo = plan === p.id;
                      return (
                        <button
                          type="button"
                          key={p.id}
                          onClick={() => setPlan(p.id)}
                          aria-pressed={activo}
                          className={`relative rounded-2xl border p-4 text-left transition-all ${
                            activo
                              ? "border-primary bg-lavender shadow-soft"
                              : "border-border bg-card hover:border-primary/40"
                          }`}
                        >
                          {activo && (
                            <span className="absolute right-3 top-3 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
                              <Check className="size-3" />
                            </span>
                          )}
                          <span className="block text-base font-bold">{p.name}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {p.tagline}
                          </span>
                          <span className="mt-2 block text-[11px] font-medium text-primary">
                            {p.branches} · {p.users}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-xs text-muted-foreground">Facturación:</span>
                    {(["Mensual", "Anual"] as const).map((x) => (
                      <button
                        type="button"
                        key={x}
                        onClick={() => setPeriodo(x)}
                        aria-pressed={periodo === x}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          periodo === x
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {x}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="space-y-3">
                  <legend className="text-sm font-semibold">
                    2. Módulos adicionales{" "}
                    <span className="font-normal text-muted-foreground">(opcional)</span>
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {additionalModules.map((m) => {
                      const active = modulos.includes(m.name);
                      return (
                        <button
                          type="button"
                          key={m.id}
                          title={m.description}
                          onClick={() => toggle(m.name)}
                          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                            active
                              ? "border-primary bg-lavender text-lavender-foreground shadow-soft"
                              : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                          }`}
                        >
                          {active && <Check className="size-3.5 text-primary" />}
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <fieldset className="space-y-4">
                  <legend className="text-sm font-semibold">3. Tu clínica y contacto</legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="clinica">Nombre de la clínica</Label>
                      <Input
                        id="clinica"
                        name="clinica"
                        required
                        placeholder="Clínica Dental Sonrisas"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pais">País</Label>
                      <select id="pais" name="pais" className={SELECT} defaultValue="Argentina">
                        {[
                          "Argentina",
                          "Chile",
                          "Colombia",
                          "España",
                          "México",
                          "Perú",
                          "Uruguay",
                          "Otro",
                        ].map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sucursales">Sucursales</Label>
                      <select id="sucursales" name="sucursales" className={SELECT}>
                        {["1", "2", "3–4", "5–6", "7–15", "Más de 15"].map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profesionales">Profesionales</Label>
                      <select id="profesionales" name="profesionales" className={SELECT}>
                        {["1–5", "6–15", "16–40", "41–100", "Más de 100"].map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contacto">Nombre de contacto</Label>
                      <Input
                        id="contacto"
                        name="contacto"
                        required
                        placeholder="Dra. Paula Arriaga"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Correo electrónico</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        placeholder="paula@clinica.com"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="telefono">Teléfono</Label>
                      <Input
                        id="telefono"
                        name="telefono"
                        required
                        placeholder="+54 11 5555 5555"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="comentarios">Comentarios</Label>
                      <Textarea
                        id="comentarios"
                        name="comentarios"
                        rows={3}
                        placeholder="¿Usás otro sistema hoy? ¿Necesitás migrar historias clínicas?"
                      />
                    </div>
                  </div>
                </fieldset>

                <Button
                  type="submit"
                  variant="hero"
                  size="xl"
                  className="w-full"
                  disabled={enviando}
                >
                  {enviando ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Enviando solicitud…
                    </>
                  ) : (
                    <>
                      Solicitar contratación del plan {elegido?.name}{" "}
                      <ArrowRight className="size-4" />
                    </>
                  )}
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
                <h2 className="mt-6 text-2xl font-bold">¡Solicitud de contratación recibida!</h2>
                <p className="mt-3 max-w-md text-muted-foreground">
                  Registramos tu pedido del plan <b className="text-foreground">{listo.plan}</b>
                  {listo.modulos.length
                    ? ` con ${listo.modulos.length} módulo${listo.modulos.length === 1 ? "" : "s"} adicional${listo.modulos.length === 1 ? "" : "es"}`
                    : ""}{" "}
                  (número {listo.id}). Un asesor te escribe a {listo.email} para confirmar la
                  propuesta y coordinar la activación.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-2">
                  <Button asChild variant="hero" size="lg">
                    <Link to="/registro">Mientras tanto, probá el demo</Link>
                  </Button>
                  <Button asChild variant="outlineBrand" size="lg">
                    <Link to="/">Volver al inicio</Link>
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </PublicLayout>
  );
}
