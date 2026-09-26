import { useEffect, useState } from "react";
import { ImageIcon, FileText } from "lucide-react";

type Registro = {
  id: string;
  fdi: number | null;
  nombre: string;
  fecha: string;
  tipo: "imagen" | "pdf";
  dataUrl: string;
};

type Props = {
  pacienteId: string;
  fdi: number | null;
  onVerTodas: () => void;
};

function clave(pacienteId: string) {
  return `cloud-esther:odontograma3d:radiografias:${pacienteId}`;
}

function cargar(pacienteId: string): Registro[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(clave(pacienteId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const CARD =
  "rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)]";

export function ImagenesClinicas({ pacienteId, fdi, onVerTodas }: Props) {
  const [registros, setRegistros] = useState<Registro[]>([]);

  useEffect(() => {
    const todos = cargar(pacienteId);
    setRegistros(fdi ? todos.filter((r) => r.fdi === fdi) : todos);
  }, [pacienteId, fdi]);

  const visibles = registros.slice(0, 3);
  const restantes = registros.length - visibles.length;

  return (
    <div className={CARD}>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <ImageIcon className="size-3.5" />
        Imágenes clínicas {fdi ? `· pieza ${fdi}` : ""}
      </p>

      {registros.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Sin imágenes cargadas {fdi ? "para esta pieza" : "todavía"}.
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {visibles.map((r) => (
            <div key={r.id} className="aspect-square overflow-hidden rounded-lg border border-border/70 bg-muted/30">
              {r.tipo === "imagen" ? (
                <img src={r.dataUrl} alt={r.nombre} className="size-full object-cover" />
              ) : (
                <div className="grid size-full place-items-center">
                  <FileText className="size-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
          {restantes > 0 && (
            <button
              type="button"
              onClick={onVerTodas}
              className="grid aspect-square place-items-center rounded-lg border border-dashed border-border text-xs font-semibold text-muted-foreground hover:bg-muted/40"
            >
              +{restantes}
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onVerTodas}
        className="mt-3 text-xs font-semibold text-primary hover:underline"
      >
        Ver todas las imágenes →
      </button>
    </div>
  );
}