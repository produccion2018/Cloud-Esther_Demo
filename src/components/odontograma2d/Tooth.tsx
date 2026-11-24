import { GEOMETRY } from "@/lib/odontograma2d/anatomy";
import type { ToothDef } from "@/lib/odontograma2d/teeth";
import {
  AZUL_EXISTENTE,
  FINDING_COLOR_VAR,
  FINDING_LABELS,
  ROJO_A_REALIZAR,
  SURFACE_LABELS,
  esARealizar,
  type Surface,
  type SurfaceFinding,
  type ToothState,
  type WholeFinding,
} from "@/lib/odontograma2d/types";

const EMPTY: ToothState = { surfaces: {}, whole: [] };

interface ToothProps {
  tooth: ToothDef;
  state?: ToothState;
  onSurface: (fdi: string, surface: Surface) => void;
  onWhole: (fdi: string) => void;
  /** Convención rojo (a realizar) / azul (existente) en lugar de un color por hallazgo. */
  convencion?: boolean;
}

/** reparte las 5 superficies dentro de la caja de la corona */
function surfaceShapes(box: [number, number, number, number]) {
  const [x, y, w, h] = box;
  const x1 = x + w * 0.28;
  const x2 = x + w * 0.72;
  const y1 = y + h * 0.3;
  const y2 = y + h * 0.7;
  const x3 = x + w;
  const y3 = y + h;
  return {
    top: `${x},${y} ${x3},${y} ${x2},${y1} ${x1},${y1}`,
    bottom: `${x1},${y2} ${x2},${y2} ${x3},${y3} ${x},${y3}`,
    left: `${x},${y} ${x1},${y1} ${x1},${y2} ${x},${y3}`,
    right: `${x3},${y} ${x3},${y3} ${x2},${y2} ${x2},${y1}`,
    center: { x: x1, y: y1, w: x2 - x1, h: y2 - y1 },
  };
}

export function Tooth({ tooth, state = EMPTY, onSurface, onWhole, convencion = false }: ToothProps) {
  const geo = GEOMETRY[tooth.type];
  const shapes = surfaceShapes(geo.crownBox);
  const clipId = `crown-${tooth.fdi}`;
  const flip = tooth.arch === "lower";
  const mesialSide = tooth.midlineSide;

  const isAbsent = state.whole.includes("ausente");
  const hasCrown = state.whole.includes("corona");
  const hasImplant = state.whole.includes("implante");
  const hasEndo = state.whole.includes("endodoncia");
  const extraction = state.whole.includes("extraccion");
  const hasPerno = state.whole.includes("perno");
  const hasCarilla = state.whole.includes("carilla");
  const isResto = state.whole.includes("resto");
  const retenido = state.whole.includes("retenido");

  // Color de un hallazgo: el suyo propio, o rojo/azul con la convención (a realizar / existente)
  const colorW = (w: WholeFinding) =>
    !convencion || w === "ausente" ? FINDING_COLOR_VAR[w] : esARealizar(state, "w", w, w) ? ROJO_A_REALIZAR : AZUL_EXISTENTE;
  const colorS = (s: Surface, f: SurfaceFinding) =>
    !convencion ? FINDING_COLOR_VAR[f] : esARealizar(state, "s", s, f) ? ROJO_A_REALIZAR : AZUL_EXISTENTE;

  const fill = (s: Surface) => {
    const f = state.surfaces[s];
    return f ? colorS(s, f) : "transparent";
  };

  const surfaceProps = (s: Surface) => ({
    fill: fill(s),
    fillOpacity: state.surfaces[s] ? 0.85 : 0,
    stroke: "var(--tooth-line)",
    strokeOpacity: 0.18,
    strokeWidth: 0.8,
    className:
      "cursor-pointer transition-[fill-opacity,stroke-opacity] hover:fill-primary hover:[fill-opacity:0.35]",
    role: "button" as const,
    tabIndex: 0,
    "aria-label": `Pieza ${tooth.fdi} · ${SURFACE_LABELS[s]}${
      state.surfaces[s] ? ` · ${FINDING_LABELS[state.surfaces[s]!]}` : ""
    }`,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      onSurface(tooth.fdi, s);
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSurface(tooth.fdi, s);
      }
    },
  });

  const left: Surface = mesialSide === "left" ? "M" : "D";
  const right: Surface = mesialSide === "left" ? "D" : "M";

  return (
    <svg
      viewBox="0 0 100 190"
      className="h-full w-full overflow-visible"
      aria-label={`Pieza ${tooth.fdi}`}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={geo.crown} />
        </clipPath>
        <linearGradient id={`enamel-${tooth.fdi}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--tooth)" />
          <stop offset="70%" stopColor="var(--tooth)" />
          <stop offset="100%" stopColor="var(--tooth-shade)" />
        </linearGradient>
      </defs>

      <g transform={flip ? "translate(0,190) scale(1,-1)" : undefined}>
        <g transform="translate(-7,-14) scale(1.14)">
          {/* raíces */}
          {!isAbsent &&
            !hasImplant &&
            geo.roots.map((d, i) => (
              <path
                key={i}
                d={d}
                fill="var(--tooth-shade)"
                stroke="var(--tooth-line)"
                strokeWidth={1.4}
                strokeLinejoin="round"
                opacity={0.95}
              />
            ))}

          {/* implante: tornillo en lugar de raíz */}
          {hasImplant && !isAbsent && (
            <g stroke={colorW("implante")} strokeWidth={3} fill="none">
              <path d="M50 96 L50 18" />
              {[28, 40, 52, 64, 76, 88].map((y) => (
                <path key={y} d={`M38 ${y} L62 ${y - 5}`} strokeWidth={2.4} />
              ))}
            </g>
          )}

          {/* endodoncia: conducto marcado */}
          {hasEndo && !isAbsent && (
            <g stroke={colorW("endodoncia")} strokeWidth={3.2} fill="none">
              {geo.roots.map((_, i) => (
                <path
                  key={i}
                  d={
                    geo.roots.length > 1
                      ? i === 0
                        ? "M50 110 L30 26"
                        : "M50 110 L70 26"
                      : "M50 120 L50 16"
                  }
                />
              ))}
            </g>
          )}

          {/* perno-muñón: poste grueso dentro de la raíz */}
          {hasPerno && !isAbsent && (
            <path d="M50 112 L50 46" stroke={colorW("perno")} strokeWidth={7} strokeLinecap="round" />
          )}

          {/* corona (en resto radicular la corona no está: se ve el borde roto) */}
          <path
            d={geo.crown}
            fill={
              isAbsent || isResto ? "transparent" : hasCrown ? colorW("corona") : `url(#enamel-${tooth.fdi})`
            }
            fillOpacity={hasCrown ? 0.75 : 1}
            stroke={isAbsent ? "var(--ausente)" : isResto ? colorW("resto") : "var(--tooth-line)"}
            strokeWidth={isResto ? 2.2 : 1.6}
            strokeDasharray={isAbsent ? "5 4" : isResto ? "3 3" : undefined}
            strokeLinejoin="round"
          />

          {!isAbsent && (
            <g clipPath={`url(#${clipId})`}>
              {/* detalles anatómicos */}
              <g
                fill="none"
                stroke="var(--tooth-line)"
                strokeOpacity={0.55}
                strokeWidth={1.1}
                strokeLinecap="round"
              >
                {geo.details.map((d, i) => (
                  <path key={i} d={d} />
                ))}
              </g>

              {/* superficies clickeables */}
              {/* carilla: cubre la cara vestibular */}
              {hasCarilla && (
                <polygon points={shapes.top} fill={colorW("carilla")} fillOpacity={0.7} pointerEvents="none" />
              )}
              <polygon points={shapes.top} {...surfaceProps("V")} />
              <polygon points={shapes.bottom} {...surfaceProps("L")} />
              <polygon points={shapes.left} {...surfaceProps(left)} />
              <polygon points={shapes.right} {...surfaceProps(right)} />
              <rect
                x={shapes.center.x}
                y={shapes.center.y}
                width={shapes.center.w}
                height={shapes.center.h}
                rx={3}
                {...surfaceProps("O")}
              />
            </g>
          )}
        </g>
        {/* zona de pieza completa (contorno) */}
        <path
          d={geo.crown}
          fill="none"
          stroke="transparent"
          strokeWidth={6}
          transform="translate(-7,-14) scale(1.14)"
          className="cursor-pointer"
          onClick={() => onWhole(tooth.fdi)}
        />
      </g>

      {/* puente: la barra la dibuja la arcada (Odontogram) para que quede alineada en todas las piezas */}
      {/* no erupcionado / retenido: círculo alrededor de la pieza */}
      {retenido && (
        <ellipse cx={50} cy={95} rx={47} ry={90} fill="none" stroke={colorW("retenido")} strokeWidth={3.5} />
      )}

      {/* resto radicular: marca RR */}
      {isResto && (
        <text
          x={50}
          y={flip ? 40 : 158}
          textAnchor="middle"
          fontSize={26}
          fontWeight={800}
          fill={colorW("resto")}
        >
          RR
        </text>
      )}

      {extraction && (
        <g stroke={colorW("extraccion")} strokeWidth={5} strokeLinecap="round">
          <path d="M16 30 L84 160" />
          <path d="M84 30 L16 160" />
        </g>
      )}
    </svg>
  );
}
