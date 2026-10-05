import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Bell,
  Briefcase,
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

/* Ubicación: src/components/cloud-esther/PortalEquipo.tsx

   Portal del equipo (/equipo): la app que usan en el celular o la PC los odontólogos,
   asistentes, secretarias y administración. Cada rol ve lo suyo y respeta los permisos
   configurados en Equipo → Permisos y accesos. Trabaja sobre los datos reales del demo
   (Agenda, carpetas de pacientes, Notificaciones), separados por empresa. */

type Seccion = "hoy" | "administracion" | "agenda" | "pacientes" | "gabinete" | "avisos" | "perfil";

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

  if (!montado) return <div className="min-h-screen bg-[#faf9ff]" />;
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
        setSesion(null);
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
  const { clinica } = useSesion();
  const { miembros } = useEquipo();
  const { turnos } = storeAgenda.usar();
  const { notificaciones } = useNotificaciones();
  const [seccion, setSeccion] = useState<Seccion>(
    miembro.role === "secretaria" || miembro.role === "administrador" ? "administracion" : "hoy",
  );
  const [ficha, setFicha] = useState<{ paciente: string; turno?: Turno } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  const onToast = (m: string) => {
    setToast(m);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 2600);
  };

  // Qué turnos ve cada rol: el odontólogo los suyos, el asistente los de sus odontólogos, recepción todos.
  const asistidos = miembros.filter((m) => miembro.assistantOf?.includes(m.id)).map(nombreDe);
  const turnosVisibles = turnos.filter((t) =>
    miembro.role === "odontologo"
      ? t.odontologo === nombreDe(miembro)
      : miembro.role === "asistente"
        ? asistidos.includes(t.odontologo)
        : true,
  );

  const rolAvisos = ROL_AVISOS[miembro.role];
  const misAvisos = notificaciones.filter(
    (n) =>
      !n.estado.completada &&
      (n.asignado === nombreDe(miembro) || (rolAvisos && n.asignado === rolAvisos)),
  );

  const secciones = seccionesDe(miembro.role);
  const ctx: Ctx = {
    yo: miembro,
    vista,
    turnosVisibles,
    onToast,
    abrirFicha: (paciente, turno) => setFicha(turno ? { paciente, turno } : { paciente }),
    ir: (s) => {
      setSeccion(s);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
  };

  return (
    <div className="flex min-h-screen bg-[#faf9ff]">
      {/* Sidebar en PC (misma tipografía que Cloud Esther) */}
      <aside className="hidden w-64 shrink-0 self-stretch border-r border-sidebar-border bg-sidebar lg:block">
        <div className="sticky top-0 flex h-screen flex-col">
          <div className="px-5 pb-4 pt-5">
            <div className="flex items-center gap-2.5">
              <BrandMark className="size-9 shrink-0" />
              <span className="leading-tight">
                <span className="block font-display text-[15px] font-semibold tracking-tight text-sidebar-foreground">
                  Cloud Esther
                </span>
                <span className="block text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/50">
                  Portal del equipo
                </span>
              </span>
            </div>
            <div className="mt-4 rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45">
                Clínica
              </p>
              <p className="truncate text-[13px] font-medium text-sidebar-foreground">
                {clinica?.nombre ?? "Clínica Dental Esther"}
              </p>
              <p className="truncate text-[11px] text-sidebar-foreground/60">
                {ROL_LABEL[miembro.role]}
              </p>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto px-3">
            <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/40">
              Mi jornada
            </p>
            <ul className="space-y-0.5">
              {secciones.map((s) => {
                const activo = seccion === s.id;
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => ctx.ir(s.id)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                        activo
                          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-[inset_2px_0_0_0_var(--color-sidebar-primary)]"
                          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      <s.icon
                        className={`size-4 shrink-0 ${activo ? "text-sidebar-primary" : ""}`}
                      />
                      <span className="truncate">{s.label}</span>
                      {s.id === "avisos" && misAvisos.length > 0 && (
                        <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-sidebar-primary px-1.5 text-[10px] font-bold text-sidebar-primary-foreground">
                          {misAvisos.length}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="space-y-2 border-t border-sidebar-border p-3">
            <div className="flex items-center gap-2.5 rounded-xl bg-sidebar-accent/50 p-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-violet-400 text-xs font-bold text-white">
                {`${miembro.firstName[0] ?? ""}${miembro.lastName[0] ?? ""}`}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-sidebar-foreground">
                  {nombreDe(miembro)}
                </span>
                <span className="block truncate text-[11px] text-sidebar-foreground/55">
                  {miembro.email}
                </span>
              </span>
            </div>
            {vista ? (
              <Link
                to="/demo/equipo-profesional"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-sidebar-border px-3 py-2 text-xs text-sidebar-foreground/75 hover:bg-sidebar-accent/60"
              >
                <LogOut className="size-3.5" /> Volver a Equipo
              </Link>
            ) : (
              <button
                onClick={onSalir}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-sidebar-border px-3 py-2 text-xs text-sidebar-foreground/75 hover:bg-sidebar-accent/60"
              >
                <LogOut className="size-3.5" /> Cerrar sesión
              </button>
            )}
          </div>
        </div>
      </aside>

      <main className="relative min-w-0 flex-1 pb-24 lg:pb-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_5%,rgba(124,58,237,0.12),transparent_28%),linear-gradient(135deg,#f8f6ff_0%,#f3effd_48%,#faf8ff_100%)]"
        />
        {/* Barra superior en el celular */}
        <header className="sticky top-0 z-30 flex items-center gap-2.5 border-b border-primary/10 bg-white/85 px-4 py-2.5 backdrop-blur-md lg:hidden">
          <BrandMark className="size-8" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold">{nombreDe(miembro)}</p>
            <p className="truncate text-[11px] text-muted-foreground">{ROL_LABEL[miembro.role]}</p>
          </div>
          {vista ? (
            <Link to="/demo/equipo-profesional" className={BTN_SECUNDARIO}>
              Volver
            </Link>
          ) : (
            <button
              onClick={onSalir}
              aria-label="Cerrar sesión"
              className="grid size-9 place-items-center rounded-full border border-primary/15 bg-white text-muted-foreground"
            >
              <LogOut className="size-4" />
            </button>
          )}
        </header>

        <div className="relative mx-auto w-full max-w-[1180px] px-4 py-4 md:px-6 lg:px-8 lg:py-6">
          {vista && (
            <p className="mb-3 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-800">
              <Eye className="size-4" /> Vista previa: así ve el portal <b>{nombreDe(miembro)}</b> (
              {ROL_LABEL[miembro.role]}).
            </p>
          )}
          {seccion === "administracion" && (
            <EspacioAdministrativo
              yo={miembro}
              clinica={clinica?.nombre ?? "la clínica"}
              vista={vista}
              puede={(permiso) => tiene(miembro, permiso)}
              turnos={turnosVisibles}
              onToast={onToast}
              abrirFicha={(paciente) => setFicha({ paciente })}
            />
          )}
          {seccion === "hoy" && <Hoy ctx={ctx} avisos={misAvisos.length} />}
          {seccion === "agenda" && <AgendaEquipo ctx={ctx} />}
          {seccion === "pacientes" && <PacientesEquipo ctx={ctx} />}
          {seccion === "gabinete" && <Gabinete ctx={ctx} />}
          {seccion === "avisos" && <Avisos ctx={ctx} avisos={misAvisos} />}
          {seccion === "perfil" && <PerfilEquipo ctx={ctx} />}
        </div>
      </main>

      {/* Navegación inferior en el celular */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid border-t border-primary/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
        style={{ gridTemplateColumns: `repeat(${secciones.length}, minmax(0,1fr))` }}
        aria-label="Secciones"
      >
        {secciones.map((s) => {
          const activo = seccion === s.id;
          return (
            <button
              key={s.id}
              onClick={() => ctx.ir(s.id)}
              className={`relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${activo ? "text-primary" : "text-muted-foreground"}`}
            >
              {activo && (
                <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-primary" />
              )}
              <s.icon className="size-5" />
              {s.label}
              {s.id === "avisos" && misAvisos.length > 0 && (
                <span className="absolute right-[22%] top-1 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] text-white">
                  {misAvisos.length}
                </span>
              )}
            </button>
          );
        })}
      </nav>

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
          className="fixed bottom-20 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background shadow-xl lg:bottom-6"
          role="status"
        >
          {toast}
        </div>
      )}
    </div>
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
      className={`card-grad flex flex-wrap items-center gap-3 p-3 ${enCurso ? "ring-2 ring-primary/40" : ""}`}
    >
      <button
        onClick={() => ctx.abrirFicha(t.paciente, t)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span
          className={`grid w-14 shrink-0 place-items-center rounded-xl py-2 ${enCurso ? "bg-primary text-white" : "bg-primary/10 text-primary"}`}
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

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-violet-600 to-fuchsia-600 p-5 text-white shadow-[0_20px_45px_-25px_rgba(124,58,237,0.8)]">
        <div className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full border-[26px] border-white/10" />
        <p className="relative text-[11px] font-bold uppercase tracking-[0.2em] text-white/75">
          {saludo}
        </p>
        <h1 className="relative mt-1 font-display text-2xl font-bold tracking-tight md:text-3xl">
          {trato}
          {ctx.yo.firstName}
        </h1>
        <p className="relative mt-1 text-sm text-white/85">
          {deHoy.length
            ? `Hoy ${deHoy.length === 1 ? "hay 1 turno" : `hay ${deHoy.length} turnos`}${ctx.yo.role === "secretaria" || ctx.yo.role === "administrador" ? " en la clínica" : ""}.`
            : "Hoy no hay turnos agendados."}
          {proximo ? ` Próximo: ${proximo.hora} ${proximo.paciente}.` : ""}
        </p>
        <div className="relative mt-4">
          <Fichaje ctx={ctx} />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { l: "Turnos hoy", v: deHoy.length, i: CalendarDays, s: "agenda" as Seccion },
          { l: "Atendidos", v: atendidos, i: CheckCheck, s: "agenda" as Seccion },
          { l: "Por atender", v: pendientes.length, i: Clock3, s: "agenda" as Seccion },
          { l: "Avisos para vos", v: avisos, i: Bell, s: "avisos" as Seccion },
        ].map((c) => (
          <button
            key={c.l}
            onClick={() => ctx.ir(c.s)}
            className="card-grad flex items-start justify-between p-3.5 text-left transition-all hover:-translate-y-0.5"
          >
            <span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {c.l}
              </span>
              <span className="mt-1 block text-2xl font-bold text-primary">{c.v}</span>
            </span>
            <span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary">
              <c.i className="size-4" />
            </span>
          </button>
        ))}
      </div>

      <Tarjeta>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="font-display text-base font-semibold">
            {ctx.yo.role === "odontologo"
              ? "Mis pacientes de hoy"
              : ctx.yo.role === "asistente"
                ? "Pacientes de hoy de tus odontólogos"
                : "Agenda de hoy"}
          </p>
          {tiene(ctx.yo, "gestionar_turnos") && ctx.yo.role !== "asistente" && (
            <button className={BTN_PRIMARIO} onClick={() => setNuevaCita(true)}>
              <CalendarPlus className="size-3.5" /> Nueva cita
            </button>
          )}
        </div>
        {deHoy.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No hay turnos para hoy.</p>
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
      </Tarjeta>

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
          className={`${BTN_SECUNDARIO} flex-1`}
        >
          <MessageCircle className="size-3.5" /> WhatsApp
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
