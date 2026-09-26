import { useState } from "react";
import { Sparkles, Send } from "lucide-react";

type Props = {
  onToast: (msg: string) => void;
};

const SUGERENCIAS = ["Analizar diente", "Revisar odontograma", "Buscar información"];

const CARD =
  "rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)]";

/* Esther AI: esto es solo la interfaz por ahora — no hay un asistente de IA
   real conectado todavía. Cuando lo tengas (API/modelo), reemplazá el
   contenido de `enviar` por la llamada real; el resto del componente no
   necesita cambiar. */
export function EstherAIChat({ onToast }: Props) {
  const [mensaje, setMensaje] = useState("");

  const enviar = (texto: string) => {
    if (!texto.trim()) return;
    onToast("Esther AI todavía no está conectada — esto es una vista previa");
    setMensaje("");
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
          <p className="text-[11px] text-muted-foreground">Tu asistente inteligente</p>
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-muted/40 p-3 text-xs text-foreground">
        ¿Querés que analice este diente o te ayude con alguna tarea?
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {SUGERENCIAS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => enviar(s)}
            className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/60"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(mensaje);
        }}
        className="mt-3 flex items-center gap-2"
      >
        <input
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          placeholder="Escribí tu consulta..."
          className="h-9 flex-1 rounded-full border border-border bg-background px-3.5 text-xs outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
        />
        <button
          type="submit"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}