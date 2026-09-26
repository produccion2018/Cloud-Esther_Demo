import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { TOOTH_STATE_META } from "@/lib/odontogram/fdi";
import { cargarHistorial, type HistorialEntry } from "@/lib/odontogram/historial";

type Props = {
  pacienteId: string;
  fdi: number | null;
};

const CARD =
  "rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)]";

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function HistorialEvolucion({ pacienteId, fdi }: Props) {
  const [entradas, setEntradas] = useState<HistorialEntry[]>([]);

  useEffect(() => {
    const todas = cargarHistorial(pacienteId);
    setEntradas(fdi ? todas.filter((e) => e.fdi === fdi) : todas);
  }, [pacienteId, fdi]);

  return (
    <div className={CARD}>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <History className="size-3.5" />
        Historial / Evolución {fdi ? `· pieza ${fdi}` : ""}
      </p>

      {entradas.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {fdi
            ? "Todavía no hay cambios registrados para esta pieza."
            : "Todavía no hay cambios registrados en este odontograma."}
        </p>
      ) : (
        <ol className="mt-3 space-y-3 border-l border-border/70 pl-4">
          {entradas.slice(0, 12).map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute -left-[21px] top-1 size-2.5 rounded-full border-2 border-card bg-primary" />
              <p className="text-[11px] font-semibold text-muted-foreground">
                {formatearFecha(e.fecha)} {!fdi && `· Pieza ${e.fdi}`}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: TOOTH_STATE_META[e.estadoNuevo].color }}
                />
                <p className="text-xs text-foreground">
                  {TOOTH_STATE_META[e.estadoAnterior].label} → {TOOTH_STATE_META[e.estadoNuevo].label}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}