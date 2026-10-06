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
    <div className={cn("relative h-full w-full overflow-hidden bg-background", className)}>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        onCreated={() => requestAnimationFrame(() => setListo(true))}
        camera={{
          position: CAMERA_VIEWS.anterior.position,
          fov: 38,
        }}
        gl={{ antialias: true }}
        onPointerMissed={() => {
          setSelected(null);
          onSelectTooth?.(null);
        }}
      >
        <color attach="background" args={["#0f1720"]} />
        <fog attach="fog" args={["#0f1720", 22, 46]} />

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
        <div className="absolute inset-0 z-20 grid place-items-center bg-[#0f1720]">
          <div className="flex flex-col items-center gap-3 text-white/80">
            <span className="size-9 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
            <p className="text-sm font-medium">Cargando modelo 3D…</p>
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
          <div className="pointer-events-auto absolute left-2 right-2 top-2 z-20 flex flex-col gap-2 rounded-2xl border border-white/10 bg-[#171e2c]/85 p-2 shadow-xl shadow-black/30 backdrop-blur-md sm:right-auto sm:left-4 sm:top-4 sm:gap-2.5 sm:p-4">
            <span className="hidden text-[11px] font-bold uppercase tracking-wider text-white/50 sm:block">
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
                      "flex min-h-9 items-center justify-center gap-1.5 rounded-xl px-1.5 py-2 text-[11px] font-semibold transition-all duration-150 sm:px-3 sm:text-xs",
                      activo
                        ? "bg-primary text-primary-foreground shadow-[0_2px_8px_rgba(124,58,237,0.4)]"
                        : "bg-white/[0.06] text-white/70 hover:bg-white/[0.12] hover:text-white",
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

            <p className="text-[10.5px] leading-snug text-white/45 sm:max-w-[13rem]">
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
              "absolute right-2 top-[9.5rem] z-20 rounded-2xl border border-white/10 bg-[#171e2c]/90 p-3 shadow-xl shadow-black/30 backdrop-blur-md sm:right-4 sm:top-4 sm:block sm:p-4",
              leyenda ? "block" : "hidden",
            )}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">
              Estados
            </span>

            <ul className="mt-2.5 space-y-1.5">
              {TOOTH_STATES.map((s) => (
                <li key={s} className="flex items-center gap-2.5 text-xs font-medium text-white/85">
                  <span
                    className="size-3 shrink-0 rounded-full ring-2 ring-white/10"
                    style={{
                      backgroundColor: TOOTH_STATE_META[s].color,
                    }}
                  />

                  {TOOTH_STATE_META[s].label}
                </li>
              ))}
            </ul>
          </div>

          {/* Selection panel */}
          <div className="absolute bottom-2 left-1/2 z-20 w-[calc(100%-1rem)] -translate-x-1/2 rounded-2xl border border-border/60 bg-card/90 p-2.5 shadow-xl backdrop-blur-md sm:bottom-4 sm:w-[min(46rem,calc(100%-2rem))] sm:p-3.5">
            {def ? (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-xl bg-primary px-2.5 py-1.5 text-sm font-bold text-primary-foreground shadow-sm">
                    {def.fdi}
                  </span>

                  <div className="leading-tight">
                    <p className="text-sm font-semibold text-foreground">{def.name}</p>

                    <p className="text-xs text-muted-foreground">
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
                            "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all duration-150",
                            active
                              ? "border-primary bg-primary text-primary-foreground shadow-sm"
                              : "border-border bg-secondary text-secondary-foreground hover:bg-accent",
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
                  <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs font-semibold text-foreground">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: TOOTH_STATE_META[chart[def.fdi] ?? "sano"].color }}
                    />
                    {TOOTH_STATE_META[chart[def.fdi] ?? "sano"].label}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-center text-xs text-muted-foreground sm:text-sm">
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
              className="mt-2 flex w-full items-center justify-center gap-1 text-[11px] font-semibold text-primary sm:hidden"
            >
              {piezas ? "Ocultar piezas" : "Elegir por número de pieza"}
              <ChevronDown
                className={cn("size-3.5 transition-transform", piezas && "rotate-180")}
              />
            </button>

            <div
              className={cn(
                "mt-2 grid-cols-2 gap-x-3 gap-y-1 border-t border-border/60 pt-2 sm:mt-3 sm:grid sm:gap-x-4 sm:pt-3",
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
                        "flex h-7 min-w-0 flex-1 items-center justify-center rounded border text-[10px] font-semibold transition-colors sm:size-6 sm:flex-none",
                        selected === fdi
                          ? "border-primary text-primary"
                          : "border-border/70 text-muted-foreground hover:border-primary/60",
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
        "inline-flex min-h-8 min-w-8 items-center justify-center gap-1 rounded-xl px-1.5 text-xs font-semibold transition-colors sm:min-h-9 sm:min-w-9 sm:px-2",
        activo
          ? "bg-primary text-primary-foreground shadow-[0_2px_8px_rgba(124,58,237,0.4)]"
          : "bg-white/[0.06] text-white/75 hover:bg-white/[0.12] hover:text-white",
      )}
    >
      {children}
    </button>
  );
}
