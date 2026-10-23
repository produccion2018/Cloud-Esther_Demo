import type { ReactNode, ReactElement } from "react";
import { motion } from "framer-motion";
import { Check, Bell, ShieldCheck, Sparkles, Building2 } from "lucide-react";

/* Ubicación: src/components/site/ModuloMockups.tsx
   Mini-maquetas animadas (animación infinita) para el panel de características: cada módulo
   muestra algo que lo representa (una mini agenda, una hilera de dientes, un gráfico, etc.).
   Son decorativas (datos de ejemplo), en los colores de Cloud Esther. */

export type MockupKind =
  | "agenda"
  | "people"
  | "odontograma"
  | "documento"
  | "imagen"
  | "grafico"
  | "inventario"
  | "chat"
  | "automatizacion"
  | "ia"
  | "multiempresa"
  | "seguridad";

/** Nombre del módulo → tipo de maqueta. */
export const MOCKUP_POR_MODULO: Record<string, MockupKind> = {
  Pacientes: "people",
  Agenda: "agenda",
  Autoagenda: "agenda",
  Odontograma: "odontograma",
  Periodontograma: "odontograma",
  "Historia clínica": "documento",
  Evoluciones: "documento",
  Consentimientos: "documento",
  "Recetas digitales": "documento",
  "Imágenes y radiografías": "imagen",
  Presupuestos: "grafico",
  Facturación: "grafico",
  "Finanzas y caja": "grafico",
  Inventario: "inventario",
  Laboratorio: "inventario",
  "Reportes y BI": "grafico",
  Recordatorios: "chat",
  "Comunicación y campañas": "chat",
  "Portal del paciente": "chat",
  Automatizaciones: "automatizacion",
  "Mensajería del equipo": "chat",
  "Esther Infinity (IA)": "ia",
  Multiempresa: "multiempresa",
  "Roles y permisos": "seguridad",
  "Equipo profesional": "people",
  Integraciones: "automatizacion",
  "Seguridad y auditoría": "seguridad",
};

const REPEAT = { repeat: Infinity, ease: "easeInOut" as const };

/** Marco común de las maquetas. */
function Marco({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto h-40 w-full max-w-sm overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-card to-lavender/40 p-3 shadow-[0_18px_44px_-26px_rgba(124,58,237,0.6)]">
      {children}
    </div>
  );
}

function Agenda() {
  return (
    <Marco>
      <div className="grid h-full grid-cols-4 gap-1.5">
        {[0, 1, 2, 3].map((c) => (
          <div key={c} className="flex flex-col gap-1.5">
            <div className="h-3 rounded bg-primary/10" />
            {[0, 1, 2].map((r) => (
              <div key={r} className="h-5 rounded bg-foreground/5" />
            ))}
          </div>
        ))}
      </div>
      {/* turno que aparece y se mueve */}
      <motion.div
        className="absolute left-[27%] top-7 w-[20%] rounded-md bg-gradient-to-br from-primary to-fuchsia-500 px-1 py-1 shadow-lg"
        animate={{ y: [0, 28, 0], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 3.2, ...REPEAT }}
      >
        <div className="h-1 w-3/4 rounded bg-white/90" />
        <div className="mt-1 h-1 w-1/2 rounded bg-white/70" />
      </motion.div>
      <motion.div
        className="absolute left-[52%] top-14 w-[20%] rounded-md bg-sky-400/80 px-1 py-1 shadow"
        animate={{ y: [0, -18, 0], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 3.8, ...REPEAT, delay: 0.5 }}
      >
        <div className="h-1 w-2/3 rounded bg-white/90" />
      </motion.div>
    </Marco>
  );
}

function People() {
  return (
    <Marco>
      <div className="flex h-full flex-col justify-center gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="flex items-center gap-2 rounded-xl border border-primary/10 bg-background/70 px-2 py-1.5"
            animate={{ backgroundColor: ["rgba(124,58,237,0)", "rgba(124,58,237,0.08)", "rgba(124,58,237,0)"] }}
            transition={{ duration: 3, ...REPEAT, delay: i * 1 }}
          >
            <span className="size-6 shrink-0 rounded-full bg-gradient-to-br from-primary to-fuchsia-500" />
            <div className="flex-1">
              <div className="h-1.5 w-1/2 rounded bg-foreground/25" />
              <div className="mt-1 h-1.5 w-1/3 rounded bg-foreground/10" />
            </div>
            <span className="size-2 rounded-full bg-emerald-400" />
          </motion.div>
        ))}
      </div>
    </Marco>
  );
}

function Odontograma() {
  const colores = ["#f2ead9", "#3f9fd4", "#9a5a22", "#d9b45b", "#34d399", "#f2ead9", "#a855f7", "#f2ead9"];
  return (
    <Marco>
      <div className="flex h-full flex-col items-center justify-center gap-2">
        {[0, 1].map((fila) => (
          <div key={fila} className="flex gap-1.5">
            {colores.map((col, i) => (
              <motion.span
                key={i}
                className="size-5 rounded-[5px] border border-black/5"
                style={{ background: col }}
                animate={{ scale: [1, 1.18, 1], boxShadow: ["0 0 0 rgba(124,58,237,0)", "0 0 10px rgba(124,58,237,0.5)", "0 0 0 rgba(124,58,237,0)"] }}
                transition={{ duration: 2.6, ...REPEAT, delay: ((fila * 8 + i) % 6) * 0.4 }}
              />
            ))}
          </div>
        ))}
      </div>
    </Marco>
  );
}

function Documento() {
  return (
    <Marco>
      <div className="mx-auto flex h-full w-3/4 flex-col gap-2 rounded-lg border border-primary/10 bg-background/80 p-3 shadow-inner">
        <div className="h-2 w-1/2 rounded bg-primary/40" />
        {[0.9, 0.75, 0.85, 0.6, 0.8].map((w, i) => (
          <motion.div
            key={i}
            className="h-1.5 rounded bg-foreground/15"
            initial={{ width: "10%" }}
            animate={{ width: [`10%`, `${w * 100}%`, `${w * 100}%`, "10%"] }}
            transition={{ duration: 4, ...REPEAT, delay: i * 0.25, times: [0, 0.3, 0.8, 1] }}
          />
        ))}
      </div>
    </Marco>
  );
}

function Imagen() {
  return (
    <Marco>
      <div className="relative mx-auto grid h-full w-3/5 place-items-center overflow-hidden rounded-lg border border-primary/15 bg-gradient-to-br from-slate-800 to-slate-900">
        {/* "radiografía": siluetas de piezas */}
        <div className="flex gap-1">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="h-8 w-3 rounded-t-full bg-white/25" />
          ))}
        </div>
        {/* línea de escaneo infinita */}
        <motion.div
          aria-hidden
          className="absolute inset-x-0 h-6 bg-gradient-to-b from-primary/0 via-primary/50 to-primary/0"
          animate={{ top: ["-10%", "100%"] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
        />
      </div>
    </Marco>
  );
}

function Grafico() {
  const alturas = [0.5, 0.75, 0.45, 0.9, 0.65, 0.8];
  return (
    <Marco>
      <div className="flex h-full items-end justify-center gap-2 px-2 pb-1">
        {alturas.map((h, i) => (
          <motion.div
            key={i}
            className="w-5 rounded-t-md bg-gradient-to-t from-primary to-fuchsia-500"
            animate={{ height: [`${h * 70}%`, `${Math.min(h + 0.2, 1) * 90}%`, `${h * 70}%`] }}
            transition={{ duration: 2.8, ...REPEAT, delay: i * 0.2 }}
          />
        ))}
      </div>
    </Marco>
  );
}

function Inventario() {
  const niveles = [0.8, 0.35, 0.6];
  return (
    <Marco>
      <div className="flex h-full flex-col justify-center gap-2.5 px-2">
        {niveles.map((n, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="size-5 shrink-0 rounded-md bg-gradient-to-br from-primary/80 to-fuchsia-500/80" />
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
              <motion.div
                className={`h-full rounded-full ${n < 0.4 ? "bg-amber-400" : "bg-primary"}`}
                animate={{ width: [`${n * 100}%`, `${Math.max(n - 0.2, 0.1) * 100}%`, `${n * 100}%`] }}
                transition={{ duration: 3.2, ...REPEAT, delay: i * 0.4 }}
              />
            </div>
          </div>
        ))}
      </div>
    </Marco>
  );
}

function Chat() {
  const burbujas = [
    { yo: false, w: "55%" },
    { yo: true, w: "45%" },
    { yo: false, w: "60%" },
  ];
  return (
    <Marco>
      <div className="flex h-full flex-col justify-center gap-2 px-2">
        {burbujas.map((b, i) => (
          <motion.div
            key={i}
            className={`flex ${b.yo ? "justify-end" : "justify-start"}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: [0, 1, 1, 0], y: [8, 0, 0, 8] }}
            transition={{ duration: 4, ...REPEAT, delay: i * 0.6, times: [0, 0.15, 0.85, 1] }}
          >
            <span
              className={`h-5 rounded-2xl ${b.yo ? "bg-gradient-to-br from-primary to-fuchsia-500" : "bg-foreground/10"}`}
              style={{ width: b.w }}
            />
          </motion.div>
        ))}
        <div className="flex items-center gap-1 self-start">
          <Bell className="size-3 text-primary" />
          <span className="text-[9px] font-semibold text-muted-foreground">Enviado por WhatsApp</span>
        </div>
      </div>
    </Marco>
  );
}

function Automatizacion() {
  const nodos = [
    { x: 14, y: 50 },
    { x: 50, y: 24 },
    { x: 50, y: 76 },
    { x: 86, y: 50 },
  ];
  return (
    <Marco>
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full p-2" preserveAspectRatio="none">
        <defs>
          <linearGradient id="mk-auto" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgb(124,58,237)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="rgb(217,70,239)" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        {[1, 2].map((k) => (
          <line key={k} x1="14" y1="50" x2={nodos[k]!.x} y2={nodos[k]!.y} stroke="url(#mk-auto)" strokeWidth="1.2" strokeDasharray="3 4">
            <animate attributeName="stroke-dashoffset" from="14" to="0" dur="1.1s" repeatCount="indefinite" />
          </line>
        ))}
        {[1, 2].map((k) => (
          <line key={k} x1={nodos[k]!.x} y1={nodos[k]!.y} x2="86" y2="50" stroke="url(#mk-auto)" strokeWidth="1.2" strokeDasharray="3 4">
            <animate attributeName="stroke-dashoffset" from="14" to="0" dur="1.1s" repeatCount="indefinite" />
          </line>
        ))}
      </svg>
      {nodos.map((n, i) => (
        <motion.span
          key={i}
          className="absolute grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow-lg"
          style={{ left: `${n.x}%`, top: `${n.y}%` }}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 2, ...REPEAT, delay: i * 0.3 }}
        >
          <Check className="size-3.5" />
        </motion.span>
      ))}
    </Marco>
  );
}

function IA() {
  return (
    <Marco>
      <div className="grid h-full place-items-center">
        {[0, 1].map((r) => (
          <motion.span
            key={r}
            aria-hidden
            className="absolute size-16 rounded-full border border-primary/25"
            animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 3, ...REPEAT, delay: r * 1.2 }}
          />
        ))}
        <motion.span
          aria-hidden
          className="absolute size-20 rounded-full border border-dashed border-primary/25"
          animate={{ rotate: 360 }}
          transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        />
        <motion.span
          className="relative grid size-14 place-items-center rounded-full bg-gradient-to-br from-primary via-violet-600 to-fuchsia-500 text-white shadow-[0_14px_32px_-10px_rgba(124,58,237,0.9)]"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2.6, ...REPEAT }}
        >
          <Sparkles className="size-6" />
        </motion.span>
      </div>
    </Marco>
  );
}

function Multiempresa() {
  const alturas = [0.6, 0.9, 0.7];
  return (
    <Marco>
      <div className="flex h-full items-end justify-center gap-3 pb-2">
        {alturas.map((h, i) => (
          <motion.div
            key={i}
            className="relative w-10 rounded-t-md bg-gradient-to-t from-primary/80 to-fuchsia-500/70"
            style={{ height: `${h * 80}%` }}
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3, ...REPEAT, delay: i * 0.4 }}
          >
            <div className="absolute inset-x-1 top-1 grid grid-cols-2 gap-1">
              {[0, 1, 2, 3].map((w) => (
                <span key={w} className="h-1 rounded-sm bg-white/70" />
              ))}
            </div>
            <Building2 className="absolute -top-4 left-1/2 size-3 -translate-x-1/2 text-primary" />
          </motion.div>
        ))}
      </div>
    </Marco>
  );
}

function Seguridad() {
  return (
    <Marco>
      <div className="grid h-full place-items-center">
        <motion.span
          aria-hidden
          className="absolute size-20 rounded-full border border-primary/20"
          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 3, ...REPEAT }}
        />
        <motion.span
          className="relative grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow-lg"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2.4, ...REPEAT }}
        >
          <ShieldCheck className="size-8" />
        </motion.span>
      </div>
    </Marco>
  );
}

const MAP: Record<MockupKind, () => ReactElement> = {
  agenda: Agenda,
  people: People,
  odontograma: Odontograma,
  documento: Documento,
  imagen: Imagen,
  grafico: Grafico,
  inventario: Inventario,
  chat: Chat,
  automatizacion: Automatizacion,
  ia: IA,
  multiempresa: Multiempresa,
  seguridad: Seguridad,
};

export function ModuloMockup({ nombre }: { nombre: string }) {
  const kind = MOCKUP_POR_MODULO[nombre] ?? "ia";
  const Comp = MAP[kind];
  return <Comp />;
}
