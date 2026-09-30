import { useState } from "react";
import { motion } from "framer-motion";
import { estherQuickActions, type EstherQuickAction } from "@/lib/cloud-esther/esther-ai";

type Props = {
  disabled?: boolean;
  onAction: (action: EstherQuickAction) => void;
  /** Acciones visibles antes de "Más acciones" (para no llenar la pantalla de botones). */
  visibles?: number;
};

export function EstherQuickActions({ disabled, onAction, visibles = 9 }: Props) {
  const [todas, setTodas] = useState(false);
  const lista = todas ? estherQuickActions : estherQuickActions.slice(0, visibles);
  const ocultas = estherQuickActions.length - visibles;
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
        {lista.map((action) => (
          <motion.button
            key={action.id}
            type="button"
            disabled={disabled === true}
            onClick={() => onAction(action)}
            whileHover={disabled ? {} : { y: -3 }}
            whileTap={disabled ? {} : { scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
            className="glass-panel group rounded-xl px-3 py-3 text-left text-sm font-medium text-foreground transition-colors hover:border-ring/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="block">{action.label}</span>
            <span
              className="mt-2 block h-px w-8 opacity-40 transition-all duration-300 group-hover:w-full group-hover:opacity-90"
              style={{ background: "var(--gradient-esther)" }}
            />
          </motion.button>
        ))}
      </div>
      {ocultas > 0 && (
        <button
          type="button"
          onClick={() => setTodas((v) => !v)}
          className="text-xs font-semibold text-primary hover:underline"
        >
          {todas ? "Menos acciones" : `Más acciones (${ocultas})`}
        </button>
      )}
    </div>
  );
}
