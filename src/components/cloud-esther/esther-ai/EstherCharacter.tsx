import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useCallback } from "react";
import { estherPoses, estherStates, type EstherState } from "./esther-states";

type Props = {
  state: EstherState;
  compact?: boolean;
};

export function EstherCharacter({ state, compact }: Props) {
  const config = estherStates[state];
  const pose = estherPoses[config.pose];

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, { stiffness: 60, damping: 18 });
  const springY = useSpring(pointerY, { stiffness: 60, damping: 18 });
  const parallaxX = useTransform(springX, [-1, 1], [-10, 10]);
  const parallaxY = useTransform(springY, [-1, 1], [-7, 7]);

  const handlePointer = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      pointerX.set(((event.clientX - rect.left) / rect.width) * 2 - 1);
      pointerY.set(((event.clientY - rect.top) / rect.height) * 2 - 1);
    },
    [pointerX, pointerY],
  );

  const resetPointer = useCallback(() => {
    pointerX.set(0);
    pointerY.set(0);
  }, [pointerX, pointerY]);

  return (
    <div
      className="relative flex h-full w-full items-end justify-center"
      onPointerMove={handlePointer}
      onPointerLeave={resetPointer}
    >
      <motion.div
        className="relative flex h-full w-full items-end justify-center"
        style={{ x: parallaxX, y: parallaxY }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.img
            key={config.pose}
            src={pose.url}
            alt={pose.alt}
            draggable={false}
            className={
              compact
                ? "h-[220px] w-auto select-none object-contain"
                : "h-[62vh] max-h-[560px] w-auto select-none object-contain"
            }
            style={{
              filter: `drop-shadow(0 22px 40px oklch(0.12 0.05 288 / 65%)) drop-shadow(0 0 ${
                14 + config.glow * 28
              }px color-mix(in oklab, var(--violet-soft) ${Math.round(
                30 + config.glow * 45,
              )}%, transparent))`,
              animation: "esther-breathe 6.5s ease-in-out infinite",
            }}
            initial={{ opacity: 0, scale: 0.965, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: config.scale, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.98, filter: "blur(12px)" }}
            transition={{ duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }}
          />
        </AnimatePresence>
      </motion.div>

      <motion.div
        className="pointer-events-none absolute bottom-2 left-1/2 h-6 w-[46%] -translate-x-1/2 rounded-[50%]"
        style={{ background: "var(--gradient-esther)", filter: "blur(18px)" }}
        animate={{ opacity: 0.25 + config.glow * 0.35 }}
        transition={{ duration: 1 }}
      />
    </div>
  );
}
