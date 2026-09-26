import { Suspense, useCallback, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { Eye, ArrowUp, ArrowRight, ArrowLeft } from "lucide-react";

import {
  FDI_ROWS,
  TEETH_BY_FDI,
  TOOTH_STATES,
  TOOTH_STATE_META,
  defaultChart,
  type ToothState,
} from "@/lib/odontogram/fdi";
import { cn } from "@/lib/utils";
import { CAMERA_VIEWS, CameraRig, type CameraView } from "./CameraRig";
import { MouthScene } from "./MouthScene";

export interface Odontogram3DProps {
  value?: Record<number, ToothState>;
  defaultValue?: Record<number, ToothState>;
  onChange?: (fdi: number, state: ToothState, chart: Record<number, ToothState>) => void;
  onSelectTooth?: (fdi: number | null) => void;
  className?: string;
  showUI?: boolean;
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
}: Odontogram3DProps) {
  const [internal, setInternal] = useState<Record<number, ToothState>>(
    () => defaultValue ?? defaultChart(),
  );
  const chart = value ?? internal;

  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [view, setView] = useState<CameraView>("anterior");
  const [nonce, setNonce] = useState(0);

  const handleSelect = useCallback(
    (fdi: number) => {
      setSelected(fdi);
      onSelectTooth?.(fdi);
    },
    [onSelectTooth],
  );

  const setState = (fdi: number, state: ToothState) => {
    const next = { ...chart, [fdi]: state };
    if (value === undefined) setInternal(next);
    onChange?.(fdi, state, next);
  };

  const def = selected ? TEETH_BY_FDI[selected] : null;

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-background", className)}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: CAMERA_VIEWS.anterior.position, fov: 38 }}
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
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
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

        <Environment>
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
          />
        </Suspense>

        <CameraRig view={view} nonce={nonce} />
      </Canvas>

      {showUI && (
        <>
          {/* Camera controls */}
          <div className="pointer-events-auto absolute left-4 top-4 flex flex-col gap-2.5 rounded-2xl border border-white/10 bg-[#171e2c]/85 p-4 shadow-xl shadow-black/30 backdrop-blur-md">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">
              Vistas
            </span>
            <div className="grid grid-cols-2 gap-1.5">
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
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-150",
                      activo
                        ? "bg-primary text-primary-foreground shadow-[0_2px_8px_rgba(124,58,237,0.4)]"
                        : "bg-white/[0.06] text-white/70 hover:bg-white/[0.12] hover:text-white",
                    )}
                  >
                    <Icon className="size-3.5" />
                    {CAMERA_VIEWS[v].label}
                  </button>
                );
              })}
            </div>
            <p className="max-w-[11rem] text-[10.5px] leading-snug text-white/40">
              Arrastrá para rotar · rueda para zoom · click derecho para desplazar
            </p>
          </div>

          {/* Legend */}
          <div className="absolute right-4 top-4 rounded-2xl border border-white/10 bg-[#171e2c]/85 p-4 shadow-xl shadow-black/30 backdrop-blur-md">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">
              Estados
            </span>
            <ul className="mt-2.5 space-y-1.5">
              {TOOTH_STATES.map((s) => (
                <li key={s} className="flex items-center gap-2.5 text-xs font-medium text-white/85">
                  <span
                    className="size-3 shrink-0 rounded-full ring-2 ring-white/10"
                    style={{ backgroundColor: TOOTH_STATE_META[s].color }}
                  />
                  {TOOTH_STATE_META[s].label}
                </li>
              ))}
            </ul>
          </div>

          {/* Selection panel */}
          <div className="absolute bottom-4 left-1/2 w-[min(46rem,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-border/60 bg-card/90 p-3.5 shadow-xl backdrop-blur-md">
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
                          style={{ backgroundColor: TOOTH_STATE_META[s].color }}
                        />
                        {TOOTH_STATE_META[s].label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                Hacé click en cualquier diente para seleccionarlo y cambiar su estado.
              </p>
            )}

            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-border/60 pt-3">
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
                        "flex size-6 items-center justify-center rounded border text-[10px] font-semibold transition-colors",
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