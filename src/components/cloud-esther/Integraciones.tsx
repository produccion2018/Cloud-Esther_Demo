import { useMemo, useState, type ReactNode } from "react";
import {
  Plug,
  CheckCircle2,
  Circle,
  Webhook,
  Search,
  Filter,
  MessageSquare,
  CalendarDays,
  Wallet,
  Receipt,
  Workflow,
  Stethoscope,
  ScanLine,
  Settings2,
} from "lucide-react";

import { AppShell } from "@/components/cloud-esther/AppShell";
import { CloudEstherProvider } from "@/lib/cloud-esther/data";
import {
  useIntegraciones,
  type Conector,
  type CategoriaConector,
} from "@/lib/cloud-esther/integraciones";

const ICONOS: Record<string, typeof Plug> = {
  message: MessageSquare,
  calendar: CalendarDays,
  wallet: Wallet,
  receipt: Receipt,
  workflow: Workflow,
  stethoscope: Stethoscope,
  scan: ScanLine,
  plug: Webhook,
};

const CATEGORIAS: CategoriaConector[] = [
  "Comunicación",
  "Pagos y facturación",
  "Clínico",
  "Automatización",
];

const ESTHER_CARD =
  "relative overflow-hidden rounded-2xl border border-violet-300/70 bg-[radial-gradient(circle_at_100%_0%,rgba(124,58,237,0.11)_0%,rgba(124,58,237,0.075)_18%,rgba(124,58,237,0)_34%),linear-gradient(135deg,#ffffff_0%,#fdfaff_48%,#f7f1ff_100%)] shadow-[0_2px_10px_rgba(124,58,237,0.08)]";

const ESTHER_CARD_HOVER =
  "transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-400/80 hover:shadow-[0_8px_24px_rgba(124,58,237,0.12)]";

export default function Integraciones() {
  return (
    <CloudEstherProvider>
      <IntegracionesInner />
    </CloudEstherProvider>
  );
}

function IntegracionesInner() {
  const { conectores, setConectores } = useIntegraciones();
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<"Todas" | CategoriaConector>("Todas");
  const [feedback, setFeedback] = useState<string | null>(null);

  const showFeedback = (message: string) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(null), 2500);
  };

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return conectores.filter((c) => {
      const matchFiltro = filtro === "Todas" || c.categoria === filtro;
      const matchBusqueda =
        !q || c.nombre.toLowerCase().includes(q) || c.descripcion.toLowerCase().includes(q);

      return matchFiltro && matchBusqueda;
    });
  }, [conectores, filtro, busqueda]);

  const conectadas = conectores.filter((c) => c.estado === "Conectado").length;
  const webhooksActivos = conectores.filter((c) => c.id === "webhooks" && c.estado === "Conectado").length;

  const alternarConector = (c: Conector) => {
    setConectores((prev) =>
      prev.map((x) =>
        x.id === c.id ? { ...x, estado: x.estado === "Conectado" ? "Desconectado" : "Conectado" } : x,
      ),
    );

    showFeedback(c.estado === "Conectado" ? `${c.nombre} desconectado` : `${c.nombre} conectado`);
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
          <header className="mb-6">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80">
              <Plug size={14} />
              Centro de operaciones
            </div>

            <h1 className="font-display text-3xl font-bold tracking-tight text-slate-950 md:text-[2.1rem]">
              Integraciones
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Conectá Cloud Esther con las herramientas que ya usás: comunicación, pagos,
              equipos clínicos y automatización.
            </p>
          </header>

          {/* STATS */}
          <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard icon={<CheckCircle2 size={17} />} label="Conectadas" value={conectadas} accent="success" />
            <StatCard icon={<Circle size={17} />} label="Disponibles" value={conectores.length} accent="default" />
            <StatCard icon={<Workflow size={17} />} label="Automatización" value={conectores.filter((c) => c.categoria === "Automatización").length} accent="info" />
            <StatCard icon={<Webhook size={17} />} label="Webhooks activos" value={webhooksActivos} accent="warning" />
          </div>

          {/* TOOLBAR */}
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_6px_24px_rgba(51,36,84,0.05)]">
            <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Conectores disponibles</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Activá cada integración cuando esté lista para usarse.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar integración..."
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-3 text-xs outline-none transition focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100 sm:w-64"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                  <Filter size={14} className="ml-2 text-slate-400" />
                  {(["Todas", ...CATEGORIAS] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFiltro(cat)}
                      className={`rounded-md px-2.5 py-1.5 text-[10px] font-semibold transition-all ${
                        filtro === cat
                          ? "bg-violet-600 text-white shadow-sm"
                          : "text-slate-500 hover:bg-white hover:text-slate-700"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* GRILLA DE CONECTORES */}
            <div className="p-5">
              {filtrados.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-50 text-violet-500">
                    <Plug size={20} />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-700">No hay integraciones que coincidan</p>
                  <p className="mt-1 text-xs text-slate-400">Probá cambiar el filtro o la búsqueda.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {filtrados.map((c) => {
                    const Icon = ICONOS[c.icon] ?? Plug;

                    return (
                      <div key={c.id} className={`${ESTHER_CARD} ${ESTHER_CARD_HOVER} p-4`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                            <Icon size={18} />
                          </div>

                          <ToggleSwitch
                            checked={c.estado === "Conectado"}
                            onChange={() => alternarConector(c)}
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
            </div>
          </section>

          <div className="mt-4 flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50/50 px-4 py-3 text-xs text-violet-700">
            <Plug size={15} />
            Las conexiones se mantienen durante la sesión en esta versión demo.
          </div>
        </div>
      </div>

      {feedback && (
        <div className="fixed right-5 top-5 z-[200] flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-xl">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 size={15} />
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