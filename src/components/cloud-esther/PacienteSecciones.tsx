import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Plus, X, Trash2, ChevronDown, History, Stethoscope, FolderOpen, FileText, ReceiptText,
  CalendarDays, Wallet, HeartPulse, Check, Paperclip, ExternalLink, Upload, Pill, Printer,
  Images, GitCompare, Ruler, Link2, Activity, Download, Mail, ZoomIn, ZoomOut, Eye, FlaskConical,
  Truck, PackageCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ───────────── Catálogos ─────────────
   TODO backend: estos catálogos los completa la API (por clínica).
   Hoy están vacíos a propósito: no hay datos de relleno. */

const PROFESIONALES: string[] = [];
const SUCURSALES: string[] = [];
const PRACTICAS: string[] = [];
const MEDICAMENTOS: string[] = [];
const LABORATORIOS_PROVEEDORES: string[] = [];

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

const VIAS_ADMINISTRACION = [
  "Oral",
  "Tópica",
  "Inyectable",
  "Enjuague bucal",
  "Otra",
];

const ESTADOS_INFORME = ["Sin informar", "Informado"] as const;

const TIPOS_MEDICION = [
  "Medición lineal",
  "Medición angular",
  "Área",
  "Densidad ósea",
  "Otro",
];

const ESTADOS_DIAGNOSTICO = ["Activo", "Resuelto"] as const;

const ESTADOS_TRATAMIENTO = ["Planificado", "En tratamiento", "Finalizado", "Cancelado"] as const;
const ESTADOS_PRESUPUESTO = ["Borrador", "Enviado", "Aprobado", "Rechazado"] as const;
const ESTADOS_TURNO = ["Pendiente", "Confirmado", "Atendido", "Cancelado"] as const;
const ESTADOS_RECETA = ["Borrador", "Emitida", "Dispensada", "Anulada"] as const;
const TIPOS_MOVIMIENTO = ["Cargo", "Pago", "Nota de crédito"] as const;
const MEDIOS_PAGO = ["Efectivo", "Transferencia", "Tarjeta de débito", "Tarjeta de crédito", "Obra social"];
const ROLES_PROFESIONAL = ["Principal", "Interconsulta", "Derivación"] as const;

const TIPOS_TRABAJO_LAB = [
  "Corona",
  "Puente",
  "Prótesis removible",
  "Prótesis completa",
  "Placa de descarga",
  "Férula de blanqueamiento",
  "Carilla",
  "Guarda oclusal",
  "Modelo de estudio",
  "Otro",
];

const MATERIALES_LAB = [
  "Zirconio",
  "Disilicato de litio (e.max)",
  "Metal-porcelana",
  "Acrílico",
  "Resina",
  "Flexible",
  "Otro",
];

const ESTADOS_LABORATORIO = ["Enviado", "En proceso", "Listo para retirar", "Entregado"] as const;

/* ───────────── Tipos ───────────── */

type EstadoTratamiento = (typeof ESTADOS_TRATAMIENTO)[number];
type EstadoPresupuesto = (typeof ESTADOS_PRESUPUESTO)[number];
type EstadoTurnoPaciente = (typeof ESTADOS_TURNO)[number];
type EstadoReceta = (typeof ESTADOS_RECETA)[number];
type EstadoInforme = (typeof ESTADOS_INFORME)[number];
type EstadoDiagnostico = (typeof ESTADOS_DIAGNOSTICO)[number];
type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];
type RolProfesional = (typeof ROLES_PROFESIONAL)[number];
type EstadoLaboratorio = (typeof ESTADOS_LABORATORIO)[number];

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
  estadoInforme: EstadoInforme;
  tratamientoId: number | null;
};

type Anotacion = {
  id: number;
  estudioId: number | null;
  estudioNombre: string;
  tipoMedicion: string;
  valor: string;
  observacion: string;
  fecha: string;
  profesional: string;
};

type DiagnosticoPaciente = {
  id: number;
  titulo: string;
  descripcion: string;
  pieza: string;
  profesional: string;
  observacion: string;
  estado: EstadoDiagnostico;
  fecha: string;
};

type MedicamentoReceta = {
  nombre: string;
  presentacion: string;
  via: string;
  cantidad: number;
  posologia: string;
};

type RecetaPaciente = {
  id: number;
  numero: string;
  fecha: string;
  estado: EstadoReceta;
  profesional: string;
  matricula: string;
  diagnostico: string;
  medicamentos: MedicamentoReceta[];
  indicaciones: string;
  vencimiento: string;
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

export type TrabajoLaboratorio = {
  id: number;
  tipo: string;
  pieza: string;
  material: string;
  proveedor: string;
  fechaEnvio: string;
  fechaEntregaEstimada: string;
  estado: EstadoLaboratorio;
  costo: number;
  notas: string;
};

export type Registros = {
  historia: Evolucion[];
  tratamientos: TratamientoPaciente[];
  documentos: DocumentoPaciente[];
  recetas: RecetaPaciente[];
  estudios: EstudioPaciente[];
  anotaciones: Anotacion[];
  diagnosticos: DiagnosticoPaciente[];
  presupuestos: PresupuestoPaciente[];
  turnos: TurnoPaciente[];
  cuenta: Movimiento[];
  profesionales: ProfesionalPaciente[];
  laboratorio: TrabajoLaboratorio[];
};

export type Cambiar = <K extends keyof Registros>(clave: K, fn: (prev: Registros[K]) => Registros[K]) => void;

export type SeccionRegistros =
  | "historia" | "tratamientos" | "documentos" | "recetas" | "estudios" | "presupuestos" | "turnos" | "cuenta" | "profesionales" | "laboratorio";

/* Datos opcionales del contexto (paciente / clínica) para la receta digital y el resumen de estudios.
   TODO backend: completarlos desde la ficha del paciente y la configuración de la clínica. */
export type ContextoPaciente = { paciente?: string; email?: string; clinica?: string };

const VACIO: Registros = {
  historia: [],
  tratamientos: [],
  documentos: [],
  recetas: [],
  estudios: [],
  anotaciones: [],
  diagnosticos: [],
  presupuestos: [],
  turnos: [],
  cuenta: [],
  profesionales: [],
  laboratorio: [],
};

/* ───────────── Estado por paciente ─────────────
   TODO backend: reemplazar este hook por las consultas a la API
   (GET /pacientes/:id/historia, /tratamientos, /documentos, /recetas, etc.). */

const REGISTROS_INICIALES: Record<number, Registros> = {
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
      recetas: [
        {
          id: 1,
          numero: "RC-0001",
          fecha: "2026-08-20",
          estado: "Emitida",
          profesional: "Dr. Carlos Rodríguez",
          matricula: "",
          diagnostico: "Restauración estética pieza 21.",
          medicamentos: [
            {
              nombre: "Ibuprofeno",
              presentacion: "400 mg comprimidos",
              via: "Oral",
              cantidad: 1,
              posologia: "1 comprimido cada 8 horas por 3 días",
            },
          ],
          indicaciones: "Indicaciones a completar por el profesional.",
          vencimiento: "",
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
          estadoInforme: "Sin informar",
          tratamientoId: null,
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
          estadoInforme: "Informado",
          tratamientoId: null,
        },
      ],
      anotaciones: [
        {
          id: 1,
          estudioId: 2,
          estudioNombre: "Radiografía panorámica",
          tipoMedicion: "Medición lineal",
          valor: "12.4 mm",
          observacion: "Se observa zona compatible con el diagnóstico registrado. Requiere seguimiento.",
          fecha: "2026-08-21",
          profesional: "Dra. Laura Gómez",
        },
      ],
      diagnosticos: [
        {
          id: 1,
          titulo: "Diagnóstico odontológico",
          descripcion: "Lesión cariosa profunda en pieza 36 con indicación de tratamiento.",
          pieza: "36",
          profesional: "Dra. Laura Gómez",
          observacion: "Se recomienda tratamiento y control radiográfico posterior.",
          estado: "Activo",
          fecha: "2026-08-21",
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
        {
          id: 2,
          fecha: "2026-08-10",
          hora: "10:30",
          motivo: "Control y evaluación",
          profesional: "Dr. Carlos Rodríguez",
          sucursal: "",
          estado: "Atendido",
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
      laboratorio: [
        {
          id: 1,
          tipo: "Corona",
          pieza: "21",
          material: "Disilicato de litio (e.max)",
          proveedor: "",
          fechaEnvio: "2026-08-21",
          fechaEntregaEstimada: "2026-08-29",
          estado: "En proceso",
          costo: 0,
          notas: "Toma de color registrada. Pendiente de recibir del laboratorio.",
        },
      ],
    },
};

/* Los registros viven a nivel módulo para compartirse entre la página de Pacientes y las
   páginas de acceso directo del sidebar (Historia, Recetas, Estudios…). Al conectar el backend
   este store se reemplaza por las consultas a la API. */
let registrosActuales: Record<number, Registros> = REGISTROS_INICIALES;
const oyentesRegistros = new Set<() => void>();
const emitirRegistros = () => oyentesRegistros.forEach((f) => f());
const suscribirRegistros = (f: () => void) => {
  oyentesRegistros.add(f);
  return () => {
    oyentesRegistros.delete(f);
  };
};
const leerRegistros = () => registrosActuales;

export function useRegistrosPacientes() {
  const porPaciente = useSyncExternalStore(suscribirRegistros, leerRegistros, leerRegistros);

  const de = (id: number): Registros => porPaciente[id] ?? VACIO;

  function cambiar<K extends keyof Registros>(id: number, clave: K, fn: (prev: Registros[K]) => Registros[K]) {
    const actual = registrosActuales[id] ?? VACIO;
    const siguiente = { ...actual, [clave]: fn(actual[clave]) } as Registros;
    registrosActuales = { ...registrosActuales, [id]: siguiente };
    emitirRegistros();
  }

  const quitar = (id: number) => {
    const { [id]: _borrado, ...resto } = registrosActuales;
    registrosActuales = resto;
    emitirRegistros();
  };

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

function esImagen(nombre: string) {
  return /\.(png|jpe?g|gif|webp|bmp|avif)$/i.test(nombre);
}

function escapar(t: string) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* ───────────── Estilos ───────────── */

const ITEM =
  "relative overflow-hidden rounded-xl border border-primary/20 bg-card bg-gradient-to-br from-card via-card to-[oklch(0.94_0.035_292)] p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md hover:shadow-primary/10";

const ESTUDIO_ITEM =
  "relative overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm transition-all duration-200 hover:border-primary/30 hover:shadow-md";

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
const TONO_RECETA: Record<EstadoReceta, Tono> = {
  Borrador: "gris",
  Emitida: "primary",
  Dispensada: "verde",
  Anulada: "rojo",
};
const TONO_MOVIMIENTO: Record<TipoMovimiento, Tono> = {
  Cargo: "ambar",
  Pago: "verde",
  "Nota de crédito": "primary",
};
const TONO_INFORME: Record<EstadoInforme, Tono> = {
  "Sin informar": "ambar",
  Informado: "verde",
};
const TONO_DIAGNOSTICO: Record<EstadoDiagnostico, Tono> = {
  Activo: "primary",
  Resuelto: "verde",
};
const TONO_LABORATORIO: Record<EstadoLaboratorio, Tono> = {
  Enviado: "ambar",
  "En proceso": "primary",
  "Listo para retirar": "verde",
  Entregado: "gris",
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
  botonClassName,
}: {
  titulo: string;
  descripcion: string;
  etiquetaBoton: string;
  onAgregar: () => void;
  icon?: LucideIcon;
  botonClassName?: string;
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
        className={`${BTN_PRIMARIO} ${botonClassName ?? ""}`}
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

function BotonBorrar({
  onClick,
  etiqueta,
  compacto = false,
}: {
  onClick: () => void;
  etiqueta: string;
  compacto?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={etiqueta}
      className={`grid shrink-0 place-items-center rounded-full border border-transparent text-muted-foreground transition-all duration-200 hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 ${
        compacto ? "size-7" : "size-8"
      }`}
    >
      <Trash2 className={compacto ? "size-3.5" : "size-4"} />
    </button>
  );
}

function BotonMini({
  icon: Icon,
  label,
  onClick,
  compacto = false,
}: {
  icon?: LucideIcon;
  label: string;
  onClick: () => void;
  compacto?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1 rounded-full border border-border bg-card font-medium shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/10 hover:text-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        compacto ? "min-h-7 px-2 py-0.5 text-[10px]" : "px-3 py-1 text-[11px]"
      }`}
    >
      {Icon && <Icon className={compacto ? "size-2.5" : "size-3"} />}
      {label}
    </button>
  );
}

function Modal({
  title,
  onClose,
  children,
  ancho = "max-w-xl",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  ancho?: string;
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
        className={`max-h-[92vh] w-full ${ancho} overflow-y-auto rounded-2xl border border-primary/15 bg-card bg-gradient-to-b from-primary/[0.06] to-transparent p-5 shadow-2xl`}
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

function SelectId({
  value,
  onChange,
  opciones,
  placeholder,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  opciones: { id: number; label: string }[];
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className={`${INPUT} appearance-none pr-9 ${value === null ? "text-muted-foreground" : ""}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {opciones.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function ControlesZoom({ zoom, setZoom }: { zoom: number; setZoom: (z: number) => void }) {
  const paso = (d: number) => setZoom(Math.min(2.5, Math.max(0.5, Math.round((zoom + d) * 100) / 100)));
  const claseBoton =
    "grid size-7 place-items-center rounded-full border border-border bg-card shadow-sm transition-all duration-200 hover:border-primary/40 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={() => paso(-0.25)} aria-label="Alejar" className={claseBoton}>
        <ZoomOut className="size-3.5" />
      </button>
      <span className="w-11 text-center text-xs font-medium tabular-nums">{Math.round(zoom * 100)}%</span>
      <button type="button" onClick={() => paso(0.25)} aria-label="Acercar" className={claseBoton}>
        <ZoomIn className="size-3.5" />
      </button>
      <BotonMini label="Restablecer" onClick={() => setZoom(1)} />
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
      <datalist id="dl-medicamentos">
        {MEDICAMENTOS.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <datalist id="dl-laboratorios">
        {LABORATORIOS_PROVEEDORES.map((n) => (
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
  contexto?: ContextoPaciente;
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

/* ───────────── Recetas digitales ───────────── */

type MedicamentoForm = { nombre: string; presentacion: string; via: string; cantidad: string; posologia: string };

function RecetaForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (r: {
    fecha: string;
    profesional: string;
    matricula: string;
    diagnostico: string;
    medicamentos: MedicamentoReceta[];
    indicaciones: string;
    vencimiento: string;
  }) => void;
  onCancel: () => void;
}) {
  const [fecha, setFecha] = useState(hoyISO());
  const [profesional, setProfesional] = useState("");
  const [matricula, setMatricula] = useState("");
  const [diagnostico, setDiagnostico] = useState("");
  const [vencimiento, setVencimiento] = useState("");
  const [indicaciones, setIndicaciones] = useState("");
  const [medicamentos, setMedicamentos] = useState<MedicamentoForm[]>([
    { nombre: "", presentacion: "", via: VIAS_ADMINISTRACION[0], cantidad: "1", posologia: "" },
  ]);
  const [error, setError] = useState("");

  const cambiarMedicamento = (i: number, campo: keyof MedicamentoForm, valor: string) => {
    setMedicamentos((prev) => prev.map((m, idx) => (idx === i ? { ...m, [campo]: valor } : m)));
    setError("");
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const validos = medicamentos.filter((m) => m.nombre.trim() && m.posologia.trim());
    if (validos.length === 0) {
      setError("Agregá al menos un medicamento con su posología.");
      return;
    }
    onSubmit({
      fecha,
      profesional: profesional.trim(),
      matricula: matricula.trim(),
      diagnostico: diagnostico.trim(),
      indicaciones: indicaciones.trim(),
      vencimiento,
      medicamentos: validos.map((m) => ({
        nombre: m.nombre.trim(),
        presentacion: m.presentacion.trim(),
        via: m.via,
        cantidad: Number(m.cantidad) || 1,
        posologia: m.posologia.trim(),
      })),
    });
  };

  return (
    <form onSubmit={enviar} className="space-y-2.5">
      <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2">
        <Field label="Fecha *">
          <input required type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={INPUT} />
        </Field>
        <Field label="Válida hasta">
          <input type="date" value={vencimiento} onChange={(e) => setVencimiento(e.target.value)} className={INPUT} />
        </Field>
        <Field label="Profesional *">
          <input autoFocus required list="dl-profesionales" value={profesional} onChange={(e) => setProfesional(e.target.value)} className={INPUT} placeholder="Nombre del profesional" />
        </Field>
        <Field label="Matrícula">
          <input value={matricula} onChange={(e) => setMatricula(e.target.value)} className={INPUT} placeholder="Ej: MN 00000" />
        </Field>
      </div>

      <Field label="Diagnóstico">
        <input value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} className={INPUT} placeholder="Ej: Pericoronaritis pieza 38" />
      </Field>

      <div>
        <span className="mb-1 block text-xs font-medium">Medicamentos *</span>
        <div className="space-y-2">
          {medicamentos.map((m, i) => (
            <div key={i} className="rounded-lg border border-border bg-background/70 p-2.5">
              <div className="grid grid-cols-[minmax(0,1fr)_28px] items-center gap-2">
                <input
                  list="dl-medicamentos"
                  value={m.nombre}
                  onChange={(e) => cambiarMedicamento(i, "nombre", e.target.value)}
                  className={INPUT}
                  placeholder="Medicamento (droga o marca)"
                />
                <button
                  type="button"
                  onClick={() => setMedicamentos((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))}
                  aria-label="Quitar medicamento"
                  disabled={medicamentos.length === 1}
                  className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <div className="mt-2 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_60px] gap-2">
                <input
                  value={m.presentacion}
                  onChange={(e) => cambiarMedicamento(i, "presentacion", e.target.value)}
                  className={INPUT}
                  placeholder="Presentación (ej: 500 mg comp.)"
                />
                <SelectField value={m.via} onChange={(v) => cambiarMedicamento(i, "via", v)} options={VIAS_ADMINISTRACION} />
                <input
                  type="number"
                  min={1}
                  value={m.cantidad}
                  onChange={(e) => cambiarMedicamento(i, "cantidad", e.target.value)}
                  className={INPUT}
                />
              </div>
              <input
                value={m.posologia}
                onChange={(e) => cambiarMedicamento(i, "posologia", e.target.value)}
                className={`${INPUT} mt-2`}
                placeholder="Posología (ej: 1 comprimido cada 8 hs por 5 días)"
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            setMedicamentos((prev) => [
              ...prev,
              { nombre: "", presentacion: "", via: VIAS_ADMINISTRACION[0], cantidad: "1", posologia: "" },
            ])
          }
          className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary"
        >
          <Plus className="size-3.5" />
          Agregar medicamento
        </button>
        {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
      </div>

      <Field label="Indicaciones generales">
        <textarea rows={2} value={indicaciones} onChange={(e) => setIndicaciones(e.target.value)} className={TEXTAREA} placeholder="Indicaciones al paciente, advertencias, control…" />
      </Field>

      <Acciones etiqueta="Crear receta" onCancel={onCancel} />
    </form>
  );
}

/* Documento de la receta (vista en pantalla) */
function RecetaDocumento({ receta: r, contexto }: { receta: RecetaPaciente; contexto?: ContextoPaciente }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-white p-6 text-[13px] text-neutral-900 shadow-sm">
      {r.estado === "Anulada" && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="-rotate-25 text-6xl font-extrabold tracking-widest text-red-500/15">ANULADA</span>
        </div>
      )}

      <div className="flex items-start justify-between gap-4 border-b-2 border-primary pb-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
            <Pill className="size-4.5" />
          </span>
          <div>
            <p className="text-base font-bold leading-tight">{contexto?.clinica || "Receta digital"}</p>
            <p className="text-[11px] uppercase tracking-wide text-neutral-500">
              {contexto?.clinica ? "Receta digital" : "Prescripción médica"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold">{r.numero}</p>
          <p className="text-[11px] text-neutral-500">Fecha: {formatearFecha(r.fecha)}</p>
          {r.vencimiento && <p className="text-[11px] text-neutral-500">Válida hasta: {formatearFecha(r.vencimiento)}</p>}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg bg-neutral-50 p-3 text-xs">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Paciente</p>
          <p className="mt-0.5 font-semibold">{contexto?.paciente || "—"}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Profesional</p>
          <p className="mt-0.5 font-semibold">{r.profesional || "—"}</p>
          {r.matricula && <p className="text-neutral-500">Mat. {r.matricula}</p>}
        </div>
      </div>

      {r.diagnostico && (
        <div className="mt-3 text-xs">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Diagnóstico</p>
          <p className="mt-0.5">{r.diagnostico}</p>
        </div>
      )}

      <div className="mt-4">
        <p className="text-2xl font-bold italic text-primary">Rp/</p>
        <ol className="mt-1 divide-y divide-neutral-200">
          {r.medicamentos.map((m, i) => (
            <li key={i} className="flex items-start gap-3 py-2">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {m.nombre}
                  {m.presentacion && <span className="font-normal text-neutral-500"> · {m.presentacion}</span>}
                </p>
                <p className="text-xs text-neutral-500">
                  {[m.via, `Cantidad: ${m.cantidad}`].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-0.5 text-xs">{m.posologia}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {r.indicaciones && (
        <div className="mt-3 rounded-lg border border-dashed border-neutral-300 p-2.5 text-xs">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Indicaciones</p>
          <p className="mt-0.5 whitespace-pre-line">{r.indicaciones}</p>
        </div>
      )}

      <div className="mt-6 flex items-end justify-between gap-4 border-t border-neutral-200 pt-3">
        <div className="text-[11px] text-neutral-500">
          <p>Estado: {r.estado}</p>
          {/* TODO backend: firma digital y código de verificación de la receta */}
          <p>Firma digital: pendiente de integración</p>
        </div>
        <div className="w-40 text-center">
          <div className="border-t border-neutral-400 pt-1 text-[11px]">
            <p className="font-semibold">{r.profesional || "Profesional"}</p>
            {r.matricula && <p className="text-neutral-500">Mat. {r.matricula}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* HTML de la receta para imprimir / guardar como PDF. Usa la misma tipografía de la app. */
function htmlReceta(r: RecetaPaciente, contexto?: ContextoPaciente) {
  const fuente = getComputedStyle(document.body).fontFamily;
  const filas = r.medicamentos
    .map(
      (m, i) => `
      <tr>
        <td class="n">${i + 1}</td>
        <td>
          <strong>${escapar(m.nombre)}</strong>${m.presentacion ? ` · ${escapar(m.presentacion)}` : ""}${m.via ? ` · ${escapar(m.via)}` : ""}
          <div class="s">${escapar(m.posologia)}</div>
        </td>
        <td class="c">× ${m.cantidad}</td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Receta ${escapar(r.numero)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body { font-family: ${fuente}; color: #171717; font-size: 13px; margin: 0; position: relative; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #6d28d9; padding-bottom: 10px; }
  .top h1 { font-size: 18px; margin: 0; }
  .top small { color: #737373; text-transform: uppercase; letter-spacing: .05em; font-size: 10px; }
  .der { text-align: right; font-size: 11px; color: #737373; }
  .der b { display: block; font-size: 14px; color: #171717; }
  .caja { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #fafafa; border-radius: 8px; padding: 10px 12px; margin-top: 12px; font-size: 12px; }
  .et { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #737373; font-weight: 600; }
  .rp { font-size: 26px; font-weight: 700; font-style: italic; color: #6d28d9; margin: 18px 0 2px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 8px 4px; border-bottom: 1px solid #e5e5e5; vertical-align: top; }
  td.n { width: 24px; color: #6d28d9; font-weight: 700; }
  td.c { width: 60px; text-align: right; color: #737373; }
  .s { font-size: 12px; margin-top: 2px; }
  .ind { border: 1px dashed #d4d4d4; border-radius: 8px; padding: 8px 10px; margin-top: 14px; font-size: 12px; white-space: pre-line; }
  .pie { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 48px; border-top: 1px solid #e5e5e5; padding-top: 10px; font-size: 11px; color: #737373; }
  .firma { width: 190px; text-align: center; border-top: 1px solid #a3a3a3; padding-top: 4px; color: #171717; }
  .anulada { position: fixed; top: 40%; left: 0; right: 0; text-align: center; font-size: 90px; font-weight: 800; letter-spacing: .1em; color: rgba(239,68,68,.15); transform: rotate(-25deg); }
</style>
</head>
<body>
  ${r.estado === "Anulada" ? '<div class="anulada">ANULADA</div>' : ""}
  <div class="top">
    <div>
      <h1>${escapar(contexto?.clinica || "Receta digital")}</h1>
      <small>${contexto?.clinica ? "Receta digital" : "Prescripción médica"}</small>
    </div>
    <div class="der">
      <b>${escapar(r.numero)}</b>
      Fecha: ${escapar(formatearFecha(r.fecha))}
      ${r.vencimiento ? `<br/>Válida hasta: ${escapar(formatearFecha(r.vencimiento))}` : ""}
    </div>
  </div>

  <div class="caja">
    <div><div class="et">Paciente</div><strong>${escapar(contexto?.paciente || "—")}</strong></div>
    <div>
      <div class="et">Profesional</div><strong>${escapar(r.profesional || "—")}</strong>
      ${r.matricula ? `<div>Mat. ${escapar(r.matricula)}</div>` : ""}
    </div>
  </div>

  ${r.diagnostico ? `<p style="margin-top:12px;font-size:12px"><span class="et">Diagnóstico</span><br/>${escapar(r.diagnostico)}</p>` : ""}

  <div class="rp">Rp/</div>
  <table>${filas}</table>

  ${r.indicaciones ? `<div class="ind"><div class="et">Indicaciones</div>${escapar(r.indicaciones)}</div>` : ""}

  <div class="pie">
    <div>Estado: ${escapar(r.estado)}<br/>Firma digital: pendiente de integración</div>
    <div class="firma"><strong>${escapar(r.profesional || "Profesional")}</strong>${r.matricula ? `<br/>Mat. ${escapar(r.matricula)}` : ""}</div>
  </div>
</body>
</html>`;
}

/* TODO backend: reemplazar por GET /pacientes/:id/recetas/:recetaId/pdf (PDF firmado digitalmente).
   Mientras tanto se abre el diálogo de impresión del navegador (opción "Guardar como PDF"). */
function imprimirReceta(r: RecetaPaciente, contexto?: ContextoPaciente) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = win?.document;
  if (!win || !doc) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(htmlReceta(r, contexto));
  doc.close();

  const limpiar = () => iframe.remove();
  win.onafterprint = limpiar;
  window.setTimeout(() => {
    win.focus();
    win.print();
  }, 250);
  window.setTimeout(limpiar, 120000);
}

function RecetaVisor({
  receta,
  contexto,
  onClose,
  onImprimir,
  onEnviar,
}: {
  receta: RecetaPaciente;
  contexto?: ContextoPaciente;
  onClose: () => void;
  onImprimir: () => void;
  onEnviar: () => void;
}) {
  const [zoom, setZoom] = useState(1);

  return (
    <Modal title={`Receta ${receta.numero}`} onClose={onClose} ancho="max-w-3xl">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <ControlesZoom zoom={zoom} setZoom={setZoom} />
        {receta.estado !== "Anulada" && (
          <div className="flex flex-wrap items-center gap-1.5">
            <BotonMini icon={Download} label="Descargar PDF" onClick={onImprimir} />
            <BotonMini icon={Printer} label="Imprimir" onClick={onImprimir} />
            <BotonMini icon={Mail} label="Enviar por correo" onClick={onEnviar} />
          </div>
        )}
      </div>
      <div className="max-h-[64vh] overflow-auto rounded-xl border border-border bg-muted/40 p-3">
        <div style={{ zoom }} className="mx-auto w-[560px]">
          <RecetaDocumento receta={receta} contexto={contexto} />
        </div>
      </div>
    </Modal>
  );
}

function EnviarRecetaForm({
  receta,
  emailInicial,
  onSubmit,
  onCancel,
}: {
  receta: RecetaPaciente;
  emailInicial: string;
  onSubmit: (d: { email: string; asunto: string; mensaje: string }) => void;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState(emailInicial);
  const [asunto, setAsunto] = useState(`Receta digital ${receta.numero}`);
  const [mensaje, setMensaje] = useState("");

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ email: email.trim(), asunto: asunto.trim(), mensaje: mensaje.trim() });
  };

  return (
    <form onSubmit={enviar} className="space-y-2.5">
      <Field label="Correo del paciente *">
        <input autoFocus required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} placeholder="paciente@correo.com" />
      </Field>
      <Field label="Asunto">
        <input value={asunto} onChange={(e) => setAsunto(e.target.value)} className={INPUT} />
      </Field>
      <Field label="Mensaje">
        <textarea rows={3} value={mensaje} onChange={(e) => setMensaje(e.target.value)} className={TEXTAREA} placeholder="Mensaje opcional para el paciente…" />
      </Field>
      <div className="flex items-center gap-2 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
        <Paperclip className="size-3.5 shrink-0 text-primary" />
        Se adjunta la receta {receta.numero} en PDF.
      </div>
      <Acciones etiqueta="Enviar receta" onCancel={onCancel} />
    </form>
  );
}

function RecetasSec({ datos, cambiar, onToast, contexto }: PropsSeccion) {
  const [abierto, setAbierto] = useState(false);
  const [verId, setVerId] = useState<number | null>(null);
  const [enviarId, setEnviarId] = useState<number | null>(null);
  const lista = [...datos.recetas].sort((a, b) => `${b.fecha}${b.id}`.localeCompare(`${a.fecha}${a.id}`));

  const recetaVista = datos.recetas.find((r) => r.id === verId) ?? null;
  const recetaEnvio = datos.recetas.find((r) => r.id === enviarId) ?? null;

  const cambiarEstado = (r: RecetaPaciente, estado: EstadoReceta) => {
    // TODO backend: PATCH /pacientes/:id/recetas/:recetaId { estado }
    cambiar("recetas", (prev) => prev.map((x) => (x.id === r.id ? { ...x, estado } : x)));
    onToast(`${r.numero}: ${estado.toLowerCase()}`);
  };

  const descargar = (r: RecetaPaciente) => {
    imprimirReceta(r, contexto);
    onToast(`${r.numero}: elegí "Guardar como PDF" para descargarla`);
  };

  return (
    <div className="space-y-3">
      <Encabezado
        icon={Pill}
        titulo="Receta digital"
        descripcion="Prescripciones emitidas al paciente, con medicamentos, posología e indicaciones."
        etiquetaBoton="Nueva receta digital"
        onAgregar={() => setAbierto(true)}
      />
      {lista.length === 0 ? (
        <EstadoVacio
          icon={Pill}
          titulo="Sin recetas digitales emitidas"
          texto="Cada receta pasa por estos estados:"
          chips={ESTADOS_RECETA}
        />
      ) : (
        <ul className="space-y-2.5">
          {lista.map((r) => (
            <li key={r.id} className={ITEM}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{r.numero}</p>
                  <span className="text-[11px] text-muted-foreground">{formatearFecha(r.fecha)}</span>
                  <Badge tono={TONO_RECETA[r.estado]}>{r.estado}</Badge>
                </div>
                <BotonBorrar
                  etiqueta="Eliminar receta"
                  onClick={() => {
                    // TODO backend: DELETE /pacientes/:id/recetas/:recetaId
                    cambiar("recetas", (prev) => prev.filter((x) => x.id !== r.id));
                    onToast("Receta eliminada");
                  }}
                />
              </div>

              <p className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
                {r.profesional && <span>{r.profesional}</span>}
                {r.matricula && <span>Mat. {r.matricula}</span>}
                {r.vencimiento && <span>Válida hasta {formatearFecha(r.vencimiento)}</span>}
              </p>
              {r.diagnostico && <p className="mt-0.5 text-xs text-muted-foreground">Diagnóstico: {r.diagnostico}</p>}

              <ul className="mt-2 divide-y divide-border rounded-lg border border-border bg-background/70 text-xs">
                {r.medicamentos.map((m, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 px-2.5 py-1.5">
                    <span className="min-w-0">
                      <span className="font-semibold">{m.nombre}</span>
                      {m.presentacion && <span className="text-muted-foreground"> · {m.presentacion}</span>}
                      {m.via && <span className="text-muted-foreground"> · {m.via}</span>}
                      <span className="mt-0.5 block text-muted-foreground">{m.posologia}</span>
                    </span>
                    <span className="shrink-0 text-muted-foreground">× {m.cantidad}</span>
                  </li>
                ))}
              </ul>

              {r.indicaciones && <p className="mt-1.5 text-xs italic text-muted-foreground">{r.indicaciones}</p>}

              <div className="mt-2 flex flex-wrap gap-1.5">
                <BotonMini icon={Eye} label="Ver receta" onClick={() => setVerId(r.id)} />
                {r.estado !== "Anulada" && (
                  <>
                    <BotonMini icon={Download} label="Descargar PDF" onClick={() => descargar(r)} />
                    <BotonMini icon={Mail} label="Enviar por correo" onClick={() => setEnviarId(r.id)} />
                  </>
                )}
                {r.estado === "Borrador" && <BotonMini icon={Check} label="Emitir" onClick={() => cambiarEstado(r, "Emitida")} />}
                {r.estado === "Emitida" && <BotonMini icon={Check} label="Dispensada" onClick={() => cambiarEstado(r, "Dispensada")} />}
                {(r.estado === "Borrador" || r.estado === "Emitida") && (
                  <BotonMini icon={X} label="Anular" onClick={() => cambiarEstado(r, "Anulada")} />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {abierto && (
        <Modal title="Nueva receta digital" onClose={() => setAbierto(false)}>
          <RecetaForm
            onCancel={() => setAbierto(false)}
            onSubmit={(nueva) => {
              // TODO backend: POST /pacientes/:id/recetas (el número y la firma digital los asigna el servidor)
              const siguiente = datos.recetas.reduce((max, r) => Math.max(max, Number(r.numero.replace(/\D/g, "")) || 0), 0) + 1;
              const numero = `RC-${String(siguiente).padStart(4, "0")}`;
              const id = Date.now();
              cambiar("recetas", (prev) => [...prev, { ...nueva, id, numero, estado: "Borrador" as const }]);
              setAbierto(false);
              setVerId(id);
              onToast(`Receta ${numero} creada`);
            }}
          />
        </Modal>
      )}

      {recetaVista && (
        <RecetaVisor
          receta={recetaVista}
          contexto={contexto}
          onClose={() => setVerId(null)}
          onImprimir={() => descargar(recetaVista)}
          onEnviar={() => {
            setVerId(null);
            setEnviarId(recetaVista.id);
          }}
        />
      )}

      {recetaEnvio && (
        <Modal title={`Enviar ${recetaEnvio.numero} por correo`} onClose={() => setEnviarId(null)}>
          <EnviarRecetaForm
            receta={recetaEnvio}
            emailInicial={contexto?.email ?? ""}
            onCancel={() => setEnviarId(null)}
            onSubmit={({ email }) => {
              // TODO backend: POST /pacientes/:id/recetas/:recetaId/enviar { email, asunto, mensaje }
              setEnviarId(null);
              onToast(`${recetaEnvio.numero}: envío a ${email} pendiente de integración`);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

/* ───────────── Estudios y diagnóstico por imagen ───────────── */

function iconoEstudio(tipo: string): LucideIcon {
  if (tipo.startsWith("Fotografía")) return Images;
  if (tipo.startsWith("Tomografía")) return Activity;
  return FileText;
}

function VistaEstudio({ estudio, alto = "h-28" }: { estudio: EstudioPaciente | null; alto?: string }) {
  const Icono = estudio ? iconoEstudio(estudio.tipo) : Images;
  return (
    <div className={`grid ${alto} place-items-center overflow-hidden rounded-lg border border-border bg-muted/40`}>
      {estudio && estudio.url && esImagen(estudio.archivoNombre) ? (
        <img src={estudio.url} alt={estudio.tipo} className="h-full w-full object-contain" />
      ) : (
        <div className="text-center text-muted-foreground">
          <Icono className="mx-auto size-7 text-primary/60" />
          <p className="mt-1 text-[11px]">Sin imagen adjunta</p>
        </div>
      )}
    </div>
  );
}

function EstudioForm({
  tratamientos,
  onSubmit,
  onCancel,
}: {
  tratamientos: TratamientoPaciente[];
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
  const [estadoInforme, setEstadoInforme] = useState<EstadoInforme>("Sin informar");
  const [tratamientoId, setTratamientoId] = useState<number | null>(null);

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
      estadoInforme,
      tratamientoId,
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
        <Field label="Estado de informe">
          <SelectField value={estadoInforme} onChange={(v) => setEstadoInforme(v as EstadoInforme)} options={ESTADOS_INFORME} />
        </Field>
        {tratamientos.length > 0 && (
          <Field label="Vincular a tratamiento">
            <SelectId
              value={tratamientoId}
              onChange={setTratamientoId}
              opciones={tratamientos.map((t) => ({ id: t.id, label: t.pieza ? `${t.nombre} · pieza ${t.pieza}` : t.nombre }))}
              placeholder="Sin vincular"
            />
          </Field>
        )}
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

function VisorEstudio({
  estudio,
  anotaciones,
  onClose,
}: {
  estudio: EstudioPaciente;
  anotaciones: Anotacion[];
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);

  return (
    <Modal title={estudio.tipo} onClose={onClose} ancho="max-w-3xl">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <ControlesZoom zoom={zoom} setZoom={setZoom} />
        {estudio.url && <BotonMini icon={ExternalLink} label="Abrir en pestaña" onClick={() => window.open(estudio.url, "_blank")} />}
      </div>
      <div className="max-h-[48vh] overflow-auto rounded-xl border border-border bg-muted/40 p-3">
        <div style={{ zoom }} className="mx-auto w-full max-w-md">
          <VistaEstudio estudio={estudio} alto="h-64" />
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tono={TONO_INFORME[estudio.estadoInforme]}>{estudio.estadoInforme}</Badge>
          {estudio.zona && <Badge tono="primary">{estudio.zona}</Badge>}
          <span className="text-[11px] text-muted-foreground">
            {[formatearFecha(estudio.fecha), estudio.solicitante, estudio.archivoNombre].filter(Boolean).join(" · ")}
          </span>
        </div>
        <p className="whitespace-pre-line text-sm">{estudio.diagnostico}</p>

        {anotaciones.length > 0 && (
          <ul className="divide-y divide-border rounded-lg border border-border bg-background/70 text-xs">
            {anotaciones.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 px-2.5 py-1.5">
                <span className="min-w-0">
                  <span className="font-semibold">{a.tipoMedicion}</span>
                  <span className="mt-0.5 block text-muted-foreground">{a.observacion}</span>
                </span>
                <span className="shrink-0 font-bold text-primary">{a.valor}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

/* Galería */
function GaleriaTab({
  estudios,
  onVer,
  onBorrar,
}: {
  estudios: EstudioPaciente[];
  onVer: (id: number) => void;
  onBorrar: (s: EstudioPaciente) => void;
}) {
  if (estudios.length === 0) {
    return (
      <EstadoVacio
        icon={Images}
        titulo="Sin estudios cargados"
        texto="Tipos de estudio disponibles:"
        chips={TIPOS_ESTUDIO}
      />
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Estudios del paciente</p>
          <p className="text-xs text-muted-foreground">Ordenados del más reciente al más antiguo.</p>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
          {estudios.length} {estudios.length === 1 ? "estudio" : "estudios"}
        </span>
      </div>

      <ul className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
        {estudios.map((s) => {
          const Icono = iconoEstudio(s.tipo);
          const tieneArchivo = Boolean(s.url && s.archivoNombre);

          return (
            <li
              key={s.id}
              className={`${ESTUDIO_ITEM} hover:-translate-y-0.5`}
            >
              <div className="flex min-h-[108px] gap-2.5 p-2">
                <button
                  type="button"
                  onClick={() => onVer(s.id)}
                  aria-label={`Ver ${s.tipo}`}
                  className="group relative h-[92px] w-[112px] shrink-0 overflow-hidden rounded-lg border border-border/80 bg-muted/30 transition-all duration-200 hover:border-primary/40 hover:bg-primary/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:w-[118px]"
                >
                  {tieneArchivo && esImagen(s.archivoNombre) ? (
                    <img
                      src={s.url}
                      alt={s.tipo}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-center">
                      <div>
                        <span className="mx-auto grid size-8 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/10">
                          <Icono className="size-3.5" />
                        </span>
                        <p className="mt-1 text-[9px] font-medium text-muted-foreground">
                          {tieneArchivo ? "Archivo adjunto" : "Sin imagen"}
                        </p>
                      </div>
                    </div>
                  )}
                  <span className="absolute bottom-1 right-1 rounded-full border border-border/70 bg-background/90 px-1.5 py-0.5 text-[9px] font-semibold text-foreground shadow-sm backdrop-blur transition-colors group-hover:border-primary/30 group-hover:text-primary">
                    Ver
                  </span>
                </button>

                <div className="min-w-0 flex-1 py-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold leading-5 text-foreground">{s.tipo}</p>
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                        {[formatearFecha(s.fecha), s.zona].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <Badge tono={TONO_INFORME[s.estadoInforme]}>{s.estadoInforme}</Badge>
                  </div>

                  <p className="mt-1.5 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                    {s.diagnostico || "Sin informe o diagnóstico registrado."}
                  </p>

                  <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-border/60 pt-1.5">
                    <div className="min-w-0 text-[9px] text-muted-foreground">
                      {s.solicitante ? (
                        <span className="block truncate">Solicita: {s.solicitante}</span>
                      ) : s.archivoNombre ? (
                        <span className="block truncate">{s.archivoNombre}</span>
                      ) : (
                        <span>Sin archivo adjunto</span>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <BotonMini compacto icon={Eye} label="Abrir" onClick={() => onVer(s.id)} />
                      <BotonBorrar compacto etiqueta="Eliminar estudio" onClick={() => onBorrar(s)} />
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* Comparar estudios */
function CompararTab({ estudios }: { estudios: EstudioPaciente[] }) {
  const ordenados = [...estudios].sort((a, b) => `${a.fecha}${a.id}`.localeCompare(`${b.fecha}${b.id}`));
  const [inicialId, setInicialId] = useState<number | null>(null);
  const [actualId, setActualId] = useState<number | null>(null);

  if (ordenados.length < 2) {
    return (
      <EstadoVacio
        icon={GitCompare}
        titulo="Comparación de evolución"
        texto="Necesitás al menos dos estudios cargados para compararlos."
      />
    );
  }

  const inicial = ordenados.find((s) => s.id === inicialId) ?? ordenados[0];
  const actual = ordenados.find((s) => s.id === actualId) ?? ordenados[ordenados.length - 1];
  const opciones = ordenados.map((s) => ({ id: s.id, label: `${s.tipo} · ${formatearFecha(s.fecha)}` }));
  const dias = Math.round((new Date(actual.fecha).getTime() - new Date(inicial.fecha).getTime()) / 86400000);

  const Panel = ({ titulo, estudio, valor, onChange }: { titulo: string; estudio: EstudioPaciente; valor: number; onChange: (v: number | null) => void }) => (
    <div className={`${ITEM} space-y-2`}>
      <Field label={titulo}>
        <SelectId value={valor} onChange={onChange} opciones={opciones} />
      </Field>
      <VistaEstudio estudio={estudio} alto="h-40" />
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold">{estudio.tipo}</p>
          <Badge tono={TONO_INFORME[estudio.estadoInforme]}>{estudio.estadoInforme}</Badge>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {[formatearFecha(estudio.fecha), estudio.zona].filter(Boolean).join(" · ")}
        </p>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{estudio.diagnostico}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Comparación de evolución</p>
          <p className="text-xs text-muted-foreground">Elegí dos estudios para comparar la evolución del paciente.</p>
        </div>
        <Badge tono="primary">{Math.abs(dias)} días entre estudios</Badge>
      </div>
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
        <Panel titulo="Estudio inicial" estudio={inicial} valor={inicial.id} onChange={setInicialId} />
        <Panel titulo="Estudio actual" estudio={actual} valor={actual.id} onChange={setActualId} />
      </div>
    </div>
  );
}

/* Anotaciones y mediciones */
function AnotacionesTab({
  datos,
  cambiar,
  onToast,
  onVer,
}: {
  datos: Registros;
  cambiar: Cambiar;
  onToast: (msg: string) => void;
  onVer: (id: number) => void;
}) {
  const [estudioId, setEstudioId] = useState<number | null>(null);
  const [tipoMedicion, setTipoMedicion] = useState(TIPOS_MEDICION[0]);
  const [valor, setValor] = useState("");
  const [observacion, setObservacion] = useState("");
  const [profesional, setProfesional] = useState("");

  if (datos.estudios.length === 0) {
    return (
      <EstadoVacio
        icon={Ruler}
        titulo="Anotaciones y mediciones"
        texto="Cargá un estudio para poder agregar mediciones y observaciones clínicas."
      />
    );
  }

  const estudio = datos.estudios.find((s) => s.id === estudioId) ?? datos.estudios[0];
  const lista = [...datos.anotaciones].sort((a, b) => `${b.fecha}${b.id}`.localeCompare(`${a.fecha}${a.id}`));

  const guardar = (e: FormEvent) => {
    e.preventDefault();
    // TODO backend: POST /pacientes/:id/estudios/:estudioId/anotaciones
    cambiar("anotaciones", (prev) => [
      ...prev,
      {
        id: Date.now(),
        estudioId: estudio.id,
        estudioNombre: estudio.tipo,
        tipoMedicion,
        valor: valor.trim(),
        observacion: observacion.trim(),
        fecha: hoyISO(),
        profesional: profesional.trim(),
      },
    ]);
    setValor("");
    setObservacion("");
    onToast("Anotación guardada");
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold">Anotaciones y mediciones clínicas</p>
        <p className="text-xs text-muted-foreground">Registrá medidas, observaciones y hallazgos sobre cada estudio.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_17rem]">
        <div className={`${ITEM} space-y-2`}>
          <VistaEstudio estudio={estudio} alto="h-52" />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              {[estudio.tipo, formatearFecha(estudio.fecha), estudio.zona].filter(Boolean).join(" · ")}
            </p>
            <BotonMini icon={Eye} label="Abrir visor" onClick={() => onVer(estudio.id)} />
          </div>
        </div>

        <form onSubmit={guardar} className={`${ITEM} space-y-2.5`}>
          <Field label="Estudio">
            <SelectId
              value={estudio.id}
              onChange={setEstudioId}
              opciones={datos.estudios.map((s) => ({ id: s.id, label: `${s.tipo} · ${formatearFecha(s.fecha)}` }))}
            />
          </Field>
          <Field label="Tipo de medición">
            <SelectField value={tipoMedicion} onChange={setTipoMedicion} options={TIPOS_MEDICION} />
          </Field>
          <Field label="Medición *">
            <input required value={valor} onChange={(e) => setValor(e.target.value)} className={INPUT} placeholder="Ej: 12.4 mm" />
          </Field>
          <Field label="Profesional">
            <input list="dl-profesionales" value={profesional} onChange={(e) => setProfesional(e.target.value)} className={INPUT} placeholder="Nombre del profesional" />
          </Field>
          <Field label="Observación clínica *">
            <textarea required rows={3} value={observacion} onChange={(e) => setObservacion(e.target.value)} className={TEXTAREA} placeholder="Hallazgos, seguimiento…" />
          </Field>
          <button type="submit" className={`${BTN_PRIMARIO} w-full`}>
            <Plus className="size-4" />
            Guardar anotación
          </button>
        </form>
      </div>

      {lista.length > 0 && (
        <ul className="space-y-2.5">
          {lista.map((a) => (
            <li key={a.id} className={`${ITEM} flex items-start gap-3`}>
              <span className={`${CIRCULO_ICONO} size-9`}>
                <Ruler className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{a.tipoMedicion}</p>
                  <Badge tono="primary">{a.valor}</Badge>
                  <span className="text-[11px] text-muted-foreground">{a.estudioNombre}</span>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{a.observacion}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {[a.profesional, formatearFecha(a.fecha)].filter(Boolean).join(" · ")}
                </p>
              </div>
              <BotonBorrar
                etiqueta="Eliminar anotación"
                onClick={() => {
                  // TODO backend: DELETE /pacientes/:id/anotaciones/:anotacionId
                  cambiar("anotaciones", (prev) => prev.filter((x) => x.id !== a.id));
                  onToast("Anotación eliminada");
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* Estudios vinculados al tratamiento */
function VinculadosTab({
  datos,
  cambiar,
  onToast,
}: {
  datos: Registros;
  cambiar: Cambiar;
  onToast: (msg: string) => void;
}) {
  const vincular = (s: EstudioPaciente, tratamientoId: number | null) => {
    // TODO backend: PATCH /pacientes/:id/estudios/:estudioId { tratamientoId }
    cambiar("estudios", (prev) => prev.map((x) => (x.id === s.id ? { ...x, tratamientoId } : x)));
    onToast(tratamientoId === null ? "Estudio desvinculado" : "Estudio vinculado al tratamiento");
  };

  const sinVincular = datos.estudios.filter(
    (s) => s.tratamientoId === null || !datos.tratamientos.some((t) => t.id === s.tratamientoId),
  );

  if (datos.tratamientos.length === 0) {
    return (
      <EstadoVacio
        icon={Link2}
        titulo="Estudios vinculados al tratamiento"
        texto="Primero agregá un tratamiento para poder vincularle estudios."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold">Estudios vinculados al tratamiento</p>
        <p className="text-xs text-muted-foreground">Asociá cada estudio al tratamiento que lo requiere.</p>
      </div>

      <ul className="space-y-2.5">
        {datos.tratamientos.map((t) => {
          const vinculados = datos.estudios.filter((s) => s.tratamientoId === t.id);
          return (
            <li key={t.id} className={`${ITEM} space-y-2`}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">{t.nombre}</p>
                {t.pieza && <Badge tono="primary">Pieza {t.pieza}</Badge>}
                <Badge tono={TONO_TRATAMIENTO[t.estado]}>{t.estado}</Badge>
                {t.profesional && <span className="text-[11px] text-muted-foreground">{t.profesional}</span>}
              </div>
              {vinculados.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                  Sin estudios vinculados.
                </p>
              ) : (
                <ul className="divide-y divide-border rounded-lg border border-border bg-background/70 text-xs">
                  {vinculados.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 px-2.5 py-1.5">
                      <span className="min-w-0 truncate">
                        <span className="font-semibold">{s.tipo}</span>
                        <span className="text-muted-foreground"> · {formatearFecha(s.fecha)}</span>
                        {s.zona && <span className="text-muted-foreground"> · {s.zona}</span>}
                      </span>
                      <BotonMini icon={X} label="Desvincular" onClick={() => vincular(s, null)} />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {sinVincular.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estudios sin vincular</p>
          <ul className="space-y-2">
            {sinVincular.map((s) => (
              <li key={s.id} className={`${ITEM} grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_14rem]`}>
                <p className="min-w-0 truncate text-sm">
                  <span className="font-semibold">{s.tipo}</span>
                  <span className="text-xs text-muted-foreground"> · {formatearFecha(s.fecha)}</span>
                </p>
                <SelectId
                  value={null}
                  onChange={(v) => {
                    if (v !== null) vincular(s, v);
                  }}
                  opciones={datos.tratamientos.map((t) => ({ id: t.id, label: t.pieza ? `${t.nombre} · pieza ${t.pieza}` : t.nombre }))}
                  placeholder="Vincular a tratamiento…"
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* Diagnóstico */
function DiagnosticoForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (d: Pick<DiagnosticoPaciente, "titulo" | "descripcion" | "pieza" | "profesional" | "observacion">) => void;
  onCancel: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [pieza, setPieza] = useState("");
  const [profesional, setProfesional] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [observacion, setObservacion] = useState("");

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      titulo: titulo.trim(),
      pieza: pieza.trim(),
      profesional: profesional.trim(),
      descripcion: descripcion.trim(),
      observacion: observacion.trim(),
    });
  };

  return (
    <form onSubmit={enviar} className="space-y-2.5">
      <Field label="Diagnóstico *">
        <input autoFocus required value={titulo} onChange={(e) => setTitulo(e.target.value)} className={INPUT} placeholder="Ej: Caries profunda, periodontitis" />
      </Field>
      <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2">
        <Field label="Pieza dental">
          <input value={pieza} onChange={(e) => setPieza(e.target.value)} className={INPUT} placeholder="Ej: 36" />
        </Field>
        <Field label="Profesional">
          <input list="dl-profesionales" value={profesional} onChange={(e) => setProfesional(e.target.value)} className={INPUT} placeholder="Nombre del profesional" />
        </Field>
      </div>
      <Field label="Descripción *">
        <textarea required rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className={TEXTAREA} placeholder="Hallazgos y descripción del diagnóstico…" />
      </Field>
      <Field label="Observación">
        <textarea rows={2} value={observacion} onChange={(e) => setObservacion(e.target.value)} className={TEXTAREA} placeholder="Indicaciones y seguimiento…" />
      </Field>
      <Acciones etiqueta="Guardar diagnóstico" onCancel={onCancel} />
    </form>
  );
}

function DiagnosticoTab({
  datos,
  cambiar,
  onToast,
}: {
  datos: Registros;
  cambiar: Cambiar;
  onToast: (msg: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [filtro, setFiltro] = useState<"todos" | EstadoDiagnostico>("todos");
  const lista = [...datos.diagnosticos].sort((a, b) => `${b.fecha}${b.id}`.localeCompare(`${a.fecha}${a.id}`));

  const activos = datos.diagnosticos.filter((d) => d.estado === "Activo").length;
  const resueltos = datos.diagnosticos.filter((d) => d.estado === "Resuelto").length;
  const visibles = filtro === "todos" ? lista : lista.filter((d) => d.estado === filtro);

  const FILTROS: { id: "todos" | EstadoDiagnostico; label: string; n: number }[] = [
    { id: "todos", label: "Todos", n: datos.diagnosticos.length },
    { id: "Activo", label: "Activos", n: activos },
    { id: "Resuelto", label: "Resueltos", n: resueltos },
  ];

  const cambiarEstado = (d: DiagnosticoPaciente, estado: EstadoDiagnostico) => {
    // TODO backend: PATCH /pacientes/:id/diagnosticos/:diagnosticoId { estado }
    cambiar("diagnosticos", (prev) => prev.map((x) => (x.id === d.id ? { ...x, estado } : x)));
    onToast(`${d.titulo}: ${estado.toLowerCase()}`);
  };

  return (
    <div className="space-y-3">
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className={`${CIRCULO_ICONO} size-10`}>
            <Activity className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">Diagnóstico registrado</p>
            <p className="text-xs text-muted-foreground">Diagnósticos del paciente con su estado y seguimiento.</p>
          </div>
        </div>
        <button type="button" onClick={() => setAbierto(true)} className={BTN_PRIMARIO}>
          <Plus className="size-4" />
          Nuevo diagnóstico
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ResumenCuenta etiqueta="Total" valor={String(datos.diagnosticos.length)} icon={Stethoscope} />
        <ResumenCuenta etiqueta="Activos" valor={String(activos)} icon={Activity} tono="text-primary" />
        <ResumenCuenta etiqueta="Resueltos" valor={String(resueltos)} icon={Check} tono="text-emerald-600" />
      </div>

      {datos.diagnosticos.length === 0 ? (
        <EstadoVacio
          icon={Activity}
          titulo="Sin diagnósticos registrados"
          texto="Cada diagnóstico puede estar:"
          chips={ESTADOS_DIAGNOSTICO}
        />
      ) : (
        <>
          {/* Filtro (sin scroll) */}
          <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-primary/15 bg-primary/5 p-1.5">
            {FILTROS.map((f) => {
              const activo = filtro === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltro(f.id)}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                    activo
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                      : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  }`}
                >
                  {f.label}
                  <span
                    className={`rounded-full px-1.5 text-[10px] font-semibold ${
                      activo ? "bg-white/20 text-primary-foreground" : "bg-primary/10 text-primary"
                    }`}
                  >
                    {f.n}
                  </span>
                </button>
              );
            })}
          </div>

          {visibles.length === 0 ? (
            <EstadoVacio
              icon={Activity}
              titulo={filtro === "Activo" ? "Sin diagnósticos activos" : "Sin diagnósticos resueltos"}
              texto="Cambiá el filtro para ver los demás diagnósticos."
            />
          ) : (
            <ul className="space-y-2.5">
              {visibles.map((d) => {
                const activo = d.estado === "Activo";
                return (
                  <li key={d.id} className={`${ITEM} flex items-start gap-3 pl-4`}>
                    <span
                      aria-hidden
                      className={`absolute inset-y-0 left-0 w-1 ${activo ? "bg-primary" : "bg-emerald-500"}`}
                    />
                    <span className={`${CIRCULO_ICONO} size-10`}>
                      {activo ? <Activity className="size-5" /> : <Check className="size-5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">{d.titulo}</p>
                          {d.pieza && <Badge tono="primary">Pieza {d.pieza}</Badge>}
                          <Badge tono={TONO_DIAGNOSTICO[d.estado]}>{d.estado}</Badge>
                        </div>
                        <BotonBorrar
                          etiqueta="Eliminar diagnóstico"
                          onClick={() => {
                            // TODO backend: DELETE /pacientes/:id/diagnosticos/:diagnosticoId
                            cambiar("diagnosticos", (prev) => prev.filter((x) => x.id !== d.id));
                            onToast("Diagnóstico eliminado");
                          }}
                        />
                      </div>

                      <p className="mt-1 text-sm">{d.descripcion}</p>

                      {d.observacion && (
                        <div className="mt-2 rounded-lg border border-dashed border-primary/25 bg-primary/5 px-2.5 py-1.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Observación
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{d.observacion}</p>
                        </div>
                      )}

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <CalendarDays className="size-3" />
                          {[d.profesional, formatearFecha(d.fecha)].filter(Boolean).join(" · ")}
                        </p>
                        {activo ? (
                          <BotonMini icon={Check} label="Marcar como resuelto" onClick={() => cambiarEstado(d, "Resuelto")} />
                        ) : (
                          <BotonMini icon={Activity} label="Reactivar" onClick={() => cambiarEstado(d, "Activo")} />
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {abierto && (
        <Modal title="Nuevo diagnóstico" onClose={() => setAbierto(false)}>
          <DiagnosticoForm
            onCancel={() => setAbierto(false)}
            onSubmit={(nuevo) => {
              // TODO backend: POST /pacientes/:id/diagnosticos
              cambiar("diagnosticos", (prev) => [
                ...prev,
                { ...nuevo, id: Date.now(), estado: "Activo" as const, fecha: hoyISO() },
              ]);
              setAbierto(false);
              onToast("Diagnóstico guardado");
            }}
          />
        </Modal>
      )}
    </div>
  );
}

/* Sección principal de estudios */
type TabEstudios = "galeria" | "comparar" | "anotaciones" | "vinculados" | "diagnostico";

function EstudiosSec({ datos, cambiar, onToast, contexto }: PropsSeccion) {
  const [abierto, setAbierto] = useState(false);
  const [tab, setTab] = useState<TabEstudios>("galeria");
  const [visorId, setVisorId] = useState<number | null>(null);

  const lista = [...datos.estudios].sort((a, b) => `${b.fecha}${b.id}`.localeCompare(`${a.fecha}${a.id}`));
  const estudioVisor = datos.estudios.find((s) => s.id === visorId) ?? null;
  const informados = datos.estudios.filter((s) => s.estadoInforme === "Informado").length;
  const activos = datos.diagnosticos.filter((d) => d.estado === "Activo").length;

  const TABS: { id: TabEstudios; label: string; icon: LucideIcon }[] = [
    { id: "galeria", label: "Galería", icon: Images },
    { id: "comparar", label: "Comparar", icon: GitCompare },
    { id: "anotaciones", label: "Mediciones", icon: Ruler },
    { id: "vinculados", label: "Tratamiento", icon: Link2 },
    { id: "diagnostico", label: "Diagnóstico", icon: Activity },
  ];

  return (
    <div className="space-y-3">
      <Encabezado
        icon={Images}
        titulo="Estudios y diagnóstico por imagen"
        descripcion="Radiografías, tomografías y fotografías clínicas con comparación, mediciones y diagnóstico."
        etiquetaBoton="Cargar estudio"
        onAgregar={() => setAbierto(true)}
        botonClassName="rounded-lg px-3 py-1.5 text-xs shadow-sm"
      />

      <div className="rounded-xl border border-border/80 bg-card px-3 py-2.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-xs font-semibold text-primary ring-1 ring-primary/10">
            {contexto?.paciente ? iniciales(contexto.paciente) : <HeartPulse className="size-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{contexto?.paciente || "Paciente"}</p>
            <p className="text-[11px] text-muted-foreground">
              {datos.estudios.length} estudios · {informados} informados · {datos.anotaciones.length} mediciones
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground">
              {activos} diagnósticos activos
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/80 bg-card p-1 shadow-sm">
        <div className="grid grid-cols-2 gap-1 md:grid-cols-5">
          {TABS.map((t) => {
            const activa = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex min-h-8 items-center justify-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                  activa
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <t.icon className="size-3.5 shrink-0" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {tab === "galeria" && (
        <GaleriaTab
          estudios={lista}
          onVer={setVisorId}
          onBorrar={(s) => {
            // TODO backend: DELETE /pacientes/:id/estudios/:estudioId
            if (s.url) URL.revokeObjectURL(s.url);
            cambiar("estudios", (prev) => prev.filter((x) => x.id !== s.id));
            cambiar("anotaciones", (prev) => prev.filter((a) => a.estudioId !== s.id));
            onToast("Estudio eliminado");
          }}
        />
      )}
      {tab === "comparar" && <CompararTab estudios={datos.estudios} />}
      {tab === "anotaciones" && <AnotacionesTab datos={datos} cambiar={cambiar} onToast={onToast} onVer={setVisorId} />}
      {tab === "vinculados" && <VinculadosTab datos={datos} cambiar={cambiar} onToast={onToast} />}
      {tab === "diagnostico" && <DiagnosticoTab datos={datos} cambiar={cambiar} onToast={onToast} />}

      {estudioVisor && (
        <VisorEstudio
          estudio={estudioVisor}
          anotaciones={datos.anotaciones.filter((a) => a.estudioId === estudioVisor.id)}
          onClose={() => setVisorId(null)}
        />
      )}

      {abierto && (
        <Modal title="Cargar estudio" onClose={() => setAbierto(false)}>
          <EstudioForm
            tratamientos={datos.tratamientos}
            onCancel={() => setAbierto(false)}
            onSubmit={(nuevo) => {
              // TODO backend: POST /pacientes/:id/estudios
              cambiar("estudios", (prev) => [...prev, { ...nuevo, id: Date.now() }]);
              setAbierto(false);
              setTab("galeria");
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
              const siguiente = datos.presupuestos.reduce((max, r) => Math.max(max, Number(r.numero.replace(/\D/g, "")) || 0), 0) + 1;
              const numero = `PR-${String(siguiente).padStart(4, "0")}`;
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

/* ───────────── Laboratorio ───────────── */

function LaboratorioForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (t: Omit<TrabajoLaboratorio, "id" | "estado">) => void;
  onCancel: () => void;
}) {
  const [tipo, setTipo] = useState(TIPOS_TRABAJO_LAB[0]);
  const [pieza, setPieza] = useState("");
  const [material, setMaterial] = useState(MATERIALES_LAB[0]);
  const [proveedor, setProveedor] = useState("");
  const [fechaEnvio, setFechaEnvio] = useState(hoyISO());
  const [fechaEntregaEstimada, setFechaEntregaEstimada] = useState("");
  const [costo, setCosto] = useState("");
  const [notas, setNotas] = useState("");

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      tipo,
      pieza: pieza.trim(),
      material,
      proveedor: proveedor.trim(),
      fechaEnvio,
      fechaEntregaEstimada,
      costo: Number(costo) || 0,
      notas: notas.trim(),
    });
  };

  return (
    <form onSubmit={enviar} className="space-y-2.5">
      <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2">
        <Field label="Tipo de trabajo *">
          <SelectField value={tipo} onChange={setTipo} options={TIPOS_TRABAJO_LAB} />
        </Field>
        <Field label="Pieza / zona">
          <input value={pieza} onChange={(e) => setPieza(e.target.value)} className={INPUT} placeholder="Ej: 21, arcada superior" />
        </Field>
        <Field label="Material">
          <SelectField value={material} onChange={setMaterial} options={MATERIALES_LAB} />
        </Field>
        <Field label="Laboratorio proveedor">
          <input list="dl-laboratorios" value={proveedor} onChange={(e) => setProveedor(e.target.value)} className={INPUT} placeholder="Nombre del laboratorio" />
        </Field>
        <Field label="Fecha de envío">
          <input type="date" value={fechaEnvio} onChange={(e) => setFechaEnvio(e.target.value)} className={INPUT} />
        </Field>
        <Field label="Entrega estimada">
          <input type="date" value={fechaEntregaEstimada} onChange={(e) => setFechaEntregaEstimada(e.target.value)} className={INPUT} />
        </Field>
        <Field label="Costo (ARS)">
          <input type="number" min={0} value={costo} onChange={(e) => setCosto(e.target.value)} className={INPUT} placeholder="0" />
        </Field>
      </div>
      <Field label="Notas">
        <textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} className={TEXTAREA} placeholder="Toma de color, especificaciones, observaciones…" />
      </Field>
      <Acciones etiqueta="Enviar a laboratorio" onCancel={onCancel} />
    </form>
  );
}

function LaboratorioSec({ datos, cambiar, onToast }: PropsSeccion) {
  const [abierto, setAbierto] = useState(false);
  const lista = [...datos.laboratorio].sort((a, b) => `${b.fechaEnvio}${b.id}`.localeCompare(`${a.fechaEnvio}${a.id}`));

  const enProceso = datos.laboratorio.filter((t) => t.estado === "Enviado" || t.estado === "En proceso").length;
  const listos = datos.laboratorio.filter((t) => t.estado === "Listo para retirar").length;
  const entregados = datos.laboratorio.filter((t) => t.estado === "Entregado").length;

  const cambiarEstado = (t: TrabajoLaboratorio, estado: EstadoLaboratorio) => {
    // TODO backend: PATCH /pacientes/:id/laboratorio/:trabajoId { estado }
    cambiar("laboratorio", (prev) => prev.map((x) => (x.id === t.id ? { ...x, estado } : x)));
    onToast(`${t.tipo}: ${estado.toLowerCase()}`);
  };

  return (
    <div className="space-y-3">
      <Encabezado
        icon={FlaskConical}
        titulo="Laboratorio"
        descripcion="Trabajos enviados al laboratorio dental: coronas, prótesis, placas y otros elementos."
        etiquetaBoton="Enviar a laboratorio"
        onAgregar={() => setAbierto(true)}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ResumenCuenta etiqueta="En proceso" valor={String(enProceso)} icon={Truck} tono="text-primary" />
        <ResumenCuenta etiqueta="Listos para retirar" valor={String(listos)} icon={PackageCheck} tono="text-emerald-600" />
        <ResumenCuenta etiqueta="Entregados" valor={String(entregados)} icon={Check} />
      </div>

      {lista.length === 0 ? (
        <EstadoVacio
          icon={FlaskConical}
          titulo="Sin trabajos de laboratorio"
          texto="Cada trabajo pasa por estos estados:"
          chips={ESTADOS_LABORATORIO}
        />
      ) : (
        <ul className="space-y-2.5">
          {lista.map((t) => (
            <li key={t.id} className={`${ITEM} flex flex-wrap items-center gap-3`}>
              <span className={`${CIRCULO_ICONO} size-10`}>
                <FlaskConical className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{t.tipo}</p>
                  {t.pieza && <Badge tono="primary">Pieza {t.pieza}</Badge>}
                  <Badge tono={TONO_LABORATORIO[t.estado]}>{t.estado}</Badge>
                </div>
                <p className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
                  {t.material && <span>{t.material}</span>}
                  {t.proveedor && <span>{t.proveedor}</span>}
                  <span>Enviado: {formatearFecha(t.fechaEnvio)}</span>
                  {t.fechaEntregaEstimada && <span>Entrega estimada: {formatearFecha(t.fechaEntregaEstimada)}</span>}
                </p>
                {t.notas && <p className="mt-0.5 text-xs italic text-muted-foreground">{t.notas}</p>}
              </div>
              {t.costo > 0 && <span className="text-sm font-bold">{formatearMonto(t.costo)}</span>}
              <div className="flex flex-wrap items-center gap-1.5">
                {t.estado === "Enviado" && <BotonMini icon={Truck} label="En proceso" onClick={() => cambiarEstado(t, "En proceso")} />}
                {t.estado === "En proceso" && <BotonMini icon={PackageCheck} label="Listo para retirar" onClick={() => cambiarEstado(t, "Listo para retirar")} />}
                {t.estado === "Listo para retirar" && <BotonMini icon={Check} label="Entregado" onClick={() => cambiarEstado(t, "Entregado")} />}
                <BotonBorrar
                  etiqueta="Eliminar trabajo de laboratorio"
                  onClick={() => {
                    // TODO backend: DELETE /pacientes/:id/laboratorio/:trabajoId
                    cambiar("laboratorio", (prev) => prev.filter((x) => x.id !== t.id));
                    onToast("Trabajo de laboratorio eliminado");
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {abierto && (
        <Modal title="Enviar a laboratorio" onClose={() => setAbierto(false)}>
          <LaboratorioForm
            onCancel={() => setAbierto(false)}
            onSubmit={(nuevo) => {
              // TODO backend: POST /pacientes/:id/laboratorio
              cambiar("laboratorio", (prev) => [...prev, { ...nuevo, id: Date.now(), estado: "Enviado" as const }]);
              setAbierto(false);
              onToast("Trabajo enviado a laboratorio");
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
  contexto,
}: {
  seccion: SeccionRegistros;
  datos: Registros;
  cambiar: Cambiar;
  onToast: (msg: string) => void;
  contexto?: ContextoPaciente;
}) {
  const props = { datos, cambiar, onToast, contexto };
  return (
    <>
      <Datalists />
      {seccion === "historia" && <HistoriaSec {...props} />}
      {seccion === "tratamientos" && <TratamientosSec {...props} />}
      {seccion === "documentos" && <DocumentosSec {...props} />}
      {seccion === "recetas" && <RecetasSec {...props} />}
      {seccion === "estudios" && <EstudiosSec {...props} />}
      {seccion === "presupuestos" && <PresupuestosSec {...props} />}
      {seccion === "turnos" && <TurnosSec {...props} />}
      {seccion === "cuenta" && <CuentaSec {...props} />}
      {seccion === "profesionales" && <ProfesionalesSec {...props} />}
      {seccion === "laboratorio" && <LaboratorioSec {...props} />}
    </>
  );
}