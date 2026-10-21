import { Link } from "@tanstack/react-router";
import {
  AnimatePresence,
  motion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import type { MotionValue } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  MessageCircle,
  Search,
  Send,
  Stethoscope,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/* =========================================================
   CONSTANTES
========================================================= */
const BASE_W = 760; // ancho de la laptop (px de diseño)
const LID_H = 470; // alto de la tapa (px de diseño)
const OPEN = 4; // grados con la tapa abierta
const CLOSED = -89; // grados con la tapa cerrada

const TOOTH_D =
  "M23 14 C17.5 14 14 18 14 23.5 C14 28 15.6 31 17 35.5 C18.6 40.5 18.6 47 20.6 50 C22.2 52.4 25.2 51.6 26 48.4 C27 44.4 28.4 40.6 32 40.6 C35.6 40.6 37 44.4 38 48.4 C38.8 51.6 41.8 52.4 43.4 50 C45.4 47 45.4 40.5 47 35.5 C48.4 31 50 28 50 23.5 C50 18 46.5 14 41 14 C37.6 14 35 15.6 32 15.6 C29 15.6 26.4 14 23 14 Z";

const SCREENS = [
  { key: "agenda", label: "Agenda", icon: CalendarDays },
  { key: "odontograma", label: "Odontograma 3D", icon: Stethoscope },
  { key: "automatizaciones", label: "Automatizaciones", icon: Workflow },
  { key: "reportes", label: "Reportes", icon: BarChart3 },
  { key: "infinity", label: "Esther Infinity", icon: Bot },
] as const;

const SPARKS = [
  { left: "6%", size: 6, delay: "0s", duration: "9s" },
  { left: "18%", size: 4, delay: "2.4s", duration: "8s" },
  { left: "31%", size: 7, delay: "4.2s", duration: "10s" },
  { left: "44%", size: 5, delay: "1.2s", duration: "8.5s" },
  { left: "57%", size: 6, delay: "3.4s", duration: "9.5s" },
  { left: "69%", size: 4, delay: "0.7s", duration: "8s" },
  { left: "81%", size: 6, delay: "2.9s", duration: "9s" },
  { left: "93%", size: 5, delay: "5s", duration: "10s" },
];

/* =========================================================
   CSS (3D de la laptop + animaciones livianas)
========================================================= */
const css = `
.lc-bg {
  background-image: linear-gradient(115deg, #3b1578 0%, #5b21b6 22%, #7c3aed 44%, #a259ec 64%, #6d28d9 82%, #3b1578 100%);
  background-size: 300% 100%;
  animation: lc-flow 16s ease-in-out infinite alternate;
}
@keyframes lc-flow { from { background-position: 0% 50%; } to { background-position: 100% 50%; } }

.lc-spark { opacity: 0; animation: lc-rise 9s linear infinite; }
@keyframes lc-rise {
  0% { transform: translateY(0) scale(.6); opacity: 0; }
  15% { opacity: .85; }
  100% { transform: translateY(-640px) scale(1.1); opacity: 0; }
}

.lc-text {
  background-image: linear-gradient(110deg, #fff 0%, #fff 35%, #f5c2ff 50%, #fff 65%, #fff 100%);
  background-size: 250% 100%;
  -webkit-background-clip: text; background-clip: text; color: transparent;
  animation: lc-shimmer 4.5s ease-in-out infinite alternate;
}
@keyframes lc-shimmer { from { background-position: 0% 50%; } to { background-position: 100% 50%; } }

.lc-btn-glow { animation: lc-btn 2.4s ease-out infinite; }
@keyframes lc-btn {
  0% { box-shadow: 0 0 0 0 rgba(255,255,255,.55); }
  100% { box-shadow: 0 0 0 18px rgba(255,255,255,0); }
}

/* ---------- LAPTOP 3D ---------- */
.lc-persp { width: 100%; height: 100%; perspective: 2200px; perspective-origin: 50% 30%; }
.lc-laptop {
  position: relative; width: 100%; height: 100%;
  transform-style: preserve-3d; transform: rotateX(14deg) translateY(-30px);
}
.lc-lid { position: absolute; inset: 0; transform-style: preserve-3d; will-change: transform; }
.lc-face {
  position: absolute; inset: 0; border-radius: 18px 18px 8px 8px;
  backface-visibility: hidden; -webkit-backface-visibility: hidden;
}
.lc-front {
  background: linear-gradient(160deg, #1d1236, #0a0616);
  padding: 12px 12px 16px; border: 2px solid #5b4a86;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.06);
}
.lc-back {
  transform: rotateY(180deg);
  background: linear-gradient(145deg, #efe8ff, #bba8ec 55%, #8d76d6);
  display: grid; place-items: center;
}
.lc-bezel { position: relative; width: 100%; height: 100%; border-radius: 8px; overflow: hidden; background: #faf7ff; }
.lc-cam {
  position: absolute; top: 4px; left: 50%; width: 5px; height: 5px; margin-left: -2.5px;
  border-radius: 50%; background: #1d1236; box-shadow: 0 0 0 1px #4c3a7a; z-index: 5;
}
.lc-reflect {
  position: absolute; inset: 0; z-index: 4; pointer-events: none;
  background: linear-gradient(115deg, transparent 38%, rgba(255,255,255,.14) 46%, transparent 54%);
  background-size: 250% 100%;
  animation: lc-sheen 7s ease-in-out infinite;
}
@keyframes lc-sheen { 0% { background-position: 120% 0; } 60%, 100% { background-position: -80% 0; } }

.lc-base {
  position: absolute; left: -3.5%; top: 100%; width: 107%; height: 290px;
  transform-origin: 50% 0; transform: rotateX(90deg);
  border-radius: 4px 4px 28px 28px;
  background: linear-gradient(180deg, #ece4ff, #b9a5ec);
  box-shadow: 0 50px 80px rgba(20, 5, 60, .55);
}
.lc-base::before {
  content: ""; position: absolute; left: 0; right: 0; top: 0; height: 12px;
  border-radius: 4px 4px 0 0; background: linear-gradient(180deg, #5b4a86, #8f7bc4);
}
.lc-keys {
  position: absolute; inset: 30px 7% 96px; border-radius: 8px;
  background-image: repeating-linear-gradient(90deg, rgba(61,38,120,.6) 0 30px, transparent 30px 34px);
  -webkit-mask-image: repeating-linear-gradient(180deg, #000 0 22px, transparent 22px 27px);
  mask-image: repeating-linear-gradient(180deg, #000 0 22px, transparent 22px 27px);
}
.lc-pad {
  position: absolute; left: 35%; right: 35%; bottom: 26px; height: 56px; border-radius: 10px;
  background: rgba(76, 58, 122, .12); border: 1px solid rgba(76, 58, 122, .25);
}

/* ---------- PANTALLA ---------- */
.lc-flow-dot {
  position: absolute; top: -2px; left: 0; width: 22px; height: 6px; border-radius: 9px;
  background: linear-gradient(90deg, transparent, #a855f7, transparent);
  animation: lc-dot 1.8s linear infinite;
}
@keyframes lc-dot { from { transform: translateX(-24px); } to { transform: translateX(70px); } }

@media (prefers-reduced-motion: reduce) {
  .lc-bg, .lc-spark, .lc-text, .lc-btn-glow, .lc-reflect, .lc-flow-dot { animation: none; }
  .lc-spark { display: none; }
}
`;

/* =========================================================
   DIENTE
========================================================= */
function ToothIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="12 12 40 42" className={className} fill="none" aria-hidden="true">
      <path fill="currentColor" d={TOOTH_D} />
    </svg>
  );
}

/* =========================================================
   TARJETITA FLOTANTE (a los costados de la laptop)
========================================================= */
function FloatChip({
  icon: Icon,
  text,
  className,
  delay,
  opacity,
}: {
  icon: LucideIcon;
  text: string;
  className: string;
  delay: number;
  opacity: MotionValue<number>;
}) {
  return (
    <motion.div style={{ opacity }} className={`absolute z-30 hidden lg:block ${className}`}>
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5 + delay, repeat: Infinity, ease: "easeInOut", delay }}
        className="flex items-center gap-2 rounded-2xl border border-white/50 bg-white/90 px-3 py-2 text-xs font-semibold text-violet-900 shadow-[0_16px_40px_rgba(30,10,80,0.35)] backdrop-blur transition-transform duration-300 hover:scale-105"
      >
        <span className="grid size-6 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
          <Icon className="size-3.5" />
        </span>
        {text}
        <span className="size-1.5 rounded-full bg-emerald-400" />
      </motion.div>
    </motion.div>
  );
}

/* =========================================================
   PANELES DE LA PANTALLA
========================================================= */
function Panel({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 p-3"
    >
      {children}
    </motion.div>
  );
}

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const BLOCKS = [
  { d: 0, r: 0, h: 2, t: "Control", c: "from-violet-500 to-purple-600" },
  { d: 1, r: 1, h: 1, t: "Limpieza", c: "from-fuchsia-500 to-pink-500" },
  { d: 2, r: 0, h: 1, t: "Ortodoncia", c: "from-purple-500 to-violet-600" },
  { d: 3, r: 2, h: 2, t: "Endodoncia", c: "from-violet-600 to-indigo-500" },
  { d: 4, r: 1, h: 2, t: "Implante", c: "from-fuchsia-500 to-violet-600" },
  { d: 5, r: 0, h: 1, t: "Blanqueamiento", c: "from-purple-500 to-fuchsia-500" },
  { d: 1, r: 3, h: 1, t: "Revisión", c: "from-violet-500 to-purple-500" },
  { d: 2, r: 3, h: 1, t: "Prótesis", c: "from-indigo-500 to-violet-500" },
];

function AgendaPanel() {
  return (
    <Panel>
      <div className="flex h-full flex-col">
        <div className="mb-1.5 ml-8 grid grid-cols-6 text-center text-[9px] font-semibold text-violet-700/70">
          {DAYS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="relative flex-1 pl-8">
          <div className="absolute inset-y-0 left-0 flex w-7 flex-col justify-between py-1 text-[8px] text-violet-400">
            {["9:00", "10:00", "11:00", "12:00", "13:00"].map((h) => (
              <span key={h}>{h}</span>
            ))}
          </div>
          <div
            className="relative h-full overflow-hidden rounded-xl border border-violet-200/70 bg-white"
            style={{
              backgroundImage:
                "repeating-linear-gradient(180deg, transparent 0 calc(20% - 1px), rgba(167,139,250,.22) calc(20% - 1px) 20%), repeating-linear-gradient(90deg, transparent 0 calc(16.666% - 1px), rgba(167,139,250,.18) calc(16.666% - 1px) 16.666%)",
            }}
          >
            {BLOCKS.map((b, i) => (
              <motion.div
                key={`${b.d}-${b.r}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 + i * 0.1, duration: 0.35 }}
                className={`absolute rounded-lg bg-gradient-to-br ${b.c} p-1.5 text-[8px] font-semibold text-white shadow-md`}
                style={{
                  left: `calc(${(b.d / 6) * 100}% + 3px)`,
                  width: `calc(${100 / 6}% - 6px)`,
                  top: `calc(${(b.r / 5) * 100}% + 3px)`,
                  height: `calc(${(b.h / 5) * 100}% - 6px)`,
                }}
              >
                {b.t}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

const STATUS_COLORS: Record<string, string> = {
  sano: "#ffffff",
  tratamiento: "#a78bfa",
  caries: "#f9a8d4",
  seguimiento: "#67e8f9",
};
const UPPER = ["sano", "sano", "seguimiento", "sano", "tratamiento", "sano", "sano", "caries", "sano", "sano", "tratamiento", "sano"];
const LOWER = ["sano", "sano", "sano", "caries", "sano", "sano", "sano", "seguimiento", "sano", "tratamiento", "sano", "sano"];

function OdontogramaPanel() {
  const teeth = [
    ...UPPER.map((s, i) => ({ s, i, upper: true })),
    ...LOWER.map((s, i) => ({ s, i, upper: false })),
  ];
  return (
    <Panel>
      <div className="flex h-full flex-col rounded-2xl border border-violet-200 bg-white/80 p-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-semibold text-violet-700">
            Vista 3D · FDI
          </span>
          <span className="text-[9px] text-violet-400">32 piezas</span>
        </div>
        <svg viewBox="0 0 420 220" className="min-h-0 flex-1" aria-hidden="true">
          <defs>
            <linearGradient id="lc-scan" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#a855f7" stopOpacity="0" />
              <stop offset="0.5" stopColor="#a855f7" stopOpacity="0.28" />
              <stop offset="1" stopColor="#a855f7" stopOpacity="0" />
            </linearGradient>
          </defs>
          {teeth.map(({ s, i, upper }, k) => {
            const u = (i - 5.5) / 5.5;
            const x = 45 + i * 30;
            const y = upper ? 100 - 30 * (1 - u * u) : 125 + 30 * (1 - u * u);
            const rot = upper ? u * 16 : -u * 16;
            const sy = upper ? -0.62 : 0.62;
            return (
              <motion.g
                key={`${upper ? "u" : "l"}${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: k * 0.03 }}
              >
                {s !== "sano" && (
                  <motion.circle
                    cx={x}
                    cy={y}
                    r={15}
                    fill={STATUS_COLORS[s]}
                    animate={{ opacity: [0.12, 0.45, 0.12] }}
                    transition={{ duration: 2.2, repeat: Infinity, delay: (k % 5) * 0.3 }}
                  />
                )}
                <g transform={`translate(${x} ${y}) rotate(${rot}) scale(0.62 ${sy}) translate(-32 -33)`}>
                  <path d={TOOTH_D} fill={STATUS_COLORS[s]} stroke="#8b5cf6" strokeWidth={1.6} strokeOpacity={0.6} />
                </g>
              </motion.g>
            );
          })}
          <motion.rect
            y={30}
            width={46}
            height={160}
            fill="url(#lc-scan)"
            animate={{ x: [-46, 420] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
          />
        </svg>
        <div className="flex items-center justify-center gap-3 text-[8px] text-violet-700/80">
          {[
            ["Sano", "#ffffff"],
            ["En tratamiento", "#a78bfa"],
            ["Caries", "#f9a8d4"],
            ["Seguimiento", "#67e8f9"],
          ].map(([l, c]) => (
            <span key={l} className="flex items-center gap-1">
              <span className="size-2 rounded-full border border-violet-300" style={{ background: c }} />
              {l}
            </span>
          ))}
        </div>
      </div>
    </Panel>
  );
}

const FLOW = [
  { icon: CalendarDays, t: "Turno agendado", s: "Dispara el flujo" },
  { icon: MessageCircle, t: "Aviso por WhatsApp", s: "Recordatorio automático" },
  { icon: CheckCircle2, t: "Confirmación", s: "El paciente responde" },
  { icon: Bot, t: "Esther Infinity", s: "Reprograma y avisa" },
];
const RULES = ["Recordatorios de turnos", "Seguimiento post-tratamiento", "Reactivación de pacientes"];

function AutomatizacionesPanel() {
  return (
    <Panel>
      <div className="flex h-full flex-col rounded-2xl border border-violet-200 bg-white/80 p-3">
        <div className="mt-2 flex items-center">
          {FLOW.map((n, i) => {
            const Icon = n.icon;
            return (
              <div key={n.t} className="flex items-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + i * 0.18 }}
                  className="w-[104px] rounded-xl border border-violet-200 bg-white p-2 text-center shadow-[0_8px_20px_rgba(124,58,237,0.12)]"
                >
                  <div className="mx-auto grid size-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                    <Icon className="size-4" />
                  </div>
                  <p className="mt-1.5 text-[9px] font-bold text-violet-950">{n.t}</p>
                  <p className="text-[8px] text-violet-500">{n.s}</p>
                </motion.div>
                {i < FLOW.length - 1 && (
                  <div className="relative mx-1 h-0.5 w-[40px] overflow-hidden rounded bg-violet-200">
                    <span className="lc-flow-dot" style={{ animationDelay: `${i * 0.4}s` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 space-y-2">
          {RULES.map((r, i) => (
            <motion.div
              key={r}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + i * 0.12 }}
              className="flex items-center justify-between rounded-lg border border-violet-100 bg-violet-50/70 px-3 py-2"
            >
              <span className="text-[10px] font-medium text-violet-900">{r}</span>
              <span className="flex items-center gap-1.5 text-[8px] font-semibold text-violet-600">
                Activo
                <span className="relative h-3.5 w-6 rounded-full bg-violet-500">
                  <span className="absolute right-0.5 top-0.5 size-2.5 rounded-full bg-white" />
                </span>
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

const BARS = [38, 55, 44, 70, 62, 86, 74, 95];
const STATS = [
  { l: "Turnos", d: "M0 22 L14 16 L28 19 L42 9 L56 12 L70 3" },
  { l: "Ocupación", d: "M0 18 L14 20 L28 12 L42 14 L56 7 L70 5" },
  { l: "Facturación", d: "M0 21 L14 15 L28 17 L42 8 L56 10 L70 2" },
];

function ReportesPanel() {
  return (
    <Panel>
      <div className="flex h-full flex-col gap-2.5">
        <div className="grid grid-cols-3 gap-2">
          {STATS.map((s, i) => (
            <div key={s.l} className="rounded-xl border border-violet-200 bg-white p-2">
              <p className="text-[9px] font-semibold text-violet-700">{s.l}</p>
              <svg viewBox="0 0 70 26" className="mt-1 h-6 w-full">
                <motion.path
                  d={s.d}
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.1, delay: 0.2 + i * 0.15 }}
                />
              </svg>
            </div>
          ))}
        </div>
        <div className="flex flex-1 flex-col rounded-2xl border border-violet-200 bg-white/80 p-3">
          <p className="text-[10px] font-bold text-violet-950">Evolución de la clínica</p>
          <div className="mt-2 flex flex-1 items-end gap-3 border-b border-violet-100 pb-1">
            {BARS.map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ duration: 0.7, delay: 0.2 + i * 0.08, ease: "easeOut" }}
                className="flex-1 rounded-t-md bg-gradient-to-t from-violet-600 to-fuchsia-400"
              />
            ))}
          </div>
          <div className="mt-1 flex gap-3 text-center text-[8px] text-violet-400">
            {BARS.map((_, i) => (
              <span key={i} className="flex-1">
                S{i + 1}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function InfinityPanel() {
  return (
    <Panel>
      <div className="flex h-full flex-col rounded-2xl border border-violet-200 bg-white/80 p-3">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2.4, repeat: Infinity }}
            className="grid size-8 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#c4b5fd,#7c3aed_70%)] text-white shadow-[0_6px_16px_rgba(124,58,237,0.4)]"
          >
            <Bot className="size-4" />
          </motion.div>
          <div>
            <p className="text-[11px] font-bold text-violet-950">Esther Infinity</p>
            <p className="text-[8px] text-violet-500">Tu asistente con inteligencia artificial</p>
          </div>
        </div>

        <div className="mt-3 flex-1 space-y-2.5">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="ml-auto w-fit max-w-[75%] rounded-2xl rounded-br-sm bg-violet-600 px-3 py-1.5 text-[10px] text-white"
          >
            ¿Cómo viene la semana en la clínica?
          </motion.div>

          <div className="relative min-h-[84px]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 1, 0] }}
              transition={{ delay: 0.8, duration: 1.1, times: [0, 0.1, 0.85, 1] }}
              className="absolute left-0 top-0 flex gap-1 rounded-2xl rounded-bl-sm bg-violet-100 px-3 py-2"
            >
              {[0, 1, 2].map((d) => (
                <motion.span
                  key={d}
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: d * 0.12 }}
                  className="size-1.5 rounded-full bg-violet-500"
                />
              ))}
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.9 }}
              className="absolute left-0 top-0 max-w-[85%] rounded-2xl rounded-bl-sm border border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 px-3 py-2 text-[10px] leading-relaxed text-violet-950"
            >
              Tenés la agenda casi completa. Encontré huecos el jueves y ya dejé listos los recordatorios
              automáticos. ¿Los envío?
            </motion.div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {["Enviar recordatorios", "Ver huecos", "Resumen clínico"].map((c, i) => (
              <motion.span
                key={c}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 2.3 + i * 0.12 }}
                className="rounded-full border border-violet-300 bg-white px-2.5 py-1 text-[9px] font-semibold text-violet-700"
              >
                {c}
              </motion.span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1.5">
          <span className="flex-1 text-[9px] text-violet-400">Preguntale a Esther Infinity…</span>
          <span className="grid size-5 place-items-center rounded-full bg-violet-600 text-white">
            <Send className="size-2.5" />
          </span>
        </div>
      </div>
    </Panel>
  );
}

/* =========================================================
   PANTALLA DEL DEMO (cambia sola en bucle infinito)
========================================================= */
function DemoScreen() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setI((v) => (v + 1) % SCREENS.length), 3800);
    return () => window.clearInterval(id);
  }, []);

  const cur = SCREENS[i];

  return (
    <div className="flex h-full w-full bg-[#faf7ff] text-violet-950">
      {/* Sidebar */}
      <div className="flex w-[148px] shrink-0 flex-col bg-gradient-to-b from-[#2e1065] to-[#4c1d95] p-3 text-white">
        <div className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-full bg-white text-violet-600">
            <ToothIcon className="size-3.5" />
          </span>
          <span className="text-[11px] font-bold">Cloud Esther</span>
        </div>
        <div className="mt-4 space-y-1">
          {SCREENS.map((s, idx) => {
            const Icon = s.icon;
            const on = idx === i;
            return (
              <div
                key={s.key}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] transition-all duration-500 ${
                  on ? "bg-white/18 font-semibold shadow-[inset_2px_0_0_#e879f9]" : "text-white/65"
                }`}
              >
                <Icon className="size-3.5" />
                {s.label}
              </div>
            );
          })}
        </div>
        <div className="mt-auto rounded-lg bg-white/10 p-2 text-[8px] leading-snug text-white/75">
          Plan activo con todos los módulos
        </div>
      </div>

      {/* Contenido */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-violet-100 bg-white/70 px-3">
          <span className="text-[11px] font-bold">{cur.label}</span>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full border border-violet-200 bg-white px-2 py-1 text-[8px] text-violet-400">
              <Search className="size-2.5" /> Buscar
            </span>
            <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-2 py-1 text-[8px] font-semibold text-white">
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.6, repeat: Infinity }}
                className="size-1.5 rounded-full bg-white"
              />
              Esther Infinity
            </span>
          </div>
        </div>
        <div className="relative flex-1">
          <AnimatePresence mode="wait">
            {cur.key === "agenda" && <AgendaPanel key="agenda" />}
            {cur.key === "odontograma" && <OdontogramaPanel key="odontograma" />}
            {cur.key === "automatizaciones" && <AutomatizacionesPanel key="automatizaciones" />}
            {cur.key === "reportes" && <ReportesPanel key="reportes" />}
            {cur.key === "infinity" && <InfinityPanel key="infinity" />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SECCIÓN CTA CON LAPTOP (se cierra al bajar, se abre al subir)
========================================================= */
export function LaptopCta() {
  const sectionRef = useRef<HTMLElement>(null);
  const [scale, setScale] = useState(1);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // Tapa abierta al principio, cerrada justo cuando el marco se despega (sin tramo muerto).
  const rawAngle = useTransform(scrollYProgress, [0, 0.08, 0.92, 1], [OPEN, OPEN, CLOSED, CLOSED]);
  const angle = useSpring(rawAngle, { stiffness: 110, damping: 22, mass: 0.6 });
  const glow = useTransform(angle, [CLOSED, OPEN], [0.15, 1]);
  const chipOpacity = useTransform(angle, [CLOSED, -40, OPEN], [0, 0, 1]);
  const hint = useTransform(scrollYProgress, [0, 0.08], [1, 0]);

  useEffect(() => {
    const calc = () => {
      const frameW = Math.min(window.innerWidth - 24, 1152);
      const frameH = Math.max(600, window.innerHeight - 32);
      const byW = (frameW - 56) / (BASE_W + 40);
      const byH = (frameH - 260) / (LID_H + 70);
      setScale(Math.max(0.35, Math.min(1.5, byW, byH)));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  return (
    <section ref={sectionRef} className="relative h-[190vh] px-3 pb-8 sm:px-5">
      <style>{css}</style>

      <div className="lc-bg sticky top-4 mx-auto flex h-[calc(100vh-2rem)] min-h-[600px] max-w-6xl flex-col items-center justify-between overflow-hidden rounded-[2rem] px-5 py-6 text-center shadow-[0_25px_70px_rgba(59,21,120,0.35)]">
        {/* Fondo decorativo */}
        <motion.div
          aria-hidden="true"
          animate={{ x: [0, 50, -20, 0], y: [0, 30, 55, 0], scale: [1, 1.18, 0.94, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute -left-32 -top-32 size-[380px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.22) 0%, transparent 70%)" }}
        />
        <motion.div
          aria-hidden="true"
          animate={{ x: [0, -55, 25, 0], y: [0, -35, -60, 0], scale: [1, 0.92, 1.16, 1] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute -bottom-32 -right-32 size-[400px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(232,121,249,0.3) 0%, transparent 70%)" }}
        />
        <motion.div
          aria-hidden="true"
          animate={{ y: [0, -16, 0], rotate: [-10, 8, -10] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute left-[5%] top-[14%] hidden text-white/15 md:block"
        >
          <ToothIcon className="size-14" />
        </motion.div>
        <motion.div
          aria-hidden="true"
          animate={{ y: [0, 18, 0], rotate: [12, -8, 12] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute bottom-[18%] right-[5%] hidden text-white/15 md:block"
        >
          <ToothIcon className="size-20" />
        </motion.div>
        {SPARKS.map((s, idx) => (
          <span
            key={idx}
            aria-hidden="true"
            className="lc-spark pointer-events-none absolute bottom-2 rounded-full bg-white shadow-[0_0_14px_rgba(255,255,255,0.9)]"
            style={{ left: s.left, width: s.size, height: s.size, animationDelay: s.delay, animationDuration: s.duration }}
          />
        ))}

        {/* Título */}
        <div className="relative z-20 max-w-3xl">
          <h2 className="text-3xl font-bold tracking-tight text-white lg:text-4xl">
            Empezá a gestionar tu clínica con <span className="lc-text">Cloud Esther</span>
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-white/75">
            Agenda, odontograma 3D, automatizaciones y reportes en un solo lugar.
          </p>
        </div>

        {/* Laptop */}
        <div className="relative z-10 flex w-full flex-1 items-center justify-center">
          <div
            className="relative"
            style={{ width: BASE_W * scale, height: (LID_H + 70) * scale, flex: "none" }}
          >
            <motion.div
              aria-hidden="true"
              style={{ opacity: glow }}
              className="pointer-events-none absolute bottom-0 left-1/2 h-24 w-[80%] -translate-x-1/2 rounded-full bg-fuchsia-300/40 blur-3xl"
            />

            {/* Tarjetitas flotantes */}
            <FloatChip icon={CalendarDays} text="Nuevo turno agendado" className="-left-6 top-[10%]" delay={0} opacity={chipOpacity} />
            <FloatChip icon={MessageCircle} text="Recordatorio enviado" className="-left-10 bottom-[18%]" delay={0.8} opacity={chipOpacity} />
            <FloatChip icon={Stethoscope} text="Odontograma actualizado" className="-right-6 top-[18%]" delay={1.4} opacity={chipOpacity} />
            <FloatChip icon={Bot} text="Esther Infinity activa" className="-right-10 bottom-[12%]" delay={0.4} opacity={chipOpacity} />

            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: BASE_W,
                height: LID_H,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            >
              <motion.div
                animate={{ y: [0, -7, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="h-full w-full"
              >
                <div className="lc-persp">
                  <div className="lc-laptop">
                    <motion.div className="lc-lid" style={{ rotateX: angle, originX: 0.5, originY: 1 }}>
                      <div className="lc-face lc-front">
                        <div className="lc-bezel">
                          <span className="lc-cam" />
                          <DemoScreen />
                          <span className="lc-reflect" />
                        </div>
                      </div>
                      <div className="lc-face lc-back">
                        <div className="grid size-16 place-items-center rounded-full bg-white/60 text-violet-600 shadow-[0_0_40px_rgba(124,58,237,0.45)]">
                          <ToothIcon className="size-9" />
                        </div>
                      </div>
                    </motion.div>

                    <div className="lc-base">
                      <div className="lc-keys" />
                      <div className="lc-pad" />
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Botones + pista de scroll */}
        <div className="relative z-20">
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <div className="lc-btn-glow rounded-xl">
              <Button
                asChild
                size="xl"
                className="w-full rounded-xl bg-white text-primary shadow-lg shadow-black/10 hover:bg-white/90"
              >
                <Link to="/registro">
                  Probar demo
                  <motion.span
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                    className="inline-flex"
                  >
                    <ArrowRight className="size-4" />
                  </motion.span>
                </Link>
              </Button>
            </div>
            <Button
              asChild
              size="xl"
              variant="outline"
              className="rounded-xl border-white/35 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              <Link to="/demostracion">Contratar servicio</Link>
            </Button>
          </div>
          <motion.p
            style={{ opacity: hint }}
            className="mt-2 flex items-center justify-center gap-1 text-[11px] text-white/60"
          >
            Seguí bajando y la compu se cierra
            <motion.span animate={{ y: [0, 3, 0] }} transition={{ duration: 1.3, repeat: Infinity }}>
              <ChevronDown className="size-3.5" />
            </motion.span>
          </motion.p>
        </div>
      </div>
    </section>
  );
}

export default LaptopCta;