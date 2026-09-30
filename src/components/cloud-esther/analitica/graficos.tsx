import { useState } from "react";
import type { ReactNode } from "react";
import { BarChart3, Table2 } from "lucide-react";

/* Gráficos de Analítica (SVG/HTML propios, sin librerías).
   Reglas: un solo eje, colores categóricos en orden fijo (validados para daltonismo),
   leyenda siempre que haya 2+ series, tooltip al pasar el mouse y vista de tabla. */

/** Orden fijo de colores categóricos (validado: CVD ΔE ≥ 9 entre vecinos). */
export const CAT = ["#7c3aed", "#1baf7a", "#eb6834", "#2a78d6", "#e87ba4", "#eda100"] as const;
export const color = (i: number) => CAT[i % CAT.length]!;

/** Rampa secuencial de un solo tono (violeta claro → oscuro). */
export function secuencial(t: number) {
  const a = [237, 233, 254];
  const b = [76, 29, 149];
  const k = Math.max(0, Math.min(1, t));
  return `rgb(${a.map((x, i) => Math.round(x + (b[i]! - x) * k)).join(",")})`;
}

export type Serie = { nombre: string; valores: number[]; color?: string };
export type Tabla = { columnas: string[]; filas: (string | number)[][] };

export function Leyenda({ items }: { items: { nombre: string; color: string }[] }) {
  if (items.length < 2) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
      {items.map((s) => (
        <span key={s.nombre} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: s.color }} />
          {s.nombre}
        </span>
      ))}
    </div>
  );
}

function Tooltip({
  x,
  titulo,
  filas,
}: {
  x: number;
  titulo: string;
  filas: { n: string; v: string; c?: string | undefined }[];
}) {
  return (
    <div
      className="pointer-events-none absolute top-0 z-10 min-w-[150px] rounded-xl bg-foreground/95 px-3 py-2 text-[11px] text-background shadow-xl"
      style={{ left: `${x}%`, transform: `translateX(${x > 60 ? "-105%" : "5%"})` }}
    >
      <p className="mb-1 font-semibold">{titulo}</p>
      {filas.map((f) => (
        <p key={f.n} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 opacity-80">
            {f.c && <span className="size-2 rounded-full" style={{ background: f.c }} />}
            {f.n}
          </span>
          <b>{f.v}</b>
        </p>
      ))}
    </div>
  );
}

/** Tarjeta de gráfico con alternancia Gráfico / Tabla. */
export function TarjetaGrafico({
  titulo,
  sub,
  tabla,
  acciones,
  children,
  className = "",
}: {
  titulo: string;
  sub?: string;
  tabla?: Tabla;
  acciones?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [verTabla, setVerTabla] = useState(false);
  return (
    <div className={`card-grad flex flex-col p-4 ${className}`}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{titulo}</p>
          {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {acciones}
          {tabla && (
            <button
              type="button"
              onClick={() => setVerTabla((v) => !v)}
              aria-label={verTabla ? "Ver gráfico" : "Ver tabla"}
              title={verTabla ? "Ver gráfico" : "Ver tabla"}
              className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary"
            >
              {verTabla ? <BarChart3 className="size-4" /> : <Table2 className="size-4" />}
            </button>
          )}
        </div>
      </div>
      {verTabla && tabla ? (
        <div className="scroll-sutil max-h-[320px] overflow-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground">
                {tabla.columnas.map((c, i) => (
                  <th key={c} className={`sticky top-0 bg-white/95 p-1.5 ${i ? "text-right" : ""}`}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tabla.filas.map((f, i) => (
                <tr key={i} className="border-t border-primary/10">
                  {f.map((v, j) => (
                    <td key={j} className={`p-1.5 ${j ? "text-right tabular-nums" : ""}`}>
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex-1">{children}</div>
      )}
    </div>
  );
}

/* ───────────── Línea (evolución) ───────────── */

export function Lineas({
  etiquetas,
  series,
  formato,
  alto = 190,
  area = true,
}: {
  etiquetas: string[];
  series: Serie[];
  formato: (n: number) => string;
  alto?: number;
  area?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...series.flatMap((s) => s.valores)) * 1.1;
  const n = Math.max(1, etiquetas.length - 1);
  const x = (i: number) => (etiquetas.length === 1 ? 50 : (i / n) * 100);
  const y = (v: number) => 100 - (v / max) * 100;
  const cols = series.map((s, i) => s.color ?? color(i));
  return (
    <div>
      <div className="relative" style={{ height: alto }} onMouseLeave={() => setHover(null)}>
        {[0.25, 0.5, 0.75].map((g) => (
          <div
            key={g}
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-primary/10"
            style={{ top: `${g * 100}%` }}
          >
            <span className="absolute left-0 -translate-y-full rounded bg-white/75 px-0.5 text-[9.5px] leading-4 text-muted-foreground">
              {formato(max * (1 - g))}
            </span>
          </div>
        ))}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
        >
          {series.map((s, si) => (
            <g key={s.nombre}>
              {area && si === 0 && (
                <polygon
                  fill={cols[si]}
                  opacity="0.09"
                  points={`0,100 ${s.valores.map((v, i) => `${x(i)},${y(v)}`).join(" ")} 100,100`}
                />
              )}
              <polyline
                fill="none"
                stroke={cols[si]}
                strokeWidth="2"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                points={s.valores.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
              />
            </g>
          ))}
          {hover !== null && (
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1="0"
              y2="100"
              stroke="#7c3aed"
              strokeOpacity="0.35"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        {hover !== null &&
          series.map((s, si) => (
            <span
              key={s.nombre}
              className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
              style={{
                left: `${x(hover)}%`,
                top: `${y(s.valores[hover] ?? 0)}%`,
                background: cols[si],
              }}
            />
          ))}
        <div className="absolute inset-0 flex">
          {etiquetas.map((e, i) => (
            <div key={`${e}-${i}`} className="h-full flex-1" onMouseEnter={() => setHover(i)} />
          ))}
        </div>
        {hover !== null && (
          <Tooltip
            x={x(hover)}
            titulo={etiquetas[hover] ?? ""}
            filas={series.map((s, si) => ({
              n: s.nombre,
              v: formato(s.valores[hover] ?? 0),
              c: cols[si],
            }))}
          />
        )}
      </div>
      <div className="mt-1.5 flex justify-between text-[10.5px] text-muted-foreground">
        {etiquetas.map((e, i) =>
          etiquetas.length <= 12 || i % Math.ceil(etiquetas.length / 12) === 0 ? (
            <span key={`${e}-${i}`}>{e}</span>
          ) : null,
        )}
      </div>
      <Leyenda items={series.map((s, i) => ({ nombre: s.nombre, color: cols[i]! }))} />
    </div>
  );
}

/* ───────────── Barras verticales (agrupadas o apiladas) ───────────── */

export function Barras({
  etiquetas,
  series,
  formato,
  apilado = false,
  alto = 190,
}: {
  etiquetas: string[];
  series: Serie[];
  formato: (n: number) => string;
  apilado?: boolean;
  alto?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const cols = series.map((s, i) => s.color ?? color(i));
  const totales = etiquetas.map((_, i) => series.reduce((a, s) => a + (s.valores[i] ?? 0), 0));
  const max = Math.max(1, ...(apilado ? totales : series.flatMap((s) => s.valores)));
  return (
    <div>
      <div
        className="relative flex items-end gap-1.5"
        style={{ height: alto }}
        onMouseLeave={() => setHover(null)}
      >
        {[0.25, 0.5, 0.75].map((g) => (
          <div
            key={g}
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-primary/10"
            style={{ top: `${g * 100}%` }}
          >
            <span className="absolute left-0 -translate-y-full rounded bg-white/75 px-0.5 text-[9.5px] leading-4 text-muted-foreground">
              {formato(max * (1 - g))}
            </span>
          </div>
        ))}
        {etiquetas.map((e, i) => (
          <div
            key={`${e}-${i}`}
            className={`relative flex h-full flex-1 items-end justify-center rounded-lg ${hover === i ? "bg-primary/[0.05]" : ""} ${apilado ? "flex-col-reverse justify-start" : "gap-0.5"}`}
            onMouseEnter={() => setHover(i)}
          >
            {series.map((s, si) => {
              const v = s.valores[i] ?? 0;
              return (
                <div
                  key={s.nombre}
                  className={
                    apilado
                      ? "w-3/5 max-w-9 border-t-2 border-white first:rounded-b-[4px] last:rounded-t-[4px]"
                      : "w-full max-w-7 rounded-t-[4px]"
                  }
                  style={{
                    height: `${(v / max) * 100}%`,
                    background: cols[si],
                    minHeight: v ? 2 : 0,
                  }}
                />
              );
            })}
          </div>
        ))}
        {hover !== null && (
          <Tooltip
            x={((hover + 0.5) / etiquetas.length) * 100}
            titulo={etiquetas[hover] ?? ""}
            filas={[
              ...series.map((s, si) => ({
                n: s.nombre,
                v: formato(s.valores[hover] ?? 0),
                c: cols[si],
              })),
              ...(apilado && series.length > 1
                ? [{ n: "Total", v: formato(totales[hover] ?? 0) }]
                : []),
            ]}
          />
        )}
      </div>
      <div className="mt-1.5 flex gap-1.5 text-[10.5px] text-muted-foreground">
        {etiquetas.map((e, i) => (
          <span key={`${e}-${i}`} className="flex-1 truncate text-center">
            {etiquetas.length <= 14 || i % 2 === 0 ? e : ""}
          </span>
        ))}
      </div>
      <Leyenda items={series.map((s, i) => ({ nombre: s.nombre, color: cols[i]! }))} />
    </div>
  );
}

/* ───────────── Barras horizontales con etiqueta directa ───────────── */

export function BarrasH({
  items,
  formato,
  max: maxDado,
  colorBarra = CAT[0],
}: {
  items: { nombre: string; valor: number; sub?: string; color?: string }[];
  formato: (n: number) => string;
  max?: number;
  colorBarra?: string;
}) {
  const max = maxDado ?? Math.max(1, ...items.map((i) => i.valor));
  return (
    <ul className="space-y-2">
      {items.map((it) => (
        <li key={it.nombre} title={`${it.nombre}: ${formato(it.valor)}`}>
          <div className="flex items-baseline justify-between gap-2 text-[12px]">
            <span className="min-w-0 truncate">
              {it.nombre}
              {it.sub && <span className="ml-1 text-[10.5px] text-muted-foreground">{it.sub}</span>}
            </span>
            <b className="shrink-0 tabular-nums">{formato(it.valor)}</b>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-primary/10">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(1, (it.valor / max) * 100)}%`,
                background: it.color ?? colorBarra,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ───────────── Mapa de calor ───────────── */

export function MapaCalor({
  filas,
  columnas,
  valores,
  formato,
  vacio = "—",
}: {
  filas: string[];
  columnas: string[];
  valores: (number | null)[][];
  formato: (n: number) => string;
  vacio?: string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const todos = valores.flat().filter((v): v is number => v !== null);
  const max = Math.max(1, ...todos);
  return (
    <div className="scroll-sutil overflow-x-auto">
      <table className="w-full border-separate border-spacing-[2px] text-[10.5px]">
        <thead>
          <tr>
            <th />
            {columnas.map((c) => (
              <th key={c} className="px-0.5 font-medium text-muted-foreground">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={f}>
              <th className="whitespace-nowrap pr-2 text-right font-medium text-muted-foreground">
                {f}
              </th>
              {columnas.map((c, j) => {
                const v = valores[i]?.[j] ?? null;
                const t = v === null ? 0 : v / max;
                const id = `${i}-${j}`;
                return (
                  <td
                    key={c}
                    onMouseEnter={() => setHover(id)}
                    onMouseLeave={() => setHover(null)}
                    title={`${f} · ${c}: ${v === null ? vacio : formato(v)}`}
                    className={`h-7 min-w-8 rounded-[4px] text-center tabular-nums ${hover === id ? "ring-2 ring-foreground/60" : ""}`}
                    style={{
                      background: v === null ? "transparent" : secuencial(t),
                      color: t > 0.55 ? "#fff" : "#3b2a63",
                    }}
                  >
                    {v === null ? "" : formato(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ───────────── Embudo ───────────── */

export function Embudo({
  pasos,
  formato,
}: {
  pasos: { nombre: string; valor: number; detalle?: string }[];
  formato: (n: number) => string;
}) {
  const max = Math.max(1, pasos[0]?.valor ?? 1);
  return (
    <ol className="space-y-2">
      {pasos.map((p, i) => {
        const prev = pasos[i - 1]?.valor;
        return (
          <li key={p.nombre}>
            <div className="flex items-baseline justify-between text-[12px]">
              <span className="font-medium">{p.nombre}</span>
              <span className="tabular-nums">
                <b>{formato(p.valor)}</b>
                {prev ? (
                  <span className="ml-1.5 text-[10.5px] text-muted-foreground">
                    {Math.round((p.valor / prev) * 100)} % del paso anterior
                  </span>
                ) : null}
              </span>
            </div>
            <div className="mt-1 h-7 overflow-hidden rounded-lg bg-primary/[0.06]">
              <div
                className="flex h-full items-center rounded-lg px-2 text-[10.5px] font-semibold text-white"
                style={{
                  width: `${Math.max(4, (p.valor / max) * 100)}%`,
                  background: secuencial(0.45 + (i / Math.max(1, pasos.length - 1)) * 0.5),
                }}
              >
                {p.detalle}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ───────────── Sparkline ───────────── */

export function Sparkline({
  valores,
  colorLinea = CAT[0],
}: {
  valores: number[];
  colorLinea?: string;
}) {
  if (valores.length < 2) return null;
  const max = Math.max(...valores);
  const min = Math.min(...valores);
  const pts = valores
    .map(
      (v, i) =>
        `${(i / (valores.length - 1)) * 100},${100 - ((v - min) / (max - min || 1)) * 90 - 5}`,
    )
    .join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-8 w-full" aria-hidden>
      <polyline
        fill="none"
        stroke={colorLinea}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        points={pts}
      />
    </svg>
  );
}
