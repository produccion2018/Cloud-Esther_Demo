import { AnimatePresence, motion } from "framer-motion";
import { estherStates, type EstherState } from "./esther-states";

type Props = {
  state: EstherState;
  message: string;
};

export function EstherMessage({ state, message }: Props) {
  const config = estherStates[state];
  const active = state !== "idle" && state !== "success";

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="glass-panel flex items-center gap-2 rounded-full px-3 py-1.5">
        <span className="relative flex h-2 w-2">
          <span
            className="absolute inset-0 rounded-full"
            style={{ background: "var(--gradient-esther)" }}
          />
          {active && (
            <span
              className="absolute inset-0 rounded-full"
              style={{
                background: "var(--cyan-core)",
                animation: "esther-wave 1.4s ease-out infinite",
              }}
            />
          )}
        </span>
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {config.label}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={message}
          className="max-w-md font-display text-lg leading-snug text-foreground sm:text-xl"
          initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -6, filter: "blur(6px)" }}
          transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
        >
          {message}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}