import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Workflow,
  Zap,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  Clock3,
  CheckCircle2,
  XCircle,
  Plug,
  MessageSquare,
  CalendarDays,
  Sparkles,
  History,
  Settings2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppShell } from "@/components/cloud-esther/AppShell";
import { CloudEstherProvider } from "@/lib/cloud-esther/data";
import {
  useAutomatizaciones,
  type Automatizacion,
  type EstadoAutomatizacion,
} from "@/lib/cloud-esther/automatizaciones";

export const Route = createFileRoute("/demo_/comunicaciones")({
  head: () => ({
    meta: [{ title: "Automatización | Cloud Esther" }],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: AutomatizacionPage,
});

/* ───────────── Tipos y catálogos propios del módulo ───────────── */

type Tab = "flujos" | "historial" | "conectores";

const DISPARADORES = [
  "Turno agendado",
  "Turno cancelado",
  "Turno a 24hs",
  "Paciente nuevo creado",
  "Factura vencida",
  "Presupuesto aprobado",
];

const ACCIONES = [
  "Enviar WhatsApp al paciente",
  "Enviar correo",
  "Crear notificación interna",
  "Actualizar cuenta corriente",
  "Notificar al equipo",
];

const CONECTORES_FLUJO = ["n8n", "WhatsApp Business", "Google Calendar"];

type EstadoConector = "Conectado" | "Desconectado";

interface Conector {
  id: string;
  nombre: string;
  descripcion: string;
  icon: LucideIcon;
  estado: EstadoConector;
}

const CONECTORES_INICIALES: Conector[] = [
  {
    id: "n8n",
    nombre: "n8n",
    descripcion: "Motor de automatización — ejecuta los flujos configurados abajo.",
    icon: Workflow,
    estado: "Conectado",
  },
  {
    id: "whatsapp",
    nombre: "WhatsApp Business",
    descripcion: "Envío de mensajes y recordatorios automáticos al paciente.",
    icon: MessageSquare,
    estado: "Desconectado",
  },
  {
    id: "google-calendar",
    nombre: "Google Calendar",
    descripcion: "Sincroniza turnos con el calendario del profesional.",
    icon: CalendarDays,
    estado: "Desconectado",
  },
];

/* ───────────── Utilidades ───────────── */

function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  let timeoutId: number | null = null;

  const show = (msg: string) => {
    setMessage(msg);
    if (timeoutId) window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => setMessage(null), 2400);
  };

  return { message, show };
}

/* ───────────── Estilos (mismo ADN que Pacientes, cards más chicas) ───────────── */

const DATO_CARD =
  "relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-white via-white to-primary/[0.045] p-3.5 shadow-[0_10px_28px_-22px_rgba(124,58,237,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_16px_32px_-22px_rgba(124,58,237,0.5)]";

const INPUT =
  "h-10 w-full rounded-xl border border-primary/10 bg-white/80 px-3.5 text-sm outline-none shadow-[0_4px_16px_-14px_rgba(124,58,237,0.35)] transition-all placeholder:text-muted-foreground focus:border-primary/45 focus:bg-white focus:ring-4 focus:ring-primary/10";

const BTN_PRIMARIO =
  "inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground shadow-[0_8px_20px_-12px_rgba(124,58,237,0.75)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-[0_12px_24px_-12px_rgba(124,58,237,0.8)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20";

const BTN_SECUNDARIO =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-primary/12 bg-white/90 px-4 py-2 text-[13px] font-medium text-foreground shadow-[0_6px_18px_-16px_rgba(124,58,237,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-primary/[0.035] hover:shadow-[0_10px_22px_-15px_rgba(124,58,237,0.5)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15";

const BTN_ICONO =
  "grid size-9 place-items-center rounded-xl border border-primary/12 bg-white/90 text-muted-foreground shadow-[0_5px_16px_-14px_rgba(124,58,237,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/10 hover:text-primary hover:shadow-[0_9px_20px_-14px_rgba(124,58,237,0.55)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15";

const BTN_ICONO_PELIGRO =
  "grid size-9 place-items-center rounded-xl border border-primary/12 bg-white/90 text-muted-foreground shadow-[0_5px_16px_-14px_rgba(124,58,237,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-destructive/15";

/* ───────────── Fondo temático — Automatización ─────────────
   Blobs violeta + una trama de líneas/nodos difuminada, evocando
   un flujo de conexiones (n8n) en vez de la trama de puntos de Pacientes. */

function FondoAutomatizaciones() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_8%,rgba(124,58,237,0.16),transparent_28%),radial-gradient(circle_at_94%_18%,rgba(167,139,250,0.15),transparent_27%),radial-gradient(circle_at_75%_92%,rgba(196,181,253,0.13),transparent_30%),linear-gradient(135deg,#f8f6ff_0%,#f3effd_48%,#faf8ff_100%)]" />

      <div className="absolute left-[-160px] top-[-160px] size-[480px] rounded-full bg-violet-500/[0.055] blur-3xl" />
      <div className="absolute right-[-180px] top-[140px] size-[440px] rounded-full bg-purple-400/[0.06] blur-3xl" />
      <div className="absolute bottom-[-200px] left-[30%] size-[520px] rounded-full bg-fuchsia-300/[0.04] blur-3xl" />

      <svg
        className="absolute inset-0 h-full w-full opacity-[0.16]"
        style={{
          maskImage: "linear-gradient(to bottom, black, transparent 75%)",
          WebkitMaskImage: "linear-gradient(to bottom, black, transparent 75%)",
        }}
      >
        <line x1="6%" y1="12%" x2="30%" y2="4%" stroke="rgba(124,58,237,0.5)" strokeWidth="1" />
        <line x1="30%" y1="4%" x2="52%" y2="16%" stroke="rgba(124,58,237,0.5)" strokeWidth="1" />
        <line x1="52%" y1="16%" x2="78%" y2="8%" stroke="rgba(124,58,237,0.5)" strokeWidth="1" />
        <circle cx="6%" cy="12%" r="3" fill="rgba(124,58,237,0.55)" />
        <circle cx="30%" cy="4%" r="3" fill="rgba(124,58,237,0.55)" />
        <circle cx="52%" cy="16%" r="3" fill="rgba(124,58,237,0.55)" />
        <circle cx="78%" cy="8%" r="3" fill="rgba(124,58,237,0.55)" />
      </svg>
    </div>
  );
}

/* ───────────── Modal / Field / SelectField (mismo patrón que Pacientes) ───────────── */

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
            <h2 className="mt-1 text-lg font-semibold tracking-tight">{title}</h2>
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold">{label}</span>
      {children}
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
        className={`${INPUT} appearance-none pr-9`}
      >
        {placeholder && <option value="">{placeholder}</option>}
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

/* ───────────── Switch reutilizable (flujo activo / conector conectado) ───────────── */

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 ${
        checked ? "bg-primary" : "bg-muted"
      }`}
    >
      <span
        className={`inline-block size-4.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-[22px]" : "translate-x-1"
        }`}
      />
    </button>
  );
}

/* ───────────── Badges ───────────── */

function BadgeEstadoFlujo({ estado }: { estado: EstadoAutomatizacion }) {
  const activa = estado === "Activa";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        activa
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15"
          : "bg-muted text-muted-foreground"
      }`}
    >
      <span className={`size-1.5 rounded-full ${activa ? "bg-emerald-500" : "bg-muted-foreground/50"}`} />
      {estado}
    </span>
  );
}

function BadgeConector({ nombre }: { nombre: string }) {
  return (
    <span className="inline-flex rounded-full border border-primary/20 bg-primary/[0.04] px-2.5 py-1 text-[11px] font-semibold text-foreground/75">
      {nombre}
    </span>
  );
}

/* ───────────── StatCard (mismo patrón de Pacientes, versión compacta) ───────────── */

type StatTone = "primary" | "emerald" | "violet" | "danger";

const STAT_TONES: Record<StatTone, { label: string; value: string; icon: string; circle: string }> = {
  primary: { label: "text-primary/75", value: "text-primary", icon: "text-primary", circle: "bg-primary/[0.075]" },
  emerald: {
    label: "text-emerald-600/85",
    value: "text-emerald-600",
    icon: "text-emerald-600",
    circle: "bg-emerald-400/[0.075]",
  },
  violet: {
    label: "text-violet-600/80",
    value: "text-foreground",
    icon: "text-violet-600",
    circle: "bg-violet-400/[0.075]",
  },
  danger: { label: "text-violet-600/80", value: "text-red-500", icon: "text-slate-500", circle: "bg-violet-400/[0.075]" },
};

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  detail,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone: StatTone;
  detail: string;
}) {
  const t = STAT_TONES[tone];

  return (
    <div className="group relative min-h-[96px] overflow-hidden rounded-[20px] border border-primary/25 bg-gradient-to-br from-white via-white to-primary/[0.065] p-3.5 shadow-[0_12px_28px_-20px_rgba(124,58,237,0.48)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[0_18px_34px_-20px_rgba(124,58,237,0.58)]">
      <div className="pointer-events-none absolute -right-6 -top-8 size-[88px] rounded-full bg-primary/[0.035] ring-[12px] ring-primary/[0.035] transition-transform duration-300 group-hover:scale-110" />

      <div className="relative flex h-full items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`max-w-[140px] text-[10px] font-bold uppercase leading-[1.25] tracking-[0.09em] ${t.label}`}>
            {label}
          </p>
          <p className={`mt-2 text-[24px] font-bold leading-none tracking-tight ${t.value}`}>{value}</p>
          <p className="mt-2 text-[11px] leading-4 text-muted-foreground">{detail}</p>
        </div>

        <div className={`relative grid size-8 shrink-0 place-items-center rounded-full ${t.circle} ${t.icon}`}>
          <Icon className="size-4" strokeWidth={1.7} />
        </div>
      </div>
    </div>
  );
}

/* ───────────── Formulario de flujo ───────────── */

function FlujoForm({
  inicial,
  onSubmit,
  onCancel,
}: {
  inicial?: Automatizacion;
  onSubmit: (d: Omit<Automatizacion, "id" | "estado" | "ejecucionesHoy" | "ultimaEjecucion">) => void;
  onCancel: () => void;
}) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [disparador, setDisparador] = useState(inicial?.disparador ?? "");
  const [accion, setAccion] = useState(inicial?.accion ?? "");
  const [conector, setConector] = useState(inicial?.conector ?? "");

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !disparador || !accion || !conector) return;

    onSubmit({ nombre: nombre.trim(), disparador, accion, conector });
  };

  return (
    <form onSubmit={enviar} className="space-y-4">
      <Field label="Nombre del flujo *">
        <input
          autoFocus
          required
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className={INPUT}
          placeholder="Recordatorio de turno 24hs antes"
        />
      </Field>

      <Field label="Cuando pasa esto (disparador) *">
        <SelectField value={disparador} onChange={setDisparador} options={DISPARADORES} placeholder="Seleccionar" />
      </Field>

      <Field label="Hacer esto (acción) *">
        <SelectField value={accion} onChange={setAccion} options={ACCIONES} placeholder="Seleccionar" />
      </Field>

      <Field label="Conector que lo ejecuta *">
        <SelectField value={conector} onChange={setConector} options={CONECTORES_FLUJO} placeholder="Seleccionar" />
      </Field>

      <div className="flex justify-end gap-3 border-t border-border/70 pt-4">
        <button type="button" onClick={onCancel} className={BTN_SECUNDARIO}>
          Cancelar
        </button>
        <button type="submit" className={BTN_PRIMARIO}>
          {inicial ? "Guardar cambios" : "Crear flujo"}
        </button>
      </div>
    </form>
  );
}

/* ───────────── Página ───────────── */

type ModalActivo = { tipo: "form"; flujo?: Automatizacion } | { tipo: "eliminar"; flujo: Automatizacion } | null;

function AutomatizacionInner() {
  const { message, show } = useToast();
  const { automatizaciones, setAutomatizaciones } = useAutomatizaciones();
  const [conectores, setConectores] = useState<Conector[]>(CONECTORES_INICIALES);
  const [tab, setTab] = useState<Tab>("flujos");
  const [modal, setModal] = useState<ModalActivo>(null);

  const cerrarModal = () => setModal(null);

  const activos = automatizaciones.filter((a) => a.estado === "Activa").length;
  const ejecucionesHoy = automatizaciones.reduce((acc, a) => acc + a.ejecucionesHoy, 0);
  const conectoresActivos = conectores.filter((c) => c.estado === "Conectado").length;

  const alternarEstado = (id: number) => {
    setAutomatizaciones((prev) =>
      prev.map((a) => (a.id === id ? { ...a, estado: a.estado === "Activa" ? "Pausada" : "Activa" } : a)),
    );

    const flujo = automatizaciones.find((a) => a.id === id);
    show(flujo?.estado === "Activa" ? "Flujo pausado" : "Flujo activado");
  };

  const guardarFlujo = (d: Omit<Automatizacion, "id" | "estado" | "ejecucionesHoy" | "ultimaEjecucion">) => {
    const editando = modal?.tipo === "form" ? modal.flujo : undefined;

    if (editando) {
      setAutomatizaciones((prev) => prev.map((a) => (a.id === editando.id ? { ...a, ...d } : a)));
      show("Flujo actualizado");
    } else {
      setAutomatizaciones((prev) => [
        ...prev,
        { ...d, id: Date.now(), estado: "Activa", ejecucionesHoy: 0, ultimaEjecucion: "" },
      ]);
      show("Flujo creado");
    }

    cerrarModal();
  };

  const eliminarFlujo = (flujo: Automatizacion) => {
    setAutomatizaciones((prev) => prev.filter((a) => a.id !== flujo.id));
    cerrarModal();
    show(`"${flujo.nombre}" eliminado`);
  };

  const alternarConector = (id: string) => {
    setConectores((prev) =>
      prev.map((c) => (c.id === id ? { ...c, estado: c.estado === "Conectado" ? "Desconectado" : "Conectado" } : c)),
    );
  };

  const modalForm = modal?.tipo === "form" ? modal : null;
  const modalEliminar = modal?.tipo === "eliminar" ? modal : null;

  const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
    { id: "flujos", label: "Flujos", icon: Workflow },
    { id: "historial", label: "Historial de ejecuciones", icon: History },
    { id: "conectores", label: "Conectores", icon: Plug },
  ];

  return (
    <AppShell>
      <div className="relative min-h-full overflow-hidden bg-[#faf9ff]">
        <FondoAutomatizaciones />

        <div className="fixed right-4 top-4 z-40 flex items-center gap-2 md:right-6 md:top-5">
          <button
            onClick={() => setModal({ tipo: "form" })}
            className={`${BTN_PRIMARIO} shadow-[0_10px_24px_-10px_rgba(124,58,237,0.72)]`}
          >
            <Plus className="size-4" />
            Nuevo flujo
          </button>
        </div>

        <div
          className="relative mx-auto w-full max-w-[1420px] px-4 py-6 md:px-6 lg:px-8"
          style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif' }}
        >
          {/* ───────────── Encabezado ───────────── */}

          <section className="relative overflow-hidden rounded-[30px] border border-primary/15 bg-gradient-to-br from-white via-white/96 to-primary/[0.045] shadow-[0_20px_55px_-38px_rgba(76,29,149,0.55)] backdrop-blur-md">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary/55 via-primary to-violet-400/55" />
            <div className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-primary/[0.055] blur-2xl" />

            <div className="relative p-5 md:p-7 lg:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-primary/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary shadow-sm">
                  <Sparkles className="size-3.5" />
                  Módulo Avanzada
                </span>

                <span className="rounded-full border border-amber-200/70 bg-amber-50/80 px-3 py-1.5 text-[11px] font-bold text-amber-700 shadow-sm">
                  {activos} {activos === 1 ? "flujo activo" : "flujos activos"}
                </span>
              </div>

              <h1 className="mt-4 text-[34px] font-bold tracking-[-0.035em] text-foreground md:text-[42px]">
                Automatización
              </h1>

              <p className="mt-2.5 max-w-2xl text-[13px] leading-6 text-muted-foreground md:text-sm">
                Flujos automáticos entre Cloud Esther y n8n: recordatorios, notificaciones y tareas
                repetitivas que se disparan solas cuando pasa algo en la clínica.
              </p>

              <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Flujos activos"
                  value={activos}
                  icon={Zap}
                  tone="primary"
                  detail={`de ${automatizaciones.length} en total`}
                />
                <StatCard
                  label="Ejecuciones hoy"
                  value={ejecucionesHoy}
                  icon={CheckCircle2}
                  tone="emerald"
                  detail="sin errores registrados"
                />
                <StatCard
                  label="Conectores activos"
                  value={conectoresActivos}
                  icon={Plug}
                  tone="violet"
                  detail={`de ${conectores.length} disponibles`}
                />
                <StatCard label="Errores" value={0} icon={XCircle} tone="danger" detail="últimas 24hs" />
              </div>

              {/* Tabs */}

              <div className="mt-6 flex flex-wrap gap-1.5 rounded-2xl border border-primary/10 bg-primary/[0.025] p-1.5">
                {TABS.map((t) => {
                  const Icon = t.icon;
                  const activa = t.id === tab;

                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-all duration-200 ${
                        activa
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-primary/8 hover:text-foreground"
                      }`}
                    >
                      <Icon className="size-4" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ───────────── Contenido de cada pestaña ───────────── */}

          <div className="mt-5">
            {tab === "flujos" &&
              (automatizaciones.length === 0 ? (
                <EmptyState
                  icon={Workflow}
                  titulo="Todavía no hay flujos"
                  descripcion="Creá el primero para automatizar una tarea repetitiva de la clínica."
                  accion={
                    <button onClick={() => setModal({ tipo: "form" })} className={BTN_PRIMARIO}>
                      <Plus className="size-4" />
                      Crear primer flujo
                    </button>
                  }
                />
              ) : (
                <ul className="space-y-3">
                  {automatizaciones.map((a) => (
                    <li
                      key={a.id}
                      className="overflow-hidden rounded-[22px] border border-primary/10 bg-white/90 p-4 shadow-[0_12px_32px_-25px_rgba(76,29,149,0.42)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 md:p-[18px]"
                    >
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                          <Workflow className="size-5" />
                        </div>

                        <div className="min-w-[220px] flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold leading-tight">{a.nombre}</p>
                            <BadgeEstadoFlujo estado={a.estado} />
                          </div>

                          <p className="mt-1 text-xs text-muted-foreground">
                            {a.disparador} → {a.accion}
                          </p>

                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <BadgeConector nombre={a.conector} />
                            {a.ultimaEjecucion && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Clock3 className="size-3" />
                                Última: {a.ultimaEjecucion}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="ml-auto flex items-center gap-2.5">
                          <Switch
                            checked={a.estado === "Activa"}
                            onChange={() => alternarEstado(a.id)}
                            label={`Activar o pausar ${a.nombre}`}
                          />

                          <button
                            onClick={() => setModal({ tipo: "form", flujo: a })}
                            aria-label={`Editar ${a.nombre}`}
                            className={BTN_ICONO}
                          >
                            <Pencil className="size-4" />
                          </button>

                          <button
                            onClick={() => setModal({ tipo: "eliminar", flujo: a })}
                            aria-label={`Eliminar ${a.nombre}`}
                            className={BTN_ICONO_PELIGRO}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ))}

            {tab === "historial" && (
              <EmptyState
                icon={History}
                titulo="Historial sin conectar todavía"
                descripcion="Cuando n8n esté conectado de verdad, acá vas a ver cada ejecución con fecha, resultado y detalle."
              />
            )}

            {tab === "conectores" && (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {conectores.map((c) => {
                  const Icon = c.icon;

                  return (
                    <li key={c.id} className={DATO_CARD}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                          <Icon className="size-5" />
                        </div>

                        <Switch
                          checked={c.estado === "Conectado"}
                          onChange={() => alternarConector(c.id)}
                          label={`Conectar ${c.nombre}`}
                        />
                      </div>

                      <p className="mt-3 text-sm font-semibold">{c.nombre}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{c.descripcion}</p>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            c.estado === "Conectado"
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${
                              c.estado === "Conectado" ? "bg-emerald-500" : "bg-muted-foreground/50"
                            }`}
                          />
                          {c.estado}
                        </span>

                        <button
                          onClick={() => show("Configuración no conectada todavía")}
                          className={`${BTN_SECUNDARIO} px-3 py-1.5 text-xs`}
                        >
                          <Settings2 className="size-3.5" />
                          Configurar
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {modalForm && (
        <Modal title={modalForm.flujo ? "Editar flujo" : "Nuevo flujo"} onClose={cerrarModal}>
          <FlujoForm inicial={modalForm.flujo} onSubmit={guardarFlujo} onCancel={cerrarModal} />
        </Modal>
      )}

      {modalEliminar && (
        <Modal title="Eliminar flujo" size="sm" onClose={cerrarModal}>
          <p className="text-sm leading-6 text-muted-foreground">
            ¿Seguro que querés eliminar{" "}
            <span className="font-semibold text-foreground">{modalEliminar.flujo.nombre}</span>? Esta acción no
            se puede deshacer.
          </p>

          <div className="mt-5 flex justify-end gap-3">
            <button onClick={cerrarModal} className={BTN_SECUNDARIO}>
              Cancelar
            </button>
            <button
              onClick={() => eliminarFlujo(modalEliminar.flujo)}
              className="rounded-lg bg-destructive px-3.5 py-1.5 text-[13px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            >
              Eliminar
            </button>
          </div>
        </Modal>
      )}

      {message && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-xl">
          {message}
        </div>
      )}
    </AppShell>
  );
}

function EmptyState({
  icon: Icon,
  titulo,
  descripcion,
  accion,
}: {
  icon: LucideIcon;
  titulo: string;
  descripcion: string;
  accion?: ReactNode;
}) {
  return (
    <div className="rounded-[26px] border border-dashed border-primary/20 bg-white/80 px-6 py-14 text-center shadow-[0_12px_32px_-26px_rgba(124,58,237,0.5)] backdrop-blur-sm">
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="size-6" />
      </div>
      <p className="mt-4 text-sm font-semibold">{titulo}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{descripcion}</p>
      {accion && <div className="mt-5 flex justify-center">{accion}</div>}
    </div>
  );
}

function AutomatizacionPage() {
  return (
    <CloudEstherProvider>
      <AutomatizacionInner />
    </CloudEstherProvider>
  );
}