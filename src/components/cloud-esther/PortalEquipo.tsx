import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Box,
  Briefcase,
  Coins,
  Landmark,
  LayoutDashboard,
  ClipboardList,
  Pill as PillIcon,
  Receipt,
  ReceiptText,
  ScanLine,
  Sparkles,
  UserCog,
  CalendarDays,
  CalendarPlus,
  Check,
  CheckCheck,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Eye,
  FileText,
  Home,
  KeyRound,
  LogIn,
  LogOut,
  Mail,
  MessageCircle,
  Package,
  Phone,
  Search,
  ShieldCheck,
  Stethoscope,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BrandMark } from "@/components/cloud-esther/AppShell";
import { HeroParallax } from "@/components/cloud-esther/HeroParallax";
import {
  useRegistrosPacientes,
  useTodosLosRegistros,
} from "@/components/cloud-esther/PacienteSecciones";
import { useNotificaciones } from "@/components/cloud-esther/useNotificaciones";
import { CloudEstherProvider, MODULES, availableIn, useCloudEsther } from "@/lib/cloud-esther/data";
import { useSesion } from "@/lib/cloud-esther/auth-store";
import { useEquipo } from "@/lib/cloud-esther/equipo-store";
import type { TeamMember, TeamRole } from "@/lib/cloud-esther/equipo-profesional-data";
import { usePacientes, type Paciente } from "@/lib/cloud-esther/pacientes";
import {
  TRATAMIENTOS as PRACTICAS,
  setTurnosStore,
  storeAgenda,
  type Turno,
} from "@/lib/cloud-esther/agenda-store";
import { cambiarEstadoNotif } from "@/lib/cloud-esther/notificaciones-store";
import {
  nivelStock,
  registrarMovimiento,
  registrarPedidoEquipo,
  storeInventario,
} from "@/lib/cloud-esther/inventario-store";
import { SUCURSALES } from "@/lib/cloud-esther/agenda-store";
import { ComunicadosPortal, MiRRHHPortal } from "@/components/cloud-esther/rrhh/PortalRRHH";
import { marcas, storeRRHH } from "@/lib/cloud-esther/rrhh-store";
import {
  CHECKLIST_GABINETE,
  asegurarAcceso,
  guardarSesionEquipo,
  leerSesionEquipo,
  registrarEventoEquipo,
  setEquipoPortal,
  storeEquipoPortal,
} from "@/lib/cloud-esther/portal-equipo-store";
import { normalizarBusqueda } from "@/lib/utils";
import { EspacioAdministrativo } from "@/components/cloud-esther/portal-equipo/EspacioAdministrativo";
import { EstherFlotante } from "@/components/cloud-esther/esther-ai/EstherFlotante";
import { estherPoses } from "@/components/cloud-esther/esther-ai/esther-states";
import {
  EncabezadoSeccion,
  KpiPortal,
  PortalShell,
  TarjetaPortal,
  type GrupoPortal,
} from "@/components/cloud-esther/portales/PortalShell";
import { usePreferenciasPortal } from "@/components/cloud-esther/portales/preferencias";
import {
  NotificacionesUniversales,
  type NotifUniversal,
} from "@/components/cloud-esther/portales/NotificacionesUniversales";
import { AutorizacionesPanel } from "@/components/cloud-esther/portales/AutorizacionesPanel";
import { AgendaPortal } from "@/components/cloud-esther/portales/equipo/AgendaPortal";
import {
  PacienteClinico,
  type PestanaClinica,
} from "@/components/cloud-esther/portales/equipo/PacienteClinico";
import {
  ConfiguracionProfesional,
  IAPortal,
  JornadaPortal,
  MensajesPortal,
  ReportesPortal,
} from "@/components/cloud-esther/portales/equipo/SeccionesEquipo";
import {
  AuditoriaPortal,
  CajaPortal,
  LiquidacionesPortal,
  PacientesAdministracion,
  TareasAdministrativas,
} from "@/components/cloud-esther/portales/equipo/SeccionesAdministrativas";
import { Facturacion } from "@/components/cloud-esther/facturacion/Facturacion";
import { Finanzas } from "@/components/cloud-esther/finanzas/Finanzas";
import { RRHH } from "@/components/cloud-esther/rrhh/RRHH";
import { Presupuestos } from "@/components/cloud-esther/presupuestos/Presupuestos";
import { EquipoProfesional } from "@/components/cloud-esther/EquipoProfesional";
import { storeAutorizaciones } from "@/lib/cloud-esther/autorizaciones-store";
import { storeComunicacion } from "@/lib/cloud-esther/comunicacion-store";
import { usePermisosPortal } from "@/lib/cloud-esther/permisos-portal";
import { IconoWhatsApp } from "@/components/cloud-esther/IconoWhatsApp";
import { volverSiEsPrueba } from "@/lib/acceso-prueba";

/* Ubicación: src/components/cloud-esther/PortalEquipo.tsx

   Portal del equipo (/equipo): la app que usan en el celular o la PC los odontólogos,
   asistentes, secretarias y administración. Cada rol ve lo suyo y respeta los permisos
   configurados en Equipo → Permisos y accesos. Trabaja sobre los datos reales del demo
   (Agenda, carpetas de pacientes, Notificaciones), separados por empresa. */

type Seccion =
  | "hoy"
  | "escritorio"
  | "jornada"
  | "agenda"
  | "pacientes"
  | "historia"
  | "odontograma"
  | "tratamientos"
  | "recetas"
  | "estudios"
  | "gabinete"
  | "autorizaciones"
  | "mensajes"
  | "reportes"
  | "ia"
  | "perfil"
  | "pacientes-admin"
  | "tareas"
  | "documentos"
  | "cobros"
  | "caja"
  | "presupuestos"
  | "equipo"
  | "auditoria"
  | "facturacion"
  | "finanzas"
  | "liquidaciones"
  | "rrhh"
  | "avisos"
  | "administracion";

const ROL_LABEL: Record<TeamRole, string> = {
  odontologo: "Odontólogo/a",
  asistente: "Asistente dental",
  secretaria: "Secretaria",
  administrador: "Administración",
};

/* Rol → nombre con el que se asignan avisos en Notificaciones. */
const ROL_AVISOS: Partial<Record<TeamRole, string>> = {
  secretaria: "Recepción",
  administrador: "Administración",
};

/* Bajada de cada sección del Portal administrativo (encabezado con degradé). */
const DESCRIPCION_ADMIN: Partial<Record<Seccion, string>> = {
  jornada: "Iniciá y cerrá tu jornada; el resumen queda registrado.",
  agenda: "Turnos del día, la semana y el mes. Reprogramá, confirmá o cancelá.",
  "pacientes-admin": "Altas, búsqueda, fichas y documentación de los pacientes.",
  autorizaciones: "Consentimientos y permisos pendientes, aprobados y su historial.",
  mensajes: "Conversaciones con pacientes, mensajes del equipo y avisos.",
  tareas: "Pendientes del equipo con responsable y vencimiento.",
  documentos: "Planillas para Excel y documentos para Word con los datos de la clínica.",
  cobros: "Saldos de pacientes y registro de cobros.",
  caja: "Ingresos del día por medio de pago.",
  presupuestos: "Presupuestos enviados, aprobados y en seguimiento.",
  reportes: "Indicadores de turnos, asistencia y atención.",
  equipo: "Integrantes, roles y accesos del equipo.",
  auditoria: "Quién hizo qué y cuándo dentro de la clínica.",
  facturacion: "Comprobantes, cuentas corrientes y cobranzas.",
  finanzas: "Ingresos, egresos, proveedores y flujo de caja.",
  liquidaciones: "Liquidaciones y comisiones de los profesionales.",
  rrhh: "Personal, asistencia, licencias y sueldos.",
  perfil: "Tus datos, país e idioma de trabajo.",
};

/* Bajada de las secciones clínicas del Portal profesional. */
const DESCRIPCION_PRO: Partial<Record<Seccion, string>> = {
  pacientes: "Buscá al paciente y abrí su ficha, historia, tratamientos y estudios.",
  historia: "Evolución, diagnósticos, notas y archivos de cada paciente.",
  odontograma: "Odontograma 3D con herramientas por pieza.",
  tratamientos: "Planes de tratamiento, sesiones y avance.",
  recetas: "Recetas y órdenes de estudios para tus pacientes.",
  estudios: "Radiografías, laboratorio e imágenes de cada paciente.",
  gabinete: "Estado de los sillones y del instrumental.",
  ia: "Tu asistente clínica: sugiere, resume y responde. La decisión siempre es tuya.",
};

function seccionesDe(rol: TeamRole): { id: Seccion; label: string; icon: LucideIcon }[] {
  // Secretaría y administración tienen su propio escritorio de trabajo (no el del odontólogo).
  const administrativo = rol === "secretaria" || rol === "administrador";
  const base: { id: Seccion; label: string; icon: LucideIcon }[] = administrativo
    ? [
        { id: "administracion", label: "Gestión", icon: Briefcase },
        { id: "hoy", label: "Hoy", icon: Home },
        { id: "agenda", label: "Agenda", icon: CalendarDays },
      ]
    : [
        { id: "hoy", label: "Hoy", icon: Home },
        { id: "agenda", label: "Agenda", icon: CalendarDays },
      ];
  if (rol !== "asistente") base.push({ id: "pacientes", label: "Pacientes", icon: Users });
  if (rol === "asistente" || rol === "odontologo")
    base.push({ id: "gabinete", label: "Gabinete", icon: ClipboardCheck });
  base.push(
    { id: "avisos", label: "Avisos", icon: Bell },
    { id: "perfil", label: "Mi perfil", icon: UserRound },
  );
  return base;
}

/* ───────────── Utilidades ───────────── */

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function sumarDias(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
function etiquetaDia(iso: string) {
  if (iso === hoyISO()) return "Hoy";
  if (iso === sumarDias(hoyISO(), 1)) return "Mañana";
  const d = new Date(`${iso}T12:00:00`);
  return `${DIAS[d.getDay()]} ${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}
function horaActual() {
  return new Date().toTimeString().slice(0, 5);
}
function minutos(h: string) {
  const [a = 0, b = 0] = h.split(":").map(Number);
  return a * 60 + b;
}
function edad(fecha: string) {
  if (!fecha) return "";
  const n = new Date(`${fecha}T12:00:00`);
  const h = new Date();
  let e = h.getFullYear() - n.getFullYear();
  if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate()))
    e--;
  return `${e} años`;
}
const nombreDe = (m: TeamMember) => `${m.firstName} ${m.lastName}`.trim();
const tiene = (m: TeamMember, permiso: string) =>
  m.role === "administrador" || !!m.permissions.find((p) => p.key === permiso)?.enabled;

/* ───────────── Estilos ───────────── */

const BTN_PRIMARIO =
  "btn-ce focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
const BTN_SECUNDARIO =
  "btn-ce-outline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
const INPUT =
  "h-10 w-full rounded-xl border border-primary/12 bg-white px-3 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary/45 focus:ring-4 focus:ring-primary/10";

const ESTADO: Record<Turno["estado"], string> = {
  Confirmada: "bg-emerald-100 text-emerald-700",
  Pendiente: "bg-amber-100 text-amber-700",
  Atendida: "bg-primary/10 text-primary",
  Ausente: "bg-muted text-muted-foreground",
  Cancelada: "bg-destructive/10 text-destructive",
};

function Pill({ children, clase }: { children: ReactNode; clase: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${clase}`}
    >
      {children}
    </span>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

/* Hoja inferior en el celular, ventana centrada en la PC. */
function Hoja({
  titulo,
  onClose,
  children,
}: {
  titulo: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl border border-border bg-card p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted sm:hidden" />
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="font-display text-lg font-semibold tracking-tight">{titulo}</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="grid size-8 place-items-center rounded-xl text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Tarjeta({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card-grad p-4 ${className}`}>{children}</div>;
}

/* ───────────── Entrada ───────────── */

export default function PortalEquipo() {
  return (
    <CloudEstherProvider>
      <GateEquipo />
    </CloudEstherProvider>
  );
}

function GateEquipo() {
  const { miembros } = useEquipo();
  const { accesos } = storeEquipoPortal.usar();
  const [montado, setMontado] = useState(false);
  const [sesion, setSesion] = useState<string | null>(null);
  const [vista, setVista] = useState<string | null>(null);

  useEffect(() => {
    setVista(new URLSearchParams(window.location.search).get("vista"));
    setSesion(leerSesionEquipo());
    setMontado(true);
  }, []);

  if (!montado) return <div className="min-h-screen bg-background" />;
  if (vista) {
    const m = miembros.find((x) => x.id === vista);
    if (m) return <AppEquipo miembro={m} vista onSalir={() => {}} />;
  }
  const m = miembros.find((x) => x.id === sesion);
  if (!m || m.status !== "activo" || accesos[m.id]?.estado !== "Activo")
    return (
      <LoginEquipo
        onIngresar={(id) => {
          guardarSesionEquipo(id);
          setSesion(id);
        }}
      />
    );
  return (
    <AppEquipo
      miembro={m}
      onSalir={() => {
        guardarSesionEquipo(null);
        if (!volverSiEsPrueba()) setSesion(null);
      }}
    />
  );
}

function LoginEquipo({ onIngresar }: { onIngresar: (id: string) => void }) {
  const { clinica } = useSesion();
  const { miembros } = useEquipo();
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const buscar = () => miembros.find((m) => m.email.toLowerCase() === email.trim().toLowerCase());

  const validar = () => {
    const m = buscar();
    if (!m) return { error: "Ese correo no pertenece al equipo de esta clínica." };
    if (m.status === "pendiente")
      return { error: "Tu invitación todavía no fue aceptada. Pedile a la clínica que la active." };
    if (m.status !== "activo")
      return { error: "Tu usuario está desactivado. Comunicate con la clínica." };
    const a = storeEquipoPortal.leer().accesos[m.id] ?? asegurarAcceso(m.id);
    if (a.estado === "Revocado")
      return { error: "Tu acceso al portal fue suspendido por la clínica." };
    return { m, a };
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_480px]">
      <div className="relative hidden flex-col justify-center gap-6 overflow-hidden bg-gradient-to-br from-violet-100 via-white to-primary/15 p-8 lg:flex">
        <div className="relative aspect-[1536/868] w-full overflow-hidden rounded-3xl shadow-[0_24px_50px_-30px_rgba(76,29,149,0.6)] ring-1 ring-primary/10">
          <HeroParallax completo />
        </div>
        <div className="relative rounded-3xl bg-gradient-to-br from-primary via-violet-600 to-fuchsia-600 p-8 text-white shadow-[0_20px_45px_-25px_rgba(124,58,237,0.8)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">
            Portal del equipo
          </p>
          <h1 className="mt-2 max-w-lg font-display text-4xl font-bold leading-tight">
            Tu jornada en la clínica, desde el celular o la PC.
          </h1>
          <p className="mt-2 max-w-md text-sm text-white/85">
            Agenda del día, fichas de pacientes, evoluciones, avisos y fichaje de entrada y salida.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center bg-[#faf9ff] p-6">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2.5">
            <BrandMark className="size-10" />
            <span className="leading-tight">
              <span className="block font-display text-base font-semibold">Cloud Esther</span>
              <span className="block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Portal del equipo
              </span>
            </span>
          </div>
          <div className="relative mt-6 aspect-[1536/868] w-full overflow-hidden rounded-2xl lg:hidden">
            <HeroParallax completo />
          </div>
          <h2 className="mt-6 font-display text-2xl font-bold tracking-tight">
            Ingresá con tu usuario
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {clinica?.nombre ?? "Clínica Dental Esther"}
          </p>
          <form
            className="mt-6 space-y-3"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              setError("");
              const r = validar();
              if ("error" in r) return setError(r.error ?? "");
              if (codigo.trim() !== r.a.codigo) return setError("El código no es correcto.");
              setEquipoPortal("accesos", (prev) => ({
                ...prev,
                [r.m.id]: {
                  ...r.a,
                  ultimoIngreso: new Date().toISOString(),
                  ingresos: r.a.ingresos + 1,
                },
              }));
              registrarEventoEquipo(r.m.id, "Ingreso", "Entró al portal del equipo");
              onIngresar(r.m.id);
            }}
          >
            <Field label="Correo de trabajo">
              <input
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={INPUT}
                placeholder="nombre@clinica.com"
              />
            </Field>
            <Field label="Código de acceso">
              <input
                inputMode="numeric"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className={`${INPUT} tracking-[0.4em]`}
                placeholder="••••••"
              />
            </Field>
            <button
              type="button"
              onClick={() => {
                setError("");
                const r = validar();
                if ("error" in r) return setError(r.error ?? "");
                setAviso(
                  `Te enviamos el código por correo y WhatsApp. (Código de práctica: ${r.a.codigo})`,
                );
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <Mail className="size-3.5" /> Recibir el código
            </button>
            {aviso && (
              <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{aviso}</p>
            )}
            {error && (
              <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}
            <button type="submit" className={`${BTN_PRIMARIO} w-full`}>
              <KeyRound className="size-4" />
              Ingresar
            </button>
          </form>
          <p className="mt-6 rounded-xl border border-dashed border-primary/20 p-3 text-[11px] text-muted-foreground">
            Para practicar: <b>jesus.mendez@cloudesther.com</b> (odontólogo),{" "}
            <b>sofia.rodriguez@cloudesther.com</b> (secretaria) o{" "}
            <b>carolina.lopez@cloudesther.com</b> (asistente), y tocá “Recibir el código”.
          </p>
          <Link
            to="/demo/equipo-profesional"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <ChevronRight className="size-3.5 rotate-180" /> Volver a Cloud Esther
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ───────────── App ───────────── */

type Ctx = {
  yo: TeamMember;
  vista: boolean;
  turnosVisibles: Turno[]; // según el rol
  onToast: (m: string) => void;
  abrirFicha: (paciente: string, turno?: Turno) => void;
  ir: (s: Seccion) => void;
  /** ¿La sección está en el menú de este integrante? (permisos del portal) */
  puedeIr: (s: Seccion) => boolean;
};

function AppEquipo({
  miembro,
  vista = false,
  onSalir,
}: {
  miembro: TeamMember;
  vista?: boolean;
  onSalir: () => void;
}) {
  const { clinica, clinicId } = useSesion();
  const { plan } = useCloudEsther();
  const { miembros } = useEquipo();
  const { pacientes } = usePacientes();
  const { turnos, tareas } = storeAgenda.usar();
  const { notificaciones } = useNotificaciones();
  const { autorizaciones } = storeAutorizaciones.usar();
  const { conversaciones } = storeComunicacion.usar();
  const permisos = usePermisosPortal(miembro);
  const puede = permisos.puede;
  const administrativo = miembro.role === "secretaria" || miembro.role === "administrador";
  const { prefs, cambiar: cambiarPrefs } = usePreferenciasPortal(
    administrativo ? `administrativo:${miembro.id}` : `profesional:${miembro.id}`,
  );
  const [seccion, setSeccion] = useState<Seccion>(administrativo ? "escritorio" : "hoy");
  const [ficha, setFicha] = useState<{ paciente: string; turno?: Turno } | null>(null);
  const [foco, setFoco] = useState<string | null>(null);
  const [nuevaCita, setNuevaCita] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  const onToast = (m: string) => {
    setToast(m);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 2600);
  };

  // Qué turnos ve cada rol: el odontólogo los suyos, el asistente los de sus odontólogos, administración todos.
  const asistidos = miembros.filter((m) => miembro.assistantOf?.includes(m.id)).map(nombreDe);
  const turnosVisibles = turnos.filter((t) =>
    miembro.role === "odontologo"
      ? t.odontologo === nombreDe(miembro)
      : miembro.role === "asistente"
        ? asistidos.includes(t.odontologo)
        : true,
  );
  const odontologos = miembros.filter((m) => m.role === "odontologo" && m.status === "activo");
  const profesionalesVisibles = administrativo
    ? odontologos
    : miembro.role === "odontologo"
      ? [miembro]
      : odontologos.filter((m) => asistidos.includes(nombreDe(m)));
  const pacientesPropios = administrativo
    ? null
    : [...new Set(turnosVisibles.map((t) => t.paciente))];

  const ir = (s: Seccion) => {
    setSeccion(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const abrirPaciente = (paciente: string, turno?: Turno) => {
    if (!administrativo && puede("pacientes")) {
      setFoco(paciente);
      ir("pacientes");
    } else if (administrativo && puede("pacientes")) {
      setFoco(paciente);
      ir("pacientes-admin");
    } else setFicha(turno ? { paciente, turno } : { paciente });
  };

  const ctx: Ctx = {
    yo: miembro,
    vista,
    turnosVisibles,
    onToast,
    abrirFicha: abrirPaciente,
    ir,
    // `disponibles` se calcula más abajo con el menú; se consulta recién al renderizar.
    puedeIr: (sec) => disponibles.includes(sec),
  };

  /* ── Notificaciones universales (reemplazan «Avisos para vos») ── */
  const yoNombre = nombreDe(miembro);
  const hoy = hoyISO();
  const rolAvisos = ROL_AVISOS[miembro.role];
  const misAvisos = notificaciones.filter(
    (n) =>
      !n.estado.completada && (n.asignado === yoNombre || (rolAvisos && n.asignado === rolAvisos)),
  );
  const ahoraMin = minutos(horaActual());
  const notifs: NotifUniversal[] = [
    ...turnosVisibles
      .filter(
        (t) =>
          t.fecha === hoy &&
          t.estado !== "Cancelada" &&
          t.estado !== "Atendida" &&
          minutos(t.hora) >= ahoraMin - 15,
      )
      .sort((a, b) => a.hora.localeCompare(b.hora))
      .slice(0, 3)
      .map((t) => ({
        id: `t-${t.id}-${t.estado}`,
        categoria: "Turnos" as const,
        titulo: `${t.hora} · ${t.paciente}`,
        detalle: `${t.tratamiento}${administrativo ? ` · ${t.odontologo}` : ""}`,
        fecha: `${t.fecha}T${t.hora}:00`,
        onAbrir: () => ir("agenda"),
      })),
    ...(administrativo
      ? turnosVisibles
          .filter((t) => t.fecha === sumarDias(hoy, 1) && t.estado === "Pendiente")
          .slice(0, 5)
          .map((t) => ({
            id: `c-${t.id}`,
            categoria: "Turnos" as const,
            titulo: `Confirmar turno de ${t.paciente}`,
            detalle: `Mañana ${t.hora} · ${t.odontologo}`,
            urgente: true,
            onAbrir: () => ir("escritorio"),
          }))
      : []),
    ...turnosVisibles
      .filter(
        (t) => t.fecha >= hoy && t.fecha <= sumarDias(hoy, 3) && /primera/i.test(t.tratamiento),
      )
      .map((t) => ({
        id: `p-${t.id}`,
        categoria: "Pacientes" as const,
        titulo: `Paciente nuevo: ${t.paciente}`,
        detalle: `Primera consulta · ${etiquetaDia(t.fecha)} ${t.hora}`,
        onAbrir: () => abrirPaciente(t.paciente, t),
      })),
    ...autorizaciones
      .filter((a) =>
        administrativo
          ? a.estado === "Pendiente" && (a.gestion === "Sin gestionar" || a.origen === "Paciente")
          : a.solicitadoPor.includes(miembro.lastName) && (a.estado !== "Pendiente" || true),
      )
      .slice(0, 6)
      .map((a) => ({
        id: `a-${a.id}-${a.estado}`,
        categoria: "Autorizaciones" as const,
        titulo:
          a.estado === "Pendiente"
            ? `${administrativo && a.origen === "Paciente" ? "Pedido del paciente" : "Esperando respuesta"}: ${a.titulo}`
            : `${a.paciente} ${a.estado === "Autorizada" ? "autorizó" : a.estado === "Rechazada" ? "rechazó" : "revocó"}: ${a.titulo}`,
        detalle: a.paciente,
        fecha: a.respuesta?.fecha ?? a.fecha,
        urgente: a.estado === "Pendiente" && administrativo,
        onAbrir: () => ir("autorizaciones"),
      })),
    ...tareas
      .filter(
        (t) =>
          !t.hecha &&
          (t.responsable === yoNombre || (administrativo && !!t.vence && t.vence < hoy)),
      )
      .slice(0, 5)
      .map((t) => ({
        id: `ta-${t.id}`,
        categoria: "Tareas" as const,
        titulo: t.texto,
        detalle: t.vence
          ? `Vence ${t.vence.split("-").reverse().join("/")}`
          : (t.responsable ?? ""),
        urgente: !!t.vence && t.vence < hoy,
        onAbrir: () => ir(administrativo ? "tareas" : "hoy"),
      })),
    ...misAvisos.slice(0, 6).map((n) => ({
      id: `av-${n.id}`,
      categoria: "Avisos" as const,
      titulo: n.titulo,
      detalle: n.detalle,
      fecha: n.fecha,
      onAbrir: () => {
        cambiarEstadoNotif(
          [{ id: n.id, titulo: n.titulo }],
          { completada: new Date().toISOString() },
          "Completó",
          yoNombre,
        );
        onToast("Aviso marcado como resuelto");
      },
    })),
    ...(puede("mensajes")
      ? conversaciones
          .filter(
            (c) => c.noLeidos > 0 && (!pacientesPropios || pacientesPropios.includes(c.paciente)),
          )
          .slice(0, 4)
          .map((c) => ({
            id: `m-${c.id}-${c.mensajes.length}`,
            categoria: "Mensajes" as const,
            titulo: `Mensaje de ${c.paciente}`,
            detalle: c.mensajes.at(-1)?.texto ?? "",
            fecha: c.mensajes.at(-1)?.fecha,
            onAbrir: () => ir("mensajes"),
          }))
      : []),
  ];

  /* ── Menú según rol y permisos ── */
  const autPend = autorizaciones.filter((a) =>
    administrativo
      ? a.estado === "Pendiente"
      : a.estado === "Pendiente" && a.solicitadoPor.includes(miembro.lastName),
  ).length;
  const item = (id: Seccion, label: string, icon: LucideIcon, mostrar = true, badge?: number) =>
    mostrar ? [{ id, label, icon, ...(badge ? { badge } : {}) }] : [];
  const es3D = plan === "avanzada" || plan === "grupo";
  // Esther IA asistencial: planes con IA (Plus y Enterprise), con el permiso del propietario.
  const conIA = plan === "avanzada" || plan === "grupo";
  const grupos: GrupoPortal[] = (
    administrativo
      ? [
          {
            titulo: "Inicio",
            items: [
              ...item("escritorio", "Escritorio", LayoutDashboard),
              ...item("jornada", "Jornada", Clock3, puede("jornada")),
              ...item("agenda", "Agenda", CalendarDays, puede("agenda")),
            ],
          },
          {
            titulo: "Secretaría",
            items: [
              ...item("pacientes-admin", "Pacientes", Users, puede("pacientes")),
              ...item(
                "autorizaciones",
                "Autorizaciones",
                KeyRound,
                puede("autorizaciones"),
                autPend,
              ),
              ...item("mensajes", "Comunicación", MessageCircle, puede("mensajes")),
              ...item("tareas", "Tareas", ClipboardList, puede("tareas")),
              ...item("documentos", "Documentos y plantillas", FileText, puede("documentos")),
            ],
          },
          {
            titulo: "Administración",
            items: [
              ...item("cobros", "Cobros y saldos", Wallet, puede("cobros")),
              ...item("caja", "Caja del día", Landmark, puede("cobros")),
              ...item("presupuestos", "Presupuestos", ReceiptText, puede("presupuestos")),
              ...item("reportes", "Reportes", BarChart3, puede("reportes")),
              ...item("equipo", "Gestión de equipo", UserCog, puede("equipo")),
              ...item("auditoria", "Auditoría", ShieldCheck, puede("auditoria")),
            ],
          },
          {
            titulo: "Finanzas y administración",
            items: [
              ...item("facturacion", "Facturación", Receipt, puede("facturacion")),
              ...item(
                "finanzas",
                "Finanzas y proveedores",
                Landmark,
                puede("finanzas") || puede("proveedores"),
              ),
              ...item("liquidaciones", "Liquidaciones y comisiones", Coins, puede("liquidaciones")),
              ...item("rrhh", "RRHH y sueldos", Briefcase, puede("rrhh") || puede("sueldos")),
            ],
          },
          { titulo: "Mi cuenta", items: item("perfil", "Perfil y configuración", UserRound) },
        ]
      : [
          {
            titulo: "Mi jornada",
            items: [
              ...item("hoy", "Inicio", Home),
              ...item("jornada", "Jornada", Clock3, puede("jornada")),
              ...item("agenda", "Agenda", CalendarDays, puede("agenda")),
            ],
          },
          {
            titulo: "Atención clínica",
            items: [
              ...item("pacientes", "Pacientes", Users, puede("pacientes")),
              ...item("historia", "Historia clínica", FileText, puede("historia")),
              ...item("odontograma", "Odontograma 3D", Box, puede("odontograma") && es3D),
              ...item("tratamientos", "Tratamientos", Stethoscope, puede("tratamientos")),
              ...item("recetas", "Recetas y órdenes", PillIcon, puede("recetas")),
              ...item("estudios", "Estudios", ScanLine, puede("estudios")),
              ...item("gabinete", "Gabinete", ClipboardCheck),
            ],
          },
          {
            titulo: "Gestión",
            items: [
              ...item(
                "autorizaciones",
                "Autorizaciones",
                KeyRound,
                puede("autorizaciones"),
                autPend,
              ),
              ...item("mensajes", "Mensajes", MessageCircle, puede("mensajes")),
              ...item("reportes", "Reportes", BarChart3, puede("reportes")),
              ...item("ia", "Esther IA", Sparkles, puede("ia") && conIA),
            ],
          },
          { titulo: "Mi cuenta", items: item("perfil", "Perfil y configuración", UserRound) },
        ]
  ).filter((g) => g.items.length > 0);
  const disponibles = grupos.flatMap((g) => g.items.map((i) => i.id));
  const actual: Seccion = disponibles.includes(seccion) ? seccion : (disponibles[0] as Seccion);
  const etiqueta = grupos.flatMap((g) => g.items).find((i) => i.id === actual)?.label ?? "";
  const grupoActual = grupos.find((g) => g.items.some((i) => i.id === actual));
  const itemActual = grupoActual?.items.find((i) => i.id === actual);

  const pestanaClinica: Record<string, PestanaClinica> = {
    pacientes: "ficha",
    historia: "historia",
    odontograma: "odontograma",
    tratamientos: "tratamientos",
    recetas: "recetas",
    estudios: "estudios",
  };

  return (
    <>
      <PortalShell
        portal={administrativo ? "Portal administrativo" : "Portal profesional"}
        clinica={clinica?.nombre ?? "Clínica Dental Esther"}
        usuario={{
          nombre: yoNombre,
          detalle: ROL_LABEL[miembro.role],
          iniciales: `${miembro.firstName[0] ?? ""}${miembro.lastName[0] ?? ""}`,
        }}
        grupos={grupos}
        activo={actual}
        onIr={(id) => ir(id as Seccion)}
        titulo={etiqueta}
        subtitulo={`${clinica?.nombre ?? "Clínica Dental Esther"} · ${ROL_LABEL[miembro.role]}`}
        acciones={<NotificacionesUniversales items={notifs} clave={`equipo:${miembro.id}`} />}
        prefs={prefs}
        onPrefs={cambiarPrefs}
        onSalir={vista ? () => window.location.assign("/demo/equipo-profesional") : onSalir}
        salirLabel={vista ? "Volver a Equipo" : "Cerrar sesión"}
        principales={
          administrativo
            ? ["escritorio", "agenda", "pacientes-admin", "mensajes"]
            : ["hoy", "agenda", "pacientes", "mensajes"]
        }
        aviso={
          vista ? (
            <p className="mb-4 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-800">
              <Eye className="size-4" /> Vista previa: así ve el portal <b>{yoNombre}</b> (
              {ROL_LABEL[miembro.role]}) con sus permisos.
            </p>
          ) : null
        }
      >
        {actual !== "escritorio" && actual !== "hoy" && actual !== "ia" && (
          <EncabezadoSeccion
            area={
              grupoActual?.titulo ??
              (administrativo ? "Portal administrativo" : "Portal profesional")
            }
            titulo={etiqueta}
            detalle={DESCRIPCION_ADMIN[actual] ?? DESCRIPCION_PRO[actual]}
            icon={itemActual?.icon}
          />
        )}
        {actual === "hoy" && <Hoy ctx={ctx} avisos={autPend} />}
        {actual === "escritorio" && (
          <EspacioAdministrativo
            yo={miembro}
            clinica={clinica?.nombre ?? "Clínica Dental Esther"}
            vista={vista}
            puede={(p) =>
              p === "gestionar_facturacion"
                ? puede("cobros")
                : p === "gestionar_turnos"
                  ? puede("agenda", "editar")
                  : tiene(miembro, p)
            }
            turnos={turnosVisibles}
            onToast={onToast}
            abrirFicha={(paciente) => abrirPaciente(paciente)}
            pestana="escritorio"
            onIr={(d) => ir(d)}
            disponibles={(
              ["agenda", "cobros", "pacientes-admin", "tareas", "presupuestos"] as const
            ).filter((d) => grupos.some((g) => g.items.some((i) => i.id === d)))}
          />
        )}
        {actual === "cobros" && (
          <EspacioAdministrativo
            yo={miembro}
            clinica={clinica?.nombre ?? "Clínica Dental Esther"}
            vista={vista || !puede("cobros", "crear")}
            puede={(p) => (p === "gestionar_facturacion" ? puede("cobros") : tiene(miembro, p))}
            turnos={turnosVisibles}
            onToast={onToast}
            abrirFicha={(paciente) => abrirPaciente(paciente)}
            pestana="cobros"
          />
        )}
        {actual === "documentos" && (
          <EspacioAdministrativo
            yo={miembro}
            clinica={clinica?.nombre ?? "Clínica Dental Esther"}
            vista={vista}
            puede={(p) => (p === "gestionar_facturacion" ? puede("cobros") : tiene(miembro, p))}
            turnos={turnosVisibles}
            onToast={onToast}
            abrirFicha={(paciente) => abrirPaciente(paciente)}
            pestana="documentos"
          />
        )}
        {actual === "jornada" && (
          <JornadaPortal yo={miembro} turnos={turnosVisibles} vista={vista} onToast={onToast} />
        )}
        {actual === "agenda" && (
          <AgendaPortal
            modo={administrativo ? "administracion" : "profesional"}
            turnos={turnosVisibles}
            profesionales={profesionalesVisibles}
            yo={miembro}
            puedeEditar={puede("agenda", "editar")}
            puedeGestionar={
              administrativo && (puede("agenda", "gestionar") || puede("agenda", "eliminar"))
            }
            vista={vista}
            onToast={onToast}
            onAbrirPaciente={abrirPaciente}
            {...(puede("agenda", "crear") && miembro.role !== "asistente"
              ? { onNuevoTurno: () => setNuevaCita(true) }
              : {})}
          />
        )}
        {actual in pestanaClinica && (
          <PacienteClinico
            key={`${actual}-${foco ?? ""}`}
            inicial={pestanaClinica[actual] ?? "ficha"}
            pacienteInicial={foco}
            puede={(m) => puede(m) && (m !== "odontograma" || es3D)}
            onToast={onToast}
            {...(pacientesPropios && miembro.role !== "odontologo"
              ? { soloPacientes: pacientesPropios }
              : {})}
          />
        )}
        {actual === "gabinete" && <Gabinete ctx={ctx} />}
        {actual === "pacientes-admin" && (
          <PacientesAdministracion
            key={foco ?? ""}
            puedeCrear={puede("pacientes", "crear")}
            puedeEditar={puede("pacientes", "editar")}
            onToast={onToast}
            abrirInicial={foco}
          />
        )}
        {actual === "autorizaciones" && (
          <AutorizacionesPanel
            rol={administrativo ? "administracion" : "profesional"}
            usuario={yoNombre}
            pacientes={pacientes.filter((p) => p.estado === "Activo")}
            puedeCrear={puede("autorizaciones", "crear")}
            puedeGestionar={
              puede("autorizaciones", "gestionar") || puede("autorizaciones", "aprobar")
            }
            onToast={onToast}
          />
        )}
        {actual === "mensajes" && (
          <MensajesPortal
            yo={miembro}
            miembros={miembros}
            pacientesVisibles={pacientesPropios}
            conAvisos={administrativo && puede("mensajes", "crear")}
            vista={vista}
            onToast={onToast}
          />
        )}
        {actual === "tareas" && (
          <TareasAdministrativas
            yo={miembro}
            miembros={miembros}
            puedeCrear={puede("tareas", "crear")}
            puedeEliminar={puede("tareas", "eliminar")}
            vista={vista}
            onToast={onToast}
          />
        )}
        {actual === "caja" && <CajaPortal />}
        {actual === "presupuestos" && <Presupuestos />}
        {actual === "reportes" && (
          <ReportesPortal
            modo={administrativo ? "administracion" : "profesional"}
            turnos={turnosVisibles}
            yo={miembro}
          />
        )}
        {actual === "equipo" && <EquipoProfesional />}
        {actual === "auditoria" && <AuditoriaPortal clinicId={clinicId} miembros={miembros} />}
        {actual === "facturacion" && <Facturacion />}
        {actual === "finanzas" && <Finanzas />}
        {actual === "liquidaciones" && <LiquidacionesPortal miembros={miembros} turnos={turnos} />}
        {actual === "rrhh" && <RRHH />}
        {actual === "ia" && <IAPortal yo={miembro} plan={plan} />}
        {actual === "perfil" && (
          <div className="space-y-4">
            <ConfiguracionProfesional yo={miembro} onToast={onToast} />
            <PerfilEquipo ctx={ctx} />
          </div>
        )}
      </PortalShell>
      {disponibles.includes("ia") && actual !== "ia" && (
        <EstherFlotante moduloId={actual} modulo={etiqueta || "el portal"} />
      )}

      {nuevaCita && (
        <Hoja titulo="Nuevo turno" onClose={() => setNuevaCita(false)}>
          <NuevaCitaForm ctx={ctx} onDone={() => setNuevaCita(false)} />
        </Hoja>
      )}

      {ficha && (
        <FichaPaciente
          ctx={ctx}
          paciente={ficha.paciente}
          turno={ficha.turno}
          onClose={() => setFicha(null)}
        />
      )}

      {toast && (
        <div
          className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background shadow-xl lg:bottom-6"
          role="status"
        >
          {toast}
        </div>
      )}
    </>
  );
}

/* ───────────── Fichaje ───────────── */

function Fichaje({ ctx }: { ctx: Ctx }) {
  const { fichajes } = storeEquipoPortal.usar();
  const hoy = hoyISO();
  const actual = fichajes.find((f) => f.miembroId === ctx.yo.id && f.fecha === hoy && !f.salida);
  const hechos = fichajes.filter((f) => f.miembroId === ctx.yo.id && f.fecha === hoy);
  const trabajados = hechos.reduce(
    (a, f) => a + (minutos(f.salida ?? horaActual()) - minutos(f.entrada)),
    0,
  );

  const fichar = () => {
    if (ctx.vista) return ctx.onToast("En la vista previa no se puede fichar.");
    const h = horaActual();
    if (actual) {
      setEquipoPortal("fichajes", (prev) =>
        prev.map((f) => (f.id === actual.id ? { ...f, salida: h } : f)),
      );
      registrarEventoEquipo(ctx.yo.id, "Fichó salida", h);
      ctx.onToast(`Salida registrada a las ${h}. ¡Buen descanso!`);
    } else {
      setEquipoPortal("fichajes", (prev) => [
        ...prev,
        { id: `f-${Date.now()}`, miembroId: ctx.yo.id, fecha: hoy, entrada: h },
      ]);
      registrarEventoEquipo(ctx.yo.id, "Fichó entrada", h);
      ctx.onToast(`Entrada registrada a las ${h}`);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white/15 p-3 ring-1 ring-white/30 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3 text-sm">
        <Clock3 className="size-5 shrink-0" />
        <div className="min-w-0">
          <p className="font-semibold">
            {actual
              ? `Trabajando desde las ${actual.entrada}`
              : hechos.length
                ? "Jornada cerrada"
                : "Todavía no fichaste"}
          </p>
          <p className="text-[11px] text-white/80">
            {Math.floor(trabajados / 60)} h {trabajados % 60} min hoy
          </p>
        </div>
      </div>
      <button
        onClick={fichar}
        className="inline-flex h-9 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-primary shadow"
      >
        {actual ? <LogOut className="size-4" /> : <LogIn className="size-4" />}
        {actual ? "Fichar salida" : "Fichar entrada"}
      </button>
    </div>
  );
}

/* ───────────── Hoy ───────────── */

function FilaTurno({
  t,
  ctx,
  mostrarProfesional,
}: {
  t: Turno;
  ctx: Ctx;
  mostrarProfesional: boolean;
}) {
  const ahora = horaActual();
  const enCurso =
    t.fecha === hoyISO() &&
    minutos(ahora) >= minutos(t.hora) &&
    minutos(ahora) < minutos(t.hora) + 45 &&
    t.estado !== "Atendida";
  const cambiar = (estado: Turno["estado"], msg: string) => {
    setTurnosStore((prev) => prev.map((x) => (x.id === t.id ? { ...x, estado } : x)));
    registrarEventoEquipo(ctx.yo.id, `Turno ${estado.toLowerCase()}`, `${t.hora} ${t.paciente}`);
    ctx.onToast(msg);
  };
  const puedeGestionar = tiene(ctx.yo, "gestionar_turnos") && ctx.yo.role !== "asistente";
  return (
    <li
      className={`flex flex-wrap items-center gap-3 rounded-2xl border bg-gradient-to-r p-3 transition hover:shadow-[0_12px_26px_-18px_rgba(124,58,237,0.7)] ${
        enCurso
          ? "border-primary/40 from-primary/[0.10] to-fuchsia-500/[0.04] ring-2 ring-primary/25"
          : "border-primary/10 from-primary/[0.04] to-transparent hover:border-primary/25"
      }`}
    >
      <button
        onClick={() => ctx.abrirFicha(t.paciente, t)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span
          className={`grid w-14 shrink-0 place-items-center rounded-xl py-2 ${enCurso ? "bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow-md" : "bg-card text-primary shadow-sm ring-1 ring-primary/10"}`}
        >
          <span className="font-display text-base font-bold leading-none">{t.hora}</span>
          {enCurso && <span className="mt-0.5 text-[9px] font-bold uppercase">Ahora</span>}
        </span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
            {t.paciente}
            <Pill clase={ESTADO[t.estado]}>{t.estado}</Pill>
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {t.tratamiento} · {t.gabinete}
            {mostrarProfesional ? ` · ${t.odontologo}` : ""}
          </span>
        </span>
      </button>
      {/* En el celular los botones bajan de renglón y se reparten el ancho (nada queda afuera). */}
      <div className="flex w-full flex-wrap gap-1.5 sm:w-auto [&>*]:flex-1 sm:[&>*]:flex-none">
        {puedeGestionar && t.estado === "Pendiente" && (
          <button
            className={BTN_SECUNDARIO}
            onClick={() => cambiar("Confirmada", `Turno de ${t.paciente} confirmado`)}
          >
            <Check className="size-3.5" /> Confirmar
          </button>
        )}
        {puedeGestionar &&
          (t.estado === "Pendiente" || t.estado === "Confirmada") &&
          t.fecha <= hoyISO() && (
            <button
              className={BTN_SECUNDARIO}
              onClick={() => cambiar("Ausente", `${t.paciente} marcado como ausente`)}
            >
              <X className="size-3.5" /> Ausente
            </button>
          )}
        {ctx.yo.role === "odontologo" &&
          t.estado !== "Atendida" &&
          t.estado !== "Cancelada" &&
          t.fecha === hoyISO() && (
            <button className={BTN_PRIMARIO} onClick={() => ctx.abrirFicha(t.paciente, t)}>
              <Stethoscope className="size-3.5" /> Atender
            </button>
          )}
      </div>
    </li>
  );
}

function Hoy({ ctx, avisos }: { ctx: Ctx; avisos: number }) {
  const [nuevaCita, setNuevaCita] = useState(false);
  const hoy = hoyISO();
  const deHoy = ctx.turnosVisibles
    .filter((t) => t.fecha === hoy && t.estado !== "Cancelada")
    .sort((a, b) => a.hora.localeCompare(b.hora));
  const atendidos = deHoy.filter((t) => t.estado === "Atendida").length;
  const pendientes = deHoy.filter((t) => t.estado === "Pendiente" || t.estado === "Confirmada");
  const proximo = pendientes.find((t) => minutos(t.hora) + 45 >= minutos(horaActual()));
  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buen día" : hora < 20 ? "Buenas tardes" : "Buenas noches";
  const trato =
    ctx.yo.role === "odontologo" ? (ctx.yo.firstName.endsWith("a") ? "Dra. " : "Dr. ") : "";

  const total = deHoy.length;
  const avance = total ? Math.round((atendidos / total) * 100) : 0;
  const fecha = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const puedeCitar = tiene(ctx.yo, "gestionar_turnos") && ctx.yo.role !== "asistente";
  const siguiente = proximo ?? pendientes[0];
  const accesos = (
    [
      { s: "pacientes", l: "Pacientes", i: Users, g: "from-primary to-fuchsia-500" },
      { s: "historia", l: "Historia clínica", i: FileText, g: "from-sky-500 to-indigo-500" },
      { s: "odontograma", l: "Odontograma 3D", i: Box, g: "from-emerald-500 to-teal-500" },
      { s: "recetas", l: "Recetas", i: PillIcon, g: "from-amber-500 to-orange-500" },
      { s: "mensajes", l: "Mensajes", i: MessageCircle, g: "from-rose-500 to-pink-500" },
      { s: "ia", l: "Esther IA", i: Sparkles, g: "from-violet-500 to-purple-600" },
    ] as const
  ).filter((a) => ctx.puedeIr(a.s));

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-primary via-violet-600 to-fuchsia-600 p-5 text-white shadow-[0_24px_60px_-30px_rgba(124,58,237,0.85)] sm:p-7">
        <div className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full border-[26px] border-white/10" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 size-72 rounded-full bg-fuchsia-300/25 blur-3xl" />
        <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/75">
              {saludo} · {fecha}
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight md:text-4xl">
              {trato}
              {ctx.yo.firstName}
            </h1>
            <p className="mt-1 text-sm text-white/85">
              {deHoy.length
                ? `Hoy ${deHoy.length === 1 ? "hay 1 turno" : `hay ${deHoy.length} turnos`}${ctx.yo.role === "secretaria" || ctx.yo.role === "administrador" ? " en la clínica" : ""}.`
                : "Hoy no hay turnos agendados."}
            </p>
            <div className="mt-4">
              <Fichaje ctx={ctx} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {puedeCitar && (
                <button
                  type="button"
                  onClick={() => setNuevaCita(true)}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-primary shadow"
                >
                  <CalendarPlus className="size-4" /> Nueva cita
                </button>
              )}
              {ctx.puedeIr("agenda") && (
                <button
                  type="button"
                  onClick={() => ctx.ir("agenda")}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-white/15 px-4 text-sm font-semibold text-white ring-1 ring-white/35 backdrop-blur-md hover:bg-white/25"
                >
                  <CalendarDays className="size-4" /> Mi agenda
                </button>
              )}
            </div>
          </div>
          <div className="rounded-3xl border border-white/25 bg-white/12 p-4 backdrop-blur-md">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/75">
              {siguiente ? "Próximo paciente" : "Agenda del día"}
            </p>
            {siguiente ? (
              <>
                <div className="mt-2 flex items-center gap-3">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white font-display text-sm font-bold text-primary shadow">
                    {siguiente.hora}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold">{siguiente.paciente}</p>
                    <p className="truncate text-xs text-white/80">
                      {siguiente.tratamiento} · {siguiente.gabinete}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => ctx.abrirFicha(siguiente.paciente, siguiente)}
                  className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-semibold text-primary shadow"
                >
                  <Stethoscope className="size-4" />
                  {ctx.yo.role === "odontologo" ? "Atender" : "Ver ficha"}
                </button>
              </>
            ) : (
              <p className="mt-2 text-sm text-white/85">
                {total ? "No quedan pacientes por atender hoy." : "Sin turnos para hoy."}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiPortal
          titulo="Turnos hoy"
          valor={String(deHoy.length)}
          detalle="en tu agenda"
          icon={CalendarDays}
          onClick={() => ctx.ir("agenda")}
        />
        <KpiPortal
          titulo="Atendidos"
          valor={String(atendidos)}
          detalle={`${avance}% del día`}
          icon={CheckCheck}
          tono="verde"
          onClick={() => ctx.ir("agenda")}
        />
        <KpiPortal
          titulo="Por atender"
          valor={String(pendientes.length)}
          detalle={proximo ? `Próximo ${proximo.hora}` : "Sin pendientes"}
          icon={Clock3}
          tono="ambar"
          onClick={() => ctx.ir("agenda")}
        />
        <KpiPortal
          titulo="Autorizaciones"
          valor={String(avisos)}
          detalle="pendientes"
          icon={KeyRound}
          tono="rosa"
          onClick={ctx.puedeIr("autorizaciones") ? () => ctx.ir("autorizaciones") : undefined}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <TarjetaPortal
          titulo={
            ctx.yo.role === "odontologo"
              ? "Mis pacientes de hoy"
              : ctx.yo.role === "asistente"
                ? "Pacientes de hoy de tus odontólogos"
                : "Agenda de hoy"
          }
          detalle={`${deHoy.length} turnos · ${atendidos} atendidos`}
          icon={Users}
        >
          {deHoy.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-primary/20 py-8 text-center text-sm text-muted-foreground">
              No hay turnos para hoy.
            </p>
          ) : (
            <ul className="space-y-2">
              {deHoy.map((t) => (
                <FilaTurno
                  key={t.id}
                  t={t}
                  ctx={ctx}
                  mostrarProfesional={ctx.yo.role !== "odontologo"}
                />
              ))}
            </ul>
          )}
        </TarjetaPortal>

        <div className="space-y-5">
          <TarjetaPortal titulo="Progreso del día" icon={CheckCheck}>
            <div className="flex items-center gap-4">
              <div className="relative size-24 shrink-0">
                <svg viewBox="0 0 36 36" className="size-24 -rotate-90">
                  <defs>
                    <linearGradient id="ce-progreso" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" />
                      <stop offset="100%" stopColor="#d946ef" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    strokeWidth="3.5"
                    className="stroke-primary/12"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="url(#ce-progreso)"
                    strokeDasharray={`${(avance / 100) * 97.4} 97.4`}
                  />
                </svg>
                <span className="absolute inset-0 grid place-items-center font-display text-xl font-bold">
                  {avance}%
                </span>
              </div>
              <div className="space-y-1.5 text-sm">
                <p>
                  <b className="tabular-nums">{atendidos}</b>{" "}
                  <span className="text-muted-foreground">atendidos</span>
                </p>
                <p>
                  <b className="tabular-nums">{pendientes.length}</b>{" "}
                  <span className="text-muted-foreground">por atender</span>
                </p>
                <p>
                  <b className="tabular-nums">
                    {deHoy.filter((t) => t.estado === "Ausente").length}
                  </b>{" "}
                  <span className="text-muted-foreground">ausentes</span>
                </p>
              </div>
            </div>
          </TarjetaPortal>

          {ctx.puedeIr("ia") && (
            <button
              type="button"
              onClick={() => ctx.ir("ia")}
              className="group relative flex w-full items-center gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-[#4c1d95] via-[#7c3aed] to-[#c026d3] p-4 text-left text-white shadow-[0_24px_50px_-28px_rgba(124,58,237,0.95)] transition hover:-translate-y-0.5"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-white/15 blur-2xl"
              />
              <span
                aria-hidden
                className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-white/15 ring-1 ring-white/30"
                style={{
                  backgroundImage: `url(${estherPoses.waving.url})`,
                  backgroundSize: "auto 300%",
                  backgroundPosition: "50% 4%",
                  backgroundRepeat: "no-repeat",
                }}
              />
              <span className="relative min-w-0">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]">
                  <Sparkles className="size-3" /> Esther IA
                </span>
                <span className="mt-1.5 block font-display text-base font-bold leading-tight">
                  Tu asistente clínica
                </span>
                <span className="mt-0.5 block text-xs text-white/80">
                  Resúmenes de pacientes, agenda e informes. Vos decidís siempre.
                </span>
              </span>
            </button>
          )}

          {accesos.length > 0 && (
            <TarjetaPortal titulo="Accesos clínicos" icon={Stethoscope}>
              <div className="grid grid-cols-2 gap-2.5">
                {accesos.map((a) => (
                  <button
                    key={a.s}
                    type="button"
                    onClick={() => ctx.ir(a.s)}
                    className="group flex items-center gap-2.5 rounded-2xl border border-primary/10 bg-card p-2.5 text-left transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_12px_26px_-18px_rgba(124,58,237,0.7)]"
                  >
                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${a.g} text-white shadow-md`}
                    >
                      <a.i className="size-4" />
                    </span>
                    <span className="truncate text-xs font-semibold">{a.l}</span>
                  </button>
                ))}
              </div>
            </TarjetaPortal>
          )}
        </div>
      </div>

      {nuevaCita && (
        <Hoja titulo="Nueva cita" onClose={() => setNuevaCita(false)}>
          <NuevaCitaForm ctx={ctx} onDone={() => setNuevaCita(false)} />
        </Hoja>
      )}
    </div>
  );
}

function NuevaCitaForm({ ctx, onDone }: { ctx: Ctx; onDone: () => void }) {
  const { pacientes } = usePacientes();
  const { miembros } = useEquipo();
  const { turnos } = storeAgenda.usar();
  const odontologos = miembros
    .filter((m) => m.role === "odontologo" && m.status === "activo")
    .map(nombreDe);
  const nombres = pacientes
    .filter((p) => p.estado === "Activo")
    .map((p) => `${p.nombre} ${p.apellido}`);
  const [paciente, setPaciente] = useState(nombres[0] ?? "");
  const [odontologo, setOdontologo] = useState(odontologos[0] ?? "");
  const [tratamiento, setTratamiento] = useState("Control");
  const [fecha, setFecha] = useState(hoyISO());
  const [hora, setHora] = useState("");
  const HORAS = Array.from(
    { length: 24 },
    (_, i) => `${String(8 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`,
  );
  const ocupados = new Set(
    turnos
      .filter((t) => t.fecha === fecha && t.odontologo === odontologo && t.estado !== "Cancelada")
      .map((t) => t.hora),
  );
  const libres = HORAS.filter((h) => !ocupados.has(h) && (fecha > hoyISO() || h > horaActual()));

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!hora || !paciente) return;
        const p = pacientes.find((x) => `${x.nombre} ${x.apellido}` === paciente);
        setTurnosStore((prev) => [
          ...prev,
          {
            id: Date.now(),
            fecha,
            hora,
            paciente,
            tratamiento,
            odontologo,
            sucursal: p?.sucursal || "Clínica Centro",
            gabinete: "Gabinete 1",
            estado: "Pendiente",
            notas: `Cargado desde el portal del equipo por ${nombreDe(ctx.yo)}`,
          },
        ]);
        registrarEventoEquipo(ctx.yo.id, "Nueva cita", `${paciente} · ${fecha} ${hora}`);
        ctx.onToast(`Cita agendada: ${paciente} ${etiquetaDia(fecha).toLowerCase()} ${hora}`);
        onDone();
      }}
    >
      <Field label="Paciente">
        <select value={paciente} onChange={(e) => setPaciente(e.target.value)} className={INPUT}>
          {nombres.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Profesional">
          <select
            value={odontologo}
            onChange={(e) => {
              setOdontologo(e.target.value);
              setHora("");
            }}
            className={INPUT}
          >
            {odontologos.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </Field>
        <Field label="Motivo">
          <select
            value={tratamiento}
            onChange={(e) => setTratamiento(e.target.value)}
            className={INPUT}
          >
            {PRACTICAS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Día">
        <input
          type="date"
          value={fecha}
          min={hoyISO()}
          onChange={(e) => {
            setFecha(e.target.value);
            setHora("");
          }}
          className={INPUT}
        />
      </Field>
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
        {libres.map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => setHora(h)}
            aria-pressed={hora === h}
            className={`rounded-lg border py-2 text-xs font-semibold ${hora === h ? "border-primary bg-primary text-white" : "border-primary/15 bg-white"}`}
          >
            {h}
          </button>
        ))}
        {libres.length === 0 && (
          <p className="col-span-full text-xs text-muted-foreground">
            Sin horarios libres ese día.
          </p>
        )}
      </div>
      <button type="submit" className={`${BTN_PRIMARIO} w-full`} disabled={!hora}>
        <Check className="size-4" /> {hora ? `Agendar ${hora}` : "Elegí un horario"}
      </button>
    </form>
  );
}

/* ───────────── Ficha del paciente ───────────── */

function FichaPaciente({
  ctx,
  paciente,
  turno,
  onClose,
}: {
  ctx: Ctx;
  paciente: string;
  turno?: Turno | undefined;
  onClose: () => void;
}) {
  const { pacientes } = usePacientes();
  const { de, cambiar } = useRegistrosPacientes();
  const p = pacientes.find((x) => `${x.nombre} ${x.apellido}` === paciente);
  const r = p ? de(p.id) : null;
  const verHistoria = tiene(ctx.yo, "ver_historias");
  const puedeEvolucion = ctx.yo.role === "odontologo" && tiene(ctx.yo, "crear_historias");
  const puedeCobrar = tiene(ctx.yo, "gestionar_facturacion");
  const [modo, setModo] = useState<"ficha" | "evolucion" | "cobro">(
    turno && puedeEvolucion && turno.fecha === hoyISO() && turno.estado !== "Atendida"
      ? "evolucion"
      : "ficha",
  );
  const [detalle, setDetalle] = useState("");
  const [pieza, setPieza] = useState("");
  const [monto, setMonto] = useState("");
  const [medio, setMedio] = useState("Efectivo");
  const saldo = r ? r.cuenta.reduce((a, m) => a + (m.tipo === "Cargo" ? m.monto : -m.monto), 0) : 0;

  if (!p || !r) {
    return (
      <Hoja titulo={paciente} onClose={onClose}>
        <p className="text-sm text-muted-foreground">
          Este paciente no tiene ficha cargada todavía.
        </p>
      </Hoja>
    );
  }
  const tel = p.telefono.replace(/[^\d+]/g, "");
  const ultima = [...r.historia].sort((a, b) => b.fecha.localeCompare(a.fecha))[0];

  return (
    <Hoja titulo={paciente} onClose={onClose}>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{edad(p.fechaNacimiento)}</span>·<span>{p.obraSocial || "Particular"}</span>·
        <span>DNI {p.documento.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}</span>
      </div>
      {r.antecedentes.alergias.length > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-1.5 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
          <AlertTriangle className="size-4" /> Alergias: {r.antecedentes.alergias.join(", ")}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <a href={`tel:${tel}`} className={`${BTN_SECUNDARIO} flex-1`}>
          <Phone className="size-3.5" /> Llamar
        </a>
        <a
          href={`https://wa.me/${tel.replace("+", "")}`}
          target="_blank"
          rel="noreferrer"
          className="btn-wa flex-1"
        >
          <IconoWhatsApp /> WhatsApp
        </a>
      </div>
      <div className="mt-3 flex gap-1 rounded-full bg-primary/[0.06] p-0.5">
        {(
          [
            ["ficha", "Ficha", true],
            ["evolucion", "Evolución", puedeEvolucion],
            ["cobro", "Cobrar", puedeCobrar],
          ] as const
        )
          .filter(([, , ok]) => ok)
          .map(([id, l]) => (
            <button
              key={id}
              onClick={() => setModo(id)}
              aria-pressed={modo === id}
              className={`flex-1 rounded-full py-1.5 text-xs font-semibold ${modo === id ? "bg-primary text-white" : "text-muted-foreground"}`}
            >
              {l}
            </button>
          ))}
      </div>

      {modo === "ficha" && (
        <div className="mt-3 space-y-2 text-sm">
          {verHistoria ? (
            <>
              {(r.antecedentes.enfermedades.length > 0 || r.antecedentes.medicacion) && (
                <div className="rounded-xl bg-white/80 p-3 text-xs ring-1 ring-primary/10">
                  {r.antecedentes.enfermedades.length > 0 && (
                    <p>
                      <b>Enfermedades:</b> {r.antecedentes.enfermedades.join(", ")}
                    </p>
                  )}
                  {r.antecedentes.medicacion && (
                    <p>
                      <b>Medicación:</b> {r.antecedentes.medicacion}
                    </p>
                  )}
                </div>
              )}
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Tratamientos en curso
              </p>
              {r.tratamientos
                .filter((t) => t.estado === "En tratamiento" || t.estado === "Planificado")
                .map((t) => (
                  <p
                    key={t.id}
                    className="rounded-xl bg-white/80 px-3 py-2 text-xs ring-1 ring-primary/10"
                  >
                    <b>{t.nombre}</b>
                    {t.pieza ? ` · pieza ${t.pieza}` : ""} — {t.sesiones?.length ?? 0}/
                    {t.sesionesPlan ?? 1} sesiones
                  </p>
                ))}
              {r.tratamientos.length === 0 && (
                <p className="text-xs text-muted-foreground">Sin tratamientos cargados.</p>
              )}
              {ultima && (
                <>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Última evolución
                  </p>
                  <p className="rounded-xl bg-white/80 px-3 py-2 text-xs ring-1 ring-primary/10">
                    {ultima.fecha.split("-").reverse().join("/")} · {ultima.profesional}:{" "}
                    {ultima.detalle}
                  </p>
                </>
              )}
            </>
          ) : (
            <p className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-4" /> Tu rol no tiene permiso para ver la historia
              clínica.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Saldo de la cuenta:{" "}
            <b className={saldo > 0 ? "text-destructive" : "text-emerald-600"}>
              {saldo > 0 ? `$ ${saldo.toLocaleString("es-AR")}` : "al día"}
            </b>
          </p>
        </div>
      )}

      {modo === "evolucion" && (
        <form
          className="mt-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!detalle.trim()) return;
            if (ctx.vista) return ctx.onToast("En la vista previa no se guardan evoluciones.");
            cambiar(p.id, "historia", (prev) => [
              ...prev,
              {
                id: Date.now(),
                fecha: hoyISO(),
                profesional: nombreDe(ctx.yo),
                motivo: turno?.tratamiento ?? "Consulta",
                pieza: pieza.trim(),
                detalle: detalle.trim(),
              },
            ]);
            if (turno)
              setTurnosStore((prev) =>
                prev.map((x) => (x.id === turno.id ? { ...x, estado: "Atendida" } : x)),
              );
            registrarEventoEquipo(
              ctx.yo.id,
              "Evolución",
              `${paciente}${turno ? ` · ${turno.tratamiento}` : ""}`,
            );
            ctx.onToast("Evolución guardada en la historia clínica y turno marcado como atendido");
            onClose();
          }}
        >
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Field label="Motivo">
                <input
                  value={turno?.tratamiento ?? "Consulta"}
                  disabled
                  className={`${INPUT} bg-muted/40`}
                />
              </Field>
            </div>
            <Field label="Pieza">
              <input
                value={pieza}
                onChange={(e) => setPieza(e.target.value)}
                className={INPUT}
                placeholder="Ej: 36"
              />
            </Field>
          </div>
          <Field label="Qué se hizo *">
            <textarea
              autoFocus
              rows={4}
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              className="w-full rounded-xl border border-primary/12 bg-white px-3 py-2 text-sm outline-none focus:border-primary/45"
              placeholder="Procedimiento, indicaciones, próximo control…"
            />
          </Field>
          <button type="submit" className={`${BTN_PRIMARIO} w-full`} disabled={!detalle.trim()}>
            <Check className="size-4" /> Guardar y marcar atendido
          </button>
        </form>
      )}

      {modo === "cobro" && (
        <form
          className="mt-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(monto);
            if (!n || n <= 0) return;
            if (ctx.vista) return ctx.onToast("En la vista previa no se registran cobros.");
            cambiar(p.id, "cuenta", (prev) => [
              ...prev,
              {
                id: Date.now(),
                fecha: hoyISO(),
                tipo: "Pago",
                concepto: "Cobro en recepción",
                medio,
                monto: n,
                notas: `Registrado por ${nombreDe(ctx.yo)}`,
              },
            ]);
            registrarEventoEquipo(
              ctx.yo.id,
              "Cobro",
              `${paciente} · $ ${n.toLocaleString("es-AR")} (${medio})`,
            );
            ctx.onToast(`Cobro de $ ${n.toLocaleString("es-AR")} registrado`);
            onClose();
          }}
        >
          <p className="rounded-xl bg-primary/[0.05] px-3 py-2 text-xs">
            Saldo actual: <b>{saldo > 0 ? `$ ${saldo.toLocaleString("es-AR")}` : "al día"}</b>
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Monto">
              <input
                type="number"
                min={1}
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className={INPUT}
                placeholder={saldo > 0 ? String(saldo) : "0"}
              />
            </Field>
            <Field label="Medio">
              <select value={medio} onChange={(e) => setMedio(e.target.value)} className={INPUT}>
                {["Efectivo", "Tarjeta de débito", "Tarjeta de crédito", "Transferencia"].map(
                  (m) => (
                    <option key={m}>{m}</option>
                  ),
                )}
              </select>
            </Field>
          </div>
          <button type="submit" className={`${BTN_PRIMARIO} w-full`} disabled={!Number(monto)}>
            <Wallet className="size-4" /> Registrar cobro
          </button>
        </form>
      )}
    </Hoja>
  );
}

/* ───────────── Agenda ───────────── */

function AgendaEquipo({ ctx }: { ctx: Ctx }) {
  const hoy = hoyISO();
  const [dia, setDia] = useState(hoy);
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(hoy, i));
  const lista = ctx.turnosVisibles
    .filter((t) => t.fecha === dia && t.estado !== "Cancelada")
    .sort((a, b) => a.hora.localeCompare(b.hora));
  return (
    <div className="space-y-3">
      <h1 className="font-display text-xl font-semibold">Agenda</h1>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {dias.map((d) => {
          const n = ctx.turnosVisibles.filter(
            (t) => t.fecha === d && t.estado !== "Cancelada",
          ).length;
          return (
            <button
              key={d}
              onClick={() => setDia(d)}
              aria-pressed={dia === d}
              className={`flex min-w-16 shrink-0 flex-col items-center rounded-2xl border px-3 py-2 ${dia === d ? "border-primary bg-primary text-white shadow" : "border-primary/15 bg-white"}`}
            >
              <span className="text-[10px] font-semibold uppercase opacity-80">
                {DIAS[new Date(`${d}T12:00:00`).getDay()]}
              </span>
              <span className="font-display text-lg font-bold leading-tight">{d.slice(8, 10)}</span>
              <span
                className={`text-[10px] ${dia === d ? "text-white/80" : "text-muted-foreground"}`}
              >
                {n} turnos
              </span>
            </button>
          );
        })}
      </div>
      {lista.length === 0 ? (
        <p className="card-grad p-8 text-center text-sm text-muted-foreground">
          No hay turnos {etiquetaDia(dia).toLowerCase()}.
        </p>
      ) : (
        <ul className="space-y-2">
          {lista.map((t) => (
            <FilaTurno
              key={t.id}
              t={t}
              ctx={ctx}
              mostrarProfesional={ctx.yo.role !== "odontologo"}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/* ───────────── Pacientes ───────────── */

function PacientesEquipo({ ctx }: { ctx: Ctx }) {
  const { pacientes } = usePacientes();
  const registros = useTodosLosRegistros();
  const [q, setQ] = useState("");
  const propios = new Set(ctx.turnosVisibles.map((t) => t.paciente));
  const base =
    ctx.yo.role === "odontologo"
      ? pacientes.filter((p) => propios.has(`${p.nombre} ${p.apellido}`))
      : pacientes;
  const texto = normalizarBusqueda(q);
  const lista = base.filter(
    (p) =>
      !texto ||
      normalizarBusqueda(`${p.nombre} ${p.apellido} ${p.documento} ${p.telefono}`).includes(texto),
  );
  const proximo = (p: Paciente) =>
    ctx.turnosVisibles
      .filter(
        (t) =>
          t.paciente === `${p.nombre} ${p.apellido}` &&
          t.fecha >= hoyISO() &&
          t.estado !== "Cancelada" &&
          t.estado !== "Atendida",
      )
      .sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`))[0];
  return (
    <div className="space-y-3">
      <h1 className="font-display text-xl font-semibold">
        {ctx.yo.role === "odontologo" ? "Mis pacientes" : "Pacientes"}
      </h1>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary/60" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, DNI o teléfono"
          className={`${INPUT} pl-9`}
        />
      </div>
      <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {lista.map((p) => {
          const t = proximo(p);
          const alergias = registros[p.id]?.antecedentes.alergias ?? [];
          return (
            <li key={p.id}>
              <button
                onClick={() => ctx.abrirFicha(`${p.nombre} ${p.apellido}`)}
                className="card-grad flex w-full items-center gap-3 p-3 text-left transition-all hover:-translate-y-0.5"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-xs font-bold text-primary">
                  {`${p.nombre[0] ?? ""}${p.apellido[0] ?? ""}`}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    {p.nombre} {p.apellido}
                    {alergias.length > 0 && (
                      <AlertTriangle
                        className="size-3.5 text-destructive"
                        aria-label="Tiene alergias"
                      />
                    )}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {t
                      ? `Próximo: ${etiquetaDia(t.fecha)} ${t.hora} · ${t.tratamiento}`
                      : `${p.obraSocial || "Particular"} · sin turnos próximos`}
                  </span>
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
            </li>
          );
        })}
      </ul>
      {lista.length === 0 && (
        <p className="card-grad p-8 text-center text-sm text-muted-foreground">
          No se encontraron pacientes.
        </p>
      )}
    </div>
  );
}

/* ───────────── Gabinete ───────────── */

function Gabinete({ ctx }: { ctx: Ctx }) {
  const { checklist } = storeEquipoPortal.usar();
  const clave = `${ctx.yo.id}:${hoyISO()}`;
  const hechas = checklist[clave] ?? [];
  const { plan } = useCloudEsther();
  const conInventario = MODULES.some((m) => m.id === "inventario" && availableIn(m, plan));
  const { insumos, pedidos } = storeInventario.usar();
  const nombreYo = `${ctx.yo.firstName} ${ctx.yo.lastName}`;
  const sede = SUCURSALES[0] ?? "Clínica Centro";
  const deSede = insumos.filter((s) => s.sucursal === sede);
  const bajos = deSede.filter((s) => ["Bajo", "Agotado"].includes(nivelStock(s)));
  const [uso, setUso] = useState({ id: deSede[0]?.id ?? "", cant: "1" });
  const misPedidos = pedidos.filter((p) => p.autor === nombreYo).slice(0, 3);
  const alternar = (tarea: string) => {
    if (ctx.vista) return ctx.onToast("En la vista previa no se marcan tareas.");
    const sig = hechas.includes(tarea) ? hechas.filter((x) => x !== tarea) : [...hechas, tarea];
    setEquipoPortal("checklist", (prev) => ({ ...prev, [clave]: sig }));
    if (sig.length === CHECKLIST_GABINETE.length) {
      registrarEventoEquipo(ctx.yo.id, "Gabinete listo", "Completó el checklist del día");
      ctx.onToast("¡Gabinete listo para atender!");
    }
  };
  return (
    <div className="space-y-3">
      <h1 className="font-display text-xl font-semibold">Gabinete</h1>
      <Tarjeta>
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">Checklist de hoy</span>
          <span className="text-muted-foreground">
            {hechas.length}/{CHECKLIST_GABINETE.length}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all"
            style={{ width: `${(hechas.length / CHECKLIST_GABINETE.length) * 100}%` }}
          />
        </div>
        <ul className="mt-3 space-y-1.5">
          {CHECKLIST_GABINETE.map((t) => {
            const ok = hechas.includes(t);
            return (
              <li key={t}>
                <button
                  onClick={() => alternar(t)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm ring-1 transition-colors ${ok ? "bg-emerald-50 ring-emerald-200" : "bg-white/80 ring-primary/10"}`}
                >
                  <span
                    className={`grid size-6 shrink-0 place-items-center rounded-full ${ok ? "bg-emerald-500 text-white" : "border-2 border-primary/25"}`}
                  >
                    {ok && <Check className="size-3.5" />}
                  </span>
                  <span className={ok ? "text-muted-foreground line-through" : ""}>{t}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </Tarjeta>
      {conInventario && (
        <>
          <Tarjeta>
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Package className="size-4 text-primary" /> Insumos con stock bajo
            </p>
            {bajos.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">Todo en orden.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {bajos.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-white/80 px-3 py-2 text-xs ring-1 ring-amber-200"
                  >
                    <span>
                      <b>{s.nombre}</b> · {s.ubicacion}
                    </span>
                    <span className="font-semibold text-amber-700">
                      {s.stock} {s.unidad} (mín. {s.minimo})
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <button
              className={`${BTN_SECUNDARIO} mt-3 w-full`}
              onClick={() => {
                if (ctx.vista) return ctx.onToast("En la vista previa no se envían pedidos.");
                const detalle = bajos.length
                  ? `Reponer: ${bajos.map((s) => s.nombre).join(", ")}`
                  : "Revisar insumos del gabinete";
                registrarPedidoEquipo(nombreYo, sede, detalle);
                registrarEventoEquipo(ctx.yo.id, "Pidió reposición", detalle);
                ctx.onToast("Pedido de reposición enviado a administración");
              }}
            >
              <Package className="size-3.5" /> Pedir reposición
            </button>
            {misPedidos.length > 0 && (
              <ul className="mt-2 space-y-1">
                {misPedidos.map((p) => (
                  <li
                    key={p.id}
                    className="flex justify-between gap-2 text-[11px] text-muted-foreground"
                  >
                    <span className="truncate">{p.detalle}</span>
                    <span
                      className={`shrink-0 font-semibold ${p.estado === "Resuelto" ? "text-emerald-600" : "text-amber-700"}`}
                    >
                      {p.estado}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>
          <Tarjeta>
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Package className="size-4 text-primary" /> Registrar uso de insumos
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Se descuenta del stock de {sede}.</p>
            <div className="mt-2 grid grid-cols-[1fr_72px] gap-2">
              <select
                aria-label="Insumo usado"
                value={uso.id}
                onChange={(e) => setUso((u) => ({ ...u, id: e.target.value }))}
                className="h-10 rounded-xl border border-primary/15 bg-white px-3 text-sm"
              >
                {deSede.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre} ({s.stock})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                aria-label="Cantidad usada"
                value={uso.cant}
                onChange={(e) => setUso((u) => ({ ...u, cant: e.target.value }))}
                className="h-10 rounded-xl border border-primary/15 bg-white px-3 text-sm"
              />
            </div>
            <button
              className={`${BTN_SECUNDARIO} mt-2 w-full`}
              onClick={() => {
                if (ctx.vista) return ctx.onToast("En la vista previa no se registra consumo.");
                const ins = deSede.find((s) => s.id === uso.id);
                const n = Number(uso.cant);
                if (!ins || !(n > 0)) return ctx.onToast("Elegí el insumo y la cantidad.");
                registrarMovimiento({
                  insumoId: ins.id,
                  tipo: "Salida",
                  cantidad: -n,
                  motivo: `Uso en ${ctx.yo.office ?? "gabinete"}`,
                  usuario: nombreYo,
                  referencia: "",
                });
                ctx.onToast(`Registrado: ${n} ${ins.unidad} de ${ins.nombre}`);
              }}
            >
              <Check className="size-3.5" /> Registrar uso
            </button>
          </Tarjeta>
        </>
      )}
    </div>
  );
}

/* ───────────── Avisos ───────────── */

function Avisos({
  ctx,
  avisos,
}: {
  ctx: Ctx;
  avisos: ReturnType<typeof useNotificaciones>["notificaciones"];
}) {
  const { plan } = useCloudEsther();
  const conRRHH = MODULES.some((m) => m.id === "rrhh" && availableIn(m, plan));
  return (
    <div className="space-y-3">
      <h1 className="font-display text-xl font-semibold">Avisos para vos</h1>
      {conRRHH && <ComunicadosPortal yo={ctx.yo} vista={!!ctx.vista} onToast={ctx.onToast} />}
      {avisos.length === 0 ? (
        <div className="card-grad p-8 text-center">
          <CheckCheck className="mx-auto size-8 text-emerald-500" />
          <p className="mt-1 text-sm font-medium">No tenés avisos pendientes</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {avisos.map((n) => (
            <li key={n.id} className="card-grad flex items-start gap-3 p-3.5">
              <span
                className={`mt-0.5 size-2.5 shrink-0 rounded-full ${n.prioridad === "Urgente" ? "bg-destructive" : n.prioridad === "Alta" ? "bg-amber-500" : "bg-primary/50"}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{n.titulo}</p>
                <p className="text-xs text-muted-foreground">{n.detalle}</p>
                <p className="mt-1 text-[10.5px] text-muted-foreground">
                  {n.categoria} · {n.prioridad}
                  {n.vence ? ` · vence ${n.vence.split("-").reverse().join("/")}` : ""}
                </p>
              </div>
              <button
                className={BTN_SECUNDARIO}
                onClick={() => {
                  if (ctx.vista) return ctx.onToast("En la vista previa no se completan avisos.");
                  cambiarEstadoNotif(
                    [{ id: n.id, titulo: n.titulo }],
                    { completada: new Date().toISOString(), leida: true },
                    "Completó",
                    nombreDe(ctx.yo),
                  );
                  registrarEventoEquipo(ctx.yo.id, "Completó aviso", n.titulo);
                  ctx.onToast("Aviso completado");
                }}
              >
                <Check className="size-3.5" /> Listo
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ───────────── Mi perfil ───────────── */

function PerfilEquipo({ ctx }: { ctx: Ctx }) {
  const { plan } = useCloudEsther();
  const conRRHH = MODULES.some((m) => m.id === "rrhh" && availableIn(m, plan));
  const { ausencias, miembros: miembrosEquipo } = useEquipo();
  const { fichajes } = storeEquipoPortal.usar();
  const { fichajes: historial, config } = storeRRHH.usar();
  void fichajes; // se re-renderiza cuando ficha desde el portal
  const mios = marcas(historial, miembrosEquipo, config.toleranciaMin)
    .filter((f) => f.miembroId === ctx.yo.id)
    .sort((a, b) => `${b.fecha}${b.entrada}`.localeCompare(`${a.fecha}${a.entrada}`))
    .slice(0, 10);
  const misAusencias = ausencias.filter((a) => a.miembroId === ctx.yo.id && a.hasta >= hoyISO());
  const permisos = ctx.yo.permissions.filter((p) => p.enabled);
  return (
    <div className="space-y-3">
      <h1 className="font-display text-xl font-semibold">Mi perfil</h1>
      <Tarjeta className="flex items-center gap-3">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-violet-400 text-lg font-bold text-white">
          {`${ctx.yo.firstName[0] ?? ""}${ctx.yo.lastName[0] ?? ""}`}
        </span>
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold">{nombreDe(ctx.yo)}</p>
          <p className="text-xs text-muted-foreground">
            {ROL_LABEL[ctx.yo.role]}
            {ctx.yo.specialties?.length ? ` · ${ctx.yo.specialties.join(", ")}` : ""}
            {ctx.yo.licenseNumber ? ` · ${ctx.yo.licenseNumber}` : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            {ctx.yo.email} · {ctx.yo.phone}
          </p>
        </div>
      </Tarjeta>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Tarjeta>
          <p className="text-sm font-semibold">Mi horario</p>
          <ul className="mt-2 space-y-1 text-xs">
            {ctx.yo.schedule.map((d) => (
              <li key={d.day} className="flex justify-between rounded-lg bg-white/80 px-3 py-1.5">
                <span>{d.day}</span>
                <span className={d.active ? "font-semibold" : "text-muted-foreground"}>
                  {d.active ? `${d.start} – ${d.end}` : "No trabaja"}
                </span>
              </li>
            ))}
          </ul>
          {misAusencias.length > 0 && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
              Próxima ausencia: {misAusencias[0]?.tipo} del{" "}
              {misAusencias[0]?.desde.split("-").reverse().join("/")} al{" "}
              {misAusencias[0]?.hasta.split("-").reverse().join("/")}
            </p>
          )}
        </Tarjeta>
        <Tarjeta>
          <p className="text-sm font-semibold">Mis fichajes</p>
          {mios.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">Todavía no registraste fichajes.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-xs">
              {mios.map((f) => (
                <li key={f.id} className="flex justify-between rounded-lg bg-white/80 px-3 py-1.5">
                  <span>{etiquetaDia(f.fecha)}</span>
                  <span className="font-semibold">
                    {f.entrada} – {f.salida || "en curso"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>
      {conRRHH && <MiRRHHPortal yo={ctx.yo} vista={!!ctx.vista} onToast={ctx.onToast} />}
      <Tarjeta>
        <p className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="size-4 text-primary" /> Lo que podés hacer
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {permisos.map((p) => (
            <Pill key={p.key} clase="bg-primary/10 text-primary">
              {p.label}
            </Pill>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Los permisos los configura la clínica en Equipo → Permisos y accesos.
        </p>
      </Tarjeta>
      <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <FileText className="size-3.5" /> Tus datos personales se editan desde administración.
      </p>
    </div>
  );
}
