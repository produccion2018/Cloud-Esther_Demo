import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Bell,
  BellRing,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Eye,
  Filter,
  History,
  Loader2,
  Package,
  Search,
  Plus,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import { AppShell } from "@/components/cloud-esther/AppShell";
import { CloudEstherProvider } from "@/lib/cloud-esther/data";

type Estado = "Pendiente" | "Leída" | "Completada";

type Categoria =
  | "Insumos y stock"
  | "Pacientes"
  | "Administrativo"
  | "Equipo";

type Notificacion = {
  id: number;
  titulo: string;
  descripcion: string;
  categoria: Categoria;
  estado: Estado;
  fecha: string;
  hora: string;
  destinatario: string;
  prioridad: "Normal" | "Alta";
};

const INITIAL_NOTIFICACIONES: Notificacion[] = [
  {
    id: 1,
    titulo: "Confirmar turno de mañana",
    descripcion: "María González tiene un turno mañana a las 15:30 hs.",
    categoria: "Pacientes",
    estado: "Pendiente",
    fecha: "23/09/2026",
    hora: "10:30",
    destinatario: "Recepción",
    prioridad: "Alta",
  },
  {
    id: 2,
    titulo: "Avisar resultado de laboratorio",
    descripcion: "El estudio de Carlos Rodríguez ya está disponible.",
    categoria: "Pacientes",
    estado: "Leída",
    fecha: "23/09/2026",
    hora: "09:45",
    destinatario: "Dra. Lucía Ferrer",
    prioridad: "Normal",
  },
  {
    id: 3,
    titulo: "Comprar guantes de látex",
    descripcion: "El stock de guantes está por debajo del mínimo configurado.",
    categoria: "Insumos y stock",
    estado: "Pendiente",
    fecha: "23/09/2026",
    hora: "08:20",
    destinatario: "Administración",
    prioridad: "Alta",
  },
  {
    id: 4,
    titulo: "Revisar pagos pendientes",
    descripcion: "Hay pagos de pacientes pendientes de conciliación.",
    categoria: "Administrativo",
    estado: "Pendiente",
    fecha: "22/09/2026",
    hora: "17:15",
    destinatario: "Administración",
    prioridad: "Normal",
  },
  {
    id: 5,
    titulo: "Actualizar planilla de turnos",
    descripcion: "La agenda requiere una revisión de horarios.",
    categoria: "Administrativo",
    estado: "Completada",
    fecha: "22/09/2026",
    hora: "15:10",
    destinatario: "Recepción",
    prioridad: "Normal",
  },
];

const ESTHER_CARD =
  "relative overflow-hidden rounded-2xl border border-violet-300/70 bg-[radial-gradient(circle_at_100%_0%,rgba(124,58,237,0.11)_0%,rgba(124,58,237,0.075)_18%,rgba(124,58,237,0)_34%),linear-gradient(135deg,#ffffff_0%,#fdfaff_48%,#f7f1ff_100%)] shadow-[0_2px_10px_rgba(124,58,237,0.08)]";

const ESTHER_CARD_HOVER =
  "transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-400/80 hover:shadow-[0_8px_24px_rgba(124,58,237,0.12)]";

const QUICK_TEMPLATES = [
  {
    id: 1,
    category: "Insumos y stock" as Categoria,
    icon: Package,
    items: [
      "Comprar guantes de látex",
      "Reponer anestesia local",
      "Pedir material de ortodoncia",
    ],
  },
  {
    id: 2,
    category: "Pacientes" as Categoria,
    icon: UserRound,
    items: [
      "Confirmar turno de mañana",
      "Avisar resultado de laboratorio",
      "Recordar indicaciones post-tratamiento",
    ],
  },
  {
    id: 3,
    category: "Administrativo" as Categoria,
    icon: ClipboardList,
    items: [
      "Revisar pagos pendientes",
      "Enviar factura a paciente",
      "Actualizar planilla de turnos",
    ],
  },
];

export default function Notificaciones() {
  return (
    <CloudEstherProvider>
      <NotificacionesInner />
    </CloudEstherProvider>
  );
}

function NotificacionesInner() {
  const [notificaciones, setNotificaciones] = useState(
    INITIAL_NOTIFICACIONES,
  );

  const [filtro, setFiltro] = useState<"Todas" | Estado>("Todas");

  const [busqueda, setBusqueda] = useState("");

  const [showModal, setShowModal] = useState(false);

  const [showAudit, setShowAudit] = useState(false);

  const [feedback, setFeedback] = useState<string | null>(null);

  const [savingTemplate, setSavingTemplate] = useState<string | null>(null);

  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    categoria: "Pacientes" as Categoria,
    destinatario: "Recepción",
    prioridad: "Normal" as "Normal" | "Alta",
    fecha: "23/09/2026",
    hora: "12:00",
  });

  const showFeedback = (message: string) => {
    setFeedback(message);

    window.setTimeout(() => {
      setFeedback(null);
    }, 2500);
  };

  const filteredNotifications = useMemo(() => {
    const query = busqueda.trim().toLowerCase();

    return notificaciones.filter((item) => {
      const matchesFilter = filtro === "Todas" || item.estado === filtro;

      const matchesSearch =
        !query ||
        item.titulo.toLowerCase().includes(query) ||
        item.descripcion.toLowerCase().includes(query) ||
        item.destinatario.toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [notificaciones, filtro, busqueda]);

  const pendientes = notificaciones.filter(
    (item) => item.estado === "Pendiente",
  ).length;

  const leidas = notificaciones.filter(
    (item) => item.estado === "Leída",
  ).length;

  const completadas = notificaciones.filter(
    (item) => item.estado === "Completada",
  ).length;

  const createNotification = () => {
    if (!form.titulo.trim()) {
      showFeedback("Completá el título de la notificación");
      return;
    }

    const nueva: Notificacion = {
      id: Date.now(),
      titulo: form.titulo.trim(),
      descripcion:
        form.descripcion.trim() || "Notificación creada manualmente.",
      categoria: form.categoria,
      estado: "Pendiente",
      fecha: form.fecha,
      hora: form.hora,
      destinatario: form.destinatario,
      prioridad: form.prioridad,
    };

    setNotificaciones((prev) => [nueva, ...prev]);

    setForm({
      titulo: "",
      descripcion: "",
      categoria: "Pacientes",
      destinatario: "Recepción",
      prioridad: "Normal",
      fecha: "23/09/2026",
      hora: "12:00",
    });

    setShowModal(false);

    showFeedback("Notificación guardada correctamente");
  };

  const createFromTemplate = (category: Categoria, title: string) => {
    // Evita doble click mientras "guarda"
    if (savingTemplate) return;

    setSavingTemplate(title);

    // TODO: acá va el guardado real contra el backend (fetch/mutate).
    // Por ahora se simula la espera de una llamada al servidor.
    window.setTimeout(() => {
      const nueva: Notificacion = {
        id: Date.now(),
        titulo: title,
        descripcion:
          category === "Pacientes"
            ? "Acción pendiente relacionada con un paciente."
            : category === "Insumos y stock"
              ? "Revisar stock y realizar la acción correspondiente."
              : "Tarea administrativa pendiente de revisión.",
        categoria: category,
        estado: "Pendiente",
        fecha: "23/09/2026",
        hora: new Date().toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        destinatario:
          category === "Pacientes" ? "Recepción" : "Administración",
        prioridad: category === "Insumos y stock" ? "Alta" : "Normal",
      };

      setNotificaciones((prev) => [nueva, ...prev]);

      setSavingTemplate(null);

      showFeedback("Notificación guardada");
    }, 700);
  };

  const updateStatus = (id: number, estado: Estado) => {
    setNotificaciones((prev) =>
      prev.map((item) => (item.id === id ? { ...item, estado } : item)),
    );

    if (estado === "Completada") {
      showFeedback("Notificación completada");
    } else if (estado === "Leída") {
      showFeedback("Notificación marcada como leída");
    }
  };

  const deleteNotification = (id: number) => {
    setNotificaciones((prev) => prev.filter((item) => item.id !== id));

    showFeedback("Notificación eliminada");
  };

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
                <BellRing size={14} />
                Centro de operaciones
              </div>

              <h1 className="font-display text-3xl font-bold tracking-tight text-slate-950 md:text-[2.1rem]">
                Notificaciones
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Recordatorios para tu equipo y alertas automáticas para tus
                pacientes.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowAudit(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:bg-violet-50/40 hover:shadow-md"
              >
                <History size={15} />
                Auditoría
              </button>

              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg"
              >
                <Plus size={15} />
                Nueva notificación
              </button>
            </div>
          </header>

          {/* QUICK TEMPLATES */}
          <section className={`mb-6 ${ESTHER_CARD} p-5`}>
            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-900">
                Plantillas rápidas
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Creá una notificación con un solo clic.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {QUICK_TEMPLATES.map((group) => {
                const Icon = group.icon;

                return (
                  <div key={group.category}>
                    <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary/80">
                      <Icon size={14} />
                      {group.category}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {group.items.map((item) => {
                        const isSaving = savingTemplate === item;

                        return (
                          <button
                            key={item}
                            type="button"
                            disabled={isSaving}
                            onClick={() =>
                              createFromTemplate(group.category, item)
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50/70 hover:text-violet-700 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
                          >
                            {isSaving && (
                              <Loader2
                                size={11}
                                className="animate-spin text-violet-500"
                              />
                            )}
                            {isSaving ? "Guardando..." : item}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* STATS */}
          <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard icon={<Bell size={17} />} label="Total" value={notificaciones.length} />

            <StatCard
              icon={<Clock3 size={17} />}
              label="Pendientes"
              value={pendientes}
              accent="warning"
            />

            <StatCard
              icon={<Eye size={17} />}
              label="Leídas"
              value={leidas}
              accent="info"
            />

            <StatCard
              icon={<CheckCircle2 size={17} />}
              label="Completadas"
              value={completadas}
              accent="success"
            />
          </div>

          {/* MAIN CARD */}
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_6px_24px_rgba(51,36,84,0.05)]">
            {/* TOOLBAR */}
            <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Centro de notificaciones
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Gestioná los avisos y tareas pendientes.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar notificación..."
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-3 text-xs outline-none transition focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100 sm:w-64"
                  />
                </div>

                <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                  <Filter size={14} className="ml-2 text-slate-400" />

                  {(["Todas", "Pendiente", "Leída", "Completada"] as const).map(
                    (estado) => (
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
                    ),
                  )}
                </div>
              </div>
            </div>

            {/* LIST */}
            <div>
              {filteredNotifications.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-50 text-violet-500">
                    <Bell size={20} />
                  </div>

                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    No hay notificaciones
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Probá cambiar el filtro o crear una nueva.
                  </p>
                </div>
              ) : (
                filteredNotifications.map((notification) => (
                  <NotificationRow
                    key={notification.id}
                    notification={notification}
                    onRead={() => updateStatus(notification.id, "Leída")}
                    onComplete={() =>
                      updateStatus(notification.id, "Completada")
                    }
                    onDelete={() => deleteNotification(notification.id)}
                  />
                ))
              )}
            </div>
          </section>

          {/* FOOTER INFO */}
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50/50 px-4 py-3 text-xs text-violet-700">
            <Bell size={15} />
            Las notificaciones se mantienen durante la sesión en esta versión
            demo.
          </div>
        </div>

        {/* MODAL NUEVA NOTIFICACIÓN */}
        {showModal && (
          <Modal title="Nueva notificación" onClose={() => setShowModal(false)}>
            <div className="space-y-4">
              <Field label="Título">
                <input
                  value={form.titulo}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, titulo: e.target.value }))
                  }
                  placeholder="Ej. Confirmar turno de mañana"
                  className={INPUT}
                  autoFocus
                />
              </Field>

              <Field label="Descripción">
                <textarea
                  value={form.descripcion}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      descripcion: e.target.value,
                    }))
                  }
                  placeholder="Escribí qué debe hacerse..."
                  rows={3}
                  className={`${INPUT} resize-none py-2.5`}
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Categoría">
                  <select
                    value={form.categoria}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        categoria: e.target.value as Categoria,
                      }))
                    }
                    className={INPUT}
                  >
                    <option>Pacientes</option>
                    <option>Insumos y stock</option>
                    <option>Administrativo</option>
                    <option>Equipo</option>
                  </select>
                </Field>

                <Field label="Destinatario">
                  <select
                    value={form.destinatario}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        destinatario: e.target.value,
                      }))
                    }
                    className={INPUT}
                  >
                    <option>Recepción</option>
                    <option>Administración</option>
                    <option>Dra. Lucía Ferrer</option>
                    <option>Todo el equipo</option>
                  </select>
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Fecha">
                  <input
                    type="date"
                    value={toInputDate(form.fecha)}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        fecha: formatDate(e.target.value),
                      }))
                    }
                    className={INPUT}
                  />
                </Field>

                <Field label="Hora">
                  <input
                    type="time"
                    value={form.hora}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, hora: e.target.value }))
                    }
                    className={INPUT}
                  />
                </Field>
              </div>

              <Field label="Prioridad">
                <div className="flex gap-2">
                  {(["Normal", "Alta"] as const).map((priority) => (
                    <button
                      key={priority}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, prioridad: priority }))
                      }
                      className={`rounded-lg border px-4 py-2 text-xs font-semibold transition-all ${
                        form.prioridad === priority
                          ? priority === "Alta"
                            ? "border-red-200 bg-red-50 text-red-600"
                            : "border-violet-200 bg-violet-50 text-violet-600"
                          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {priority}
                    </button>
                  ))}
                </div>
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
                  onClick={createNotification}
                  className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-700"
                >
                  <Check size={14} />
                  Guardar notificación
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* MODAL AUDITORÍA */}
        {showAudit && (
          <Modal title="Auditoría" onClose={() => setShowAudit(false)}>
            <div className="space-y-2">
              {notificaciones.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                    <History size={14} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-700">
                      {item.titulo}
                    </p>

                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {item.fecha} · {item.hora} · {item.destinatario}
                    </p>
                  </div>

                  <StatusBadge estado={item.estado} />
                </div>
              ))}
            </div>
          </Modal>
        )}
      </div>

      {/* FEEDBACK */}
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

function NotificationRow({
  notification,
  onRead,
  onComplete,
  onDelete,
}: {
  notification: Notificacion;
  onRead: () => void;
  onComplete: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`${ESTHER_CARD} ${ESTHER_CARD_HOVER} group p-4`}>
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          notification.prioridad === "Alta"
            ? "bg-red-50 text-red-500"
            : "bg-violet-100 text-violet-600"
        }`}
      >
        {notification.prioridad === "Alta" ? (
          <AlertTriangle size={18} />
        ) : (
          <Bell size={18} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-bold text-slate-800">
            {notification.titulo}
          </h3>

          <StatusBadge estado={notification.estado} />

          {notification.prioridad === "Alta" && (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-bold text-red-600">
              Alta prioridad
            </span>
          )}
        </div>

        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          {notification.descripcion}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
          <span>{notification.categoria}</span>
          <span>•</span>
          <span>
            {notification.fecha} · {notification.hora}
          </span>
          <span>•</span>
          <span>{notification.destinatario}</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {notification.estado === "Pendiente" && (
          <>
            <button
              type="button"
              onClick={onRead}
              title="Marcar como leída"
              className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-violet-50 hover:text-violet-600"
            >
              <Eye size={15} />
            </button>

            <button
              type="button"
              onClick={onComplete}
              title="Completar"
              className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600"
            >
              <Check size={15} />
            </button>
          </>
        )}

        {notification.estado === "Leída" && (
          <button
            type="button"
            onClick={onComplete}
            title="Completar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-emerald-100 hover:text-emerald-600"
          >
            <Check size={15} />
          </button>
        )}

        <button
          type="button"
          onClick={onDelete}
          title="Eliminar"
          className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ estado }: { estado: Estado }) {
  const styles =
    estado === "Pendiente"
      ? "bg-amber-50 text-amber-600 border-amber-200"
      : estado === "Leída"
        ? "bg-blue-50 text-blue-600 border-blue-200"
        : "bg-emerald-50 text-emerald-600 border-emerald-200";

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${styles}`}>
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
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            {label}
          </div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
            {value}
          </div>
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
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">
        {label}
      </span>

      {children}
    </label>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
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

const INPUT =
  "h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100";

function toInputDate(value: string) {
  const [day, month, year] = value.split("/");

  if (!day || !month || !year) {
    return "2026-09-23";
  }

  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  if (!value) return "";

  const [year, month, day] = value.split("-");

  return `${day}/${month}/${year}`;
}