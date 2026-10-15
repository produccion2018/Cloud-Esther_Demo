import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as PE,
  type ReactNode,
} from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import {
  Eye,
  ArrowUp,
  ArrowRight,
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  Hand,
  Smile,
  Palette,
  Grid3x3,
  ChevronDown,
} from "lucide-react";

import {
  FDI_ROWS,
  TEETH_BY_FDI,
  TOOTH_STATES,
  TOOTH_STATE_META,
  defaultChart,
  type ToothState,
} from "@/lib/odontogram/fdi";
import { cn } from "@/lib/utils";
import { CAMERA_VIEWS, CameraRig, type CameraView, type ZoomPedido } from "./CameraRig";
import { MouthScene } from "./MouthScene";

export interface Odontogram3DProps {
  value?: Record<number, ToothState>;
  defaultValue?: Record<number, ToothState>;
  onChange?: (fdi: number, state: ToothState, chart: Record<number, ToothState>) => void;
  onSelectTooth?: (fdi: number | null) => void;
  className?: string;
  showUI?: boolean;
  /** Pieza seleccionada desde afuera (ficha clínica, accesos rápidos). */
  selectedFdi?: number | null;
  /** false: el panel inferior no muestra los botones de estado (los tiene la ficha de la pieza). */
  estadosEnPanel?: boolean;
}

/** Paneles de vidrio oscuro con degradé violeta (premium) sobre el modelo 3D */
const VIDRIO =
  "rounded-2xl border border-white/10 bg-gradient-to-br from-[#22124a]/85 via-[#170c35]/85 to-[#0f0824]/90 shadow-[0_24px_50px_-24px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl";

const VIEW_ICONS: Record<CameraView, typeof Eye> = {
  anterior: Eye,
  oclusal: ArrowUp,
  derecha: ArrowRight,
  izquierda: ArrowLeft,
};

export function Odontogram3D({
  value,
  defaultValue,
  onChange,
  onSelectTooth,
  className,
  showUI = true,
  selectedFdi,
  estadosEnPanel = true,
}: Odontogram3DProps) {
  const [internal, setInternal] = useState<Record<number, ToothState>>(
    () => defaultValue ?? defaultChart(),
  );

  const chart = value ?? internal;

  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    if (selectedFdi !== undefined) setSelected(selectedFdi);
  }, [selectedFdi]);
  const [view, setView] = useState<CameraView>("anterior");
  const [nonce, setNonce] = useState(0);
  // El modelo tarda un momento en crearse (WebGL + geometría): se muestra un cargador hasta el primer cuadro.
  const [listo, setListo] = useState(false);
  const [zoom, setZoom] = useState<ZoomPedido | undefined>(undefined);
  const pedirZoom = (factor: number) => setZoom((z) => ({ factor, id: (z?.id ?? 0) + 1 }));
  // «Mover»: los dedos rotan, hacen zoom y desplazan. «Boca»: los dedos abren y cierran la boca.
  const [modo, setModo] = useState<"mover" | "boca">("mover");
  const apertura = useRef(1);
  const [aperturaUI, setAperturaUI] = useState(1);
  const fijarApertura = (v: number) => {
    const a = Math.min(1.45, Math.max(0.4, v));
    apertura.current = a;
    setAperturaUI(a);
  };
  // En el celular la leyenda y la grilla de piezas se abren a demanda (no tapan el modelo).
  const [leyenda, setLeyenda] = useState(false);
  const [piezas, setPiezas] = useState(false);

  // Gestos del modo «Boca»: separar dos dedos abre, juntarlos cierra; con un dedo,
  // arrastrar hacia arriba abre y hacia abajo cierra.
  const dedos = useRef(new Map<number, { x: number; y: number }>());
  const inicioGesto = useRef<{ dist: number; y: number; apertura: number } | null>(null);
  const distanciaDedos = () => {
    const [a, b] = [...dedos.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };
  const reiniciarGesto = () => {
    const primero = [...dedos.current.values()][0];
    inicioGesto.current = primero
      ? { dist: distanciaDedos(), y: primero.y, apertura: apertura.current }
      : null;
  };
  const onDedoAbajo = (e: PE<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dedos.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    reiniciarGesto();
  };
  const onDedoMueve = (e: PE<HTMLDivElement>) => {
    if (!dedos.current.has(e.pointerId) || !inicioGesto.current) return;
    dedos.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const ini = inicioGesto.current;
    if (dedos.current.size >= 2 && ini.dist > 0) {
      fijarApertura(ini.apertura * (distanciaDedos() / ini.dist));
    } else {
      const y = [...dedos.current.values()][0]?.y ?? ini.y;
      fijarApertura(ini.apertura + (ini.y - y) / 160);
    }
  };
  const onDedoArriba = (e: PE<HTMLDivElement>) => {
    dedos.current.delete(e.pointerId);
    reiniciarGesto();
  };

  const handleSelect = useCallback(
    (fdi: number) => {
      setSelected(fdi);
      onSelectTooth?.(fdi);
    },
    [onSelectTooth],
  );

  const setState = (fdi: number, state: ToothState) => {
    const next = { ...chart, [fdi]: state };

    if (value === undefined) {
      setInternal(next);
    }

    onChange?.(fdi, state, next);
  };

  const def = selected ? TEETH_BY_FDI[selected] : null;

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden bg-[radial-gradient(120%_90%_at_50%_0%,#2a1460_0%,#160b33_45%,#0b0618_100%)]",
        className,
      )}
    >
      {/* Fondo premium: halos de color detrás del modelo (el lienzo 3D es transparente) */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="ce-odo-halo absolute left-1/2 top-[38%] size-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(167,139,250,0.28),transparent_62%)]" />
        <div className="absolute -left-24 bottom-[-6rem] size-[26rem] rounded-full bg-[radial-gradient(circle,rgba(217,70,239,0.22),transparent_65%)]" />
        <div className="absolute -right-24 top-[-5rem] size-[24rem] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.18),transparent_65%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(70%_60%_at_50%_45%,black,transparent)]" />
      </div>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        onCreated={() => requestAnimationFrame(() => setListo(true))}
        camera={{
          position: CAMERA_VIEWS.anterior.position,
          fov: 38,
        }}
        gl={{ antialias: true, alpha: true }}
        onPointerMissed={() => {
          setSelected(null);
          onSelectTooth?.(null);
        }}
      >
        <fog attach="fog" args={["#160b33", 24, 48]} />

        <ambientLight intensity={0.55} />

        <hemisphereLight args={["#eaf3ff", "#3a2026", 0.7]} />

        <directionalLight
          position={[4, 9, 8]}
          intensity={2.1}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-left={-8}
          shadow-camera-right={8}
          shadow-camera-top={8}
          shadow-camera-bottom={-8}
        />

        <spotLight
          position={[0, 2.5, 14]}
          angle={0.6}
          penumbra={0.8}
          intensity={90}
          distance={30}
          color="#ffffff"
        />

        <pointLight position={[-6, -3, 6]} intensity={22} color="#9fd4ff" />

        <Environment resolution={128}>
          <Lightformer intensity={2.4} position={[0, 6, 4]} scale={[10, 6, 1]} />

          <Lightformer
            intensity={1.2}
            color="#cfe6ff"
            position={[-6, 1, 2]}
            rotation-y={Math.PI / 2}
            scale={[14, 4, 1]}
          />

          <Lightformer
            intensity={1.2}
            color="#ffd9d2"
            position={[6, 1, 2]}
            rotation-y={-Math.PI / 2}
            scale={[14, 4, 1]}
          />
        </Environment>

        <Suspense fallback={null}>
          <MouthScene
            chart={chart}
            selected={selected}
            hovered={hovered}
            onSelect={handleSelect}
            onHover={setHovered}
            apertura={apertura}
          />
        </Suspense>

        <CameraRig view={view} nonce={nonce} zoom={zoom} enabled={modo === "mover"} />
      </Canvas>

      {!listo && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-[radial-gradient(120%_90%_at_50%_0%,#2a1460_0%,#160b33_45%,#0b0618_100%)]">
          <div className="flex flex-col items-center gap-3 text-white/85">
            <span className="relative grid size-12 place-items-center">
              <span className="absolute inset-0 animate-spin rounded-full bg-[conic-gradient(from_0deg,transparent,#a78bfa,#e879f9,transparent)] [mask:radial-gradient(farthest-side,transparent_calc(100%-3px),black_calc(100%-2px))]" />
              <span className="size-2 rounded-full bg-fuchsia-300 shadow-[0_0_12px_4px_rgba(232,121,249,0.6)]" />
            </span>
            <p className="bg-gradient-to-r from-white to-violet-200 bg-clip-text text-sm font-medium text-transparent">Preparando el modelo 3D…</p>
          </div>
        </div>
      )}

      {/* Modo «Boca»: una capa toma los dedos para abrir o cerrar la boca. */}
      {modo === "boca" && (
        <div
          className="absolute inset-0 z-10 touch-none select-none"
          aria-label="Separá dos dedos para abrir la boca y juntalos para cerrarla"
          onPointerDown={onDedoAbajo}
          onPointerMove={onDedoMueve}
          onPointerUp={onDedoArriba}
          onPointerCancel={onDedoArriba}
          onWheel={(e) => fijarApertura(apertura.current - e.deltaY / 800)}
        />
      )}

      {showUI && (
        <>
          {/* Camera controls */}
          <div className={`pointer-events-auto absolute left-2 right-2 top-2 z-20 flex flex-col gap-2 p-2 sm:right-auto sm:left-4 sm:top-4 sm:gap-2.5 sm:p-4 ${VIDRIO}`}>
            <span className="hidden items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/55 sm:flex">
              <span className="h-1 w-3 rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400" />
              Vistas
            </span>

            <div className="grid grid-cols-4 gap-1 sm:grid-cols-2 sm:gap-1.5">
              {(Object.keys(CAMERA_VIEWS) as CameraView[]).map((v) => {
                const Icon = VIEW_ICONS[v];
                const activo = view === v;

                return (
                  <button
                    key={v}
                    onClick={() => {
                      setView(v);
                      setNonce((n) => n + 1);
                    }}
                    aria-label={`Vista ${CAMERA_VIEWS[v].label}`}
                    aria-pressed={activo}
                    className={cn(
                      "flex min-h-9 items-center justify-center gap-1.5 rounded-xl px-1.5 py-2 text-[11px] font-medium transition-all duration-200 sm:px-3 sm:text-xs",
                      activo
                        ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-[0_6px_18px_-6px_rgba(217,70,239,0.75),inset_0_1px_0_rgba(255,255,255,0.25)]"
                        : "bg-white/[0.06] text-white/70 ring-1 ring-inset ring-white/[0.06] hover:bg-white/[0.12] hover:text-white",
                    )}
                  >
                    <Icon className="size-3.5 shrink-0" />
                    <span className="truncate">{CAMERA_VIEWS[v].label}</span>
                  </button>
                );
              })}
            </div>

            {/* Zoom, modo de los dedos y paneles */}
            <div className="flex flex-wrap items-center gap-1">
              <BotonHerramienta etiqueta="Acercar" onClick={() => pedirZoom(0.75)}>
                <ZoomIn className="size-4" />
              </BotonHerramienta>
              <BotonHerramienta etiqueta="Alejar" onClick={() => pedirZoom(1.33)}>
                <ZoomOut className="size-4" />
              </BotonHerramienta>
              <span className="mx-0.5 hidden h-6 w-px bg-white/10 min-[400px]:block" />
              <BotonHerramienta
                etiqueta="Mover: los dedos rotan y hacen zoom"
                activo={modo === "mover"}
                onClick={() => setModo("mover")}
              >
                <Hand className="size-4" />
                <span className="text-[11px]">Mover</span>
              </BotonHerramienta>
              <BotonHerramienta
                etiqueta="Boca: los dedos abren y cierran la boca"
                activo={modo === "boca"}
                onClick={() => setModo((m) => (m === "boca" ? "mover" : "boca"))}
              >
                <Smile className="size-4" />
                <span className="text-[11px]">Boca</span>
              </BotonHerramienta>
              <span className="ml-auto flex gap-1 sm:hidden">
                <BotonHerramienta
                  etiqueta="Estados"
                  activo={leyenda}
                  onClick={() => setLeyenda((v) => !v)}
                >
                  <Palette className="size-4" />
                </BotonHerramienta>
                <BotonHerramienta
                  etiqueta="Piezas"
                  activo={piezas}
                  onClick={() => setPiezas((v) => !v)}
                >
                  <Grid3x3 className="size-4" />
                </BotonHerramienta>
              </span>
            </div>

            {modo === "boca" ? (
              <label className="flex items-center gap-2 text-[10.5px] font-semibold text-white/70">
                Cerrada
                <input
                  type="range"
                  min={0.4}
                  max={1.45}
                  step={0.01}
                  value={aperturaUI}
                  onChange={(e) => fijarApertura(Number(e.target.value))}
                  aria-label="Apertura de la boca"
                  className="h-1.5 min-w-0 flex-1 accent-[#a78bfa]"
                />
                Abierta
              </label>
            ) : null}

            <p className="text-[10.5px] leading-snug text-white/50 sm:max-w-[13rem]">
              {modo === "boca" ? (
                "Separá dos dedos para abrir la boca y juntalos para cerrarla (o arrastrá hacia arriba / abajo)."
              ) : (
                <>
                  <span className="sm:hidden">
                    1 dedo: rotar · 2 dedos: pellizcar para zoom y arrastrar para mover · tocá un
                    diente para elegirlo
                  </span>
                  <span className="hidden sm:inline">
                    Arrastrá para rotar · rueda o pellizco para zoom · click derecho o dos dedos
                    para desplazar
                  </span>
                </>
              )}
            </p>
          </div>

          {/* Legend */}
          <div
            className={cn(
              `absolute right-2 top-[9.5rem] z-20 p-3 sm:right-4 sm:top-4 sm:block sm:p-4 ${VIDRIO}`,
              leyenda ? "block" : "hidden",
            )}
          >
            <span className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/55">
              <span className="h-1 w-3 rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400" />
              Estados
            </span>

            <ul className="mt-2.5 space-y-1.5">
              {TOOTH_STATES.map((s) => (
                <li key={s} className="flex items-center gap-2.5 text-xs font-medium text-white/85">
                  <span
                    className="size-3 shrink-0 rounded-full ring-2 ring-white/15"
                    style={{
                      backgroundColor: TOOTH_STATE_META[s].color,
                      boxShadow: `0 0 10px 1px ${TOOTH_STATE_META[s].color}66`,
                    }}
                  />

                  {TOOTH_STATE_META[s].label}
                </li>
              ))}
            </ul>
          </div>

          {/* Selection panel */}
          <div className={`absolute bottom-2 left-1/2 z-20 w-[calc(100%-1rem)] -translate-x-1/2 p-2.5 sm:bottom-4 sm:w-[min(46rem,calc(100%-2rem))] sm:p-3.5 ${VIDRIO}`}>
            {def ? (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 px-2.5 py-1.5 text-sm font-semibold tabular-nums text-white shadow-[0_6px_16px_-6px_rgba(217,70,239,0.8)]">
                    {def.fdi}
                  </span>

                  <div className="leading-tight">
                    <p className="text-sm font-semibold text-white">{def.name}</p>

                    <p className="text-xs text-white/55">
                      {def.arch === "upper" ? "Arcada superior" : "Arcada inferior"} ·{" "}
                      {def.side === "right" ? "derecha" : "izquierda"}
                    </p>
                  </div>
                </div>

                {estadosEnPanel ? (
                  <div className="flex flex-1 flex-wrap justify-end gap-1.5">
                    {TOOTH_STATES.map((s) => {
                      const active = (chart[def.fdi] ?? "sano") === s;

                      return (
                        <button
                          key={s}
                          onClick={() => setState(def.fdi, s)}
                          className={cn(
                            "flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition-all duration-200",
                            active
                              ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-[0_6px_16px_-6px_rgba(217,70,239,0.8)]"
                              : "bg-white/[0.07] text-white/80 ring-1 ring-inset ring-white/10 hover:bg-white/[0.14] hover:text-white",
                          )}
                        >
                          <span
                            className="size-2.5 rounded-full"
                            style={{
                              backgroundColor: TOOTH_STATE_META[s].color,
                            }}
                          />

                          {TOOTH_STATE_META[s].label}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-2.5 py-1 text-xs font-medium text-white ring-1 ring-inset ring-white/10">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: TOOTH_STATE_META[chart[def.fdi] ?? "sano"].color }}
                    />
                    {TOOTH_STATE_META[chart[def.fdi] ?? "sano"].label}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-center text-xs text-white/60 sm:text-sm">
                <span className="sm:hidden">Tocá un diente para seleccionarlo.</span>
                <span className="hidden sm:inline">
                  Hacé click en cualquier diente para seleccionarlo y cambiar su estado.
                </span>
              </p>
            )}

            <button
              type="button"
              onClick={() => setPiezas((v) => !v)}
              aria-expanded={piezas}
              className="mt-2 flex w-full items-center justify-center gap-1 text-[11px] font-semibold text-violet-200 sm:hidden"
            >
              {piezas ? "Ocultar piezas" : "Elegir por número de pieza"}
              <ChevronDown
                className={cn("size-3.5 transition-transform", piezas && "rotate-180")}
              />
            </button>

            <div
              className={cn(
                "mt-2 grid-cols-2 gap-x-3 gap-y-1 border-t border-white/10 pt-2 sm:mt-3 sm:grid sm:gap-x-4 sm:pt-3",
                piezas ? "grid" : "hidden",
              )}
            >
              {(
                [
                  ["upperRight", FDI_ROWS.upperRight],
                  ["upperLeft", FDI_ROWS.upperLeft],
                  ["lowerRight", FDI_ROWS.lowerRight],
                  ["lowerLeft", FDI_ROWS.lowerLeft],
                ] as const
              ).map(([key, row]) => (
                <div key={key} className="flex justify-center gap-0.5">
                  {row.map((fdi) => (
                    <button
                      key={fdi}
                      onClick={() => handleSelect(fdi)}
                      onMouseEnter={() => setHovered(fdi)}
                      onMouseLeave={() => setHovered(null)}
                      title={`${fdi} · ${TOOTH_STATE_META[chart[fdi] ?? "sano"].label}`}
                      className={cn(
                        "flex h-7 min-w-0 flex-1 items-center justify-center rounded-md border text-[10px] font-semibold tabular-nums transition-all duration-150 sm:size-6 sm:flex-none",
                        selected === fdi
                          ? "border-fuchsia-300 text-white shadow-[0_0_10px_rgba(232,121,249,0.6)]"
                          : "border-white/10 text-white/70 hover:-translate-y-px hover:border-violet-300/60 hover:text-white",
                      )}
                      style={{
                        backgroundColor: `${TOOTH_STATE_META[chart[fdi] ?? "sano"].color}33`,
                      }}
                    >
                      {fdi}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function BotonHerramienta({
  etiqueta,
  activo = false,
  onClick,
  children,
}: {
  etiqueta: string;
  activo?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etiqueta}
      aria-pressed={activo}
      title={etiqueta}
      className={cn(
        "inline-flex min-h-8 min-w-8 items-center justify-center gap-1 rounded-xl px-1.5 text-xs font-medium transition-all duration-200 sm:min-h-9 sm:min-w-9 sm:px-2",
        activo
          ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-[0_6px_18px_-6px_rgba(217,70,239,0.75),inset_0_1px_0_rgba(255,255,255,0.25)]"
          : "bg-white/[0.06] text-white/75 ring-1 ring-inset ring-white/[0.06] hover:bg-white/[0.12] hover:text-white",
      )}
    >
      {children}
    </button>
  );
}
