import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, Mic, MicOff, SendHorizontal } from "lucide-react";
import type { ChatMessage } from "./useEstherAI";
import type { Microfono } from "./microfono";
import { EstherBloques } from "./EstherBloques";
import { estherPoses } from "./esther-states";

type Props = {
  messages: ChatMessage[];
  isBusy: boolean;
  onSend: (text: string) => void;
  onTyping: () => void;
  /** Micrófono compartido con el escenario (desde Plus). */
  microfono?: Microfono;
  /** Sugerencias que aparecen arriba del campo de texto. */
  sugerencias?: string[];
  compacto?: boolean;
};

export function EstherConversation({
  messages,
  isBusy,
  onSend,
  onTyping,
  microfono,
  sugerencias = [],
  compacto = false,
}: Props) {
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const escuchando = microfono?.escuchando ?? false;

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, isBusy]);

  const enviar = (t: string) => {
    if (!t.trim()) return;
    onSend(t);
    setDraft("");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div
        ref={scroller}
        className={`scroll-sutil min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 ${compacto ? "min-h-[220px]" : "min-h-[260px]"}`}
        role="log"
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
              className={m.author === "user" ? "flex justify-end" : "flex items-start gap-2"}
            >
              {m.author === "esther" && (
                <span
                  aria-hidden
                  className="mt-0.5 size-8 shrink-0 rounded-full border border-primary/15 bg-gradient-to-b from-primary/10 to-primary/25 bg-no-repeat"
                  style={{
                    backgroundImage: `url(${estherPoses.resting.url})`,
                    backgroundSize: "auto 440%",
                    backgroundPosition: "50% 3%",
                  }}
                />
              )}
              <div
                className={
                  m.author === "user"
                    ? "max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2.5 text-sm text-primary-foreground shadow-[var(--shadow-glow)]"
                    : `whitespace-pre-line rounded-2xl rounded-tl-md border px-3.5 py-2.5 text-sm leading-relaxed text-foreground ${
                        m.resultado === "Sin permiso" || m.resultado === "Fuera del plan"
                          ? "border-amber-200 bg-amber-50/80"
                          : "border-primary/12 bg-card"
                      } ${m.bloques?.length ? "min-w-0 flex-1" : "max-w-[88%]"}`
                }
                style={m.author === "user" ? { background: "var(--gradient-esther)" } : {}}
              >
                {m.author === "esther" && (
                  <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                    Esther
                    {(m.resultado === "Sin permiso" || m.resultado === "Fuera del plan") && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-px text-[9px] tracking-normal text-amber-700">
                        <Lock className="size-2.5" /> {m.resultado}
                      </span>
                    )}
                  </span>
                )}
                {m.text}
                {m.bloques && m.bloques.length > 0 && (
                  <EstherBloques bloques={m.bloques} onPregunta={onSend} />
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isBusy && (
          <div className="flex items-center gap-1.5 pl-10" aria-label="Esther está trabajando">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-primary"
                animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
                transition={{ duration: 1.1, delay: i * 0.15, repeat: Infinity }}
              />
            ))}
          </div>
        )}
      </div>

      {sugerencias.length > 0 && !isBusy && (
        <div className="scroll-sutil -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
          {sugerencias.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => enviar(s)}
              className="shrink-0 rounded-full border border-primary/15 bg-primary/[0.04] px-3 py-1 text-[11px] font-medium text-primary transition hover:bg-primary/10"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          enviar(draft);
        }}
        className={`flex items-end gap-2 rounded-2xl border bg-card p-2 transition ${escuchando ? "border-primary/50 ring-4 ring-primary/10" : "border-primary/15 focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/10"}`}
      >
        <label htmlFor="esther-input" className="sr-only">
          Escribile a Esther
        </label>
        <textarea
          id="esther-input"
          rows={1}
          value={escuchando ? microfono?.parcial || "" : draft}
          readOnly={escuchando}
          placeholder={
            escuchando
              ? "Te escucho…"
              : microfono
                ? "Escribile o hablale a Esther…"
                : "Escribile a Esther…"
          }
          onChange={(event) => {
            setDraft(event.target.value);
            onTyping();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              enviar(draft);
            }
          }}
          className="max-h-28 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        {microfono && (
          <motion.button
            type="button"
            onClick={microfono.alternar}
            disabled={isBusy}
            whileTap={{ scale: 0.94 }}
            aria-label={escuchando ? "Dejar de escuchar" : "Hablarle a Esther"}
            title={escuchando ? "Dejar de escuchar" : "Hablarle a Esther"}
            className={`relative grid size-9 shrink-0 place-items-center rounded-xl border transition-colors disabled:opacity-40 ${escuchando ? "border-transparent text-primary-foreground" : "border-primary/15 text-primary hover:bg-primary/10"}`}
            style={escuchando ? { background: "var(--gradient-esther)" } : {}}
          >
            {escuchando && (
              <span
                className="absolute inset-0 rounded-xl"
                style={{
                  background: "var(--gradient-esther)",
                  animation: "esther-wave 1.4s ease-out infinite",
                }}
              />
            )}
            {escuchando ? <MicOff className="relative size-4" /> : <Mic className="size-4" />}
          </motion.button>
        )}
        <motion.button
          type="submit"
          disabled={isBusy || draft.trim().length === 0}
          whileTap={{ scale: 0.96 }}
          aria-label="Enviar"
          className="grid size-9 shrink-0 place-items-center rounded-xl text-primary-foreground shadow-[var(--shadow-glow)] transition-opacity disabled:opacity-40"
          style={{ background: "var(--gradient-esther)" }}
        >
          <SendHorizontal className="size-4" />
        </motion.button>
      </form>
      {compacto && microfono?.aviso && (
        <p className="px-1 text-[11px] text-amber-700">{microfono.aviso}</p>
      )}
    </div>
  );
}
