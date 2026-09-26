import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  CalendarDays,
  CalendarCheck,
  Check,
  Clock,
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppShell } from "@/components/cloud-esther/AppShell";
import { CloudEstherProvider } from "@/lib/cloud-esther/data";

// "demo_" (con guion bajo) hace que esta ruta NO quede anidada dentro de demo.tsx
export const Route = createFileRoute("/demo_/agenda")({
  head: () => ({
    meta: [{ title: "Agenda y turnos | Cloud Esther" }],
  }),
  component: AgendaPage,
});

/* ───────────── Tipos ───────────── */

type EstadoTurno = "Atendida" | "Confirmada" | "Pendiente" | "Ausente" | "Cancelada";

type Turno = {
  id: number;
  fecha: string;
  hora: string;
  paciente: string;
  tratamiento: string;
  odontologo: string;
  sucursal: string;
  gabinete: string;
  estado: EstadoTurno;
  notas: string;
};

type NuevaCita = Omit<Turno, "id" | "estado">;
type Bloqueo = {
  id: number;
  fecha: string;
  desde: string;
  hasta: string;
  motivo: string;
};
type Espera = {
  id: number;
  nombre: string;
  motivo: string;
  franja: string;
  sucursal: string;
};
type Recordatorio = {
  id: number;
  canal: string;
  cuando: string;
  activo: boolean;
};
type Tarea = {
  id: number;
  texto: string;
  categoria: string;
  paciente: string;
  fecha: string;
  hecha: boolean;
};
type NuevaTarea = Omit<Tarea, "id" | "hecha">;
type Vista = "dia" | "semana" | "mes" | "turnos";
type ModalActivo =
  | { tipo: "cita"; turno?: Turno }
  | { tipo: "bloqueo" }
  | { tipo: "espera" }
  | { tipo: "tarea" }
  | null;
type ItemDia =
  | { tipo: "turno"; hora: string; turno: Turno }
  | { tipo: "bloqueo"; hora: string; bloqueo: Bloqueo };

/* ───────────── Datos ───────────── */

const SUCURSALES = ["Clínica Centro"];
const ODONTOLOGOS = ["Dra. Lucía Ferrer"];
const GABINETES = ["Gabinete 1"];
const TRATAMIENTOS = ["Primera consulta"];
const FRANJAS = ["Mañanas", "Tardes", "Hoy"];
const CATEGORIAS_TAREA = ["Llamar al paciente", "Comprar / reponer", "Otro"];

const TURNO_EJEMPLO: Omit<Turno, "id" | "fecha"> = {
  hora: "09:00",
  paciente: "Marina Delgado",
  tratamiento: TRATAMIENTOS[0],
  odontologo: ODONTOLOGOS[0],
  sucursal: SUCURSALES[0],
  gabinete: GABINETES[0],
  estado: "Pendiente",
  notas: "",
};

const ESPERA_EJEMPLO: Espera[] = [
  {
    id: 1,
    nombre: "Carla Núñez",
    motivo: TRATAMIENTOS[0],
    franja: "Tardes",
    sucursal: SUCURSALES[0],
  },
];

const TAREA_EJEMPLO: Omit<Tarea, "id" | "fecha"> = {
  texto: "Llamar para confirmar el turno",
  categoria: CATEGORIAS_TAREA[0],
  paciente: "Marina Delgado",
  hecha: false,
};

const RECORDATORIOS_INICIAL: Recordatorio[] = [
  { id: 1, canal: "WhatsApp", cuando: "24 h antes de la cita", activo: true },
  { id: 2, canal: "SMS", cuando: "2 h antes de la cita", activo: true },
  { id: 3, canal: "Correo", cuando: "Al confirmar la cita", activo: true },
];

/* ───────────── Colores semánticos ───────────── */

const ESTADO_STYLES: Record<EstadoTurno, string> = {
  Atendida: "bg-primary/10 text-primary",
  Confirmada: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  Pendiente: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  Ausente: "bg-destructive/10 text-destructive",
  Cancelada: "bg-muted text-muted-foreground",
};

const ESTADO_ACCENT: Record<
  EstadoTurno,
  { bar: string; tile: string; soft: string }
> = {
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

const CATEGORIA_META: Record<
  string,
  { icon: LucideIcon; bar: string; chip: string }
> = {
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
  "rounded-3xl border border-primary/25 bg-card/95 bg-gradient-to-br from-white via-card/95 to-primary/[0.045] p-4 shadow-sm shadow-primary/5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10";

const ITEM =
  "rounded-2xl border border-primary/18 bg-card/90 shadow-sm shadow-primary/5 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md hover:shadow-primary/8";

const STAT_CARD =
  "group relative flex min-h-[108px] flex-col overflow-hidden rounded-3xl border border-primary/25 bg-white/95 bg-gradient-to-br from-white via-white to-primary/[0.055] p-5 shadow-sm shadow-primary/5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/45 hover:shadow-lg hover:shadow-primary/12";

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

      <svg
        className="absolute inset-0 size-full text-primary"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="patron-pacientes"
            width="170"
            height="170"
            patternUnits="userSpaceOnUse"
          >
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
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {subtitle}
              </p>
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

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>

      {children}

      {error && (
        <span className="mt-1.5 block text-xs text-destructive">{error}</span>
      )}
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
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${compact ? INPUT_SM : INPUT} appearance-none ${
          compact ? "pr-9" : "pr-10"
        }`}
      >
        {placeholder && <option value="">{placeholder}</option>}

        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>

      <ChevronDown
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground ${
          compact ? "right-3 size-3.5" : "right-3.5 size-4"
        }`}
      />
    </div>
  );
}

function FormActions({
  submitLabel,
  onCancel,
}: {
  submitLabel: string;
  onCancel: () => void;
}) {
  return (
    <div className="flex justify-end gap-2.5 pt-2">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-full border border-primary/15 bg-card px-4 py-2 text-xs font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5"
      >
        Cancelar
      </button>

      <button
        type="submit"
        className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
      >
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

function CitaForm({
  inicial,
  pacientes,
  onSubmit,
  onCancel,
}: {
  inicial?: Turno;
  pacientes: string[];
  onSubmit: (c: NuevaCita) => void;
  onCancel: () => void;
}) {
  const [paciente, setPaciente] = useState(inicial?.paciente ?? "");
  const [sucursal, setSucursal] = useState(
    inicial?.sucursal ?? SUCURSALES[0],
  );
  const [odontologo, setOdontologo] = useState(
    inicial?.odontologo ?? ODONTOLOGOS[0],
  );
  const [gabinete, setGabinete] = useState(
    inicial?.gabinete ?? GABINETES[0],
  );
  const [tratamiento, setTratamiento] = useState(
    inicial?.tratamiento ?? TRATAMIENTOS[0],
  );
  const [fecha, setFecha] = useState(inicial?.fecha ?? "");
  const [hora, setHora] = useState(inicial?.hora ?? "");
  const [notas, setNotas] = useState(inicial?.notas ?? "");

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
    });
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
            onChange={setSucursal}
            options={SUCURSALES}
          />
        </Field>

        <Field label="Odontólogo">
          <SelectField
            value={odontologo}
            onChange={setOdontologo}
            options={ODONTOLOGOS}
          />
        </Field>

        <Field label="Gabinete">
          <SelectField
            value={gabinete}
            onChange={setGabinete}
            options={GABINETES}
          />
        </Field>

        <Field label="Tratamiento">
          <SelectField
            value={tratamiento}
            onChange={setTratamiento}
            options={TRATAMIENTOS}
          />
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

      <Field label="Notas">
        <textarea
          rows={3}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          className={TEXTAREA}
          placeholder="Indicaciones para el gabinete o el paciente"
        />
      </Field>

      <FormActions
        submitLabel={inicial ? "Guardar cambios" : "Crear cita"}
        onCancel={onCancel}
      />
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

      <FormActions
        submitLabel="Bloquear horario"
        onCancel={onCancel}
      />
    </form>
  );
}

function EsperaForm({
  pacientes,
  onSubmit,
  onCancel,
}: {
  pacientes: string[];
  onSubmit: (e: Omit<Espera, "id">) => void;
  onCancel: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [motivo, setMotivo] = useState(TRATAMIENTOS[0]);
  const [franja, setFranja] = useState(FRANJAS[0]);
  const [sucursal, setSucursal] = useState(SUCURSALES[0]);

  const enviar = (e: FormEvent) => {
    e.preventDefault();

    onSubmit({
      nombre: nombre.trim(),
      motivo,
      franja,
      sucursal,
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
        <SelectField
          value={motivo}
          onChange={setMotivo}
          options={TRATAMIENTOS}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Franja horaria">
          <SelectField
            value={franja}
            onChange={setFranja}
            options={FRANJAS}
          />
        </Field>

        <Field label="Sucursal">
          <SelectField
            value={sucursal}
            onChange={setSucursal}
            options={SUCURSALES}
          />
        </Field>
      </div>

      <FormActions
        submitLabel="Agregar a la lista"
        onCancel={onCancel}
      />
    </form>
  );
}

function TareaForm({
  pacientes,
  onSubmit,
  onCancel,
}: {
  pacientes: string[];
  onSubmit: (t: NuevaTarea) => void;
  onCancel: () => void;
}) {
  const [categoria, setCategoria] = useState(CATEGORIAS_TAREA[0]);
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
          <SelectField
            value={categoria}
            onChange={setCategoria}
            options={CATEGORIAS_TAREA}
          />
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

      <FormActions
        submitLabel="Guardar recordatorio"
        onCancel={onCancel}
      />
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

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
}) {
  return (
    <div className={STAT_CARD}>
      <span className="pointer-events-none absolute -right-5 -top-5 size-20 rounded-full bg-primary/8 transition-colors duration-300 group-hover:bg-primary/12" />

      <Icon className="absolute right-4 top-4 size-4 text-primary/60" />

      <p className="relative pr-7 text-[10px] font-bold uppercase leading-4 tracking-[0.12em] text-muted-foreground">
        {label}
      </p>

      <p className="relative mt-1 text-2xl font-bold leading-tight tabular-nums">
        {value}
      </p>
    </div>
  );
}

const VISTAS: { id: Vista; label: string; icon: LucideIcon }[] = [
  { id: "dia", label: "Día", icon: CalendarDays },
  { id: "semana", label: "Semana", icon: CalendarCheck },
  { id: "mes", label: "Mes", icon: CalendarDays },
  { id: "turnos", label: "Turnos", icon: Clock },
];

/* ───────────── Card de turno ───────────── */

function TurnoCard({
  turno,
  canalesActivos,
  onEstado,
  onRecordar,
  onEditar,
}: {
  turno: Turno;
  canalesActivos: string[];
  onEstado: (turno: Turno, estado: EstadoTurno) => void;
  onRecordar: (turno: Turno) => void;
  onEditar: (turno: Turno) => void;
}) {
  const accent = ESTADO_ACCENT[turno.estado];

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border bg-card/80 p-3.5 shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${accent.soft}`}
    >
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-1 ${accent.bar}`}
      />

      <div className="flex flex-col gap-3 pl-2 sm:flex-row sm:items-center">
        <div
          className={`flex w-full shrink-0 items-center gap-3 rounded-2xl px-3 py-2.5 sm:w-[100px] sm:flex-col sm:items-center sm:gap-1 ${accent.tile}`}
        >
          <span className="text-lg font-bold leading-none tabular-nums">
            {turno.hora}
          </span>

          <Clock className="size-3.5 opacity-60" />

          <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
            {turno.gabinete}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">{turno.paciente}</p>
            <EstadoBadge estado={turno.estado} />
          </div>

          <p className="mt-1 text-[13px] font-medium text-muted-foreground">
            {turno.tratamiento}
          </p>

          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{turno.odontologo}</span>
            <span>{turno.sucursal}</span>
          </div>

          {turno.notas && (
            <p className="mt-1.5 text-xs italic text-muted-foreground">
              {turno.notas}
            </p>
          )}

          {(turno.estado === "Pendiente" ||
            turno.estado === "Confirmada") && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                <Bell className="size-3.5 text-primary" />
                Avisos:
              </span>

              {canalesActivos.length > 0 ? (
                canalesActivos.map((canal) => {
                  const { icon: CanalIcon, chip } = canalMeta(canal);

                  return (
                    <span
                      key={canal}
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${chip}`}
                    >
                      <CanalIcon className="size-3" />
                      {canal}
                    </span>
                  );
                })
              ) : (
                <span className="text-[11px] text-muted-foreground">
                  Sin avisos automáticos
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-start gap-1.5 sm:justify-end">
          {turno.estado === "Atendida" && (
            <BotonAccion
              label="Marcar ausente"
              onClick={() => onEstado(turno, "Ausente")}
            />
          )}

          {turno.estado === "Confirmada" && (
            <>
              <BotonAccion
                icon={Check}
                label="Atendida"
                onClick={() => onEstado(turno, "Atendida")}
              />

              <BotonAccion
                icon={Bell}
                label="Recordar"
                onClick={() => onRecordar(turno)}
              />

              <BotonAccion
                icon={Pencil}
                label="Editar"
                onClick={() => onEditar(turno)}
              />

              <BotonAccion
                icon={X}
                label="Cancelar"
                onClick={() => onEstado(turno, "Cancelada")}
              />
            </>
          )}

          {turno.estado === "Pendiente" && (
            <>
              <BotonAccion
                icon={Check}
                label="Confirmar"
                onClick={() => onEstado(turno, "Confirmada")}
              />

              <BotonAccion
                icon={Bell}
                label="Recordar"
                onClick={() => onRecordar(turno)}
              />

              <BotonAccion
                icon={Pencil}
                label="Editar"
                onClick={() => onEditar(turno)}
              />

              <BotonAccion
                icon={X}
                label="Cancelar"
                onClick={() => onEstado(turno, "Cancelada")}
              />
            </>
          )}

          {(turno.estado === "Ausente" ||
            turno.estado === "Cancelada") && (
            <BotonAccion
              icon={Pencil}
              label="Editar"
              onClick={() => onEditar(turno)}
            />
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
        ? `${formatearFecha(obtenerSemana(fecha)[0])} — ${formatearFecha(
            obtenerSemana(fecha)[6],
          )}`
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
          <h2 className="mt-1 text-lg font-semibold tracking-tight">
            Todos los turnos
          </h2>
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

        <h2 className="mt-1 truncate text-lg font-semibold capitalize tracking-tight">
          {titulo}
        </h2>
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

/* ───────────── Vista semanal ───────────── */

function SemanaView({
  semana,
  turnos,
  bloqueos,
  onEditar,
}: {
  semana: string[];
  turnos: Turno[];
  bloqueos: Bloqueo[];
  onEditar: (turno: Turno) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-7">
      {semana.map((fecha) => {
        const turnosDia = turnos
          .filter((t) => t.fecha === fecha)
          .sort((a, b) => a.hora.localeCompare(b.hora));

        const bloqueosDia = bloqueos
          .filter((b) => b.fecha === fecha)
          .sort((a, b) => a.desde.localeCompare(b.desde));

        const esHoy = fecha === hoyISO();

        return (
          <div
            key={fecha}
            className={`rounded-2xl border p-2.5 transition-all ${
              esHoy
                ? "border-primary/35 bg-primary/[0.045] shadow-sm"
                : "border-primary/15 bg-card/70"
            }`}
          >
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {nombreDiaCorto(fecha)}
                </p>

                <p
                  className={`mt-0.5 text-lg font-bold ${
                    esHoy ? "text-primary" : ""
                  }`}
                >
                  {parseISO(fecha).getDate()}
                </p>
              </div>

              <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                {turnosDia.length}
              </span>
            </div>

            <div className="space-y-2">
              {turnosDia.map((turno) => {
                const accent = ESTADO_ACCENT[turno.estado];

                return (
                  <button
                    key={turno.id}
                    onClick={() => onEditar(turno)}
                    className={`group relative w-full overflow-hidden rounded-xl border p-2.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${accent.soft}`}
                  >
                    <span
                      className={`absolute inset-y-0 left-0 w-1 ${accent.bar}`}
                    />

                    <div className="pl-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold tabular-nums">
                          {turno.hora}
                        </span>

                        <span className="size-1.5 rounded-full bg-current opacity-60" />
                      </div>

                      <p className="mt-1 truncate text-xs font-semibold">
                        {turno.paciente}
                      </p>

                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                        {turno.tratamiento}
                      </p>
                    </div>
                  </button>
                );
              })}

              {bloqueosDia.map((bloqueo) => (
                <div
                  key={`b-${bloqueo.id}`}
                  className="rounded-xl border border-dashed border-primary/25 bg-primary/[0.035] p-2.5"
                >
                  <div className="flex items-center gap-1.5 text-primary">
                    <Lock className="size-3" />
                    <span className="text-[10px] font-semibold">
                      {bloqueo.desde} — {bloqueo.hasta}
                    </span>
                  </div>

                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {bloqueo.motivo}
                  </p>
                </div>
              ))}

              {turnosDia.length === 0 && bloqueosDia.length === 0 && (
                <div className="rounded-xl border border-dashed border-primary/10 px-2 py-5 text-center">
                  <p className="text-[10px] text-muted-foreground">
                    Sin turnos
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}
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
    <div className="overflow-x-auto rounded-2xl border border-primary/20 bg-white/75 shadow-sm shadow-primary/5">
      <div className="min-w-[720px] overflow-hidden rounded-2xl">
      <div className="grid grid-cols-7 border-b border-primary/15 bg-primary/[0.035]">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((dia) => (
          <div
            key={dia}
            className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
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
              className={`min-h-[92px] border-b border-r border-primary/10 p-1.5 transition-colors hover:bg-primary/[0.025] ${
                esHoy ? "bg-primary/[0.045]" : ""
              }`}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span
                  className={`grid size-6 place-items-center rounded-full text-[10px] font-bold ${
                    esHoy
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {parseISO(fechaDia).getDate()}
                </span>

                {turnosDia.length > 0 && (
                  <span className="text-[9px] font-semibold text-primary">
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
                        <span className="text-[9px] font-bold tabular-nums">
                          {turno.hora}
                        </span>

                        <span className="truncate text-[9px] font-medium">
                          {turno.paciente}
                        </span>
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

  const [turnos, setTurnos] = useState<Turno[]>(() => [
    { ...TURNO_EJEMPLO, id: 1, fecha: hoyISO() },
  ]);

  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([]);
  const [espera, setEspera] = useState<Espera[]>(ESPERA_EJEMPLO);
  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>(
    RECORDATORIOS_INICIAL,
  );
  const [tareas, setTareas] = useState<Tarea[]>(() => [
    { ...TAREA_EJEMPLO, id: 1, fecha: hoyISO() },
  ]);

  const [vista, setVista] = useState<Vista>("dia");
  const [modal, setModal] = useState<ModalActivo>(null);

  const [filtros, setFiltros] = useState({
    sucursal: "",
    odontologo: "",
    gabinete: "",
    tratamiento: "",
  });

  const cerrarModal = () => setModal(null);

  const nombresPacientes = Array.from(
    new Set(turnos.map((t) => t.paciente)),
  );

  /* Datos derivados */

  const pasaFiltros = (t: Turno) =>
    (!filtros.sucursal || t.sucursal === filtros.sucursal) &&
    (!filtros.odontologo || t.odontologo === filtros.odontologo) &&
    (!filtros.gabinete || t.gabinete === filtros.gabinete) &&
    (!filtros.tratamiento || t.tratamiento === filtros.tratamiento);

  const hayFiltros = Object.values(filtros).some(Boolean);

  const turnosHoy = turnos.filter((t) => t.fecha === hoy);

  const contar = (estado: EstadoTurno) =>
    turnosHoy.filter((t) => t.estado === estado).length;

  const turnosDia = turnos
    .filter((t) => t.fecha === fechaVista)
    .filter(pasaFiltros);

  const bloqueosDia = bloqueos.filter((b) => b.fecha === fechaVista);

  const itemsDia: ItemDia[] = [
    ...turnosDia.map((t) => ({
      tipo: "turno" as const,
      hora: t.hora,
      turno: t,
    })),
    ...bloqueosDia.map((b) => ({
      tipo: "bloqueo" as const,
      hora: b.desde,
      bloqueo: b,
    })),
  ].sort((a, b) => a.hora.localeCompare(b.hora));

  const turnosLista = turnos
    .filter(pasaFiltros)
    .sort((a, b) =>
      `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`),
    );

  const semana = obtenerSemana(fechaVista);

  const turnosSemana = turnos.filter(pasaFiltros);

  const turnosMes = turnos.filter(pasaFiltros);

  const canalesActivos = recordatorios
    .filter((r) => r.activo)
    .map((r) => r.canal);

  const tareasOrdenadas = [...tareas].sort(
    (a, b) =>
      Number(a.hecha) - Number(b.hecha) ||
      (a.fecha || "9999-99-99").localeCompare(
        b.fecha || "9999-99-99",
      ),
  );

  const tareasPendientes = tareas.filter((t) => !t.hecha).length;

  /* Acciones */

  const cambiarEstado = (t: Turno, estado: EstadoTurno) => {
    setTurnos((prev) =>
      prev.map((x) => (x.id === t.id ? { ...x, estado } : x)),
    );

    show(`${t.paciente}: ${estado.toLowerCase()}`);
  };

  const guardarCita = (c: NuevaCita) => {
    const editando = modal?.tipo === "cita" ? modal.turno : undefined;

    const choqueTurno = turnos.some(
      (t) =>
        t.id !== editando?.id &&
        t.estado !== "Cancelada" &&
        t.fecha === c.fecha &&
        t.hora === c.hora &&
        t.odontologo === c.odontologo,
    );

    if (choqueTurno) {
      show(`${c.odontologo} ya tiene un turno a las ${c.hora}`);
      return;
    }

    const choqueBloqueo = bloqueos.some(
      (b) =>
        b.fecha === c.fecha &&
        c.hora >= b.desde &&
        c.hora < b.hasta,
    );

    if (choqueBloqueo) {
      show("Ese horario está bloqueado");
      return;
    }

    if (editando) {
      setTurnos((prev) =>
        prev.map((t) =>
          t.id === editando.id ? { ...t, ...c } : t,
        ),
      );

      show("Cita actualizada");
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
        c.fecha === hoy
          ? "Cita creada para hoy"
          : `Cita creada para el ${formatearFecha(c.fecha)}`,
      );
    }

    cerrarModal();
  };

  const agregarBloqueo = (
    b: Omit<Bloqueo, "id">,
  ): string | null => {
    const conTurnos = turnos.some(
      (t) =>
        t.estado !== "Cancelada" &&
        t.fecha === b.fecha &&
        t.hora >= b.desde &&
        t.hora < b.hasta,
    );

    if (conTurnos) {
      return "Hay turnos en ese rango. Reprogramalos o cancelalos antes de bloquear.";
    }

    setBloqueos((prev) => [
      ...prev,
      { ...b, id: Date.now() },
    ]);

    cerrarModal();
    show(`Horario bloqueado: ${b.desde} a ${b.hasta}`);

    return null;
  };

  const quitarBloqueo = (id: number) => {
    setBloqueos((prev) =>
      prev.filter((b) => b.id !== id),
    );

    show("Horario desbloqueado");
  };

  const agregarEspera = (e: Omit<Espera, "id">) => {
    setEspera((prev) => [
      ...prev,
      { ...e, id: Date.now() },
    ]);

    cerrarModal();
    show(`${e.nombre} agregado a la lista de espera`);
  };

  const quitarEspera = (p: Espera) => {
    setEspera((prev) =>
      prev.filter((i) => i.id !== p.id),
    );

    show(`${p.nombre} salió de la lista de espera`);
  };

  const alternarRecordatorio = (r: Recordatorio) => {
    setRecordatorios((prev) =>
      prev.map((x) =>
        x.id === r.id
          ? { ...x, activo: !x.activo }
          : x,
      ),
    );

    show(
      `Recordatorio por ${r.canal}: ${
        r.activo ? "pausado" : "activado"
      }`,
    );
  };

  const agregarTarea = (t: NuevaTarea) => {
    setTareas((prev) => [
      ...prev,
      { ...t, id: Date.now(), hecha: false },
    ]);

    cerrarModal();
    show("Recordatorio guardado");
  };

  const recordarLlamada = (t: Turno) => {
    const texto = `Llamar a ${t.paciente} por su turno de las ${t.hora}`;

    const yaExiste = tareas.some(
      (x) =>
        !x.hecha &&
        x.texto === texto &&
        x.fecha === t.fecha,
    );

    if (yaExiste) {
      show("Ya tenés ese recordatorio");
      return;
    }

    setTareas((prev) => [
      ...prev,
      {
        id: Date.now(),
        texto,
        categoria: CATEGORIAS_TAREA[0],
        paciente: t.paciente,
        fecha: t.fecha,
        hecha: false,
      },
    ]);

    show(`Recordatorio creado: ${t.paciente}`);
  };

  const alternarTarea = (t: Tarea) => {
    setTareas((prev) =>
      prev.map((x) =>
        x.id === t.id
          ? { ...x, hecha: !x.hecha }
          : x,
      ),
    );

    show(
      t.hecha
        ? "Recordatorio reabierto"
        : "Recordatorio completado",
    );
  };

  const quitarTarea = (t: Tarea) => {
    setTareas((prev) =>
      prev.filter((x) => x.id !== t.id),
    );

    show("Recordatorio eliminado");
  };

  const modalCita =
    modal?.tipo === "cita" ? modal : null;

  const mensajeVacio = hayFiltros
    ? "No hay turnos para los filtros elegidos."
    : "Todavía no hay turnos. Creá el primero con «Nueva cita».";

  return (
    <AppShell>
      <div className="relative min-h-full antialiased">
        <FondoPacientes />

        <div className="relative mx-auto w-full max-w-[1400px] px-4 py-5 md:px-6 lg:px-8">
          {/* Encabezado */}

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-card/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-primary shadow-sm backdrop-blur-sm">
                <CalendarDays className="size-3" />
                Agenda
              </div>

              <h1 className="text-2xl font-bold tracking-tight">
                Agenda y turnos
              </h1>

              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Gestioná citas, disponibilidad, profesionales,
                gabinetes y lista de espera desde una única agenda.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setModal({ tipo: "bloqueo" })}
                className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-card/80 px-3.5 py-1.5 text-xs font-semibold shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/5 hover:shadow-md"
              >
                <Lock className="size-3.5" />
                Bloquear horario
              </button>

              <button
                onClick={() => setModal({ tipo: "cita" })}
                className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <Plus className="size-3.5" />
                Nueva cita
              </button>
            </div>
          </div>

          {/* Estadísticas */}

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
              label="Turnos de hoy"
              value={turnosHoy.length}
              icon={CalendarDays}
            />

            <StatCard
              label="Confirmados"
              value={contar("Confirmada")}
              icon={Check}
            />

            <StatCard
              label="Pendientes"
              value={contar("Pendiente")}
              icon={Clock}
            />

            <StatCard
              label="Atendidos"
              value={contar("Atendida")}
              icon={CalendarCheck}
            />
          </div>

          {/* Filtros */}

          <div className={`${CARD} mt-3`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <IconTile icon={CalendarCheck} />

                <div>
                  <h2 className="text-sm font-semibold tracking-tight">
                    Filtros de agenda
                  </h2>

                  <p className="hidden text-[11px] text-muted-foreground sm:block">
                    Filtrá por sucursal, profesional, gabinete o tratamiento.
                  </p>
                </div>
              </div>

              {hayFiltros && (
                <button
                  onClick={() =>
                    setFiltros({
                      sucursal: "",
                      odontologo: "",
                      gabinete: "",
                      tratamiento: "",
                    })
                  }
                  className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/5"
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              <SelectField
                compact
                value={filtros.sucursal}
                onChange={(v) =>
                  setFiltros((f) => ({
                    ...f,
                    sucursal: v,
                  }))
                }
                options={SUCURSALES}
                placeholder="Todas las sucursales"
              />

              <SelectField
                compact
                value={filtros.odontologo}
                onChange={(v) =>
                  setFiltros((f) => ({
                    ...f,
                    odontologo: v,
                  }))
                }
                options={ODONTOLOGOS}
                placeholder="Todos los odontólogos"
              />

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
                placeholder="Todos los gabinetes"
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
            </div>
          </div>

          {/* Selector de vistas */}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-full border border-primary/20 bg-card/75 p-1 shadow-sm backdrop-blur-sm">
              {VISTAS.map((v) => {
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
                `${turnosMes.filter(
                  (t) =>
                    t.fecha.startsWith(
                      fechaVista.slice(0, 7),
                    ),
                ).length} turnos este mes`}
              {vista === "turnos" &&
                `${turnosLista.length} turnos registrados`}
            </div>
          </div>

          {/* Layout principal */}

          <div className="mt-3 grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
            {/* Columna principal */}

            <div className={CARD}>
              {vista === "dia" && (
                <>
                  <PeriodNavigator
                    vista={vista}
                    fecha={fechaVista}
                    onChange={setFechaVista}
                  />

                  <div className="my-4 border-t border-primary/10" />

                  {itemsDia.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-primary/20 bg-primary/[0.025] px-4 py-10 text-center">
                      <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                        <CalendarDays className="size-5" />
                      </div>

                      <p className="mt-3 text-sm font-semibold">
                        No hay actividad para este día
                      </p>

                      <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                        {mensajeVacio}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {itemsDia.map((item) =>
                        item.tipo === "bloqueo" ? (
                          <div
                            key={`b-${item.bloqueo.id}`}
                            className="group relative flex flex-wrap items-center gap-3 overflow-hidden rounded-2xl border border-dashed border-primary/30 bg-primary/[0.035] p-3.5 transition-all hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-md"
                          >
                            <div className="flex w-20 shrink-0 flex-col items-center rounded-2xl border border-primary/15 bg-primary/10 py-2.5 text-primary">
                              <span className="text-lg font-bold leading-none tabular-nums">
                                {item.bloqueo.desde}
                              </span>

                              <Lock className="mt-1 size-3.5 opacity-70" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold">
                                  Horario bloqueado
                                </p>

                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                  Bloqueado
                                </span>
                              </div>

                              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                {item.bloqueo.desde} a{" "}
                                {item.bloqueo.hasta} ·{" "}
                                {item.bloqueo.motivo}
                              </p>
                            </div>

                            <BotonAccion
                              label="Desbloquear"
                              onClick={() =>
                                quitarBloqueo(
                                  item.bloqueo.id,
                                )
                              }
                            />
                          </div>
                        ) : (
                          <TurnoCard
                            key={`t-${item.turno.id}`}
                            turno={item.turno}
                            canalesActivos={canalesActivos}
                            onEstado={cambiarEstado}
                            onRecordar={recordarLlamada}
                            onEditar={(turno) =>
                              setModal({
                                tipo: "cita",
                                turno,
                              })
                            }
                          />
                        ),
                      )}
                    </div>
                  )}
                </>
              )}

              {vista === "semana" && (
                <>
                  <PeriodNavigator
                    vista={vista}
                    fecha={fechaVista}
                    onChange={setFechaVista}
                  />

                  <div className="my-4 border-t border-primary/10" />

                  <SemanaView
                    semana={semana}
                    turnos={turnosSemana}
                    bloqueos={bloqueos}
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
                  <PeriodNavigator
                    vista={vista}
                    fecha={fechaVista}
                    onChange={setFechaVista}
                  />

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
                  <PeriodNavigator
                    vista={vista}
                    fecha={fechaVista}
                    onChange={setFechaVista}
                  />

                  <div className="my-4 border-t border-primary/10" />

                  {turnosLista.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-primary/20 bg-primary/[0.025] px-4 py-10 text-center">
                      <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                        <CalendarCheck className="size-5" />
                      </div>

                      <p className="mt-3 text-sm font-semibold">
                        No hay turnos
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {mensajeVacio}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2.5">
                      {turnosLista.map((turno) => (
                        <div
                          key={turno.id}
                          className="group rounded-2xl border border-primary/15 bg-card/75 p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-center">
                            <div className="flex shrink-0 items-center gap-2.5 md:w-[155px]">
                              <div className="grid size-10 place-items-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
                                <CalendarDays className="size-4" />
                              </div>

                              <div>
                                <p className="text-xs font-bold tabular-nums">
                                  {formatearFecha(
                                    turno.fecha,
                                  )}
                                </p>

                                <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
                                  {turno.hora}
                                </p>
                              </div>
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold">
                                  {turno.paciente}
                                </p>

                                <EstadoBadge
                                  estado={turno.estado}
                                />
                              </div>

                              <p className="mt-1 text-xs text-muted-foreground">
                                {turno.tratamiento}
                              </p>

                              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                                <span>{turno.odontologo}</span>
                                <span>{turno.sucursal}</span>
                                <span>{turno.gabinete}</span>
                              </div>
                            </div>

                            <button
                              onClick={() =>
                                setModal({
                                  tipo: "cita",
                                  turno,
                                })
                              }
                              className="flex items-center justify-center gap-1.5 rounded-full border border-primary/15 bg-card px-3 py-1.5 text-[11px] font-semibold shadow-sm transition-all hover:border-primary/30 hover:bg-primary/5"
                            >
                              <Pencil className="size-3.5" />
                              Editar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Columna derecha */}

            <div className="space-y-3">
              {/* Lista de espera */}

              <div className={CARD}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <IconTile icon={Users} />

                    <div>
                      <h2 className="text-sm font-semibold tracking-tight">
                        Lista de espera
                      </h2>

                      <p className="text-[10px] text-muted-foreground">
                        Pacientes aguardando disponibilidad
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      setModal({ tipo: "espera" })
                    }
                    className="flex items-center gap-1.5 rounded-full border border-primary/15 bg-card px-2.5 py-1 text-[11px] font-semibold shadow-sm transition-all hover:border-primary/30 hover:bg-primary/5"
                  >
                    <UserPlus className="size-3.5" />
                    Agregar
                  </button>
                </div>

                {espera.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-primary/15 py-5 text-center">
                    <p className="text-xs text-muted-foreground">
                      No hay pacientes en espera
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-2.5">
                    {espera.map((p) => {
                      const franja =
                        FRANJA_META[p.franja] ?? {
                          icon: Clock,
                          chip:
                            "bg-primary/10 text-primary",
                        };

                      const FranjaIcon = franja.icon;

                      return (
                        <li
                          key={p.id}
                          className={`${ITEM} p-3`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-xs font-bold text-primary">
                              {iniciales(p.nombre)}
                            </span>

                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold">
                                {p.nombre}
                              </p>

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
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Recordatorios y tareas */}

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
                    onClick={() =>
                      setModal({ tipo: "tarea" })
                    }
                    className="flex items-center gap-1.5 rounded-full border border-primary/15 bg-card px-2.5 py-1 text-[11px] font-semibold shadow-sm transition-all hover:border-primary/30 hover:bg-primary/5"
                  >
                    <Plus className="size-3.5" />
                    Agregar
                  </button>
                </div>

                <p className="mb-3 mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  Llamar a un paciente, comprar insumos y otros
                  pendientes del equipo.
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
                      const vencida =
                        !t.hecha &&
                        !!t.fecha &&
                        t.fecha < hoy;

                      const cat =
                        CATEGORIA_META[t.categoria] ??
                        CATEGORIA_DEFAULT;

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
                            onClick={() =>
                              alternarTarea(t)
                            }
                            aria-label={
                              t.hecha
                                ? "Marcar como pendiente"
                                : "Marcar como hecho"
                            }
                            className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-colors ${
                              t.hecha
                                ? "border-emerald-500 bg-emerald-500 text-white"
                                : "border-primary/15 bg-card hover:border-primary"
                            }`}
                          >
                            {t.hecha && (
                              <Check className="size-3.5" />
                            )}
                          </button>

                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-sm font-medium leading-snug ${
                                t.hecha
                                  ? "text-muted-foreground line-through"
                                  : ""
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

                              {t.fecha && (
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                                    vencida
                                      ? "bg-destructive/10 text-destructive"
                                      : t.fecha === hoy &&
                                          !t.hecha
                                        ? "bg-primary/10 text-primary"
                                        : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {vencida
                                    ? `Vencido · ${formatearFecha(
                                        t.fecha,
                                      )}`
                                    : t.fecha === hoy
                                      ? "Hoy"
                                      : formatearFecha(
                                          t.fecha,
                                        )}
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

              {/* Recordatorios automáticos */}

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
                  Mensajes que se envían solos antes de cada cita.
                </p>

                <ul className="space-y-2.5">
                  {recordatorios.map((r) => {
                    const {
                      icon: CanalIcon,
                      tile,
                    } = canalMeta(r.canal);

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
                              r.activo
                                ? tile
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <CanalIcon className="size-4" />
                          </span>

                          <div className="min-w-0">
                            <p className="text-sm font-semibold">
                              {r.canal}
                            </p>

                            <p className="mt-0.5 text-[10px] text-muted-foreground">
                              {r.cuando}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            alternarRecordatorio(r)
                          }
                          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold transition-colors ${
                            r.activo
                              ? "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
                              : "bg-muted text-muted-foreground hover:bg-muted/70"
                          }`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${
                              r.activo
                                ? "bg-emerald-500"
                                : "bg-muted-foreground/50"
                            }`}
                          />

                          {r.activo
                            ? "Activo"
                            : "Pausado"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modales */}

      {modalCita && (
        <Modal
          title={
            modalCita.turno
              ? "Editar cita"
              : "Nueva cita"
          }
          subtitle="Asigná paciente, odontólogo, gabinete y horario."
          onClose={cerrarModal}
        >
          <CitaForm
            inicial={modalCita.turno}
            pacientes={nombresPacientes}
            onSubmit={guardarCita}
            onCancel={cerrarModal}
          />
        </Modal>
      )}

      {modal?.tipo === "bloqueo" && (
        <Modal
          title="Bloquear horario"
          subtitle="Reservá un rango horario para que no se agenden citas."
          onClose={cerrarModal}
        >
          <BloqueoForm
            onSubmit={agregarBloqueo}
            onCancel={cerrarModal}
          />
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
  );
}

function AgendaPage() {
  return (
    <CloudEstherProvider>
      <AgendaInner />
    </CloudEstherProvider>
  );
}