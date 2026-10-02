import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlarmClock,
  Bell,
  BellOff,
  BellRing,
  Building2,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  CircleAlert,
  Clock3,
  Download,
  EyeOff,
  FlaskConical,
  History,
  Mail,
  MessageCircle,
  MessagesSquare,
  Moon,
  Package,
  Pencil,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  UserRound,
  Users,
  Volume2,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppShell } from "@/components/cloud-esther/AppShell";
import { CloudEstherProvider } from "@/lib/cloud-esther/data";
import { useNivel } from "@/lib/cloud-esther/niveles";
import { useSesion } from "@/lib/cloud-esther/auth-store";
import { useEquipo } from "@/lib/cloud-esther/equipo-store";
import {
  CATEGORIAS_NOTIF,
  PRIORIDADES_NOTIF,
  cambiarEstadoNotif,
  setNotificaciones,
  storeNotificaciones,
  type CategoriaNotif,
  type NotifManual,
  type PreferenciaCategoria,
  type PrioridadNotif,
} from "@/lib/cloud-esther/notificaciones-store";
import { useNotificaciones, type Notif } from "@/components/cloud-esther/useNotificaciones";
import { normalizarBusqueda } from "@/lib/utils";

/* Ubicación: src/components/cloud-esther/Notificaciones.tsx

   Centro de notificaciones: alertas automáticas de los módulos del plan + avisos y tareas
   para el equipo, con prioridades, vencimientos, posponer, preferencias por área e historial.
   Separado por empresa. TODO backend: API de notificaciones + push/correo/WhatsApp. */

type Seccion = "bandeja" | "pospuestas" | "preferencias" | "historial";
type FiltroEstado = "pendientes" | "sinLeer" | "completadas" | "todas";

const CATEGORIA_ESTILO: Record<CategoriaNotif, { icon: LucideIcon; color: string }> = {
  Agenda: { icon: CalendarDays, color: "from-primary/20 to-primary/5 text-primary" },
  Pacientes: { icon: UserRound, color: "from-pink-200/70 to-pink-50 text-pink-600" },
  Comunicación: {
    icon: MessagesSquare,
    color: "from-emerald-200/70 to-emerald-50 text-emerald-600",
  },
  Laboratorio: { icon: FlaskConical, color: "from-sky-200/70 to-sky-50 text-sky-600" },
  Insumos: { icon: Package, color: "from-amber-200/70 to-amber-50 text-amber-600" },
  Administración: { icon: Building2, color: "from-violet-200/70 to-violet-50 text-violet-600" },
  Equipo: { icon: Users, color: "from-slate-200/80 to-slate-50 text-slate-600" },
};

const PRIORIDAD_ESTILO: Record<PrioridadNotif, { franja: string; chip: string }> = {
  Urgente: { franja: "bg-destructive", chip: "bg-destructive/10 text-destructive" },
  Alta: { franja: "bg-amber-500", chip: "bg-amber-100 text-amber-700" },
  Normal: { franja: "bg-primary/60", chip: "bg-primary/10 text-primary" },
  Baja: { franja: "bg-slate-300", chip: "bg-muted text-muted-foreground" },
};

const ORDEN_PRIORIDAD: Record<PrioridadNotif, number> = { Urgente: 0, Alta: 1, Normal: 2, Baja: 3 };

const PLANTILLAS_RAPIDAS: {
  categoria: CategoriaNotif;
  titulo: string;
  prioridad: PrioridadNotif;
}[] = [
  { categoria: "Insumos", titulo: "Reponer guantes y barbijos", prioridad: "Alta" },
  { categoria: "Pacientes", titulo: "Llamar a paciente para control", prioridad: "Normal" },
  { categoria: "Administración", titulo: "Revisar pagos pendientes", prioridad: "Normal" },
  { categoria: "Equipo", titulo: "Reunión de equipo", prioridad: "Baja" },
  { categoria: "Laboratorio", titulo: "Reclamar trabajo al laboratorio", prioridad: "Alta" },
];

const ROLES_FIJOS = ["Recepción", "Administración", "Dirección"];

/* ───────────── Utilidades ───────────── */

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatearFecha(iso: string) {
  return iso ? iso.slice(0, 10).split("-").reverse().join("/") : "";
}

function hace(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 0) {
    const d = formatearFecha(iso.slice(0, 10));
    return iso.slice(0, 10) === hoyISO() ? `hoy ${iso.slice(11, 16)}` : `${d} ${iso.slice(11, 16)}`;
  }
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}

function grupoDe(n: Notif): string {
  const hoy = hoyISO();
  if (n.estado.completada) return "Completadas";
  if (n.vence && n.vence < hoy) return "Vencidas";
  const dia = n.fecha.slice(0, 10);
  if (dia > hoy) return "Próximos días";
  if (dia === hoy) return "Hoy";
  return "Anteriores";
}
const ORDEN_GRUPOS = ["Vencidas", "Hoy", "Próximos días", "Anteriores", "Completadas"];

function pitido() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.35);
  } catch {
    /* sin audio disponible */
  }
}

/* ───────────── Estilos y piezas chicas ───────────── */

const INPUT =
  "h-9 w-full rounded-xl border border-primary/12 bg-white px-3 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary/45 focus:ring-4 focus:ring-primary/10";
const BTN_PRIMARIO =
  "btn-ce focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
const BTN_SECUNDARIO =
  "btn-ce-outline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
const BTN_ICONO =
  "grid size-8 shrink-0 place-items-center rounded-full border border-primary/12 bg-white text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary/10 hover:text-primary";

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

function Select<T extends string>({
  value,
  onChange,
  opciones,
  className = "",
  etiqueta,
}: {
  value: T;
  onChange: (v: T) => void;
  opciones: readonly { value: T; label: string }[];
  className?: string;
  etiqueta?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        aria-label={etiqueta}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={`${INPUT} appearance-none pr-8`}
      >
        {opciones.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function Interruptor({
  activo,
  onChange,
  etiqueta,
}: {
  activo: boolean;
  onChange: (v: boolean) => void;
  etiqueta: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={etiqueta}
      onClick={() => onChange(!activo)}
      className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${activo ? "bg-primary" : "bg-muted-foreground/30"}`}
    >
      <span
        className={`absolute top-0.5 size-3 rounded-full bg-white shadow transition-all ${activo ? "left-[14px]" : "left-0.5"}`}
      />
    </button>
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
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-border bg-card p-5 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              Notificaciones
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">{titulo}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="grid size-8 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

type TonoStat = "primary" | "rojo" | "ambar" | "verde";
const TONOS: Record<TonoStat, { label: string; value: string; circle: string }> = {
  primary: {
    label: "text-primary/75",
    value: "text-primary",
    circle: "bg-primary/[0.08] text-primary",
  },
  rojo: {
    label: "text-destructive/80",
    value: "text-destructive",
    circle: "bg-destructive/10 text-destructive",
  },
  ambar: {
    label: "text-amber-600/85",
    value: "text-amber-600",
    circle: "bg-amber-400/[0.12] text-amber-600",
  },
  verde: {
    label: "text-emerald-600/85",
    value: "text-emerald-600",
    circle: "bg-emerald-400/[0.1] text-emerald-600",
  },
};

function StatCard({
  label,
  value,
  icon: Icon,
  tono,
  trend,
  detail,
  onClick,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tono: TonoStat;
  trend: string;
  detail: string;
  onClick?: () => void;
}) {
  const t = TONOS[tono];
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative min-h-[112px] overflow-hidden rounded-[22px] border border-primary/25 bg-gradient-to-br from-white via-white to-primary/[0.065] p-4 text-left shadow-[0_12px_28px_-20px_rgba(124,58,237,0.48)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/45"
    >
      <div className="pointer-events-none absolute -right-7 -top-9 size-[100px] rounded-full bg-primary/[0.035] ring-[13px] ring-primary/[0.035] transition-transform duration-300 group-hover:scale-110" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`text-[10px] font-bold uppercase leading-[1.25] tracking-[0.09em] ${t.label}`}
          >
            {label}
          </p>
          <p className={`mt-2 text-[27px] font-bold leading-none tracking-tight ${t.value}`}>
            {value}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] leading-4">
            <span className={`font-semibold ${t.value}`}>{trend}</span>
            <span className="text-muted-foreground">{detail}</span>
          </div>
        </div>
        <div className={`grid size-9 shrink-0 place-items-center rounded-full ${t.circle}`}>
          <Icon className="size-4" strokeWidth={1.7} />
        </div>
      </div>
    </button>
  );
}

function EncabezadoSeccion({
  icon: Icon,
  titulo,
  descripcion,
  children,
}: {
  icon: LucideIcon;
  titulo: string;
  descripcion: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/15 via-primary/8 to-primary/[0.03] text-primary ring-1 ring-primary/15">
          <Icon className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{titulo}</h2>
          <p className="text-sm text-muted-foreground">{descripcion}</p>
        </div>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

function Vacio({ icon: Icon, titulo, texto }: { icon: LucideIcon; titulo: string; texto: string }) {
  return (
    <div className="card-grad grid min-h-44 place-items-center p-6 text-center">
      <div>
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <p className="mt-2 text-sm font-semibold">{titulo}</p>
        <p className="text-sm text-muted-foreground">{texto}</p>
      </div>
    </div>
  );
}

/* ───────────── Página ───────────── */

export default function Notificaciones() {
  return (
    <CloudEstherProvider>
      <NotificacionesInner />
    </CloudEstherProvider>
  );
}

function NotificacionesInner() {
  const { usuario: usuarioSesion } = useSesion();
  const usuario = usuarioSesion?.nombre ?? "Recepción";
  const { notificaciones, pospuestas, sinLeer } = useNotificaciones();
  const { historial } = storeNotificaciones.usar();
  const [montado, setMontado] = useState(false);
  const [seccion, setSeccion] = useState<Seccion>("bandeja");
  const nivelNotif = useNivel("notificaciones");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("pendientes");
  const [filtroCategoria, setFiltroCategoria] = useState<"" | CategoriaNotif>("");
  const [filtroPrioridad, setFiltroPrioridad] = useState<"" | "altas">("");
  const [formulario, setFormulario] = useState<{ inicial: NotifManual | null } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => setMontado(true), []);

  const onToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  };

  const hoy = hoyISO();
  const pendientes = notificaciones.filter((n) => !n.estado.completada);
  const altas = pendientes.filter((n) => n.prioridad === "Urgente" || n.prioridad === "Alta");
  const vencenHoy = pendientes.filter((n) => n.vence === hoy).length;
  const vencidas = pendientes.filter((n) => n.vence && n.vence < hoy).length;
  const completadasHoy = notificaciones.filter(
    (n) => n.estado.completada?.slice(0, 10) === hoy,
  ).length;

  // Start: bandeja e historial. Pro en adelante: filtros por área y prioridad, avisos
  // pospuestos y preferencias (qué se avisa, a quién y el resumen diario).
  const conReglas = nivelNotif.desde("avanzado");
  const TODAS: {
    id: Seccion;
    label: string;
    icon: LucideIcon;
    contador?: number;
    reglas?: boolean;
  }[] = [
    { id: "bandeja", label: "Bandeja", icon: Bell, contador: sinLeer },
    {
      id: "pospuestas",
      label: "Pospuestas",
      icon: AlarmClock,
      contador: pospuestas.length,
      reglas: true,
    },
    { id: "preferencias", label: "Preferencias", icon: Settings2, reglas: true },
    { id: "historial", label: "Historial", icon: History },
  ];
  const SECCIONES = TODAS.filter((x) => conReglas || !x.reglas);
  const seccionVisible: Seccion = SECCIONES.some((x) => x.id === seccion) ? seccion : "bandeja";

  const nueva = () => setFormulario({ inicial: null });

  return (
    <AppShell>
      <div className="relative min-h-full overflow-hidden bg-[#faf9ff]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_5%,rgba(124,58,237,0.15),transparent_28%),radial-gradient(circle_at_92%_12%,rgba(251,191,36,0.10),transparent_27%),radial-gradient(circle_at_78%_88%,rgba(167,139,250,0.12),transparent_30%),linear-gradient(135deg,#f8f6ff_0%,#f3effd_48%,#faf8ff_100%)]"
        />

        <div className="relative mx-auto w-full max-w-[1420px] px-4 py-6 md:px-6 lg:px-8">
          <section className="relative overflow-hidden rounded-[30px] border border-primary/15 bg-gradient-to-br from-white via-white/96 to-primary/[0.045] shadow-[0_20px_55px_-38px_rgba(76,29,149,0.55)]">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary/55 via-primary to-amber-400/60" />
            <div className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-primary/[0.055] blur-2xl" />
            <div className="relative p-5 md:p-7">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-primary/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                      <BellRing className="size-3.5" />
                      Centro de avisos
                    </span>
                    {montado && sinLeer > 0 && (
                      <span className="rounded-full border border-amber-200/70 bg-amber-50/80 px-3 py-1.5 text-[11px] font-bold text-amber-700">
                        {sinLeer} sin leer
                      </span>
                    )}
                  </div>
                  <h1 className="mt-4 text-[34px] font-bold tracking-[-0.035em] md:text-[42px]">
                    Notificaciones
                  </h1>
                  <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-foreground md:text-sm">
                    Todo lo que necesita tu atención en un solo lugar: alertas automáticas de la
                    agenda, los pacientes y los demás módulos de tu plan, y avisos o tareas para el
                    equipo.
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {conReglas && (
                    <button className={BTN_SECUNDARIO} onClick={() => setSeccion("preferencias")}>
                      <Settings2 className="size-4" />
                      Preferencias
                    </button>
                  )}
                  <button className={BTN_PRIMARIO} onClick={nueva}>
                    <Plus className="size-4" />
                    Nuevo aviso
                  </button>
                </div>
              </div>

              {montado && (
                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    label="Sin leer"
                    value={String(sinLeer)}
                    icon={Bell}
                    tono="primary"
                    trend={`${pendientes.length} pendientes`}
                    detail="en total"
                    onClick={() => {
                      setSeccion("bandeja");
                      setFiltroEstado("sinLeer");
                    }}
                  />
                  <StatCard
                    label="Urgentes y alta prioridad"
                    value={String(altas.length)}
                    icon={CircleAlert}
                    tono="rojo"
                    trend={`${altas.filter((n) => n.prioridad === "Urgente").length} urgentes`}
                    detail="para resolver primero"
                    onClick={() => {
                      setSeccion("bandeja");
                      setFiltroEstado("pendientes");
                      setFiltroPrioridad("altas");
                    }}
                  />
                  <StatCard
                    label="Vencen hoy"
                    value={String(vencenHoy)}
                    icon={Clock3}
                    tono="ambar"
                    trend={vencidas ? `${vencidas} vencidas` : "Nada vencido"}
                    detail="avisos con fecha"
                  />
                  <StatCard
                    label="Completadas hoy"
                    value={String(completadasHoy)}
                    icon={CheckCheck}
                    tono="verde"
                    trend={`${historial.filter((h) => h.fecha.slice(0, 10) === hoy).length} acciones`}
                    detail="registradas hoy"
                    onClick={() => {
                      setSeccion("bandeja");
                      setFiltroEstado("completadas");
                    }}
                  />
                </div>
              )}

              <nav
                className="mt-4 flex flex-wrap gap-1.5 rounded-2xl border border-primary/10 bg-primary/[0.025] p-1.5"
                aria-label="Secciones de notificaciones"
              >
                {SECCIONES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSeccion(s.id)}
                    aria-pressed={seccionVisible === s.id}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                      seccionVisible === s.id
                        ? "bg-primary text-primary-foreground shadow-[0_8px_18px_-10px_rgba(124,58,237,0.8)]"
                        : "text-muted-foreground hover:bg-white hover:text-foreground"
                    }`}
                  >
                    <s.icon className="size-3.5" />
                    {s.label}
                    {montado && !!s.contador && (
                      <span
                        className={`grid min-w-4 place-items-center rounded-full px-1 text-[10px] ${
                          seccionVisible === s.id
                            ? "bg-white/25"
                            : "bg-primary text-primary-foreground"
                        }`}
                      >
                        {s.contador}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </section>

          <div className="mt-5">
            {!montado ? (
              <div className="card-grad h-[520px] animate-pulse" />
            ) : seccionVisible === "bandeja" ? (
              <Bandeja
                conFiltros={conReglas}
                notificaciones={notificaciones}
                usuario={usuario}
                onToast={onToast}
                onNueva={nueva}
                onEditar={(m) => setFormulario({ inicial: m })}
                filtroEstado={filtroEstado}
                setFiltroEstado={setFiltroEstado}
                filtroCategoria={filtroCategoria}
                setFiltroCategoria={setFiltroCategoria}
                filtroPrioridad={filtroPrioridad}
                setFiltroPrioridad={setFiltroPrioridad}
              />
            ) : seccionVisible === "pospuestas" ? (
              <Pospuestas pospuestas={pospuestas} usuario={usuario} onToast={onToast} />
            ) : seccionVisible === "preferencias" ? (
              <PreferenciasSec onToast={onToast} />
            ) : (
              <Historial onToast={onToast} />
            )}
          </div>
        </div>

        {formulario && (
          <Modal
            titulo={formulario.inicial ? "Editar aviso" : "Nuevo aviso"}
            onClose={() => setFormulario(null)}
          >
            <AvisoForm
              inicial={formulario.inicial}
              onCancel={() => setFormulario(null)}
              onSubmit={(datos, canales) => {
                const inicial = formulario.inicial;
                if (inicial) {
                  setNotificaciones("manuales", (prev) =>
                    prev.map((m) => (m.id === inicial.id ? { ...m, ...datos } : m)),
                  );
                  cambiarEstadoNotif(
                    [{ id: inicial.id, titulo: datos.titulo }],
                    {},
                    "Editó",
                    usuario,
                  );
                  onToast("Aviso actualizado");
                } else {
                  const id = `m-${Date.now()}`;
                  setNotificaciones("manuales", (prev) => [
                    { ...datos, id, creada: new Date().toISOString(), creadaPor: usuario },
                    ...prev,
                  ]);
                  cambiarEstadoNotif([{ id, titulo: datos.titulo }], {}, "Creó", usuario);
                  onToast(
                    canales.length
                      ? `Aviso creado y enviado por ${canales.join(" y ")}${datos.asignado ? ` a ${datos.asignado}` : ""}`
                      : `Aviso creado${datos.asignado ? ` para ${datos.asignado}` : ""}`,
                  );
                }
                setFormulario(null);
              }}
            />
          </Modal>
        )}

        {toast && (
          <div
            className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background shadow-xl"
            role="status"
          >
            {toast}
          </div>
        )}
      </div>
    </AppShell>
  );
}

/* ───────────── Bandeja ───────────── */

function Bandeja({
  notificaciones,
  usuario,
  onToast,
  onNueva,
  onEditar,
  filtroEstado,
  setFiltroEstado,
  filtroCategoria,
  setFiltroCategoria,
  filtroPrioridad,
  setFiltroPrioridad,
  conFiltros,
}: {
  conFiltros: boolean;
  notificaciones: Notif[];
  usuario: string;
  onToast: (m: string) => void;
  onNueva: () => void;
  onEditar: (m: NotifManual) => void;
  filtroEstado: FiltroEstado;
  setFiltroEstado: (v: FiltroEstado) => void;
  filtroCategoria: "" | CategoriaNotif;
  setFiltroCategoria: (v: "" | CategoriaNotif) => void;
  filtroPrioridad: "" | "altas";
  setFiltroPrioridad: (v: "" | "altas") => void;
}) {
  const { miembros } = useEquipo();
  const { manuales, preferencias } = storeNotificaciones.usar();
  const [busqueda, setBusqueda] = useState("");
  const [asignado, setAsignado] = useState("");
  const texto = normalizarBusqueda(busqueda);
  const equipo = [
    ...ROLES_FIJOS,
    ...miembros
      .filter((m) => m.status !== "inactivo")
      .map((m) => `${m.firstName} ${m.lastName}`.trim()),
  ];

  const lista = notificaciones
    .filter((n) => {
      if (filtroEstado === "pendientes" && n.estado.completada) return false;
      if (filtroEstado === "sinLeer" && (n.estado.leida || n.estado.completada)) return false;
      if (filtroEstado === "completadas" && !n.estado.completada) return false;
      if (filtroCategoria && n.categoria !== filtroCategoria) return false;
      if (filtroPrioridad === "altas" && n.prioridad !== "Urgente" && n.prioridad !== "Alta")
        return false;
      if (asignado === "__mias" && n.asignado !== usuario) return false;
      if (asignado === "__sin" && n.asignado) return false;
      if (asignado && !asignado.startsWith("__") && n.asignado !== asignado) return false;
      if (texto && !normalizarBusqueda(`${n.titulo} ${n.detalle} ${n.asignado}`).includes(texto))
        return false;
      return true;
    })
    .sort(
      (a, b) =>
        Number(!!a.estado.leida) - Number(!!b.estado.leida) ||
        ORDEN_PRIORIDAD[a.prioridad] - ORDEN_PRIORIDAD[b.prioridad] ||
        b.fecha.localeCompare(a.fecha),
    );

  const grupos = ORDEN_GRUPOS.map((g) => ({
    g,
    items: lista.filter((n) => grupoDe(n) === g),
  })).filter((x) => x.items.length);
  const pendientes = notificaciones.filter((n) => !n.estado.completada);
  const sinLeerVisibles = lista.filter((n) => !n.estado.leida && !n.estado.completada);

  const crearRapida = (p: (typeof PLANTILLAS_RAPIDAS)[number]) => {
    const id = `m-${Date.now()}`;
    setNotificaciones("manuales", (prev) => [
      {
        id,
        titulo: p.titulo,
        detalle: "Aviso rápido creado desde Notificaciones.",
        categoria: p.categoria,
        prioridad: p.prioridad,
        asignado: "",
        vence: hoyISO(),
        horaVence: "",
        creada: new Date().toISOString(),
        creadaPor: usuario,
      },
      ...prev,
    ]);
    cambiarEstadoNotif([{ id, titulo: p.titulo }], {}, "Creó", usuario);
    onToast(`Aviso "${p.titulo}" creado para hoy`);
  };

  const hayFiltros = !!(filtroCategoria || filtroPrioridad || asignado || texto);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-3">
        {/* Filtros */}
        <div className="card-grad space-y-2 p-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-full bg-primary/[0.06] p-0.5">
              {(
                [
                  ["pendientes", "Pendientes"],
                  ["sinLeer", "Sin leer"],
                  ["completadas", "Completadas"],
                  ["todas", "Todas"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setFiltroEstado(id)}
                  aria-pressed={filtroEstado === id}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                    filtroEstado === id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="relative min-w-48 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-primary/60" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar aviso, paciente o responsable"
                className={`${INPUT} h-8 pl-8`}
              />
            </div>
            <Select
              etiqueta="Responsable"
              className="w-44"
              value={asignado}
              onChange={setAsignado}
              opciones={[
                { value: "", label: "Todos los responsables" },
                { value: "__mias", label: `Asignadas a mí` },
                { value: "__sin", label: "Sin asignar" },
                ...equipo.map((n) => ({ value: n, label: n })),
              ]}
            />
          </div>
          {conFiltros && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setFiltroPrioridad(filtroPrioridad ? "" : "altas")}
                aria-pressed={!!filtroPrioridad}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  filtroPrioridad
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : "border-border bg-white text-muted-foreground hover:text-foreground"
                }`}
              >
                <CircleAlert className="size-3" />
                Solo urgentes y altas
              </button>
              {CATEGORIAS_NOTIF.map((c) => {
                const Icon = CATEGORIA_ESTILO[c].icon;
                const activa = filtroCategoria === c;
                return (
                  <button
                    key={c}
                    onClick={() => setFiltroCategoria(activa ? "" : c)}
                    aria-pressed={activa}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      activa
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-white text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-3" />
                    {c}
                  </button>
                );
              })}
              {hayFiltros && (
                <button
                  onClick={() => {
                    setFiltroCategoria("");
                    setFiltroPrioridad("");
                    setAsignado("");
                    setBusqueda("");
                  }}
                  className="ml-auto text-[11px] font-semibold text-primary hover:underline"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          )}
        </div>

        {sinLeerVisibles.length > 1 && (
          <div className="flex justify-end">
            <button
              className={BTN_SECUNDARIO}
              onClick={() => {
                cambiarEstadoNotif(sinLeerVisibles, { leida: true }, null, usuario);
                onToast(`${sinLeerVisibles.length} avisos marcados como leídos`);
              }}
            >
              <CheckCheck className="size-3.5" />
              Marcar todas como leídas ({sinLeerVisibles.length})
            </button>
          </div>
        )}

        {grupos.length === 0 ? (
          <Vacio
            icon={filtroEstado === "completadas" ? CheckCheck : Sparkles}
            titulo={
              filtroEstado === "completadas" ? "Todavía no completaste avisos" : "¡Todo al día!"
            }
            texto={
              hayFiltros ? "No hay avisos con esos filtros." : "No hay avisos pendientes por ahora."
            }
          />
        ) : (
          grupos.map(({ g, items }) => (
            <section key={g}>
              <p className="mb-2 flex items-center gap-2 px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {g === "Vencidas" && <CircleAlert className="size-3.5 text-destructive" />}
                {g}
                <span className="rounded-full bg-primary/10 px-1.5 text-primary">
                  {items.length}
                </span>
              </p>
              <ul className="space-y-2">
                {items.map((n) => (
                  <TarjetaNotif
                    key={n.id}
                    n={n}
                    usuario={usuario}
                    onToast={onToast}
                    onEditar={() => {
                      const m = manuales.find((x) => x.id === n.id);
                      if (m) onEditar(m);
                    }}
                  />
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      {/* Columna lateral */}
      <aside className="space-y-3">
        <div className="card-grad p-4">
          <p className="text-sm font-semibold">Pendientes por área</p>
          <ul className="mt-2 space-y-1">
            {CATEGORIAS_NOTIF.map((c) => {
              const cant = pendientes.filter((n) => n.categoria === c).length;
              const Icon = CATEGORIA_ESTILO[c].icon;
              const apagada = !preferencias.categorias[c].activa;
              return (
                <li key={c}>
                  <button
                    onClick={() => setFiltroCategoria(filtroCategoria === c ? "" : c)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left text-xs transition-colors ${
                      filtroCategoria === c ? "bg-primary/10" : "hover:bg-primary/[0.05]"
                    }`}
                  >
                    <span
                      className={`grid size-7 place-items-center rounded-full bg-gradient-to-br ${CATEGORIA_ESTILO[c].color}`}
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <span className="flex-1 font-medium">{c}</span>
                    {apagada ? (
                      <BellOff
                        className="size-3.5 text-muted-foreground"
                        aria-label="Alertas apagadas"
                      />
                    ) : (
                      <span
                        className={`min-w-6 rounded-full px-1.5 text-center text-[11px] font-bold ${cant ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                      >
                        {cant}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="card-grad p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-primary" /> Aviso rápido
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">Un clic y queda creado para hoy.</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PLANTILLAS_RAPIDAS.map((p) => (
              <button
                key={p.titulo}
                onClick={() => crearRapida(p)}
                className="rounded-full border border-primary/15 bg-white px-2.5 py-1 text-left text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/35 hover:text-primary"
              >
                + {p.titulo}
              </button>
            ))}
          </div>
          <button className={`${BTN_PRIMARIO} mt-3 w-full`} onClick={onNueva}>
            <Plus className="size-3.5" />
            Aviso personalizado
          </button>
        </div>

        <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.09] via-primary/[0.04] to-transparent p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Mail className="size-4 text-primary" /> Resumen diario
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {preferencias.resumenDiario.activo
              ? `Todos los días a las ${preferencias.resumenDiario.hora} hs llega por correo un resumen con los ${pendientes.length} avisos pendientes.`
              : "Apagado. Activalo en Preferencias para recibir un resumen por correo cada mañana."}
          </p>
        </div>
      </aside>
    </div>
  );
}

function TarjetaNotif({
  n,
  usuario,
  onToast,
  onEditar,
  pospuesta = false,
}: {
  n: Notif;
  usuario: string;
  onToast: (m: string) => void;
  onEditar: () => void;
  pospuesta?: boolean;
}) {
  const [menu, setMenu] = useState(false);
  const Icon = CATEGORIA_ESTILO[n.categoria].icon;
  const leida = !!n.estado.leida;
  const completada = !!n.estado.completada;
  const hoy = hoyISO();
  const vencida = !!n.vence && n.vence < hoy && !completada;
  const item = [{ id: n.id, titulo: n.titulo }];

  const posponer = (horas: number, etiqueta: string) => {
    let hasta: Date;
    if (horas === -1) {
      hasta = new Date();
      hasta.setDate(hasta.getDate() + 1);
      hasta.setHours(8, 0, 0, 0);
    } else {
      hasta = new Date(Date.now() + horas * 3_600_000);
    }
    cambiarEstadoNotif(
      item,
      { pospuestaHasta: hasta.toISOString(), leida: true },
      `Pospuso (${etiqueta})`,
      usuario,
    );
    setMenu(false);
    onToast(`Pospuesta ${etiqueta}`);
  };

  return (
    <li
      className={`card-grad group relative flex gap-3 overflow-visible p-3.5 pl-4 transition-all hover:-translate-y-0.5 ${
        completada ? "opacity-70" : ""
      }`}
      onClick={() => {
        if (!leida && !completada) cambiarEstadoNotif(item, { leida: true }, null, usuario);
      }}
    >
      <span
        className={`absolute inset-y-3 left-0 w-1 rounded-r-full ${PRIORIDAD_ESTILO[n.prioridad].franja}`}
      />
      <span
        className={`relative grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br ${CATEGORIA_ESTILO[n.categoria].color}`}
      >
        <Icon className="size-4.5" />
        {!leida && !completada && (
          <span
            className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-white bg-primary"
            aria-label="Sin leer"
          />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p
            className={`text-sm ${!leida && !completada ? "font-bold" : "font-semibold"} ${completada ? "line-through decoration-muted-foreground/50" : ""}`}
          >
            {n.titulo}
          </p>
          <Pill clase={PRIORIDAD_ESTILO[n.prioridad].chip}>{n.prioridad}</Pill>
          {n.origen === "auto" && (
            <Pill clase="bg-gradient-to-r from-primary/10 to-fuchsia-100 text-primary">
              <Sparkles className="size-3" />
              Automática
            </Pill>
          )}
          {vencida && <Pill clase="bg-destructive/10 text-destructive">Vencida</Pill>}
        </div>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{n.detalle}</p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground/70">{n.categoria}</span>
          {n.asignado ? (
            <span className="inline-flex items-center gap-1">
              <UserRound className="size-3" />
              {n.asignado}
            </span>
          ) : (
            <span className="italic">Sin asignar</span>
          )}
          {n.vence && (
            <span
              className={`inline-flex items-center gap-1 ${vencida ? "font-semibold text-destructive" : ""}`}
            >
              <Clock3 className="size-3" />
              Vence {n.vence === hoy ? "hoy" : formatearFecha(n.vence)}
              {n.horaVence ? ` ${n.horaVence}` : ""}
            </span>
          )}
          {pospuesta && n.estado.pospuestaHasta && (
            <span className="inline-flex items-center gap-1 text-amber-700">
              <AlarmClock className="size-3" />
              Vuelve {hace(n.estado.pospuestaHasta)}
            </span>
          )}
          {completada && n.estado.completada && (
            <span className="text-emerald-600">Completada {hace(n.estado.completada)}</span>
          )}
          {!completada && !pospuesta && n.origen === "manual" && (
            <span>Creada por {n.creadaPor}</span>
          )}
        </p>
      </div>

      <div
        className="flex shrink-0 flex-col items-end justify-between gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1">
          {pospuesta ? (
            <button
              className={BTN_SECUNDARIO}
              onClick={() => {
                cambiarEstadoNotif(item, { pospuestaHasta: "", leida: false }, "Reactivó", usuario);
                onToast("Aviso reactivado");
              }}
            >
              <Bell className="size-3.5" />
              Reactivar
            </button>
          ) : completada ? (
            <button
              className={BTN_SECUNDARIO}
              onClick={() => {
                cambiarEstadoNotif(item, { completada: "", leida: true }, "Reabrió", usuario);
                onToast("Aviso reabierto");
              }}
            >
              <Bell className="size-3.5" />
              Reabrir
            </button>
          ) : (
            <>
              {n.accion && (
                <Link
                  to={n.accion.to as never}
                  className={BTN_PRIMARIO}
                  onClick={() => cambiarEstadoNotif(item, { leida: true }, null, usuario)}
                >
                  {n.accion.label}
                </Link>
              )}
              <button
                className={BTN_ICONO}
                title="Completar"
                aria-label="Completar"
                onClick={() => {
                  cambiarEstadoNotif(
                    item,
                    { completada: new Date().toISOString(), leida: true },
                    "Completó",
                    usuario,
                  );
                  onToast("¡Listo! Aviso completado");
                }}
              >
                <Check className="size-4" />
              </button>
              <div className="relative">
                <button
                  className={BTN_ICONO}
                  title="Posponer"
                  aria-label="Posponer"
                  onClick={() => setMenu((v) => !v)}
                >
                  <AlarmClock className="size-3.5" />
                </button>
                {menu && (
                  <div className="absolute right-0 top-9 z-20 w-40 rounded-xl border border-border bg-card p-1 shadow-xl">
                    {(
                      [
                        [1, "1 hora"],
                        [3, "3 horas"],
                        [-1, "hasta mañana 8:00"],
                        [72, "3 días"],
                      ] as const
                    ).map(([h, l]) => (
                      <button
                        key={l}
                        onClick={() => posponer(h, l)}
                        className="w-full rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-primary/5"
                      >
                        Posponer {l}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
          {n.origen === "manual" && !pospuesta && (
            <button className={BTN_ICONO} title="Editar" aria-label="Editar" onClick={onEditar}>
              <Pencil className="size-3.5" />
            </button>
          )}
          <button
            className={`${BTN_ICONO} hover:!border-destructive/30 hover:!bg-destructive/10 hover:!text-destructive`}
            title={n.origen === "auto" ? "Descartar" : "Eliminar"}
            aria-label={n.origen === "auto" ? "Descartar" : "Eliminar"}
            onClick={() => {
              if (n.origen === "manual") {
                setNotificaciones("manuales", (prev) => prev.filter((m) => m.id !== n.id));
                cambiarEstadoNotif(item, {}, "Eliminó", usuario);
                onToast("Aviso eliminado");
              } else {
                cambiarEstadoNotif(item, { oculta: true }, "Descartó", usuario);
                onToast("Alerta descartada");
              }
            }}
          >
            {n.origen === "auto" ? (
              <EyeOff className="size-3.5" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
          </button>
        </div>
        <span className="text-[10.5px] text-muted-foreground">
          {n.origen === "manual" && n.vence ? "" : hace(n.fecha)}
        </span>
      </div>
    </li>
  );
}

function AvisoForm({
  inicial,
  onSubmit,
  onCancel,
}: {
  inicial: NotifManual | null;
  onSubmit: (d: Omit<NotifManual, "id" | "creada" | "creadaPor">, canales: string[]) => void;
  onCancel: () => void;
}) {
  const { miembros } = useEquipo();
  const equipo = [
    ...ROLES_FIJOS,
    ...miembros
      .filter((m) => m.status !== "inactivo")
      .map((m) => `${m.firstName} ${m.lastName}`.trim()),
  ];
  const [titulo, setTitulo] = useState(inicial?.titulo ?? "");
  const [detalle, setDetalle] = useState(inicial?.detalle ?? "");
  const [categoria, setCategoria] = useState<CategoriaNotif>(
    inicial?.categoria ?? "Administración",
  );
  const [prioridad, setPrioridad] = useState<PrioridadNotif>(inicial?.prioridad ?? "Normal");
  const [asignado, setAsignado] = useState(inicial?.asignado ?? "");
  const [vence, setVence] = useState(inicial?.vence ?? hoyISO());
  const [horaVence, setHoraVence] = useState(inicial?.horaVence ?? "");
  const [email, setEmail] = useState(false);
  const [whatsapp, setWhatsapp] = useState(false);
  const [error, setError] = useState("");

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        if (!titulo.trim()) return setError("Escribí un título.");
        if (!inicial && vence && vence < hoyISO())
          return setError("La fecha de vencimiento no puede ser pasada.");
        onSubmit(
          {
            titulo: titulo.trim(),
            detalle: detalle.trim(),
            categoria,
            prioridad,
            asignado,
            vence,
            horaVence,
          },
          [email ? "correo" : "", whatsapp ? "WhatsApp" : ""].filter(Boolean),
        );
      }}
      className="space-y-3"
    >
      <Field label="Título *">
        <input
          autoFocus
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className={INPUT}
          placeholder="Ej: Llamar al proveedor de resinas"
        />
      </Field>
      <Field label="Detalle">
        <textarea
          rows={3}
          value={detalle}
          onChange={(e) => setDetalle(e.target.value)}
          className="w-full resize-y rounded-xl border border-primary/12 bg-white px-3 py-2 text-sm outline-none focus:border-primary/45 focus:ring-4 focus:ring-primary/10"
          placeholder="Qué hay que hacer y cualquier dato útil…"
        />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Área">
          <Select
            value={categoria}
            onChange={setCategoria}
            opciones={CATEGORIAS_NOTIF.map((c) => ({ value: c, label: c }))}
          />
        </Field>
        <Field label="Asignar a">
          <Select
            value={asignado}
            onChange={setAsignado}
            opciones={[
              { value: "", label: "Sin asignar" },
              ...equipo.map((n) => ({ value: n, label: n })),
            ]}
          />
        </Field>
        <Field label="Vence el">
          <input
            type="date"
            value={vence}
            onChange={(e) => setVence(e.target.value)}
            className={INPUT}
          />
        </Field>
        <Field label="Hora">
          <input
            type="time"
            value={horaVence}
            onChange={(e) => setHoraVence(e.target.value)}
            className={INPUT}
          />
        </Field>
      </div>
      <Field label="Prioridad">
        <div className="grid grid-cols-4 gap-1.5">
          {PRIORIDADES_NOTIF.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPrioridad(p)}
              aria-pressed={prioridad === p}
              className={`rounded-xl border py-1.5 text-xs font-semibold transition-colors ${
                prioridad === p
                  ? `${PRIORIDAD_ESTILO[p].chip} border-current`
                  : "border-border bg-white text-muted-foreground"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </Field>
      {!inicial && (
        <div className="flex flex-wrap gap-4 rounded-xl bg-primary/[0.04] px-3 py-2 text-xs">
          <span className="font-semibold text-muted-foreground">Avisar también por:</span>
          <label className="inline-flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={email}
              onChange={(e) => setEmail(e.target.checked)}
              className="accent-[var(--color-primary)]"
            />
            <Mail className="size-3.5" /> Correo
          </label>
          <label className="inline-flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={whatsapp}
              onChange={(e) => setWhatsapp(e.target.checked)}
              className="accent-[var(--color-primary)]"
            />
            <MessageCircle className="size-3.5" /> WhatsApp
          </label>
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className={BTN_SECUNDARIO}>
          Cancelar
        </button>
        <button type="submit" className={BTN_PRIMARIO}>
          <Check className="size-4" />
          {inicial ? "Guardar cambios" : "Crear aviso"}
        </button>
      </div>
    </form>
  );
}

/* ───────────── Pospuestas ───────────── */

function Pospuestas({
  pospuestas,
  usuario,
  onToast,
}: {
  pospuestas: Notif[];
  usuario: string;
  onToast: (m: string) => void;
}) {
  const lista = [...pospuestas].sort((a, b) =>
    (a.estado.pospuestaHasta ?? "").localeCompare(b.estado.pospuestaHasta ?? ""),
  );
  return (
    <div className="space-y-3">
      <EncabezadoSeccion
        icon={AlarmClock}
        titulo="Pospuestas"
        descripcion="Avisos que dejaste para más tarde. Vuelven solos a la bandeja a la hora elegida."
      />
      {lista.length === 0 ? (
        <Vacio
          icon={AlarmClock}
          titulo="No hay avisos pospuestos"
          texto="Usá el reloj de cada aviso para dejarlo para más tarde."
        />
      ) : (
        <ul className="space-y-2">
          {lista.map((n) => (
            <TarjetaNotif
              key={n.id}
              n={n}
              usuario={usuario}
              onToast={onToast}
              onEditar={() => {}}
              pospuesta
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/* ───────────── Preferencias ───────────── */

function PreferenciasSec({ onToast }: { onToast: (m: string) => void }) {
  const { preferencias } = storeNotificaciones.usar();
  const { tiene } = useNotificaciones();
  const setPref = (fn: (p: typeof preferencias) => typeof preferencias) =>
    setNotificaciones("preferencias", fn);
  const setCat = (c: CategoriaNotif, cambio: Partial<PreferenciaCategoria>) =>
    setPref((p) => ({
      ...p,
      categorias: { ...p.categorias, [c]: { ...p.categorias[c], ...cambio } },
    }));

  const DESCRIPCION: Record<CategoriaNotif, string> = {
    Agenda: "Turnos sin confirmar, ausencias, lista de espera y tareas.",
    Pacientes: "Cumpleaños y seguimientos.",
    Comunicación: "Mensajes de pacientes sin leer.",
    Laboratorio: "Trabajos demorados o listos para retirar.",
    Insumos: "Stock por debajo del mínimo.",
    Administración: "Presupuestos sin respuesta, pagos y trámites.",
    Equipo: "Invitaciones pendientes y avisos internos.",
  };
  const MODULO: Partial<Record<CategoriaNotif, string>> = {
    Comunicación: "comunicaciones",
    Laboratorio: "laboratorio",
    Insumos: "inventario",
  };

  return (
    <div className="space-y-3">
      <EncabezadoSeccion
        icon={Settings2}
        titulo="Preferencias de aviso"
        descripcion="Elegí qué alertas querés recibir y por dónde."
      >
        <button
          className={BTN_SECUNDARIO}
          onClick={() => {
            if (preferencias.sonido) pitido();
            onToast("🔔 Así se ve (y suena) una notificación de prueba");
          }}
        >
          <BellRing className="size-4" />
          Probar notificación
        </button>
      </EncabezadoSeccion>

      <div className="card-grad overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-primary/[0.04] text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Área</th>
                <th className="px-3 py-2.5 text-center font-semibold">Activa</th>
                <th className="px-3 py-2.5 text-center font-semibold">En la app</th>
                <th className="px-3 py-2.5 text-center font-semibold">Correo</th>
                <th className="px-3 py-2.5 text-center font-semibold">WhatsApp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/[0.07]">
              {CATEGORIAS_NOTIF.map((c) => {
                const pref = preferencias.categorias[c];
                const Icon = CATEGORIA_ESTILO[c].icon;
                const modulo = MODULO[c];
                const fueraDelPlan = !!modulo && !tiene(modulo);
                return (
                  <tr key={c} className={fueraDelPlan ? "opacity-50" : ""}>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`grid size-8 place-items-center rounded-full bg-gradient-to-br ${CATEGORIA_ESTILO[c].color}`}
                        >
                          <Icon className="size-4" />
                        </span>
                        <div>
                          <p className="font-semibold">{c}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {fueraDelPlan ? "No incluido en tu plan" : DESCRIPCION[c]}
                          </p>
                        </div>
                      </div>
                    </td>
                    {(["activa", "app", "email", "whatsapp"] as const).map((k) => (
                      <td key={k} className="px-3 py-2 text-center">
                        <span className="inline-flex">
                          <Interruptor
                            etiqueta={`${c}: ${k}`}
                            activo={pref[k] && (k === "activa" || pref.activa)}
                            onChange={(v) => {
                              if (fueraDelPlan)
                                return onToast("Esta área no está incluida en tu plan");
                              if (k !== "activa" && !pref.activa)
                                return onToast(`Primero activá las alertas de ${c}`);
                              setCat(c, { [k]: v });
                            }}
                          />
                        </span>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="card-grad space-y-3 p-4">
          <p className="flex items-center justify-between gap-2 text-sm font-semibold">
            <span className="flex items-center gap-2">
              <Mail className="size-4 text-primary" /> Resumen diario por correo
            </span>
            <Interruptor
              etiqueta="Resumen diario"
              activo={preferencias.resumenDiario.activo}
              onChange={(v) =>
                setPref((p) => ({ ...p, resumenDiario: { ...p.resumenDiario, activo: v } }))
              }
            />
          </p>
          <p className="text-xs text-muted-foreground">
            Una vez por día, con todo lo pendiente ordenado por prioridad.
          </p>
          <Field label="Hora de envío">
            <input
              type="time"
              value={preferencias.resumenDiario.hora}
              disabled={!preferencias.resumenDiario.activo}
              onChange={(e) =>
                setPref((p) => ({
                  ...p,
                  resumenDiario: { ...p.resumenDiario, hora: e.target.value },
                }))
              }
              className={INPUT}
            />
          </Field>
        </div>
        <div className="card-grad space-y-3 p-4">
          <p className="flex items-center justify-between gap-2 text-sm font-semibold">
            <span className="flex items-center gap-2">
              <Moon className="size-4 text-primary" /> No molestar
            </span>
            <Interruptor
              etiqueta="No molestar"
              activo={preferencias.noMolestar.activo}
              onChange={(v) =>
                setPref((p) => ({ ...p, noMolestar: { ...p.noMolestar, activo: v } }))
              }
            />
          </p>
          <p className="text-xs text-muted-foreground">
            En este horario no llegan avisos por correo ni WhatsApp (salvo urgentes).
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Desde">
              <input
                type="time"
                value={preferencias.noMolestar.desde}
                disabled={!preferencias.noMolestar.activo}
                onChange={(e) =>
                  setPref((p) => ({ ...p, noMolestar: { ...p.noMolestar, desde: e.target.value } }))
                }
                className={INPUT}
              />
            </Field>
            <Field label="Hasta">
              <input
                type="time"
                value={preferencias.noMolestar.hasta}
                disabled={!preferencias.noMolestar.activo}
                onChange={(e) =>
                  setPref((p) => ({ ...p, noMolestar: { ...p.noMolestar, hasta: e.target.value } }))
                }
                className={INPUT}
              />
            </Field>
          </div>
        </div>
        <div className="card-grad space-y-3 p-4">
          <p className="flex items-center justify-between gap-2 text-sm font-semibold">
            <span className="flex items-center gap-2">
              <Volume2 className="size-4 text-primary" /> Sonido
            </span>
            <Interruptor
              etiqueta="Sonido"
              activo={preferencias.sonido}
              onChange={(v) => setPref((p) => ({ ...p, sonido: v }))}
            />
          </p>
          <p className="text-xs text-muted-foreground">
            Un aviso sonoro corto cuando llega una notificación urgente.
          </p>
          <button
            className={`${BTN_SECUNDARIO} w-full`}
            onClick={() => {
              pitido();
              onToast("Sonido de prueba");
            }}
            disabled={!preferencias.sonido}
          >
            <Volume2 className="size-3.5" />
            Escuchar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Historial ───────────── */

function Historial({ onToast }: { onToast: (m: string) => void }) {
  const { historial } = storeNotificaciones.usar();
  const [busqueda, setBusqueda] = useState("");
  const [accion, setAccion] = useState("");
  const [limite, setLimite] = useState(20);
  const texto = normalizarBusqueda(busqueda);
  const acciones = [...new Set(historial.map((h) => h.accion.split(" (")[0] ?? h.accion))];
  const lista = historial.filter(
    (h) =>
      (!accion || h.accion.startsWith(accion)) &&
      (!texto || normalizarBusqueda(`${h.titulo} ${h.usuario}`).includes(texto)),
  );

  const exportar = () => {
    const filas = [
      ["Fecha", "Hora", "Usuario", "Acción", "Aviso"],
      ...lista.map((h) => [
        formatearFecha(h.fecha.slice(0, 10)),
        new Date(h.fecha).toTimeString().slice(0, 5),
        h.usuario,
        h.accion,
        h.titulo,
      ]),
    ];
    const csv = filas.map((f) => f.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `historial-notificaciones-${hoyISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onToast(`${lista.length} movimientos exportados`);
  };

  const ICONO: Record<string, LucideIcon> = {
    Creó: Plus,
    Completó: Check,
    Pospuso: AlarmClock,
    Eliminó: Trash2,
    Descartó: EyeOff,
    Editó: Pencil,
    Reabrió: Bell,
    Reactivó: Bell,
  };

  return (
    <div className="space-y-3">
      <EncabezadoSeccion
        icon={History}
        titulo="Historial"
        descripcion="Quién creó, completó, pospuso o descartó cada aviso, y cuándo."
      >
        <button className={BTN_SECUNDARIO} onClick={exportar}>
          <Download className="size-4" />
          Exportar
        </button>
      </EncabezadoSeccion>
      <div className="card-grad flex flex-wrap items-center gap-2 p-2">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-primary/60" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar aviso o usuario"
            className={`${INPUT} h-8 pl-8`}
          />
        </div>
        <Select
          etiqueta="Acción"
          className="w-48"
          value={accion}
          onChange={setAccion}
          opciones={[
            { value: "", label: "Todas las acciones" },
            ...acciones.map((a) => ({ value: a, label: a })),
          ]}
        />
      </div>
      {lista.length === 0 ? (
        <Vacio
          icon={History}
          titulo="Sin movimientos"
          texto="Acá vas a ver cada acción sobre los avisos."
        />
      ) : (
        <div className="card-grad p-4">
          <ol className="relative space-y-3 border-l-2 border-primary/15 pl-5">
            {lista.slice(0, limite).map((h) => {
              const Icon = ICONO[h.accion.split(" (")[0] ?? ""] ?? Bell;
              return (
                <li key={h.id} className="relative">
                  <span className="absolute -left-[31px] top-0 grid size-6 place-items-center rounded-full bg-white text-primary ring-2 ring-primary/20">
                    <Icon className="size-3" />
                  </span>
                  <p className="text-sm">
                    <b className="font-semibold">{h.usuario}</b>{" "}
                    <span className="text-muted-foreground">{h.accion.toLowerCase()}</span>{" "}
                    <span className="font-medium">“{h.titulo}”</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatearFecha(h.fecha.slice(0, 10))} ·{" "}
                    {new Date(h.fecha).toTimeString().slice(0, 5)} · {hace(h.fecha)}
                  </p>
                </li>
              );
            })}
          </ol>
          {lista.length > limite && (
            <button
              className="mt-3 text-xs font-semibold text-primary hover:underline"
              onClick={() => setLimite((l) => l + 20)}
            >
              Ver más ({lista.length - limite})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
