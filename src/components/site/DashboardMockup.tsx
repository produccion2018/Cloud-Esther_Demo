import { motion } from "framer-motion";
import { CalendarDays, Users, Stethoscope, TrendingUp, Activity } from "lucide-react";

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
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1, y: [0, -10, 0] }}
      transition={{
        opacity: { duration: 0.5, delay },
        scale: { duration: 0.5, delay },
        y: { duration: 5.5, repeat: Infinity, ease: "easeInOut", delay },
      }}
      className={`card-premium absolute hidden items-center gap-2.5 px-3.5 py-2.5 md:flex ${className}`}
    >
      <span className="bg-lavender flex size-8 items-center justify-center rounded-lg">
        <Icon className="size-4 text-primary" />
      </span>
      <span className="leading-tight">
        <span className="block text-[10px] text-muted-foreground">{label}</span>
        <span className="block text-sm font-semibold">{value}</span>
      </span>
    </motion.div>
  );
}

export function DashboardMockup() {
  return (
    <div className="relative">
      <motion.div
        initial={{ opacity: 0, y: 30, rotateX: 8 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        className="card-premium shadow-glow overflow-hidden"
      >
        <div className="bg-brand flex items-center gap-2 px-4 py-3">
          <span className="size-2.5 rounded-full bg-primary-foreground/40" />
          <span className="size-2.5 rounded-full bg-primary-foreground/40" />
          <span className="size-2.5 rounded-full bg-primary-foreground/40" />
          <span className="ml-3 text-xs font-medium text-primary-foreground/90">
            Cloud Esther · Panel
          </span>
        </div>

        <div className="space-y-4 p-4 lg:p-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "Ingresos", value: "$2.4M", icon: TrendingUp },
              { label: "Pacientes", value: "1.284", icon: Users },
              { label: "Turnos hoy", value: "27", icon: CalendarDays },
              { label: "Tratamientos", value: "96", icon: Stethoscope },
            ].map((c, i) => (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.08, duration: 0.5 }}
                className="rounded-xl border border-border bg-muted/40 p-3"
              >
                <c.icon className="size-4 text-primary" />
                <p className="mt-2 text-lg font-bold">{c.value}</p>
                <p className="text-[11px] text-muted-foreground">{c.label}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-5">
            <div className="rounded-xl border border-border p-4 lg:col-span-3">
              <p className="text-xs font-semibold">Ingresos por día</p>
              <div className="mt-4 flex h-28 items-end gap-2">
                {bars.map((b, i) => (
                  <motion.span
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${b}%` }}
                    transition={{ delay: 0.7 + i * 0.07, duration: 0.6, ease: "easeOut" }}
                    className="bg-brand flex-1 rounded-t-md"
                  />
                ))}
              </div>
              <div className="mt-2 flex gap-2 text-[10px] text-muted-foreground">
                {days.map((d, i) => (
                  <span key={i} className="flex-1 text-center">
                    {d}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border p-4 lg:col-span-2">
              <p className="text-xs font-semibold">Próximas citas</p>
              <ul className="mt-3 space-y-2.5">
                {citas.map((c, i) => (
                  <motion.li
                    key={c.hora}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + i * 0.1, duration: 0.45 }}
                    className="flex items-center gap-2"
                  >
                    <span className="rounded-md bg-lavender px-1.5 py-0.5 text-[10px] font-semibold text-lavender-foreground">
                      {c.hora}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[11px] font-medium">
                      {c.paciente}
                    </span>
                    <span className="truncate text-[10px] text-muted-foreground">{c.trat}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5">
            <Activity className="size-4 text-primary" />
            <p className="text-[11px] text-muted-foreground">
              Actividad reciente: Dra. Paula Arriaga cerró la historia clínica de Sofía Paz
            </p>
          </div>
        </div>
      </motion.div>

      <FloatingBadge
        icon={CalendarDays}
        label="Turnos"
        value="+18% semana"
        className="-top-10 -left-8"
        delay={0.9}
      />
      <FloatingBadge
        icon={Users}
        label="Pacientes"
        value="42 nuevos"
        className="top-1/4 -right-12"
        delay={1.2}
      />
      <FloatingBadge
        icon={Stethoscope}
        label="Tratamientos"
        value="96 activos"
        className="-bottom-10 -left-6"
        delay={1.5}
      />
      <FloatingBadge
        icon={TrendingUp}
        label="Resumen"
        value="$2.4M mes"
        className="-right-10 -bottom-16"
        delay={1.8}
      />
    </div>
  );
}
