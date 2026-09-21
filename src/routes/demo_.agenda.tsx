import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  CalendarDays, CalendarCheck, Check, Clock, X, Lock, Pencil, Trash2, Users, UserPlus, ChevronDown, Plus, Bell,
  BellRing, MessageCircle, Smartphone, Mail, Phone, ShoppingCart, StickyNote, Sunrise, Sunset, MapPin,
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
type Bloqueo = { id: number; fecha: string; desde: string; hasta: string; motivo: string };
type Espera = { id: number; nombre: string; motivo: string; franja: string; sucursal: string };
type Recordatorio = { id: number; canal: string; cuando: string; activo: boolean };
type Tarea = { id: number; texto: string; categoria: string; paciente: string; fecha: string; hecha: boolean };
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

/* ───────────── Datos ─────────────
   TODO backend: los catálogos (sucursales, odontólogos, gabinetes, tratamientos)
   y los registros de ejemplo de abajo se reemplazan por lo que devuelva la API.
   Hay un solo dato de ejemplo por lista; se borran al conectar. */

const SUCURSALES = ["Clínica Centro"];
const ODONTOLOGOS = ["Dra. Lucía Ferrer"];
const GABINETES = ["Gabinete 1"];
const TRATAMIENTOS = ["Primera consulta"];
const FRANJAS = ["Mañanas", "Tardes", "Hoy"];
const CATEGORIAS_TAREA = ["Llamar al paciente", "Comprar / reponer", "Otro"];

// Dato de ejemplo (borrar al conectar el backend)
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

// Dato de ejemplo (borrar al conectar el backend)
const ESPERA_EJEMPLO: Espera[] = [
  { id: 1, nombre: "Carla Núñez", motivo: TRATAMIENTOS[0], franja: "Tardes", sucursal: SUCURSALES[0] },
];

// Dato de ejemplo (borrar al conectar el backend)
const TAREA_EJEMPLO: Omit<Tarea, "id" | "fecha"> = {
  texto: "Llamar para confirmar el turno",
  categoria: CATEGORIAS_TAREA[0],
  paciente: "Marina Delgado",
  hecha: false,
};

// Configuración de canales (en el backend será la configuración de la clínica)
const RECORDATORIOS_INICIAL: Recordatorio[] = [
  { id: 1, canal: "WhatsApp", cuando: "24 h antes de la cita", activo: true },
  { id: 2, canal: "SMS", cuando: "2 h antes de la cita", activo: true },
  { id: 3, canal: "Correo", cuando: "Al confirmar la cita", activo: true },
];

/* ───────────── Colores semánticos ─────────────
   Violeta (primary) = marca / neutro. Verde = OK. Ámbar = pendiente / atención.
   Rojo = problema. Celeste = comunicación. */

const ESTADO_STYLES: Record<EstadoTurno, string> = {
  Atendida: "bg-primary/10 text-primary",
  Confirmada: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  Pendiente: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  Ausente: "bg-destructive/10 text-destructive",
  Cancelada: "bg-muted text-muted-foreground",
};

// Barra lateral y recuadro de la hora en cada turno del día, según su estado
const ESTADO_ACCENT: Record<EstadoTurno, { bar: string; tile: string }> = {
  Atendida: { bar: "bg-primary", tile: "bg-primary/10 text-primary" },
  Confirmada: { bar: "bg-emerald-500", tile: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  Pendiente: { bar: "bg-amber-500", tile: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  Ausente: { bar: "bg-destructive", tile: "bg-destructive/10 text-destructive" },
  Cancelada: { bar: "bg-muted-foreground/40", tile: "bg-muted text-muted-foreground" },
};

type CanalMeta = { icon: LucideIcon; tile: string; chip: string };

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
  Mañanas: { icon: Sunrise, chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  Tardes: { icon: Sunset, chip: "bg-primary/10 text-primary" },
  Hoy: { icon: CalendarCheck, chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
};

const CATEGORIA_META: Record<string, { icon: LucideIcon; bar: string; chip: string }> = {
  "Llamar al paciente": { icon: Phone, bar: "bg-sky-500", chip: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  "Comprar / reponer": { icon: ShoppingCart, bar: "bg-amber-500", chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  Otro: { icon: StickyNote, bar: "bg-primary", chip: "bg-primary/10 text-primary" },
};

const CATEGORIA_DEFAULT = CATEGORIA_META["Otro"];

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

/* ───────────── Estilos compartidos ───────────── */

const CARD =
  "rounded-xl border border-primary/25 bg-card/90 bg-gradient-to-b from-[oklch(0.96_0.025_292)]/70 to-transparent p-3.5 shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-primary hover:shadow-lg hover:shadow-primary/10";

const CARD_HOVER = `${CARD} hover:-translate-y-0.5`;

// Estilo específico de las 5 cards de estadísticas del día
// (mismo diseño que las cards de datos del paciente: etiqueta arriba, ícono a la derecha, círculo decorativo)
const STAT_CARD =
  "group relative flex flex-col overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-[oklch(0.96_0.03_292)] via-card/90 to-card/60 p-3.5 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10";

const ITEM =
  "rounded-xl border border-border bg-card p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md";

const INPUT =
  "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20";

const INPUT_SM =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20";

const TEXTAREA =
  "min-h-24 w-full resize-y rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20";

/* ───────────── Utilidades ───────────── */

function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const show = (msg: string) => {
    setMessage(msg);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setMessage(null), 2400);
  };
  return { message, show };
}

/* ───────────── Fondo temático (pacientes) ───────────── */

function FondoPacientes() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-primary/[0.02]" />
      <div className="absolute -left-24 -top-24 size-96 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute -bottom-32 -right-24 size-[28rem] rounded-full bg-primary/5 blur-3xl" />
      <svg className="absolute inset-0 size-full text-primary" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="patron-pacientes" width="170" height="170" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.05">
              {/* paciente */}
              <g transform="translate(20 20)">
                <circle cx="12" cy="8" r="5" />
                <path d="M3 26c0-5 4-8 9-8s9 3 9 8" />
              </g>
              {/* diente */}
              <g transform="translate(104 20) scale(1.3)">
                <path d="M12 5.5c-1.2-1-2.6-1.5-4-1.5C5.5 4 4 6 4 8.3c0 2 .9 3.3 1.5 5.2.6 1.8.6 4.5 1.6 6 .7 1 1.9.9 2.4-.3.5-1.2.6-3 1.2-4.2.3-.6.9-1 1.3-1s1 .4 1.3 1c.6 1.2.7 3 1.2 4.2.5 1.2 1.7 1.3 2.4.3 1-1.5 1-4.2 1.6-6 .6-1.9 1.5-3.2 1.5-5.2C20 6 18.5 4 16 4c-1.4 0-2.8.5-4 1.5z" />
              </g>
              {/* turno / agenda */}
              <g transform="translate(24 100)">
                <rect x="2" y="4" width="24" height="22" rx="4" />
                <path d="M2 11h24M9 1v6M19 1v6M9 18l3 3 6-6" />
              </g>
              {/* cruz */}
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
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-primary/15 bg-card bg-gradient-to-b from-primary/[0.06] to-transparent p-6 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            {subtitle && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10"
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
      <select
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
      </select>
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
    <div className="flex justify-end gap-3 pt-2">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-medium shadow-sm transition-colors hover:bg-muted"
      >
        Cancelar
      </button>
      <button
        type="submit"
        className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
      >
        {submitLabel}
      </button>
    </div>
  );
}

function BotonAccion({ icon: Icon, label, onClick }: { icon?: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium shadow-sm transition-colors hover:bg-primary/5"
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
  const [sucursal, setSucursal] = useState(inicial?.sucursal ?? SUCURSALES[0]);
  const [odontologo, setOdontologo] = useState(inicial?.odontologo ?? ODONTOLOGOS[0]);
  const [gabinete, setGabinete] = useState(inicial?.gabinete ?? GABINETES[0]);
  const [tratamiento, setTratamiento] = useState(inicial?.tratamiento ?? TRATAMIENTOS[0]);
  const [fecha, setFecha] = useState(inicial?.fecha ?? "");
  const [hora, setHora] = useState(inicial?.hora ?? "");
  const [notas, setNotas] = useState(inicial?.notas ?? "");

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ paciente: paciente.trim(), sucursal, odontologo, gabinete, tratamiento, fecha, hora, notas: notas.trim() });
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
          <SelectField value={sucursal} onChange={setSucursal} options={SUCURSALES} />
        </Field>
        <Field label="Odontólogo">
          <SelectField value={odontologo} onChange={setOdontologo} options={ODONTOLOGOS} />
        </Field>
        <Field label="Gabinete">
          <SelectField value={gabinete} onChange={setGabinete} options={GABINETES} />
        </Field>
        <Field label="Tratamiento">
          <SelectField value={tratamiento} onChange={setTratamiento} options={TRATAMIENTOS} />
        </Field>
        <Field label="Fecha">
          <input required type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={INPUT} />
        </Field>
        <Field label="Hora">
          <input required type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={INPUT} />
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

      <FormActions submitLabel={inicial ? "Guardar cambios" : "Crear cita"} onCancel={onCancel} />
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
    const resultado = onSubmit({ fecha, desde, hasta, motivo: motivo.trim() || "Horario bloqueado" });
    if (resultado) setError(resultado);
  };

  return (
    <form onSubmit={enviar} className="space-y-4">
      <Field label="Fecha">
        <input autoFocus required type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={INPUT} />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Desde">
          <input required type="time" value={desde} onChange={(e) => { setDesde(e.target.value); setError(""); }} className={INPUT} />
        </Field>
        <Field label="Hasta">
          <input required type="time" value={hasta} onChange={(e) => { setHasta(e.target.value); setError(""); }} className={INPUT} />
        </Field>
      </div>
      <Field label="Motivo" error={error}>
        <input value={motivo} onChange={(e) => setMotivo(e.target.value)} className={INPUT} placeholder="Ej: Reunión de equipo, capacitación" />
      </Field>
      <FormActions submitLabel="Bloquear horario" onCancel={onCancel} />
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
    onSubmit({ nombre: nombre.trim(), motivo, franja, sucursal });
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
        <Field label="Franja horaria">
          <SelectField value={franja} onChange={setFranja} options={FRANJAS} />
        </Field>
        <Field label="Sucursal">
          <SelectField value={sucursal} onChange={setSucursal} options={SUCURSALES} />
        </Field>
      </div>
      <FormActions submitLabel="Agregar a la lista" onCancel={onCancel} />
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
    onSubmit({ categoria, paciente: paciente.trim(), texto: texto.trim(), fecha });
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
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={INPUT} />
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
      <FormActions submitLabel="Guardar recordatorio" onCancel={onCancel} />
    </form>
  );
}

/* ───────────── Piezas de la página ───────────── */

function EstadoBadge({ estado }: { estado: EstadoTurno }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTADO_STYLES[estado]}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {estado}
    </span>
  );
}

// Ícono en recuadro violeta para los títulos de cada card
function IconTile({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
      <Icon className="size-4" />
    </span>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: LucideIcon }) {
  return (
    <div className={STAT_CARD}>
      {/* Círculo decorativo en la esquina superior derecha */}
      <span className="pointer-events-none absolute -right-3 -top-3 size-16 rounded-full bg-primary/10 transition-colors duration-300 group-hover:bg-primary/15" />

      {/* Ícono arriba a la derecha */}
      <Icon className="absolute right-3 top-3 size-4 text-primary/70" />

      <p className="relative pr-8 text-[11px] font-semibold uppercase leading-4 tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="relative mt-0.5 text-2xl font-bold leading-tight tabular-nums">{value}</p>
    </div>
  );
}

const VISTAS: { id: Vista; label: string }[] = [
  { id: "dia", label: "Día" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mes" },
  { id: "turnos", label: "Turnos" },
];

/* ───────────── Página ───────────── */

function AgendaInner() {
  const { message, show } = useToast();
  const [hoy] = useState(hoyISO);
  const [turnos, setTurnos] = useState<Turno[]>(() => [{ ...TURNO_EJEMPLO, id: 1, fecha: hoyISO() }]);
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([]);
  const [espera, setEspera] = useState<Espera[]>(ESPERA_EJEMPLO);
  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>(RECORDATORIOS_INICIAL);
  const [tareas, setTareas] = useState<Tarea[]>(() => [{ ...TAREA_EJEMPLO, id: 1, fecha: hoyISO() }]);
  const [vista, setVista] = useState<Vista>("dia");
  const [modal, setModal] = useState<ModalActivo>(null);
  const [filtros, setFiltros] = useState({ sucursal: "", odontologo: "", gabinete: "", tratamiento: "" });

  const cerrarModal = () => setModal(null);
  const nombresPacientes = Array.from(new Set(turnos.map((t) => t.paciente)));

  /* Datos derivados */

  const pasaFiltros = (t: Turno) =>
    (!filtros.sucursal || t.sucursal === filtros.sucursal) &&
    (!filtros.odontologo || t.odontologo === filtros.odontologo) &&
    (!filtros.gabinete || t.gabinete === filtros.gabinete) &&
    (!filtros.tratamiento || t.tratamiento === filtros.tratamiento);

  const hayFiltros = Object.values(filtros).some(Boolean);
  const turnosHoy = turnos.filter((t) => t.fecha === hoy);
  const contar = (estado: EstadoTurno) => turnosHoy.filter((t) => t.estado === estado).length;

  const turnosDia = turnosHoy.filter(pasaFiltros);
  const bloqueosDia = bloqueos.filter((b) => b.fecha === hoy);
  const itemsDia: ItemDia[] = [
    ...turnosDia.map((t) => ({ tipo: "turno" as const, hora: t.hora, turno: t })),
    ...bloqueosDia.map((b) => ({ tipo: "bloqueo" as const, hora: b.desde, bloqueo: b })),
  ].sort((a, b) => a.hora.localeCompare(b.hora));

  const turnosLista = turnos
    .filter(pasaFiltros)
    .sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`));

  // Canales de aviso automático que están activos (se muestran en cada turno pendiente/confirmado)
  const canalesActivos = recordatorios.filter((r) => r.activo).map((r) => r.canal);

  // Recordatorios/tareas: primero los pendientes, ordenados por fecha (sin fecha al final)
  const tareasOrdenadas = [...tareas].sort(
    (a, b) =>
      Number(a.hecha) - Number(b.hecha) || (a.fecha || "9999-99-99").localeCompare(b.fecha || "9999-99-99"),
  );
  const tareasPendientes = tareas.filter((t) => !t.hecha).length;

  /* Acciones
     TODO backend: cada handler de abajo es el punto donde va la llamada a la API
     (POST / PATCH / DELETE). Hoy solo actualizan el estado local. */

  const cambiarEstado = (t: Turno, estado: EstadoTurno) => {
    // TODO backend: PATCH /turnos/:id { estado }
    setTurnos((prev) => prev.map((x) => (x.id === t.id ? { ...x, estado } : x)));
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
    const choqueBloqueo = bloqueos.some((b) => b.fecha === c.fecha && c.hora >= b.desde && c.hora < b.hasta);
    if (choqueBloqueo) {
      show("Ese horario está bloqueado");
      return;
    }

    if (editando) {
      // TODO backend: PUT /turnos/:id
      setTurnos((prev) => prev.map((t) => (t.id === editando.id ? { ...t, ...c } : t)));
      show("Cita actualizada");
    } else {
      // TODO backend: POST /turnos
      setTurnos((prev) => [...prev, { ...c, id: Date.now(), estado: "Pendiente" as const }]);
      show(c.fecha === hoy ? "Cita creada para hoy" : `Cita creada para el ${formatearFecha(c.fecha)}`);
    }
    cerrarModal();
  };

  const agregarBloqueo = (b: Omit<Bloqueo, "id">): string | null => {
    const conTurnos = turnos.some(
      (t) => t.estado !== "Cancelada" && t.fecha === b.fecha && t.hora >= b.desde && t.hora < b.hasta,
    );
    if (conTurnos) return "Hay turnos en ese rango. Reprogramalos o cancelalos antes de bloquear.";
    // TODO backend: POST /bloqueos
    setBloqueos((prev) => [...prev, { ...b, id: Date.now() }]);
    cerrarModal();
    show(`Horario bloqueado: ${b.desde} a ${b.hasta}`);
    return null;
  };

  const quitarBloqueo = (id: number) => {
    // TODO backend: DELETE /bloqueos/:id
    setBloqueos((prev) => prev.filter((b) => b.id !== id));
    show("Horario desbloqueado");
  };

  const agregarEspera = (e: Omit<Espera, "id">) => {
    // TODO backend: POST /lista-espera
    setEspera((prev) => [...prev, { ...e, id: Date.now() }]);
    cerrarModal();
    show(`${e.nombre} agregado a la lista de espera`);
  };

  const quitarEspera = (p: Espera) => {
    // TODO backend: DELETE /lista-espera/:id
    setEspera((prev) => prev.filter((i) => i.id !== p.id));
    show(`${p.nombre} salió de la lista de espera`);
  };

  const alternarRecordatorio = (r: Recordatorio) => {
    // TODO backend: PATCH /recordatorios/:id { activo }
    setRecordatorios((prev) => prev.map((x) => (x.id === r.id ? { ...x, activo: !x.activo } : x)));
    show(`Recordatorio por ${r.canal}: ${r.activo ? "pausado" : "activado"}`);
  };

  const agregarTarea = (t: NuevaTarea) => {
    // TODO backend: POST /tareas
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
    // TODO backend: POST /tareas
    setTareas((prev) => [
      ...prev,
      { id: Date.now(), texto, categoria: CATEGORIAS_TAREA[0], paciente: t.paciente, fecha: t.fecha, hecha: false },
    ]);
    show(`Recordatorio creado: ${t.paciente}`);
  };

  const alternarTarea = (t: Tarea) => {
    // TODO backend: PATCH /tareas/:id { hecha }
    setTareas((prev) => prev.map((x) => (x.id === t.id ? { ...x, hecha: !x.hecha } : x)));
    show(t.hecha ? "Recordatorio reabierto" : "Recordatorio completado");
  };

  const quitarTarea = (t: Tarea) => {
    // TODO backend: DELETE /tareas/:id
    setTareas((prev) => prev.filter((x) => x.id !== t.id));
    show("Recordatorio eliminado");
  };

  const modalCita = modal?.tipo === "cita" ? modal : null;
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
              <h1 className="font-display text-2xl font-bold tracking-tight">Agenda y turnos</h1>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Gestioná citas, disponibilidad, profesionales, gabinetes y lista de espera desde una única agenda.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setModal({ tipo: "bloqueo" })}
                className="flex items-center gap-2 rounded-lg border border-border bg-background px-3.5 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-muted"
              >
                <Lock className="size-4" />
                Bloquear horario
              </button>
              <button
                onClick={() => setModal({ tipo: "cita" })}
                className="flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
              >
                <Plus className="size-4" />
                Nueva cita
              </button>
            </div>
          </div>

          {/* Estadísticas del día */}
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Total" value={turnosHoy.length} icon={CalendarDays} />
            <StatCard label="Confirmadas" value={contar("Confirmada")} icon={Check} />
            <StatCard label="Pendientes" value={contar("Pendiente")} icon={Clock} />
            <StatCard label="Atendidas" value={contar("Atendida")} icon={CalendarCheck} />
            <StatCard label="Canceladas" value={contar("Cancelada")} icon={X} />
          </div>

          {/* Filtros */}
          <div className={`${CARD} mt-3`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold tracking-tight">Filtros de agenda</h2>
              {hayFiltros && (
                <button
                  onClick={() => setFiltros({ sucursal: "", odontologo: "", gabinete: "", tratamiento: "" })}
                  className="text-xs font-medium text-primary"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
            <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              <SelectField
                compact
                value={filtros.sucursal}
                onChange={(v) => setFiltros((f) => ({ ...f, sucursal: v }))}
                options={SUCURSALES}
                placeholder="Todas las sucursales"
              />
              <SelectField
                compact
                value={filtros.odontologo}
                onChange={(v) => setFiltros((f) => ({ ...f, odontologo: v }))}
                options={ODONTOLOGOS}
                placeholder="Todos los odontólogos"
              />
              <SelectField
                compact
                value={filtros.gabinete}
                onChange={(v) => setFiltros((f) => ({ ...f, gabinete: v }))}
                options={GABINETES}
                placeholder="Todos los gabinetes"
              />
              <SelectField
                compact
                value={filtros.tratamiento}
                onChange={(v) => setFiltros((f) => ({ ...f, tratamiento: v }))}
                options={TRATAMIENTOS}
                placeholder="Todos los tratamientos"
              />
            </div>
          </div>

          {/* Pestañas */}
          <div className="mt-4 inline-flex rounded-full bg-muted/70 p-1 backdrop-blur-sm">
            {VISTAS.map((v) => (
              <button
                key={v.id}
                onClick={() => setVista(v.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  vista === v.id ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
            {/* Columna principal */}
            <div className={CARD}>
              {vista === "dia" && (
                <>
                  <div className="mb-3 flex items-center gap-2">
                    <IconTile icon={CalendarDays} />
                    <h2 className="text-base font-semibold tracking-tight">Agenda del día</h2>
                  </div>

                  {itemsDia.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                      {mensajeVacio}
                    </p>
                  ) : (
                    <ul className="space-y-2.5">
                      {itemsDia.map((item) =>
                        item.tipo === "bloqueo" ? (
                          <li
                            key={`b-${item.bloqueo.id}`}
                            className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
                          >
                            <div className="flex w-14 shrink-0 flex-col items-center gap-1">
                              <span className="text-lg font-bold leading-none tabular-nums">{item.bloqueo.desde}</span>
                              <Lock className="size-3 text-muted-foreground" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold">Horario bloqueado</p>
                              <p className="text-xs leading-relaxed text-muted-foreground">
                                {item.bloqueo.desde} a {item.bloqueo.hasta} · {item.bloqueo.motivo}
                              </p>
                            </div>
                            <BotonAccion label="Desbloquear" onClick={() => quitarBloqueo(item.bloqueo.id)} />
                          </li>
                        ) : (
                          <li
                            key={`t-${item.turno.id}`}
                            className={`${ITEM} relative flex flex-wrap items-center gap-3 overflow-hidden pl-5`}
                          >
                            {/* Barra de color según el estado del turno */}
                            <span
                              aria-hidden
                              className={`absolute inset-y-0 left-0 w-1.5 ${ESTADO_ACCENT[item.turno.estado].bar}`}
                            />

                            <div
                              className={`flex w-16 shrink-0 flex-col items-center gap-1 rounded-xl py-2 ${ESTADO_ACCENT[item.turno.estado].tile}`}
                            >
                              <span className="text-lg font-bold leading-none tabular-nums">{item.turno.hora}</span>
                              <Clock className="size-3 opacity-70" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold">{item.turno.paciente}</p>
                                <EstadoBadge estado={item.turno.estado} />
                              </div>
                              <p className="mt-0.5 text-[13px] text-muted-foreground">{item.turno.tratamiento}</p>
                              <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                                <span>{item.turno.odontologo}</span>
                                <span>{item.turno.sucursal}</span>
                                <span>{item.turno.gabinete}</span>
                              </p>
                              {item.turno.notas && (
                                <p className="mt-1 text-xs italic text-muted-foreground">{item.turno.notas}</p>
                              )}
                              {(item.turno.estado === "Pendiente" || item.turno.estado === "Confirmada") && (
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                  <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                                    <Bell className="size-3.5 shrink-0 text-primary" />
                                    Aviso automático:
                                  </span>
                                  {canalesActivos.length > 0 ? (
                                    canalesActivos.map((canal) => {
                                      const { icon: CanalIcon, chip } = canalMeta(canal);
                                      return (
                                        <span
                                          key={canal}
                                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${chip}`}
                                        >
                                          <CanalIcon className="size-3" />
                                          {canal}
                                        </span>
                                      );
                                    })
                                  ) : (
                                    <span className="text-xs text-muted-foreground">Sin avisos automáticos activos</span>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap justify-end gap-1.5">
                              {item.turno.estado === "Atendida" && (
                                <BotonAccion label="Marcar ausente" onClick={() => cambiarEstado(item.turno, "Ausente")} />
                              )}
                              {item.turno.estado === "Confirmada" && (
                                <>
                                  <BotonAccion icon={Check} label="Atendida" onClick={() => cambiarEstado(item.turno, "Atendida")} />
                                  <BotonAccion icon={Bell} label="Recordar" onClick={() => recordarLlamada(item.turno)} />
                                  <BotonAccion icon={Pencil} label="Editar" onClick={() => setModal({ tipo: "cita", turno: item.turno })} />
                                  <BotonAccion icon={X} label="Cancelar" onClick={() => cambiarEstado(item.turno, "Cancelada")} />
                                </>
                              )}
                              {item.turno.estado === "Pendiente" && (
                                <>
                                  <BotonAccion icon={Check} label="Confirmar" onClick={() => cambiarEstado(item.turno, "Confirmada")} />
                                  <BotonAccion icon={Bell} label="Recordar" onClick={() => recordarLlamada(item.turno)} />
                                  <BotonAccion icon={Pencil} label="Editar" onClick={() => setModal({ tipo: "cita", turno: item.turno })} />
                                  <BotonAccion icon={X} label="Cancelar" onClick={() => cambiarEstado(item.turno, "Cancelada")} />
                                </>
                              )}
                              {(item.turno.estado === "Ausente" || item.turno.estado === "Cancelada") && (
                                <BotonAccion icon={Pencil} label="Editar" onClick={() => setModal({ tipo: "cita", turno: item.turno })} />
                              )}
                            </div>
                          </li>
                        ),
                      )}
                    </ul>
                  )}
                </>
              )}

              {vista === "turnos" && (
                <>
                  <div className="mb-3 flex items-center gap-2">
                    <IconTile icon={CalendarCheck} />
                    <h2 className="text-base font-semibold tracking-tight">Todos los turnos</h2>
                  </div>
                  {turnosLista.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                      {mensajeVacio}
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                            <th className="py-2.5 pr-3 font-semibold">Fecha</th>
                            <th className="py-2.5 pr-3 font-semibold">Hora</th>
                            <th className="py-2.5 pr-3 font-semibold">Paciente</th>
                            <th className="py-2.5 pr-3 font-semibold">Tratamiento</th>
                            <th className="py-2.5 pr-3 font-semibold">Odontólogo</th>
                            <th className="py-2.5 pr-3 font-semibold">Sucursal</th>
                            <th className="py-2.5 font-semibold">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {turnosLista.map((t) => (
                            <tr key={t.id} className="transition-colors hover:bg-primary/5">
                              <td className="py-2.5 pr-3 tabular-nums">{formatearFecha(t.fecha)}</td>
                              <td className="py-2.5 pr-3 font-medium tabular-nums">{t.hora}</td>
                              <td className="py-2.5 pr-3 font-medium">{t.paciente}</td>
                              <td className="py-2.5 pr-3 text-muted-foreground">{t.tratamiento}</td>
                              <td className="py-2.5 pr-3 text-muted-foreground">{t.odontologo}</td>
                              <td className="py-2.5 pr-3 text-muted-foreground">{t.sucursal}</td>
                              <td className="py-2.5"><EstadoBadge estado={t.estado} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {(vista === "semana" || vista === "mes") && (
                <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                  La vista {vista === "semana" ? "semanal" : "mensual"} estará disponible próximamente.
                </p>
              )}
            </div>

            {/* Columna derecha */}
            <div className="space-y-3">
              <div className={CARD}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <IconTile icon={Users} />
                    <h2 className="text-base font-semibold tracking-tight">Lista de espera</h2>
                  </div>
                  <button
                    onClick={() => setModal({ tipo: "espera" })}
                    className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium shadow-sm transition-colors hover:bg-primary/5"
                  >
                    <UserPlus className="size-3.5" />
                    Agregar
                  </button>
                </div>

                {espera.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border py-5 text-center text-xs text-muted-foreground">
                    No hay pacientes en espera
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {espera.map((p) => {
                      const franja = FRANJA_META[p.franja] ?? { icon: Clock, chip: "bg-primary/10 text-primary" };
                      const FranjaIcon = franja.icon;
                      return (
                        <li key={p.id} className={ITEM}>
                          <div className="flex items-start gap-3">
                            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-xs font-bold text-primary-foreground shadow-sm">
                              {iniciales(p.nombre)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold">{p.nombre}</p>
                              <p className="mt-0.5 text-[13px] text-muted-foreground">{p.motivo}</p>
                            </div>
                            <button
                              onClick={() => quitarEspera(p)}
                              aria-label={`Quitar a ${p.nombre} de la lista de espera`}
                              className="rounded-md p-1 transition-colors hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${franja.chip}`}
                            >
                              <FranjaIcon className="size-3" />
                              {p.franja}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium">
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

              {/* Recordatorios y tareas del consultorio */}
              <div className={CARD}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <IconTile icon={Bell} />
                    <h2 className="text-base font-semibold tracking-tight">Recordatorios y tareas</h2>
                    {tareasPendientes > 0 && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary tabular-nums">
                        {tareasPendientes}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setModal({ tipo: "tarea" })}
                    className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium shadow-sm transition-colors hover:bg-primary/5"
                  >
                    <Plus className="size-3.5" />
                    Agregar
                  </button>
                </div>
                <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                  Tus pendientes internos: llamar a un paciente, comprar insumos, etc.
                </p>

                {tareasOrdenadas.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border py-5 text-center text-xs text-muted-foreground">
                    No hay recordatorios pendientes
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {tareasOrdenadas.map((t) => {
                      const vencida = !t.hecha && !!t.fecha && t.fecha < hoy;
                      const cat = CATEGORIA_META[t.categoria] ?? CATEGORIA_DEFAULT;
                      const CatIcon = cat.icon;
                      const barra = t.hecha ? "bg-muted-foreground/30" : vencida ? "bg-destructive" : cat.bar;
                      return (
                        <li key={t.id} className={`${ITEM} relative flex items-start gap-3 overflow-hidden pl-4`}>
                          {/* Barra de color según categoría (rojo si está vencida) */}
                          <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${barra}`} />
                          <button
                            onClick={() => alternarTarea(t)}
                            aria-label={t.hecha ? "Marcar como pendiente" : "Marcar como hecho"}
                            className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-colors ${
                              t.hecha
                                ? "border-emerald-500 bg-emerald-500 text-white"
                                : "border-border bg-background hover:border-primary"
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
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cat.chip}`}
                              >
                                <CatIcon className="size-3" />
                                {t.categoria}
                              </span>
                              {t.paciente && (
                                <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium">
                                  {t.paciente}
                                </span>
                              )}
                              {t.fecha && (
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums ${
                                    vencida
                                      ? "bg-destructive/10 text-destructive"
                                      : t.fecha === hoy && !t.hecha
                                        ? "bg-primary/10 text-primary"
                                        : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {vencida ? `Vencido · ${formatearFecha(t.fecha)}` : t.fecha === hoy ? "Hoy" : formatearFecha(t.fecha)}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => quitarTarea(t)}
                            aria-label="Eliminar recordatorio"
                            className="rounded-md p-1 transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className={CARD}>
                <div className="flex items-center gap-2">
                  <IconTile icon={BellRing} />
                  <h2 className="text-base font-semibold tracking-tight">Recordatorios automáticos</h2>
                </div>
                <p className="mb-3 mt-2 text-xs leading-relaxed text-muted-foreground">
                  Mensajes que se envían solos al paciente antes de su cita para evitar ausencias. Activá o pausá cada canal.
                </p>
                <ul className="space-y-2.5">
                  {recordatorios.map((r) => {
                    const { icon: CanalIcon, tile } = canalMeta(r.canal);
                    return (
                      <li
                        key={r.id}
                        className={`${ITEM} flex items-center justify-between gap-3 ${r.activo ? "" : "opacity-70"}`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={`grid size-9 shrink-0 place-items-center rounded-xl transition-colors ${
                              r.activo ? tile : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <CanalIcon className="size-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">{r.canal}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{r.cuando}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => alternarRecordatorio(r)}
                          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                            r.activo
                              ? "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
                              : "bg-muted text-muted-foreground hover:bg-muted/70"
                          }`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${r.activo ? "bg-emerald-500" : "bg-muted-foreground/50"}`}
                          />
                          {r.activo ? "Activo" : "Pausado"}
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

      {modalCita && (
        <Modal
          title={modalCita.turno ? "Editar cita" : "Nueva cita"}
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
        <Modal title="Bloquear horario" subtitle="Reservá un rango horario para que no se agenden citas." onClose={cerrarModal}>
          <BloqueoForm onSubmit={agregarBloqueo} onCancel={cerrarModal} />
        </Modal>
      )}
      {modal?.tipo === "espera" && (
        <Modal title="Agregar a la lista de espera" subtitle="Avisaremos cuando se libere un turno." onClose={cerrarModal}>
          <EsperaForm pacientes={nombresPacientes} onSubmit={agregarEspera} onCancel={cerrarModal} />
        </Modal>
      )}
      {modal?.tipo === "tarea" && (
        <Modal
          title="Nuevo recordatorio"
          subtitle="Anotá algo pendiente: llamar a un paciente, comprar insumos, etc."
          onClose={cerrarModal}
        >
          <TareaForm pacientes={nombresPacientes} onSubmit={agregarTarea} onCancel={cerrarModal} />
        </Modal>
      )}

      {message && (
        <div className="fixed bottom-6 right-6 z-50 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lg">
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