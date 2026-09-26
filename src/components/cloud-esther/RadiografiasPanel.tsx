import { useEffect, useRef, useState } from "react";
import { Upload, X, FileText, ImageIcon } from "lucide-react";

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
  fdiSeleccionado: number | null;
  onToast: (msg: string) => void;
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

function guardar(pacienteId: string, registros: Registro[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(clave(pacienteId), JSON.stringify(registros));
}

const CARD =
  "rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)]";

export function RadiografiasPanel({ pacienteId, fdiSeleccionado, onToast }: Props) {
  const [registros, setRegistros] = useState<Registro[]>(() => cargar(pacienteId));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRegistros(cargar(pacienteId));
  }, [pacienteId]);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const esPdf = file.type === "application/pdf";
      const esImagen = file.type.startsWith("image/");

      if (!esPdf && !esImagen) {
        onToast(`"${file.name}" no es una imagen ni un PDF válido`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const nuevo: Registro = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          fdi: fdiSeleccionado,
          nombre: file.name,
          fecha: new Date().toLocaleDateString("es-AR"),
          tipo: esPdf ? "pdf" : "imagen",
          dataUrl: reader.result as string,
        };
        setRegistros((prev) => {
          const next = [nuevo, ...prev];
          guardar(pacienteId, next);
          return next;
        });
        onToast(
          fdiSeleccionado
            ? `Estudio agregado a la pieza ${fdiSeleccionado}`
            : "Estudio agregado (sin pieza asociada)",
        );
      };
      reader.readAsDataURL(file);
    });
  };

  const eliminar = (id: string) => {
    setRegistros((prev) => {
      const next = prev.filter((r) => r.id !== id);
      guardar(pacienteId, next);
      return next;
    });
    onToast("Estudio eliminado");
  };

  const abrir = (registro: Registro) => {
    const ventana = window.open();
    if (ventana) {
      if (registro.tipo === "pdf") {
        ventana.document.write(
          `<iframe src="${registro.dataUrl}" style="width:100%;height:100%;border:0;"></iframe>`,
        );
      } else {
        ventana.document.write(
          `<img src="${registro.dataUrl}" style="max-width:100%;display:block;margin:0 auto;" />`,
        );
      }
    }
  };

  return (
    <div className={`${CARD} mt-4`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">Radiografías y estudios</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {fdiSeleccionado
              ? `Se van a asociar a la pieza ${fdiSeleccionado} (seleccionada en el odontograma)`
              : "Sin pieza seleccionada — se guardan como estudio general del paciente"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Upload className="size-3.5" />
          Subir archivo
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {registros.length === 0 ? (
        <div className="mt-4 grid min-h-28 place-items-center rounded-xl border border-dashed border-border/70 text-center">
          <p className="text-xs text-muted-foreground">
            Todavía no hay radiografías ni estudios cargados para este paciente.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {registros.map((r) => (
            <div
              key={r.id}
              className="group relative overflow-hidden rounded-xl border border-border/70 bg-muted/20"
            >
              <button type="button" onClick={() => abrir(r)} className="block w-full">
                {r.tipo === "imagen" ? (
                  <img src={r.dataUrl} alt={r.nombre} className="h-24 w-full object-cover" />
                ) : (
                  <div className="grid h-24 w-full place-items-center bg-muted/40">
                    <FileText className="size-8 text-muted-foreground" />
                  </div>
                )}
              </button>

              <div className="px-2 py-1.5">
                <p className="truncate text-[11px] font-medium text-foreground">{r.nombre}</p>
                <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  {r.fdi ? `Pieza ${r.fdi}` : "General"} · {r.fecha}
                </p>
              </div>

              <button
                type="button"
                onClick={() => eliminar(r.id)}
                aria-label="Eliminar"
                className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-background/90 text-muted-foreground opacity-0 shadow transition-opacity hover:text-destructive group-hover:opacity-100"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}