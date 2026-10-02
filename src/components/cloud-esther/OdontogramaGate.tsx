import { Suspense, lazy, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Box,
  Check,
  Download,
  FileHeart,
  ListChecks,
  Lock,
  RotateCcw,
  ScanSearch,
  Smile,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { RayosXIA } from "@/components/cloud-esther/odontograma3d/RayosXIA";
import { InformeIntegral } from "@/components/cloud-esther/odontograma3d/InformeIntegral";
import { SimuladorSonrisa } from "@/components/cloud-esther/simulador/SimuladorSonrisa";
import { PLANS, planLevel, useCloudEsther, type PlanId } from "@/lib/cloud-esther/data";
import { useSesion } from "@/lib/cloud-esther/auth-store";
import { storeModulosExtra } from "@/lib/cloud-esther/modulos-extra-store";
import { odontogramaDelPlan } from "@/lib/cloud-esther/planes-config";
import { Odontogram as Odontograma2D } from "@/components/odontograma2d/Odontogram";
// El motor 3D (three.js) pesa mucho: se descarga solo cuando se muestra el odontograma 3D,
// así Pacientes e Historia cargan rápido en los planes con 2D.
const cargarOdontograma3D = () =>
  lazy(() =>
    import("@/components/odontogram/Odontogram3D").then((m) => ({ default: m.Odontogram3D })),
  );
import {
  defaultChart,
  TEETH_BY_FDI,
  TOOTH_STATE_META,
  type ToothState,
} from "@/lib/odontogram/fdi";
import { odontogramKey } from "@/lib/odontograma2d/types";
import { cargarTratamientos, registrarCambio } from "@/lib/odontogram/historial";
import { RadiografiasPanel } from "./RadiografiasPanel";
import { leerRegistros } from "@/components/cloud-esther/PacienteSecciones";
import { FichaPieza } from "@/components/cloud-esther/odontograma3d/FichaPieza";
import { Cargando3D, Limite3D } from "@/components/odontogram/Carga3D";
import { HistorialEvolucion } from "@/components/odontogram/HistorialEvolucion";
import { ImagenesClinicas } from "@/components/odontogram/ImagenesClinicas";
import { EstherOdontograma } from "@/components/cloud-esther/odontograma3d/EstherOdontograma";

/** Se conserva por compatibilidad con las páginas que lo pasan: el módulo (2D o 3D) lo decide
 *  siempre el plan, nunca la vista. */
export type VistaOdontograma = "2d" | "3d" | "ambos";

type Props = {
  pacienteId: string;
  pacienteNombre?: string | undefined;
  onToast: (msg: string) => void;
  vista?: VistaOdontograma | undefined;
};

/** "Odontograma 3D avanzado" (Enterprise): exportar el informe del odontograma. */
const PLAN_INFORME_3D: PlanId = "grupo";
/** Esther IA (chat clínico) está incluida desde Plus, igual que el módulo IA Esther. */
const PLAN_MINIMO_IA: PlanId = "avanzada";

/* Todo lo del odontograma se guarda por clínica (tenant) + paciente,
   para que en multiempresa no se crucen los datos entre empresas. */
function claveAlmacenamiento(clavePaciente: string) {
  return `cloud-esther:odontograma3d:${clavePaciente}`;
}

/* Odontograma todavía sin guardar: arranca con lo que ya dice la Historia Clínica
   (diagnósticos de caries activos y tratamientos hechos o en curso por pieza). */
function chartDesdeRegistros(pacienteId: string): Record<number, ToothState> {
  const chart = defaultChart();
  const r = leerRegistros()[Number(pacienteId)];
  if (!r) return chart;
  const piezas = (campo: string) =>
    campo
      .split(/[^0-9]+/)
      .map(Number)
      .filter((n) => n in chart);
  const POR_TRATAMIENTO: Record<string, ToothState> = {
    Restauración: "tratado",
    "Restauración estética": "tratado",
    Endodoncia: "endodoncia",
    Corona: "corona",
    Extracción: "ausente",
    Implante: "corona",
  };
  r.diagnosticos
    .filter((d) => d.estado === "Activo" && /cari(es|osa)/i.test(`${d.titulo} ${d.descripcion}`))
    .forEach((d) => piezas(d.pieza).forEach((n) => (chart[n] = "caries")));
  r.tratamientos
    .filter((t) => ["En tratamiento", "Completado", "Finalizado"].includes(t.estado))
    .forEach((t) => {
      const e = POR_TRATAMIENTO[t.nombre];
      if (e) piezas(t.pieza).forEach((n) => (chart[n] = e));
    });
  return chart;
}

function cargarChart(clavePaciente: string, pacienteId?: string): Record<number, ToothState> {
  if (typeof window === "undefined") return defaultChart();
  try {
    const raw = window.localStorage.getItem(claveAlmacenamiento(clavePaciente));
    if (!raw) return pacienteId ? chartDesdeRegistros(pacienteId) : defaultChart();
    return { ...defaultChart(), ...JSON.parse(raw) };
  } catch {
    return defaultChart();
  }
}

function guardarChart(clavePaciente: string, chart: Record<number, ToothState>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(claveAlmacenamiento(clavePaciente), JSON.stringify(chart));
  } catch {
    /* almacenamiento no disponible: se ignora */
  }
}

const CARD =
  "rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)]";

const TAB_INACTIVO =
  "inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/60";
const BTN_ICONO =
  "inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive";

/** El plan decide el módulo: START y PRO → Odontograma 2D · PLUS y ENTERPRISE → Odontograma 3D.
    Son dos módulos independientes: no hay selector, pestañas ni botón para cambiar entre ellos,
    y al cambiar de plan se muestra solo el que corresponde. */
export function OdontogramaGate(props: Props) {
  const { plan } = useCloudEsther();
  return odontogramaDelPlan(plan) === "3d" ? (
    <Odontograma3DModulo {...props} />
  ) : (
    <Odontograma2DModulo {...props} />
  );
}

/* ───────────── Odontograma 2D (Start y Pro) ───────────── */

function Odontograma2DModulo({ pacienteId, pacienteNombre, onToast }: Props) {
  const { plan: planId } = useCloudEsther();
  const { clinicId } = useSesion();
  const tenantId = clinicId ?? "demo";
  const clavePaciente = odontogramKey(tenantId, pacienteId);
  const [fdiSeleccionado, setFdiSeleccionado] = useState<number | null>(null);
  const radiografiasRef = useRef<HTMLDivElement>(null);

  useEffect(() => setFdiSeleccionado(null), [clavePaciente]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-bold tracking-tight text-foreground">Odontograma 2D</h2>
        <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
          <Check className="size-3 text-emerald-500" />
          Guardado automáticamente
        </span>
      </div>

      <Odontograma2D
        tenantId={tenantId}
        patientId={pacienteId}
        patientName={pacienteNombre ?? "este paciente"}
        plan={planId}
        onToast={onToast}
        onSelectTooth={setFdiSeleccionado}
      />

      <ImagenesClinicas
        pacienteId={clavePaciente}
        fdi={fdiSeleccionado}
        onVerTodas={() =>
          radiografiasRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      />

      <div ref={radiografiasRef}>
        <RadiografiasPanel
          pacienteId={clavePaciente}
          fdiSeleccionado={fdiSeleccionado}
          onToast={onToast}
        />
      </div>
    </div>
  );
}

/* ───────────── Odontograma 3D (Plus y Enterprise) ───────────── */

function Odontograma3DModulo({ pacienteId, pacienteNombre, onToast }: Props) {
  const { plan: planId } = useCloudEsther();
  const { clinicId, usuario } = useSesion();
  const tenantId = clinicId ?? "demo";
  const clavePaciente = odontogramKey(tenantId, pacienteId);

  const [chart, setChart] = useState<Record<number, ToothState>>(() =>
    cargarChart(clavePaciente, pacienteId),
  );
  const [fdiSeleccionado, setFdiSeleccionado] = useState<number | null>(null);
  const [herramienta, setHerramienta] = useState<Herramienta3D>("odontograma");
  // Reintento: si la descarga del 3D falla, se crea una carga nueva (lazy guarda el error).
  const [intento3D, setIntento3D] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const Odontogram3D = useMemo(() => cargarOdontograma3D(), [intento3D]);
  // «Ampliar Odontograma 3D»: solo agranda el área de trabajo (mismo modelo, mismo estado).
  const [ampliado, setAmpliado] = useState(false);

  useEffect(() => {
    setChart(cargarChart(clavePaciente, pacienteId));
    setFdiSeleccionado(null);
  }, [clavePaciente, pacienteId]);

  useEffect(() => {
    if (!ampliado) return;
    const cerrar = (e: KeyboardEvent) => e.key === "Escape" && setAmpliado(false);
    window.addEventListener("keydown", cerrar);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", cerrar);
      document.body.style.overflow = overflow;
    };
  }, [ampliado]);

  const extras = storeModulosExtra.usar().activos.map((x) => x.id);
  const tieneIA = planLevel(planId) >= planLevel(PLAN_MINIMO_IA) || extras.includes("ia");
  const tieneInforme = planLevel(planId) >= planLevel(PLAN_INFORME_3D);

  const exportarInforme = () => {
    if (!tieneInforme) {
      onToast(`El informe del odontograma 3D requiere plan ${PLANS[PLAN_INFORME_3D].name}`);
      return;
    }
    const tratamientos = cargarTratamientos(clavePaciente);
    const celda = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const filas = Object.keys(chart)
      .map(Number)
      .sort((a, b) => a - b)
      .map((fdi) =>
        [
          String(fdi),
          TEETH_BY_FDI[fdi]?.name ?? "",
          TOOTH_STATE_META[chart[fdi] ?? "sano"].label,
          tratamientos[fdi] ?? "",
        ]
          .map(celda)
          .join(","),
      );
    const csv = ["Pieza,Nombre,Estado,Tratamiento planificado", ...filas].join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `odontograma-3d-${(pacienteNombre ?? pacienteId).replace(/\s+/g, "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onToast("Informe del odontograma descargado");
  };

  const handleChange = (fdi: number, state: ToothState, next: Record<number, ToothState>) => {
    const anterior = chart[fdi] ?? "sano";
    setChart(next);
    guardarChart(clavePaciente, next);
    registrarCambio(clavePaciente, fdi, anterior, state);
    onToast(`Pieza ${fdi} actualizada a "${TOOTH_STATE_META[state].label}"`);
  };

  const reiniciar = () => {
    const limpio = defaultChart();
    setChart(limpio);
    guardarChart(clavePaciente, limpio);
    onToast("Odontograma reiniciado");
  };

  const defSeleccionado = fdiSeleccionado ? (TEETH_BY_FDI[fdiSeleccionado] ?? null) : null;
  const estadoSeleccionado = fdiSeleccionado ? (chart[fdiSeleccionado] ?? "sano") : "sano";

  return (
    <div className="space-y-4">
      <Hero3D
        chart={chart}
        pacienteNombre={pacienteNombre}
        titulo="Odontograma 3D"
        herramienta={herramienta}
        onHerramienta={setHerramienta}
        tieneIA={tieneIA}
        acciones={
          herramienta === "odontograma" ? (
            <>
              <button type="button" onClick={() => setAmpliado(true)} className="btn-ce">
                <Maximize2 className="size-3.5" />
                Ampliar Odontograma 3D
              </button>
              <button
                type="button"
                onClick={exportarInforme}
                title={tieneInforme ? undefined : `Disponible en ${PLANS[PLAN_INFORME_3D].name}`}
                className={tieneInforme ? TAB_INACTIVO : `${TAB_INACTIVO} opacity-60`}
              >
                {tieneInforme ? <Download className="size-3.5" /> : <Lock className="size-3.5" />}
                Exportar
              </button>
              <button type="button" onClick={reiniciar} className={BTN_ICONO}>
                <RotateCcw className="size-3.5" />
                Reiniciar
              </button>
            </>
          ) : null
        }
      />

      {herramienta === "rayosx" || herramienta === "sonrisa" ? (
        !tieneIA ? (
          <PanelBloqueado
            titulo={herramienta === "rayosx" ? "Rayos X con IA" : "Simulador de sonrisa"}
            texto={`Usa Esther IA, incluida desde el plan ${PLANS[PLAN_MINIMO_IA].name}. También podés sumar IA como módulo adicional.`}
          />
        ) : herramienta === "rayosx" ? (
          <RayosXIA
            pacienteId={Number(pacienteId)}
            onToast={onToast}
            onPasarOdontograma={(fdi, estado) =>
              handleChange(fdi, estado, {
                ...cargarChart(clavePaciente, pacienteId),
                [fdi]: estado,
              })
            }
          />
        ) : (
          <SimuladorSonrisa pacienteFijo={Number(pacienteId)} compacto />
        )
      ) : herramienta === "informe" ? (
        <InformeIntegral
          pacienteId={Number(pacienteId)}
          clavePaciente={clavePaciente}
          nombre={pacienteNombre ?? "el paciente"}
          chart={chart}
          profesional={usuario?.nombre ?? "Profesional"}
        />
      ) : (
        <div className="space-y-4">
          {/* Área de trabajo: modelo 3D + ficha de la pieza. Al ampliar, el mismo contenedor pasa
              a ocupar la pantalla (no se vuelve a crear el modelo: se conservan zoom, rotación y
              pieza seleccionada). */}
          <div
            className={
              ampliado
                ? "fixed inset-0 z-[70] flex flex-col gap-3 bg-background p-3 md:p-5"
                : "@container"
            }
            role={ampliado ? "dialog" : undefined}
            aria-modal={ampliado || undefined}
            aria-label={ampliado ? "Odontograma 3D ampliado" : undefined}
          >
            {ampliado && (
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
                    <Box className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-foreground">Odontograma 3D ampliado</p>
                    <p className="text-[11px] text-muted-foreground">
                      {pacienteNombre ?? "Paciente"} · Esc para volver
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => setAmpliado(false)} className="btn-ce-outline">
                  <Minimize2 className="size-3.5" />
                  Volver a la vista normal
                </button>
              </div>
            )}
            <div
              className={
                ampliado
                  ? "grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_400px]"
                  : "grid grid-cols-1 gap-4 @4xl:grid-cols-[minmax(0,1fr)_370px] @6xl:grid-cols-[minmax(0,1fr)_410px]"
              }
            >
              <div
                className={`rounded-[28px] bg-gradient-to-b from-primary/[0.08] via-primary/[0.025] to-transparent p-1 ${ampliado ? "min-h-[55vh]" : ""}`}
              >
                <div
                  className={`overflow-hidden rounded-[24px] border border-border/70 shadow-[0_24px_48px_-32px_rgba(76,29,149,0.55)] ${ampliado ? "h-full" : "h-[calc(100vh-240px)] min-h-[600px]"}`}
                >
                  <Limite3D onReintentar={() => setIntento3D((n) => n + 1)}>
                    <Suspense fallback={<Cargando3D />}>
                      <Odontogram3D
                        key={clavePaciente}
                        value={chart}
                        onChange={handleChange}
                        onSelectTooth={setFdiSeleccionado}
                        selectedFdi={fdiSeleccionado}
                        estadosEnPanel={false}
                      />
                    </Suspense>
                  </Limite3D>
                </div>
              </div>
              <div
                className={
                  ampliado
                    ? "min-h-[420px] lg:min-h-0"
                    : "h-[640px] @4xl:h-[calc(100vh-232px)] @4xl:min-h-[608px]"
                }
              >
                <FichaPieza
                  pacienteId={Number(pacienteId)}
                  clavePaciente={clavePaciente}
                  def={defSeleccionado}
                  estado={estadoSeleccionado}
                  chart={chart}
                  profesional={usuario?.nombre ?? "Profesional"}
                  tieneIA={tieneIA}
                  onSetEstado={(fdi, estado) =>
                    handleChange(fdi, estado, { ...chart, [fdi]: estado })
                  }
                  onElegirPieza={setFdiSeleccionado}
                  onIrHerramienta={(h) => {
                    setAmpliado(false);
                    setHerramienta(h);
                  }}
                  onToast={onToast}
                />
              </div>
            </div>
          </div>

          <ResumenHallazgos3D
            chart={chart}
            pacienteNombre={pacienteNombre}
            fdiSeleccionado={fdiSeleccionado}
            onElegir={setFdiSeleccionado}
          />

          {tieneIA ? (
            <EstherOdontograma
              pacienteId={Number(pacienteId)}
              fdi={fdiSeleccionado}
              chart={chart}
              plan={planId}
              profesional={usuario?.nombre ?? "Profesional"}
              onToast={onToast}
              onIrHerramienta={(h) => {
                setAmpliado(false);
                setHerramienta(h);
              }}
            />
          ) : (
            <PanelBloqueado
              titulo="Esther IA"
              texto={`El asistente clínico con IA está disponible desde el plan ${PLANS[PLAN_MINIMO_IA].name}.`}
            />
          )}

          <HistorialEvolucion
            key={`${clavePaciente}-${Object.values(chart).join("")}`}
            pacienteId={clavePaciente}
            fdi={null}
          />
        </div>
      )}
    </div>
  );
}

type Herramienta3D = "odontograma" | "rayosx" | "sonrisa" | "informe";

const HERRAMIENTAS_3D: [Herramienta3D, string, typeof Box, boolean][] = [
  ["odontograma", "Odontograma 3D", Box, false],
  ["rayosx", "Rayos X con IA", ScanSearch, true],
  ["sonrisa", "Simulador de sonrisa", Smile, true],
  ["informe", "Informe integral", FileHeart, false],
];

/* Encabezado del Odontograma 3D: mismo patrón que el resto de los módulos (hero + indicadores). */
function Hero3D({
  chart,
  pacienteNombre,
  titulo,
  herramienta,
  onHerramienta,
  tieneIA,
  acciones,
}: {
  chart: Record<number, ToothState>;
  pacienteNombre?: string | undefined;
  titulo: string;
  herramienta: Herramienta3D;
  onHerramienta: (h: Herramienta3D) => void;
  tieneIA: boolean;
  acciones: ReactNode;
}) {
  const estados = Object.values(chart);
  const cuenta = (...e: ToothState[]) => estados.filter((x) => e.includes(x)).length;
  const kpis: [string, number, string][] = [
    ["Piezas sanas", cuenta("sano"), "Sin hallazgos"],
    ["Caries", cuenta("caries"), "Lesiones activas"],
    ["Tratadas", cuenta("tratado", "endodoncia", "corona"), "Restauración, conducto o corona"],
    ["Ausentes", cuenta("ausente"), "Piezas no presentes"],
  ];
  return (
    <section className="relative overflow-hidden rounded-[30px] border border-primary/15 bg-gradient-to-br from-white via-white/96 to-primary/[0.045] p-5 shadow-[0_18px_40px_-30px_rgba(76,29,149,0.45)] dark:from-card dark:via-card dark:to-primary/[0.08]">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary/60 to-primary/20" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-[0_10px_22px_-12px_rgba(124,58,237,0.9)]">
            <Box className="size-5" />
          </span>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">{titulo}</h2>
            <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              {pacienteNombre ?? "Paciente"} · Notación FDI
              <span className="inline-flex items-center gap-1 font-medium">
                <Check className="size-3 text-emerald-500" />
                Guardado en la Historia Clínica
              </span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">{acciones}</div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map(([l, v, sub]) => (
          <div
            key={l}
            className="rounded-[22px] border border-primary/25 bg-gradient-to-br from-white to-primary/[0.06] px-4 py-3 dark:from-card dark:to-primary/[0.1]"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {l}
            </p>
            <p className="text-[27px] font-bold leading-tight text-primary">{v}</p>
            <p className="truncate text-[11px] text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      <div
        className="mt-4 flex flex-wrap gap-1.5 rounded-2xl border border-primary/10 bg-primary/[0.03] p-1.5"
        role="tablist"
        aria-label="Herramientas del odontograma 3D"
      >
        {HERRAMIENTAS_3D.map(([id, l, I, ia]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={herramienta === id}
            onClick={() => onHerramienta(id)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${herramienta === id ? "bg-primary text-primary-foreground shadow-[0_8px_18px_-10px_rgba(124,58,237,0.8)]" : "text-muted-foreground hover:bg-white hover:text-foreground dark:hover:bg-card"}`}
          >
            <I className="size-3.5" />
            {l}
            {ia && !tieneIA && <Lock className="size-3" />}
          </button>
        ))}
      </div>
    </section>
  );
}

/* Hallazgos del 3D: cada pieza abre su ficha clínica. */
function ResumenHallazgos3D({
  chart,
  pacienteNombre,
  fdiSeleccionado,
  onElegir,
}: {
  chart: Record<number, ToothState>;
  pacienteNombre?: string | undefined;
  fdiSeleccionado: number | null;
  onElegir: (fdi: number) => void;
}) {
  const piezas = useMemo(
    () =>
      Object.entries(chart)
        .map(([fdi, estado]) => ({ fdi: Number(fdi), estado }))
        .filter((p) => p.estado !== "sano")
        .sort((a, b) => a.fdi - b.fdi),
    [chart],
  );

  return (
    <div className="card-grad p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
          <ListChecks className="size-4 text-primary" />
          Hallazgos de {pacienteNombre ?? "este paciente"}
        </p>
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
          {piezas.length} {piezas.length === 1 ? "pieza" : "piezas"}
        </span>
      </div>
      {piezas.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-primary/20 bg-primary/[0.025] px-3 py-4 text-center text-xs text-muted-foreground">
          Todas las piezas están sanas. Seleccioná un diente para registrar un hallazgo.
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {piezas.map((p) => (
            <button
              key={p.fdi}
              type="button"
              onClick={() => onElegir(p.fdi)}
              className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition hover:border-primary/40 ${
                p.fdi === fdiSeleccionado
                  ? "border-primary bg-primary/[0.06]"
                  : "border-border/70 bg-card/80"
              }`}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                {p.fdi}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-foreground">
                  {TEETH_BY_FDI[p.fdi]?.name ?? "Pieza"}
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: TOOTH_STATE_META[p.estado].color }}
                  />
                  {TOOTH_STATE_META[p.estado].label}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProbarPlan({ minPlan }: { minPlan: PlanId }) {
  const { setPlan, planContratado } = useCloudEsther();
  if (planContratado) return null;
  return (
    <button type="button" className="btn-ce mt-3" onClick={() => setPlan(minPlan)}>
      Probar el plan {PLANS[minPlan].name}
    </button>
  );
}

function PanelBloqueado({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className={`${CARD} grid place-items-center border-dashed text-center`}>
      <div>
        <span className="mx-auto grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
          <Lock className="size-4" />
        </span>
        <p className="mt-2 text-sm font-semibold text-foreground">{titulo}</p>
        <p className="mt-1 text-xs text-muted-foreground">{texto}</p>
        <ProbarPlan minPlan={PLAN_MINIMO_IA} />
      </div>
    </div>
  );
}
