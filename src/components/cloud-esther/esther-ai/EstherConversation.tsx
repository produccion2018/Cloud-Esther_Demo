import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ChatMessage } from "./useEstherAI";

type Props = {
  messages: ChatMessage[];
  isBusy: boolean;
  onSend: (text: string) => void;
  onTyping: () => void;
};

export function EstherConversation({ messages, isBusy, onSend, onTyping }: Props) {
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

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
                    : "glass-panel max-w-[90%] rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm leading-relaxed text-foreground"
                }
              >
                {m.author === "esther" && (
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
                    Esther
                  </span>
                )}
                {m.text}
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
          placeholder="Escribile a Esther..."
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
    </div>
  );
}