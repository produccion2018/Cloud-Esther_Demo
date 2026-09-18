import { createFileRoute } from "@tanstack/react-router";
import { Clock, DollarSign, Bell, TriangleAlert, FileText, FileSpreadsheet, Printer, Share2 } from "lucide-react";
import { AppShell } from "@/components/cloudster/AppShell";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [{ title: "Dashboard | Cloudster" }],
  }),
  component: Dashboard,
});

const STATS = [
  { label: "Turnos de hoy", value: "11", icon: Clock, delta: "+9%", deltaColor: "text-emerald-600", sub: "7 confirmados · 2 pendientes" },
  { label: "Ingresos del día", value: "$ 1.284.000", icon: DollarSign, delta: "+14%", deltaColor: "text-emerald-600", sub: "6 cobros registrados" },
  { label: "Recordatorios enviados", value: "34", icon: Bell, delta: "94% entregados", deltaColor: "text-muted-foreground", sub: "" },
  { label: "Deuda vencida", value: "$ 572.000", icon: TriangleAlert, delta: "-4%", deltaColor: "text-destructive", sub: "2 pacientes" },
];

const TURNOS = [
  { hora: "08:00", paciente: "María González", detalle: "Control de ortodoncia · Dra. An...", estado: "Confirmado" },
  { hora: "08:45", paciente: "Carlos Rodríguez", detalle: "Implante · fase 2 · Dr. Carlos Ló...", estado: "Confirmado" },
  { hora: "09:30", paciente: "Laura Fernández", detalle: "Colocación de brackets · Dra. An...", estado: "Pendiente" },
  { hora: "10:15", paciente: "Juan Pérez", detalle: "Endodoncia pieza 26 · Dra. Sofí...", estado: "Confirmado" },
];

function EstadoBadge({ estado }: { estado: string }) {
  const confirmado = estado === "Confirmado";
  return (
    <span
      className={
        confirmado
          ? "inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700"
          : "inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700"
      }
    >
      <span className={confirmado ? "size-1.5 rounded-full bg-emerald-600" : "size-1.5 rounded-full bg-amber-600"} />
      {estado}
    </span>
  );
}

function Dashboard() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Clínico</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Desde Clínica Inicial</span>
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">Centro de operaciones</h1>
            <p className="mt-1 text-sm text-muted-foreground">Todo lo que pasa hoy en la Clínica Centro, en una sola pantalla.</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">Nuevo turno</button>
            <button className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted">Nuevo paciente</button>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</span>
                <s.icon className="size-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold tracking-tight">{s.value}</p>
              {(s.delta || s.sub) && (
                <p className="mt-1 flex items-center gap-1.5 text-xs">
                  <span className={s.deltaColor}>{s.delta}</span>
                  <span className="text-muted-foreground">{s.sub}</span>
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-4 lg:col-span-2">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Evolución de la clínica</h2>
                <p className="text-xs text-muted-foreground">Últimos 6 meses · datos ficticios</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <button className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 hover:bg-muted"><FileText className="size-3.5" /> PDF</button>
                <button className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 hover:bg-muted"><FileSpreadsheet className="size-3.5" /> Excel</button>
                <button className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 hover:bg-muted"><Printer className="size-3.5" /> Imprimir</button>
                <button className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 hover:bg-muted"><Share2 className="size-3.5" /> Compartir</button>
              </div>
            </div>
            <div className="h-64 w-full rounded-xl bg-[linear-gradient(to_top,theme(colors.primary/12%),transparent)]">
              <svg viewBox="0 0 400 160" className="size-full" preserveAspectRatio="none">
                <polyline points="0,120 80,110 160,95 240,70 320,40 400,20" fill="none" stroke="currentColor" className="text-primary" strokeWidth="2.5" />
                <polyline points="0,90 400,80" fill="none" stroke="currentColor" strokeDasharray="4 4" className="text-destructive/60" strokeWidth="1.5" />
              </svg>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Próximos turnos</h2>
                <p className="text-xs text-muted-foreground">Agenda de hoy</p>
              </div>
              <a href="#" className="text-xs font-medium text-primary">Ver agenda →</a>
            </div>
            <ul className="divide-y divide-border">
              {TURNOS.map((t) => (
                <li key={t.hora} className="flex items-center gap-3 py-3">
                  <span className="w-12 shrink-0 text-xs font-medium text-muted-foreground">{t.hora}</span>
                  <span className="size-8 shrink-0 rounded-full bg-primary/10" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.paciente}</p>
                    <p className="truncate text-xs text-muted-foreground">{t.detalle}</p>
                  </div>
                  <EstadoBadge estado={t.estado} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </AppShell>
  );
}