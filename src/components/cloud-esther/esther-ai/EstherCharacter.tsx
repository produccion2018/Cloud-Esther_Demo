import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useCallback } from "react";
import { AlertTriangle, Check, Mic, Search, Stethoscope } from "lucide-react";
import { estherPoses, estherStates, type EstherPose, type EstherState } from "./esther-states";

type Props = {
  state: EstherState;
  /** Postura elegida según la pregunta (si no, la del estado). */
  pose?: EstherPose;
  compact?: boolean;
  /** Alto máximo del personaje en px (las imágenes se ven nítidas hasta ~420 px). */
  alto?: number;
};

/** Indicador que acompaña a la postura: ondas al escuchar, burbuja al pensar, etc. */
function Indicador({ state, pose }: { state: EstherState; pose: EstherPose }) {
  const base =
    "absolute right-[8%] top-[6%] grid place-items-center rounded-2xl border border-primary/15 bg-card/95 text-primary shadow-[var(--shadow-glow)]";
  if (state === "thinking")
    return (
      <motion.div
        className={`${base} h-9 gap-1 px-3`}
        style={{ display: "flex" }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-1.5 rounded-full bg-primary"
            animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
            transition={{ duration: 1, delay: i * 0.15, repeat: Infinity }}
          />
        ))}
      </motion.div>
    );
  if (state === "listening" || state === "speaking")
    return (
      <motion.div
        className={`${base} h-9 gap-[3px] px-3`}
        style={{ display: "flex" }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        {state === "listening" && <Mic className="mr-1 size-3.5" />}
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="h-4 w-[3px] origin-center rounded-full"
            style={{
              background: "var(--gradient-esther)",
              animation: `esther-bar ${0.7 + (i % 3) * 0.15}s ease-in-out ${i * 0.08}s infinite`,
            }}
          />
        ))}
      </motion.div>
    );
  if (state === "processing" || state === "action") {
    const Icon = pose === "bending" ? Stethoscope : Search;
    return (
      <motion.div
        className={`${base} size-10`}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ animation: "esther-float 1.6s ease-in-out infinite" }}
      >
        <Icon className="size-4" />
      </motion.div>
    );
  }
  if (state === "success")
    return (
      <motion.div
        className={`${base} size-10 border-emerald-200 text-emerald-600`}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <Check className="size-5" />
      </motion.div>
    );
  if (state === "error")
    return (
      <motion.div
        className={`${base} size-10 border-amber-200 text-amber-600`}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <AlertTriangle className="size-4" />
      </motion.div>
    );
  return null;
}

export function EstherCharacter({ state, pose: poseProp, compact, alto = 340 }: Props) {
  const config = estherStates[state];
  const poseId = poseProp ?? config.pose;
  const pose = estherPoses[poseId];
  const h = Math.round((compact ? Math.min(alto, 200) : alto) * pose.alto);

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, { stiffness: 60, damping: 18 });
  const springY = useSpring(pointerY, { stiffness: 60, damping: 18 });
  const parallaxX = useTransform(springX, [-1, 1], [-8, 8]);
  const parallaxY = useTransform(springY, [-1, 1], [-5, 5]);

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
      {(state === "listening" || state === "speaking") && (
        <>
          {[0, 1].map((i) => (
            <span
              key={i}
              className="pointer-events-none absolute bottom-[18%] left-1/2 size-[70%] max-w-[300px] -translate-x-1/2 rounded-full border-2 border-primary/30"
              style={{ animation: `esther-wave 1.8s ease-out ${i * 0.6}s infinite` }}
            />
          ))}
        </>
      )}
      <motion.div
        className="relative flex h-full w-full items-end justify-center"
        style={{ x: parallaxX, y: parallaxY }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.img
            key={poseId}
            src={pose.url}
            alt={pose.alt}
            draggable={false}
            className="relative z-[1] w-auto select-none object-contain"
            style={{
              height: h,
              filter: `drop-shadow(0 18px 24px color-mix(in oklab, var(--primary) 28%, transparent))`,
              animation: "esther-breathe 6.5s ease-in-out infinite",
            }}
            initial={{ opacity: 0, x: poseId === "walking" ? -24 : 0, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: config.scale }}
            exit={{ opacity: 0, x: poseId === "walking" ? 24 : 0, scale: 0.98 }}
            transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
          />
        </AnimatePresence>
        {!compact && <Indicador state={state} pose={poseId} />}
      </motion.div>

      <motion.div
        className="pointer-events-none absolute bottom-1 left-1/2 h-5 w-[42%] -translate-x-1/2 rounded-[50%]"
        style={{ background: "var(--gradient-esther)", filter: "blur(14px)" }}
        animate={{ opacity: 0.18 + config.glow * 0.3 }}
        transition={{ duration: 1 }}
      />
    </div>
  );
}
