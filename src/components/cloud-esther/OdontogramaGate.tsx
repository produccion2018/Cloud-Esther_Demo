import { useEffect, useMemo, useRef, useState } from "react";
import { Lock, Sparkles, Grid3x3, Box, RotateCcw, Check, ListChecks, Download } from "lucide-react";
import { PLANS, planLevel, useCloudEsther, type PlanId } from "@/lib/cloud-esther/data";
import { useSesion } from "@/lib/cloud-esther/auth-store";
import { Odontogram as Odontograma2D } from "@/components/odontograma2d/Odontogram";
import { Odontogram3D } from "@/components/odontogram/Odontogram3D";
import {
  defaultChart,
  TEETH_BY_FDI,
  TOOTH_STATE_META,
  type ToothState,
} from "@/lib/odontogram/fdi";
import { odontogramKey } from "@/lib/odontograma2d/types";
import { cargarTratamientos, registrarCambio } from "@/lib/odontogram/historial";
import { RadiografiasPanel } from "./RadiografiasPanel";
import { ToothDetailPanel } from "@/components/odontogram/ToothDetailPanel";
import { HistorialEvolucion } from "@/components/odontogram/HistorialEvolucion";
import { ImagenesClinicas } from "@/components/odontogram/ImagenesClinicas";
import { EstherAIChat } from "@/components/odontogram/EstherAIChat";

/** "2d" y "3d": páginas del sidebar (Odontograma 2D / Odontograma 3D).
 *  "ambos": ficha del paciente, con pestañas para cambiar entre las dos vistas. */
export type VistaOdontograma = "2d" | "3d" | "ambos";

type Props = {
  pacienteId: string;
  pacienteNombre?: string | undefined;
  onToast: (msg: string) => void;
  vista?: VistaOdontograma | undefined;
};

const PLAN_MINIMO_3D: PlanId = "avanzada";
/** "Odontograma 3D avanzado" (Grupo Odontológico): exportar el informe del odontograma. */
const PLAN_INFORME_3D: PlanId = "grupo";
/** Esther IA (chat clínico) está incluida desde Clínica Avanzada, igual que el módulo IA Esther. */
const PLAN_MINIMO_IA: PlanId = "avanzada";

/* Todo lo del odontograma se guarda por clínica (tenant) + paciente,
   para que en multiempresa no se crucen los datos entre empresas. */
function claveAlmacenamiento(clavePaciente: string) {
  return `cloud-esther:odontograma3d:${clavePaciente}`;
}

function cargarChart(clavePaciente: string): Record<number, ToothState> {
  if (typeof window === "undefined") return defaultChart();
  try {
    const raw = window.localStorage.getItem(claveAlmacenamiento(clavePaciente));
    if (!raw) return defaultChart();
    return { ...defaultChart(), ...JSON.parse(raw) };
  } catch {
    return defaultChart();
  }
}

function guardarChart(clavePaciente: string, chart: Record<number, ToothState>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(claveAlmacenamiento(clavePaciente), JSON.stringify(chart));
  } catch {
    /* almacenamiento no disponible: se ignora */
  }
}

const CARD =
  "rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)]";

const TAB_ACTIVO =
  "inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground";
const TAB_INACTIVO =
  "inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/60";
const BTN_ICONO =
  "inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive";

const TITULO: Record<VistaOdontograma, string> = {
  "2d": "Odontograma 2D",
  "3d": "Odontograma 3D",
  ambos: "Odontograma",
};

export function OdontogramaGate({ pacienteId, pacienteNombre, onToast, vista = "ambos" }: Props) {
  // Plan elegido en el sidebar ("Plan activo") y clínica de la sesión (tenant).
  const { plan: planId } = useCloudEsther();
  const { clinicId } = useSesion();
  const tenantId = clinicId ?? "demo";
  const clavePaciente = odontogramKey(tenantId, pacienteId);
  const plan = PLANS[planId].name;

  const [modo, setModo] = useState<"2d" | "3d">(vista === "3d" ? "3d" : "2d");
  const [chart, setChart] = useState<Record<number, ToothState>>(() => cargarChart(clavePaciente));
  const [fdiSeleccionado, setFdiSeleccionado] = useState<number | null>(null);
  const radiografiasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setChart(cargarChart(clavePaciente));
    setFdiSeleccionado(null);
  }, [clavePaciente]);

  useEffect(() => {
    if (vista !== "ambos") setModo(vista);
  }, [vista]);

  const tieneAcceso3D = planLevel(planId) >= planLevel(PLAN_MINIMO_3D);
  const tieneIA = planLevel(planId) >= planLevel(PLAN_MINIMO_IA);
  const tieneInforme = planLevel(planId) >= planLevel(PLAN_INFORME_3D);

  const exportarInforme = () => {
    if (!tieneInforme) {
      onToast(`El informe del odontograma 3D requiere plan ${PLANS[PLAN_INFORME_3D].name}`);
      return;
    }
    const tratamientos = cargarTratamientos(clavePaciente);
    const celda = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const filas = Object.keys(chart)
      .map(Number)
      .sort((a, b) => a - b)
      .map((fdi) =>
        [
          String(fdi),
          TEETH_BY_FDI[fdi]?.name ?? "",
          TOOTH_STATE_META[chart[fdi] ?? "sano"].label,
          tratamientos[fdi] ?? "",
        ]
          .map(celda)
          .join(","),
      );
    const csv = ["Pieza,Nombre,Estado,Tratamiento planificado", ...filas].join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `odontograma-3d-${(pacienteNombre ?? pacienteId).replace(/\s+/g, "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onToast("Informe del odontograma descargado");
  };

  const handleChange = (fdi: number, state: ToothState, next: Record<number, ToothState>) => {
    const anterior = chart[fdi] ?? "sano";
    setChart(next);
    guardarChart(clavePaciente, next);
    registrarCambio(clavePaciente, fdi, anterior, state);
    onToast(`Pieza ${fdi} actualizada a "${state}"`);
  };

  const reiniciar = () => {
    const limpio = defaultChart();
    setChart(limpio);
    guardarChart(clavePaciente, limpio);
    onToast("Odontograma reiniciado");
  };

  const defSeleccionado = fdiSeleccionado ? (TEETH_BY_FDI[fdiSeleccionado] ?? null) : null;
  const estadoSeleccionado = fdiSeleccionado ? (chart[fdiSeleccionado] ?? "sano") : "sano";

  const verRadiografias = () =>
    radiografiasRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  /* Paneles que comparten el 2D y el 3D: imágenes clínicas, Esther IA y radiografías. */
  const panelesCompartidos = (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ImagenesClinicas
          pacienteId={clavePaciente}
          fdi={fdiSeleccionado}
          onVerTodas={verRadiografias}
        />
        {tieneIA ? (
          <EstherAIChat onToast={onToast} />
        ) : (
          <PanelBloqueado
            titulo="Esther IA"
            texto={`El asistente clínico con IA está disponible desde el plan ${PLANS[PLAN_MINIMO_IA].name}.`}
          />
        )}
      </div>

      <div ref={radiografiasRef}>
        <RadiografiasPanel
          pacienteId={clavePaciente}
          fdiSeleccionado={fdiSeleccionado}
          onToast={onToast}
        />
      </div>
    </>
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold tracking-tight text-foreground">{TITULO[vista]}</h2>

          {(modo === "2d" || tieneAcceso3D) && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <Check className="size-3 text-emerald-500" />
              Guardado automáticamente
            </span>
          )}
        </div>

        <div className="flex gap-2">
          {vista === "ambos" && (
            <>
              <button
                type="button"
                onClick={() => {
                  setModo("2d");
                  setFdiSeleccionado(null);
                }}
                className={modo === "2d" ? TAB_ACTIVO : TAB_INACTIVO}
              >
                <Grid3x3 className="size-3.5" />
                2D
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!tieneAcceso3D) {
                    onToast(
                      `El Odontograma 3D requiere plan ${PLANS[PLAN_MINIMO_3D].name} o superior`,
                    );
                    return;
                  }
                  setModo("3d");
                  setFdiSeleccionado(null);
                }}
                className={modo === "3d" ? TAB_ACTIVO : TAB_INACTIVO}
              >
                {tieneAcceso3D ? <Box className="size-3.5" /> : <Lock className="size-3.5" />}
                3D
              </button>
            </>
          )}

          {modo === "3d" && tieneAcceso3D && (
            <button
              type="button"
              onClick={exportarInforme}
              title={tieneInforme ? undefined : `Disponible en ${PLANS[PLAN_INFORME_3D].name}`}
              className={tieneInforme ? TAB_INACTIVO : `${TAB_INACTIVO} opacity-60`}
            >
              {tieneInforme ? <Download className="size-3.5" /> : <Lock className="size-3.5" />}
              Exportar informe
            </button>
          )}

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
        <div className="space-y-4">
          <div className="rounded-[28px] bg-gradient-to-b from-primary/[0.07] via-primary/[0.02] to-transparent p-1">
            <div className="h-[calc(100vh-240px)] min-h-[600px] overflow-hidden rounded-[24px] border border-border/70">
              <Odontogram3D
                key={clavePaciente}
                value={chart}
                onChange={handleChange}
                onSelectTooth={setFdiSeleccionado}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ToothDetailPanel
              pacienteId={clavePaciente}
              def={defSeleccionado}
              estado={estadoSeleccionado}
              onSetEstado={(fdi, estado) => handleChange(fdi, estado, { ...chart, [fdi]: estado })}
            />
            <HistorialEvolucion pacienteId={clavePaciente} fdi={fdiSeleccionado} />
          </div>

          <ResumenHallazgos3D
            chart={chart}
            pacienteNombre={pacienteNombre}
            fdiSeleccionado={fdiSeleccionado}
          />

          {panelesCompartidos}
        </div>
      ) : (
        <div className="space-y-4">
          <Odontograma2D
            tenantId={tenantId}
            patientId={pacienteId}
            patientName={pacienteNombre ?? "este paciente"}
            plan={planId}
            onToast={onToast}
            onSelectTooth={setFdiSeleccionado}
          />

          {panelesCompartidos}
        </div>
      )}
    </div>
  );
}

/* Hallazgos y resumen del 3D (el 2D ya los tiene dentro del módulo). */
function ResumenHallazgos3D({
  chart,
  pacienteNombre,
  fdiSeleccionado,
}: {
  chart: Record<number, ToothState>;
  pacienteNombre?: string | undefined;
  fdiSeleccionado: number | null;
}) {
  const piezas = useMemo(
    () =>
      Object.entries(chart)
        .map(([fdi, estado]) => ({ fdi: Number(fdi), estado }))
        .filter((p) => p.estado !== "sano")
        .sort((a, b) => a.fdi - b.fdi),
    [chart],
  );

  const conteo = useMemo(() => {
    const c: Partial<Record<ToothState, number>> = {};
    piezas.forEach((p) => (c[p.estado] = (c[p.estado] ?? 0) + 1));
    return c;
  }, [piezas]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className={CARD}>
        <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <ListChecks className="size-4 text-primary" />
          Hallazgos de {pacienteNombre ?? "este paciente"}
        </p>
        {piezas.length === 0 ? (
          <p className="text-xs text-muted-foreground">Todas las piezas están sanas.</p>
        ) : (
          <ul className="max-h-64 divide-y divide-border overflow-y-auto">
            {piezas.map((p) => (
              <li
                key={p.fdi}
                className={`flex items-center gap-3 py-2 text-xs ${
                  p.fdi === fdiSeleccionado ? "font-semibold" : ""
                }`}
              >
                <span className="w-10 font-semibold text-primary">{p.fdi}</span>
                <span className="flex-1 truncate text-muted-foreground">
                  {TEETH_BY_FDI[p.fdi]?.name ?? "Pieza"}
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: TOOTH_STATE_META[p.estado].color }}
                  />
                  {TOOTH_STATE_META[p.estado].label}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={CARD}>
        <p className="mb-3 text-sm font-semibold text-foreground">Resumen</p>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="text-xl font-semibold text-primary">{piezas.length}</p>
            <p className="text-[0.7rem] text-muted-foreground">Piezas con hallazgos</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="text-xl font-semibold text-primary">
              {Object.keys(chart).length - piezas.length}
            </p>
            <p className="text-[0.7rem] text-muted-foreground">Piezas sanas</p>
          </div>
        </div>
        <ul className="space-y-1.5">
          {(Object.keys(conteo) as ToothState[]).map((estado) => (
            <li key={estado} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: TOOTH_STATE_META[estado].color }}
                />
                {TOOTH_STATE_META[estado].label}
              </span>
              <span className="font-semibold">{conteo[estado]}</span>
            </li>
          ))}
          {piezas.length === 0 && <li className="text-xs text-muted-foreground">Sin datos aún.</li>}
        </ul>
      </div>
    </div>
  );
}

function PanelBloqueado({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className={`${CARD} grid place-items-center border-dashed text-center`}>
      <div>
        <span className="mx-auto grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
          <Lock className="size-4" />
        </span>
        <p className="mt-2 text-sm font-semibold text-foreground">{titulo}</p>
        <p className="mt-1 text-xs text-muted-foreground">{texto}</p>
      </div>
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
          Plan actual: {planActual}. Necesitás {PLANS[PLAN_MINIMO_3D].name} o superior para
          activarlo.
        </p>
      </div>
    </div>
  );
}
