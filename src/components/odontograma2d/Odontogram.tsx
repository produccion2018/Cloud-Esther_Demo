import { useEffect, useMemo, useState } from "react";
import { ClipboardList, History, Lock, MousePointerClick } from "lucide-react";
import { Tooth } from "./Tooth";
import { PLANS, planLevel, type PlanId } from "@/lib/cloud-esther/data";
import { cargarTratamientos, guardarTratamiento } from "@/lib/odontogram/historial";
import {
  Q1,
  Q2,
  Q3,
  Q4,
  Q5,
  Q6,
  Q7,
  Q8,
  TOOTH_BY_FDI,
  type ToothDef,
} from "@/lib/odontograma2d/teeth";
import {
  FINDING_COLOR_VAR,
  FINDING_LABELS,
  SURFACE_FINDINGS,
  SURFACE_LABELS,
  WHOLE_FINDINGS,
  isWholeFinding,
  odontogramKey,
  type OdontogramState,
  type Surface,
  type TenantOdontograms,
  type Tool,
  type ToothState,
} from "@/lib/odontograma2d/types";

const WIDTH: Record<ToothDef["type"], string> = {
  // Ancho proporcional por tipo de pieza: las 16 piezas de cada arcada entran siempre en el
  // ancho disponible (sin scroll horizontal) y conservan su proporción.
  incisivo: "flex-[7]",
  canino: "flex-[8]",
  premolar: "flex-[9]",
  molar: "flex-[11]",
};

const EMPTY: ToothState = { surfaces: {}, whole: [] };

/* ───────── Funciones según el plan ─────────
   Regla comercial: el Odontograma 2D está completo y sin bloqueos en los 4 planes.
   El 3D se habilita aparte, desde Plus o como módulo adicional (ver OdontogramaGate). */
const PLAN_COMPLETO: PlanId = "inicial";
const HERRAMIENTAS_BASICAS: Tool[] = ["caries", "obturacion", "extraccion", "ausente", "borrar"];

function herramientaHabilitada(plan: PlanId, tool: Tool) {
  return planLevel(plan) >= planLevel(PLAN_COMPLETO) || HERRAMIENTAS_BASICAS.includes(tool);
}

/* Guardado local por clínica (tenant) y paciente, para que no se crucen datos
   entre empresas. TODO backend: reemplazar por la API de odontogramas. */
function claveGuardado(tenantId: string, patientId: string) {
  return `cloud-esther:odontograma2d:${odontogramKey(tenantId, patientId)}`;
}

function cargar(tenantId: string, patientId: string): OdontogramState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(claveGuardado(tenantId, patientId));
    return raw ? (JSON.parse(raw) as OdontogramState) : {};
  } catch {
    return {};
  }
}

/* Historial / evolución del odontograma 2D (qué se marcó o quitó, cuándo y en qué pieza). */
interface EntradaHistorial {
  id: string;
  fecha: string;
  fdi: string;
  detalle: string;
}

function claveHistorial(tenantId: string, patientId: string) {
  return `${claveGuardado(tenantId, patientId)}:historial`;
}

function cargarHistorial2D(tenantId: string, patientId: string): EntradaHistorial[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(claveHistorial(tenantId, patientId));
    return raw ? (JSON.parse(raw) as EntradaHistorial[]) : [];
  } catch {
    return [];
  }
}

function guardarHistorial2D(tenantId: string, patientId: string, entradas: EntradaHistorial[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(claveHistorial(tenantId, patientId), JSON.stringify(entradas));
  } catch {
    /* almacenamiento no disponible: se ignora */
  }
}

const NOMBRE_TIPO: Record<ToothDef["type"], string> = {
  incisivo: "Incisivo",
  canino: "Canino",
  premolar: "Premolar",
  molar: "Molar",
};

function nombrePieza(t: ToothDef) {
  const arcada = t.arch === "upper" ? "superior" : "inferior";
  const lado = [1, 4, 5, 8].includes(t.quadrant) ? "derecho" : "izquierdo";
  return `${NOMBRE_TIPO[t.type]} ${arcada} ${lado}${t.primary ? " (temporal)" : ""}`;
}

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function guardar(tenantId: string, patientId: string, state: OdontogramState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(claveGuardado(tenantId, patientId), JSON.stringify(state));
  } catch {
    /* almacenamiento no disponible: se ignora */
  }
}

interface OdontogramProps {
  tenantId: string;
  patientId: string;
  patientName: string;
  plan: PlanId;
  onToast?: ((msg: string) => void) | undefined;
  /** Avisa qué pieza está seleccionada (para imágenes clínicas y radiografías). */
  onSelectTooth?: ((fdi: number | null) => void) | undefined;
}

export function Odontogram({
  tenantId,
  patientId,
  patientName,
  plan,
  onToast,
  onSelectTooth,
}: OdontogramProps) {
  const [tool, setTool] = useState<Tool>("caries");
  const [store, setStore] = useState<TenantOdontograms>({});
  const [seleccionada, setSeleccionada] = useState<string | null>(null);
  const [historial, setHistorial] = useState<EntradaHistorial[]>([]);
  const [nota, setNota] = useState("");
  const completo = planLevel(plan) >= planLevel(PLAN_COMPLETO);

  // Carga lo guardado de este paciente al montar o al cambiar de paciente/clínica.
  useEffect(() => {
    const guardado = cargar(tenantId, patientId);
    setStore((prev) => ({
      ...prev,
      [tenantId]: { ...(prev[tenantId] ?? {}), [patientId]: guardado },
    }));
    setHistorial(cargarHistorial2D(tenantId, patientId));
    setSeleccionada(null);
  }, [tenantId, patientId]);

  // Nota / tratamiento planificado de la pieza seleccionada (compartido con el 3D).
  useEffect(() => {
    setNota(
      seleccionada
        ? (cargarTratamientos(odontogramKey(tenantId, patientId))[Number(seleccionada)] ?? "")
        : "",
    );
  }, [tenantId, patientId, seleccionada]);

  const seleccionar = (fdi: string | null) => {
    setSeleccionada(fdi);
    onSelectTooth?.(fdi ? Number(fdi) : null);
  };

  const registrar = (fdi: string, detalle: string) => {
    setHistorial((prev) => {
      const next = [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          fecha: new Date().toISOString(),
          fdi,
          detalle,
        },
        ...prev,
      ].slice(0, 200);
      guardarHistorial2D(tenantId, patientId, next);
      return next;
    });
  };

  // Si el plan baja y la herramienta elegida ya no está incluida, vuelve a Caries.
  useEffect(() => {
    if (!herramientaHabilitada(plan, tool)) setTool("caries");
  }, [plan, tool]);

  const key = odontogramKey(tenantId, patientId);
  const state: OdontogramState = store[tenantId]?.[patientId] ?? {};

  const update = (fn: (prev: OdontogramState) => OdontogramState) =>
    setStore((prev) => {
      const next = fn(prev[tenantId]?.[patientId] ?? {});
      guardar(tenantId, patientId, next);
      return {
        ...prev,
        [tenantId]: { ...(prev[tenantId] ?? {}), [patientId]: next },
      };
    });

  const handleSurface = (fdi: string, surface: Surface) => {
    if (isWholeFinding(tool)) return handleWhole(fdi);
    seleccionar(fdi);
    const previo = state[fdi]?.surfaces[surface];
    const zona = SURFACE_LABELS[surface];
    if (tool === "borrar" || previo === tool) {
      if (previo) registrar(fdi, `Quitó ${FINDING_LABELS[previo]} (${zona})`);
    } else {
      registrar(
        fdi,
        previo
          ? `${FINDING_LABELS[previo]} → ${FINDING_LABELS[tool]} (${zona})`
          : `Marcó ${FINDING_LABELS[tool]} (${zona})`,
      );
    }
    update((prev) => {
      const t = prev[fdi] ?? EMPTY;
      const surfaces = { ...t.surfaces };
      if (tool === "borrar" || surfaces[surface] === tool) delete surfaces[surface];
      else surfaces[surface] = tool;
      return { ...prev, [fdi]: { ...t, surfaces } };
    });
  };

  const handleWhole = (fdi: string) => {
    seleccionar(fdi);
    const actual = state[fdi] ?? EMPTY;
    if (tool === "borrar") {
      if (actual.whole.length || Object.keys(actual.surfaces).length)
        registrar(fdi, "Limpió la pieza");
    } else if (isWholeFinding(tool)) {
      registrar(
        fdi,
        actual.whole.includes(tool)
          ? `Quitó ${FINDING_LABELS[tool]} (pieza completa)`
          : `Marcó ${FINDING_LABELS[tool]} (pieza completa)`,
      );
    }
    update((prev) => {
      const t = prev[fdi] ?? EMPTY;
      if (tool === "borrar") return { ...prev, [fdi]: { surfaces: {}, whole: [] } };
      if (!isWholeFinding(tool)) return prev;
      const whole = t.whole.includes(tool) ? t.whole.filter((w) => w !== tool) : [...t.whole, tool];
      return { ...prev, [fdi]: { ...t, whole } };
    });
  };

  const clearAll = () => {
    update(() => ({}));
    setHistorial((prev) => {
      const next = [
        {
          id: `${Date.now()}`,
          fecha: new Date().toISOString(),
          fdi: "—",
          detalle: "Limpió todo el odontograma",
        },
        ...prev,
      ];
      guardarHistorial2D(tenantId, patientId, next);
      return next;
    });
    onToast?.("Odontograma limpiado");
  };

  const guardarNota = (texto: string) => {
    setNota(texto);
    if (seleccionada)
      guardarTratamiento(odontogramKey(tenantId, patientId), Number(seleccionada), texto);
  };

  const findings = useMemo(() => {
    const rows: { fdi: string; detail: string; finding: string }[] = [];
    Object.entries(state)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([fdi, t]) => {
        t.whole.forEach((w) =>
          rows.push({ fdi, detail: "Pieza completa", finding: FINDING_LABELS[w] }),
        );
        (Object.keys(t.surfaces) as Surface[]).forEach((s) =>
          rows.push({
            fdi,
            detail: SURFACE_LABELS[s],
            finding: FINDING_LABELS[t.surfaces[s]!],
          }),
        );
      });
    return rows;
  }, [state]);

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    findings.forEach((f) => (counts[f.finding] = (counts[f.finding] ?? 0) + 1));
    const teethAffected = Object.values(state).filter(
      (t) => t.whole.length > 0 || Object.keys(t.surfaces).length > 0,
    ).length;
    return { counts, teethAffected, total: findings.length };
  }, [findings, state]);

  const renderArch = (teeth: ToothDef[], label: string, primary = false) => (
    <div
      className={`mx-auto flex w-full items-end justify-center gap-[2px] sm:gap-1 md:gap-1.5 ${primary ? "max-w-[66%]" : "max-w-[1040px]"}`}
      aria-label={label}
    >
      {teeth.map((t, i) => (
        <div
          key={t.fdi}
          className={`${WIDTH[t.type]} flex min-w-0 flex-col items-center gap-1 ${
            i === teeth.length / 2 ? "ml-1 sm:ml-2 md:ml-3" : ""
          }`}
        >
          {t.arch === "lower" && (
            <EtiquetaFdi
              fdi={t.fdi}
              activa={seleccionada === t.fdi}
              onClick={() => seleccionar(seleccionada === t.fdi ? null : t.fdi)}
            />
          )}
          <div
            className={`w-full rounded-md ${primary ? "aspect-[100/150]" : "aspect-[100/190]"} ${
              seleccionada === t.fdi ? "bg-primary/10 ring-2 ring-primary/40" : ""
            }`}
          >
            <Tooth
              tooth={t}
              state={state[t.fdi] ?? EMPTY}
              onSurface={handleSurface}
              onWhole={handleWhole}
            />
          </div>
          {t.arch === "upper" && (
            <EtiquetaFdi
              fdi={t.fdi}
              activa={seleccionada === t.fdi}
              onClick={() => seleccionar(seleccionada === t.fdi ? null : t.fdi)}
            />
          )}
        </div>
      ))}
    </div>
  );

  const tools: Tool[] = [...SURFACE_FINDINGS, ...WHOLE_FINDINGS, "borrar"];

  return (
    <div key={key} className="space-y-6">
      {/* Herramientas */}
      <div className="card-clinic p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">Herramientas de hallazgos</h2>
            <p className="text-xs text-muted-foreground">
              Elegí una herramienta y tocá la superficie de la pieza.
            </p>
          </div>
          <button
            onClick={clearAll}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Limpiar odontograma
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {tools.map((t) => {
            const active = tool === t;
            const habilitada = herramientaHabilitada(plan, t);
            const color = t === "borrar" ? "var(--muted-foreground)" : FINDING_COLOR_VAR[t];
            const nombre = t === "borrar" ? "Borrar" : FINDING_LABELS[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  if (!habilitada) {
                    onToast?.(`${nombre} requiere plan ${PLANS[PLAN_COMPLETO].name} o superior`);
                    return;
                  }
                  setTool(t);
                }}
                aria-pressed={active}
                aria-disabled={!habilitada}
                title={
                  habilitada ? undefined : `Disponible desde el plan ${PLANS[PLAN_COMPLETO].name}`
                }
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                  !habilitada
                    ? "cursor-not-allowed border-dashed border-border text-muted-foreground/60"
                    : active
                      ? "border-primary bg-primary/15 text-foreground shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_18%,transparent)]"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {habilitada ? (
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                ) : (
                  <Lock className="h-3 w-3" />
                )}
                {nombre}
              </button>
            );
          })}
        </div>
        {!completo && (
          <p className="mt-3 text-[11px] text-muted-foreground">
            Plan {PLANS[plan].name}: odontograma básico. Con {PLANS[PLAN_COMPLETO].name} o superior
            se habilitan todos los hallazgos y la dentición temporal.
          </p>
        )}
      </div>

      {/* Odontograma */}
      <div className="card-clinic p-3 sm:p-5 lg:p-6">
        <div className="space-y-5">
          <ArchLabel>Arcada superior (Maxilar)</ArchLabel>
          {renderArch([...Q1, ...Q2], "Arcada superior permanente")}
          {completo && renderArch([...Q5, ...Q6], "Arcada superior temporal", true)}
          <div className="h-px bg-border" />
          {completo && renderArch([...Q8, ...Q7], "Arcada inferior temporal", true)}
          {renderArch([...Q4, ...Q3], "Arcada inferior permanente")}
          <ArchLabel>Arcada inferior (Mandíbula)</ArchLabel>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pieza seleccionada */}
        <PiezaSeleccionada
          fdi={seleccionada}
          estado={seleccionada ? (state[seleccionada] ?? EMPTY) : EMPTY}
          nota={nota}
          onNota={guardarNota}
          notasHabilitadas={completo}
          planNecesario={PLANS[PLAN_COMPLETO].name}
        />

        {/* Historial / evolución */}
        <div className="card-clinic p-4 sm:p-5">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <History className="h-4 w-4 text-primary" />
            Historial / Evolución {seleccionada ? `· pieza ${seleccionada}` : ""}
          </h2>
          {!completo ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              El historial de evolución está disponible desde el plan {PLANS[PLAN_COMPLETO].name}.
            </p>
          ) : (
            <HistorialLista
              entradas={seleccionada ? historial.filter((e) => e.fdi === seleccionada) : historial}
              porPieza={!!seleccionada}
            />
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Lista de hallazgos */}
        <div className="card-clinic p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-semibold">Hallazgos de {patientName}</h2>
          {findings.length === 0 ? (
            <p className="text-xs text-muted-foreground">Todavía no hay hallazgos registrados.</p>
          ) : (
            <ul className="divide-y divide-border">
              {findings.map((f, i) => (
                <li key={i} className="flex items-center gap-3 py-2 text-xs">
                  <span className="w-10 font-semibold text-primary">{f.fdi}</span>
                  <span className="flex-1 text-muted-foreground">{f.detail}</span>
                  <span className="font-medium">{f.finding}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Resumen / estadísticas */}
        <div className="card-clinic p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-semibold">Resumen</h2>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <Stat label="Hallazgos" value={stats.total} />
            <Stat label="Piezas afectadas" value={stats.teethAffected} />
          </div>
          <ul className="space-y-1.5">
            {Object.entries(stats.counts).map(([name, n]) => (
              <li key={name} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{name}</span>
                <span className="font-semibold">{n}</span>
              </li>
            ))}
            {stats.total === 0 && <li className="text-xs text-muted-foreground">Sin datos aún.</li>}
          </ul>
        </div>
      </div>

      {/* Referencias */}
      <section className="card-clinic p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-semibold">Referencias / Leyenda</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {(Object.keys(FINDING_LABELS) as (keyof typeof FINDING_LABELS)[]).map((k) => (
            <div key={k} className="flex items-center gap-2 text-xs">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: FINDING_COLOR_VAR[k] }}
              />
              <span className="text-muted-foreground">{FINDING_LABELS[k]}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function EtiquetaFdi({
  fdi,
  activa,
  onClick,
}: {
  fdi: string;
  activa: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Ver detalle de la pieza ${fdi}`}
      className={`rounded px-1 text-[0.6rem] font-semibold transition-colors ${
        activa ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary"
      }`}
    >
      {fdi}
    </button>
  );
}

function PiezaSeleccionada({
  fdi,
  estado,
  nota,
  onNota,
  notasHabilitadas,
  planNecesario,
}: {
  fdi: string | null;
  estado: ToothState;
  nota: string;
  onNota: (texto: string) => void;
  notasHabilitadas: boolean;
  planNecesario: string;
}) {
  const def = fdi ? TOOTH_BY_FDI[fdi] : undefined;
  if (!fdi || !def) {
    return (
      <div className="card-clinic grid place-items-center p-4 text-center sm:p-5">
        <div>
          <MousePointerClick className="mx-auto h-6 w-6 text-primary/60" />
          <p className="mt-2 text-sm font-semibold">Detalle de la pieza</p>
          <p className="text-xs text-muted-foreground">
            Tocá un diente o su número para ver sus hallazgos y notas.
          </p>
        </div>
      </div>
    );
  }
  const superficies = Object.keys(estado.surfaces) as Surface[];
  return (
    <div className="card-clinic p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
          {fdi}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{nombrePieza(def)}</p>
          <p className="text-xs text-muted-foreground">
            {def.arch === "upper" ? "Arcada superior" : "Arcada inferior"} · cuadrante{" "}
            {def.quadrant}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        {estado.whole.length === 0 && superficies.length === 0 ? (
          <p className="text-xs text-muted-foreground">Pieza sana: sin hallazgos registrados.</p>
        ) : (
          <>
            {estado.whole.map((w) => (
              <p key={w} className="flex items-center gap-2 text-xs">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: FINDING_COLOR_VAR[w] }}
                />
                <span className="font-medium">{FINDING_LABELS[w]}</span>
                <span className="text-muted-foreground">· pieza completa</span>
              </p>
            ))}
            {superficies.map((sup) => {
              const f = estado.surfaces[sup]!;
              return (
                <p key={sup} className="flex items-center gap-2 text-xs">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: FINDING_COLOR_VAR[f] }}
                  />
                  <span className="font-medium">{FINDING_LABELS[f]}</span>
                  <span className="text-muted-foreground">· {SURFACE_LABELS[sup]}</span>
                </p>
              );
            })}
          </>
        )}
      </div>

      <label className="mt-4 block">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <ClipboardList className="h-3.5 w-3.5" />
          Tratamiento planificado / notas
        </span>
        {notasHabilitadas ? (
          <textarea
            value={nota}
            onChange={(e) => onNota(e.target.value)}
            rows={3}
            placeholder="Ej: Obturación con resina en oclusal, control en 6 meses…"
            className="mt-1.5 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
          />
        ) : (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            Disponible desde el plan {planNecesario}.
          </p>
        )}
      </label>
    </div>
  );
}

function HistorialLista({
  entradas,
  porPieza,
}: {
  entradas: EntradaHistorial[];
  porPieza: boolean;
}) {
  if (entradas.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {porPieza
          ? "Todavía no hay cambios registrados para esta pieza."
          : "Todavía no hay cambios registrados en este odontograma."}
      </p>
    );
  }
  return (
    <ol className="max-h-64 space-y-1.5 overflow-y-auto border-l border-border pl-3">
      {entradas.slice(0, 30).map((e) => (
        <li key={e.id} className="relative py-0.5">
          <span className="absolute -left-[17px] top-[5px] h-2 w-2 rounded-full border-2 border-card bg-primary" />
          <p className="text-[10px] font-semibold text-muted-foreground">
            {formatearFecha(e.fecha)}
            {!porPieza && e.fdi !== "—" ? ` · Pieza ${e.fdi}` : ""}
          </p>
          <p className="text-xs">{e.detalle}</p>
        </li>
      ))}
    </ol>
  );
}

function ArchLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center">
      <span className="rounded-full bg-secondary px-3 py-1 text-[0.7rem] font-medium text-muted-foreground">
        {children}
      </span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-3">
      <p className="text-xl font-semibold text-primary">{value}</p>
      <p className="text-[0.7rem] text-muted-foreground">{label}</p>
    </div>
  );
}
