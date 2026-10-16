import { useEffect, useRef, useState } from "react";
import { Contrast, Download, FileText, ImageIcon, Maximize2, RotateCw, Sun, Upload, X, ZoomIn, ZoomOut } from "lucide-react";
import { almacenClinico } from "@/lib/clinica/almacen-clinico";

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
    const raw = almacenClinico.getItem(clave(pacienteId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function guardar(pacienteId: string, registros: Registro[]) {
  if (typeof window === "undefined") return;
  almacenClinico.setItem(clave(pacienteId), JSON.stringify(registros));
}

const CARD =
  "rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)]";

/* Visor de radiografías: zoom con la rueda, los botones o doble click; arrastrar para moverse;
   girar; brillo, contraste y negativo (útil para leer radiografías). Pantalla completa. */
function VisorImagen({ registro, onCerrar }: { registro: Registro; onCerrar: () => void }) {
  const [zoom, setZoom] = useState(1);
  const [giro, setGiro] = useState(0);
  const [brillo, setBrillo] = useState(100);
  const [contraste, setContraste] = useState(100);
  const [negativo, setNegativo] = useState(false);
  const [mover, setMover] = useState({ x: 0, y: 0 });
  const arrastre = useRef<{ x: number; y: number } | null>(null);
  const z = (v: number) => setZoom(Math.min(8, Math.max(0.5, Math.round(v * 100) / 100)));
  const reiniciar = () => {
    setZoom(1);
    setGiro(0);
    setBrillo(100);
    setContraste(100);
    setNegativo(false);
    setMover({ x: 0, y: 0 });
  };
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [onCerrar]);
  const boton = "grid size-10 place-items-center rounded-xl bg-white/10 text-white transition hover:bg-white/20";
  return (
    <div role="dialog" aria-modal="true" aria-label={registro.nombre} className="fixed inset-0 z-[90] flex flex-col bg-[radial-gradient(circle_at_50%_30%,#1e1b4b,#05030f)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3 text-white">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{registro.nombre}</p>
          <p className="text-[11px] text-white/60">{registro.fdi ? `Pieza ${registro.fdi}` : "General"} · {registro.fecha}</p>
        </div>
        <button type="button" className={boton} aria-label="Alejar" onClick={() => z(zoom / 1.25)}><ZoomOut className="size-4" /></button>
        <span className="w-14 text-center text-xs font-bold tabular-nums">{Math.round(zoom * 100)}%</span>
        <button type="button" className={boton} aria-label="Acercar" onClick={() => z(zoom * 1.25)}><ZoomIn className="size-4" /></button>
        <button type="button" className={boton} aria-label="Girar" onClick={() => setGiro((g) => (g + 90) % 360)}><RotateCw className="size-4" /></button>
        <button type="button" className={`${boton} ${negativo ? "!bg-fuchsia-500" : ""}`} aria-label="Negativo" aria-pressed={negativo} onClick={() => setNegativo((v) => !v)}><Contrast className="size-4" /></button>
        <button type="button" className={boton} aria-label="Ajustar a la pantalla" onClick={reiniciar}><Maximize2 className="size-4" /></button>
        <a href={registro.dataUrl} download={registro.nombre} className={boton} aria-label="Descargar"><Download className="size-4" /></a>
        <button type="button" className={`${boton} !bg-white/20`} aria-label="Cerrar visor" onClick={onCerrar}><X className="size-4" /></button>
      </div>
      <div
        className="relative flex-1 cursor-grab touch-none overflow-hidden active:cursor-grabbing"
        onWheel={(e) => z(zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12))}
        onDoubleClick={() => z(zoom >= 2.5 ? 1 : zoom * 2)}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          arrastre.current = { x: e.clientX - mover.x, y: e.clientY - mover.y };
        }}
        onPointerMove={(e) => arrastre.current && setMover({ x: e.clientX - arrastre.current.x, y: e.clientY - arrastre.current.y })}
        onPointerUp={() => (arrastre.current = null)}
      >
        <img
          src={registro.dataUrl}
          alt={registro.nombre}
          draggable={false}
          className="absolute left-1/2 top-1/2 max-h-[85%] max-w-[90%] select-none"
          style={{
            transform: `translate(calc(-50% + ${mover.x}px), calc(-50% + ${mover.y}px)) rotate(${giro}deg) scale(${zoom})`,
            filter: `brightness(${brillo}%) contrast(${contraste}%)${negativo ? " invert(1)" : ""}`,
            transition: arrastre.current ? "none" : "transform 0.15s ease-out",
          }}
        />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-5 border-t border-white/10 px-4 py-3 text-xs text-white/80">
        <label className="flex items-center gap-2"><Sun className="size-4" /> Brillo
          <input type="range" min={40} max={200} value={brillo} onChange={(e) => setBrillo(Number(e.target.value))} className="accent-fuchsia-400" />
        </label>
        <label className="flex items-center gap-2"><Contrast className="size-4" /> Contraste
          <input type="range" min={40} max={250} value={contraste} onChange={(e) => setContraste(Number(e.target.value))} className="accent-fuchsia-400" />
        </label>
        <span className="text-white/50">Rueda o doble click: zoom · Arrastrá para moverte · Esc: cerrar</span>
      </div>
    </div>
  );
}

export function RadiografiasPanel({ pacienteId, fdiSeleccionado, onToast }: Props) {
  const [registros, setRegistros] = useState<Registro[]>(() => cargar(pacienteId));
  const [viendo, setViendo] = useState<Registro | null>(null);
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
    if (registro.tipo === "imagen") return setViendo(registro);
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
      {viendo && <VisorImagen registro={viendo} onCerrar={() => setViendo(null)} />}
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
          className="btn-ce"
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
                  <span className="relative block">
                    <img src={r.dataUrl} alt={r.nombre} className="h-24 w-full object-cover transition group-hover:scale-105" />
                    <span className="absolute inset-0 grid place-items-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
                      <ZoomIn className="size-5" />
                    </span>
                  </span>
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