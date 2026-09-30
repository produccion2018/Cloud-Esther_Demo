import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mic, MicOff } from "lucide-react";
import type { ChatMessage } from "./useEstherAI";
import { EstherBloques } from "./EstherBloques";

type Props = {
  messages: ChatMessage[];
  isBusy: boolean;
  onSend: (text: string) => void;
  onTyping: () => void;
  /** Entrada por voz (desde Plus). */
  voz?: boolean;
};

/* Dictado del navegador (Web Speech API). TODO backend: transcripción del servidor para
   navegadores sin soporte y para audios largos. */
type Reconocedor = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult:
    | ((e: {
        results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
      }) => void)
    | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};
function crearReconocedor(): Reconocedor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => Reconocedor;
    webkitSpeechRecognition?: new () => Reconocedor;
  };
  const C = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return C ? new C() : null;
}

export function EstherConversation({ messages, isBusy, onSend, onTyping, voz = false }: Props) {
  const [draft, setDraft] = useState("");
  const [escuchando, setEscuchando] = useState(false);
  const [avisoVoz, setAvisoVoz] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const rec = useRef<Reconocedor | null>(null);
  const texto = useRef("");

  const microfono = () => {
    if (escuchando) {
      rec.current?.stop();
      return;
    }
    const r = crearReconocedor();
    if (!r) {
      setAvisoVoz(
        "Tu navegador no permite dictar. Probá con Chrome o Edge, o escribí la consulta.",
      );
      return;
    }
    setAvisoVoz("");
    texto.current = "";
    r.lang = "es-AR";
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e) => {
      const partes = Array.from(e.results).map((x) => x[0]?.transcript ?? "");
      texto.current = partes.join(" ").trim();
      setDraft(texto.current);
    };
    r.onerror = (e) => {
      setAvisoVoz(
        e.error === "not-allowed"
          ? "Habilitá el micrófono en el navegador para hablarle a Esther."
          : "No te escuché bien, probá de nuevo.",
      );
    };
    r.onend = () => {
      setEscuchando(false);
      const final = texto.current.replace(/^\s*esther[,:]?\s*/i, "").trim();
      if (final) {
        onSend(final);
        setDraft("");
      }
    };
    rec.current = r;
    setEscuchando(true);
    onTyping();
    r.start();
  };

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, isBusy]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div
        ref={scroller}
        className="min-h-[180px] flex-1 space-y-3 overflow-y-auto pr-1"
        role="log"
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
              className={m.author === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={
                  m.author === "user"
                    ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2.5 text-sm text-primary-foreground shadow-[var(--shadow-glow)]"
                    : `glass-panel whitespace-pre-line rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm leading-relaxed text-foreground ${m.bloques?.length ? "w-full max-w-full" : "max-w-[90%]"}`
                }
              >
                {m.author === "esther" && (
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
                    Esther
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
          <div className="flex items-center gap-1.5 pl-1" aria-label="Esther está trabajando">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-accent"
                animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
                transition={{ duration: 1.1, delay: i * 0.15, repeat: Infinity }}
              />
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSend(draft);
          setDraft("");
        }}
        className="glass-panel flex items-end gap-2 rounded-2xl p-2"
      >
        <label htmlFor="esther-input" className="sr-only">
          Escribile a Esther
        </label>
        <textarea
          id="esther-input"
          rows={1}
          value={draft}
          placeholder={
            escuchando
              ? "Te escucho…"
              : voz
                ? "Escribile o hablale a Esther..."
                : "Escribile a Esther..."
          }
          onChange={(event) => {
            setDraft(event.target.value);
            onTyping();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSend(draft);
              setDraft("");
            }
          }}
          className="max-h-28 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        {voz && (
          <motion.button
            type="button"
            onClick={microfono}
            disabled={isBusy}
            whileTap={{ scale: 0.94 }}
            aria-label={escuchando ? "Dejar de escuchar" : "Hablarle a Esther"}
            title={escuchando ? "Dejar de escuchar" : "Hablarle a Esther"}
            className={`grid size-9 shrink-0 place-items-center rounded-xl border transition-colors disabled:opacity-40 ${escuchando ? "border-transparent text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
            style={
              escuchando
                ? {
                    background: "var(--gradient-esther)",
                    animation: "esther-wave 1.4s ease-out infinite",
                  }
                : {}
            }
          >
            {escuchando ? <MicOff className="size-4" /> : <Mic className="size-4" />}
          </motion.button>
        )}
        <motion.button
          type="submit"
          disabled={isBusy || draft.trim().length === 0}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.96 }}
          className="shrink-0 rounded-xl px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-opacity disabled:opacity-40"
          style={{ background: "var(--gradient-esther)" }}
        >
          Enviar
        </motion.button>
      </form>
      {avisoVoz && <p className="px-1 text-[11px] text-muted-foreground">{avisoVoz}</p>}
    </div>
  );
}
