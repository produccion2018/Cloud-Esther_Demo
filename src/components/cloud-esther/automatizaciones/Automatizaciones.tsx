import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { CaraEsther } from "@/components/cloud-esther/esther-ai/CaraEsther";
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
  ListChecks,
  Lock,
  ListTodo,
  Mail,
  MessageCircle,
  Pencil,
  Play,
  Plug,
  Plus,
  RefreshCw,
  ShieldCheck,
  Timer,
  Trash2,
  Webhook,
  Workflow,
  XCircle,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useCloudEsther, type PlanId } from "@/lib/cloud-esther/data";
import { useSesion, clinicaActualId } from "@/lib/cloud-esther/auth-store";
import { sucursalesDelPlan } from "@/lib/cloud-esther/inventario-store";
import { AUTOMATIZACIONES_126, TOTAL_AUTOMATIZACIONES } from "@/lib/cloud-esther/automatizaciones-126";
import { activarGrupo, alternarAuto, inicializarAutoActivas, storeAutoActivas } from "@/lib/cloud-esther/automatizaciones-activas-store";
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
import { candidatos, ejecutarFlujo, vistaPrevia } from "@/lib/cloud-esther/n8n-motor";
import { AgenteIA } from "@/components/cloud-esther/automatizaciones/AgenteIA";
import { ConexionReal } from "@/components/cloud-esther/automatizaciones/ConexionReal";
import { leerPacientes } from "@/lib/cloud-esther/pacientes";
import { ejecutarFlujoEnServidor, verEjecucionesServidor } from "@/lib/clinica/api";
import { useEstadoAutomatizaciones } from "@/lib/clinica/automatizaciones";
import { useClinicaReal } from "@/lib/clinica/modo-clinica";
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
import { Seleccion } from "@/components/ui/seleccion";

/* Ubicación: src/components/cloud-esther/automatizaciones/Automatizaciones.tsx
   Automatizaciones con n8n (plan Enterprise). Cloud Esther emite eventos, n8n orquesta el
   flujo, Esther Infinity analiza y redacta, y el resultado vuelve a Cloud Esther. n8n no reemplaza
   a la IA: la usa como un paso más. Todo queda separado por empresa y registrado. */

function M(props: Parameters<typeof ModalBase>[0]) {
  return <ModalBase {...props} modulo="Automatizaciones" />;
}

type Seccion = "listas" | "agente" | "catalogo" | "flujos" | "mensajes" | "plantillas" | "ejecuciones" | "conexion";

const ICONO: Record<TipoPaso, LucideIcon> = {
  ia: CaraEsther,
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
  "Esther Infinity": {
    nodo: "bg-gradient-to-br from-primary to-fuchsia-500 text-white",
    pill: "bg-primary/10 text-primary",
  },
  "Automatización": { nodo: "bg-rose-100 text-rose-600", pill: "bg-rose-50 text-rose-600" },
  "Cloud Esther": { nodo: "bg-sky-100 text-sky-700", pill: "bg-sky-50 text-sky-700" },
};
const ESTADO_EJ: Record<Ejecucion["estado"], string> = {
  Completada: "bg-emerald-100 text-emerald-700",
  "En espera": "bg-sky-100 text-sky-700",
  Detenida: "bg-amber-100 text-amber-700",
  Error: "bg-rose-100 text-rose-700",
  "En curso": "bg-violet-100 text-violet-700",
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
  const real = useClinicaReal();
  const estServ = useEstadoAutomatizaciones();
  const [ejecServ, setEjecServ] = useState<Ejecucion[]>([]);
  const [montado, setMontado] = useState(false);
  const [seccion, setSeccion] = useState<Seccion>("listas");
  // Clínica real: las ejecuciones de verdad las hace el servidor (aunque nadie tenga la app abierta)
  useEffect(() => {
    if (!real || real.rol !== "admin") return;
    let vivo = true;
    const traer = () =>
      verEjecucionesServidor(real.slug)
        .then((l) => vivo && setEjecServ(l as Ejecucion[]))
        .catch(() => undefined);
    void traer();
    const t = window.setInterval(() => void traer(), 30_000);
    return () => {
      vivo = false;
      window.clearInterval(t);
    };
  }, [real?.slug, real?.rol, seccion]);
  const ejecuciones = useMemo(
    () => [...ejecServ, ...est.ejecuciones].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 300),
    [ejecServ, est.ejecuciones],
  );
  const activas = real ? !!estServ?.habilitado && (estServ?.flujosActivos ?? 0) > 0 : est.conectado;
  const [sel, setSel] = useState<string | null>(null);
  const [editando, setEditando] = useState<Flujo | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  useEffect(() => setMontado(true), []);
  const usuario = u?.nombre ?? "Administración";
  const sedes = sucursalesDelPlan(plan);
  const onToast = (m: string) => {
    setToast(m);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 3200);
  };

  const mes = new Date().toISOString().slice(0, 7);
  // En la clínica real los números son solo de lo que hizo el servidor (las «Probar» se simulan)
  const delMes = (real ? ejecServ : ejecuciones).filter((e) => e.fecha.startsWith(mes));
  const acciones = delMes
    .flatMap((e) => e.pasos)
    .filter((p) => p.estado === "ok" && p.tipo !== "esperar" && p.tipo !== "condicion");
  const kpis = [
    {
      l: "Flujos activos",
      v: String(est.flujos.filter((f) => f.activo).length),
      s1: `${est.flujos.length}`,
      s2: est.flujos.length === 1 ? "flujo creado" : "flujos creados",
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
      s2: "con Esther Infinity",
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
    { id: "listas", label: "Listas para usar", icon: Zap },
    { id: "agente", label: "Agente IA 24/7", icon: Bot },
    { id: "catalogo", label: "Catálogo (126)", icon: ListChecks },
    { id: "flujos", label: "Flujos", icon: Workflow },
    {
      id: "mensajes",
      label: "Qué se mandó",
      icon: MessageCircle,
      badge: mensajesDe(real ? ejecServ : ejecuciones, !!real).filter((m) => m.estado === "No salió").length,
    },
    { id: "plantillas", label: "Plantillas", icon: LayoutTemplate },
    {
      id: "ejecuciones",
      label: "Ejecuciones",
      icon: History,
      badge: ejecuciones.filter((e) => e.estado === "Error").length,
    },
    { id: "conexion", label: "Conexión", icon: Plug },
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
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold ${activas ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}
                  >
                    {activas ? (
                      <ShieldCheck className="size-3.5" />
                    ) : (
                      <Clock3 className="size-3.5" />
                    )}
                    {real
                      ? activas
                        ? `${estServ?.flujosActivos} ${estServ?.flujosActivos === 1 ? "flujo activo" : "flujos activos"} en el servidor`
                        : estServ && !estServ.habilitado
                          ? "No incluido en tu plan"
                          : "Sin flujos activos"
                      : est.conectado
                        ? "Automatizaciones activas"
                        : "En modo prueba"}
                  </span>
                </div>
                <h1 className="mt-4 text-[34px] font-bold tracking-[-0.035em] md:text-[42px]">
                  Automatizaciones
                </h1>
                <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-foreground md:text-sm">
                  Las 126 automatizaciones de Esther Infinity: cuando pasa algo en tu clínica, Esther
                  Infinity actúa sola —avisa, recuerda, hace el seguimiento y prepara informes— y el
                  resultado vuelve a la ficha del paciente, la Agenda o Notificaciones.
                </p>
              </div>
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
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
                {kpis.map((c, idx) => {
                  const tonos = [
                    { icon: "from-primary to-fuchsia-500", val: "text-primary", orb: "from-primary/20 to-fuchsia-400/10" },
                    { icon: "from-emerald-400 to-teal-600", val: "text-emerald-600", orb: "from-emerald-400/20 to-teal-500/10" },
                    { icon: "from-sky-400 to-blue-600", val: "text-sky-600", orb: "from-sky-400/20 to-blue-500/10" },
                    { icon: "from-amber-400 to-orange-500", val: "text-amber-600", orb: "from-amber-400/20 to-orange-500/10" },
                  ];
                  const t = tonos[idx % 4];
                  return (
                  <div
                    key={c.l}
                    className="group relative min-h-[112px] overflow-hidden rounded-[22px] border border-primary/15 bg-gradient-to-br from-white via-white to-primary/[0.04] p-4 shadow-[0_12px_28px_-20px_rgba(124,58,237,0.48)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_44px_-26px_rgba(124,58,237,0.6)]"
                  >
                    <div className={`pointer-events-none absolute -right-7 -top-9 size-[100px] rounded-full bg-gradient-to-br opacity-70 transition-transform duration-300 group-hover:scale-110 ${t.orb}`} />
                    <div className="relative flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-muted-foreground">
                          {c.l}
                        </p>
                        <p className={`mt-2 truncate text-[27px] font-bold leading-none tracking-tight ${t.val}`}>
                          {c.v}
                        </p>
                        <p className="mt-2 text-[11px]">
                          <span className={`font-semibold ${t.val}`}>{c.s1}</span>{" "}
                          <span className="text-muted-foreground">{c.s2}</span>
                        </p>
                      </div>
                      <span className={`grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-[0_8px_16px_-8px_rgba(0,0,0,0.35)] ${t.icon}`}>
                        <c.i className="size-4" />
                      </span>
                    </div>
                  </div>
                  );
                })}
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
          ) : seccion === "listas" ? (
            <ListasParaUsar
              flujos={est.flujos}
              onToast={onToast}
              onEditar={setEditando}
              onConexion={() => setSeccion("conexion")}
              onMas={() => setSeccion("plantillas")}
            />
          ) : seccion === "agente" ? (
            <AgenteIA plan={plan} usuario={usuario} onToast={onToast} />
          ) : seccion === "catalogo" ? (
            <CatalogoAutomatizaciones plan={plan} onToast={onToast} />
          ) : seccion === "mensajes" ? (
            <Mensajes ejecuciones={real ? ejecServ : ejecuciones} onConexion={() => setSeccion("conexion")} />
          ) : seccion === "flujos" ? (
            <Flujos
              flujos={est.flujos}
              ejecuciones={ejecuciones}
              sel={sel ?? est.flujos[0]?.id ?? null}
              onSel={setSel}
              onEditar={setEditando}
              onToast={onToast}
              usuario={usuario}
              onNuevo={() => setSeccion("plantillas")}
              onConexion={() => setSeccion("conexion")}
            />
          ) : seccion === "plantillas" ? (
            <Plantillas flujos={est.flujos} onUsar={desdePlantilla} />
          ) : seccion === "ejecuciones" ? (
            <Ejecuciones ejecuciones={ejecuciones} flujos={est.flujos} />
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
  const q = QUIEN[meta.quien] ?? QUIEN["Automatización"]!;
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

/* ───────────── Catálogo de las 126 automatizaciones ─────────────
   Lo que el cliente ve: 126 automatizaciones agrupadas (A–G), sin jerga técnica.
   - Plan 4 (grupo): vienen todas incluidas y activas.
   - Plan 3 (avanzada): puede activarlas/desactivarlas (están en Esther Infinity completo).
   - Plan 1 y 2: las ven pero no las activan (capacidad de Esther Infinity completo). */
function CatalogoAutomatizaciones({
  plan,
  onToast,
}: {
  plan: PlanId;
  onToast: (m: string) => void;
}) {
  const grupo4 = plan === "grupo";
  const puedeActivar = plan === "grupo" || plan === "avanzada";
  void inicializarAutoActivas;
  const { activas } = storeAutoActivas.usar();
  const act = new Set(activas);
  const totalActivas = activas.length;

  return (
    <div className="space-y-4">
      <div className="card-grad flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow-[0_10px_22px_-10px_rgba(124,58,237,0.8)]">
            <ListChecks className="size-5" />
          </span>
          <div>
            <p className="font-display text-base font-bold">Las {TOTAL_AUTOMATIZACIONES} automatizaciones de Esther Infinity</p>
            <p className="text-xs text-muted-foreground">
              {grupo4 || puedeActivar
                ? "Ideas para tu clínica. Marcar una NO la enciende: es tu lista para armarla en «Flujos». Las que ya funcionan de verdad están en «Listas para usar»."
                : "Son parte de Esther Infinity completo (plan avanzado o grupo)."}
            </p>
          </div>
        </div>
        <span className="rounded-full border border-primary/15 bg-primary/[0.05] px-3 py-1.5 text-[12px] font-bold text-primary">
          {totalActivas} {totalActivas === 1 ? "marcada" : "marcadas"} para armar
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {AUTOMATIZACIONES_126.map((g) => {
          const nums = g.items.map((x) => x.n);
          const activasGrupo = nums.filter((n) => act.has(n)).length;
          const todas = activasGrupo === nums.length;
          return (
            <section key={g.id} className="card-grad overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/10 bg-gradient-to-r from-primary/[0.07] via-fuchsia-500/[0.04] to-transparent px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-fuchsia-500 text-sm font-bold text-white shadow-[0_8px_16px_-8px_rgba(124,58,237,0.7)]">
                    {g.letra}
                  </span>
                  <div>
                    <p className="font-display text-[15px] font-bold leading-tight">{g.titulo}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {activasGrupo} de {nums.length} {activasGrupo === 1 ? "marcada" : "marcadas"}
                    </p>
                  </div>
                </div>
                {puedeActivar ? (
                  <button
                    type="button"
                    onClick={() => {
                      activarGrupo(nums, !todas);
                      onToast(todas ? `${g.titulo}: desmarcadas` : `${g.titulo}: marcadas para armar en «Flujos»`);
                    }}
                    className="rounded-full border border-primary/20 bg-card px-3 py-1.5 text-[11px] font-bold text-primary transition hover:-translate-y-0.5 hover:border-primary/40"
                  >
                    {todas ? "Desmarcar todas" : "Marcar todas"}
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10.5px] font-semibold text-muted-foreground">
                    <Lock className="size-3" /> Plan avanzado
                  </span>
                )}
              </div>
              <ul className="divide-y divide-primary/[0.06]">
                {g.items.map((it) => {
                  const on = act.has(it.n);
                  return (
                    <li key={it.n} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-primary/[0.03]">
                      <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary/[0.06] text-[10px] font-bold text-primary/70 tabular-nums">
                        {it.n}
                      </span>
                      <span className={`min-w-0 flex-1 text-[13px] ${on ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                        {it.nombre}
                      </span>
                      {puedeActivar ? (
                        <button
                          type="button"
                          role="switch"
                          aria-checked={on}
                          aria-label={`${on ? "Desmarcar" : "Marcar"} ${it.nombre}`}
                          onClick={() => alternarAuto(it.n)}
                          className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? "bg-gradient-to-r from-primary to-fuchsia-500 shadow-[0_4px_12px_-4px_rgba(124,58,237,0.8)]" : "bg-muted-foreground/25"}`}
                        >
                          <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
                        </button>
                      ) : (
                        <Lock className="size-3.5 shrink-0 text-muted-foreground/60" />
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <p className="flex items-center gap-2 rounded-2xl border border-primary/10 bg-primary/[0.03] p-3 text-[11.5px] text-muted-foreground">
        <ShieldCheck className="size-4 shrink-0 text-primary" />
        Cuando una automatización necesita un canal externo todavía no conectado (por ejemplo WhatsApp),
        se avisa claramente y se deja preparada; no se simula un envío como si fuera real.
      </p>
    </div>
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
  onConexion,
}: {
  flujos: Flujo[];
  ejecuciones: Ejecucion[];
  sel: string | null;
  onSel: (id: string) => void;
  onEditar: (f: Flujo) => void;
  onToast: (m: string) => void;
  usuario: string;
  onNuevo: () => void;
  onConexion: () => void;
}) {
  const f = flujos.find((x) => x.id === sel) ?? flujos[0];
  const real = useClinicaReal();
  const canales = useCanales();
  const [ejecutando, setEjecutando] = useState(false);
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
  const ejecutarDeVerdad = async () => {
    const d = lista[disparo];
    if (!d) return;
    if (!real) {
      // Demo: corre el flujo con los datos de ejemplo y explica qué pasa en la clínica real
      probar();
      onToast("Demo: en la clínica real este botón manda los WhatsApp y correos de verdad, y el servidor lo ejecuta solo cada vez que pasa el evento");
      return;
    }
    if (!window.confirm(`Se va a ejecutar «${f.nombre}» DE VERDAD con «${d.titulo}» (envía los WhatsApp y correos reales). ¿Seguimos?`)) return;
    setEjecutando(true);
    try {
      const pac = d.pacienteId ? leerPacientes().find((p) => p.id === d.pacienteId) : undefined;
      const ej = await ejecutarFlujoEnServidor(real.slug, f.id, {
        titulo: d.titulo,
        paciente: d.paciente,
        pacienteId: d.pacienteId,
        telefono: d.telefono,
        email: pac?.email ?? "",
        sede: d.sede,
        monto: d.monto,
        presupuestoId: d.presupuestoId ?? null,
        dato: d.dato,
      });
      setUltima(ej as Ejecucion);
      onToast(`Ejecución real: ${ej.estado.toLowerCase()}`);
    } catch (e) {
      onToast(e instanceof Error ? e.message : "No se pudo ejecutar. Probá de nuevo.");
    } finally {
      setEjecutando(false);
    }
  };
  const cambiar = (patch: Partial<Flujo>) =>
    setN8n("flujos", (prev) => prev.map((x) => (x.id === f.id ? { ...x, ...patch } : x)));
  const ejecDelFlujo = ejecuciones.filter((e) => e.flujoId === f.id);

  return (
    <div className="space-y-4">
    <ComoSalen canales={canales} onConexion={onConexion} />
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <div className="space-y-3">
        <div className="scroll-sutil space-y-2 lg:max-h-[520px] lg:overflow-y-auto lg:pr-1">
          {flujos.map((x) => {
            const n = ejecuciones.filter((e) => e.flujoId === x.id).length;
            const sale = comoSale(x, canales);
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
                <p className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${TONO_SALE[sale.tono]}`}>
                  {sale.tono === "ok" ? <CheckCircle2 className="size-3" /> : sale.tono === "falta" ? <XCircle className="size-3" /> : <Bell className="size-3" />}
                  {sale.texto}
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
                ["Esther Infinity", CaraEsther, "Analiza, prioriza y redacta"],
                ["Automatización", Workflow, "Esperas, condiciones y canales externos"],
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
                  ? `${lista.length} ${lista.length === 1 ? "registro cumple" : "registros cumplen"} este evento ahora. «Probar» simula los envíos externos${real ? "; «Ejecutar de verdad» manda los WhatsApp y correos reales" : "; en la clínica real, «Ejecutar de verdad» manda los WhatsApp y correos reales"}. Con el flujo activo, el servidor lo ejecuta solo cada vez que pasa el evento.`
                  : "Ningún registro de esta empresa cumple el evento en este momento."}
              </p>
              {lista.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <div className="relative min-w-0 flex-1">
                    <Seleccion
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
                    </Seleccion>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  <button type="button" className={BTN_SECUNDARIO} onClick={probar}>
                    <Play className="size-4" /> Probar ahora
                  </button>
                  {(!real || real.rol === "admin") && (
                    <button type="button" className={BTN_PRIMARIO} onClick={() => void ejecutarDeVerdad()} disabled={ejecutando}>
                      <Zap className="size-4" /> {ejecutando ? "Ejecutando…" : "Ejecutar de verdad"}
                    </button>
                  )}
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
    </div>
  );
}


/* ───────────── Listas para usar: prender en un toque ───────────── */

const EN_UN_TOQUE = [
  "recordatorio-turno",
  "seguimiento-presupuesto",
  "saldos",
  "reactivacion",
  "tratamiento-inconcluso",
  "laboratorio-listo",
  "encuesta-satisfaccion",
  "indicaciones-postoperatorias",
  "cumpleanos",
];

function ListasParaUsar({
  flujos,
  onToast,
  onEditar,
  onConexion,
  onMas,
}: {
  flujos: Flujo[];
  onToast: (m: string) => void;
  onEditar: (f: Flujo) => void;
  onConexion: () => void;
  onMas: () => void;
}) {
  const real = useClinicaReal();
  const canales = useCanales();
  const puede = !real || real.rol === "admin";
  const [abierta, setAbierta] = useState<string | null>(null);
  const lista = EN_UN_TOQUE.map((id) => PLANTILLAS.find((t) => t.id === id)).filter((t): t is (typeof PLANTILLAS)[number] => !!t);
  const prender = (t: (typeof PLANTILLAS)[number], on: boolean) => {
    const ya = flujos.find((f) => f.plantilla === t.id);
    if (ya) setN8n("flujos", (prev) => prev.map((f) => (f.id === ya.id ? { ...f, activo: on } : f)));
    else if (on)
      setN8n("flujos", (prev) => [
        ...prev,
        {
          id: `f-${Date.now()}`,
          nombre: t.nombre,
          evento: t.evento,
          pasos: t.pasos(),
          activo: true,
          sedes: "Todas",
          creado: new Date().toISOString(),
          plantilla: t.id,
        },
      ]);
    onToast(on ? `«${t.nombre}» encendida` : `«${t.nombre}» apagada`);
  };
  return (
    <div className="space-y-4">
      <ComoSalen canales={canales} onConexion={onConexion} />
      <div className="card-grad p-4">
        <p className="text-sm font-semibold">Prendé las que quieras, en un toque</p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          Ya vienen armadas. Mirá cómo sale el mensaje con un caso real de tu clínica y encendela.
          {!puede && " Solo el Administrador puede encenderlas o apagarlas."}
        </p>
        <ul className="mt-3 space-y-2">
          {lista.map((t) => {
            const f = flujos.find((x) => x.plantilla === t.id);
            const on = !!f?.activo;
            const modelo: Flujo = f ?? {
              id: t.id,
              nombre: t.nombre,
              evento: t.evento,
              pasos: t.pasos(),
              activo: false,
              sedes: "Todas",
              creado: "",
            };
            const sale = comoSale({ ...modelo, activo: true }, canales);
            const vista = abierta === t.id ? vistaPrevia(modelo) : null;
            return (
              <li key={t.id} className={`rounded-2xl border px-3.5 py-3 transition ${on ? "border-primary/30 bg-primary/[0.04]" : "border-primary/10 bg-white/80"}`}>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold">{t.nombre}</p>
                    <p className="mt-0.5 text-[11.5px] text-muted-foreground">{EVENTOS[t.evento].detalle}</p>
                    {on && (
                      <p className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${TONO_SALE[sale.tono]}`}>
                        {sale.tono === "ok" ? <CheckCircle2 className="size-3" /> : sale.tono === "falta" ? <XCircle className="size-3" /> : <Bell className="size-3" />}
                        {sale.texto}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={`${on ? "Apagar" : "Encender"} ${t.nombre}`}
                    disabled={!puede}
                    onClick={() => prender(t, !on)}
                    className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${on ? "bg-gradient-to-r from-primary to-fuchsia-500" : "bg-muted-foreground/25"}`}
                  >
                    <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-[11.5px] font-semibold text-primary">
                  <button type="button" onClick={() => setAbierta(abierta === t.id ? null : t.id)} className="hover:underline">
                    {abierta === t.id ? "Ocultar mensaje" : "Ver cómo sale el mensaje"}
                  </button>
                  {f && puede && (
                    <button type="button" onClick={() => onEditar(f)} className="hover:underline">
                      Cambiar el mensaje
                    </button>
                  )}
                </div>
                {abierta === t.id &&
                  (vista ? (
                    <div className="mt-2 rounded-xl bg-[#e7f7ec] px-3 py-2">
                      <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-foreground/90">{vista.texto}</p>
                      <p className="mt-1 text-[10.5px] text-muted-foreground">
                        {vista.con
                          ? `Así le llegaría hoy: ${vista.con}.`
                          : "Modelo: todavía no hay un caso real para mostrar; [Nombre] y [detalle] se completan solos."}
                        {/\{dato\}/.test(modelo.pasos.find((p) => p.tipo === "whatsapp")?.config.mensaje ?? "") &&
                        (t.evento === "cumpleanos" || t.evento === "indicaciones_postoperatorias")
                          ? " El texto sale de tus plantillas de mensajes."
                          : ""}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-[11.5px] text-muted-foreground">Esta no le manda mensajes al paciente: avisa al equipo.</p>
                  ))}
              </li>
            );
          })}
        </ul>
        <button type="button" onClick={onMas} className="mt-3 text-[12px] font-semibold text-primary hover:underline">
          Ver más plantillas
        </button>
      </div>
    </div>
  );
}

/* ───────────── ¿Sale de verdad? (honestidad de los envíos) ───────────── */

type Canales = { real: boolean; whatsapp: boolean; correo: "listo" | "prueba" | "apagado" };

function useCanales(): Canales {
  const real = useClinicaReal();
  const est = useEstadoAutomatizaciones();
  if (!real) return { real: false, whatsapp: false, correo: "apagado" };
  return { real: true, whatsapp: !!est?.whatsapp.conectado, correo: est?.correo?.estado ?? "apagado" };
}

const TONO_SALE = {
  ok: "bg-emerald-50 text-emerald-700",
  falta: "bg-amber-50 text-amber-800",
  interno: "bg-primary/[0.07] text-primary",
  demo: "bg-sky-50 text-sky-700",
} as const;

/** Qué pasa de verdad cuando corre este flujo: sale solo, no sale (falta conectar) o es interno. */
function comoSale(f: Flujo, c: Canales): { tono: keyof typeof TONO_SALE; texto: string } {
  const wa = f.pasos.some((p) => p.tipo === "whatsapp");
  const mail = f.pasos.some((p) => p.tipo === "email");
  if (!wa && !mail) return { tono: "interno", texto: "Solo avisos y tareas del equipo" };
  if (!c.real) return { tono: "demo", texto: "Demo: los mensajes se simulan" };
  if (!f.activo) return { tono: "interno", texto: "Pausado: no sale nada" };
  const faltas = [wa && !c.whatsapp ? "conectar WhatsApp" : "", mail && c.correo !== "listo" ? "el correo a pacientes" : ""].filter(Boolean);
  if (faltas.length) return { tono: "falta", texto: `No sale todavía: falta ${faltas.join(" y ")}` };
  return { tono: "ok", texto: `Sale solo por ${[wa ? "WhatsApp" : "", mail ? "correo" : ""].filter(Boolean).join(" y ")}` };
}

function ComoSalen({ canales: c, onConexion }: { canales: Canales; onConexion: () => void }) {
  const filas = c.real
    ? [
        {
          ok: c.whatsapp,
          t: "WhatsApp",
          d: c.whatsapp
            ? "Conectado: los mensajes salen solos desde el número de la clínica."
            : "Sin conectar: los mensajes por WhatsApp NO salen. Conectá WhatsApp Business para que salgan solos.",
        },
        {
          ok: c.correo === "listo",
          t: "Correo",
          d:
            c.correo === "listo"
              ? "Listo: los correos llegan a los pacientes."
              : "Todavía no llega a los pacientes: se habilita cuando esté el dominio de correo de Cloud Esther.",
        },
      ]
    : [];
  return (
    <div className="card-grad p-4">
      <p className="text-sm font-semibold">Cómo salen tus mensajes</p>
      {!c.real ? (
        <p className="mt-1 text-[12px] text-muted-foreground">
          En el demo no se manda nada de verdad: los WhatsApp y correos se simulan para que pruebes. En tu clínica, cada
          flujo te dice si sale solo o qué falta conectar.
        </p>
      ) : (
        <>
          <ul data-movil="1col" className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {filas.map((x) => (
              <li
                key={x.t}
                className={`flex items-start gap-2 rounded-xl px-3 py-2 text-[12px] ${x.ok ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}
              >
                {x.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <XCircle className="mt-0.5 size-4 shrink-0" />}
                <span>
                  <b>{x.t}.</b> {x.d}
                </span>
              </li>
            ))}
          </ul>
          {!c.whatsapp && (
            <button type="button" className={`${BTN_SECUNDARIO} mt-2`} onClick={onConexion}>
              <Plug className="size-4" /> Conectar WhatsApp
            </button>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">
            Los avisos y tareas para el equipo siempre funcionan. Nada se marca como enviado si no salió.
          </p>
        </>
      )}
    </div>
  );
}

type MensajeEnviado = {
  id: string;
  fecha: string;
  flujo: string;
  aQuien: string;
  canal: "WhatsApp" | "Correo";
  estado: "Enviado" | "No salió" | "Prueba" | "Simulado";
  detalle: string;
};

/** Cada WhatsApp o correo que intentó mandar una automatización, con lo que pasó de verdad. */
function mensajesDe(ejecuciones: Ejecucion[], real: boolean): MensajeEnviado[] {
  return ejecuciones
    .filter((e) => !real || e.modo !== "Prueba")
    .flatMap((e) =>
      e.pasos
        .map((p, i) => ({ p, i }))
        .filter(({ p }) => p.tipo === "whatsapp" || p.tipo === "email")
        .map(({ p, i }) => ({
          id: `${e.id}-${i}`,
          fecha: e.fecha,
          flujo: e.flujo,
          aQuien: e.disparador.split(": ").slice(1).join(": ") || e.disparador,
          canal: p.tipo === "whatsapp" ? ("WhatsApp" as const) : ("Correo" as const),
          estado:
            e.modo === "Prueba"
              ? ("Simulado" as const)
              : p.estado === "ok"
                ? ("Enviado" as const)
                : p.estado === "omitido" && /^Prueba/.test(p.resultado)
                  ? ("Prueba" as const)
                  : ("No salió" as const),
          detalle: p.resultado,
        })),
    )
    .filter((m) => !(m.estado === "No salió" && /no se cumple|detiene/i.test(m.detalle)))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

const ESTADO_MSJ: Record<MensajeEnviado["estado"], string> = {
  Enviado: "bg-emerald-100 text-emerald-700",
  "No salió": "bg-rose-100 text-rose-700",
  Prueba: "bg-amber-100 text-amber-800",
  Simulado: "bg-sky-100 text-sky-700",
};

function Mensajes({ ejecuciones, onConexion }: { ejecuciones: Ejecucion[]; onConexion: () => void }) {
  const canales = useCanales();
  const [filtro, setFiltro] = useState<"todos" | "enviados" | "fallidos">("todos");
  const todos = useMemo(() => mensajesDe(ejecuciones, canales.real), [ejecuciones, canales.real]);
  const lista = todos.filter((m) =>
    filtro === "todos" ? true : filtro === "enviados" ? m.estado === "Enviado" : m.estado === "No salió",
  );
  return (
    <div className="space-y-4">
      <ComoSalen canales={canales} onConexion={onConexion} />
      <div className="card-grad p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">Qué se mandó y a quién</p>
          <div className="flex gap-1 rounded-full bg-white/80 p-1 ring-1 ring-primary/10">
            {(
              [
                ["todos", `Todos (${todos.length})`],
                ["enviados", `Enviados (${todos.filter((m) => m.estado === "Enviado").length})`],
                ["fallidos", `No salieron (${todos.filter((m) => m.estado === "No salió").length})`],
              ] as const
            ).map(([k, l]) => (
              <button key={k} type="button" className={CHIP(filtro === k)} onClick={() => setFiltro(k)}>
                {l}
              </button>
            ))}
          </div>
        </div>
        {lista.length === 0 ? (
          <p className="mt-3 text-[12px] text-muted-foreground">
            {todos.length
              ? "No hay mensajes con este filtro."
              : canales.real
                ? "Todavía no se mandó ningún mensaje automático. Cuando un flujo activo mande un WhatsApp o un correo, aparece acá con lo que pasó."
                : "Todavía no probaste ningún flujo. En el demo, los mensajes de las pruebas aparecen acá marcados como «Simulado»."}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {lista.slice(0, 150).map((m) => (
              <li key={m.id} className="rounded-xl border border-primary/10 bg-white/80 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 text-[12.5px] font-semibold">
                    {m.canal === "WhatsApp" ? (
                      <MessageCircle className="size-3.5 shrink-0 text-emerald-600" />
                    ) : (
                      <Mail className="size-3.5 shrink-0 text-sky-600" />
                    )}
                    <span className="truncate">{m.aQuien}</span>
                  </span>
                  <Pill clase={ESTADO_MSJ[m.estado]}>{m.estado}</Pill>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {fechaHora(m.fecha)} · {m.flujo} · {m.canal}
                </p>
                <p className={`mt-1 text-[11.5px] ${m.estado === "No salió" ? "text-rose-700" : "text-foreground/80"}`}>{m.detalle}</p>
              </li>
            ))}
          </ul>
        )}
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
          etiqueta="Tarea de Esther Infinity"
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
      return setError("Antes de enviar un mensaje agregá un paso de Esther Infinity que lo redacte.");
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
            const q = QUIEN[meta.quien] ?? QUIEN["Automatización"]!;
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
                const q = QUIEN[PASOS[p.tipo].quien] ?? QUIEN["Automatización"]!;
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

/** La misma pantalla en la demo y en la clínica real (en la demo, todo se simula). */
function Conexion({ onToast }: { onToast: (m: string) => void }) {
  return <ConexionReal onToast={onToast} />;
}
