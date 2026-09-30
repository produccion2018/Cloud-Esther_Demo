import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { EstherContext, EstherQuickAction } from "@/lib/cloud-esther/esther-ai";
import { EstherCharacter } from "./EstherCharacter";
import { EstherConversation } from "./EstherConversation";
import { EstherGlow } from "./EstherGlow";
import { EstherMessage } from "./EstherMessage";
import { EstherParticles } from "./EstherParticles";
import { EstherQuickActions as EstherQuickActionsBlock } from "./EstherQuickActions";
import { estherStates, type EstherState } from "./esther-states";
import { useEstherAI } from "./useEstherAI";
import "./esther-ai.css";

export type EstherAIProps = {
  state?: EstherState;
  message?: string;
  context?: EstherContext;
  onAction?: (action: EstherQuickAction) => void;
  variant?: "panel" | "compact";
};

export function EstherAI({
  state: controlledState,
  message: controlledMessage,
  context,
  onAction,
  variant = "panel",
}: EstherAIProps) {
  const esther = useEstherAI(context ? { context } : {});
  const state = controlledState ?? esther.state;
  const message = controlledMessage ?? esther.message;
  const config = estherStates[state];
  const compact = variant === "compact";

  const [isSmall, setIsSmall] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsSmall(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const handleAction = (action: EstherQuickAction) => {
    onAction?.(action);
    void esther.send(action.label, action.section);
  };

  if (compact) {
    return (
      <div className="esther-ai glass-panel relative flex items-center gap-4 overflow-hidden rounded-2xl p-4">
        <div className="relative h-[220px] w-[140px] shrink-0">
          <EstherGlow intensity={config.glow} pulseKey={state} />
          <EstherParticles count={config.particles} drift={config.drift} dataFlow={config.dataFlow} compact />
          <EstherCharacter state={state} compact />
        </div>
        <div className="min-w-0">
          <EstherMessage state={state} message={message} />
        </div>
      </div>
    );
  }

  return (
    <section
      className="esther-ai relative min-h-screen w-full overflow-hidden"
      style={{ backgroundImage: "var(--gradient-canvas)" }}
      aria-label="Esther AI"
    >
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-8 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="grid h-10 w-10 place-items-center rounded-xl font-display text-base font-bold text-primary-foreground"
              style={{ background: "var(--gradient-esther)" }}
            >
              E
            </span>
            <div>
              <h1 className="font-display text-lg font-semibold tracking-tight text-foreground">
                Esther AI
              </h1>
              <p className="text-xs text-muted-foreground">
                Inteligencia artificial de Cloud Esther
              </p>
            </div>
          </div>
          <p className="glass-panel rounded-full px-3 py-1.5 text-xs text-muted-foreground">
            Contexto: {esther.section}
          </p>
        </header>

        <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[1.05fr_1fr]">
          <motion.div
            className="glass-panel relative flex min-h-[420px] flex-col justify-end overflow-hidden rounded-3xl p-5"
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <EstherGlow intensity={config.glow} pulseKey={state} />
            <EstherParticles
              count={config.particles}
              drift={config.drift}
              dataFlow={config.dataFlow}
              compact={isSmall}
            />
            <div className="relative flex flex-1 items-end justify-center">
              <EstherCharacter state={state} compact={isSmall} />
            </div>
            <div className="relative pt-5">
              <EstherMessage state={state} message={message} />
            </div>
          </motion.div>

          <motion.div
            className="flex min-h-0 flex-col gap-5"
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <div className="glass-panel flex min-h-[320px] flex-1 flex-col rounded-3xl p-4">
              <EstherConversation
                messages={esther.messages}
                isBusy={esther.isBusy}
                onSend={(text) => void esther.send(text)}
                onTyping={esther.notifyTyping}
              />
            </div>

            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Acciones rápidas
              </h2>
              <EstherQuickActionsBlock disabled={esther.isBusy} onAction={handleAction} />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Esther ya responde con los datos reales de Recursos humanos (asistencia, licencias,
                vencimientos, nómina y vacaciones). Para datos clínicos todavía es una demostración.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}