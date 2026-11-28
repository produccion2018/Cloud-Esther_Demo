import { useNivel } from "@/lib/cloud-esther/niveles";
import { Link, createFileRoute } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  CalendarDays,
  CalendarCheck,
  CalendarX,
  Check,
  Clock,
  Globe,
  X,
  Lock,
  Pencil,
  Trash2,
  Users,
  UserPlus,
  ChevronDown,
  Plus,
  Bell,
  BellRing,
  MessageCircle,
  Smartphone,
  Mail,
  Phone,
  ShoppingCart,
  StickyNote,
  Sunrise,
  Sunset,
  MapPin,
  Stethoscope,
  DoorOpen,
  FileClock,
  AlertTriangle,
  FileDown,
  Repeat,
  Hourglass,
  Smile,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { IconoWhatsApp } from "@/components/cloud-esther/IconoWhatsApp";
import { abrirEncuestaWhatsApp, abrirRecordatorioWhatsApp, noQuiereRecordatorios } from "@/lib/clinica/whatsapp";
import { useSesion } from "@/lib/cloud-esther/auth-store";
import { useClinicaReal } from "@/lib/clinica/modo-clinica";
import { toast as avisoWhatsApp } from "sonner";
import type { LucideIcon } from "lucide-react";
import { AppShell } from "@/components/cloud-esther/AppShell";
import { CloudEstherProvider, MODULES, availableIn, useCloudEsther } from "@/lib/cloud-esther/data";
import { storePortal } from "@/lib/cloud-esther/portal-store";
import { recuperarTurno, vencerOfertas } from "@/lib/cloud-esther/recuperacion-turnos";
import { useEquipo } from "@/lib/cloud-esther/equipo-store";
import { fueraDeHorario, sedesDeMiembro, trabajaEnSede } from "@/lib/cloud-esther/equipo-profesional-data";
import { useMisSedes } from "@/lib/cloud-esther/sedes";
import { usePacientes } from "@/lib/cloud-esther/pacientes";
import { useTodosLosRegistros } from "@/components/cloud-esther/PacienteSecciones";
import { normalizarBusqueda as normBusq } from "@/lib/utils";
import {
  GABINETES,
  ODONTOLOGOS,
  SUCURSALES,
  TRATAMIENTOS,
  setBloqueosStore,
  setEsperaStore,
  setRecordatoriosStore,
  setTareasStore,
  setTurnosStore,
  storeAgenda,
  type Bloqueo,
  type Espera,
  type EstadoTurno,
  type NuevaCita,
  type NuevaTarea,
  type Recordatorio,
  type Tarea,
  type Turno,
  leerProfesionalVisto,
  fechasDeSerie,
  type Repeticion,
  tiemposAgenda,
  horariosDelDia,
  aMinutos,
  aHora,
  turnoSolapa,
  setAjustesAgendaStore,
  nombreConsultorio,
  guardarProfesionalVisto,
} from "@/lib/cloud-esther/agenda-store";
import { normalizarBusqueda } from "@/lib/utils";
import { descargarPDF } from "@/lib/descargas";
import { CLAVE_TURNO_PARA } from "@/components/cloud-esther/pacientes/VolverALlamar";
import { Seleccion } from "@/components/ui/seleccion";
import { CLAVE_ABRIR_TURNO, tomarPedidoAbrir } from "@/lib/clinica/chat";
import { TurnosOnlinePanel } from "@/components/cloud-esther/TurnosOnline";

// "demo_" (con guion bajo) hace que esta ruta NO quede anidada dentro de demo.tsx
export const Route = createFileRoute("/demo_/agenda")({
  head: () => ({
    meta: [{ title: "Agenda y turnos | Cloud Esther" }],
  }),
  component: AgendaPage,
});

/* ───────────── Tipos ───────────── */

type Vista = "dia" | "semana" | "mes" | "turnos";
type ModalActivo =
  | { tipo: "cita"; turno?: Turno; prefill?: Partial<NuevaCita>; esperaId?: number }
  | { tipo: "bloqueo" }
  | { tipo: "espera" }
  | { tipo: "tarea" }
  | { tipo: "tiempos" }
  | { tipo: "online" }
  | null;
/* ───────────── Datos ───────────── */


/* Opciones de los formularios y filtros (equipo y pacientes de la empresa). */
type OpcionesAgenda = {
  odontologos: string[];
  pacientes: string[];
  /** Cada cuántos minutos se dan turnos y cuánto dura uno habitual (los define la clínica). */
  intervalo: number;
  duracion: number;
};
const OpcionesAgendaCtx = createContext<OpcionesAgenda>({
  odontologos: ODONTOLOGOS,
  pacientes: [],
  intervalo: 30,
  duracion: 30,
});
const useOpcionesAgenda = () => useContext(OpcionesAgendaCtx);
const FRANJAS = ["Mañanas", "Tardes", "Hoy"];
const CATEGORIAS_TAREA = ["Llamar al paciente", "Comprar / reponer", "Otro"];

/* ───────────── Colores semánticos ───────────── */

const ESTADO_STYLES: Record<EstadoTurno, string> = {
  Atendida: "bg-primary/10 text-primary",
  Confirmada: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  Pendiente: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  Ausente: "bg-destructive/10 text-destructive",
  Cancelada: "bg-muted text-muted-foreground",
};

const ESTADO_ACCENT: Record<EstadoTurno, { bar: string; tile: string; soft: string }> = {
  Atendida: {
    bar: "bg-primary",
    tile: "bg-primary/10 text-primary",
    soft: "border-primary/15 bg-primary/[0.035]",
  },
  Confirmada: {
    bar: "bg-emerald-500",
    tile: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    soft: "border-emerald-500/15 bg-emerald-500/[0.025]",
  },
  Pendiente: {
    bar: "bg-amber-500",
    tile: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    soft: "border-amber-500/15 bg-amber-500/[0.025]",
  },
  Ausente: {
    bar: "bg-destructive",
    tile: "bg-destructive/10 text-destructive",
    soft: "border-destructive/15 bg-destructive/[0.025]",
  },
  Cancelada: {
    bar: "bg-muted-foreground/40",
    tile: "bg-muted text-muted-foreground",
    soft: "border-border bg-muted/20",
  },
};

type CanalMeta = {
  icon: LucideIcon;
  tile: string;
  chip: string;
};

const CANAL_META: Record<string, CanalMeta> = {
  WhatsApp: {
    icon: MessageCircle,
    tile: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    chip: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  SMS: {
    icon: Smartphone,
    tile: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    chip: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  Correo: {
    icon: Mail,
    tile: "bg-primary/10 text-primary",
    chip: "border-primary/25 bg-primary/10 text-primary",
  },
};

const CANAL_DEFAULT: CanalMeta = {
  icon: Bell,
  tile: "bg-primary/10 text-primary",
  chip: "border-primary/25 bg-primary/10 text-primary",
};

function canalMeta(canal: string): CanalMeta {
  return CANAL_META[canal] ?? CANAL_DEFAULT;
}

const FRANJA_META: Record<string, { icon: LucideIcon; chip: string }> = {
  Mañanas: {
    icon: Sunrise,
    chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  Tardes: {
    icon: Sunset,
    chip: "bg-primary/10 text-primary",
  },
  Hoy: {
    icon: CalendarCheck,
    chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
};

const CATEGORIA_META: Record<string, { icon: LucideIcon; bar: string; chip: string }> = {
  "Llamar al paciente": {
    icon: Phone,
    bar: "bg-sky-500",
    chip: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  "Comprar / reponer": {
    icon: ShoppingCart,
    bar: "bg-amber-500",
    chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  Otro: {
    icon: StickyNote,
    bar: "bg-primary",
    chip: "bg-primary/10 text-primary",
  },
};

const CATEGORIA_DEFAULT = CATEGORIA_META["Otro"];

/* ───────────── Utilidades ───────────── */

function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function hoyISO() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function formatearFecha(iso: string) {
  return iso.split("-").reverse().join("/");
}

function parseISO(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toISO(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sumarDias(iso: string, cantidad: number) {
  const date = parseISO(iso);
  date.setDate(date.getDate() + cantidad);
  return toISO(date);
}

function nombreDiaCorto(iso: string) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
  })
    .format(parseISO(iso))
    .replace(".", "");
}

function nombreDiaLargo(iso: string) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
  }).format(parseISO(iso));
}

function nombreMes(iso: string) {
  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  }).format(parseISO(iso));
}

function obtenerSemana(iso: string) {
  const date = parseISO(iso);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  const lunes = new Date(date);
  lunes.setDate(date.getDate() + diff);

  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(lunes);
    current.setDate(lunes.getDate() + index);
    return toISO(current);
  });
}

function obtenerDiasMes(iso: string) {
  const date = parseISO(iso);
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const firstWeekDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const totalDays = lastDay.getDate();

  const cells: Array<string | null> = [];

  for (let i = 0; i < firstWeekDay; i++) {
    cells.push(null);
  }

  for (let day = 1; day <= totalDays; day++) {
    cells.push(toISO(new Date(year, month, day)));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

/* ───────────── Estilos compartidos ───────────── */

const CARD =
  "rounded-3xl border border-primary/25 bg-card/95 bg-gradient-to-br from-white via-primary/[0.02] to-primary/[0.08] p-4 shadow-sm shadow-primary/5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10";

const CARD_MAIN =
  "rounded-3xl border border-primary/20 bg-card/95 bg-gradient-to-br from-white via-white to-primary/[0.05] p-4 shadow-[0_18px_44px_-34px_rgba(76,29,149,0.5)] backdrop-blur-sm md:p-5 dark:from-card dark:via-card";

const ITEM =
  "rounded-2xl border border-primary/18 bg-card/90 bg-gradient-to-br from-white via-white to-primary/[0.06] shadow-sm shadow-primary/5 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md hover:shadow-primary/8";

const INPUT =
  "h-11 w-full rounded-2xl border border-primary/20 bg-white/90 px-3.5 text-sm shadow-sm shadow-primary/5 outline-none transition-all placeholder:text-muted-foreground focus:border-primary/45 focus:ring-2 focus:ring-primary/15";

const INPUT_SM =
  "h-10 w-full rounded-xl border border-primary/20 bg-white/90 px-3 text-sm shadow-sm shadow-primary/5 outline-none transition-all placeholder:text-muted-foreground focus:border-primary/45 focus:ring-2 focus:ring-primary/15";

const TEXTAREA =
  "min-h-24 w-full resize-y rounded-2xl border border-primary/20 bg-white/90 px-3.5 py-2.5 text-sm shadow-sm shadow-primary/5 outline-none transition-all placeholder:text-muted-foreground focus:border-primary/45 focus:ring-2 focus:ring-primary/15";

/* ───────────── Utilidades UI ───────────── */

function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const show = (msg: string) => {
    setMessage(msg);

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => setMessage(null), 2400);
  };

  return { message, show };
}

/* ───────────── Fondo temático ───────────── */
/* NO MODIFICAR: se conserva el fondo original */

function FondoPacientes() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-primary/[0.02]" />
      <div className="absolute -left-24 -top-24 size-96 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute -bottom-32 -right-24 size-[28rem] rounded-full bg-primary/5 blur-3xl" />

      <svg className="absolute inset-0 size-full text-primary" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="patron-pacientes" width="170" height="170" patternUnits="userSpaceOnUse">
            <g
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.05"
            >
              <g transform="translate(20 20)">
                <circle cx="12" cy="8" r="5" />
                <path d="M3 26c0-5 4-8 9-8s9 3 9 8" />
              </g>

              <g transform="translate(104 20) scale(1.3)">
                <path d="M12 5.5c-1.2-1-2.6-1.5-4-1.5C5.5 4 4 6 4 8.3c0 2 .9 3.3 1.5 5.2.6 1.8.6 4.5 1.6 6 .7 1 1.9.9 2.4-.3.5-1.2.6-3 1.2-4.2.3-.6.9-1 1.3-1s1 .4 1.3 1c.6 1.2.7 3 1.2 4.2.5 1.2 1.7 1.3 2.4.3 1-1.5 1-4.2 1.6-6 .6-1.9 1.5-3.2 1.5-5.2C20 6 18.5 4 16 4c-1.4 0-2.8.5-4 1.5z" />
              </g>

              <g transform="translate(24 100)">
                <rect x="2" y="4" width="24" height="22" rx="4" />
                <path d="M2 11h24M9 1v6M19 1v6M9 18l3 3 6-6" />
              </g>

              <g transform="translate(106 104)">
                <path d="M12 4v16M4 12h16" />
              </g>
            </g>
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#patron-pacientes)" />
      </svg>
    </div>
  );
}

/* ───────────── Modal y campos ───────────── */

function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-primary/20 bg-card/95 p-6 shadow-2xl backdrop-blur-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>

            {subtitle && (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
            )}
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="grid size-8 shrink-0 place-items-center rounded-full border border-primary/10 bg-card text-muted-foreground shadow-sm transition-all hover:border-primary/25 hover:bg-primary/5 hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>

      {children}

      {error && <span className="mt-1.5 block text-xs text-destructive">{error}</span>}
    </label>
  );
}

function SelectField({
  value,
  onChange,
  options,
  placeholder,
  compact = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  compact?: boolean;
}) {
  return (
    <div className="relative">
      <Seleccion
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${compact ? INPUT_SM : INPUT} appearance-none ${compact ? "pr-9" : "pr-10"}`}
      >
        {placeholder && <option value="">{placeholder}</option>}

        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </Seleccion>

      <ChevronDown
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground ${
          compact ? "right-3 size-3.5" : "right-3.5 size-4"
        }`}
      />
    </div>
  );
}

function FormActions({ submitLabel, onCancel }: { submitLabel: string; onCancel: () => void }) {
  return (
    <div className="flex justify-end gap-2.5 pt-2">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-full border border-primary/15 bg-card px-4 py-2 text-xs font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5"
      >
        Cancelar
      </button>

      <button type="submit" className="btn-ce">
        {submitLabel}
      </button>
    </div>
  );
}

function BotonAccion({
  icon: Icon,
  label,
  onClick,
}: {
  icon?: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full border border-primary/15 bg-card/80 px-2.5 py-1 text-[11px] font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm"
    >
      {Icon && <Icon className="size-3.5" />}
      {label}
    </button>
  );
}

/* ───────────── Formularios ───────────── */

/* Tiempos de la agenda: libres, a criterio de cada clínica (5 a 240 min) */
function TiemposForm({
  intervalo,
  duracion,
  onSubmit,
  onCancel,
}: {
  intervalo: number;
  duracion: number;
  onSubmit: (a: { intervaloMin: number; duracionMin: number }) => void;
  onCancel: () => void;
}) {
  const [cada, setCada] = useState(String(intervalo));
  const [dura, setDura] = useState(String(duracion));
  const chips = (valor: string, set: (v: string) => void, lista: number[]) => (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {lista.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => set(String(m))}
          className={`h-8 rounded-full border px-3 text-xs font-semibold transition ${
            Number(valor) === m
              ? "border-primary bg-primary text-primary-foreground"
              : "border-primary/15 bg-white text-muted-foreground hover:border-primary/40 hover:text-primary dark:bg-card"
          }`}
        >
          {m} min
        </button>
      ))}
    </div>
  );
  const limpiar = (v: string, max: number) => Math.min(max, Math.max(5, Math.round(Number(v) || 0)));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ intervaloMin: limpiar(cada, 240), duracionMin: limpiar(dura, 480) });
      }}
      className="space-y-5"
    >
      <Field label="Cada cuántos minutos se dan turnos">
        <input
          required
          type="number"
          inputMode="numeric"
          min={5}
          max={240}
          value={cada}
          onChange={(e) => setCada(e.target.value)}
          className={`${INPUT} w-32`}
          aria-label="Intervalo en minutos"
        />
        {chips(cada, setCada, [5, 10, 15, 20, 30, 45, 60])}
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Son los horarios que ofrece la agenda: con {limpiar(cada, 240)} min → 08:00, {aHora(8 * 60 + limpiar(cada, 240))},{" "}
          {aHora(8 * 60 + 2 * limpiar(cada, 240))}…
        </p>
      </Field>
      <Field label="Duración habitual de un turno (minutos)">
        <input
          required
          type="number"
          inputMode="numeric"
          min={5}
          max={480}
          value={dura}
          onChange={(e) => setDura(e.target.value)}
          className={`${INPUT} w-32`}
          aria-label="Duración en minutos"
        />
        {chips(dura, setDura, [10, 15, 20, 30, 45, 60, 90])}
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Se propone al crear cada turno; en cada turno se puede cambiar (por ejemplo, una cirugía más larga).
        </p>
      </Field>
      <FormActions submitLabel="Guardar tiempos" onCancel={onCancel} />
    </form>
  );
}

function CitaForm({
  inicial,
  prefill,
  pacientes,
  onSubmit,
  onCancel,
}: {
  inicial?: Turno | undefined;
  prefill?: Partial<NuevaCita> | undefined;
  pacientes: string[];
  onSubmit: (c: NuevaCita, repetir?: Repeticion) => void;
  onCancel: () => void;
}) {
  const { odontologos: todosOdontologos, duracion: duracionHabitual } = useOpcionesAgenda();
  // Sedes de quien usa la agenda, y los profesionales que atienden en la sede elegida
  const { sedes: misSedes } = useMisSedes(SUCURSALES);
  const { miembros: delEquipo } = useEquipo();
  // Turnos repetidos (solo al crear): cada N días/semanas/meses, X veces. A criterio de la clínica.
  const [repetir, setRepetir] = useState(false);
  const [cada, setCada] = useState("1");
  const [unidad, setUnidad] = useState<Repeticion["unidad"]>("meses");
  const [veces, setVeces] = useState("6");
  const [duracion, setDuracion] = useState(String(inicial?.duracion ?? prefill?.duracion ?? duracionHabitual));
  const [paciente, setPaciente] = useState(inicial?.paciente ?? prefill?.paciente ?? "");
  const [sucursal, setSucursal] = useState(inicial?.sucursal ?? prefill?.sucursal ?? misSedes[0] ?? SUCURSALES[0]);
  const odontologos = todosOdontologos.filter((n) => {
    const m = delEquipo.find((x) => `${x.firstName} ${x.lastName}`.trim() === n);
    return !m || trabajaEnSede(m, sucursal, SUCURSALES) || n === inicial?.odontologo;
  });
  const [odontologo, setOdontologo] = useState(
    inicial?.odontologo ?? prefill?.odontologo ?? odontologos[0] ?? "",
  );
  const [gabinete, setGabinete] = useState(inicial?.gabinete ?? GABINETES[0]);
  const [tratamiento, setTratamiento] = useState(
    inicial?.tratamiento ?? prefill?.tratamiento ?? TRATAMIENTOS[0],
  );
  const [fecha, setFecha] = useState(inicial?.fecha ?? prefill?.fecha ?? "");
  const [hora, setHora] = useState(inicial?.hora ?? prefill?.hora ?? "");
  const [notas, setNotas] = useState(inicial?.notas ?? "");

  const repeticion: Repeticion | undefined =
    !inicial && repetir
      ? {
          cada: Math.min(365, Math.max(1, Math.round(Number(cada) || 1))),
          unidad,
          veces: Math.min(52, Math.max(2, Math.round(Number(veces) || 2))),
        }
      : undefined;
  const fechasSerie = repeticion && fecha ? fechasDeSerie(fecha, repeticion) : [];

  const enviar = (e: FormEvent) => {
    e.preventDefault();

    onSubmit({
      paciente: paciente.trim(),
      sucursal,
      odontologo,
      gabinete,
      tratamiento,
      fecha,
      hora,
      notas: notas.trim(),
      duracion: Math.min(480, Math.max(5, Math.round(Number(duracion) || duracionHabitual))),
    }, repeticion);
  };

  return (
    <form onSubmit={enviar} className="space-y-4">
      <Field label="Paciente">
        <input
          autoFocus
          required
          list="pacientes-agenda"
          value={paciente}
          onChange={(e) => setPaciente(e.target.value)}
          className={INPUT}
          placeholder="Buscar paciente por nombre o documento"
        />

        <datalist id="pacientes-agenda">
          {pacientes.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Sucursal">
          <SelectField
            value={sucursal}
            onChange={(v) => {
              setSucursal(v);
              // Si el profesional elegido no atiende en esa sede, se pasa al primero que sí
              const m = delEquipo.find((x) => `${x.firstName} ${x.lastName}`.trim() === odontologo);
              if (m && !trabajaEnSede(m, v, SUCURSALES)) {
                const otro = todosOdontologos.find((n) => {
                  const y = delEquipo.find((x) => `${x.firstName} ${x.lastName}`.trim() === n);
                  return !y || trabajaEnSede(y, v, SUCURSALES);
                });
                setOdontologo(otro ?? "");
              }
            }}
            options={misSedes}
          />
        </Field>

        <Field label="Odontólogo">
          <SelectField value={odontologo} onChange={setOdontologo} options={odontologos} />
        </Field>

        <Field label="Consultorio (sillón)">
          <SelectField value={gabinete} onChange={setGabinete} options={GABINETES} />
        </Field>

        <Field label="Tratamiento">
          <SelectField value={tratamiento} onChange={setTratamiento} options={TRATAMIENTOS} />
        </Field>

        <Field label="Fecha">
          <input
            required
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className={INPUT}
          />
        </Field>

        <Field label="Hora">
          <input
            required
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            className={INPUT}
          />
        </Field>
      </div>

      <Field label="Duración del turno (minutos)">
        <div className="flex flex-wrap items-center gap-2">
          <input
            required
            type="number"
            inputMode="numeric"
            min={5}
            max={480}
            step={5}
            value={duracion}
            onChange={(e) => setDuracion(e.target.value)}
            className={`${INPUT} w-28`}
            aria-label="Duración en minutos"
          />
          {Array.from(new Set([duracionHabitual, 15, 30, 45, 60, 90]))
            .sort((a, b) => a - b)
            .map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setDuracion(String(m))}
                className={`h-8 rounded-full border px-3 text-xs font-semibold transition ${
                  Number(duracion) === m
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-primary/15 bg-white text-muted-foreground hover:border-primary/40 hover:text-primary dark:bg-card"
                }`}
              >
                {m} min
              </button>
            ))}
        </div>
        {hora && Number(duracion) > 0 && (
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            De {hora} a {aHora(aMinutos(hora) + Math.round(Number(duracion)))} h
          </p>
        )}
      </Field>

      {!inicial && (
        <div className="rounded-2xl border border-primary/12 bg-primary/[0.03] p-3">
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span>
              <span className="block text-sm font-semibold">Repetir este turno</span>
              <span className="block text-[11px] text-muted-foreground">
                Para controles, ortodoncia o tratamientos en varias sesiones
              </span>
            </span>
            <input
              type="checkbox"
              checked={repetir}
              onChange={(e) => setRepetir(e.target.checked)}
              className="size-5 accent-[var(--primary)]"
              aria-label="Repetir este turno"
            />
          </label>
          {repetir && (
            <div className="mt-3 space-y-3">
              <div className="grid max-w-sm gap-2 text-sm" data-movil="1col">
                <div className="flex items-center gap-2">
                  <span className="w-20 shrink-0 text-muted-foreground">Cada</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={365}
                    value={cada}
                    onChange={(e) => setCada(e.target.value)}
                    className={`${INPUT_SM} !w-20`}
                    aria-label="Cada cuánto"
                  />
                  <Seleccion
                    aria-label="Unidad"
                    value={unidad}
                    onChange={(e) => setUnidad(e.target.value as Repeticion["unidad"])}
                    className={`${INPUT_SM} min-w-0 flex-1`}
                  >
                    <option value="dias">días</option>
                    <option value="semanas">semanas</option>
                    <option value="meses">meses</option>
                  </Seleccion>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-20 shrink-0 text-muted-foreground">Cantidad</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={2}
                    max={52}
                    value={veces}
                    onChange={(e) => setVeces(e.target.value)}
                    className={`${INPUT_SM} !w-20`}
                    aria-label="Cantidad de turnos"
                  />
                  <span className="text-muted-foreground">turnos</span>
                </div>
              </div>
              {fechasSerie.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {fechasSerie.map((f, i) => (
                    <span
                      key={f}
                      className="rounded-full border border-primary/15 bg-white px-2.5 py-1 text-[11px] font-semibold tabular-nums text-foreground/80 dark:bg-card"
                    >
                      {i + 1}. {formatearFecha(f)}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">Elegí la fecha del primer turno para ver las fechas.</p>
              )}
            </div>
          )}
        </div>
      )}

      <Field label="Notas">
        <textarea
          rows={3}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          className={TEXTAREA}
          placeholder="Indicaciones para el consultorio o el paciente"
        />
      </Field>

      <FormActions submitLabel={inicial ? "Guardar cambios" : "Crear turno"} onCancel={onCancel} />
    </form>
  );
}

function BloqueoForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (b: Omit<Bloqueo, "id">) => string | null;
  onCancel: () => void;
}) {
  const [fecha, setFecha] = useState(hoyISO());
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");

  const enviar = (e: FormEvent) => {
    e.preventDefault();

    if (hasta <= desde) {
      setError("La hora de fin debe ser posterior a la de inicio.");
      return;
    }

    const resultado = onSubmit({
      fecha,
      desde,
      hasta,
      motivo: motivo.trim() || "Horario bloqueado",
    });

    if (resultado) setError(resultado);
  };

  return (
    <form onSubmit={enviar} className="space-y-4">
      <Field label="Fecha">
        <input
          autoFocus
          required
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className={INPUT}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Desde">
          <input
            required
            type="time"
            value={desde}
            onChange={(e) => {
              setDesde(e.target.value);
              setError("");
            }}
            className={INPUT}
          />
        </Field>

        <Field label="Hasta">
          <input
            required
            type="time"
            value={hasta}
            onChange={(e) => {
              setHasta(e.target.value);
              setError("");
            }}
            className={INPUT}
          />
        </Field>
      </div>

      <Field label="Motivo" error={error}>
        <input
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className={INPUT}
          placeholder="Ej: Reunión de equipo, capacitación"
        />
      </Field>

      <FormActions submitLabel="Bloquear horario" onCancel={onCancel} />
    </form>
  );
}

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function EsperaForm({
  pacientes,
  odontologos,
  onSubmit,
  onCancel,
}: {
  pacientes: string[];
  odontologos: string[];
  onSubmit: (e: Omit<Espera, "id">) => void;
  onCancel: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [motivo, setMotivo] = useState(TRATAMIENTOS[0]);
  const [franja, setFranja] = useState("Cualquiera");
  const { sedes: misSedesEspera } = useMisSedes(SUCURSALES);
  const [sucursal, setSucursal] = useState(misSedesEspera[0] ?? SUCURSALES[0]);
  const [odontologo, setOdontologo] = useState("Cualquiera");
  const [prioridad, setPrioridad] = useState("Normal");
  const [dias, setDias] = useState<number[]>([]);
  const [telefono, setTelefono] = useState("");

  const toggleDia = (d: number) =>
    setDias((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      nombre: nombre.trim(),
      motivo,
      franja,
      sucursal,
      odontologo: odontologo === "Cualquiera" ? "" : odontologo,
      dias,
      prioridad: prioridad === "Urgente" ? "urgente" : "normal",
      telefono: telefono.trim(),
      creada: new Date().toISOString(),
    });
  };

  return (
    <form onSubmit={enviar} className="space-y-4">
      <Field label="Paciente">
        <input
          autoFocus
          required
          list="pacientes-agenda"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className={INPUT}
          placeholder="Buscar paciente por nombre o documento"
        />

        <datalist id="pacientes-agenda">
          {pacientes.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </Field>

      <Field label="Motivo">
        <SelectField value={motivo} onChange={setMotivo} options={TRATAMIENTOS} />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Profesional preferido">
          <SelectField value={odontologo} onChange={setOdontologo} options={["Cualquiera", ...odontologos]} />
        </Field>
        <Field label="Franja preferida">
          <SelectField value={franja} onChange={setFranja} options={["Cualquiera", "Mañanas", "Tardes"]} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Sucursal">
          <SelectField value={sucursal} onChange={setSucursal} options={SUCURSALES} />
        </Field>
        <Field label="Prioridad">
          <SelectField value={prioridad} onChange={setPrioridad} options={["Normal", "Urgente"]} />
        </Field>
      </div>

      <Field label="Días preferidos (opcional)">
        <div className="flex flex-wrap gap-1.5">
          {DIAS_SEMANA.map((etq, d) => {
            const on = dias.includes(d);
            return (
              <button
                type="button"
                key={d}
                onClick={() => toggleDia(d)}
                aria-pressed={on}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                  on
                    ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {etq}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Teléfono para avisarle (opcional)">
        <input
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          className={INPUT}
          placeholder="Para el aviso por WhatsApp cuando se conecte el canal"
          inputMode="tel"
        />
      </Field>

      <FormActions submitLabel="Agregar a la lista" onCancel={onCancel} />
    </form>
  );
}

function TareaForm({
  pacientes,
  equipo = [],
  onSubmit,
  onCancel,
}: {
  pacientes: string[];
  equipo?: string[];
  onSubmit: (t: NuevaTarea) => void;
  onCancel: () => void;
}) {
  const [categoria, setCategoria] = useState(CATEGORIAS_TAREA[0]);
  const [responsable, setResponsable] = useState("");
  const [paciente, setPaciente] = useState("");
  const [texto, setTexto] = useState("");
  const [fecha, setFecha] = useState("");

  const enviar = (e: FormEvent) => {
    e.preventDefault();

    onSubmit({
      categoria,
      paciente: paciente.trim(),
      texto: texto.trim(),
      fecha,
      ...(responsable ? { responsable } : {}),
    });
  };

  return (
    <form onSubmit={enviar} className="space-y-4">
      <Field label="Recordatorio">
        <textarea
          autoFocus
          required
          rows={3}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className={TEXTAREA}
          placeholder="Ej: Llamar para confirmar el turno, comprar guantes y anestesia"
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Categoría">
          <SelectField value={categoria} onChange={setCategoria} options={CATEGORIAS_TAREA} />
        </Field>

        <Field label="Fecha (opcional)">
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className={INPUT}
          />
        </Field>
      </div>

      <Field label="Paciente (opcional)">
        <input
          list="pacientes-tareas"
          value={paciente}
          onChange={(e) => setPaciente(e.target.value)}
          className={INPUT}
          placeholder="Si el recordatorio es sobre un paciente"
        />

        <datalist id="pacientes-tareas">
          {pacientes.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </Field>

      {equipo.length > 0 && (
        <Field label="Responsable (opcional)">
          <SelectField value={responsable} onChange={setResponsable} options={equipo} placeholder="Sin responsable" />
        </Field>
      )}

      <FormActions submitLabel="Guardar recordatorio" onCancel={onCancel} />
    </form>
  );
}

/* ───────────── Piezas de página ───────────── */

function EstadoBadge({ estado }: { estado: EstadoTurno }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${ESTADO_STYLES[estado]}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {estado}
    </span>
  );
}

function IconTile({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
      <Icon className="size-4" />
    </span>
  );
}

const TONOS_STAT_AGENDA = {
  violeta: { icon: "from-primary to-fuchsia-500", val: "text-primary", orb: "from-primary/20 to-fuchsia-400/10" },
  verde: { icon: "from-emerald-400 to-teal-600", val: "text-emerald-600", orb: "from-emerald-400/20 to-teal-500/10" },
  ambar: { icon: "from-amber-400 to-orange-500", val: "text-amber-600", orb: "from-amber-400/20 to-orange-500/10" },
  azul: { icon: "from-sky-400 to-blue-600", val: "text-sky-600", orb: "from-sky-400/20 to-blue-500/10" },
} as const;

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  tono = "violeta",
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  sub?: string;
  tono?: keyof typeof TONOS_STAT_AGENDA;
}) {
  const t = TONOS_STAT_AGENDA[tono];
  return (
    <div className="group relative min-h-[104px] overflow-hidden rounded-[22px] border border-primary/15 bg-gradient-to-br from-white via-white to-primary/[0.04] p-4 shadow-[0_12px_28px_-20px_rgba(124,58,237,0.48)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-26px_rgba(124,58,237,0.6)]">
      <div className={`pointer-events-none absolute -right-7 -top-9 size-[100px] rounded-full bg-gradient-to-br opacity-70 transition-transform duration-300 group-hover:scale-110 ${t.orb}`} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-muted-foreground">
            {label}
          </p>
          <p className={`mt-2 text-[27px] font-bold leading-none tracking-tight tabular-nums ${t.val}`}>
            {value}
          </p>
          {sub && <p className="mt-2 text-[11px] text-muted-foreground">{sub}</p>}
        </div>
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-[0_8px_16px_-8px_rgba(0,0,0,0.35)] ${t.icon}`}>
          <Icon className="size-4" />
        </span>
      </div>
    </div>
  );
}

const VISTAS: { id: Vista; label: string; icon: LucideIcon }[] = [
  { id: "dia", label: "Día", icon: CalendarDays },
  { id: "semana", label: "Semana", icon: CalendarCheck },
  { id: "mes", label: "Mes", icon: CalendarDays },
  { id: "turnos", label: "Turnos", icon: Clock },
];

/* Día sin nadie atendiendo: en vez de una lista de horarios vacíos, se explica qué falta */
function SinAtencionEseDia() {
  return (
    <div className="relative overflow-hidden rounded-[26px] border border-dashed border-primary/25 bg-gradient-to-br from-white via-white to-primary/[0.06] px-6 py-10 text-center dark:from-card dark:via-card">
      <span aria-hidden className="pointer-events-none absolute -right-14 -top-16 size-48 rounded-full bg-primary/[0.07] blur-2xl" />
      <span className="relative mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow-[0_14px_30px_-14px_rgba(124,58,237,0.9)]">
        <CalendarDays className="size-6" />
      </span>
      <p className="relative mt-4 font-display text-lg font-bold tracking-tight">Nadie atiende este día todavía</p>
      <p className="relative mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
        La agenda ofrece turnos según los horarios de cada odontólogo. Cargá a tu equipo y sus días de atención, y acá vas a ver los horarios libres.
      </p>
      <div className="relative mt-5 flex flex-wrap justify-center gap-2">
        <Link to={"/demo/equipo-profesional" as never} className="btn-ce">
          Cargar odontólogos
        </Link>
        <Link to={"/demo/equipo-profesional/agendas-horarios" as never} className="btn-ce-outline">
          Agendas y horarios
        </Link>
      </div>
    </div>
  );
}

/* ───────────── Card de turno ───────────── */

function TurnoCard({
  turno,
  canalesActivos,
  onEstado,
  onRecordar,
  onEditar,
  onLlegada,
}: {
  turno: Turno;
  canalesActivos: string[];
  onEstado: (turno: Turno, estado: EstadoTurno) => void;
  onRecordar: (turno: Turno) => void;
  onEditar: (turno: Turno) => void;
  onLlegada?: (turno: Turno, llego: boolean) => void;
}) {
  const accent = ESTADO_ACCENT[turno.estado];
  const activo = turno.estado === "Pendiente" || turno.estado === "Confirmada";
  const ahora = useAhora();
  const { duracion: duracionHabitual } = useOpcionesAgenda();
  // Alerta médica del paciente (alergias, enfermedades): se ve en el turno, sin abrir la ficha
  const { pacientes: listaPac } = usePacientes();
  const regs = useTodosLosRegistros();
  const pacTurno = listaPac.find((p) => normBusq(`${p.nombre} ${p.apellido}`) === normBusq(turno.paciente));
  const ant = pacTurno ? regs[pacTurno.id]?.antecedentes : undefined;
  const alertasMed = [...(ant?.alergias ?? []).filter(Boolean).map((x) => `Alergia a ${x}`), ...(ant?.enfermedades ?? []).filter(Boolean)];
  const [verAlertas, setVerAlertas] = useState(false);
  // Turno atendido sin evolución cargada ese día (para que la historia quede completa)
  const faltaEvolucion =
    turno.estado === "Atendida" &&
    !!pacTurno &&
    !(regs[pacTurno.id]?.historia ?? []).some((e) => e.fecha === turno.fecha) &&
    !(regs[pacTurno.id]?.notasClinicas ?? []).some((n) => n.fecha === turno.fecha);
  const finTurno = aHora(aMinutos(turno.hora) + (turno.duracion ?? duracionHabitual));
  const esHoy = turno.fecha === hoyISO();
  const enSala = activo && !!turno.llegada;
  const minSala = turno.llegada ? minutosDesde(turno.llegada, ahora) : 0;
  const espero =
    turno.estado === "Atendida" && turno.llegada && turno.atendidoEn
      ? Math.max(0, Math.round((new Date(turno.atendidoEn).getTime() - new Date(turno.llegada).getTime()) / 60000))
      : null;
  const { clinica } = useSesion();
  // Recordatorio por WhatsApp con un toque (todos los planes): se abre el WhatsApp de la clínica
  const recordarPorWhatsApp = () => {
    if (noQuiereRecordatorios(turno.paciente)) {
      avisoWhatsApp.warning(`${turno.paciente} pidió no recibir recordatorios (se cambia en su ficha).`);
      return;
    }
    if (!abrirRecordatorioWhatsApp(turno, clinica?.nombre ?? "la clínica"))
      avisoWhatsApp.warning(`${turno.paciente} no tiene teléfono cargado. Agregalo en su ficha de Pacientes.`);
  };
  // Encuesta después del turno (todos los planes): WhatsApp con el enlace para puntuar del 1 al 5
  const pedirOpinion = () => {
    if (noQuiereRecordatorios(turno.paciente)) {
      avisoWhatsApp.warning(`${turno.paciente} pidió no recibir mensajes de la clínica (se cambia en su ficha).`);
      return;
    }
    if (!abrirEncuestaWhatsApp(turno, clinica?.nombre ?? "la clínica")) {
      avisoWhatsApp.warning(`${turno.paciente} no tiene teléfono cargado. Agregalo en su ficha de Pacientes.`);
      return;
    }
    const hoy = new Date().toISOString().slice(0, 10);
    setTurnosStore((prev) => prev.map((x) => (x.id === turno.id ? { ...x, encuestaEnviada: hoy } : x)));
  };
  const ICONO_BTN =
    "grid size-8 place-items-center rounded-xl border border-primary/12 bg-white text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 hover:text-primary";

  return (
    <div
      data-turno-id={turno.id}
      className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-r from-white via-white to-primary/[0.05] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${accent.soft}`}
    >
      <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${accent.bar}`} />

      <div className="flex flex-col gap-3 py-3 pl-4 pr-3 sm:flex-row sm:items-center">
        {/* Hora y gabinete */}
        <div
          className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2 sm:w-[92px] sm:flex-col sm:gap-0.5 ${accent.tile}`}
        >
          <span className="text-[17px] font-bold leading-none tabular-nums">{turno.hora}</span>
          <span className="whitespace-nowrap text-[10px] font-semibold tabular-nums opacity-75" title="Hasta">
            a {finTurno}
          </span>
          <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider opacity-75">
            {nombreConsultorio(turno.gabinete).replace("Consultorio", "Cons.")}
          </span>
        </div>

        {/* Paciente y detalle */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-semibold tracking-tight">{turno.paciente}</p>
            <EstadoBadge estado={turno.estado} />
            {alertasMed.length > 0 && (
              <button
                type="button"
                onClick={() => setVerAlertas((v) => !v)}
                title={alertasMed.join(" · ")}
                aria-expanded={verAlertas}
                className={`inline-flex items-center gap-1 rounded-2xl border border-rose-300 bg-rose-50 px-2 py-0.5 text-left text-[11px] font-semibold text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300 ${verAlertas ? "max-w-full" : "max-w-[14rem]"}`}
              >
                <AlertTriangle className="size-3 shrink-0" />
                <span className={verAlertas ? "" : "truncate"}>{verAlertas ? alertasMed.join(" · ") : alertasMed[0]}</span>
                {!verAlertas && alertasMed.length > 1 && <span className="shrink-0 opacity-80">+{alertasMed.length - 1}</span>}
              </button>
            )}
            {enSala && (
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tonoEspera(minSala)}`}
                title="Está en la sala de espera"
              >
                <Hourglass className="size-3" />
                En sala · {textoEspera(minSala)}
              </span>
            )}
            {turno.serie && turno.serieN && turno.serieTotal && (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-primary/15 bg-primary/5 px-2 py-0.5 text-[11px] font-semibold text-primary"
                title="Turno repetido"
              >
                <Repeat className="size-3" />
                {turno.serieN} de {turno.serieTotal}
              </span>
            )}
            {faltaEvolucion && (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-indigo-300 bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300"
                title="Cargá la evolución en la ficha del paciente → Historia clínica"
              >
                <FileClock className="size-3" />
                Falta evolución
              </span>
            )}
            {turno.respuestaPaciente?.tipo === "cambiar" && turno.estado !== "Cancelada" && turno.estado !== "Atendida" && (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800"
                title={turno.respuestaPaciente.nota || "El paciente pidió cambiar el turno con el enlace del recordatorio"}
              >
                Pidió cambiarlo
              </span>
            )}
            {turno.respuestaPaciente?.tipo === "confirmo" && turno.estado === "Confirmada" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700" title="Confirmó con el enlace del recordatorio">
                Confirmó por el enlace
              </span>
            )}
            {turno.encuesta && (
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${turno.encuesta.puntaje >= 4 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : turno.encuesta.puntaje === 3 ? "border-amber-200 bg-amber-50 text-amber-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}
                title={turno.encuesta.comentario || "Opinión del paciente"}
              >
                <Smile className="size-3" /> Opinión {turno.encuesta.puntaje}/5
              </span>
            )}
            {!turno.encuesta && turno.encuestaEnviada && turno.estado === "Atendida" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/15 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                <Smile className="size-3" /> Opinión pedida
              </span>
            )}
            {espero !== null && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/15 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                <Hourglass className="size-3" />
                Esperó {espero} min
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/80">{turno.tratamiento}</span>
            <span className="inline-flex items-center gap-1">
              <Stethoscope className="size-3 text-primary/70" />
              {turno.odontologo}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3 text-primary/70" />
              {turno.sucursal}
            </span>
            {activo && canalesActivos.length > 0 && (
              <span className="inline-flex items-center gap-1" title="Avisos automáticos activos">
                <Bell className="size-3 text-primary/70" />
                {canalesActivos.map((canal) => {
                  const { icon: CanalIcon, chip } = canalMeta(canal);
                  return (
                    <span
                      key={canal}
                      title={canal}
                      className={`grid size-5 place-items-center rounded-full border ${chip}`}
                    >
                      <CanalIcon className="size-2.5" />
                    </span>
                  );
                })}
              </span>
            )}
          </div>
          {turno.notas && (
            <p className="mt-1 text-xs italic text-muted-foreground">{turno.notas}</p>
          )}
        </div>

        {/* Acciones: la principal con texto, el resto como íconos */}
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {/* Recepción: marcar que el paciente llegó (solo turnos de hoy) */}
          {activo && esHoy && onLlegada && !turno.llegada && (
            <button
              type="button"
              onClick={() => onLlegada(turno, true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/50 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-100 hover:shadow-md dark:bg-amber-500/10 dark:text-amber-300"
            >
              <DoorOpen className="size-3.5" /> Llegó
            </button>
          )}
          {enSala && onLlegada && (
            <button
              type="button"
              onClick={() => onLlegada(turno, false)}
              className="rounded-xl px-2 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:bg-primary/5 hover:text-primary"
              title="Se marcó por error"
            >
              Deshacer
            </button>
          )}
          {turno.estado === "Pendiente" && !turno.llegada && (
            <button
              type="button"
              onClick={() => onEstado(turno, "Confirmada")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <Check className="size-3.5" /> Confirmar
            </button>
          )}
          {turno.estado === "Confirmada" && (
            <button
              type="button"
              onClick={() => onEstado(turno, "Atendida")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <Check className="size-3.5" /> Atendida
            </button>
          )}
          {turno.estado === "Atendida" && (
            <BotonAccion label="Marcar ausente" onClick={() => onEstado(turno, "Ausente")} />
          )}
          {turno.estado === "Atendida" && !turno.encuesta && (
            <button
              type="button"
              onClick={pedirOpinion}
              className={ICONO_BTN}
              aria-label="Pedir su opinión por WhatsApp"
              title={turno.encuestaEnviada ? "Opinión pedida: volver a pedir" : "Pedir su opinión (encuesta)"}
            >
              <Smile className="size-3.5" />
            </button>
          )}
          {activo && (
            <button
              type="button"
              onClick={recordarPorWhatsApp}
              className="grid size-8 place-items-center rounded-xl border border-emerald-500/25 bg-white text-emerald-600 transition-all hover:-translate-y-0.5 hover:border-emerald-500 hover:bg-[#25D366] hover:text-white hover:shadow-[0_8px_18px_-10px_rgba(16,185,129,0.9)]"
              aria-label="Recordar el turno por WhatsApp"
              title="Recordar por WhatsApp"
            >
              <IconoWhatsApp className="size-3.5" />
            </button>
          )}
          {activo && (
            <button
              type="button"
              onClick={() => onRecordar(turno)}
              className={ICONO_BTN}
              aria-label="Enviar recordatorio"
              title="Enviar recordatorio"
            >
              <Bell className="size-3.5" />
            </button>
          )}
          {turno.estado !== "Atendida" && (
            <button
              type="button"
              onClick={() => onEditar(turno)}
              className={ICONO_BTN}
              aria-label="Editar turno"
              title="Editar turno"
            >
              <Pencil className="size-3.5" />
            </button>
          )}
          {activo && (
            <button
              type="button"
              onClick={() => onEstado(turno, "Cancelada")}
              className={`${ICONO_BTN} hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600`}
              aria-label="Cancelar turno"
              title="Cancelar turno"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────── Navegación de período ───────────── */

function PeriodNavigator({
  vista,
  fecha,
  onChange,
}: {
  vista: Vista;
  fecha: string;
  onChange: (fecha: string) => void;
}) {
  const titulo =
    vista === "dia"
      ? `${nombreDiaLargo(fecha)} ${parseISO(fecha).getDate()}`
      : vista === "semana"
        ? `${formatearFecha(obtenerSemana(fecha)[0])} — ${formatearFecha(obtenerSemana(fecha)[6])}`
        : vista === "mes"
          ? nombreMes(fecha)
          : "Todos los turnos";

  const mover = (cantidad: number) => {
    if (vista === "dia") {
      onChange(sumarDias(fecha, cantidad));
      return;
    }

    if (vista === "semana") {
      onChange(sumarDias(fecha, cantidad * 7));
      return;
    }

    if (vista === "mes") {
      const date = parseISO(fecha);
      date.setMonth(date.getMonth() + cantidad);
      onChange(toISO(date));
    }
  };

  if (vista === "turnos") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Vista general
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">Todos los turnos</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {vista === "dia"
            ? "Agenda diaria"
            : vista === "semana"
              ? "Agenda semanal"
              : "Calendario mensual"}
        </p>

        <h2 className="mt-1 truncate text-lg font-semibold tracking-tight">{titulo.charAt(0).toUpperCase() + titulo.slice(1)}</h2>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => mover(-1)}
          aria-label="Período anterior"
          className="grid size-8 place-items-center rounded-full border border-primary/15 bg-card shadow-sm transition-all hover:border-primary/30 hover:bg-primary/5"
        >
          <ChevronLeft className="size-4" />
        </button>

        <button
          onClick={() => onChange(hoyISO())}
          className="rounded-full border border-primary/15 bg-card px-3 py-1.5 text-[11px] font-semibold shadow-sm transition-all hover:border-primary/30 hover:bg-primary/5"
        >
          Hoy
        </button>

        <button
          onClick={() => mover(1)}
          aria-label="Período siguiente"
          className="grid size-8 place-items-center rounded-full border border-primary/15 bg-card shadow-sm transition-all hover:border-primary/30 hover:bg-primary/5"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

/* ───────────── Vista diaria: línea de tiempo ───────────── */

/* Franja a la que pertenece una hora, según cada cuánto se dan turnos en la clínica */
function slotDe(hora: string, intervalo = 30) {
  const m = aMinutos(hora);
  return aHora(m - ((m - 8 * 60) % intervalo + intervalo) % intervalo);
}

/* Fin de una franja: "10:30" + 30 min → "11:00" */
function finDeSlot(slot: string, intervalo = 30) {
  return aHora(aMinutos(slot) + intervalo);
}

/* Sala de espera: minutos desde que llegó el paciente (se actualiza solo cada 30 s). */
function useAhora(cadaMs = 30000) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setAhora(Date.now()), cadaMs);
    return () => window.clearInterval(id);
  }, [cadaMs]);
  return ahora;
}
function minutosDesde(iso: string, ahora: number) {
  return Math.max(0, Math.round((ahora - new Date(iso).getTime()) / 60000));
}
function textoEspera(min: number) {
  if (min < 1) return "recién llegó";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  return `hace ${h} h ${min % 60} min`;
}
/* Verde hasta 15 min, ámbar hasta 30, rojo después */
function tonoEspera(min: number) {
  if (min > 30) return "border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300";
  if (min > 15) return "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300";
  return "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300";
}

/* PDF de la agenda del día: una sección por profesional, para imprimir o mandar */
function escaparHtml(t: string) {
  return (t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
async function pdfDelDia(opts: {
  fecha: string;
  turnos: Turno[];
  clinica: string;
  duracionDefecto: number;
  bloqueos: Bloqueo[];
}) {
  const { fecha, clinica, duracionDefecto } = opts;
  const vivos = opts.turnos
    .filter((t) => t.estado !== "Cancelada")
    .sort((a, b) => a.hora.localeCompare(b.hora));
  const profesionales = Array.from(new Set(vivos.map((t) => t.odontologo || "Sin profesional"))).sort((a, b) =>
    a.localeCompare(b),
  );
  const fila = (t: Turno) => {
    const fin = aHora(aMinutos(t.hora) + (t.duracion ?? duracionDefecto));
    return `<tr>
      <td class="h">${escaparHtml(t.hora)}<span>a ${fin}</span></td>
      <td><b>${escaparHtml(t.paciente)}</b>${t.serie && t.serieN ? `<span class="s">Sesión ${t.serieN} de ${t.serieTotal}</span>` : ""}${t.notas ? `<span class="n">${escaparHtml(t.notas)}</span>` : ""}</td>
      <td>${escaparHtml(t.tratamiento)}</td>
      <td>${escaparHtml(nombreConsultorio(t.gabinete))}</td>
      <td><span class="e e-${t.estado}">${escaparHtml(t.estado)}</span></td>
      <td class="c"><span class="box"></span></td>
    </tr>`;
  };
  const bloqueos = opts.bloqueos
    .filter((b) => b.fecha === fecha)
    .map((b) => `<li>${escaparHtml(b.desde)} a ${escaparHtml(b.hasta)} · ${escaparHtml(b.motivo)}</li>`)
    .join("");
  const secciones = profesionales
    .map((p) => {
      const ts = vivos.filter((t) => (t.odontologo || "Sin profesional") === p);
      const min = ts.reduce((s, t) => s + (t.duracion ?? duracionDefecto), 0);
      return `<section><h2>${escaparHtml(p)} <small>${ts.length} turno${ts.length === 1 ? "" : "s"} · ${min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ""}` : `${min} min`}</small></h2>
      <table><thead><tr><th>Hora</th><th>Paciente</th><th>Tratamiento</th><th>Consultorio</th><th>Estado</th><th>Llegó</th></tr></thead>
      <tbody>${ts.map(fila).join("")}</tbody></table></section>`;
    })
    .join("");
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Agenda ${escaparHtml(fecha)}</title>
  <style>body{font-family:system-ui,-apple-system,sans-serif;color:#1f1535;font-size:11.5px}
  header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #7c3aed;padding-bottom:8px;margin-bottom:6px}
  h1{font-size:19px;margin:0}header p{margin:2px 0 0;color:#6b6480}.marca{color:#7c3aed;font-weight:700;font-size:12px;text-align:right}
  h2{font-size:13.5px;color:#6d28d9;margin:18px 0 6px}h2 small{color:#6b6480;font-weight:500;font-size:11px;margin-left:6px}
  table{width:100%;border-collapse:collapse}th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#6b6480;background:#f6f2ff;padding:6px 8px}
  td{padding:7px 8px;border-bottom:1px solid #eee8fb;vertical-align:top}td.h{font-weight:700;white-space:nowrap;width:62px}td.h span{display:block;font-weight:500;color:#6b6480;font-size:10px}
  td span.n,td span.s{display:block;color:#6b6480;font-size:10.5px;margin-top:2px}td span.s{color:#7c3aed}
  .e{display:inline-block;border-radius:999px;padding:2px 8px;font-size:10px;font-weight:600;background:#f1f0f5}
  .e-Confirmada{background:#dcfce7;color:#166534}.e-Pendiente{background:#fef3c7;color:#92400e}.e-Atendida{background:#dbeafe;color:#1e40af}.e-Ausente{background:#fee2e2;color:#991b1b}
  td.c{width:40px;text-align:center}.box{display:inline-block;width:13px;height:13px;border:1.5px solid #a78bfa;border-radius:3px}
  .vacio{color:#6b6480;padding:18px 0}.bloq{color:#6b6480;font-size:11px}footer{margin-top:18px;color:#9d97b0;font-size:9.5px}</style></head><body>
  <header><div><h1>Agenda del ${escaparHtml(nombreDiaLargo(fecha))} ${escaparHtml(formatearFecha(fecha))}</h1><p>${escaparHtml(clinica)} · ${vivos.length} turno${vivos.length === 1 ? "" : "s"}</p></div><div class="marca">Cloud Esther</div></header>
  ${bloqueos ? `<p class="bloq"><b>Horarios bloqueados:</b></p><ul class="bloq">${bloqueos}</ul>` : ""}
  ${secciones || `<p class="vacio">No hay turnos para este día.</p>`}
  <footer>Impreso el ${escaparHtml(formatearFecha(hoyISO()))} a las ${new Date().toTimeString().slice(0, 5)}</footer></body></html>`;
  return descargarPDF(html, `agenda-${fecha}`);
}

/* Sala de espera: quién llegó y hace cuánto espera, con "Pasa" para atenderlo */
function SalaDeEspera({ turnos, onPasa }: { turnos: Turno[]; onPasa: (t: Turno) => void }) {
  const ahora = useAhora();
  const enSala = turnos
    .filter((t) => t.llegada && (t.estado === "Pendiente" || t.estado === "Confirmada"))
    .sort((a, b) => (a.llegada ?? "").localeCompare(b.llegada ?? ""));
  if (!enSala.length) return null;
  return (
    <div className="mb-4 rounded-2xl border border-amber-300/50 bg-gradient-to-br from-amber-50/80 to-white p-3 dark:from-amber-500/10 dark:to-card">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
          <DoorOpen className="size-3.5" />
        </span>
        <p className="text-sm font-semibold tracking-tight">Sala de espera</p>
        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-300">
          {enSala.length}
        </span>
      </div>
      <ul className="space-y-1.5">
        {enSala.map((t) => {
          const min = minutosDesde(t.llegada!, ahora);
          return (
            <li
              key={t.id}
              className="flex items-center gap-2.5 rounded-xl border border-primary/10 bg-white/90 px-2.5 py-2 dark:bg-card"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{t.paciente}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  Turno {t.hora} · {t.odontologo}
                </p>
              </div>
              <span
                className={`shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums ${tonoEspera(min)}`}
              >
                {min < 1 ? "recién" : `${min} min`}
              </span>
              <button
                type="button"
                onClick={() => onPasa(t)}
                className="shrink-0 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                Atendido
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function horaActual() {
  return new Date().toTimeString().slice(0, 5);
}

type FilaDia =
  | { tipo: "turnos"; slot: string; turnos: Turno[] }
  | { tipo: "bloqueo"; slot: string; bloqueo: Bloqueo; inicio: boolean }
  | { tipo: "libre"; slot: string; slots: string[] }
  | { tipo: "ocupado"; slot: string; hasta: string }
  | { tipo: "pasado"; slot: string; hasta: string };

function DiaTimeline({
  fecha,
  hoy,
  turnos,
  bloqueos,
  libres,
  renderTurno,
  onAgendar,
  onDesbloquear,
  intervalo = 30,
  duracionDefecto = 30,
}: {
  fecha: string;
  hoy: string;
  turnos: Turno[];
  bloqueos: Bloqueo[];
  libres: string[];
  renderTurno: (t: Turno) => ReactNode;
  onAgendar: (hora: string) => void;
  onDesbloquear: (id: number) => void;
  intervalo?: number;
  duracionDefecto?: number;
}) {
  const ahora = fecha === hoy ? horaActual() : null;
  // Bloques libres largos (p. ej. agenda cada 5 min) se muestran resumidos hasta tocar "Ver todos"
  const [abiertos, setAbiertos] = useState<string[]>([]);
  const base = horariosDelDia(intervalo);
  const slots = Array.from(
    new Set([...base, ...turnos.map((t) => slotDe(t.hora, intervalo))]),
  ).sort();
  const vivos = turnos.filter((t) => t.estado !== "Cancelada");

  const filas: FilaDia[] = [];
  for (const slot of slots) {
    const ts = turnos
      .filter((t) => slotDe(t.hora, intervalo) === slot)
      .sort((a, b) => a.hora.localeCompare(b.hora));
    // Franja tapada por un turno largo que empezó antes: no se muestra (el turno ya la ocupa)
    const s0 = aMinutos(slot);
    if (!ts.length && vivos.some((t) => aMinutos(t.hora) < s0 && turnoSolapa(t, s0, s0 + intervalo, duracionDefecto)))
      continue;
    const bloqueo = bloqueos.find((b) => slot >= slotDe(b.desde, intervalo) && slot < b.hasta);
    const pasado = fecha < hoy || (ahora !== null && slot < ahora);
    if (ts.length) filas.push({ tipo: "turnos", slot, turnos: ts });
    else if (bloqueo) {
      const prev = filas[filas.length - 1];
      const inicio = !(prev?.tipo === "bloqueo" && prev.bloqueo.id === bloqueo.id);
      filas.push({ tipo: "bloqueo", slot, bloqueo, inicio });
    } else if (libres.includes(slot)) {
      // Los horarios libres seguidos van en una sola fila con botones de hora (menos scroll)
      const prev = filas[filas.length - 1];
      if (prev?.tipo === "libre") prev.slots.push(slot);
      else filas.push({ tipo: "libre", slot, slots: [slot] });
    } else if (pasado) {
      // Los horarios pasados sin actividad se agrupan en una sola fila.
      const prev = filas[filas.length - 1];
      if (prev?.tipo === "pasado") prev.hasta = slot;
      else filas.push({ tipo: "pasado", slot, hasta: slot });
    } else {
      const prev = filas[filas.length - 1];
      if (prev?.tipo === "ocupado") prev.hasta = slot;
      else filas.push({ tipo: "ocupado", slot, hasta: slot });
    }
  }

  const activos = vivos.length;
  // Ocupación según el tiempo reservado sobre la jornada (08 a 20 h)
  const minutosReservados = vivos.reduce((s, t) => s + (t.duracion ?? duracionDefecto), 0);
  const ocupacion = Math.min(100, Math.round((minutosReservados / (12 * 60)) * 100));
  const indiceAhora = ahora ? filas.findIndex((f) => f.slot > ahora) : -1;

  return (
    <div>
      {/* Resumen del día */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        {(
          [
            ["Turnos", activos, "en el día", CalendarDays, "from-primary to-fuchsia-500", "text-primary"],
            ["Libres", libres.length, "para agendar", Clock, "from-emerald-400 to-teal-600", "text-emerald-600"],
            ["Ocupación", `${ocupacion}%`, "de la jornada", CalendarCheck, "from-amber-400 to-orange-500", "text-amber-600"],
          ] as const
        ).map(([l, v, s, I, grad, val]) => (
          <div
            key={l}
            className="group relative overflow-hidden rounded-2xl border border-primary/12 bg-gradient-to-br from-white to-primary/[0.04] px-3 py-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-22px_rgba(124,58,237,0.7)] dark:from-card"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-muted-foreground">{l}</p>
              <span className={`grid size-6 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-white shadow-[0_6px_12px_-6px_rgba(0,0,0,0.4)] ${grad}`}>
                <I className="size-3" />
              </span>
            </div>
            <p className={`mt-0.5 text-xl font-bold tabular-nums ${val}`}>{v}</p>
            <p className="text-[10.5px] text-muted-foreground">{s}</p>
          </div>
        ))}
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-primary/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-pink-400"
          style={{ width: `${ocupacion}%` }}
        />
      </div>

      {turnos.length === 0 && libres.length === 0 && bloqueos.length === 0 ? (
        <SinAtencionEseDia />
      ) : (
      <ol className="relative">
        {filas.map((f, i) => (
          <li key={f.slot}>
            {i === indiceAhora && (
              <div
                className="relative my-1 flex items-center gap-2 pl-[52px]"
                aria-label="Hora actual"
              >
                <span className="absolute left-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold tabular-nums text-primary-foreground shadow-sm">
                  {ahora}
                </span>
                <span className="size-2 rounded-full bg-primary ring-4 ring-primary/15" />
                <span className="h-px flex-1 bg-primary/60" />
              </div>
            )}
            <div className="grid grid-cols-[56px_minmax(0,1fr)] gap-3">
              <div className="pt-2 text-right">
                <span
                  className={`text-[11px] tabular-nums ${f.slot.endsWith(":00") ? "font-bold text-foreground/80" : "font-medium text-muted-foreground/70"}`}
                >
                  {f.slot}
                </span>
              </div>
              <div
                className={`border-t py-1.5 ${f.slot.endsWith(":00") ? "border-primary/12" : "border-dashed border-primary/[0.08]"}`}
              >
                {f.tipo === "turnos" && (
                  <div className="space-y-2">{f.turnos.map(renderTurno)}</div>
                )}
                {f.tipo === "bloqueo" &&
                  (f.inicio ? (
                    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-primary/30 bg-[repeating-linear-gradient(135deg,transparent,transparent_8px,rgba(124,58,237,0.05)_8px,rgba(124,58,237,0.05)_16px)] px-3.5 py-2.5">
                      <span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary">
                        <Lock className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">Horario bloqueado</p>
                        <p className="text-xs text-muted-foreground">
                          {f.bloqueo.desde} a {f.bloqueo.hasta} · {f.bloqueo.motivo}
                        </p>
                      </div>
                      <BotonAccion
                        label="Desbloquear"
                        onClick={() => onDesbloquear(f.bloqueo.id)}
                      />
                    </div>
                  ) : (
                    <div className="h-6 rounded-xl bg-[repeating-linear-gradient(135deg,transparent,transparent_8px,rgba(124,58,237,0.05)_8px,rgba(124,58,237,0.05)_16px)]" />
                  ))}
                {f.tipo === "libre" && (
                  <div className="rounded-2xl border border-dashed border-emerald-500/25 bg-emerald-500/[0.035] px-3 py-2">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      {f.slots.length > 1
                        ? `Libre de ${f.slot} a ${finDeSlot(f.slots[f.slots.length - 1]!, intervalo)}`
                        : "Disponible"}
                      <span className="hidden font-medium text-muted-foreground sm:inline">· tocá una hora para agendar</span>
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {(f.slots.length > 16 && !abiertos.includes(f.slot) ? f.slots.slice(0, 12) : f.slots).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => onAgendar(s)}
                          aria-label={`Agendar a las ${s}`}
                          className="inline-flex h-7 items-center gap-0.5 rounded-full border border-emerald-500/30 bg-white px-2 text-[11.5px] font-semibold sm:h-8 sm:gap-1 sm:px-3 sm:text-xs tabular-nums text-emerald-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:text-primary-foreground dark:bg-card dark:text-emerald-400"
                        >
                          <Plus className="hidden size-3 sm:block" />
                          {s}
                        </button>
                      ))}
                      {f.slots.length > 16 && !abiertos.includes(f.slot) && (
                        <button
                          type="button"
                          onClick={() => setAbiertos((a) => [...a, f.slot])}
                          className="inline-flex h-7 items-center rounded-full border border-dashed border-emerald-500/40 px-2.5 text-[11.5px] font-semibold text-emerald-700 transition hover:bg-emerald-500/10 sm:h-8 sm:px-3 sm:text-xs dark:text-emerald-400"
                        >
                          Ver todos ({f.slots.length})
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {f.tipo === "ocupado" && (
                  <p className="flex h-9 items-center px-3 text-[11px] text-muted-foreground/60">
                    {f.hasta !== f.slot
                      ? `Hasta las ${finDeSlot(f.hasta, intervalo)} · sin profesionales disponibles`
                      : "Sin profesionales disponibles"}
                  </p>
                )}
                {f.tipo === "pasado" && (
                  <p className="flex h-7 items-center px-3 text-[11px] text-muted-foreground/50">
                    {f.hasta !== f.slot ? `Hasta las ${f.hasta} · sin actividad` : "Sin actividad"}
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
      )}
    </div>
  );
}

/* ───────────── Vista semanal: grilla por hora ───────────── */

const HORAS_SEMANA = Array.from({ length: 12 }, (_, i) => String(8 + i).padStart(2, "0"));

function SemanaGrid({
  semana,
  hoy,
  turnos,
  bloqueos,
  onEditar,
  onAgendar,
}: {
  semana: string[];
  hoy: string;
  turnos: Turno[];
  bloqueos: Bloqueo[];
  onEditar: (turno: Turno) => void;
  onAgendar: (fecha: string, hora: string) => void;
}) {
  const horas = Array.from(
    new Set([
      ...HORAS_SEMANA,
      ...turnos.filter((t) => semana.includes(t.fecha)).map((t) => t.hora.slice(0, 2)),
    ]),
  ).sort();
  return (
    <div className="overflow-x-auto rounded-2xl border border-primary/15 bg-white/80 dark:bg-card/80">
      <div className="min-w-[700px]">
        <div className="sticky top-0 z-10 grid grid-cols-[48px_repeat(7,minmax(0,1fr))] border-b border-primary/12 bg-gradient-to-b from-primary/[0.05] to-transparent">
          <div />
          {semana.map((fecha) => {
            const esHoy = fecha === hoy;
            const n = turnos.filter((t) => t.fecha === fecha && t.estado !== "Cancelada").length;
            return (
              <div
                key={fecha}
                className="flex flex-col items-center gap-0.5 border-l border-primary/10 py-2.5"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {nombreDiaCorto(fecha)}
                </span>
                <span
                  className={`grid size-8 place-items-center rounded-full text-sm font-bold ${esHoy ? "bg-primary text-primary-foreground shadow-[0_6px_14px_-6px_rgba(124,58,237,0.8)]" : "text-foreground"}`}
                >
                  {parseISO(fecha).getDate()}
                </span>
                <span className="text-[10px] font-medium text-muted-foreground">
                  {n ? `${n} ${n === 1 ? "turno" : "turnos"}` : "—"}
                </span>
              </div>
            );
          })}
        </div>
        {horas.map((hh) => (
          <div
            key={hh}
            className="grid grid-cols-[48px_repeat(7,minmax(0,1fr))] border-b border-primary/[0.08] last:border-b-0"
          >
            <div className="py-2 pr-2 text-right text-[11px] font-semibold tabular-nums text-muted-foreground">
              {hh}:00
            </div>
            {semana.map((fecha) => {
              const ts = turnos
                .filter((t) => t.fecha === fecha && t.hora.slice(0, 2) === hh)
                .sort((a, b) => a.hora.localeCompare(b.hora));
              const bloqueado = bloqueos.some(
                (b) => b.fecha === fecha && `${hh}:00` >= slotDe(b.desde) && `${hh}:00` < b.hasta,
              );
              const futuro = fecha > hoy || (fecha === hoy && `${hh}:59` > horaActual());
              return (
                <div
                  key={fecha}
                  className={`group min-h-[52px] space-y-1 border-l border-primary/10 p-1 ${fecha === hoy ? "bg-primary/[0.025]" : ""} ${bloqueado ? "bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,rgba(124,58,237,0.06)_6px,rgba(124,58,237,0.06)_12px)]" : ""}`}
                >
                  {ts.map((t) => {
                    const accent = ESTADO_ACCENT[t.estado];
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onEditar(t)}
                        title={`${t.hora} · ${t.paciente} · ${t.tratamiento}`}
                        className={`relative w-full overflow-hidden rounded-lg border py-1 pl-2.5 pr-1.5 text-left transition hover:shadow-md ${accent.soft} ${t.estado === "Cancelada" ? "opacity-50 line-through" : ""}`}
                      >
                        <span className={`absolute inset-y-0 left-0 w-1 ${accent.bar}`} />
                        <span className="block truncate text-[10.5px] font-bold">
                          <span className="tabular-nums">{t.hora}</span> {t.paciente}
                        </span>
                        <span className="block truncate text-[10px] text-muted-foreground">
                          {t.tratamiento}
                        </span>
                      </button>
                    );
                  })}
                  {ts.length === 0 && !bloqueado && futuro && (
                    <button
                      type="button"
                      onClick={() => onAgendar(fecha, `${hh}:00`)}
                      aria-label={`Agendar el ${formatearFecha(fecha)} a las ${hh}:00`}
                      className="grid h-full min-h-[42px] w-full place-items-center rounded-lg text-primary opacity-0 transition hover:bg-primary/[0.06] group-hover:opacity-100"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────── Vista de turnos: tabla con búsqueda y filtros ───────────── */

const ESTADOS_TURNO: EstadoTurno[] = [
  "Pendiente",
  "Confirmada",
  "Atendida",
  "Ausente",
  "Cancelada",
];
type RangoTurnos = "proximos" | "hoy" | "pasados" | "todos";

function etiquetaDia(fecha: string, hoy: string) {
  if (fecha === hoy) return "Hoy";
  if (fecha === sumarDias(hoy, 1)) return "Mañana";
  if (fecha === sumarDias(hoy, -1)) return "Ayer";
  const d = parseISO(fecha);
  return `${nombreDiaLargo(fecha)} ${d.getDate()} de ${new Intl.DateTimeFormat("es-AR", { month: "long" }).format(d)}`;
}

function TurnosTabla({
  turnos,
  hoy,
  vacio,
  onEditar,
  onEstado,
}: {
  turnos: Turno[];
  hoy: string;
  vacio: string;
  onEditar: (turno: Turno) => void;
  onEstado: (turno: Turno, estado: EstadoTurno) => void;
}) {
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<EstadoTurno | "Todos">("Todos");
  const [rango, setRango] = useState<RangoTurnos>("proximos");

  const enRango = turnos.filter((t) =>
    rango === "todos"
      ? true
      : rango === "hoy"
        ? t.fecha === hoy
        : rango === "proximos"
          ? t.fecha >= hoy
          : t.fecha < hoy,
  );
  const texto = q.trim().toLowerCase();
  const buscados = enRango.filter(
    (t) =>
      !texto ||
      `${t.paciente} ${t.tratamiento} ${t.odontologo} ${t.gabinete}`.toLowerCase().includes(texto),
  );
  const lista = buscados
    .filter((t) => estado === "Todos" || t.estado === estado)
    .sort((a, b) =>
      rango === "pasados"
        ? `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`)
        : `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`),
    );
  const grupos = lista.reduce<{ fecha: string; turnos: Turno[] }[]>((acc, t) => {
    const g = acc[acc.length - 1];
    if (g?.fecha === t.fecha) g.turnos.push(t);
    else acc.push({ fecha: t.fecha, turnos: [t] });
    return acc;
  }, []);

  const RANGOS: [RangoTurnos, string][] = [
    ["proximos", "Próximos"],
    ["hoy", "Hoy"],
    ["pasados", "Pasados"],
    ["todos", "Todos"],
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Buscar turnos</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar paciente, tratamiento u odontólogo"
            className={`${INPUT_SM} pl-9`}
          />
        </label>
        <div className="inline-flex rounded-xl border border-primary/15 bg-primary/[0.03] p-0.5">
          {RANGOS.map(([id, l]) => (
            <button
              key={id}
              type="button"
              onClick={() => setRango(id)}
              aria-pressed={rango === id}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${rango === id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {(["Todos", ...ESTADOS_TURNO] as const).map((e) => {
          const n = e === "Todos" ? buscados.length : buscados.filter((t) => t.estado === e).length;
          const activo = estado === e;
          return (
            <button
              key={e}
              type="button"
              onClick={() => setEstado(e)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition ${activo ? "border-primary bg-primary text-primary-foreground" : "border-primary/15 bg-card hover:border-primary/35"}`}
            >
              {e !== "Todos" && (
                <span className={`size-1.5 rounded-full ${ESTADO_ACCENT[e].bar}`} />
              )}
              {e}
              <span
                className={`rounded-full px-1.5 text-[10px] tabular-nums ${activo ? "bg-white/25" : "bg-primary/10 text-primary"}`}
              >
                {n}
              </span>
            </button>
          );
        })}
      </div>

      {lista.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-primary/20 bg-primary/[0.025] px-4 py-10 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
            <CalendarCheck className="size-5" />
          </div>
          <p className="mt-3 text-sm font-semibold">No hay turnos para mostrar</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {texto || estado !== "Todos" ? "Probá con otra búsqueda o estado." : vacio}
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-primary/15 bg-white/80 dark:bg-card/80">
          <div className="hidden grid-cols-[72px_minmax(0,1.5fr)_minmax(0,1.1fr)_minmax(0,1fr)_120px_96px] gap-3 border-b border-primary/12 bg-primary/[0.04] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground md:grid">
            <span>Hora</span>
            <span>Paciente</span>
            <span>Profesional</span>
            <span>Lugar</span>
            <span>Estado</span>
            <span className="text-right">Acciones</span>
          </div>
          {grupos.map((g) => (
            <div key={g.fecha}>
              <div className="flex items-center justify-between gap-2 border-b border-primary/10 bg-gradient-to-r from-primary/[0.06] to-transparent px-4 py-2">
                <p
                  className={`text-xs font-semibold first-letter:uppercase ${g.fecha === hoy ? "text-primary" : "text-foreground"}`}
                >
                  {etiquetaDia(g.fecha, hoy)}
                </p>
                <span className="text-[10.5px] font-medium text-muted-foreground">
                  {formatearFecha(g.fecha)} · {g.turnos.length}{" "}
                  {g.turnos.length === 1 ? "turno" : "turnos"}
                </span>
              </div>
              {g.turnos.map((t) => (
                <div
                  key={t.id}
                  className="grid grid-cols-[60px_minmax(0,1fr)_auto] items-center gap-3 border-b border-primary/[0.07] px-4 py-2.5 transition-colors last:border-b-0 hover:bg-primary/[0.03] md:grid-cols-[72px_minmax(0,1.5fr)_minmax(0,1.1fr)_minmax(0,1fr)_120px_96px]"
                >
                  <span className="text-sm font-bold tabular-nums">{t.hora}</span>
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-[11px] font-bold text-primary">
                      {iniciales(t.paciente)}
                    </span>
                    <div className="min-w-0">
                      <p
                        className={`truncate text-[13px] font-semibold ${t.estado === "Cancelada" ? "text-muted-foreground line-through" : ""}`}
                      >
                        {t.paciente}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">{t.tratamiento}</p>
                    </div>
                  </div>
                  <span className="hidden min-w-0 items-center gap-1.5 truncate text-xs md:flex">
                    <Stethoscope className="size-3.5 shrink-0 text-primary/70" />
                    <span className="truncate">{t.odontologo}</span>
                  </span>
                  <span className="hidden min-w-0 text-xs text-muted-foreground md:block">
                    <span className="block truncate">{t.sucursal}</span>
                    <span className="block truncate text-[10.5px]">{t.gabinete}</span>
                  </span>
                  <span className="hidden md:block">
                    <EstadoBadge estado={t.estado} />
                  </span>
                  <div className="flex items-center justify-end gap-1">
                    {t.estado === "Pendiente" && (
                      <button
                        type="button"
                        onClick={() => onEstado(t, "Confirmada")}
                        title="Confirmar"
                        aria-label={`Confirmar turno de ${t.paciente}`}
                        className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm transition hover:-translate-y-0.5"
                      >
                        <Check className="size-3.5" />
                      </button>
                    )}
                    {t.estado === "Confirmada" && (
                      <button
                        type="button"
                        onClick={() => onEstado(t, "Atendida")}
                        title="Marcar atendida"
                        aria-label={`Marcar atendido a ${t.paciente}`}
                        className="grid size-8 place-items-center rounded-xl bg-emerald-600 text-white shadow-sm transition hover:-translate-y-0.5"
                      >
                        <CalendarCheck className="size-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onEditar(t)}
                      title="Editar"
                      aria-label={`Editar turno de ${t.paciente}`}
                      className="grid size-8 place-items-center rounded-xl border border-primary/12 bg-white text-muted-foreground transition hover:border-primary/30 hover:text-primary dark:bg-card"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────── Mini calendario (columna derecha) ───────────── */

function MiniCalendario({
  fecha,
  hoy,
  turnos,
  onElegir,
}: {
  fecha: string;
  hoy: string;
  turnos: Turno[];
  onElegir: (fecha: string) => void;
}) {
  const [mes, setMes] = useState(fecha.slice(0, 7) + "-01");
  useEffect(() => setMes(fecha.slice(0, 7) + "-01"), [fecha]);
  const dias = obtenerDiasMes(mes);
  const moverMes = (n: number) => {
    const d = parseISO(mes);
    d.setMonth(d.getMonth() + n);
    setMes(toISO(d));
  };
  return (
    <div className={CARD}>
      {/* Mini calendario premium: mes y año, «Hoy», día elegido en degradé, hoy con anillo y
          puntitos según cuántos turnos tiene cada día (1, 2 o 3+). */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[15px] font-semibold tracking-[-0.01em]">
          {(() => {
            const t = nombreMes(mes);
            const [m, ...resto] = t.split(" ");
            const anio = resto.filter((x) => /\d/.test(x)).join(" ");
            return (
              <>
                {(m ?? "").charAt(0).toUpperCase() + (m ?? "").slice(1)}{" "}
                <span className="font-normal text-muted-foreground">{anio}</span>
              </>
            );
          })()}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onElegir(hoy)}
            className="h-7 rounded-full border border-border/70 px-2.5 text-[11px] font-medium text-muted-foreground transition-all hover:border-primary/30 hover:text-primary"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => moverMes(-1)}
            aria-label="Mes anterior"
            className="grid size-7 place-items-center rounded-full border border-border/70 text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary/[0.06] hover:text-primary"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => moverMes(1)}
            aria-label="Mes siguiente"
            className="grid size-7 place-items-center rounded-full border border-border/70 text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary/[0.06] hover:text-primary"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <span key={i} className={`py-1 ${i >= 5 ? "text-muted-foreground/55" : ""}`}>
            {d}
          </span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {dias.map((d, i) => {
          if (!d) return <span key={`v-${i}`} />;
          const n = turnos.filter((t) => t.fecha === d && t.estado !== "Cancelada").length;
          const elegido = d === fecha;
          const esHoy = d === hoy;
          const finde = i % 7 >= 5;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onElegir(d)}
              aria-label={`${parseISO(d).getDate()}: ${n} turno${n === 1 ? "" : "s"}`}
              className={`group relative grid aspect-square place-items-center rounded-full text-[12.5px] tabular-nums transition-all duration-200 ${
                elegido
                  ? "bg-gradient-to-br from-primary to-fuchsia-500 font-semibold text-white shadow-[0_8px_18px_-8px_rgba(124,58,237,0.9)]"
                  : esHoy
                    ? "font-semibold text-primary ring-1 ring-inset ring-primary/40"
                    : `${finde ? "text-foreground/55" : "text-foreground/85"} hover:bg-primary/[0.07] hover:text-primary`
              }`}
            >
              {parseISO(d).getDate()}
              {n > 0 && (
                <span className="absolute bottom-[3px] flex gap-[2px]">
                  {Array.from({ length: Math.min(3, n) }, (_, k) => (
                    <span key={k} className={`size-[3px] rounded-full ${elegido ? "bg-white" : "bg-fuchsia-500"}`} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────── Vista mensual ───────────── */

function MesView({
  fecha,
  turnos,
  onEditar,
}: {
  fecha: string;
  turnos: Turno[];
  onEditar: (turno: Turno) => void;
}) {
  const dias = obtenerDiasMes(fecha);

  return (
    <div className="overflow-x-auto rounded-3xl border border-primary/12 bg-card shadow-[0_18px_40px_-30px_rgba(76,29,149,0.55)]">
      <div className="min-w-[720px] overflow-hidden rounded-3xl">
        <div className="grid grid-cols-7 border-b border-primary/10 bg-gradient-to-r from-primary/[0.05] via-transparent to-fuchsia-500/[0.04]">
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((dia) => (
            <div
              key={dia}
              className="px-2 py-3 text-center text-[10.5px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
            >
              {dia}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {dias.map((fechaDia, index) => {
            if (!fechaDia) {
              return (
                <div
                  key={`empty-${index}`}
                  className="min-h-[92px] border-b border-r border-primary/10 bg-muted/[0.08]"
                />
              );
            }

            const turnosDia = turnos
              .filter((t) => t.fecha === fechaDia)
              .sort((a, b) => a.hora.localeCompare(b.hora));

            const esHoy = fechaDia === hoyISO();

            return (
              <div
                key={fechaDia}
                className={`min-h-[104px] border-b border-r border-primary/[0.08] p-2 transition-colors duration-200 hover:bg-primary/[0.035] ${
                  esHoy ? "bg-gradient-to-br from-primary/[0.08] to-fuchsia-500/[0.05]" : index % 7 >= 5 ? "bg-primary/[0.02]" : ""
                }`}
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <span
                    className={`grid size-7 place-items-center rounded-full text-[12px] tabular-nums ${
                      esHoy
                        ? "bg-gradient-to-br from-primary to-fuchsia-500 font-semibold text-white shadow-[0_6px_14px_-6px_rgba(124,58,237,0.9)]"
                        : "font-medium text-foreground/75"
                    }`}
                  >
                    {parseISO(fechaDia).getDate()}
                  </span>

                  {turnosDia.length > 0 && (
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-primary">
                      {turnosDia.length}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {turnosDia.slice(0, 3).map((turno) => {
                    const accent = ESTADO_ACCENT[turno.estado];

                    return (
                      <button
                        key={turno.id}
                        onClick={() => onEditar(turno)}
                        className={`w-full rounded-lg border px-1.5 py-1 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm ${accent.soft}`}
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-bold tabular-nums">{turno.hora}</span>

                          <span className="truncate text-[9px] font-medium">{turno.paciente}</span>
                        </div>
                      </button>
                    );
                  })}

                  {turnosDia.length > 3 && (
                    <p className="px-1 text-[9px] font-semibold text-primary">
                      +{turnosDia.length - 3} más
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ───────────── Página ───────────── */

function AgendaInner() {
  const { message, show } = useToast();

  const [hoy] = useState(hoyISO);
  const [fechaVista, setFechaVista] = useState(hoyISO);

  // Agenda de la empresa de la sesión (se conserva al navegar; no se cruza entre empresas).
  const { turnos, bloqueos, espera, recordatorios, tareas, ajustes } = storeAgenda.usar();
  // Tiempos de la agenda: los define la clínica (cada cuántos minutos y duración habitual)
  const { intervalo, duracion: duracionHabitual } = tiemposAgenda(ajustes);
  const setTurnos = setTurnosStore;
  const setBloqueos = setBloqueosStore;
  const setEspera = setEsperaStore;
  const setRecordatorios = setRecordatoriosStore;
  const setTareas = setTareasStore;

  // Recuperación automática de turnos: disponible si la clínica tiene el módulo de Automatizaciones
  // (plan 4, o plan 1/2/3 que lo contrataron como adicional).
  const { plan } = useCloudEsther();
  const moduloAuto = MODULES.find((m) => m.id === "automatizaciones");
  const autoDisponible = !!moduloAuto && availableIn(moduloAuto, plan);
  // Al abrir la agenda, se vencen las ofertas que pasaron su plazo.
  useEffect(() => {
    vencerOfertas();
  }, []);

  // Odontólogos del equipo de la empresa y pacientes de su listado.
  const { miembros, ausencias } = useEquipo();
  // Quien no es Administrador ve solo la agenda de sus sedes (Equipo → Sedes donde trabaja)
  const { sedes: misSedes, limitado: sedesLimitadas } = useMisSedes(SUCURSALES);
  /** Ausencia (vacaciones, licencia…) de un profesional en esa fecha, si tiene */
  const ausenciaDe = (odontologo: string, fecha: string) => {
    const m = miembros.find((x) => `${x.firstName} ${x.lastName}`.trim() === odontologo);
    return m ? ausencias.find((a) => a.miembroId === m.id && a.desde <= fecha && a.hasta >= fecha) : undefined;
  };
  const { pacientes: listaPacientes } = usePacientes();
  const real = useClinicaReal();
  const { usuario, clinica: clinicaSesion } = useSesion();
  const odontologosEquipo = miembros
    .filter((m) => m.role === "odontologo" && m.status !== "inactivo")
    .map((m) => `${m.firstName} ${m.lastName}`.trim())
    .filter(Boolean);

  // Punto 2: el administrador/dueño también puede atender. Se lo agrega como profesional
  // seleccionable en la agenda (conserva su rol de admin). En clínica real solo si es admin;
  // en el demo, el dueño de la cuenta.
  const nombreAdmin = (
    real ? (real.rol === "admin" ? real.sesion.usuario.nombre : "") : (usuario?.nombre ?? "")
  ).trim();
  const odontologosConAdmin =
    nombreAdmin && !odontologosEquipo.includes(nombreAdmin)
      ? [...odontologosEquipo, nombreAdmin]
      : odontologosEquipo;

  const [vista, setVista] = useState<Vista>("dia");
  // Start: agenda del día y la semana, lista de turnos y filtro por odontólogo.
  // Pro: vista mensual, bloqueos, todos los filtros, lista de espera y recordatorios.
  // Plus y Enterprise: además, recordatorios automáticos por WhatsApp, SMS o correo.
  const nivelAgenda = useNivel("agenda");
  const agendaAvanzada = nivelAgenda.desde("avanzado");
  const agendaCompleta = nivelAgenda.desde("completo");
  const vistas = VISTAS.filter((v) => agendaAvanzada || v.id !== "mes");
  useEffect(() => {
    if (!agendaAvanzada && vista === "mes") setVista("dia");
  }, [agendaAvanzada, vista]);
  const [modal, setModal] = useState<ModalActivo>(null);

  const [filtros, setFiltros] = useState({
    sucursal: "",
    odontologo: "",
    gabinete: "",
    tratamiento: "",
  });

  // Filtro por profesional: se recuerda (compartido con el Dashboard) y un odontólogo
  // de una clínica real arranca viendo su propia agenda.
  useEffect(() => {
    const guardado = leerProfesionalVisto();
    let elegido = guardado && (odontologosConAdmin.includes(guardado) || turnos.some((t) => t.odontologo === guardado)) ? guardado : "";
    if (!guardado && real?.rol === "odontologo") {
      const yo = normalizarBusqueda(real.sesion.usuario.nombre ?? "");
      elegido =
        odontologosConAdmin.find((p) => normalizarBusqueda(p) === yo || normalizarBusqueda(p).includes(yo)) ?? "";
    }
    if (elegido) setFiltros((f) => (f.odontologo ? f : { ...f, odontologo: elegido }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [odontologosConAdmin.join("|"), real?.rol, turnos.length]);

  const cerrarModal = () => setModal(null);

  // Viene de Comunicación interna (tocó un turno en un mensaje): se va a ese día y se abre el turno
  useEffect(() => {
    let pedido: string | null = null;
    try {
      pedido = sessionStorage.getItem(CLAVE_ABRIR_TURNO);
    } catch {
      return;
    }
    if (!pedido || turnos.length === 0) return;
    const t = turnos.find((x) => String(x.id) === pedido);
    tomarPedidoAbrir("turno");
    if (!t) {
      show("Ese turno ya no está en la agenda.");
      return;
    }
    setFiltros({ sucursal: "", odontologo: "", gabinete: "", tratamiento: "" });
    setVista("dia");
    setFechaVista(t.fecha);
    // Desde Equipo → «Pasarlo» (ausencia): se abre directo para cambiarle el día o el profesional
    let editar = false;
    try {
      editar = sessionStorage.getItem("cloud-esther:abrir-turno-editar") === "1";
      sessionStorage.removeItem("cloud-esther:abrir-turno-editar");
    } catch {
      editar = false;
    }
    if (editar) {
      setModal({ tipo: "cita", turno: t });
      return;
    }
    // Se marca el turno en el día; si no se ve (otra vista o filtro), se abre su detalle
    window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-turno-id="${t.id}"]`);
      if (!el) {
        setModal({ tipo: "cita", turno: t });
        return;
      }
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary", "ring-offset-2");
      window.setTimeout(() => el.classList.remove("ring-2", "ring-primary", "ring-offset-2"), 3500);
    }, 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnos.length]);

  // Viene de Equipo → Ocupación (un hueco libre): Nuevo turno con día, hora y profesional
  useEffect(() => {
    try {
      const crudo = sessionStorage.getItem("cloud-esther:nuevo-turno");
      if (!crudo) return;
      sessionStorage.removeItem("cloud-esther:nuevo-turno");
      const p = JSON.parse(crudo) as { fecha?: string; hora?: string; odontologo?: string };
      if (!p.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(p.fecha)) return;
      setVista("dia");
      setFechaVista(p.fecha);
      setModal({ tipo: "cita", prefill: { fecha: p.fecha, ...(p.hora ? { hora: p.hora } : {}), ...(p.odontologo ? { odontologo: p.odontologo } : {}) } });
    } catch {
      /* sin almacenamiento */
    }
  }, []);

  // Viene de Pacientes → "Dar turno": se abre Nuevo turno con ese paciente cargado
  useEffect(() => {
    try {
      const para = sessionStorage.getItem(CLAVE_TURNO_PARA);
      if (para) {
        sessionStorage.removeItem(CLAVE_TURNO_PARA);
        setModal({ tipo: "cita", prefill: { paciente: para } });
      }
    } catch {
      /* sin almacenamiento */
    }
  }, []);

  const nombresPacientes = Array.from(
    new Set([
      ...listaPacientes.map((p) => `${p.nombre} ${p.apellido}`.trim()),
      ...turnos.map((t) => t.paciente),
      ...espera.map((e) => e.nombre),
    ]),
  ).sort((a, b) => a.localeCompare(b));

  const opcionesAgenda: OpcionesAgenda = {
    odontologos: odontologosConAdmin.length ? odontologosConAdmin : ODONTOLOGOS,
    pacientes: nombresPacientes,
    intervalo,
    duracion: duracionHabitual,
  };

  /* Odontólogos que atienden en esa fecha y hora según su horario cargado en Equipo.
     Si alguien no tiene horario cargado, se lo considera disponible (para no ocultar turnos). */
  const DIAS_SEMANA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const odontologosQueAtienden = (fecha: string, hora: string) => {
    const dia = DIAS_SEMANA[parseISO(fecha).getDay()];
    const aMin = (h?: string) => {
      const [x = 0, y = 0] = (h ?? "").split(":").map(Number);
      return x * 60 + y;
    };
    const t = aMin(hora);
    const delEquipo = miembros.filter((m) => m.role === "odontologo" && m.status !== "inactivo");
    if (!delEquipo.length) return opcionesAgenda.odontologos;
    return delEquipo
      .filter((m) => {
        // De vacaciones o licencia ese día: no atiende
        if (ausencias.some((a) => a.miembroId === m.id && a.desde <= fecha && a.hasta >= fecha)) return false;
        // Mirando una sede: solo los que atienden en esa sede
        if (filtros.sucursal && !trabajaEnSede(m, filtros.sucursal, SUCURSALES)) return false;
        if (sedesLimitadas && !sedesDeMiembro(m, SUCURSALES).some((x) => misSedes.includes(x))) return false;
        if (!m.schedule?.length) return true;
        const d = m.schedule.find((x) => x.day === dia);
        if (!d?.active) return false;
        const enPausa =
          d.breakStart && d.breakEnd && t >= aMin(d.breakStart) && t < aMin(d.breakEnd);
        return t >= aMin(d.start) && t < aMin(d.end) && !enPausa;
      })
      .map((m) => `${m.firstName} ${m.lastName}`.trim());
  };

  /* Horarios libres del día visto (según filtros de odontólogo/gabinete si hay). */
  const horariosLibres = horariosDelDia(intervalo).filter((hora) => {
    // Si se está viendo la agenda de alguien que no está ese día, no hay horarios libres
    if (filtros.odontologo && ausenciaDe(filtros.odontologo, fechaVista)) return false;
    const h0 = aMinutos(hora);
    const bloqueado = bloqueos.some(
      (b) => b.fecha === fechaVista && h0 < aMinutos(b.hasta) && h0 + intervalo > aMinutos(b.desde),
    );
    if (bloqueado) return false;
    // Ocupa la franja cualquier turno que se superponga (según su duración)
    const ocupados = turnos.filter(
      (t) =>
        t.fecha === fechaVista &&
        turnoSolapa(t, h0, h0 + intervalo, duracionHabitual) &&
        t.estado !== "Cancelada" &&
        (!filtros.odontologo || t.odontologo === filtros.odontologo) &&
        (!filtros.gabinete || t.gabinete === filtros.gabinete),
    );
    // Solo cuenta a los odontólogos que atienden ese día y a esa hora (Equipo → Agendas y horarios).
    const disponibles = odontologosQueAtienden(fechaVista, hora);
    if (filtros.odontologo && !disponibles.includes(filtros.odontologo)) return false;
    // Sin filtro: el horario está libre si queda algún odontólogo que atiende sin turno a esa hora.
    return filtros.odontologo || filtros.gabinete
      ? ocupados.length === 0
      : disponibles.filter((o) => !ocupados.some((t) => t.odontologo === o)).length > 0;
  }).filter(
    (hora) =>
      fechaVista > hoy || (fechaVista === hoy && hora > new Date().toTimeString().slice(0, 5)),
  );

  /* Datos derivados */

  const pasaFiltros = (t: Turno) =>
    (!sedesLimitadas || misSedes.includes(t.sucursal)) &&
    (!filtros.sucursal || t.sucursal === filtros.sucursal) &&
    (!filtros.odontologo || t.odontologo === filtros.odontologo) &&
    (!filtros.gabinete || t.gabinete === filtros.gabinete) &&
    (!filtros.tratamiento || t.tratamiento === filtros.tratamiento);

  const hayFiltros = Object.values(filtros).some(Boolean);

  // Las tarjetas de hoy siguen al profesional elegido
  const turnosHoy = turnos.filter(
    (t) =>
      t.fecha === hoy &&
      (!sedesLimitadas || misSedes.includes(t.sucursal)) &&
      (!filtros.odontologo || t.odontologo === filtros.odontologo),
  );

  const contar = (estado: EstadoTurno) => turnosHoy.filter((t) => t.estado === estado).length;

  const turnosDia = turnos.filter((t) => t.fecha === fechaVista).filter(pasaFiltros);

  const bloqueosDia = bloqueos.filter((b) => b.fecha === fechaVista);

  const turnosLista = turnos
    .filter(pasaFiltros)
    .sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`));

  const semana = obtenerSemana(fechaVista);

  const turnosSemana = turnos.filter(pasaFiltros);

  const turnosMes = turnos.filter(pasaFiltros);

  const canalesActivos = recordatorios.filter((r) => r.activo).map((r) => r.canal);

  const tareasOrdenadas = [...tareas].sort(
    (a, b) =>
      Number(a.hecha) - Number(b.hecha) ||
      (a.vence || a.fecha || "9999-99-99").localeCompare(b.vence || b.fecha || "9999-99-99"),
  );

  const tareasPendientes = tareas.filter((t) => !t.hecha).length;

  /* Acciones */

  // Sala de espera: al llegar queda confirmado; al deshacer, vuelve como estaba
  const marcarLlegada = (t: Turno, llego: boolean) => {
    setTurnos((prev) =>
      prev.map((x) => {
        if (x.id !== t.id) return x;
        if (!llego) {
          const { llegada: _l, ...resto } = x;
          return resto;
        }
        return { ...x, llegada: new Date().toISOString(), estado: "Confirmada" };
      }),
    );
    show(llego ? `${t.paciente} llegó: está en la sala de espera` : `${t.paciente}: se quitó la llegada`);
  };

  const cambiarEstado = (t: Turno, estado: EstadoTurno) => {
    setTurnos((prev) =>
      prev.map((x) =>
        x.id === t.id
          ? { ...x, estado, ...(estado === "Atendida" && x.llegada ? { atendidoEn: new Date().toISOString() } : {}) }
          : x,
      ),
    );

    // Al cancelar: si la recuperación automática está activa y la clínica tiene Automatizaciones,
    // el horario liberado se ofrece a los compatibles de la lista de espera.
    if (estado === "Cancelada") {
      const cfg = storePortal.leer().config;
      if (cfg.recuperacionAutomatica !== false && autoDisponible) {
        const n = recuperarTurno(t, { vigenciaMin: cfg.minutosVigenciaOferta ?? 120 });
        show(
          n > 0
            ? `${t.paciente}: cancelado. Se ofreció el horario a ${n} paciente${n === 1 ? "" : "s"} de la lista de espera.`
            : `${t.paciente}: cancelado. Horario liberado (nadie compatible en la lista de espera).`,
        );
        return;
      }
    }
    show(`${t.paciente}: ${estado.toLowerCase()}`);
  };

  const avisoFueraRef = useRef("");
  /* Motivo por el que no se puede dar ese turno (o null si está libre) */
  const conflictoCita = (c: NuevaCita, excluirId?: number): string | null => {
    // El profesional no está ese día (vacaciones, licencia…: Equipo → Ausencias)
    const fuera = c.odontologo ? ausenciaDe(c.odontologo, c.fecha) : undefined;
    if (fuera)
      return `${c.odontologo} no atiende ese día (${fuera.tipo.toLowerCase()}${fuera.desde === fuera.hasta ? "" : ` del ${formatearFecha(fuera.desde).slice(0, 5)} al ${formatearFecha(fuera.hasta).slice(0, 5)}`})`;
    // Se superpone con otro turno del mismo profesional (según la duración de cada uno)
    const c0 = aMinutos(c.hora);
    const c1 = c0 + (c.duracion ?? duracionHabitual);
    const choqueTurno = turnos.find(
      (t) =>
        t.id !== excluirId &&
        t.estado !== "Cancelada" &&
        t.fecha === c.fecha &&
        t.odontologo === c.odontologo &&
        turnoSolapa(t, c0, c1, duracionHabitual),
    );
    if (choqueTurno) {
      const fin = aHora(aMinutos(choqueTurno.hora) + (choqueTurno.duracion ?? duracionHabitual));
      return `${c.odontologo} ya tiene un turno de ${choqueTurno.hora} a ${fin}`;
    }
    const choqueBloqueo = bloqueos.some(
      (b) => b.fecha === c.fecha && c0 < aMinutos(b.hasta) && c1 > aMinutos(b.desde),
    );
    return choqueBloqueo ? "Ese horario está bloqueado" : null;
  };

  const guardarCita = (c: NuevaCita, repetir?: Repeticion) => {
    const editando = modal?.tipo === "cita" ? modal.turno : undefined;

    // Serie de turnos repetidos: se crean los que están libres y se avisa cuáles no
    if (!editando && repetir) {
      const fechas = fechasDeSerie(c.fecha, repetir);
      const serie = `s${Date.now()}`;
      const base = Date.now();
      const nuevos: Turno[] = [];
      const salteados: string[] = [];
      fechas.forEach((f, i) => {
        const cf = { ...c, fecha: f };
        if (conflictoCita(cf)) salteados.push(formatearFecha(f));
        else
          nuevos.push({
            ...cf,
            id: base + i,
            estado: "Pendiente",
            serie,
            serieN: i + 1,
            serieTotal: fechas.length,
          });
      });
      if (!nuevos.length) {
        show("Ninguna fecha está libre a esa hora. Probá otro horario.");
        return;
      }
      setTurnos((prev) => [...prev, ...nuevos]);
      show(
        salteados.length
          ? `Se crearon ${nuevos.length} de ${fechas.length} turnos. Ocupado: ${salteados.join(", ")}`
          : `Se crearon ${nuevos.length} turnos para ${c.paciente}`,
      );
      const esperaId = modal?.tipo === "cita" ? modal.esperaId : undefined;
      if (esperaId) setEspera((prev) => prev.filter((e) => e.id !== esperaId));
      cerrarModal();
      return;
    }

    const motivo = conflictoCita(c, editando?.id);
    if (motivo) {
      show(motivo);
      return;
    }
    // Fuera del horario del profesional (Equipo → Agendas y horarios): se avisa y, si se insiste, se da igual
    const prof = c.odontologo
      ? miembros.find((m) => `${m.firstName} ${m.lastName}`.trim() === c.odontologo)
      : undefined;
    const fuera = prof
      ? !trabajaEnSede(prof, c.sucursal, SUCURSALES)
        ? `no atiende en ${c.sucursal}`
        : fueraDeHorario(prof, c.fecha, c.hora, c.duracion ?? duracionHabitual)
      : null;
    const claveFuera = `${c.odontologo}|${c.fecha}|${c.hora}|${c.sucursal}`;
    const mismoQueAntes =
      editando && editando.odontologo === c.odontologo && editando.fecha === c.fecha && editando.hora === c.hora && editando.sucursal === c.sucursal;
    if (fuera && !mismoQueAntes && avisoFueraRef.current !== claveFuera) {
      avisoFueraRef.current = claveFuera;
      show(`${c.odontologo} ${fuera}. Si igual querés darlo, tocá guardar de nuevo.`);
      return;
    }
    avisoFueraRef.current = "";

    if (editando) {
      setTurnos((prev) => prev.map((t) => (t.id === editando.id ? { ...t, ...c } : t)));

      show("Turno actualizado");
    } else {
      setTurnos((prev) => [
        ...prev,
        {
          ...c,
          id: Date.now(),
          estado: "Pendiente" as const,
        },
      ]);

      show(
        c.fecha === hoy ? "Turno creado para hoy" : `Turno creado para el ${formatearFecha(c.fecha)}`,
      );

      // Si la cita vino de la lista de espera, el paciente sale de la lista.
      const esperaId = modal?.tipo === "cita" ? modal.esperaId : undefined;
      if (esperaId) setEspera((prev) => prev.filter((e) => e.id !== esperaId));
    }

    cerrarModal();
  };

  const agregarBloqueo = (b: Omit<Bloqueo, "id">): string | null => {
    const conTurnos = turnos.some(
      (t) =>
        t.estado !== "Cancelada" && t.fecha === b.fecha && t.hora >= b.desde && t.hora < b.hasta,
    );

    if (conTurnos) {
      return "Hay turnos en ese rango. Reprogramalos o cancelalos antes de bloquear.";
    }

    setBloqueos((prev) => [...prev, { ...b, id: Date.now() }]);

    cerrarModal();
    show(`Horario bloqueado: ${b.desde} a ${b.hasta}`);

    return null;
  };

  const quitarBloqueo = (id: number) => {
    setBloqueos((prev) => prev.filter((b) => b.id !== id));

    show("Horario desbloqueado");
  };

  const agregarEspera = (e: Omit<Espera, "id">) => {
    setEspera((prev) => [...prev, { ...e, id: Date.now() }]);

    cerrarModal();
    show(`${e.nombre} agregado a la lista de espera`);
  };

  const quitarEspera = (p: Espera) => {
    setEspera((prev) => prev.filter((i) => i.id !== p.id));

    show(`${p.nombre} salió de la lista de espera`);
  };

  const alternarRecordatorio = (r: Recordatorio) => {
    setRecordatorios((prev) => prev.map((x) => (x.id === r.id ? { ...x, activo: !x.activo } : x)));

    show(`Recordatorio por ${r.canal}: ${r.activo ? "pausado" : "activado"}`);
  };

  const agregarTarea = (t: NuevaTarea) => {
    setTareas((prev) => [...prev, { ...t, id: Date.now(), hecha: false }]);

    cerrarModal();
    show("Recordatorio guardado");
  };

  const recordarLlamada = (t: Turno) => {
    const texto = `Llamar a ${t.paciente} por su turno de las ${t.hora}`;

    const yaExiste = tareas.some((x) => !x.hecha && x.texto === texto && x.fecha === t.fecha);

    if (yaExiste) {
      show("Ya tenés ese recordatorio");
      return;
    }

    setTareas((prev) => [
      ...prev,
      {
        id: Date.now(),
        texto,
        categoria: CATEGORIAS_TAREA[0] ?? "Llamar al paciente",
        paciente: t.paciente,
        fecha: t.fecha,
        hecha: false,
      },
    ]);

    show(`Recordatorio creado: ${t.paciente}`);
  };

  const alternarTarea = (t: Tarea) => {
    setTareas((prev) => prev.map((x) => (x.id === t.id ? { ...x, hecha: !x.hecha } : x)));

    show(t.hecha ? "Recordatorio reabierto" : "Recordatorio completado");
  };

  const quitarTarea = (t: Tarea) => {
    setTareas((prev) => prev.filter((x) => x.id !== t.id));

    show("Recordatorio eliminado");
  };

  const abrirCitaEn = (fecha: string, hora: string) =>
    setModal({
      tipo: "cita",
      prefill: {
        fecha,
        hora,
        ...(filtros.odontologo ? { odontologo: filtros.odontologo } : {}),
        ...(filtros.gabinete ? { gabinete: filtros.gabinete } : {}),
        ...(filtros.sucursal ? { sucursal: filtros.sucursal } : {}),
      },
    });

  const modalCita = modal?.tipo === "cita" ? modal : null;

  const mensajeVacio = hayFiltros
    ? "No hay turnos para los filtros elegidos."
    : "Todavía no hay turnos. Creá el primero con «Nuevo turno».";

  return (
    <OpcionesAgendaCtx.Provider value={opcionesAgenda}>
      <AppShell>
        <div className="relative min-h-full antialiased">
          <FondoPacientes />

          <div className="relative mx-auto w-full max-w-[1400px] px-4 py-5 md:px-6 lg:px-8">
            {/* Encabezado (mismo sistema visual que el resto de los módulos) */}
            <section className="relative overflow-hidden rounded-[30px] border border-primary/15 bg-gradient-to-br from-white via-white/96 to-primary/[0.045] shadow-[0_20px_55px_-38px_rgba(76,29,149,0.55)]">
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary/55 via-primary to-pink-400/60" />
              <div className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-primary/[0.055] blur-2xl" />
              <div className="relative p-5 md:p-7">
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-primary/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                      <CalendarDays className="size-3.5" />
                      Agenda
                    </span>
                    <h1 className="mt-4 text-[32px] font-bold tracking-[-0.035em] md:text-[40px]">
                      Agenda y turnos
                    </h1>
                    <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-foreground md:text-sm">
                      {agendaAvanzada
                        ? "Gestioná turnos, disponibilidad, profesionales, consultorios y lista de espera desde una única agenda."
                        : "Organizá los turnos del día y de la semana de cada profesional."}
                    </p>
                  </div>
                  <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
                    <button
                      onClick={() => setModal({ tipo: "tiempos" })}
                      className="btn-ce-outline"
                      title="Cada cuántos minutos se dan turnos y cuánto dura uno"
                    >
                      <Clock className="size-3.5" />
                      Tiempos · {intervalo} min
                    </button>
                    <button
                      onClick={() => setModal({ tipo: "online" })}
                      className="btn-ce-outline"
                      title="Tu página pública para que los pacientes saquen turno"
                    >
                      <Globe className="size-3.5" />
                      Turnos online
                    </button>
                    {agendaAvanzada && (
                    <button
                      onClick={() => setModal({ tipo: "bloqueo" })}
                      className="btn-ce-outline"
                    >
                      <Lock className="size-3.5" />
                      Bloquear horario
                    </button>
                    )}
                    <button onClick={() => setModal({ tipo: "cita" })} className="btn-ce">
                      <Plus className="size-3.5" />
                      Nuevo turno
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
                  <StatCard
                    label="Turnos de hoy"
                    value={turnosHoy.length}
                    icon={CalendarDays}
                    sub={filtros.odontologo ? `de ${filtros.odontologo}` : "en la agenda"}
                    tono="violeta"
                  />
                  <StatCard
                    label="Confirmados"
                    value={contar("Confirmada")}
                    icon={Check}
                    sub={`de ${turnosHoy.length} ${turnosHoy.length === 1 ? "turno" : "turnos"}`}
                    tono="verde"
                  />
                  <StatCard
                    label="Pendientes"
                    value={contar("Pendiente")}
                    icon={Clock}
                    sub="por confirmar"
                    tono="ambar"
                  />
                  <StatCard
                    label="Atendidos"
                    value={contar("Atendida")}
                    icon={CalendarCheck}
                    sub="hasta ahora"
                    tono="azul"
                  />
                </div>

                {/* Filtros */}
                <div className="mt-4 rounded-2xl border border-primary/10 bg-primary/[0.025] p-3">
                  <div className="mb-2 flex items-center justify-between gap-3 px-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      Filtros de agenda
                    </p>
                    {hayFiltros && (
                      <button
                        onClick={() => {
                          guardarProfesionalVisto("");
                          setFiltros({
                            sucursal: "",
                            odontologo: "",
                            gabinete: "",
                            tratamiento: "",
                          });
                        }}
                        className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/5"
                      >
                        Limpiar filtros
                      </button>
                    )}
                  </div>
                  <div className={`grid grid-cols-1 gap-2.5 ${agendaAvanzada ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:max-w-xs"}`}>
                    {agendaAvanzada && (
                    <SelectField
                      compact
                      value={filtros.sucursal}
                      onChange={(v) =>
                        setFiltros((f) => ({
                          ...f,
                          sucursal: v,
                        }))
                      }
                      options={misSedes}
                      placeholder={sedesLimitadas ? "Mis sedes" : "Todas las sucursales"}
                    />
                    )}

                    <SelectField
                      compact
                      value={filtros.odontologo}
                      onChange={(v) => {
                        guardarProfesionalVisto(v);
                        setFiltros((f) => ({
                          ...f,
                          odontologo: v,
                        }));
                      }}
                      options={Array.from(
                        new Set([
                          ...opcionesAgenda.odontologos,
                          ...turnos.map((t) => t.odontologo).filter(Boolean),
                        ]),
                      ).sort((a, b) => a.localeCompare(b))}
                      placeholder="Todos los odontólogos"
                    />

                    {agendaAvanzada && (
                    <>
                    <SelectField
                      compact
                      value={filtros.gabinete}
                      onChange={(v) =>
                        setFiltros((f) => ({
                          ...f,
                          gabinete: v,
                        }))
                      }
                      options={GABINETES}
                      placeholder="Todos los consultorios"
                    />

                    <SelectField
                      compact
                      value={filtros.tratamiento}
                      onChange={(v) =>
                        setFiltros((f) => ({
                          ...f,
                          tratamiento: v,
                        }))
                      }
                      options={TRATAMIENTOS}
                      placeholder="Todos los tratamientos"
                    />
                    </>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Selector de vistas */}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex rounded-full border border-primary/20 bg-card/75 p-1 shadow-sm backdrop-blur-sm">
                {vistas.map((v) => {
                  const Icon = v.icon;
                  const activa = vista === v.id;

                  return (
                    <button
                      key={v.id}
                      onClick={() => setVista(v.id)}
                      aria-pressed={activa}
                      className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition-all ${
                        activa
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
                      }`}
                    >
                      <Icon className="size-3.5" />
                      {v.label}
                    </button>
                  );
                })}
              </div>

              <div className="text-[11px] font-medium text-muted-foreground">
                {vista === "dia" && `${turnosDia.length} turnos`}
                {vista === "semana" &&
                  `${turnosSemana.filter((t) => semana.includes(t.fecha)).length} turnos esta semana`}
                {vista === "mes" &&
                  `${
                    turnosMes.filter((t) => t.fecha.startsWith(fechaVista.slice(0, 7))).length
                  } turnos este mes`}
                {vista === "turnos" && `${turnosLista.length} turnos registrados`}
              </div>
            </div>

            {/* Layout principal */}

            <div className="mt-3 grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
              {/* Columna principal */}

              <div className={CARD_MAIN}>
                {vista === "dia" && (
                  <>
                    <PeriodNavigator vista={vista} fecha={fechaVista} onChange={setFechaVista} />

                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={async () => {
                          show("Armando el PDF del día…");
                          const ok = await pdfDelDia({
                            fecha: fechaVista,
                            turnos: turnosDia,
                            clinica: clinicaSesion?.nombre ?? "Mi clínica",
                            duracionDefecto: duracionHabitual,
                            bloqueos,
                          });
                          show(ok ? "PDF del día descargado" : "Se descargó para imprimir desde el navegador");
                        }}
                        className="btn-ce-outline"
                        title={filtros.odontologo ? `Agenda de ${filtros.odontologo}` : "Agenda de todos los profesionales"}
                      >
                        <FileDown className="size-3.5" />
                        PDF del día{filtros.odontologo ? ` · ${filtros.odontologo}` : ""}
                      </button>
                    </div>

                    <div className="my-4 border-t border-primary/10" />

                    {fechaVista === hoy && (
                      <SalaDeEspera turnos={turnosDia} onPasa={(t) => cambiarEstado(t, "Atendida")} />
                    )}

                    {(() => {
                      // Quién no está este día (Equipo → Ausencias): no se le pueden dar turnos
                      const fuera = ausencias
                        .filter((a) => a.desde <= fechaVista && a.hasta >= fechaVista)
                        .map((a) => ({ a, m: miembros.find((x) => x.id === a.miembroId) }))
                        .filter((x) => x.m);
                      if (!fuera.length) return null;
                      const conTurnos = (n: string) => turnosDia.filter((t) => t.odontologo === n && t.estado !== "Cancelada").length;
                      return (
                        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-sky-500/20 bg-sky-50 px-3 py-2 text-xs text-sky-900">
                          <CalendarX className="size-4 shrink-0 text-sky-600" />
                          <span className="font-semibold">No atienden este día:</span>
                          {fuera.map(({ a, m }) => {
                            const n = `${m!.firstName} ${m!.lastName}`.trim();
                            const k = conTurnos(n);
                            return (
                              <span key={a.id} className="rounded-full bg-white px-2 py-0.5 ring-1 ring-sky-500/20">
                                {n} · {a.tipo.toLowerCase()}
                                {k ? <b className="ml-1 text-destructive">· {k} turno{k === 1 ? "" : "s"} para pasar</b> : null}
                              </span>
                            );
                          })}
                          <Link to="/demo/equipo-profesional" hash="ausencias" className="ml-auto font-semibold text-sky-700 hover:underline">
                            Ver ausencias
                          </Link>
                        </div>
                      );
                    })()}

                    <DiaTimeline
                      fecha={fechaVista}
                      hoy={hoy}
                      turnos={turnosDia}
                      bloqueos={bloqueosDia}
                      libres={horariosLibres}
                      onDesbloquear={quitarBloqueo}
                      onAgendar={(hora) => abrirCitaEn(fechaVista, hora)}
                      intervalo={intervalo}
                      duracionDefecto={duracionHabitual}
                      renderTurno={(turno) => (
                        <TurnoCard
                          key={`t-${turno.id}`}
                          turno={turno}
                          canalesActivos={canalesActivos}
                          onEstado={cambiarEstado}
                          onLlegada={marcarLlegada}
                          onRecordar={recordarLlamada}
                          onEditar={(t) =>
                            setModal({
                              tipo: "cita",
                              turno: t,
                            })
                          }
                        />
                      )}
                    />
                  </>
                )}

                {vista === "semana" && (
                  <>
                    <PeriodNavigator vista={vista} fecha={fechaVista} onChange={setFechaVista} />

                    <div className="my-4 border-t border-primary/10" />

                    <SemanaGrid
                      semana={semana}
                      hoy={hoy}
                      turnos={turnosSemana}
                      bloqueos={bloqueos}
                      onAgendar={abrirCitaEn}
                      onEditar={(turno) =>
                        setModal({
                          tipo: "cita",
                          turno,
                        })
                      }
                    />
                  </>
                )}

                {vista === "mes" && (
                  <>
                    <PeriodNavigator vista={vista} fecha={fechaVista} onChange={setFechaVista} />

                    <div className="my-4 border-t border-primary/10" />

                    <MesView
                      fecha={fechaVista}
                      turnos={turnosMes}
                      onEditar={(turno) =>
                        setModal({
                          tipo: "cita",
                          turno,
                        })
                      }
                    />
                  </>
                )}

                {vista === "turnos" && (
                  <>
                    <PeriodNavigator vista={vista} fecha={fechaVista} onChange={setFechaVista} />

                    <div className="my-4 border-t border-primary/10" />

                    <TurnosTabla
                      turnos={turnosLista}
                      hoy={hoy}
                      vacio={mensajeVacio}
                      onEstado={cambiarEstado}
                      onEditar={(turno) =>
                        setModal({
                          tipo: "cita",
                          turno,
                        })
                      }
                    />
                  </>
                )}
              </div>

              {/* Columna derecha */}

              <div className="space-y-3">
                <MiniCalendario
                  fecha={fechaVista}
                  hoy={hoy}
                  turnos={turnosMes}
                  onElegir={(f) => {
                    setFechaVista(f);
                    if (vista === "turnos" || vista === "mes") setVista("dia");
                  }}
                />

                {/* Lista de espera (desde Pro) */}

                {agendaAvanzada && (
                <div className={CARD}>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <IconTile icon={Users} />

                      <div>
                        <h2 className="text-sm font-semibold tracking-tight">Lista de espera</h2>

                        <p className="text-[10px] text-muted-foreground">
                          Pacientes aguardando disponibilidad
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setModal({ tipo: "espera" })}
                      className="flex items-center gap-1.5 rounded-full border border-primary/15 bg-card px-2.5 py-1 text-[11px] font-semibold shadow-sm transition-all hover:border-primary/30 hover:bg-primary/5"
                    >
                      <UserPlus className="size-3.5" />
                      Agregar
                    </button>
                  </div>

                  {espera.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-primary/15 py-5 text-center">
                      <p className="text-xs text-muted-foreground">No hay pacientes en espera</p>
                    </div>
                  ) : (
                    <ul className="space-y-2.5">
                      {espera.map((p) => {
                        const franja = FRANJA_META[p.franja] ?? {
                          icon: Clock,
                          chip: "bg-primary/10 text-primary",
                        };

                        const FranjaIcon = franja.icon;

                        return (
                          <li key={p.id} className={`${ITEM} p-3`}>
                            <div className="flex items-start gap-3">
                              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-xs font-bold text-primary">
                                {iniciales(p.nombre)}
                              </span>

                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold">{p.nombre}</p>

                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                  {p.motivo}
                                </p>
                              </div>

                              <button
                                onClick={() => quitarEspera(p)}
                                aria-label={`Quitar a ${p.nombre} de la lista de espera`}
                                className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>

                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${franja.chip}`}
                              >
                                <FranjaIcon className="size-3" />
                                {p.franja}
                              </span>

                              <span className="inline-flex items-center gap-1 rounded-full border border-primary/10 bg-card px-2.5 py-0.5 text-[10px] font-medium">
                                <MapPin className="size-3 text-muted-foreground" />
                                {p.sucursal}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                setModal({
                                  tipo: "cita",
                                  esperaId: p.id,
                                  prefill: {
                                    paciente: p.nombre,
                                    tratamiento: TRATAMIENTOS.includes(p.motivo)
                                      ? p.motivo
                                      : TRATAMIENTOS[0]!,
                                    sucursal: p.sucursal,
                                    fecha: fechaVista >= hoy ? fechaVista : hoy,
                                  },
                                })
                              }
                              className="btn-ce-outline mt-2.5 w-full"
                            >
                              <CalendarDays />
                              Asignar turno
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                )}

                {/* Recordatorios y tareas (desde Pro) */}

                {agendaAvanzada && (
                <div className={CARD}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <IconTile icon={Bell} />

                      <div>
                        <h2 className="text-sm font-semibold tracking-tight">
                          Recordatorios y tareas
                        </h2>

                        <p className="text-[10px] text-muted-foreground">
                          Pendientes internos del consultorio
                        </p>
                      </div>

                      {tareasPendientes > 0 && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary tabular-nums">
                          {tareasPendientes}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setModal({ tipo: "tarea" })}
                      className="flex items-center gap-1.5 rounded-full border border-primary/15 bg-card px-2.5 py-1 text-[11px] font-semibold shadow-sm transition-all hover:border-primary/30 hover:bg-primary/5"
                    >
                      <Plus className="size-3.5" />
                      Agregar
                    </button>
                  </div>

                  <p className="mb-3 mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    Llamar a un paciente, comprar insumos y otros pendientes del equipo.
                  </p>

                  {tareasOrdenadas.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-primary/15 py-5 text-center">
                      <p className="text-xs text-muted-foreground">
                        No hay recordatorios pendientes
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-2.5">
                      {tareasOrdenadas.map((t) => {
                        // Fecha límite: la que puso Administración (vence) o la del recordatorio
                        const limite = t.vence || t.fecha;
                        const vencida = !t.hecha && !!limite && limite < hoy;

                        const cat = CATEGORIA_META[t.categoria] ?? CATEGORIA_DEFAULT;

                        const CatIcon = cat.icon;

                        const barra = t.hecha
                          ? "bg-muted-foreground/30"
                          : vencida
                            ? "bg-destructive"
                            : cat.bar;

                        return (
                          <li
                            key={t.id}
                            className={`${ITEM} relative flex items-start gap-3 overflow-hidden p-3 pl-4`}
                          >
                            <span
                              aria-hidden
                              className={`absolute inset-y-0 left-0 w-1 ${barra}`}
                            />

                            <button
                              onClick={() => alternarTarea(t)}
                              aria-label={t.hecha ? "Marcar como pendiente" : "Marcar como hecho"}
                              className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-colors ${
                                t.hecha
                                  ? "border-emerald-500 bg-emerald-500 text-white"
                                  : "border-primary/15 bg-card hover:border-primary"
                              }`}
                            >
                              {t.hecha && <Check className="size-3.5" />}
                            </button>

                            <div className="min-w-0 flex-1">
                              <p
                                className={`text-sm font-medium leading-snug ${
                                  t.hecha ? "text-muted-foreground line-through" : ""
                                }`}
                              >
                                {t.texto}
                              </p>

                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${cat.chip}`}
                                >
                                  <CatIcon className="size-3" />
                                  {t.categoria}
                                </span>

                                {t.paciente && (
                                  <span className="rounded-full border border-primary/10 bg-card px-2.5 py-0.5 text-[10px] font-medium">
                                    {t.paciente}
                                  </span>
                                )}

                                {t.responsable && (
                                  <span className="rounded-full border border-primary/15 bg-primary/[0.06] px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                                    {t.responsable}
                                  </span>
                                )}

                                {limite && (
                                  <span
                                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                                      vencida
                                        ? "bg-destructive/10 text-destructive"
                                        : limite === hoy && !t.hecha
                                          ? "bg-primary/10 text-primary"
                                          : "bg-muted text-muted-foreground"
                                    }`}
                                  >
                                    {vencida
                                      ? `Vencido · ${formatearFecha(limite)}`
                                      : limite === hoy
                                        ? "Hoy"
                                        : formatearFecha(limite)}
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() => quitarTarea(t)}
                              aria-label="Eliminar recordatorio"
                              className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                )}

                {/* Recordatorios por WhatsApp (Start y Pro): con un toque desde cada turno */}
                {!agendaCompleta && (
                  <div className={`${CARD} relative overflow-hidden`}>
                    <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 size-32 rounded-full bg-[#25D366]/10 blur-2xl" />
                    <div className="relative flex items-center gap-2">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#25D366] text-white shadow-[0_8px_18px_-10px_rgba(16,185,129,0.9)]">
                        <IconoWhatsApp className="size-4" />
                      </span>
                      <div>
                        <h2 className="text-sm font-semibold tracking-tight">Recordatorios por WhatsApp</h2>
                        <p className="text-[10px] text-muted-foreground">Incluido en tu plan</p>
                      </div>
                    </div>
                    <p className="relative mt-2 text-[11px] leading-relaxed text-muted-foreground">
                      En cada turno pendiente o confirmado tocá el botón verde: se abre WhatsApp con el recordatorio listo para el paciente. También podés mandarlos todos desde Comunicación → Recordatorios.
                    </p>
                  </div>
                )}

                {/* Recordatorios automáticos (Plus y Enterprise) */}

                {agendaCompleta && (
                <div className={CARD}>
                  <div className="flex items-center gap-2">
                    <IconTile icon={BellRing} />

                    <div>
                      <h2 className="text-sm font-semibold tracking-tight">
                        Recordatorios automáticos
                      </h2>

                      <p className="text-[10px] text-muted-foreground">
                        Canales activos para tus pacientes
                      </p>
                    </div>
                  </div>

                  <p className="mb-3 mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    Mensajes que se envían solos antes de cada turno.
                  </p>

                  <ul className="space-y-2.5">
                    {recordatorios.map((r) => {
                      const { icon: CanalIcon, tile } = canalMeta(r.canal);

                      return (
                        <li
                          key={r.id}
                          className={`${ITEM} flex items-center justify-between gap-3 p-3 ${
                            r.activo ? "" : "opacity-70"
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className={`grid size-9 shrink-0 place-items-center rounded-xl border border-primary/10 transition-colors ${
                                r.activo ? tile : "bg-muted text-muted-foreground"
                              }`}
                            >
                              <CanalIcon className="size-4" />
                            </span>

                            <div className="min-w-0">
                              <p className="text-sm font-semibold">{r.canal}</p>

                              <p className="mt-0.5 text-[10px] text-muted-foreground">{r.cuando}</p>
                            </div>
                          </div>

                          <button
                            onClick={() => alternarRecordatorio(r)}
                            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold transition-colors ${
                              r.activo
                                ? "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
                                : "bg-muted text-muted-foreground hover:bg-muted/70"
                            }`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${
                                r.activo ? "bg-emerald-500" : "bg-muted-foreground/50"
                              }`}
                            />

                            {r.activo ? "Activo" : "Pausado"}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modales */}

        {modalCita && (
          <Modal
            title={modalCita.turno ? "Editar turno" : "Nuevo turno"}
            subtitle="Asigná paciente, odontólogo, consultorio y horario."
            onClose={cerrarModal}
          >
            <CitaForm
              inicial={modalCita.turno}
              prefill={modalCita.prefill}
              pacientes={nombresPacientes}
              onSubmit={guardarCita}
              onCancel={cerrarModal}
            />
          </Modal>
        )}

        {modal?.tipo === "tiempos" && (
          <Modal
            title="Tiempos de la agenda"
            subtitle="Cada clínica decide cada cuánto da turnos y cuánto dura cada uno."
            onClose={cerrarModal}
          >
            <TiemposForm
              intervalo={intervalo}
              duracion={duracionHabitual}
              onCancel={cerrarModal}
              onSubmit={(a) => {
                // Solo los tiempos: el resto de los ajustes (turnos online, "volver a llamar") se conserva
                setAjustesAgendaStore((prev) => ({ ...(prev ?? {}), ...a }));
                cerrarModal();
                show(`Agenda cada ${a.intervaloMin} min · turnos de ${a.duracionMin} min`);
              }}
            />
          </Modal>
        )}

        {modal?.tipo === "online" && (
          <Modal
            title="Turnos online"
            subtitle="Tu página para que los pacientes saquen turno solos, las 24 horas."
            onClose={cerrarModal}
          >
            <TurnosOnlinePanel onToast={show} />
          </Modal>
        )}

        {modal?.tipo === "bloqueo" && (
          <Modal
            title="Bloquear horario"
            subtitle="Reservá un rango horario para que no se agenden turnos."
            onClose={cerrarModal}
          >
            <BloqueoForm onSubmit={agregarBloqueo} onCancel={cerrarModal} />
          </Modal>
        )}

        {modal?.tipo === "espera" && (
          <Modal
            title="Agregar a la lista de espera"
            subtitle="Avisaremos cuando se libere un turno."
            onClose={cerrarModal}
          >
            <EsperaForm
              pacientes={nombresPacientes}
              odontologos={odontologosConAdmin}
              onSubmit={agregarEspera}
              onCancel={cerrarModal}
            />
          </Modal>
        )}

        {modal?.tipo === "tarea" && (
          <Modal
            title="Nuevo recordatorio"
            subtitle="Anotá algo pendiente: llamar a un paciente, comprar insumos, etc."
            onClose={cerrarModal}
          >
            <TareaForm
              pacientes={nombresPacientes}
              equipo={miembros
                .filter((m) => m.status !== "inactivo")
                .map((m) => `${m.firstName} ${m.lastName}`.trim())}
              onSubmit={agregarTarea}
              onCancel={cerrarModal}
            />
          </Modal>
        )}

        {message && (
          <div className="fixed bottom-6 right-6 z-50 rounded-full border border-primary/20 bg-foreground px-4 py-2 text-sm font-medium text-background shadow-xl">
            {message}
          </div>
        )}
      </AppShell>
    </OpcionesAgendaCtx.Provider>
  );
}

function AgendaPage() {
  return (
    <CloudEstherProvider>
      <AgendaInner />
    </CloudEstherProvider>
  );
}
