import { useState } from "react";
import {
  Sparkles,
  Send,
  Mic,
  Stethoscope,
  ClipboardList,
  History,
  Image,
  FileText,
  Search,
} from "lucide-react";

type Props = {
  onToast: (msg: string) => void;
};

const SUGERENCIAS = [
  "Analizar diente",
  "Revisar odontograma",
  "Buscar información",
  "Analizar diagnóstico",
  "Revisar tratamiento",
  "Ver historial",
  "Revisar imágenes",
  "Resumir evolución",
];

const CARD =
  "rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)]";

const ICONOS_SUGERENCIAS = {
  "Analizar diente": Stethoscope,
  "Revisar odontograma": ClipboardList,
  "Buscar información": Search,
  "Analizar diagnóstico": Stethoscope,
  "Revisar tratamiento": ClipboardList,
  "Ver historial": History,
  "Revisar imágenes": Image,
  "Resumir evolución": FileText,
};

export function EstherAIChat({ onToast }: Props) {
  const [mensaje, setMensaje] = useState("");

  const enviar = (texto: string) => {
    if (!texto.trim()) return;

    onToast(
      "Esther AI todavía no está conectada — esto es una vista previa",
    );

    setMensaje("");
  };

  const usarMicrofono = () => {
    onToast(
      "La entrada por voz de Esther AI estará disponible cuando conectemos el reconocimiento de voz.",
    );
  };

  return (
    <div className={CARD}>
      <div className="flex items-center gap-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
          <Sparkles className="size-4" />
        </span>

        <div>
          <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            Esther AI

            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              Beta
            </span>
          </p>

          <p className="text-[11px] text-muted-foreground">
            Tu asistente inteligente
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-muted/40 p-3 text-xs text-foreground">
        ¿Querés que analice este diente o te ayude con alguna tarea?
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {SUGERENCIAS.map((s) => {
          const Icon =
            ICONOS_SUGERENCIAS[
              s as keyof typeof ICONOS_SUGERENCIAS
            ];

          return (
            <button
              key={s}
              type="button"
              onClick={() => enviar(s)}
              className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/60"
            >
              {Icon && <Icon className="size-3" />}
              {s}
            </button>
          );
        })}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(mensaje);
        }}
        className="mt-3 flex items-center gap-2"
      >
        <div className="flex h-9 flex-1 items-center rounded-full border border-border bg-background focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10">
          <input
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Escribí tu consulta..."
            className="min-w-0 flex-1 bg-transparent px-3.5 text-xs outline-none placeholder:text-muted-foreground"
          />

          <button
            type="button"
            onClick={usarMicrofono}
            title="Hablar con Esther AI"
            className="mr-1 grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <Mic className="size-4" />
          </button>
        </div>

        <button
          type="submit"
          title="Enviar consulta"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}