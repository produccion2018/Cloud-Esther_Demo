import { motion } from "framer-motion";
import {
  CalendarDays,
  Users,
  Stethoscope,
  TrendingUp,
  Activity,
} from "lucide-react";

const bars = [42, 66, 51, 78, 60, 88, 72];
const days = ["L", "M", "M", "J", "V", "S", "D"];

const citas = [
  { hora: "09:00", paciente: "Laura Gómez", trat: "Limpieza" },
  { hora: "10:30", paciente: "Marcos Ruiz", trat: "Conducto" },
  { hora: "12:00", paciente: "Sofía Paz", trat: "Ortodoncia" },
  { hora: "15:15", paciente: "Martín Fernández", trat: "Control" },
];

function FloatingBadge({
  icon: Icon,
  label,
  value,
  className,
  delay,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  className: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 15,
        scale: 0.92,
      }}
      animate={{
        opacity: 1,
        y: [0, -6, 0],
        scale: 1,
      }}
      transition={{
        opacity: {
          duration: 0.7,
          delay,
          ease: "easeOut",
        },
        scale: {
          duration: 0.7,
          delay,
          ease: [0.22, 1, 0.36, 1],
        },
        y: {
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
          delay: delay + 0.7,
        },
      }}
      whileHover={{
        y: -9,
        scale: 1.03,
        transition: {
          duration: 0.25,
          ease: "easeOut",
        },
      }}
      className={`card-premium absolute z-30 hidden items-center gap-2.5 px-3.5 py-2.5 md:flex ${className}`}
    >
      <span className="flex size-9 items-center justify-center rounded-xl bg-lavender">
        <Icon className="size-4 text-primary" />
      </span>

      <span className="leading-tight">
        <span className="block text-[10px] text-muted-foreground">
          {label}
        </span>

        <span className="block text-sm font-bold">
          {value}
        </span>
      </span>

      <span className="text-xs text-primary">↗</span>
    </motion.div>
  );
}

export function DashboardMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[650px] [perspective:1400px]">
      {/* HALO DE LUZ */}
      <motion.div
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.3, 0.45, 0.3],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="pointer-events-none absolute -inset-10 rounded-full bg-primary/20 blur-3xl"
      />

      {/* DASHBOARD */}
      <motion.div
        initial={{
          opacity: 0,
          x: 40,
          y: 25,
          rotateY: -8,
          rotateX: 5,
          scale: 0.94,
        }}
        animate={{
          opacity: 1,
          x: 0,
          y: 0,
          rotateY: 0,
          rotateX: 0,
          scale: 1,
        }}
        transition={{
          duration: 1.1,
          delay: 0.2,
          ease: [0.22, 1, 0.36, 1],
        }}
        whileHover={{
          y: -7,
          rotateY: -1.5,
          rotateX: 1,
          scale: 1.012,
          transition: {
            duration: 0.45,
            ease: [0.22, 1, 0.36, 1],
          },
        }}
        className="relative z-10"
        style={{
          transformStyle: "preserve-3d",
        }}
      >
        {/* PANEL PRINCIPAL */}
        <div className="card-premium overflow-hidden rounded-[24px] border border-white/60 bg-white shadow-2xl">
          {/* HEADER */}
          <div className="bg-gradient-to-r from-primary via-purple-600 to-fuchsia-500 flex items-center gap-2 px-5 py-3">
            <span className="size-2.5 rounded-full bg-white/40" />
            <span className="size-2.5 rounded-full bg-white/40" />
            <span className="size-2.5 rounded-full bg-white/40" />

            <span className="ml-3 text-xs font-medium text-white/90">
              Cloud Esther · Panel
            </span>

            <span className="ml-auto flex items-center gap-1.5 text-[10px] text-white/80">
              <motion.span
                animate={{
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="size-1.5 rounded-full bg-white"
              />

              Online
            </span>
          </div>

          {/* CONTENIDO */}
          <div className="space-y-4 bg-white p-4 lg:p-5">
            {/* MÉTRICAS */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                {
                  label: "Ingresos",
                  value: "$2.4M",
                  icon: TrendingUp,
                },
                {
                  label: "Pacientes",
                  value: "1.284",
                  icon: Users,
                },
                {
                  label: "Turnos hoy",
                  value: "27",
                  icon: CalendarDays,
                },
                {
                  label: "Tratamientos",
                  value: "96",
                  icon: Stethoscope,
                },
              ].map((c, i) => (
                <motion.div
                  key={c.label}
                  initial={{
                    opacity: 0,
                    y: 15,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay: 0.55 + i * 0.08,
                    duration: 0.5,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  whileHover={{
                    y: -3,
                    transition: {
                      duration: 0.2,
                    },
                  }}
                  className="rounded-2xl border border-border bg-white p-3 shadow-sm transition-shadow duration-300 hover:shadow-md"
                >
                  <c.icon className="size-4 text-primary" />

                  <p className="mt-2 text-lg font-bold">
                    {c.value}
                  </p>

                  <p className="text-[10px] text-muted-foreground">
                    {c.label}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* GRÁFICO + CITAS */}
            <div className="grid gap-3 lg:grid-cols-5">
              {/* GRÁFICO */}
              <div className="rounded-2xl border border-border p-4 lg:col-span-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold">
                    Ingresos por día
                  </p>

                  <motion.span
                    animate={{
                      opacity: [0.75, 1, 0.75],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="rounded-full bg-lavender px-2 py-1 text-[9px] font-semibold text-primary"
                  >
                    +18%
                  </motion.span>
                </div>

                <div className="mt-5 flex h-28 items-end gap-2">
                  {bars.map((b, i) => (
                    <motion.span
                      key={i}
                      initial={{
                        height: 0,
                        opacity: 0,
                      }}
                      animate={{
                        height: `${b}%`,
                        opacity: 1,
                      }}
                      transition={{
                        delay: 0.8 + i * 0.08,
                        duration: 0.7,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      whileHover={{
                        opacity: 0.7,
                      }}
                      className="flex-1 rounded-t-lg bg-gradient-to-t from-primary to-purple-400"
                    />
                  ))}
                </div>

                <div className="mt-2 flex gap-2 text-[10px] text-muted-foreground">
                  {days.map((d, i) => (
                    <span
                      key={i}
                      className="flex-1 text-center"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              {/* PRÓXIMAS CITAS */}
              <div className="rounded-2xl border border-border p-4 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold">
                    Próximas citas
                  </p>

                  <CalendarDays className="size-3.5 text-primary" />
                </div>

                <ul className="mt-3 space-y-2.5">
                  {citas.map((c, i) => (
                    <motion.li
                      key={c.hora}
                      initial={{
                        opacity: 0,
                        x: 10,
                      }}
                      animate={{
                        opacity: 1,
                        x: 0,
                      }}
                      transition={{
                        delay: 0.95 + i * 0.1,
                        duration: 0.45,
                        ease: "easeOut",
                      }}
                      whileHover={{
                        x: 3,
                        transition: {
                          duration: 0.2,
                        },
                      }}
                      className="flex items-center gap-2"
                    >
                      <span className="rounded-md bg-lavender px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        {c.hora}
                      </span>

                      <span className="min-w-0 flex-1 truncate text-[11px] font-medium">
                        {c.paciente}
                      </span>

                      <span className="truncate text-[10px] text-muted-foreground">
                        {c.trat}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </div>

            {/* ACTIVIDAD */}
            <motion.div
              initial={{
                opacity: 0,
                y: 8,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 1.3,
                duration: 0.5,
              }}
              className="flex items-center gap-2 rounded-2xl border border-border bg-muted/40 px-3 py-2.5"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-lavender">
                <Activity className="size-3.5 text-primary" />
              </span>

              <p className="truncate text-[10px] text-muted-foreground">
                Actividad reciente: Dra. Paula Arriaga cerró la historia
                clínica de Sofía Paz
              </p>
            </motion.div>
          </div>
        </div>

        {/* BASE INFERIOR SUTIL */}
        <div className="mx-auto h-2.5 w-[94%] rounded-b-[50%] bg-gradient-to-b from-slate-300 to-slate-200 shadow-lg" />
      </motion.div>

      {/* BADGE — TURNOS */}
      <FloatingBadge
        icon={CalendarDays}
        label="Turnos"
        value="+18% semana"
        className="-top-7 left-4"
        delay={0.9}
      />

      {/* BADGE — PACIENTES */}
      <FloatingBadge
        icon={Users}
        label="Pacientes"
        value="42 nuevos"
        className="right-[-35px] top-[25%]"
        delay={1.2}
      />

      {/* BADGE — TRATAMIENTOS */}
      <FloatingBadge
        icon={Stethoscope}
        label="Tratamientos"
        value="96 activos"
        className="bottom-[12%] left-[-25px]"
        delay={1.5}
      />

      {/* BADGE — RESUMEN */}
      <FloatingBadge
        icon={TrendingUp}
        label="Resumen"
        value="$2.4M mes"
        className="-bottom-10 right-[-15px]"
        delay={1.8}
      />
    </div>
  );
}