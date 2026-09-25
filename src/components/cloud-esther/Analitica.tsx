// src/components/cloud-esther/Analitica.tsx
// Módulo ANALÍTICA de Cloud Esther — solo frontend, datos ficticios.
// Mismo estilo visual que Finanzas.tsx (cards con blob, hover, tokens del tema).
// Dependencias: react, lucide-react, sonner. No instala nada nuevo.

import { useMemo, useState } from "react";
import {
  Award,
  CalendarCheck2,
  FileDown,
  FileSpreadsheet,
  Percent,
  Repeat2,
  Search,
  Star,
  TrendingUp,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

/* ───────────────────────── Permisos (se conectan luego con Roles y Permisos) ───────────────────────── */
export const ANALITICA_PERMISOS = {
  ver: "analitica.ver",
  exportar: "analitica.exportar",
  administrar: "analitica.administrar",
} as const;

/* ───────────────────────── Esther Trace (placeholder) ───────────────────────── */
type EventoTrace = {
  modulo: string;
  accion: string;
  entidad: string;
  antes?: string;
  despues?: string;
};

function registrarEvento(evento: EventoTrace) {
  // TODO: conectar con Esther Trace cuando exista el backend de auditoría.
  console.log("[Esther Trace]", { ...evento, fecha: new Date().toISOString() });
}

/* ───────────────────────── Datos ficticios (todos con clinic_id, preparados para multi-tenant) ───────────────────────── */
const CLINIC_ID = "clinic_demo_001";

type TendenciaMes = { mes: string; turnos: number; cancelados: number };

const TENDENCIA: TendenciaMes[] = [
  { mes: "Abr", turnos: 142, cancelados: 12 },
  { mes: "May", turnos: 158, cancelados: 9 },
  { mes: "Jun", turnos: 149, cancelados: 15 },
  { mes: "Jul", turnos: 171, cancelados: 11 },
  { mes: "Ago", turnos: 186, cancelados: 14 },
  { mes: "Sep", turnos: 121, cancelados: 7 },
];

type OrigenPaciente = { clinic_id: string; canal: string; pacientes: number };

const ORIGENES: OrigenPaciente[] = [
  { clinic_id: CLINIC_ID, canal: "Recomendación", pacientes: 34 },
  { clinic_id: CLINIC_ID, canal: "Instagram", pacientes: 27 },
  { clinic_id: CLINIC_ID, canal: "Google", pacientes: 19 },
  { clinic_id: CLINIC_ID, canal: "Obra social", pacientes: 12 },
  { clinic_id: CLINIC_ID, canal: "Portal del paciente", pacientes: 8 },
];

type OcupacionDia = { dia: string; ocupacion: number };

const OCUPACION_SEMANA: OcupacionDia[] = [
  { dia: "Lun", ocupacion: 82 },
  { dia: "Mar", ocupacion: 91 },
  { dia: "Mié", ocupacion: 76 },
  { dia: "Jue", ocupacion: 88 },
  { dia: "Vie", ocupacion: 95 },
  { dia: "Sáb", ocupacion: 58 },
];

type Profesional = {
  clinic_id: string;
  nombre: string;
  especialidad: string;
  turnosAtendidos: number;
  ingresosGenerados: number;
  calificacion: number;
};

const PROFESIONALES: Profesional[] = [
  { clinic_id: CLINIC_ID, nombre: "Dra. Lucía Paz", especialidad: "Odontología general", turnosAtendidos: 58, ingresosGenerados: 1240000, calificacion: 4.9 },
  { clinic_id: CLINIC_ID, nombre: "Dr. Martín Sosa", especialidad: "Ortodoncia", turnosAtendidos: 41, ingresosGenerados: 980000, calificacion: 4.7 },
  { clinic_id: CLINIC_ID, nombre: "Dra. Carla Ibáñez", especialidad: "Implantología", turnosAtendidos: 33, ingresosGenerados: 1510000, calificacion: 4.8 },
  { clinic_id: CLINIC_ID, nombre: "Dr. Carlos Medina", especialidad: "Endodoncia", turnosAtendidos: 27, ingresosGenerados: 640000, calificacion: 4.6 },
];

const PERIODOS = ["Semana", "Mes", "Trimestre", "Año"] as const;
type TabId = "resumen" | "pacientes" | "turnos" | "profesionales" | "reportes";

const TABS: { id: TabId; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "pacientes", label: "Pacientes" },
  { id: "turnos", label: "Turnos" },
  { id: "profesionales", label: "Profesionales" },
  { id: "reportes", label: "Reportes" },
];

/* ───────────────────────── Utilidades ───────────────────────── */
const pesos = (n: number) => "$ " + new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);
const numero = (n: number) => new Intl.NumberFormat("es-AR").format(n);

/* ───────────────────────── StatCard (mismo lenguaje visual que Finanzas) ───────────────────────── */
type StatTone = "primary" | "success" | "neutral" | "danger";

const STAT_TONES: Record<StatTone, { value: string; blob: string; icon: string; pillUp: string; pillDown: string }> = {
  primary: { value: "text-primary", blob: "bg-primary/10", icon: "text-primary/70", pillUp: "text-emerald-600", pillDown: "text-rose-600" },
  success: { value: "text-emerald-600", blob: "bg-emerald-500/10", icon: "text-emerald-500/70", pillUp: "text-emerald-600", pillDown: "text-rose-600" },
  neutral: { value: "text-foreground", blob: "bg-foreground/5", icon: "text-foreground/50", pillUp: "text-emerald-600", pillDown: "text-rose-600" },
  danger: { value: "text-rose-600", blob: "bg-rose-500/10", icon: "text-rose-500/70", pillUp: "text-emerald-600", pillDown: "text-rose-600" },
};

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  delta,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Users;
  tone: StatTone;
  /** Variación mostrada como pastilla, ej. "+9%" o "-4%". Omitila si la métrica no aplica. */
  delta?: string;
}) {
  const t = STAT_TONES[tone];
  const deltaPositive = !delta?.trim().startsWith("-");

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-primary/10 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md">
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full ${t.blob} transition-transform duration-200 group-hover:scale-110`}
      />
      <div className="relative flex items-start justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 shrink-0 ${t.icon}`} />
      </div>
      <div className={`relative mt-3 text-[26px] font-bold leading-none ${t.value}`}>{value}</div>
      <div className="relative mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        {delta && <span className={`font-semibold ${deltaPositive ? t.pillUp : t.pillDown}`}>{delta}</span>}
        <span className="truncate">{hint}</span>
      </div>
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-primary/10 bg-card p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function BarraH({ label, valor, max, formato = numero }: { label: string; valor: number; max: number; formato?: (n: number) => string }) {
  const pct = max > 0 ? Math.max(4, Math.round((valor / max) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="font-semibold text-foreground">{formato(valor)}</span>
      </div>
      <div className="h-2.5 rounded-full bg-primary/10">
        <div className="h-2.5 rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Vacio({ texto }: { texto: string }) {
  return <div className="rounded-2xl border border-dashed border-primary/20 py-10 text-center text-sm text-muted-foreground">{texto}</div>;
}

/* ───────────────────────── Gráfico de torta (donut, CSS puro con conic-gradient) ───────────────────────── */
const TORTA_COLORES = ["#7c3aed", "#10b981", "#f59e0b", "#f43f5e", "#64748b", "#0ea5e9"];

function Torta({ datos }: { datos: { label: string; valor: number }[] }) {
  const total = datos.reduce((s, d) => s + d.valor, 0);

  let acumulado = 0;
  const segmentos = datos.map((d, i) => {
    const desde = (acumulado / total) * 360;
    acumulado += d.valor;
    const hasta = (acumulado / total) * 360;
    return { ...d, color: TORTA_COLORES[i % TORTA_COLORES.length], desde, hasta };
  });

  const gradient = segmentos.map((s) => `${s.color} ${s.desde}deg ${s.hasta}deg`).join(", ");

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-center">
      <div
        className="relative h-44 w-44 shrink-0 rounded-full"
        style={{ background: `conic-gradient(${gradient})` }}
        role="img"
        aria-label="Distribución de pacientes nuevos por canal"
      >
        <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-card text-center">
          <span className="text-2xl font-bold text-foreground">{numero(total)}</span>
          <span className="text-[11px] text-muted-foreground">pacientes</span>
        </div>
      </div>

      <ul className="w-full space-y-2 sm:w-auto">
        {segmentos.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="min-w-[9rem] truncate text-foreground/80">{s.label}</span>
            <span className="font-semibold text-foreground">{Math.round((s.valor / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ───────────────────────── Página ───────────────────────── */
export function Analitica() {
  const [tab, setTab] = useState<TabId>("resumen");
  const [periodo, setPeriodo] = useState<(typeof PERIODOS)[number]>("Mes");
  const [sucursal, setSucursal] = useState("Todas");
  const [busqueda, setBusqueda] = useState("");

  const totales = useMemo(() => {
    const turnos = TENDENCIA.reduce((s, t) => s + t.turnos, 0);
    const cancelados = TENDENCIA.reduce((s, t) => s + t.cancelados, 0);
    const ocupacionProm = Math.round(OCUPACION_SEMANA.reduce((s, d) => s + d.ocupacion, 0) / OCUPACION_SEMANA.length);
    const pacientesNuevos = ORIGENES.reduce((s, o) => s + o.pacientes, 0);
    const ingresoTotal = PROFESIONALES.reduce((s, p) => s + p.ingresosGenerados, 0);
    const ingresoPromedioPaciente = pacientesNuevos ? Math.round(ingresoTotal / pacientesNuevos) : 0;
    return {
      turnos,
      cancelados,
      tasaCancelacion: turnos ? Math.round((cancelados / turnos) * 100) : 0,
      ocupacionProm,
      pacientesNuevos,
      ingresoPromedioPaciente,
    };
  }, []);

  const maxTendencia = Math.max(...TENDENCIA.map((t) => t.turnos));
  const maxIngresoProf = Math.max(...PROFESIONALES.map((p) => p.ingresosGenerados));

  const profesionalesFiltrados = PROFESIONALES.filter((p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  function exportar(nombre: string, formato: string) {
    registrarEvento({ modulo: "Analítica", accion: "Exportación de reporte", entidad: "Reporte", despues: nombre });
    toast.info(`Exportación a ${formato} disponible cuando conectemos el backend.`);
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-4 md:p-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Analítica</h1>
          <p className="mt-1 text-sm text-muted-foreground">Métricas y tendencias de tu clínica.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-primary/20 bg-card p-1">
            {PERIODOS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                  periodo === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-primary/5"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <select
            value={sucursal}
            onChange={(e) => setSucursal(e.target.value)}
            className="rounded-full border border-primary/20 bg-card px-4 py-2 text-xs font-medium text-foreground/80"
            aria-label="Sucursal"
          >
            <option>Todas</option>
            <option>Sucursal Centro</option>
            <option>Sucursal Norte</option>
          </select>
        </div>
      </header>

      {/* Cards de resumen */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Turnos del mes" value={numero(totales.turnos)} hint="vs. período anterior" icon={CalendarCheck2} tone="primary" delta="+8%" />
        <StatCard label="Ocupación de agenda" value={`${totales.ocupacionProm}%`} hint="Promedio semanal" icon={Percent} tone="success" delta="+3%" />
        <StatCard label="Pacientes nuevos" value={numero(totales.pacientesNuevos)} hint="En el período" icon={UserPlus} tone="success" delta="+11%" />
        <StatCard label="Ingreso por paciente" value={pesos(totales.ingresoPromedioPaciente)} hint="Promedio del período" icon={TrendingUp} tone="neutral" />
        <StatCard label="Cancelaciones" value={`${totales.tasaCancelacion}%`} hint={`${totales.cancelados} turnos cancelados`} icon={XCircle} tone="danger" delta="-2%" />
      </div>

      {/* Pestañas */}
      <nav className="flex flex-wrap justify-center gap-1 rounded-2xl bg-muted/60 p-2" aria-label="Secciones de Analítica">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              tab === t.id ? "border-2 border-primary bg-card text-foreground" : "border-2 border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Resumen */}
      {tab === "resumen" && (
        <div className="space-y-5">
          <Panel
            title="Turnos realizados vs. cancelados"
            action={
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary" />Realizados</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-400" />Cancelados</span>
              </div>
            }
          >
            <div className="flex h-56 items-end gap-3 overflow-x-auto sm:gap-6">
              {TENDENCIA.map((t) => (
                <div key={t.mes} className="flex min-w-[48px] flex-1 flex-col items-center gap-2">
                  <div className="flex h-44 w-full items-end justify-center gap-1.5">
                    <div
                      className="w-1/2 max-w-[28px] rounded-t-lg bg-primary"
                      style={{ height: `${(t.turnos / maxTendencia) * 100}%` }}
                      title={`Turnos ${t.turnos}`}
                    />
                    <div
                      className="w-1/2 max-w-[28px] rounded-t-lg bg-rose-400"
                      style={{ height: `${(t.cancelados / maxTendencia) * 100}%` }}
                      title={`Cancelados ${t.cancelados}`}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{t.mes}</span>
                </div>
              ))}
            </div>
          </Panel>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Pacientes nuevos por canal">
              <Torta datos={ORIGENES.map((o) => ({ label: o.canal, valor: o.pacientes }))} />
            </Panel>
            <Panel title="Ocupación de agenda por día">
              <div className="space-y-4">
                {OCUPACION_SEMANA.map((d) => (
                  <BarraH key={d.dia} label={d.dia} valor={d.ocupacion} max={100} formato={(n) => `${n}%`} />
                ))}
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* Pacientes */}
      {tab === "pacientes" && (
        <Panel title="Origen de los pacientes nuevos">
          <div className="mb-6 border-b border-primary/10 pb-6">
            <Torta datos={ORIGENES.map((o) => ({ label: o.canal, valor: o.pacientes }))} />
          </div>
          <div className="space-y-3">
            {ORIGENES.map((o) => (
              <div key={o.canal} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/10 bg-card p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <Repeat2 className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{o.canal}</div>
                    <div className="text-xs text-muted-foreground">{Math.round((o.pacientes / totales.pacientesNuevos) * 100)}% del total</div>
                  </div>
                </div>
                <span className="text-base font-bold text-foreground">{numero(o.pacientes)}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Turnos */}
      {tab === "turnos" && (
        <Panel title="Ocupación por día de la semana">
          <div className="space-y-3">
            {OCUPACION_SEMANA.map((d) => (
              <div key={d.dia} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/10 bg-card p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <CalendarCheck2 className="h-5 w-5" />
                  </span>
                  <div className="text-sm font-semibold text-foreground">{d.dia}</div>
                </div>
                <span className={`text-base font-bold ${d.ocupacion >= 85 ? "text-emerald-600" : "text-foreground"}`}>{d.ocupacion}%</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Profesionales */}
      {tab === "profesionales" && (
        <Panel
          title="Ranking de profesionales"
          action={
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar..."
                className="w-56 rounded-full border border-primary/20 bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
          }
        >
          <div className="space-y-3">
            {profesionalesFiltrados.length === 0 && <Vacio texto="No hay profesionales que coincidan con la búsqueda." />}
            {profesionalesFiltrados.map((p) => (
              <div key={p.nombre} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/10 bg-card p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <Award className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{p.nombre}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.especialidad} · {p.turnosAtendidos} turnos ·{" "}
                      <span className="inline-flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {p.calificacion}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="text-base font-bold text-foreground">{pesos(p.ingresosGenerados)}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-4">
            {PROFESIONALES.map((p) => (
              <BarraH key={p.nombre} label={p.nombre} valor={p.ingresosGenerados} max={maxIngresoProf} formato={pesos} />
            ))}
          </div>
        </Panel>
      )}

      {/* Reportes */}
      {tab === "reportes" && (
        <Panel title="Reportes">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: FileDown, titulo: "Informe de gestión mensual", detalle: "Turnos, ocupación y cancelaciones del período.", formato: "PDF" },
              { icon: Users, titulo: "Origen de pacientes", detalle: "Pacientes nuevos por canal de captación.", formato: "CSV" },
              { icon: Award, titulo: "Productividad por profesional", detalle: "Turnos atendidos e ingresos generados.", formato: "PDF" },
              { icon: FileSpreadsheet, titulo: "Detalle de turnos", detalle: "Listado completo de turnos del período.", formato: "CSV" },
            ].map((r) => (
              <div key={r.titulo} className="flex items-center justify-between gap-3 rounded-2xl border border-primary/10 bg-card p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
                    <r.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{r.titulo}</div>
                    <div className="text-xs text-muted-foreground">{r.detalle}</div>
                  </div>
                </div>
                <button
                  onClick={() => exportar(r.titulo, r.formato)}
                  className="rounded-full border border-primary/20 bg-card px-4 py-1.5 text-xs font-semibold text-foreground/80 hover:bg-primary/5"
                >
                  {r.formato}
                </button>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}