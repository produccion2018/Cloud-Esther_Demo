import { useState } from "react";
import {
  AlarmClock,
  ArrowDownLeft,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Copy,
  FileSpreadsheet,
  HandCoins,
  LineChart,
  PiggyBank,
  Scale,
  Stethoscope,
  TrendingUp,
  UserRound,
  Wallet,
} from "lucide-react";
import {
  CATEGORIAS_EGRESO,
  CATEGORIAS_INGRESO,
  COSTOS_DIRECTOS,
  diaDelMes,
  diaISO,
  mesISO,
  nombreMes,
  setFinanzas,
  type CategoriaEgreso,
} from "@/lib/cloud-esther/finanzas-store";
import { totalesComprobante } from "@/lib/cloud-esther/facturacion-store";
import {
  delMes,
  porCategoria,
  sumar,
  type Asiento,
  type Libro,
} from "@/components/cloud-esther/finanzas/libro";
import {
  GENERAL,
  M,
  Tarjeta,
  deSucursal,
  type CtxFin,
} from "@/components/cloud-esther/finanzas/comun";
import {
  Acciones,
  BTN_PRIMARIO,
  BTN_SECUNDARIO,
  CHIP,
  Encabezado,
  INPUT,
  Mini,
  Pill,
  Sel,
  Vacio,
  fecha,
} from "@/components/cloud-esther/rrhh/ui";
import { descargarExcel } from "@/components/cloud-esther/rrhh/excel";

/* Flujo de caja proyectado, presupuesto, rentabilidad (con comisiones) y estado de resultados. */

/* ───────────── Flujo de caja ───────────── */

export type Semana = {
  desde: string;
  hasta: string;
  entradas: number;
  salidas: number;
  saldo: number;
  items: { fecha: string; concepto: string; monto: number; tipo: "in" | "out"; origen: string }[];
};

export function proyeccion(libro: Libro, habituales: boolean, semanas = 8): Semana[] {
  const { fin } = libro;
  const hoy = diaISO();
  const items: Semana["items"] = [];
  for (const c of libro.cobrosEsperados)
    items.push({
      fecha: c.fecha < hoy ? hoy : c.fecha,
      concepto: c.concepto,
      monto: c.monto,
      tipo: "in",
      origen: c.origen,
    });
  for (const c of fin.cuentasPagar)
    if (c.estado === "Pendiente")
      items.push({
        fecha: c.vence < hoy ? hoy : c.vence,
        concepto: `${c.proveedor} · ${c.concepto}`,
        monto: c.monto,
        tipo: "out",
        origen: "Cuentas a pagar",
      });
  for (const n of [0, -1, -2])
    for (const g of fin.gastosFijos) {
      if (!g.activo || fin.generados.includes(`${g.id}:${mesISO(n)}`)) continue;
      const f = diaDelMes(n, g.dia);
      if (f >= hoy)
        items.push({
          fecha: f,
          concepto: g.concepto,
          monto: g.monto,
          tipo: "out",
          origen: "Gastos fijos",
        });
    }
  const ultimaNomina = libro.asientos.find((a) => a.origen === "Nómina")?.monto ?? 0;
  const nomina = libro.nominaPendiente || ultimaNomina;
  if (nomina)
    for (const n of [-1, -2])
      items.push({
        fecha: diaDelMes(n, 5),
        concepto: `Sueldos y cargas (${nombreMes(mesISO(n + 1), true)})`,
        monto: nomina,
        tipo: "out",
        origen: "Nómina",
      });
  if (habituales) {
    // Promedio semanal de las últimas 4 semanas de lo que no está programado.
    const ult = libro.operativos.filter((a) => a.fecha > diaISO(-28) && a.fecha <= hoy);
    const cobrosSem =
      ult
        .filter(
          (a) =>
            a.tipo === "Ingreso" &&
            (a.categoria === "Prestaciones" || a.categoria === "Venta de productos"),
        )
        .reduce((s, a) => s + a.monto, 0) / 4;
    const variables: string[] = [
      "Insumos",
      "Laboratorio",
      "Marketing",
      "Impuestos y tasas",
      "Gastos bancarios",
      "Otros gastos",
    ];
    const gastosSem =
      ult
        .filter(
          (a) =>
            a.tipo === "Egreso" && a.origen !== "Proveedores" && variables.includes(a.categoria),
        )
        .reduce((s, a) => s + a.monto, 0) / 4;
    for (let i = 0; i < semanas; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i * 7 + 3);
      const f = d.toISOString().slice(0, 10);
      items.push({
        fecha: f,
        concepto: "Cobros habituales (promedio)",
        monto: Math.round(cobrosSem),
        tipo: "in",
        origen: "Estimado",
      });
      items.push({
        fecha: f,
        concepto: "Gastos variables (promedio)",
        monto: Math.round(gastosSem),
        tipo: "out",
        origen: "Estimado",
      });
    }
  }
  let saldo = fin.cuentas.reduce((a, c) => a + libro.saldoCuenta(c.id), 0);
  return Array.from({ length: semanas }, (_, i) => {
    const desde = diaISO(i * 7);
    const hasta = diaISO(i * 7 + 6);
    const de = items
      .filter((x) => x.fecha >= desde && x.fecha <= hasta)
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
    const entradas = de.filter((x) => x.tipo === "in").reduce((s, x) => s + x.monto, 0);
    const salidas = de.filter((x) => x.tipo === "out").reduce((s, x) => s + x.monto, 0);
    saldo += entradas - salidas;
    return { desde, hasta, entradas, salidas, saldo, items: de };
  });
}

export function FlujoCaja({ ctx, libro }: { ctx: CtxFin; libro: Libro }) {
  const [habituales, setHabituales] = useState(true);
  const [abierta, setAbierta] = useState<number | null>(0);
  const semanas = proyeccion(libro, habituales);
  const inicial = libro.fin.cuentas.reduce((a, c) => a + libro.saldoCuenta(c.id), 0);
  const entradas = semanas.reduce((a, s) => a + s.entradas, 0);
  const salidas = semanas.reduce((a, s) => a + s.salidas, 0);
  const umbral = libro.fin.umbralSaldo;
  const max = Math.max(1, ...semanas.flatMap((s) => [s.entradas, s.salidas]));
  const maxSaldo = Math.max(1, inicial, ...semanas.map((s) => s.saldo));
  const minSaldo = Math.min(0, ...semanas.map((s) => s.saldo));
  const y = (v: number) => 100 - ((v - minSaldo) / (maxSaldo - minSaldo || 1)) * 100;
  const criticas = semanas.filter((s) => s.saldo < umbral);

  return (
    <div className="space-y-3">
      <Encabezado
        icon={LineChart}
        titulo="Flujo de caja proyectado"
        descripcion="Próximas 8 semanas: cobros esperados, pagos programados, gastos fijos y sueldos."
      >
        <label className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12px] ring-1 ring-primary/12">
          <input
            type="checkbox"
            checked={habituales}
            onChange={(e) => setHabituales(e.target.checked)}
            className="accent-[var(--primary)]"
          />
          Incluir cobros y gastos habituales
        </label>
      </Encabezado>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Mini label="Saldo hoy" valor={ctx.$(inicial)} icon={Wallet} />
        <Mini
          label="Entradas previstas"
          valor={ctx.$(entradas)}
          icon={ArrowDownLeft}
          tono="text-emerald-600"
        />
        <Mini
          label="Salidas previstas"
          valor={ctx.$(salidas)}
          icon={ArrowUpRight}
          tono="text-rose-600"
        />
        <Mini
          label="Saldo en 8 semanas"
          valor={ctx.$(semanas.at(-1)?.saldo ?? inicial)}
          icon={Scale}
          tono={(semanas.at(-1)?.saldo ?? 0) < umbral ? "text-rose-600" : "text-primary"}
        />
      </div>
      {criticas.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-100">
          <AlarmClock className="size-4" />
          <b>Atención:</b> {criticas.length} semana{criticas.length > 1 ? "s" : ""} con saldo por
          debajo de {ctx.$(umbral)}. La primera empieza el {fecha(criticas[0]!.desde)}: adelantá
          cobros o reprogramá pagos.
        </div>
      )}
      <Tarjeta
        titulo="Semana a semana"
        accion={
          <label className="flex items-center gap-2 whitespace-nowrap text-[11px] text-muted-foreground">
            Saldo mínimo
            <input
              type="number"
              aria-label="Saldo mínimo"
              defaultValue={umbral}
              onBlur={(e) =>
                setFinanzas("umbralSaldo", () => Math.max(0, Number(e.target.value) || 0))
              }
              className={`${INPUT} h-8 w-32`}
            />
          </label>
        }
      >
        <div className="relative h-[210px]">
          <div className="absolute inset-0 flex items-end gap-3 pb-6">
            {semanas.map((s, i) => (
              <button
                type="button"
                key={s.desde}
                onClick={() => setAbierta(i)}
                className={`flex h-full flex-1 items-end justify-center gap-1 rounded-lg pt-2 ${abierta === i ? "bg-primary/[0.06]" : ""}`}
                aria-label={`Semana del ${fecha(s.desde)}`}
              >
                <span
                  className="w-1/3 max-w-6 rounded-t-md bg-emerald-400"
                  style={{ height: `${Math.max(2, (s.entradas / max) * 70)}%` }}
                />
                <span
                  className="w-1/3 max-w-6 rounded-t-md bg-primary/70"
                  style={{ height: `${Math.max(2, (s.salidas / max) * 70)}%` }}
                />
              </button>
            ))}
          </div>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-x-0 top-0 h-[calc(100%-24px)] w-full"
          >
            <line
              x1="0"
              x2="100"
              y1={y(umbral)}
              y2={y(umbral)}
              stroke="#f43f5e"
              strokeDasharray="2 2"
              strokeWidth="0.4"
              vectorEffect="non-scaling-stroke"
            />
            <polyline
              fill="none"
              stroke="#7c3aed"
              strokeWidth="2.5"
              vectorEffect="non-scaling-stroke"
              points={semanas
                .map((s, i) => `${((i + 0.5) / semanas.length) * 100},${y(s.saldo)}`)
                .join(" ")}
            />
          </svg>
          <div className="absolute inset-x-0 bottom-0 flex gap-3">
            {semanas.map((s) => (
              <p key={s.desde} className="flex-1 text-center text-[10.5px] text-muted-foreground">
                {fecha(s.desde).slice(0, 5)}
              </p>
            ))}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-emerald-400" /> Entradas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-primary/70" /> Salidas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 bg-primary" /> Saldo
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 border-t border-dashed border-rose-500" /> Saldo mínimo
          </span>
        </div>
      </Tarjeta>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1.2fr]">
        <Tarjeta titulo="Semanas">
          <ul className="space-y-1.5">
            {semanas.map((s, i) => (
              <li key={s.desde}>
                <button
                  type="button"
                  onClick={() => setAbierta(i)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left ring-1 transition ${abierta === i ? "bg-primary/[0.07] ring-primary/30" : "bg-white/85 ring-primary/10 hover:bg-card"}`}
                >
                  <span className="w-24 text-[12px] font-semibold">
                    {fecha(s.desde).slice(0, 5)} – {fecha(s.hasta).slice(0, 5)}
                  </span>
                  <span className="flex-1 text-[11px] text-emerald-600">+{ctx.$(s.entradas)}</span>
                  <span className="flex-1 text-[11px] text-rose-600">−{ctx.$(s.salidas)}</span>
                  <b
                    className={`text-[12.5px] ${s.saldo < umbral ? "text-rose-600" : "text-primary"}`}
                  >
                    {ctx.$(s.saldo)}
                  </b>
                </button>
              </li>
            ))}
          </ul>
        </Tarjeta>
        <Tarjeta
          titulo={abierta === null ? "Detalle" : `Semana del ${fecha(semanas[abierta]!.desde)}`}
        >
          {abierta !== null && semanas[abierta]!.items.length ? (
            <ul className="scroll-sutil max-h-[380px] space-y-1.5 overflow-y-auto pr-1">
              {semanas[abierta]!.items.map((x, i) => (
                <li
                  key={`${x.concepto}-${i}`}
                  className="flex items-center gap-3 rounded-xl bg-white/85 px-3 py-2 ring-1 ring-primary/10"
                >
                  <span className="w-12 text-[11px] text-muted-foreground">
                    {fecha(x.fecha).slice(0, 5)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[12.5px]">{x.concepto}</b>
                    <span className="text-[10.5px] text-muted-foreground">{x.origen}</span>
                  </span>
                  <b
                    className={`text-[12.5px] ${x.tipo === "in" ? "text-emerald-600" : "text-rose-600"}`}
                  >
                    {x.tipo === "in" ? "+" : "−"}
                    {ctx.$(x.monto)}
                  </b>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Sin movimientos previstos esta semana.</p>
          )}
        </Tarjeta>
      </div>
    </div>
  );
}

/* ───────────── Presupuesto ───────────── */

export function Presupuesto({ ctx, libro }: { ctx: CtxFin; libro: Libro }) {
  const { fin } = libro;
  const [mes, setMes] = useState(mesISO(0));
  const reales = new Map(porCategoria(delMes(libro.operativos, mes), "Egreso"));
  const anterior = new Map(porCategoria(delMes(libro.operativos, mesISO(1)), "Egreso"));
  const filas = CATEGORIAS_EGRESO.map((c) => {
    const tope = fin.presupuesto[c] ?? 0;
    const real = reales.get(c) ?? 0;
    return { c, tope, real, pct: tope ? (real / tope) * 100 : real ? 999 : 0 };
  });
  const totTope = filas.reduce((a, f) => a + f.tope, 0);
  const totReal = filas.reduce((a, f) => a + f.real, 0);
  const excedidas = filas.filter((f) => f.tope && f.real > f.tope);
  const setTope = (c: CategoriaEgreso, v: number) =>
    setFinanzas("presupuesto", (p) => ({ ...p, [c]: Math.max(0, Math.round(v)) }));

  return (
    <div className="space-y-3">
      <Encabezado
        icon={PiggyBank}
        titulo="Presupuesto de gastos"
        descripcion="Tope mensual por categoría contra lo gastado de verdad."
      >
        <div className="w-56">
          <Sel
            value={mes}
            onChange={setMes}
            etiqueta="Mes del presupuesto"
            opciones={[0, 1, 2].map((n) => ({
              value: mesISO(n),
              label: nombreMes(mesISO(n), true),
            }))}
          />
        </div>
        <button
          type="button"
          className={BTN_SECUNDARIO}
          onClick={() => {
            setFinanzas("presupuesto", (p) => ({
              ...p,
              ...Object.fromEntries(
                [...anterior.entries()].map(([c, v]) => [c, Math.round(v * 1.05)]),
              ),
            }));
            ctx.onToast("Presupuesto armado con el gasto del mes anterior + 5 %");
          }}
        >
          <Copy className="size-4" /> Usar mes anterior + 5 %
        </button>
        <button
          type="button"
          className={BTN_SECUNDARIO}
          onClick={() =>
            void descargarExcel(`presupuesto-${mes}.xlsx`, [
              {
                nombre: "Presupuesto",
                nota: `Presupuesto vs. real · ${nombreMes(mes, true)}`,
                columnas: [
                  { titulo: "Categoría", clave: "c", ancho: 32 },
                  { titulo: "Presupuesto", clave: "p", moneda: true, ancho: 16 },
                  { titulo: "Real", clave: "r", moneda: true, ancho: 16 },
                  { titulo: "Diferencia", clave: "d", moneda: true, ancho: 16 },
                  { titulo: "% usado", clave: "u", ancho: 10 },
                ],
                filas: filas.map((f) => ({
                  c: f.c,
                  p: f.tope,
                  r: f.real,
                  d: f.tope - f.real,
                  u: f.tope ? `${Math.round(f.pct)} %` : "—",
                })),
                totales: { c: "Total", p: totTope, r: totReal, d: totTope - totReal },
              },
            ]).then(() => ctx.onToast("Presupuesto exportado a Excel"))
          }
        >
          <FileSpreadsheet className="size-4" /> Excel
        </button>
      </Encabezado>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Mini label="Presupuestado" valor={ctx.$(totTope)} icon={PiggyBank} />
        <Mini
          label="Gastado"
          valor={ctx.$(totReal)}
          icon={ArrowUpRight}
          tono={totReal > totTope ? "text-rose-600" : "text-primary"}
        />
        <Mini
          label="Disponible"
          valor={ctx.$(totTope - totReal)}
          icon={Wallet}
          tono={totTope - totReal < 0 ? "text-rose-600" : "text-emerald-600"}
        />
        <Mini
          label="Categorías excedidas"
          valor={String(excedidas.length)}
          icon={AlarmClock}
          tono={excedidas.length ? "text-rose-600" : "text-emerald-600"}
        />
      </div>
      <div className="card-grad p-4">
        <ul className="grid grid-cols-1 gap-2 xl:grid-cols-2">
          {filas.map((f) => {
            const color =
              f.pct > 100
                ? "from-rose-500 to-rose-400"
                : f.pct >= 85
                  ? "from-amber-500 to-amber-400"
                  : "from-emerald-500 to-emerald-400";
            return (
              <li
                key={f.c}
                className="grid grid-cols-1 items-center gap-2 rounded-xl bg-white/85 px-3 py-2 ring-1 ring-primary/10 md:grid-cols-[1.4fr_1.2fr_120px]"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold">{f.c}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {ctx.$(f.real)} de {ctx.$(f.tope)}
                    {f.tope ? ` · ${Math.round(f.pct)} %` : ""}
                  </p>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-primary/10">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${color}`}
                    style={{ width: `${Math.min(100, f.pct)}%` }}
                  />
                </div>
                <input
                  key={`${f.c}-${f.tope}`}
                  type="number"
                  min={0}
                  aria-label={`Presupuesto de ${f.c}`}
                  defaultValue={f.tope || ""}
                  placeholder="Sin tope"
                  onBlur={(e) =>
                    Number(e.target.value) !== f.tope && setTope(f.c, Number(e.target.value))
                  }
                  className={`${INPUT} h-8 text-right`}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/* ───────────── Rentabilidad y comisiones ───────────── */

const COSTO_DIRECTO: [RegExp, number][] = [
  [/implante|pilar/i, 0.38],
  [/corona|carilla|prótesis|protesis/i, 0.32],
  [/ortodoncia|alineador|bracket/i, 0.25],
  [/endodoncia/i, 0.14],
  [/blanqueamiento/i, 0.18],
  [/alquiler/i, 0.05],
];
const costoDe = (d: string) => COSTO_DIRECTO.find(([r]) => r.test(d))?.[1] ?? 0.12;

export function Rentabilidad({ ctx, libro }: { ctx: CtxFin; libro: Libro }) {
  const { fin } = libro;
  const [periodo, setPeriodo] = useState<"0" | "1" | "3m">("0");
  const [liquidar, setLiquidar] = useState<{
    profesional: string;
    cobrado: number;
    pct: number;
  } | null>(null);
  const meses = periodo === "3m" ? [mesISO(0), mesISO(1), mesISO(2)] : [mesISO(Number(periodo))];
  const enPeriodo = (f: string) => meses.some((m) => f.startsWith(m));
  const comps = deSucursal(libro.comprobantes, ctx.sucursal).filter((c) => enPeriodo(c.fecha));

  const profes = new Map<string, { facturado: number; cobrado: number; n: number }>();
  for (const c of deSucursal(libro.comprobantes, ctx.sucursal)) {
    if (!c.profesional) continue;
    const p = profes.get(c.profesional) ?? { facturado: 0, cobrado: 0, n: 0 };
    if (enPeriodo(c.fecha)) {
      p.facturado += totalesComprobante(c).total;
      p.n += 1;
    }
    p.cobrado += c.pagos.filter((x) => enPeriodo(x.fecha)).reduce((a, x) => a + x.monto, 0);
    profes.set(c.profesional, p);
  }
  const filasProf = [...profes.entries()]
    .filter(([, v]) => v.facturado || v.cobrado)
    .map(([nombre, v]) => {
      const pct = fin.comisiones[nombre] ?? fin.comisionPorDefecto;
      const liq = fin.liquidaciones.find(
        (l) => l.profesional === nombre && meses.length === 1 && l.periodo === meses[0],
      );
      return { nombre, ...v, pct, comision: Math.round((v.cobrado * pct) / 100), liq };
    })
    .sort((a, b) => b.facturado - a.facturado);

  const trat = new Map<string, { cant: number; facturado: number }>();
  for (const c of comps)
    for (const it of c.items) {
      const t = trat.get(it.descripcion) ?? { cant: 0, facturado: 0 };
      t.cant += it.cantidad;
      t.facturado += it.cantidad * it.precio * (1 - (c.descuentoPct ?? 0) / 100);
      trat.set(it.descripcion, t);
    }
  const filasTrat = [...trat.entries()]
    .map(([d, v]) => ({ d, ...v, costo: Math.round(v.facturado * costoDe(d)) }))
    .sort((a, b) => b.facturado - b.costo - (a.facturado - a.costo))
    .slice(0, 10);

  const ops = libro.operativos.filter((a) => enPeriodo(a.fecha));
  const generales = ops.filter((a) => a.sucursal === GENERAL);
  const ingTot =
    sumar(
      ops.filter((a) => a.sucursal !== GENERAL),
      "Ingreso",
    ) || 1;
  const filasSuc = ctx.sucursales.map((s) => {
    const de = ops.filter((a) => a.sucursal === s);
    const ing = sumar(de, "Ingreso");
    const egr = sumar(de, "Egreso");
    const prorrateo = Math.round(sumar(generales, "Egreso") * (ing / ingTot));
    return { s, ing, egr, prorrateo, res: ing - egr - prorrateo };
  });
  const maxSuc = Math.max(1, ...filasSuc.map((f) => f.ing));

  return (
    <div className="space-y-3">
      <Encabezado
        icon={TrendingUp}
        titulo="Rentabilidad y comisiones"
        descripcion="Qué deja cada profesional, cada tratamiento y cada sede."
      >
        <div className="flex rounded-full bg-primary/[0.05] p-1">
          {(
            [
              ["0", nombreMes(mesISO(0))],
              ["1", nombreMes(mesISO(1))],
              ["3m", "3 meses"],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              type="button"
              className={CHIP(periodo === v)}
              onClick={() => setPeriodo(v)}
            >
              {l}
            </button>
          ))}
        </div>
      </Encabezado>

      <Tarjeta titulo="Por profesional (comisión sobre lo cobrado)">
        {filasProf.length ? (
          <div className="scroll-sutil overflow-x-auto">
            <table className="w-full min-w-[720px] text-[12.5px]">
              <thead>
                <tr className="text-left text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
                  <th className="p-2">Profesional</th>
                  <th className="p-2 text-right">Facturado</th>
                  <th className="p-2 text-right">Cobrado</th>
                  <th className="p-2 text-center">Comisión %</th>
                  <th className="p-2 text-right">A pagar</th>
                  <th className="p-2 text-right">Queda para la clínica</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {filasProf.map((f) => (
                  <tr key={f.nombre} className="border-t border-primary/10">
                    <td className="p-2">
                      <span className="flex items-center gap-2 font-semibold">
                        <UserRound className="size-4 text-primary" />
                        {f.nombre}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{f.n} comprobantes</span>
                    </td>
                    <td className="p-2 text-right">{ctx.$(f.facturado)}</td>
                    <td className="p-2 text-right">{ctx.$(f.cobrado)}</td>
                    <td className="p-2 text-center">
                      <input
                        key={`${f.nombre}-${f.pct}`}
                        type="number"
                        min={0}
                        max={100}
                        aria-label={`Comisión de ${f.nombre}`}
                        defaultValue={f.pct}
                        onBlur={(e) => {
                          const v = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                          if (v !== f.pct) {
                            setFinanzas("comisiones", (p) => ({ ...p, [f.nombre]: v }));
                            ctx.onToast(`Comisión de ${f.nombre}: ${v} %`);
                          }
                        }}
                        className={`${INPUT} mx-auto h-8 w-20 text-center`}
                      />
                    </td>
                    <td className="p-2 text-right font-semibold text-rose-600">
                      {ctx.$(f.comision)}
                    </td>
                    <td className="p-2 text-right font-semibold text-emerald-600">
                      {ctx.$(f.cobrado - f.comision)}
                    </td>
                    <td className="p-2 text-right">
                      {f.liq ? (
                        <Pill clase="bg-emerald-100 text-emerald-700">
                          <BadgeCheck className="size-3" /> Liquidada
                        </Pill>
                      ) : meses.length === 1 && f.comision > 0 ? (
                        <button
                          type="button"
                          className={BTN_SECUNDARIO}
                          onClick={() =>
                            setLiquidar({ profesional: f.nombre, cobrado: f.cobrado, pct: f.pct })
                          }
                        >
                          <HandCoins className="size-4" /> Liquidar
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Vacio icon={UserRound} texto="Sin comprobantes con profesional en este período." />
        )}
      </Tarjeta>

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
        <Tarjeta titulo="Por tratamiento (margen estimado)">
          {filasTrat.length ? (
            <ul className="space-y-2">
              {filasTrat.map((t) => {
                const margen = t.facturado - t.costo;
                return (
                  <li key={t.d} className="rounded-xl bg-white/85 px-3 py-2 ring-1 ring-primary/10">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <Stethoscope className="size-4 shrink-0 text-primary" />
                        <b className="truncate text-[12.5px]">{t.d}</b>
                      </span>
                      <b className="text-[12.5px] text-emerald-600">{ctx.$(margen)}</b>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {t.cant} × · facturado {ctx.$(t.facturado)} · costo directo {ctx.$(t.costo)} ·{" "}
                      {Math.round((margen / (t.facturado || 1)) * 100)} % de margen
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Vacio icon={Stethoscope} texto="Sin tratamientos facturados en el período." />
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">
            Costo directo estimado por tipo de tratamiento (insumos, laboratorio e implantes).
          </p>
        </Tarjeta>
        <Tarjeta titulo="Por sede (con gastos generales prorrateados)">
          <ul className="space-y-2">
            {filasSuc.map((f) => (
              <li key={f.s} className="rounded-xl bg-white/85 px-3 py-2 ring-1 ring-primary/10">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Building2 className="size-4 text-primary" />
                    <b className="text-[12.5px]">{f.s}</b>
                  </span>
                  <b
                    className={`text-[12.5px] ${f.res < 0 ? "text-rose-600" : "text-emerald-600"}`}
                  >
                    {ctx.$(f.res)}
                  </b>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-primary/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-fuchsia-500"
                    style={{ width: `${(f.ing / maxSuc) * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Ingresos {ctx.$(f.ing)} · gastos propios {ctx.$(f.egr)} · generales{" "}
                  {ctx.$(f.prorrateo)}
                </p>
              </li>
            ))}
          </ul>
        </Tarjeta>
      </div>

      {liquidar && (
        <M
          titulo={`Liquidar comisión de ${liquidar.profesional}`}
          onClose={() => setLiquidar(null)}
        >
          <LiquidarForm
            ctx={ctx}
            libro={libro}
            {...liquidar}
            mes={meses[0]!}
            onCancel={() => setLiquidar(null)}
            onListo={(monto) => {
              setLiquidar(null);
              ctx.onToast(`Comisión de ${liquidar.profesional} liquidada · ${ctx.$(monto)}`);
            }}
          />
        </M>
      )}
    </div>
  );
}

function LiquidarForm({
  ctx,
  libro,
  profesional,
  cobrado,
  pct,
  mes,
  onCancel,
  onListo,
}: {
  ctx: CtxFin;
  libro: Libro;
  profesional: string;
  cobrado: number;
  pct: number;
  mes: string;
  onCancel: () => void;
  onListo: (monto: number) => void;
}) {
  const monto = Math.round((cobrado * pct) / 100);
  const [cuentaId, setCuentaId] = useState(libro.fin.cuentas[0]?.id ?? "");
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const movId = `mf-${Date.now()}`;
        setFinanzas("movimientos", (p) => [
          ...p,
          {
            id: movId,
            fecha: diaISO(),
            tipo: "Egreso",
            categoria: "Honorarios profesionales",
            concepto: `Comisión ${profesional} · ${nombreMes(mes, true)}`,
            monto,
            cuentaId,
            sucursal: GENERAL,
            origen: "Comisiones",
            comprobante: "",
          },
        ]);
        setFinanzas("liquidaciones", (p) => [
          ...p,
          {
            id: `lc-${Date.now()}`,
            profesional,
            periodo: mes,
            facturado: cobrado,
            pct,
            monto,
            fecha: diaISO(),
            movId,
          },
        ]);
        onListo(monto);
      }}
    >
      <div className="rounded-2xl bg-primary/[0.05] p-3 text-sm ring-1 ring-primary/10">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Cobrado en {nombreMes(mes, true)}</span>
          <span>{ctx.$(cobrado)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Comisión</span>
          <span>{pct} %</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-primary/10 pt-1 text-base font-bold text-primary">
          <span>A pagar</span>
          <span>{ctx.$(monto)}</span>
        </div>
      </div>
      <div>
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Pagar desde
        </span>
        <Sel
          value={cuentaId}
          onChange={setCuentaId}
          etiqueta="Cuenta de pago de la comisión"
          opciones={libro.fin.cuentas.map((c) => ({ value: c.id, label: c.nombre }))}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">
        Se registra como gasto de Honorarios profesionales. Si el profesional factura como
        independiente, pedile la factura antes de pagar.
      </p>
      <Acciones etiqueta="Liquidar y pagar" onCancel={onCancel} icon={HandCoins} />
    </form>
  );
}

/* ───────────── Estado de resultados ───────────── */

type Linea = {
  t: string;
  v: (a: Asiento[]) => number;
  tipo?: "total" | "sub" | "pct";
  base?: (a: Asiento[]) => number;
};

export function Resultados({ ctx, libro }: { ctx: CtxFin; libro: Libro }) {
  const mesesConDatos = [0, 1, 2, 3, 4, 5]
    .map((n) => mesISO(n))
    .filter((m) => libro.operativos.some((a) => a.fecha.startsWith(m)));
  const [mes, setMes] = useState(mesesConDatos[0] ?? mesISO(0));
  const idx = mesesConDatos.indexOf(mes);
  const previo = mesesConDatos[idx + 1];
  const porSede = ctx.nivel >= 4 && ctx.sucursal === "Todas";
  const cols: { t: string; a: Asiento[] }[] = porSede
    ? [
        ...ctx.sucursales.map((s) => ({
          t: s,
          a: delMes(libro.operativos, mes).filter((x) => x.sucursal === s),
        })),
        { t: "Generales", a: delMes(libro.operativos, mes).filter((x) => x.sucursal === GENERAL) },
        { t: "Total", a: delMes(libro.operativos, mes) },
      ]
    : [
        { t: nombreMes(mes, true), a: delMes(deSucursal(libro.operativos, ctx.sucursal), mes) },
        ...(previo
          ? [
              {
                t: nombreMes(previo, true),
                a: delMes(deSucursal(libro.operativos, ctx.sucursal), previo),
              },
            ]
          : []),
      ];

  const cat = (c: string) => (a: Asiento[]) =>
    a.filter((x) => x.categoria === c).reduce((s, x) => s + x.monto, 0);
  const ingresos = (a: Asiento[]) => sumar(a, "Ingreso");
  const directos = (a: Asiento[]) =>
    a
      .filter(
        (x) => x.tipo === "Egreso" && COSTOS_DIRECTOS.includes(x.categoria as CategoriaEgreso),
      )
      .reduce((s, x) => s + x.monto, 0);
  const estructura = CATEGORIAS_EGRESO.filter(
    (c) =>
      !COSTOS_DIRECTOS.includes(c) &&
      c !== "Sueldos y cargas sociales" &&
      c !== "Impuestos y tasas",
  );
  const gEstructura = (a: Asiento[]) => estructura.reduce((s, c) => s + cat(c)(a), 0);
  const bruto = (a: Asiento[]) => ingresos(a) - directos(a);
  const operativo = (a: Asiento[]) =>
    bruto(a) - gEstructura(a) - cat("Sueldos y cargas sociales")(a);
  const neto = (a: Asiento[]) => operativo(a) - cat("Impuestos y tasas")(a);

  const lineas: Linea[] = [
    ...CATEGORIAS_INGRESO.map((c) => ({ t: c, v: cat(c) })),
    { t: "Total ingresos", v: ingresos, tipo: "total" },
    ...COSTOS_DIRECTOS.map((c) => ({ t: c, v: (a: Asiento[]) => -cat(c)(a) })),
    { t: "Margen bruto", v: bruto, tipo: "total" },
    { t: "% margen bruto", v: bruto, base: ingresos, tipo: "pct" },
    ...estructura.map((c) => ({ t: c, v: (a: Asiento[]) => -cat(c)(a) })),
    { t: "Sueldos y cargas sociales", v: (a) => -cat("Sueldos y cargas sociales")(a) },
    { t: "Resultado operativo", v: operativo, tipo: "total" },
    { t: "Impuestos y tasas", v: (a) => -cat("Impuestos y tasas")(a) },
    { t: "Resultado neto", v: neto, tipo: "total" },
    { t: "% margen neto", v: neto, base: ingresos, tipo: "pct" },
  ];
  const visibles = lineas.filter((l) => l.tipo || cols.some((c) => l.v(c.a) !== 0));
  const valor = (l: Linea, a: Asiento[]) =>
    l.tipo === "pct"
      ? `${Math.round((l.v(a) / ((l.base?.(a) ?? 1) || 1)) * 100)} %`
      : !l.tipo && l.v(a) === 0
        ? "—"
        : ctx.$(l.v(a));

  const exportar = () =>
    void descargarExcel(`estado-de-resultados-${mes}.xlsx`, [
      {
        nombre: "Estado de resultados",
        nota: `Estado de resultados · ${nombreMes(mes, true)} · ${ctx.sucursal === "Todas" ? "todas las sedes" : ctx.sucursal}`,
        columnas: [
          { titulo: "Concepto", clave: "c", ancho: 34 },
          ...cols.map((c, i) => ({ titulo: c.t, clave: `v${i}`, ancho: 18, moneda: true })),
        ],
        filas: visibles
          .filter((l) => l.tipo !== "pct")
          .map((l) => ({ c: l.t, ...Object.fromEntries(cols.map((c, i) => [`v${i}`, l.v(c.a)])) })),
      },
    ]).then(() => ctx.onToast("Estado de resultados exportado a Excel"));

  const principal = cols[porSede ? cols.length - 1 : 0]!.a;
  return (
    <div className="space-y-3">
      <Encabezado
        icon={Scale}
        titulo="Estado de resultados"
        descripcion="Ingresos, costos, gastos y resultado del mes, listo para el contador."
      >
        <div className="w-56">
          <Sel
            value={mes}
            onChange={setMes}
            etiqueta="Mes del estado de resultados"
            opciones={mesesConDatos.map((m) => ({ value: m, label: nombreMes(m, true) }))}
          />
        </div>
        <button type="button" className={BTN_PRIMARIO} onClick={exportar}>
          <FileSpreadsheet className="size-4" /> Excel
        </button>
      </Encabezado>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Mini
          label="Ingresos"
          valor={ctx.$(ingresos(principal))}
          icon={ArrowDownLeft}
          tono="text-emerald-600"
        />
        <Mini
          label="Margen bruto"
          valor={ctx.$(bruto(principal))}
          icon={TrendingUp}
          sub={`${Math.round((bruto(principal) / (ingresos(principal) || 1)) * 100)} %`}
        />
        <Mini label="Resultado operativo" valor={ctx.$(operativo(principal))} icon={Scale} />
        <Mini
          label="Resultado neto"
          valor={ctx.$(neto(principal))}
          icon={Wallet}
          tono={neto(principal) < 0 ? "text-rose-600" : "text-emerald-600"}
          sub={`${Math.round((neto(principal) / (ingresos(principal) || 1)) * 100)} % de margen`}
        />
      </div>
      <div className="card-grad scroll-sutil overflow-x-auto p-4">
        <table className={`w-full text-[12.5px] ${cols.length > 2 ? "min-w-[760px]" : ""}`}>
          <thead>
            <tr className="text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
              <th className="p-2 text-left">Concepto</th>
              {cols.map((c) => (
                <th key={c.t} className="p-2 text-right">
                  {c.t}
                </th>
              ))}
              {!porSede && cols.length === 2 && <th className="p-2 text-right">Variación</th>}
            </tr>
          </thead>
          <tbody>
            {visibles.map((l) => {
              const total = l.tipo === "total";
              const a0 = cols[0]!.a;
              const a1 = cols[1]?.a;
              const v0 = l.v(a0);
              const v1 = a1 ? l.v(a1) : 0;
              return (
                <tr
                  key={l.t}
                  className={
                    total
                      ? "border-t border-primary/20 bg-primary/[0.04] font-bold"
                      : l.tipo === "pct"
                        ? "text-muted-foreground"
                        : "border-t border-primary/5"
                  }
                >
                  <td
                    className={`p-2 ${total ? "text-primary" : l.tipo === "pct" ? "pl-4 italic" : "pl-4"}`}
                  >
                    {l.t}
                  </td>
                  {cols.map((c) => {
                    const v = l.v(c.a);
                    return (
                      <td
                        key={c.t}
                        className={`p-2 text-right ${l.tipo !== "pct" && v < 0 ? (total ? "text-rose-600" : "text-foreground/80") : ""}`}
                      >
                        {valor(l, c.a)}
                      </td>
                    );
                  })}
                  {!porSede && cols.length === 2 && (
                    <td className="p-2 text-right text-[11px]">
                      {l.tipo !== "pct" && v1 ? (
                        <span
                          className={
                            (v0 - v1) / Math.abs(v1) >= 0 ? "text-emerald-600" : "text-rose-600"
                          }
                        >
                          {(v0 - v1) / Math.abs(v1) >= 0 ? "▲" : "▼"}{" "}
                          {Math.abs(Math.round(((v0 - v1) / Math.abs(v1)) * 100))} %
                        </span>
                      ) : (
                        ""
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Criterio percibido: cuenta lo cobrado y lo pagado en el mes. Las transferencias entre
        cuentas no afectan el resultado.
      </p>
    </div>
  );
}
