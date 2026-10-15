import { capitalizarNombre } from "@/lib/utils";
import {
  GABINETES,
  ODONTOLOGOS,
  SUCURSALES,
  TRATAMIENTOS,
  setTurnosStore,
  storeAgenda,
  type EstadoTurno,
} from "@/lib/cloud-esther/agenda-store";
import { useEquipo } from "@/lib/cloud-esther/equipo-store";
import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import {
  Clock, DollarSign, Bell, TriangleAlert, FileText, FileSpreadsheet, Printer, Share2,
  CalendarCheck, UserSearch, ReceiptText, BellRing,
  Calendar, MessageSquare, Settings, ChevronDown, Search, Command, UserPlus, CalendarPlus, X, ImagePlus, Users, UserRound, Stethoscope, ShieldCheck, ExternalLink,
  BarChart3, ChevronRight,
} from "lucide-react";
import { AppShell } from "@/components/cloud-esther/AppShell";
import { CloudEstherProvider, useCloudEsther } from "@/lib/cloud-esther/data";
import { contarPacientesActivos, leerPacientes, usePacientes } from "@/lib/cloud-esther/pacientes";
import { dentroDelLimite, MENSAJE_LIMITE } from "@/lib/cloud-esther/planes-config";
import { useSesion } from "@/lib/cloud-esther/auth-store";
import { salirYVolver, useClinicaReal } from "@/lib/clinica/modo-clinica";
import { NOMBRE_ROL } from "@/lib/clinica/permisos";
import { HeroParallax } from "@/components/cloud-esther/HeroParallax";
import { GraficoBarras, GraficoEvolucion } from "@/components/cloud-esther/graficos-premium";
import { descargarPDFdeElemento } from "@/lib/descargas";

export const Route = createLazyFileRoute("/demo")({
  component: DashboardPage,
});

/* ───────────── Tipos ───────────── */

/* Los turnos del dashboard son los de "Agenda y turnos" (mismo store por empresa). */
type Turno = { id: number; hora: string; paciente: string; detalle: string; estado: EstadoTurno };
type Actividad = { id: number; hora: string; quien: string; accion: string };
type ModalActivo = "cita" | "paciente" | "presupuesto" | null;

/* ───────────── Datos de ejemplo ───────────── */

const STATS = [
  { label: "Turnos de hoy", value: "11", valueColor: "text-primary", tono: "from-primary to-fuchsia-500", icon: Clock, delta: "+9%", deltaColor: "text-emerald-600", sub: "7 confirmados · 2 pendientes" },
  { label: "Ingresos del día", value: "$ 1.284.000", valueColor: "text-emerald-600", tono: "from-emerald-500 to-teal-500", icon: DollarSign, delta: "+14%", deltaColor: "text-emerald-600", sub: "6 cobros registrados" },
  { label: "Recordatorios enviados", value: "34", valueColor: "text-foreground", tono: "from-sky-500 to-indigo-500", icon: Bell, delta: "94% entregados", deltaColor: "text-muted-foreground", sub: "" },
  { label: "Deuda vencida", value: "$ 572.000", valueColor: "text-destructive", tono: "from-rose-500 to-pink-500", icon: TriangleAlert, delta: "-4%", deltaColor: "text-destructive", sub: "2 pacientes" },
];

type Stat = (typeof STATS)[number];

const PRODUCCION = [
  { nombre: "Martínez", valor: 4.0 },
  { nombre: "López", valor: 3.8 },
  { nombre: "Gómez", valor: 3.95 },
  { nombre: "Ruiz", valor: 3.45 },
  { nombre: "Ibarra", valor: 3.3 },
];

const ACTIVIDAD_INICIAL: Actividad[] = [
  { id: 1, hora: "09:42", quien: "Ketty Margarita", accion: "Confirmó el turno de Mauro Pinto" },
  { id: 2, hora: "09:31", quien: "Dra. Mireya Becerra", accion: "Actualizó la historia clínica de Mauro Pinto" },
  { id: 3, hora: "09:18", quien: "Automatización", accion: "Envió 34 recordatorios de turno por WhatsApp" },
  { id: 4, hora: "08:55", quien: "Ketty Margarita", accion: "Emitió la factura F-0001-00184" },
  { id: 5, hora: "08:40", quien: "Sistema", accion: "Alerta de stock crítico: Guantes nitrilo M" },
  { id: 6, hora: "08:12", quien: "Dr. Andrés Becerra", accion: "Aprobó el presupuesto PR-2026-0141" },
];

const GENEROS = ["Femenino", "Masculino", "No binario", "Prefiere no decir"];
const OBRAS_SOCIALES = ["No aplica / particular", "OSDE", "Swiss Medical", "Galeno", "Medicus", "PAMI", "IOMA"];

const EVOLUCION = [
  { mes: "Abril", ingresos: 21400000 },
  { mes: "Mayo", ingresos: 22900000 },
  { mes: "Junio", ingresos: 24800000 },
  { mes: "Julio", ingresos: 27300000 },
  { mes: "Agosto", ingresos: 30100000 },
  { mes: "Septiembre", ingresos: 33600000 },
];

/** Meta mensual de ingresos del demo (línea punteada del gráfico). */
const META_MENSUAL = 28000000;

/** $ 21,4 M (pesos en millones, para ejes y tarjetas) */
const millones = (v: number) => `$ ${(v / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })} M`;

const CARD =
  "relative overflow-hidden rounded-3xl border border-primary/10 bg-card p-4 shadow-[0_14px_36px_-28px_rgba(124,58,237,0.65)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_44px_-26px_rgba(124,58,237,0.75)] sm:p-5 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-primary before:via-fuchsia-500 before:to-pink-400 before:opacity-70 before:content-['']";

const INPUT =
  "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20";

const TEXTAREA =
  "min-h-24 w-full resize-y rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20";

/* Encabezado de tarjeta con el mismo ADN del portal: ícono en degradé, título y bajada. */
function CabeceraCard({
  icon: Icon,
  titulo,
  detalle,
  acciones,
}: {
  icon: typeof Clock;
  titulo: string;
  detalle?: string;
  acciones?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow-[0_8px_18px_-10px_rgba(124,58,237,0.9)]">
          <Icon className="size-[18px]" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate font-display text-[15px] font-bold tracking-tight">{titulo}</h2>
          {detalle && <p className="truncate text-xs text-muted-foreground">{detalle}</p>}
        </div>
      </div>
      {acciones}
    </div>
  );
}

/* Estado vacío prolijo (mismo estilo en todas las tarjetas) */
function VacioCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`grid place-items-center rounded-2xl border border-dashed border-primary/20 bg-primary/[0.025] px-5 py-8 text-center text-sm text-muted-foreground ${className}`}>
      {children}
    </div>
  );
}

/* Botón de exportar: en el celular solo el ícono (no se amontonan) */
const EXPORT_BTN =
  "inline-flex size-9 items-center justify-center gap-1.5 rounded-full border border-primary/15 bg-background text-muted-foreground transition hover:-translate-y-0.5 hover:border-primary/35 hover:text-primary sm:size-auto sm:px-3 sm:py-1.5";

/* ───────────── Utilidades ───────────── */

function horaActual() {
  return new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function hoyISO() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function primerNombre(nombreCompleto: string) {
  return nombreCompleto.trim().split(/\s+/)[0] ?? "";
}

function iniciales(nombreCompleto: string) {
  const partes = nombreCompleto.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const primera = partes[0][0] ?? "";
  const segunda = partes.length > 1 ? (partes[1][0] ?? "") : "";
  return (primera + segunda).toUpperCase();
}

function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const show = (msg: string) => {
    setMessage(msg);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setMessage(null), 2200);
  };
  return { message, show };
}

/* ───────────── Modal y formularios ───────────── */

function Modal({
  title,
  subtitle,
  size = "md",
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  size?: "md" | "lg";
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
        className={`max-h-[92vh] w-full overflow-y-auto rounded-2xl border border-primary/15 bg-card bg-gradient-to-b from-primary/[0.06] to-transparent p-6 shadow-2xl ${
          size === "lg" ? "max-w-2xl" : "max-w-lg"
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
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

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs text-destructive">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  );
}

function SelectField({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${INPUT} appearance-none pr-10 ${value === "" ? "text-muted-foreground" : ""}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function PacientesDatalist({ nombres }: { nombres: string[] }) {
  return (
    <datalist id="pacientes-demo">
      {nombres.map((n) => (
        <option key={n} value={n} />
      ))}
    </datalist>
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
        className="btn-ce"
      >
        {submitLabel}
      </button>
    </div>
  );
}

type NuevaCita = {
  paciente: string;
  sucursal: string;
  odontologo: string;
  gabinete: string;
  tratamiento: string;
  fecha: string;
  hora: string;
  notas: string;
};

function NuevaCitaForm({
  onSubmit,
  onCancel,
  pacientes,
  odontologos,
}: {
  onSubmit: (c: NuevaCita) => void;
  onCancel: () => void;
  pacientes: string[];
  odontologos: string[];
}) {
  const [paciente, setPaciente] = useState("");
  const [sucursal, setSucursal] = useState(SUCURSALES[0]);
  const [odontologo, setOdontologo] = useState(odontologos[0] ?? "");
  const [gabinete, setGabinete] = useState(GABINETES[0]);
  const [tratamiento, setTratamiento] = useState(TRATAMIENTOS[0]);
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [notas, setNotas] = useState("");

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
          list="pacientes-demo"
          value={paciente}
          onChange={(e) => setPaciente(e.target.value)}
          className={INPUT}
          placeholder="Buscar paciente por nombre o documento"
        />
        <PacientesDatalist nombres={pacientes} />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Sucursal">
          <SelectField value={sucursal} onChange={setSucursal} options={SUCURSALES} />
        </Field>
        <Field label="Odontólogo">
          <SelectField value={odontologo} onChange={setOdontologo} options={odontologos} />
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

      <FormActions submitLabel="Crear turno" onCancel={onCancel} />
    </form>
  );
}

type NuevoPaciente = {
  nombre: string;
  apellido: string;
  documento: string;
  fechaNacimiento: string;
  genero: string;
  email: string;
  telefono: string;
  sucursal: string;
  obraSocial: string;
  afiliado: string;
  direccion: string;
  nota: string;
};

function NuevoPacienteForm({
  onSubmit,
  onCancel,
  documentosExistentes,
}: {
  onSubmit: (p: NuevoPaciente) => void;
  onCancel: () => void;
  documentosExistentes: string[];
}) {
  const [foto, setFoto] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [documento, setDocumento] = useState("");
  const [errorDocumento, setErrorDocumento] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [genero, setGenero] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [sucursal, setSucursal] = useState(SUCURSALES[0]);
  const [obraSocial, setObraSocial] = useState(OBRAS_SOCIALES[0]);
  const [afiliado, setAfiliado] = useState("");
  const [direccion, setDireccion] = useState("");
  const [nota, setNota] = useState("");

  useEffect(() => {
    return () => {
      if (foto) URL.revokeObjectURL(foto);
    };
  }, [foto]);

  const elegirFoto = (e: ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setFoto(URL.createObjectURL(archivo));
    e.target.value = "";
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const soloDigitos = documento.replace(/\D/g, "");
    if (soloDigitos.length < 7 || soloDigitos.length > 8) {
      setErrorDocumento("Ingresá un documento válido (7 u 8 dígitos).");
      return;
    }
    if (documentosExistentes.includes(soloDigitos)) {
      setErrorDocumento("Ya existe un paciente con ese documento.");
      return;
    }
    onSubmit({
      nombre: capitalizarNombre(nombre),
      apellido: capitalizarNombre(apellido),
      documento: soloDigitos,
      fechaNacimiento,
      genero,
      email: email.trim(),
      telefono: telefono.trim(),
      sucursal,
      obraSocial,
      afiliado: afiliado.trim(),
      direccion: direccion.trim(),
      nota: nota.trim(),
    });
  };

  return (
    <form onSubmit={enviar} className="space-y-5">
      <div className="flex items-center gap-5">
        <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-dashed border-primary/30 bg-primary/10">
          {foto ? (
            <img src={foto} alt="Foto del paciente" className="size-full object-cover" />
          ) : (
            <ImagePlus className="size-8 text-primary" />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold">Foto del paciente</p>
          <p className="mt-0.5 text-xs text-muted-foreground">La foto podrá agregarse o cambiarse posteriormente.</p>
          <input ref={fileRef} type="file" accept="image/*" onChange={elegirFoto} className="hidden" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-3 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-muted"
          >
            {foto ? "Cambiar foto" : "Seleccionar foto"}
          </button>
        </div>
      </div>

      <h3 className="text-sm font-semibold">Datos personales</h3>
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
        <Field label="Nombre *">
          <input autoFocus required value={nombre} onChange={(e) => setNombre(e.target.value)} className={INPUT} placeholder="Mauro" />
        </Field>
        <Field label="Apellido *">
          <input required value={apellido} onChange={(e) => setApellido(e.target.value)} className={INPUT} placeholder="Pinto" />
        </Field>
        <Field
          label="Documento *"
          hint="El documento debe ser válido y único para el paciente."
          error={errorDocumento}
        >
          <input
            required
            inputMode="numeric"
            value={documento}
            onChange={(e) => {
              setDocumento(e.target.value);
              setErrorDocumento("");
            }}
            className={INPUT}
            placeholder="95.222.294"
          />
        </Field>
        <Field label="Fecha de nacimiento">
          <input type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} className={INPUT} />
        </Field>
        <Field label="Sexo / género">
          <SelectField value={genero} onChange={setGenero} options={GENEROS} placeholder="Seleccionar" />
        </Field>
        <Field label="Correo electrónico *">
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} placeholder="mauro.pinto@email.com" />
        </Field>
        <Field label="Teléfono">
          <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} className={INPUT} placeholder="+54 11 5555-8899" />
        </Field>
        <Field label="Sucursal">
          <SelectField value={sucursal} onChange={setSucursal} options={SUCURSALES} />
        </Field>
      </div>

      <h3 className="text-sm font-semibold">Obra social / cobertura</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Obra social">
          <SelectField value={obraSocial} onChange={setObraSocial} options={OBRAS_SOCIALES} />
        </Field>
        <Field label="Número de afiliado">
          <input value={afiliado} onChange={(e) => setAfiliado(e.target.value)} className={INPUT} placeholder="OS-45892177" />
        </Field>
      </div>

      <h3 className="text-sm font-semibold">Información de contacto</h3>
      <Field label="Dirección">
        <input value={direccion} onChange={(e) => setDireccion(e.target.value)} className={INPUT} placeholder="Av. Corrientes 1234, Buenos Aires" />
      </Field>
      <Field label="Nota de interés">
        <textarea
          rows={3}
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          className={TEXTAREA}
          placeholder="Información importante sobre el paciente…"
        />
      </Field>

      <FormActions submitLabel="Crear paciente" onCancel={onCancel} />
    </form>
  );
}

function NuevoPresupuestoForm({
  onSubmit,
  onCancel,
  pacientes,
}: {
  onSubmit: (p: { paciente: string; tratamiento: string; monto: number }) => void;
  onCancel: () => void;
  pacientes: string[];
}) {
  const [paciente, setPaciente] = useState("");
  const [tratamiento, setTratamiento] = useState("");
  const [monto, setMonto] = useState("");

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ paciente: paciente.trim(), tratamiento: tratamiento.trim(), monto: Number(monto) });
  };

  return (
    <form onSubmit={enviar} className="space-y-4">
      <Field label="Paciente">
        <input
          autoFocus
          required
          list="pacientes-demo"
          value={paciente}
          onChange={(e) => setPaciente(e.target.value)}
          className={INPUT}
          placeholder="Buscar paciente por nombre o documento"
        />
        <PacientesDatalist nombres={pacientes} />
      </Field>
      <Field label="Tratamiento">
        <input required value={tratamiento} onChange={(e) => setTratamiento(e.target.value)} className={INPUT} placeholder="Ej: Implante unitario" />
      </Field>
      <Field label="Monto (ARS)">
        <input required type="number" min={1} value={monto} onChange={(e) => setMonto(e.target.value)} className={INPUT} placeholder="350000" />
      </Field>
      <FormActions submitLabel="Crear presupuesto" onCancel={onCancel} />
    </form>
  );
}

/* ───────────── Componentes de la página ───────────── */

const ESTADO_BADGE: Record<EstadoTurno, { chip: string; punto: string }> = {
  Confirmada: { chip: "bg-emerald-100 text-emerald-700", punto: "bg-emerald-600" },
  Pendiente: { chip: "bg-amber-100 text-amber-700", punto: "bg-amber-600" },
  Atendida: { chip: "bg-primary/10 text-primary", punto: "bg-primary" },
  Ausente: { chip: "bg-destructive/10 text-destructive", punto: "bg-destructive" },
  Cancelada: { chip: "bg-muted text-muted-foreground", punto: "bg-muted-foreground" },
};

function EstadoBadge({ estado, onClick }: { estado: EstadoTurno; onClick: () => void }) {
  const estilo = ESTADO_BADGE[estado];
  return (
    <button
      type="button"
      onClick={onClick}
      title="Clic para cambiar el estado"
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80 ${estilo.chip}`}
    >
      <span className={`size-1.5 rounded-full ${estilo.punto}`} />
      {estado}
    </button>
  );
}

function TopBanner({
  notificaciones,
  sinLeer,
  onMarcarLeidas,
  onToast,
  nombre,
  clinica,
  iniciales: inicialesUsuario,
}: {
  notificaciones: Actividad[];
  sinLeer: number;
  onMarcarLeidas: () => void;
  onToast: (msg: string) => void;
  nombre: string;
  clinica?: string | undefined;
  iniciales: string;
}) {
  const [abierto, setAbierto] = useState(false);
  // Fecha y hora se calculan en el navegador (el servidor las formatea distinto y
  // rompía la hidratación) y se actualizan cada minuto.
  const [ahora, setAhora] = useState<Date | null>(null);
  useEffect(() => {
    setAhora(new Date());
    const id = window.setInterval(() => setAhora(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const fecha = ahora?.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" }) ?? "";
  const hora = ahora?.toLocaleTimeString("es-AR", { hour: "numeric", minute: "2-digit" }) ?? "";

  return (
    <div className="relative h-56 w-full rounded-2xl md:h-64">
      <div className="absolute inset-0 overflow-hidden rounded-2xl">
        <HeroParallax />
        <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent" />
      </div>

      <div className="absolute inset-0 flex flex-wrap items-start justify-between gap-2 p-4">
        <span className="flex items-center gap-2 rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm">
          <Calendar className="size-3.5 text-muted-foreground" />
          {ahora ? `${fecha} · ${hora}` : "\u00a0"}
        </span>

        {/* En celular y tablet el usuario y los avisos están en el encabezado de arriba. */}
        <div className="hidden flex-wrap items-center gap-2 lg:flex">
          <div className="relative">
            <button
              onClick={() => setAbierto((v) => !v)}
              aria-label="Notificaciones"
              className="relative grid size-8 place-items-center rounded-full bg-background/90 shadow-sm backdrop-blur-sm hover:bg-background"
            >
              <Bell className="size-4 text-muted-foreground" />
              {sinLeer > 0 && (
                <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-4 text-white">
                  {sinLeer > 9 ? "9+" : sinLeer}
                </span>
              )}
            </button>

            {abierto && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setAbierto(false)} />
                <div className="absolute right-0 top-10 z-40 w-80 rounded-2xl border border-border bg-card p-3 text-foreground shadow-xl">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Notificaciones</h3>
                    <button
                      onClick={onMarcarLeidas}
                      disabled={sinLeer === 0}
                      className="text-xs font-medium text-primary disabled:text-muted-foreground"
                    >
                      Marcar todo como leído
                    </button>
                  </div>
                  <ul className="max-h-64 space-y-2 overflow-y-auto">
                    {notificaciones.slice(0, 6).map((n) => (
                      <li key={n.id} className="flex items-start gap-2 text-xs">
                        <span className="w-10 shrink-0 font-mono text-muted-foreground">{n.hora}</span>
                        <span>
                          <span className="font-medium">{n.quien}</span>{" "}
                          <span className="text-muted-foreground">{n.accion}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => onToast("No tenés mensajes nuevos")}
            aria-label="Mensajes"
            className="grid size-8 place-items-center rounded-full bg-background/90 shadow-sm backdrop-blur-sm hover:bg-background"
          >
            <MessageSquare className="size-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => {
              window.location.href = "/demo/configuracion";
            }}
            aria-label="Configuración"
            className="grid size-8 place-items-center rounded-full bg-background/90 shadow-sm backdrop-blur-sm hover:bg-background"
          >
            <Settings className="size-4 text-muted-foreground" />
          </button>
          <MenuUsuario nombre={nombre} clinica={clinica} iniciales={inicialesUsuario} />
        </div>
      </div>
    </div>
  );
}

/* Menú del usuario: accesos claros a los portales para probarlos en el demo. */
function MenuUsuario({ nombre, clinica, iniciales }: { nombre: string; clinica?: string | undefined; iniciales: string }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, [abierto]);

  // Los portales del paciente y del profesional son exclusivos de Enterprise.
  const { plan: planMenu } = useCloudEsther();
  const real = useClinicaReal();
  const rolTexto = real ? NOMBRE_ROL[real.rol] : "Dueño/a";
  const TODOS: { href: string; titulo: string; detalle: string; nueva?: boolean; icon: typeof Users; enterprise?: boolean }[] = [
    { href: "/portal", titulo: "Portal del paciente", detalle: "Así lo ven tus pacientes (DNI + código)", nueva: true, icon: UserRound, enterprise: true },
    { href: "/equipo", titulo: "Portal del profesional", detalle: "Odontólogos, secretaria y asistentes, en celular o PC", nueva: true, icon: Stethoscope, enterprise: true },
    { href: "/demo/portal-paciente", titulo: "Monitoreo del portal", detalle: "Accesos, actividad y documentación de pacientes", icon: ShieldCheck, enterprise: true },
    { href: "/demo/equipo-profesional", titulo: "Equipo y accesos del equipo", detalle: "Integrantes, fichajes y horarios", icon: Users },
    // Etapa de pruebas: entrar a los perfiles (propietario, clínica, profesional, secretaría, paciente).
    { href: "/acceso-prueba", titulo: "Probar los 5 perfiles", detalle: "Propietario, clínica, profesional, secretaría y paciente · PC, tablet y celular", icon: ShieldCheck },
  ];
  const ITEMS = real
    ? [
        { href: "/demo/mi-cuenta", titulo: "Mi cuenta", detalle: "Tus datos y tu contraseña", icon: UserRound },
        ...(real.rol === "admin"
          ? [{ href: "/demo/accesos", titulo: "Accesos del equipo", detalle: "Quién entra a la clínica y con qué rol", icon: ShieldCheck }]
          : []),
      ]
    : TODOS.filter((it) => !it.enterprise || planMenu === "grupo");

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-haspopup="menu"
        className="flex max-w-[16rem] items-center gap-2 rounded-full bg-background/95 py-1 pl-1 pr-2.5 shadow-sm backdrop-blur-sm transition-colors hover:bg-background"
      >
        <span className="bg-brand grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-primary-foreground">{iniciales}</span>
        <span className="hidden min-w-0 text-left leading-tight sm:block">
          <span className="block truncate text-xs font-semibold text-foreground">{nombre}</span>
          <span className="block truncate text-[10px] text-muted-foreground">{clinica ? `${rolTexto} · ${clinica}` : rolTexto}</span>
        </span>
        <ChevronDown className={`size-3.5 text-muted-foreground transition-transform ${abierto ? "rotate-180" : ""}`} />
      </button>
      {abierto && (
        <div role="menu" className="absolute right-0 top-11 z-40 w-80 overflow-hidden rounded-2xl border border-primary/15 bg-card shadow-2xl">
          <div className="bg-gradient-to-br from-primary via-violet-600 to-fuchsia-600 px-4 py-3 text-white">
            <p className="text-sm font-semibold">{nombre}</p>
            <p className="text-[11px] text-white/80">{clinica ? `${rolTexto} · ${clinica}` : "Dueño/a · Demo"}</p>
          </div>
          <p className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{real ? "Tu cuenta" : planMenu === "grupo" ? "Portales para probar" : "Accesos"}</p>
          <ul className="px-2 pb-2">
            {ITEMS.map((it) => (
              <li key={it.href}>
                <a
                  role="menuitem"
                  href={it.href}
                  {...(it.nueva ? { target: "_blank", rel: "noreferrer" } : {})}
                  onClick={() => setAbierto(false)}
                  className="flex items-start gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-primary/[0.06]"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <it.icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 text-sm font-medium">
                      {it.titulo}
                      {it.nueva && <ExternalLink className="size-3 text-muted-foreground" />}
                    </span>
                    <span className="block text-[11px] leading-snug text-muted-foreground">{it.detalle}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          {real ? (
            <button
              type="button"
              onClick={() => salirYVolver()}
              className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 text-left text-sm font-medium text-destructive hover:bg-destructive/5"
            >
              Salir
            </button>
          ) : (
            <p className="border-t border-border bg-primary/[0.03] px-4 py-2.5 text-[10.5px] leading-snug text-muted-foreground">
              Paciente de prueba: DNI <b>95193944</b>. Profesional: <b>andres.becerra@cloudesther.com</b>. El código se muestra con “Recibir el código”.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CentroOperacionesBanner({
  onNuevaCita,
  onNuevoPaciente,
  nombre,
  clinica,
}: {
  onNuevaCita: () => void;
  onNuevoPaciente: () => void;
  nombre: string;
  clinica?: string | undefined;
}) {
  return (
    <div className="co-hero relative isolate mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-[oklch(0.56_0.21_295)] via-[oklch(0.47_0.22_292)] to-[oklch(0.35_0.2_290)] px-6 py-6 text-white shadow-lg shadow-[oklch(0.45_0.22_292)]/25 ring-1 ring-inset ring-white/15 md:px-8">
      <style>{`
        @keyframes co-float-a { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(36px,22px) scale(1.18); } }
        @keyframes co-float-b { 0%,100% { transform: translate(0,0) scale(1.1); } 50% { transform: translate(-40px,-18px) scale(0.92); } }
        @keyframes co-shine { 0% { transform: translateX(-150%) skewX(-12deg); } 55%,100% { transform: translateX(450%) skewX(-12deg); } }
        @keyframes co-pulse { 0% { stroke-dashoffset: 140; } 100% { stroke-dashoffset: -860; } }
        @keyframes co-twinkle { 0%,100% { opacity: .12; transform: scale(.8); } 50% { opacity: .6; transform: scale(1.05); } }
        .co-hero .co-a { animation: co-float-a 11s ease-in-out infinite; }
        .co-hero .co-b { animation: co-float-b 14s ease-in-out infinite; }
        .co-hero .co-shine { animation: co-shine 8s ease-in-out infinite; }
        .co-hero .co-pulse { animation: co-pulse 4.5s linear infinite; }
        .co-hero .co-tw { animation: co-twinkle 4s ease-in-out infinite; transform-origin: center; }
        @media (prefers-reduced-motion: reduce) {
          .co-hero .co-a, .co-hero .co-b, .co-hero .co-shine, .co-hero .co-pulse, .co-hero .co-tw { animation: none; }
        }
      `}</style>

      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="co-a absolute -left-16 -top-24 size-72 rounded-full bg-[oklch(0.78_0.15_305)]/30 blur-3xl" />
        <div className="co-b absolute -bottom-28 left-1/3 size-80 rounded-full bg-[oklch(0.66_0.2_280)]/40 blur-3xl" />

        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "22px 22px",
            maskImage: "linear-gradient(to right, black, transparent 70%)",
            WebkitMaskImage: "linear-gradient(to right, black, transparent 70%)",
          }}
        />

        <svg
          viewBox="0 0 24 24"
          className="absolute -right-6 top-1/2 h-[210%] -translate-y-1/2 rotate-12 text-white"
          fill="currentColor"
          fillOpacity="0.07"
          stroke="currentColor"
          strokeOpacity="0.22"
          strokeWidth="0.35"
          strokeLinejoin="round"
        >
          <path d="M12 5.5c-1.2-1-2.6-1.5-4-1.5C5.5 4 4 6 4 8.3c0 2 .9 3.3 1.5 5.2.6 1.8.6 4.5 1.6 6 .7 1 1.9.9 2.4-.3.5-1.2.6-3 1.2-4.2.3-.6.9-1 1.3-1s1 .4 1.3 1c.6 1.2.7 3 1.2 4.2.5 1.2 1.7 1.3 2.4.3 1-1.5 1-4.2 1.6-6 .6-1.9 1.5-3.2 1.5-5.2C20 6 18.5 4 16 4c-1.4 0-2.8.5-4 1.5z" />
        </svg>

        <svg className="co-tw absolute left-[46%] top-5 size-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 4v16M4 12h16" />
        </svg>
        <svg className="co-tw absolute bottom-8 left-[62%] size-3 text-white" style={{ animationDelay: "1.3s" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 4v16M4 12h16" />
        </svg>
        <svg className="co-tw absolute bottom-6 left-[30%] size-3.5 text-white" style={{ animationDelay: "2.4s" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 4v16M4 12h16" />
        </svg>

        <svg
          className="absolute bottom-0 left-0 h-12 w-full text-white"
          viewBox="0 0 1000 60"
          preserveAspectRatio="none"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            d="M0 34 H180 L200 34 L215 10 L235 56 L252 22 L262 34 H520 L540 34 L555 16 L572 50 L586 34 H1000"
            stroke="currentColor"
            strokeOpacity="0.14"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          <path
            className="co-pulse"
            d="M0 34 H180 L200 34 L215 10 L235 56 L252 22 L262 34 H520 L540 34 L555 16 L572 50 L586 34 H1000"
            pathLength="1000"
            stroke="currentColor"
            strokeOpacity="0.75"
            strokeWidth="2"
            strokeDasharray="140 860"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div className="co-shine absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">Hola, {nombre}</p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight drop-shadow-sm md:text-3xl">Centro de operaciones</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-white/85">
            Todo lo que pasa hoy en {clinica ? <strong className="font-semibold text-white">{clinica}</strong> : "tu clínica"}, en una sola pantalla.
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:gap-2.5">
          <button
            onClick={onNuevaCita}
            className="flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-white px-3 text-[12.5px] font-medium tracking-[-0.005em] sm:px-4 sm:text-[13px] text-[oklch(0.45_0.22_292)] shadow-[0_8px_20px_-12px_rgba(30,0,80,0.6),inset_0_-1px_0_rgba(124,58,237,0.12)] dark:bg-white dark:text-[oklch(0.42_0.22_292)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-14px_rgba(30,0,80,0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(0.47_0.22_292)]"
          >
            <CalendarPlus className="size-3.5" />
            Nuevo turno
          </button>
          <button
            onClick={onNuevoPaciente}
            className="flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-white px-3 text-[12.5px] font-medium tracking-[-0.005em] sm:px-4 sm:text-[13px] text-[oklch(0.45_0.22_292)] shadow-[0_8px_20px_-12px_rgba(30,0,80,0.6),inset_0_-1px_0_rgba(124,58,237,0.12)] dark:bg-white dark:text-[oklch(0.42_0.22_292)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-14px_rgba(30,0,80,0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(0.47_0.22_292)]"
          >
            <UserPlus className="size-3.5" />
            Nuevo paciente
          </button>
          <Link
            to="/demo/agenda"
            className="col-span-2 flex h-9 items-center justify-center gap-1.5 rounded-full border border-white/35 bg-white/[0.08] px-4 text-[12.5px] font-medium tracking-[-0.005em] sm:col-span-1 sm:text-[13px] text-white backdrop-blur-md dark:bg-white/10 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white/60 hover:bg-white/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <Clock className="size-3.5" />
            Ver agenda y horarios
          </Link>
        </div>
      </div>
    </div>
  );
}

function SearchBar({
  value,
  onChange,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="relative mt-4">
      <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar paciente, turno, factura…"
        className="h-12 w-full rounded-full border border-border bg-card pl-11 pr-16 text-sm outline-none focus:border-primary/50"
      />
      {value ? (
        <button
          onClick={() => onChange("")}
          aria-label="Limpiar búsqueda"
          className="absolute right-4 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <X className="size-3.5" />
        </button>
      ) : (
        <kbd className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:flex">
          <Command className="size-2.5" />K
        </kbd>
      )}
    </div>
  );
}

function ProduccionOdontologo({ datos, unidad = "M" }: { datos?: { nombre: string; valor: number }[]; unidad?: string }) {
  const PRODUCCION_ = datos ?? PRODUCCION;
  return (
    <div className={`${CARD} flex flex-col`}>
      <CabeceraCard icon={Stethoscope} titulo={datos ? "Turnos atendidos por odontólogo" : "Producción por odontólogo"} detalle="Mes en curso" />
      {datos && datos.length === 0 && (
        <VacioCard className="flex-1">
          Cuando los odontólogos atiendan turnos este mes, acá vas a ver cuántos atendió cada uno.
        </VacioCard>
      )}
      {!(datos && datos.length === 0) && (
        <div className="mt-1 flex-1">
          <GraficoBarras
            datos={PRODUCCION_}
            formato={unidad === "turnos" ? (v) => `${Math.round(v)}` : (v) => `$ ${v.toLocaleString("es-AR", { maximumFractionDigits: 1 })} M`}
            detalle={unidad === "turnos" ? "turnos del mes" : "producción del mes"}
          />
        </div>
      )}
    </div>
  );
}

function ActividadReciente({ items, buscando }: { items: Actividad[]; buscando: boolean }) {
  return (
    <div className={`${CARD} flex flex-col`}>
      <CabeceraCard icon={Clock} titulo="Actividad reciente" detalle="Trazabilidad del día" />
      {items.length === 0 ? (
        <VacioCard className="flex-1">
          {buscando ? "Sin movimientos que coincidan con la búsqueda." : "Todavía no hay movimientos hoy."}
        </VacioCard>
      ) : (
        <ul className="space-y-3">
          {items.slice(0, 8).map((a) => (
            <li key={a.id} className="flex items-start gap-3 text-sm">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
              <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">{a.hora}</span>
              <span>
                <span className="font-medium">{a.quien}</span>{" "}
                <span className="text-muted-foreground">{a.accion}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* Acceso rápido premium: cada tarjeta con su tono (degradé suave), ícono con brillo,
   una bajada corta y una flecha que se desliza al pasar el mouse. */
const TONOS_ACCESO = {
  violeta: { icono: "from-violet-500 to-fuchsia-500", halo: "bg-violet-500/25", borde: "hover:border-violet-400/40" },
  cielo: { icono: "from-sky-500 to-indigo-500", halo: "bg-sky-500/25", borde: "hover:border-sky-400/40" },
  esmeralda: { icono: "from-emerald-500 to-teal-500", halo: "bg-emerald-500/25", borde: "hover:border-emerald-400/40" },
  ambar: { icono: "from-amber-500 to-rose-500", halo: "bg-amber-500/25", borde: "hover:border-amber-400/40" },
} as const;

function ContenidoAcceso({
  icon: Icon,
  titulo,
  detalle,
  tono,
}: {
  icon: typeof Clock;
  titulo: string;
  detalle: string;
  tono: keyof typeof TONOS_ACCESO;
}) {
  const t = TONOS_ACCESO[tono];
  return (
    <>
      <span
        aria-hidden
        className={`pointer-events-none absolute -right-6 -top-8 size-24 rounded-full ${t.halo} opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100`}
      />
      <span
        className={`relative grid size-10 shrink-0 place-items-center rounded-[14px] bg-gradient-to-br ${t.icono} text-white shadow-[0_8px_18px_-10px_rgba(76,29,149,0.75),inset_0_1px_0_rgba(255,255,255,0.35)] transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3`}
      >
        <Icon className="size-[18px]" strokeWidth={1.9} />
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-semibold leading-tight tracking-[-0.01em] text-foreground">
          {titulo}
        </span>
        <span className="mt-0.5 block truncate text-[11.5px] font-normal leading-tight text-muted-foreground">
          {detalle}
        </span>
      </span>
      <ChevronRight
        aria-hidden
        className="relative hidden size-4 shrink-0 text-muted-foreground/50 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-primary sm:block"
      />
    </>
  );
}

const claseAcceso = (tono: keyof typeof TONOS_ACCESO) =>
  `group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/[0.03] p-3 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-22px_rgba(76,29,149,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${TONOS_ACCESO[tono].borde}`;

function AccesosRapidos({
  onBuscar,
  onPresupuesto,
  onRecordatorios,
}: {
  onBuscar: () => void;
  onPresupuesto: () => void;
  onRecordatorios: () => void;
}) {
  return (
    <div className={CARD}>
      <CabeceraCard icon={ExternalLink} titulo="Accesos rápidos" detalle="Lo que más se usa, a un toque" />
      <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 sm:gap-3 min-[1380px]:grid-cols-4">
        <Link to="/demo/agenda" className={claseAcceso("violeta")}>
          <ContenidoAcceso icon={CalendarCheck} titulo="Agenda del día" detalle="Turnos y salas" tono="violeta" />
        </Link>
        <button type="button" onClick={onBuscar} className={claseAcceso("cielo")}>
          <ContenidoAcceso icon={UserSearch} titulo="Buscar paciente" detalle="Ficha en segundos" tono="cielo" />
        </button>
        <button type="button" onClick={onPresupuesto} className={claseAcceso("esmeralda")}>
          <ContenidoAcceso icon={ReceiptText} titulo="Crear presupuesto" detalle="Listo para enviar" tono="esmeralda" />
        </button>
        <button type="button" onClick={onRecordatorios} className={claseAcceso("ambar")}>
          <ContenidoAcceso icon={BellRing} titulo="Recordatorios" detalle="WhatsApp y correo" tono="ambar" />
        </button>
      </div>
    </div>
  );
}

/* ───────────── Página ───────────── */

function DashboardInner() {
  const { plan } = useCloudEsther();
  const { usuario, clinica } = useSesion();
  // Clínica real: todo sale de SUS datos (nada de ejemplo)
  const real = useClinicaReal();
  const { pacientes: pacientesReales, setPacientes } = usePacientes();
  const nombreUsuario = usuario?.nombre ?? "Invitado";

  const { message, show } = useToast();
  // Turnos de hoy tomados de la agenda de la empresa (lo que se agenda acá aparece en Agenda y viceversa).
  const { turnos: turnosAgenda } = storeAgenda.usar();
  const { miembros } = useEquipo();
  const odontologosEquipo = miembros
    .filter((m) => m.role === "odontologo" && m.status !== "inactivo")
    .map((m) => `${m.firstName} ${m.lastName}`.trim());
  const hoy = hoyISO();
  const turnos: Turno[] = turnosAgenda
    .filter((t) => t.fecha === hoy && t.estado !== "Cancelada")
    .sort((a, b) => a.hora.localeCompare(b.hora))
    .map((t) => ({
      id: t.id,
      hora: t.hora,
      paciente: t.paciente,
      detalle: `${t.tratamiento} · ${t.odontologo}`,
      estado: t.estado,
    }));
  const [actividad, setActividad] = useState<Actividad[]>(() => (real ? [] : ACTIVIDAD_INICIAL));
  const [sinLeer, setSinLeer] = useState(() => (real ? 0 : 3));
  // Al saber que es una clínica real (después de abrir la página), nada de actividad de ejemplo
  const esReal = !!real;
  useEffect(() => {
    if (!esReal) return;
    setActividad((prev) => (prev === ACTIVIDAD_INICIAL ? [] : prev));
    setSinLeer((n) => (n === 3 ? 0 : n));
  }, [esReal]);
  const [recordatoriosExtra, setRecordatoriosExtra] = useState(0);
  const [presupuestosNuevos, setPresupuestosNuevos] = useState(0);
  const [pacientesNuevos, setPacientesNuevos] = useState<{ nombre: string; documento: string }[]>([]);
  const sugerenciasPacientes = Array.from(
    new Set([...turnosAgenda.map((t) => t.paciente), ...pacientesNuevos.map((p) => p.nombre)]),
  );
  const [modal, setModal] = useState<ModalActivo>(null);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const registrar = (quien: string, accion: string) => {
    setActividad((prev) => [{ id: Date.now(), hora: horaActual(), quien, accion }, ...prev]);
    setSinLeer((n) => n + 1);
  };

  const cerrarModal = () => setModal(null);

  const agregarCita = (c: NuevaCita) => {
    const fechaTexto = c.fecha.split("-").reverse().join("/");
    const choque = turnosAgenda.some(
      (t) => t.estado !== "Cancelada" && t.fecha === c.fecha && t.hora === c.hora && t.odontologo === c.odontologo,
    );
    if (choque) {
      show(`${c.odontologo} ya tiene un turno a las ${c.hora}`);
      return;
    }
    setTurnosStore((prev) => [...prev, { ...c, id: Date.now(), estado: "Pendiente" }]);
    registrar(nombreUsuario, `Agendó un turno para ${c.paciente} el ${fechaTexto} a las ${c.hora}`);
    cerrarModal();
    show(c.fecha === hoy ? "Turno agendado para hoy" : `Turno agendado para el ${fechaTexto}`);
  };

  const agregarPaciente = (p: NuevoPaciente) => {
    if (real) {
      // Se guarda en Pacientes (lo ve toda la clínica)
      const activosReales = contarPacientesActivos(pacientesReales);
      if (!dentroDelLimite(plan, "pacientes", activosReales)) {
        show(MENSAJE_LIMITE.pacientes);
        return;
      }
      if (pacientesReales.some((x) => x.documento && x.documento === p.documento)) {
        show("Ya hay un paciente con ese documento");
        return;
      }
      const id = Math.max(0, ...pacientesReales.map((x) => x.id)) + 1;
      setPacientes((prev) => [...prev, { ...p, id, estado: "Activo", foto: null }]);
      registrar(nombreUsuario, `Registró al paciente ${p.nombre} ${p.apellido}`);
      cerrarModal();
      show("Paciente registrado");
      return;
    }
    const activos = contarPacientesActivos(leerPacientes()) + pacientesNuevos.length;
    if (!dentroDelLimite(plan, "pacientes", activos)) {
      show(MENSAJE_LIMITE.pacientes);
      return;
    }
    const nombreCompleto = `${p.nombre} ${p.apellido}`;
    setPacientesNuevos((prev) => [...prev, { nombre: nombreCompleto, documento: p.documento }]);
    registrar(nombreUsuario, `Registró al paciente ${nombreCompleto}`);
    cerrarModal();
    show("Paciente registrado");
  };

  const crearPresupuesto = (p: { paciente: string; tratamiento: string; monto: number }) => {
    if (real) {
      cerrarModal();
      show("Presupuestos se está preparando para tu clínica");
      return;
    }
    const numero = `PR-2026-${String(142 + presupuestosNuevos).padStart(4, "0")}`;
    setPresupuestosNuevos((n) => n + 1);
    registrar(
      nombreUsuario,
      `Creó el presupuesto ${numero} para ${p.paciente} (${p.tratamiento}) por $ ${p.monto.toLocaleString("es-AR")}`,
    );
    cerrarModal();
    show(`Presupuesto ${numero} creado`);
  };

  const alternarEstado = (id: number) => {
    const turno = turnos.find((t) => t.id === id);
    if (!turno) return;
    if (turno.estado !== "Pendiente" && turno.estado !== "Confirmada") {
      show(`Turno ${turno.estado.toLowerCase()}: cambialo desde Agenda y turnos`);
      return;
    }
    const nuevo: EstadoTurno = turno.estado === "Confirmada" ? "Pendiente" : "Confirmada";
    setTurnosStore((prev) => prev.map((t) => (t.id === id ? { ...t, estado: nuevo } : t)));
    registrar(nombreUsuario, `Marcó el turno de ${turno.paciente} como ${nuevo.toLowerCase()}`);
  };

  const enviarRecordatorios = () => {
    if (real) {
      // Clínica real: se mandan por WhatsApp con un toque desde Comunicación → Recordatorios
      window.location.assign("/demo/comunicaciones#recordatorios");
      return;
    }
    const pendientes = turnos.filter((t) => t.estado === "Pendiente").length;
    if (pendientes === 0) {
      show("No hay turnos pendientes para recordar");
      return;
    }
    setRecordatoriosExtra((n) => n + pendientes);
    registrar("Automatización", `Envió ${pendientes} recordatorio${pendientes > 1 ? "s" : ""} de turno por WhatsApp`);
    show(`Recordatorios enviados: ${pendientes}`);
  };

  const enfocarBusqueda = () => {
    searchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    searchRef.current?.focus({ preventScroll: true });
  };

  const marcarLeidas = () => setSinLeer(0);

  const imprimir = () => window.print();

  const guardarPdf = () => {
    const el = document.querySelector<HTMLElement>("main") ?? document.body;
    show("Generando el PDF del tablero…");
    void descargarPDFdeElemento(el, "tablero-clinica").then((ok) =>
      show(ok ? "PDF descargado: tablero-clinica.pdf" : "No se pudo generar el PDF"),
    );
  };

  const exportarExcel = () => {
    const filas = [["Mes", "Ingresos (ARS)"], ...EVOLUCION.map((e) => [e.mes, String(e.ingresos)])];
    const csv = "\uFEFF" + filas.map((f) => f.join(";")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "evolucion-clinica.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    show("Descargando evolucion-clinica.csv");
  };

  const compartir = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: real ? `Cloud Esther · ${clinica?.nombre ?? ""}` : "Cloud Esther · Demo", url });
      } else {
        await navigator.clipboard.writeText(url);
        show("Enlace copiado al portapapeles");
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") show("No se pudo compartir el enlace");
    }
  };

  const q = query.trim().toLowerCase();
  const turnosFiltrados = turnos.filter((t) => !q || `${t.paciente} ${t.detalle}`.toLowerCase().includes(q));
  const actividadFiltrada = actividad.filter((a) => !q || `${a.quien} ${a.accion}`.toLowerCase().includes(q));

  const confirmadosHoy = turnos.filter((t) => t.estado === "Confirmada" || t.estado === "Atendida").length;
  const pendientesHoy = turnos.filter((t) => t.estado === "Pendiente").length;
  const [s0, s1, s2, s3] = STATS as unknown as [Stat, Stat, Stat, Stat];
  // Clínica real: números de verdad (turnos, pacientes y la semana que viene)
  const en7 = (() => {
    const d = new Date(`${hoy}T12:00:00`);
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  })();
  const turnosSemana = turnosAgenda.filter((t) => t.estado !== "Cancelada" && t.fecha > hoy && t.fecha <= en7).length;
  const activosReales = contarPacientesActivos(pacientesReales);
  const stats: Stat[] = real
    ? [
        { ...s0, value: String(turnos.length), delta: "", sub: `${confirmadosHoy} confirmados · ${pendientesHoy} pendientes` },
        { ...s1, label: "Pacientes activos", value: String(activosReales), valueColor: "text-emerald-600", icon: Users, delta: "", sub: `${pacientesReales.length} en total` },
        { ...s2, label: "Próximos 7 días", value: String(turnosSemana), icon: CalendarCheck, delta: "", sub: "turnos agendados" },
        { ...s3, label: "Equipo", value: String(odontologosEquipo.length), valueColor: "text-primary", icon: Stethoscope, delta: "", sub: "odontólogos en la agenda" },
      ]
    : [
        { ...s0, value: String(turnos.length), sub: `${confirmadosHoy} confirmados · ${pendientesHoy} pendientes` },
        s1,
        { ...s2, value: String(34 + recordatoriosExtra) },
        s3,
      ];
  // Turnos atendidos por odontólogo en el mes (clínica real)
  const mes = hoy.slice(0, 7);
  const atendidosMes = real
    ? odontologosEquipo
        .map((nombre) => ({
          nombre: nombre.split(" ")[0] ?? nombre,
          valor: turnosAgenda.filter((t) => t.odontologo === nombre && t.estado === "Atendida" && t.fecha.startsWith(mes)).length,
        }))
        .filter((x) => x.valor > 0)
    : undefined;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6 lg:px-8">
        <TopBanner
          notificaciones={actividad}
          sinLeer={sinLeer}
          onMarcarLeidas={marcarLeidas}
          onToast={show}
          nombre={nombreUsuario}
          clinica={clinica?.nombre}
          iniciales={iniciales(nombreUsuario)}
        />
        <CentroOperacionesBanner
          onNuevaCita={() => setModal("cita")}
          onNuevoPaciente={() => setModal("paciente")}
          nombre={primerNombre(nombreUsuario)}
          clinica={clinica?.nombre}
        />
        <SearchBar value={query} onChange={setQuery} inputRef={searchRef} />
        {q && (
          <p className="mt-2 px-2 text-xs text-muted-foreground">
            {turnosFiltrados.length} turno(s) y {actividadFiltrada.length} movimiento(s) coinciden con «{query}»
          </p>
        )}

        <div className="mb-5 mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="group relative overflow-hidden rounded-3xl border border-primary/10 bg-card p-3.5 shadow-[0_14px_34px_-24px_rgba(124,58,237,0.6)] transition hover:-translate-y-0.5 sm:p-4">
              <span aria-hidden className={`pointer-events-none absolute -right-10 -top-12 size-32 rounded-full bg-gradient-to-br ${s.tono} opacity-[0.12] blur-2xl transition group-hover:opacity-20`} />
              <span aria-hidden className={`pointer-events-none absolute inset-x-4 bottom-0 h-[3px] rounded-full bg-gradient-to-r ${s.tono} opacity-70`} />
              <div className="relative flex items-start justify-between gap-2">
                <span className="text-[10px] font-bold uppercase leading-tight tracking-[0.1em] text-muted-foreground sm:text-[10.5px]">{s.label}</span>
                <span className={`grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${s.tono} text-white shadow-md sm:size-10 sm:rounded-2xl`}>
                  <s.icon className="size-4" />
                </span>
              </div>
              <p className={`relative mt-1.5 truncate font-display text-lg font-bold tracking-tight sm:text-2xl ${s.valueColor}`}>{s.value}</p>
              {(s.delta || s.sub) && (
                <p className="relative mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] sm:text-xs">
                  <span className={s.deltaColor}>{s.delta}</span>
                  <span className="line-clamp-2 leading-snug text-muted-foreground">{s.sub}</span>
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className={`${CARD} lg:col-span-2`}>
            <CabeceraCard
              icon={BarChart3}
              titulo="Evolución de la clínica"
              detalle={real ? "Últimos 6 meses" : "Últimos 6 meses · datos ficticios"}
              acciones={
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  <button onClick={guardarPdf} className={EXPORT_BTN} aria-label="Descargar PDF" title="PDF"><FileText className="size-3.5" /> <span className="hidden sm:inline">PDF</span></button>
                  <button onClick={exportarExcel} className={EXPORT_BTN} aria-label="Descargar Excel" title="Excel"><FileSpreadsheet className="size-3.5" /> <span className="hidden sm:inline">Excel</span></button>
                  <button onClick={imprimir} className={EXPORT_BTN} aria-label="Imprimir" title="Imprimir"><Printer className="size-3.5" /> <span className="hidden sm:inline">Imprimir</span></button>
                  <button onClick={compartir} className={EXPORT_BTN} aria-label="Compartir" title="Compartir"><Share2 className="size-3.5" /> <span className="hidden sm:inline">Compartir</span></button>
                </div>
              }
            />
            {real ? (
              <VacioCard className="h-40 sm:h-56">
                Cuando la clínica registre cobros, acá vas a ver cómo evolucionan mes a mes.
              </VacioCard>
            ) : (
            <GraficoEvolucion
              datos={EVOLUCION.map((e) => ({ etiqueta: e.mes, valor: e.ingresos }))}
              meta={META_MENSUAL}
              formato={millones}
              nombreSerie="Ingresos"
              nombreMeta="Meta mensual"
            />
            )}
          </div>

          <div className={`${CARD} flex flex-col`}>
            <CabeceraCard
              icon={CalendarCheck}
              titulo="Próximos turnos"
              detalle="Agenda de hoy"
              acciones={<Link to="/demo/agenda" className="text-xs font-semibold text-primary hover:underline">Ver agenda →</Link>}
            />
            {turnosFiltrados.length === 0 ? (
              <VacioCard className="flex-1">
                {q ? (
                  "Sin turnos que coincidan con la búsqueda."
                ) : (
                  <span className="grid justify-items-center gap-3">
                    Todavía no hay turnos para hoy.
                    <button type="button" onClick={() => setModal("cita")} className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-fuchsia-500 px-4 py-2 text-xs font-semibold text-white shadow-[0_10px_22px_-12px_rgba(124,58,237,0.9)] transition hover:brightness-110">
                      <CalendarPlus className="size-3.5" /> Nuevo turno
                    </button>
                  </span>
                )}
              </VacioCard>
            ) : (
              <ul className="divide-y divide-border">
                {turnosFiltrados.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 py-3 transition-colors hover:bg-primary/5">
                    <span className="w-12 shrink-0 text-xs font-medium text-muted-foreground">{t.hora}</span>
                    <span className="size-8 shrink-0 rounded-full bg-primary/10" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.paciente}</p>
                      <p className="truncate text-xs text-muted-foreground">{t.detalle}</p>
                    </div>
                    <EstadoBadge estado={t.estado} onClick={() => alternarEstado(t.id)} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ProduccionOdontologo {...(atendidosMes ? { datos: atendidosMes, unidad: "turnos" } : {})} />
          <ActividadReciente items={actividadFiltrada} buscando={!!q} />
        </div>

        <div className="mt-4">
          <AccesosRapidos
            onBuscar={enfocarBusqueda}
            onPresupuesto={() => setModal("presupuesto")}
            onRecordatorios={enviarRecordatorios}
          />
        </div>
      </div>

      {modal === "cita" && (
        <Modal title="Nuevo turno" subtitle="Asigná paciente, odontólogo, gabinete y horario." onClose={cerrarModal}>
          <NuevaCitaForm
            onSubmit={agregarCita}
            onCancel={cerrarModal}
            pacientes={sugerenciasPacientes}
            odontologos={odontologosEquipo.length || real ? odontologosEquipo : ODONTOLOGOS}
          />
        </Modal>
      )}
      {modal === "paciente" && (
        <Modal title="Nuevo paciente" size="lg" onClose={cerrarModal}>
          <NuevoPacienteForm
            onSubmit={agregarPaciente}
            onCancel={cerrarModal}
            documentosExistentes={real ? pacientesReales.map((p) => p.documento) : pacientesNuevos.map((p) => p.documento)}
          />
        </Modal>
      )}
      {modal === "presupuesto" && (
        <Modal title="Crear presupuesto" subtitle="Indicá paciente, tratamiento y monto." onClose={cerrarModal}>
          <NuevoPresupuestoForm onSubmit={crearPresupuesto} onCancel={cerrarModal} pacientes={sugerenciasPacientes} />
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

function DashboardPage() {
  return (
    <CloudEstherProvider>
      <DashboardInner />
    </CloudEstherProvider>
  );
}