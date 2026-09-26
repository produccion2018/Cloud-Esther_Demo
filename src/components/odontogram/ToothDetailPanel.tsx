import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  FileText,
  Info,
  LayoutGrid,
  Stethoscope,
} from "lucide-react";

import {
  PLANNED_TREATMENT_META,
  PLANNED_TREATMENTS,
  TOOTH_STATES,
  TOOTH_STATE_META,
  type PlannedTreatment,
  type ToothDef,
  type ToothState,
} from "@/lib/odontogram/fdi";

import {
  cargarTratamientos,
  guardarTratamiento,
} from "@/lib/odontogram/historial";

type Superficie =
  | "mesial"
  | "distal"
  | "oclusal"
  | "vestibular"
  | "lingual";

const SUPERFICIES: {
  id: Superficie;
  label: string;
}[] = [
  { id: "mesial", label: "Mesial" },
  { id: "distal", label: "Distal" },
  { id: "oclusal", label: "Oclusal" },
  { id: "vestibular", label: "Vestibular" },
  { id: "lingual", label: "Lingual" },
];

type Props = {
  pacienteId: string;
  def: ToothDef | null;
  estado: ToothState;
  onSetEstado: (fdi: number, estado: ToothState) => void;
};

const CARD =
  "rounded-2xl border border-border/70 bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)]";

/*
 * Datos clínicos locales de demostración.
 *
 * Por ahora viven en el frontend para que la ficha tenga contenido real
 * mientras construimos la conexión con backend.
 *
 * Más adelante estos mismos campos pueden venir directamente del paciente
 * y de la pieza correspondiente.
 */
const DATOS_CLINICOS: Record<
  number,
  {
    diagnostico: string;
    observaciones: string;
    sensibilidad: string;
    movilidad: string;
    superficies: Partial<
      Record<
        Superficie,
        {
          hallazgo: string;
          detalle: string;
        }
      >
    >;
  }
> = {
  41: {
    diagnostico: "Sin diagnóstico registrado",
    observaciones:
      "Control clínico. Registrar hallazgos específicos durante la evaluación.",
    sensibilidad: "No registrada",
    movilidad: "Grado 0",
    superficies: {
      mesial: {
        hallazgo: "Sin hallazgos",
        detalle: "Superficie sin observaciones registradas.",
      },
      distal: {
        hallazgo: "Sin hallazgos",
        detalle: "Superficie sin observaciones registradas.",
      },
      oclusal: {
        hallazgo: "Sin hallazgos",
        detalle: "Superficie seleccionada para evaluación.",
      },
      vestibular: {
        hallazgo: "Sin hallazgos",
        detalle: "Superficie sin observaciones registradas.",
      },
      lingual: {
        hallazgo: "Sin hallazgos",
        detalle: "Superficie sin observaciones registradas.",
      },
    },
  },
};

function obtenerDatosClinicos(fdi: number) {
  return (
    DATOS_CLINICOS[fdi] ?? {
      diagnostico: "Sin diagnóstico registrado",
      observaciones:
        "No hay observaciones clínicas registradas para esta pieza.",
      sensibilidad: "No registrada",
      movilidad: "No registrada",
      superficies: {},
    }
  );
}

export function ToothDetailPanel({
  pacienteId,
  def,
  estado,
  onSetEstado,
}: Props) {
  const [superficie, setSuperficie] =
    useState<Superficie>("oclusal");

  const [tratamiento, setTratamiento] = useState("");

  useEffect(() => {
    if (!def) return;

    const guardados = cargarTratamientos(pacienteId);

    setTratamiento(guardados[def.fdi] ?? "");
    setSuperficie("oclusal");
  }, [pacienteId, def?.fdi]);

  const datosClinicos = useMemo(
    () => (def ? obtenerDatosClinicos(def.fdi) : null),
    [def],
  );

  if (!def) {
    return (
      <div className={CARD}>
        <p className="text-sm text-muted-foreground">
          Seleccioná un diente en el modelo 3D para ver su detalle.
        </p>
      </div>
    );
  }

  const guardarTexto = (texto: string) => {
    setTratamiento(texto);
    guardarTratamiento(pacienteId, def.fdi, texto);
  };

  const tratamientoSeleccionado =
    PLANNED_TREATMENTS.find(
      (item) =>
        PLANNED_TREATMENT_META[item].label === tratamiento,
    ) ?? "ninguno";

  const datosSuperficie =
    datosClinicos?.superficies[superficie] ?? {
      hallazgo: "Sin hallazgos registrados",
      detalle:
        "Todavía no hay información clínica cargada para esta superficie.",
    };

  return (
    <div className={CARD}>
      {/* Identificación de la pieza */}
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
          {def.fdi}
        </span>

        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-foreground">
            {def.name}
          </p>

          <p className="text-xs text-muted-foreground">
            {def.arch === "upper"
              ? "Arcada superior"
              : "Arcada inferior"}{" "}
            ·{" "}
            {def.side === "right"
              ? "derecha"
              : "izquierda"}
          </p>
        </div>

        <div className="ml-auto rounded-lg bg-muted/60 px-2 py-1 text-[10px] font-semibold text-muted-foreground">
          FDI
        </div>
      </div>

      {/* Superficies */}
      <div className="mt-4">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <LayoutGrid className="size-3.5" />
          Superficies
        </p>

        <div className="mt-2 grid grid-cols-5 gap-1">
          {SUPERFICIES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSuperficie(s.id)}
              className={`rounded-lg border px-1.5 py-2 text-[10px] font-medium transition-colors ${
                superficie === s.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-muted/60"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Información de la superficie seleccionada */}
        <div className="mt-2 rounded-xl border border-border/60 bg-muted/30 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-foreground">
              {SUPERFICIES.find(
                (s) => s.id === superficie,
              )?.label}
            </p>

            <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              Superficie
            </span>
          </div>

          <p className="mt-1 text-xs font-medium text-foreground">
            {datosSuperficie.hallazgo}
          </p>

          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            {datosSuperficie.detalle}
          </p>
        </div>
      </div>

      {/* Estado actual */}
      <div className="mt-4">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Info className="size-3.5" />
          Estado actual
        </p>

        <div className="mt-2 rounded-xl border border-border/60 bg-muted/30 p-2">
          <div className="flex items-center gap-2">
            <span
              className="size-2.5 rounded-full"
              style={{
                backgroundColor:
                  TOOTH_STATE_META[estado].color,
              }}
            />

            <span className="text-xs font-semibold text-foreground">
              {TOOTH_STATE_META[estado].label}
            </span>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {TOOTH_STATES.map((s) => {
            const activo = estado === s;

            return (
              <button
                key={s}
                type="button"
                onClick={() => onSetEstado(def.fdi, s)}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  activo
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted/60"
                }`}
              >
                <span
                  className="size-2.5 rounded-full"
                  style={{
                    backgroundColor:
                      TOOTH_STATE_META[s].color,
                  }}
                />

                {TOOTH_STATE_META[s].label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Diagnóstico */}
      <div className="mt-4">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Stethoscope className="size-3.5" />
          Diagnóstico
        </p>

        <div className="mt-2 rounded-xl border border-border/60 bg-muted/30 p-3">
          <p className="text-xs font-semibold text-foreground">
            {datosClinicos?.diagnostico}
          </p>

          <p className="mt-1 text-[11px] text-muted-foreground">
            Registro clínico de la pieza.
          </p>
        </div>
      </div>

      {/* Datos clínicos rápidos */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Sensibilidad
          </p>

          <p className="mt-1 text-xs font-medium text-foreground">
            {datosClinicos?.sensibilidad}
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Movilidad
          </p>

          <p className="mt-1 text-xs font-medium text-foreground">
            {datosClinicos?.movilidad}
          </p>
        </div>
      </div>

      {/* Tratamiento planificado */}
      <div className="mt-4">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <ClipboardList className="size-3.5" />
          Tratamiento planificado
        </p>

        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {PLANNED_TREATMENTS.filter(
            (item) => item !== "ninguno",
          ).map((item: PlannedTreatment) => {
            const activo =
              tratamientoSeleccionado === item;

            return (
              <button
                key={item}
                type="button"
                onClick={() =>
                  guardarTexto(
                    PLANNED_TREATMENT_META[item].label,
                  )
                }
                className={`rounded-lg border px-2.5 py-2 text-left text-[11px] font-medium transition-colors ${
                  activo
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted/60"
                }`}
              >
                {PLANNED_TREATMENT_META[item].label}
              </button>
            );
          })}
        </div>

        <textarea
          value={tratamiento}
          onChange={(e) => guardarTexto(e.target.value)}
          placeholder="Detalle del tratamiento planificado..."
          rows={2}
          className="mt-2 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
        />

        {tratamiento && (
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            {PLANNED_TREATMENT_META[
              tratamientoSeleccionado
            ].description}
          </p>
        )}
      </div>

      {/* Observaciones clínicas */}
      <div className="mt-4">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <FileText className="size-3.5" />
          Observaciones clínicas
        </p>

        <div className="mt-2 rounded-xl border border-border/60 bg-muted/30 p-3">
          <p className="text-xs leading-relaxed text-foreground">
            {datosClinicos?.observaciones}
          </p>
        </div>
      </div>
    </div>
  );
}