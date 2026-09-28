import { motion } from "framer-motion";
import { estherQuickActions, type EstherQuickAction } from "@/lib/cloud-esther/esther-ai";

type Props = {
  disabled?: boolean;
  onAction: (action: EstherQuickAction) => void;
};

export function EstherQuickActions({ disabled, onAction }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
      {estherQuickActions.map((action) => (
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
  );
}