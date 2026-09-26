import { useEffect, useRef, useState } from "react";
import { Lock, Sparkles, Grid3x3, Box, RotateCcw, Check } from "lucide-react";
import { PLANS, planLevel, type PlanId } from "@/lib/cloud-esther/data";
import { Odontogram3D } from "@/components/odontogram/Odontogram3D";
import { defaultChart, TEETH_BY_FDI, type ToothState } from "@/lib/odontogram/fdi";
import { registrarCambio } from "@/lib/odontogram/historial";
import { RadiografiasPanel } from "./RadiografiasPanel";
import { ToothDetailPanel } from "@/components/odontogram/ToothDetailPanel";
import { HistorialEvolucion } from "@/components/odontogram/HistorialEvolucion";
import { ImagenesClinicas } from "@/components/odontogram/ImagenesClinicas";
import { EstherAIChat } from "@/components/odontogram/EstherAIChat";

type Props = {
  pacienteId: string;
  onToast: (msg: string) => void;
  plan: string;
};

const PLAN_MINIMO_3D: PlanId = "avanzada";

function resolverPlanId(nombrePlan: string): PlanId {
  const encontrado = Object.values(PLANS).find((p) => p.name === nombrePlan);
  return encontrado?.id ?? "inicial";
}

function claveAlmacenamiento(pacienteId: string) {
  return `cloud-esther:odontograma3d:${pacienteId}`;
}

function cargarChart(pacienteId: string): Record<number, ToothState> {
  if (typeof window === "undefined") return defaultChart();
  try {
    const raw = window.localStorage.getItem(claveAlmacenamiento(pacienteId));
    if (!raw) return defaultChart();
    return { ...defaultChart(), ...JSON.parse(raw) };
  } catch {
    return defaultChart();
  }
}

function guardarChart(pacienteId: string, chart: Record<number, ToothState>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(claveAlmacenamiento(pacienteId), JSON.stringify(chart));
}

const CARD =
  "rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)]";

const TAB_ACTIVO =
  "inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground";
const TAB_INACTIVO =
  "inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/60";
const BTN_ICONO =
  "inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive";

export function OdontogramaGate({ pacienteId, onToast, plan }: Props) {
  const [modo, setModo] = useState<"2d" | "3d">("2d");
  const [chart, setChart] = useState<Record<number, ToothState>>(() => cargarChart(pacienteId));
  const [fdiSeleccionado, setFdiSeleccionado] = useState<number | null>(null);
  const radiografiasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setChart(cargarChart(pacienteId));
    setFdiSeleccionado(null);
  }, [pacienteId]);

  const planId = resolverPlanId(plan);
  const tieneAcceso3D = planLevel(planId) >= planLevel(PLAN_MINIMO_3D);

  const handleChange = (fdi: number, state: ToothState, next: Record<number, ToothState>) => {
    const anterior = chart[fdi] ?? "sano";
    setChart(next);
    guardarChart(pacienteId, next);
    registrarCambio(pacienteId, fdi, anterior, state);
    onToast(`Pieza ${fdi} actualizada a "${state}"`);
  };

  const reiniciar = () => {
    const limpio = defaultChart();
    setChart(limpio);
    guardarChart(pacienteId, limpio);
    onToast("Odontograma reiniciado");
  };

  const defSeleccionado = fdiSeleccionado ? TEETH_BY_FDI[fdiSeleccionado] : null;
  const estadoSeleccionado = fdiSeleccionado ? chart[fdiSeleccionado] ?? "sano" : "sano";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold tracking-tight text-foreground">Odontograma</h2>
          {modo === "3d" && tieneAcceso3D && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <Check className="size-3 text-emerald-500" />
              Guardado automáticamente
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={() => setModo("2d")} className={modo === "2d" ? TAB_ACTIVO : TAB_INACTIVO}>
            <Grid3x3 className="size-3.5" />
            2D
          </button>
          <button
            type="button"
            onClick={() => {
              if (!tieneAcceso3D) {
                onToast(`El Odontograma 3D requiere plan ${PLANS[PLAN_MINIMO_3D].name} o superior`);
                return;
              }
              setModo("3d");
            }}
            className={modo === "3d" ? TAB_ACTIVO : TAB_INACTIVO}
          >
            {tieneAcceso3D ? <Box className="size-3.5" /> : <Lock className="size-3.5" />}
            3D
          </button>

          {modo === "3d" && tieneAcceso3D && (
            <button type="button" onClick={reiniciar} className={BTN_ICONO}>
              <RotateCcw className="size-3.5" />
              Reiniciar
            </button>
          )}
        </div>
      </div>

      {modo === "3d" && !tieneAcceso3D ? (
        <UpgradeAviso planActual={plan} />
      ) : modo === "3d" ? (
        <div className="rounded-[28px] bg-gradient-to-b from-primary/[0.07] via-primary/[0.02] to-transparent p-1">
          <div className="h-[calc(100vh-240px)] min-h-[600px] overflow-hidden rounded-[24px] border border-border/70">
            <Odontogram3D
              key={pacienteId}
              value={chart}
              onChange={handleChange}
              onSelectTooth={setFdiSeleccionado}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 px-1 pb-1 sm:grid-cols-2 xl:grid-cols-4">
            <ToothDetailPanel
              pacienteId={pacienteId}
              def={defSeleccionado}
              estado={estadoSeleccionado}
              onSetEstado={(fdi, estado) => handleChange(fdi, estado, { ...chart, [fdi]: estado })}
            />
            <HistorialEvolucion pacienteId={pacienteId} fdi={fdiSeleccionado} />
            <ImagenesClinicas
              pacienteId={pacienteId}
              fdi={fdiSeleccionado}
              onVerTodas={() =>
                radiografiasRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            />
            <EstherAIChat onToast={onToast} />
          </div>

          <div ref={radiografiasRef} className="px-1 pb-1">
            <RadiografiasPanel pacienteId={pacienteId} fdiSeleccionado={fdiSeleccionado} onToast={onToast} />
          </div>
        </div>
      ) : (
        <>
          <Odontograma2DPlaceholder pacienteId={pacienteId} />
          <div ref={radiografiasRef}>
            <RadiografiasPanel pacienteId={pacienteId} fdiSeleccionado={fdiSeleccionado} onToast={onToast} />
          </div>
        </>
      )}
    </div>
  );
}

function UpgradeAviso({ planActual }: { planActual: string }) {
  return (
    <div className={`${CARD} grid min-h-64 place-items-center border-dashed text-center`}>
      <div>
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="size-5" />
        </span>
        <p className="mt-3 text-sm font-semibold text-foreground">
          El Odontograma 3D no está incluido en tu plan
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Plan actual: {planActual}. Necesitás {PLANS[PLAN_MINIMO_3D].name} o superior para activarlo.
        </p>
      </div>
    </div>
  );
}

function Odontograma2DPlaceholder({ pacienteId }: { pacienteId: string }) {
  return (
    <div className={`${CARD} grid min-h-64 place-items-center border-dashed text-center`}>
      <div>
        <Grid3x3 className="mx-auto size-8 text-primary/50" />
        <p className="mt-2 text-sm font-semibold text-foreground">Odontograma 2D</p>
        <p className="text-sm text-muted-foreground">Paciente: {pacienteId}</p>
      </div>
    </div>
  );
}