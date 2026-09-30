import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  AlarmClock,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Banknote,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  FileSpreadsheet,
  Landmark,
  LineChart,
  ListChecks,
  PiggyBank,
  Plus,
  Receipt,
  Repeat,
  Scale,
  Search,
  Smartphone,
  Trash2,
  TrendingUp,
  Upload,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useSesion } from "@/lib/cloud-esther/auth-store";
import { planLevel, useCloudEsther } from "@/lib/cloud-esther/data";
import { paisFiscal } from "@/lib/cloud-esther/facturacion-store";
import { formatoMoneda } from "@/lib/cloud-esther/nomina-paises";
import { sucursalesDelPlan } from "@/lib/cloud-esther/inventario-store";
import {
  CATEGORIAS_EGRESO,
  CATEGORIAS_INGRESO,
  diaDelMes,
  diaISO,
  mesISO,
  nombreMes,
  setFinanzas,
  storeFinanzas,
  type Categoria,
  type CategoriaEgreso,
  type CuentaFin,
  type CuentaPagar,
  type GastoFijo,
  type LineaExtracto,
  type MovFin,
  type TipoCuenta,
  type TipoMov,
} from "@/lib/cloud-esther/finanzas-store";
import {
  delMes,
  porCategoria,
  sumar,
  useLibro,
  type Asiento,
  type Libro,
  type Sugerencia,
} from "@/components/cloud-esther/finanzas/libro";
import {
  BarrasDobles,
  GENERAL,
  M,
  ORIGEN_ESTILO,
  Tarjeta,
  deSucursal,
  type CtxFin,
  type SeccionFin,
} from "@/components/cloud-esther/finanzas/comun";
import {
  FlujoCaja,
  Presupuesto,
  Rentabilidad,
  Resultados,
  proyeccion,
} from "@/components/cloud-esther/finanzas/Analisis";
import {
  Acciones,
  BTN_ICONO,
  BTN_PRIMARIO,
  BTN_SECUNDARIO,
  CHIP,
  Encabezado,
  Field,
  INPUT,
  Mini,
  Pill,
  Sel,
  Vacio,
  fecha,
} from "@/components/cloud-esther/rrhh/ui";
import { descargarExcel, leerPlanilla } from "@/components/cloud-esther/rrhh/excel";

/* Ubicación: src/components/cloud-esther/finanzas/Finanzas.tsx
   Finanzas de la clínica: resumen, libro de movimientos (propios + Facturación + Caja + Nómina),
   cuentas a pagar con compras de Inventario y trabajos de laboratorio, bancos y conciliación.
   Flujo de caja, presupuesto, rentabilidad y estado de resultados están en Analisis.tsx. */

export function Finanzas() {
  const { usuario: u } = useSesion();
  const { plan } = useCloudEsther();
  const libro = useLibro();
  const [montado, setMontado] = useState(false);
  const [seccion, setSeccion] = useState<SeccionFin>("resumen");
  const [sucursal, setSucursal] = useState("Todas");
  const [nuevoMov, setNuevoMov] = useState<Partial<MovFin> | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  useEffect(() => setMontado(true), []);
  const nivel = planLevel(plan);
  const moneda = paisFiscal(libro.fac.config.pais).moneda;
  const sucursales = sucursalesDelPlan(nivel >= 4);
  const onToast = (m: string) => {
    setToast(m);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 3000);
  };
  const ctx: CtxFin = {
    onToast,
    usuario: u?.nombre ?? "Administración",
    $: (n) => (n < 0 ? `−${formatoMoneda(-n, moneda)}` : formatoMoneda(n, moneda)),
    nivel,
    sucursal,
    sucursales,
    ir: setSeccion,
  };

  const mes = delMes(deSucursal(libro.operativos, sucursal), mesISO(0));
  const ingresos = sumar(mes, "Ingreso");
  const egresos = sumar(mes, "Egreso");
  const resultado = ingresos - egresos;
  const disponible = libro.fin.cuentas.reduce((a, c) => a + libro.saldoCuenta(c.id), 0);
  const vencidas = libro.fin.cuentasPagar.filter(
    (c) => c.estado === "Pendiente" && c.vence < diaISO(),
  );

  const SECCIONES: {
    id: SeccionFin;
    label: string;
    icon: LucideIcon;
    min?: number;
    badge?: number;
  }[] = [
    { id: "resumen", label: "Resumen", icon: BarChart3 },
    { id: "movimientos", label: "Movimientos", icon: ListChecks },
    { id: "pagar", label: "Cuentas a pagar", icon: Receipt, min: 2, badge: vencidas.length },
    { id: "bancos", label: "Bancos", icon: Landmark, min: 2 },
    { id: "presupuesto", label: "Presupuesto", icon: PiggyBank, min: 2 },
    { id: "flujo", label: "Flujo de caja", icon: LineChart, min: 3 },
    { id: "rentabilidad", label: "Rentabilidad", icon: TrendingUp, min: 3 },
    { id: "resultados", label: "Resultados", icon: Scale },
  ];
  const visibles = SECCIONES.filter((s) => !s.min || nivel >= s.min);
  useEffect(() => {
    if (!visibles.some((s) => s.id === seccion)) setSeccion("resumen");
  }, [nivel]); // eslint-disable-line react-hooks/exhaustive-deps

  const kpis = [
    {
      l: "Ingresos del mes",
      v: ctx.$(ingresos),
      s1: `${mes.filter((a) => a.tipo === "Ingreso").length} movimientos`,
      s2: nombreMes(mesISO(0), true),
      i: ArrowDownLeft,
    },
    {
      l: "Egresos del mes",
      v: ctx.$(egresos),
      s1: `${mes.filter((a) => a.tipo === "Egreso").length} movimientos`,
      s2: "incluye nómina",
      i: ArrowUpRight,
    },
    {
      l: "Resultado del mes",
      v: ctx.$(resultado),
      s1: ingresos ? `${Math.round((resultado / ingresos) * 100)} %` : "—",
      s2: "de margen",
      i: Scale,
    },
    {
      l: "Disponible",
      v: ctx.$(disponible),
      s1: `${libro.fin.cuentas.length} cuentas`,
      s2: "bancos, billeteras y efectivo",
      i: Wallet,
    },
  ];

  return (
    <div className="relative min-h-full overflow-clip bg-[#faf9ff]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_5%,rgba(124,58,237,0.15),transparent_28%),radial-gradient(circle_at_92%_12%,rgba(16,185,129,0.08),transparent_27%),linear-gradient(135deg,#f8f6ff_0%,#f3effd_48%,#faf8ff_100%)]"
      />
      <div className="relative mx-auto w-full max-w-[1420px] px-4 py-6 md:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[30px] border border-primary/15 bg-gradient-to-br from-white via-white/96 to-primary/[0.045] shadow-[0_20px_55px_-38px_rgba(76,29,149,0.55)]">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary/55 via-primary to-emerald-400/60" />
          <div className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-primary/[0.055] blur-2xl" />
          <div className="relative p-5 md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-primary/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                    <Wallet className="size-3.5" />
                    Administración
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700">
                    <Repeat className="size-3.5" />
                    Conectado con Facturación, RRHH e Inventario
                  </span>
                </div>
                <h1 className="mt-4 text-[34px] font-bold tracking-[-0.035em] md:text-[42px]">
                  Finanzas
                </h1>
                <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-foreground md:text-sm">
                  Ingresos, gastos, proveedores, bancos y resultados de la clínica. Los cobros, la
                  caja y los sueldos entran solos desde sus módulos.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {nivel >= 2 && (
                  <div className="w-44">
                    <Sel
                      value={sucursal}
                      onChange={setSucursal}
                      opciones={["Todas", ...sucursales]}
                      etiqueta="Sucursal"
                    />
                  </div>
                )}
                <button
                  type="button"
                  className={BTN_SECUNDARIO}
                  onClick={() => setNuevoMov({ tipo: "Ingreso" })}
                >
                  <ArrowDownLeft className="size-4" />
                  Registrar ingreso
                </button>
                <button
                  type="button"
                  className={BTN_PRIMARIO}
                  onClick={() => setNuevoMov({ tipo: "Egreso" })}
                >
                  <Plus className="size-4" />
                  Registrar gasto
                </button>
              </div>
            </div>
            {montado && (
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {kpis.map((c) => (
                  <div
                    key={c.l}
                    className="group relative min-h-[112px] overflow-hidden rounded-[22px] border border-primary/25 bg-gradient-to-br from-white via-white to-primary/[0.065] p-4 shadow-[0_12px_28px_-20px_rgba(124,58,237,0.48)] transition-all hover:-translate-y-0.5 hover:border-primary/45"
                  >
                    <div className="pointer-events-none absolute -right-7 -top-9 size-[100px] rounded-full bg-primary/[0.035] ring-[13px] ring-primary/[0.035]" />
                    <div className="relative flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-primary/75">
                          {c.l}
                        </p>
                        <p
                          className={`mt-2 truncate text-[27px] font-bold leading-none tracking-tight ${c.l === "Resultado del mes" && resultado < 0 ? "text-rose-600" : "text-primary"}`}
                        >
                          {c.v}
                        </p>
                        <p className="mt-2 text-[11px]">
                          <span className="font-semibold text-primary">{c.s1}</span>{" "}
                          <span className="text-muted-foreground">{c.s2}</span>
                        </p>
                      </div>
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/[0.08] text-primary">
                        <c.i className="size-4" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <nav
              className="mt-4 flex flex-wrap gap-1.5 rounded-2xl border border-primary/10 bg-primary/[0.025] p-1.5"
              aria-label="Secciones de finanzas"
            >
              {visibles.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSeccion(s.id)}
                  aria-pressed={seccion === s.id}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${seccion === s.id ? "bg-primary text-primary-foreground shadow-[0_8px_18px_-10px_rgba(124,58,237,0.8)]" : "text-muted-foreground hover:bg-white hover:text-foreground"}`}
                >
                  <s.icon className="size-3.5" />
                  {s.label}
                  {montado && !!s.badge && (
                    <span
                      className={`grid min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold ${seccion === s.id ? "bg-white/25 text-white" : "bg-rose-500 text-white"}`}
                    >
                      {s.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </section>

        <div className="mt-5">
          {!montado ? (
            <div className="card-grad h-[480px] animate-pulse" />
          ) : seccion === "resumen" ? (
            <Resumen ctx={ctx} libro={libro} />
          ) : seccion === "movimientos" ? (
            <Movimientos ctx={ctx} libro={libro} nuevo={setNuevoMov} />
          ) : seccion === "pagar" ? (
            <CuentasPagar ctx={ctx} libro={libro} />
          ) : seccion === "bancos" ? (
            <Bancos ctx={ctx} libro={libro} nuevo={setNuevoMov} />
          ) : seccion === "presupuesto" ? (
            <Presupuesto ctx={ctx} libro={libro} />
          ) : seccion === "flujo" ? (
            <FlujoCaja ctx={ctx} libro={libro} />
          ) : seccion === "rentabilidad" ? (
            <Rentabilidad ctx={ctx} libro={libro} />
          ) : (
            <Resultados ctx={ctx} libro={libro} />
          )}
        </div>
      </div>
      {nuevoMov && (
        <M
          titulo={nuevoMov.tipo === "Ingreso" ? "Registrar ingreso" : "Registrar gasto"}
          onClose={() => setNuevoMov(null)}
        >
          <MovForm
            ctx={ctx}
            base={nuevoMov}
            cuentas={libro.fin.cuentas}
            onCancel={() => setNuevoMov(null)}
            onGuardar={(m) => {
              setFinanzas("movimientos", (p) => [...p, m]);
              setNuevoMov(null);
              onToast(
                `${m.tipo === "Ingreso" ? "Ingreso" : "Gasto"} registrado · ${ctx.$(m.monto)}`,
              );
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

/* ───────────── Resumen ───────────── */

function Resumen({ ctx, libro }: { ctx: CtxFin; libro: Libro }) {
  const { fin } = libro;
  const asientos = deSucursal(libro.operativos, ctx.sucursal);
  const recientes = deSucursal(libro.asientos, ctx.sucursal);
  const serie = [5, 4, 3, 2, 1, 0].map((n) => {
    const m = mesISO(n);
    const h = ctx.sucursal === "Todas" ? fin.historico.find((x) => x.mes === m) : undefined;
    const d = delMes(asientos, m);
    return {
      etiqueta: nombreMes(m),
      a: (h?.ingresos ?? 0) + sumar(d, "Ingreso"),
      b: (h?.egresos ?? 0) + sumar(d, "Egreso"),
      resaltar: n === 0,
    };
  });
  const mes = delMes(asientos, mesISO(0));
  const cats = porCategoria(mes, "Egreso");
  const maxCat = Math.max(1, ...cats.map(([, v]) => v));
  const hoy = diaISO();
  const pendientes = deSucursal(fin.cuentasPagar, ctx.sucursal)
    .filter((c) => c.estado === "Pendiente")
    .sort((a, b) => a.vence.localeCompare(b.vence));

  const alertas: { t: string; d: string; nivel: "alta" | "media" | "info"; ir: SeccionFin }[] = [];
  const venc = pendientes.filter((c) => c.vence < hoy);
  if (venc.length && ctx.nivel >= 2)
    alertas.push({
      t: `${venc.length} factura${venc.length > 1 ? "s" : ""} de proveedores vencida${venc.length > 1 ? "s" : ""}`,
      d: `${ctx.$(venc.reduce((a, c) => a + c.monto, 0))} · ${venc.map((c) => c.proveedor).join(", ")}`,
      nivel: "alta",
      ir: "pagar",
    });
  const semana = pendientes.filter((c) => c.vence >= hoy && c.vence <= diaISO(7));
  if (semana.length && ctx.nivel >= 2)
    alertas.push({
      t: `${semana.length} pago${semana.length > 1 ? "s" : ""} vence${semana.length > 1 ? "n" : ""} esta semana`,
      d: ctx.$(semana.reduce((a, c) => a + c.monto, 0)),
      nivel: "media",
      ir: "pagar",
    });
  if (ctx.nivel >= 2)
    for (const [cat, v] of porCategoria(delMes(libro.operativos, mesISO(0)), "Egreso")) {
      const tope = fin.presupuesto[cat as CategoriaEgreso];
      if (tope && v > tope)
        alertas.push({
          t: `${cat}: presupuesto superado`,
          d: `${ctx.$(v)} de ${ctx.$(tope)} (${Math.round((v / tope) * 100)} %)`,
          nivel: "media",
          ir: "presupuesto",
        });
    }
  if (libro.sugerencias.length && ctx.nivel >= 2)
    alertas.push({
      t: `${libro.sugerencias.length} compra${libro.sugerencias.length > 1 ? "s" : ""} recibida${libro.sugerencias.length > 1 ? "s" : ""} sin cargar como deuda`,
      d: "Órdenes de Inventario y trabajos de laboratorio entregados",
      nivel: "info",
      ir: "pagar",
    });
  const sinGenerar = fin.gastosFijos.filter(
    (g) => g.activo && !fin.generados.includes(`${g.id}:${mesISO(0)}`),
  );
  if (sinGenerar.length && ctx.nivel >= 2)
    alertas.push({
      t: `${sinGenerar.length} gasto${sinGenerar.length > 1 ? "s" : ""} fijo${sinGenerar.length > 1 ? "s" : ""} del mes sin generar`,
      d: sinGenerar.map((g) => g.concepto).join(", "),
      nivel: "info",
      ir: "pagar",
    });
  if (ctx.nivel >= 3) {
    const semanas = proyeccion(libro, true);
    const minimo = semanas.reduce((m, s) => (s.saldo < m.saldo ? s : m), semanas[0]!);
    if (minimo.saldo < fin.umbralSaldo)
      alertas.push({
        t:
          minimo.saldo < 0
            ? "El saldo proyectado queda en negativo"
            : "El saldo proyectado baja del mínimo",
        d: `${ctx.$(minimo.saldo)} la semana del ${fecha(minimo.desde)}`,
        nivel: minimo.saldo < 0 ? "alta" : "media",
        ir: "flujo",
      });
  }
  const TONO = {
    alta: "bg-rose-50 ring-rose-100 text-rose-700",
    media: "bg-amber-50 ring-amber-100 text-amber-700",
    info: "bg-primary/[0.05] ring-primary/10 text-primary",
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.5fr_1fr]">
        <Tarjeta titulo="Ingresos y egresos (6 meses)">
          <BarrasDobles serie={serie} $={ctx.$} />
        </Tarjeta>
        <Tarjeta titulo={`Alertas (${alertas.length})`}>
          {alertas.length ? (
            <ul className="scroll-sutil max-h-[230px] space-y-2 overflow-y-auto pr-1">
              {alertas.map((a) => (
                <li key={a.t}>
                  <button
                    type="button"
                    onClick={() => ctx.ir(a.ir)}
                    className={`flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left ring-1 transition hover:-translate-y-0.5 ${TONO[a.nivel]}`}
                  >
                    <CircleAlert className="mt-0.5 size-4 shrink-0" />
                    <span className="min-w-0">
                      <b className="block text-[13px]">{a.t}</b>
                      <span className="block truncate text-[11px] opacity-80">{a.d}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
              <BadgeCheck className="size-4" /> Todo en orden: sin pagos vencidos ni desvíos.
            </p>
          )}
        </Tarjeta>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Tarjeta titulo={`Gastos de ${nombreMes(mesISO(0), true)}`}>
          <ul className="space-y-2">
            {cats.slice(0, 7).map(([c, v]) => (
              <li key={c}>
                <div className="flex justify-between text-[12px]">
                  <span className="truncate">{c}</span>
                  <b>{ctx.$(v)}</b>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-primary/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-fuchsia-500"
                    style={{ width: `${(v / maxCat) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Tarjeta>
        <Tarjeta
          titulo="Saldos"
          accion={
            ctx.nivel >= 2 && (
              <button
                type="button"
                className="text-[11px] font-semibold text-primary hover:underline"
                onClick={() => ctx.ir("bancos")}
              >
                Ver bancos
              </button>
            )
          }
        >
          <ul className="space-y-2">
            {fin.cuentas.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-3 rounded-xl bg-white/85 px-3 py-2 ring-1 ring-primary/10"
              >
                <IconoCuenta tipo={c.tipo} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{c.nombre}</span>
                <b className="text-[13px] text-primary">{ctx.$(libro.saldoCuenta(c.id))}</b>
              </li>
            ))}
          </ul>
        </Tarjeta>
        <Tarjeta
          titulo="Próximos pagos"
          accion={
            ctx.nivel >= 2 && (
              <button
                type="button"
                className="text-[11px] font-semibold text-primary hover:underline"
                onClick={() => ctx.ir("pagar")}
              >
                Ver todos
              </button>
            )
          }
        >
          {pendientes.length ? (
            <ul className="space-y-2">
              {pendientes.slice(0, 5).map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-2 rounded-xl bg-white/85 px-3 py-2 ring-1 ring-primary/10"
                >
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[13px]">{c.proveedor}</b>
                    <span
                      className={`text-[11px] ${c.vence < hoy ? "font-semibold text-rose-600" : "text-muted-foreground"}`}
                    >
                      {c.vence < hoy ? "Venció" : "Vence"} {fecha(c.vence)}
                    </span>
                  </span>
                  <b className="text-[13px]">{ctx.$(c.monto)}</b>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Sin pagos pendientes.</p>
          )}
        </Tarjeta>
      </div>
      <Tarjeta
        titulo="Últimos movimientos"
        accion={
          <button
            type="button"
            className="text-[11px] font-semibold text-primary hover:underline"
            onClick={() => ctx.ir("movimientos")}
          >
            Ver todos
          </button>
        }
      >
        <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          {recientes.slice(0, 8).map((a) => (
            <FilaAsiento key={a.id} ctx={ctx} a={a} cuentas={fin.cuentas} />
          ))}
        </ul>
      </Tarjeta>
    </div>
  );
}

function IconoCuenta({ tipo }: { tipo: TipoCuenta }) {
  const I = tipo === "Banco" ? Landmark : tipo === "Billetera" ? Smartphone : Banknote;
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
      <I className="size-4" />
    </span>
  );
}

function FilaAsiento({
  ctx,
  a,
  cuentas,
  onQuitar,
}: {
  ctx: CtxFin;
  a: Asiento;
  cuentas: CuentaFin[];
  onQuitar?: () => void;
}) {
  const ing = a.tipo === "Ingreso";
  return (
    <li className="flex items-center gap-3 rounded-xl bg-white/85 px-3 py-2 ring-1 ring-primary/10">
      <span
        className={`grid size-8 shrink-0 place-items-center rounded-full ${ing ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}
      >
        {ing ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold">{a.concepto}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {fecha(a.fecha)} · {a.categoria} ·{" "}
          {cuentas.find((c) => c.id === a.cuentaId)?.nombre ?? a.cuentaId}
          {a.sucursal !== GENERAL ? ` · ${a.sucursal}` : ""}
        </p>
      </div>
      <Pill clase={ORIGEN_ESTILO[a.origen]}>{a.origen}</Pill>
      <b className={`shrink-0 text-[13px] ${ing ? "text-emerald-600" : "text-rose-600"}`}>
        {ing ? "+" : "−"}
        {ctx.$(a.monto)}
      </b>
      {onQuitar && (
        <button
          type="button"
          aria-label="Eliminar movimiento"
          className={BTN_ICONO}
          onClick={onQuitar}
        >
          <Trash2 className="size-3.5" />
        </button>
      )}
    </li>
  );
}

/* ───────────── Movimientos ───────────── */

const ORIGENES: Asiento["origen"][] = [
  "Manual",
  "Facturación",
  "Obras sociales",
  "Caja diaria",
  "Nómina",
  "Proveedores",
  "Comisiones",
  "Transferencia",
];

function Movimientos({
  ctx,
  libro,
  nuevo,
}: {
  ctx: CtxFin;
  libro: Libro;
  nuevo: (b: Partial<MovFin>) => void;
}) {
  const [tipo, setTipo] = useState<"Todos" | TipoMov>("Todos");
  const [mes, setMes] = useState(mesISO(0));
  const [cat, setCat] = useState("Todas");
  const [cuenta, setCuenta] = useState("Todas");
  const [origen, setOrigen] = useState("Todos");
  const [q, setQ] = useState("");
  const [ver, setVer] = useState(40);
  const meses = [0, 1, 2, 3, 4, 5].map((n) => mesISO(n));
  const lista = deSucursal(libro.asientos, ctx.sucursal).filter(
    (a) =>
      (tipo === "Todos" || a.tipo === tipo) &&
      (mes === "Todos" || a.fecha.startsWith(mes)) &&
      (cat === "Todas" || a.categoria === cat) &&
      (cuenta === "Todas" || a.cuentaId === cuenta) &&
      (origen === "Todos" || a.origen === origen) &&
      (!q || `${a.concepto} ${a.comprobante}`.toLowerCase().includes(q.toLowerCase())),
  );
  const ing = sumar(lista, "Ingreso");
  const egr = sumar(lista, "Egreso");
  const nombreCuenta = (id: string) => libro.fin.cuentas.find((c) => c.id === id)?.nombre ?? id;

  const exportar = () =>
    void descargarExcel(`movimientos-${mes === "Todos" ? "todos" : mes}.xlsx`, [
      {
        nombre: "Movimientos",
        nota: `Movimientos · ${mes === "Todos" ? "todos los meses" : nombreMes(mes, true)} · ${ctx.sucursal === "Todas" ? "todas las sucursales" : ctx.sucursal}`,
        columnas: [
          { titulo: "Fecha", clave: "f", ancho: 12 },
          { titulo: "Tipo", clave: "t", ancho: 10 },
          { titulo: "Categoría", clave: "c", ancho: 28 },
          { titulo: "Concepto", clave: "d", ancho: 44 },
          { titulo: "Cuenta", clave: "cu", ancho: 30 },
          { titulo: "Sucursal", clave: "s", ancho: 16 },
          { titulo: "Origen", clave: "o", ancho: 14 },
          { titulo: "Comprobante", clave: "n", ancho: 18 },
          { titulo: "Importe", clave: "m", moneda: true, ancho: 16 },
        ],
        filas: lista.map((a) => ({
          f: fecha(a.fecha),
          t: a.tipo,
          c: a.categoria,
          d: a.concepto,
          cu: nombreCuenta(a.cuentaId),
          s: a.sucursal,
          o: a.origen,
          n: a.comprobante,
          m: a.tipo === "Ingreso" ? a.monto : -a.monto,
        })),
        totales: { d: "Resultado", m: ing - egr },
      },
    ]).then(() => ctx.onToast("Movimientos exportados a Excel"));

  return (
    <div className="space-y-3">
      <Encabezado
        icon={ListChecks}
        titulo="Movimientos"
        descripcion="Todo lo que entra y sale: lo que cargás acá más cobros, caja y sueldos de los otros módulos."
      >
        <button type="button" className={BTN_SECUNDARIO} onClick={exportar}>
          <FileSpreadsheet className="size-4" /> Excel
        </button>
        <button type="button" className={BTN_SECUNDARIO} onClick={() => nuevo({ tipo: "Ingreso" })}>
          <ArrowDownLeft className="size-4" /> Ingreso
        </button>
        <button type="button" className={BTN_PRIMARIO} onClick={() => nuevo({ tipo: "Egreso" })}>
          <Plus className="size-4" /> Gasto
        </button>
      </Encabezado>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Mini label="Ingresos" valor={ctx.$(ing)} icon={ArrowDownLeft} tono="text-emerald-600" />
        <Mini label="Egresos" valor={ctx.$(egr)} icon={ArrowUpRight} tono="text-rose-600" />
        <Mini
          label="Resultado"
          valor={ctx.$(ing - egr)}
          icon={Scale}
          tono={ing - egr < 0 ? "text-rose-600" : "text-primary"}
          sub={`${lista.length} movimientos`}
        />
      </div>
      <div className="card-grad space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar concepto o comprobante"
              aria-label="Buscar movimiento"
              className={`${INPUT} pl-9`}
            />
          </div>
          <div className="flex rounded-full bg-primary/[0.05] p-1">
            {(["Todos", "Ingreso", "Egreso"] as const).map((t) => (
              <button key={t} type="button" className={CHIP(tipo === t)} onClick={() => setTipo(t)}>
                {t === "Todos" ? "Todos" : `${t}s`}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Sel
            value={mes}
            onChange={setMes}
            etiqueta="Mes"
            opciones={[
              ...meses.map((m) => ({ value: m, label: nombreMes(m, true) })),
              { value: "Todos", label: "Todos los meses" },
            ]}
          />
          <Sel
            value={cat}
            onChange={setCat}
            etiqueta="Categoría"
            opciones={["Todas", ...CATEGORIAS_INGRESO, ...CATEGORIAS_EGRESO]}
          />
          <Sel
            value={cuenta}
            onChange={setCuenta}
            etiqueta="Cuenta"
            opciones={[
              { value: "Todas", label: "Todas las cuentas" },
              ...libro.fin.cuentas.map((c) => ({ value: c.id, label: c.nombre })),
            ]}
          />
          <Sel
            value={origen}
            onChange={setOrigen}
            etiqueta="Origen"
            opciones={["Todos", ...ORIGENES]}
          />
        </div>
        {lista.length ? (
          <ul className="space-y-2">
            {lista.slice(0, ver).map((a) => (
              <FilaAsiento
                key={a.id}
                ctx={ctx}
                a={a}
                cuentas={libro.fin.cuentas}
                {...(a.editable
                  ? {
                      onQuitar: () => {
                        setFinanzas("movimientos", (p) => p.filter((x) => x.id !== a.id));
                        ctx.onToast("Movimiento eliminado");
                      },
                    }
                  : {})}
              />
            ))}
          </ul>
        ) : (
          <Vacio icon={ListChecks} texto="No hay movimientos con esos filtros." />
        )}
        {lista.length > ver && (
          <button
            type="button"
            className={`${BTN_SECUNDARIO} w-full`}
            onClick={() => setVer((v) => v + 40)}
          >
            Ver más ({lista.length - ver})
          </button>
        )}
      </div>
    </div>
  );
}

function MovForm({
  ctx,
  base,
  cuentas,
  onCancel,
  onGuardar,
}: {
  ctx: CtxFin;
  base: Partial<MovFin>;
  cuentas: CuentaFin[];
  onCancel: () => void;
  onGuardar: (m: MovFin) => void;
}) {
  const [tipo, setTipo] = useState<TipoMov>(base.tipo ?? "Egreso");
  const cats: readonly Categoria[] = tipo === "Ingreso" ? CATEGORIAS_INGRESO : CATEGORIAS_EGRESO;
  const [categoria, setCategoria] = useState<Categoria>(base.categoria ?? cats[0]!);
  const [concepto, setConcepto] = useState(base.concepto ?? "");
  const [monto, setMonto] = useState(base.monto ? String(base.monto) : "");
  const [fechaMov, setFechaMov] = useState(base.fecha ?? diaISO());
  const [cuentaId, setCuentaId] = useState(base.cuentaId ?? cuentas[0]?.id ?? "");
  const [sucursal, setSucursal] = useState(
    base.sucursal ?? (ctx.sucursal === "Todas" ? GENERAL : ctx.sucursal),
  );
  const [comprobante, setComprobante] = useState(base.comprobante ?? "");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!cats.includes(categoria)) setCategoria(cats[0]!);
  }, [tipo]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const n = Number(monto);
        if (!concepto.trim()) return setError("Escribí el concepto");
        if (!(n > 0)) return setError("El importe tiene que ser mayor a cero");
        if (fechaMov > diaISO())
          return setError("La fecha no puede ser futura: para eso usá Cuentas a pagar");
        onGuardar({
          id: `mf-${Date.now()}`,
          fecha: fechaMov,
          tipo,
          categoria,
          concepto: concepto.trim(),
          monto: Math.round(n),
          cuentaId,
          sucursal,
          origen: "Manual",
          comprobante: comprobante.trim(),
        });
      }}
    >
      <div className="flex rounded-full bg-primary/[0.05] p-1">
        {(["Egreso", "Ingreso"] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`${CHIP(tipo === t)} flex-1 justify-center`}
            onClick={() => setTipo(t)}
          >
            {t === "Egreso" ? "Gasto" : "Ingreso"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Field label="Concepto *">
            <input
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder={tipo === "Egreso" ? "Ej.: Compra de guantes" : "Ej.: Venta de cepillos"}
              className={INPUT}
              aria-label="Concepto"
            />
          </Field>
        </div>
        <Field label="Importe *">
          <input
            type="number"
            min={0}
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className={INPUT}
            aria-label="Importe"
          />
        </Field>
        <Field label="Fecha">
          <input
            type="date"
            value={fechaMov}
            max={diaISO()}
            onChange={(e) => setFechaMov(e.target.value)}
            className={INPUT}
          />
        </Field>
        <div>
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Categoría
          </span>
          <Sel value={categoria} onChange={setCategoria} opciones={cats} etiqueta="Categoría" />
        </div>
        <div>
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Cuenta
          </span>
          <Sel
            value={cuentaId}
            onChange={setCuentaId}
            etiqueta="Cuenta"
            opciones={cuentas.map((c) => ({ value: c.id, label: c.nombre }))}
          />
        </div>
        <div>
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Sucursal
          </span>
          <Sel
            value={sucursal}
            onChange={setSucursal}
            etiqueta="Sucursal del movimiento"
            opciones={[GENERAL, ...ctx.sucursales]}
          />
        </div>
        <Field label="Comprobante">
          <input
            value={comprobante}
            onChange={(e) => setComprobante(e.target.value)}
            placeholder="Nº de factura o recibo"
            className={INPUT}
            aria-label="Comprobante"
          />
        </Field>
      </div>
      {error && <p className="text-[12px] font-medium text-rose-600">{error}</p>}
      <Acciones etiqueta="Guardar" onCancel={onCancel} />
    </form>
  );
}

/* ───────────── Cuentas a pagar ───────────── */

function CuentasPagar({ ctx, libro }: { ctx: CtxFin; libro: Libro }) {
  const { fin } = libro;
  const hoy = diaISO();
  const [filtro, setFiltro] = useState<"Pendientes" | "Vencidas" | "Pagadas" | "Todas">(
    "Pendientes",
  );
  const [q, setQ] = useState("");
  const [nueva, setNueva] = useState<Partial<CuentaPagar> | null>(null);
  const [pagar, setPagar] = useState<CuentaPagar | null>(null);
  const [gasto, setGasto] = useState<GastoFijo | "nuevo" | null>(null);
  const todas = deSucursal(fin.cuentasPagar, ctx.sucursal);
  const pend = todas.filter((c) => c.estado === "Pendiente");
  const venc = pend.filter((c) => c.vence < hoy);
  const semana = pend.filter((c) => c.vence >= hoy && c.vence <= diaISO(7));
  const pagadoMes = todas.filter((c) => c.estado === "Pagada" && c.pagada.startsWith(mesISO(0)));
  const lista = todas
    .filter((c) =>
      filtro === "Pendientes"
        ? c.estado === "Pendiente"
        : filtro === "Vencidas"
          ? c.estado === "Pendiente" && c.vence < hoy
          : filtro === "Pagadas"
            ? c.estado === "Pagada"
            : true,
    )
    .filter(
      (c) =>
        !q || `${c.proveedor} ${c.numero} ${c.concepto}`.toLowerCase().includes(q.toLowerCase()),
    )
    .sort((a, b) =>
      a.estado === b.estado
        ? a.estado === "Pagada"
          ? b.pagada.localeCompare(a.pagada)
          : a.vence.localeCompare(b.vence)
        : a.estado === "Pendiente"
          ? -1
          : 1,
    );
  const sinGenerar = fin.gastosFijos.filter(
    (g) => g.activo && !fin.generados.includes(`${g.id}:${mesISO(0)}`),
  );

  const cargarSugerencia = (s: Sugerencia) => {
    const d = new Date(s.fecha || hoy);
    d.setDate(d.getDate() + 30);
    setFinanzas("cuentasPagar", (p) => [
      ...p,
      {
        id: `cp-${Date.now()}`,
        proveedor: s.proveedor,
        numero: "",
        concepto: s.concepto,
        categoria: s.categoria,
        sucursal: s.sucursal,
        emision: s.fecha || hoy,
        vence: d.toISOString().slice(0, 10),
        monto: s.monto,
        estado: "Pendiente",
        pagada: "",
        movId: "",
        origen: s.origen,
        ref: s.ref,
      },
    ]);
    if (s.origen === "Orden de compra")
      setFinanzas("ordenesRegistradas", (p) => [...p, s.ref.replace("oc:", "")]);
    else setFinanzas("laboratorioRegistrado", (p) => [...p, s.ref.replace("lab:", "")]);
    ctx.onToast(`Deuda con ${s.proveedor} cargada`);
  };

  const generarFijos = () => {
    const mes = mesISO(0);
    setFinanzas("cuentasPagar", (p) => [
      ...p,
      ...sinGenerar.map((g, i) => ({
        id: `cp-${Date.now()}-${i}`,
        proveedor: g.proveedor,
        numero: "",
        concepto: `${g.concepto} · ${nombreMes(mes, true)}`,
        categoria: g.categoria,
        sucursal: g.sucursal,
        emision: hoy,
        vence: diaDelMes(0, g.dia) < hoy ? hoy : diaDelMes(0, g.dia),
        monto: g.monto,
        estado: "Pendiente" as const,
        pagada: "",
        movId: "",
        origen: "Gasto fijo" as const,
        ref: `${g.id}:${mes}`,
      })),
    ]);
    setFinanzas("generados", (p) => [...p, ...sinGenerar.map((g) => `${g.id}:${mes}`)]);
    ctx.onToast(
      `${sinGenerar.length} gasto${sinGenerar.length > 1 ? "s" : ""} fijo${sinGenerar.length > 1 ? "s" : ""} generado${sinGenerar.length > 1 ? "s" : ""}`,
    );
  };

  const exportar = () =>
    void descargarExcel(`cuentas-a-pagar-${hoy}.xlsx`, [
      {
        nombre: "Cuentas a pagar",
        columnas: [
          { titulo: "Proveedor", clave: "p", ancho: 28 },
          { titulo: "Comprobante", clave: "n", ancho: 18 },
          { titulo: "Concepto", clave: "c", ancho: 36 },
          { titulo: "Categoría", clave: "cat", ancho: 26 },
          { titulo: "Sucursal", clave: "s", ancho: 16 },
          { titulo: "Vence", clave: "v", ancho: 12 },
          { titulo: "Estado", clave: "e", ancho: 12 },
          { titulo: "Importe", clave: "m", moneda: true, ancho: 16 },
        ],
        filas: lista.map((c) => ({
          p: c.proveedor,
          n: c.numero,
          c: c.concepto,
          cat: c.categoria,
          s: c.sucursal,
          v: fecha(c.vence),
          e: c.estado === "Pendiente" && c.vence < hoy ? "Vencida" : c.estado,
          m: c.monto,
        })),
        totales: { p: "Total", m: lista.reduce((a, c) => a + c.monto, 0) },
      },
    ]).then(() => ctx.onToast("Cuentas a pagar exportadas a Excel"));

  return (
    <div className="space-y-3">
      <Encabezado
        icon={Receipt}
        titulo="Cuentas a pagar"
        descripcion="Facturas de proveedores, compras de Inventario, laboratorio y gastos fijos."
      >
        <button type="button" className={BTN_SECUNDARIO} onClick={exportar}>
          <FileSpreadsheet className="size-4" /> Excel
        </button>
        <button type="button" className={BTN_PRIMARIO} onClick={() => setNueva({})}>
          <Plus className="size-4" /> Factura de proveedor
        </button>
      </Encabezado>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Mini
          label="Vencido"
          valor={ctx.$(venc.reduce((a, c) => a + c.monto, 0))}
          icon={AlarmClock}
          tono="text-rose-600"
          sub={`${venc.length} facturas`}
        />
        <Mini
          label="Vence en 7 días"
          valor={ctx.$(semana.reduce((a, c) => a + c.monto, 0))}
          icon={CalendarClock}
          tono="text-amber-600"
          sub={`${semana.length} facturas`}
        />
        <Mini
          label="Total pendiente"
          valor={ctx.$(pend.reduce((a, c) => a + c.monto, 0))}
          icon={Receipt}
          sub={`${pend.length} facturas`}
        />
        <Mini
          label="Pagado este mes"
          valor={ctx.$(pagadoMes.reduce((a, c) => a + c.monto, 0))}
          icon={CheckCircle2}
          tono="text-emerald-600"
          sub={`${pagadoMes.length} pagos`}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.6fr_1fr]">
        <div className="card-grad space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar proveedor, número o concepto"
                aria-label="Buscar factura de proveedor"
                className={`${INPUT} pl-9`}
              />
            </div>
            <div className="flex rounded-full bg-primary/[0.05] p-1">
              {(["Pendientes", "Vencidas", "Pagadas", "Todas"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={CHIP(filtro === f)}
                  onClick={() => setFiltro(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          {lista.length ? (
            <ul className="space-y-2">
              {lista.map((c) => {
                const vencida = c.estado === "Pendiente" && c.vence < hoy;
                return (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl bg-white/85 px-3 py-2.5 ring-1 ring-primary/10"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold">
                        {c.proveedor}
                        {c.numero && (
                          <span className="font-normal text-muted-foreground"> · {c.numero}</span>
                        )}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {c.concepto} · {c.categoria}
                        {c.sucursal !== GENERAL ? ` · ${c.sucursal}` : ""}
                        {c.origen !== "Manual" ? ` · ${c.origen}` : ""}
                      </p>
                    </div>
                    <span
                      className={`text-[11px] ${vencida ? "font-semibold text-rose-600" : "text-muted-foreground"}`}
                    >
                      {c.estado === "Pagada"
                        ? `Pagada ${fecha(c.pagada)}`
                        : `${vencida ? "Venció" : "Vence"} ${fecha(c.vence)}`}
                    </span>
                    <b className="text-[13px]">{ctx.$(c.monto)}</b>
                    <Pill
                      clase={
                        c.estado === "Pagada"
                          ? "bg-emerald-100 text-emerald-700"
                          : vencida
                            ? "bg-rose-100 text-rose-700"
                            : "bg-amber-100 text-amber-700"
                      }
                    >
                      {c.estado === "Pagada" ? "Pagada" : vencida ? "Vencida" : "Pendiente"}
                    </Pill>
                    {c.estado === "Pendiente" && (
                      <button type="button" className={BTN_PRIMARIO} onClick={() => setPagar(c)}>
                        <Wallet className="size-4" /> Pagar
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <Vacio icon={CheckCircle2} texto="No hay facturas en este filtro." />
          )}
        </div>
        <div className="space-y-3">
          <Tarjeta titulo={`Para cargar (${libro.sugerencias.length})`}>
            {libro.sugerencias.length ? (
              <ul className="space-y-2">
                {libro.sugerencias.map((s) => (
                  <li
                    key={s.ref}
                    className="flex items-center gap-2 rounded-xl bg-white/85 px-3 py-2 ring-1 ring-primary/10"
                  >
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[13px]">{s.proveedor}</b>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {s.origen} · {s.concepto}
                      </span>
                    </span>
                    <b className="text-[12px]">{ctx.$(s.monto)}</b>
                    <button
                      type="button"
                      className={BTN_SECUNDARIO}
                      onClick={() => cargarSugerencia(s)}
                    >
                      Cargar
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12px] text-muted-foreground">
                Las órdenes de compra recibidas en Inventario y los trabajos de laboratorio
                entregados aparecen acá para cargarlos como deuda.
              </p>
            )}
          </Tarjeta>
          <Tarjeta
            titulo="Gastos fijos"
            accion={
              <button
                type="button"
                className="text-[11px] font-semibold text-primary hover:underline"
                onClick={() => setGasto("nuevo")}
              >
                + Agregar
              </button>
            }
          >
            <ul className="scroll-sutil max-h-[260px] space-y-1.5 overflow-y-auto pr-1">
              {fin.gastosFijos.map((g) => {
                const hecho = fin.generados.includes(`${g.id}:${mesISO(0)}`);
                return (
                  <li key={g.id}>
                    <button
                      type="button"
                      onClick={() => setGasto(g)}
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left ring-1 ring-primary/10 hover:bg-white ${g.activo ? "bg-white/85" : "bg-muted/40 opacity-60"}`}
                    >
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-[12.5px]">{g.concepto}</b>
                        <span className="text-[10.5px] text-muted-foreground">
                          Día {g.dia} · {g.proveedor}
                        </span>
                      </span>
                      <b className="text-[12px]">{ctx.$(g.monto)}</b>
                      {g.activo && hecho && <CheckCircle2 className="size-3.5 text-emerald-500" />}
                    </button>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              className={`${BTN_PRIMARIO} mt-3 w-full`}
              disabled={!sinGenerar.length}
              onClick={generarFijos}
            >
              <Repeat className="size-4" />
              {sinGenerar.length
                ? `Generar ${sinGenerar.length} del mes`
                : `Gastos de ${nombreMes(mesISO(0), true)} generados`}
            </button>
          </Tarjeta>
        </div>
      </div>
      {nueva && (
        <M titulo="Factura de proveedor" onClose={() => setNueva(null)}>
          <CuentaPagarForm
            ctx={ctx}
            onCancel={() => setNueva(null)}
            onGuardar={(c) => {
              setFinanzas("cuentasPagar", (p) => [...p, c]);
              setNueva(null);
              ctx.onToast(`Factura de ${c.proveedor} cargada`);
            }}
          />
        </M>
      )}
      {pagar && (
        <M titulo={`Pagar a ${pagar.proveedor}`} onClose={() => setPagar(null)}>
          <PagarForm
            ctx={ctx}
            libro={libro}
            c={pagar}
            onCancel={() => setPagar(null)}
            onPagar={(cuentaId, dia) => {
              const movId = `mf-${Date.now()}`;
              setFinanzas("movimientos", (p) => [
                ...p,
                {
                  id: movId,
                  fecha: dia,
                  tipo: "Egreso",
                  categoria: pagar.categoria,
                  concepto: `${pagar.proveedor}${pagar.numero ? ` · ${pagar.numero}` : ` · ${pagar.concepto}`}`,
                  monto: pagar.monto,
                  cuentaId,
                  sucursal: pagar.sucursal,
                  origen: "Proveedores",
                  comprobante: pagar.numero,
                  ref: pagar.id,
                },
              ]);
              setFinanzas("cuentasPagar", (p) =>
                p.map((x) =>
                  x.id === pagar.id ? { ...x, estado: "Pagada", pagada: dia, movId } : x,
                ),
              );
              setPagar(null);
              ctx.onToast(`Pago a ${pagar.proveedor} registrado · ${ctx.$(pagar.monto)}`);
            }}
          />
        </M>
      )}
      {gasto && (
        <M
          titulo={gasto === "nuevo" ? "Nuevo gasto fijo" : "Gasto fijo"}
          onClose={() => setGasto(null)}
        >
          <GastoFijoForm
            ctx={ctx}
            g={gasto === "nuevo" ? null : gasto}
            onCancel={() => setGasto(null)}
            onGuardar={(g) => {
              setFinanzas("gastosFijos", (p) =>
                p.some((x) => x.id === g.id) ? p.map((x) => (x.id === g.id ? g : x)) : [...p, g],
              );
              setGasto(null);
              ctx.onToast("Gasto fijo guardado");
            }}
          />
        </M>
      )}
    </div>
  );
}

function CuentaPagarForm({
  ctx,
  onCancel,
  onGuardar,
}: {
  ctx: CtxFin;
  onCancel: () => void;
  onGuardar: (c: CuentaPagar) => void;
}) {
  const [proveedor, setProveedor] = useState("");
  const [numero, setNumero] = useState("");
  const [concepto, setConcepto] = useState("");
  const [categoria, setCategoria] = useState<CategoriaEgreso>("Insumos");
  const [sucursal, setSucursal] = useState(ctx.sucursal === "Todas" ? GENERAL : ctx.sucursal);
  const [emision, setEmision] = useState(diaISO());
  const [vence, setVence] = useState(diaISO(30));
  const [monto, setMonto] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const n = Number(monto);
        if (!proveedor.trim()) return setError("Indicá el proveedor");
        if (!(n > 0)) return setError("El importe tiene que ser mayor a cero");
        if (vence < emision) return setError("El vencimiento no puede ser anterior a la emisión");
        onGuardar({
          id: `cp-${Date.now()}`,
          proveedor: proveedor.trim(),
          numero: numero.trim(),
          concepto: concepto.trim() || categoria,
          categoria,
          sucursal,
          emision,
          vence,
          monto: Math.round(n),
          estado: "Pendiente",
          pagada: "",
          movId: "",
          origen: "Manual",
          ref: "",
        });
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Proveedor *">
          <input
            value={proveedor}
            onChange={(e) => setProveedor(e.target.value)}
            className={INPUT}
            aria-label="Proveedor"
          />
        </Field>
        <Field label="Nº de comprobante">
          <input
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="A-0001-00001234"
            className={INPUT}
          />
        </Field>
        <div className="col-span-2">
          <Field label="Concepto">
            <input
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className={INPUT}
              aria-label="Concepto de la factura"
            />
          </Field>
        </div>
        <div>
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Categoría
          </span>
          <Sel
            value={categoria}
            onChange={setCategoria}
            opciones={CATEGORIAS_EGRESO}
            etiqueta="Categoría del gasto"
          />
        </div>
        <div>
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Sucursal
          </span>
          <Sel
            value={sucursal}
            onChange={setSucursal}
            opciones={[GENERAL, ...ctx.sucursales]}
            etiqueta="Sucursal de la factura"
          />
        </div>
        <Field label="Emisión">
          <input
            type="date"
            value={emision}
            onChange={(e) => setEmision(e.target.value)}
            className={INPUT}
          />
        </Field>
        <Field label="Vencimiento">
          <input
            type="date"
            value={vence}
            onChange={(e) => setVence(e.target.value)}
            className={INPUT}
            aria-label="Vencimiento"
          />
        </Field>
        <Field label="Importe *">
          <input
            type="number"
            min={0}
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className={INPUT}
            aria-label="Importe de la factura"
          />
        </Field>
      </div>
      {error && <p className="text-[12px] font-medium text-rose-600">{error}</p>}
      <Acciones etiqueta="Cargar factura" onCancel={onCancel} />
    </form>
  );
}

function PagarForm({
  ctx,
  libro,
  c,
  onCancel,
  onPagar,
}: {
  ctx: CtxFin;
  libro: Libro;
  c: CuentaPagar;
  onCancel: () => void;
  onPagar: (cuentaId: string, dia: string) => void;
}) {
  const [cuentaId, setCuentaId] = useState(libro.fin.cuentas[0]?.id ?? "");
  const [dia, setDia] = useState(diaISO());
  const saldo = libro.saldoCuenta(cuentaId);
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onPagar(cuentaId, dia);
      }}
    >
      <div className="rounded-2xl bg-primary/[0.05] p-3 text-sm ring-1 ring-primary/10">
        <p className="font-semibold">{c.concepto}</p>
        <p className="text-[12px] text-muted-foreground">
          {c.numero || "Sin número"} · vence {fecha(c.vence)}
        </p>
        <p className="mt-1 text-xl font-bold text-primary">{ctx.$(c.monto)}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Pagar desde
          </span>
          <Sel
            value={cuentaId}
            onChange={setCuentaId}
            etiqueta="Cuenta de pago"
            opciones={libro.fin.cuentas.map((x) => ({ value: x.id, label: x.nombre }))}
          />
        </div>
        <Field label="Fecha de pago">
          <input
            type="date"
            value={dia}
            max={diaISO()}
            onChange={(e) => setDia(e.target.value)}
            className={INPUT}
          />
        </Field>
      </div>
      <p
        className={`text-[12px] ${saldo < c.monto ? "font-semibold text-rose-600" : "text-muted-foreground"}`}
      >
        Saldo disponible: {ctx.$(saldo)}
        {saldo < c.monto ? " · no alcanza para este pago" : ""}
      </p>
      <Acciones etiqueta="Registrar pago" onCancel={onCancel} icon={Wallet} />
    </form>
  );
}

function GastoFijoForm({
  ctx,
  g,
  onCancel,
  onGuardar,
}: {
  ctx: CtxFin;
  g: GastoFijo | null;
  onCancel: () => void;
  onGuardar: (g: GastoFijo) => void;
}) {
  const [f, setF] = useState<GastoFijo>(
    g ?? {
      id: `gf-${Date.now()}`,
      concepto: "",
      proveedor: "",
      categoria: "Servicios (luz, agua, internet)",
      monto: 0,
      dia: 10,
      sucursal: GENERAL,
      activo: true,
    },
  );
  const [error, setError] = useState("");
  const set = <K extends keyof GastoFijo>(k: K, v: GastoFijo[K]) => setF((x) => ({ ...x, [k]: v }));
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!f.concepto.trim()) return setError("Escribí el concepto");
        if (!(f.monto > 0)) return setError("El importe tiene que ser mayor a cero");
        onGuardar({ ...f, concepto: f.concepto.trim(), dia: Math.min(28, Math.max(1, f.dia)) });
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Concepto *">
          <input
            value={f.concepto}
            onChange={(e) => set("concepto", e.target.value)}
            className={INPUT}
            aria-label="Concepto del gasto fijo"
          />
        </Field>
        <Field label="Proveedor">
          <input
            value={f.proveedor}
            onChange={(e) => set("proveedor", e.target.value)}
            className={INPUT}
          />
        </Field>
        <Field label="Importe *">
          <input
            type="number"
            min={0}
            value={f.monto || ""}
            onChange={(e) => set("monto", Number(e.target.value))}
            className={INPUT}
            aria-label="Importe mensual"
          />
        </Field>
        <Field label="Día de vencimiento">
          <input
            type="number"
            min={1}
            max={28}
            value={f.dia}
            onChange={(e) => set("dia", Number(e.target.value))}
            className={INPUT}
          />
        </Field>
        <div>
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Categoría
          </span>
          <Sel
            value={f.categoria}
            onChange={(v) => set("categoria", v)}
            opciones={CATEGORIAS_EGRESO}
            etiqueta="Categoría del gasto fijo"
          />
        </div>
        <div>
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Sucursal
          </span>
          <Sel
            value={f.sucursal}
            onChange={(v) => set("sucursal", v)}
            opciones={[GENERAL, ...ctx.sucursales]}
            etiqueta="Sucursal del gasto fijo"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={f.activo}
          onChange={(e) => set("activo", e.target.checked)}
          className="accent-[var(--primary)]"
        />
        Activo (se genera todos los meses)
      </label>
      {error && <p className="text-[12px] font-medium text-rose-600">{error}</p>}
      <Acciones etiqueta="Guardar" onCancel={onCancel} />
    </form>
  );
}

/* ───────────── Bancos y conciliación ───────────── */

function aISO(v: string | number) {
  const s = String(v).trim();
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (dmy) {
    const [, d = "1", m = "1", a = "2026"] = dmy;
    return `${a.length === 2 ? `20${a}` : a}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}
function aNumero(v: string | number | undefined) {
  if (typeof v === "number") return v;
  const s = String(v ?? "").replace(/[^\d,.-]/g, "");
  if (!s) return 0;
  // 1.234,56 → 1234.56 ; 1234.56 → 1234.56
  return Number(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s) || 0;
}
const diasEntre = (a: string, b: string) =>
  Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86_400_000;

function Bancos({
  ctx,
  libro,
  nuevo,
}: {
  ctx: CtxFin;
  libro: Libro;
  nuevo: (b: Partial<MovFin>) => void;
}) {
  const { fin } = libro;
  const [cuentaSel, setCuentaSel] = useState(
    fin.cuentas.find((c) => c.tipo !== "Efectivo")?.id ?? "banco",
  );
  const [nuevaCuenta, setNuevaCuenta] = useState(false);
  const [transferir, setTransferir] = useState(false);
  const [detalle, setDetalle] = useState<string | null>(null);
  const archivo = useRef<HTMLInputElement>(null);

  const lineas = fin.extracto.filter((l) => l.cuentaId === cuentaSel);
  const candidatos = libro.asientos.filter((a) => a.cuentaId === cuentaSel);
  // Empareja cada línea del banco con un asiento del mismo importe y ±3 días.
  const emparejado = useMemo(() => {
    const usados = new Set<string>();
    return lineas.map((l) => {
      const a = candidatos.find(
        (x) =>
          !usados.has(x.id) &&
          (x.tipo === "Ingreso" ? x.monto : -x.monto) === l.monto &&
          diasEntre(x.fecha, l.fecha) <= 3,
      );
      if (a) usados.add(a.id);
      return { l, a };
    });
  }, [lineas, candidatos]);
  const conciliadas = emparejado.filter((x) => x.a && fin.conciliados.includes(x.a.id)).length;
  const coinciden = emparejado.filter((x) => x.a && !fin.conciliados.includes(x.a.id));

  const cargarLineas = (nuevas: Omit<LineaExtracto, "id" | "cuentaId">[], origen: string) => {
    setFinanzas("extracto", (p) => [
      ...p.filter((l) => l.cuentaId !== cuentaSel),
      ...nuevas.map((l, i) => ({ ...l, id: `ex-${Date.now()}-${i}`, cuentaId: cuentaSel })),
    ]);
    ctx.onToast(`${origen}: ${nuevas.length} líneas`);
  };

  const ejemplo = () => {
    const base = libro.asientos
      .filter((a) => a.cuentaId === cuentaSel && a.fecha >= diaISO(-30))
      .slice(0, 14);
    const lineasEj = base
      .filter((_, i) => i !== 3) // uno que el banco todavía no acreditó
      .map((a, i) => {
        const d = new Date(a.fecha);
        if (i % 3 === 1) d.setDate(d.getDate() + 1);
        return {
          fecha: d.toISOString().slice(0, 10),
          descripcion:
            a.tipo === "Ingreso"
              ? `CRED ${a.concepto.toUpperCase().slice(0, 32)}`
              : `DEB ${a.concepto.toUpperCase().slice(0, 32)}`,
          monto: a.tipo === "Ingreso" ? a.monto : -a.monto,
        };
      });
    lineasEj.push(
      { fecha: diaISO(-6), descripcion: "PERCEPCION IIBB CABA", monto: -8_940 },
      { fecha: diaISO(-2), descripcion: "COMISION TRANSFERENCIA", monto: -1_250 },
    );
    cargarLineas(lineasEj, "Extracto de ejemplo cargado");
  };

  const importar = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const filas = await leerPlanilla(f);
      const val = (r: Record<string, string | number>, ...claves: string[]) => {
        const k = Object.keys(r).find((x) => claves.some((c) => x.toLowerCase().startsWith(c)));
        return k ? r[k] : undefined;
      };
      const nuevas = filas
        .map((r) => {
          const importe = val(r, "importe", "monto");
          const monto =
            importe !== undefined && importe !== ""
              ? aNumero(importe)
              : aNumero(val(r, "crédito", "credito")) - aNumero(val(r, "débito", "debito"));
          return {
            fecha: aISO(val(r, "fecha") ?? ""),
            descripcion: String(val(r, "descrip", "concepto", "detalle") ?? ""),
            monto: Math.round(monto),
          };
        })
        .filter((l) => l.fecha && l.monto);
      if (!nuevas.length)
        return ctx.onToast("No se encontraron columnas Fecha / Descripción / Importe");
      cargarLineas(nuevas, "Extracto importado");
    } catch {
      ctx.onToast("No se pudo leer el archivo");
    }
  };

  const plantilla = () =>
    void descargarExcel("plantilla-extracto-bancario.xlsx", [
      {
        nombre: "Extracto",
        nota: "Pegá el extracto de tu banco: Importe positivo = crédito, negativo = débito (o usá columnas Débito y Crédito).",
        columnas: [
          { titulo: "Fecha", clave: "f", ancho: 12 },
          { titulo: "Descripción", clave: "d", ancho: 40 },
          { titulo: "Importe", clave: "m", ancho: 16, moneda: true },
        ],
        filas: [
          { f: fecha(diaISO(-2)), d: "CRED LIQUIDACION TARJETAS", m: 1_250_000 },
          { f: fecha(diaISO(-1)), d: "DEB PAGO PROVEEDOR", m: -185_000 },
        ],
      },
    ]).then(() => ctx.onToast("Plantilla descargada"));

  return (
    <div className="space-y-3">
      <Encabezado
        icon={Landmark}
        titulo="Bancos y conciliación"
        descripcion="Saldos por cuenta, transferencias internas y conciliación con el extracto del banco."
      >
        <button type="button" className={BTN_SECUNDARIO} onClick={() => setTransferir(true)}>
          <ArrowLeftRight className="size-4" /> Transferir
        </button>
        <button type="button" className={BTN_PRIMARIO} onClick={() => setNuevaCuenta(true)}>
          <Plus className="size-4" /> Nueva cuenta
        </button>
      </Encabezado>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {fin.cuentas.map((c) => {
          const movsMes = libro.asientos.filter(
            (a) => a.cuentaId === c.id && a.fecha.startsWith(mesISO(0)),
          );
          return (
            <div key={c.id} className="card-grad p-4">
              <div className="flex items-start gap-3">
                <IconoCuenta tipo={c.tipo} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{c.nombre}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{c.detalle}</p>
                </div>
                <Pill clase="bg-primary/10 text-primary">{c.tipo}</Pill>
              </div>
              <p className="mt-3 text-2xl font-bold tracking-tight text-primary">
                {ctx.$(libro.saldoCuenta(c.id))}
              </p>
              <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                <span className="text-emerald-600">
                  +{ctx.$(sumar(movsMes, "Ingreso"))} este mes
                </span>
                <span className="text-rose-600">−{ctx.$(sumar(movsMes, "Egreso"))}</span>
              </div>
              <button
                type="button"
                className="mt-3 text-[12px] font-semibold text-primary hover:underline"
                onClick={() => setDetalle(c.id)}
              >
                Ver movimientos
              </button>
            </div>
          );
        })}
      </div>

      <div className="card-grad space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">Conciliación bancaria</p>
            <p className="text-[12px] text-muted-foreground">
              Importá el extracto y Cloud Esther lo cruza con tus movimientos (mismo importe, ±3
              días).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-56">
              <Sel
                value={cuentaSel}
                onChange={setCuentaSel}
                etiqueta="Cuenta a conciliar"
                opciones={fin.cuentas
                  .filter((c) => c.tipo !== "Efectivo")
                  .map((c) => ({ value: c.id, label: c.nombre }))}
              />
            </div>
            <button type="button" className={BTN_SECUNDARIO} onClick={plantilla}>
              <FileSpreadsheet className="size-4" /> Plantilla
            </button>
            <button type="button" className={BTN_SECUNDARIO} onClick={ejemplo}>
              Extracto de ejemplo
            </button>
            <button type="button" className={BTN_PRIMARIO} onClick={() => archivo.current?.click()}>
              <Upload className="size-4" /> Importar extracto
            </button>
            <input
              ref={archivo}
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              aria-label="Archivo de extracto"
              onChange={(e) => void importar(e)}
            />
          </div>
        </div>
        {lineas.length ? (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Mini label="Líneas del banco" valor={String(lineas.length)} icon={Landmark} />
              <Mini
                label="Conciliadas"
                valor={String(conciliadas)}
                icon={BadgeCheck}
                tono="text-emerald-600"
              />
              <Mini
                label="Coinciden"
                valor={String(coinciden.length)}
                icon={CheckCircle2}
                tono="text-primary"
                sub="listas para conciliar"
              />
              <Mini
                label="Sin coincidencia"
                valor={String(emparejado.filter((x) => !x.a).length)}
                icon={CircleAlert}
                tono="text-amber-600"
              />
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className={BTN_PRIMARIO}
                disabled={!coinciden.length}
                onClick={() => {
                  setFinanzas("conciliados", (p) => [...p, ...coinciden.map((x) => x.a!.id)]);
                  ctx.onToast(`${coinciden.length} movimientos conciliados`);
                }}
              >
                <BadgeCheck className="size-4" /> Conciliar {coinciden.length} coincidencias
              </button>
            </div>
            <ul className="scroll-sutil max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
              {emparejado.map(({ l, a }) => {
                const ok = a && fin.conciliados.includes(a.id);
                return (
                  <li
                    key={l.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl bg-white/85 px-3 py-2 ring-1 ring-primary/10"
                  >
                    <span className="w-20 text-[11px] text-muted-foreground">{fecha(l.fecha)}</span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[12.5px]">{l.descripcion}</b>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {a
                          ? `↔ ${a.concepto} (${fecha(a.fecha)})`
                          : "No hay un movimiento con ese importe"}
                      </span>
                    </span>
                    <b
                      className={`text-[12.5px] ${l.monto >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                    >
                      {l.monto >= 0 ? "+" : "−"}
                      {ctx.$(Math.abs(l.monto))}
                    </b>
                    {ok ? (
                      <Pill clase="bg-emerald-100 text-emerald-700">Conciliado</Pill>
                    ) : a ? (
                      <Pill clase="bg-violet-100 text-violet-700">Coincide</Pill>
                    ) : (
                      <button
                        type="button"
                        className={BTN_SECUNDARIO}
                        onClick={() =>
                          nuevo({
                            tipo: l.monto >= 0 ? "Ingreso" : "Egreso",
                            categoria:
                              l.monto >= 0
                                ? "Otros ingresos"
                                : /iibb|impuesto|percep/i.test(l.descripcion)
                                  ? "Impuestos y tasas"
                                  : "Gastos bancarios",
                            concepto: titulo(l.descripcion),
                            monto: Math.abs(l.monto),
                            fecha: l.fecha,
                            cuentaId: cuentaSel,
                            sucursal: GENERAL,
                          })
                        }
                      >
                        <Plus className="size-4" /> Crear movimiento
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <Vacio
            icon={Upload}
            texto="Importá el extracto del banco (Excel o CSV) o probá con el extracto de ejemplo."
          />
        )}
      </div>

      {detalle && (
        <M
          titulo={fin.cuentas.find((c) => c.id === detalle)?.nombre ?? "Cuenta"}
          onClose={() => setDetalle(null)}
          ancho="max-w-3xl"
        >
          <ul className="space-y-2">
            {libro.asientos
              .filter((a) => a.cuentaId === detalle)
              .slice(0, 40)
              .map((a) => (
                <FilaAsiento key={a.id} ctx={ctx} a={a} cuentas={fin.cuentas} />
              ))}
          </ul>
        </M>
      )}
      {nuevaCuenta && (
        <M titulo="Nueva cuenta" onClose={() => setNuevaCuenta(false)}>
          <CuentaForm
            onCancel={() => setNuevaCuenta(false)}
            onGuardar={(c) => {
              setFinanzas("cuentas", (p) => [...p, c]);
              setNuevaCuenta(false);
              ctx.onToast(`Cuenta ${c.nombre} creada`);
            }}
          />
        </M>
      )}
      {transferir && (
        <M titulo="Transferir entre cuentas" onClose={() => setTransferir(false)}>
          <TransferenciaForm
            ctx={ctx}
            libro={libro}
            onCancel={() => setTransferir(false)}
            onTransferir={(desde, hacia, monto) => {
              const t = Date.now();
              const nd = fin.cuentas.find((c) => c.id === desde)?.nombre ?? desde;
              const nh = fin.cuentas.find((c) => c.id === hacia)?.nombre ?? hacia;
              const base = {
                fecha: diaISO(),
                monto,
                sucursal: GENERAL,
                origen: "Transferencia" as const,
                comprobante: "",
                ref: `tr-${t}`,
              };
              setFinanzas("movimientos", (p) => [
                ...p,
                {
                  ...base,
                  id: `tr-${t}-a`,
                  tipo: "Egreso",
                  categoria: "Otros gastos",
                  concepto: `Transferencia a ${nh}`,
                  cuentaId: desde,
                },
                {
                  ...base,
                  id: `tr-${t}-b`,
                  tipo: "Ingreso",
                  categoria: "Otros ingresos",
                  concepto: `Transferencia desde ${nd}`,
                  cuentaId: hacia,
                },
              ]);
              setTransferir(false);
              ctx.onToast(`Transferencia de ${ctx.$(monto)} registrada`);
            }}
          />
        </M>
      )}
    </div>
  );
}

function titulo(t: string) {
  return t.toLocaleLowerCase("es").replace(/(^|\s)\p{L}/gu, (c) => c.toUpperCase());
}

function CuentaForm({
  onCancel,
  onGuardar,
}: {
  onCancel: () => void;
  onGuardar: (c: CuentaFin) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<TipoCuenta>("Banco");
  const [detalle, setDetalle] = useState("");
  const [saldo, setSaldo] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!nombre.trim()) return setError("Poné un nombre a la cuenta");
        onGuardar({
          id: `cta-${Date.now()}`,
          nombre: nombre.trim(),
          tipo,
          detalle: detalle.trim(),
          saldoInicial: Number(saldo) || 0,
        });
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Field label="Nombre *">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej.: Banco Nación · Caja de ahorro"
              className={INPUT}
              aria-label="Nombre de la cuenta"
            />
          </Field>
        </div>
        <div>
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Tipo
          </span>
          <Sel
            value={tipo}
            onChange={setTipo}
            opciones={["Banco", "Billetera", "Efectivo"] as TipoCuenta[]}
            etiqueta="Tipo de cuenta"
          />
        </div>
        <Field label="Saldo inicial">
          <input
            type="number"
            value={saldo}
            onChange={(e) => setSaldo(e.target.value)}
            className={INPUT}
            aria-label="Saldo inicial"
          />
        </Field>
        <div className="col-span-2">
          <Field label="CBU, alias o ubicación">
            <input value={detalle} onChange={(e) => setDetalle(e.target.value)} className={INPUT} />
          </Field>
        </div>
      </div>
      {error && <p className="text-[12px] font-medium text-rose-600">{error}</p>}
      <Acciones etiqueta="Crear cuenta" onCancel={onCancel} />
    </form>
  );
}

function TransferenciaForm({
  ctx,
  libro,
  onCancel,
  onTransferir,
}: {
  ctx: CtxFin;
  libro: Libro;
  onCancel: () => void;
  onTransferir: (desde: string, hacia: string, monto: number) => void;
}) {
  const cuentas = libro.fin.cuentas;
  const [desde, setDesde] = useState(cuentas[0]?.id ?? "");
  const [hacia, setHacia] = useState(cuentas[1]?.id ?? "");
  const [monto, setMonto] = useState("");
  const [error, setError] = useState("");
  const opciones = cuentas.map((c) => ({ value: c.id, label: c.nombre }));
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const n = Math.round(Number(monto));
        if (desde === hacia) return setError("Elegí dos cuentas distintas");
        if (!(n > 0)) return setError("El importe tiene que ser mayor a cero");
        if (n > libro.saldoCuenta(desde))
          return setError("La cuenta de origen no tiene saldo suficiente");
        onTransferir(desde, hacia, n);
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Desde
          </span>
          <Sel value={desde} onChange={setDesde} opciones={opciones} etiqueta="Cuenta de origen" />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Saldo {ctx.$(libro.saldoCuenta(desde))}
          </p>
        </div>
        <div>
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Hacia
          </span>
          <Sel value={hacia} onChange={setHacia} opciones={opciones} etiqueta="Cuenta de destino" />
        </div>
        <div className="col-span-2">
          <Field label="Importe *">
            <input
              type="number"
              min={0}
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className={INPUT}
              aria-label="Importe a transferir"
            />
          </Field>
        </div>
      </div>
      {error && <p className="text-[12px] font-medium text-rose-600">{error}</p>}
      <Acciones etiqueta="Transferir" onCancel={onCancel} icon={ArrowLeftRight} />
    </form>
  );
}
