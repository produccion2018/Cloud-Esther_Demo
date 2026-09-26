import { useEffect, useState } from "react";
import { LayoutGrid, ClipboardList, Info } from "lucide-react";
import { TOOTH_STATES, TOOTH_STATE_META, type ToothDef, type ToothState } from "@/lib/odontogram/fdi";
import { cargarTratamientos, guardarTratamiento } from "@/lib/odontogram/historial";

type Superficie = "mesial" | "distal" | "oclusal" | "vestibular" | "lingual";

const SUPERFICIES: { id: Superficie; label: string }[] = [
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
  "rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)]";

/* Nota: el selector de "Superficies" es por ahora solo visual (indica dónde
   está mirando el profesional), no guarda un hallazgo distinto por superficie.
   Eso ya existe en el Odontograma2D con su propio sistema — se puede unificar
   más adelante si hace falta. */
export function ToothDetailPanel({ pacienteId, def, estado, onSetEstado }: Props) {
  const [superficie, setSuperficie] = useState<Superficie>("oclusal");
  const [tratamiento, setTratamiento] = useState("");

  useEffect(() => {
    if (!def) return;
    const guardados = cargarTratamientos(pacienteId);
    setTratamiento(guardados[def.fdi] ?? "");
    setSuperficie("oclusal");
  }, [pacienteId, def?.fdi]);

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

  return (
    <div className={CARD}>
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
          {def.fdi}
        </span>
        <div>
          <p className="text-sm font-bold text-foreground">{def.name}</p>
          <p className="text-xs text-muted-foreground">
            {def.arch === "upper" ? "Arcada superior" : "Arcada inferior"} ·{" "}
            {def.side === "right" ? "derecha" : "izquierda"}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <LayoutGrid className="size-3.5" />
          Superficies
        </p>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {SUPERFICIES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSuperficie(s.id)}
              className={`rounded-lg border px-2 py-2 text-[11px] font-medium transition-colors ${
                superficie === s.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-muted/60"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Info className="size-3.5" />
          Estado actual
        </p>
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
                  style={{ backgroundColor: TOOTH_STATE_META[s].color }}
                />
                {TOOTH_STATE_META[s].label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <ClipboardList className="size-3.5" />
          Tratamiento planificado
        </p>
        <textarea
          value={tratamiento}
          onChange={(e) => guardarTexto(e.target.value)}
          placeholder="Ej: Obturación con resina compuesta"
          rows={2}
          className="mt-2 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
        />
      </div>
    </div>
  );
}