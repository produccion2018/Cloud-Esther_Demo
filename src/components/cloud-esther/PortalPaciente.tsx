import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bell,
  CalendarCheck2,
  CalendarDays,
  CalendarPlus,
  Check,
  CheckCheck,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Download,
  Eye,
  FileText,
  Home,
  Landmark,
  LogOut,
  Menu,
  MessageCircle,
  Paperclip,
  Pill as PillIcon,
  Printer,
  ReceiptText,
  RefreshCcw,
  ScanLine,
  Send,
  ShieldCheck,
  KeyRound,
  History,
  LifeBuoy,
  Mail,
  Stethoscope,
  Upload,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BrandMark } from "@/components/cloud-esther/AppShell";
import { HeroParallax } from "@/components/cloud-esther/HeroParallax";
import { useRegistrosPacientes, type Registros } from "@/components/cloud-esther/PacienteSecciones";
import { CloudEstherProvider } from "@/lib/cloud-esther/data";
import { useSesion } from "@/lib/cloud-esther/auth-store";
import { usePacientes, type Paciente } from "@/lib/cloud-esther/pacientes";
import { useEquipo } from "@/lib/cloud-esther/equipo-store";
import {
  TRATAMIENTOS as PRACTICAS,
  setTurnosStore,
  storeAgenda,
  type Turno,
} from "@/lib/cloud-esther/agenda-store";
import { setComunicacion, storeComunicacion } from "@/lib/cloud-esther/comunicacion-store";
import {
  DOCS_BASE,
  docsDe,
  guardarSesionPortal,
  leerSesionPortal,
  registrarEventoPortal,
  setPortal,
  storePortal,
  type DocSolicitada,
} from "@/lib/cloud-esther/portal-store";
import { capitalizarNombre } from "@/lib/utils";
import { storePresupuestos } from "@/lib/cloud-esther/presupuestos-store";
import { totalesPresupuesto } from "@/components/cloud-esther/presupuestos/Presupuestos";
import { EncabezadoSeccion, PortalShell } from "@/components/cloud-esther/portales/PortalShell";
import { usePreferenciasPortal } from "@/components/cloud-esther/portales/preferencias";
import {
  NotificacionesUniversales,
  type NotifUniversal,
} from "@/components/cloud-esther/portales/NotificacionesUniversales";
import {
  AutorizacionesPanel,
  PrivacidadPaciente,
} from "@/components/cloud-esther/portales/AutorizacionesPanel";
import {
  EstadoCuenta,
  HistorialPaciente,
  SoporteAyuda,
} from "@/components/cloud-esther/portales/paciente/SeccionesPaciente";
import { storeAutorizaciones } from "@/lib/cloud-esther/autorizaciones-store";
import { descargarBlob, descargarPDF, documentoPDF } from "@/lib/descargas";
import { volverSiEsPrueba } from "@/lib/acceso-prueba";

/* Ubicación: src/components/cloud-esther/PortalPaciente.tsx

   Portal del paciente: lo que ve cada paciente de SU información en la clínica. Todo sale de
   los datos reales del demo (Agenda, carpeta del paciente, cuenta corriente y Comunicación),
   separado por empresa. Lo que el paciente hace acá (pedir o confirmar turnos, aprobar un
   presupuesto, pagar, escribir) aparece al instante en los módulos de la clínica.
   TODO backend: login propio del paciente (magic link) y API filtrada por pacienteId + clinicId. */

type Seccion =
  | "inicio"
  | "turnos"
  | "tratamientos"
  | "documentos"
  | "historial"
  | "autorizaciones"
  | "documentacion"
  | "cuenta"
  | "pagos"
  | "mensajes"
  | "soporte"
  | "perfil"
  | "privacidad";

const SECCIONES: { id: Seccion; label: string; icon: LucideIcon; grupo: string }[] = [
  { id: "inicio", label: "Inicio", icon: Home, grupo: "Mi salud" },
  { id: "turnos", label: "Mis turnos", icon: CalendarDays, grupo: "Mi salud" },
  { id: "tratamientos", label: "Tratamientos", icon: Stethoscope, grupo: "Mi salud" },
  { id: "documentos", label: "Recetas y estudios", icon: FileText, grupo: "Mi salud" },
  { id: "historial", label: "Mi historial", icon: History, grupo: "Mi salud" },
  { id: "autorizaciones", label: "Autorizaciones", icon: KeyRound, grupo: "Trámites" },
  { id: "documentacion", label: "Documentación", icon: Upload, grupo: "Trámites" },
  { id: "cuenta", label: "Estado de cuenta", icon: ReceiptText, grupo: "Trámites" },
  { id: "pagos", label: "Pagos", icon: Wallet, grupo: "Trámites" },
  { id: "mensajes", label: "Mensajes", icon: MessageCircle, grupo: "Ayuda" },
  { id: "soporte", label: "Soporte y ayuda", icon: LifeBuoy, grupo: "Ayuda" },
  { id: "perfil", label: "Mis datos", icon: UserRound, grupo: "Mi cuenta" },
  { id: "privacidad", label: "Privacidad y permisos", icon: ShieldCheck, grupo: "Mi cuenta" },
];

const TITULO_SECCION: Record<Seccion, string> = {
  inicio: "Inicio",
  turnos: "Mis turnos",
  tratamientos: "Tratamientos",
  documentos: "Recetas y estudios",
  historial: "Mi historial",
  autorizaciones: "Autorizaciones",
  documentacion: "Documentación",
  cuenta: "Estado de cuenta",
  pagos: "Pagos",
  mensajes: "Mensajes",
  soporte: "Soporte y ayuda",
  perfil: "Mis datos",
  privacidad: "Privacidad y permisos",
};

/* Bajada de cada sección (encabezado con degradé). */
const DESCRIPCION_SECCION: Record<Seccion, string> = {
  inicio: "",
  turnos: "Pedí, confirmá, cambiá o cancelá tus turnos. La clínica lo ve al instante.",
  tratamientos: "Avance, sesiones realizadas y próximos pasos de cada tratamiento.",
  documentos: "Descargá tus recetas, mirá tus estudios y aprobá presupuestos online.",
  historial: "Todo lo que pasó en tu atención, ordenado en el tiempo.",
  autorizaciones: "Consentimientos y permisos que te pide la clínica. Vos decidís.",
  documentacion: "Subí lo que te pide la clínica. Te avisamos cuando esté aprobado.",
  cuenta: "Movimientos, cuotas y comprobantes de tu cuenta.",
  pagos: "Tu cuenta con la clínica: lo que se cobró, lo que pagaste y tu saldo.",
  mensajes: "Escribile a la clínica. Te responden por acá.",
  soporte: "Preguntas frecuentes y contacto con la clínica.",
  perfil: "Mantené tus datos de contacto al día para recibir recordatorios.",
  privacidad: "Quién puede ver tu información y qué permisos diste.",
};

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
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function fechaLarga(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  if (iso === hoyISO()) return "Hoy";
  if (iso === sumarDias(hoyISO(), 1)) return "Mañana";
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}
function formatearFecha(iso: string) {
  return iso ? iso.slice(0, 10).split("-").reverse().join("/") : "";
}
function ars(n: number) {
  return `$\u00a0${n.toLocaleString("es-AR")}`;
}
function escapar(t: string) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function abrirImpresion(titulo: string, cuerpo: string, clinica: string) {
  const w = documentoPDF(titulo);
  w.document
    .write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapar(titulo)}</title>
  <style>@page{size:A4;margin:16mm}body{font-family:system-ui,sans-serif;color:#1f1535;font-size:13px}h1{font-size:20px;margin:0}
  .meta{color:#6b6480;font-size:12px;margin:4px 0 16px}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #eee8fb}
  th{color:#6d28d9;font-size:12px}.n{text-align:right}.tot td{font-weight:700;border-top:2px solid #6d28d9}</style></head><body>
  <p class="meta">${escapar(clinica)}</p><h1>${escapar(titulo)}</h1>${cuerpo}<script>window.onload=()=>window.print()</script></body></html>`);
  w.document.close();
  return true;
}

function descargarICS(t: Turno, clinica: string) {
  const inicio = `${t.fecha.replace(/-/g, "")}T${t.hora.replace(":", "")}00`;
  const [h = 0, m = 0] = t.hora.split(":").map(Number);
  const finMin = h * 60 + m + 45;
  const fin = `${t.fecha.replace(/-/g, "")}T${String(Math.floor(finMin / 60)).padStart(2, "0")}${String(finMin % 60).padStart(2, "0")}00`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cloud Esther//Portal//ES",
    "BEGIN:VEVENT",
    `UID:turno-${t.id}@cloudesther`,
    `DTSTART:${inicio}`,
    `DTEND:${fin}`,
    `SUMMARY:Turno odontológico · ${t.tratamiento}`,
    `LOCATION:${clinica} · ${t.sucursal}`,
    `DESCRIPTION:Con ${t.odontologo}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Recordatorio de turno",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `turno-${t.fecha}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/* ───────────── Estilos y piezas ───────────── */

const BTN_PRIMARIO =
  "btn-ce focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
const BTN_SECUNDARIO =
  "btn-ce-outline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
const INPUT =
  "h-9 w-full rounded-xl border border-primary/12 bg-white px-3 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary/45 focus:ring-4 focus:ring-primary/10";

const ESTADO_TURNO: Record<Turno["estado"], string> = {
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

function Modal({
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
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-border bg-card p-5 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              Portal del paciente
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">{titulo}</h2>
          </div>
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
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-primary/10 bg-card p-4 shadow-[0_14px_36px_-28px_rgba(124,58,237,0.65)] sm:p-5 ${className}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-fuchsia-500 to-pink-400 opacity-70"
      />
      {children}
    </div>
  );
}

/* El título y la bajada de cada sección van en el encabezado con degradé del portal; acá
   quedan solo las acciones de la sección. */
function TituloSeccion({
  children,
}: {
  icon: LucideIcon;
  titulo: string;
  descripcion: string;
  children?: ReactNode;
}) {
  if (!children) return null;
  return <div className="flex flex-wrap justify-end gap-2">{children}</div>;
}

function Vacio({ icon: Icon, texto }: { icon: LucideIcon; texto: string }) {
  return (
    <div className="card-grad grid min-h-32 place-items-center p-6 text-center">
      <div>
        <Icon className="mx-auto size-7 text-primary/50" />
        <p className="mt-2 text-sm text-muted-foreground">{texto}</p>
      </div>
    </div>
  );
}

/* ───────────── Página ───────────── */

/* /portal: entrada de los pacientes. Con ?vista=ID el equipo lo ve como ese paciente sin login. */
export default function PortalPaciente() {
  return (
    <CloudEstherProvider>
      <PortalGate />
    </CloudEstherProvider>
  );
}

function PortalGate() {
  const [montado, setMontado] = useState(false);
  const [sesion, setSesion] = useState<number | null>(null);
  const [vista, setVista] = useState<number | null>(null);
  const { pacientes } = usePacientes();
  const { accesos } = storePortal.usar();

  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("vista");
    if (v) setVista(Number(v));
    setSesion(leerSesionPortal());
    setMontado(true);
  }, []);

  if (!montado) return <div className="min-h-screen bg-background" />;
  if (vista !== null)
    return <PortalInner modo="vista" pacienteInicial={vista} onSalir={() => {}} />;
  // Si al paciente le revocaron el acceso, se cierra su sesión.
  const valida =
    sesion !== null &&
    accesos[sesion]?.estado === "Activo" &&
    pacientes.some((p) => p.id === sesion);
  if (!valida)
    return (
      <LoginPortal
        onIngresar={(id) => {
          guardarSesionPortal(id);
          setSesion(id);
        }}
      />
    );
  return (
    <PortalInner
      modo="paciente"
      pacienteInicial={sesion}
      onSalir={() => {
        guardarSesionPortal(null);
        if (!volverSiEsPrueba()) setSesion(null);
      }}
    />
  );
}

function LoginPortal({ onIngresar }: { onIngresar: (pacienteId: number) => void }) {
  const { clinica: clinicaSesion } = useSesion();
  const { pacientes } = usePacientes();
  const { accesos } = storePortal.usar();
  const [usuario, setUsuario] = useState("");
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const clinica = clinicaSesion?.nombre ?? "Clínica Dental Esther";

  const buscar = () => {
    const u = usuario.trim().toLowerCase();
    const dni = u.replace(/\D/g, "");
    return pacientes.find(
      (p) =>
        (dni.length >= 7 && p.documento === dni) ||
        (u.includes("@") && p.email.toLowerCase() === u),
    );
  };

  const pedirCodigo = () => {
    setError("");
    const p = buscar();
    if (!p) return setError("No encontramos un paciente con ese DNI o correo en esta clínica.");
    const a = accesos[p.id];
    if (!a || a.estado === "Revocado")
      return setError("Todavía no tenés acceso al portal. Pedile a la clínica que te invite.");
    const oculto = p.email.replace(/^(.).*(@.*)$/, "$1***$2");
    setAviso(`Te enviamos el código a ${oculto}. (Código de práctica: ${a.codigo})`);
  };

  const ingresar = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const p = buscar();
    if (!p) return setError("No encontramos un paciente con ese DNI o correo en esta clínica.");
    const a = accesos[p.id];
    if (!a || a.estado === "Revocado")
      return setError("Tu acceso al portal no está habilitado. Comunicate con la clínica.");
    if (codigo.trim() !== a.codigo)
      return setError("El código no es correcto. Revisá el correo o pedí uno nuevo.");
    setPortal("accesos", (prev) => ({
      ...prev,
      [p.id]: {
        ...a,
        estado: "Activo",
        ultimoIngreso: new Date().toISOString(),
        ingresos: a.ingresos + 1,
      },
    }));
    registrarEventoPortal(
      p.id,
      "Ingreso",
      a.estado === "Invitado" ? "Primer ingreso al portal" : "Entró al portal",
    );
    onIngresar(p.id);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_520px]">
      <div className="relative hidden flex-col justify-center gap-6 overflow-hidden bg-gradient-to-br from-violet-100 via-white to-primary/15 p-8 lg:flex">
        <div className="relative aspect-[1536/868] w-full overflow-hidden rounded-3xl shadow-[0_24px_50px_-30px_rgba(76,29,149,0.6)] ring-1 ring-primary/10">
          <HeroParallax completo />
        </div>
        <div className="relative rounded-3xl bg-gradient-to-br from-primary via-violet-600 to-fuchsia-600 p-8 text-white shadow-[0_20px_45px_-25px_rgba(124,58,237,0.8)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">
            Portal del paciente
          </p>
          <h1 className="mt-2 max-w-lg font-display text-4xl font-bold leading-tight">
            Tus turnos, tratamientos y pagos, en un solo lugar.
          </h1>
          <p className="mt-2 max-w-md text-sm text-white/85">
            Pedí o cambiá turnos, mirá tus recetas y estudios, aprobá presupuestos y escribile a tu
            clínica.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2.5">
            <BrandMark className="size-10" />
            <span className="leading-tight">
              <span className="block font-display text-base font-semibold">Cloud Esther</span>
              <span className="block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Portal del paciente
              </span>
            </span>
          </div>
          <h2 className="mt-8 font-display text-2xl font-bold tracking-tight">
            Ingresá a tu portal
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{clinica}</p>
          <form onSubmit={ingresar} className="mt-6 space-y-3">
            <Field label="DNI o correo">
              <input
                autoFocus
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                className={INPUT}
                placeholder="Ej: 95193944"
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
              onClick={pedirCodigo}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <Mail className="size-3.5" /> Recibir el código por correo
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
          <p className="mt-6 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="size-3.5 text-emerald-600" /> Sin contraseñas: cada ingreso usa
            un código de tu clínica.
          </p>
          <p className="mt-8 rounded-xl border border-dashed border-primary/20 p-3 text-[11px] text-muted-foreground">
            Para practicar: DNI <b>95193944</b> (Mauro Pinto) y el código que muestra “Recibir el
            código”. Los accesos se gestionan en Cloud Esther → Portal del paciente.
          </p>
          <Link
            to="/demo/portal-paciente"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <ChevronRight className="size-3.5 rotate-180" /> Volver a Cloud Esther
          </Link>
        </div>
      </div>
    </div>
  );
}

type Ctx = {
  paciente: Paciente;
  nombre: string;
  registros: Registros;
  cambiar: <K extends keyof Registros>(clave: K, fn: (prev: Registros[K]) => Registros[K]) => void;
  turnos: Turno[];
  clinica: string;
  onToast: (m: string) => void;
  ir: (s: Seccion) => void;
};

function PortalInner({
  modo,
  pacienteInicial,
  onSalir,
}: {
  modo: "paciente" | "vista";
  pacienteInicial: number | null;
  onSalir: () => void;
}) {
  const { clinica: clinicaSesion } = useSesion();
  const { pacientes, activoId } = usePacientes();
  const { de, cambiar } = useRegistrosPacientes();
  const { turnos: todosTurnos } = storeAgenda.usar();
  const { config } = storePortal.usar();
  const [montado, setMontado] = useState(false);
  const [seccion, setSeccion] = useState<Seccion>("inicio");
  const [pacienteId, setPacienteId] = useState<number | null>(pacienteInicial);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const { prefs, cambiar: cambiarPrefs } = usePreferenciasPortal("paciente");
  const { autorizaciones } = storeAutorizaciones.usar();

  useEffect(() => setMontado(true), []);

  const activos = pacientes.filter((p) => p.estado === "Activo");
  const paciente =
    modo === "paciente"
      ? pacientes.find((p) => p.id === pacienteId)
      : (activos.find((p) => p.id === pacienteId) ??
        activos.find((p) => p.id === activoId) ??
        activos[0]);
  const clinica = clinicaSesion?.nombre ?? "Clínica Dental Esther";

  const onToast = (m: string) => {
    setToast(m);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 2800);
  };

  if (!paciente) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6 text-center">
        <div>
          <p className="text-lg font-semibold">Todavía no hay pacientes activos</p>
          <Link to="/demo/pacientes" className={`${BTN_PRIMARIO} mt-3`}>
            Ir a Pacientes
          </Link>
        </div>
      </div>
    );
  }

  const nombre = `${paciente.nombre} ${paciente.apellido}`;
  const ctx: Ctx = {
    paciente,
    nombre,
    registros: de(paciente.id),
    cambiar: (clave, fn) => cambiar(paciente.id, clave, fn),
    turnos: todosTurnos.filter((t) => t.paciente === nombre),
    clinica,
    onToast,
    ir: (s) => {
      setSeccion(s);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
  };

  const sinLeer =
    storeComunicacion
      .leer()
      .conversaciones.find((c) => c.paciente === nombre)
      ?.mensajes.filter((m) => m.de === "clinica").length ?? 0;

  // Notificaciones universales del paciente: turnos, tratamientos, estudios, documentos, pagos
  // y autorizaciones, en un solo lugar.
  const hoy = hoyISO();
  const manana = sumarDias(hoy, 2);
  const misAut = autorizaciones.filter((a) => a.pacienteId === paciente.id);
  const saldoPaciente = saldoDe(ctx.registros);
  const docsPendientes = docsDe(storePortal.leer().docs, paciente.id).filter(
    (d) => d.estado === "Pendiente",
  );
  const notificaciones: NotifUniversal[] = [
    ...ctx.turnos
      .filter((t) => t.fecha >= hoy && t.fecha <= manana && t.estado !== "Cancelada")
      .map((t) => ({
        id: `turno-${t.id}-${t.estado}`,
        categoria: "Turnos" as const,
        titulo: t.estado === "Pendiente" ? "Confirmá tu próximo turno" : "Tenés un turno cerca",
        detalle: `${fechaLarga(t.fecha)} · ${t.hora} · ${t.tratamiento}`,
        fecha: `${t.fecha}T${t.hora}:00`,
        urgente: t.estado === "Pendiente",
        onAbrir: () => ctx.ir("turnos"),
      })),
    ...ctx.registros.tratamientos
      .filter((t) => t.estado === "En tratamiento" || t.estado === "Planificado")
      .slice(0, 3)
      .map((t) => ({
        id: `trat-${t.id}-${t.estado}`,
        categoria: "Tratamientos" as const,
        titulo: `${t.nombre}: ${t.estado.toLowerCase()}`,
        detalle: t.profesional,
        onAbrir: () => ctx.ir("tratamientos"),
      })),
    ...ctx.registros.estudios
      .filter((e) => e.fecha >= sumarDias(hoy, -21))
      .map((e) => ({
        id: `estudio-${e.id}`,
        categoria: "Estudios" as const,
        titulo: `Nuevo estudio: ${e.tipo}`,
        detalle: `Informe ${e.estadoInforme.toLowerCase()}`,
        fecha: `${e.fecha}T12:00:00`,
        onAbrir: () => ctx.ir("documentos"),
      })),
    ...docsPendientes.slice(0, 3).map((d) => ({
      id: `doc-${d.id}`,
      categoria: "Documentos" as const,
      titulo: `La clínica te pide: ${d.titulo}`,
      detalle: "Subilo desde Documentación",
      onAbrir: () => ctx.ir("documentacion"),
    })),
    ...(saldoPaciente > 0
      ? [
          {
            id: `saldo-${saldoPaciente}`,
            categoria: "Pagos" as const,
            titulo: `Tenés un saldo de ${ars(saldoPaciente)}`,
            detalle: "Revisá tu estado de cuenta",
            onAbrir: () => ctx.ir("cuenta"),
          },
        ]
      : []),
    ...misAut
      .filter((a) => a.estado === "Pendiente" && a.origen !== "Paciente")
      .map((a) => ({
        id: `aut-${a.id}`,
        categoria: "Autorizaciones" as const,
        titulo: `Autorización pendiente: ${a.titulo}`,
        detalle: `Pedida por ${a.solicitadoPor}`,
        fecha: a.fecha,
        urgente: true,
        onAbrir: () => ctx.ir("autorizaciones"),
      })),
  ];

  const visibles = SECCIONES.filter(
    (s) => (s.id !== "pagos" || config.pagosOnline) && (s.id !== "mensajes" || config.mensajes),
  );
  const pendientesAut = misAut.filter(
    (a) => a.estado === "Pendiente" && a.origen !== "Paciente",
  ).length;
  const grupos = ["Mi salud", "Trámites", "Ayuda", "Mi cuenta"].map((g) => ({
    titulo: g,
    items: visibles
      .filter((x) => x.grupo === g)
      .map((x) => ({
        id: x.id,
        label: x.label,
        icon: x.icon,
        ...(x.id === "mensajes" && montado && sinLeer > 0 ? { badge: sinLeer } : {}),
        ...(x.id === "autorizaciones" && pendientesAut > 0 ? { badge: pendientesAut } : {}),
      })),
  }));

  return (
    <>
      <PortalShell
        portal="Portal del paciente"
        clinica={clinica}
        usuario={{
          nombre,
          detalle: paciente.obraSocial || "Paciente particular",
          iniciales: `${paciente.nombre[0] ?? ""}${paciente.apellido[0] ?? ""}`,
        }}
        grupos={grupos}
        activo={seccion}
        onIr={(id) => ctx.ir(id as Seccion)}
        titulo={TITULO_SECCION[seccion]}
        subtitulo={`${clinica} · ${paciente.sucursal}`}
        acciones={
          montado ? (
            <NotificacionesUniversales items={notificaciones} clave={`paciente:${paciente.id}`} />
          ) : null
        }
        prefs={prefs}
        onPrefs={cambiarPrefs}
        onSalir={
          modo === "paciente" ? onSalir : () => window.location.assign("/demo/portal-paciente")
        }
        salirLabel={modo === "paciente" ? "Cerrar sesión" : "Volver al monitoreo"}
        principales={["inicio", "turnos", "autorizaciones", "mensajes"]}
        aviso={
          modo === "vista" ? (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-800">
              <Eye className="size-4 shrink-0" />
              <span className="font-semibold">Vista previa del equipo:</span>
              <span>así ve el portal</span>
              <select
                value={paciente.id}
                onChange={(e) => {
                  setPacienteId(Number(e.target.value));
                  onToast("Ahora ves el portal de otro paciente");
                }}
                aria-label="Paciente"
                className="h-8 rounded-full border border-amber-200 bg-card px-3 text-xs font-semibold text-foreground outline-none"
              >
                {activos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} {p.apellido}
                  </option>
                ))}
              </select>
              <span className="ml-auto hidden text-amber-700/80 md:inline">
                Lo que hagas acá queda registrado como si fuera el paciente.
              </span>
            </div>
          ) : null
        }
      >
        {!montado ? (
          <div className="card-grad h-[520px] animate-pulse" />
        ) : (
          <>
            {seccion !== "inicio" && (
              <EncabezadoSeccion
                area={SECCIONES.find((x) => x.id === seccion)?.grupo ?? "Portal del paciente"}
                titulo={TITULO_SECCION[seccion]}
                detalle={DESCRIPCION_SECCION[seccion]}
                icon={SECCIONES.find((x) => x.id === seccion)?.icon}
              />
            )}
            {seccion === "inicio" && <Inicio ctx={ctx} />}
            {seccion === "turnos" && <Turnos ctx={ctx} />}
            {seccion === "tratamientos" && <Tratamientos ctx={ctx} />}
            {seccion === "documentos" && <Documentos ctx={ctx} />}
            {seccion === "historial" && (
              <HistorialPaciente registros={ctx.registros} turnos={ctx.turnos} />
            )}
            {seccion === "autorizaciones" && (
              <AutorizacionesPanel
                rol="paciente"
                usuario={nombre}
                paciente={paciente}
                onToast={onToast}
              />
            )}
            {seccion === "documentacion" && <Documentacion ctx={ctx} />}
            {seccion === "cuenta" && (
              <EstadoCuenta
                registros={ctx.registros}
                nombre={nombre}
                clinica={clinica}
                {...(config.pagosOnline ? { onPagar: () => ctx.ir("pagos") } : {})}
              />
            )}
            {seccion === "pagos" && <Pagos ctx={ctx} />}
            {seccion === "mensajes" && <Mensajes ctx={ctx} />}
            {seccion === "soporte" && (
              <SoporteAyuda
                paciente={paciente}
                nombre={nombre}
                clinica={clinica}
                onToast={onToast}
                onMensajes={() => ctx.ir("mensajes")}
              />
            )}
            {seccion === "perfil" && <Perfil ctx={ctx} />}
            {seccion === "privacidad" && (
              <PrivacidadPaciente paciente={paciente} usuario={nombre} onToast={onToast} />
            )}
          </>
        )}
      </PortalShell>

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

/* ───────────── Cálculos compartidos ───────────── */

function proximos(turnos: Turno[]) {
  const hoy = hoyISO();
  return turnos
    .filter((t) => t.fecha >= hoy && (t.estado === "Pendiente" || t.estado === "Confirmada"))
    .sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`));
}

function saldoDe(r: Registros) {
  return r.cuenta.reduce((acc, m) => acc + (m.tipo === "Cargo" ? m.monto : -m.monto), 0);
}

function avanceTratamiento(t: Registros["tratamientos"][number]) {
  if (t.estado === "Completado" || t.estado === "Finalizado") return 100;
  const plan = t.sesionesPlan ?? 1;
  return Math.min(100, Math.round(((t.sesiones?.length ?? 0) / plan) * 100));
}

/* ───────────── Inicio ───────────── */

function Inicio({ ctx }: { ctx: Ctx }) {
  const { paciente, registros, turnos, ir, clinica } = ctx;
  const [ahora, setAhora] = useState<Date | null>(null);
  useEffect(() => setAhora(new Date()), []);
  const lista = proximos(turnos);
  const prox = lista[0];
  const saldo = saldoDe(registros);
  const enCurso = registros.tratamientos.filter(
    (t) => t.estado === "En tratamiento" || t.estado === "Planificado",
  );
  const docs = docsDe(storePortal.usar().docs, paciente.id);
  const docsPend = docs.filter(
    (d) => d.obligatorio && (d.estado === "Pendiente" || d.estado === "Rechazada"),
  );
  const presPend = registros.presupuestos.filter((p) => p.estado === "Enviado");
  const porConfirmar = lista.filter((t) => t.estado === "Pendiente");
  const hora = ahora?.getHours() ?? 12;
  const saludo = hora < 12 ? "Buen día" : hora < 20 ? "Buenas tardes" : "Buenas noches";

  const pendientes: {
    icon: LucideIcon;
    texto: string;
    accion: string;
    ir: Seccion;
    tono: string;
  }[] = [
    ...porConfirmar.map((t) => ({
      icon: CalendarCheck2,
      texto: `Confirmá tu turno del ${fechaLarga(t.fecha).toLowerCase()} a las ${t.hora}`,
      accion: "Confirmar",
      ir: "turnos" as Seccion,
      tono: "text-amber-600",
    })),
    ...presPend.map((p) => ({
      icon: ReceiptText,
      texto: `Tenés el presupuesto ${p.numero} para revisar`,
      accion: "Ver",
      ir: "documentos" as Seccion,
      tono: "text-primary",
    })),
    ...(docsPend.length
      ? [
          {
            icon: Upload,
            texto: `Faltan ${docsPend.length} ${docsPend.length === 1 ? "documento obligatorio" : "documentos obligatorios"}`,
            accion: "Subir",
            ir: "documentacion" as Seccion,
            tono: "text-sky-600",
          },
        ]
      : []),
    ...(saldo > 0
      ? [
          {
            icon: Wallet,
            texto: `Saldo pendiente de ${ars(saldo)}`,
            accion: "Pagar",
            ir: "pagos" as Seccion,
            tono: "text-destructive",
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      {/* Imagen del consultorio (la misma del Dashboard) */}
      <div className="relative aspect-[1536/868] w-full overflow-hidden rounded-2xl md:aspect-auto md:h-72">
        <HeroParallax foco={40} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm">
            {ahora
              ? ahora.toLocaleDateString("es-AR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })
              : "\u00a0"}
          </span>
        </div>
        <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-background/90 py-1 pl-1 pr-3 shadow-sm backdrop-blur-sm">
          <span className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-primary to-violet-400 text-[11px] font-bold text-white">
            {`${paciente.nombre[0] ?? ""}${paciente.apellido[0] ?? ""}`}
          </span>
          <span className="text-xs font-semibold">{paciente.nombre}</span>
        </div>
      </div>

      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-primary via-violet-600 to-fuchsia-600 px-6 py-6 text-white shadow-[0_24px_60px_-30px_rgba(124,58,237,0.85)]">
        <div className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full border-[26px] border-white/10" />
        <div className="pointer-events-none absolute -bottom-24 left-1/4 size-72 rounded-full bg-fuchsia-300/25 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/75">
              {saludo}
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
              Hola, {paciente.nombre}
            </h1>
            <p className="mt-1 text-sm text-white/85">
              {storePortal.leer().config.bienvenida ||
                `Este es tu espacio en ${clinica}: turnos, tratamientos, recetas, estudios y pagos.`}
            </p>
          </div>
          {prox && (
            <button
              type="button"
              onClick={() => ir("turnos")}
              className="flex items-center gap-3 rounded-2xl border border-white/25 bg-white/15 p-3 text-left backdrop-blur-md transition hover:bg-white/20"
            >
              <span className="grid w-14 shrink-0 place-items-center rounded-xl bg-white py-1.5 text-center text-primary shadow">
                <span className="text-[10px] font-bold uppercase">
                  {new Date(`${prox.fecha}T12:00:00`).toLocaleDateString("es-AR", {
                    month: "short",
                  })}
                </span>
                <span className="font-display text-xl font-bold leading-none">
                  {Number(prox.fecha.slice(8, 10))}
                </span>
              </span>
              <span className="min-w-0">
                <span className="block text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/75">
                  Tu próximo turno
                </span>
                <span className="block truncate text-sm font-semibold">
                  {prox.hora} · {prox.tratamiento}
                </span>
                <span className="block truncate text-xs text-white/80">{prox.odontologo}</span>
              </span>
            </button>
          )}
          <div className="flex w-full flex-wrap gap-2">
            <button
              onClick={() => ir("turnos")}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-primary shadow"
            >
              <CalendarPlus className="size-4" />
              Pedir turno
            </button>
            <button
              onClick={() => ir("mensajes")}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-white/15 px-4 text-sm font-semibold text-white ring-1 ring-white/40 backdrop-blur-md hover:bg-white/25"
            >
              <MessageCircle className="size-4" />
              Escribir a la clínica
            </button>
            <button
              onClick={() => ir("tratamientos")}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-white/15 px-4 text-sm font-semibold text-white ring-1 ring-white/40 backdrop-blur-md hover:bg-white/25"
            >
              <Stethoscope className="size-4" />
              Mis tratamientos
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            l: "Próximo turno",
            v: prox ? `${fechaLarga(prox.fecha)} · ${prox.hora}` : "Sin turnos",
            d: prox ? `${prox.tratamiento} · ${prox.odontologo}` : "Pedí uno cuando quieras",
            i: CalendarDays,
            s: "turnos" as Seccion,
            g: "from-primary to-fuchsia-500",
          },
          {
            l: "Tratamientos en curso",
            v: String(enCurso.length),
            d: enCurso[0]
              ? `${enCurso[0].nombre} · ${avanceTratamiento(enCurso[0])}%`
              : "Nada en curso",
            i: Stethoscope,
            s: "tratamientos" as Seccion,
            g: "from-sky-500 to-indigo-500",
          },
          {
            l: "Saldo de tu cuenta",
            v: saldo > 0 ? ars(saldo) : "Al día",
            d: saldo > 0 ? "Podés pagarlo online" : "No tenés deudas",
            i: Wallet,
            s: "pagos" as Seccion,
            g: saldo > 0 ? "from-amber-500 to-orange-500" : "from-emerald-500 to-teal-500",
          },
          {
            l: "Recetas y estudios",
            v: String(registros.recetas.length + registros.estudios.length),
            d: `${registros.recetas.length} recetas · ${registros.estudios.length} estudios`,
            i: FileText,
            s: "documentos" as Seccion,
            g: "from-rose-500 to-pink-500",
          },
        ].map((c) => (
          <button
            key={c.l}
            onClick={() => ir(c.s)}
            className="group relative min-h-[112px] overflow-hidden rounded-3xl border border-primary/10 bg-card p-4 text-left shadow-[0_14px_34px_-24px_rgba(124,58,237,0.6)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_44px_-24px_rgba(124,58,237,0.7)]"
          >
            <span
              aria-hidden
              className={`pointer-events-none absolute -right-10 -top-12 size-32 rounded-full bg-gradient-to-br ${c.g} opacity-[0.12] blur-2xl transition group-hover:opacity-20`}
            />
            <span
              aria-hidden
              className={`pointer-events-none absolute inset-x-4 bottom-0 h-[3px] rounded-full bg-gradient-to-r ${c.g} opacity-70`}
            />
            <div className="relative flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-primary/75">
                  {c.l}
                </p>
                <p className="mt-2 truncate text-lg font-bold text-foreground">{c.v}</p>
                <p className="mt-1 truncate text-[11px] text-muted-foreground">{c.d}</p>
              </div>
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${c.g} text-white shadow-md`}
              >
                <c.i className="size-[18px]" />
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Tarjeta>
          <div className="flex items-center justify-between">
            <p className="font-display text-base font-semibold">Tus próximos turnos</p>
            <button
              onClick={() => ir("turnos")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Ver todos <ChevronRight className="size-3.5" />
            </button>
          </div>
          {lista.length === 0 ? (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              No tenés turnos agendados.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {lista.slice(0, 3).map((t) => (
                <FilaTurno key={t.id} t={t} ctx={ctx} compacta />
              ))}
            </ul>
          )}
          {enCurso[0] && (
            <div className="mt-4 rounded-xl border border-primary/10 bg-white/80 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">
                  {enCurso[0].nombre}
                  {enCurso[0].pieza ? ` · pieza ${enCurso[0].pieza}` : ""}
                </p>
                <Pill clase="bg-primary/10 text-primary">
                  {avanceTratamiento(enCurso[0])}% completado
                </Pill>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-fuchsia-500"
                  style={{ width: `${avanceTratamiento(enCurso[0])}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {enCurso[0].sesiones?.length ?? 0} de {enCurso[0].sesionesPlan ?? 1} sesiones ·{" "}
                {enCurso[0].profesional}
              </p>
            </div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              [
                ["Recetas y estudios", FileText, "documentos"],
                ["Pagos", Wallet, "pagos"],
                ["Documentación", Upload, "documentacion"],
                ["Mensajes", MessageCircle, "mensajes"],
              ] as const
            ).map(([l, Icon, destino]) => (
              <button
                key={l}
                onClick={() => ir(destino)}
                className="group flex flex-col items-start gap-2 rounded-xl border border-primary/10 bg-white/80 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30"
              >
                <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow-md">
                  <Icon className="size-4" />
                </span>
                <span className="flex w-full items-center justify-between text-xs font-semibold">
                  {l}
                  <ChevronRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
            ))}
          </div>
        </Tarjeta>

        <Tarjeta>
          <p className="flex items-center gap-2 font-display text-base font-semibold">
            <Bell className="size-4 text-primary" /> Pendientes para vos
          </p>
          {pendientes.length === 0 ? (
            <div className="mt-6 text-center">
              <CheckCheck className="mx-auto size-8 text-emerald-500" />
              <p className="mt-1 text-sm font-medium">¡Tenés todo al día!</p>
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {pendientes.map((p, i) => (
                <li key={i} className="flex items-center gap-2.5 rounded-xl bg-white/80 p-2.5">
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-full bg-primary/[0.07] ${p.tono}`}
                  >
                    <p.icon className="size-4" />
                  </span>
                  <span className="flex-1 text-xs">{p.texto}</span>
                  <button onClick={() => ir(p.ir)} className={BTN_SECUNDARIO}>
                    {p.accion}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 rounded-xl bg-gradient-to-br from-emerald-50 to-white p-3 ring-1 ring-emerald-100">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <ShieldCheck className="size-3.5" /> Tus datos están protegidos
            </p>
            <p className="mt-0.5 text-[11px] text-emerald-800/80">
              Solo vos y tu equipo tratante pueden ver esta información.
            </p>
          </div>
        </Tarjeta>
      </div>
    </div>
  );
}

/* ───────────── Turnos ───────────── */

function FilaTurno({ t, ctx, compacta = false }: { t: Turno; ctx: Ctx; compacta?: boolean }) {
  const [reprogramar, setReprogramar] = useState(false);
  const [cancelar, setCancelar] = useState(false);
  const futuro = t.fecha >= hoyISO() && (t.estado === "Pendiente" || t.estado === "Confirmada");
  const d = new Date(`${t.fecha}T12:00:00`);

  const cambiarEstado = (estado: Turno["estado"], msg: string, extra: Partial<Turno> = {}) => {
    setTurnosStore((prev) => prev.map((x) => (x.id === t.id ? { ...x, ...extra, estado } : x)));
    const tipo = extra.fecha
      ? "Turno cambiado"
      : estado === "Confirmada"
        ? "Turno confirmado"
        : "Turno cancelado";
    registrarEventoPortal(
      ctx.paciente.id,
      tipo,
      `${t.tratamiento} · ${formatearFecha(extra.fecha ?? t.fecha)} ${extra.hora ?? t.hora}`,
    );
    ctx.onToast(msg);
  };

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/10 bg-white/80 p-3">
      <span className="grid w-14 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 py-1.5 text-center">
        <span className="text-[10px] font-semibold uppercase text-primary/80">
          {MESES[d.getMonth()]}
        </span>
        <span className="font-display text-xl font-bold leading-none text-primary">
          {d.getDate()}
        </span>
        <span className="text-[10px] text-muted-foreground">{t.hora}</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
          {t.tratamiento}
          <Pill clase={ESTADO_TURNO[t.estado]}>
            {t.estado === "Atendida"
              ? "Realizado"
              : t.estado === "Confirmada"
                ? "Confirmado"
                : t.estado === "Cancelada"
                  ? "Cancelado"
                  : t.estado === "Ausente"
                    ? "No asististe"
                    : "Por confirmar"}
          </Pill>
        </p>
        <p className="text-xs text-muted-foreground">
          {fechaLarga(t.fecha)} · {t.odontologo} · {t.sucursal}
        </p>
      </div>
      {futuro && (
        <div className="flex flex-wrap gap-1.5">
          {t.estado === "Pendiente" && (
            <button
              className={BTN_PRIMARIO}
              onClick={() => cambiarEstado("Confirmada", "¡Listo! Tu turno quedó confirmado")}
            >
              <Check className="size-3.5" />
              Confirmar
            </button>
          )}
          {!compacta && (
            <>
              <button className={BTN_SECUNDARIO} onClick={() => descargarICS(t, ctx.clinica)}>
                <CalendarPlus className="size-3.5" />
                Agendar
              </button>
              <button className={BTN_SECUNDARIO} onClick={() => setReprogramar(true)}>
                <RefreshCcw className="size-3.5" />
                Cambiar
              </button>
              <button
                className={`${BTN_SECUNDARIO} !text-destructive`}
                onClick={() => {
                  const horas =
                    (new Date(`${t.fecha}T${t.hora}:00`).getTime() - Date.now()) / 3_600_000;
                  const minimo = storePortal.leer().config.horasMinimasCancelar;
                  if (horas < minimo)
                    return ctx.onToast(
                      `Faltan menos de ${minimo} h: para cancelar, escribile a la clínica.`,
                    );
                  setCancelar(true);
                }}
              >
                <X className="size-3.5" />
                Cancelar
              </button>
            </>
          )}
        </div>
      )}
      {reprogramar && (
        <Modal titulo="Cambiar fecha del turno" onClose={() => setReprogramar(false)}>
          <SolicitudForm
            ctx={ctx}
            inicial={t}
            onCancel={() => setReprogramar(false)}
            onSubmit={(datos) => {
              cambiarEstado(
                "Pendiente",
                `Turno cambiado al ${fechaLarga(datos.fecha).toLowerCase()} a las ${datos.hora}. La clínica lo va a confirmar.`,
                { fecha: datos.fecha, hora: datos.hora, odontologo: datos.odontologo },
              );
              setReprogramar(false);
            }}
          />
        </Modal>
      )}
      {cancelar && (
        <Modal titulo="Cancelar turno" onClose={() => setCancelar(false)}>
          <CancelarForm
            onCancel={() => setCancelar(false)}
            onSubmit={(motivo) => {
              cambiarEstado("Cancelada", "Turno cancelado. Avisamos a la clínica.", {
                notas: `Cancelado por el paciente desde el portal: ${motivo}`,
              });
              setCancelar(false);
            }}
          />
        </Modal>
      )}
    </li>
  );
}

function CancelarForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (motivo: string) => void;
  onCancel: () => void;
}) {
  const [motivo, setMotivo] = useState("No puedo asistir");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(motivo);
      }}
      className="space-y-3"
    >
      <p className="text-sm text-muted-foreground">
        Si cancelás con al menos 24 h de anticipación, liberamos el horario para otro paciente.
        ¡Gracias!
      </p>
      <Field label="Motivo">
        <select value={motivo} onChange={(e) => setMotivo(e.target.value)} className={INPUT}>
          {["No puedo asistir", "Me siento mejor", "Problemas de horario", "Otro motivo"].map(
            (m) => (
              <option key={m}>{m}</option>
            ),
          )}
        </select>
      </Field>
      <div className="flex justify-end gap-2">
        <button type="button" className={BTN_SECUNDARIO} onClick={onCancel}>
          Volver
        </button>
        <button type="submit" className={`${BTN_PRIMARIO} !bg-destructive`}>
          <X className="size-4" />
          Cancelar turno
        </button>
      </div>
    </form>
  );
}

function SolicitudForm({
  ctx,
  inicial,
  onSubmit,
  onCancel,
}: {
  ctx: Ctx;
  inicial?: Turno;
  onSubmit: (d: {
    fecha: string;
    hora: string;
    odontologo: string;
    tratamiento: string;
    notas: string;
  }) => void;
  onCancel: () => void;
}) {
  const { miembros } = useEquipo();
  const { turnos } = storeAgenda.usar();
  const odontologos = miembros
    .filter((m) => m.role === "odontologo" && m.status === "activo")
    .map((m) => `${m.firstName} ${m.lastName}`);
  const [tratamiento, setTratamiento] = useState(inicial?.tratamiento ?? "Control");
  const [odontologo, setOdontologo] = useState(inicial?.odontologo ?? odontologos[0] ?? "");
  const [fecha, setFecha] = useState(
    inicial?.fecha && inicial.fecha > hoyISO() ? inicial.fecha : sumarDias(hoyISO(), 1),
  );
  const [hora, setHora] = useState("");
  const [notas, setNotas] = useState("");
  const dia = new Date(`${fecha}T12:00:00`).getDay();
  const HORARIOS = Array.from(
    { length: 22 },
    (_, i) => `${String(8 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`,
  );
  const ocupados = new Set(
    turnos
      .filter(
        (t) =>
          t.fecha === fecha &&
          t.odontologo === odontologo &&
          t.estado !== "Cancelada" &&
          t.id !== inicial?.id,
      )
      .map((t) => t.hora),
  );
  const libres =
    dia === 0
      ? []
      : HORARIOS.filter(
          (h) =>
            !ocupados.has(h) && (fecha > hoyISO() || h > new Date().toTimeString().slice(0, 5)),
        );

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        if (!hora) return;
        onSubmit({ fecha, hora, odontologo, tratamiento, notas: notas.trim() });
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Motivo">
          <select
            value={tratamiento}
            onChange={(e) => setTratamiento(e.target.value)}
            className={INPUT}
            disabled={!!inicial}
          >
            {PRACTICAS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>
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
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Horarios disponibles
        </p>
        {libres.length === 0 ? (
          <p className="rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            No hay horarios ese día. Probá con otra fecha.
          </p>
        ) : (
          <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6">
            {libres.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHora(h)}
                aria-pressed={hora === h}
                className={`rounded-lg border py-1.5 text-xs font-semibold transition-colors ${hora === h ? "border-primary bg-primary text-primary-foreground" : "border-primary/15 bg-white hover:border-primary/40"}`}
              >
                {h}
              </button>
            ))}
          </div>
        )}
      </div>
      {!inicial && (
        <Field label="Comentario para la clínica">
          <input
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            className={INPUT}
            placeholder="Opcional (ej: tengo dolor en una muela)"
          />
        </Field>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" className={BTN_SECUNDARIO} onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className={BTN_PRIMARIO} disabled={!hora}>
          <Check className="size-4" />
          {inicial ? "Cambiar turno" : hora ? `Pedir turno ${hora}` : "Elegí un horario"}
        </button>
      </div>
    </form>
  );
}

function Turnos({ ctx }: { ctx: Ctx }) {
  const { config } = storePortal.usar();
  const [pedir, setPedir] = useState(false);
  const [vista, setVista] = useState<"proximos" | "historial">("proximos");
  const lista = proximos(ctx.turnos);
  const historial = ctx.turnos
    .filter((t) => !lista.includes(t))
    .sort((a, b) => `${b.fecha}${b.hora}`.localeCompare(`${a.fecha}${a.hora}`));
  const realizados = ctx.turnos.filter((t) => t.estado === "Atendida").length;

  return (
    <div className="space-y-4">
      <TituloSeccion
        icon={CalendarDays}
        titulo="Mis turnos"
        descripcion="Pedí, confirmá, cambiá o cancelá tus turnos. La clínica lo ve al instante."
      >
        {config.turnosOnline ? (
          <button className={BTN_PRIMARIO} onClick={() => setPedir(true)}>
            <CalendarPlus className="size-4" />
            Pedir turno
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">
            Para pedir turnos, escribí a la clínica.
          </span>
        )}
      </TituloSeccion>
      <div className="grid grid-cols-3 gap-3">
        {[
          ["Próximos", lista.length],
          ["Por confirmar", lista.filter((t) => t.estado === "Pendiente").length],
          ["Realizados", realizados],
        ].map(([l, v]) => (
          <Tarjeta key={l} className="!p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {l}
            </p>
            <p className="mt-1 text-xl font-bold">{v}</p>
          </Tarjeta>
        ))}
      </div>
      <div className="inline-flex rounded-full border border-primary/15 bg-white p-0.5">
        {(["proximos", "historial"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setVista(v)}
            aria-pressed={vista === v}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${vista === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            {v === "proximos" ? `Próximos (${lista.length})` : `Historial (${historial.length})`}
          </button>
        ))}
      </div>
      {(vista === "proximos" ? lista : historial).length === 0 ? (
        <Vacio
          icon={CalendarDays}
          texto={
            vista === "proximos"
              ? "No tenés turnos próximos. ¡Pedí uno!"
              : "Todavía no hay turnos anteriores."
          }
        />
      ) : (
        <ul className="space-y-2">
          {(vista === "proximos" ? lista : historial).map((t) => (
            <FilaTurno key={t.id} t={t} ctx={ctx} />
          ))}
        </ul>
      )}
      {pedir && (
        <Modal titulo="Pedir un turno" onClose={() => setPedir(false)}>
          <SolicitudForm
            ctx={ctx}
            onCancel={() => setPedir(false)}
            onSubmit={(d) => {
              setTurnosStore((prev) => [
                ...prev,
                {
                  id: Date.now(),
                  fecha: d.fecha,
                  hora: d.hora,
                  paciente: ctx.nombre,
                  tratamiento: d.tratamiento,
                  odontologo: d.odontologo,
                  sucursal: ctx.paciente.sucursal || "Clínica Centro",
                  gabinete: "Gabinete 1",
                  estado: "Pendiente",
                  notas: `Pedido desde el portal del paciente${d.notas ? `: ${d.notas}` : ""}`,
                },
              ]);
              setPedir(false);
              registrarEventoPortal(
                ctx.paciente.id,
                "Turno pedido",
                `${d.tratamiento} · ${formatearFecha(d.fecha)} ${d.hora} con ${d.odontologo}`,
              );
              ctx.onToast(
                `Turno pedido para el ${fechaLarga(d.fecha).toLowerCase()} a las ${d.hora}. Ya figura en la agenda de la clínica.`,
              );
            }}
          />
        </Modal>
      )}
    </div>
  );
}

/* ───────────── Tratamientos ───────────── */

function Tratamientos({ ctx }: { ctx: Ctx }) {
  const lista = [...ctx.registros.tratamientos].sort(
    (a, b) => avanceTratamiento(a) - avanceTratamiento(b),
  );
  const PASOS = ["Planificado", "En tratamiento", "Completado"];
  return (
    <div className="space-y-4">
      <TituloSeccion
        icon={Stethoscope}
        titulo="Mis tratamientos"
        descripcion="Avance, sesiones realizadas y próximos pasos de cada tratamiento."
      />
      {lista.length === 0 ? (
        <Vacio icon={Stethoscope} texto="Todavía no tenés tratamientos cargados." />
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {lista.map((t) => {
            const av = avanceTratamiento(t);
            const paso =
              t.estado === "Completado" || t.estado === "Finalizado"
                ? 2
                : t.estado === "En tratamiento"
                  ? 1
                  : 0;
            return (
              <li key={t.id} className="card-grad flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-base font-semibold">{t.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.pieza ? `Pieza ${t.pieza} · ` : ""}
                      {t.profesional}
                      {t.inicio ? ` · desde ${formatearFecha(t.inicio)}` : ""}
                    </p>
                  </div>
                  <Pill
                    clase={
                      t.estado === "Cancelado"
                        ? "bg-destructive/10 text-destructive"
                        : av === 100
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-primary/10 text-primary"
                    }
                  >
                    {t.estado === "Cancelado" ? "Cancelado" : `${av}%`}
                  </Pill>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-fuchsia-500"
                    style={{ width: `${av}%` }}
                  />
                </div>
                <ol className="mt-3 grid grid-cols-3 gap-1 text-center text-[10.5px]">
                  {PASOS.map((p, i) => (
                    <li
                      key={p}
                      className={`rounded-lg py-1 font-semibold ${i <= paso && t.estado !== "Cancelado" ? "bg-primary/10 text-primary" : "bg-muted/60 text-muted-foreground"}`}
                    >
                      {p}
                    </li>
                  ))}
                </ol>
                {t.diagnostico && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    <b className="text-foreground">Por qué:</b> {t.diagnostico}
                  </p>
                )}
                {!!t.sesiones?.length && (
                  <div className="mt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Sesiones ({t.sesiones.length} de {t.sesionesPlan ?? 1})
                    </p>
                    <ol className="mt-1.5 space-y-1.5 border-l-2 border-primary/20 pl-3">
                      {t.sesiones.map((s, i) => (
                        <li key={s.id} className="text-xs">
                          <b>Sesión {i + 1}</b> · {formatearFecha(s.fecha)} —{" "}
                          <span className="text-muted-foreground">{s.detalle}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                <div className="min-h-3 flex-1" />
                {t.estado !== "Completado" &&
                  t.estado !== "Finalizado" &&
                  t.estado !== "Cancelado" && (
                    <div className="flex justify-end gap-1.5 border-t border-primary/10 pt-2.5">
                      <button className={BTN_SECUNDARIO} onClick={() => ctx.ir("turnos")}>
                        <CalendarPlus className="size-3.5" />
                        Pedir próxima sesión
                      </button>
                    </div>
                  )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ───────────── Recetas, estudios y presupuestos ───────────── */

function Documentos({ ctx }: { ctx: Ctx }) {
  const { registros, cambiar, clinica, nombre, onToast } = ctx;
  const [tab, setTab] = useState<"presupuestos" | "recetas" | "estudios">(
    registros.presupuestos.some((p) => p.estado === "Enviado") ? "presupuestos" : "recetas",
  );

  const imprimirReceta = (r: Registros["recetas"][number]) => {
    const filas = r.medicamentos
      .map(
        (m) =>
          `<tr><td>${escapar(m.nombre)} ${escapar(m.presentacion)}</td><td>${escapar(m.posologia)}</td><td class="n">${m.cantidad}</td></tr>`,
      )
      .join("");
    abrirImpresion(
      `Receta ${r.numero}`,
      `<p class="meta">Paciente: <b>${escapar(nombre)}</b> · ${formatearFecha(r.fecha)} · ${escapar(r.profesional)} (${escapar(r.matricula)})</p><table><tr><th>Medicamento</th><th>Indicación</th><th class="n">Cant.</th></tr>${filas}</table><p>${escapar(r.indicaciones)}</p>`,
      clinica,
    );
  };
  const imprimirPresupuesto = (p: Registros["presupuestos"][number]) => {
    const total = totalesPresupuesto(p, storePresupuestos.leer().planes).final;
    const filas = p.lineas
      .map(
        (l) =>
          `<tr><td>${escapar(l.descripcion)}</td><td>${escapar(l.pieza)}</td><td class="n">${l.cantidad}</td><td class="n">${ars(l.precio * l.cantidad)}</td></tr>`,
      )
      .join("");
    abrirImpresion(
      `Presupuesto ${p.numero}`,
      `<p class="meta">Paciente: <b>${escapar(nombre)}</b> · ${formatearFecha(p.fecha)}</p><table><tr><th>Prestación</th><th>Pieza</th><th class="n">Cant.</th><th class="n">Importe</th></tr>${filas}<tr class="tot"><td colspan="3">Total</td><td class="n">${ars(total)}</td></tr></table><p>${escapar(p.notas)}</p>`,
      clinica,
    );
  };

  const responder = (p: Registros["presupuestos"][number], estado: "Aprobado" | "Rechazado") => {
    cambiar("presupuestos", (prev) =>
      prev.map((x) =>
        x.id === p.id
          ? {
              ...x,
              estado,
              respondido: hoyISO(),
              seguimientos: [
                ...(x.seguimientos ?? []),
                {
                  fecha: new Date().toISOString(),
                  texto: `${estado} por el paciente desde el portal`,
                  autor: nombre,
                },
              ],
            }
          : x,
      ),
    );
    if (estado === "Aprobado") {
      const tot = totalesPresupuesto(p, storePresupuestos.leer().planes);
      cambiar("cuenta", (prev) => [
        ...prev,
        {
          id: Date.now(),
          fecha: hoyISO(),
          tipo: "Cargo",
          concepto: `Presupuesto ${p.numero} aprobado`,
          medio: tot.plan ? tot.plan.nombre : "A definir",
          monto: tot.final,
          notas: tot.cuotas > 1 ? `${tot.cuotas} cuotas de ${ars(tot.cuota)}` : "",
        },
      ]);
    }
    cambiar("auditoria", (prev) => [
      ...prev,
      {
        id: Date.now(),
        usuario: `${nombre} (portal)`,
        accion: `${estado === "Aprobado" ? "Aprobó" : "Rechazó"} el presupuesto ${p.numero}`,
        fecha: hoyISO(),
        hora: new Date().toTimeString().slice(0, 5),
      },
    ]);
    registrarEventoPortal(
      ctx.paciente.id,
      estado === "Aprobado" ? "Presupuesto aprobado" : "Presupuesto rechazado",
      `${p.numero} · ${ars(totalesPresupuesto(p, storePresupuestos.leer().planes).final)}`,
    );
    onToast(
      estado === "Aprobado"
        ? `¡Gracias! Aprobaste el presupuesto ${p.numero}. La clínica te va a contactar.`
        : `Presupuesto ${p.numero} rechazado`,
    );
  };

  const TABS = [
    {
      id: "presupuestos" as const,
      label: `Presupuestos (${registros.presupuestos.filter((p) => p.estado !== "Borrador").length})`,
      icon: ReceiptText,
    },
    { id: "recetas" as const, label: `Recetas (${registros.recetas.length})`, icon: PillIcon },
    { id: "estudios" as const, label: `Estudios (${registros.estudios.length})`, icon: ScanLine },
  ];

  return (
    <div className="space-y-4">
      <TituloSeccion
        icon={FileText}
        titulo="Recetas, estudios y presupuestos"
        descripcion="Descargá tus recetas, mirá tus estudios y aprobá presupuestos online."
      />
      <div className="inline-flex flex-wrap gap-1 rounded-2xl border border-primary/10 bg-white p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold ${tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <t.icon className="size-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "presupuestos" &&
        (registros.presupuestos.length === 0 ? (
          <Vacio icon={ReceiptText} texto="No tenés presupuestos." />
        ) : (
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {registros.presupuestos
              .filter((p) => p.estado !== "Borrador")
              .map((p) => {
                const tot = totalesPresupuesto(p, storePresupuestos.leer().planes);
                const total = tot.final;
                return (
                  <li key={p.id} className="card-grad flex flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-display text-base font-semibold">
                          Presupuesto {p.numero}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatearFecha(p.fecha)}
                          {p.profesional ? ` · ${p.profesional}` : ""}
                        </p>
                      </div>
                      <Pill
                        clase={
                          p.estado === "Aprobado"
                            ? "bg-emerald-100 text-emerald-700"
                            : p.estado === "Rechazado"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-amber-100 text-amber-700"
                        }
                      >
                        {p.estado === "Enviado" ? "Para revisar" : p.estado}
                      </Pill>
                    </div>
                    <ul className="mt-3 divide-y divide-primary/[0.07] rounded-xl bg-white/80 px-3 text-xs">
                      {p.lineas.map((l, i) => (
                        <li key={i} className="flex justify-between gap-2 py-2">
                          <span>
                            {l.descripcion}
                            {l.pieza ? ` · pieza ${l.pieza}` : ""}
                          </span>
                          <span className="font-semibold">{ars(l.cantidad * l.precio)}</span>
                        </li>
                      ))}
                      <li className="flex justify-between py-2 text-sm font-bold">
                        <span>Total</span>
                        <span>{ars(total)}</span>
                      </li>
                      {(tot.descuento > 0 || tot.cuotas > 1) && (
                        <li className="py-2 text-right text-[11px] text-muted-foreground">
                          {tot.descuento > 0 ? `Incluye ${p.descuentoPct}% de descuento. ` : ""}
                          {tot.plan
                            ? `${tot.plan.nombre}${tot.cuotas > 1 ? `: ${tot.cuotas} cuotas de ${ars(tot.cuota)}` : ""}`
                            : ""}
                        </li>
                      )}
                    </ul>
                    {p.notas && <p className="mt-2 text-xs text-muted-foreground">{p.notas}</p>}
                    <div className="min-h-3 flex-1" />
                    <div className="flex flex-wrap justify-end gap-1.5 border-t border-primary/10 pt-2.5">
                      <button className={BTN_SECUNDARIO} onClick={() => imprimirPresupuesto(p)}>
                        <Download className="size-3.5" />
                        Descargar
                      </button>
                      {p.estado === "Enviado" && storePortal.leer().config.presupuestosOnline && (
                        <>
                          <button
                            className={BTN_SECUNDARIO}
                            onClick={() => responder(p, "Rechazado")}
                          >
                            <X className="size-3.5" />
                            Rechazar
                          </button>
                          <button className={BTN_PRIMARIO} onClick={() => responder(p, "Aprobado")}>
                            <Check className="size-3.5" />
                            Aprobar
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
          </ul>
        ))}

      {tab === "recetas" &&
        (registros.recetas.length === 0 ? (
          <Vacio icon={PillIcon} texto="No tenés recetas emitidas." />
        ) : (
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {registros.recetas.map((r) => (
              <li key={r.id} className="card-grad p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-base font-semibold">Receta {r.numero}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatearFecha(r.fecha)} · {r.profesional}
                    </p>
                  </div>
                  <Pill
                    clase={
                      r.estado === "Anulada"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-emerald-100 text-emerald-700"
                    }
                  >
                    {r.estado}
                  </Pill>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {r.medicamentos.map((m, i) => (
                    <li key={i} className="rounded-xl bg-white/80 px-3 py-2 text-xs">
                      <b>{m.nombre}</b> {m.presentacion} ·{" "}
                      <span className="text-muted-foreground">{m.posologia}</span>
                    </li>
                  ))}
                </ul>
                {r.vencimiento && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Válida hasta el {formatearFecha(r.vencimiento)}
                  </p>
                )}
                <div className="mt-3 flex justify-end border-t border-primary/10 pt-2.5">
                  <button className={BTN_SECUNDARIO} onClick={() => imprimirReceta(r)}>
                    <Printer className="size-3.5" />
                    Descargar receta
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ))}

      {tab === "estudios" &&
        (registros.estudios.length === 0 ? (
          <Vacio icon={ScanLine} texto="No tenés estudios cargados." />
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {registros.estudios.map((e) => (
              <li key={e.id} className="card-grad overflow-hidden">
                <div className="grid h-28 place-items-center bg-gradient-to-br from-slate-800 via-slate-700 to-primary/70 text-white/80">
                  <ScanLine className="size-9" />
                </div>
                <div className="p-3.5">
                  <p className="text-sm font-semibold">{e.tipo}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatearFecha(e.fecha)}
                    {e.pieza ? ` · pieza ${e.pieza}` : e.zona ? ` · ${e.zona}` : ""}
                  </p>
                  {e.diagnostico && (
                    <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                      {e.diagnostico}
                    </p>
                  )}
                  <p className="mt-2 flex items-center justify-between">
                    <Pill clase="bg-primary/10 text-primary">{e.estadoInforme}</Pill>
                    <button
                      className="text-xs font-semibold text-primary hover:underline"
                      onClick={() =>
                        onToast("El estudio en alta resolución se descarga desde la app")
                      }
                    >
                      Ver estudio
                    </button>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}

/* ───────────── Documentación solicitada ───────────── */

function Documentacion({ ctx }: { ctx: Ctx }) {
  const docs = docsDe(storePortal.usar().docs, ctx.paciente.id);
  const input = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const listos = docs.filter((d) => d.estado === "En revisión" || d.estado === "Aprobada").length;

  const guardar = (sig: DocSolicitada[]) =>
    setPortal("docs", (prev) => ({ ...prev, [ctx.paciente.id]: sig }));

  return (
    <div className="space-y-4">
      <TituloSeccion
        icon={Upload}
        titulo="Documentación solicitada"
        descripcion="Subí lo que te pide la clínica. Lo revisan y te avisamos cuando esté aprobado."
      />
      <Tarjeta>
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">Tu documentación</span>
          <span className="text-muted-foreground">
            {listos} de {docs.length} entregados
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500"
            style={{ width: `${(listos / docs.length) * 100}%` }}
          />
        </div>
      </Tarjeta>
      <input
        ref={input}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && subiendo) {
            guardar(
              docs.map((d) =>
                d.id === subiendo
                  ? { ...d, estado: "En revisión", archivo: f.name, observacion: "" }
                  : d,
              ),
            );
            registrarEventoPortal(
              ctx.paciente.id,
              "Documento subido",
              docs.find((d) => d.id === subiendo)?.titulo ?? f.name,
            );
            ctx.onToast(`"${f.name}" enviado. La clínica lo va a revisar.`);
          }
          e.target.value = "";
          setSubiendo(null);
        }}
      />
      <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {docs.map((d) => (
          <li key={d.id} className="card-grad flex items-start gap-3 p-4">
            <span
              className={`grid size-10 shrink-0 place-items-center rounded-full ${d.estado === "Aprobada" ? "bg-emerald-100 text-emerald-600" : d.estado === "En revisión" ? "bg-sky-100 text-sky-600" : "bg-primary/10 text-primary"}`}
            >
              {d.estado === "Aprobada" ? (
                <Check className="size-5" />
              ) : (
                <ClipboardList className="size-5" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
                {d.titulo}
                {d.obligatorio && <Pill clase="bg-muted text-muted-foreground">Obligatorio</Pill>}
                <Pill
                  clase={
                    d.estado === "Aprobada"
                      ? "bg-emerald-100 text-emerald-700"
                      : d.estado === "En revisión"
                        ? "bg-sky-100 text-sky-700"
                        : d.estado === "Rechazada"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-amber-100 text-amber-700"
                  }
                >
                  {d.estado}
                </Pill>
              </p>
              <p className="text-xs text-muted-foreground">{d.descripcion}</p>
              {d.estado === "Rechazada" && d.observacion && (
                <p className="mt-1 text-[11px] text-destructive">
                  La clínica pidió: {d.observacion}
                </p>
              )}
              {d.archivo && (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Paperclip className="size-3" />
                  {d.archivo}
                </p>
              )}
            </div>
            {d.estado !== "Aprobada" && (
              <button
                className={
                  d.estado === "Pendiente" || d.estado === "Rechazada"
                    ? BTN_PRIMARIO
                    : BTN_SECUNDARIO
                }
                onClick={() => {
                  setSubiendo(d.id);
                  input.current?.click();
                }}
              >
                <Upload className="size-3.5" />
                {d.estado === "Pendiente"
                  ? "Subir"
                  : d.estado === "Rechazada"
                    ? "Subir de nuevo"
                    : "Reemplazar"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ───────────── Pagos ───────────── */

function Pagos({ ctx }: { ctx: Ctx }) {
  const { registros, cambiar, onToast, nombre, clinica } = ctx;
  const [pagar, setPagar] = useState(false);
  const saldo = saldoDe(registros);
  const movs = [...registros.cuenta].sort((a, b) =>
    `${b.fecha}${b.id}`.localeCompare(`${a.fecha}${a.id}`),
  );
  const pagado = registros.cuenta
    .filter((m) => m.tipo !== "Cargo")
    .reduce((a, m) => a + m.monto, 0);
  const cargos = registros.cuenta
    .filter((m) => m.tipo === "Cargo")
    .reduce((a, m) => a + m.monto, 0);

  const comprobante = (m: (typeof movs)[number]) =>
    abrirImpresion(
      `Comprobante de pago`,
      `<p class="meta">Paciente: <b>${escapar(nombre)}</b> · ${formatearFecha(m.fecha)}</p><table><tr><th>Concepto</th><th>Medio</th><th class="n">Importe</th></tr><tr><td>${escapar(m.concepto)}</td><td>${escapar(m.medio || "—")}</td><td class="n">${ars(m.monto)}</td></tr></table>`,
      clinica,
    );

  return (
    <div className="space-y-4">
      <TituloSeccion
        icon={Wallet}
        titulo="Pagos"
        descripcion="Tu cuenta con la clínica: lo que se cobró, lo que pagaste y tu saldo."
      >
        {saldo > 0 && storePortal.leer().config.pagosOnline && (
          <button className={BTN_PRIMARIO} onClick={() => setPagar(true)}>
            <CreditCard className="size-4" />
            Pagar {ars(saldo)}
          </button>
        )}
      </TituloSeccion>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div
          className={`rounded-[22px] p-4 text-white shadow-lg ${saldo > 0 ? "bg-gradient-to-br from-primary via-violet-600 to-fuchsia-600" : "bg-gradient-to-br from-emerald-500 to-emerald-600"}`}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/80">
            Saldo pendiente
          </p>
          <p className="mt-2 font-display text-3xl font-bold">
            {saldo > 0 ? ars(saldo) : "Al día"}
          </p>
          <p className="mt-1 text-xs text-white/80">
            {saldo > 0 ? "Podés pagarlo online ahora" : "No tenés deudas con la clínica"}
          </p>
        </div>
        <Tarjeta>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Total de prestaciones
          </p>
          <p className="mt-2 text-2xl font-bold">{ars(cargos)}</p>
        </Tarjeta>
        <Tarjeta>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Total pagado
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{ars(pagado)}</p>
        </Tarjeta>
      </div>
      {movs.length === 0 ? (
        <Vacio icon={Wallet} texto="Todavía no hay movimientos en tu cuenta." />
      ) : (
        <Tarjeta className="!p-0 overflow-hidden">
          <ul className="divide-y divide-primary/[0.07]">
            {movs.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span
                  className={`grid size-9 place-items-center rounded-full ${m.tipo === "Cargo" ? "bg-primary/10 text-primary" : "bg-emerald-100 text-emerald-600"}`}
                >
                  {m.tipo === "Cargo" ? (
                    <ReceiptText className="size-4" />
                  ) : (
                    <Check className="size-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{m.concepto}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatearFecha(m.fecha)} ·{" "}
                    {m.tipo === "Cargo"
                      ? "Prestación"
                      : `${m.tipo}${m.medio ? ` · ${m.medio}` : ""}`}
                  </p>
                </div>
                <span
                  className={`text-sm font-bold ${m.tipo === "Cargo" ? "" : "text-emerald-600"}`}
                >
                  {m.tipo === "Cargo" ? "" : "− "}
                  {ars(m.monto)}
                </span>
                {m.tipo !== "Cargo" && (
                  <button className={BTN_SECUNDARIO} onClick={() => comprobante(m)}>
                    <Download className="size-3.5" />
                    Comprobante
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}
      {pagar && (
        <Modal titulo="Pagar online" onClose={() => setPagar(false)}>
          <PagoForm
            saldo={saldo}
            onCancel={() => setPagar(false)}
            onSubmit={(monto, medio) => {
              cambiar("cuenta", (prev) => [
                ...prev,
                {
                  id: Date.now(),
                  fecha: hoyISO(),
                  tipo: "Pago",
                  concepto: "Pago online desde el portal",
                  medio,
                  monto,
                  notas: "",
                },
              ]);
              setPagar(false);
              registrarEventoPortal(
                ctx.paciente.id,
                "Pago online",
                `${ars(monto)} con ${medio.toLowerCase()}`,
              );
              onToast(
                `¡Pago de ${ars(monto)} acreditado! Ya figura en tu cuenta y en la de la clínica.`,
              );
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function PagoForm({
  saldo,
  onSubmit,
  onCancel,
}: {
  saldo: number;
  onSubmit: (monto: number, medio: string) => void;
  onCancel: () => void;
}) {
  const [medio, setMedio] = useState("Tarjeta de crédito");
  const [monto, setMonto] = useState(String(saldo));
  const [tarjeta, setTarjeta] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const MEDIOS: { id: string; icon: LucideIcon; ayuda: string }[] = [
    { id: "Tarjeta de crédito", icon: CreditCard, ayuda: "Hasta 3 cuotas sin interés" },
    { id: "Tarjeta de débito", icon: CreditCard, ayuda: "Se debita al instante" },
    { id: "Transferencia", icon: Landmark, ayuda: "CBU / alias de la clínica" },
  ];
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const n = Number(monto);
        if (!n || n <= 0 || n > saldo)
          return setError(`Ingresá un monto entre $ 1 y ${ars(saldo)}.`);
        if (medio.startsWith("Tarjeta") && tarjeta.replace(/\D/g, "").length < 15)
          return setError("Revisá el número de tarjeta.");
        setProcesando(true);
        window.setTimeout(() => onSubmit(n, medio), 900);
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {MEDIOS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMedio(m.id)}
            aria-pressed={medio === m.id}
            className={`rounded-2xl border p-3 text-left transition-colors ${medio === m.id ? "border-primary bg-primary/[0.06]" : "border-border bg-white"}`}
          >
            <m.icon className="size-4 text-primary" />
            <p className="mt-1 text-xs font-semibold">{m.id}</p>
            <p className="text-[10.5px] text-muted-foreground">{m.ayuda}</p>
          </button>
        ))}
      </div>
      <Field label="Monto a pagar">
        <input
          type="number"
          min={1}
          max={saldo}
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          className={INPUT}
        />
      </Field>
      {medio.startsWith("Tarjeta") ? (
        <Field label="Número de tarjeta">
          <input
            inputMode="numeric"
            value={tarjeta}
            onChange={(e) => setTarjeta(e.target.value.replace(/[^\d ]/g, "").slice(0, 19))}
            className={INPUT}
            placeholder="4509 9535 6623 3704 (de prueba)"
          />
        </Field>
      ) : (
        <p className="rounded-xl bg-primary/[0.05] px-3 py-2 text-xs">
          Alias: <b>clinica.esther.mp</b> · CBU 0000003100012345678901. Cuando transfieras, tocá “Ya
          transferí”.
        </p>
      )}
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <ShieldCheck className="size-3.5 text-emerald-600" /> Pago seguro de práctica: no se cobra
        nada real.
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className={BTN_SECUNDARIO} onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className={BTN_PRIMARIO} disabled={procesando}>
          {procesando ? (
            <RefreshCcw className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          {procesando
            ? "Procesando…"
            : medio === "Transferencia"
              ? "Ya transferí"
              : `Pagar ${ars(Number(monto) || 0)}`}
        </button>
      </div>
    </form>
  );
}

/* ───────────── Mensajes (se ven en Comunicación) ───────────── */

function Mensajes({ ctx }: { ctx: Ctx }) {
  const { conversaciones } = storeComunicacion.usar();
  const conv = conversaciones.find((c) => c.paciente === ctx.nombre);
  const [texto, setTexto] = useState("");
  const fin = useRef<HTMLDivElement>(null);
  useEffect(() => fin.current?.scrollIntoView({ block: "end" }), [conv?.mensajes.length]);
  const mensajes = (conv?.mensajes ?? []).filter((m) => m.de === "paciente" || m.de === "clinica");

  const enviar = () => {
    const limpio = texto.trim();
    if (!limpio) return;
    const msg = {
      id: Date.now(),
      de: "paciente" as const,
      texto: limpio,
      fecha: new Date().toISOString(),
    };
    if (conv) {
      setComunicacion("conversaciones", (prev) =>
        prev.map((c) =>
          c.id === conv.id
            ? {
                ...c,
                estado: "Pendiente",
                noLeidos: c.noLeidos + 1,
                mensajes: [...c.mensajes, msg],
              }
            : c,
        ),
      );
    } else {
      setComunicacion("conversaciones", (prev) => [
        {
          id: Date.now() + 1,
          paciente: ctx.nombre,
          telefono: ctx.paciente.telefono,
          email: ctx.paciente.email,
          canal: "WhatsApp",
          estado: "Pendiente",
          asignado: "",
          etiquetas: ["Portal"],
          noLeidos: 1,
          fijada: false,
          mensajes: [msg],
        },
        ...prev,
      ]);
    }
    setTexto("");
    registrarEventoPortal(ctx.paciente.id, "Mensaje", limpio.slice(0, 80));
    ctx.onToast("Mensaje enviado. Te respondemos por acá y por WhatsApp.");
  };

  return (
    <div className="space-y-4">
      <TituloSeccion
        icon={MessageCircle}
        titulo="Mensajes"
        descripcion="Escribile a la clínica. Te responden por acá (y te llega aviso por WhatsApp)."
      />
      <div className="card-grad flex h-[560px] flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-primary/10 px-4 py-3">
          <BrandMark className="size-9" />
          <div>
            <p className="text-sm font-semibold">{ctx.clinica}</p>
            <p className="text-[11px] text-muted-foreground">
              Recepción · suele responder en menos de 1 hora
            </p>
          </div>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto bg-[radial-gradient(rgba(124,58,237,0.06)_1px,transparent_1px)] bg-[length:18px_18px] px-4 py-3">
          {mensajes.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              ¿Tenés alguna duda? Escribinos 👋
            </p>
          )}
          {mensajes.map((m) => {
            const propio = m.de === "paciente";
            return (
              <div key={m.id} className={`flex ${propio ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[78%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm shadow-sm ${propio ? "rounded-br-md bg-gradient-to-br from-primary to-violet-600 text-white" : "rounded-bl-md border border-primary/10 bg-white"}`}
                >
                  {m.texto}
                  <span
                    className={`mt-0.5 block text-right text-[10px] ${propio ? "text-white/75" : "text-muted-foreground"}`}
                  >
                    {new Date(m.fecha).toTimeString().slice(0, 5)}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={fin} />
        </div>
        <div className="border-t border-primary/10 p-3">
          <div className="mb-2 flex flex-wrap gap-1">
            {[
              "Quiero cambiar mi turno",
              "Tengo dolor",
              "¿Aceptan mi obra social?",
              "Consulta sobre mi presupuesto",
            ].map((r) => (
              <button
                key={r}
                onClick={() => setTexto(r)}
                className="rounded-full border border-primary/15 bg-white px-2.5 py-0.5 text-[11px] text-muted-foreground hover:border-primary/35 hover:text-primary"
              >
                {r}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") enviar();
              }}
              placeholder="Escribí tu mensaje…"
              className={INPUT}
            />
            <button className={BTN_PRIMARIO} onClick={enviar} disabled={!texto.trim()}>
              <Send className="size-3.5" />
              Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Mis datos ───────────── */

function Perfil({ ctx }: { ctx: Ctx }) {
  const { setPacientes } = usePacientes();
  const p = ctx.paciente;
  const [telefono, setTelefono] = useState(p.telefono);
  const [email, setEmail] = useState(p.email);
  const [direccion, setDireccion] = useState(p.direccion);
  const [recordatorios, setRecordatorios] = useState({
    whatsapp: true,
    email: true,
    promos: false,
  });
  const [error, setError] = useState("");
  const cambios = useMemo(
    () => telefono !== p.telefono || email !== p.email || direccion !== p.direccion,
    [telefono, email, direccion, p],
  );

  return (
    <div className="space-y-4">
      <TituloSeccion
        icon={UserRound}
        titulo="Mis datos"
        descripcion="Mantené tus datos de contacto al día para recibir recordatorios."
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <form
          className="card-grad space-y-3 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
              return setError("Revisá el correo.");
            if (telefono.replace(/\D/g, "").length < 8) return setError("Revisá el teléfono.");
            setPacientes((prev) =>
              prev.map((x) =>
                x.id === p.id
                  ? {
                      ...x,
                      telefono: telefono.trim(),
                      email: email.trim(),
                      direccion: capitalizarNombre(direccion.trim()),
                    }
                  : x,
              ),
            );
            setError("");
            registrarEventoPortal(p.id, "Datos actualizados", "Teléfono, correo o dirección");
            ctx.onToast("Datos actualizados. La clínica ya los ve en tu ficha.");
          }}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Nombre">
              <input
                value={`${p.nombre} ${p.apellido}`}
                disabled
                className={`${INPUT} bg-muted/40`}
              />
            </Field>
            <Field label="DNI">
              <input
                value={p.documento.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                disabled
                className={`${INPUT} bg-muted/40`}
              />
            </Field>
            <Field label="Teléfono">
              <input
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field label="Correo">
              <input value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
            </Field>
            <Field label="Dirección">
              <input
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                className={INPUT}
                placeholder="Calle, número, ciudad"
              />
            </Field>
            <Field label="Obra social">
              <input
                value={`${p.obraSocial || "Particular"}${p.afiliado ? ` · ${p.afiliado}` : ""}`}
                disabled
                className={`${INPUT} bg-muted/40`}
              />
            </Field>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Para cambiar tu nombre, DNI u obra social, escribinos desde Mensajes.
          </p>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end">
            <button type="submit" className={BTN_PRIMARIO} disabled={!cambios}>
              <Check className="size-4" />
              Guardar cambios
            </button>
          </div>
        </form>
        <div className="card-grad h-fit space-y-3 p-5">
          <p className="font-display text-base font-semibold">Cómo te avisamos</p>
          {(
            [
              ["whatsapp", "Recordatorios por WhatsApp", MessageCircle],
              ["email", "Recordatorios por correo", Bell],
              ["promos", "Novedades y promociones", ReceiptText],
            ] as const
          ).map(([k, l, Icon]) => (
            <label
              key={k}
              className="flex items-center justify-between gap-2 rounded-xl bg-white/80 px-3 py-2.5 text-sm"
            >
              <span className="flex items-center gap-2">
                <Icon className="size-4 text-primary" />
                {l}
              </span>
              <input
                type="checkbox"
                checked={recordatorios[k]}
                onChange={(e) => {
                  setRecordatorios((r) => ({ ...r, [k]: e.target.checked }));
                  ctx.onToast("Preferencia guardada");
                }}
                className="size-4 accent-[var(--color-primary)]"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
