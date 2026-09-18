import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Check,
  Sparkles,
  Plus,
  ArrowRight,
  Layers3,
} from "lucide-react";
import { PublicLayout } from "@/components/site/PublicLayout";
import { PlanGrid } from "@/components/site/PlanCards";
import { Reveal } from "@/components/site/Reveal";
import {
  additionalModules,
  comparison,
  plans,
} from "@/lib/site-data";

export const Route = createFileRoute("/planes")({
  head: () => ({
    meta: [
      { title: "Planes y precios | Cloud Esther" },
      {
        name: "description",
        content:
          "Cuatro planes para clínicas odontológicas, con módulos adicionales que podés contratar por separado.",
      },
      { property: "og:title", content: "Planes y precios de Cloud Esther" },
      {
        property: "og:description",
        content:
          "Elegí tu plan y agregá solamente los módulos que necesitás para hacer crecer tu clínica.",
      },
    ],
  }),
  component: Planes,
});

const heroLine = "Un plan para cada etapa";
const heroLineTwo = "de tu clínica.";

function Planes() {
  const navigate = useNavigate();

  return (
    <PublicLayout>
      {/* =========================================================
          HERO
      ========================================================= */}
      <section className="relative isolate overflow-hidden bg-soft">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.25, 0.42, 0.25],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute left-1/2 top-[-180px] h-[430px] w-[760px] -translate-x-1/2 rounded-full bg-primary/10 blur-[110px]"
        />

        <motion.div
          animate={{
            x: [-30, 30, -30],
            y: [0, 20, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute -left-40 top-28 size-[330px] rounded-full bg-violet-300/10 blur-[100px]"
        />

        <motion.div
          animate={{
            x: [30, -30, 30],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute -right-40 top-20 size-[360px] rounded-full bg-purple-300/10 blur-[100px]"
        />

        <div className="relative mx-auto max-w-5xl px-5 pb-10 pt-10 text-center sm:pt-12 lg:px-8 lg:pb-12 lg:pt-14">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.6,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="inline-flex"
          >
            <motion.span
              animate={{
                boxShadow: [
                  "0 0 0 rgba(124,58,237,0)",
                  "0 0 24px rgba(124,58,237,0.2)",
                  "0 0 0 rgba(124,58,237,0)",
                ],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-lavender px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-lavender-foreground"
            >
              <motion.span
                animate={{
                  scale: [0.85, 1.15, 0.85],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="size-1.5 rounded-full bg-primary"
              />

              Planes y precios
            </motion.span>
          </motion.div>

          {/* Title */}
          <div className="mt-6 text-4xl font-bold leading-[1.05] tracking-[-0.04em] text-foreground sm:text-5xl lg:text-6xl">
            <div className="overflow-hidden">
              {heroLine.split("").map((char, index) => (
                <motion.span
                  key={`${char}-${index}`}
                  initial={{
                    opacity: 0,
                    y: 30,
                    rotateX: -70,
                    filter: "blur(5px)",
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    rotateX: 0,
                    filter: "blur(0px)",
                  }}
                  transition={{
                    duration: 0.65,
                    delay: 0.15 + index * 0.035,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="inline-block"
                >
                  {char === " " ? "\u00A0" : char}
                </motion.span>
              ))}
            </div>

            <div className="relative mt-1 overflow-hidden">
              <span className="relative inline-block bg-[linear-gradient(110deg,#111827_0%,#111827_35%,#7c3aed_52%,#a855f7_64%,#111827_82%)] bg-[length:250%_100%] bg-clip-text text-transparent">
                {heroLineTwo.split("").map((char, index) => (
                  <motion.span
                    key={`${char}-${index}`}
                    initial={{
                      opacity: 0,
                      y: 30,
                      rotateX: -70,
                      filter: "blur(5px)",
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      rotateX: 0,
                      filter: "blur(0px)",
                    }}
                    transition={{
                      duration: 0.65,
                      delay: 0.75 + index * 0.045,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="inline-block"
                  >
                    {char === " " ? "\u00A0" : char}
                  </motion.span>
                ))}

                <motion.span
                  animate={{
                    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                  }}
                  transition={{
                    duration: 7,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(110deg,transparent,rgba(168,85,247,0.2),transparent)] bg-[length:220%_100%]"
                />
              </span>
            </div>
          </div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              delay: 1.45,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground lg:text-lg"
          >
            Precios claros, implementación acompañada y módulos que se suman
            cuando los necesitás.
          </motion.p>

          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 56, opacity: 1 }}
            transition={{
              duration: 0.8,
              delay: 1.7,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mx-auto mt-7 h-0.5 rounded-full bg-primary/50"
          />
        </div>
      </section>

      {/* =========================================================
          PLANES
      ========================================================= */}
      <section className="relative mx-auto max-w-7xl px-5 pb-14 pt-6 lg:px-8 lg:pb-18 lg:pt-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative mb-8 text-center"
        >
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/10 bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
            <Sparkles className="size-3.5 text-primary" />
            Elegí cómo querés crecer
          </div>
        </motion.div>

        <div className="relative">
          <motion.div
            animate={{
              opacity: [0.15, 0.28, 0.15],
              scale: [0.98, 1.03, 0.98],
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="pointer-events-none absolute left-1/2 top-1/2 size-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-[100px]"
          />

          <div className="relative">
            <PlanGrid
              onSelect={(plan) =>
                navigate({
                  to: "/registro",
                  search: { plan: plan.id },
                })
              }
            />
          </div>
        </div>
      </section>

      {/* =========================================================
          MÓDULOS ADICIONALES
      ========================================================= */}
      <section className="relative overflow-hidden border-y border-border/60 bg-soft/60">
        {/* Ambient glow */}
        <motion.div
          animate={{
            opacity: [0.15, 0.3, 0.15],
            scale: [1, 1.08, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute left-1/2 top-0 size-[520px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]"
        />

        <div className="relative mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <Reveal className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-lavender px-3.5 py-1.5 text-xs font-semibold text-lavender-foreground">
              <Layers3 className="size-3.5" />
              Módulos adicionales
            </span>

            <h2 className="mt-5 text-3xl font-bold tracking-tight lg:text-4xl">
              Elegí tu plan.{" "}
              <span className="text-gradient">Sumá lo que necesitás.</span>
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground lg:text-lg">
              No necesitás cambiar de plan para acceder a una función
              específica. También podés contratar módulos por separado y
              agregarlos a tu suscripción cuando los necesites.
            </p>
          </Reveal>

          {/* Ejemplo comercial */}
          <Reveal delay={0.08}>
            <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-primary/15 bg-card/80 p-5 shadow-[0_18px_50px_rgba(88,28,135,0.08)] backdrop-blur-xl sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Plus className="size-5 text-primary" />
                  </span>

                  <div>
                    <p className="text-sm font-semibold">
                      Un ejemplo de contratación
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Plan Esencial + Odontograma + Esther IA
                    </p>
                  </div>
                </div>

                <span className="shrink-0 rounded-full bg-lavender px-3 py-1.5 text-xs font-semibold text-lavender-foreground">
                  Sin cambiar de plan
                </span>
              </div>
            </div>
          </Reveal>

          {/* Module cards */}
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {additionalModules.map((module, index) => (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{
                  duration: 0.5,
                  delay: Math.min(index * 0.05, 0.3),
                  ease: [0.22, 1, 0.36, 1],
                }}
                whileHover={{ y: -5 }}
                className="group relative flex h-full flex-col rounded-2xl border border-border/70 bg-card/85 p-5 shadow-[0_12px_35px_rgba(88,28,135,0.05)] backdrop-blur-xl transition-shadow duration-300 hover:border-primary/25 hover:shadow-[0_18px_45px_rgba(88,28,135,0.11)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-lavender transition-transform duration-300 group-hover:scale-105">
                    <Plus className="size-4.5 text-primary" />
                  </span>

                  <span className="rounded-full border border-border/70 bg-muted/50 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                    Adicional
                  </span>
                </div>

                <h3 className="mt-4 text-base font-semibold">
                  {module.name}
                </h3>

                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {module.description}
                </p>

                <div className="mt-5 border-t border-border/60 pt-4">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <span className="text-xl font-bold text-foreground">
                        {module.price}
                      </span>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {module.billing}
                      </p>
                    </div>

                    <ArrowRight className="size-4 text-primary opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <Reveal delay={0.15}>
            <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-relaxed text-muted-foreground">
              Los módulos adicionales se agregan al plan contratado y se
              facturan por separado. Los precios indicados no incluyen IVA.
            </p>
          </Reveal>
        </div>
      </section>

      {/* =========================================================
          COMPARADOR
      ========================================================= */}
      <section className="mx-auto max-w-7xl px-5 pb-24 pt-20 lg:px-8">
        <Reveal className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-lavender px-3.5 py-1.5 text-xs font-semibold text-lavender-foreground">
            <Check className="size-3.5" />
            Comparación completa
          </span>

          <h2 className="mt-4 text-3xl font-bold tracking-tight lg:text-4xl">
            Compará los planes
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Mirá qué módulos y funcionalidades están incluidos en cada plan.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="relative mt-8 overflow-hidden rounded-3xl border border-border/70 bg-card/80 shadow-[0_20px_60px_rgba(88,28,135,0.08)] backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/5 to-transparent" />

            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[780px] text-sm">
                <thead>
                  <tr className="border-b border-border/70">
                    <th className="p-5 text-left font-semibold">
                      Función
                    </th>

                    {plans.map((p) => (
                      <th
                        key={p.id}
                        className={`p-5 text-center font-semibold ${
                          p.featured ? "text-primary" : ""
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          {p.featured && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                              Más elegido
                            </span>
                          )}

                          <span>{p.name}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {comparison.map((row, i) => (
                    <tr
                      key={row.feature}
                      className={`border-b border-border/60 transition-colors last:border-0 hover:bg-lavender/50 ${
                        i % 2 ? "bg-muted/20" : ""
                      }`}
                    >
                      <td className="p-4 font-medium">
                        {row.feature}
                      </td>

                      {row.values.map((value, j) => (
                        <td
                          key={j}
                          className={`p-4 text-center ${
                            value === "—"
                              ? "text-muted-foreground/50"
                              : value === "Adicional"
                                ? "text-primary"
                                : "text-foreground"
                          }`}
                        >
                          {value === "✓" ? (
                            <span className="mx-auto flex size-6 items-center justify-center rounded-full bg-primary/10">
                              <Check className="size-3.5 text-primary" />
                            </span>
                          ) : value === "Adicional" ? (
                            <span className="inline-flex rounded-full bg-lavender px-2.5 py-1 text-[10px] font-semibold text-lavender-foreground">
                              Disponible aparte
                            </span>
                          ) : (
                            value
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>

        {/* Final CTA */}
        <Reveal delay={0.15}>
          <div className="relative mx-auto mt-12 max-w-4xl overflow-hidden rounded-3xl border border-primary/15 bg-lavender/60 p-8 text-center shadow-[0_20px_60px_rgba(88,28,135,0.08)] lg:p-10">
            <div className="pointer-events-none absolute left-1/2 top-0 size-64 -translate-x-1/2 rounded-full bg-primary/10 blur-[80px]" />

            <div className="relative">
              <Sparkles className="mx-auto size-7 text-primary" />

              <h3 className="mt-4 text-2xl font-bold lg:text-3xl">
                Tu clínica, a tu medida.
              </h3>

              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Elegí el plan que necesitás hoy y agregá nuevos módulos a
                medida que tu clínica crece.
              </p>

              <div className="mt-6">
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() =>
                    navigate({
                      to: "/demostracion",
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-shadow hover:shadow-primary/30"
                >
                  Solicitar demostración
                  <ArrowRight className="size-4" />
                </motion.button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </PublicLayout>
  );
}