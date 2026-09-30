import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CalendarClock,
  CalendarX2,
  Gauge,
  HeartHandshake,
  MessageCircle,
  Megaphone,
  Repeat,
  Stethoscope,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import {
  CANALES,
  COBERTURAS,
  DIAS,
  EDADES,
  agrupar,
  nombreMesCorto,
  nombreMesLargo,
  pct,
  variacion,
  type Hecho,
} from "@/lib/cloud-esther/analitica-datos";
import { diasHabiles, metricas } from "@/components/cloud-esther/analitica/datos";
import type { CtxBI } from "@/components/cloud-esther/analitica/ctx";
import {
  Barras,
  BarrasH,
  Lineas,
  MapaCalor,
  TarjetaGrafico,
  color,
} from "@/components/cloud-esther/analitica/graficos";
import { M } from "@/components/cloud-esther/analitica/Analitica";
import { BTN_PRIMARIO, BTN_SECUNDARIO, Mini, Pill } from "@/components/cloud-esther/rrhh/ui";

/* Secciones de Analítica: Pacientes, Agenda y ocupación, Profesionales. */

const atendidas = (xs: Hecho[]) => xs.filter((h) => h.estado === "Atendida");

/* ───────────── Pacientes ───────────── */

export function Pacientes({ ctx }: { ctx: CtxBI }) {
  const navigate = useNavigate();
  const at = atendidas(ctx.hs);
  const unicos = new Set(at.map((h) => h.paciente));
  const nuevos = at.filter((h) => h.nuevo).length;
  const recurrentes = unicos.size - nuevos;
  const et = ctx.meses.map(nombreMesCorto);
  const nuevosMes = ctx.meses.map(
    (mes) =>
      ctx.base.filter((h) => h.estado === "Atendida" && h.nuevo && h.fecha.startsWith(mes)).length,
  );
  const recurrMes = ctx.meses.map((mes) => {
    const xs = ctx.base.filter((h) => h.estado === "Atendida" && h.fecha.startsWith(mes));
    return new Set(xs.filter((h) => !h.nuevo).map((h) => h.paciente)).size;
  });
  const porCanal = CANALES.map((c) => ({
    nombre: c,
    valor: at.filter((h) => h.nuevo && h.canal === c).length,
  }))
    .filter((x) => x.valor)
    .sort((a, b) => b.valor - a.valor);
  const cobertura = COBERTURAS.map((c) => ({
    nombre: c,
    valor: pct(at.filter((h) => h.cobertura === c).length, at.length),
  }))
    .filter((x) => x.valor)
    .sort((a, b) => b.valor - a.valor);
  const edades = EDADES.map(
    (e) => new Set(at.filter((h) => h.edad === e).map((h) => h.paciente)).size,
  );
  const genero = (["Femenino", "Masculino", "Otro"] as const).map((g) => ({
    nombre: g,
    valor: pct(new Set(at.filter((h) => h.genero === g).map((h) => h.paciente)).size, unicos.size),
  }));

  // Cohortes: mes de la primera visita → % que volvió en los meses siguientes.
  const cohortes = ctx.meses.slice(-7, -1);
  const primera = new Map<number, string>();
  for (const h of ctx.base)
    if (h.nuevo && h.estado === "Atendida") primera.set(h.paciente, h.fecha.slice(0, 7));
  const visitas = agrupar(
    atendidas(ctx.base).filter((h) => !h.nuevo),
    (h) => h.paciente,
  );
  const matriz = cohortes.map((c) => {
    const miembros = [...primera.entries()].filter(([, m]) => m === c).map(([p]) => p);
    const idx = ctx.meses.indexOf(c);
    return [1, 2, 3, 4, 5].map((k) => {
      const mes = ctx.meses[idx + k];
      if (!mes || !miembros.length) return null;
      const volvieron = miembros.filter((p) =>
        (visitas.get(p) ?? []).some((h) => h.fecha.startsWith(mes)),
      ).length;
      return Math.round(pct(volvieron, miembros.length));
    });
  });

  // Recontactar: pacientes reales sin turnos en los últimos 6 meses.
  const hace6 = new Date();
  hace6.setMonth(hace6.getMonth() - 6);
  const limite = hace6.toISOString().slice(0, 10);
  const conTurno = new Set(
    ctx.datos.turnosVivos.filter((t) => t.fecha >= limite).map((t) => t.paciente.toLowerCase()),
  );
  const recontactar = ctx.datos.pacientes.filter(
    (p) => p.estado === "Activo" && !conTurno.has(`${p.nombre} ${p.apellido}`.toLowerCase()),
  );
  const ultimaHist = new Map<number, string>();
  for (const h of atendidas(ctx.base))
    if (!h.vivo && (ultimaHist.get(h.paciente) ?? "") < h.fecha)
      ultimaHist.set(h.paciente, h.fecha);
  const dormidos = [...ultimaHist.values()].filter((f) => f < limite).length;
  const hace = (meses: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() - meses);
    return d.toISOString().slice(0, 10);
  };
  const tramos = [
    {
      nombre: "6 a 8 meses sin venir",
      valor: [...ultimaHist.values()].filter((f) => f < limite && f >= hace(8)).length,
    },
    {
      nombre: "8 a 10 meses",
      valor: [...ultimaHist.values()].filter((f) => f < hace(8) && f >= hace(10)).length,
    },
    {
      nombre: "Más de 10 meses",
      valor: [...ultimaHist.values()].filter((f) => f < hace(10)).length,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Mini
          label="Pacientes atendidos"
          valor={ctx.n(unicos.size)}
          icon={Users}
          sub={`${ctx.n(at.length)} atenciones`}
        />
        <Mini
          label="Nuevos"
          valor={ctx.n(nuevos)}
          icon={UserPlus}
          tono="text-emerald-600"
          sub={`${Math.round(pct(nuevos, unicos.size))} % del total`}
        />
        <Mini
          label="Recurrentes"
          valor={ctx.n(Math.max(0, recurrentes))}
          icon={Repeat}
          sub={`${(at.length / Math.max(1, unicos.size)).toFixed(1).replace(".", ",")} visitas por paciente`}
        />
        <Mini
          label="Sin volver hace +6 meses"
          valor={ctx.n(dormidos + recontactar.length)}
          icon={UserMinus}
          tono="text-amber-600"
          sub="para reactivar"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.5fr_1fr]">
        <TarjetaGrafico
          titulo="Pacientes nuevos y recurrentes"
          sub="Por mes, últimos 12 meses"
          tabla={{
            columnas: ["Mes", "Nuevos", "Recurrentes"],
            filas: ctx.meses.map((m, i) => [
              nombreMesLargo(m),
              nuevosMes[i] ?? 0,
              recurrMes[i] ?? 0,
            ]),
          }}
        >
          <Barras
            etiquetas={et}
            apilado
            formato={ctx.n}
            series={[
              { nombre: "Nuevos", valores: nuevosMes },
              { nombre: "Recurrentes", valores: recurrMes },
            ]}
          />
        </TarjetaGrafico>
        <TarjetaGrafico
          titulo="Cómo llegaron los pacientes nuevos"
          sub="Canal de captación en el período"
          tabla={{ columnas: ["Canal", "Nuevos"], filas: porCanal.map((c) => [c.nombre, c.valor]) }}
        >
          <BarrasH items={porCanal} formato={ctx.n} />
        </TarjetaGrafico>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <TarjetaGrafico
          titulo="Cobertura"
          sub="% de atenciones"
          tabla={{
            columnas: ["Cobertura", "%"],
            filas: cobertura.map((c) => [c.nombre, ctx.p(c.valor)]),
          }}
        >
          <BarrasH items={cobertura} formato={ctx.p} colorBarra={color(3)} />
        </TarjetaGrafico>
        <TarjetaGrafico
          titulo="Edad"
          sub="Pacientes atendidos"
          tabla={{
            columnas: ["Edad", "Pacientes"],
            filas: EDADES.map((e, i) => [e, edades[i] ?? 0]),
          }}
        >
          <Barras
            etiquetas={EDADES}
            series={[{ nombre: "Pacientes", valores: edades, color: color(1) }]}
            formato={ctx.n}
            alto={150}
          />
        </TarjetaGrafico>
        <TarjetaGrafico
          titulo="Género"
          sub="% de pacientes"
          tabla={{
            columnas: ["Género", "%"],
            filas: genero.map((g) => [g.nombre, ctx.p(g.valor)]),
          }}
        >
          <BarrasH items={genero} formato={ctx.p} colorBarra={color(4)} max={100} />
        </TarjetaGrafico>
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.3fr_1fr]">
        {ctx.nivel >= 3 ? (
          <TarjetaGrafico
            titulo="Retención por cohorte"
            sub="De los pacientes que vinieron por primera vez cada mes, qué % volvió en los meses siguientes"
            tabla={{
              columnas: ["Primera visita", "Mes 1", "Mes 2", "Mes 3", "Mes 4", "Mes 5"],
              filas: cohortes.map((c, i) => [
                nombreMesLargo(c),
                ...(matriz[i] ?? []).map((v) => (v === null ? "—" : `${v} %`)),
              ]),
            }}
          >
            <MapaCalor
              filas={cohortes.map(nombreMesLargo)}
              columnas={["Mes 1", "Mes 2", "Mes 3", "Mes 4", "Mes 5"]}
              valores={matriz}
              formato={(v) => `${v} %`}
            />
          </TarjetaGrafico>
        ) : (
          <TarjetaGrafico titulo="Atenciones por paciente" sub="Visitas en el período">
            <BarrasH
              items={[1, 2, 3, 4].map((k) => {
                const porPac = agrupar(at, (h) => h.paciente);
                const n = [...porPac.values()].filter((xs) =>
                  k === 4 ? xs.length >= 4 : xs.length === k,
                ).length;
                return {
                  nombre: k === 4 ? "4 o más visitas" : `${k} visita${k > 1 ? "s" : ""}`,
                  valor: n,
                };
              })}
              formato={ctx.n}
            />
          </TarjetaGrafico>
        )}
        <div className="card-grad p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">Para reactivar</p>
            <button
              type="button"
              className={BTN_PRIMARIO}
              onClick={() => void navigate({ to: "/demo/marketing" })}
            >
              <Megaphone className="size-4" /> Campaña de reactivación
            </button>
          </div>
          <p className="mb-2 text-[12px] text-muted-foreground">
            {ctx.n(dormidos)} pacientes del histórico y {recontactar.length} de tu lista no tienen
            turnos hace más de 6 meses.
          </p>
          <BarrasH items={tramos} formato={ctx.n} colorBarra={color(5)} />
          <ul className="scroll-sutil mt-3 max-h-[200px] space-y-1.5 overflow-y-auto pr-1">
            {recontactar.slice(0, 20).map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-2 rounded-xl bg-white/85 px-3 py-2 ring-1 ring-primary/10"
              >
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[12.5px]">
                    {p.nombre} {p.apellido}
                  </b>
                  <span className="text-[11px] text-muted-foreground">
                    {p.obraSocial || "Particular"} · {p.sucursal}
                  </span>
                </span>
                {p.telefono && (
                  <a
                    className={BTN_SECUNDARIO}
                    target="_blank"
                    rel="noreferrer"
                    href={`https://wa.me/${p.telefono.replace(/[^\d]/g, "")}?text=${encodeURIComponent(`Hola ${p.nombre}, hace un tiempo que no te vemos en la clínica. ¿Querés que te reservemos un turno de control?`)}`}
                  >
                    <MessageCircle className="size-4" /> WhatsApp
                  </a>
                )}
              </li>
            ))}
            {!recontactar.length && (
              <li className="text-[12px] text-muted-foreground">
                Todos tus pacientes tienen turnos recientes.
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Agenda y ocupación ───────────── */

export function Agenda({ ctx }: { ctx: CtxBI }) {
  const navigate = useNavigate();
  const horas = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
  const dias = [1, 2, 3, 4, 5, 6];
  const semanas = Math.max(1, ctx.rango.dias / 7);
  const noCanc = ctx.hs.filter((h) => h.estado !== "Cancelada" && h.estado !== "Programada");
  const calor = dias.map((d) =>
    horas.map((h) => {
      const v = noCanc.filter((x) => x.dow === d && x.hora === h).length / semanas;
      return v ? Math.round(v * 10) / 10 : null;
    }),
  );
  const ausDia = dias.map((d) => {
    const x = ctx.hs.filter((h) => h.dow === d);
    const a = x.filter((h) => h.estado === "Ausente").length;
    return Math.round(pct(a, a + x.filter((h) => h.estado === "Atendida").length) * 10) / 10;
  });
  const ocupSede = ctx.sedes.map((s) => ({
    nombre: s,
    valor: metricas(
      ctx.hs.filter((h) => h.sucursal === s),
      [],
      ctx.cfg,
      [s],
      ctx.rango.desde,
      ctx.rango.hasta,
    ).ocupacion,
  }));
  const ausProf = [...agrupar(ctx.hs, (h) => h.profesional).entries()]
    .map(([p, xs]) => {
      const a = xs.filter((h) => h.estado === "Ausente").length;
      return { nombre: p, valor: pct(a, a + xs.filter((h) => h.estado === "Atendida").length) };
    })
    .sort((a, b) => b.valor - a.valor);
  // Próximas 3 semanas (turnos ya programados).
  const hoy = new Date().toISOString().slice(0, 10);
  const futuros = ctx.base.filter((h) => h.fecha > hoy && h.estado === "Programada");
  const prox = [0, 1, 2].map((k) => {
    const d0 = new Date();
    d0.setDate(d0.getDate() + 1 + k * 7);
    const d1 = new Date(d0);
    d1.setDate(d1.getDate() + 6);
    const a = d0.toISOString().slice(0, 10);
    const b = d1.toISOString().slice(0, 10);
    const n = futuros.filter((h) => h.fecha >= a && h.fecha <= b).length;
    const cap =
      ctx.sedes.reduce(
        (s, x) => s + (ctx.cfg.capacidad[x]?.gabinetes ?? 1) * (ctx.cfg.capacidad[x]?.horas ?? 8),
        0,
      ) *
      diasHabiles(a, b) *
      (60 / ctx.cfg.duracionMin);
    return {
      etiqueta: `${a.slice(8)}/${a.slice(5, 7)}`,
      n,
      libres: Math.max(0, Math.round(cap - n)),
      ocup: pct(n, cap),
    };
  });
  const peor = dias.reduce((a, d, i) => ((ausDia[i] ?? 0) > (ausDia[a] ?? 0) ? i : a), 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Mini
          label="Ocupación"
          valor={ctx.p(ctx.m.ocupacion)}
          icon={Gauge}
          sub={`meta ${ctx.p(ctx.cfg.metas.ocupacion)}`}
        />
        <Mini
          label="Ausentismo"
          valor={ctx.p(ctx.m.ausentismo)}
          icon={UserMinus}
          tono={ctx.m.ausentismo > ctx.cfg.metas.ausentismo ? "text-rose-600" : "text-emerald-600"}
          sub={`máximo ${ctx.p(ctx.cfg.metas.ausentismo)}`}
        />
        <Mini
          label="Cancelaciones"
          valor={ctx.p(ctx.m.cancelacion)}
          icon={CalendarX2}
          sub="de los turnos dados"
        />
        <Mini
          label="Turnos programados"
          valor={ctx.n(futuros.length)}
          icon={CalendarClock}
          sub="próximas 3 semanas"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.6fr_1fr]">
        <TarjetaGrafico
          titulo="Horarios más pedidos"
          sub="Promedio de turnos por semana en cada día y hora"
          tabla={{
            columnas: ["Día", ...horas.map((h) => `${h} h`)],
            filas: dias.map((d, i) => [DIAS[d] ?? "", ...(calor[i] ?? []).map((v) => v ?? 0)]),
          }}
        >
          <MapaCalor
            filas={dias.map((d) => DIAS[d] ?? "")}
            columnas={horas.map((h) => `${h}`)}
            valores={calor}
            formato={(v) => v.toFixed(1).replace(".", ",")}
          />
        </TarjetaGrafico>
        <TarjetaGrafico
          titulo="Ausentismo por día"
          sub="% de pacientes que no vinieron"
          tabla={{
            columnas: ["Día", "Ausentismo"],
            filas: dias.map((d, i) => [DIAS[d] ?? "", ctx.p(ausDia[i] ?? 0)]),
          }}
        >
          <Barras
            etiquetas={dias.map((d) => DIAS[d] ?? "")}
            series={[{ nombre: "Ausentismo", valores: ausDia, color: color(2) }]}
            formato={ctx.p}
            alto={160}
          />
          <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[12px] text-amber-800 ring-1 ring-amber-100">
            <span>
              El peor día es el <b>{DIAS[dias[peor] ?? 1]}</b> ({ctx.p(ausDia[peor] ?? 0)}). Activá
              la confirmación por WhatsApp.
            </span>
            <button
              type="button"
              className="shrink-0 font-semibold text-primary hover:underline"
              onClick={() => void navigate({ to: "/demo/comunicaciones" })}
            >
              Configurar →
            </button>
          </div>
        </TarjetaGrafico>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <TarjetaGrafico
          titulo="Ocupación por sede"
          tabla={{
            columnas: ["Sede", "Ocupación"],
            filas: ocupSede.map((x) => [x.nombre, ctx.p(x.valor)]),
          }}
        >
          <BarrasH items={ocupSede} formato={ctx.p} max={100} />
        </TarjetaGrafico>
        <TarjetaGrafico
          titulo="Ausentismo por profesional"
          tabla={{
            columnas: ["Profesional", "Ausentismo"],
            filas: ausProf.map((x) => [x.nombre, ctx.p(x.valor)]),
          }}
        >
          <BarrasH items={ausProf} formato={ctx.p} colorBarra={color(2)} />
        </TarjetaGrafico>
        <TarjetaGrafico
          titulo="Próximas semanas"
          sub="Turnos ya dados y lugares libres"
          tabla={{
            columnas: ["Semana del", "Turnos", "Libres", "Ocupación"],
            filas: prox.map((x) => [x.etiqueta, x.n, x.libres, ctx.p(x.ocup)]),
          }}
        >
          <ul className="space-y-2">
            {prox.map((x) => (
              <li
                key={x.etiqueta}
                className="rounded-xl bg-white/85 px-3 py-2 ring-1 ring-primary/10"
              >
                <div className="flex justify-between text-[12.5px]">
                  <b>Semana del {x.etiqueta}</b>
                  <span>{ctx.p(x.ocup)}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-primary/10">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(100, x.ocup)}%` }}
                  />
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {x.n} turnos · {x.libres} lugares libres
                </p>
              </li>
            ))}
          </ul>
        </TarjetaGrafico>
      </div>
    </div>
  );
}

/* ───────────── Profesionales ───────────── */

type FilaProf = {
  nombre: string;
  atenciones: number;
  produccion: number;
  ticket: number;
  nuevos: number;
  ausentismo: number;
  presupuestos: number;
  conversion: number;
  delta: number;
};
const COLS: { k: keyof FilaProf; t: string }[] = [
  { k: "atenciones", t: "Atenciones" },
  { k: "produccion", t: "Producción" },
  { k: "ticket", t: "Ticket" },
  { k: "nuevos", t: "Nuevos" },
  { k: "ausentismo", t: "Ausentismo" },
  { k: "presupuestos", t: "Presupuestos" },
  { k: "conversion", t: "Conversión" },
  { k: "delta", t: "vs. anterior" },
];

export function Profesionales({ ctx }: { ctx: CtxBI }) {
  const [orden, setOrden] = useState<keyof FilaProf>("produccion");
  const [abierto, setAbierto] = useState<string | null>(null);
  const nombres = [...new Set([...ctx.hs, ...ctx.hsPrev].map((h) => h.profesional))];
  const filas: FilaProf[] = nombres.map((p) => {
    const m = metricas(
      ctx.hs.filter((h) => h.profesional === p),
      ctx.pres.filter((x) => x.profesional === p),
      ctx.cfg,
      ctx.sedes,
      ctx.rango.desde,
      ctx.rango.hasta,
    );
    const prev = atendidas(ctx.hsPrev.filter((h) => h.profesional === p)).reduce(
      (a, h) => a + h.monto,
      0,
    );
    return {
      nombre: p,
      atenciones: m.atenciones,
      produccion: m.produccion,
      ticket: m.ticket,
      nuevos: m.nuevos,
      ausentismo: m.ausentismo,
      presupuestos: m.presupuestos,
      conversion: m.conversion,
      delta: variacion(m.produccion, prev),
    };
  });
  filas.sort((a, b) =>
    typeof a[orden] === "number" ? (b[orden] as number) - (a[orden] as number) : 0,
  );
  const fmt = (k: keyof FilaProf, v: number) =>
    k === "produccion" || k === "ticket"
      ? ctx.$c(v)
      : k === "ausentismo" || k === "conversion"
        ? ctx.p(v)
        : k === "delta"
          ? `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1).replace(".", ",")} %`
          : ctx.n(v);

  return (
    <div className="space-y-3">
      <div className="card-grad scroll-sutil overflow-x-auto p-4">
        <p className="mb-3 text-sm font-semibold">Ranking de profesionales</p>
        <table className="w-full min-w-[880px] text-[12.5px]">
          <thead>
            <tr className="text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground">
              <th className="p-2 text-left">Profesional</th>
              {COLS.map((c) => (
                <th key={c.k} className="p-2 text-right">
                  <button
                    type="button"
                    onClick={() => setOrden(c.k)}
                    className={`uppercase ${orden === c.k ? "text-primary" : "hover:text-foreground"}`}
                  >
                    {c.t}
                    {orden === c.k ? " ↓" : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr
                key={f.nombre}
                className="cursor-pointer border-t border-primary/10 hover:bg-primary/[0.04]"
                onClick={() => setAbierto(f.nombre)}
              >
                <td className="p-2">
                  <span className="flex items-center gap-2 font-semibold">
                    <span className="grid size-6 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {i + 1}
                    </span>
                    {f.nombre}
                  </span>
                </td>
                {COLS.map((c) => (
                  <td
                    key={c.k}
                    className={`p-2 text-right tabular-nums ${c.k === "delta" ? (f.delta >= 0 ? "text-emerald-600" : "text-rose-600") : ""} ${c.k === orden ? "font-bold" : ""}`}
                  >
                    {fmt(c.k, f[c.k] as number)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Tocá un profesional para ver su evolución y sus tratamientos.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <TarjetaGrafico
          titulo="Producción: período actual y anterior"
          tabla={{
            columnas: ["Profesional", "Actual", "Anterior"],
            filas: filas.map((f) => [
              f.nombre,
              ctx.$(f.produccion),
              ctx.$(
                atendidas(ctx.hsPrev.filter((h) => h.profesional === f.nombre)).reduce(
                  (a, h) => a + h.monto,
                  0,
                ),
              ),
            ]),
          }}
        >
          <Barras
            etiquetas={filas.map((f) => f.nombre.split(" ")[0] ?? f.nombre)}
            formato={ctx.$c}
            series={[
              { nombre: "Período actual", valores: filas.map((f) => f.produccion) },
              {
                nombre: "Período anterior",
                valores: filas.map((f) =>
                  atendidas(ctx.hsPrev.filter((h) => h.profesional === f.nombre)).reduce(
                    (a, h) => a + h.monto,
                    0,
                  ),
                ),
                color: "#c4b5fd",
              },
            ]}
          />
        </TarjetaGrafico>
        <TarjetaGrafico
          titulo="Pacientes nuevos por profesional"
          tabla={{
            columnas: ["Profesional", "Nuevos"],
            filas: filas.map((f) => [f.nombre, f.nuevos]),
          }}
        >
          <BarrasH
            items={[...filas]
              .sort((a, b) => b.nuevos - a.nuevos)
              .map((f) => ({ nombre: f.nombre, valor: f.nuevos }))}
            formato={ctx.n}
            colorBarra={color(1)}
          />
        </TarjetaGrafico>
      </div>
      {abierto && (
        <M titulo={abierto} onClose={() => setAbierto(null)} ancho="max-w-3xl">
          <DetalleProfesional ctx={ctx} nombre={abierto} />
        </M>
      )}
    </div>
  );
}

function DetalleProfesional({ ctx, nombre }: { ctx: CtxBI; nombre: string }) {
  const suyos = ctx.base.filter((h) => h.profesional === nombre);
  const serie = ctx.meses.map((mes) =>
    atendidas(suyos.filter((h) => h.fecha.startsWith(mes))).reduce((a, h) => a + h.monto, 0),
  );
  const trat = [
    ...agrupar(
      atendidas(ctx.hs.filter((h) => h.profesional === nombre)),
      (h) => h.tratamiento,
    ).entries(),
  ]
    .map(([t, xs]) => ({
      nombre: t,
      valor: xs.reduce((a, h) => a + h.monto, 0),
      sub: `${xs.length} ×`,
    }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 8);
  const sedes = [...new Set(suyos.map((h) => h.sucursal))];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {sedes.map((s) => (
          <Pill key={s} clase="bg-primary/10 text-primary">
            {s}
          </Pill>
        ))}
        <Pill clase="bg-emerald-100 text-emerald-700">
          <HeartHandshake className="size-3" />{" "}
          {ctx.n(
            new Set(
              atendidas(ctx.hs.filter((h) => h.profesional === nombre)).map((h) => h.paciente),
            ).size,
          )}{" "}
          pacientes en el período
        </Pill>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">Producción mensual</p>
        <Lineas
          etiquetas={ctx.meses.map(nombreMesCorto)}
          series={[{ nombre: "Producción", valores: serie }]}
          formato={ctx.$c}
          alto={160}
        />
      </div>
      <div>
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Stethoscope className="size-4 text-primary" /> Tratamientos del período
        </p>
        <BarrasH items={trat} formato={ctx.$c} />
      </div>
    </div>
  );
}
