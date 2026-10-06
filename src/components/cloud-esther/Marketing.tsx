import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  BadgePercent,
  CalendarPlus,
  Check,
  ChevronDown,
  CircleDollarSign,
  Code2,
  Copy,
  Download,
  Gift,
  Globe,
  Heart,
  Megaphone,
  MessageCircle,
  MousePointerClick,
  Pause,
  Pencil,
  Phone,
  Play,
  Plus,
  Search,
  Send,
  Sparkles,
  Star,
  Target,
  Trash2,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  CANALES_ADS,
  ETAPAS,
  FUENTES,
  resultadosCampania,
  setMarketing,
  storeMarketing,
  type ActividadLead,
  type CampaniaAds,
  type Etapa,
  type Fuente,
  type Lead,
  type Promocion,
  type Resena,
} from "@/lib/cloud-esther/marketing-store";
import { usePacientes } from "@/lib/cloud-esther/pacientes";
import { useEquipo } from "@/lib/cloud-esther/equipo-store";
import { TRATAMIENTOS, setTurnosStore, storeAgenda } from "@/lib/cloud-esther/agenda-store";
import { useSesion } from "@/lib/cloud-esther/auth-store";
import { capitalizarNombre, normalizarBusqueda } from "@/lib/utils";
import { IconoWhatsApp } from "@/components/cloud-esther/IconoWhatsApp";

/* Ubicación: src/components/cloud-esther/Marketing.tsx

   Marketing y captación (plan Avanzada+): de dónde llegan los pacientes nuevos, cuánto cuesta
   cada uno y cuánto vuelve. CRM de leads por etapas (agendar turno y convertir en paciente
   escriben en Agenda y Pacientes), campañas de publicidad con métricas, cupones, referidos,
   reseñas y el formulario web. Todo separado por empresa. */

type Seccion =
  "resumen" | "leads" | "campanias" | "promos" | "referidos" | "resenas" | "formulario";

const SECCIONES: { id: Seccion; label: string; icon: LucideIcon }[] = [
  { id: "resumen", label: "Resumen", icon: TrendingUp },
  { id: "leads", label: "Leads", icon: Users },
  { id: "campanias", label: "Campañas", icon: Megaphone },
  { id: "promos", label: "Promociones", icon: BadgePercent },
  { id: "referidos", label: "Referidos", icon: Gift },
  { id: "resenas", label: "Reseñas", icon: Star },
  { id: "formulario", label: "Formulario web", icon: Globe },
];

const ETAPA_ESTILO: Record<Etapa, { chip: string; barra: string }> = {
  Nuevo: { chip: "bg-sky-100 text-sky-700", barra: "from-sky-400 to-sky-500" },
  Contactado: { chip: "bg-amber-100 text-amber-700", barra: "from-amber-400 to-amber-500" },
  "Turno agendado": { chip: "bg-primary/10 text-primary", barra: "from-primary to-violet-500" },
  Convertido: { chip: "bg-emerald-100 text-emerald-700", barra: "from-emerald-400 to-emerald-500" },
  Perdido: { chip: "bg-muted text-muted-foreground", barra: "from-slate-300 to-slate-400" },
};

const FUENTE_COLOR: Record<Fuente, string> = {
  Instagram: "from-fuchsia-500 to-pink-500",
  Facebook: "from-blue-500 to-blue-600",
  Google: "from-amber-400 to-red-500",
  WhatsApp: "from-emerald-400 to-emerald-600",
  "Sitio web": "from-primary to-violet-500",
  Referido: "from-violet-400 to-fuchsia-500",
  Doctoralia: "from-teal-400 to-cyan-500",
  Presencial: "from-slate-400 to-slate-500",
};

const MOTIVOS_PERDIDA = [
  "Precio",
  "Eligió otra clínica",
  "No respondió",
  "Sin cobertura",
  "Distancia",
  "Otro",
];

/* ───────────── Utilidades ───────────── */

function hoyISO(masDias = 0) {
  const d = new Date();
  d.setDate(d.getDate() + masDias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function formatearFecha(iso: string) {
  return iso ? iso.slice(0, 10).split("-").reverse().join("/") : "";
}
function ars(n: number) {
  return `$ ${Math.round(n).toLocaleString("es-AR")}`;
}
function hace(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 60) return `hace ${Math.max(1, min)} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}
function iniciales(n: string) {
  return n
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
function wa(tel: string, texto: string) {
  return `https://wa.me/${tel.replace(/[^\d]/g, "")}?text=${encodeURIComponent(texto)}`;
}

/* ───────────── Piezas ───────────── */

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
function Sel<T extends string>({
  value,
  onChange,
  opciones,
  etiqueta,
}: {
  value: T;
  onChange: (v: T) => void;
  opciones: readonly (T | { value: T; label: string })[];
  etiqueta?: string;
}) {
  return (
    <div className="relative">
      <select
        aria-label={etiqueta}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={`${INPUT} appearance-none pr-8`}
      >
        {opciones.map((o) =>
          typeof o === "string" ? (
            <option key={o} value={o}>
              {o}
            </option>
          ) : (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ),
        )}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
function Modal({
  titulo,
  onClose,
  children,
  ancho = "max-w-xl",
}: {
  titulo: string;
  onClose: () => void;
  children: ReactNode;
  ancho?: string;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-3xl border border-border bg-card p-5 shadow-2xl ${ancho}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              Marketing
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
function Acciones({
  etiqueta,
  onCancel,
  icon: Icon = Check,
}: {
  etiqueta: string;
  onCancel: () => void;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex justify-end gap-2 pt-1">
      <button type="button" className={BTN_SECUNDARIO} onClick={onCancel}>
        Cancelar
      </button>
      <button type="submit" className={BTN_PRIMARIO}>
        <Icon className="size-4" />
        {etiqueta}
      </button>
    </div>
  );
}
function Mini({
  label,
  valor,
  icon: Icon,
  tono = "text-foreground",
}: {
  label: string;
  valor: string;
  icon: LucideIcon;
  tono?: string;
}) {
  return (
    <div className="card-grad flex items-start justify-between p-3.5">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
        <p className={`mt-1 truncate text-xl font-bold ${tono}`}>{valor}</p>
      </div>
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
    </div>
  );
}
function Encabezado({
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

/* ───────────── Página ───────────── */

type Ctx = {
  onToast: (m: string) => void;
  usuario: string;
  abrirLead: (id: string) => void;
  ir: (s: Seccion) => void;
};

export default function Marketing() {
  const { usuario: u } = useSesion();
  const { leads, campanias, resenas } = storeMarketing.usar();
  const [montado, setMontado] = useState(false);
  const [seccion, setSeccion] = useState<Seccion>("resumen");
  const [leadAbierto, setLeadAbierto] = useState<string | null>(null);
  const [nuevoLead, setNuevoLead] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  useEffect(() => setMontado(true), []);

  const onToast = (m: string) => {
    setToast(m);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 2800);
  };
  const ctx: Ctx = {
    onToast,
    usuario: u?.nombre ?? "Recepción",
    abrirLead: setLeadAbierto,
    ir: setSeccion,
  };

  const hace30 = Date.now() - 30 * 86_400_000;
  const delMes = leads.filter((l) => new Date(l.creado).getTime() >= hace30);
  const convertidos = delMes.filter((l) => l.etapa === "Convertido");
  const inversion = campanias.reduce((a, c) => a + c.gastado, 0);
  const ingresos = leads
    .filter((l) => l.etapa === "Convertido" && l.campaniaId)
    .reduce((a, l) => a + l.valor, 0);
  const promedio = resenas.length
    ? resenas.reduce((a, r) => a + r.estrellas, 0) / resenas.length
    : 0;
  const nuevos = leads.filter((l) => l.etapa === "Nuevo").length;

  return (
    <div className="relative min-h-full overflow-clip bg-[#faf9ff]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_5%,rgba(124,58,237,0.15),transparent_28%),radial-gradient(circle_at_92%_12%,rgba(236,72,153,0.10),transparent_27%),linear-gradient(135deg,#f8f6ff_0%,#f3effd_48%,#faf8ff_100%)]"
      />
      <div className="relative mx-auto w-full max-w-[1420px] px-4 py-6 md:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[30px] border border-primary/15 bg-gradient-to-br from-white via-white/96 to-primary/[0.045] shadow-[0_20px_55px_-38px_rgba(76,29,149,0.55)]">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary/55 via-primary to-pink-400/60" />
          <div className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-primary/[0.055] blur-2xl" />
          <div className="relative p-5 md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-primary/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                    <Megaphone className="size-3.5" />
                    Crecimiento
                  </span>
                  {montado && nuevos > 0 && (
                    <span className="rounded-full border border-amber-200/70 bg-amber-50/80 px-3 py-1.5 text-[11px] font-bold text-amber-700">
                      {nuevos} leads nuevos sin contactar
                    </span>
                  )}
                </div>
                <h1 className="mt-4 text-[34px] font-bold tracking-[-0.035em] md:text-[42px]">
                  Marketing y captación
                </h1>
                <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-foreground md:text-sm">
                  De dónde llegan tus pacientes nuevos, cuánto cuesta cada uno y cuánto vuelve:
                  leads, campañas, cupones, referidos y reseñas en un solo lugar.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button className={BTN_SECUNDARIO} onClick={() => setSeccion("campanias")}>
                  <Megaphone className="size-4" />
                  Campañas
                </button>
                <button className={BTN_PRIMARIO} onClick={() => setNuevoLead(true)}>
                  <UserPlus className="size-4" />
                  Nuevo lead
                </button>
              </div>
            </div>
            {montado && (
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    l: "Leads (30 días)",
                    v: String(delMes.length),
                    t: `${convertidos.length} convertidos`,
                    d: `${delMes.length ? Math.round((convertidos.length / delMes.length) * 100) : 0}% de conversión`,
                    i: Users,
                  },
                  {
                    l: "Costo por lead",
                    v: ars(
                      leads.filter((l) => l.campaniaId).length
                        ? inversion / leads.filter((l) => l.campaniaId).length
                        : 0,
                    ),
                    t: ars(inversion),
                    d: "invertido en campañas",
                    i: CircleDollarSign,
                  },
                  {
                    l: "Retorno de campañas",
                    v: `${inversion ? Math.round(((ingresos - inversion) / inversion) * 100) : 0}%`,
                    t: ars(ingresos),
                    d: "en tratamientos vendidos",
                    i: TrendingUp,
                  },
                  {
                    l: "Reputación",
                    v: promedio ? `${promedio.toFixed(1)} ★` : "—",
                    t: `${resenas.length} reseñas`,
                    d: `${resenas.filter((r) => !r.respuesta).length} sin responder`,
                    i: Star,
                  },
                ].map((c) => (
                  <div
                    key={c.l}
                    className="group relative min-h-[112px] overflow-hidden rounded-[22px] border border-primary/25 bg-gradient-to-br from-white via-white to-primary/[0.065] p-4 shadow-[0_12px_28px_-20px_rgba(124,58,237,0.48)] transition-all hover:-translate-y-0.5 hover:border-primary/45"
                  >
                    <div className="pointer-events-none absolute -right-7 -top-9 size-[100px] rounded-full bg-primary/[0.035] ring-[13px] ring-primary/[0.035]" />
                    <div className="relative flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-primary/75">
                          {c.l}
                        </p>
                        <p className="mt-2 text-[27px] font-bold leading-none tracking-tight text-primary">
                          {c.v}
                        </p>
                        <p className="mt-2 text-[11px]">
                          <span className="font-semibold text-primary">{c.t}</span>{" "}
                          <span className="text-muted-foreground">{c.d}</span>
                        </p>
                      </div>
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/[0.08] text-primary">
                        <c.i className="size-4" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <nav
              className="mt-4 flex flex-wrap gap-1.5 rounded-2xl border border-primary/10 bg-primary/[0.025] p-1.5"
              aria-label="Secciones de marketing"
            >
              {SECCIONES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSeccion(s.id)}
                  aria-pressed={seccion === s.id}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                    seccion === s.id
                      ? "bg-primary text-primary-foreground shadow-[0_8px_18px_-10px_rgba(124,58,237,0.8)]"
                      : "text-muted-foreground hover:bg-card hover:text-foreground"
                  }`}
                >
                  <s.icon className="size-3.5" />
                  {s.label}
                </button>
              ))}
            </nav>
          </div>
        </section>

        <div className="mt-5">
          {!montado ? (
            <div className="card-grad h-[480px] animate-pulse" />
          ) : seccion === "resumen" ? (
            <Resumen ctx={ctx} />
          ) : seccion === "leads" ? (
            <Leads ctx={ctx} onNuevo={() => setNuevoLead(true)} />
          ) : seccion === "campanias" ? (
            <Campanias ctx={ctx} />
          ) : seccion === "promos" ? (
            <Promos ctx={ctx} />
          ) : seccion === "referidos" ? (
            <Referidos ctx={ctx} />
          ) : seccion === "resenas" ? (
            <Resenas ctx={ctx} />
          ) : (
            <Formulario ctx={ctx} />
          )}
        </div>
      </div>

      {nuevoLead && (
        <Modal titulo="Nuevo lead" onClose={() => setNuevoLead(false)}>
          <LeadForm
            onCancel={() => setNuevoLead(false)}
            onSubmit={(l) => {
              setMarketing("leads", (prev) => [
                {
                  ...l,
                  id: `l-${Date.now()}`,
                  creado: new Date().toISOString(),
                  etapa: "Nuevo",
                  motivoPerdida: "",
                  actividad: [
                    nuevaActividad("Nota", `Lead cargado a mano (${l.fuente})`, ctx.usuario),
                  ],
                },
                ...prev,
              ]);
              setNuevoLead(false);
              setSeccion("leads");
              onToast(`Lead ${l.nombre} agregado`);
            }}
          />
        </Modal>
      )}
      {leadAbierto && (
        <DetalleLead id={leadAbierto} ctx={ctx} onClose={() => setLeadAbierto(null)} />
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
  );
}

function nuevaActividad(tipo: ActividadLead["tipo"], texto: string, autor: string): ActividadLead {
  return {
    id: `${Date.now()}-${Math.random()}`,
    fecha: new Date().toISOString(),
    tipo,
    texto,
    autor,
  };
}

function moverLead(id: string, etapa: Etapa, autor: string, extra: Partial<Lead> = {}) {
  setMarketing("leads", (prev) =>
    prev.map((l) =>
      l.id === id
        ? {
            ...l,
            ...extra,
            etapa,
            actividad: [nuevaActividad("Etapa", `Pasó a ${etapa}`, autor), ...l.actividad],
          }
        : l,
    ),
  );
}

/* ───────────── Resumen ───────────── */

function Resumen({ ctx }: { ctx: Ctx }) {
  const { leads, campanias, promos } = storeMarketing.usar();
  const total = leads.length || 1;
  const embudo: { l: string; n: number }[] = [
    { l: "Leads", n: leads.length },
    {
      l: "Contactados",
      n:
        leads.filter((l) => l.etapa !== "Nuevo" && l.etapa !== "Perdido").length +
        leads.filter((l) => l.etapa === "Perdido" && l.actividad.length > 0).length,
    },
    {
      l: "Turno agendado",
      n: leads.filter((l) => l.etapa === "Turno agendado" || l.etapa === "Convertido").length,
    },
    { l: "Pacientes", n: leads.filter((l) => l.etapa === "Convertido").length },
  ];
  const porFuente = FUENTES.map((f) => ({
    f,
    n: leads.filter((l) => l.fuente === f).length,
    c: leads.filter((l) => l.fuente === f && l.etapa === "Convertido").length,
  }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  const maxFuente = Math.max(1, ...porFuente.map((x) => x.n));
  const hoy = hoyISO();
  const seguimientos = leads.filter(
    (l) =>
      l.seguimiento && l.seguimiento <= hoy && l.etapa !== "Convertido" && l.etapa !== "Perdido",
  );
  const sinContactar = leads.filter((l) => l.etapa === "Nuevo");
  const activas = campanias.filter((c) => c.estado === "Activa");

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        <div className="card-grad p-4">
          <p className="text-sm font-semibold">Embudo de captación</p>
          <p className="text-xs text-muted-foreground">
            Cuántos leads avanzan en cada etapa hasta convertirse en pacientes.
          </p>
          <div className="mt-4 space-y-2.5">
            {embudo.map((e, i) => {
              const pct = Math.round((e.n / total) * 100);
              const prev = embudo[i - 1];
              return (
                <div key={e.l} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-xs font-medium">{e.l}</span>
                  <div className="h-9 flex-1 overflow-hidden rounded-xl bg-primary/[0.06]">
                    <div
                      className="flex h-full items-center rounded-xl bg-gradient-to-r from-primary to-fuchsia-500 px-3 text-xs font-bold text-white transition-all"
                      style={{ width: `${Math.max(pct, 8)}%` }}
                    >
                      {e.n}
                    </div>
                  </div>
                  <span className="w-24 shrink-0 text-right text-[11px] text-muted-foreground">
                    {prev && prev.n ? `${Math.round((e.n / prev.n) * 100)}% avanza` : `${pct}%`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="card-grad p-4">
            <p className="text-sm font-semibold">De dónde llegan</p>
            <ul className="mt-3 space-y-2.5">
              {porFuente.map((x) => (
                <li key={x.f}>
                  <p className="flex justify-between text-xs">
                    <span className="font-medium">{x.f}</span>
                    <span className="text-muted-foreground">
                      {x.n} leads · <b className="text-emerald-600">{x.c} pacientes</b>
                    </span>
                  </p>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-primary/[0.07]">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${FUENTE_COLOR[x.f]}`}
                      style={{ width: `${(x.n / maxFuente) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="card-grad p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Campañas activas</p>
              <button
                className="text-xs font-semibold text-primary hover:underline"
                onClick={() => ctx.ir("campanias")}
              >
                Ver todas
              </button>
            </div>
            <ul className="mt-3 space-y-2">
              {activas.length === 0 && (
                <li className="text-xs text-muted-foreground">No hay campañas activas.</li>
              )}
              {activas.map((c) => {
                const r = resultadosCampania(c, leads);
                return (
                  <li key={c.id} className="rounded-xl border border-primary/10 bg-white/80 p-2.5">
                    <p className="flex items-center justify-between gap-2 text-xs font-semibold">
                      {c.nombre}
                      <Pill clase="bg-primary/10 text-primary">{c.canal}</Pill>
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {r.leads} leads · CPL {ars(r.cpl)} · ROI{" "}
                      <b className={r.roi >= 0 ? "text-emerald-600" : "text-destructive"}>
                        {r.roi}%
                      </b>
                    </p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-primary/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-fuchsia-500"
                        style={{
                          width: `${Math.min(100, (c.gastado / Math.max(1, c.presupuesto)) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {ars(c.gastado)} de {ars(c.presupuesto)}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card-grad p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Target className="size-4 text-primary" /> Para hacer hoy
          </p>
          <ul className="mt-3 space-y-2">
            {sinContactar.length === 0 && seguimientos.length === 0 && (
              <li className="text-xs text-muted-foreground">¡Todo al día!</li>
            )}
            {sinContactar.slice(0, 4).map((l) => (
              <li key={l.id}>
                <button
                  onClick={() => ctx.abrirLead(l.id)}
                  className="flex w-full items-center gap-2.5 rounded-xl bg-white/80 p-2.5 text-left ring-1 ring-primary/10 hover:ring-primary/30"
                >
                  <span className="grid size-8 place-items-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                    {iniciales(l.nombre)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold">
                      Contactar a {l.nombre}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {l.interes} · {l.fuente} · {hace(l.creado)}
                    </span>
                  </span>
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                </button>
              </li>
            ))}
            {seguimientos.map((l) => (
              <li key={`s-${l.id}`}>
                <button
                  onClick={() => ctx.abrirLead(l.id)}
                  className="flex w-full items-center gap-2.5 rounded-xl bg-white/80 p-2.5 text-left ring-1 ring-amber-200 hover:ring-amber-300"
                >
                  <span className="grid size-8 place-items-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                    {iniciales(l.nombre)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold">
                      Seguimiento: {l.nombre}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {l.etapa} · {l.interes}
                    </span>
                  </span>
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="card-grad p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <BadgePercent className="size-4 text-primary" /> Cupones más usados
          </p>
          <ul className="mt-3 space-y-2">
            {[...promos]
              .sort((a, b) => b.usos - a.usos)
              .slice(0, 3)
              .map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-xs ring-1 ring-primary/10"
                >
                  <span>
                    <b className="font-mono">{p.codigo}</b> · {p.titulo}
                  </span>
                  <span className="font-semibold text-primary">{p.usos} usos</span>
                </li>
              ))}
          </ul>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-fuchsia-600 p-4 text-white shadow-lg">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4" /> Sugerencia
          </p>
          <p className="mt-1 text-xs text-white/85">
            {porFuente[0]
              ? `${porFuente[0].f} es tu mejor fuente de leads. Considerá subir el presupuesto de las campañas en ese canal y responder en menos de 1 hora: la conversión sube hasta 3 veces.`
              : "Cargá tus primeros leads para ver recomendaciones."}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Leads (CRM) ───────────── */

function Leads({ ctx, onNuevo }: { ctx: Ctx; onNuevo: () => void }) {
  const { leads } = storeMarketing.usar();
  const [busqueda, setBusqueda] = useState("");
  const [fuente, setFuente] = useState<"" | Fuente>("");
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [perder, setPerder] = useState<Lead | null>(null);
  const texto = normalizarBusqueda(busqueda);
  const lista = leads.filter(
    (l) =>
      (!fuente || l.fuente === fuente) &&
      (!texto || normalizarBusqueda(`${l.nombre} ${l.telefono} ${l.interes}`).includes(texto)),
  );

  const mover = (l: Lead, etapa: Etapa) => {
    if (etapa === l.etapa) return;
    if (etapa === "Perdido") return setPerder(l);
    moverLead(l.id, etapa, ctx.usuario);
    ctx.onToast(`${l.nombre} → ${etapa}`);
  };

  const exportar = () => {
    const filas = [
      ["Nombre", "Teléfono", "Correo", "Fuente", "Interés", "Valor", "Etapa", "Creado"],
      ...lista.map((l) => [
        l.nombre,
        l.telefono,
        l.email,
        l.fuente,
        l.interes,
        String(l.valor),
        l.etapa,
        formatearFecha(l.creado),
      ]),
    ];
    const csv = filas.map((f) => f.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${hoyISO()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    ctx.onToast(`${lista.length} leads exportados`);
  };

  return (
    <div className="space-y-3">
      <Encabezado
        icon={Users}
        titulo="Leads"
        descripcion="Personas interesadas. Arrastrá las tarjetas entre etapas o usá las flechas."
      >
        <button className={BTN_SECUNDARIO} onClick={exportar}>
          <Download className="size-4" />
          Exportar
        </button>
        <button className={BTN_PRIMARIO} onClick={onNuevo}>
          <UserPlus className="size-4" />
          Nuevo lead
        </button>
      </Encabezado>
      <div className="card-grad flex flex-wrap items-center gap-2 p-2.5">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-primary/60" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, teléfono o interés"
            className={`${INPUT} h-8 pl-8`}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {(["", ...FUENTES] as const).map((f) => (
            <button
              key={f || "todas"}
              onClick={() => setFuente(f)}
              aria-pressed={fuente === f}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${fuente === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-primary/10"}`}
            >
              {f || "Todas"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        {ETAPAS.map((etapa) => {
          const col = lista.filter((l) => l.etapa === etapa);
          const valor = col.reduce((a, l) => a + l.valor, 0);
          return (
            <div
              key={etapa}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                const l = leads.find((x) => x.id === arrastrando);
                if (l) mover(l, etapa);
                setArrastrando(null);
              }}
              className={`flex min-h-[320px] flex-col rounded-2xl border bg-gradient-to-b from-white/90 to-primary/[0.04] p-2 transition-colors ${arrastrando ? "border-dashed border-primary/40" : "border-primary/12"}`}
            >
              <div className="mb-2 flex items-center justify-between px-1.5 pt-1">
                <Pill clase={ETAPA_ESTILO[etapa].chip}>{etapa}</Pill>
                <span className="text-[11px] text-muted-foreground">
                  {col.length} · {ars(valor)}
                </span>
              </div>
              <ul className="flex-1 space-y-2">
                {col.map((l) => {
                  const i = ETAPAS.indexOf(etapa);
                  return (
                    <li
                      key={l.id}
                      draggable
                      onDragStart={() => setArrastrando(l.id)}
                      onDragEnd={() => setArrastrando(null)}
                      className="cursor-grab rounded-xl border border-primary/10 bg-white p-2.5 shadow-[0_6px_16px_-14px_rgba(124,58,237,0.6)] transition-all hover:-translate-y-0.5 hover:border-primary/30 active:cursor-grabbing"
                    >
                      <button
                        onClick={() => ctx.abrirLead(l.id)}
                        className="block w-full text-left"
                      >
                        <p className="flex items-center gap-1.5 text-xs font-semibold">
                          <span
                            className={`size-2 rounded-full bg-gradient-to-br ${FUENTE_COLOR[l.fuente]}`}
                          />
                          {l.nombre}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {l.interes} · {l.fuente}
                        </p>
                        <p className="mt-1 flex items-center justify-between text-[10.5px]">
                          <span className="font-semibold">{l.valor ? ars(l.valor) : "—"}</span>
                          <span className="text-muted-foreground">{hace(l.creado)}</span>
                        </p>
                        {l.etapa === "Perdido" && l.motivoPerdida && (
                          <p className="mt-1 text-[10.5px] text-muted-foreground">
                            Motivo: {l.motivoPerdida}
                          </p>
                        )}
                      </button>
                      <div className="mt-2 flex items-center justify-between border-t border-primary/[0.07] pt-1.5">
                        <button
                          className="grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary disabled:opacity-30"
                          disabled={i === 0}
                          aria-label="Etapa anterior"
                          onClick={() => mover(l, ETAPAS[i - 1] ?? etapa)}
                        >
                          <ArrowLeft className="size-3.5" />
                        </button>
                        {l.telefono && (
                          <a
                            href={wa(
                              l.telefono,
                              `Hola ${l.nombre.split(" ")[0]}, te escribimos de la clínica por tu consulta sobre ${l.interes.toLowerCase()}.`,
                            )}
                            target="_blank"
                            rel="noreferrer"
                            className="grid size-6 place-items-center rounded-full text-emerald-600 hover:bg-emerald-50"
                            aria-label="WhatsApp"
                          >
                            <MessageCircle className="size-3.5" />
                          </a>
                        )}
                        <button
                          className="grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary disabled:opacity-30"
                          disabled={i === ETAPAS.length - 1}
                          aria-label="Etapa siguiente"
                          onClick={() => mover(l, ETAPAS[i + 1] ?? etapa)}
                        >
                          <ArrowRight className="size-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
                {col.length === 0 && (
                  <li className="grid h-20 place-items-center rounded-xl border border-dashed border-primary/15 text-[11px] text-muted-foreground">
                    Soltá acá
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
      {perder && (
        <Modal
          titulo={`Marcar como perdido: ${perder.nombre}`}
          onClose={() => setPerder(null)}
          ancho="max-w-md"
        >
          <PerdidoForm
            onCancel={() => setPerder(null)}
            onSubmit={(motivo) => {
              moverLead(perder.id, "Perdido", ctx.usuario, { motivoPerdida: motivo });
              ctx.onToast(`${perder.nombre} marcado como perdido (${motivo.toLowerCase()})`);
              setPerder(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function PerdidoForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (m: string) => void;
  onCancel: () => void;
}) {
  const [motivo, setMotivo] = useState(MOTIVOS_PERDIDA[0] ?? "Precio");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(motivo);
      }}
      className="space-y-3"
    >
      <p className="text-sm text-muted-foreground">
        Registrar el motivo ayuda a mejorar las campañas y los precios.
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {MOTIVOS_PERDIDA.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMotivo(m)}
            aria-pressed={motivo === m}
            className={`rounded-xl border px-3 py-2 text-xs font-semibold ${motivo === m ? "border-primary bg-primary/10 text-primary" : "border-border bg-white"}`}
          >
            {m}
          </button>
        ))}
      </div>
      <Acciones etiqueta="Marcar perdido" onCancel={onCancel} />
    </form>
  );
}

function LeadForm({
  inicial,
  onSubmit,
  onCancel,
}: {
  inicial?: Lead;
  onSubmit: (l: Omit<Lead, "id" | "creado" | "etapa" | "motivoPerdida" | "actividad">) => void;
  onCancel: () => void;
}) {
  const { miembros } = useEquipo();
  const { campanias } = storeMarketing.usar();
  const { pacientes } = usePacientes();
  const equipo = miembros
    .filter((m) => m.status === "activo")
    .map((m) => `${m.firstName} ${m.lastName}`);
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [telefono, setTelefono] = useState(inicial?.telefono ?? "");
  const [email, setEmail] = useState(inicial?.email ?? "");
  const [fuente, setFuente] = useState<Fuente>(inicial?.fuente ?? "Instagram");
  const [interes, setInteres] = useState(inicial?.interes ?? "Primera consulta");
  const [valor, setValor] = useState(inicial?.valor ? String(inicial.valor) : "");
  const [responsable, setResponsable] = useState(inicial?.responsable ?? equipo[0] ?? "");
  const [seguimiento, setSeguimiento] = useState(inicial?.seguimiento ?? "");
  const [campaniaId, setCampaniaId] = useState(inicial?.campaniaId ?? "");
  const [referidoPor, setReferidoPor] = useState(inicial?.referidoPor ?? "");
  const [error, setError] = useState("");
  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        if (!nombre.trim()) return setError("Escribí el nombre.");
        if (!telefono.trim() && !email.trim())
          return setError("Cargá al menos un teléfono o correo.");
        onSubmit({
          nombre: capitalizarNombre(nombre.trim()),
          telefono: telefono.trim(),
          email: email.trim().toLowerCase(),
          fuente,
          interes,
          valor: Number(valor) || 0,
          responsable,
          seguimiento,
          campaniaId,
          referidoPor: fuente === "Referido" ? referidoPor : "",
        });
      }}
      className="space-y-3"
    >
      <Field label="Nombre y apellido *">
        <input
          autoFocus
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className={INPUT}
          placeholder="Ej: Camila Herrera"
        />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Teléfono / WhatsApp">
          <input
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className={INPUT}
            placeholder="+54 11 …"
          />
        </Field>
        <Field label="Correo">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={INPUT}
            placeholder="nombre@correo.com"
          />
        </Field>
        <Field label="Fuente">
          <Sel value={fuente} onChange={setFuente} opciones={FUENTES} />
        </Field>
        <Field label="Interés">
          <Sel
            value={interes}
            onChange={setInteres}
            opciones={[...TRATAMIENTOS, "Implante", "Ortodoncia", "Carillas"]}
          />
        </Field>
        <Field label="Valor estimado (ARS)">
          <input
            type="number"
            min={0}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className={INPUT}
            placeholder="0"
          />
        </Field>
        <Field label="Responsable">
          <Sel value={responsable} onChange={setResponsable} opciones={equipo} />
        </Field>
        <Field label="Próximo seguimiento">
          <input
            type="date"
            value={seguimiento}
            onChange={(e) => setSeguimiento(e.target.value)}
            className={INPUT}
          />
        </Field>
        <Field label="Campaña de origen">
          <Sel
            value={campaniaId}
            onChange={setCampaniaId}
            opciones={[
              { value: "", label: "Ninguna" },
              ...campanias.map((c) => ({ value: c.id, label: c.nombre })),
            ]}
          />
        </Field>
        {fuente === "Referido" && (
          <Field label="Referido por">
            <Sel
              value={referidoPor}
              onChange={setReferidoPor}
              opciones={[
                { value: "", label: "Elegir paciente" },
                ...pacientes.map((p) => ({
                  value: `${p.nombre} ${p.apellido}`,
                  label: `${p.nombre} ${p.apellido}`,
                })),
              ]}
            />
          </Field>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Acciones etiqueta={inicial ? "Guardar cambios" : "Agregar lead"} onCancel={onCancel} />
    </form>
  );
}

function DetalleLead({ id, ctx, onClose }: { id: string; ctx: Ctx; onClose: () => void }) {
  const { leads, campanias } = storeMarketing.usar();
  const { pacientes, setPacientes } = usePacientes();
  const { miembros } = useEquipo();
  const { turnos } = storeAgenda.usar();
  const l = leads.find((x) => x.id === id);
  const [modo, setModo] = useState<"detalle" | "editar" | "turno">("detalle");
  const [nota, setNota] = useState("");
  const [tipo, setTipo] = useState<ActividadLead["tipo"]>("Nota");
  if (!l) return null;
  const campania = campanias.find((c) => c.id === l.campaniaId);
  const yaPaciente = pacientes.some(
    (p) => `${p.nombre} ${p.apellido}`.toLowerCase() === l.nombre.toLowerCase(),
  );

  const convertir = () => {
    if (!yaPaciente) {
      const [nombre = "", ...resto] = l.nombre.split(" ");
      setPacientes((prev) => [
        ...prev,
        {
          id: Math.max(0, ...prev.map((p) => p.id)) + 1,
          nombre,
          apellido: resto.join(" "),
          documento: "",
          fechaNacimiento: "",
          genero: "",
          email: l.email,
          telefono: l.telefono,
          sucursal: "Clínica Centro",
          obraSocial: "No aplica / particular",
          afiliado: "",
          direccion: "",
          nota: `Llegó por ${l.fuente}${campania ? ` (${campania.nombre})` : ""}. Interés: ${l.interes}.`,
          estado: "Activo",
          foto: null,
        },
      ]);
    }
    moverLead(l.id, "Convertido", ctx.usuario);
    ctx.onToast(
      yaPaciente
        ? `${l.nombre} marcado como convertido`
        : `${l.nombre} ahora es paciente de la clínica`,
    );
  };

  return (
    <Modal titulo={l.nombre} onClose={onClose} ancho="max-w-2xl">
      {modo === "editar" ? (
        <LeadForm
          inicial={l}
          onCancel={() => setModo("detalle")}
          onSubmit={(d) => {
            setMarketing("leads", (prev) => prev.map((x) => (x.id === l.id ? { ...x, ...d } : x)));
            setModo("detalle");
            ctx.onToast("Lead actualizado");
          }}
        />
      ) : modo === "turno" ? (
        <TurnoLeadForm
          lead={l}
          odontologos={miembros
            .filter((m) => m.role === "odontologo" && m.status === "activo")
            .map((m) => `${m.firstName} ${m.lastName}`)}
          ocupados={turnos}
          onCancel={() => setModo("detalle")}
          onSubmit={(fecha, hora, odontologo) => {
            setTurnosStore((prev) => [
              ...prev,
              {
                id: Date.now(),
                fecha,
                hora,
                paciente: l.nombre,
                tratamiento: l.interes,
                odontologo,
                sucursal: "Clínica Centro",
                gabinete: "Gabinete 1",
                estado: "Pendiente",
                notas: `Lead de ${l.fuente}`,
              },
            ]);
            moverLead(l.id, "Turno agendado", ctx.usuario);
            setMarketing("leads", (prev) =>
              prev.map((x) =>
                x.id === l.id
                  ? {
                      ...x,
                      actividad: [
                        nuevaActividad(
                          "Nota",
                          `Turno ${formatearFecha(fecha)} ${hora} con ${odontologo}`,
                          ctx.usuario,
                        ),
                        ...x.actividad,
                      ],
                    }
                  : x,
              ),
            );
            ctx.onToast(`Turno agendado para ${l.nombre}: ${formatearFecha(fecha)} ${hora}`);
            setModo("detalle");
          }}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Pill clase={ETAPA_ESTILO[l.etapa].chip}>{l.etapa}</Pill>
            <Pill clase="bg-muted text-muted-foreground">{l.fuente}</Pill>
            {campania && <Pill clase="bg-primary/10 text-primary">{campania.nombre}</Pill>}
            {l.referidoPor && (
              <Pill clase="bg-fuchsia-100 text-fuchsia-700">Referido por {l.referidoPor}</Pill>
            )}
            <span className="ml-auto text-xs text-muted-foreground">Creado {hace(l.creado)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            {[
              ["Interés", l.interes],
              ["Valor estimado", l.valor ? ars(l.valor) : "—"],
              ["Responsable", l.responsable || "—"],
              ["Seguimiento", l.seguimiento ? formatearFecha(l.seguimiento) : "—"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-primary/[0.05] p-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {k}
                </p>
                <p className="mt-0.5 font-semibold">{v}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {l.telefono && (
              <a href={`tel:${l.telefono.replace(/[^\d+]/g, "")}`} className={BTN_SECUNDARIO}>
                <Phone className="size-3.5" /> Llamar
              </a>
            )}
            {l.telefono && (
              <a
                href={wa(
                  l.telefono,
                  `Hola ${l.nombre.split(" ")[0]}, te escribimos de la clínica por tu consulta sobre ${l.interes.toLowerCase()}.`,
                )}
                target="_blank"
                rel="noreferrer"
                className="btn-wa"
              >
                <IconoWhatsApp /> WhatsApp
              </a>
            )}
            {l.etapa !== "Convertido" && (
              <button className={BTN_SECUNDARIO} onClick={() => setModo("turno")}>
                <CalendarPlus className="size-3.5" /> Agendar turno
              </button>
            )}
            {l.etapa !== "Convertido" && (
              <button className={BTN_PRIMARIO} onClick={convertir}>
                <UserCheck className="size-3.5" /> Convertir en paciente
              </button>
            )}
            <button className={BTN_SECUNDARIO} onClick={() => setModo("editar")}>
              <Pencil className="size-3.5" /> Editar
            </button>
            <button
              className={`${BTN_ICONO} hover:!border-destructive/30 hover:!bg-destructive/10 hover:!text-destructive`}
              aria-label="Eliminar lead"
              onClick={() => {
                setMarketing("leads", (prev) => prev.filter((x) => x.id !== l.id));
                ctx.onToast("Lead eliminado");
                onClose();
              }}
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
          <div className="rounded-2xl border border-primary/10 bg-gradient-to-br from-white to-primary/[0.04] p-3">
            <p className="text-xs font-semibold">Registrar actividad</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <div className="flex rounded-full bg-primary/[0.06] p-0.5">
                {(["Nota", "Llamada", "WhatsApp", "Correo"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipo(t)}
                    aria-pressed={tipo === t}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tipo === t ? "bg-primary text-white" : "text-muted-foreground"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <input
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Qué pasó en el contacto…"
                className={`${INPUT} h-8 flex-1`}
              />
              <button
                className={BTN_PRIMARIO}
                disabled={!nota.trim()}
                onClick={() => {
                  setMarketing("leads", (prev) =>
                    prev.map((x) =>
                      x.id === l.id
                        ? {
                            ...x,
                            etapa: x.etapa === "Nuevo" && tipo !== "Nota" ? "Contactado" : x.etapa,
                            actividad: [
                              nuevaActividad(tipo, nota.trim(), ctx.usuario),
                              ...x.actividad,
                            ],
                          }
                        : x,
                    ),
                  );
                  setNota("");
                  ctx.onToast("Actividad registrada");
                }}
              >
                <Plus className="size-3.5" /> Agregar
              </button>
            </div>
            <ol className="mt-3 space-y-2 border-l-2 border-primary/15 pl-3">
              {l.actividad.length === 0 && (
                <li className="text-xs text-muted-foreground">Sin actividad todavía.</li>
              )}
              {l.actividad.map((a) => (
                <li key={a.id} className="text-xs">
                  <p>
                    <b>{a.tipo}</b> · {a.texto}
                  </p>
                  <p className="text-[10.5px] text-muted-foreground">
                    {a.autor} · {hace(a.fecha)}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </Modal>
  );
}

function TurnoLeadForm({
  lead,
  odontologos,
  ocupados,
  onSubmit,
  onCancel,
}: {
  lead: Lead;
  odontologos: string[];
  ocupados: { fecha: string; hora: string; odontologo: string; estado: string }[];
  onSubmit: (f: string, h: string, o: string) => void;
  onCancel: () => void;
}) {
  const [fecha, setFecha] = useState(hoyISO());
  const [odontologo, setOdontologo] = useState(odontologos[0] ?? "");
  const [hora, setHora] = useState("");
  const HORAS = Array.from(
    { length: 22 },
    (_, i) => `${String(8 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`,
  );
  const tomados = new Set(
    ocupados
      .filter((t) => t.fecha === fecha && t.odontologo === odontologo && t.estado !== "Cancelada")
      .map((t) => t.hora),
  );
  const ahora = new Date().toTimeString().slice(0, 5);
  const libres = HORAS.filter((h) => !tomados.has(h) && (fecha > hoyISO() || h > ahora));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (hora) onSubmit(fecha, hora, odontologo);
      }}
      className="space-y-3"
    >
      <p className="text-sm text-muted-foreground">
        Turno de <b className="text-foreground">{lead.interes}</b> para {lead.nombre}. Se agrega a
        la Agenda.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Día">
          <input
            type="date"
            min={hoyISO()}
            value={fecha}
            onChange={(e) => {
              setFecha(e.target.value);
              setHora("");
            }}
            className={INPUT}
          />
        </Field>
        <Field label="Profesional">
          <Sel
            value={odontologo}
            onChange={(v) => {
              setOdontologo(v);
              setHora("");
            }}
            opciones={odontologos}
          />
        </Field>
      </div>
      <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-7">
        {libres.map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => setHora(h)}
            aria-pressed={hora === h}
            className={`rounded-lg border py-1.5 text-xs font-semibold ${hora === h ? "border-primary bg-primary text-white" : "border-primary/15 bg-white"}`}
          >
            {h}
          </button>
        ))}
        {libres.length === 0 && (
          <p className="col-span-full text-xs text-muted-foreground">No quedan horarios ese día.</p>
        )}
      </div>
      <Acciones
        etiqueta={hora ? `Agendar ${hora}` : "Elegí un horario"}
        onCancel={onCancel}
        icon={CalendarPlus}
      />
    </form>
  );
}

/* ───────────── Campañas de publicidad ───────────── */

function Campanias({ ctx }: { ctx: Ctx }) {
  const { campanias, leads } = storeMarketing.usar();
  const [editar, setEditar] = useState<CampaniaAds | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [filtro, setFiltro] = useState<"" | CampaniaAds["estado"]>("");
  const lista = campanias.filter((c) => !filtro || c.estado === filtro);
  const tot = campanias.reduce(
    (a, c) => {
      const r = resultadosCampania(c, leads);
      return {
        gasto: a.gasto + c.gastado,
        leads: a.leads + r.leads,
        conv: a.conv + r.convertidos,
        ingresos: a.ingresos + r.ingresos,
        clics: a.clics + c.clics,
      };
    },
    { gasto: 0, leads: 0, conv: 0, ingresos: 0, clics: 0 },
  );

  return (
    <div className="space-y-3">
      <Encabezado
        icon={Megaphone}
        titulo="Campañas de publicidad"
        descripcion="Inversión, alcance y cuántos pacientes trajo cada campaña."
      >
        <button className={BTN_PRIMARIO} onClick={() => setAbierto(true)}>
          <Plus className="size-4" /> Nueva campaña
        </button>
      </Encabezado>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-5">
        <Mini label="Inversión total" valor={ars(tot.gasto)} icon={CircleDollarSign} />
        <Mini label="Clics" valor={tot.clics.toLocaleString("es-AR")} icon={MousePointerClick} />
        <Mini label="Leads" valor={String(tot.leads)} icon={Users} tono="text-primary" />
        <Mini label="Pacientes" valor={String(tot.conv)} icon={UserCheck} tono="text-emerald-600" />
        <Mini
          label="Retorno"
          valor={`${tot.gasto ? Math.round(((tot.ingresos - tot.gasto) / tot.gasto) * 100) : 0}%`}
          icon={TrendingUp}
          tono={tot.ingresos >= tot.gasto ? "text-emerald-600" : "text-destructive"}
        />
      </div>
      <div className="card-grad flex flex-wrap gap-1 p-2">
        {(["", "Activa", "Programada", "Pausada", "Finalizada"] as const).map((f) => (
          <button
            key={f || "todas"}
            onClick={() => setFiltro(f)}
            aria-pressed={filtro === f}
            className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${filtro === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-primary/10"}`}
          >
            {f || `Todas (${campanias.length})`}
          </button>
        ))}
      </div>
      <ul className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {lista.map((c) => {
          const r = resultadosCampania(c, leads);
          const pct = Math.min(100, (c.gastado / Math.max(1, c.presupuesto)) * 100);
          return (
            <li key={c.id} className="card-grad flex flex-col p-4">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow">
                  <Megaphone className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{c.nombre}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Pill
                      clase={
                        c.estado === "Activa"
                          ? "bg-emerald-100 text-emerald-700"
                          : c.estado === "Programada"
                            ? "bg-sky-100 text-sky-700"
                            : c.estado === "Pausada"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-muted text-muted-foreground"
                      }
                    >
                      {c.estado}
                    </Pill>
                    {c.canal} · {c.tratamiento} · {formatearFecha(c.inicio)} al{" "}
                    {formatearFecha(c.fin)}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <p className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Presupuesto usado</span>
                  <span className="font-semibold">
                    {ars(c.gastado)} / {ars(c.presupuesto)}
                  </span>
                </p>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-primary/10">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${pct > 90 ? "from-amber-400 to-red-500" : "from-primary to-fuchsia-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-1.5 text-center sm:grid-cols-6">
                {[
                  ["Impresiones", c.impresiones.toLocaleString("es-AR")],
                  ["Clics", c.clics.toLocaleString("es-AR")],
                  ["CTR", `${r.ctr.toFixed(1)}%`],
                  ["Leads", String(r.leads)],
                  ["CPL", r.cpl ? ars(r.cpl) : "—"],
                  ["ROI", c.gastado ? `${r.roi}%` : "—"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-white/80 px-1 py-1.5">
                    <p
                      className={`text-xs font-bold ${k === "ROI" && c.gastado ? (r.roi >= 0 ? "text-emerald-600" : "text-destructive") : ""}`}
                    >
                      {v}
                    </p>
                    <p className="text-[9.5px] text-muted-foreground">{k}</p>
                  </div>
                ))}
              </div>
              <div className="min-h-3 flex-1" />
              <div className="flex flex-wrap items-center justify-end gap-1.5 border-t border-primary/10 pt-2.5">
                {(c.estado === "Activa" || c.estado === "Pausada") && (
                  <button
                    className={BTN_SECUNDARIO}
                    onClick={() => {
                      setMarketing("campanias", (prev) =>
                        prev.map((x) =>
                          x.id === c.id
                            ? { ...x, estado: c.estado === "Activa" ? "Pausada" : "Activa" }
                            : x,
                        ),
                      );
                      ctx.onToast(c.estado === "Activa" ? "Campaña pausada" : "Campaña reactivada");
                    }}
                  >
                    {c.estado === "Activa" ? (
                      <Pause className="size-3.5" />
                    ) : (
                      <Play className="size-3.5" />
                    )}
                    {c.estado === "Activa" ? "Pausar" : "Reactivar"}
                  </button>
                )}
                {c.estado === "Programada" && (
                  <button
                    className={BTN_PRIMARIO}
                    onClick={() => {
                      setMarketing("campanias", (prev) =>
                        prev.map((x) =>
                          x.id === c.id ? { ...x, estado: "Activa", inicio: hoyISO() } : x,
                        ),
                      );
                      ctx.onToast("Campaña lanzada");
                    }}
                  >
                    <Play className="size-3.5" /> Lanzar ahora
                  </button>
                )}
                <button
                  className={BTN_SECUNDARIO}
                  onClick={() => {
                    setMarketing("campanias", (prev) => [
                      {
                        ...c,
                        id: `c-${Date.now()}`,
                        nombre: `${c.nombre} (copia)`,
                        gastado: 0,
                        impresiones: 0,
                        clics: 0,
                        estado: "Programada",
                      },
                      ...prev,
                    ]);
                    ctx.onToast("Campaña duplicada");
                  }}
                >
                  <Copy className="size-3.5" /> Duplicar
                </button>
                <button className={BTN_SECUNDARIO} onClick={() => setEditar(c)}>
                  <Pencil className="size-3.5" /> Editar
                </button>
                <button
                  className={`${BTN_ICONO} hover:!border-destructive/30 hover:!bg-destructive/10 hover:!text-destructive`}
                  aria-label="Eliminar campaña"
                  onClick={() => {
                    setMarketing("campanias", (prev) => prev.filter((x) => x.id !== c.id));
                    ctx.onToast("Campaña eliminada");
                  }}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {(abierto || editar) && (
        <Modal
          titulo={editar ? "Editar campaña" : "Nueva campaña"}
          onClose={() => {
            setAbierto(false);
            setEditar(null);
          }}
        >
          <CampaniaForm
            inicial={editar}
            onCancel={() => {
              setAbierto(false);
              setEditar(null);
            }}
            onSubmit={(d) => {
              if (editar)
                setMarketing("campanias", (prev) =>
                  prev.map((x) => (x.id === editar.id ? { ...x, ...d } : x)),
                );
              else
                setMarketing("campanias", (prev) => [
                  { ...d, id: `c-${Date.now()}`, gastado: 0, impresiones: 0, clics: 0 },
                  ...prev,
                ]);
              ctx.onToast(editar ? "Campaña actualizada" : "Campaña creada");
              setAbierto(false);
              setEditar(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function CampaniaForm({
  inicial,
  onSubmit,
  onCancel,
}: {
  inicial: CampaniaAds | null;
  onSubmit: (c: Omit<CampaniaAds, "id" | "gastado" | "impresiones" | "clics">) => void;
  onCancel: () => void;
}) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [canal, setCanal] = useState<CampaniaAds["canal"]>(inicial?.canal ?? "Instagram Ads");
  const [objetivo, setObjetivo] = useState(inicial?.objetivo ?? "Leads");
  const [tratamiento, setTratamiento] = useState(inicial?.tratamiento ?? "Blanqueamiento");
  const [presupuesto, setPresupuesto] = useState(inicial ? String(inicial.presupuesto) : "");
  const [inicio, setInicio] = useState(inicial?.inicio ?? hoyISO());
  const [fin, setFin] = useState(inicial?.fin ?? hoyISO(30));
  const [error, setError] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!nombre.trim()) return setError("Escribí el nombre.");
        if (!Number(presupuesto)) return setError("Indicá el presupuesto.");
        if (fin && fin < inicio)
          return setError("La fecha de fin no puede ser anterior al inicio.");
        onSubmit({
          nombre: nombre.trim(),
          canal,
          objetivo,
          tratamiento,
          presupuesto: Number(presupuesto),
          inicio,
          fin: fin || inicio,
          estado: inicial?.estado ?? (inicio > hoyISO() ? "Programada" : "Activa"),
        });
      }}
      className="space-y-3"
    >
      <Field label="Nombre *">
        <input
          autoFocus
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className={INPUT}
          placeholder="Ej: Blanqueamiento verano"
        />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Canal">
          <Sel value={canal} onChange={setCanal} opciones={CANALES_ADS} />
        </Field>
        <Field label="Objetivo">
          <Sel
            value={objetivo}
            onChange={setObjetivo}
            opciones={["Leads", "Mensajes", "Llamadas y turnos", "Reconocimiento"]}
          />
        </Field>
        <Field label="Tratamiento que promociona">
          <Sel
            value={tratamiento}
            onChange={setTratamiento}
            opciones={[...TRATAMIENTOS, "Implante", "Ortodoncia", "Carillas"]}
          />
        </Field>
        <Field label="Presupuesto (ARS) *">
          <input
            type="number"
            min={0}
            value={presupuesto}
            onChange={(e) => setPresupuesto(e.target.value)}
            className={INPUT}
          />
        </Field>
        <Field label="Inicio">
          <input
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            className={INPUT}
          />
        </Field>
        <Field label="Fin">
          <input
            type="date"
            value={fin}
            min={inicio}
            onChange={(e) => setFin(e.target.value)}
            className={INPUT}
          />
        </Field>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Acciones etiqueta={inicial ? "Guardar cambios" : "Crear campaña"} onCancel={onCancel} />
    </form>
  );
}

/* ───────────── Promociones y cupones ───────────── */

function Promos({ ctx }: { ctx: Ctx }) {
  const { promos } = storeMarketing.usar();
  const [abierto, setAbierto] = useState(false);
  const [editar, setEditar] = useState<Promocion | null>(null);
  const [codigo, setCodigo] = useState("");
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);
  const hoy = hoyISO();
  const vigente = (p: Promocion) =>
    p.activa && p.desde <= hoy && p.hasta >= hoy && p.usos < p.limite;

  const validar = () => {
    const p = promos.find((x) => x.codigo.toUpperCase() === codigo.trim().toUpperCase());
    if (!p) return setResultado({ ok: false, texto: "El código no existe." });
    if (!vigente(p))
      return setResultado({
        ok: false,
        texto:
          p.usos >= p.limite
            ? "El cupón ya alcanzó su límite de usos."
            : "El cupón no está vigente.",
      });
    setResultado({
      ok: true,
      texto: `${p.descuento}% en ${p.tratamiento}. Quedan ${p.limite - p.usos} usos.`,
    });
  };

  return (
    <div className="space-y-3">
      <Encabezado
        icon={BadgePercent}
        titulo="Promociones y cupones"
        descripcion="Descuentos con código, vigencia y límite de usos."
      >
        <button className={BTN_PRIMARIO} onClick={() => setAbierto(true)}>
          <Plus className="size-4" /> Nueva promoción
        </button>
      </Encabezado>
      <div className="card-grad flex flex-wrap items-center gap-2 p-3">
        <BadgePercent className="size-4 text-primary" />
        <span className="text-sm font-semibold">Validar cupón</span>
        <input
          value={codigo}
          onChange={(e) => {
            setCodigo(e.target.value.toUpperCase());
            setResultado(null);
          }}
          placeholder="Ej: BLANCO20"
          className={`${INPUT} h-8 max-w-48 font-mono uppercase`}
        />
        <button className={BTN_SECUNDARIO} onClick={validar} disabled={!codigo.trim()}>
          <Check className="size-3.5" /> Validar
        </button>
        {resultado && (
          <>
            <span
              className={`text-xs font-semibold ${resultado.ok ? "text-emerald-600" : "text-destructive"}`}
            >
              {resultado.texto}
            </span>
            {resultado.ok && (
              <button
                className={BTN_PRIMARIO}
                onClick={() => {
                  setMarketing("promos", (prev) =>
                    prev.map((x) =>
                      x.codigo === codigo.trim().toUpperCase() ? { ...x, usos: x.usos + 1 } : x,
                    ),
                  );
                  setResultado(null);
                  setCodigo("");
                  ctx.onToast("Cupón aplicado y descontado del límite");
                }}
              >
                Aplicar
              </button>
            )}
          </>
        )}
      </div>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {promos.map((p) => {
          const v = vigente(p);
          return (
            <li
              key={p.id}
              className={`relative flex flex-col overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-white via-card to-primary/[0.07] p-4 shadow-[0_12px_28px_-22px_rgba(124,58,237,0.5)] ${v ? "" : "opacity-70"}`}
            >
              <div className="pointer-events-none absolute right-3 top-3 rounded-xl bg-gradient-to-br from-primary to-fuchsia-500 px-2.5 py-1 text-base font-bold text-white shadow-[0_8px_18px_-10px_rgba(124,58,237,0.9)]">
                -{p.descuento}%
              </div>
              <p className="pr-20 text-sm font-semibold">{p.titulo}</p>
              <p className="mt-0.5 pr-20 text-[11px] text-muted-foreground">{p.tratamiento}</p>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(p.codigo).catch(() => {});
                  ctx.onToast(`Código ${p.codigo} copiado`);
                }}
                className="mt-3 flex w-fit items-center gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-primary/[0.05] px-3 py-1.5 font-mono text-sm font-bold text-primary hover:bg-primary/10"
              >
                {p.codigo} <Copy className="size-3.5" />
              </button>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Del {formatearFecha(p.desde)} al {formatearFecha(p.hasta)}
              </p>
              <div className="mt-2">
                <p className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Usos</span>
                  <span className="font-semibold">
                    {p.usos} / {p.limite}
                  </span>
                </p>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-primary/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-fuchsia-500"
                    style={{ width: `${Math.min(100, (p.usos / Math.max(1, p.limite)) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="min-h-3 flex-1" />
              <div className="flex flex-wrap items-center justify-end gap-1.5 border-t border-primary/10 pt-2.5">
                <Pill
                  clase={v ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}
                >
                  {v ? "Vigente" : p.activa ? "Fuera de vigencia" : "Pausada"}
                </Pill>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`🦷 ${p.titulo}: usá el código ${p.codigo} y obtené ${p.descuento}% en ${p.tratamiento.toLowerCase()}. Válido hasta el ${formatearFecha(p.hasta)}.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className={BTN_SECUNDARIO}
                >
                  <Send className="size-3.5" /> Compartir
                </a>
                <button
                  className={BTN_SECUNDARIO}
                  onClick={() => {
                    setMarketing("promos", (prev) =>
                      prev.map((x) => (x.id === p.id ? { ...x, activa: !x.activa } : x)),
                    );
                    ctx.onToast(p.activa ? "Promoción pausada" : "Promoción activada");
                  }}
                >
                  {p.activa ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                  {p.activa ? "Pausar" : "Activar"}
                </button>
                <button className={BTN_ICONO} aria-label="Editar" onClick={() => setEditar(p)}>
                  <Pencil className="size-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {(abierto || editar) && (
        <Modal
          titulo={editar ? "Editar promoción" : "Nueva promoción"}
          onClose={() => {
            setAbierto(false);
            setEditar(null);
          }}
        >
          <PromoForm
            inicial={editar}
            existentes={promos.filter((p) => p.id !== editar?.id).map((p) => p.codigo)}
            onCancel={() => {
              setAbierto(false);
              setEditar(null);
            }}
            onSubmit={(d) => {
              if (editar)
                setMarketing("promos", (prev) =>
                  prev.map((x) => (x.id === editar.id ? { ...x, ...d } : x)),
                );
              else
                setMarketing("promos", (prev) => [
                  { ...d, id: `p-${Date.now()}`, usos: 0 },
                  ...prev,
                ]);
              ctx.onToast(editar ? "Promoción actualizada" : `Promoción creada: ${d.codigo}`);
              setAbierto(false);
              setEditar(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function PromoForm({
  inicial,
  existentes,
  onSubmit,
  onCancel,
}: {
  inicial: Promocion | null;
  existentes: string[];
  onSubmit: (p: Omit<Promocion, "id" | "usos">) => void;
  onCancel: () => void;
}) {
  const [titulo, setTitulo] = useState(inicial?.titulo ?? "");
  const [codigo, setCodigo] = useState(inicial?.codigo ?? "");
  const [descuento, setDescuento] = useState(inicial ? String(inicial.descuento) : "15");
  const [tratamiento, setTratamiento] = useState(inicial?.tratamiento ?? "Blanqueamiento");
  const [desde, setDesde] = useState(inicial?.desde ?? hoyISO());
  const [hasta, setHasta] = useState(inicial?.hasta ?? hoyISO(30));
  const [limite, setLimite] = useState(inicial ? String(inicial.limite) : "50");
  const [error, setError] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const c = codigo.trim().toUpperCase();
        if (!titulo.trim() || !c) return setError("Completá título y código.");
        if (existentes.includes(c)) return setError("Ya existe una promoción con ese código.");
        const d = Number(descuento);
        if (!d || d < 1 || d > 100) return setError("El descuento debe estar entre 1 y 100%.");
        if (!hasta || hasta < desde) return setError("Revisá las fechas de vigencia.");
        onSubmit({
          titulo: titulo.trim(),
          codigo: c,
          descuento: d,
          tratamiento,
          desde,
          hasta,
          limite: Number(limite) || 1,
          activa: inicial?.activa ?? true,
        });
      }}
      className="space-y-3"
    >
      <Field label="Título *">
        <input
          autoFocus
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className={INPUT}
          placeholder="Ej: Blanqueamiento de verano"
        />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Código *">
          <div className="flex gap-1">
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/\s/g, ""))}
              className={`${INPUT} font-mono uppercase`}
              placeholder="VERANO20"
            />
            <button
              type="button"
              className={BTN_ICONO}
              title="Generar"
              onClick={() =>
                setCodigo(
                  `${(titulo.trim() || tratamiento)
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .replace(/[^a-zA-Z]/g, "")
                    .slice(0, 6)
                    .toUpperCase()}${descuento}`,
                )
              }
            >
              <Sparkles className="size-3.5" />
            </button>
          </div>
        </Field>
        <Field label="Descuento %">
          <input
            type="number"
            min={1}
            max={100}
            value={descuento}
            onChange={(e) => setDescuento(e.target.value)}
            className={INPUT}
          />
        </Field>
        <Field label="Límite de usos">
          <input
            type="number"
            min={1}
            value={limite}
            onChange={(e) => setLimite(e.target.value)}
            className={INPUT}
          />
        </Field>
        <Field label="Tratamiento">
          <Sel
            value={tratamiento}
            onChange={setTratamiento}
            opciones={[...TRATAMIENTOS, "Implante", "Ortodoncia", "Carillas"]}
          />
        </Field>
        <Field label="Desde">
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className={INPUT}
          />
        </Field>
        <Field label="Hasta *">
          <input
            type="date"
            min={desde}
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className={INPUT}
          />
        </Field>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Acciones etiqueta={inicial ? "Guardar cambios" : "Crear promoción"} onCancel={onCancel} />
    </form>
  );
}

/* ───────────── Referidos ───────────── */

function Referidos({ ctx }: { ctx: Ctx }) {
  const { leads, referidos } = storeMarketing.usar();
  const { pacientes } = usePacientes();
  const ref = leads.filter((l) => l.fuente === "Referido" && l.referidoPor);
  const ranking = Object.entries(
    ref.reduce<Record<string, { total: number; convertidos: number }>>((acc, l) => {
      const r = acc[l.referidoPor] ?? { total: 0, convertidos: 0 };
      r.total += 1;
      if (l.etapa === "Convertido") r.convertidos += 1;
      acc[l.referidoPor] = r;
      return acc;
    }, {}),
  ).sort((a, b) => b[1].convertidos - a[1].convertidos || b[1].total - a[1].total);
  const [paciente, setPaciente] = useState(
    pacientes[0] ? `${pacientes[0].nombre} ${pacientes[0].apellido}` : "",
  );
  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/formulario?ref=${encodeURIComponent(normalizarBusqueda(paciente).replace(/\s+/g, "-"))}`;
  const set = (c: Partial<typeof referidos>) => setMarketing("referidos", (p) => ({ ...p, ...c }));

  return (
    <div className="space-y-3">
      <Encabezado
        icon={Gift}
        titulo="Programa de referidos"
        descripcion="Tus pacientes recomiendan la clínica y ganan beneficios."
      >
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={referidos.activo}
            onChange={(e) => {
              set({ activo: e.target.checked });
              ctx.onToast(e.target.checked ? "Programa activado" : "Programa pausado");
            }}
            className="size-4 accent-[var(--color-primary)]"
          />
          Programa activo
        </label>
      </Encabezado>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <Mini label="Referidos" valor={String(ref.length)} icon={Heart} tono="text-primary" />
        <Mini
          label="Convertidos"
          valor={String(ref.filter((l) => l.etapa === "Convertido").length)}
          icon={UserCheck}
          tono="text-emerald-600"
        />
        <Mini label="Pacientes que refieren" valor={String(ranking.length)} icon={Users} />
        <Mini
          label="Valor generado"
          valor={ars(ref.filter((l) => l.etapa === "Convertido").reduce((a, l) => a + l.valor, 0))}
          icon={CircleDollarSign}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="card-grad space-y-3 p-4">
          <p className="text-sm font-semibold">Beneficios</p>
          <Field label="Para quien recomienda">
            <input
              value={referidos.recompensaReferente}
              onChange={(e) => set({ recompensaReferente: e.target.value })}
              className={INPUT}
            />
          </Field>
          <Field label="Para el paciente nuevo">
            <input
              value={referidos.beneficioReferido}
              onChange={(e) => set({ beneficioReferido: e.target.value })}
              className={INPUT}
            />
          </Field>
          <div className="rounded-xl border border-primary/15 bg-gradient-to-br from-primary/[0.07] to-transparent p-3">
            <p className="text-xs font-semibold">Link personal de referido</p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
              <Sel
                value={paciente}
                onChange={setPaciente}
                opciones={pacientes.map((p) => `${p.nombre} ${p.apellido}`)}
              />
              <button
                className={BTN_PRIMARIO}
                onClick={() => {
                  navigator.clipboard?.writeText(link).catch(() => {});
                  ctx.onToast("Link de referido copiado");
                }}
              >
                <Copy className="size-3.5" /> Copiar link
              </button>
            </div>
            <p className="mt-2 truncate font-mono text-[11px] text-muted-foreground">{link}</p>
          </div>
        </div>
        <div className="card-grad p-4">
          <p className="text-sm font-semibold">Ranking de embajadores</p>
          {ranking.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">Todavía no hay referidos.</p>
          ) : (
            <ol className="mt-3 space-y-2">
              {ranking.map(([nombre, r], i) => (
                <li
                  key={nombre}
                  className="flex items-center gap-3 rounded-xl bg-white/80 p-2.5 ring-1 ring-primary/10"
                >
                  <span
                    className={`grid size-8 place-items-center rounded-full text-xs font-bold ${i === 0 ? "bg-amber-400 text-white" : "bg-primary/10 text-primary"}`}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm font-semibold">{nombre}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.total} referidos ·{" "}
                    <b className="text-emerald-600">{r.convertidos} pacientes</b>
                  </span>
                  {r.convertidos > 0 && (
                    <Pill clase="bg-fuchsia-100 text-fuchsia-700">
                      Gana: {referidos.recompensaReferente}
                    </Pill>
                  )}
                </li>
              ))}
            </ol>
          )}
          {ref.length > 0 && (
            <>
              <p className="mt-4 text-sm font-semibold">Últimos referidos</p>
              <ul className="mt-2 space-y-1.5">
                {[...ref]
                  .sort((a, b) => b.creado.localeCompare(a.creado))
                  .slice(0, 4)
                  .map((l) => (
                    <li key={l.id}>
                      <button
                        type="button"
                        onClick={() => ctx.abrirLead(l.id)}
                        className="flex w-full items-center gap-2 rounded-xl bg-white/70 px-2.5 py-2 text-left ring-1 ring-primary/10 transition-colors hover:bg-card"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold">{l.nombre}</span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            Lo recomendó {l.referidoPor} · {l.interes}
                          </span>
                        </span>
                        <Pill clase={ETAPA_ESTILO[l.etapa].chip}>{l.etapa}</Pill>
                      </button>
                    </li>
                  ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────── Reseñas y reputación ───────────── */

function Estrellas({ n, tam = "size-3.5" }: { n: number; tam?: string }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${tam} ${i <= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </span>
  );
}

function Resenas({ ctx }: { ctx: Ctx }) {
  const { resenas, solicitudes } = storeMarketing.usar();
  const { turnos } = storeAgenda.usar();
  const [responder, setResponder] = useState<Resena | null>(null);
  const [texto, setTexto] = useState("");
  const [filtro, setFiltro] = useState<"" | "sin" | "bajas">("");
  const promedio = resenas.length
    ? resenas.reduce((a, r) => a + r.estrellas, 0) / resenas.length
    : 0;
  const lista = resenas.filter((r) =>
    filtro === "sin" ? !r.respuesta : filtro === "bajas" ? r.estrellas <= 3 : true,
  );
  const atendidos = [
    ...new Set(turnos.filter((t) => t.estado === "Atendida").map((t) => t.paciente)),
  ];
  const pendientesPedir = atendidos.filter((p) => !solicitudes.some((s) => s.paciente === p));

  const pedir = (pacientesAPedir: string[]) => {
    setMarketing("solicitudes", (prev) => [
      ...prev,
      ...pacientesAPedir.map((p) => ({
        paciente: p,
        fecha: new Date().toISOString(),
        estado: "Enviada" as const,
      })),
    ]);
    ctx.onToast(
      `Pedido de reseña enviado a ${pacientesAPedir.length} ${pacientesAPedir.length === 1 ? "paciente" : "pacientes"}`,
    );
  };

  return (
    <div className="space-y-3">
      <Encabezado
        icon={Star}
        titulo="Reseñas y reputación"
        descripcion="Lo que dicen tus pacientes en Google, Doctoralia y Facebook."
      />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-fuchsia-600 p-5 text-center text-white shadow-lg">
            <p className="font-display text-5xl font-bold">{promedio.toFixed(1)}</p>
            <div className="mt-1 flex justify-center">
              <Estrellas n={Math.round(promedio)} tam="size-5" />
            </div>
            <p className="mt-1 text-xs text-white/80">{resenas.length} reseñas</p>
          </div>
          <div className="card-grad p-4">
            {[5, 4, 3, 2, 1].map((n) => {
              const c = resenas.filter((r) => r.estrellas === n).length;
              return (
                <div key={n} className="flex items-center gap-2 text-xs">
                  <span className="w-3">{n}</span>
                  <Star className="size-3 fill-amber-400 text-amber-400" />
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-primary/10">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{ width: `${resenas.length ? (c / resenas.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="w-4 text-right text-muted-foreground">{c}</span>
                </div>
              );
            })}
          </div>
          <div className="card-grad space-y-2 p-4">
            <p className="text-sm font-semibold">Pedir reseñas</p>
            <p className="text-xs text-muted-foreground">
              Enviá un mensaje a los pacientes atendidos para que dejen su opinión en Google.
            </p>
            <p className="text-xs">
              <b>{pendientesPedir.length}</b> atendidos sin pedido · <b>{solicitudes.length}</b>{" "}
              pedidos enviados
            </p>
            <button
              className={`${BTN_PRIMARIO} w-full`}
              disabled={pendientesPedir.length === 0}
              onClick={() => pedir(pendientesPedir)}
            >
              <Send className="size-3.5" /> Pedir a {pendientesPedir.length} pacientes
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <div className="card-grad flex flex-wrap gap-1 p-2">
            {(
              [
                ["", "Todas"],
                ["sin", `Sin responder (${resenas.filter((r) => !r.respuesta).length})`],
                ["bajas", "3 estrellas o menos"],
              ] as const
            ).map(([id, l]) => (
              <button
                key={id || "todas"}
                onClick={() => setFiltro(id)}
                aria-pressed={filtro === id}
                className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${filtro === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-primary/10"}`}
              >
                {l}
              </button>
            ))}
          </div>
          {lista.map((r) => (
            <div key={r.id} className="card-grad p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {iniciales(r.autor)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{r.autor}</p>
                  <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Estrellas n={r.estrellas} /> {r.fuente} · {formatearFecha(r.fecha)}
                  </p>
                </div>
                {!r.respuesta && <Pill clase="bg-amber-100 text-amber-700">Sin responder</Pill>}
              </div>
              <p className="mt-2 text-sm">{r.texto}</p>
              {r.respuesta ? (
                <p className="mt-2 rounded-xl border-l-2 border-primary bg-primary/[0.05] px-3 py-2 text-xs">
                  <b>Respuesta de la clínica:</b> {r.respuesta}
                </p>
              ) : (
                <div className="mt-2 flex justify-end">
                  <button
                    className={BTN_SECUNDARIO}
                    onClick={() => {
                      setResponder(r);
                      setTexto(
                        r.estrellas >= 4
                          ? `¡Gracias ${r.autor.split(" ")[0]} por tu reseña! Nos alegra que hayas tenido una buena experiencia. ¡Te esperamos pronto!`
                          : `Hola ${r.autor.split(" ")[0]}, gracias por tu comentario. Lamentamos lo ocurrido y ya estamos trabajando para mejorar. Escribinos así lo resolvemos.`,
                      );
                    }}
                  >
                    <MessageCircle className="size-3.5" /> Responder
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {responder && (
        <Modal titulo={`Responder a ${responder.autor}`} onClose={() => setResponder(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setMarketing("resenas", (prev) =>
                prev.map((x) => (x.id === responder.id ? { ...x, respuesta: texto.trim() } : x)),
              );
              ctx.onToast("Respuesta publicada");
              setResponder(null);
            }}
            className="space-y-3"
          >
            <p className="rounded-xl bg-primary/[0.05] p-3 text-sm italic">“{responder.texto}”</p>
            <textarea
              rows={4}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              className="w-full rounded-xl border border-primary/12 bg-white px-3 py-2 text-sm outline-none focus:border-primary/45"
            />
            <Acciones
              etiqueta="Publicar respuesta"
              onCancel={() => setResponder(null)}
              icon={Send}
            />
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ───────────── Formulario web ───────────── */

function Formulario({ ctx }: { ctx: Ctx }) {
  const { formulario } = storeMarketing.usar();
  const { clinica } = useSesion();
  const set = (c: Partial<typeof formulario>) =>
    setMarketing("formulario", (p) => ({ ...p, ...c }));
  const codigo = `<iframe src="${typeof window !== "undefined" ? window.location.origin : ""}/formulario" width="100%" height="520" style="border:0;border-radius:16px"></iframe>`;

  return (
    <div className="space-y-3">
      <Encabezado
        icon={Globe}
        titulo="Formulario web de captación"
        descripcion="Ponelo en tu sitio o en la bio de Instagram: cada envío entra como lead."
      />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="card-grad space-y-3 p-4">
          <p className="text-sm font-semibold">Personalizar</p>
          <Field label="Título">
            <input
              value={formulario.titulo}
              onChange={(e) => set({ titulo: e.target.value })}
              className={INPUT}
            />
          </Field>
          <Field label="Subtítulo">
            <input
              value={formulario.subtitulo}
              onChange={(e) => set({ subtitulo: e.target.value })}
              className={INPUT}
            />
          </Field>
          <Field label="Texto del botón">
            <input
              value={formulario.boton}
              onChange={(e) => set({ boton: e.target.value })}
              className={INPUT}
            />
          </Field>
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Tratamientos que se ofrecen
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[...TRATAMIENTOS, "Implante", "Ortodoncia", "Carillas"].map((t) => {
                const on = formulario.tratamientos.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      set({
                        tratamientos: on
                          ? formulario.tratamientos.filter((x) => x !== t)
                          : [...formulario.tratamientos, t],
                      })
                    }
                    aria-pressed={on}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${on ? "border-primary bg-primary/10 text-primary" : "border-border bg-white text-muted-foreground"}`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="rounded-xl bg-slate-900 p-3">
            <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
              <Code2 className="size-3.5" /> Código para insertar en tu web
            </p>
            <p className="break-all font-mono text-[10.5px] text-emerald-300">{codigo}</p>
            <button
              className="mt-2 inline-flex h-7 items-center gap-1 rounded-full bg-white/10 px-3 text-[11px] font-semibold text-white hover:bg-white/20"
              onClick={() => {
                navigator.clipboard?.writeText(codigo).catch(() => {});
                ctx.onToast("Código copiado");
              }}
            >
              <Copy className="size-3" /> Copiar código
            </button>
          </div>
        </div>
        <div className="rounded-3xl bg-gradient-to-br from-violet-100 via-white to-primary/15 p-6">
          <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Vista previa (probalo)
          </p>
          <FormularioCaptacion
            onEnviado={() => ctx.onToast("¡Llegó un lead nuevo desde el formulario web!")}
            onError={ctx.onToast}
          />
        </div>
      </div>
    </div>
  );
}

/** Formulario público de captación: lo usan la vista previa y la página /formulario.
    Con `referido` el lead entra como "Referido" y suma al ranking de embajadores. */
export function FormularioCaptacion({
  referido = "",
  onEnviado,
  onError,
}: {
  referido?: string;
  onEnviado: (nombre: string) => void;
  onError: (m: string) => void;
}) {
  const { formulario } = storeMarketing.usar();
  const { clinica } = useSesion();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [interes, setInteres] = useState(formulario.tratamientos[0] ?? "Primera consulta");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!nombre.trim() || telefono.replace(/\D/g, "").length < 8)
          return onError("Completá nombre y un teléfono válido");
        const n = capitalizarNombre(nombre.trim());
        setMarketing("leads", (prev) => [
          {
            id: `l-${Date.now()}`,
            nombre: n,
            telefono: telefono.trim(),
            email: "",
            fuente: referido ? "Referido" : "Sitio web",
            interes,
            valor: 0,
            etapa: "Nuevo",
            responsable: "",
            creado: new Date().toISOString(),
            seguimiento: hoyISO(),
            campaniaId: "",
            referidoPor: referido,
            motivoPerdida: "",
            actividad: [
              nuevaActividad(
                "Nota",
                referido ? `Llegó por recomendación de ${referido}` : "Envió el formulario web",
                "Formulario web",
              ),
            ],
          },
          ...prev,
        ]);
        setNombre("");
        setTelefono("");
        onEnviado(n);
      }}
      className="mx-auto w-full max-w-sm space-y-3 rounded-3xl bg-white p-6 shadow-[0_24px_50px_-30px_rgba(76,29,149,0.6)]"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
        {clinica?.nombre ?? "Clínica Dental Esther"}
      </p>
      <h3 className="font-display text-xl font-bold">{formulario.titulo}</h3>
      <p className="text-sm text-muted-foreground">{formulario.subtitulo}</p>
      {referido && (
        <p className="rounded-xl bg-primary/[0.06] px-3 py-2 text-xs font-medium text-primary">
          Te recomendó {referido}
        </p>
      )}
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre y apellido"
        className={INPUT}
      />
      <input
        value={telefono}
        onChange={(e) => setTelefono(e.target.value)}
        placeholder="WhatsApp"
        className={INPUT}
      />
      <Sel
        value={interes}
        onChange={setInteres}
        opciones={formulario.tratamientos}
        etiqueta="Tratamiento"
      />
      <button type="submit" className={`${BTN_PRIMARIO} w-full`}>
        {formulario.boton}
      </button>
      <p className="text-center text-[10px] text-muted-foreground">
        Tus datos solo se usan para contactarte.
      </p>
    </form>
  );
}

/** Página pública /formulario (la que se embebe en el sitio o se comparte como link de referido). */
export function FormularioPublico() {
  const { pacientes } = usePacientes();
  const [montado, setMontado] = useState(false);
  const [enviado, setEnviado] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [ref, setRef] = useState("");
  useEffect(() => {
    setMontado(true);
    setRef(new URLSearchParams(window.location.search).get("ref") ?? "");
  }, []);
  const slug = (t: string) => normalizarBusqueda(t).replace(/\s+/g, "-");
  const referido = ref
    ? (pacientes.map((p) => `${p.nombre} ${p.apellido}`).find((n) => slug(n) === slug(ref)) ?? "")
    : "";
  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-violet-100 via-[#faf9ff] to-fuchsia-100/70 p-4">
      {!montado ? (
        <div className="h-[460px] w-full max-w-sm animate-pulse rounded-3xl bg-white/70" />
      ) : enviado ? (
        <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-[0_24px_50px_-30px_rgba(76,29,149,0.6)]">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="size-7" />
          </div>
          <h1 className="mt-4 font-display text-xl font-bold">
            ¡Gracias, {enviado.split(" ")[0]}!
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Recibimos tus datos. Te escribimos por WhatsApp a la brevedad para coordinar tu turno.
          </p>
          <button
            type="button"
            onClick={() => setEnviado(null)}
            className={`${BTN_SECUNDARIO} mt-5`}
          >
            Enviar otra consulta
          </button>
        </div>
      ) : (
        <div className="w-full max-w-sm space-y-2">
          <FormularioCaptacion referido={referido} onEnviado={setEnviado} onError={setError} />
          {error && (
            <p role="alert" className="text-center text-xs font-medium text-rose-600">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
