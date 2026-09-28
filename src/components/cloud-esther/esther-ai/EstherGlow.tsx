import { motion } from "framer-motion";

type Props = {
  intensity: number;
  pulseKey?: string | number;
};

export function EstherGlow({ intensity, pulseKey }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="esther-halo absolute left-1/2 top-1/2 h-[78%] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        animate={{
          opacity: 0.35 + intensity * 0.55,
          scale: 0.94 + intensity * 0.12,
        }}
        transition={{ duration: 1.1, ease: [0.22, 0.61, 0.36, 1] }}
      />
      <motion.div
        className="absolute left-1/2 top-[58%] h-[34%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-[50%]"
        style={{ background: "var(--gradient-esther)", filter: "blur(52px)" }}
        animate={{ opacity: 0.18 + intensity * 0.3 }}
        transition={{ duration: 1.2, ease: [0.22, 0.61, 0.36, 1] }}
      />
      {pulseKey !== undefined && (
        <span
          key={pulseKey}
          className="absolute left-1/2 top-1/2 h-[60%] w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full border"
          style={{
            borderColor: "color-mix(in oklab, var(--violet-soft) 40%, transparent)",
            animation: "esther-wave 1.6s var(--ease-organic) forwards",
          }}
        />
      )}
    </div>
  );
}