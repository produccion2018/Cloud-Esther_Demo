import { lazy, Suspense, useMemo, useState } from "react";
import { Activity, ArrowDownRight, ArrowUpRight, Copy, Lock, Minus, Plus, Sparkles } from "lucide-react";

import type { Cambiar, ContextoPaciente, Registros } from "@/components/cloud-esther/PacienteSecciones";
import { useCloudEsther } from "@/lib/cloud-esther/data";

// La boca 3D realista se descarga solo en el cliente, cuando se muestra (igual que el odontograma):
// así three.js no entra al paquete del servidor (SSR).
const BocaRealista = lazy(() =>
  import("@/components/odontograma-realista/BocaRealista").then((m) => ({ default: m.BocaRealista })),
);

// Cordales (terceros molares): no están en el modelo 3D, se editan con botones aparte.
const SIN_3D = [18, 28, 38, 48] as const;

/** Color de una pieza según su peor sondaje / estado periodontal, para pintarla en la boca 3D. */
function colorPerio(p: Pieza | undefined): string {
  if (!p) return "#ffffff";
  if (p.ausente) return "#cbd5e1"; // gris: ausente
  if (p.implante) return "#38bdf8"; // celeste: implante
  const peor = Math.max(0, ...[...p.v, ...p.p].map((s) => s.ps ?? 0));
  const sangra = [...p.v, ...p.p].some((s) => s.sangrado);
  if (peor >= 6) return "#ef4444"; // rojo: bolsa severa
  if (peor >= 4) return "#f59e0b"; // ámbar: bolsa moderada
  if (peor > 0 || sangra) return "#34d399"; // verde: con datos / leve
  return "#ffffff"; // sin datos
}

/** Leyenda de colores del periodontograma 3D. */
function LeyendaPerio() {
  const items: [string, string][] = [
    ["#34d399", "Sano / leve"],
    ["#f59e0b", "≥ 4 mm"],
    ["#ef4444", "≥ 6 mm"],
    ["#38bdf8", "Implante"],
    ["#cbd5e1", "Ausente"],
  ];
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-foreground/80">
      {items.map(([c, l]) => (
        <span key={l} className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-full ring-1 ring-black/10" style={{ background: c }} />
          {l}
        </span>
      ))}
    </div>
  );
}

/* Ubicación: src/components/cloud-esther/pacientes/Periodontograma.tsx
   PERIODONTOGRAMA (desde el plan Pro): registro gráfico por pieza y por sitio (distal, medio y
   mesial) de cada cara (vestibular y palatina/lingual):
   - PS: profundidad de sondaje (mm).
   - MG: margen gingival respecto del límite amelocementario (mm; NEGATIVO si hay recesión).
   - NIC: nivel de inserción clínica = PS − MG (se calcula solo).
   - Sangrado y placa por sitio, movilidad (0–3) y furca (0–3) por pieza, pieza ausente o implante.
   Cada evaluación queda guardada con fecha y profesional: se comparan índices entre evaluaciones.
   Se dibuja en SVG: línea roja del margen y línea azul del fondo del surco (el área entre las dos
   es la bolsa). Es dato de SALUD: la Secretaría no lo ve (lo oculta el servidor). */

type Sitio = { ps: number | null; mg: number | null; sangrado: boolean; placa: boolean };
type Cara = [Sitio, Sitio, Sitio];
type Pieza = { ausente: boolean; implante: boolean; movilidad: number; furca: number; v: Cara; p: Cara };
export type EvaluacionPerio = {
  id: number;
  fecha: string;
  profesional: string;
  piezas: Record<string, Pieza>;
  notas: string;
};

const SUP = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const INF = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const MOLARES = new Set([18, 17, 16, 26, 27, 28, 36, 37, 38, 46, 47, 48]);

const sitioVacio = (): Sitio => ({ ps: null, mg: null, sangrado: false, placa: false });
const piezaVacia = (): Pieza => ({
  ausente: false,
  implante: false,
  movilidad: 0,
  furca: 0,
  v: [sitioVacio(), sitioVacio(), sitioVacio()],
  p: [sitioVacio(), sitioVacio(), sitioVacio()],
});
const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fechaCorta = (iso: string) => iso.split("-").reverse().join("/");

/** Índices de una evaluación (sobre las piezas presentes) */
function indices(ev: EvaluacionPerio | undefined) {
  let sitios = 0;
  let conPs = 0;
  let sumaPs = 0;
  let sangran = 0;
  let placa = 0;
  let ps4 = 0;
  let ps6 = 0;
  let presentes = 0;
  for (const n of [...SUP, ...INF]) {
    const p = ev?.piezas[n];
    if (p?.ausente) continue;
    presentes++;
    for (const s of [...(p?.v ?? []), ...(p?.p ?? [])]) {
      sitios++;
      if (s.sangrado) sangran++;
      if (s.placa) placa++;
      if (s.ps != null) {
        conPs++;
        sumaPs += s.ps;
        if (s.ps >= 4) ps4++;
        if (s.ps >= 6) ps6++;
      }
    }
  }
  const pct = (x: number) => (sitios ? Math.round((x / sitios) * 100) : 0);
  return {
    presentes,
    sangrado: pct(sangran),
    placa: pct(placa),
    psMedia: conPs ? Math.round((sumaPs / conPs) * 10) / 10 : 0,
    ps4,
    ps6,
    cargados: conPs,
  };
}

export function PeriodontogramaSec({
  datos,
  cambiar,
  onToast,
  contexto,
}: {
  datos: Registros;
  cambiar: Cambiar;
  onToast: (m: string) => void;
  contexto?: ContextoPaciente | undefined;
}) {
  const { plan } = useCloudEsther();
  const evaluaciones = useMemo(
    () => [...(datos.periodontograma ?? [])].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id),
    [datos.periodontograma],
  );
  const [actualId, setActualId] = useState<number | null>(evaluaciones[0]?.id ?? null);
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const actual = evaluaciones.find((e) => e.id === actualId) ?? evaluaciones[0];
  const anterior = actual ? evaluaciones[evaluaciones.indexOf(actual) + 1] : undefined;

  if (plan === "inicial")
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-primary/25 bg-gradient-to-br from-primary/[0.05] to-fuchsia-500/[0.05] px-6 py-12 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow-lg">
          <Lock className="size-6" />
        </span>
        <p className="font-display text-lg font-bold">Periodontograma: desde el plan Pro</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Sondaje por sitio, sangrado, placa, NIC y comparación entre evaluaciones. Se activa al pasar a Pro, Plus o Enterprise.
        </p>
      </div>
    );

  const guardar = (ev: EvaluacionPerio) =>
    cambiar("periodontograma", (prev) => (prev ?? []).map((x) => (x.id === ev.id ? ev : x)));

  const nueva = (copiar: boolean) => {
    const base: EvaluacionPerio = {
      id: Date.now(),
      fecha: hoyISO(),
      profesional: "",
      notas: "",
      piezas: copiar && actual ? (JSON.parse(JSON.stringify(actual.piezas)) as Record<string, Pieza>) : {},
    };
    if (copiar)
      // Se copian ausencias, implantes y movilidad; las mediciones se vuelven a tomar
      for (const k of Object.keys(base.piezas)) {
        const p = base.piezas[k]!;
        p.v = [sitioVacio(), sitioVacio(), sitioVacio()];
        p.p = [sitioVacio(), sitioVacio(), sitioVacio()];
      }
    cambiar("periodontograma", (prev) => [...(prev ?? []), base]);
    setActualId(base.id);
    onToast(copiar ? "Nueva evaluación (con las piezas ausentes e implantes de la anterior)" : "Nueva evaluación creada");
  };

  if (!actual)
    return (
      <div className="space-y-4">
        <Cabecera contexto={contexto} />
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-primary/25 bg-gradient-to-br from-primary/[0.04] to-fuchsia-500/[0.04] px-6 py-12 text-center">
          <span className="relative">
            <span aria-hidden className="absolute -inset-3 rounded-full bg-primary/20 blur-xl" />
            <span className="relative grid size-16 place-items-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow-lg">
              <Activity className="size-7" />
            </span>
          </span>
          <div>
            <p className="font-display text-lg font-bold">Todavía no hay periodontogramas</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Registrá la profundidad de sondaje, el margen gingival, el sangrado y la placa de cada sitio. El NIC se calcula solo.
            </p>
          </div>
          <button type="button" onClick={() => nueva(false)} className="btn-ce !min-h-11">
            <Plus className="size-4" /> Primera evaluación
          </button>
        </div>
      </div>
    );

  const ind = indices(actual);
  const indAnt = anterior ? indices(anterior) : null;
  const pieza = (n: number) => actual.piezas[n] ?? piezaVacia();
  // Color de cada pieza de la boca 3D según su estado periodontal (las cordales van aparte).
  const estadosPerio = useMemo(() => {
    const out: Record<number, string> = {};
    for (const n of [...SUP, ...INF]) {
      if ((SIN_3D as readonly number[]).includes(n)) continue;
      const c = colorPerio(actual.piezas[n]);
      if (c !== "#ffffff") out[n] = c;
    }
    return out;
  }, [actual]);

  return (
    <div className="space-y-4">
      <Cabecera contexto={contexto} />

      {/* Evaluaciones */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="-mx-1 flex flex-1 gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {evaluaciones.map((e, i) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setActualId(e.id)}
              className={`shrink-0 rounded-2xl px-3.5 py-2 text-left text-xs transition ${
                e.id === actual.id
                  ? "bg-gradient-to-r from-primary to-fuchsia-500 text-white shadow-[0_10px_22px_-12px_rgba(124,58,237,0.9)]"
                  : "border border-primary/12 bg-card hover:border-primary/30"
              }`}
            >
              <span className="block font-bold">{fechaCorta(e.fecha)}</span>
              <span className={e.id === actual.id ? "text-white/80" : "text-muted-foreground"}>
                {i === 0 ? "Última" : `Evaluación ${evaluaciones.length - i}`}
              </span>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => nueva(true)} className="btn-ce-outline !min-h-10">
          <Copy className="size-4" /> Nueva (copiar piezas)
        </button>
        <button type="button" onClick={() => nueva(false)} className="btn-ce !min-h-10">
          <Plus className="size-4" /> Nueva evaluación
        </button>
      </div>

      {/* Índices + comparación con la anterior */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {(
          [
            ["Piezas presentes", ind.presentes, indAnt?.presentes, "", false],
            ["Sangrado (BOP)", ind.sangrado, indAnt?.sangrado, "%", true],
            ["Placa", ind.placa, indAnt?.placa, "%", true],
            ["PS media", ind.psMedia, indAnt?.psMedia, " mm", true],
            ["Sitios ≥ 4 mm", ind.ps4, indAnt?.ps4, "", true],
            ["Sitios ≥ 6 mm", ind.ps6, indAnt?.ps6, "", true],
          ] as const
        ).map(([t, v, a, u, menosEsMejor]) => {
          const d = a == null ? null : Math.round((v - a) * 10) / 10;
          const mejora = d != null && d !== 0 && (menosEsMejor ? d < 0 : d > 0);
          return (
            <div key={t} className="relative overflow-hidden rounded-2xl border border-primary/10 bg-card p-3 shadow-[0_12px_28px_-24px_rgba(76,29,149,0.7)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{t}</p>
              <p className="mt-1 font-display text-xl font-bold tabular-nums">
                {v}
                <span className="text-xs font-semibold text-muted-foreground">{u}</span>
              </p>
              {d != null && (
                <p className={`mt-0.5 inline-flex items-center gap-0.5 text-[11px] font-semibold ${d === 0 ? "text-muted-foreground" : mejora ? "text-emerald-600" : "text-rose-600"}`}>
                  {d === 0 ? <Minus className="size-3" /> : d > 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                  {d > 0 ? "+" : ""}
                  {d}
                  {u} vs. anterior
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Datos de la evaluación */}
      <div className="grid gap-2 sm:grid-cols-[160px_1fr_1fr]">
        <label className="text-[11px] font-semibold text-muted-foreground">
          Fecha
          <input
            type="date"
            value={actual.fecha}
            onChange={(e) => e.target.value && guardar({ ...actual, fecha: e.target.value })}
            className="mt-1 h-10 w-full rounded-xl border border-primary/15 bg-card px-3 text-sm text-foreground"
          />
        </label>
        <label className="text-[11px] font-semibold text-muted-foreground">
          Profesional
          <input
            value={actual.profesional}
            onChange={(e) => guardar({ ...actual, profesional: e.target.value.slice(0, 80) })}
            placeholder="Quién realizó el sondaje"
            className="mt-1 h-10 w-full rounded-xl border border-primary/15 bg-card px-3 text-sm text-foreground"
          />
        </label>
        <label className="text-[11px] font-semibold text-muted-foreground">
          Notas
          <input
            value={actual.notas}
            onChange={(e) => guardar({ ...actual, notas: e.target.value.slice(0, 300) })}
            placeholder="Diagnóstico, plan o indicaciones"
            className="mt-1 h-10 w-full rounded-xl border border-primary/15 bg-card px-3 text-sm text-foreground"
          />
        </label>
      </div>

      {/* Boca 3D realista (misma del odontograma) + edición periodontal de la pieza elegida */}
      <div className="grid gap-4 @4xl:grid-cols-[minmax(0,1fr)_380px]">
        <Suspense
          fallback={
            <div className="grid h-[520px] place-items-center rounded-2xl bg-muted/30 text-sm text-muted-foreground">
              Cargando el modelo 3D…
            </div>
          }
        >
          <BocaRealista
            key={`perio-${actual.id}`}
            titulo="Periodoncia"
            pacienteNombre={contexto?.paciente}
            estados={estadosPerio}
            selected={seleccion}
            onSeleccion={setSeleccion}
            mostrarInfo={false}
            leyenda={<LeyendaPerio />}
          />
        </Suspense>

        <div className="space-y-3">
          <div className="rounded-2xl border border-primary/10 bg-card p-2.5">
            <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Cordales (sin vista 3D)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SIN_3D.map((n) => {
                const activa = seleccion === n;
                const c = colorPerio(actual.piezas[n]);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSeleccion(n)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold tabular-nums transition ${
                      activa
                        ? "bg-gradient-to-r from-primary to-fuchsia-500 text-white"
                        : "border border-primary/15 bg-card hover:border-primary/35"
                    }`}
                  >
                    <span className="size-2.5 rounded-full ring-1 ring-black/10" style={{ background: c }} />
                    {n}
                  </button>
                );
              })}
            </div>
          </div>

          {seleccion != null ? (
            <PeriodonciaPieza
              fdi={seleccion}
              evaluaciones={datos.periodontograma}
              cambiar={(fn) => cambiar("periodontograma", fn)}
              profesional={actual.profesional}
              onToast={onToast}
            />
          ) : (
            <div className="grid min-h-[220px] place-items-center rounded-2xl border border-dashed border-primary/20 bg-primary/[0.03] p-4 text-center text-sm text-muted-foreground">
              Tocá una pieza en la boca 3D (o una cordal de arriba) para cargar su sondaje, margen, sangrado, placa, movilidad y furca.
            </div>
          )}
        </div>
      </div>

      <p className="flex items-start gap-2 rounded-2xl bg-primary/[0.05] px-3 py-2 text-[11px] text-muted-foreground">
        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
        La boca 3D pinta cada pieza según su estado periodontal. Elegí una pieza para cargar sus sitios (distal · medio · mesial por cara), sangrado, placa, movilidad y furca. NIC = PS − MG; MG negativo = recesión.
      </p>
    </div>
  );
}

function Cabecera({ contexto }: { contexto?: ContextoPaciente | undefined }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-[linear-gradient(118deg,#4c1d95,#7c3aed_45%,#c026d3)] px-5 py-4 text-white shadow-[0_24px_50px_-30px_rgba(91,33,182,0.9)]">
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-16 size-44 rounded-full bg-fuchsia-300/30 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:linear-gradient(100deg,transparent_45%,black)]" />
      <div className="relative flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl border border-white/30 bg-white/15">
          <Activity className="size-5" />
        </span>
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-white/70">Periodoncia</p>
          <p className="font-display text-lg font-bold">Periodontograma{contexto?.paciente ? ` · ${contexto.paciente}` : ""}</p>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Periodoncia de UNA pieza (Odontograma 3D, Plus y Enterprise) ─────────────
   La misma información del periodontograma, pero desde la ficha de la pieza elegida en el 3D:
   se edita la última evaluación (si no hay, se crea una con fecha de hoy). Lo que se carga acá
   aparece en el periodontograma completo y viceversa. */
export function PeriodonciaPieza({
  fdi,
  evaluaciones,
  cambiar,
  profesional,
  onToast,
}: {
  fdi: number;
  evaluaciones: EvaluacionPerio[] | undefined;
  cambiar: (fn: (prev: EvaluacionPerio[] | undefined) => EvaluacionPerio[]) => void;
  profesional: string;
  onToast: (m: string) => void;
}) {
  const lista = [...(evaluaciones ?? [])].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
  const ultima = lista[0];
  const anterior = lista[1];
  const pieza: Pieza = ultima?.piezas[fdi] ?? piezaVacia();
  const previa = anterior?.piezas[fdi];
  const molar = MOLARES.has(fdi);
  const inferior = fdi > 30;

  const editar = (fn: (p: Pieza) => Pieza) => {
    const copia = JSON.parse(JSON.stringify(pieza)) as Pieza;
    const nueva = fn(copia);
    if (!ultima) {
      const ev: EvaluacionPerio = { id: Date.now(), fecha: hoyISO(), profesional, notas: "", piezas: { [fdi]: nueva } };
      cambiar((prev) => [...(prev ?? []), ev]);
      onToast("Periodontograma iniciado con fecha de hoy");
      return;
    }
    cambiar((prev) => (prev ?? []).map((e) => (e.id === ultima.id ? { ...e, piezas: { ...e.piezas, [fdi]: nueva } } : e)));
  };
  const leer = (t: string): number | null => {
    if (t.trim() === "" || t === "-") return null;
    const n = Math.round(Number(t));
    return Number.isFinite(n) ? Math.max(-15, Math.min(15, n)) : null;
  };
  const peor = Math.max(0, ...[...pieza.v, ...pieza.p].map((s) => s.ps ?? 0));
  const peorAntes = previa ? Math.max(0, ...[...previa.v, ...previa.p].map((s) => s.ps ?? 0)) : null;
  const sangra = [...pieza.v, ...pieza.p].filter((s) => s.sangrado).length;

  const cara = (k: "v" | "p", titulo: string) => (
    <div className="rounded-2xl border border-primary/10 bg-card p-3">
      <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{titulo}</p>
      <div className="grid grid-cols-[52px_repeat(3,1fr)] items-center gap-1.5 text-center text-[11px]">
        <span />
        {["Distal", "Medio", "Mesial"].map((s) => (
          <span key={s} className="font-semibold text-muted-foreground">{s}</span>
        ))}
        {(["mg", "ps"] as const).map((campo) => (
          <div key={campo} className="contents">
            <span className="text-left font-bold">{campo === "ps" ? "PS" : "MG"}</span>
            {pieza[k].map((s, j) => (
              <input
                key={j}
                inputMode="numeric"
                disabled={pieza.ausente}
                aria-label={`${campo.toUpperCase()} ${titulo} sitio ${j + 1}`}
                value={s[campo] == null ? "" : String(s[campo])}
                onChange={(e) =>
                  editar((x) => {
                    x[k][j]![campo] = leer(e.target.value);
                    return x;
                  })
                }
                className={`h-9 w-full rounded-lg border bg-background text-center text-sm font-bold tabular-nums outline-none focus:ring-2 focus:ring-primary/30 ${
                  campo === "ps" && (s.ps ?? 0) >= 6 ? "border-rose-400 bg-rose-50 text-rose-700" : campo === "ps" && (s.ps ?? 0) >= 4 ? "border-amber-300 bg-amber-50 text-amber-700" : "border-primary/15"
                }`}
              />
            ))}
          </div>
        ))}
        <span className="text-left font-bold">NIC</span>
        {pieza[k].map((s, j) => {
          const nic = s.ps == null ? null : s.ps - (s.mg ?? 0);
          return (
            <span key={j} className={`rounded-md py-1 font-bold tabular-nums ${nic == null ? "text-muted-foreground/40" : nic >= 5 ? "bg-rose-100 text-rose-700" : nic >= 3 ? "bg-amber-100 text-amber-700" : ""}`}>
              {nic ?? "·"}
            </span>
          );
        })}
        {(["sangrado", "placa"] as const).map((campo) => (
          <div key={campo} className="contents">
            <span className="text-left font-bold">{campo === "sangrado" ? "Sangra" : "Placa"}</span>
            {pieza[k].map((s, j) => (
              <button
                key={j}
                type="button"
                disabled={pieza.ausente}
                aria-pressed={s[campo]}
                aria-label={`${campo} ${titulo} sitio ${j + 1}`}
                onClick={() =>
                  editar((x) => {
                    x[k][j]![campo] = !x[k][j]![campo];
                    return x;
                  })
                }
                className={`mx-auto size-5 rounded-full border-2 transition ${
                  s[campo] ? (campo === "sangrado" ? "border-rose-500 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]" : "border-amber-400 bg-amber-400") : "border-primary/25 hover:border-primary"
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(118deg,#4c1d95,#7c3aed_50%,#c026d3)] p-3.5 text-white shadow-[0_16px_32px_-20px_rgba(91,33,182,0.9)]">
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full bg-fuchsia-300/30 blur-2xl" />
        <p className="relative text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/70">Periodoncia · pieza {fdi}</p>
        <div className="relative mt-1 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="font-display text-xl font-bold tabular-nums">{peor || "—"}<span className="text-xs text-white/70"> mm</span></p>
            <p className="text-[10px] text-white/75">Peor sondaje</p>
          </div>
          <div>
            <p className="font-display text-xl font-bold tabular-nums">{sangra}/6</p>
            <p className="text-[10px] text-white/75">Sitios que sangran</p>
          </div>
          <div>
            <p className="font-display text-xl font-bold tabular-nums">
              {peorAntes == null ? "—" : `${peor - peorAntes > 0 ? "+" : ""}${peor - peorAntes}`}
            </p>
            <p className="text-[10px] text-white/75">vs. evaluación anterior</p>
          </div>
        </div>
        <p className="relative mt-1.5 text-[10.5px] text-white/70">
          {ultima ? `Evaluación del ${fechaCorta(ultima.fecha)}` : "Todavía sin periodontograma: al cargar un dato se crea con fecha de hoy."}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <label className="inline-flex items-center gap-2 rounded-xl border border-primary/12 bg-card px-2.5 py-1.5 font-semibold">
          Movilidad
          <select value={pieza.movilidad} onChange={(e) => editar((x) => ({ ...x, movilidad: Number(e.target.value) }))} className="bg-transparent outline-none">
            {[0, 1, 2, 3].map((n) => <option key={n}>{n}</option>)}
          </select>
        </label>
        {molar && (
          <label className="inline-flex items-center gap-2 rounded-xl border border-primary/12 bg-card px-2.5 py-1.5 font-semibold">
            Furca
            <select value={pieza.furca} onChange={(e) => editar((x) => ({ ...x, furca: Number(e.target.value) }))} className="bg-transparent outline-none">
              {[0, 1, 2, 3].map((n) => <option key={n}>{n}</option>)}
            </select>
          </label>
        )}
        <label className="inline-flex items-center gap-2 rounded-xl border border-primary/12 bg-card px-2.5 py-1.5 font-semibold">
          <input type="checkbox" checked={pieza.implante} onChange={(e) => editar((x) => ({ ...x, implante: e.target.checked }))} className="accent-[#7c3aed]" />
          Implante
        </label>
        <label className="inline-flex items-center gap-2 rounded-xl border border-primary/12 bg-card px-2.5 py-1.5 font-semibold">
          <input type="checkbox" checked={pieza.ausente} onChange={(e) => editar((x) => ({ ...x, ausente: e.target.checked }))} className="accent-[#7c3aed]" />
          Ausente
        </label>
      </div>
      {cara("v", "Vestibular")}
      {cara("p", inferior ? "Lingual" : "Palatino")}
      <p className="text-[10.5px] text-muted-foreground">MG negativo = recesión · NIC = PS − MG. El periodontograma completo está en la pestaña «Periodontograma».</p>
    </div>
  );
}
