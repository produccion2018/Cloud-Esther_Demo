import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarX2,
  CircleDollarSign,
  FileSpreadsheet,
  Lock,
  Search,
  Stethoscope,
  UserRound,
} from "lucide-react";

import { IconoWhatsApp } from "@/components/cloud-esther/IconoWhatsApp";
import {
  DIAS_TRATAMIENTO_INCONCLUSO,
  diasDesdeFecha,
  ultimaActividadTratamiento,
  useRegistrosPacientes,
  useTodosLosRegistros,
  type TratamientoPaciente,
} from "@/components/cloud-esther/PacienteSecciones";
import { storeAgenda } from "@/lib/cloud-esther/agenda-store";
import { planLevel, useCloudEsther } from "@/lib/cloud-esther/data";
import { usePacientes } from "@/lib/cloud-esther/pacientes";
import { telefonoInternacional } from "@/lib/clinica/whatsapp";
import { normalizarBusqueda } from "@/lib/utils";
import { Seleccion } from "@/components/ui/seleccion";

/* Ubicación: src/components/cloud-esther/tratamientos/PanelTratamientos.tsx
   TODOS LOS TRATAMIENTOS (desde el plan Pro): los de todos los pacientes en un lugar.
   - Tratamientos: en curso, sin turno agendado, sin terminar (30 días sin venir), por
     profesional; abrir la ficha o invitar a retomar por WhatsApp.
   - Reportes: por profesional, producción por mes, finalización y planes aceptados (+ Excel).
   Los tratamientos se cargan en la ficha de cada paciente. Datos por empresa. */

type Fila = {
  pid: number;
  paciente: string;
  telefono: string;
  t: TratamientoPaciente;
  /** Próximo turno del paciente (fecha y hora) */
  proximo: string;
  /** Días sin venir si quedó por la mitad */
  parado: number | null;
};
type Filtro = "curso" | "sinTurno" | "parados" | "planificados" | "terminados" | "todos";

const pesos = (n: number) => `$ ${Math.round(n).toLocaleString("es-AR")}`;
const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fechaCorta = (f: string) => (f ? f.split("-").reverse().join("/") : "—");
const terminado = (t: TratamientoPaciente) => t.estado === "Completado" || t.estado === "Finalizado";
const enCurso = (t: TratamientoPaciente) => t.estado === "En tratamiento";
/** Valor de cada sesión (para la producción): el valor del tratamiento repartido en sus sesiones. */
const valorSesion = (t: TratamientoPaciente) => (t.costo ?? 0) / Math.max(1, t.sesionesPlan ?? 1);
const COLOR: Record<string, string> = {
  Pendiente: "bg-slate-100 text-slate-700",
  Planificado: "bg-sky-100 text-sky-700",
  "En tratamiento": "bg-violet-100 text-violet-700",
  Completado: "bg-emerald-100 text-emerald-700",
  Finalizado: "bg-emerald-100 text-emerald-700",
  Cancelado: "bg-rose-100 text-rose-700",
};

export function PanelTratamientos({ onAbrir }: { onAbrir: (pid: number) => void }) {
  const { plan } = useCloudEsther();
  const [vista, setVista] = useState<"lista" | "reportes">("lista");
  const registros = useTodosLosRegistros();
  const { pacientes } = usePacientes();
  const turnos = storeAgenda.usar().turnos;

  const filas: Fila[] = useMemo(() => {
    const hoy = hoyISO();
    return pacientes.flatMap((p) => {
      const nombre = `${p.nombre} ${p.apellido}`.trim();
      const suyos = turnos.filter((x) => x.paciente.trim().toLowerCase() === nombre.toLowerCase());
      const futuro = suyos
        .filter((x) => x.fecha >= hoy && x.estado !== "Cancelada" && x.estado !== "Ausente")
        .sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`))[0];
      const visita = suyos.filter((x) => x.fecha < hoy && x.estado === "Atendida").map((x) => x.fecha).sort().pop() ?? "";
      return (registros[p.id]?.tratamientos ?? []).map((t) => {
        const u = ultimaActividadTratamiento(t, visita);
        const dias = diasDesdeFecha(u);
        const parado = enCurso(t) && !futuro && u && dias >= DIAS_TRATAMIENTO_INCONCLUSO ? dias : null;
        return { pid: p.id, paciente: nombre, telefono: p.telefono ?? "", t, proximo: futuro ? `${futuro.fecha} ${futuro.hora}` : "", parado };
      });
    });
  }, [pacientes, registros, turnos]);

  if (planLevel(plan) < 2)
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-primary/25 bg-gradient-to-br from-primary/[0.05] to-fuchsia-500/[0.05] px-6 py-12 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow-lg">
          <Lock className="size-6" />
        </span>
        <p className="font-display text-lg font-bold">Panel de tratamientos: desde el plan Pro</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Todos los tratamientos de la clínica en un lugar: en curso, sin turno, sin terminar, por profesional, producción del mes y reportes.
        </p>
      </div>
    );

  const mes = hoyISO().slice(0, 7);
  const curso = filas.filter((f) => enCurso(f.t)).length;
  const sinTurno = filas.filter((f) => enCurso(f.t) && !f.proximo).length;
  const parados = filas.filter((f) => f.parado !== null).length;
  const produccionMes = filas.reduce(
    (a, f) => a + (f.t.sesiones ?? []).filter((s) => s.fecha.startsWith(mes)).length * valorSesion(f.t),
    0,
  );

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[26px] bg-[linear-gradient(118deg,#4c1d95,#7c3aed_45%,#c026d3)] p-5 text-white shadow-[0_26px_60px_-36px_rgba(91,33,182,0.95)]">
        <div aria-hidden className="pointer-events-none absolute -right-12 -top-16 size-56 rounded-full bg-fuchsia-300/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:linear-gradient(100deg,transparent_45%,black)]" />
        <div className="relative flex flex-wrap items-center gap-4">
          <span className="grid size-12 place-items-center rounded-2xl border border-white/30 bg-white/15">
            <Stethoscope className="size-6" />
          </span>
          <div className="min-w-0 flex-1 basis-[200px]">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/70">Tratamientos</p>
            <h2 className="font-display text-xl font-bold tracking-tight">Todos los pacientes en un lugar</h2>
            <p className="text-sm text-white/85">
              {new Set(filas.map((f) => f.pid)).size} pacientes · {filas.length} tratamientos
            </p>
          </div>
          <div className="inline-flex gap-1 rounded-2xl bg-white/15 p-1 backdrop-blur max-sm:w-full max-sm:[&>button]:flex-1" role="tablist">
            {(
              [
                ["lista", "Tratamientos"],
                ["reportes", "Reportes"],
              ] as const
            ).map(([id, l]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={vista === id}
                onClick={() => setVista(id)}
                className={`min-h-9 rounded-xl px-3.5 text-[13px] font-semibold transition ${vista === id ? "bg-white text-primary shadow" : "text-white/85 hover:bg-white/10"}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(
          [
            ["En curso", String(curso), Activity, "from-primary to-fuchsia-500", "tratamientos"],
            ["Sin turno", String(sinTurno), CalendarX2, "from-amber-500 to-orange-500", "en curso sin turno"],
            ["Sin terminar", String(parados), AlertTriangle, "from-rose-500 to-pink-500", `${DIAS_TRATAMIENTO_INCONCLUSO}+ días sin venir`],
            ["Producción", pesos(produccionMes), CircleDollarSign, "from-emerald-500 to-teal-500", "este mes"],
          ] as const
        ).map(([t, v, I, c, sub]) => (
          <div key={t} className="relative overflow-hidden rounded-3xl border border-primary/10 bg-card p-4 shadow-[0_18px_40px_-30px_rgba(76,29,149,0.6)]">
            <span aria-hidden className={`absolute -right-10 -top-12 size-32 rounded-full bg-gradient-to-br ${c} opacity-15 blur-2xl`} />
            <div className="relative flex items-start justify-between gap-2">
              <p className="min-w-0 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t}</p>
              <span className={`grid size-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${c} text-white shadow-md`}>
                <I className="size-[18px]" />
              </span>
            </div>
            <p className="relative mt-1.5 truncate font-display text-[26px] font-bold tabular-nums">{v}</p>
            <p className="relative truncate text-[11px] text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      {vista === "lista" ? <Lista filas={filas} onAbrir={onAbrir} /> : <Reportes filas={filas} />}
    </div>
  );
}

function Lista({ filas, onAbrir }: { filas: Fila[]; onAbrir: (pid: number) => void }) {
  const { cambiar } = useRegistrosPacientes();
  const [filtro, setFiltro] = useState<Filtro>("curso");
  const [profesional, setProfesional] = useState("");
  const [q, setQ] = useState("");
  const profesionales = [...new Set(filas.map((f) => f.t.profesional || "Sin asignar"))].sort();
  const cumple = (f: Fila, x: Filtro) =>
    x === "todos"
      ? true
      : x === "curso"
        ? enCurso(f.t)
        : x === "sinTurno"
          ? enCurso(f.t) && !f.proximo
          : x === "parados"
            ? f.parado !== null
            : x === "planificados"
              ? f.t.estado === "Planificado" || f.t.estado === "Pendiente"
              : terminado(f.t);
  const texto = normalizarBusqueda(q);
  const lista = filas
    .filter((f) => cumple(f, filtro))
    .filter((f) => !profesional || (f.t.profesional || "Sin asignar") === profesional)
    .filter((f) => !texto || normalizarBusqueda(`${f.paciente} ${f.t.nombre} ${f.t.pieza}`).includes(texto))
    .sort((a, b) => (b.parado ?? -1) - (a.parado ?? -1) || a.paciente.localeCompare(b.paciente));

  const invitar = (f: Fila) => {
    const nombre = f.paciente.split(" ")[0] ?? "";
    const tel = telefonoInternacional(f.telefono);
    const texto = `Hola${nombre ? ` ${nombre}` : ""} 👋 ¿Cómo estás? Vimos que tu ${f.t.nombre.toLowerCase()}${f.t.pieza ? ` (pieza ${f.t.pieza})` : ""} quedó sin terminar. Respondé este mensaje y te damos un turno para continuarlo.`;
    window.open(`https://wa.me/${tel ?? ""}?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer");
    cambiar(f.pid, "tratamientos", (prev) => prev.map((x) => (x.id === f.t.id ? { ...x, invitadoRetomar: hoyISO() } : x)));
  };

  const FILTROS: [Filtro, string][] = [
    ["curso", "En curso"],
    ["sinTurno", "Sin turno"],
    ["parados", "Sin terminar"],
    ["planificados", "Planificados"],
    ["terminados", "Terminados"],
    ["todos", "Todos"],
  ];

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 basis-60">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary/60" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar paciente, tratamiento o pieza"
            className="h-10 w-full rounded-xl border border-primary/15 bg-card pl-9 pr-3 text-sm outline-none transition focus:border-primary/45 focus:ring-4 focus:ring-primary/10"
          />
        </label>
        <Seleccion value={profesional} onChange={(e) => setProfesional(e.target.value)} className="h-10 rounded-xl border border-primary/15 bg-card px-3 text-sm">
          <option value="">Todos los profesionales</option>
          {profesionales.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Seleccion>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {FILTROS.map(([id, l]) => (
          <button
            key={id}
            type="button"
            aria-pressed={filtro === id}
            onClick={() => setFiltro(id)}
            className={`min-h-9 rounded-full px-3.5 text-[12.5px] font-semibold transition ${
              filtro === id
                ? "bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500 text-white shadow-[0_10px_22px_-12px_rgba(124,58,237,0.95)]"
                : "bg-card text-muted-foreground ring-1 ring-primary/10 hover:text-foreground"
            }`}
          >
            {l} ({filas.filter((f) => cumple(f, id)).length})
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-primary/25 px-4 py-10 text-center text-sm text-muted-foreground">
          No hay tratamientos acá.
        </p>
      ) : (
        <ul data-movil="1col" className="grid gap-2.5 md:grid-cols-2">
          {lista.slice(0, 200).map((f) => {
            const hechas = f.t.sesiones?.length ?? 0;
            const planS = f.t.sesionesPlan ?? 1;
            const avance = terminado(f.t) ? 100 : Math.min(100, Math.round((hechas / planS) * 100));
            return (
              <li key={`${f.pid}-${f.t.id}`} className={`rounded-3xl border bg-card p-4 shadow-[0_18px_40px_-34px_rgba(76,29,149,0.7)] ${f.parado !== null ? "border-rose-200" : "border-primary/12"}`}>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-bold leading-tight">
                      {f.t.nombre}
                      {f.t.pieza ? <span className="font-medium text-muted-foreground"> · pieza {f.t.pieza}</span> : null}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <UserRound className="size-3" /> {f.paciente}
                      </span>
                      {f.t.profesional && <span>· {f.t.profesional}</span>}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-bold ${COLOR[f.t.estado] ?? "bg-muted"}`}>{f.t.estado}</span>
                </div>
                <div className="mt-2.5 flex items-center gap-2 text-[11px]">
                  <span className="shrink-0 font-semibold">
                    Sesiones {hechas}/{planS}
                  </span>
                  <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-primary/10">
                    <span className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-fuchsia-500" style={{ width: `${avance}%` }} />
                  </span>
                  {(f.t.costo ?? 0) > 0 && <span className="shrink-0 font-semibold tabular-nums">{pesos(f.t.costo ?? 0)}</span>}
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {f.proximo ? (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10.5px] font-bold text-emerald-700">
                      Turno {fechaCorta(f.proximo.slice(0, 10)).slice(0, 5)} {f.proximo.slice(11)}
                    </span>
                  ) : enCurso(f.t) ? (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10.5px] font-bold text-amber-700">Sin turno agendado</span>
                  ) : null}
                  {f.parado !== null && (
                    <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10.5px] font-bold text-rose-700">Sin venir hace {f.parado} días</span>
                  )}
                  {f.t.invitadoRetomar && f.parado !== null && (
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[10.5px] font-bold text-muted-foreground">
                      Invitado {fechaCorta(f.t.invitadoRetomar).slice(0, 5)}
                    </span>
                  )}
                  <span className="flex-1" />
                  {f.parado !== null && (
                    <button type="button" onClick={() => invitar(f)} className="btn-wa !min-h-9">
                      <IconoWhatsApp /> Invitar
                    </button>
                  )}
                  <button type="button" onClick={() => onAbrir(f.pid)} className="btn-ce-outline !min-h-9">
                    Abrir ficha
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Reportes({ filas }: { filas: Fila[] }) {
  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const profesionales = [...new Set(filas.map((f) => f.t.profesional || "Sin asignar"))].sort();
  const de = (p: string) => filas.filter((f) => (f.t.profesional || "Sin asignar") === p);
  const term = filas.filter((f) => terminado(f.t)).length;
  const canc = filas.filter((f) => f.t.estado === "Cancelado").length;
  const conPlan = filas.filter((f) => f.t.etapa || f.t.opcion || f.t.aceptado);
  const aceptados = conPlan.filter((f) => f.t.aceptado).length;

  const REPORTES: { id: string; titulo: string; moneda?: boolean; filas: { k: string; v: number; txt: string }[] }[] = [
    {
      id: "curso",
      titulo: "En curso por profesional",
      filas: profesionales.map((p) => {
        const x = de(p).filter((f) => enCurso(f.t)).length;
        return { k: p, v: x, txt: String(x) };
      }),
    },
    {
      id: "terminados",
      titulo: "Terminados por profesional",
      filas: profesionales.map((p) => {
        const x = de(p).filter((f) => terminado(f.t)).length;
        return { k: p, v: x, txt: String(x) };
      }),
    },
    {
      id: "produccion",
      titulo: "Producción por mes (sesiones hechas)",
      moneda: true,
      filas: meses.map((m) => {
        const x = filas.reduce((a, f) => a + (f.t.sesiones ?? []).filter((s) => s.fecha.startsWith(m)).length * valorSesion(f.t), 0);
        return { k: new Date(`${m}-15T12:00:00`).toLocaleDateString("es-AR", { month: "short", year: "2-digit" }), v: Math.round(x), txt: pesos(x) };
      }),
    },
    {
      id: "prodProfesional",
      titulo: "Producción del mes por profesional",
      moneda: true,
      filas: profesionales.map((p) => {
        const mes = hoyISO().slice(0, 7);
        const x = de(p).reduce((a, f) => a + (f.t.sesiones ?? []).filter((s) => s.fecha.startsWith(mes)).length * valorSesion(f.t), 0);
        return { k: p, v: Math.round(x), txt: pesos(x) };
      }),
    },
    {
      id: "finalizacion",
      titulo: "Cómo terminan los tratamientos",
      filas: [
        { k: "Terminados", v: term, txt: `${term}${term + canc ? ` (${Math.round((term / (term + canc)) * 100)}%)` : ""}` },
        { k: "Cancelados", v: canc, txt: String(canc) },
        { k: "Sin terminar (30+ días)", v: filas.filter((f) => f.parado !== null).length, txt: String(filas.filter((f) => f.parado !== null).length) },
      ],
    },
    {
      id: "planes",
      titulo: "Planes de tratamiento",
      filas: [
        { k: "Aceptados", v: aceptados, txt: String(aceptados) },
        { k: "Sin respuesta", v: conPlan.length - aceptados, txt: String(conPlan.length - aceptados) },
      ],
    },
  ];

  const excel = async () => {
    const { descargarExcel } = await import("@/components/cloud-esther/rrhh/excel");
    await descargarExcel(`reportes-tratamientos-${hoyISO()}.xlsx`, [
      ...REPORTES.map((r) => ({
        nombre: r.titulo.slice(0, 31),
        columnas: [
          { titulo: "Detalle", clave: "k", ancho: 32 },
          { titulo: "Valor", clave: "v", ancho: 16, ...(r.moneda ? { moneda: true } : {}) },
        ],
        filas: r.filas.map((f) => ({ k: f.k, v: f.v })),
      })),
      {
        nombre: "Tratamientos",
        columnas: [
          { titulo: "Paciente", clave: "p", ancho: 24 },
          { titulo: "Tratamiento", clave: "t", ancho: 26 },
          { titulo: "Pieza", clave: "pz", ancho: 10 },
          { titulo: "Profesional", clave: "pr", ancho: 22 },
          { titulo: "Estado", clave: "e", ancho: 16 },
          { titulo: "Sesiones", clave: "s", ancho: 10 },
          { titulo: "Próximo turno", clave: "pt", ancho: 16 },
          { titulo: "Valor", clave: "c", ancho: 14, moneda: true },
        ],
        filas: filas.map((f) => ({
          p: f.paciente,
          t: f.t.nombre,
          pz: f.t.pieza,
          pr: f.t.profesional,
          e: f.t.estado,
          s: `${f.t.sesiones?.length ?? 0}/${f.t.sesionesPlan ?? 1}`,
          pt: f.proximo ? `${fechaCorta(f.proximo.slice(0, 10))} ${f.proximo.slice(11)}` : f.parado !== null ? `Sin venir hace ${f.parado} días` : "",
          c: f.t.costo ?? 0,
        })),
      },
    ]);
  };

  return (
    <section className="space-y-3">
      <div className="flex justify-end">
        <button type="button" onClick={() => void excel()} className="btn-ce !min-h-10">
          <FileSpreadsheet className="size-4" /> Exportar todo a Excel
        </button>
      </div>
      <div data-movil="1col" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {REPORTES.map((r) => {
          const max = Math.max(1, ...r.filas.map((f) => f.v));
          return (
            <article key={r.id} className="rounded-3xl border border-primary/12 bg-card p-4 shadow-[0_18px_40px_-32px_rgba(76,29,149,0.7)]">
              <p className="flex items-center gap-2 font-display text-sm font-bold">
                <BarChart3 className="size-4 text-primary" /> {r.titulo}
              </p>
              {r.filas.length === 0 ? (
                <p className="mt-4 text-xs text-muted-foreground">Sin datos todavía.</p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {r.filas.map((f, i) => (
                    <li key={f.k} className="grid grid-cols-[minmax(0,120px)_1fr_auto] items-center gap-2 text-xs">
                      <span className="truncate font-semibold">{f.k}</span>
                      <span className="relative h-2.5 overflow-hidden rounded-full bg-muted">
                        <span
                          className="ce-portal-crecer absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-fuchsia-500"
                          style={{ width: `${f.v ? Math.max(4, (f.v / max) * 100) : 0}%`, animationDelay: `${i * 60}ms` }}
                        />
                      </span>
                      <b className="tabular-nums">{f.txt}</b>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
