import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import {
  Clock, DollarSign, Bell, TriangleAlert, FileText, FileSpreadsheet, Printer, Share2,
  CalendarCheck, UserSearch, ReceiptText, BellRing,
  Calendar, MessageSquare, Settings, ChevronDown, Search, Command, UserPlus, CalendarPlus, X, ImagePlus,
} from "lucide-react";
import { AppShell } from "@/components/cloud-esther/AppShell";
import { CloudEstherProvider } from "@/lib/cloud-esther/data";
// Capas del banner (de atrás hacia adelante). Los 4 archivos van en src/assets/
import heroFondo from "@/assets/hero-fondo.webp";
import heroPersonaje1 from "@/assets/hero-personaje-1.webp";
import heroPersonaje2 from "@/assets/hero-personaje-2.webp";
import heroPersonaje3 from "@/assets/hero-personaje-3.webp";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [{ title: "Demo | Cloud Esther" }],
  }),
  component: DashboardPage,
});

/* ───────────── Tipos ───────────── */

type EstadoTurno = "Confirmado" | "Pendiente";
type Turno = { id: number; hora: string; paciente: string; detalle: string; estado: EstadoTurno };
type Actividad = { id: number; hora: string; quien: string; accion: string };
type ModalActivo = "cita" | "paciente" | "presupuesto" | null;

/* ───────────── Datos de ejemplo ───────────── */

const STATS = [
  { label: "Turnos de hoy", value: "11", valueColor: "text-primary", icon: Clock, delta: "+9%", deltaColor: "text-emerald-600", sub: "7 confirmados · 2 pendientes" },
  { label: "Ingresos del día", value: "$ 1.284.000", valueColor: "text-emerald-600", icon: DollarSign, delta: "+14%", deltaColor: "text-emerald-600", sub: "6 cobros registrados" },
  { label: "Recordatorios enviados", value: "34", valueColor: "text-foreground", icon: Bell, delta: "94% entregados", deltaColor: "text-muted-foreground", sub: "" },
  { label: "Deuda vencida", value: "$ 572.000", valueColor: "text-destructive", icon: TriangleAlert, delta: "-4%", deltaColor: "text-destructive", sub: "2 pacientes" },
];

const TURNOS_INICIALES: Turno[] = [
  { id: 1, hora: "08:00", paciente: "María González", detalle: "Control de ortodoncia · Dra. Ana Martínez", estado: "Confirmado" },
  { id: 2, hora: "08:45", paciente: "Carlos Rodríguez", detalle: "Implante · fase 2 · Dr. Carlos López", estado: "Confirmado" },
  { id: 3, hora: "09:30", paciente: "Laura Fernández", detalle: "Colocación de brackets · Dra. Ana Martínez", estado: "Pendiente" },
  { id: 4, hora: "10:15", paciente: "Juan Pérez", detalle: "Endodoncia pieza 26 · Dra. Sofía Gómez", estado: "Confirmado" },
];

const PRODUCCION = [
  { nombre: "Martínez", valor: 4.0 },
  { nombre: "López", valor: 3.8 },
  { nombre: "Gómez", valor: 3.95 },
  { nombre: "Ruiz", valor: 3.45 },
  { nombre: "Ibarra", valor: 3.3 },
];

const ACTIVIDAD_INICIAL: Actividad[] = [
  { id: 1, hora: "09:42", quien: "Mariana Costa", accion: "Confirmó el turno de María González" },
  { id: 2, hora: "09:31", quien: "Dra. Ana Martínez", accion: "Actualizó la historia clínica de Paula Medina" },
  { id: 3, hora: "09:18", quien: "Automatización", accion: "Envió 34 recordatorios de turno por WhatsApp" },
  { id: 4, hora: "08:55", quien: "Esteban Rivas", accion: "Emitió la factura F-0001-00184" },
  { id: 5, hora: "08:40", quien: "Sistema", accion: "Alerta de stock crítico: Guantes nitrilo M" },
  { id: 6, hora: "08:12", quien: "Dr. Carlos López", accion: "Aprobó el presupuesto PR-2026-0141" },
];

const SUCURSALES = ["Clínica Centro", "Clínica Norte", "Clínica Sur"];
const ODONTOLOGOS = ["Dra. Lucía Ferrer", "Dr. Martín Salas", "Dra. Camila Ríos"];
const GABINETES = ["Gabinete 1", "Gabinete 2", "Gabinete 3"];
const TRATAMIENTOS = [
  "Primera consulta",
  "Limpieza y profilaxis",
  "Control de ortodoncia",
  "Endodoncia",
  "Implante",
  "Blanqueamiento",
  "Urgencia dolor",
];
const PACIENTES_CONOCIDOS = TURNOS_INICIALES.map((t) => t.paciente);
const GENEROS = ["Femenino", "Masculino", "No binario", "Prefiere no decir"];
const OBRAS_SOCIALES = ["No aplica / particular", "OSDE", "Swiss Medical", "Galeno", "Medicus", "PAMI", "IOMA"];

// Datos ficticios: ingresos mensuales de los últimos 6 meses
const EVOLUCION = [
  { mes: "Abril", ingresos: 21400000 },
  { mes: "Mayo", ingresos: 22900000 },
  { mes: "Junio", ingresos: 24800000 },
  { mes: "Julio", ingresos: 27300000 },
  { mes: "Agosto", ingresos: 30100000 },
  { mes: "Septiembre", ingresos: 33600000 },
];

const EVOLUCION_PUNTOS = (() => {
  const valores = EVOLUCION.map((e) => e.ingresos);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  return EVOLUCION.map((e, i) => {
    const x = (i * 400) / (EVOLUCION.length - 1);
    const y = 140 - ((e.ingresos - min) / (max - min)) * 120;
    return `${x},${y}`;
  }).join(" ");
})();

const CARD =
  "rounded-2xl border border-primary/25 bg-gradient-to-b from-[oklch(0.96_0.025_292)]/70 to-transparent p-4 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:border-primary hover:shadow-lg hover:shadow-primary/10";

const INPUT =
  "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20";

const TEXTAREA =
  "min-h-24 w-full resize-y rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20";

const ACCESO_BTN =
  "flex items-center gap-2 rounded-full border border-primary/20 bg-background px-4 py-2 text-sm font-medium transition-all hover:-translate-y-0.5 hover:bg-primary/5";

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
        className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
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
}: {
  onSubmit: (c: NuevaCita) => void;
  onCancel: () => void;
  pacientes: string[];
}) {
  const [paciente, setPaciente] = useState("");
  const [sucursal, setSucursal] = useState(SUCURSALES[0]);
  const [odontologo, setOdontologo] = useState(ODONTOLOGOS[0]);
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

      <FormActions submitLabel="Crear cita" onCancel={onCancel} />
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

  // Libera la vista previa de la foto al cambiarla o al cerrar el modal
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

function EstadoBadge({ estado, onClick }: { estado: EstadoTurno; onClick: () => void }) {
  const confirmado = estado === "Confirmado";
  return (
    <button
      type="button"
      onClick={onClick}
      title="Clic para cambiar el estado"
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80 ${
        confirmado ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
      }`}
    >
      <span className={`size-1.5 rounded-full ${confirmado ? "bg-emerald-600" : "bg-amber-600"}`} />
      {estado}
    </button>
  );
}

/* ───────────── Banner en capas (efecto parallax 3D) ─────────────
   Las capas van de atrás hacia adelante. "profundidad" son los píxeles que se
   mueve cada capa con el mouse (más alto = más cerca de la cámara).
   Todas las imágenes tienen el mismo tamaño de lienzo (1536 x 868). */

const CAPAS_HERO: {
  src: string;
  profundidad: number;
  respira?: { origen: string; duracion: number; demora: number };
}[] = [
  { src: heroFondo, profundidad: 3 },
  { src: heroPersonaje1, profundidad: 6, respira: { origen: "38% 72%", duracion: 5.2, demora: 0 } },
  { src: heroPersonaje2, profundidad: 8, respira: { origen: "56% 74%", duracion: 6.1, demora: -1.8 } },
  { src: heroPersonaje3, profundidad: 10, respira: { origen: "80% 76%", duracion: 5.7, demora: -3.1 } },
];

function HeroParallax() {
  const contRef = useRef<HTMLDivElement>(null);
  const capasRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const cont = contRef.current;
    if (!cont) return;
    // Respeta la preferencia de "reducir movimiento" del sistema
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let objetivo: { x: number; y: number } | null = null;
    const actual = { x: 0, y: 0 };
    let visible = true;
    let raf = 0;

    // Mouse sobre el banner → sigue al puntero. Fuera del banner → deriva suave sola.
    const onMove = (e: PointerEvent) => {
      const r = cont.getBoundingClientRect();
      const dentro =
        e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top - 40 && e.clientY <= r.bottom + 40;
      objetivo = dentro
        ? { x: ((e.clientX - r.left) / r.width - 0.5) * 2, y: ((e.clientY - r.top) / r.height - 0.5) * 2 }
        : null;
    };

    // No animar cuando el banner no se ve
    const io = new IntersectionObserver((entries) => {
      visible = entries.some((en) => en.isIntersecting);
    });
    io.observe(cont);
    window.addEventListener("pointermove", onMove, { passive: true });

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (!visible || document.hidden) return;
      const s = t / 1000;
      const tx = objetivo ? objetivo.x : Math.sin(s * 0.35) * 0.6;
      const ty = objetivo ? objetivo.y : Math.cos(s * 0.27) * 0.35;
      actual.x += (tx - actual.x) * 0.06;
      actual.y += (ty - actual.y) * 0.06;
      CAPAS_HERO.forEach((capa, i) => {
        const el = capasRef.current[i];
        if (!el) return;
        const dx = (-actual.x * capa.profundidad).toFixed(2);
        const dy = (-actual.y * capa.profundidad * 0.5).toFixed(2);
        el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      });
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div
      ref={contRef}
      role="img"
      aria-label="Consultorio odontológico"
      className="absolute inset-0 overflow-hidden opacity-80"
      style={{ containerType: "size" } as React.CSSProperties}
    >
      <style>{`
        @keyframes heroRespiraCE {
          0%, 100% { transform: translateY(0) rotate(0deg) scale(1); }
          50% { transform: translateY(-1.5px) rotate(0.12deg) scale(1.004); }
        }
        .hero-respira-ce { animation: heroRespiraCE 5.5s ease-in-out infinite; }
        @keyframes heroZoomCE {
          0% { transform: scale(1); }
          50% { transform: scale(1.12); }
          100% { transform: scale(1); }
        }
        .hero-zoom-ce { animation: heroZoomCE 16s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .hero-respira-ce, .hero-zoom-ce { animation: none; }
        }
      `}</style>

      {/* Escenario: cubre el banner igual que object-cover, con un 6% de margen para que las capas puedan moverse */}
      <div
        className="absolute left-1/2 top-1/2"
        style={
          {
            width: "max(106cqw, calc(106cqh * 1536 / 868))",
            aspectRatio: "1536 / 868",
            transform: "translate(-50%, -50%)",
          } as React.CSSProperties
        }
      >
        {/* Zoom lento de toda la escena (como tenía la foto antes) */}
        <div className="hero-zoom-ce absolute inset-0">
          {CAPAS_HERO.map((capa, i) => (
            <div
              key={capa.src}
              ref={(el) => {
                capasRef.current[i] = el;
              }}
              className="absolute inset-0 will-change-transform"
            >
              <div
                className={`absolute inset-0 ${capa.respira ? "hero-respira-ce" : ""}`}
                style={
                  capa.respira
                    ? {
                        transformOrigin: capa.respira.origen,
                        animationDuration: `${capa.respira.duracion}s`,
                        animationDelay: `${capa.respira.demora}s`,
                      }
                    : undefined
                }
              >
                <img src={capa.src} alt="" draggable={false} className="size-full select-none" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TopBanner({
  notificaciones,
  sinLeer,
  onMarcarLeidas,
  onToast,
}: {
  notificaciones: Actividad[];
  sinLeer: number;
  onMarcarLeidas: () => void;
  onToast: (msg: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const ahora = new Date();
  const fecha = ahora.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
  const hora = ahora.toLocaleTimeString("es-AR", { hour: "numeric", minute: "2-digit" });

  return (
    <div className="relative h-56 w-full rounded-2xl md:h-64">
      <div className="absolute inset-0 overflow-hidden rounded-2xl">
        <HeroParallax />
        <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent" />
      </div>

      <div className="absolute inset-0 flex flex-wrap items-start justify-between gap-2 p-4">
        <span className="flex items-center gap-2 rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm">
          <Calendar className="size-3.5 text-muted-foreground" />
          {fecha} · {hora}
        </span>

        <div className="flex flex-wrap items-center gap-2">
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
            onClick={() => onToast("La configuración estará disponible próximamente")}
            aria-label="Configuración"
            className="grid size-8 place-items-center rounded-full bg-background/90 shadow-sm backdrop-blur-sm hover:bg-background"
          >
            <Settings className="size-4 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-2 rounded-full bg-background/90 py-1 pl-1 pr-2.5 shadow-sm backdrop-blur-sm">
            <span className="brand-gradient grid size-7 place-items-center rounded-full text-[11px] font-semibold text-primary-foreground">PC</span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-xs font-medium">Pinto Castro Mauro</span>
              <span className="block text-[10px] text-muted-foreground">Dueño/a</span>
            </span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Banner "Centro de operaciones" ─────────────
   Mismo contenido y forma que antes; el fondo ahora tiene identidad de clínica:
   luces que flotan, trama de puntos, muela gigante de marca de agua, cruces médicas
   que titilan, línea de latido (ECG) animada y un brillo que cruza el banner. */

function CentroOperacionesBanner({
  onNuevaCita,
  onNuevoPaciente,
}: {
  onNuevaCita: () => void;
  onNuevoPaciente: () => void;
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

      {/* ───── Fondo decorativo ───── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {/* Luces difusas */}
        <div className="co-a absolute -left-16 -top-24 size-72 rounded-full bg-[oklch(0.78_0.15_305)]/30 blur-3xl" />
        <div className="co-b absolute -bottom-28 left-1/3 size-80 rounded-full bg-[oklch(0.66_0.2_280)]/40 blur-3xl" />

        {/* Trama de puntos que se desvanece hacia la derecha */}
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "22px 22px",
            maskImage: "linear-gradient(to right, black, transparent 70%)",
            WebkitMaskImage: "linear-gradient(to right, black, transparent 70%)",
          }}
        />

        {/* Muela gigante (marca de agua) */}
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

        {/* Cruces médicas que titilan */}
        <svg className="co-tw absolute left-[46%] top-5 size-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 4v16M4 12h16" />
        </svg>
        <svg className="co-tw absolute bottom-8 left-[62%] size-3 text-white" style={{ animationDelay: "1.3s" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 4v16M4 12h16" />
        </svg>
        <svg className="co-tw absolute bottom-6 left-[30%] size-3.5 text-white" style={{ animationDelay: "2.4s" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 4v16M4 12h16" />
        </svg>

        {/* Línea de latido (ECG) */}
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

        {/* Brillo que cruza el banner */}
        <div className="co-shine absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* ───── Contenido ───── */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">Hola, Pinto</p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight drop-shadow-sm md:text-3xl">Centro de operaciones</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-white/85">Todo lo que pasa hoy en tu clínica, en una sola pantalla.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={onNuevaCita}
            className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[oklch(0.45_0.22_292)] shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(0.47_0.22_292)]"
          >
            <CalendarPlus className="size-4" />
            Nueva cita
          </button>
          <button
            onClick={onNuevoPaciente}
            className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[oklch(0.45_0.22_292)] shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(0.47_0.22_292)]"
          >
            <UserPlus className="size-4" />
            Nuevo paciente
          </button>
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

function ProduccionOdontologo() {
  const max = Math.max(...PRODUCCION.map((p) => p.valor));
  return (
    <div className={CARD}>
      <h2 className="font-semibold">Producción por odontólogo</h2>
      <p className="text-xs text-muted-foreground">Mes en curso</p>
      <div className="mt-4 flex h-56 items-end gap-4 border-t border-dashed border-border pt-3">
        {PRODUCCION.map((p) => (
          <div key={p.nombre} className="flex flex-1 flex-col items-center gap-2">
            <div
              className="w-full max-w-14 rounded-t-md bg-primary transition-all duration-300 hover:opacity-80"
              style={{ height: `${(p.valor / max) * 100}%` }}
            />
            <span className="text-xs text-muted-foreground">{p.nombre}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActividadReciente({ items }: { items: Actividad[] }) {
  return (
    <div className={CARD}>
      <h2 className="font-semibold">Actividad reciente</h2>
      <p className="text-xs text-muted-foreground">Trazabilidad del día</p>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Sin movimientos que coincidan con la búsqueda.</p>
      ) : (
        <ul className="mt-3 space-y-3">
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
      <h2 className="font-semibold">Accesos rápidos</h2>
      <div className="mt-3 flex flex-wrap gap-3 border-t border-border pt-3">
        <Link to="/demo/agenda" className={ACCESO_BTN}>
          <CalendarCheck className="size-4 text-primary" />
          Agenda del día
        </Link>
        <button onClick={onBuscar} className={ACCESO_BTN}>
          <UserSearch className="size-4 text-primary" />
          Buscar paciente
        </button>
        <button onClick={onPresupuesto} className={ACCESO_BTN}>
          <ReceiptText className="size-4 text-primary" />
          Crear presupuesto
        </button>
        <button onClick={onRecordatorios} className={ACCESO_BTN}>
          <BellRing className="size-4 text-primary" />
          Recordatorios
        </button>
      </div>
    </div>
  );
}

/* ───────────── Página ───────────── */

function DashboardInner() {
  const { message, show } = useToast();
  const [turnos, setTurnos] = useState<Turno[]>(TURNOS_INICIALES);
  const [actividad, setActividad] = useState<Actividad[]>(ACTIVIDAD_INICIAL);
  const [sinLeer, setSinLeer] = useState(3);
  const [recordatoriosExtra, setRecordatoriosExtra] = useState(0);
  const [presupuestosNuevos, setPresupuestosNuevos] = useState(0);
  const [pacientesNuevos, setPacientesNuevos] = useState<{ nombre: string; documento: string }[]>([]);
  const sugerenciasPacientes = [...PACIENTES_CONOCIDOS, ...pacientesNuevos.map((p) => p.nombre)];
  const [modal, setModal] = useState<ModalActivo>(null);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Atajo ⌘K / Ctrl+K para enfocar el buscador
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
    const esHoy = c.fecha === hoyISO();
    if (esHoy) {
      setTurnos((prev) =>
        [
          ...prev,
          {
            id: Date.now(),
            hora: c.hora,
            paciente: c.paciente,
            detalle: `${c.tratamiento} · ${c.odontologo}`,
            estado: "Pendiente" as const,
          },
        ].sort((x, y) => x.hora.localeCompare(y.hora)),
      );
    }
    registrar("Pinto Castro Mauro", `Agendó un turno para ${c.paciente} el ${fechaTexto} a las ${c.hora}`);
    cerrarModal();
    show(esHoy ? "Turno agendado para hoy" : `Turno agendado para el ${fechaTexto}`);
  };

  const agregarPaciente = (p: NuevoPaciente) => {
    const nombreCompleto = `${p.nombre} ${p.apellido}`;
    setPacientesNuevos((prev) => [...prev, { nombre: nombreCompleto, documento: p.documento }]);
    registrar("Pinto Castro Mauro", `Registró al paciente ${nombreCompleto}`);
    cerrarModal();
    show("Paciente registrado");
  };

  const crearPresupuesto = (p: { paciente: string; tratamiento: string; monto: number }) => {
    const numero = `PR-2026-${String(142 + presupuestosNuevos).padStart(4, "0")}`;
    setPresupuestosNuevos((n) => n + 1);
    registrar(
      "Pinto Castro Mauro",
      `Creó el presupuesto ${numero} para ${p.paciente} (${p.tratamiento}) por $ ${p.monto.toLocaleString("es-AR")}`,
    );
    cerrarModal();
    show(`Presupuesto ${numero} creado`);
  };

  const alternarEstado = (id: number) => {
    const turno = turnos.find((t) => t.id === id);
    if (!turno) return;
    const nuevo: EstadoTurno = turno.estado === "Confirmado" ? "Pendiente" : "Confirmado";
    setTurnos((prev) => prev.map((t) => (t.id === id ? { ...t, estado: nuevo } : t)));
    registrar("Pinto Castro Mauro", `Marcó el turno de ${turno.paciente} como ${nuevo.toLowerCase()}`);
  };

  const enviarRecordatorios = () => {
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

  /* Exportar / imprimir / compartir */

  const imprimir = () => window.print();

  const guardarPdf = () => {
    show("En el diálogo de impresión elegí «Guardar como PDF»");
    window.setTimeout(() => window.print(), 400);
  };

  const exportarExcel = () => {
    const filas = [["Mes", "Ingresos (ARS)"], ...EVOLUCION.map((e) => [e.mes, String(e.ingresos)])];
    const csv = "\uFEFF" + filas.map((f) => f.join(";")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "evolucion-clinica.csv";
    a.click();
    URL.revokeObjectURL(url);
    show("Descargando evolucion-clinica.csv");
  };

  const compartir = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Cloud Esther · Demo", url });
      } else {
        await navigator.clipboard.writeText(url);
        show("Enlace copiado al portapapeles");
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") show("No se pudo compartir el enlace");
    }
  };

  /* Búsqueda */

  const q = query.trim().toLowerCase();
  const turnosFiltrados = turnos.filter((t) => !q || `${t.paciente} ${t.detalle}`.toLowerCase().includes(q));
  const actividadFiltrada = actividad.filter((a) => !q || `${a.quien} ${a.accion}`.toLowerCase().includes(q));

  const citasNuevas = turnos.length - TURNOS_INICIALES.length;
  const stats = [
    { ...STATS[0], value: String(11 + citasNuevas) },
    STATS[1],
    { ...STATS[2], value: String(34 + recordatoriosExtra) },
    STATS[3],
  ];

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6 lg:px-8">
        <TopBanner
          notificaciones={actividad}
          sinLeer={sinLeer}
          onMarcarLeidas={marcarLeidas}
          onToast={show}
        />
        <CentroOperacionesBanner
          onNuevaCita={() => setModal("cita")}
          onNuevoPaciente={() => setModal("paciente")}
        />
        <SearchBar value={query} onChange={setQuery} inputRef={searchRef} />
        {q && (
          <p className="mt-2 px-2 text-xs text-muted-foreground">
            {turnosFiltrados.length} turno(s) y {actividadFiltrada.length} movimiento(s) coinciden con «{query}»
          </p>
        )}

        <div className="mb-5 mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className={`${CARD} relative overflow-hidden`}>
              <div className="pointer-events-none absolute -right-5 -top-5 grid size-24 place-items-center rounded-full bg-primary/10">
                <s.icon className="size-4 text-muted-foreground" />
              </div>
              <span className="relative mb-2 block pr-16 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</span>
              <p className={`relative text-2xl font-bold tracking-tight ${s.valueColor}`}>{s.value}</p>
              {(s.delta || s.sub) && (
                <p className="relative mt-1 flex items-center gap-1.5 text-xs">
                  <span className={s.deltaColor}>{s.delta}</span>
                  <span className="text-muted-foreground">{s.sub}</span>
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className={`${CARD} lg:col-span-2`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Evolución de la clínica</h2>
                <p className="text-xs text-muted-foreground">Últimos 6 meses · datos ficticios</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <button onClick={guardarPdf} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 hover:bg-muted"><FileText className="size-3.5" /> PDF</button>
                <button onClick={exportarExcel} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 hover:bg-muted"><FileSpreadsheet className="size-3.5" /> Excel</button>
                <button onClick={imprimir} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 hover:bg-muted"><Printer className="size-3.5" /> Imprimir</button>
                <button onClick={compartir} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 hover:bg-muted"><Share2 className="size-3.5" /> Compartir</button>
              </div>
            </div>
            <div className="h-64 w-full rounded-xl bg-[linear-gradient(to_top,theme(colors.primary/12%),transparent)]">
              <svg viewBox="0 0 400 160" className="size-full" preserveAspectRatio="none">
                <polyline points={EVOLUCION_PUNTOS} fill="none" stroke="currentColor" className="text-primary" strokeWidth="2.5" />
                <polyline points="0,90 400,80" fill="none" stroke="currentColor" strokeDasharray="4 4" className="text-destructive/60" strokeWidth="1.5" />
              </svg>
            </div>
          </div>

          <div className={CARD}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Próximos turnos</h2>
                <p className="text-xs text-muted-foreground">Agenda de hoy</p>
              </div>
              <Link to="/demo/agenda" className="text-xs font-medium text-primary">Ver agenda →</Link>
            </div>
            {turnosFiltrados.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Sin turnos que coincidan con la búsqueda.</p>
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
          <ProduccionOdontologo />
          <ActividadReciente items={actividadFiltrada} />
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
        <Modal title="Nueva cita" subtitle="Asigná paciente, odontólogo, gabinete y horario." onClose={cerrarModal}>
          <NuevaCitaForm onSubmit={agregarCita} onCancel={cerrarModal} pacientes={sugerenciasPacientes} />
        </Modal>
      )}
      {modal === "paciente" && (
        <Modal title="Nuevo paciente" size="lg" onClose={cerrarModal}>
          <NuevoPacienteForm
            onSubmit={agregarPaciente}
            onCancel={cerrarModal}
            documentosExistentes={pacientesNuevos.map((p) => p.documento)}
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