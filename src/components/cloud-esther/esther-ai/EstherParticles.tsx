import { useMemo } from "react";
import { motion } from "framer-motion";

type Props = {
  count: number;
  drift: number;
  dataFlow: boolean;
  compact?: boolean;
};

type Particle = {
  x: number;
  y: number;
  size: number;
  delay: number;
  travel: number;
};

function seeded(index: number, salt: number) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

export function EstherParticles({ count, drift, dataFlow, compact }: Props) {
  const total = compact ? Math.round(count * 0.5) : count;

  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: total }, (_, i) => ({
        x: 8 + seeded(i, 1) * 84,
        y: 12 + seeded(i, 2) * 80,
        size: 2 + seeded(i, 3) * 3.5,
        delay: seeded(i, 4) * 4,
        travel: 14 + seeded(i, 5) * 26,
      })),
    [total],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {particles.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: "var(--cyan-soft)",
            boxShadow: "0 0 8px color-mix(in oklab, var(--cyan-core) 70%, transparent)",
          }}
          animate={{
            y: [0, -p.travel, 0],
            opacity: [0, 0.7, 0],
          }}
          transition={{
            duration: (7 + (i % 5)) / Math.max(drift, 0.35),
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {dataFlow && (
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="esther-line" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--violet-soft)" stopOpacity="0" />
              <stop offset="50%" stopColor="var(--cyan-core)" stopOpacity="0.55" />
              <stop offset="100%" stopColor="var(--violet-soft)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[22, 44, 66, 82].map((y, i) => (
            <motion.line
              key={y}
              x1="6"
              y1={y}
              x2="94"
              y2={y - 8}
              stroke="url(#esther-line)"
              strokeWidth="0.35"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: [0, 1, 1], opacity: [0, 0.8, 0] }}
              transition={{
                duration: 3.4 / Math.max(drift, 0.5),
                delay: i * 0.45,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </svg>
      )}
    </div>
  );
}