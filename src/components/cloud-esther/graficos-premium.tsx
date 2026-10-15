import { useEffect, useId, useRef, useState } from "react";

/* Ubicación: src/components/cloud-esther/graficos-premium.tsx
   GRÁFICOS PREMIUM del Centro de operaciones (sin librerías):
   - GraficoEvolucion: área con línea fina, eje Y con valores, meses abajo, línea de meta,
     leyenda, último valor rotulado y, al pasar el mouse (o tocar), guía vertical + tarjeta.
   - GraficoBarras: barras finas con punta redondeada, valor arriba, eje con guías suaves
     y tarjeta al pasar el mouse.
   Los textos usan los colores de texto (no el color de la serie) y todo funciona en modo oscuro. */

function useAncho<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [ancho, setAncho] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => setAncho(el.clientWidth);
    medir();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, ancho] as const;
}

/** Escala "linda" para el eje: 4 marcas redondas que cubren min..max. */
function marcasEje(min: number, max: number, cantidad = 4) {
  const rango = Math.max(1e-9, max - min);
  const paso0 = rango / cantidad;
  const pot = Math.pow(10, Math.floor(Math.log10(paso0)));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * pot).find((p) => p >= paso0) ?? paso0;
  const desde = Math.floor(min / paso) * paso;
  const hasta = Math.ceil(max / paso) * paso;
  const marcas: number[] = [];
  for (let v = desde; v <= hasta + paso / 2; v += paso) marcas.push(Number(v.toFixed(6)));
  return { desde, hasta, marcas };
}

/* ───────────────────────── Evolución (área + meta) ───────────────────────── */

export function GraficoEvolucion({
  datos,
  meta,
  formato,
  nombreSerie = "Ingresos",
  nombreMeta = "Meta mensual",
}: {
  datos: { etiqueta: string; valor: number }[];
  meta?: number;
  formato: (v: number) => string;
  nombreSerie?: string;
  nombreMeta?: string;
}) {
  const [caja, ancho] = useAncho<HTMLDivElement>();
  const [activo, setActivo] = useState<number | null>(null);
  const idGrad = useId().replace(/:/g, "");
  const alto = 240;
  const margen = { izq: 52, der: 16, arr: 18, aba: 30 };
  const w = Math.max(0, ancho - margen.izq - margen.der);
  const h = alto - margen.arr - margen.aba;
  const valores = datos.map((d) => d.valor).concat(meta != null ? [meta] : []);
  const { desde, hasta, marcas } = marcasEje(Math.min(...valores) * 0.92, Math.max(...valores) * 1.04);
  const x = (i: number) => margen.izq + (datos.length <= 1 ? w / 2 : (i * w) / (datos.length - 1));
  const y = (v: number) => margen.arr + h - ((v - desde) / (hasta - desde)) * h;
  const linea = datos.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.valor).toFixed(1)}`).join(" ");
  const area = `${linea} L${x(datos.length - 1).toFixed(1)},${margen.arr + h} L${x(0).toFixed(1)},${margen.arr + h} Z`;
  const ultimo = datos.length - 1;
  const i = activo ?? null;
  const d = i != null ? datos[i] : null;
  const previo = i != null && i > 0 ? datos[i - 1] : null;
  const variacion = d && previo ? ((d.valor - previo.valor) / previo.valor) * 100 : null;

  const elegirPorX = (clientX: number) => {
    const r = caja.current?.getBoundingClientRect();
    if (!r || datos.length === 0) return;
    const px = clientX - r.left - margen.izq;
    const n = Math.round((px / Math.max(1, w)) * (datos.length - 1));
    setActivo(Math.min(datos.length - 1, Math.max(0, n)));
  };

  return (
    <div>
      {/* Leyenda (dos series: siempre presente) */}
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-[3px] w-4 rounded-full bg-primary" /> {nombreSerie}
        </span>
        {meta != null && (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 border-t-2 border-dashed border-muted-foreground/60" /> {nombreMeta}: {formato(meta)}
          </span>
        )}
      </div>
      <div
        ref={caja}
        className="relative w-full touch-pan-y select-none"
        style={{ height: alto }}
        onMouseMove={(e) => elegirPorX(e.clientX)}
        onMouseLeave={() => setActivo(null)}
        onTouchStart={(e) => e.touches[0] && elegirPorX(e.touches[0].clientX)}
        onTouchMove={(e) => e.touches[0] && elegirPorX(e.touches[0].clientX)}
        role="img"
        aria-label={`${nombreSerie}: ${datos.map((p) => `${p.etiqueta} ${formato(p.valor)}`).join(", ")}`}
      >
        {ancho > 0 && (
          <svg width={ancho} height={alto} className="absolute inset-0 overflow-visible">
            <defs>
              <linearGradient id={`area-${idGrad}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.28" />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
              </linearGradient>
              <linearGradient id={`linea-${idGrad}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--color-primary)" />
                <stop offset="100%" stopColor="#d946ef" />
              </linearGradient>
            </defs>
            {/* Guías horizontales y valores del eje (recesivos) */}
            {marcas.map((m) => (
              <g key={m}>
                <line
                  x1={margen.izq}
                  x2={margen.izq + w}
                  y1={y(m)}
                  y2={y(m)}
                  stroke="currentColor"
                  className="text-border"
                  strokeDasharray={m === desde ? undefined : "2 4"}
                />
                <text x={margen.izq - 10} y={y(m)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[10.5px] tabular-nums">
                  {formato(m)}
                </text>
              </g>
            ))}
            {/* Meses */}
            {datos.map((p, n) => (
              <text
                key={p.etiqueta}
                x={x(n)}
                y={alto - 8}
                textAnchor={n === 0 ? "start" : n === ultimo ? "end" : "middle"}
                className={`text-[10.5px] ${activo === n ? "fill-foreground font-medium" : "fill-muted-foreground"}`}
              >
                {ancho < 420 ? p.etiqueta.slice(0, 3) : p.etiqueta}
              </text>
            ))}
            {/* Meta */}
            {meta != null && (
              <line
                x1={margen.izq}
                x2={margen.izq + w}
                y1={y(meta)}
                y2={y(meta)}
                stroke="currentColor"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                className="text-muted-foreground/60"
              />
            )}
            {/* Área + línea */}
            <path d={area} fill={`url(#area-${idGrad})`} className="ce-grafico-area" />
            <path
              d={linea}
              fill="none"
              stroke={`url(#linea-${idGrad})`}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              className="ce-grafico-trazo"
            />
            {/* Último valor rotulado */}
            {activo == null && datos[ultimo] && (
              <g>
                <circle cx={x(ultimo)} cy={y(datos[ultimo].valor)} r={9} fill="var(--color-primary)" opacity={0.15} className="ce-grafico-pulso" />
                <circle cx={x(ultimo)} cy={y(datos[ultimo].valor)} r={4.5} fill="#d946ef" stroke="var(--color-card)" strokeWidth={2} />
                <text x={x(ultimo) - 10} y={y(datos[ultimo].valor) - 12} textAnchor="end" className="fill-foreground text-[11.5px] font-semibold tabular-nums">
                  {formato(datos[ultimo].valor)}
                </text>
              </g>
            )}
            {/* Guía + punto al pasar el mouse */}
            {d && i != null && (
              <g>
                <line x1={x(i)} x2={x(i)} y1={margen.arr} y2={margen.arr + h} stroke="currentColor" className="text-primary/35" />
                <circle cx={x(i)} cy={y(d.valor)} r={5} fill="var(--color-primary)" stroke="var(--color-card)" strokeWidth={2} />
              </g>
            )}
          </svg>
        )}
        {/* Tarjeta del punto */}
        {d && i != null && ancho > 0 && (
          <div
            className="pointer-events-none absolute z-10 min-w-[150px] rounded-xl border border-border/80 bg-card/95 px-3 py-2 text-xs shadow-[0_14px_30px_-16px_rgba(46,16,101,0.45)] backdrop-blur"
            style={{
              left: Math.min(Math.max(x(i) - 75, 0), ancho - 160),
              top: Math.max(0, y(d.valor) - 78),
            }}
          >
            <p className="font-medium text-muted-foreground">{d.etiqueta}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[13px] font-semibold tabular-nums text-foreground">
              <span className="size-2 rounded-full bg-primary" /> {formato(d.valor)}
            </p>
            {variacion != null && (
              <p className="mt-0.5 tabular-nums text-muted-foreground">
                {variacion >= 0 ? "▲" : "▼"} {Math.abs(variacion).toFixed(1).replace(".", ",")}% vs. mes anterior
              </p>
            )}
            {meta != null && (
              <p className="tabular-nums text-muted-foreground">
                {d.valor >= meta ? "Sobre la meta" : `Faltan ${formato(meta - d.valor)}`}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Barras (por persona) ───────────────────────── */

export function GraficoBarras({
  datos,
  formato,
  detalle,
}: {
  datos: { nombre: string; valor: number }[];
  formato: (v: number) => string;
  /** Texto corto en la tarjeta (ej.: "producción del mes") */
  detalle?: string;
}) {
  const [activo, setActivo] = useState<number | null>(null);
  const max = Math.max(1e-9, ...datos.map((d) => d.valor));
  const { hasta, marcas } = marcasEje(0, max * 1.05, 4);
  const total = datos.reduce((s, d) => s + d.valor, 0);
  const lider = datos.reduce((m, d, n) => (d.valor > (datos[m]?.valor ?? -1) ? n : m), 0);
  return (
    <div className="relative h-60 w-full pl-10" role="img" aria-label={datos.map((d) => `${d.nombre} ${formato(d.valor)}`).join(", ")}>
      {/* Guías y valores del eje */}
      <div className="pointer-events-none absolute inset-x-0 top-0 bottom-7">
        {marcas.map((m) => (
          <div key={m} className="absolute inset-x-0 flex translate-y-1/2 items-center" style={{ bottom: `${(m / hasta) * 100}%` }}>
            <span className="w-9 shrink-0 pr-2 text-right text-[10px] tabular-nums text-muted-foreground">{formato(m)}</span>
            <span className={`h-px flex-1 ${m === 0 ? "bg-border" : "border-t border-dashed border-border/70"}`} />
          </div>
        ))}
      </div>
      <div className="relative flex h-full items-stretch gap-2 pb-7 sm:gap-3">
        {datos.map((d, n) => {
          const on = activo === n;
          const pct = (d.valor / hasta) * 100;
          return (
            <div
              key={d.nombre}
              className="group relative flex min-w-0 flex-1 cursor-default flex-col items-center justify-end"
              onMouseEnter={() => setActivo(n)}
              onMouseLeave={() => setActivo(null)}
              onTouchStart={() => setActivo(n)}
            >
              <span
                className={`mb-1 text-[11px] font-medium tabular-nums transition-colors ${on || n === lider ? "text-foreground" : "text-muted-foreground"}`}
              >
                {formato(d.valor)}
              </span>
              <div
                className={`ce-grafico-barra w-full max-w-11 rounded-t-[6px] bg-gradient-to-t from-primary to-[color-mix(in_oklab,var(--color-primary)_55%,#d946ef)] transition-all duration-300 ${
                  activo != null && !on ? "opacity-45" : "opacity-100"
                } ${on ? "shadow-[0_12px_26px_-12px_rgba(124,58,237,0.95)]" : "shadow-[0_8px_18px_-14px_rgba(124,58,237,0.8)]"}`}
                style={{ height: `${pct}%`, animationDelay: `${n * 70}ms` }}
              />
              <span className={`absolute -bottom-6 w-full truncate text-center text-[11px] ${on ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                {d.nombre}
              </span>
              {on && (
                <div
                  style={{ bottom: `calc(${pct * 0.45}% + 8px)` }}
                  className="pointer-events-none absolute left-1/2 z-10 min-w-[140px] -translate-x-1/2 rounded-xl border border-border/80 bg-card/95 px-3 py-2 text-xs shadow-[0_14px_30px_-16px_rgba(46,16,101,0.45)] backdrop-blur">
                  <p className="font-medium text-foreground">{d.nombre}</p>
                  <p className="mt-0.5 font-semibold tabular-nums text-foreground">{formato(d.valor)}</p>
                  <p className="tabular-nums text-muted-foreground">
                    {total > 0 ? `${Math.round((d.valor / total) * 100)}% del total` : ""}
                    {detalle ? ` · ${detalle}` : ""}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
