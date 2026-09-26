import { useMemo, useState, type ReactNode } from "react";
import {
  Workflow,
  Zap,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Clock3,
  CheckCircle2,
  XCircle,
  Plug,
  MessageSquare,
  CalendarDays,
  History,
  Settings2,
  Search,
  Filter,
} from "lucide-react";

import { AppShell } from "@/components/cloud-esther/AppShell";
import { CloudEstherProvider } from "@/lib/cloud-esther/data";
import {
  useAutomatizaciones,
  type Automatizacion,
  type EstadoAutomatizacion,
} from "@/lib/cloud-esther/automatizaciones";

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

type Conector = {
  id: string;
  nombre: string;
  descripcion: string;
  icon: typeof Workflow;
  estado: EstadoConector;
};

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

const ESTHER_CARD =
  "relative overflow-hidden rounded-2xl border border-violet-300/70 bg-[radial-gradient(circle_at_100%_0%,rgba(124,58,237,0.11)_0%,rgba(124,58,237,0.075)_18%,rgba(124,58,237,0)_34%),linear-gradient(135deg,#ffffff_0%,#fdfaff_48%,#f7f1ff_100%)] shadow-[0_2px_10px_rgba(124,58,237,0.08)]";

const ESTHER_CARD_HOVER =
  "transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-400/80 hover:shadow-[0_8px_24px_rgba(124,58,237,0.12)]";

const INPUT =
  "h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100";

export default function Automatizaciones() {
  return (
    <CloudEstherProvider>
      <AutomatizacionesInner />
    </CloudEstherProvider>
  );
}

function AutomatizacionesInner() {
  const { automatizaciones, setAutomatizaciones } = useAutomatizaciones();
  const [conectores, setConectores] = useState<Conector[]>(CONECTORES_INICIALES);
  const [tab, setTab] = useState<Tab>("flujos");
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<"Todos" | EstadoAutomatizacion>("Todos");
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Automatizacion | null>(null);
  const [borrando, setBorrando] = useState<Automatizacion | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [form, setForm] = useState({
    nombre: "",
    disparador: DISPARADORES[0],
    accion: ACCIONES[0],
    conector: CONECTORES_FLUJO[0],
  });

  const showFeedback = (message: string) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(null), 2500);
  };

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return automatizaciones.filter((a) => {
      const matchFiltro = filtro === "Todos" || a.estado === filtro;
      const matchBusqueda =
        !q || a.nombre.toLowerCase().includes(q) || a.disparador.toLowerCase().includes(q);

      return matchFiltro && matchBusqueda;
    });
  }, [automatizaciones, filtro, busqueda]);

  const activos = automatizaciones.filter((a) => a.estado === "Activa").length;
  const ejecucionesHoy = automatizaciones.reduce((acc, a) => acc + a.ejecucionesHoy, 0);
  const conectoresActivos = conectores.filter((c) => c.estado === "Conectado").length;

  const abrirNuevo = () => {
    setEditando(null);
    setForm({
      nombre: "",
      disparador: DISPARADORES[0],
      accion: ACCIONES[0],
      conector: CONECTORES_FLUJO[0],
    });
    setShowModal(true);
  };

  const abrirEditar = (a: Automatizacion) => {
    setEditando(a);
    setForm({ nombre: a.nombre, disparador: a.disparador, accion: a.accion, conector: a.conector });
    setShowModal(true);
  };

  const guardarFlujo = () => {
    if (!form.nombre.trim()) {
      showFeedback("Completá el nombre del flujo");
      return;
    }

    if (editando) {
      setAutomatizaciones((prev) =>
        prev.map((a) => (a.id === editando.id ? { ...a, ...form, nombre: form.nombre.trim() } : a)),
      );
      showFeedback("Flujo actualizado");
    } else {
      setAutomatizaciones((prev) => [
        ...prev,
        {
          id: Date.now(),
          nombre: form.nombre.trim(),
          disparador: form.disparador,
          accion: form.accion,
          conector: form.conector,
          estado: "Activa",
          ejecucionesHoy: 0,
          ultimaEjecucion: "",
        },
      ]);
      showFeedback("Flujo creado");
    }

    setShowModal(false);
  };

  const alternarEstado = (a: Automatizacion) => {
    setAutomatizaciones((prev) =>
      prev.map((x) => (x.id === a.id ? { ...x, estado: x.estado === "Activa" ? "Pausada" : "Activa" } : x)),
    );
    showFeedback(a.estado === "Activa" ? "Flujo pausado" : "Flujo activado");
  };

  const eliminarFlujo = () => {
    if (!borrando) return;
    setAutomatizaciones((prev) => prev.filter((a) => a.id !== borrando.id));
    showFeedback(`"${borrando.nombre}" eliminado`);
    setBorrando(null);
  };

  const alternarConector = (id: string) => {
    setConectores((prev) =>
      prev.map((c) => (c.id === id ? { ...c, estado: c.estado === "Conectado" ? "Desconectado" : "Conectado" } : c)),
    );
  };

  const TABS: { id: Tab; label: string; icon: typeof Workflow }[] = [
    { id: "flujos", label: "Flujos", icon: Workflow },
    { id: "historial", label: "Historial de ejecuciones", icon: History },
    { id: "conectores", label: "Conectores", icon: Plug },
  ];

  return (
    <AppShell>
      <div className="relative min-h-full overflow-hidden bg-[#fbfbfd] text-slate-900 antialiased">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-24 top-0 h-72 w-72 rounded-full bg-violet-200/20 blur-3xl" />
          <div className="absolute left-1/3 top-56 h-56 w-56 rounded-full bg-purple-100/30 blur-3xl" />
        </div>

        <div className="relative mx-auto w-full max-w-[1500px] px-4 py-5 md:px-6 lg:px-8">
          {/* HEADER */}
          <header className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80">
                <Zap size={14} />
                Centro de operaciones
              </div>

              <h1 className="font-display text-3xl font-bold tracking-tight text-slate-950 md:text-[2.1rem]">
                Automatización
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Flujos automáticos entre Cloud Esther y n8n: recordatorios, notificaciones y
                tareas repetitivas que se disparan solas.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={abrirNuevo}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg"
              >
                <Plus size={15} />
                Nuevo flujo
              </button>
            </div>
          </header>

          {/* STATS */}
          <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard icon={<Zap size={17} />} label="Flujos activos" value={activos} accent="default" />
            <StatCard
              icon={<CheckCircle2 size={17} />}
              label="Ejecuciones hoy"
              value={ejecucionesHoy}
              accent="success"
            />
            <StatCard
              icon={<Plug size={17} />}
              label="Conectores activos"
              value={conectoresActivos}
              accent="info"
            />
            <StatCard icon={<XCircle size={17} />} label="Errores (24hs)" value={0} accent="warning" />
          </div>

          {/* TABS */}
          <div className="mb-5 flex flex-wrap gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
            {TABS.map((t) => {
              const Icon = t.icon;
              const activa = t.id === tab;

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-all duration-200 ${
                    activa
                      ? "bg-primary text-white shadow-sm"
                      : "text-slate-500 hover:bg-violet-50/70 hover:text-slate-800"
                  }`}
                >
                  <Icon size={15} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* CONTENIDO */}
          {tab === "flujos" && (
            <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_6px_24px_rgba(51,36,84,0.05)]">
              <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Flujos configurados</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Activá, pausá o editá cada automatización.</p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      placeholder="Buscar flujo..."
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-3 text-xs outline-none transition focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100 sm:w-64"
                    />
                  </div>

                  <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                    <Filter size={14} className="ml-2 text-slate-400" />
                    {(["Todos", "Activa", "Pausada"] as const).map((estado) => (
                      <button
                        key={estado}
                        type="button"
                        onClick={() => setFiltro(estado)}
                        className={`rounded-md px-2.5 py-1.5 text-[10px] font-semibold transition-all ${
                          filtro === estado
                            ? "bg-violet-600 text-white shadow-sm"
                            : "text-slate-500 hover:bg-white hover:text-slate-700"
                        }`}
                      >
                        {estado}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-5">
                {filtrados.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-50 text-violet-500">
                      <Workflow size={20} />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-700">
                      {automatizaciones.length === 0 ? "Todavía no hay flujos" : "No hay flujos que coincidan"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {automatizaciones.length === 0
                        ? "Creá el primero para automatizar una tarea de la clínica."
                        : "Probá cambiar el filtro o la búsqueda."}
                    </p>
                  </div>
                ) : (
                  filtrados.map((a) => (
                    <div key={a.id} className={`${ESTHER_CARD} ${ESTHER_CARD_HOVER} flex items-center gap-4 p-4`}>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                        <Workflow size={18} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-800">{a.nombre}</h3>
                          <EstadoBadge estado={a.estado} />
                        </div>

                        <p className="mt-1 text-xs leading-relaxed text-slate-500">
                          {a.disparador} → {a.accion}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                          <span>{a.conector}</span>
                          {a.ultimaEjecucion && (
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center gap-1">
                                <Clock3 size={11} />
                                {a.ultimaEjecucion}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <ToggleSwitch checked={a.estado === "Activa"} onChange={() => alternarEstado(a)} />

                        <button
                          type="button"
                          onClick={() => abrirEditar(a)}
                          title="Editar"
                          className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-violet-50 hover:text-violet-600"
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setBorrando(a)}
                          title="Eliminar"
                          className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          {tab === "historial" && (
            <section className={`${ESTHER_CARD} p-10 text-center`}>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-50 text-violet-500">
                <History size={20} />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-700">Historial sin conectar todavía</p>
              <p className="mx-auto mt-1 max-w-md text-xs text-slate-400">
                Cuando n8n esté conectado de verdad, acá vas a ver cada ejecución con fecha, resultado y detalle.
              </p>
            </section>
          )}

          {tab === "conectores" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {conectores.map((c) => {
                const Icon = c.icon;

                return (
                  <div key={c.id} className={`${ESTHER_CARD} ${ESTHER_CARD_HOVER} p-4`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                        <Icon size={18} />
                      </div>

                      <ToggleSwitch
                        checked={c.estado === "Conectado"}
                        onChange={() => alternarConector(c.id)}
                      />
                    </div>

                    <p className="mt-3 text-sm font-bold text-slate-800">{c.nombre}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{c.descripcion}</p>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${
                          c.estado === "Conectado"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                            : "border-slate-200 bg-slate-50 text-slate-500"
                        }`}
                      >
                        {c.estado}
                      </span>

                      <button
                        type="button"
                        onClick={() => showFeedback("Configuración no conectada todavía")}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                      >
                        <Settings2 size={13} />
                        Configurar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50/50 px-4 py-3 text-xs text-violet-700">
            <Zap size={15} />
            Los flujos se mantienen durante la sesión en esta versión demo.
          </div>
        </div>

        {/* MODAL NUEVO / EDITAR FLUJO */}
        {showModal && (
          <Modal title={editando ? "Editar flujo" : "Nuevo flujo"} onClose={() => setShowModal(false)}>
            <div className="space-y-4">
              <Field label="Nombre del flujo">
                <input
                  autoFocus
                  value={form.nombre}
                  onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Recordatorio de turno 24hs antes"
                  className={INPUT}
                />
              </Field>

              <Field label="Cuando pasa esto (disparador)">
                <select
                  value={form.disparador}
                  onChange={(e) => setForm((prev) => ({ ...prev, disparador: e.target.value }))}
                  className={INPUT}
                >
                  {DISPARADORES.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </Field>

              <Field label="Hacer esto (acción)">
                <select
                  value={form.accion}
                  onChange={(e) => setForm((prev) => ({ ...prev, accion: e.target.value }))}
                  className={INPUT}
                >
                  {ACCIONES.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </Field>

              <Field label="Conector que lo ejecuta">
                <select
                  value={form.conector}
                  onChange={(e) => setForm((prev) => ({ ...prev, conector: e.target.value }))}
                  className={INPUT}
                >
                  {CONECTORES_FLUJO.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={guardarFlujo}
                  className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-700"
                >
                  <Check size={14} />
                  {editando ? "Guardar cambios" : "Crear flujo"}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* MODAL ELIMINAR */}
        {borrando && (
          <Modal title="Eliminar flujo" onClose={() => setBorrando(null)}>
            <p className="text-sm leading-6 text-slate-600">
              ¿Seguro que querés eliminar <span className="font-semibold text-slate-900">{borrando.nombre}</span>?
              Esta acción no se puede deshacer.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setBorrando(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={eliminarFlujo}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </Modal>
        )}
      </div>

      {feedback && (
        <div className="fixed right-5 top-5 z-[200] flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-xl">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Check size={15} />
          </div>
          {feedback}
        </div>
      )}
    </AppShell>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${
        checked ? "bg-primary" : "bg-slate-200"
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

function EstadoBadge({ estado }: { estado: EstadoAutomatizacion }) {
  const activa = estado === "Activa";
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${
        activa ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-slate-200 bg-slate-50 text-slate-500"
      }`}
    >
      {estado}
    </span>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent = "default",
}: {
  icon: ReactNode;
  label: string;
  value: number;
  accent?: "default" | "warning" | "info" | "success";
}) {
  const iconStyle =
    accent === "warning"
      ? "bg-amber-100 text-amber-600"
      : accent === "info"
        ? "bg-blue-100 text-blue-600"
        : accent === "success"
          ? "bg-emerald-100 text-emerald-600"
          : "bg-violet-100 text-violet-600";

  return (
    <div className={`${ESTHER_CARD} ${ESTHER_CARD_HOVER} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{value}</div>
        </div>

        <div className={`grid size-9 shrink-0 place-items-center rounded-xl ${iconStyle} ring-1 ring-black/[0.03]`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={17} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}