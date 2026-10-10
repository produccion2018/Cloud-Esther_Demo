import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  Bell,
  Bot,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Copy,
  GitBranch,
  History,
  LayoutTemplate,
  ListTodo,
  Mail,
  MessageCircle,
  Pencil,
  Play,
  Plug,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Timer,
  Trash2,
  Webhook,
  Workflow,
  XCircle,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useCloudEsther } from "@/lib/cloud-esther/data";
import { useSesion, clinicaActualId } from "@/lib/cloud-esther/auth-store";
import { sucursalesDelPlan } from "@/lib/cloud-esther/inventario-store";
import {
  ACCIONES,
  EVENTOS,
  PASOS,
  PLANTILLAS,
  REGLAS,
  TAREAS_IA,
  nuevoPaso,
  setN8n,
  storeN8n,
  type EventoId,
  type Flujo,
  type Paso,
  type TipoPaso,
  type Ejecucion,
} from "@/lib/cloud-esther/n8n-store";
import { candidatos, ejecutarFlujo } from "@/lib/cloud-esther/n8n-motor";
import {
  Acciones,
  BTN_ICONO,
  BTN_PRIMARIO,
  BTN_SECUNDARIO,
  CHIP,
  Field,
  INPUT,
  Modal as ModalBase,
  Pill,
  Sel,
  Vacio,
  fechaHora,
  hace,
} from "@/components/cloud-esther/rrhh/ui";

/* Ubicación: src/components/cloud-esther/automatizaciones/Automatizaciones.tsx
   Automatizaciones con n8n (plan Enterprise). Cloud Esther emite eventos, n8n orquesta el
   flujo, Esther IA analiza y redacta, y el resultado vuelve a Cloud Esther. n8n no reemplaza
   a la IA: la usa como un paso más. Todo queda separado por empresa y registrado. */

function M(props: Parameters<typeof ModalBase>[0]) {
  return <ModalBase {...props} modulo="Automatizaciones" />;
}

type Seccion = "flujos" | "plantillas" | "ejecuciones" | "conexion";

const ICONO: Record<TipoPaso, LucideIcon> = {
  ia: Sparkles,
  esperar: Clock3,
  condicion: GitBranch,
  whatsapp: MessageCircle,
  email: Mail,
  tarea: ListTodo,
  actualizar: RefreshCw,
  webhook: Webhook,
  notificar: Bell,
};
/** Color por responsable: la IA con el degradé de marca, n8n y Cloud Esther con tonos suaves. */
const QUIEN: Record<string, { nodo: string; pill: string }> = {
  "Esther IA": {
    nodo: "bg-gradient-to-br from-primary to-fuchsia-500 text-white",
    pill: "bg-primary/10 text-primary",
  },
  n8n: { nodo: "bg-rose-100 text-rose-600", pill: "bg-rose-50 text-rose-600" },
  "Cloud Esther": { nodo: "bg-sky-100 text-sky-700", pill: "bg-sky-50 text-sky-700" },
};
const ESTADO_EJ: Record<Ejecucion["estado"], string> = {
  Completada: "bg-emerald-100 text-emerald-700",
  "En espera": "bg-sky-100 text-sky-700",
  Detenida: "bg-amber-100 text-amber-700",
  Error: "bg-rose-100 text-rose-700",
};
const ESTADO_PASO: Record<string, string> = {
  ok: "text-emerald-600",
  omitido: "text-muted-foreground",
  espera: "text-sky-600",
  error: "text-rose-600",
};

function resumenPaso(p: Paso) {
  const c = p.config;
  switch (p.tipo) {
    case "ia":
      return c.tarea ?? "";
    case "esperar":
      return `${c.dias ?? "1"} días`;
    case "condicion":
      return c.regla ?? "";
    case "whatsapp":
      return c.mensaje ?? "";
    case "email":
      return c.asunto ?? "";
    case "tarea":
      return c.texto ?? "";
    case "actualizar":
      return c.accion ?? "";
    case "webhook":
      return c.url ?? "";
    case "notificar":
      return c.canal ?? "";
  }
}

export function Automatizaciones() {
  const { plan } = useCloudEsther();
  const { usuario: u } = useSesion();
  const est = storeN8n.usar();
  const [montado, setMontado] = useState(false);
  const [seccion, setSeccion] = useState<Seccion>("flujos");
  const [sel, setSel] = useState<string | null>(null);
  const [editando, setEditando] = useState<Flujo | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  useEffect(() => setMontado(true), []);
  const usuario = u?.nombre ?? "Administración";
  const sedes = sucursalesDelPlan(plan === "grupo");
  const onToast = (m: string) => {
    setToast(m);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 3200);
  };

  const mes = new Date().toISOString().slice(0, 7);
  const delMes = est.ejecuciones.filter((e) => e.fecha.startsWith(mes));
  const acciones = delMes
    .flatMap((e) => e.pasos)
    .filter((p) => p.estado === "ok" && p.tipo !== "esperar" && p.tipo !== "condicion");
  const kpis = [
    {
      l: "Flujos activos",
      v: String(est.flujos.filter((f) => f.activo).length),
      s1: `${est.flujos.length}`,
      s2: "flujos creados",
      i: Workflow,
    },
    {
      l: "Ejecuciones del mes",
      v: String(delMes.length),
      s1: `${delMes.filter((e) => e.estado === "Completada").length}`,
      s2: "completadas",
      i: Play,
    },
    {
      l: "Acciones realizadas",
      v: String(acciones.length),
      s1: `${acciones.filter((p) => p.tipo === "ia").length}`,
      s2: "con Esther IA",
      i: Zap,
    },
    {
      l: "Tiempo ahorrado",
      v: `${((acciones.length * 4) / 60).toFixed(1).replace(".", ",")} h`,
      s1: "≈ 4 min",
      s2: "por acción",
      i: Timer,
    },
  ];
  const SECCIONES: { id: Seccion; label: string; icon: LucideIcon; badge?: number }[] = [
    { id: "flujos", label: "Flujos", icon: Workflow },
    { id: "plantillas", label: "Plantillas", icon: LayoutTemplate },
    {
      id: "ejecuciones",
      label: "Ejecuciones",
      icon: History,
      badge: est.ejecuciones.filter((e) => e.estado === "Error").length,
    },
    { id: "conexion", label: "Conexión n8n", icon: Plug },
  ];

  const guardar = (f: Flujo) => {
    setN8n("flujos", (prev) =>
      prev.some((x) => x.id === f.id) ? prev.map((x) => (x.id === f.id ? f : x)) : [...prev, f],
    );
    setSel(f.id);
    setEditando(null);
    setSeccion("flujos");
    onToast(`Flujo "${f.nombre}" guardado`);
  };
  const desdePlantilla = (id: string) => {
    const t = PLANTILLAS.find((x) => x.id === id);
    if (!t) return;
    setEditando({
      id: `f-${Date.now()}`,
      nombre: t.nombre,
      evento: t.evento,
      pasos: t.pasos(),
      activo: true,
      sedes: "Todas",
      creado: new Date().toISOString(),
      plantilla: t.id,
    });
  };
  const vacio = (): Flujo => ({
    id: `f-${Date.now()}`,
    nombre: "Nuevo flujo",
    evento: "presupuesto_creado",
    pasos: [nuevoPaso("ia", { tarea: "Analizar contexto" }), nuevoPaso("notificar")],
    activo: false,
    sedes: "Todas",
    creado: new Date().toISOString(),
  });

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
                    <Workflow className="size-3.5" />
                    Enterprise
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold ${est.conectado ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}
                  >
                    {est.conectado ? (
                      <ShieldCheck className="size-3.5" />
                    ) : (
                      <Clock3 className="size-3.5" />
                    )}
                    n8n {est.conectado ? "conectado" : "en modo prueba"}
                  </span>
                </div>
                <h1 className="mt-4 text-[34px] font-bold tracking-[-0.035em] md:text-[42px]">
                  Automatizaciones
                </h1>
                <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-foreground md:text-sm">
                  Cloud Esther emite el evento, n8n ejecuta el flujo y Esther IA analiza o redacta
                  en cada paso. El resultado vuelve a la ficha del paciente, la Agenda o
                  Notificaciones.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={BTN_SECUNDARIO}
                  onClick={() => setSeccion("plantillas")}
                >
                  <LayoutTemplate className="size-4" />
                  Plantillas
                </button>
                <button type="button" className={BTN_PRIMARIO} onClick={() => setEditando(vacio())}>
                  <Plus className="size-4" />
                  Nuevo flujo
                </button>
              </div>
            </div>
            {montado && (
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {kpis.map((c) => (
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
                        <p className="mt-2 truncate text-[27px] font-bold leading-none tracking-tight text-primary">
                          {c.v}
                        </p>
                        <p className="mt-2 text-[11px]">
                          <span className="font-semibold text-primary">{c.s1}</span>{" "}
                          <span className="text-muted-foreground">{c.s2}</span>
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
              aria-label="Secciones de automatizaciones"
            >
              {SECCIONES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSeccion(s.id)}
                  aria-pressed={seccion === s.id}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${seccion === s.id ? "bg-primary text-primary-foreground shadow-[0_8px_18px_-10px_rgba(124,58,237,0.8)]" : "text-muted-foreground hover:bg-card hover:text-foreground"}`}
                >
                  <s.icon className="size-3.5" />
                  {s.label}
                  {montado && !!s.badge && (
                    <span
                      className={`grid min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold ${seccion === s.id ? "bg-white/25 text-white" : "bg-rose-500 text-white"}`}
                    >
                      {s.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </section>

        <div className="mt-5">
          {!montado ? (
            <div className="card-grad h-[480px] animate-pulse" />
          ) : seccion === "flujos" ? (
            <Flujos
              flujos={est.flujos}
              ejecuciones={est.ejecuciones}
              sel={sel ?? est.flujos[0]?.id ?? null}
              onSel={setSel}
              onEditar={setEditando}
              onToast={onToast}
              usuario={usuario}
              onNuevo={() => setSeccion("plantillas")}
            />
          ) : seccion === "plantillas" ? (
            <Plantillas flujos={est.flujos} onUsar={desdePlantilla} />
          ) : seccion === "ejecuciones" ? (
            <Ejecuciones ejecuciones={est.ejecuciones} flujos={est.flujos} />
          ) : (
            <Conexion onToast={onToast} />
          )}
        </div>
      </div>
      {editando && (
        <M
          titulo={est.flujos.some((f) => f.id === editando.id) ? "Editar flujo" : "Nuevo flujo"}
          onClose={() => setEditando(null)}
          ancho="max-w-3xl"
        >
          <Editor
            inicial={editando}
            sedes={sedes}
            onCancel={() => setEditando(null)}
            onGuardar={guardar}
          />
        </M>
      )}
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background shadow-xl"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

/* ───────────── Flujos ───────────── */

function Nodo({ paso, ultimo }: { paso: Paso; ultimo: boolean }) {
  const meta = PASOS[paso.tipo];
  const Icon = ICONO[paso.tipo];
  const q = QUIEN[meta.quien] ?? QUIEN["n8n"]!;
  return (
    <li className="relative flex gap-3 pb-3">
      {!ultimo && (
        <span className="absolute left-[17px] top-9 h-[calc(100%-28px)] w-px bg-primary/20" />
      )}
      <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${q.nodo}`}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1 rounded-2xl border border-primary/10 bg-white/80 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold">{meta.nombre}</p>
          <Pill clase={q.pill}>{meta.quien}</Pill>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{resumenPaso(paso)}</p>
      </div>
    </li>
  );
}

function Flujos({
  flujos,
  ejecuciones,
  sel,
  onSel,
  onEditar,
  onToast,
  usuario,
  onNuevo,
}: {
  flujos: Flujo[];
  ejecuciones: Ejecucion[];
  sel: string | null;
  onSel: (id: string) => void;
  onEditar: (f: Flujo) => void;
  onToast: (m: string) => void;
  usuario: string;
  onNuevo: () => void;
}) {
  const f = flujos.find((x) => x.id === sel) ?? flujos[0];
  const [disparo, setDisparo] = useState(0);
  const [ultima, setUltima] = useState<Ejecucion | null>(null);
  const lista = useMemo(() => (f ? candidatos(f) : []), [f]);
  useEffect(() => {
    setDisparo(0);
    setUltima(null);
  }, [f?.id]);

  if (!f)
    return (
      <div className="space-y-3">
        <Vacio icon={Workflow} texto="Todavía no hay flujos. Empezá desde una plantilla." />
        <div className="flex justify-center">
          <button type="button" className={BTN_PRIMARIO} onClick={onNuevo}>
            <LayoutTemplate className="size-4" /> Ver plantillas
          </button>
        </div>
      </div>
    );

  const probar = () => {
    const ej = ejecutarFlujo(f, {
      usuario,
      ...(lista[disparo] ? { disparo: lista[disparo] } : {}),
    });
    if (!ej) {
      onToast(`No hay registros que cumplan "${EVENTOS[f.evento].nombre}" ahora`);
      return;
    }
    setUltima(ej);
    onToast(
      `Ejecución ${ej.estado.toLowerCase()}: ${ej.pasos.filter((p) => p.estado === "ok").length} pasos`,
    );
  };
  const cambiar = (patch: Partial<Flujo>) =>
    setN8n("flujos", (prev) => prev.map((x) => (x.id === f.id ? { ...x, ...patch } : x)));
  const ejecDelFlujo = ejecuciones.filter((e) => e.flujoId === f.id);

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <div className="space-y-3">
        <div className="scroll-sutil space-y-2 lg:max-h-[520px] lg:overflow-y-auto lg:pr-1">
          {flujos.map((x) => {
            const n = ejecuciones.filter((e) => e.flujoId === x.id).length;
            return (
              <button
                key={x.id}
                type="button"
                onClick={() => onSel(x.id)}
                className={`card-grad w-full p-3.5 text-left transition-all ${x.id === f.id ? "ring-2 ring-primary/40" : "hover:ring-1 hover:ring-primary/25"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{x.nombre}</p>
                  <Pill
                    clase={
                      x.activo
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    {x.activo ? "Activo" : "Pausado"}
                  </Pill>
                </div>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Zap className="size-3 text-primary" /> {EVENTOS[x.evento].nombre}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {x.pasos.length} pasos · {x.sedes === "Todas" ? "Todas las sedes" : x.sedes} · {n}{" "}
                  {n === 1 ? "ejecución" : "ejecuciones"}
                </p>
              </button>
            );
          })}
        </div>
        <div className="card-grad p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Quién hace cada paso
          </p>
          <ul className="mt-2 space-y-2">
            {(
              [
                ["Esther IA", Sparkles, "Analiza, prioriza y redacta"],
                ["n8n", Workflow, "Esperas, condiciones y canales externos"],
                ["Cloud Esther", RefreshCw, "Tareas, avisos y registros internos"],
              ] as const
            ).map(([q, Icon, d]) => (
              <li key={q} className="flex items-center gap-2.5">
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-lg ${QUIEN[q]!.nodo}`}
                >
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold">{q}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{d}</p>
                </div>
              </li>
            ))}
          </ul>
          {ejecuciones.length > 0 && (
            <>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Últimas ejecuciones
              </p>
              <ul className="mt-2 space-y-1.5">
                {ejecuciones.slice(0, 4).map((e) => (
                  <li key={e.id} className="flex items-center gap-2 text-xs">
                    <Pill clase={ESTADO_EJ[e.estado]}>{e.estado}</Pill>
                    <span className="min-w-0 flex-1 truncate">{e.flujo}</span>
                    <span className="shrink-0 text-muted-foreground">{hace(e.fecha)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="card-grad p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight">{f.nombre}</h2>
            <p className="text-xs text-muted-foreground">
              Creado {hace(f.creado)} · {f.sedes === "Todas" ? "Todas las sedes" : f.sedes}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={f.activo}
                onChange={(e) => {
                  cambiar({ activo: e.target.checked });
                  onToast(e.target.checked ? "Flujo activado" : "Flujo pausado");
                }}
              />
              <span className="relative h-5 w-9 rounded-full bg-muted transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-primary peer-checked:after:translate-x-4" />
              {f.activo ? "Activo" : "Pausado"}
            </label>
            <button
              type="button"
              className={BTN_ICONO}
              aria-label="Editar flujo"
              onClick={() => onEditar(f)}
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              className={BTN_ICONO}
              aria-label="Duplicar flujo"
              onClick={() => {
                const copia = {
                  ...f,
                  id: `f-${Date.now()}`,
                  nombre: `${f.nombre} (copia)`,
                  activo: false,
                  creado: new Date().toISOString(),
                };
                setN8n("flujos", (prev) => [...prev, copia]);
                onSel(copia.id);
                onToast("Flujo duplicado");
              }}
            >
              <Copy className="size-3.5" />
            </button>
            <button
              type="button"
              className={BTN_ICONO}
              aria-label="Eliminar flujo"
              onClick={() => {
                if (!window.confirm(`¿Eliminar el flujo "${f.nombre}"?`)) return;
                setN8n("flujos", (prev) => prev.filter((x) => x.id !== f.id));
                onToast("Flujo eliminado");
              }}
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Recorrido
            </p>
            <ol>
              <li className="relative flex gap-3 pb-3">
                <span className="absolute left-[17px] top-9 h-[calc(100%-28px)] w-px bg-primary/20" />
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
                  <Zap className="size-4" />
                </span>
                <div className="min-w-0 flex-1 rounded-2xl border border-amber-200/70 bg-amber-50/60 px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{EVENTOS[f.evento].nombre}</p>
                    <Pill clase="bg-amber-100 text-amber-700">
                      Evento · {EVENTOS[f.evento].modulo}
                    </Pill>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {EVENTOS[f.evento].detalle}
                  </p>
                </div>
              </li>
              {f.pasos.map((p, i) => (
                <Nodo key={p.id} paso={p} ultimo={i === f.pasos.length - 1} />
              ))}
            </ol>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-primary/12 bg-white/80 p-4">
              <p className="text-sm font-semibold">Probar con datos reales</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {lista.length
                  ? `${lista.length} ${lista.length === 1 ? "registro cumple" : "registros cumplen"} este evento ahora. Los envíos externos se simulan; el seguimiento, las tareas y los avisos se registran de verdad.`
                  : "Ningún registro de esta empresa cumple el evento en este momento."}
              </p>
              {lista.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <div className="relative min-w-0 flex-1">
                    <select
                      aria-label="Registro para la prueba"
                      value={disparo}
                      onChange={(e) => setDisparo(Number(e.target.value))}
                      className={`${INPUT} appearance-none pr-8`}
                    >
                      {lista.slice(0, 30).map((d, i) => (
                        <option key={`${d.titulo}-${i}`} value={i}>
                          {d.titulo}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  <button type="button" className={BTN_PRIMARIO} onClick={probar}>
                    <Play className="size-4" /> Probar ahora
                  </button>
                </div>
              )}
            </div>
            {ultima ? (
              <DetalleEjecucion ej={ultima} />
            ) : (
              <div className="rounded-2xl border border-dashed border-primary/20 p-4 text-xs text-muted-foreground">
                {ejecDelFlujo[0]
                  ? `Última ejecución ${hace(ejecDelFlujo[0].fecha)}: ${ejecDelFlujo[0].estado}.`
                  : "Todavía no se ejecutó. Probalo para ver qué hace cada paso."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetalleEjecucion({ ej }: { ej: Ejecucion }) {
  return (
    <div className="rounded-2xl border border-primary/12 bg-white/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">Resultado</p>
        <Pill clase={ESTADO_EJ[ej.estado]}>{ej.estado}</Pill>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{ej.disparador}</p>
      <ol className="mt-3 space-y-2">
        {ej.pasos.map((p, i) => {
          const Icon = ICONO[p.tipo];
          return (
            <li key={i} className="flex gap-2 text-xs">
              <Icon className={`mt-0.5 size-3.5 shrink-0 ${ESTADO_PASO[p.estado]}`} />
              <div className="min-w-0">
                <p className="font-semibold">{p.titulo}</p>
                <p className={p.estado === "error" ? "text-rose-600" : "text-muted-foreground"}>
                  {p.resultado}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ───────────── Editor ───────────── */

function ConfigPaso({ paso, onChange }: { paso: Paso; onChange: (p: Paso) => void }) {
  const set = (k: keyof Paso["config"], v: string) =>
    onChange({ ...paso, config: { ...paso.config, [k]: v } });
  const c = paso.config;
  switch (paso.tipo) {
    case "ia":
      return (
        <Sel
          etiqueta="Tarea de Esther IA"
          value={c.tarea ?? TAREAS_IA[0]}
          onChange={(v) => set("tarea", v)}
          opciones={TAREAS_IA}
        />
      );
    case "esperar":
      return (
        <Sel
          etiqueta="Días de espera"
          value={c.dias ?? "1"}
          onChange={(v) => set("dias", v)}
          opciones={["1", "2", "3", "5", "7", "15", "30"].map((d) => ({
            value: d,
            label: `${d} ${d === "1" ? "día" : "días"}`,
          }))}
        />
      );
    case "condicion":
      return (
        <Sel
          etiqueta="Regla"
          value={c.regla ?? REGLAS[0]}
          onChange={(v) => set("regla", v)}
          opciones={REGLAS}
        />
      );
    case "actualizar":
      return (
        <Sel
          etiqueta="Acción"
          value={c.accion ?? ACCIONES[0]}
          onChange={(v) => set("accion", v)}
          opciones={ACCIONES}
        />
      );
    case "notificar":
      return (
        <Sel
          etiqueta="Canal"
          value={c.canal ?? "Aviso interno"}
          onChange={(v) => set("canal", v)}
          opciones={["Aviso interno", "Correo", "Slack"]}
        />
      );
    case "whatsapp":
      return (
        <input
          aria-label="Mensaje"
          className={INPUT}
          value={c.mensaje ?? ""}
          onChange={(e) => set("mensaje", e.target.value)}
        />
      );
    case "email":
      return (
        <input
          aria-label="Asunto"
          className={INPUT}
          value={c.asunto ?? ""}
          onChange={(e) => set("asunto", e.target.value)}
        />
      );
    case "tarea":
      return (
        <input
          aria-label="Texto de la tarea"
          className={INPUT}
          value={c.texto ?? ""}
          onChange={(e) => set("texto", e.target.value)}
        />
      );
    case "webhook":
      return (
        <input
          aria-label="URL del webhook"
          className={INPUT}
          value={c.url ?? ""}
          onChange={(e) => set("url", e.target.value)}
        />
      );
  }
}

function Editor({
  inicial,
  sedes,
  onCancel,
  onGuardar,
}: {
  inicial: Flujo;
  sedes: string[];
  onCancel: () => void;
  onGuardar: (f: Flujo) => void;
}) {
  const [f, setF] = useState<Flujo>(inicial);
  const [error, setError] = useState("");
  const mover = (i: number, d: -1 | 1) =>
    setF((x) => {
      const p = [...x.pasos];
      const j = i + d;
      if (j < 0 || j >= p.length) return x;
      [p[i], p[j]] = [p[j]!, p[i]!];
      return { ...x, pasos: p };
    });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!f.nombre.trim()) return setError("Poné un nombre al flujo.");
    if (!f.pasos.length) return setError("Agregá al menos un paso.");
    const mensaje = f.pasos.findIndex((p) => p.tipo === "whatsapp" || p.tipo === "email");
    const ia = f.pasos.findIndex((p) => p.tipo === "ia" && p.config.tarea === "Redactar mensaje");
    if (mensaje >= 0 && (ia < 0 || ia > mensaje))
      return setError("Antes de enviar un mensaje agregá un paso de Esther IA que lo redacte.");
    onGuardar({ ...f, nombre: f.nombre.trim() });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Nombre">
          <input
            className={INPUT}
            value={f.nombre}
            onChange={(e) => setF({ ...f, nombre: e.target.value })}
          />
        </Field>
        <Field label="Evento que lo dispara">
          <Sel<EventoId>
            etiqueta="Evento"
            value={f.evento}
            onChange={(v) => setF({ ...f, evento: v })}
            opciones={(Object.keys(EVENTOS) as EventoId[]).map((k) => ({
              value: k,
              label: EVENTOS[k].nombre,
            }))}
          />
        </Field>
        <Field label="Sedes">
          <Sel
            etiqueta="Sedes"
            value={f.sedes}
            onChange={(v) => setF({ ...f, sedes: v })}
            opciones={[{ value: "Todas", label: "Todas las sedes" }, ...sedes]}
          />
        </Field>
      </div>
      <p className="-mt-1 text-xs text-muted-foreground">{EVENTOS[f.evento].detalle}</p>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Pasos
        </p>
        <ol className="space-y-2">
          {f.pasos.map((p, i) => {
            const meta = PASOS[p.tipo];
            const Icon = ICONO[p.tipo];
            const q = QUIEN[meta.quien] ?? QUIEN["n8n"]!;
            return (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-2 rounded-2xl border border-primary/10 bg-primary/[0.02] p-2.5"
              >
                <span className="w-5 text-center text-xs font-bold text-muted-foreground">
                  {i + 1}
                </span>
                <span className={`grid size-8 shrink-0 place-items-center rounded-xl ${q.nodo}`}>
                  <Icon className="size-4" />
                </span>
                <div className="w-36 shrink-0">
                  <p className="text-sm font-semibold leading-tight">{meta.nombre}</p>
                  <p className="text-[10.5px] text-muted-foreground">{meta.quien}</p>
                </div>
                <div className="min-w-[180px] flex-1">
                  <ConfigPaso
                    paso={p}
                    onChange={(np) =>
                      setF({ ...f, pasos: f.pasos.map((x) => (x.id === p.id ? np : x)) })
                    }
                  />
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className={BTN_ICONO}
                    aria-label="Subir paso"
                    disabled={i === 0}
                    onClick={() => mover(i, -1)}
                  >
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    className={BTN_ICONO}
                    aria-label="Bajar paso"
                    disabled={i === f.pasos.length - 1}
                    onClick={() => mover(i, 1)}
                  >
                    <ArrowDown className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    className={BTN_ICONO}
                    aria-label="Quitar paso"
                    onClick={() => setF({ ...f, pasos: f.pasos.filter((x) => x.id !== p.id) })}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(Object.keys(PASOS) as TipoPaso[]).map((t) => {
            const Icon = ICONO[t];
            return (
              <button
                key={t}
                type="button"
                className={`${CHIP(false)} border border-primary/12 bg-white`}
                onClick={() => setF({ ...f, pasos: [...f.pasos, nuevoPaso(t)] })}
              >
                <Plus className="size-3" />
                <Icon className="size-3" />
                {PASOS[t].nombre}
              </button>
            );
          })}
        </div>
      </div>
      {error && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p>
      )}
      <Acciones etiqueta="Guardar flujo" onCancel={onCancel} />
    </form>
  );
}

/* ───────────── Plantillas ───────────── */

function Plantillas({ flujos, onUsar }: { flujos: Flujo[]; onUsar: (id: string) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {PLANTILLAS.map((t) => {
        const pasos = t.pasos();
        const usada = flujos.filter((f) => f.plantilla === t.id).length;
        return (
          <div key={t.id} className="card-grad flex flex-col p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold">{t.nombre}</p>
              {usada > 0 && <Pill clase="bg-emerald-100 text-emerald-700">En uso</Pill>}
            </div>
            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-primary">
              <Zap className="size-3" /> {EVENTOS[t.evento].nombre}
            </p>
            <p className="mt-2 flex-1 text-xs leading-5 text-muted-foreground">{t.descripcion}</p>
            <div className="mt-3 flex flex-wrap items-center gap-1">
              {pasos.map((p, i) => {
                const Icon = ICONO[p.tipo];
                const q = QUIEN[PASOS[p.tipo].quien] ?? QUIEN["n8n"]!;
                return (
                  <span key={p.id} className="flex items-center gap-1">
                    <span
                      title={PASOS[p.tipo].nombre}
                      className={`grid size-7 place-items-center rounded-lg ${q.nodo}`}
                    >
                      <Icon className="size-3.5" />
                    </span>
                    {i < pasos.length - 1 && <span className="h-px w-2 bg-primary/25" />}
                  </span>
                );
              })}
            </div>
            <button
              type="button"
              className={`${BTN_SECUNDARIO} mt-4 w-full justify-center`}
              onClick={() => onUsar(t.id)}
            >
              <Plus className="size-4" /> Usar plantilla
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ───────────── Ejecuciones ───────────── */

function Ejecuciones({ ejecuciones, flujos }: { ejecuciones: Ejecucion[]; flujos: Flujo[] }) {
  const [estado, setEstado] = useState<"Todas" | Ejecucion["estado"]>("Todas");
  const [flujo, setFlujo] = useState("Todos");
  const [abierta, setAbierta] = useState<string | null>(null);
  const lista = ejecuciones.filter(
    (e) =>
      (estado === "Todas" || e.estado === estado) && (flujo === "Todos" || e.flujoId === flujo),
  );
  if (!ejecuciones.length)
    return (
      <Vacio
        icon={History}
        texto="Todavía no hay ejecuciones. Probá un flujo desde la pestaña Flujos."
      />
    );
  return (
    <div className="card-grad p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1 rounded-full bg-primary/[0.04] p-1">
          {(["Todas", "Completada", "En espera", "Detenida", "Error"] as const).map((x) => (
            <button
              key={x}
              type="button"
              className={CHIP(estado === x)}
              onClick={() => setEstado(x)}
            >
              {x}
            </button>
          ))}
        </div>
        <div className="w-60">
          <Sel
            etiqueta="Flujo"
            value={flujo}
            onChange={setFlujo}
            opciones={[
              { value: "Todos", label: "Todos los flujos" },
              ...flujos.map((f) => ({ value: f.id, label: f.nombre })),
            ]}
          />
        </div>
      </div>
      <ul className="mt-3 divide-y divide-primary/10">
        {lista.map((e) => (
          <li key={e.id} className="py-2.5">
            <button
              type="button"
              className="flex w-full flex-wrap items-center gap-3 text-left"
              onClick={() => setAbierta(abierta === e.id ? null : e.id)}
            >
              {e.estado === "Completada" ? (
                <CheckCircle2 className="size-4 text-emerald-600" />
              ) : e.estado === "Error" ? (
                <XCircle className="size-4 text-rose-600" />
              ) : (
                <Clock3 className="size-4 text-amber-600" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{e.flujo}</p>
                <p className="truncate text-xs text-muted-foreground">{e.disparador}</p>
              </div>
              <span className="text-xs text-muted-foreground">{e.sede}</span>
              <Pill clase="bg-primary/10 text-primary">{e.modo}</Pill>
              <Pill clase={ESTADO_EJ[e.estado]}>{e.estado}</Pill>
              <span className="w-32 text-right text-xs text-muted-foreground">
                {fechaHora(e.fecha)}
              </span>
              <ChevronDown
                className={`size-4 text-muted-foreground transition-transform ${abierta === e.id ? "rotate-180" : ""}`}
              />
            </button>
            {abierta === e.id && (
              <div className="mt-2">
                <DetalleEjecucion ej={e} />
              </div>
            )}
          </li>
        ))}
        {!lista.length && (
          <li className="py-6 text-center text-sm text-muted-foreground">
            No hay ejecuciones con ese filtro.
          </li>
        )}
      </ul>
    </div>
  );
}

/* ───────────── Conexión ───────────── */

function Conexion({ onToast }: { onToast: (m: string) => void }) {
  const est = storeN8n.usar();
  const [instancia, setInstancia] = useState(est.instancia);
  const [apiKey, setApiKey] = useState(est.apiKey);
  const [probando, setProbando] = useState(false);
  const tenant = clinicaActualId() ?? "demo";
  const webhook = `https://api.cloudesther.com/webhooks/n8n/${tenant}`;
  const probar = () => {
    setProbando(true);
    window.setTimeout(() => {
      setProbando(false);
      const ok = /^https:\/\/.+\..+/.test(instancia) && apiKey.trim().length >= 12;
      storeN8n.poner({
        ...storeN8n.leer(),
        instancia,
        apiKey,
        conectado: ok,
        ultimaPrueba: new Date().toISOString(),
      });
      onToast(
        ok
          ? "Conexión con n8n verificada"
          : "No se pudo conectar: revisá la URL y la API key (mínimo 12 caracteres)",
      );
    }, 700);
  };
  const ARQ: { t: string; d: string; i: LucideIcon; c: string }[] = [
    {
      t: "Cloud Esther",
      d: "Emite el evento con el tenant y la sede",
      i: Zap,
      c: "bg-sky-100 text-sky-700",
    },
    {
      t: "n8n",
      d: "Detecta el evento y orquesta el flujo",
      i: Workflow,
      c: "bg-rose-100 text-rose-600",
    },
    {
      t: "Esther IA",
      d: "Analiza, prioriza o redacta con el contexto permitido",
      i: Bot,
      c: "bg-gradient-to-br from-primary to-fuchsia-500 text-white",
    },
    {
      t: "Acción",
      d: "WhatsApp, correo, tarea o webhook; el resultado vuelve y se audita",
      i: CheckCircle2,
      c: "bg-emerald-100 text-emerald-700",
    },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card-grad space-y-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Instancia de n8n</p>
          <Pill
            clase={
              est.conectado ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            }
          >
            {est.conectado ? "Conectada" : "Modo prueba"}
          </Pill>
        </div>
        <Field label="URL de la instancia">
          <input
            className={INPUT}
            value={instancia}
            onChange={(e) => setInstancia(e.target.value)}
            placeholder="https://n8n.tuclinica.com"
          />
        </Field>
        <Field label="API key">
          <input
            className={INPUT}
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="n8n_api_…"
            autoComplete="off"
          />
        </Field>
        <Field label="Webhook de esta empresa (para los nodos de n8n)">
          <div className="flex gap-2">
            <input className={`${INPUT} font-mono text-xs`} value={webhook} readOnly />
            <button
              type="button"
              className={BTN_ICONO + " size-9"}
              aria-label="Copiar webhook"
              onClick={() => {
                void navigator.clipboard?.writeText(webhook);
                onToast("Webhook copiado");
              }}
            >
              <Copy className="size-3.5" />
            </button>
          </div>
        </Field>
        <p className="text-[11px] leading-5 text-muted-foreground">
          Cada empresa tiene su propio webhook firmado: n8n nunca recibe datos de otra clínica. Las
          llamadas a Esther IA usan el token de la empresa y respetan plan, rol y sede.
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {est.ultimaPrueba ? `Última prueba ${hace(est.ultimaPrueba)}` : "Sin pruebas todavía"}
          </span>
          <button type="button" className={BTN_PRIMARIO} onClick={probar} disabled={probando}>
            <RefreshCw className={`size-4 ${probando ? "animate-spin" : ""}`} />
            {probando ? "Probando…" : "Probar conexión"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card-grad p-5">
          <p className="text-sm font-semibold">Credenciales en n8n</p>
          <ul className="mt-3 space-y-2">
            {est.credenciales.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-3 rounded-2xl border border-primary/10 bg-white/80 px-3 py-2"
              >
                <Plug
                  className={`size-4 ${c.conectada ? "text-emerald-600" : "text-muted-foreground"}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{c.nombre}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.conectada ? c.detalle || "Conectada" : "Sin conectar"}
                  </p>
                </div>
                <button
                  type="button"
                  className={c.conectada ? BTN_SECUNDARIO : BTN_PRIMARIO}
                  onClick={() => {
                    setN8n("credenciales", (prev) =>
                      prev.map((x) => (x.id === c.id ? { ...x, conectada: !x.conectada } : x)),
                    );
                    onToast(`${c.nombre} ${c.conectada ? "desconectado" : "conectado"}`);
                  }}
                >
                  {c.conectada ? "Desconectar" : "Conectar"}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="card-grad p-5">
          <p className="text-sm font-semibold">Cómo funciona</p>
          <ol className="mt-3 grid gap-2 sm:grid-cols-2">
            {ARQ.map((a, i) => (
              <li
                key={a.t}
                className="flex gap-2.5 rounded-2xl border border-primary/10 bg-white/80 p-3"
              >
                <span className={`grid size-8 shrink-0 place-items-center rounded-xl ${a.c}`}>
                  <a.i className="size-4" />
                </span>
                <div>
                  <p className="text-xs font-semibold">
                    {i + 1}. {a.t}
                  </p>
                  <p className="text-[11px] leading-4 text-muted-foreground">{a.d}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
            n8n no reemplaza a la IA: se encarga de los tiempos, las condiciones y los canales
            externos. Esther IA decide qué decir y a quién priorizar.
          </p>
        </div>
      </div>
    </div>
  );
}
