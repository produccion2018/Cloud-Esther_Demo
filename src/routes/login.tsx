import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PublicLayout } from "@/components/site/PublicLayout";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión | Cloud Esther" },
      {
        name: "description",
        content:
          "Accedé al panel de gestión de tu clínica odontológica en Cloud Esther.",
      },
      { property: "og:title", content: "Iniciar sesión en Cloud Esther" },
      {
        property: "og:description",
        content: "Bienvenido nuevamente a tu panel de gestión.",
      },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <PublicLayout>
      <section className="relative min-h-[calc(100vh-84px)] overflow-hidden bg-soft">
        {/* GLOW GENERAL */}
        <motion.div
          animate={{
            opacity: [0.12, 0.25, 0.12],
            scale: [1, 1.08, 1],
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute left-1/2 top-0 size-[520px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]"
        />

        <div className="relative mx-auto flex min-h-[calc(100vh-84px)] max-w-6xl items-center px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.7,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="grid w-full overflow-hidden rounded-[1.75rem] border border-primary/10 bg-background/80 shadow-[0_25px_75px_rgba(88,28,135,0.13)] backdrop-blur-2xl lg:min-h-[590px] lg:grid-cols-2"
          >
            {/* =================================================
                PANEL IZQUIERDO
            ================================================= */}
            <div className="relative isolate overflow-hidden bg-gradient-to-br from-[#24104f] via-[#5420a0] to-[#9b4de0] px-7 py-9 text-white sm:px-10 sm:py-10 lg:px-12 lg:py-12">
              {/* HALO 1 */}
              <motion.div
                animate={{
                  x: [-40, 40, -40],
                  y: [0, 25, 0],
                  scale: [1, 1.12, 1],
                  opacity: [0.14, 0.3, 0.14],
                }}
                transition={{
                  duration: 10,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="pointer-events-none absolute -left-36 -top-36 size-[380px] rounded-full bg-fuchsia-400/30 blur-[95px]"
              />

              {/* HALO 2 */}
              <motion.div
                animate={{
                  x: [35, -35, 35],
                  y: [0, -20, 0],
                  scale: [1, 1.1, 1],
                  opacity: [0.1, 0.24, 0.1],
                }}
                transition={{
                  duration: 13,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="pointer-events-none absolute -bottom-36 -right-32 size-[420px] rounded-full bg-violet-300/30 blur-[100px]"
              />

              {/* CÍRCULOS DECORATIVOS */}
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{
                  duration: 38,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="pointer-events-none absolute -right-44 top-1/2 size-[390px] rounded-full border border-white/10"
              />

              <motion.div
                animate={{ rotate: [360, 0] }}
                transition={{
                  duration: 28,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="pointer-events-none absolute -right-28 top-[44%] size-[280px] rounded-full border border-white/10"
              />

              <div className="relative z-10 flex h-full flex-col">
                {/* LOGO */}
                <motion.div
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="flex items-center gap-3"
                >
                  <motion.span
                    animate={{
                      scale: [1, 1.06, 1],
                      boxShadow: [
                        "0 0 0 rgba(255,255,255,0)",
                        "0 0 24px rgba(255,255,255,0.18)",
                        "0 0 0 rgba(255,255,255,0)",
                      ],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="flex size-9 items-center justify-center rounded-full bg-white/10 text-sm font-bold backdrop-blur-md"
                  >
                    C
                  </motion.span>

                  <span className="font-display text-base font-bold tracking-tight">
                    Cloud Esther
                  </span>
                </motion.div>

                {/* TEXTO */}
                <div className="mt-auto max-w-lg pb-3 pt-16 lg:pb-5 lg:pt-20">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.7,
                      delay: 0.25,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-white/85 backdrop-blur-md">
                      <motion.span
                        animate={{
                          scale: [0.8, 1.2, 0.8],
                          opacity: [0.45, 1, 0.45],
                        }}
                        transition={{
                          duration: 2.4,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        className="size-1.5 rounded-full bg-white"
                      />
                      Tu clínica, siempre conectada
                    </span>

                    <h1 className="mt-6 text-3xl font-bold leading-[1.05] tracking-[-0.04em] sm:text-4xl lg:text-[3rem]">
                      Qué bueno verte
                      <br />
                      <span className="text-white/70">
                        nuevamente.
                      </span>
                    </h1>

                    <p className="mt-5 max-w-md text-sm leading-6 text-white/70 lg:text-base">
                      Accedé a Cloud Esther y seguí gestionando tu clínica
                      desde un solo lugar. Agenda, pacientes, tratamientos,
                      facturación y mucho más.
                    </p>
                  </motion.div>
                </div>

                {/* SEGURIDAD */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  className="flex items-center gap-3 text-xs text-white/55"
                >
                  <motion.span
                    animate={{
                      opacity: [0.65, 1, 0.65],
                      scale: [1, 1.04, 1],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="flex size-8 items-center justify-center rounded-lg bg-white/10"
                  >
                    <ShieldCheck className="size-3.5" />
                  </motion.span>

                  <span>Gestión segura para tu clínica</span>
                </motion.div>
              </div>
            </div>

            {/* =================================================
                PANEL DERECHO
            ================================================= */}
            <div className="relative flex items-center justify-center bg-background px-6 py-9 sm:px-10 lg:px-12">
              {/* GLOW */}
              <motion.div
                animate={{
                  opacity: [0.04, 0.1, 0.04],
                  scale: [0.95, 1.05, 0.95],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="pointer-events-none absolute -right-32 -top-32 size-[350px] rounded-full bg-primary/15 blur-[100px]"
              />

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.65,
                  delay: 0.18,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="relative w-full max-w-sm"
              >
                {/* ENCABEZADO */}
                <div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      duration: 0.5,
                      delay: 0.3,
                    }}
                    className="flex size-10 items-center justify-center rounded-xl bg-lavender"
                  >
                    <ShieldCheck className="size-4.5 text-primary" />
                  </motion.div>

                  <h2 className="mt-5 text-2xl font-bold tracking-tight lg:text-3xl">
                    Iniciar sesión
                  </h2>

                  <p className="mt-2 text-sm leading-5 text-muted-foreground">
                    Ingresá tus datos para acceder a tu panel de Cloud Esther.
                  </p>
                </div>

                {/* FORMULARIO */}
                <form
                  className="mt-7 space-y-4.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    navigate({ to: "/demo" });
                  }}
                >
                  {/* EMAIL */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.38 }}
                    className="space-y-1.5"
                  >
                    <Label
                      htmlFor="email"
                      className="text-sm font-semibold"
                    >
                      Correo electrónico
                    </Label>

                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder="paula@clinica.com"
                      className="h-11 rounded-xl border-border/80 bg-background px-4 text-sm transition-all duration-300 placeholder:text-muted-foreground/60 focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                    />
                  </motion.div>

                  {/* CONTRASEÑA */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.45 }}
                    className="space-y-1.5"
                  >
                    <Label
                      htmlFor="pass"
                      className="text-sm font-semibold"
                    >
                      Contraseña
                    </Label>

                    <div className="relative">
                      <Input
                        id="pass"
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        className="h-11 rounded-xl border-border/80 bg-background px-4 pr-12 text-sm transition-all duration-300 placeholder:text-muted-foreground/60 focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                      />

                      <button
                        type="button"
                        aria-label={
                          showPassword
                            ? "Ocultar contraseña"
                            : "Mostrar contraseña"
                        }
                        onClick={() =>
                          setShowPassword((value) => !value)
                        }
                        className="absolute right-2.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:bg-lavender hover:text-primary"
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </motion.div>

                  {/* OPCIONES */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.45, delay: 0.52 }}
                    className="flex items-center justify-between gap-3"
                  >
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                      <Checkbox
                        id="remember"
                        className="rounded-md"
                      />
                      <span>Recordarme</span>
                    </label>

                    <button
                      type="button"
                      className="text-xs font-semibold text-primary transition-colors hover:text-primary/75 hover:underline sm:text-sm"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </motion.div>

                  {/* BOTÓN */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.59 }}
                  >
                    <motion.div
                      animate={{
                        boxShadow: [
                          "0 7px 22px rgba(124,58,237,0.14)",
                          "0 10px 30px rgba(124,58,237,0.25)",
                          "0 7px 22px rgba(124,58,237,0.14)",
                        ],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="rounded-xl"
                    >
                      <Button
                        type="submit"
                        variant="hero"
                        size="xl"
                        className="h-11 w-full rounded-xl text-sm font-semibold"
                      >
                        Ingresar
                        <ArrowRight className="size-4" />
                      </Button>
                    </motion.div>
                  </motion.div>
                </form>

                {/* REGISTRO */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                  className="mt-7"
                >
                  <div className="relative flex items-center">
                    <div className="h-px flex-1 bg-border" />

                    <span className="px-3 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/55">
                      O
                    </span>

                    <div className="h-px flex-1 bg-border" />
                  </div>

                  <p className="mt-5 text-center text-xs text-muted-foreground sm:text-sm">
                    ¿Todavía no tenés una cuenta?{" "}
                    <Link
                      to="/registro"
                      className="font-semibold text-primary transition-colors hover:text-primary/75 hover:underline"
                    >
                      Crear cuenta
                    </Link>
                  </p>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
}