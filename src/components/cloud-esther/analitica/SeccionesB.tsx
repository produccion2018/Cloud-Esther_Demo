import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  BadgeDollarSign,
  CalendarClock,
  FileSpreadsheet,
  HandCoins,
  Mail,
  Megaphone,
  Plus,
  Save,
  Send,
  Star,
  Target,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  CANALES,
  agrupar,
  nombreMesCorto,
  nombreMesLargo,
  pct,
  variacion,
  type Hecho,
  type PresupuestoHecho,
} from "@/lib/cloud-esther/analitica-datos";
import {
  setAnalitica,
  type Dimension,
  type EnvioProgramado,
  type Metrica,
  type ReporteGuardado,
  type Visual,
} from "@/lib/cloud-esther/analitica-store";
import { INVERSION_MENSUAL, metricas } from "@/components/cloud-esther/analitica/datos";
import type { CtxBI } from "@/components/cloud-esther/analitica/ctx";
import {
  Barras,
  BarrasH,
  Embudo,
  Lineas,
  TarjetaGrafico,
  color,
} from "@/components/cloud-esther/analitica/graficos";
import { M } from "@/components/cloud-esther/analitica/Analitica";
import { useLibro, delMes, sumar } from "@/components/cloud-esther/finanzas/libro";
import { saldo, estadoComprobante } from "@/lib/cloud-esther/facturacion-store";
import { descargarExcel } from "@/components/cloud-esther/rrhh/excel";
import {
  Acciones,
  BTN_ICONO,
  BTN_PRIMARIO,
  BTN_SECUNDARIO,
  CHIP,
  Field,
  INPUT,
  Mini,
  Pill,
  Sel,
  Vacio,
} from "@/components/cloud-esther/rrhh/ui";

/* Secciones de Analítica: Tratamientos, Captación, Finanzas, Sedes y Reportes. */

const atendidas = (xs: Hecho[]) => xs.filter((h) => h.estado === "Atendida");

/** Top N + "Otros" para no pasar de 6 colores. */
function topMasOtros(claves: string[], n = 5) {
  return claves.length <= n + 1 ? claves : [...claves.slice(0, n), "Otros"];
}

/* ───────────── Tratamientos ───────────── */

export function Tratamientos({ ctx }: { ctx: CtxBI }) {
  const navigate = useNavigate();
  const at = atendidas(ctx.hs);
  const porTrat = [...agrupar(at, (h) => h.tratamiento).entries()].map(([t, xs]) => ({
    t,
    n: xs.length,
    v: xs.reduce((a, h) => a + h.monto, 0),
  }));
  const topProd = [...porTrat].sort((a, b) => b.v - a.v).slice(0, 10);
  const topCant = [...porTrat].sort((a, b) => b.n - a.n).slice(0, 10);
  const catTot = [...agrupar(atendidas(ctx.base), (h) => h.categoria).entries()]
    .sort((a, b) => b[1].reduce((s, h) => s + h.monto, 0) - a[1].reduce((s, h) => s + h.monto, 0))
    .map(([c]) => c);
  const cats = topMasOtros(catTot);
  const serieCat = cats.map((c, i) => ({
    nombre: c,
    color: color(i),
    valores: ctx.meses.map((mes) =>
      atendidas(
        ctx.base.filter(
          (h) =>
            h.fecha.startsWith(mes) &&
            (c === "Otros" ? !cats.slice(0, -1).includes(h.categoria) : h.categoria === c),
        ),
      ).reduce((a, h) => a + h.monto, 0),
    ),
  }));
  const primeras = at.filter((h) => h.nuevo).length;
  const cerrados = ctx.pres.filter((p) => p.estado !== "Enviado");
  const aprob = ctx.pres.filter((p) => p.estado === "Aprobado");
  const enviados = ctx.pres.filter((p) => p.estado === "Enviado");
  const porProf = [...agrupar(ctx.pres, (p) => p.profesional || "Sin profesional").entries()]
    .map(([p, xs]) => {
      const c = xs.filter((x) => x.estado !== "Enviado").length;
      const a = xs.filter((x) => x.estado === "Aprobado");
      return { p, n: xs.length, conv: pct(a.length, c), monto: a.reduce((s, x) => s + x.monto, 0) };
    })
    .sort((a, b) => b.monto - a.monto);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Mini
          label="Presupuestado"
          valor={ctx.$c(ctx.m.presupuestado)}
          icon={BadgeDollarSign}
          sub={`${ctx.n(ctx.pres.length)} presupuestos`}
        />
        <Mini
          label="Aprobado"
          valor={ctx.$c(ctx.m.aprobado)}
          icon={Target}
          tono="text-emerald-600"
          sub={`${ctx.n(aprob.length)} presupuestos`}
        />
        <Mini
          label="Conversión"
          valor={ctx.p(ctx.m.conversion)}
          icon={TrendingUp}
          sub={`meta ${ctx.p(ctx.cfg.metas.conversion)}`}
        />
        <Mini
          label="Esperando respuesta"
          valor={ctx.$c(enviados.reduce((a, p) => a + p.monto, 0))}
          icon={CalendarClock}
          tono="text-amber-600"
          sub={`${enviados.length} presupuestos`}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <TarjetaGrafico
          titulo="Tratamientos que más producen"
          tabla={{
            columnas: ["Tratamiento", "Cantidad", "Producción"],
            filas: topProd.map((x) => [x.t, x.n, ctx.$(x.v)]),
          }}
        >
          <BarrasH
            items={topProd.map((x) => ({ nombre: x.t, valor: x.v, sub: `${x.n} ×` }))}
            formato={ctx.$c}
          />
        </TarjetaGrafico>
        <TarjetaGrafico
          titulo="Tratamientos más realizados"
          tabla={{ columnas: ["Tratamiento", "Cantidad"], filas: topCant.map((x) => [x.t, x.n]) }}
        >
          <BarrasH
            items={topCant.map((x) => ({ nombre: x.t, valor: x.n }))}
            formato={ctx.n}
            colorBarra={color(1)}
          />
        </TarjetaGrafico>
      </div>
      <TarjetaGrafico
        titulo="Producción por especialidad"
        sub="Por mes, últimos 12 meses"
        tabla={{
          columnas: ["Mes", ...cats],
          filas: ctx.meses.map((m, i) => [
            nombreMesLargo(m),
            ...serieCat.map((s) => ctx.$(s.valores[i] ?? 0)),
          ]),
        }}
      >
        <Barras
          etiquetas={ctx.meses.map(nombreMesCorto)}
          series={serieCat}
          formato={ctx.$c}
          apilado
          alto={210}
        />
      </TarjetaGrafico>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <TarjetaGrafico titulo="Embudo de presupuestos" sub="Del período">
          <Embudo
            formato={ctx.n}
            pasos={[
              { nombre: "Primeras consultas", valor: primeras },
              {
                nombre: "Presupuestos emitidos",
                valor: ctx.pres.length,
                detalle: ctx.$c(ctx.m.presupuestado),
              },
              { nombre: "Con respuesta", valor: cerrados.length },
              { nombre: "Aprobados", valor: aprob.length, detalle: ctx.$c(ctx.m.aprobado) },
            ]}
          />
          <button
            type="button"
            className={`${BTN_SECUNDARIO} mt-3`}
            onClick={() => void navigate({ to: "/demo/presupuestos" })}
          >
            Hacer seguimiento en Presupuestos →
          </button>
        </TarjetaGrafico>
        <TarjetaGrafico
          titulo="Conversión por profesional"
          tabla={{
            columnas: ["Profesional", "Presupuestos", "Conversión", "Aprobado"],
            filas: porProf.map((x) => [x.p, x.n, ctx.p(x.conv), ctx.$(x.monto)]),
          }}
        >
          <BarrasH
            items={porProf.map((x) => ({
              nombre: x.p,
              valor: x.conv,
              sub: `${x.n} presup. · ${ctx.$c(x.monto)}`,
            }))}
            formato={ctx.p}
            max={100}
            colorBarra={color(3)}
          />
        </TarjetaGrafico>
      </div>
    </div>
  );
}

/* ───────────── Captación (Marketing) ───────────── */

const CANAL_ADS: Record<string, string> = {
  "Instagram Ads": "Instagram",
  "Facebook Ads": "Meta Ads",
  "Google Ads": "Google",
};

export function Marketing({ ctx }: { ctx: CtxBI }) {
  const navigate = useNavigate();
  const meses = ctx.rango.dias / 30.4;
  const leads = ctx.datos.leads.filter(
    (l) => l.fecha >= ctx.rango.desde && l.fecha <= ctx.rango.hasta,
  );
  const nuevosAt = atendidas(ctx.hs).filter((h) => h.nuevo);
  const pacNuevos = new Set(nuevosAt.map((h) => h.paciente));
  const valorPac = new Map<number, number>();
  for (const h of atendidas(ctx.hs))
    if (pacNuevos.has(h.paciente))
      valorPac.set(h.paciente, (valorPac.get(h.paciente) ?? 0) + h.monto);
  const filas = CANALES.map((c) => {
    const l = leads.filter((x) => x.canal === c);
    const nuevos = nuevosAt.filter((h) => h.canal === c);
    const campanias = ctx.datos.campanias
      .filter(
        (k) =>
          CANAL_ADS[k.canal] === c &&
          k.inicio <= ctx.rango.hasta &&
          (k.fin || "9999") >= ctx.rango.desde,
      )
      .reduce((a, k) => a + k.gastado, 0);
    const inversion = Math.round((INVERSION_MENSUAL[c] ?? 0) * meses) + campanias;
    const valor = nuevos.reduce((a, h) => a + (valorPac.get(h.paciente) ?? 0), 0);
    return {
      c,
      leads: l.length,
      nuevos: nuevos.length,
      conv: pct(l.filter((x) => x.convertido).length, l.length),
      inversion,
      cac: nuevos.length && inversion ? inversion / nuevos.length : 0,
      valor,
      roi: inversion ? ((valor - inversion) / inversion) * 100 : 0,
    };
  }).sort((a, b) => b.nuevos - a.nuevos);
  const inv = filas.reduce((a, f) => a + f.inversion, 0);
  const pagos = filas.filter((f) => f.inversion);
  const nuevosPagos = pagos.reduce((a, f) => a + f.nuevos, 0);
  const canalesTop = topMasOtros(filas.map((f) => f.c));
  const serie = canalesTop.map((c, i) => ({
    nombre: c,
    color: color(i),
    valores: ctx.meses.map(
      (mes) =>
        atendidas(ctx.base).filter(
          (h) =>
            h.nuevo &&
            h.fecha.startsWith(mes) &&
            (c === "Otros" ? !canalesTop.slice(0, -1).includes(h.canal) : h.canal === c),
        ).length,
    ),
  }));
  const res = ctx.datos.resenas;
  const prom = res.length ? res.reduce((a, r) => a + r.estrellas, 0) / res.length : 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Mini
          label="Consultas recibidas"
          valor={ctx.n(leads.length)}
          icon={Megaphone}
          sub={`${ctx.p(pct(leads.filter((l) => l.convertido).length, leads.length))} se convirtieron`}
        />
        <Mini
          label="Pacientes nuevos"
          valor={ctx.n(nuevosAt.length)}
          icon={Target}
          tono="text-emerald-600"
        />
        <Mini
          label="Inversión publicitaria"
          valor={ctx.$c(inv)}
          icon={Wallet}
          sub={`CAC promedio ${ctx.$c(nuevosPagos ? inv / nuevosPagos : 0)}`}
        />
        <Mini
          label="Reseñas"
          valor={`${prom.toFixed(1).replace(".", ",")} ★`}
          icon={Star}
          tono="text-amber-600"
          sub={`${res.length} reseñas`}
        />
      </div>
      <div className="card-grad scroll-sutil overflow-x-auto p-4">
        <p className="mb-3 text-sm font-semibold">Rendimiento por canal</p>
        <table className="w-full min-w-[760px] text-[12.5px]">
          <thead>
            <tr className="text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground">
              <th className="p-2 text-left">Canal</th>
              <th className="p-2 text-right">Consultas</th>
              <th className="p-2 text-right">Pacientes nuevos</th>
              <th className="p-2 text-right">Conversión</th>
              <th className="p-2 text-right">Inversión</th>
              <th className="p-2 text-right">Costo por paciente</th>
              <th className="p-2 text-right">Producción generada</th>
              <th className="p-2 text-right">Retorno</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={f.c} className="border-t border-primary/10">
                <td className="p-2">
                  <span className="flex items-center gap-2 font-semibold">
                    <span className="size-2.5 rounded-full" style={{ background: color(i) }} />
                    {f.c}
                  </span>
                </td>
                <td className="p-2 text-right tabular-nums">{ctx.n(f.leads)}</td>
                <td className="p-2 text-right tabular-nums">{ctx.n(f.nuevos)}</td>
                <td className="p-2 text-right tabular-nums">{ctx.p(f.conv)}</td>
                <td className="p-2 text-right tabular-nums">
                  {f.inversion ? ctx.$c(f.inversion) : "Orgánico"}
                </td>
                <td className="p-2 text-right tabular-nums">{f.cac ? ctx.$c(f.cac) : "—"}</td>
                <td className="p-2 text-right tabular-nums">{ctx.$c(f.valor)}</td>
                <td
                  className={`p-2 text-right font-semibold tabular-nums ${f.inversion ? (f.roi >= 0 ? "text-emerald-600" : "text-rose-600") : "text-muted-foreground"}`}
                >
                  {f.inversion ? `${f.roi >= 0 ? "+" : "−"}${Math.abs(Math.round(f.roi))} %` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Producción generada: lo que facturaron en el período los pacientes nuevos de cada canal.
          Retorno = (producción − inversión) ÷ inversión.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.5fr_1fr]">
        <TarjetaGrafico
          titulo="Pacientes nuevos por canal"
          sub="Por mes, últimos 12 meses"
          tabla={{
            columnas: ["Mes", ...canalesTop],
            filas: ctx.meses.map((m, i) => [
              nombreMesLargo(m),
              ...serie.map((s) => s.valores[i] ?? 0),
            ]),
          }}
        >
          <Barras
            etiquetas={ctx.meses.map(nombreMesCorto)}
            series={serie}
            formato={ctx.n}
            apilado
          />
        </TarjetaGrafico>
        <TarjetaGrafico
          titulo="Costo por paciente nuevo"
          sub="Canales pagos"
          tabla={{
            columnas: ["Canal", "Costo por paciente"],
            filas: pagos.map((f) => [f.c, ctx.$(f.cac)]),
          }}
        >
          <BarrasH
            items={pagos.map((f) => ({ nombre: f.c, valor: f.cac, sub: `${f.nuevos} pacientes` }))}
            formato={ctx.$c}
            colorBarra={color(2)}
          />
          <button
            type="button"
            className={`${BTN_SECUNDARIO} mt-3`}
            onClick={() => void navigate({ to: "/demo/marketing" })}
          >
            Ir a Marketing →
          </button>
        </TarjetaGrafico>
      </div>
    </div>
  );
}

/* ───────────── Finanzas ───────────── */

export function Finanzas({ ctx }: { ctx: CtxBI }) {
  const navigate = useNavigate();
  const libro = useLibro();
  const ing = ctx.meses.map(
    (mes) =>
      (libro.fin.historico.find((h) => h.mes === mes)?.ingresos ?? 0) +
      sumar(delMes(libro.operativos, mes), "Ingreso"),
  );
  const egr = ctx.meses.map(
    (mes) =>
      (libro.fin.historico.find((h) => h.mes === mes)?.egresos ?? 0) +
      sumar(delMes(libro.operativos, mes), "Egreso"),
  );
  const res = ing.map((v, i) => v - (egr[i] ?? 0));
  const cobrado = ctx.meses.map((mes) => {
    const h = libro.fin.historico.find((x) => x.mes === mes);
    const reales = delMes(libro.operativos, mes)
      .filter(
        (a) =>
          a.tipo === "Ingreso" &&
          (a.categoria === "Prestaciones" || a.categoria === "Obras sociales"),
      )
      .reduce((s, a) => s + a.monto, 0);
    return (h?.ingresos ?? 0) * 0.97 + reales;
  });
  const medios = [
    ...agrupar(
      libro.fac.comprobantes
        .flatMap((c) => c.pagos)
        .filter(
          (p) => p.fecha.slice(0, 10) >= ctx.rango.desde && p.fecha.slice(0, 10) <= ctx.rango.hasta,
        ),
      (p) => p.medio,
    ).entries(),
  ]
    .map(([m, xs]) => ({ nombre: m, valor: xs.reduce((a, p) => a + p.monto, 0) }))
    .sort((a, b) => b.valor - a.valor);
  const hoy = new Date().toISOString().slice(0, 10);
  const facturas = libro.fac.comprobantes.filter(
    (c) => c.clase === "Factura" && !c.anulada && saldo(c) > 0,
  );
  const dias = (f: string) =>
    Math.round((new Date(hoy).getTime() - new Date(f || hoy).getTime()) / 86_400_000);
  const aging = [
    {
      nombre: "Al día",
      valor: facturas
        .filter((c) => estadoComprobante(c) !== "Vencida")
        .reduce((a, c) => a + saldo(c), 0),
    },
    {
      nombre: "1 a 30 días",
      valor: facturas
        .filter((c) => estadoComprobante(c) === "Vencida" && dias(c.vencimiento) <= 30)
        .reduce((a, c) => a + saldo(c), 0),
    },
    {
      nombre: "31 a 60 días",
      valor: facturas
        .filter(
          (c) =>
            estadoComprobante(c) === "Vencida" &&
            dias(c.vencimiento) > 30 &&
            dias(c.vencimiento) <= 60,
        )
        .reduce((a, c) => a + saldo(c), 0),
    },
    {
      nombre: "Más de 60 días",
      valor: facturas
        .filter((c) => estadoComprobante(c) === "Vencida" && dias(c.vencimiento) > 60)
        .reduce((a, c) => a + saldo(c), 0),
    },
  ];
  const actual = ctx.meses.length - 1;
  const margen = pct(res[actual] ?? 0, ing[actual] ?? 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Mini
          label="Ingresos del mes"
          valor={ctx.$c(ing[actual] ?? 0)}
          icon={Wallet}
          tono="text-emerald-600"
          sub={`${variacion(ing[actual] ?? 0, ing[actual - 1] ?? 0) >= 0 ? "+" : "−"}${Math.abs(
            variacion(ing[actual] ?? 0, ing[actual - 1] ?? 0),
          )
            .toFixed(1)
            .replace(".", ",")} % vs. mes anterior`}
        />
        <Mini
          label="Egresos del mes"
          valor={ctx.$c(egr[actual] ?? 0)}
          icon={HandCoins}
          tono="text-rose-600"
        />
        <Mini
          label="Resultado del mes"
          valor={ctx.$c(res[actual] ?? 0)}
          icon={TrendingUp}
          sub={`${ctx.p(margen)} de margen`}
        />
        <Mini
          label="Por cobrar"
          valor={ctx.$c(aging.reduce((a, x) => a + x.valor, 0))}
          icon={BadgeDollarSign}
          tono="text-amber-600"
          sub={`${facturas.length} facturas`}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <TarjetaGrafico
          titulo="Ingresos y egresos"
          sub="Por mes, desde Finanzas"
          tabla={{
            columnas: ["Mes", "Ingresos", "Egresos", "Resultado"],
            filas: ctx.meses.map((m, i) => [
              nombreMesLargo(m),
              ctx.$(ing[i] ?? 0),
              ctx.$(egr[i] ?? 0),
              ctx.$(res[i] ?? 0),
            ]),
          }}
        >
          <Barras
            etiquetas={ctx.meses.map(nombreMesCorto)}
            formato={ctx.$c}
            series={[
              { nombre: "Ingresos", valores: ing, color: color(1) },
              { nombre: "Egresos", valores: egr, color: color(0) },
            ]}
          />
        </TarjetaGrafico>
        <TarjetaGrafico
          titulo="Producción y cobrado"
          sub="Lo que se atendió contra lo que entró a caja"
          tabla={{
            columnas: ["Mes", "Producción", "Cobrado"],
            filas: ctx.meses.map((m, i) => [
              nombreMesLargo(m),
              ctx.$(ctx.mensual[i]?.produccion ?? 0),
              ctx.$(cobrado[i] ?? 0),
            ]),
          }}
        >
          <Lineas
            etiquetas={ctx.meses.map(nombreMesCorto)}
            formato={ctx.$c}
            area={false}
            series={[
              { nombre: "Producción", valores: ctx.mensual.map((x) => x.produccion) },
              { nombre: "Cobrado", valores: cobrado, color: color(1) },
            ]}
          />
        </TarjetaGrafico>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <TarjetaGrafico
          titulo="Cobros por medio de pago"
          sub="Facturación, en el período"
          tabla={{
            columnas: ["Medio", "Cobrado"],
            filas: medios.map((x) => [x.nombre, ctx.$(x.valor)]),
          }}
        >
          {medios.length ? (
            <BarrasH items={medios} formato={ctx.$c} colorBarra={color(3)} />
          ) : (
            <Vacio icon={Wallet} texto="Sin cobros en el período." />
          )}
        </TarjetaGrafico>
        <TarjetaGrafico
          titulo="Antigüedad de lo que falta cobrar"
          tabla={{
            columnas: ["Tramo", "Saldo"],
            filas: aging.map((x) => [x.nombre, ctx.$(x.valor)]),
          }}
        >
          <BarrasH items={aging} formato={ctx.$c} colorBarra={color(2)} />
          <button
            type="button"
            className={`${BTN_SECUNDARIO} mt-3`}
            onClick={() => void navigate({ to: "/demo/finanzas" })}
          >
            Ir a Finanzas →
          </button>
        </TarjetaGrafico>
      </div>
    </div>
  );
}

/* ───────────── Sedes ───────────── */

export function Sedes({ ctx }: { ctx: CtxBI }) {
  const filas = ctx.todasSedes.map((s) => {
    const m = metricas(
      ctx.hs.filter((h) => h.sucursal === s),
      ctx.pres.filter((p) => p.sucursal === s),
      ctx.cfg,
      [s],
      ctx.rango.desde,
      ctx.rango.hasta,
    );
    const prev = metricas(
      ctx.hsPrev.filter((h) => h.sucursal === s),
      [],
      ctx.cfg,
      [s],
      ctx.rango.prevDesde,
      ctx.rango.prevHasta,
    );
    return { s, m, d: variacion(m.produccion, prev.produccion) };
  });
  const series = ctx.todasSedes.map((s, i) => ({
    nombre: s,
    color: color(i),
    valores: ctx.meses.map((mes) =>
      atendidas(ctx.base.filter((h) => h.sucursal === s && h.fecha.startsWith(mes))).reduce(
        (a, h) => a + h.monto,
        0,
      ),
    ),
  }));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {filas.map((f, i) => (
          <div key={f.s} className="card-grad p-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <span className="size-2.5 rounded-full" style={{ background: color(i) }} />
              {f.s}
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight">{ctx.$c(f.m.produccion)}</p>
            <p
              className={`text-[11px] font-semibold ${f.d >= 0 ? "text-emerald-600" : "text-rose-600"}`}
            >
              {f.d >= 0 ? "+" : "−"}
              {Math.abs(f.d).toFixed(1).replace(".", ",")} % vs. anterior
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11.5px]">
              <dt className="text-muted-foreground">Atenciones</dt>
              <dd className="text-right font-semibold">{ctx.n(f.m.atenciones)}</dd>
              <dt className="text-muted-foreground">Nuevos</dt>
              <dd className="text-right font-semibold">{ctx.n(f.m.nuevos)}</dd>
              <dt className="text-muted-foreground">Ocupación</dt>
              <dd className="text-right font-semibold">{ctx.p(f.m.ocupacion)}</dd>
              <dt className="text-muted-foreground">Ausentismo</dt>
              <dd className="text-right font-semibold">{ctx.p(f.m.ausentismo)}</dd>
              <dt className="text-muted-foreground">Ticket</dt>
              <dd className="text-right font-semibold">{ctx.$c(f.m.ticket)}</dd>
              <dt className="text-muted-foreground">Conversión</dt>
              <dd className="text-right font-semibold">{ctx.p(f.m.conversion)}</dd>
            </dl>
          </div>
        ))}
      </div>
      <TarjetaGrafico
        titulo="Producción por sede"
        sub="Por mes, últimos 12 meses"
        tabla={{
          columnas: ["Mes", ...ctx.todasSedes],
          filas: ctx.meses.map((m, i) => [
            nombreMesLargo(m),
            ...series.map((s) => ctx.$(s.valores[i] ?? 0)),
          ]),
        }}
      >
        <Lineas
          etiquetas={ctx.meses.map(nombreMesCorto)}
          series={series}
          formato={ctx.$c}
          area={false}
          alto={220}
        />
      </TarjetaGrafico>
    </div>
  );
}

/* ───────────── Reportes ───────────── */

const METRICAS: { v: Metrica; l: string }[] = [
  { v: "produccion", l: "Producción ($)" },
  { v: "atenciones", l: "Atenciones" },
  { v: "nuevos", l: "Pacientes nuevos" },
  { v: "ticket", l: "Ticket promedio" },
  { v: "ausentismo", l: "Ausentismo (%)" },
  { v: "presupuestos", l: "Presupuestos aprobados ($)" },
  { v: "conversion", l: "Conversión de presupuestos (%)" },
];
const DIMENSIONES: { v: Dimension; l: string }[] = [
  { v: "mes", l: "Mes" },
  { v: "semana", l: "Semana" },
  { v: "sucursal", l: "Sede" },
  { v: "profesional", l: "Profesional" },
  { v: "tratamiento", l: "Tratamiento" },
  { v: "categoria", l: "Especialidad" },
  { v: "canal", l: "Canal de captación" },
  { v: "cobertura", l: "Cobertura" },
  { v: "dia", l: "Día de la semana" },
  { v: "edad", l: "Edad" },
];
const DIAS_L = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function claveDe(h: Hecho | PresupuestoHecho, d: Dimension): string {
  const f = h.fecha;
  if (d === "mes") return f.slice(0, 7);
  if (d === "semana") {
    const x = new Date(`${f}T12:00:00`);
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x.toISOString().slice(0, 10);
  }
  if (d === "sucursal") return h.sucursal;
  if (d === "profesional") return h.profesional || "Sin profesional";
  if (d === "tratamiento") return h.tratamiento;
  if ("canal" in h) {
    if (d === "categoria") return h.categoria;
    if (d === "canal") return h.canal;
    if (d === "cobertura") return h.cobertura;
    if (d === "dia") return String(h.dow);
    if (d === "edad") return h.edad;
  }
  return "Sin dato";
}
function etiquetaClave(k: string, d: Dimension) {
  if (d === "mes") return nombreMesLargo(k);
  if (d === "semana") return `Semana del ${k.slice(8)}/${k.slice(5, 7)}`;
  if (d === "dia") return DIAS_L[Number(k)] ?? k;
  return k;
}

export function calcularReporte(ctx: CtxBI, metrica: Metrica, dim: Dimension) {
  const esPres = metrica === "presupuestos" || metrica === "conversion";
  const grupos = esPres
    ? agrupar(ctx.pres, (p) => claveDe(p, dim))
    : agrupar(ctx.hs, (h) => claveDe(h, dim));
  const filas = [...grupos.entries()].map(([k, xs]) => {
    let v = 0;
    if (esPres) {
      const ps = xs as PresupuestoHecho[];
      const ap = ps.filter((p) => p.estado === "Aprobado");
      v =
        metrica === "presupuestos"
          ? ap.reduce((a, p) => a + p.monto, 0)
          : pct(ap.length, ps.filter((p) => p.estado !== "Enviado").length);
    } else {
      const hs = xs as Hecho[];
      const at = atendidas(hs);
      const aus = hs.filter((h) => h.estado === "Ausente").length;
      v =
        metrica === "produccion"
          ? at.reduce((a, h) => a + h.monto, 0)
          : metrica === "atenciones"
            ? at.length
            : metrica === "nuevos"
              ? at.filter((h) => h.nuevo).length
              : metrica === "ticket"
                ? at.reduce((a, h) => a + h.monto, 0) / Math.max(1, at.length)
                : pct(aus, aus + at.length);
    }
    return { k, etiqueta: etiquetaClave(k, dim), v };
  });
  const ordenTemporal = dim === "mes" || dim === "semana" || dim === "dia";
  filas.sort((a, b) => (ordenTemporal ? a.k.localeCompare(b.k) : b.v - a.v));
  const fmt = (v: number) =>
    metrica === "produccion" || metrica === "ticket" || metrica === "presupuestos"
      ? ctx.$c(v)
      : metrica === "ausentismo" || metrica === "conversion"
        ? ctx.p(v)
        : ctx.n(v);
  return { filas, fmt };
}

export function Reportes({ ctx }: { ctx: CtxBI }) {
  const [metrica, setMetrica] = useState<Metrica>("produccion");
  const [dim, setDim] = useState<Dimension>("profesional");
  const [visual, setVisual] = useState<Visual>("barras");
  const [guardar, setGuardar] = useState(false);
  const [programar, setProgramar] = useState<ReporteGuardado | null>(null);
  const { filas, fmt } = calcularReporte(ctx, metrica, dim);
  const nombreM = METRICAS.find((x) => x.v === metrica)?.l ?? metrica;
  const nombreD = DIMENSIONES.find((x) => x.v === dim)?.l ?? dim;
  const reportes = ctx.cfg.reportes;
  const envios = ctx.cfg.envios;

  const exportar = (m: Metrica, d: Dimension, nombre: string) => {
    const r = calcularReporte(ctx, m, d);
    const esDinero = m === "produccion" || m === "ticket" || m === "presupuestos";
    return descargarExcel(`${nombre.toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, "-")}.xlsx`, [
      {
        nombre: nombre.slice(0, 31),
        nota: `${nombre} · ${ctx.rango.desde.split("-").reverse().join("/")} al ${ctx.rango.hasta.split("-").reverse().join("/")} · Sede: ${ctx.f.sucursal} · Profesional: ${ctx.f.profesional}`,
        columnas: [
          { titulo: DIMENSIONES.find((x) => x.v === d)?.l ?? d, clave: "k", ancho: 30 },
          {
            titulo: METRICAS.find((x) => x.v === m)?.l ?? m,
            clave: "v",
            ancho: 20,
            moneda: esDinero,
          },
        ],
        filas: r.filas.map((f) => ({ k: f.etiqueta, v: Math.round(f.v * 10) / 10 })),
      },
    ]);
  };
  const aplicar = (r: Pick<ReporteGuardado, "metrica" | "dimension" | "visual">) => {
    setMetrica(r.metrica);
    setDim(r.dimension);
    setVisual(r.visual);
  };
  const PLANTILLAS: { n: string; m: Metrica; d: Dimension; v: Visual }[] = [
    { n: "Producción mensual", m: "produccion", d: "mes", v: "linea" },
    { n: "Productividad por profesional", m: "atenciones", d: "profesional", v: "barras" },
    { n: "Captación por canal", m: "nuevos", d: "canal", v: "barras" },
    { n: "Ausentismo por día", m: "ausentismo", d: "dia", v: "barras" },
    { n: "Presupuestos por profesional", m: "conversion", d: "profesional", v: "tabla" },
  ];

  return (
    <div className="space-y-3">
      <div className="card-grad space-y-3 p-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[210px] flex-1">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Qué medir
            </span>
            <Sel
              value={metrica}
              onChange={setMetrica}
              opciones={METRICAS.map((x) => ({ value: x.v, label: x.l }))}
              etiqueta="Métrica"
            />
          </div>
          <div className="min-w-[180px] flex-1">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Agrupado por
            </span>
            <Sel
              value={dim}
              onChange={setDim}
              opciones={DIMENSIONES.map((x) => ({ value: x.v, label: x.l }))}
              etiqueta="Dimensión"
            />
          </div>
          <div className="flex rounded-full bg-primary/[0.05] p-1">
            {(["barras", "linea", "tabla"] as Visual[]).map((v) => (
              <button
                key={v}
                type="button"
                className={CHIP(visual === v)}
                onClick={() => setVisual(v)}
              >
                {v === "barras" ? "Barras" : v === "linea" ? "Línea" : "Tabla"}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={BTN_SECUNDARIO}
            onClick={() =>
              void exportar(metrica, dim, `${nombreM} por ${nombreD}`).then(() =>
                ctx.onToast("Reporte exportado a Excel"),
              )
            }
          >
            <FileSpreadsheet className="size-4" /> Excel
          </button>
          <button type="button" className={BTN_PRIMARIO} onClick={() => setGuardar(true)}>
            <Save className="size-4" /> Guardar
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">Plantillas:</span>
          {PLANTILLAS.map((p) => (
            <button
              key={p.n}
              type="button"
              onClick={() => aplicar({ metrica: p.m, dimension: p.d, visual: p.v })}
              className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-primary ring-1 ring-primary/15 hover:bg-primary/[0.06]"
            >
              {p.n}
            </button>
          ))}
        </div>
      </div>
      <TarjetaGrafico
        titulo={`${nombreM} por ${nombreD.toLowerCase()}`}
        sub="Usa los filtros de período, sede y profesional de arriba"
        tabla={{ columnas: [nombreD, nombreM], filas: filas.map((f) => [f.etiqueta, fmt(f.v)]) }}
      >
        {!filas.length ? (
          <Vacio icon={FileSpreadsheet} texto="No hay datos para ese reporte en el período." />
        ) : visual === "tabla" ? (
          <div className="scroll-sutil max-h-[360px] overflow-auto">
            <table className="w-full text-[12.5px]">
              <tbody>
                {filas.map((f) => (
                  <tr key={f.k} className="border-t border-primary/10">
                    <td className="p-1.5">{f.etiqueta}</td>
                    <td className="p-1.5 text-right font-semibold tabular-nums">{fmt(f.v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : visual === "linea" ? (
          <Lineas
            etiquetas={filas.map((f) => (dim === "mes" ? nombreMesCorto(f.k) : f.etiqueta))}
            series={[{ nombre: nombreM, valores: filas.map((f) => f.v) }]}
            formato={fmt}
          />
        ) : filas.length > 14 ? (
          <BarrasH
            items={filas.slice(0, 20).map((f) => ({ nombre: f.etiqueta, valor: f.v }))}
            formato={fmt}
          />
        ) : (
          <Barras
            etiquetas={filas.map((f) => (dim === "mes" ? nombreMesCorto(f.k) : f.etiqueta))}
            series={[{ nombre: nombreM, valores: filas.map((f) => f.v) }]}
            formato={fmt}
          />
        )}
      </TarjetaGrafico>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="card-grad p-4">
          <p className="mb-3 text-sm font-semibold">Reportes guardados</p>
          {reportes.length ? (
            <ul className="space-y-2">
              {reportes.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-2 rounded-xl bg-white/85 px-3 py-2 ring-1 ring-primary/10"
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => aplicar(r)}
                  >
                    <b className="block truncate text-[12.5px]">{r.nombre}</b>
                    <span className="text-[11px] text-muted-foreground">
                      {METRICAS.find((x) => x.v === r.metrica)?.l} · por{" "}
                      {DIMENSIONES.find((x) => x.v === r.dimension)?.l.toLowerCase()}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label="Programar envío"
                    title="Programar envío"
                    className={BTN_ICONO}
                    onClick={() => setProgramar(r)}
                  >
                    <Mail className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Descargar"
                    title="Descargar Excel"
                    className={BTN_ICONO}
                    onClick={() =>
                      void exportar(r.metrica, r.dimension, r.nombre).then(() =>
                        ctx.onToast(`${r.nombre} descargado`),
                      )
                    }
                  >
                    <FileSpreadsheet className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Eliminar reporte"
                    className={BTN_ICONO}
                    onClick={() => {
                      setAnalitica("reportes", (p) => p.filter((x) => x.id !== r.id));
                      setAnalitica("envios", (p) => p.filter((x) => x.reporteId !== r.id));
                      ctx.onToast("Reporte eliminado");
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <Vacio icon={Save} texto="Guardá un reporte para tenerlo a mano." />
          )}
        </div>
        <div className="card-grad p-4">
          <p className="mb-3 text-sm font-semibold">Envíos programados por correo</p>
          {envios.length ? (
            <ul className="space-y-2">
              {envios.map((e) => {
                const r = reportes.find((x) => x.id === e.reporteId);
                return (
                  <li
                    key={e.id}
                    className="flex items-center gap-2 rounded-xl bg-white/85 px-3 py-2 ring-1 ring-primary/10"
                  >
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[12.5px]">{r?.nombre ?? "Reporte"}</b>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {e.frecuencia} · {e.destinatarios} · próximo{" "}
                        {proximoEnvio(e).split("-").reverse().join("/")}
                      </span>
                    </span>
                    <Pill clase="bg-emerald-100 text-emerald-700">{e.frecuencia}</Pill>
                    <button
                      type="button"
                      aria-label="Enviar ahora"
                      title="Enviar ahora"
                      className={BTN_ICONO}
                      onClick={() => ctx.onToast(`Reporte enviado a ${e.destinatarios}`)}
                    >
                      <Send className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Quitar envío"
                      className={BTN_ICONO}
                      onClick={() => {
                        setAnalitica("envios", (p) => p.filter((x) => x.id !== e.id));
                        ctx.onToast("Envío programado quitado");
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Vacio icon={Mail} texto="Programá un reporte para que llegue solo por correo." />
          )}
        </div>
      </div>
      {guardar && (
        <M titulo="Guardar reporte" onClose={() => setGuardar(false)}>
          <GuardarForm
            nombreInicial={`${nombreM} por ${nombreD.toLowerCase()}`}
            onCancel={() => setGuardar(false)}
            onGuardar={(nombre) => {
              setAnalitica("reportes", (p) => [
                ...p,
                {
                  id: `r-${Date.now()}`,
                  nombre,
                  metrica,
                  dimension: dim,
                  visual,
                  periodo: ctx.f.periodo,
                  creado: new Date().toISOString().slice(0, 10),
                },
              ]);
              setGuardar(false);
              ctx.onToast(`Reporte "${nombre}" guardado`);
            }}
          />
        </M>
      )}
      {programar && (
        <M titulo={`Programar "${programar.nombre}"`} onClose={() => setProgramar(null)}>
          <ProgramarForm
            onCancel={() => setProgramar(null)}
            onGuardar={(frecuencia, destinatarios) => {
              setAnalitica("envios", (p) => [
                ...p,
                {
                  id: `e-${Date.now()}`,
                  reporteId: programar.id,
                  frecuencia,
                  destinatarios,
                  proximo: "",
                },
              ]);
              setProgramar(null);
              ctx.onToast(`Envío ${frecuencia.toLowerCase()} programado`);
            }}
          />
        </M>
      )}
    </div>
  );
}

function proximoEnvio(e: EnvioProgramado) {
  const d = new Date();
  if (e.frecuencia === "Semanal") d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  else d.setMonth(d.getMonth() + 1, 1);
  return d.toISOString().slice(0, 10);
}

function GuardarForm({
  nombreInicial,
  onCancel,
  onGuardar,
}: {
  nombreInicial: string;
  onCancel: () => void;
  onGuardar: (n: string) => void;
}) {
  const [nombre, setNombre] = useState(nombreInicial);
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (nombre.trim()) onGuardar(nombre.trim());
      }}
    >
      <Field label="Nombre del reporte">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className={INPUT}
          aria-label="Nombre del reporte"
        />
      </Field>
      <Acciones etiqueta="Guardar" onCancel={onCancel} icon={Save} />
    </form>
  );
}

function ProgramarForm({
  onCancel,
  onGuardar,
}: {
  onCancel: () => void;
  onGuardar: (f: EnvioProgramado["frecuencia"], d: string) => void;
}) {
  const [frecuencia, setFrecuencia] = useState<EnvioProgramado["frecuencia"]>("Mensual");
  const [dest, setDest] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const lista = dest.split(/[,;\s]+/).filter(Boolean);
        if (!lista.length || lista.some((x) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x)))
          return setError("Ingresá uno o más correos válidos, separados por coma");
        onGuardar(frecuencia, lista.join(", "));
      }}
    >
      <div className="flex rounded-full bg-primary/[0.05] p-1">
        {(["Semanal", "Mensual"] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={`${CHIP(frecuencia === f)} flex-1 justify-center`}
            onClick={() => setFrecuencia(f)}
          >
            {f === "Semanal" ? "Todos los lunes" : "El 1 de cada mes"}
          </button>
        ))}
      </div>
      <Field label="Destinatarios">
        <input
          value={dest}
          onChange={(e) => setDest(e.target.value)}
          placeholder="socios@clinica.com, contador@estudio.com"
          className={INPUT}
          aria-label="Destinatarios"
        />
      </Field>
      {error && <p className="text-[12px] font-medium text-rose-600">{error}</p>}
      <Acciones etiqueta="Programar" onCancel={onCancel} icon={Plus} />
    </form>
  );
}

/* ───────────── Exportar tablero ───────────── */

export function exportarTablero(ctx: CtxBI) {
  const { m, mPrev } = ctx;
  const kpis: [string, number, number, boolean][] = [
    ["Producción", m.produccion, mPrev.produccion, true],
    ["Atenciones", m.atenciones, mPrev.atenciones, false],
    ["Pacientes nuevos", m.nuevos, mPrev.nuevos, false],
    ["Ticket promedio", m.ticket, mPrev.ticket, true],
    ["Ocupación %", m.ocupacion, mPrev.ocupacion, false],
    ["Ausentismo %", m.ausentismo, mPrev.ausentismo, false],
    ["Conversión de presupuestos %", m.conversion, mPrev.conversion, false],
    ["Pacientes atendidos", m.pacientes, mPrev.pacientes, false],
  ];
  const r1 = calcularReporte(ctx, "produccion", "profesional").filas;
  const r2 = calcularReporte(ctx, "produccion", "tratamiento").filas;
  const r3 = calcularReporte(ctx, "nuevos", "canal").filas;
  const nota = `Cloud Esther · Analítica · ${ctx.rango.desde.split("-").reverse().join("/")} al ${ctx.rango.hasta.split("-").reverse().join("/")} · Sede: ${ctx.f.sucursal} · Profesional: ${ctx.f.profesional}`;
  return descargarExcel(`tablero-analitica-${ctx.rango.hasta}.xlsx`, [
    {
      nombre: "Indicadores",
      nota,
      columnas: [
        { titulo: "Indicador", clave: "i", ancho: 32 },
        { titulo: "Período", clave: "a", ancho: 18 },
        { titulo: "Anterior", clave: "b", ancho: 18 },
        { titulo: "Variación %", clave: "v", ancho: 14 },
      ],
      filas: kpis.map(([i, a, b]) => ({
        i,
        a: Math.round(a * 10) / 10,
        b: Math.round(b * 10) / 10,
        v: Math.round(variacion(a, b) * 10) / 10,
      })),
    },
    {
      nombre: "Mensual",
      nota,
      columnas: [
        { titulo: "Mes", clave: "m", ancho: 20 },
        { titulo: "Producción", clave: "p", moneda: true, ancho: 16 },
        { titulo: "Atenciones", clave: "a", ancho: 12 },
        { titulo: "Nuevos", clave: "n", ancho: 10 },
        { titulo: "Ocupación %", clave: "o", ancho: 12 },
        { titulo: "Ausentismo %", clave: "u", ancho: 12 },
      ],
      filas: ctx.meses.map((mes, i) => {
        const x = ctx.mensual[i]!;
        return {
          m: nombreMesLargo(mes),
          p: x.produccion,
          a: x.atenciones,
          n: x.nuevos,
          o: Math.round(x.ocupacion * 10) / 10,
          u: Math.round(x.ausentismo * 10) / 10,
        };
      }),
    },
    {
      nombre: "Profesionales",
      nota,
      columnas: [
        { titulo: "Profesional", clave: "k", ancho: 28 },
        { titulo: "Producción", clave: "v", moneda: true, ancho: 16 },
      ],
      filas: r1.map((f) => ({ k: f.etiqueta, v: f.v })),
    },
    {
      nombre: "Tratamientos",
      nota,
      columnas: [
        { titulo: "Tratamiento", clave: "k", ancho: 30 },
        { titulo: "Producción", clave: "v", moneda: true, ancho: 16 },
      ],
      filas: r2.map((f) => ({ k: f.etiqueta, v: f.v })),
    },
    {
      nombre: "Captación",
      nota,
      columnas: [
        { titulo: "Canal", clave: "k", ancho: 24 },
        { titulo: "Pacientes nuevos", clave: "v", ancho: 16 },
      ],
      filas: r3.map((f) => ({ k: f.etiqueta, v: f.v })),
    },
  ]);
}
