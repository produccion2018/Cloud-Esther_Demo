import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import {
  Search, ChevronDown, ChevronUp, Download, UserPlus, FolderOpen, Pencil, Trash2, X, ImagePlus,
  Users, History, Stethoscope, Activity, FileText, ReceiptText, CalendarDays, Wallet, HeartPulse,
  Mail, Hash, ShieldCheck, Phone, Pill,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppShell } from "@/components/cloud-esther/AppShell";
import { CloudEstherProvider } from "@/lib/cloud-esther/data";
import { SeccionPaciente, useRegistrosPacientes } from "@/components/cloud-esther/PacienteSecciones";
import type { Cambiar, Registros } from "@/components/cloud-esther/PacienteSecciones";
import { usePacientes } from "@/lib/cloud-esther/pacientes";
import type { Paciente, EstadoPaciente } from "@/lib/cloud-esther/pacientes";

// "demo_" (con guion bajo) hace que esta ruta NO quede anidada dentro de demo.tsx
export const Route = createFileRoute("/demo_/pacientes")({
  head: () => ({
    meta: [{ title: "Pacientes | Cloud Esther" }],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: PacientesPage,
});

/* ───────────── Tipos ───────────── */

type DatosPaciente = Omit<Paciente, "id">;
type ModalActivo = { tipo: "form"; paciente?: Paciente } | { tipo: "eliminar"; paciente: Paciente } | null;

type Seccion =
  | "resumen" | "historia" | "tratamientos" | "odontograma" | "documentos" | "recetas"
  | "estudios" | "presupuestos" | "turnos" | "cuenta" | "profesionales";

const SECCIONES: { id: Seccion; label: string; icon: LucideIcon }[] = [
  { id: "resumen", label: "Resumen", icon: Users },
  { id: "historia", label: "Historia clínica", icon: History },
  { id: "tratamientos", label: "Tratamientos", icon: Stethoscope },
  { id: "odontograma", label: "Odontograma", icon: Activity },
  { id: "documentos", label: "Documentos", icon: FolderOpen },
  { id: "recetas", label: "Receta digital", icon: Pill },
  { id: "estudios", label: "Estudios y diagnósticos", icon: FileText },
  { id: "presupuestos", label: "Presupuestos", icon: ReceiptText },
  { id: "turnos", label: "Turnos", icon: CalendarDays },
  { id: "cuenta", label: "Cuenta corriente", icon: Wallet },
  { id: "profesionales", label: "Profesionales", icon: HeartPulse },
];

/* ───────────── Datos ─────────────
   TODO backend: los catálogos y el paciente de ejemplo se reemplazan por lo
   que devuelva la API (filtrado por la clínica del usuario). Un solo dato de
   ejemplo; se borra al conectar. */

// TODO backend: las sucursales las completa la API (por clínica). Vacío a propósito.
const SUCURSALES: string[] = [];
// TODO backend: las obras sociales las completa la API. Solo queda la opción fija.
const OBRAS_SOCIALES = ["No aplica / particular"];
const GENEROS = ["Femenino", "Masculino", "No binario", "Prefiere no decir"];
const ESTADOS: EstadoPaciente[] = ["Activo", "Inactivo"];

/* ───────────── Utilidades ───────────── */

function formatearDocumento(digitos: string) {
  return digitos ? Number(digitos).toLocaleString("es-AR") : "";
}

function etiquetaObraSocial(o: string) {
  return o.startsWith("No aplica") ? "Particular" : o;
}

function iniciales(p: Pick<Paciente, "nombre" | "apellido">) {
  return `${p.nombre.charAt(0)}${p.apellido.charAt(0)}`.toUpperCase();
}

function csvCelda(v: string) {
  return `"${v.replace(/"/g, '""')}"`;
}

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fechaCorta(iso: string) {
  return iso ? iso.split("-").reverse().join("/") : "";
}

function edadDesde(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  const hoy = new Date();
  let edad = hoy.getFullYear() - a;
  if (hoy.getMonth() + 1 < m || (hoy.getMonth() + 1 === m && hoy.getDate() < d)) edad--;
  return edad;
}

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

/* ───────────── Estilos ───────────── */

const CARD =
  "rounded-xl border border-primary/25 bg-card/90 bg-gradient-to-b from-[oklch(0.96_0.025_292)]/70 to-transparent p-3 shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-primary hover:shadow-lg hover:shadow-primary/10";

const DATO_CARD =
  "relative overflow-hidden rounded-xl border border-primary/20 bg-card bg-gradient-to-br from-card via-card to-[oklch(0.94_0.035_292)] p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md hover:shadow-primary/10";

const INPUT =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20";

const TEXTAREA =
  "min-h-16 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20";

const BTN_PRIMARIO =
  "flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-primary to-[oklch(0.5_0.2_292)] px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2";

const BTN_SECUNDARIO =
  "flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:shadow-md active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2";

const BTN_ICONO =
  "grid size-9 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/10 hover:text-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2";

const BTN_ICONO_PELIGRO =
  "grid size-9 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 focus-visible:ring-offset-2";

/* ───────────── Fondo temático (pacientes) ───────────── */

function FondoPacientes() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.05] via-transparent to-primary/[0.04]" />
      <div className="absolute -left-24 -top-24 size-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-32 -right-24 size-[28rem] rounded-full bg-primary/10 blur-3xl" />
      <svg className="absolute inset-0 size-full text-primary" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="patron-pacientes-lista" width="170" height="170" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.06">
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
        <rect width="100%" height="100%" fill="url(#patron-pacientes-lista)" />
      </svg>

      {/* Ilustración: paciente con tablet mostrando un diente */}
      <div
        className="absolute right-4 top-20 hidden w-[320px] text-primary opacity-40 md:block lg:right-10 lg:w-[360px]"
        style={{
          WebkitMaskImage: "linear-gradient(to bottom, black 55%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, black 55%, transparent 100%)",
        }}
      >
        <svg viewBox="0 0 360 420" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* cuerpo y cuello */}
          <path d="M30 420c0-72 52-112 124-112s124 40 124 112z" fill="currentColor" opacity="0.16" />
          <rect x="134" y="248" width="42" height="64" rx="18" fill="currentColor" opacity="0.14" />
          {/* cabeza y pelo */}
          <circle cx="155" cy="188" r="62" fill="currentColor" opacity="0.16" />
          <path d="M93 184c0-46 28-74 63-74s63 27 63 68c-14-19-38-31-63-31s-47 13-63 37z" fill="currentColor" opacity="0.26" />
          {/* rostro */}
          <circle cx="135" cy="192" r="4" fill="currentColor" opacity="0.4" />
          <circle cx="175" cy="192" r="4" fill="currentColor" opacity="0.4" />
          <path d="M136 214q19 17 38 0" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.4" />
          {/* tablet */}
          <g transform="rotate(-10 262 330)">
            <rect x="188" y="238" width="152" height="196" rx="20" fill="currentColor" opacity="0.22" />
            <rect x="199" y="250" width="130" height="172" rx="12" fill="currentColor" opacity="0.08" />
            <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.5">
              <path d="M264 274c-7-6-15-9-23-9-14 0-23 12-23 25 0 12 5 19 9 30 3 10 3 26 9 35 4 6 11 5 14-2 3-7 3-17 7-24 2-4 5-6 8-6s6 2 8 6c4 7 4 17 7 24 3 7 10 8 14 2 6-9 6-25 9-35 4-11 9-18 9-30 0-13-9-25-23-25-8 0-16 3-23 9z" />
            </g>
            <g stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.28">
              <path d="M214 372h100M214 390h70M214 408h84" />
            </g>
          </g>
          {/* manos */}
          <ellipse cx="200" cy="392" rx="26" ry="18" fill="currentColor" opacity="0.2" />
          <ellipse cx="330" cy="352" rx="18" ry="24" fill="currentColor" opacity="0.2" />
        </svg>
      </div>
    </div>
  );
}

/* ───────────── Modal y campos ───────────── */

function Modal({
  title,
  size = "lg",
  onClose,
  children,
}: {
  title: string;
  size?: "sm" | "lg";
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
        className={`max-h-[92vh] w-full overflow-y-auto rounded-2xl border border-primary/15 bg-card bg-gradient-to-b from-primary/[0.06] to-transparent p-5 shadow-2xl ${
          size === "sm" ? "max-w-sm" : "max-w-xl"
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
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
      <span className="mb-1 block text-xs font-medium">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-destructive">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  );
}

function SelectField({
  value,
  onChange,
  options,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${INPUT} appearance-none pr-9 ${value === "" && className === "muted" ? "text-muted-foreground" : ""}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

/* ───────────── Formulario de paciente (crear / editar) ───────────── */

function PacienteForm({
  inicial,
  documentosExistentes,
  onSubmit,
  onCancel,
}: {
  inicial?: Paciente;
  documentosExistentes: string[];
  onSubmit: (d: DatosPaciente) => void;
  onCancel: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [foto, setFoto] = useState<string | null>(inicial?.foto ?? null);
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [apellido, setApellido] = useState(inicial?.apellido ?? "");
  const [documento, setDocumento] = useState(inicial ? formatearDocumento(inicial.documento) : "");
  const [errorDocumento, setErrorDocumento] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState(inicial?.fechaNacimiento ?? "");
  const [genero, setGenero] = useState(inicial?.genero ?? "");
  const [email, setEmail] = useState(inicial?.email ?? "");
  const [telefono, setTelefono] = useState(inicial?.telefono ?? "");
  const [sucursal, setSucursal] = useState(inicial?.sucursal ?? "");
  const [estado, setEstado] = useState<EstadoPaciente>(inicial?.estado ?? "Activo");
  const [obraSocial, setObraSocial] = useState(inicial?.obraSocial ?? OBRAS_SOCIALES[0]);
  const [afiliado, setAfiliado] = useState(inicial?.afiliado ?? "");
  const [direccion, setDireccion] = useState(inicial?.direccion ?? "");
  const [nota, setNota] = useState(inicial?.nota ?? "");

  const opcionesObraSocial =
    inicial && !OBRAS_SOCIALES.includes(inicial.obraSocial)
      ? [...OBRAS_SOCIALES, inicial.obraSocial]
      : OBRAS_SOCIALES;

  const elegirFoto = (e: ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    const lector = new FileReader();
    lector.onload = () => setFoto(String(lector.result));
    lector.readAsDataURL(archivo);
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
      nombre: nombre.trim(),
      apellido: apellido.trim(),
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
      estado,
      foto,
    });
  };

  return (
    <form onSubmit={enviar} className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-dashed border-primary/30 bg-primary/10">
          {foto ? (
            <img src={foto} alt="Foto del paciente" className="size-full object-cover" />
          ) : (
            <ImagePlus className="size-6 text-primary" />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">Foto del paciente</p>
          <p className="text-xs text-muted-foreground">La foto podrá agregarse o cambiarse posteriormente.</p>
          <input ref={fileRef} type="file" accept="image/*" onChange={elegirFoto} className="hidden" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-1.5 rounded-lg border border-border bg-background px-3 py-1 text-xs font-medium shadow-sm transition-colors hover:bg-muted"
          >
            {foto ? "Cambiar foto" : "Seleccionar foto"}
          </button>
        </div>
      </div>

      <h3 className="pt-1 text-sm font-semibold">Datos personales</h3>
      <div className="grid grid-cols-1 items-start gap-x-3 gap-y-2.5 sm:grid-cols-2">
        <Field label="Nombre *">
          <input autoFocus required value={nombre} onChange={(e) => setNombre(e.target.value)} className={INPUT} placeholder="Mauro" />
        </Field>
        <Field label="Apellido *">
          <input required value={apellido} onChange={(e) => setApellido(e.target.value)} className={INPUT} placeholder="Pinto" />
        </Field>
        <Field label="Documento *" hint="El documento debe ser válido y único para el paciente." error={errorDocumento}>
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
          <SelectField className="muted" value={genero} onChange={setGenero} options={GENEROS} placeholder="Seleccionar" />
        </Field>
        <Field label="Correo electrónico *">
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} placeholder="mauro.pinto@email.com" />
        </Field>
        <Field label="Teléfono">
          <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} className={INPUT} placeholder="+54 11 5555-8899" />
        </Field>
        <Field label="Sucursal">
          <SelectField value={sucursal} onChange={setSucursal} options={SUCURSALES} placeholder="Seleccionar" />
        </Field>
        {inicial && (
          <Field label="Estado del paciente">
            <SelectField value={estado} onChange={(v) => setEstado(v as EstadoPaciente)} options={ESTADOS} />
          </Field>
        )}
      </div>

      <h3 className="pt-1 text-sm font-semibold">Obra social / cobertura</h3>
      <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2">
        <Field label="Obra social">
          <SelectField value={obraSocial} onChange={setObraSocial} options={opcionesObraSocial} />
        </Field>
        <Field label="Número de afiliado">
          <input value={afiliado} onChange={(e) => setAfiliado(e.target.value)} className={INPUT} placeholder="OS-45892177" />
        </Field>
      </div>

      <h3 className="pt-1 text-sm font-semibold">Información de contacto</h3>
      <div className="space-y-2.5">
        <Field label="Dirección">
          <input value={direccion} onChange={(e) => setDireccion(e.target.value)} className={INPUT} placeholder="Av. Corrientes 1234, Buenos Aires" />
        </Field>
        <Field label="Nota de interés">
          <textarea
            rows={2}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            className={TEXTAREA}
            placeholder="Información importante sobre el paciente…"
          />
        </Field>
      </div>

      <div className="flex justify-end gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className={BTN_SECUNDARIO}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className={BTN_PRIMARIO}
        >
          {inicial ? "Guardar cambios" : "Crear paciente"}
        </button>
      </div>
    </form>
  );
}

/* ───────────── Piezas de la página ───────────── */

function Avatar({ paciente, className }: { paciente: Paciente; className: string }) {
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-[oklch(0.45_0.2_290)] font-semibold text-primary-foreground shadow-md shadow-primary/25 ring-2 ring-card ${className}`}
    >
      {paciente.foto ? (
        <img src={paciente.foto} alt={`${paciente.nombre} ${paciente.apellido}`} className="size-full object-cover" />
      ) : (
        iniciales(paciente)
      )}
    </span>
  );
}

function BadgeEstado({ estado, largo = false }: { estado: EstadoPaciente; largo?: boolean }) {
  const activo = estado === "Activo";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        activo ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
      }`}
    >
      {largo ? `Paciente ${estado.toLowerCase()}` : estado}
    </span>
  );
}

function BadgeOutline({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-semibold">
      {children}
    </span>
  );
}

function IconoCirculo({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div className="pointer-events-none absolute -right-5 -top-5 grid size-20 place-items-center rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent ring-1 ring-primary/10">
      <Icon className="size-4 text-primary/70" />
    </div>
  );
}

function Dato({
  label,
  value,
  icon,
  cortar = false,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  cortar?: boolean;
}) {
  return (
    <div className={DATO_CARD}>
      <IconoCirculo icon={icon} />
      <p className="relative pr-8 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`relative mt-1 text-sm font-semibold ${cortar ? "truncate" : ""}`} title={cortar ? value : undefined}>
        {value || "—"}
      </p>
    </div>
  );
}

function CarpetaPaciente({
  paciente,
  datos,
  cambiar,
  onToast,
  onEditar,
}: {
  paciente: Paciente;
  datos: Registros;
  cambiar: Cambiar;
  onToast: (msg: string) => void;
  onEditar: () => void;
}) {
  const [seccion, setSeccion] = useState<Seccion>("resumen");
  const actual = SECCIONES.find((s) => s.id === seccion) ?? SECCIONES[0];
  const ActualIcon = actual.icon;

  // El resumen se calcula con los registros del paciente (Tratamientos y Turnos), no con datos fijos.
  const tratamientosEnCurso = datos.tratamientos.filter((t) => t.estado === "En tratamiento");
  const tratamientoActual = tratamientosEnCurso[0] ?? null;
  const hoy = hoyISO();
  const proximoTurno =
    datos.turnos
      .filter((t) => (t.estado === "Pendiente" || t.estado === "Confirmado") && t.fecha >= hoy)
      .sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`))[0] ?? null;
  const nacimiento = paciente.fechaNacimiento
    ? `${fechaCorta(paciente.fechaNacimiento)} · ${edadDesde(paciente.fechaNacimiento)} años`
    : "";

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-primary/25 bg-card/95">
      <div className="grid grid-cols-1 md:grid-cols-[210px_minmax(0,1fr)]">
        {/* Navegación */}
        <nav className="border-b border-border p-3 md:border-b-0 md:border-r">
          <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Carpeta del paciente
          </p>
          <div className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
            {SECCIONES.map((s) => {
              const Icon = s.icon;
              const activa = s.id === seccion;
              return (
                <button
                  key={s.id}
                  onClick={() => setSeccion(s.id)}
                  className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium transition-all duration-200 ${
                    activa
                      ? "bg-gradient-to-b from-primary to-[oklch(0.5_0.2_292)] text-primary-foreground shadow-md shadow-primary/25"
                      : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  {s.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Contenido */}
        <div className="min-w-0 p-4">
          {seccion === "resumen" ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="text-lg font-semibold">Resumen del paciente</h4>
                  <p className="text-sm text-muted-foreground">
                    Información general y estado actual de {paciente.nombre}.
                  </p>
                </div>
                <button onClick={onEditar} className={BTN_SECUNDARIO}>
                  <Pencil className="size-4" />
                  Editar paciente
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <Dato label="Documento" value={formatearDocumento(paciente.documento)} icon={FileText} />
                <Dato label="Correo" value={paciente.email} icon={Mail} cortar />
                <Dato label="Obra social" value={etiquetaObraSocial(paciente.obraSocial)} icon={ShieldCheck} />
                <Dato label="Afiliado" value={paciente.afiliado} icon={Hash} />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Dato label="Fecha de nacimiento" value={nacimiento} icon={CalendarDays} />
                <Dato label="Sexo / género" value={paciente.genero} icon={Users} />
                <Dato label="Sucursal" value={paciente.sucursal} icon={HeartPulse} />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className={DATO_CARD}>
                  <IconoCirculo icon={Stethoscope} />
                  <h5 className="relative text-sm font-semibold">Tratamiento actual</h5>
                  {tratamientoActual ? (
                    <div className="relative mt-2 space-y-1 text-sm">
                      <p className="font-semibold">{tratamientoActual.nombre}</p>
                      <p className="text-muted-foreground">
                        {[tratamientoActual.pieza && `Pieza ${tratamientoActual.pieza}`, tratamientoActual.estado]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {tratamientoActual.profesional && (
                        <p className="text-muted-foreground">Profesional: {tratamientoActual.profesional}</p>
                      )}
                      {tratamientosEnCurso.length > 1 && (
                        <p className="text-xs text-muted-foreground">y {tratamientosEnCurso.length - 1} más en curso</p>
                      )}
                    </div>
                  ) : (
                    <p className="relative mt-2 text-sm text-muted-foreground">Sin tratamiento en curso.</p>
                  )}
                </div>
                <div className={DATO_CARD}>
                  <IconoCirculo icon={CalendarDays} />
                  <h5 className="relative text-sm font-semibold">Próximo turno</h5>
                  {proximoTurno ? (
                    <div className="relative mt-2 space-y-1 text-sm">
                      <p className="font-semibold">
                        {fechaCorta(proximoTurno.fecha)} · {proximoTurno.hora} hs
                      </p>
                      <p className="text-muted-foreground">{proximoTurno.motivo}</p>
                      {proximoTurno.profesional && <p className="text-muted-foreground">{proximoTurno.profesional}</p>}
                    </div>
                  ) : (
                    <p className="relative mt-2 text-sm text-muted-foreground">Sin turnos programados.</p>
                  )}
                </div>
              </div>

              <div className={DATO_CARD}>
                <IconoCirculo icon={Phone} />
                <h5 className="relative text-sm font-semibold">Información de contacto</h5>
                <dl className="relative mt-2 grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="inline font-semibold">Teléfono: </dt>
                    <dd className="inline text-muted-foreground">{paciente.telefono || "—"}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="inline font-semibold">Email: </dt>
                    <dd className="inline break-all text-muted-foreground">{paciente.email || "—"}</dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold">Dirección: </dt>
                    <dd className="inline text-muted-foreground">{paciente.direccion || "—"}</dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold">Nota de interés: </dt>
                    <dd className="inline text-muted-foreground">{paciente.nota || "—"}</dd>
                  </div>
                </dl>
              </div>
            </div>
          ) : seccion === "odontograma" ? (
            <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-border text-center">
              <div>
                <ActualIcon className="mx-auto size-8 text-primary/60" />
                <p className="mt-2 text-sm font-semibold">{actual.label}</p>
                <p className="text-sm text-muted-foreground">Esta sección estará disponible próximamente.</p>
              </div>
            </div>
          ) : (
            <SeccionPaciente
              seccion={seccion}
              datos={datos}
              cambiar={cambiar}
              onToast={onToast}
              contexto={{
                paciente: `${paciente.nombre} ${paciente.apellido}`.trim(),
                email: paciente.email,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────── Página ───────────── */

function PacientesInner() {
  const { message, show } = useToast();
  const registros = useRegistrosPacientes();
  const { pacientes, setPacientes } = usePacientes();
  const [abiertoId, setAbiertoId] = useState<number | null>(null);
  const [modal, setModal] = useState<ModalActivo>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroSucursal, setFiltroSucursal] = useState("");

  const cerrarModal = () => setModal(null);

  /* Filtros */

  const q = busqueda.trim().toLowerCase();
  const qDigitos = q.replace(/\D/g, "");
  const coincide = (p: Paciente) =>
    !q ||
    `${p.nombre} ${p.apellido}`.toLowerCase().includes(q) ||
    (qDigitos.length > 0 &&
      (p.documento.includes(qDigitos) || p.telefono.replace(/\D/g, "").includes(qDigitos)));

  const filtrados = pacientes.filter(
    (p) =>
      coincide(p) &&
      (!filtroEstado || p.estado === filtroEstado) &&
      (!filtroSucursal || p.sucursal === filtroSucursal),
  );
  const hayFiltros = Boolean(q || filtroEstado || filtroSucursal);

  /* Acciones
     TODO backend: cada handler es el punto donde va la llamada a la API
     (POST / PUT / DELETE / GET export). Hoy solo actualizan el estado local. */

  const guardarPaciente = (d: DatosPaciente) => {
    const editando = modal?.tipo === "form" ? modal.paciente : undefined;
    if (editando) {
      // TODO backend: PUT /pacientes/:id
      setPacientes((prev) => prev.map((p) => (p.id === editando.id ? { ...p, ...d } : p)));
      show("Paciente actualizado");
    } else {
      // TODO backend: POST /pacientes
      setPacientes((prev) => [...prev, { ...d, id: Date.now() }]);
      show("Paciente creado");
    }
    cerrarModal();
  };

  const eliminarPaciente = (p: Paciente) => {
    // TODO backend: DELETE /pacientes/:id
    setPacientes((prev) => prev.filter((x) => x.id !== p.id));
    registros.quitar(p.id);
    if (abiertoId === p.id) setAbiertoId(null);
    cerrarModal();
    show(`${p.nombre} ${p.apellido} eliminado`);
  };

  const exportar = () => {
    // TODO backend: GET /pacientes/export (o generar el archivo en el servidor)
    if (filtrados.length === 0) {
      show("No hay pacientes para exportar");
      return;
    }
    const filas = [
      ["Nombre", "Apellido", "Documento", "Teléfono", "Correo", "Obra social", "Afiliado", "Sucursal", "Estado"],
      ...filtrados.map((p) => [
        p.nombre,
        p.apellido,
        formatearDocumento(p.documento),
        p.telefono,
        p.email,
        etiquetaObraSocial(p.obraSocial),
        p.afiliado,
        p.sucursal,
        p.estado,
      ]),
    ];
    const csv = "\uFEFF" + filas.map((f) => f.map(csvCelda).join(";")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pacientes.csv";
    a.click();
    URL.revokeObjectURL(url);
    show("Descargando pacientes.csv");
  };

  const modalForm = modal?.tipo === "form" ? modal : null;
  const modalEliminar = modal?.tipo === "eliminar" ? modal : null;
  const idEditando = modalForm?.paciente?.id;
  const documentosExistentes = pacientes.filter((p) => p.id !== idEditando).map((p) => p.documento);

  return (
    <AppShell>
      <div className="relative min-h-full">
        <FondoPacientes />

        <div
          className="relative mx-auto w-full max-w-[1400px] px-4 py-5 md:px-6 lg:px-8"
          style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif' }}
        >
          {/* Encabezado */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-display text-2xl font-bold tracking-tight">Pacientes</h1>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {pacientes.length} {pacientes.length === 1 ? "paciente" : "pacientes"}
                </span>
              </div>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Listado unificado de pacientes con acceso a su carpeta clínica, tratamientos, documentos, turnos y
                cuenta corriente.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={exportar}
                className={BTN_SECUNDARIO}
              >
                <Download className="size-4" />
                Exportar
              </button>
              <button
                onClick={() => setModal({ tipo: "form" })}
                className={BTN_PRIMARIO}
              >
                <UserPlus className="size-4" />
                Nuevo paciente
              </button>
            </div>
          </div>

          {/* Filtros */}
          <div className={`${CARD} mt-4`}>
            <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-[minmax(0,1.4fr)_1fr_1fr]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre, documento o teléfono"
                  className={`${INPUT} pl-9`}
                />
              </div>
              <SelectField value={filtroEstado} onChange={setFiltroEstado} options={ESTADOS} placeholder="Todos los estados" />
              <SelectField value={filtroSucursal} onChange={setFiltroSucursal} options={SUCURSALES} placeholder="Todas las sucursales" />
            </div>
            {hayFiltros && (
              <button
                onClick={() => {
                  setBusqueda("");
                  setFiltroEstado("");
                  setFiltroSucursal("");
                }}
                className="mt-2 text-xs font-medium text-primary"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          {/* Listado */}
          <div className="mt-3">
            {filtrados.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border bg-card/90 py-10 text-center text-sm text-muted-foreground backdrop-blur-sm">
                {hayFiltros
                  ? "No hay pacientes que coincidan con los filtros."
                  : "Todavía no hay pacientes. Creá el primero con «Nuevo paciente»."}
              </p>
            ) : (
              <ul className="space-y-2.5">
                {filtrados.map((p) => {
                  const abierto = abiertoId === p.id;
                  return (
                    <li
                      key={p.id}
                      className={`rounded-xl border bg-card/95 p-3 shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-primary/50 hover:shadow-md ${
                        abierto ? "border-primary" : "border-border hover:-translate-y-0.5"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-4">
                        <Avatar paciente={p} className="size-12 text-base" />

                        <div className="min-w-[150px]">
                          <p className="font-semibold leading-tight">
                            {p.nombre} {p.apellido}
                          </p>
                          <p className="text-sm text-muted-foreground">DNI {formatearDocumento(p.documento)}</p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            <BadgeEstado estado={p.estado} />
                            <BadgeOutline>{etiquetaObraSocial(p.obraSocial)}</BadgeOutline>
                          </div>
                        </div>

                        <div className="grid min-w-[260px] flex-1 grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Teléfono</p>
                            <p className="font-medium">{p.telefono || "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Obra social</p>
                            <p className="font-medium">{etiquetaObraSocial(p.obraSocial)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Sucursal</p>
                            <p className="font-medium">{p.sucursal || "—"}</p>
                          </div>
                        </div>

                        <div className="ml-auto flex items-center gap-2">
                          <button
                            onClick={() => setAbiertoId(abierto ? null : p.id)}
                            className={BTN_PRIMARIO}
                          >
                            <FolderOpen className="size-4" />
                            {abierto ? "Cerrar carpeta" : "Abrir carpeta"}
                            {abierto ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                          </button>
                          <button
                            onClick={() => setModal({ tipo: "form", paciente: p })}
                            aria-label={`Editar a ${p.nombre} ${p.apellido}`}
                            className={BTN_ICONO}
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            onClick={() => setModal({ tipo: "eliminar", paciente: p })}
                            aria-label={`Eliminar a ${p.nombre} ${p.apellido}`}
                            className={BTN_ICONO_PELIGRO}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>

                      {abierto && (
                        <CarpetaPaciente
                          key={p.id}
                          paciente={p}
                          datos={registros.de(p.id)}
                          cambiar={(clave, fn) => registros.cambiar(p.id, clave, fn)}
                          onToast={show}
                          onEditar={() => setModal({ tipo: "form", paciente: p })}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {modalForm && (
        <Modal title={modalForm.paciente ? "Editar paciente" : "Nuevo paciente"} onClose={cerrarModal}>
          <PacienteForm
            inicial={modalForm.paciente}
            documentosExistentes={documentosExistentes}
            onSubmit={guardarPaciente}
            onCancel={cerrarModal}
          />
        </Modal>
      )}

      {modalEliminar && (
        <Modal title="Eliminar paciente" size="sm" onClose={cerrarModal}>
          <p className="text-sm text-muted-foreground">
            ¿Seguro que querés eliminar a{" "}
            <span className="font-semibold text-foreground">
              {modalEliminar.paciente.nombre} {modalEliminar.paciente.apellido}
            </span>
            ? Esta acción no se puede deshacer.
          </p>
          <div className="mt-4 flex justify-end gap-3">
            <button
              onClick={cerrarModal}
              className={BTN_SECUNDARIO}
            >
              Cancelar
            </button>
            <button
              onClick={() => eliminarPaciente(modalEliminar.paciente)}
              className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            >
              Eliminar
            </button>
          </div>
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

function PacientesPage() {
  return (
    <CloudEstherProvider>
      <PacientesInner />
    </CloudEstherProvider>
  );
}