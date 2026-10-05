import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  CalendarDays,
  CalendarRange,
  CircleDollarSign,
  ClipboardCheck,
  Download,
  FileBarChart,
  Gauge,
  Lightbulb,
  Megaphone,
  Minus,
  Settings2,
  Sparkles,
  Stethoscope,
  Target,
  UserMinus,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { planLevel, useCloudEsther } from "@/lib/cloud-esther/data";
import { sucursalesDelPlan } from "@/lib/cloud-esther/inventario-store";
import { ODONTOLOGOS } from "@/lib/cloud-esther/agenda-store";
import { paisFiscal, storeFacturacion } from "@/lib/cloud-esther/facturacion-store";
import { formatoMoneda } from "@/lib/cloud-esther/nomina-paises";
import { setAnalitica, type EstadoAnalitica } from "@/lib/cloud-esther/analitica-store";
import {
  DIAS,
  agrupar,
  nombreMesCorto,
  nombreMesLargo,
  variacion,
} from "@/lib/cloud-esther/analitica-datos";
import {
  enRango,
  filtrar,
  metricas,
  rangoDe,
  useAnalitica,
  type Filtros,
  type Periodo,
} from "@/components/cloud-esther/analitica/datos";
import { formatos, type CtxBI, type SeccionBI } from "@/components/cloud-esther/analitica/ctx";
import {
  Barras,
  Lineas,
  Sparkline,
  TarjetaGrafico,
  color,
} from "@/components/cloud-esther/analitica/graficos";
import { Agenda, Pacientes, Profesionales } from "@/components/cloud-esther/analitica/SeccionesA";
import {
  Finanzas,
  Marketing,
  Reportes,
  Sedes,
  Tratamientos,
  exportarTablero,
} from "@/components/cloud-esther/analitica/SeccionesB";
import {
  Acciones,
  BTN_PRIMARIO,
  BTN_SECUNDARIO,
  Field,
  INPUT,
  Modal as ModalBase,
  Sel,
} from "@/components/cloud-esther/rrhh/ui";

/* Ubicación: src/components/cloud-esther/analitica/Analitica.tsx
   Analítica (BI): tablero con filtros de período, sede y profesional sobre los datos de
   Agenda, Pacientes, Presupuestos, Facturación, Finanzas y Marketing (más el histórico). */

const DIAS_PLURAL = ["domingos", "lunes", "martes", "miércoles", "jueves", "viernes", "sábados"];

export function M(props: Parameters<typeof ModalBase>[0]) {
  return <ModalBase {...props} modulo="Analítica" />;
}

const PERIODOS: { v: Periodo; l: string }[] = [
  { v: "7d", l: "7 días" },
  { v: "30d", l: "30 días" },
  { v: "mes", l: "Este mes" },
  { v: "90d", l: "90 días" },
  { v: "12m", l: "12 meses" },
  { v: "anio", l: "Este año" },
  { v: "custom", l: "Personalizado" },
];

export function Analitica() {
  const { plan } = useCloudEsther();
  const nivel = planLevel(plan);
  const todasSedes = sucursalesDelPlan(nivel >= 4);
  const datos = useAnalitica(ODONTOLOGOS, todasSedes);
  const moneda = paisFiscal(storeFacturacion.usar().config.pais).moneda;
  const fmt = formatos((n) => formatoMoneda(n, moneda));
  const [montado, setMontado] = useState(false);
  const [seccion, setSeccion] = useState<SeccionBI>("resumen");
  const [f, setF] = useState<Filtros>({
    periodo: "30d",
    desde: "",
    hasta: "",
    sucursal: "Todas",
    profesional: "Todos",
  });
  const [config, setConfig] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => setMontado(true), []);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const rango = rangoDe(f);
  const sedes = f.sucursal === "Todas" ? todasSedes : [f.sucursal];
  const base = useMemo(() => filtrar(datos.hechos, f), [datos.hechos, f]);
  const presBase = useMemo(() => filtrar(datos.presupuestos, f), [datos.presupuestos, f]);
  const nProf = f.profesional === "Todos" ? 0 : datos.profesionales.length;
  const hs = enRango(base, rango.desde, rango.hasta);
  const hsPrev = enRango(base, rango.prevDesde, rango.prevHasta);
  const pres = enRango(presBase, rango.desde, rango.hasta);
  const presPrev = enRango(presBase, rango.prevDesde, rango.prevHasta);
  const m = metricas(hs, pres, datos.cfg, sedes, rango.desde, rango.hasta, nProf);
  const mPrev = metricas(
    hsPrev,
    presPrev,
    datos.cfg,
    sedes,
    rango.prevDesde,
    rango.prevHasta,
    nProf,
  );
  const meses = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    return Array.from({ length: 12 }, (_, i) => {
      const x = new Date(d);
      x.setMonth(d.getMonth() - (11 - i));
      return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
    });
  }, []);
  const mensual = useMemo(() => {
    const porMes = agrupar(base, (h) => h.fecha.slice(0, 7));
    const presMes = agrupar(presBase, (p) => p.fecha.slice(0, 7));
    const hoy = new Date().toISOString().slice(0, 10);
    return meses.map((mes) => {
      const fin =
        `${mes}-31` > hoy && mes === hoy.slice(0, 7)
          ? hoy
          : `${mes}-${new Date(Number(mes.slice(0, 4)), Number(mes.slice(5)), 0).getDate()}`;
      return metricas(
        (porMes.get(mes) ?? []).filter((h) => h.fecha <= fin),
        presMes.get(mes) ?? [],
        datos.cfg,
        sedes,
        `${mes}-01`,
        fin,
        nProf,
      );
    });
  }, [base, presBase, meses, datos.cfg, sedes.join(","), nProf]); // eslint-disable-line react-hooks/exhaustive-deps

  const ctx: CtxBI = {
    ...fmt,
    nivel,
    f,
    rango,
    datos,
    cfg: datos.cfg,
    sedes,
    todasSedes,
    base,
    hs,
    hsPrev,
    pres,
    presPrev,
    m,
    mPrev,
    meses,
    mensual,
    onToast: setToast,
    ir: setSeccion,
  };

  const SECCIONES: { id: SeccionBI; label: string; icon: LucideIcon; min?: number }[] = [
    { id: "resumen", label: "Resumen", icon: Gauge },
    { id: "pacientes", label: "Pacientes", icon: Users },
    { id: "agenda", label: "Agenda y ocupación", icon: CalendarDays },
    { id: "profesionales", label: "Profesionales", icon: Stethoscope },
    { id: "tratamientos", label: "Tratamientos", icon: ClipboardCheck },
    { id: "marketing", label: "Captación", icon: Megaphone, min: 3 },
    { id: "finanzas", label: "Finanzas", icon: Wallet, min: 3 },
    { id: "sedes", label: "Sedes", icon: Building2, min: 4 },
    { id: "reportes", label: "Reportes", icon: FileBarChart },
  ];
  const visibles = SECCIONES.filter((s) => !s.min || nivel >= s.min);
  useEffect(() => {
    if (!visibles.some((s) => s.id === seccion)) setSeccion("resumen");
  }, [nivel]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof Filtros>(k: K, v: Filtros[K]) => setF((x) => ({ ...x, [k]: v }));
  const etiquetaRango = `${rango.desde.split("-").reverse().join("/")} al ${rango.hasta.split("-").reverse().join("/")}`;

  return (
    <div className="relative min-h-full overflow-clip bg-[#faf9ff]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_5%,rgba(124,58,237,0.15),transparent_28%),radial-gradient(circle_at_92%_12%,rgba(42,120,214,0.08),transparent_27%),linear-gradient(135deg,#f8f6ff_0%,#f3effd_48%,#faf8ff_100%)]"
      />
      <div className="relative mx-auto w-full max-w-[1420px] px-4 py-6 md:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[30px] border border-primary/15 bg-gradient-to-br from-white via-white/96 to-primary/[0.045] shadow-[0_20px_55px_-38px_rgba(76,29,149,0.55)]">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary/55 via-primary to-sky-400/60" />
          <div className="relative p-5 md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-primary/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                    <BarChart3 className="size-3.5" />
                    Administración
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-[11px] font-bold text-sky-700">
                    <Sparkles className="size-3.5" />
                    Datos de Agenda, Pacientes, Presupuestos, Facturación y Marketing
                  </span>
                </div>
                <h1 className="mt-4 text-[34px] font-bold tracking-[-0.035em] md:text-[42px]">
                  Analítica
                </h1>
                <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-foreground md:text-sm">
                  Cómo viene la clínica: producción, pacientes, agenda, profesionales, tratamientos
                  y captación, comparado con el período anterior.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button type="button" className={BTN_SECUNDARIO} onClick={() => setConfig(true)}>
                  <Settings2 className="size-4" /> Configurar
                </button>
                <button
                  type="button"
                  className={BTN_PRIMARIO}
                  onClick={() =>
                    void exportarTablero(ctx).then(() => setToast("Tablero exportado a Excel"))
                  }
                >
                  <Download className="size-4" /> Exportar tablero
                </button>
              </div>
            </div>

            {/* Filtros: una sola fila arriba de todo */}
            <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-primary/10 bg-white/70 p-2">
              <CalendarRange className="ml-1 size-4 text-primary" />
              <div className="flex flex-wrap gap-1">
                {PERIODOS.map((p) => (
                  <button
                    key={p.v}
                    type="button"
                    aria-pressed={f.periodo === p.v}
                    onClick={() =>
                      setF((x) => ({
                        ...x,
                        periodo: p.v,
                        ...(p.v === "custom" && !x.desde
                          ? { desde: rango.desde, hasta: rango.hasta }
                          : {}),
                      }))
                    }
                    className={`rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition ${f.periodo === p.v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-primary/[0.06] hover:text-foreground"}`}
                  >
                    {p.l}
                  </button>
                ))}
              </div>
              {f.periodo === "custom" && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    aria-label="Desde"
                    value={f.desde}
                    max={f.hasta}
                    onChange={(e) => set("desde", e.target.value)}
                    className={`${INPUT} h-8 w-36`}
                  />
                  <span className="text-[11px] text-muted-foreground">al</span>
                  <input
                    type="date"
                    aria-label="Hasta"
                    value={f.hasta}
                    min={f.desde}
                    onChange={(e) => set("hasta", e.target.value)}
                    className={`${INPUT} h-8 w-36`}
                  />
                </div>
              )}
              <div className="ml-auto flex flex-wrap gap-2">
                <div className="w-44">
                  <Sel
                    value={f.sucursal}
                    onChange={(v) => set("sucursal", v)}
                    opciones={["Todas", ...todasSedes]}
                    etiqueta="Sede"
                  />
                </div>
                <div className="w-48">
                  <Sel
                    value={f.profesional}
                    onChange={(v) => set("profesional", v)}
                    opciones={["Todos", ...datos.profesionales]}
                    etiqueta="Profesional"
                  />
                </div>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {etiquetaRango} · comparado con {rango.prevDesde.split("-").reverse().join("/")} al{" "}
              {rango.prevHasta.split("-").reverse().join("/")}
              {datos.cfg.incluirHistorico ? " · incluye histórico importado" : ""}
            </p>

            <nav
              className="mt-3 flex flex-wrap gap-1.5 rounded-2xl border border-primary/10 bg-primary/[0.025] p-1.5"
              aria-label="Secciones de analítica"
            >
              {visibles.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSeccion(s.id)}
                  aria-pressed={seccion === s.id}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${seccion === s.id ? "bg-primary text-primary-foreground shadow-[0_8px_18px_-10px_rgba(124,58,237,0.8)]" : "text-muted-foreground hover:bg-card hover:text-foreground"}`}
                >
                  <s.icon className="size-3.5" />
                  {s.label}
                </button>
              ))}
            </nav>
          </div>
        </section>

        <div className="mt-5">
          {!montado ? (
            <div className="card-grad h-[520px] animate-pulse" />
          ) : seccion === "resumen" ? (
            <Resumen ctx={ctx} />
          ) : seccion === "pacientes" ? (
            <Pacientes ctx={ctx} />
          ) : seccion === "agenda" ? (
            <Agenda ctx={ctx} />
          ) : seccion === "profesionales" ? (
            <Profesionales ctx={ctx} />
          ) : seccion === "tratamientos" ? (
            <Tratamientos ctx={ctx} />
          ) : seccion === "marketing" ? (
            <Marketing ctx={ctx} />
          ) : seccion === "finanzas" ? (
            <Finanzas ctx={ctx} />
          ) : seccion === "sedes" ? (
            <Sedes ctx={ctx} />
          ) : (
            <Reportes ctx={ctx} />
          )}
        </div>
      </div>
      {config && (
        <M titulo="Configurar Analítica" onClose={() => setConfig(false)} ancho="max-w-2xl">
          <ConfigForm
            cfg={datos.cfg}
            sedes={todasSedes}
            onCancel={() => setConfig(false)}
            onGuardar={(c) => {
              setAnalitica("incluirHistorico", () => c.incluirHistorico);
              setAnalitica("capacidad", () => c.capacidad);
              setAnalitica("duracionMin", () => c.duracionMin);
              setAnalitica("metas", () => c.metas);
              setConfig(false);
              setToast("Configuración guardada");
            }}
          />
        </M>
      )}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background shadow-xl"
          role="status"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

/* ───────────── KPI ───────────── */

export function Kpi({
  label,
  valor,
  actual,
  anterior,
  icon: Icon,
  serie,
  menosEsMejor = false,
  puntos = false,
}: {
  label: string;
  valor: string;
  actual: number;
  anterior: number;
  icon: LucideIcon;
  serie?: number[];
  menosEsMejor?: boolean;
  puntos?: boolean;
}) {
  const d = puntos ? actual - anterior : variacion(actual, anterior);
  const neutro = Math.abs(d) < 0.5;
  const bueno = menosEsMejor ? d < 0 : d > 0;
  const Flecha = neutro ? Minus : d > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="card-grad flex flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-primary/75">
          {label}
        </p>
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/[0.08] text-primary">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-1 text-[26px] font-bold leading-none tracking-tight text-foreground">
        {valor}
      </p>
      <p
        className={`mt-2 inline-flex items-center gap-1 text-[11px] font-semibold ${neutro ? "text-muted-foreground" : bueno ? "text-emerald-600" : "text-rose-600"}`}
        title="Contra el período anterior"
      >
        <Flecha className="size-3.5" />
        {neutro
          ? "Sin cambios"
          : `${d > 0 ? "+" : "−"}${Math.abs(d).toFixed(1).replace(".", ",")}${puntos ? " pts" : " %"}`}
        <span className="font-normal text-muted-foreground">vs. anterior</span>
      </p>
      {serie && (
        <div className="mt-2">
          <Sparkline valores={serie} />
        </div>
      )}
    </div>
  );
}

/* ───────────── Resumen ───────────── */

function Resumen({ ctx }: { ctx: CtxBI }) {
  const navigate = useNavigate();
  const { m, mPrev, mensual, meses } = ctx;
  const et = meses.map(nombreMesCorto);
  const s = (k: keyof typeof m) => mensual.map((x) => x[k]);
  const estados = ["Atendida", "Ausente", "Cancelada", "Programada"] as const;
  const porEstado = estados.map((e) => ctx.hs.filter((h) => h.estado === e).length);
  const sedesMes = ctx.sedes.map((sede, i) => ({
    nombre: sede,
    color: color(i),
    valores: meses.map(
      (mes) =>
        ctx.base.filter(
          (h) => h.sucursal === sede && h.estado === "Atendida" && h.fecha.startsWith(mes),
        ).length,
    ),
  }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Producción"
          valor={ctx.$c(m.produccion)}
          actual={m.produccion}
          anterior={mPrev.produccion}
          icon={CircleDollarSign}
          serie={s("produccion")}
        />
        <Kpi
          label="Atenciones"
          valor={ctx.n(m.atenciones)}
          actual={m.atenciones}
          anterior={mPrev.atenciones}
          icon={ClipboardCheck}
          serie={s("atenciones")}
        />
        <Kpi
          label="Pacientes nuevos"
          valor={ctx.n(m.nuevos)}
          actual={m.nuevos}
          anterior={mPrev.nuevos}
          icon={UserPlus}
          serie={s("nuevos")}
        />
        <Kpi
          label="Ticket promedio"
          valor={ctx.$c(m.ticket)}
          actual={m.ticket}
          anterior={mPrev.ticket}
          icon={Wallet}
          serie={s("ticket")}
        />
        <Kpi
          label="Ocupación"
          valor={ctx.p(m.ocupacion)}
          actual={m.ocupacion}
          anterior={mPrev.ocupacion}
          icon={Gauge}
          serie={s("ocupacion")}
          puntos
        />
        <Kpi
          label="Ausentismo"
          valor={ctx.p(m.ausentismo)}
          actual={m.ausentismo}
          anterior={mPrev.ausentismo}
          icon={UserMinus}
          serie={s("ausentismo")}
          puntos
          menosEsMejor
        />
        <Kpi
          label="Conversión de presupuestos"
          valor={ctx.p(m.conversion)}
          actual={m.conversion}
          anterior={mPrev.conversion}
          icon={Target}
          serie={s("conversion")}
          puntos
        />
        <Kpi
          label="Pacientes atendidos"
          valor={ctx.n(m.pacientes)}
          actual={m.pacientes}
          anterior={mPrev.pacientes}
          icon={Users}
          serie={s("pacientes")}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.4fr_1fr]">
        <TarjetaGrafico
          titulo="Producción mensual"
          sub="Últimos 12 meses · el mes en curso va hasta hoy"
          tabla={{
            columnas: ["Mes", "Producción", "Meta"],
            filas: meses.map((mes, i) => [
              nombreMesLargo(mes),
              ctx.$(mensual[i]!.produccion),
              ctx.$(ctx.cfg.metas.produccion),
            ]),
          }}
        >
          <Lineas
            etiquetas={et}
            formato={ctx.$c}
            series={[
              { nombre: "Producción", valores: s("produccion") },
              ...(ctx.nivel >= 3 && ctx.f.sucursal === "Todas" && ctx.f.profesional === "Todos"
                ? [
                    {
                      nombre: "Meta mensual",
                      valores: meses.map(() => ctx.cfg.metas.produccion),
                      color: "#9ca3af",
                    },
                  ]
                : []),
            ]}
          />
        </TarjetaGrafico>
        <TarjetaGrafico
          titulo="Atenciones por sede"
          sub="Turnos atendidos por mes"
          tabla={{
            columnas: ["Mes", ...ctx.sedes],
            filas: meses.map((mes, i) => [
              nombreMesLargo(mes),
              ...sedesMes.map((x) => x.valores[i] ?? 0),
            ]),
          }}
        >
          <Barras etiquetas={et} series={sedesMes} formato={ctx.n} apilado />
        </TarjetaGrafico>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {ctx.nivel >= 3 ? (
          <Metas ctx={ctx} />
        ) : (
          <EstadoTurnos ctx={ctx} valores={porEstado} estados={estados} />
        )}
        <div className="lg:col-span-2">
          {ctx.nivel >= 3 ? (
            <Insights ctx={ctx} navegar={(to) => void navigate({ to })} />
          ) : (
            <TarjetaGrafico
              titulo="Estado de los turnos del período"
              tabla={{
                columnas: ["Estado", "Turnos"],
                filas: estados.map((e, i) => [e, porEstado[i] ?? 0]),
              }}
            >
              <Barras
                etiquetas={[...estados]}
                series={[{ nombre: "Turnos", valores: porEstado }]}
                formato={ctx.n}
                alto={170}
              />
            </TarjetaGrafico>
          )}
        </div>
      </div>
    </div>
  );
}

function EstadoTurnos({
  ctx,
  valores,
  estados,
}: {
  ctx: CtxBI;
  valores: number[];
  estados: readonly string[];
}) {
  const total = valores.reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="card-grad p-4">
      <p className="mb-3 text-sm font-semibold">Turnos del período</p>
      <ul className="space-y-2">
        {estados.map((e, i) => (
          <li
            key={e}
            className="flex items-center justify-between rounded-xl bg-white/85 px-3 py-2 text-[12.5px] ring-1 ring-primary/10"
          >
            <span>{e}</span>
            <b>
              {ctx.n(valores[i] ?? 0)}{" "}
              <span className="font-normal text-muted-foreground">
                ({Math.round(((valores[i] ?? 0) / total) * 100)} %)
              </span>
            </b>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Metas({ ctx }: { ctx: CtxBI }) {
  const actual = ctx.mensual[ctx.mensual.length - 1]!;
  const hoy = new Date();
  const diasMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  const avance = hoy.getDate() / diasMes;
  const metas = ctx.cfg.metas;
  const filas = [
    { t: "Producción", v: actual.produccion, meta: metas.produccion, f: ctx.$c, proyectar: true },
    { t: "Pacientes nuevos", v: actual.nuevos, meta: metas.nuevos, f: ctx.n, proyectar: true },
    { t: "Ocupación", v: actual.ocupacion, meta: metas.ocupacion, f: ctx.p },
    { t: "Ausentismo (máx.)", v: actual.ausentismo, meta: metas.ausentismo, f: ctx.p, menos: true },
    { t: "Conversión", v: actual.conversion, meta: metas.conversion, f: ctx.p },
  ];
  return (
    <div className="card-grad p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">
          Metas de {nombreMesLargo(ctx.meses[ctx.meses.length - 1]!).split(" ")[0]}
        </p>
        <span className="text-[11px] text-muted-foreground">
          {Math.round(avance * 100)} % del mes
        </span>
      </div>
      <ul className="space-y-3">
        {filas.map((x) => {
          const proy = x.proyectar ? x.v / Math.max(avance, 0.05) : x.v;
          const ok = x.menos ? x.v <= x.meta : proy >= x.meta;
          const pctMeta = x.menos
            ? Math.min(100, (x.meta / Math.max(x.v, 0.1)) * 100)
            : Math.min(100, (x.v / (x.meta || 1)) * 100);
          return (
            <li key={x.t}>
              <div className="flex items-baseline justify-between text-[12px]">
                <span className="font-medium">{x.t}</span>
                <span className="tabular-nums">
                  <b>{x.f(x.v)}</b> <span className="text-muted-foreground">/ {x.f(x.meta)}</span>
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-primary/10">
                <div
                  className={`h-full rounded-full ${ok ? "bg-emerald-500" : "bg-amber-500"}`}
                  style={{ width: `${Math.max(2, pctMeta)}%` }}
                />
              </div>
              <p className={`mt-0.5 text-[10.5px] ${ok ? "text-emerald-600" : "text-amber-600"}`}>
                {x.proyectar
                  ? `Proyección a fin de mes: ${x.f(proy)} · ${ok ? "en camino" : "por debajo de la meta"}`
                  : ok
                    ? "Cumpliendo"
                    : "Fuera de la meta"}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type Insight = {
  t: string;
  d: string;
  tono: "bien" | "mal" | "info";
  accion?: { l: string; to?: string; ir?: SeccionBI };
};

function Insights({ ctx, navegar }: { ctx: CtxBI; navegar: (to: string) => void }) {
  const out: Insight[] = [];
  const { m, mPrev } = ctx;
  const dProd = variacion(m.produccion, mPrev.produccion);
  out.push({
    t: `La producción ${dProd >= 0 ? "creció" : "bajó"} ${Math.abs(dProd).toFixed(1).replace(".", ",")} %`,
    d: `${ctx.$(m.produccion)} contra ${ctx.$(mPrev.produccion)} del período anterior. Ticket promedio ${ctx.$(m.ticket)}.`,
    tono: dProd >= 0 ? "bien" : "mal",
  });
  // Día con más ausentismo
  const porDia = [1, 2, 3, 4, 5, 6].map((d) => {
    const x = ctx.hs.filter((h) => h.dow === d);
    const a = x.filter((h) => h.estado === "Ausente").length;
    const at = x.filter((h) => h.estado === "Atendida").length;
    return { d, v: (a / Math.max(1, a + at)) * 100 };
  });
  const peor = porDia.reduce((a, b) => (b.v > a.v ? b : a), porDia[0]!);
  if (peor.v > ctx.cfg.metas.ausentismo)
    out.push({
      t: `Los ${DIAS_PLURAL[peor.d]} el ausentismo llega al ${peor.v.toFixed(1).replace(".", ",")} %`,
      d: "Sumá un recordatorio por WhatsApp 24 h antes con pedido de confirmación para ese día.",
      tono: "mal",
      accion: { l: "Ver agenda", ir: "agenda" },
    });
  // Profesional destacado
  const porProf = [
    ...agrupar(
      ctx.hs.filter((h) => h.estado === "Atendida"),
      (h) => h.profesional,
    ).entries(),
  ].map(([p, xs]) => ({
    p,
    v: xs.reduce((a, h) => a + h.monto, 0),
  }));
  const top = porProf.sort((a, b) => b.v - a.v)[0];
  if (top && ctx.f.profesional === "Todos")
    out.push({
      t: `${top.p} lidera la producción`,
      d: `${ctx.$(top.v)} en el período (${Math.round((top.v / (m.produccion || 1)) * 100)} % del total).`,
      tono: "info",
      accion: { l: "Ver profesionales", ir: "profesionales" },
    });
  // Presupuestos pendientes
  const env = ctx.pres.filter((p) => p.estado === "Enviado");
  if (env.length)
    out.push({
      t: `${env.length} presupuestos esperan respuesta`,
      d: `${ctx.$(env.reduce((a, p) => a + p.monto, 0))} sin cerrar. Un llamado de seguimiento suele duplicar la aprobación.`,
      tono: "mal",
      accion: { l: "Ir a Presupuestos", to: "/demo/presupuestos" },
    });
  // Canal
  const canales = [
    ...agrupar(
      ctx.hs.filter((h) => h.nuevo && h.estado === "Atendida"),
      (h) => h.canal,
    ).entries(),
  ].sort((a, b) => b[1].length - a[1].length);
  if (canales[0])
    out.push({
      t: `${canales[0][0]} trae la mayor cantidad de pacientes nuevos`,
      d: `${canales[0][1].length} de ${m.nuevos} en el período.${canales[1] ? ` Le sigue ${canales[1][0]} con ${canales[1][1].length}.` : ""}`,
      tono: "info",
      accion: { l: "Ver captación", ir: "marketing" },
    });
  // Ocupación
  if (m.ocupacion < ctx.cfg.metas.ocupacion)
    out.push({
      t: `Ocupación ${ctx.p(m.ocupacion)}: hay agenda libre`,
      d: `La meta es ${ctx.p(ctx.cfg.metas.ocupacion)}. Ofrecé los huecos a la lista de espera o a pacientes con tratamientos pendientes.`,
      tono: "mal",
      accion: { l: "Ir a Agenda", to: "/demo/agenda" },
    });
  const TONO = {
    bien: "bg-emerald-50 text-emerald-800 ring-emerald-100",
    mal: "bg-amber-50 text-amber-800 ring-amber-100",
    info: "bg-primary/[0.05] text-foreground ring-primary/10",
  };
  return (
    <div className="card-grad h-full p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Lightbulb className="size-4 text-primary" /> Lo que muestran los datos
      </p>
      <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {out.map((x) => (
          <li key={x.t} className={`rounded-xl px-3 py-2.5 ring-1 ${TONO[x.tono]}`}>
            <b className="block text-[13px]">{x.t}</b>
            <span className="mt-0.5 block text-[11.5px] opacity-80">{x.d}</span>
            {x.accion && (
              <button
                type="button"
                className="mt-1.5 text-[11.5px] font-semibold text-primary hover:underline"
                onClick={() =>
                  x.accion?.to ? navegar(x.accion.to) : x.accion?.ir && ctx.ir(x.accion.ir)
                }
              >
                {x.accion.l} →
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ───────────── Configuración ───────────── */

function ConfigForm({
  cfg,
  sedes,
  onCancel,
  onGuardar,
}: {
  cfg: EstadoAnalitica;
  sedes: string[];
  onCancel: () => void;
  onGuardar: (c: EstadoAnalitica) => void;
}) {
  const [c, setC] = useState<EstadoAnalitica>(cfg);
  const setMeta = (k: keyof EstadoAnalitica["metas"], v: number) =>
    setC((x) => ({ ...x, metas: { ...x.metas, [k]: v } }));
  const setCap = (s: string, k: "gabinetes" | "horas", v: number) =>
    setC((x) => ({
      ...x,
      capacidad: {
        ...x.capacidad,
        [s]: { gabinetes: 1, horas: 8, ...x.capacidad[s], [k]: Math.max(0, v) },
      },
    }));
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onGuardar(c);
      }}
    >
      <div>
        <p className="mb-2 text-sm font-semibold">Metas mensuales</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Field label="Producción">
            <input
              type="number"
              min={0}
              value={c.metas.produccion}
              onChange={(e) => setMeta("produccion", Number(e.target.value))}
              className={INPUT}
              aria-label="Meta de producción"
            />
          </Field>
          <Field label="Pacientes nuevos">
            <input
              type="number"
              min={0}
              value={c.metas.nuevos}
              onChange={(e) => setMeta("nuevos", Number(e.target.value))}
              className={INPUT}
              aria-label="Meta de pacientes nuevos"
            />
          </Field>
          <Field label="Ocupación %">
            <input
              type="number"
              min={0}
              max={100}
              value={c.metas.ocupacion}
              onChange={(e) => setMeta("ocupacion", Number(e.target.value))}
              className={INPUT}
            />
          </Field>
          <Field label="Ausentismo máx. %">
            <input
              type="number"
              min={0}
              max={100}
              value={c.metas.ausentismo}
              onChange={(e) => setMeta("ausentismo", Number(e.target.value))}
              className={INPUT}
            />
          </Field>
          <Field label="Conversión %">
            <input
              type="number"
              min={0}
              max={100}
              value={c.metas.conversion}
              onChange={(e) => setMeta("conversion", Number(e.target.value))}
              className={INPUT}
            />
          </Field>
          <Field label="Duración de turno (min)">
            <input
              type="number"
              min={10}
              value={c.duracionMin}
              onChange={(e) =>
                setC((x) => ({ ...x, duracionMin: Math.max(10, Number(e.target.value)) }))
              }
              className={INPUT}
            />
          </Field>
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">
          Capacidad por sede (para calcular la ocupación)
        </p>
        <div className="space-y-2">
          {sedes.map((s) => (
            <div
              key={s}
              className="grid grid-cols-[1fr_120px_120px] items-center gap-2 rounded-xl bg-white/85 px-3 py-2 ring-1 ring-primary/10"
            >
              <span className="text-[13px] font-medium">{s}</span>
              <label className="text-[11px] text-muted-foreground">
                Gabinetes
                <input
                  type="number"
                  min={0}
                  value={c.capacidad[s]?.gabinetes ?? 1}
                  onChange={(e) => setCap(s, "gabinetes", Number(e.target.value))}
                  className={`${INPUT} h-8`}
                  aria-label={`Gabinetes de ${s}`}
                />
              </label>
              <label className="text-[11px] text-muted-foreground">
                Horas por día
                <input
                  type="number"
                  min={0}
                  max={24}
                  value={c.capacidad[s]?.horas ?? 8}
                  onChange={(e) => setCap(s, "horas", Number(e.target.value))}
                  className={`${INPUT} h-8`}
                  aria-label={`Horas de ${s}`}
                />
              </label>
            </div>
          ))}
        </div>
      </div>
      <label className="flex items-start gap-2 rounded-xl bg-primary/[0.04] px-3 py-2.5 text-sm ring-1 ring-primary/10">
        <input
          type="checkbox"
          checked={c.incluirHistorico}
          onChange={(e) => setC((x) => ({ ...x, incluirHistorico: e.target.checked }))}
          className="mt-0.5 accent-[var(--primary)]"
        />
        <span>
          <b className="block">Incluir histórico importado</b>
          <span className="text-[12px] text-muted-foreground">
            12 meses de atenciones del sistema anterior. Desactivalo para ver solo lo cargado en
            Cloud Esther.
          </span>
        </span>
      </label>
      <Acciones etiqueta="Guardar" onCancel={onCancel} />
    </form>
  );
}
