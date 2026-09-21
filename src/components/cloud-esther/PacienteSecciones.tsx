import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Plus, X, Trash2, ChevronDown, History, Stethoscope, FolderOpen, FileText, ReceiptText,
  CalendarDays, Wallet, HeartPulse, Check, Paperclip, ExternalLink, Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ───────────── Catálogos ─────────────
   TODO backend: estos catálogos los completa la API (por clínica).
   Hoy están vacíos a propósito: no hay datos de relleno. */

const PROFESIONALES: string[] = [];
const SUCURSALES: string[] = [];
const PRACTICAS: string[] = [];

/* ───────────── Opciones fijas del producto ───────────── */

const TIPOS_DOCUMENTO = [
  "Consentimiento informado",
  "Documento de identidad",
  "Carnet de obra social",
  "Receta",
  "Certificado",
  "Informe",
  "Otro",
];

const TIPOS_ESTUDIO = [
  "Radiografía periapical",
  "Radiografía panorámica",
  "Tomografía (CBCT)",
  "Fotografía intraoral",
  "Análisis de laboratorio",
  "Modelo de estudio",
  "Otro",
];

const ESTADOS_TRATAMIENTO = ["Planificado", "En tratamiento", "Finalizado", "Cancelado"] as const;
const ESTADOS_PRESUPUESTO = ["Borrador", "Enviado", "Aprobado", "Rechazado"] as const;
const ESTADOS_TURNO = ["Pendiente", "Confirmado", "Atendido", "Cancelado"] as const;
const TIPOS_MOVIMIENTO = ["Cargo", "Pago", "Nota de crédito"] as const;
const MEDIOS_PAGO = ["Efectivo", "Transferencia", "Tarjeta de débito", "Tarjeta de crédito", "Obra social"];
const ROLES_PROFESIONAL = ["Principal", "Interconsulta", "Derivación"] as const;

/* ───────────── Tipos ───────────── */

type EstadoTratamiento = (typeof ESTADOS_TRATAMIENTO)[number];
type EstadoPresupuesto = (typeof ESTADOS_PRESUPUESTO)[number];
type EstadoTurnoPaciente = (typeof ESTADOS_TURNO)[number];
type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];
type RolProfesional = (typeof ROLES_PROFESIONAL)[number];

type Evolucion = { id: number; fecha: string; profesional: string; motivo: string; pieza: string; detalle: string };

type TratamientoPaciente = {
  id: number;
  nombre: string;
  pieza: string;
  estado: EstadoTratamiento;
  profesional: string;
  inicio: string;
  notas: string;
};

type DocumentoPaciente = {
  id: number;
  tipo: string;
  categoria: string;
  estado: string;
  titulo: string;
  fecha: string;
  archivoNombre: string;
  archivoTamano: number;
  url: string;
  notas: string;
};

type EstudioPaciente = {
  id: number;
  tipo: string;
  fecha: string;
  zona: string;
  solicitante: string;
  diagnostico: string;
  archivoNombre: string;
  url: string;
};

type LineaPresupuesto = { descripcion: string; pieza: string; cantidad: number; precio: number };

type PresupuestoPaciente = {
  id: number;
  numero: string;
  fecha: string;
  estado: EstadoPresupuesto;
  lineas: LineaPresupuesto[];
  notas: string;
};

type TurnoPaciente = {
  id: number;
  fecha: string;
  hora: string;
  motivo: string;
  profesional: string;
  sucursal: string;
  estado: EstadoTurnoPaciente;
};

type Movimiento = {
  id: number;
  fecha: string;
  tipo: TipoMovimiento;
  concepto: string;
  medio: string;
  monto: number;
  notas: string;
};

type ProfesionalPaciente = { id: number; nombre: string; especialidad: string; rol: RolProfesional; desde: string };

export type Registros = {
  historia: Evolucion[];
  tratamientos: TratamientoPaciente[];
  documentos: DocumentoPaciente[];
  estudios: EstudioPaciente[];
  presupuestos: PresupuestoPaciente[];
  turnos: TurnoPaciente[];
  cuenta: Movimiento[];
  profesionales: ProfesionalPaciente[];
};

export type Cambiar = <K extends keyof Registros>(clave: K, fn: (prev: Registros[K]) => Registros[K]) => void;

export type SeccionRegistros =
  | "historia" | "tratamientos" | "documentos" | "estudios" | "presupuestos" | "turnos" | "cuenta" | "profesionales";

const VACIO: Registros = {
  historia: [],
  tratamientos: [],
  documentos: [],
  estudios: [],
  presupuestos: [],
  turnos: [],
  cuenta: [],
  profesionales: [],
};

/* ───────────── Estado por paciente ─────────────
   TODO backend: reemplazar este hook por las consultas a la API
   (GET /pacientes/:id/historia, /tratamientos, /documentos, etc.). */

export function useRegistrosPacientes() {
  const [porPaciente, setPorPaciente] = useState<Record<number, Registros>>({
    1: {
      historia: [
        {
          id: 1,
          fecha: "2026-08-20",
          profesional: "Dr. Carlos Rodríguez",
          motivo: "Restauración estética",
          pieza: "21",
          detalle: "Evaluación y preparación para restauración estética de pieza 21. Paciente en tratamiento.",
        },
      ],
      tratamientos: [
        {
          id: 1,
          nombre: "Restauración estética",
          pieza: "21",
          estado: "En tratamiento",
          profesional: "Dr. Carlos Rodríguez",
          inicio: "2026-08-20",
          notas: "Continuar tratamiento y realizar control.",
        },
      ],
      documentos: [
        {
          id: 1,
          tipo: "Documento de identidad",
          categoria: "Identificación",
          estado: "Verificado",
          titulo: "DNI / Documento de identidad",
          fecha: "2026-08-02",
          archivoNombre: "",
          archivoTamano: 0,
          url: "",
          notas: "",
        },
        {
          id: 2,
          tipo: "Consentimiento informado",
          categoria: "Consentimiento",
          estado: "Firmado",
          titulo: "Consentimiento informado",
          fecha: "2026-08-02",
          archivoNombre: "",
          archivoTamano: 0,
          url: "",
          notas: "",
        },
        {
          id: 3,
          tipo: "Informe",
          categoria: "Estudio diagnóstico",
          estado: "Disponible",
          titulo: "Radiografía panorámica",
          fecha: "2026-08-15",
          archivoNombre: "",
          archivoTamano: 0,
          url: "",
          notas: "",
        },
        {
          id: 4,
          tipo: "Otro",
          categoria: "Presupuesto",
          estado: "Vigente",
          titulo: "Presupuesto tratamiento integral",
          fecha: "2026-08-12",
          archivoNombre: "",
          archivoTamano: 0,
          url: "",
          notas: "",
        },
      ],
      estudios: [
        {
          id: 1,
          tipo: "Radiografía periapical",
          fecha: "2026-08-15",
          zona: "",
          solicitante: "Dr. Martín Gómez",
          diagnostico: "Evaluación de pieza 36.",
          archivoNombre: "",
          url: "",
        },
        {
          id: 2,
          tipo: "Radiografía panorámica",
          fecha: "2026-08-15",
          zona: "",
          solicitante: "Dr. Martín Gómez",
          diagnostico: "Sin hallazgos críticos. Se recomienda seguimiento de piezas posteriores.",
          archivoNombre: "",
          url: "",
        },
      ],
      presupuestos: [
        {
          id: 1,
          numero: "PR-0001",
          fecha: "2026-08-20",
          estado: "Aprobado",
          lineas: [
            { descripcion: "Restauración estética", pieza: "21", cantidad: 1, precio: 0 },
            { descripcion: "Control", pieza: "21", cantidad: 1, precio: 0 },
          ],
          notas: "Presupuesto asociado al tratamiento actual.",
        },
      ],
      turnos: [
        {
          id: 1,
          fecha: "2026-08-28",
          hora: "15:00",
          motivo: "Restauración pieza 21",
          profesional: "Dr. Carlos Rodríguez",
          sucursal: "",
          estado: "Confirmado",
        },
      ],
      cuenta: [
        {
          id: 1,
          fecha: "2026-08-20",
          tipo: "Cargo",
          concepto: "Restauración estética",
          medio: "",
          monto: 0,
          notas: "Monto a completar desde el backend.",
        },
      ],
      profesionales: [
        {
          id: 1,
          nombre: "Dr. Carlos Rodríguez",
          especialidad: "Odontología general",
          rol: "Principal",
          desde: "2026-08-20",
        },
      ],
    },
  });

  const de = (id: number): Registros => porPaciente[id] ?? VACIO;

  function cambiar<K extends keyof Registros>(id: number, clave: K, fn: (prev: Registros[K]) => Registros[K]) {
    setPorPaciente((prev) => {
      const actual = prev[id] ?? VACIO;
      const siguiente = { ...actual, [clave]: fn(actual[clave]) } as Registros;
      return { ...prev, [id]: siguiente };
    });
  }

  const quitar = (id: number) =>
    setPorPaciente((prev) => {
      const { [id]: _borrado, ...resto } = prev;
      return resto;
    });

  return { de, cambiar, quitar };
}

/* ───────────── Utilidades ───────────── */

function hoyISO() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function formatearFecha(iso: string) {
  return iso ? iso.split("-").reverse().join("/") : "";
}

function formatearMonto(n: number) {
  return `$ ${n.toLocaleString("es-AR")}`;
}

function formatearTamano(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

/* ───────────── Estilos ───────────── */

const ITEM =
  "relative overflow-hidden rounded-xl border border-primary/20 bg-card bg-gradient-to-br from-card via-card to-[oklch(0.94_0.035_292)] p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md hover:shadow-primary/10";

const INPUT =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20";

const TEXTAREA =
  "min-h-16 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20";

const BTN_PRIMARIO =
  "flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-primary to-[oklch(0.5_0.2_292)] px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2";

const BTN_SECUNDARIO =
  "flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:shadow-md active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2";

const CIRCULO_ICONO =
  "grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/15";

type Tono = "primary" | "verde" | "ambar" | "rojo" | "gris";

const TONOS: Record<Tono, string> = {
  primary: "bg-primary/10 text-primary",
  verde: "bg-emerald-100 text-emerald-700",
  ambar: "bg-amber-100 text-amber-700",
  rojo: "bg-destructive/10 text-destructive",
  gris: "bg-muted text-muted-foreground",
};

const TONO_TRATAMIENTO: Record<EstadoTratamiento, Tono> = {
  Planificado: "gris",
  "En tratamiento": "primary",
  Finalizado: "verde",
  Cancelado: "rojo",
};
const TONO_PRESUPUESTO: Record<EstadoPresupuesto, Tono> = {
  Borrador: "gris",
  Enviado: "ambar",
  Aprobado: "verde",
  Rechazado: "rojo",
};
const TONO_TURNO: Record<EstadoTurnoPaciente, Tono> = {
  Pendiente: "ambar",
  Confirmado: "primary",
  Atendido: "verde",
  Cancelado: "rojo",
};
const TONO_MOVIMIENTO: Record<TipoMovimiento, Tono> = {
  Cargo: "ambar",
  Pago: "verde",
  "Nota de crédito": "primary",
};

/* ───────────── Piezas comunes ───────────── */

function Badge({ tono = "gris", children }: { tono?: Tono; children: ReactNode }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONOS[tono]}`}>{children}</span>;
}

function Encabezado({
  titulo,
  descripcion,
  etiquetaBoton,
  onAgregar,
  icon: Icon,
}: {
  titulo: string;
  descripcion: string;
  etiquetaBoton: string;
  onAgregar: () => void;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {Icon && (
          <span className={`${CIRCULO_ICONO} size-10`}>
            <Icon className="size-5" />
          </span>
        )}
        <div>
          <h4 className="text-lg font-semibold">{titulo}</h4>
          <p className="text-sm text-muted-foreground">{descripcion}</p>
        </div>
      </div>
      <button
        onClick={onAgregar}
        className={BTN_PRIMARIO}
      >
        <Plus className="size-4" />
        {etiquetaBoton}
      </button>
    </div>
  );
}

function EstadoVacio({
  icon: Icon,
  titulo,
  texto,
  chips,
}: {
  icon: LucideIcon;
  titulo: string;
  texto: string;
  chips?: readonly string[];
}) {
  return (
    <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-border p-6 text-center">
      <div>
        <Icon className="mx-auto size-8 text-primary/60" />
        <p className="mt-2 text-sm font-semibold">{titulo}</p>
        <p className="text-sm text-muted-foreground">{texto}</p>
        {chips && (
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {chips.map((c) => (
              <span
                key={c}
                className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium"
              >
                {c}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BotonBorrar({ onClick, etiqueta }: { onClick: () => void; etiqueta: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={etiqueta}
      className="grid size-8 shrink-0 place-items-center rounded-full border border-transparent text-muted-foreground transition-all duration-200 hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
    >
      <Trash2 className="size-4" />
    </button>
  );
}

function BotonMini({ icon: Icon, label, onClick }: { icon?: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/10 hover:text-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      {Icon && <Icon className="size-3" />}
      {label}
    </button>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
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
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-primary/15 bg-card bg-gradient-to-b from-primary/[0.06] to-transparent p-5 shadow-2xl"
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

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
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
  options: readonly string[];
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${INPUT} appearance-none pr-9 ${value === "" ? "text-muted-foreground" : ""}`}
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

function Acciones({ etiqueta, onCancel }: { etiqueta: string; onCancel: () => void }) {
  return (
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
        {etiqueta}
      </button>
    </div>
  );
}

function Datalists() {
  return (
    <>
      <datalist id="dl-profesionales">
        {PROFESIONALES.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <datalist id="dl-practicas">
        {PRACTICAS.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
    </>
  );
}

type PropsSeccion = {
  datos: Registros;
  cambiar: Cambiar;
  onToast: (msg: string) => void;
};

/* ───────────── Historia clínica ───────────── */

function EvolucionForm({ onSubmit, onCancel }: { onSubmit: (e: Omit<Evolucion, "id">) => void; onCancel: () => void }) {
  const [fecha, setFecha] = useState(hoyISO());
  const [profesional, setProfesional] = useState("");
  const [motivo, setMotivo] = useState("");
  const [pieza, setPieza] = useState("");
  const [detalle, setDetalle] = useState("");

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ fecha, profesional: profesional.trim(), motivo: motivo.trim(), pieza: pieza.trim(), detalle: detalle.trim() });
  };

  return (
    <form onSubmit={enviar} className="space-y-2.5">
      <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2">
        <Field label="Fecha *">
          <input required type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={INPUT} />
        </Field>
        <Field label="Profesional">
          <input list="dl-profesionales" value={profesional} onChange={(e) => setProfesional(e.target.value)} className={INPUT} placeholder="Nombre del profesional" />
        </Field>
        <Field label="Motivo de consulta *">
          <input autoFocus required value={motivo} onChange={(e) => setMotivo(e.target.value)} className={INPUT} placeholder="Ej: Control, dolor, urgencia" />
        </Field>
        <Field label="Pieza dental">
          <input value={pieza} onChange={(e) => setPieza(e.target.value)} className={INPUT} placeholder="Ej: 26" />
        </Field>
      </div>
      <Field label="Evolución / detalle *">
        <textarea required rows={4} value={detalle} onChange={(e) => setDetalle(e.target.value)} className={TEXTAREA} placeholder="Qué se hizo, indicaciones, observaciones…" />
      </Field>
      <Acciones etiqueta="Guardar evolución" onCancel={onCancel} />
    </form>
  );
}

function HistoriaSec({ datos, cambiar, onToast }: PropsSeccion) {
  const [abierto, setAbierto] = useState(false);
  const lista = [...datos.historia].sort((a, b) => `${b.fecha}${b.id}`.localeCompare(`${a.fecha}${a.id}`));

  return (
    <div className="space-y-3">
      <Encabezado
        titulo="Historia clínica"
        descripcion="Evolución de cada consulta: motivo, pieza y detalle de lo realizado."
        etiquetaBoton="Agregar evolución"
        onAgregar={() => setAbierto(true)}
      />
      {lista.length === 0 ? (
        <EstadoVacio icon={History} titulo="Sin evoluciones" texto="Agregá la primera evolución del paciente." />
      ) : (
        <ul className="space-y-2.5">
          {lista.map((e) => (
            <li key={e.id} className={`${ITEM} flex items-start gap-3`}>
              <div className="w-20 shrink-0">
                <p className="text-sm font-bold">{formatearFecha(e.fecha)}</p>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{e.motivo}</p>
                  {e.pieza && <Badge tono="primary">Pieza {e.pieza}</Badge>}
                </div>
                <p className="mt-0.5 whitespace-pre-line text-sm text-muted-foreground">{e.detalle}</p>
                {e.profesional && <p className="mt-1 text-[11px] text-muted-foreground">{e.profesional}</p>}
              </div>
              <BotonBorrar
                etiqueta="Eliminar evolución"
                onClick={() => {
                  // TODO backend: DELETE /pacientes/:id/historia/:evolucionId
                  cambiar("historia", (prev) => prev.filter((x) => x.id !== e.id));
                  onToast("Evolución eliminada");
                }}
              />
            </li>
          ))}
        </ul>
      )}
      {abierto && (
        <Modal title="Agregar evolución" onClose={() => setAbierto(false)}>
          <EvolucionForm
            onCancel={() => setAbierto(false)}
            onSubmit={(nueva) => {
              // TODO backend: POST /pacientes/:id/historia
              cambiar("historia", (prev) => [...prev, { ...nueva, id: Date.now() }]);
              setAbierto(false);
              onToast("Evolución guardada");
            }}
          />
        </Modal>
      )}
    </div>
  );
}

/* ───────────── Tratamientos ───────────── */

function TratamientoForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (t: Omit<TratamientoPaciente, "id">) => void;
  onCancel: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [pieza, setPieza] = useState("");
  const [estado, setEstado] = useState<EstadoTratamiento>("Planificado");
  const [profesional, setProfesional] = useState("");
  const [inicio, setInicio] = useState("");
  const [notas, setNotas] = useState("");

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ nombre: nombre.trim(), pieza: pieza.trim(), estado, profesional: profesional.trim(), inicio, notas: notas.trim() });
  };

  return (
    <form onSubmit={enviar} className="space-y-2.5">
      <Field label="Tratamiento *">
        <input autoFocus required list="dl-practicas" value={nombre} onChange={(e) => setNombre(e.target.value)} className={INPUT} placeholder="Ej: Endodoncia, restauración estética" />
      </Field>
      <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2">
        <Field label="Pieza dental">
          <input value={pieza} onChange={(e) => setPieza(e.target.value)} className={INPUT} placeholder="Ej: 21" />
        </Field>
        <Field label="Estado">
          <SelectField value={estado} onChange={(v) => setEstado(v as EstadoTratamiento)} options={ESTADOS_TRATAMIENTO} />
        </Field>
        <Field label="Profesional">
          <input list="dl-profesionales" value={profesional} onChange={(e) => setProfesional(e.target.value)} className={INPUT} placeholder="Nombre del profesional" />
        </Field>
        <Field label="Fecha de inicio">
          <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className={INPUT} />
        </Field>
      </div>
      <Field label="Notas">
        <textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} className={TEXTAREA} placeholder="Observaciones del tratamiento…" />
      </Field>
      <Acciones etiqueta="Guardar tratamiento" onCancel={onCancel} />
    </form>
  );
}

function TratamientosSec({ datos, cambiar, onToast }: PropsSeccion) {
  const [abierto, setAbierto] = useState(false);

  const cambiarEstado = (t: TratamientoPaciente, estado: EstadoTratamiento) => {
    // TODO backend: PATCH /pacientes/:id/tratamientos/:tratamientoId { estado }
    cambiar("tratamientos", (prev) => prev.map((x) => (x.id === t.id ? { ...x, estado } : x)));
    onToast(`${t.nombre}: ${estado.toLowerCase()}`);
  };

  return (
    <div className="space-y-3">
      <Encabezado
        titulo="Tratamientos"
        descripcion="Tratamientos planificados, en curso y finalizados."
        etiquetaBoton="Agregar tratamiento"
        onAgregar={() => setAbierto(true)}
      />
      {datos.tratamientos.length === 0 ? (
        <EstadoVacio
          icon={Stethoscope}
          titulo="Sin tratamientos"
          texto="Cada tratamiento pasa por estos estados:"
          chips={ESTADOS_TRATAMIENTO}
        />
      ) : (
        <ul className="space-y-2.5">
          {datos.tratamientos.map((t) => (
            <li key={t.id} className={`${ITEM} flex flex-wrap items-center gap-3`}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{t.nombre}</p>
                  {t.pieza && <Badge tono="primary">Pieza {t.pieza}</Badge>}
                  <Badge tono={TONO_TRATAMIENTO[t.estado]}>{t.estado}</Badge>
                </div>
                <p className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
                  {t.profesional && <span>{t.profesional}</span>}
                  {t.inicio && <span>Inicio: {formatearFecha(t.inicio)}</span>}
                </p>
                {t.notas && <p className="mt-0.5 text-xs italic text-muted-foreground">{t.notas}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {t.estado === "Planificado" && <BotonMini icon={Check} label="Iniciar" onClick={() => cambiarEstado(t, "En tratamiento")} />}
                {t.estado === "En tratamiento" && <BotonMini icon={Check} label="Finalizar" onClick={() => cambiarEstado(t, "Finalizado")} />}
                {(t.estado === "Planificado" || t.estado === "En tratamiento") && (
                  <BotonMini icon={X} label="Cancelar" onClick={() => cambiarEstado(t, "Cancelado")} />
                )}
                <BotonBorrar
                  etiqueta="Eliminar tratamiento"
                  onClick={() => {
                    // TODO backend: DELETE /pacientes/:id/tratamientos/:tratamientoId
                    cambiar("tratamientos", (prev) => prev.filter((x) => x.id !== t.id));
                    onToast("Tratamiento eliminado");
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      {abierto && (
        <Modal title="Agregar tratamiento" onClose={() => setAbierto(false)}>
          <TratamientoForm
            onCancel={() => setAbierto(false)}
            onSubmit={(nuevo) => {
              // TODO backend: POST /pacientes/:id/tratamientos
              cambiar("tratamientos", (prev) => [...prev, { ...nuevo, id: Date.now() }]);
              setAbierto(false);
              onToast("Tratamiento guardado");
            }}
          />
        </Modal>
      )}
    </div>
  );
}

/* ───────────── Documentos ───────────── */

function DocumentoForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (d: Omit<DocumentoPaciente, "id">) => void;
  onCancel: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [tipo, setTipo] = useState(TIPOS_DOCUMENTO[0]);
  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState(hoyISO());
  const [notas, setNotas] = useState("");
  const [error, setError] = useState("");

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (!archivo) {
      setError("Adjuntá un archivo.");
      return;
    }
    onSubmit({
      tipo,
      // TODO backend: la categoría y el estado (Verificado, Firmado, Vigente…) los define el sistema
      categoria: tipo,
      estado: "Disponible",
      titulo: titulo.trim() || archivo.name.replace(/\.[^.]+$/, ""),
      fecha,
      archivoNombre: archivo.name,
      archivoTamano: archivo.size,
      // TODO backend: subir el archivo (multipart) y guardar la URL que devuelva el servidor
      url: URL.createObjectURL(archivo),
      notas: notas.trim(),
    });
  };

  return (
    <form onSubmit={enviar} className="space-y-2.5">
      <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2">
        <Field label="Tipo de documento *">
          <SelectField value={tipo} onChange={setTipo} options={TIPOS_DOCUMENTO} />
        </Field>
        <Field label="Fecha">
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={INPUT} />
        </Field>
      </div>
      <Field label="Título">
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={INPUT} placeholder="Si lo dejás vacío se usa el nombre del archivo" />
      </Field>
      <div>
        <span className="mb-1 block text-xs font-medium">Archivo *</span>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            setArchivo(e.target.files?.[0] ?? null);
            setError("");
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-3 text-left text-sm transition-colors hover:bg-primary/10"
        >
          <Paperclip className="size-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate">
            {archivo ? `${archivo.name} · ${formatearTamano(archivo.size)}` : "Seleccionar archivo (PDF, imagen u otro)"}
          </span>
        </button>
        {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
      </div>
      <Field label="Notas">
        <textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} className={TEXTAREA} placeholder="Observaciones del documento…" />
      </Field>
      <Acciones etiqueta="Cargar documento" onCancel={onCancel} />
    </form>
  );
}

function DocumentosSec({ datos, cambiar, onToast }: PropsSeccion) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="space-y-3">
      <Encabezado
        icon={FolderOpen}
        titulo="Documentos"
        descripcion="Documentación administrativa, consentimientos, estudios y archivos relacionados con el paciente."
        etiquetaBoton="Subir documento"
        onAgregar={() => setAbierto(true)}
      />
      {datos.documentos.length === 0 ? (
        <EstadoVacio
          icon={FolderOpen}
          titulo="Sin documentos cargados"
          texto="Tipos de documento disponibles:"
          chips={TIPOS_DOCUMENTO}
        />
      ) : (
        <ul className="space-y-2.5">
          {datos.documentos.map((d) => (
            <li key={d.id} className={`${ITEM} flex flex-wrap items-center gap-3`}>
              <span className={`${CIRCULO_ICONO} size-10`}>
                <FileText className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{d.titulo}</p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {[
                    d.categoria,
                    formatearFecha(d.fecha),
                    d.archivoNombre,
                    d.archivoNombre ? formatearTamano(d.archivoTamano) : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {d.notas && <p className="mt-0.5 text-xs italic text-muted-foreground">{d.notas}</p>}
              </div>
              <div className="flex items-center gap-1.5">
                <Badge tono="primary">{d.estado}</Badge>
                {d.url && <BotonMini icon={ExternalLink} label="Ver" onClick={() => window.open(d.url, "_blank")} />}
                <BotonBorrar
                  etiqueta="Eliminar documento"
                  onClick={() => {
                    // TODO backend: DELETE /pacientes/:id/documentos/:documentoId
                    if (d.url) URL.revokeObjectURL(d.url);
                    cambiar("documentos", (prev) => prev.filter((x) => x.id !== d.id));
                    onToast("Documento eliminado");
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-start gap-3 rounded-xl border border-primary/15 bg-primary/5 p-3">
        <Upload className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">Documentación del paciente</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Podés cargar DNI, comprobantes, consentimientos, presupuestos, estudios y otros archivos. En esta versión el
            archivo se mantiene en memoria del frontend; posteriormente se conectará con el almacenamiento permanente
            del sistema.
          </p>
        </div>
      </div>
      {abierto && (
        <Modal title="Cargar documento" onClose={() => setAbierto(false)}>
          <DocumentoForm
            onCancel={() => setAbierto(false)}
            onSubmit={(nuevo) => {
              // TODO backend: POST /pacientes/:id/documentos
              cambiar("documentos", (prev) => [...prev, { ...nuevo, id: Date.now() }]);
              setAbierto(false);
              onToast("Documento cargado");
            }}
          />
        </Modal>
      )}
    </div>
  );
}

/* ───────────── Estudios y diagnósticos ───────────── */

function EstudioForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (e: Omit<EstudioPaciente, "id">) => void;
  onCancel: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [tipo, setTipo] = useState(TIPOS_ESTUDIO[0]);
  const [fecha, setFecha] = useState(hoyISO());
  const [zona, setZona] = useState("");
  const [solicitante, setSolicitante] = useState("");
  const [diagnostico, setDiagnostico] = useState("");

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      tipo,
      fecha,
      zona: zona.trim(),
      solicitante: solicitante.trim(),
      diagnostico: diagnostico.trim(),
      archivoNombre: archivo?.name ?? "",
      // TODO backend: subir el archivo (multipart) y guardar la URL que devuelva el servidor
      url: archivo ? URL.createObjectURL(archivo) : "",
    });
  };

  return (
    <form onSubmit={enviar} className="space-y-2.5">
      <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2">
        <Field label="Tipo de estudio *">
          <SelectField value={tipo} onChange={setTipo} options={TIPOS_ESTUDIO} />
        </Field>
        <Field label="Fecha">
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={INPUT} />
        </Field>
        <Field label="Zona o pieza">
          <input value={zona} onChange={(e) => setZona(e.target.value)} className={INPUT} placeholder="Ej: 36, maxilar superior" />
        </Field>
        <Field label="Profesional solicitante">
          <input list="dl-profesionales" value={solicitante} onChange={(e) => setSolicitante(e.target.value)} className={INPUT} placeholder="Nombre del profesional" />
        </Field>
      </div>
      <Field label="Diagnóstico / informe *">
        <textarea required rows={3} value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} className={TEXTAREA} placeholder="Hallazgos y diagnóstico…" />
      </Field>
      <div>
        <span className="mb-1 block text-xs font-medium">Archivo adjunto</span>
        <input ref={fileRef} type="file" className="hidden" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-3 text-left text-sm transition-colors hover:bg-primary/10"
        >
          <Paperclip className="size-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate">
            {archivo ? `${archivo.name} · ${formatearTamano(archivo.size)}` : "Adjuntar imagen o PDF (opcional)"}
          </span>
        </button>
      </div>
      <Acciones etiqueta="Cargar estudio" onCancel={onCancel} />
    </form>
  );
}

function EstudiosSec({ datos, cambiar, onToast }: PropsSeccion) {
  const [abierto, setAbierto] = useState(false);
  const lista = [...datos.estudios].sort((a, b) => `${b.fecha}${b.id}`.localeCompare(`${a.fecha}${a.id}`));

  return (
    <div className="space-y-3">
      <Encabezado
        icon={FileText}
        titulo="Estudios y diagnósticos"
        descripcion="Radiografías, imágenes, diagnósticos y resultados asociados al paciente."
        etiquetaBoton="Cargar estudio"
        onAgregar={() => setAbierto(true)}
      />
      {lista.length === 0 ? (
        <EstadoVacio
          icon={FileText}
          titulo="Sin estudios cargados"
          texto="Tipos de estudio disponibles:"
          chips={TIPOS_ESTUDIO}
        />
      ) : (
        <ul className="space-y-2.5">
          {lista.map((s) => (
            <li key={s.id} className={`${ITEM} flex items-center gap-3`}>
              <span className={`${CIRCULO_ICONO} size-10`}>
                <FileText className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{s.tipo}</p>
                  {s.zona && <Badge tono="primary">{s.zona}</Badge>}
                </div>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {[formatearFecha(s.fecha), s.solicitante, s.archivoNombre].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-0.5 whitespace-pre-line text-sm">{s.diagnostico}</p>
              </div>
              <div className="flex items-center gap-1.5">
                {s.url && <BotonMini icon={ExternalLink} label="Ver" onClick={() => window.open(s.url, "_blank")} />}
                <BotonBorrar
                  etiqueta="Eliminar estudio"
                  onClick={() => {
                    // TODO backend: DELETE /pacientes/:id/estudios/:estudioId
                    if (s.url) URL.revokeObjectURL(s.url);
                    cambiar("estudios", (prev) => prev.filter((x) => x.id !== s.id));
                    onToast("Estudio eliminado");
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      {abierto && (
        <Modal title="Cargar estudio" onClose={() => setAbierto(false)}>
          <EstudioForm
            onCancel={() => setAbierto(false)}
            onSubmit={(nuevo) => {
              // TODO backend: POST /pacientes/:id/estudios
              cambiar("estudios", (prev) => [...prev, { ...nuevo, id: Date.now() }]);
              setAbierto(false);
              onToast("Estudio cargado");
            }}
          />
        </Modal>
      )}
    </div>
  );
}

/* ───────────── Presupuestos ───────────── */

type LineaForm = { descripcion: string; pieza: string; cantidad: string; precio: string };

function PresupuestoForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (p: { fecha: string; lineas: LineaPresupuesto[]; notas: string }) => void;
  onCancel: () => void;
}) {
  const [fecha, setFecha] = useState(hoyISO());
  const [lineas, setLineas] = useState<LineaForm[]>([{ descripcion: "", pieza: "", cantidad: "1", precio: "" }]);
  const [notas, setNotas] = useState("");
  const [error, setError] = useState("");

  const total = lineas.reduce((acc, l) => acc + (Number(l.cantidad) || 0) * (Number(l.precio) || 0), 0);

  const cambiarLinea = (i: number, campo: keyof LineaForm, valor: string) => {
    setLineas((prev) => prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)));
    setError("");
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const validas = lineas.filter((l) => l.descripcion.trim() && Number(l.cantidad) > 0 && Number(l.precio) > 0);
    if (validas.length === 0) {
      setError("Agregá al menos una práctica con cantidad y precio.");
      return;
    }
    onSubmit({
      fecha,
      notas: notas.trim(),
      lineas: validas.map((l) => ({
        descripcion: l.descripcion.trim(),
        pieza: l.pieza.trim(),
        cantidad: Number(l.cantidad),
        precio: Number(l.precio),
      })),
    });
  };

  return (
    <form onSubmit={enviar} className="space-y-2.5">
      <Field label="Fecha">
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={INPUT} />
      </Field>

      <div>
        <div className="grid grid-cols-[minmax(0,1fr)_56px_60px_96px_28px] gap-2 px-0.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Práctica</span>
          <span>Pieza</span>
          <span>Cant.</span>
          <span>Precio</span>
          <span />
        </div>
        <div className="space-y-2">
          {lineas.map((l, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,1fr)_56px_60px_96px_28px] items-center gap-2">
              <input
                autoFocus={i === 0}
                list="dl-practicas"
                value={l.descripcion}
                onChange={(e) => cambiarLinea(i, "descripcion", e.target.value)}
                className={INPUT}
                placeholder="Ej: Limpieza"
              />
              <input value={l.pieza} onChange={(e) => cambiarLinea(i, "pieza", e.target.value)} className={INPUT} placeholder="26" />
              <input type="number" min={1} value={l.cantidad} onChange={(e) => cambiarLinea(i, "cantidad", e.target.value)} className={INPUT} />
              <input type="number" min={0} value={l.precio} onChange={(e) => cambiarLinea(i, "precio", e.target.value)} className={INPUT} placeholder="0" />
              <button
                type="button"
                onClick={() => setLineas((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))}
                aria-label="Quitar práctica"
                disabled={lineas.length === 1}
                className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setLineas((prev) => [...prev, { descripcion: "", pieza: "", cantidad: "1", precio: "" }])}
          className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary"
        >
          <Plus className="size-3.5" />
          Agregar práctica
        </button>
        {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
      </div>

      <Field label="Notas">
        <textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} className={TEXTAREA} placeholder="Condiciones, validez, observaciones…" />
      </Field>

      <div className="flex items-center justify-between border-t border-border pt-2">
        <span className="text-sm text-muted-foreground">Total</span>
        <span className="text-lg font-bold">{formatearMonto(total)}</span>
      </div>

      <Acciones etiqueta="Crear presupuesto" onCancel={onCancel} />
    </form>
  );
}

function PresupuestosSec({ datos, cambiar, onToast }: PropsSeccion) {
  const [abierto, setAbierto] = useState(false);

  const cambiarEstado = (p: PresupuestoPaciente, estado: EstadoPresupuesto) => {
    // TODO backend: PATCH /pacientes/:id/presupuestos/:presupuestoId { estado }
    cambiar("presupuestos", (prev) => prev.map((x) => (x.id === p.id ? { ...x, estado } : x)));
    onToast(`${p.numero}: ${estado.toLowerCase()}`);
  };

  const totalDe = (p: PresupuestoPaciente) => p.lineas.reduce((acc, l) => acc + l.cantidad * l.precio, 0);

  return (
    <div className="space-y-3">
      <Encabezado
        titulo="Presupuestos"
        descripcion="Presupuestos con sus prácticas y estado de aprobación."
        etiquetaBoton="Nuevo presupuesto"
        onAgregar={() => setAbierto(true)}
      />
      {datos.presupuestos.length === 0 ? (
        <EstadoVacio
          icon={ReceiptText}
          titulo="Sin presupuestos"
          texto="Cada presupuesto pasa por estos estados:"
          chips={ESTADOS_PRESUPUESTO}
        />
      ) : (
        <ul className="space-y-2.5">
          {datos.presupuestos.map((p) => (
            <li key={p.id} className={ITEM}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{p.numero}</p>
                  <span className="text-[11px] text-muted-foreground">{formatearFecha(p.fecha)}</span>
                  <Badge tono={TONO_PRESUPUESTO[p.estado]}>{p.estado}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold">{formatearMonto(totalDe(p))}</span>
                  <BotonBorrar
                    etiqueta="Eliminar presupuesto"
                    onClick={() => {
                      // TODO backend: DELETE /pacientes/:id/presupuestos/:presupuestoId
                      cambiar("presupuestos", (prev) => prev.filter((x) => x.id !== p.id));
                      onToast("Presupuesto eliminado");
                    }}
                  />
                </div>
              </div>
              <ul className="mt-2 divide-y divide-border rounded-lg border border-border bg-background/70 text-xs">
                {p.lineas.map((l, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 px-2.5 py-1.5">
                    <span className="min-w-0 truncate">
                      {l.descripcion}
                      {l.pieza && <span className="text-muted-foreground"> · pieza {l.pieza}</span>}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {l.cantidad} × {formatearMonto(l.precio)}
                    </span>
                  </li>
                ))}
              </ul>
              {p.notas && <p className="mt-1.5 text-xs italic text-muted-foreground">{p.notas}</p>}
              {(p.estado === "Borrador" || p.estado === "Enviado") && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.estado === "Borrador" && <BotonMini label="Marcar como enviado" onClick={() => cambiarEstado(p, "Enviado")} />}
                  {p.estado === "Enviado" && (
                    <>
                      <BotonMini icon={Check} label="Aprobado" onClick={() => cambiarEstado(p, "Aprobado")} />
                      <BotonMini icon={X} label="Rechazado" onClick={() => cambiarEstado(p, "Rechazado")} />
                    </>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {abierto && (
        <Modal title="Nuevo presupuesto" onClose={() => setAbierto(false)}>
          <PresupuestoForm
            onCancel={() => setAbierto(false)}
            onSubmit={(nuevo) => {
              // TODO backend: POST /pacientes/:id/presupuestos (el número lo asigna el servidor)
              const numero = `PR-${String(datos.presupuestos.length + 1).padStart(4, "0")}`;
              cambiar("presupuestos", (prev) => [...prev, { ...nuevo, id: Date.now(), numero, estado: "Borrador" as const }]);
              setAbierto(false);
              onToast(`Presupuesto ${numero} creado`);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

/* ───────────── Turnos ───────────── */

function TurnoForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (t: Omit<TurnoPaciente, "id" | "estado">) => void;
  onCancel: () => void;
}) {
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [motivo, setMotivo] = useState("");
  const [profesional, setProfesional] = useState("");
  const [sucursal, setSucursal] = useState("");

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ fecha, hora, motivo: motivo.trim(), profesional: profesional.trim(), sucursal });
  };

  return (
    <form onSubmit={enviar} className="space-y-2.5">
      <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2">
        <Field label="Fecha *">
          <input autoFocus required type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={INPUT} />
        </Field>
        <Field label="Hora *">
          <input required type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={INPUT} />
        </Field>
      </div>
      <Field label="Motivo *">
        <input required list="dl-practicas" value={motivo} onChange={(e) => setMotivo(e.target.value)} className={INPUT} placeholder="Ej: Control, limpieza, urgencia" />
      </Field>
      <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2">
        <Field label="Profesional">
          <input list="dl-profesionales" value={profesional} onChange={(e) => setProfesional(e.target.value)} className={INPUT} placeholder="Nombre del profesional" />
        </Field>
        <Field label="Sucursal">
          <SelectField value={sucursal} onChange={setSucursal} options={SUCURSALES} placeholder="Seleccionar" />
        </Field>
      </div>
      <Acciones etiqueta="Agendar turno" onCancel={onCancel} />
    </form>
  );
}

function TurnosSec({ datos, cambiar, onToast }: PropsSeccion) {
  const [abierto, setAbierto] = useState(false);
  const lista = [...datos.turnos].sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`));

  const cambiarEstado = (t: TurnoPaciente, estado: EstadoTurnoPaciente) => {
    // TODO backend: PATCH /turnos/:id { estado }
    cambiar("turnos", (prev) => prev.map((x) => (x.id === t.id ? { ...x, estado } : x)));
    onToast(`Turno del ${formatearFecha(t.fecha)}: ${estado.toLowerCase()}`);
  };

  return (
    <div className="space-y-3">
      <Encabezado
        titulo="Turnos"
        descripcion="Turnos pasados y próximos del paciente."
        etiquetaBoton="Nuevo turno"
        onAgregar={() => setAbierto(true)}
      />
      {lista.length === 0 ? (
        <EstadoVacio
          icon={CalendarDays}
          titulo="Sin turnos"
          texto="Cada turno pasa por estos estados:"
          chips={ESTADOS_TURNO}
        />
      ) : (
        <ul className="space-y-2.5">
          {lista.map((t) => (
            <li key={t.id} className={`${ITEM} flex flex-wrap items-center gap-3`}>
              <div className="w-24 shrink-0">
                <p className="text-sm font-bold">{formatearFecha(t.fecha)}</p>
                <p className="text-xs text-muted-foreground">{t.hora} hs</p>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{t.motivo}</p>
                  <Badge tono={TONO_TURNO[t.estado]}>{t.estado}</Badge>
                </div>
                <p className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
                  {t.profesional && <span>{t.profesional}</span>}
                  {t.sucursal && <span>{t.sucursal}</span>}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {t.estado === "Pendiente" && <BotonMini icon={Check} label="Confirmar" onClick={() => cambiarEstado(t, "Confirmado")} />}
                {t.estado === "Confirmado" && <BotonMini icon={Check} label="Atendido" onClick={() => cambiarEstado(t, "Atendido")} />}
                {(t.estado === "Pendiente" || t.estado === "Confirmado") && (
                  <BotonMini icon={X} label="Cancelar" onClick={() => cambiarEstado(t, "Cancelado")} />
                )}
                <BotonBorrar
                  etiqueta="Eliminar turno"
                  onClick={() => {
                    // TODO backend: DELETE /turnos/:id
                    cambiar("turnos", (prev) => prev.filter((x) => x.id !== t.id));
                    onToast("Turno eliminado");
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      {abierto && (
        <Modal title="Nuevo turno" onClose={() => setAbierto(false)}>
          <TurnoForm
            onCancel={() => setAbierto(false)}
            onSubmit={(nuevo) => {
              // TODO backend: POST /turnos (con el paciente)
              cambiar("turnos", (prev) => [...prev, { ...nuevo, id: Date.now(), estado: "Pendiente" as const }]);
              setAbierto(false);
              onToast("Turno agendado");
            }}
          />
        </Modal>
      )}
    </div>
  );
}

/* ───────────── Cuenta corriente ───────────── */

function MovimientoForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (m: Omit<Movimiento, "id">) => void;
  onCancel: () => void;
}) {
  const [tipo, setTipo] = useState<TipoMovimiento>("Cargo");
  const [fecha, setFecha] = useState(hoyISO());
  const [concepto, setConcepto] = useState("");
  const [medio, setMedio] = useState(MEDIOS_PAGO[0]);
  const [monto, setMonto] = useState("");
  const [notas, setNotas] = useState("");

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      tipo,
      fecha,
      concepto: concepto.trim(),
      medio: tipo === "Pago" ? medio : "",
      monto: Number(monto),
      notas: notas.trim(),
    });
  };

  return (
    <form onSubmit={enviar} className="space-y-2.5">
      <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2">
        <Field label="Tipo de movimiento *">
          <SelectField value={tipo} onChange={(v) => setTipo(v as TipoMovimiento)} options={TIPOS_MOVIMIENTO} />
        </Field>
        <Field label="Fecha">
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={INPUT} />
        </Field>
      </div>
      <Field label="Concepto *">
        <input autoFocus required list="dl-practicas" value={concepto} onChange={(e) => setConcepto(e.target.value)} className={INPUT} placeholder={tipo === "Pago" ? "Ej: Pago de tratamiento" : "Ej: Endodoncia pieza 26"} />
      </Field>
      <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2">
        {tipo === "Pago" && (
          <Field label="Medio de pago">
            <SelectField value={medio} onChange={setMedio} options={MEDIOS_PAGO} />
          </Field>
        )}
        <Field label="Monto (ARS) *">
          <input required type="number" min={1} value={monto} onChange={(e) => setMonto(e.target.value)} className={INPUT} placeholder="0" />
        </Field>
      </div>
      <Field label="Notas">
        <textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} className={TEXTAREA} placeholder="Observaciones…" />
      </Field>
      <Acciones etiqueta="Guardar movimiento" onCancel={onCancel} />
    </form>
  );
}

function ResumenCuenta({ etiqueta, valor, icon: Icon, tono }: { etiqueta: string; valor: string; icon: LucideIcon; tono?: string }) {
  return (
    <div className={ITEM}>
      <div className="pointer-events-none absolute -right-5 -top-5 grid size-20 place-items-center rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent ring-1 ring-primary/10">
        <Icon className="size-4 text-primary/70" />
      </div>
      <p className="relative pr-8 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{etiqueta}</p>
      <p className={`relative mt-1 text-base font-bold ${tono ?? ""}`}>{valor}</p>
    </div>
  );
}

function CuentaSec({ datos, cambiar, onToast }: PropsSeccion) {
  const [abierto, setAbierto] = useState(false);
  const lista = [...datos.cuenta].sort((a, b) => `${b.fecha}${b.id}`.localeCompare(`${a.fecha}${a.id}`));

  const cargos = datos.cuenta.filter((m) => m.tipo === "Cargo").reduce((acc, m) => acc + m.monto, 0);
  const pagos = datos.cuenta.filter((m) => m.tipo === "Pago").reduce((acc, m) => acc + m.monto, 0);
  const creditos = datos.cuenta.filter((m) => m.tipo === "Nota de crédito").reduce((acc, m) => acc + m.monto, 0);
  const saldo = cargos - pagos - creditos;

  return (
    <div className="space-y-3">
      <Encabezado
        titulo="Cuenta corriente"
        descripcion="Cargos, pagos y saldo del paciente."
        etiquetaBoton="Nuevo movimiento"
        onAgregar={() => setAbierto(true)}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ResumenCuenta etiqueta="Cargos" valor={formatearMonto(cargos)} icon={ReceiptText} />
        <ResumenCuenta etiqueta="Pagos y créditos" valor={formatearMonto(pagos + creditos)} icon={Check} tono="text-emerald-600" />
        <ResumenCuenta
          etiqueta={saldo > 0 ? "Saldo adeudado" : "Saldo"}
          valor={formatearMonto(Math.abs(saldo))}
          icon={Wallet}
          tono={saldo > 0 ? "text-destructive" : saldo < 0 ? "text-emerald-600" : ""}
        />
      </div>

      {lista.length === 0 ? (
        <EstadoVacio
          icon={Wallet}
          titulo="Sin movimientos"
          texto="Tipos de movimiento disponibles:"
          chips={TIPOS_MOVIMIENTO}
        />
      ) : (
        <ul className="space-y-2.5">
          {lista.map((m) => (
            <li key={m.id} className={`${ITEM} flex flex-wrap items-center gap-3`}>
              <div className="w-24 shrink-0">
                <p className="text-sm font-bold">{formatearFecha(m.fecha)}</p>
                <Badge tono={TONO_MOVIMIENTO[m.tipo]}>{m.tipo}</Badge>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{m.concepto}</p>
                <p className="text-[11px] text-muted-foreground">{m.medio || "—"}</p>
                {m.notas && <p className="text-xs italic text-muted-foreground">{m.notas}</p>}
              </div>
              <p className={`text-base font-bold ${m.tipo === "Cargo" ? "text-foreground" : "text-emerald-600"}`}>
                {m.tipo === "Cargo" ? "" : "− "}
                {formatearMonto(m.monto)}
              </p>
              <BotonBorrar
                etiqueta="Eliminar movimiento"
                onClick={() => {
                  // TODO backend: DELETE /pacientes/:id/cuenta/:movimientoId
                  cambiar("cuenta", (prev) => prev.filter((x) => x.id !== m.id));
                  onToast("Movimiento eliminado");
                }}
              />
            </li>
          ))}
        </ul>
      )}
      {abierto && (
        <Modal title="Nuevo movimiento" onClose={() => setAbierto(false)}>
          <MovimientoForm
            onCancel={() => setAbierto(false)}
            onSubmit={(nuevo) => {
              // TODO backend: POST /pacientes/:id/cuenta
              cambiar("cuenta", (prev) => [...prev, { ...nuevo, id: Date.now() }]);
              setAbierto(false);
              onToast("Movimiento guardado");
            }}
          />
        </Modal>
      )}
    </div>
  );
}

/* ───────────── Profesionales ───────────── */

function ProfesionalForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (p: Omit<ProfesionalPaciente, "id">) => void;
  onCancel: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [especialidad, setEspecialidad] = useState("");
  const [rol, setRol] = useState<RolProfesional>("Principal");
  const [desde, setDesde] = useState("");

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ nombre: nombre.trim(), especialidad: especialidad.trim(), rol, desde });
  };

  return (
    <form onSubmit={enviar} className="space-y-2.5">
      <Field label="Profesional *">
        <input autoFocus required list="dl-profesionales" value={nombre} onChange={(e) => setNombre(e.target.value)} className={INPUT} placeholder="Nombre y apellido" />
      </Field>
      <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2">
        <Field label="Especialidad">
          <input value={especialidad} onChange={(e) => setEspecialidad(e.target.value)} className={INPUT} placeholder="Ej: Odontología general" />
        </Field>
        <Field label="Rol">
          <SelectField value={rol} onChange={(v) => setRol(v as RolProfesional)} options={ROLES_PROFESIONAL} />
        </Field>
      </div>
      <Field label="Atiende desde">
        <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={INPUT} />
      </Field>
      <Acciones etiqueta="Agregar profesional" onCancel={onCancel} />
    </form>
  );
}

function ProfesionalesSec({ datos, cambiar, onToast }: PropsSeccion) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="space-y-3">
      <Encabezado
        titulo="Profesionales"
        descripcion="Profesionales que atienden al paciente."
        etiquetaBoton="Agregar profesional"
        onAgregar={() => setAbierto(true)}
      />
      {datos.profesionales.length === 0 ? (
        <EstadoVacio
          icon={HeartPulse}
          titulo="Sin profesionales asignados"
          texto="Roles disponibles:"
          chips={ROLES_PROFESIONAL}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {datos.profesionales.map((p) => (
            <li key={p.id} className={`${ITEM} flex items-center gap-3`}>
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-[oklch(0.45_0.2_290)] text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25">
                {iniciales(p.nombre)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{p.nombre}</p>
                <p className="truncate text-xs text-muted-foreground">{p.especialidad || "—"}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge tono="primary">{p.rol}</Badge>
                  {p.desde && <span className="text-[11px] text-muted-foreground">Desde {formatearFecha(p.desde)}</span>}
                </div>
              </div>
              <BotonBorrar
                etiqueta="Quitar profesional"
                onClick={() => {
                  // TODO backend: DELETE /pacientes/:id/profesionales/:profesionalId
                  cambiar("profesionales", (prev) => prev.filter((x) => x.id !== p.id));
                  onToast("Profesional quitado");
                }}
              />
            </li>
          ))}
        </ul>
      )}
      {abierto && (
        <Modal title="Agregar profesional" onClose={() => setAbierto(false)}>
          <ProfesionalForm
            onCancel={() => setAbierto(false)}
            onSubmit={(nuevo) => {
              // TODO backend: POST /pacientes/:id/profesionales
              cambiar("profesionales", (prev) => [...prev, { ...nuevo, id: Date.now() }]);
              setAbierto(false);
              onToast("Profesional agregado");
            }}
          />
        </Modal>
      )}
    </div>
  );
}

/* ───────────── Componente principal ───────────── */

export function SeccionPaciente({
  seccion,
  datos,
  cambiar,
  onToast,
}: {
  seccion: SeccionRegistros;
  datos: Registros;
  cambiar: Cambiar;
  onToast: (msg: string) => void;
}) {
  const props = { datos, cambiar, onToast };
  return (
    <>
      <Datalists />
      {seccion === "historia" && <HistoriaSec {...props} />}
      {seccion === "tratamientos" && <TratamientosSec {...props} />}
      {seccion === "documentos" && <DocumentosSec {...props} />}
      {seccion === "estudios" && <EstudiosSec {...props} />}
      {seccion === "presupuestos" && <PresupuestosSec {...props} />}
      {seccion === "turnos" && <TurnosSec {...props} />}
      {seccion === "cuenta" && <CuentaSec {...props} />}
      {seccion === "profesionales" && <ProfesionalesSec {...props} />}
    </>
  );
}