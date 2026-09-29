import { useMemo, useState } from "react";
import {
  Search,
  Workflow,
  Play,
  Pause,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Wallet,
  Bell,
  AlertTriangle,
  Building2,
} from "lucide-react";
import { useCloudEsther, CLINICS } from "@/lib/cloud-esther/data";
import { RRHH_CATEGORIAS, RRHH_ITEMS_FLAT, type RRHHItem } from "@/lib/cloud-esther/rrhh-data";
import { RRHH_MOCK, type RRHHStat } from "@/lib/cloud-esther/rrhh-mock";
import { LegajosDigitales } from "./rrhh/LegajosDigitales";
import { CumpleanosEventos } from "./rrhh/CumpleanosEventos";

const CARD =
  "rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)]";

/* Scrollbar del rail lateral: fina y discreta en vez de la barra por defecto */
const SCROLL_SUTIL =
  "[scrollbar-width:thin] [scrollbar-color:theme(colors.border)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent";

type FlujoN8n = {
  id: string;
  nombre: string;
  descripcion: string;
  disparador: string;
  activo: boolean;
  ultimaEjecucion: string | null;
};

const FLUJOS_INICIALES: FlujoN8n[] = [
  {
    id: "1",
    nombre: "Recordatorio de vencimiento de contrato",
    descripcion: "Envía un aviso por email/WhatsApp 30 días antes de que venza un contrato.",
    disparador: "Contrato próximo a vencer",
    activo: true,
    ultimaEjecucion: "Hace 2 días",
  },
  {
    id: "2",
    nombre: "Alta automática de legajo",
    descripcion: "Crea el legajo digital apenas se registra un nuevo empleado.",
    disparador: "Nuevo empleado creado",
    activo: true,
    ultimaEjecucion: "Hace 5 horas",
  },
  {
    id: "3",
    nombre: "Aviso de cumpleaños al equipo",
    descripcion: "Publica un mensaje en Comunicaciones internas el día del cumpleaños.",
    disparador: "Fecha de cumpleaños",
    activo: false,
    ultimaEjecucion: null,
  },
  {
    id: "4",
    nombre: "Notificar documento nuevo en legajo",
    descripcion: "Avisa por email/WhatsApp cuando se sube un documento a un legajo.",
    disparador: "Documento subido a legajo",
    activo: true,
    ultimaEjecucion: "Hace 1 hora",
  },
];

type Props = {
  onToast: (msg: string) => void;
};

export function RRHHModule({ onToast }: Props) {
  const { clinic } = useCloudEsther();
  const clinicName = CLINICS.find((c) => c.id === clinic)?.name ?? clinic;

  const [busqueda, setBusqueda] = useState("");
  const [seccionActiva, setSeccionActiva] = useState<string>("dashboard");
  const [flujos, setFlujos] = useState<FlujoN8n[]>(FLUJOS_INICIALES);

  const q = busqueda.trim().toLowerCase();
  const resultados: RRHHItem[] = q
    ? RRHH_ITEMS_FLAT.filter(
        (i) => i.label.toLowerCase().includes(q) || i.descripcion.toLowerCase().includes(q),
      )
    : [];

  const itemActivo = RRHH_ITEMS_FLAT.find((i) => i.id === seccionActiva);

  const toggleFlujo = (id: string) => {
    setFlujos((prev) => prev.map((f) => (f.id === id ? { ...f, activo: !f.activo } : f)));
  };

  return (
    <div className="rounded-[28px] bg-gradient-to-b from-primary/[0.06] via-primary/[0.015] to-transparent p-3 sm:p-4">
      <div className="mb-3 flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground">
        <Building2 className="size-3.5" />
        Mostrando datos de <span className="font-semibold text-foreground">{clinicName}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        {/* Rail lateral */}
        <div className={`${CARD} h-fit bg-card/90 backdrop-blur-sm lg:sticky lg:top-4`}>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar en RR.HH..."
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
            />
          </div>

          {q ? (
            <div className={`max-h-[60vh] space-y-1 overflow-y-auto ${SCROLL_SUTIL}`}>
              {resultados.length === 0 ? (
                <p className="px-2 py-3 text-xs text-muted-foreground">Sin resultados para "{busqueda}"</p>
              ) : (
                resultados.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSeccionActiva(item.id);
                      setBusqueda("");
                    }}
                    className="block w-full rounded-lg px-2.5 py-2 text-left text-xs font-medium text-foreground hover:bg-muted/60"
                  >
                    {item.label}
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className={`max-h-[70vh] space-y-4 overflow-y-auto pr-1 ${SCROLL_SUTIL}`}>
              {RRHH_CATEGORIAS.map((cat) => (
                <div key={cat.id}>
                  <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {cat.label}
                  </p>
                  <div className="space-y-0.5">
                    {cat.items.map((item) => {
                      const activo = seccionActiva === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setSeccionActiva(item.id)}
                          className={`block w-full rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                            activo ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted/60"
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contenido de la sección */}
        <div>
          {seccionActiva === "automatizaciones-n8n" ? (
            <AutomatizacionesN8n flujos={flujos} onToggle={toggleFlujo} />
          ) : seccionActiva === "legajos" ? (
            <LegajosDigitales onToast={onToast} />
          ) : seccionActiva === "cumpleanos-eventos" ? (
            <CumpleanosEventos onToast={onToast} />
          ) : (
            <SeccionMock item={itemActivo} />
          )}
        </div>
      </div>
    </div>
  );
}

/* Íconos y acentos de color para las tarjetas de stats, siguiendo el mismo ADN
   que las cards de "Turnos de hoy / Ingresos del día / Deuda vencida" */
const STAT_ICONS = [Clock, Wallet, Bell, AlertTriangle];

function esAlerta(label: string) {
  const l = label.toLowerCase();
  return l.includes("venc") || l.includes("alerta") || l.includes("deuda") || l.includes("pendiente");
}

function StatCard({ stat, index }: { stat: RRHHStat; index: number }) {
  const Icon = STAT_ICONS[index % STAT_ICONS.length]!;
  const alerta = esAlerta(stat.label);

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        alerta
          ? "border-destructive/30 bg-destructive/[0.03]"
          : "border-primary/15 bg-gradient-to-br from-primary/[0.05] to-transparent"
      }`}
    >
      <span
        className={`pointer-events-none absolute -right-4 -top-4 size-16 rounded-full transition-transform duration-300 group-hover:scale-110 ${
          alerta ? "bg-destructive/[0.06]" : "bg-primary/[0.06]"
        }`}
      />
      <div className="relative flex items-start justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{stat.label}</p>
        <span
          className={`grid size-7 shrink-0 place-items-center rounded-full ${
            alerta ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
          }`}
        >
          <Icon className="size-3.5" />
        </span>
      </div>
      <p className={`relative mt-1.5 text-2xl font-bold ${alerta ? "text-destructive" : "text-primary"}`}>
        {stat.value}
      </p>
    </div>
  );
}

function SeccionMock({ item }: { item: RRHHItem | undefined }) {
  if (!item) return null;
  const mock = RRHH_MOCK[item.id];

  return (
    <div className={`${CARD} bg-card/90 backdrop-blur-sm`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold tracking-tight text-foreground">{item.label}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{item.descripcion}</p>
        </div>
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
          Datos de ejemplo
        </span>
      </div>

      {!mock ? (
        <div className="mt-6 grid min-h-56 place-items-center rounded-xl border border-dashed border-border/70 text-center">
          <p className="text-xs text-muted-foreground">Contenido en desarrollo.</p>
        </div>
      ) : (
        <>
          {mock.stats && (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {mock.stats.map((s, i) => (
                <StatCard key={s.label} stat={s} index={i} />
              ))}
            </div>
          )}

          <div className="mt-5 overflow-hidden rounded-xl border border-border/60">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  {mock.columnas.map((c) => (
                    <th key={c} className="whitespace-nowrap px-3 py-2 font-semibold text-muted-foreground">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mock.filas.map((fila, i) => (
                  <tr
                    key={i}
                    className="border-b border-border/40 transition-colors last:border-0 hover:bg-primary/[0.035]"
                  >
                    {fila.map((valor, j) => (
                      <td key={j} className="whitespace-nowrap px-3 py-2 text-foreground">
                        {valor}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function AutomatizacionesN8n({
  flujos,
  onToggle,
}: {
  flujos: FlujoN8n[];
  onToggle: (id: string) => void;
}) {
  const activos = flujos.filter((f) => f.activo).length;

  return (
    <div className="space-y-4">
      <div className={`${CARD} bg-card/90 backdrop-blur-sm`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Workflow className="size-4.5" />
            </span>
            <div>
              <h2 className="text-base font-bold tracking-tight text-foreground">Automatizaciones con n8n</h2>
              <p className="text-xs text-muted-foreground">
                {activos} de {flujos.length} flujos activos
              </p>
            </div>
          </div>
          <button className="btn-ce">
            <Plus className="size-3.5" />
            Nuevo flujo
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-dashed border-border/70 bg-muted/20 p-4 text-xs text-muted-foreground">
          Esta pantalla configura qué flujos de RR.HH. se disparan y cuándo. La conexión real con tu
          instancia de n8n (URL del webhook, credenciales) se define en Configuración → Integraciones,
          cuando tengas n8n instalado.
        </div>
      </div>

      <div className="space-y-3">
        {flujos.map((f) => (
          <div
            key={f.id}
            className={`${CARD} bg-card/90 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-foreground">{f.nombre}</p>
                  {f.activo ? (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      <CheckCircle2 className="size-3" />
                      Activo
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      <XCircle className="size-3" />
                      Pausado
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{f.descripcion}</p>
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Workflow className="size-3" />
                  Disparador: {f.disparador}
                  {f.ultimaEjecucion && (
                    <>
                      <span className="mx-1">·</span>
                      <Clock className="size-3" />
                      Última ejecución: {f.ultimaEjecucion}
                    </>
                  )}
                </p>
              </div>

              <button
                onClick={() => onToggle(f.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  f.activo
                    ? "border-border bg-background text-foreground hover:bg-muted/60"
                    : "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {f.activo ? (
                  <>
                    <Pause className="size-3.5" />
                    Pausar
                  </>
                ) : (
                  <>
                    <Play className="size-3.5" />
                    Activar
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}