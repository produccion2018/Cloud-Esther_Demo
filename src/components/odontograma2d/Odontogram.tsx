import { useEffect, useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { Tooth } from "./Tooth";
import { PLANS, planLevel, type PlanId } from "@/lib/cloud-esther/data";
import { Q1, Q2, Q3, Q4, Q5, Q6, Q7, Q8, type ToothDef } from "@/lib/odontograma2d/teeth";
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
  incisivo: "w-[7%] min-w-[34px]",
  canino: "w-[8%] min-w-[38px]",
  premolar: "w-[9%] min-w-[42px]",
  molar: "w-[11%] min-w-[50px]",
};

const EMPTY: ToothState = { surfaces: {}, whole: [] };

/* ───────── Funciones según el plan ─────────
   Start (inicial): odontograma básico, solo dentición permanente y los hallazgos
   más comunes. Desde Pro (profesional): todos los hallazgos y dentición temporal.
   El 3D se habilita aparte, desde Plus (ver OdontogramaGate). */
const PLAN_COMPLETO: PlanId = "profesional";
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
}

export function Odontogram({ tenantId, patientId, patientName, plan, onToast }: OdontogramProps) {
  const [tool, setTool] = useState<Tool>("caries");
  const [store, setStore] = useState<TenantOdontograms>({});
  const completo = planLevel(plan) >= planLevel(PLAN_COMPLETO);

  // Carga lo guardado de este paciente al montar o al cambiar de paciente/clínica.
  useEffect(() => {
    const guardado = cargar(tenantId, patientId);
    setStore((prev) => ({
      ...prev,
      [tenantId]: { ...(prev[tenantId] ?? {}), [patientId]: guardado },
    }));
  }, [tenantId, patientId]);

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
    update((prev) => {
      const t = prev[fdi] ?? EMPTY;
      const surfaces = { ...t.surfaces };
      if (tool === "borrar" || surfaces[surface] === tool) delete surfaces[surface];
      else surfaces[surface] = tool;
      return { ...prev, [fdi]: { ...t, surfaces } };
    });
  };

  const handleWhole = (fdi: string) => {
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
    onToast?.("Odontograma limpiado");
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
    <div className="flex items-end justify-center gap-[0.35rem]" aria-label={label}>
      {teeth.map((t) => (
        <div
          key={t.fdi}
          className={`${WIDTH[t.type]} ${primary ? "max-w-[46px]" : ""} flex flex-col items-center gap-1`}
        >
          {t.arch === "lower" && (
            <span className="text-[0.6rem] font-semibold text-muted-foreground">{t.fdi}</span>
          )}
          <div className={`w-full ${primary ? "aspect-[100/150]" : "aspect-[100/190]"}`}>
            <Tooth
              tooth={t}
              state={state[t.fdi] ?? EMPTY}
              onSurface={handleSurface}
              onWhole={handleWhole}
            />
          </div>
          {t.arch === "upper" && (
            <span className="text-[0.6rem] font-semibold text-muted-foreground">{t.fdi}</span>
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
      <div className="card-clinic overflow-x-auto p-4 sm:p-6">
        <div className="min-w-[680px] space-y-5">
          <ArchLabel>Arcada superior (Maxilar)</ArchLabel>
          {renderArch([...Q1, ...Q2], "Arcada superior permanente")}
          {completo && renderArch([...Q5, ...Q6], "Arcada superior temporal", true)}
          <div className="h-px bg-border" />
          {completo && renderArch([...Q8, ...Q7], "Arcada inferior temporal", true)}
          {renderArch([...Q4, ...Q3], "Arcada inferior permanente")}
          <ArchLabel>Arcada inferior (Mandíbula)</ArchLabel>
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
