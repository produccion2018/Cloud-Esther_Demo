import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ChevronRight,
  ClipboardList,
  Eye,
  Facebook,
  Gift,
  Instagram,
  Mail,
  Megaphone,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Send,
  Settings2,
  Target,
  TrendingUp,
  Users,
  UserPlus,
  X,
} from "lucide-react";

type Canal = "WhatsApp" | "Correo" | "Instagram" | "Facebook";

type EstadoCampania = "Activa" | "Programada" | "Finalizada" | "Pausada";

type Campania = {
  id: number;
  nombre: string;
  canal: Canal;
  estado: EstadoCampania;
  audiencia: string;
  alcanzados: number;
  conversiones: number;
  fecha: string;
};

type Lead = {
  id: number;
  nombre: string;
  origen: string;
  interes: string;
  estado: "Nuevo" | "Contactado" | "Convertido" | "Sin respuesta";
  fecha: string;
};

type Promocion = {
  id: number;
  nombre: string;
  descripcion: string;
  vigencia: string;
  usos: number;
  activa: boolean;
};

const STORAGE_CAMPANIAS = "cloud-esther-marketing-campanias";
const STORAGE_LEADS = "cloud-esther-marketing-leads";
const STORAGE_PROMOS = "cloud-esther-marketing-promos";

const CAMPANIAS_INICIALES: Campania[] = [
  {
    id: 1,
    nombre: "Reactivación pacientes inactivos",
    canal: "WhatsApp",
    estado: "Activa",
    audiencia: "Pacientes sin visita en 6 meses",
    alcanzados: 412,
    conversiones: 58,
    fecha: "23/09/2026",
  },
  {
    id: 2,
    nombre: "Revisión anual de higiene",
    canal: "Correo",
    estado: "Activa",
    audiencia: "Pacientes con control pendiente",
    alcanzados: 690,
    conversiones: 141,
    fecha: "22/09/2026",
  },
  {
    id: 3,
    nombre: "Promoción blanqueamiento",
    canal: "Instagram",
    estado: "Programada",
    audiencia: "Pacientes interesados en estética",
    alcanzados: 0,
    conversiones: 0,
    fecha: "28/09/2026",
  },
  {
    id: 4,
    nombre: "Seguimiento presupuestos",
    canal: "WhatsApp",
    estado: "Finalizada",
    audiencia: "Presupuestos sin aceptar",
    alcanzados: 287,
    conversiones: 64,
    fecha: "18/09/2026",
  },
];

const LEADS_INICIALES: Lead[] = [
  {
    id: 1,
    nombre: "María González",
    origen: "Instagram",
    interes: "Blanqueamiento",
    estado: "Nuevo",
    fecha: "23/09/2026",
  },
  {
    id: 2,
    nombre: "Carlos Fernández",
    origen: "WhatsApp",
    interes: "Implantes",
    estado: "Contactado",
    fecha: "23/09/2026",
  },
  {
    id: 3,
    nombre: "Luciana Pérez",
    origen: "Google",
    interes: "Ortodoncia",
    estado: "Convertido",
    fecha: "22/09/2026",
  },
  {
    id: 4,
    nombre: "Diego Martínez",
    origen: "Facebook",
    interes: "Limpieza",
    estado: "Sin respuesta",
    fecha: "21/09/2026",
  },
];

const PROMOS_INICIALES: Promocion[] = [
  {
    id: 1,
    nombre: "Blanqueamiento de primavera",
    descripcion: "20% de descuento en blanqueamiento dental.",
    vigencia: "30/09/2026",
    usos: 38,
    activa: true,
  },
  {
    id: 2,
    nombre: "Control + limpieza",
    descripcion: "Consulta y limpieza con precio promocional.",
    vigencia: "15/10/2026",
    usos: 24,
    activa: true,
  },
  {
    id: 3,
    nombre: "Plan familiar",
    descripcion: "Beneficio especial para grupos familiares.",
    vigencia: "31/10/2026",
    usos: 12,
    activa: false,
  },
];

const CARD =
  "rounded-2xl border border-primary/20 bg-card/90 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/45 hover:shadow-lg hover:shadow-primary/10";

const BUTTON_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 active:translate-y-0";

const BUTTON_SECONDARY =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background/80 px-4 py-2 text-sm font-medium shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:shadow-md";

const INPUT =
  "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20";

function load<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Si el navegador bloquea el almacenamiento, la app sigue funcionando.
  }
}

// El <input type="date"> devuelve "2026-09-28"; lo mostramos como "28/09/2026".
function formatearFecha(iso: string) {
  if (!iso) return "Sin fecha";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function hoy() {
  return new Date().toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function canalIcon(canal: Canal) {
  if (canal === "WhatsApp") return MessageCircle;
  if (canal === "Correo") return Mail;
  if (canal === "Instagram") return Instagram;
  return Facebook;
}

function canalStyle(canal: Canal) {
  if (canal === "WhatsApp")
    return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
  if (canal === "Correo")
    return "bg-sky-500/10 text-sky-700 border-sky-500/20";
  if (canal === "Instagram")
    return "bg-pink-500/10 text-pink-700 border-pink-500/20";
  return "bg-blue-500/10 text-blue-700 border-blue-500/20";
}

function estadoStyle(estado: Campania["estado"]) {
  if (estado === "Activa")
    return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
  if (estado === "Programada")
    return "bg-primary/10 text-primary border-primary/20";
  if (estado === "Pausada")
    return "bg-amber-500/10 text-amber-700 border-amber-500/20";
  return "bg-muted text-muted-foreground border-border";
}

function estadoLeadStyle(estado: Lead["estado"]) {
  if (estado === "Convertido")
    return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
  if (estado === "Contactado")
    return "bg-primary/10 text-primary border-primary/20";
  if (estado === "Nuevo")
    return "bg-sky-500/10 text-sky-700 border-sky-500/20";
  return "bg-muted text-muted-foreground border-border";
}

function FondoMarketing() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-background/70 to-primary/[0.03]" />

      <div className="absolute -right-24 -top-24 size-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-40 -left-24 size-[30rem] rounded-full bg-primary/5 blur-3xl" />

      <div className="absolute right-12 top-8 opacity-[0.045]">
        <Megaphone className="size-72" />
      </div>

      <div className="absolute left-1/3 top-20 opacity-[0.035]">
        <Target className="size-40" />
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className={`${CARD} p-4`}>
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/10">
          <Icon className="size-5" />
        </span>

        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-0.5 text-xl font-bold text-foreground">{value}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function SaveIcon() {
  return <ClipboardList className="size-4" />;
}

export default function Marketing() {
  const [tab, setTab] = useState<
    "resumen" | "campanias" | "leads" | "promociones"
  >("resumen");

  // Se arranca siempre con los datos de ejemplo (igual en servidor y cliente)
  // y después de montar se leen los datos guardados. Así se evita el error
  // de hidratación que aparece al leer localStorage en el primer render.
  const [campanias, setCampanias] = useState<Campania[]>(CAMPANIAS_INICIALES);
  const [leads, setLeads] = useState<Lead[]>(LEADS_INICIALES);
  const [promos, setPromos] = useState<Promocion[]>(PROMOS_INICIALES);

  useEffect(() => {
    setCampanias(load(STORAGE_CAMPANIAS, CAMPANIAS_INICIALES));
    setLeads(load(STORAGE_LEADS, LEADS_INICIALES));
    setPromos(load(STORAGE_PROMOS, PROMOS_INICIALES));
  }, []);

  const [busqueda, setBusqueda] = useState("");
  const [modal, setModal] = useState<"campania" | "lead" | "promo" | null>(
    null,
  );

  const [mensaje, setMensaje] = useState("");

  const [nuevaCampania, setNuevaCampania] = useState({
    nombre: "",
    canal: "WhatsApp" as Canal,
    audiencia: "",
    fecha: "",
  });

  const [nuevoLead, setNuevoLead] = useState({
    nombre: "",
    origen: "WhatsApp",
    interes: "",
  });

  const [nuevaPromo, setNuevaPromo] = useState({
    nombre: "",
    descripcion: "",
    vigencia: "",
  });

  const mostrarMensaje = (texto: string) => {
    setMensaje(texto);
    window.setTimeout(() => setMensaje(""), 2200);
  };

  const totalAlcanzados = campanias.reduce(
    (sum, item) => sum + item.alcanzados,
    0,
  );

  const totalConversiones = campanias.reduce(
    (sum, item) => sum + item.conversiones,
    0,
  );

  const tasaConversion =
    totalAlcanzados > 0
      ? Math.round((totalConversiones / totalAlcanzados) * 100)
      : 0;

  const leadsNuevos = leads.filter((l) => l.estado === "Nuevo").length;

  const campaniasFiltradas = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return campanias;

    return campanias.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.audiencia.toLowerCase().includes(q) ||
        c.canal.toLowerCase().includes(q),
    );
  }, [campanias, busqueda]);

  const leadsFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return leads;

    return leads.filter(
      (l) =>
        l.nombre.toLowerCase().includes(q) ||
        l.origen.toLowerCase().includes(q) ||
        l.interes.toLowerCase().includes(q),
    );
  }, [leads, busqueda]);

  const guardarCampania = () => {
    if (!nuevaCampania.nombre.trim()) return;

    const nueva: Campania = {
      id: Date.now(),
      nombre: nuevaCampania.nombre,
      canal: nuevaCampania.canal,
      audiencia: nuevaCampania.audiencia || "Audiencia general",
      estado: "Programada",
      alcanzados: 0,
      conversiones: 0,
      fecha: formatearFecha(nuevaCampania.fecha),
    };

    const actualizado = [nueva, ...campanias];
    setCampanias(actualizado);
    save(STORAGE_CAMPANIAS, actualizado);

    setNuevaCampania({
      nombre: "",
      canal: "WhatsApp",
      audiencia: "",
      fecha: "",
    });

    setModal(null);
    mostrarMensaje("Campaña guardada");
  };

  const guardarLead = () => {
    if (!nuevoLead.nombre.trim()) return;

    const nuevo: Lead = {
      id: Date.now(),
      nombre: nuevoLead.nombre,
      origen: nuevoLead.origen,
      interes: nuevoLead.interes || "Consulta general",
      estado: "Nuevo",
      fecha: hoy(),
    };

    const actualizado = [nuevo, ...leads];
    setLeads(actualizado);
    save(STORAGE_LEADS, actualizado);

    setNuevoLead({
      nombre: "",
      origen: "WhatsApp",
      interes: "",
    });

    setModal(null);
    mostrarMensaje("Lead guardado");
  };

  const guardarPromo = () => {
    if (!nuevaPromo.nombre.trim()) return;

    const nueva: Promocion = {
      id: Date.now(),
      nombre: nuevaPromo.nombre,
      descripcion: nuevaPromo.descripcion || "Promoción de la clínica",
      vigencia: nuevaPromo.vigencia || "Sin fecha",
      usos: 0,
      activa: true,
    };

    const actualizado = [nueva, ...promos];
    setPromos(actualizado);
    save(STORAGE_PROMOS, actualizado);

    setNuevaPromo({
      nombre: "",
      descripcion: "",
      vigencia: "",
    });

    setModal(null);
    mostrarMensaje("Promoción guardada");
  };

  const cambiarEstadoCampania = (id: number) => {
    // Tipado explícito: sin esto TypeScript infiere `estado: string`
    // y marca error al hacer setCampanias(actualizado).
    const actualizado: Campania[] = campanias.map((c) => {
      if (c.id !== id) return c;
      const estado: EstadoCampania =
        c.estado === "Activa" ? "Pausada" : "Activa";
      return { ...c, estado };
    });

    setCampanias(actualizado);
    save(STORAGE_CAMPANIAS, actualizado);
    mostrarMensaje("Estado actualizado");
  };

  const cambiarEstadoPromo = (id: number) => {
    const actualizado = promos.map((p) =>
      p.id === id ? { ...p, activa: !p.activa } : p,
    );

    setPromos(actualizado);
    save(STORAGE_PROMOS, actualizado);
    mostrarMensaje("Promoción actualizada");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <FondoMarketing />

      <div className="relative z-10 p-4 md:p-6">
        {/* ENCABEZADO */}
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Megaphone className="size-5" />
              </span>

              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Marketing y captación
                </h1>

                <p className="text-sm text-muted-foreground">
                  Captá nuevos pacientes, activá campañas y medí tus resultados.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={BUTTON_SECONDARY}
              onClick={() => mostrarMensaje("Configuración guardada")}
            >
              <Settings2 className="size-4" />
              Configuración
            </button>

            <button
              type="button"
              className={BUTTON_PRIMARY}
              onClick={() => setModal("campania")}
            >
              <Plus className="size-4" />
              Nueva campaña
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="mb-5 flex flex-wrap gap-1 rounded-2xl border border-border/70 bg-background/70 p-1.5 shadow-sm backdrop-blur">
          {[
            ["resumen", "Resumen"],
            ["campanias", "Campañas"],
            ["leads", "Leads"],
            ["promociones", "Promociones"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setTab(value as typeof tab);
                setBusqueda("");
              }}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                tab === value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* RESUMEN */}
        {tab === "resumen" && (
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon={Users}
                label="Pacientes alcanzados"
                value={totalAlcanzados.toLocaleString("es-AR")}
                detail="En todas las campañas"
              />

              <StatCard
                icon={UserPlus}
                label="Leads"
                value={leads.length.toString()}
                detail={`${leadsNuevos} nuevos`}
              />

              <StatCard
                icon={TrendingUp}
                label="Conversiones"
                value={totalConversiones.toString()}
                detail="Citas generadas"
              />

              <StatCard
                icon={Target}
                label="Conversión"
                value={`${tasaConversion}%`}
                detail="Sobre pacientes alcanzados"
              />
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
              <section className={`${CARD} overflow-hidden`}>
                <div className="flex items-center justify-between border-b border-border/70 p-4">
                  <div>
                    <h2 className="font-semibold">Campañas activas</h2>
                    <p className="text-xs text-muted-foreground">
                      Seguimiento de las acciones actuales.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="text-xs font-semibold text-primary hover:underline"
                    onClick={() => setTab("campanias")}
                  >
                    Ver todas
                  </button>
                </div>

                <div className="divide-y divide-border/60">
                  {campanias
                    .filter((c) => c.estado === "Activa")
                    .slice(0, 4)
                    .map((campania) => {
                      const Icon = canalIcon(campania.canal);

                      return (
                        <div
                          key={campania.id}
                          className="flex items-center gap-3 p-4 transition-colors hover:bg-primary/[0.025]"
                        >
                          <span
                            className={`grid size-10 shrink-0 place-items-center rounded-xl border ${canalStyle(
                              campania.canal,
                            )}`}
                          >
                            <Icon className="size-4" />
                          </span>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">
                              {campania.nombre}
                            </p>

                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {campania.audiencia}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-sm font-bold">
                              {campania.alcanzados.toLocaleString("es-AR")}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              alcanzados
                            </p>
                          </div>

                          <ChevronRight className="size-4 text-muted-foreground" />
                        </div>
                      );
                    })}
                </div>
              </section>

              <section className={`${CARD} p-5`}>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">Fuentes de captación</h2>
                    <p className="text-xs text-muted-foreground">
                      De dónde están llegando tus pacientes.
                    </p>
                  </div>

                  <BarChart3 className="size-5 text-primary" />
                </div>

                <div className="space-y-4">
                  {[
                    ["Instagram", 42],
                    ["WhatsApp", 31],
                    ["Google", 18],
                    ["Facebook", 9],
                  ].map(([nombre, porcentaje]) => (
                    <div key={nombre}>
                      <div className="mb-1.5 flex justify-between text-xs">
                        <span>{nombre}</span>
                        <span className="font-semibold">{porcentaje}%</span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${porcentaje}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <section className={`${CARD} p-5`}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">Acciones rápidas</h2>
                  <p className="text-xs text-muted-foreground">
                    Creá contenido de marketing sin salir del módulo.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    icon: Megaphone,
                    title: "Nueva campaña",
                    text: "Crear una campaña para pacientes.",
                    action: () => setModal("campania"),
                  },
                  {
                    icon: UserPlus,
                    title: "Nuevo lead",
                    text: "Registrar una oportunidad.",
                    action: () => setModal("lead"),
                  },
                  {
                    icon: Gift,
                    title: "Nueva promoción",
                    text: "Crear una oferta para pacientes.",
                    action: () => setModal("promo"),
                  },
                  {
                    icon: Send,
                    title: "Enviar campaña",
                    text: "Preparar una comunicación.",
                    action: () => mostrarMensaje("Campaña preparada"),
                  },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.title}
                      type="button"
                      onClick={item.action}
                      className={`${CARD} group p-4 text-left`}
                    >
                      <span className="mb-3 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
                        <Icon className="size-5" />
                      </span>

                      <p className="text-sm font-semibold">{item.title}</p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.text}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* CAMPAÑAS */}
        {tab === "campanias" && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Campañas</h2>
                <p className="text-xs text-muted-foreground">
                  Creá, pausá y seguí tus acciones de captación.
                </p>
              </div>

              <div className="flex gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar campaña..."
                    className={`${INPUT} pl-9`}
                  />
                </div>

                <button
                  type="button"
                  className={BUTTON_PRIMARY}
                  onClick={() => setModal("campania")}
                >
                  <Plus className="size-4" />
                  Nueva
                </button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {campaniasFiltradas.map((campania) => {
                const Icon = canalIcon(campania.canal);

                return (
                  <article
                    key={campania.id}
                    className={`${CARD} overflow-hidden`}
                  >
                    <div className="p-5">
                      <div className="flex items-start gap-3">
                        <span
                          className={`grid size-11 shrink-0 place-items-center rounded-xl border ${canalStyle(
                            campania.canal,
                          )}`}
                        >
                          <Icon className="size-5" />
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="text-sm font-semibold">
                                {campania.nombre}
                              </h3>

                              <p className="mt-1 text-xs text-muted-foreground">
                                {campania.audiencia}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                mostrarMensaje("Opciones de campaña")
                              }
                              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                              <MoreHorizontal className="size-4" />
                            </button>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${estadoStyle(
                                campania.estado,
                              )}`}
                            >
                              {campania.estado}
                            </span>

                            <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                              {campania.canal}
                            </span>

                            <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                              {campania.fecha}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-3 gap-2">
                        <div className="rounded-xl bg-muted/50 p-3">
                          <p className="text-[10px] text-muted-foreground">
                            Alcanzados
                          </p>
                          <p className="mt-1 text-lg font-bold">
                            {campania.alcanzados.toLocaleString("es-AR")}
                          </p>
                        </div>

                        <div className="rounded-xl bg-muted/50 p-3">
                          <p className="text-[10px] text-muted-foreground">
                            Conversiones
                          </p>
                          <p className="mt-1 text-lg font-bold text-emerald-600">
                            {campania.conversiones}
                          </p>
                        </div>

                        <div className="rounded-xl bg-muted/50 p-3">
                          <p className="text-[10px] text-muted-foreground">
                            Conversión
                          </p>
                          <p className="mt-1 text-lg font-bold">
                            {campania.alcanzados
                              ? Math.round(
                                  (campania.conversiones /
                                    campania.alcanzados) *
                                    100,
                                )
                              : 0}
                            %
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 border-t border-border/60 bg-muted/10 p-3">
                      <button
                        type="button"
                        className={BUTTON_SECONDARY}
                        onClick={() =>
                          mostrarMensaje(`Detalle: ${campania.nombre}`)
                        }
                      >
                        <Eye className="size-4" />
                        Ver detalle
                      </button>

                      <button
                        type="button"
                        className={BUTTON_SECONDARY}
                        onClick={() => cambiarEstadoCampania(campania.id)}
                      >
                        {campania.estado === "Activa" ? "Pausar" : "Activar"}
                      </button>

                      <button
                        type="button"
                        className="ml-auto inline-flex items-center justify-center rounded-xl border border-border p-2 transition-all hover:border-primary/40 hover:bg-primary/5"
                        onClick={() => mostrarMensaje("Editar campaña")}
                      >
                        <Pencil className="size-4" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {/* LEADS */}
        {tab === "leads" && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Leads y oportunidades</h2>
                <p className="text-xs text-muted-foreground">
                  Registrá y seguí posibles nuevos pacientes.
                </p>
              </div>

              <div className="flex gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar lead..."
                    className={`${INPUT} pl-9`}
                  />
                </div>

                <button
                  type="button"
                  className={BUTTON_PRIMARY}
                  onClick={() => setModal("lead")}
                >
                  <Plus className="size-4" />
                  Nuevo
                </button>
              </div>
            </div>

            <div className={`${CARD} overflow-hidden`}>
              <div className="divide-y divide-border/60">
                {leadsFiltrados.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex flex-col gap-3 p-4 transition-colors hover:bg-primary/[0.025] sm:flex-row sm:items-center"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {lead.nombre
                        .split(" ")
                        .slice(0, 2)
                        .map((x) => x[0])
                        .join("")}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{lead.nombre}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Interés: {lead.interes}
                      </p>
                    </div>

                    <span className="rounded-full border border-border px-2.5 py-1 text-[10px]">
                      {lead.origen}
                    </span>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${estadoLeadStyle(
                        lead.estado,
                      )}`}
                    >
                      {lead.estado}
                    </span>

                    <span className="text-xs text-muted-foreground">
                      {lead.fecha}
                    </span>

                    <button
                      type="button"
                      className="rounded-xl border border-border p-2 transition-all hover:border-primary/40 hover:bg-primary/5"
                      onClick={() => mostrarMensaje(`Abriendo ${lead.nombre}`)}
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PROMOCIONES */}
        {tab === "promociones" && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Promociones</h2>
                <p className="text-xs text-muted-foreground">
                  Administrá beneficios y promociones para captar pacientes.
                </p>
              </div>

              <button
                type="button"
                className={BUTTON_PRIMARY}
                onClick={() => setModal("promo")}
              >
                <Plus className="size-4" />
                Nueva promoción
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {promos.map((promo) => (
                <article key={promo.id} className={`${CARD} group p-5`}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
                      <Gift className="size-5" />
                    </span>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                        promo.activa
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                          : "border-border bg-muted text-muted-foreground"
                      }`}
                    >
                      {promo.activa ? "Activa" : "Pausada"}
                    </span>
                  </div>

                  <h3 className="mt-4 text-sm font-semibold">{promo.nombre}</h3>

                  <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                    {promo.descripcion}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-muted/50 p-3">
                      <p className="text-[10px] text-muted-foreground">
                        Vigencia
                      </p>
                      <p className="mt-1 text-xs font-semibold">
                        {promo.vigencia}
                      </p>
                    </div>

                    <div className="rounded-xl bg-muted/50 p-3">
                      <p className="text-[10px] text-muted-foreground">Usos</p>
                      <p className="mt-1 text-sm font-bold">{promo.usos}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      className={`${BUTTON_SECONDARY} flex-1`}
                      onClick={() => mostrarMensaje("Promoción editada")}
                    >
                      <Pencil className="size-4" />
                      Editar
                    </button>

                    <button
                      type="button"
                      className={`${BUTTON_SECONDARY} flex-1`}
                      onClick={() => cambiarEstadoPromo(promo.id)}
                    >
                      {promo.activa ? "Pausar" : "Activar"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL */}
      {modal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-background p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">
                  {modal === "campania" && "Nueva campaña"}
                  {modal === "lead" && "Nuevo lead"}
                  {modal === "promo" && "Nueva promoción"}
                </h2>

                <p className="mt-1 text-xs text-muted-foreground">
                  La información se guarda localmente durante esta etapa.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {modal === "campania" && (
              <div className="space-y-3">
                <input
                  value={nuevaCampania.nombre}
                  onChange={(e) =>
                    setNuevaCampania({
                      ...nuevaCampania,
                      nombre: e.target.value,
                    })
                  }
                  placeholder="Nombre de la campaña"
                  className={INPUT}
                />

                <input
                  value={nuevaCampania.audiencia}
                  onChange={(e) =>
                    setNuevaCampania({
                      ...nuevaCampania,
                      audiencia: e.target.value,
                    })
                  }
                  placeholder="Audiencia"
                  className={INPUT}
                />

                <select
                  value={nuevaCampania.canal}
                  onChange={(e) =>
                    setNuevaCampania({
                      ...nuevaCampania,
                      canal: e.target.value as Canal,
                    })
                  }
                  className={INPUT}
                >
                  <option>WhatsApp</option>
                  <option>Correo</option>
                  <option>Instagram</option>
                  <option>Facebook</option>
                </select>

                <input
                  type="date"
                  value={nuevaCampania.fecha}
                  onChange={(e) =>
                    setNuevaCampania({
                      ...nuevaCampania,
                      fecha: e.target.value,
                    })
                  }
                  className={INPUT}
                />

                <button
                  type="button"
                  onClick={guardarCampania}
                  className={`${BUTTON_PRIMARY} w-full`}
                >
                  <SaveIcon />
                  Guardar campaña
                </button>
              </div>
            )}

            {modal === "lead" && (
              <div className="space-y-3">
                <input
                  value={nuevoLead.nombre}
                  onChange={(e) =>
                    setNuevoLead({
                      ...nuevoLead,
                      nombre: e.target.value,
                    })
                  }
                  placeholder="Nombre del paciente"
                  className={INPUT}
                />

                <input
                  value={nuevoLead.interes}
                  onChange={(e) =>
                    setNuevoLead({
                      ...nuevoLead,
                      interes: e.target.value,
                    })
                  }
                  placeholder="Interés / tratamiento"
                  className={INPUT}
                />

                <select
                  value={nuevoLead.origen}
                  onChange={(e) =>
                    setNuevoLead({
                      ...nuevoLead,
                      origen: e.target.value,
                    })
                  }
                  className={INPUT}
                >
                  <option>WhatsApp</option>
                  <option>Instagram</option>
                  <option>Facebook</option>
                  <option>Google</option>
                  <option>Referido</option>
                </select>

                <button
                  type="button"
                  onClick={guardarLead}
                  className={`${BUTTON_PRIMARY} w-full`}
                >
                  <SaveIcon />
                  Guardar lead
                </button>
              </div>
            )}

            {modal === "promo" && (
              <div className="space-y-3">
                <input
                  value={nuevaPromo.nombre}
                  onChange={(e) =>
                    setNuevaPromo({
                      ...nuevaPromo,
                      nombre: e.target.value,
                    })
                  }
                  placeholder="Nombre de la promoción"
                  className={INPUT}
                />

                <textarea
                  value={nuevaPromo.descripcion}
                  onChange={(e) =>
                    setNuevaPromo({
                      ...nuevaPromo,
                      descripcion: e.target.value,
                    })
                  }
                  placeholder="Descripción"
                  className="min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />

                <input
                  value={nuevaPromo.vigencia}
                  onChange={(e) =>
                    setNuevaPromo({
                      ...nuevaPromo,
                      vigencia: e.target.value,
                    })
                  }
                  placeholder="Vigencia"
                  className={INPUT}
                />

                <button
                  type="button"
                  onClick={guardarPromo}
                  className={`${BUTTON_PRIMARY} w-full`}
                >
                  <SaveIcon />
                  Guardar promoción
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {mensaje && (
        <div className="fixed right-5 top-5 z-[60] rounded-xl bg-foreground px-4 py-3 text-sm font-medium text-background shadow-xl">
          {mensaje}
        </div>
      )}
    </div>
  );
}