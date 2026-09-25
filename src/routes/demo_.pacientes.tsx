import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import {
  Search,
  ChevronDown,
  ChevronUp,
  Download,
  UserPlus,
  FolderOpen,
  Pencil,
  Trash2,
  X,
  ImagePlus,
  Users,
  History,
  Stethoscope,
  Activity,
  FileText,
  ReceiptText,
  CalendarDays,
  Wallet,
  HeartPulse,
  Mail,
  Hash,
  ShieldCheck,
  Phone,
  Pill,
  FlaskConical,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppShell } from "@/components/cloud-esther/AppShell";
import { CloudEstherProvider } from "@/lib/cloud-esther/data";
import {
  SeccionPaciente,
  useRegistrosPacientes,
} from "@/components/cloud-esther/PacienteSecciones";
import type {
  Cambiar,
  Registros,
} from "@/components/cloud-esther/PacienteSecciones";
import { OdontogramaSec } from "@/components/cloud-esther/Odontograma2D";
import { usePacientes } from "@/lib/cloud-esther/pacientes";
import type {
  Paciente,
  EstadoPaciente,
} from "@/lib/cloud-esther/pacientes";

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

type ModalActivo =
  | { tipo: "form"; paciente?: Paciente }
  | { tipo: "eliminar"; paciente: Paciente }
  | null;

type Seccion =
  | "resumen"
  | "historia"
  | "tratamientos"
  | "odontograma"
  | "documentos"
  | "recetas"
  | "estudios"
  | "laboratorio"
  | "presupuestos"
  | "turnos"
  | "cuenta"
  | "profesionales";

const SECCIONES: {
  id: Seccion;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "resumen", label: "Resumen", icon: Users },
  { id: "historia", label: "Historia clínica", icon: History },
  { id: "tratamientos", label: "Tratamientos", icon: Stethoscope },
  { id: "odontograma", label: "Odontograma", icon: Activity },
  { id: "documentos", label: "Documentos", icon: FolderOpen },
  { id: "recetas", label: "Receta digital", icon: Pill },
  { id: "estudios", label: "Estudios y diagnósticos", icon: FileText },
  { id: "laboratorio", label: "Laboratorio", icon: FlaskConical },
  { id: "presupuestos", label: "Presupuestos", icon: ReceiptText },
  { id: "turnos", label: "Turnos", icon: CalendarDays },
  { id: "cuenta", label: "Cuenta corriente", icon: Wallet },
  { id: "profesionales", label: "Profesionales", icon: HeartPulse },
];

/* ───────────── Datos ───────────── */

// TODO backend: las sucursales las completa la API.
const SUCURSALES: string[] = [];

// TODO backend: las obras sociales las completa la API.
const OBRAS_SOCIALES = ["No aplica / particular"];

const GENEROS = [
  "Femenino",
  "Masculino",
  "No binario",
  "Prefiere no decir",
];

const ESTADOS: EstadoPaciente[] = ["Activo", "Inactivo"];

/* ───────────── Utilidades ───────────── */

function formatearDocumento(digitos: string) {
  return digitos ? Number(digitos).toLocaleString("es-AR") : "";
}

function etiquetaObraSocial(o: string) {
  return o.startsWith("No aplica") ? "Particular" : o;
}

function normalizarNombre(valor: string) {
  return valor
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es-AR")
    .replace(
      /(^|[\s'-])([a-záéíóúüñ])/giu,
      (_, separador: string, letra: string) =>
        `${separador}${letra.toLocaleUpperCase("es-AR")}`,
    );
}

function nombreCompleto(
  p: Pick<Paciente, "nombre" | "apellido">,
) {
  return `${normalizarNombre(p.nombre)} ${normalizarNombre(
    p.apellido,
  )}`.trim();
}

function iniciales(
  p: Pick<Paciente, "nombre" | "apellido">,
) {
  const nombre = normalizarNombre(p.nombre);
  const apellido = normalizarNombre(p.apellido);

  return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
}

function csvCelda(v: string) {
  return `"${v.replace(/"/g, '""')}"`;
}

function hoyISO() {
  const d = new Date();

  return `${d.getFullYear()}-${String(
    d.getMonth() + 1,
  ).padStart(2, "0")}-${String(d.getDate()).padStart(
    2,
    "0",
  )}`;
}

function fechaCorta(iso: string) {
  return iso ? iso.split("-").reverse().join("/") : "";
}

function edadDesde(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  const hoy = new Date();

  let edad = hoy.getFullYear() - a;

  if (
    hoy.getMonth() + 1 < m ||
    (hoy.getMonth() + 1 === m && hoy.getDate() < d)
  ) {
    edad--;
  }

  return edad;
}

function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const show = (msg: string) => {
    setMessage(msg);

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(
      () => setMessage(null),
      2400,
    );
  };

  return { message, show };
}

/* ───────────── Estilos ───────────── */

const CARD =
  "rounded-2xl border border-border/70 bg-card shadow-sm";

/* ITEM: cards de "Resumen" con ADN violeta de Cloud Esther —
   borde y fondo violeta siempre visibles (no solo en hover),
   y texto del valor un poco más suave (ver text-foreground/85 en Dato). */
const DATO_CARD =
  "relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-card to-primary/[0.035] p-3.5 shadow-sm shadow-primary/5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/45 hover:bg-primary/[0.06] hover:shadow-md hover:shadow-primary/10";

/* MINI_DATO_CARD: versión compacta de DATO_CARD para los chips de la fila
   del listado (Teléfono / Obra social / Sucursal) — mismo ADN violeta,
   sin el ícono circular ni el padding grande. */
const MINI_DATO_CARD =
  "rounded-xl border border-primary/20 bg-gradient-to-br from-card to-primary/[0.03] px-3 py-2 transition-all duration-200 hover:border-primary/35 hover:bg-primary/[0.055]";

const INPUT =
  "h-10 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary/60 focus:ring-4 focus:ring-primary/10";

const TEXTAREA =
  "min-h-20 w-full resize-y rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary/60 focus:ring-4 focus:ring-primary/10";

/* Botones más finos: menos padding vertical y tracking normal en vez de chips anchos */
const BTN_PRIMARIO =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-[13px] font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20";

const BTN_SECUNDARIO =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-1.5 text-[13px] font-medium text-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 hover:shadow-md active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15";

const BTN_ICONO =
  "grid size-8 place-items-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/10 hover:text-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15";

const BTN_ICONO_PELIGRO =
  "grid size-8 place-items-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-destructive/15";

/* ───────────── Fondo de pacientes ───────────── */

function FondoPacientes() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden opacity-75"
    >
      <div className="absolute left-[-120px] top-[-100px] size-[380px] rounded-full bg-primary/[0.09] blur-3xl" />

      <div className="absolute right-[-100px] top-[90px] size-[360px] rounded-full bg-violet-400/[0.075] blur-3xl" />

      <div className="absolute bottom-[-150px] right-[-100px] size-[420px] rounded-full bg-violet-400/[0.07] blur-3xl" />

      <div className="absolute left-1/2 top-[250px] size-[280px] -translate-x-1/2 rounded-full bg-fuchsia-300/[0.045] blur-3xl" />

      <div className="absolute bottom-[10%] left-[-100px] size-[300px] rounded-full bg-sky-300/[0.04] blur-3xl" />
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
      if (e.key === "Escape") {
        onClose();
      }
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
        className={`max-h-[92vh] w-full overflow-y-auto rounded-3xl border border-border bg-card p-5 shadow-2xl ${
          size === "sm" ? "max-w-sm" : "max-w-xl"
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              Cloud Esther
            </p>

            <h2 className="mt-1 text-lg font-semibold tracking-tight">
              {title}
            </h2>
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="grid size-8 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
      <span className="mb-1.5 block text-xs font-semibold">
        {label}
      </span>

      {children}

      {error ? (
        <span className="mt-1 block text-xs text-destructive">
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">
          {hint}
        </span>
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
        className={`${INPUT} appearance-none pr-9 ${
          value === "" && className === "muted"
            ? "text-muted-foreground"
            : ""
        }`}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}

        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>

      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

/* ───────────── Formulario de paciente ───────────── */

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

  const [foto, setFoto] = useState<string | null>(
    inicial?.foto ?? null,
  );

  const [nombre, setNombre] = useState(
    inicial?.nombre ?? "",
  );

  const [apellido, setApellido] = useState(
    inicial?.apellido ?? "",
  );

  const [documento, setDocumento] = useState(
    inicial
      ? formatearDocumento(inicial.documento)
      : "",
  );

  const [errorDocumento, setErrorDocumento] =
    useState("");

  const [fechaNacimiento, setFechaNacimiento] =
    useState(inicial?.fechaNacimiento ?? "");

  const [genero, setGenero] = useState(
    inicial?.genero ?? "",
  );

  const [email, setEmail] = useState(
    inicial?.email ?? "",
  );

  const [telefono, setTelefono] = useState(
    inicial?.telefono ?? "",
  );

  const [sucursal, setSucursal] = useState(
    inicial?.sucursal ?? "",
  );

  const [estado, setEstado] =
    useState<EstadoPaciente>(
      inicial?.estado ?? "Activo",
    );

  const [obraSocial, setObraSocial] =
    useState(
      inicial?.obraSocial ??
        OBRAS_SOCIALES[0],
    );

  const [afiliado, setAfiliado] = useState(
    inicial?.afiliado ?? "",
  );

  const [direccion, setDireccion] = useState(
    inicial?.direccion ?? "",
  );

  const [nota, setNota] = useState(
    inicial?.nota ?? "",
  );

  const opcionesObraSocial =
    inicial &&
    !OBRAS_SOCIALES.includes(
      inicial.obraSocial,
    )
      ? [
          ...OBRAS_SOCIALES,
          inicial.obraSocial,
        ]
      : OBRAS_SOCIALES;

  const elegirFoto = (
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    const archivo = e.target.files?.[0];

    if (!archivo) return;

    const lector = new FileReader();

    lector.onload = () =>
      setFoto(String(lector.result));

    lector.readAsDataURL(archivo);

    e.target.value = "";
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();

    const soloDigitos =
      documento.replace(/\D/g, "");

    if (
      soloDigitos.length < 7 ||
      soloDigitos.length > 8
    ) {
      setErrorDocumento(
        "Ingresá un documento válido (7 u 8 dígitos).",
      );

      return;
    }

    if (
      documentosExistentes.includes(
        soloDigitos,
      )
    ) {
      setErrorDocumento(
        "Ya existe un paciente con ese documento.",
      );

      return;
    }

    const nombreNormalizado =
      normalizarNombre(nombre);

    const apellidoNormalizado =
      normalizarNombre(apellido);

    onSubmit({
      nombre: nombreNormalizado,
      apellido: apellidoNormalizado,
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
    <form
      onSubmit={enviar}
      className="space-y-4"
    >
      {/* Foto */}

      <div className="rounded-2xl border border-primary/15 bg-primary/[0.045] p-3.5">
        <div className="flex items-center gap-4">
          <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-primary/20 bg-primary/10">
            {foto ? (
              <img
                src={foto}
                alt="Foto del paciente"
                className="size-full object-cover"
              />
            ) : (
              <ImagePlus className="size-6 text-primary" />
            )}
          </div>

          <div>
            <p className="text-sm font-semibold leading-tight">
              Foto del paciente
            </p>

            <p className="mt-0.5 text-xs text-muted-foreground">
              Podés agregarla ahora o más adelante.
            </p>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={elegirFoto}
              className="hidden"
            />

            <button
              type="button"
              onClick={() =>
                fileRef.current?.click()
              }
              className="mt-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors hover:bg-muted"
            >
              {foto
                ? "Cambiar foto"
                : "Seleccionar foto"}
            </button>
          </div>
        </div>
      </div>

      <h3 className="pt-1 text-sm font-semibold">
        Datos personales
      </h3>

      <div className="grid grid-cols-1 items-start gap-x-3 gap-y-3 sm:grid-cols-2">
        <Field label="Nombre *">
          <input
            autoFocus
            required
            value={nombre}
            onChange={(e) =>
              setNombre(e.target.value)
            }
            onBlur={() =>
              setNombre(
                normalizarNombre(nombre),
              )
            }
            className={INPUT}
            placeholder="Mauro"
          />
        </Field>

        <Field label="Apellido *">
          <input
            required
            value={apellido}
            onChange={(e) =>
              setApellido(e.target.value)
            }
            onBlur={() =>
              setApellido(
                normalizarNombre(apellido),
              )
            }
            className={INPUT}
            placeholder="Pinto"
          />
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
          <input
            type="date"
            value={fechaNacimiento}
            onChange={(e) =>
              setFechaNacimiento(
                e.target.value,
              )
            }
            className={INPUT}
          />
        </Field>

        <Field label="Sexo / género">
          <SelectField
            className="muted"
            value={genero}
            onChange={setGenero}
            options={GENEROS}
            placeholder="Seleccionar"
          />
        </Field>

        <Field label="Correo electrónico *">
          <input
            required
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            className={INPUT}
            placeholder="mauro.pinto@email.com"
          />
        </Field>

        <Field label="Teléfono">
          <input
            type="tel"
            value={telefono}
            onChange={(e) =>
              setTelefono(e.target.value)
            }
            className={INPUT}
            placeholder="+54 11 5555-8899"
          />
        </Field>

        <Field label="Sucursal">
          <SelectField
            value={sucursal}
            onChange={setSucursal}
            options={SUCURSALES}
            placeholder="Seleccionar"
          />
        </Field>

        {inicial && (
          <Field label="Estado del paciente">
            <SelectField
              value={estado}
              onChange={(v) =>
                setEstado(
                  v as EstadoPaciente,
                )
              }
              options={ESTADOS}
            />
          </Field>
        )}
      </div>

      <h3 className="pt-1 text-sm font-semibold">
        Obra social / cobertura
      </h3>

      <div className="grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2">
        <Field label="Obra social">
          <SelectField
            value={obraSocial}
            onChange={setObraSocial}
            options={opcionesObraSocial}
          />
        </Field>

        <Field label="Número de afiliado">
          <input
            value={afiliado}
            onChange={(e) =>
              setAfiliado(e.target.value)
            }
            className={INPUT}
            placeholder="OS-45892177"
          />
        </Field>
      </div>

      <h3 className="pt-1 text-sm font-semibold">
        Información de contacto
      </h3>

      <div className="space-y-3">
        <Field label="Dirección">
          <input
            value={direccion}
            onChange={(e) =>
              setDireccion(e.target.value)
            }
            className={INPUT}
            placeholder="Av. Corrientes 1234, Buenos Aires"
          />
        </Field>

        <Field label="Nota de interés">
          <textarea
            rows={2}
            value={nota}
            onChange={(e) =>
              setNota(e.target.value)
            }
            className={TEXTAREA}
            placeholder="Información importante sobre el paciente…"
          />
        </Field>
      </div>

      <div className="flex justify-end gap-3 border-t border-border/70 pt-4">
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
          {inicial
            ? "Guardar cambios"
            : "Crear paciente"}
        </button>
      </div>
    </form>
  );
}

/* ───────────── Piezas de la página ───────────── */

function Avatar({
  paciente,
  className,
}: {
  paciente: Paciente;
  className: string;
}) {
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary/10 font-bold text-primary ring-1 ring-primary/15 ${className}`}
    >
      {paciente.foto ? (
        <img
          src={paciente.foto}
          alt={nombreCompleto(paciente)}
          className="size-full object-cover"
        />
      ) : (
        iniciales(paciente)
      )}
    </span>
  );
}

function BadgeEstado({
  estado,
  largo = false,
}: {
  estado: EstadoPaciente;
  largo?: boolean;
}) {
  const activo = estado === "Activo";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        activo
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15"
          : "bg-muted text-muted-foreground"
      }`}
    >
      <span
        className={`size-1.5 rounded-full ${
          activo
            ? "bg-emerald-500"
            : "bg-muted-foreground/50"
        }`}
      />

      {largo
        ? `Paciente ${estado.toLowerCase()}`
        : estado}
    </span>
  );
}

function BadgeOutline({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <span className="inline-flex rounded-full border border-primary/20 bg-primary/[0.04] px-2.5 py-1 text-[11px] font-semibold text-foreground/75">
      {children}
    </span>
  );
}

function IconoCirculo({
  icon: Icon,
}: {
  icon: LucideIcon;
}) {
  return (
    <div className="pointer-events-none absolute right-3 top-3 grid size-8 place-items-center rounded-xl bg-primary/10 text-primary">
      <Icon className="size-4" />
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

      <p className="relative pr-10 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>

      <p
        className={`relative mt-1.5 text-sm font-semibold text-foreground/85 ${
          cortar ? "truncate" : ""
        }`}
        title={cortar ? value : undefined}
      >
        {value || "—"}
      </p>
    </div>
  );
}

/* Chip compacto para la fila del listado (Teléfono / Obra social / Sucursal) */
function DatoMini({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className={MINI_DATO_CARD}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-primary/60">
        {label}
      </p>

      <p className="mt-0.5 truncate text-sm font-medium text-foreground/85">
        {value || "—"}
      </p>
    </div>
  );
}

/* Card de estadística estilo "Turnos de hoy / Ingresos del día": fondo blanco,
   borde sutil, ícono en círculo arriba a la derecha, valor grande abajo. */
type ToneClases = { label: string; icono: string; valor: string };

const TONE_CLASSES: Record<"primary" | "emerald" | "violet", ToneClases> = {
  primary: {
    label: "text-primary/70",
    icono: "bg-primary/10 text-primary",
    valor: "text-foreground",
  },
  emerald: {
    label: "text-emerald-600/80",
    icono: "bg-emerald-50 text-emerald-600",
    valor: "text-emerald-700",
  },
  violet: {
    label: "text-violet-600/80",
    icono: "bg-violet-50 text-violet-600",
    valor: "text-violet-700",
  },
};

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  subtitle,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone: "primary" | "emerald" | "violet";
  subtitle?: string;
}) {
  const t = TONE_CLASSES[tone];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <p
          className={`text-[10px] font-bold uppercase tracking-[0.12em] ${t.label}`}
        >
          {label}
        </p>

        <div
          className={`grid size-8 shrink-0 place-items-center rounded-xl ${t.icono}`}
        >
          <Icon className="size-4" />
        </div>
      </div>

      <p className={`mt-1.5 text-2xl font-bold ${t.valor}`}>
        {value}
      </p>

      {subtitle && (
        <p className="mt-0.5 text-xs text-muted-foreground">
          {subtitle}
        </p>
      )}
    </div>
  );
}

/* ───────────── Carpeta del paciente ───────────── */

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
  const [seccion, setSeccion] =
    useState<Seccion>("resumen");

  const tratamientosEnCurso =
    datos.tratamientos.filter(
      (t) => t.estado === "En tratamiento",
    );

  const tratamientoActual =
    tratamientosEnCurso[0] ?? null;

  const hoy = hoyISO();

  const proximoTurno =
    datos.turnos
      .filter(
        (t) =>
          (t.estado === "Pendiente" ||
            t.estado === "Confirmado") &&
          t.fecha >= hoy,
      )
      .sort((a, b) =>
        `${a.fecha} ${a.hora}`.localeCompare(
          `${b.fecha} ${b.hora}`,
        ),
      )[0] ?? null;

  const nacimiento = paciente.fechaNacimiento
    ? `${fechaCorta(
        paciente.fechaNacimiento,
      )} · ${edadDesde(
        paciente.fechaNacimiento,
      )} años`
    : "";

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-primary/20 bg-card">
      <div className="grid grid-cols-1 md:grid-cols-[210px_minmax(0,1fr)]">
        {/* Navegación */}

        <nav className="border-b border-border bg-muted/20 p-3 md:border-b-0 md:border-r">
          <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
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
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-primary/8 hover:text-foreground"
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
                  <h4 className="text-lg font-semibold">
                    Resumen del paciente
                  </h4>

                  <p className="text-sm text-muted-foreground">
                    Información general y estado actual de{" "}
                    {normalizarNombre(paciente.nombre)}.
                  </p>
                </div>

                <button
                  onClick={onEditar}
                  className={BTN_SECUNDARIO}
                >
                  <Pencil className="size-4" />
                  Editar paciente
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <Dato
                  label="Documento"
                  value={formatearDocumento(
                    paciente.documento,
                  )}
                  icon={FileText}
                />

                <Dato
                  label="Correo"
                  value={paciente.email}
                  icon={Mail}
                  cortar
                />

                <Dato
                  label="Obra social"
                  value={etiquetaObraSocial(
                    paciente.obraSocial,
                  )}
                  icon={ShieldCheck}
                />

                <Dato
                  label="Afiliado"
                  value={paciente.afiliado}
                  icon={Hash}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Dato
                  label="Fecha de nacimiento"
                  value={nacimiento}
                  icon={CalendarDays}
                />

                <Dato
                  label="Sexo / género"
                  value={paciente.genero}
                  icon={Users}
                />

                <Dato
                  label="Sucursal"
                  value={paciente.sucursal}
                  icon={HeartPulse}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className={DATO_CARD}>
                  <IconoCirculo icon={Stethoscope} />

                  <h5 className="relative text-sm font-semibold">
                    Tratamiento actual
                  </h5>

                  {tratamientoActual ? (
                    <div className="relative mt-2 space-y-1 text-sm">
                      <p className="font-semibold">
                        {tratamientoActual.nombre}
                      </p>

                      <p className="text-muted-foreground">
                        {[
                          tratamientoActual.pieza &&
                            `Pieza ${tratamientoActual.pieza}`,
                          tratamientoActual.estado,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>

                      {tratamientoActual.profesional && (
                        <p className="text-muted-foreground">
                          Profesional:{" "}
                          {
                            tratamientoActual.profesional
                          }
                        </p>
                      )}

                      {tratamientosEnCurso.length >
                        1 && (
                        <p className="text-xs text-muted-foreground">
                          y{" "}
                          {tratamientosEnCurso.length -
                            1}{" "}
                          más en curso
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="relative mt-2 text-sm text-muted-foreground">
                      Sin tratamiento en curso.
                    </p>
                  )}
                </div>

                <div className={DATO_CARD}>
                  <IconoCirculo icon={CalendarDays} />

                  <h5 className="relative text-sm font-semibold">
                    Próximo turno
                  </h5>

                  {proximoTurno ? (
                    <div className="relative mt-2 space-y-1 text-sm">
                      <p className="font-semibold">
                        {fechaCorta(
                          proximoTurno.fecha,
                        )}{" "}
                        · {proximoTurno.hora} hs
                      </p>

                      <p className="text-muted-foreground">
                        {proximoTurno.motivo}
                      </p>

                      {proximoTurno.profesional && (
                        <p className="text-muted-foreground">
                          {
                            proximoTurno.profesional
                          }
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="relative mt-2 text-sm text-muted-foreground">
                      Sin turnos programados.
                    </p>
                  )}
                </div>
              </div>

              <div className={DATO_CARD}>
                <IconoCirculo icon={Phone} />

                <h5 className="relative text-sm font-semibold">
                  Información de contacto
                </h5>

                <dl className="relative mt-2 grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="inline font-semibold">
                      Teléfono:{" "}
                    </dt>

                    <dd className="inline text-muted-foreground">
                      {paciente.telefono || "—"}
                    </dd>
                  </div>

                  <div className="min-w-0">
                    <dt className="inline font-semibold">
                      Email:{" "}
                    </dt>

                    <dd className="inline break-all text-muted-foreground">
                      {paciente.email || "—"}
                    </dd>
                  </div>

                  <div>
                    <dt className="inline font-semibold">
                      Dirección:{" "}
                    </dt>

                    <dd className="inline text-muted-foreground">
                      {paciente.direccion || "—"}
                    </dd>
                  </div>

                  <div>
                    <dt className="inline font-semibold">
                      Nota de interés:{" "}
                    </dt>

                    <dd className="inline text-muted-foreground">
                      {paciente.nota || "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          ) : seccion === "odontograma" ? (
            <OdontogramaSec
              pacienteId={paciente.id}
              onToast={onToast}
            />
          ) : (
            <SeccionPaciente
              seccion={seccion}
              datos={datos}
              cambiar={cambiar}
              onToast={onToast}
              contexto={{
                paciente: nombreCompleto(paciente),
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

  const registros =
    useRegistrosPacientes();

  const {
    pacientes,
    setPacientes,
  } = usePacientes();

  const [abiertoId, setAbiertoId] =
    useState<number | null>(null);

  const [modal, setModal] =
    useState<ModalActivo>(null);

  const [busqueda, setBusqueda] =
    useState("");

  const [filtroEstado, setFiltroEstado] =
    useState("");

  const [filtroSucursal, setFiltroSucursal] =
    useState("");

  const cerrarModal = () =>
    setModal(null);

  /* Filtros */

  const q = busqueda
    .trim()
    .toLowerCase();

  const qDigitos = q.replace(
    /\D/g,
    "",
  );

  const coincide = (p: Paciente) =>
    !q ||
    `${p.nombre} ${p.apellido}`
      .toLowerCase()
      .includes(q) ||
    (qDigitos.length > 0 &&
      (p.documento.includes(
        qDigitos,
      ) ||
        p.telefono
          .replace(/\D/g, "")
          .includes(qDigitos)));

  const filtrados = pacientes.filter(
    (p) =>
      coincide(p) &&
      (!filtroEstado ||
        p.estado === filtroEstado) &&
      (!filtroSucursal ||
        p.sucursal === filtroSucursal),
  );

  const hayFiltros = Boolean(
    q ||
      filtroEstado ||
      filtroSucursal,
  );

  const cantidadActivos = pacientes.filter(
    (p) => p.estado === "Activo",
  ).length;

  const cantidadInactivos = pacientes.filter(
    (p) => p.estado === "Inactivo",
  ).length;

  /* Acciones */

  const guardarPaciente = (
    d: DatosPaciente,
  ) => {
    const editando =
      modal?.tipo === "form"
        ? modal.paciente
        : undefined;

    const datosNormalizados = {
      ...d,
      nombre: normalizarNombre(
        d.nombre,
      ),
      apellido: normalizarNombre(
        d.apellido,
      ),
    };

    if (editando) {
      setPacientes((prev) =>
        prev.map((p) =>
          p.id === editando.id
            ? {
                ...p,
                ...datosNormalizados,
              }
            : p,
        ),
      );

      show("Paciente actualizado");
    } else {
      setPacientes((prev) => [
        ...prev,
        {
          ...datosNormalizados,
          id: Date.now(),
        },
      ]);

      show("Paciente creado");
    }

    cerrarModal();
  };

  const eliminarPaciente = (
    p: Paciente,
  ) => {
    setPacientes((prev) =>
      prev.filter(
        (x) => x.id !== p.id,
      ),
    );

    registros.quitar(p.id);

    if (abiertoId === p.id) {
      setAbiertoId(null);
    }

    cerrarModal();

    show(
      `${nombreCompleto(p)} eliminado`,
    );
  };

  const exportar = () => {
    if (filtrados.length === 0) {
      show(
        "No hay pacientes para exportar",
      );

      return;
    }

    const filas = [
      [
        "Nombre",
        "Apellido",
        "Documento",
        "Teléfono",
        "Correo",
        "Obra social",
        "Afiliado",
        "Sucursal",
        "Estado",
      ],

      ...filtrados.map((p) => [
        normalizarNombre(p.nombre),
        normalizarNombre(p.apellido),
        formatearDocumento(
          p.documento,
        ),
        p.telefono,
        p.email,
        etiquetaObraSocial(
          p.obraSocial,
        ),
        p.afiliado,
        p.sucursal,
        p.estado,
      ]),
    ];

    const csv =
      "\uFEFF" +
      filas
        .map((f) =>
          f.map(csvCelda).join(";"),
        )
        .join("\r\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url =
      URL.createObjectURL(blob);

    const a =
      document.createElement("a");

    a.href = url;
    a.download = "pacientes.csv";
    a.click();

    URL.revokeObjectURL(url);

    show(
      "Descargando pacientes.csv",
    );
  };

  const modalForm =
    modal?.tipo === "form"
      ? modal
      : null;

  const modalEliminar =
    modal?.tipo === "eliminar"
      ? modal
      : null;

  const idEditando =
    modalForm?.paciente?.id;

  const documentosExistentes =
    pacientes
      .filter(
        (p) => p.id !== idEditando,
      )
      .map((p) => p.documento);

  return (
    <AppShell>
      <div className="relative min-h-full overflow-hidden bg-muted/15">
        {/* Fondo original conservado, solamente suavizado */}
        <FondoPacientes />

        <div
          className="relative mx-auto w-full max-w-[1400px] px-4 py-5 md:px-6 lg:px-8"
          style={{
            fontFamily:
              '"Inter", ui-sans-serif, system-ui, sans-serif',
          }}
        >
          {/* ───────────── Encabezado ───────────── */}

          <section className="relative overflow-hidden rounded-[28px] border border-primary/20 bg-card/90 shadow-sm">
            <div className="absolute left-0 top-0 h-1.5 w-full bg-primary/70" />

            <div className="relative p-5 md:p-6 lg:p-7">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                      <Users className="size-3.5" />
                      Gestión clínica
                    </span>

                    <span className="rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-700 ring-1 ring-inset ring-amber-600/10">
                      {pacientes.length}{" "}
                      {pacientes.length === 1
                        ? "paciente"
                        : "pacientes"}
                    </span>
                  </div>

                  <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
                    Pacientes
                  </h1>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Toda la información de tus pacientes
                    en un solo lugar: carpeta clínica,
                    tratamientos, estudios, turnos,
                    documentos y cuenta corriente.
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    onClick={exportar}
                    className={BTN_SECUNDARIO}
                  >
                    <Download className="size-4" />
                    Exportar
                  </button>

                  <button
                    onClick={() =>
                      setModal({
                        tipo: "form",
                      })
                    }
                    className={BTN_PRIMARIO}
                  >
                    <UserPlus className="size-4" />
                    Nuevo paciente
                  </button>
                </div>
              </div>

              {/* Mini resumen */}

              <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <StatCard
                  label="Total"
                  value={pacientes.length}
                  icon={Users}
                  tone="primary"
                />

                <StatCard
                  label="Activos"
                  value={cantidadActivos}
                  icon={HeartPulse}
                  tone="emerald"
                />

                <StatCard
                  label="Inactivos"
                  value={cantidadInactivos}
                  icon={History}
                  tone="violet"
                />
              </div>

              {/* Filtros */}

              <div className="mt-4 rounded-2xl border border-border/70 bg-muted/25 p-2.5">
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1.5fr)_1fr_1fr]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-primary/60" />

                    <input
                      value={busqueda}
                      onChange={(e) =>
                        setBusqueda(
                          e.target.value,
                        )
                      }
                      placeholder="Buscar por nombre, documento o teléfono"
                      className={`${INPUT} border-transparent bg-background pl-10 shadow-none focus:border-primary/40`}
                    />
                  </div>

                  <SelectField
                    value={filtroEstado}
                    onChange={
                      setFiltroEstado
                    }
                    options={ESTADOS}
                    placeholder="Todos los estados"
                  />

                  <SelectField
                    value={filtroSucursal}
                    onChange={
                      setFiltroSucursal
                    }
                    options={SUCURSALES}
                    placeholder="Todas las sucursales"
                  />
                </div>

                {hayFiltros && (
                  <button
                    onClick={() => {
                      setBusqueda("");
                      setFiltroEstado("");
                      setFiltroSucursal("");
                    }}
                    className="px-1 pt-2 text-xs font-semibold text-primary hover:underline"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* ───────────── Separador ───────────── */}

          <div className="mt-6 flex items-center gap-3 px-1">
            <div className="h-px flex-1 bg-border/70" />

            <span className="rounded-full border border-border bg-card/85 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground shadow-sm">
              {hayFiltros
                ? `${filtrados.length} resultados`
                : "Listado de pacientes"}
            </span>

            <div className="h-px flex-1 bg-border/70" />
          </div>

          {/* ───────────── Listado ───────────── */}

          <div className="mt-3">
            {filtrados.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-primary/20 bg-card/85 px-6 py-14 text-center shadow-sm">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Users className="size-6" />
                </div>

                <p className="mt-4 text-sm font-semibold">
                  {hayFiltros
                    ? "No encontramos pacientes"
                    : "Todavía no hay pacientes"}
                </p>

                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  {hayFiltros
                    ? "Probá modificando los filtros de búsqueda."
                    : "Creá el primer paciente para comenzar a trabajar con su carpeta clínica."}
                </p>

                {!hayFiltros && (
                  <button
                    onClick={() =>
                      setModal({
                        tipo: "form",
                      })
                    }
                    className={`${BTN_PRIMARIO} mt-5`}
                  >
                    <UserPlus className="size-4" />
                    Crear primer paciente
                  </button>
                )}
              </div>
            ) : (
              <ul className="space-y-3">
                {filtrados.map((p) => {
                  const abierto =
                    abiertoId === p.id;

                  const nombre = nombreCompleto(p);

                  return (
                    <li
                      key={p.id}
                      className={`overflow-hidden rounded-2xl border bg-card/95 shadow-sm transition-all duration-200 ${
                        abierto
                          ? "border-primary/45 shadow-md shadow-primary/5"
                          : "border-primary/15 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                      }`}
                    >
                      <div className="p-3.5 md:p-4">
                        <div className="flex flex-wrap items-center gap-4">
                          <Avatar
                            paciente={p}
                            className="size-12 text-sm"
                          />

                          <div className="min-w-[180px] flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold leading-tight">
                                {nombre}
                              </p>

                              <BadgeEstado
                                estado={p.estado}
                              />
                            </div>

                            <p className="mt-1 text-xs text-muted-foreground">
                              DNI{" "}
                              {formatearDocumento(
                                p.documento,
                              )}
                            </p>

                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              <BadgeOutline>
                                {etiquetaObraSocial(
                                  p.obraSocial,
                                )}
                              </BadgeOutline>
                            </div>
                          </div>

                          <div className="grid min-w-[260px] flex-[2] grid-cols-1 gap-2 sm:grid-cols-3">
                            <DatoMini
                              label="Teléfono"
                              value={p.telefono}
                            />

                            <DatoMini
                              label="Obra social"
                              value={etiquetaObraSocial(
                                p.obraSocial,
                              )}
                            />

                            <DatoMini
                              label="Sucursal"
                              value={p.sucursal}
                            />
                          </div>

                          <div className="ml-auto flex items-center gap-2">
                            <button
                              onClick={() =>
                                setAbiertoId(
                                  abierto
                                    ? null
                                    : p.id,
                                )
                              }
                              className={`${BTN_PRIMARIO} whitespace-nowrap`}
                            >
                              <FolderOpen className="size-4" />

                              {abierto
                                ? "Cerrar carpeta"
                                : "Abrir carpeta"}

                              {abierto ? (
                                <ChevronUp className="size-4" />
                              ) : (
                                <ChevronDown className="size-4" />
                              )}
                            </button>

                            <button
                              onClick={() =>
                                setModal({
                                  tipo: "form",
                                  paciente: p,
                                })
                              }
                              aria-label={`Editar a ${nombre}`}
                              className={BTN_ICONO}
                            >
                              <Pencil className="size-4" />
                            </button>

                            <button
                              onClick={() =>
                                setModal({
                                  tipo: "eliminar",
                                  paciente: p,
                                })
                              }
                              aria-label={`Eliminar a ${nombre}`}
                              className={
                                BTN_ICONO_PELIGRO
                              }
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {abierto && (
                        <div className="border-t border-primary/10 bg-primary/[0.018] px-3.5 pb-3.5 md:px-4 md:pb-4">
                          <CarpetaPaciente
                            key={p.id}
                            paciente={p}
                            datos={registros.de(
                              p.id,
                            )}
                            cambiar={(
                              clave,
                              fn,
                            ) =>
                              registros.cambiar(
                                p.id,
                                clave,
                                fn,
                              )
                            }
                            onToast={show}
                            onEditar={() =>
                              setModal({
                                tipo: "form",
                                paciente: p,
                              })
                            }
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Modal nuevo / editar */}

      {modalForm && (
        <Modal
          title={
            modalForm.paciente
              ? "Editar paciente"
              : "Nuevo paciente"
          }
          onClose={cerrarModal}
        >
          <PacienteForm
            inicial={modalForm.paciente}
            documentosExistentes={
              documentosExistentes
            }
            onSubmit={guardarPaciente}
            onCancel={cerrarModal}
          />
        </Modal>
      )}

      {/* Modal eliminar */}

      {modalEliminar && (
        <Modal
          title="Eliminar paciente"
          size="sm"
          onClose={cerrarModal}
        >
          <p className="text-sm leading-6 text-muted-foreground">
            ¿Seguro que querés eliminar a{" "}
            <span className="font-semibold text-foreground">
              {nombreCompleto(
                modalEliminar.paciente,
              )}
            </span>
            ? Esta acción no se puede deshacer.
          </p>

          <div className="mt-5 flex justify-end gap-3">
            <button
              onClick={cerrarModal}
              className={BTN_SECUNDARIO}
            >
              Cancelar
            </button>

            <button
              onClick={() =>
                eliminarPaciente(
                  modalEliminar.paciente,
                )
              }
              className="rounded-lg bg-destructive px-3.5 py-1.5 text-[13px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            >
              Eliminar
            </button>
          </div>
        </Modal>
      )}

      {/* Toast */}

      {message && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-xl">
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