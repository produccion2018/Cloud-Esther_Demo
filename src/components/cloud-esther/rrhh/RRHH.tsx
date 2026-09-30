import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  CircleDollarSign,
  Clock,
  FolderOpen,
  GraduationCap,
  Info,
  Megaphone,
  Palmtree,
  Receipt,
  Send,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEquipo } from "@/lib/cloud-esther/equipo-store";
import { storeEquipoPortal } from "@/lib/cloud-esther/portal-equipo-store";
import { useCloudEsther } from "@/lib/cloud-esther/data";
import { useSesion } from "@/lib/cloud-esther/auth-store";
import { sucursalesDelPlan } from "@/lib/cloud-esther/inventario-store";
import {
  PREGUNTAS_RRHH,
  datosRRHH,
  diaISO,
  horarioDe,
  insightsRRHH,
  nombreDe,
  responderRRHH,
  storeRRHH,
  type InsightRRHH,
} from "@/lib/cloud-esther/rrhh-store";
import {
  Avatar,
  BTN_PRIMARIO,
  BTN_SECUNDARIO,
  Pill,
  ROL_LABEL,
  ars,
  fecha,
  type Ctx,
  type SeccionRRHH,
} from "./ui";
import { FichaPersona, Personas } from "./Personas";
import { Asistencia, Licencias } from "./Tiempo";
import { Nomina } from "./Nomina";
import { Desarrollo } from "./Desarrollo";
import { Comunicacion } from "./Comunicacion";
import { Documentos, Gestion } from "./Gestion";

/* Ubicación: src/components/cloud-esther/rrhh/RRHH.tsx
   Recursos Humanos conectado con Equipo (mismas personas y ausencias), el portal del equipo
   (fichajes, solicitudes, comunicados) y Esther IA (análisis y redacción con datos reales). */

const SECCIONES: { id: SeccionRRHH; label: string; icon: LucideIcon }[] = [
  { id: "resumen", label: "Resumen", icon: BarChart3 },
  { id: "personas", label: "Personas", icon: Users },
  { id: "asistencia", label: "Asistencia", icon: Clock },
  { id: "licencias", label: "Licencias", icon: Palmtree },
  { id: "nomina", label: "Nómina", icon: Receipt },
  { id: "desarrollo", label: "Desarrollo", icon: GraduationCap },
  { id: "comunicacion", label: "Comunicación", icon: Megaphone },
  { id: "documentos", label: "Documentos", icon: FolderOpen },
  { id: "gestion", label: "Reportes y ajustes", icon: BarChart3 },
];

type Mensaje = { id: number; de: "yo" | "esther"; texto: string };

export function RRHH() {
  const { plan } = useCloudEsther();
  const { usuario: u } = useSesion();
  const { miembros, ausencias } = useEquipo();
  const rrhh = storeRRHH.usar();
  storeEquipoPortal.usar();
  const [montado, setMontado] = useState(false);
  const [seccion, setSeccion] = useState<SeccionRRHH>("resumen");
  const [persona, setPersona] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [chat, setChat] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [pensando, setPensando] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => setMontado(true), []);

  const onToast = (m: string) => {
    setToast(m);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 3000);
  };
  const preguntar = (q: string) => {
    const t = q.trim();
    if (!t || pensando) return;
    setChat(true);
    setMensajes((p) => [...p, { id: Date.now(), de: "yo", texto: t }]);
    setPensando(true);
    window.setTimeout(() => {
      setMensajes((p) => [...p, { id: Date.now() + 1, de: "esther", texto: responderRRHH(t) }]);
      setPensando(false);
    }, 900);
  };
  const ctx: Ctx = {
    onToast,
    usuario: u?.nombre ?? "Administración",
    sucursales: sucursalesDelPlan(plan === "grupo"),
    ir: setSeccion,
    abrirPersona: setPersona,
    preguntar,
  };

  const d = montado ? datosRRHH() : null;
  const insights = montado ? insightsRRHH() : [];
  const pendientes = rrhh.solicitudes.filter((s) => s.estado === "Pendiente").length;
  const hoy = diaISO();
  const docsVencidos = rrhh.documentos.filter(
    (x) =>
      x.vence &&
      x.vence < hoy &&
      miembros.some((m) => m.id === x.miembroId && m.status !== "inactivo"),
  ).length;
  const badge: Partial<Record<SeccionRRHH, number>> = {
    licencias: pendientes,
    documentos: docsVencidos,
    resumen: insights.filter((i) => i.nivel === "alta").length,
  };

  const kpis = d
    ? [
        {
          l: "Personas activas",
          v: String(d.activos.length),
          t: `${d.activos.filter((m) => m.role === "odontologo").length} odontólogos`,
          s: `· ${d.activos.filter((m) => m.role !== "odontologo").length} de apoyo`,
          i: Users,
        },
        {
          l: "Presentes hoy",
          v: `${d.deHoy.filter((f) => d.activos.some((m) => m.id === f.miembroId)).length}/${d.lista.filter(({ m }) => horarioDe(m, hoy)).length}`,
          t: `${d.ausentesHoy.length} con licencia`,
          s: `· ${d.deHoy.filter((f) => f.tarde).length} tarde`,
          i: UserCheck,
        },
        {
          l: "Costo laboral del mes",
          v: ars(d.recibos.reduce((a, r) => a + r.costo, 0)),
          t: ars(d.recibos.reduce((a, r) => a + r.neto, 0)),
          s: "neto a pagar",
          i: CircleDollarSign,
        },
        {
          l: "Para resolver",
          v: String(insights.length),
          t: `${insights.filter((i) => i.nivel === "alta").length} urgentes`,
          s: `· ${pendientes} solicitudes`,
          i: AlertTriangle,
        },
      ]
    : [];

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
                    <Users className="size-3.5" />
                    Personas
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-200/70 bg-fuchsia-50/80 px-3 py-1.5 text-[11px] font-bold text-fuchsia-700">
                    <Sparkles className="size-3.5" />
                    Con Esther IA
                  </span>
                  {montado && pendientes > 0 && (
                    <button
                      type="button"
                      onClick={() => setSeccion("licencias")}
                      className="rounded-full border border-amber-200/70 bg-amber-50/80 px-3 py-1.5 text-[11px] font-bold text-amber-700"
                    >
                      {pendientes} solicitudes por responder
                    </button>
                  )}
                </div>
                <h1 className="mt-4 text-[34px] font-bold tracking-[-0.035em] md:text-[42px]">
                  Recursos humanos
                </h1>
                <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-foreground md:text-sm">
                  Legajos, asistencia, licencias, sueldos, capacitaciones y comunicación del equipo.
                  Conectado con Equipo, el portal del equipo y Esther.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button type="button" className={BTN_SECUNDARIO} onClick={() => setChat(true)}>
                  <Bot className="size-4" />
                  Preguntar a Esther
                </button>
                <button
                  type="button"
                  className={BTN_PRIMARIO}
                  onClick={() => setSeccion("personas")}
                >
                  <UserPlus className="size-4" />
                  Personas
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
                        <p className="mt-2 text-[27px] font-bold leading-none tracking-tight text-primary">
                          {c.v}
                        </p>
                        <p className="mt-2 text-[11px]">
                          <span className="font-semibold text-primary">{c.t}</span>{" "}
                          <span className="text-muted-foreground">{c.s}</span>
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
              aria-label="Secciones de recursos humanos"
            >
              {SECCIONES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSeccion(s.id)}
                  aria-pressed={seccion === s.id}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                    seccion === s.id
                      ? "bg-primary text-primary-foreground shadow-[0_8px_18px_-10px_rgba(124,58,237,0.8)]"
                      : "text-muted-foreground hover:bg-white hover:text-foreground"
                  }`}
                >
                  <s.icon className="size-3.5" />
                  {s.label}
                  {montado && !!badge[s.id] && (
                    <span
                      className={`grid min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold ${seccion === s.id ? "bg-white/25 text-white" : "bg-amber-500 text-white"}`}
                    >
                      {badge[s.id]}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </section>

        <div className="mt-5">
          {!montado || !d ? (
            <div className="card-grad h-[480px] animate-pulse" />
          ) : seccion === "resumen" ? (
            <Resumen ctx={ctx} insights={insights} d={d} ausencias={ausencias} />
          ) : seccion === "personas" ? (
            <Personas ctx={ctx} />
          ) : seccion === "asistencia" ? (
            <Asistencia ctx={ctx} />
          ) : seccion === "licencias" ? (
            <Licencias ctx={ctx} />
          ) : seccion === "nomina" ? (
            <Nomina ctx={ctx} />
          ) : seccion === "desarrollo" ? (
            <Desarrollo ctx={ctx} />
          ) : seccion === "comunicacion" ? (
            <Comunicacion ctx={ctx} />
          ) : seccion === "documentos" ? (
            <Documentos ctx={ctx} />
          ) : (
            <Gestion ctx={ctx} />
          )}
        </div>
      </div>

      {persona && <FichaPersona id={persona} ctx={ctx} onClose={() => setPersona(null)} />}

      {montado && !chat && (
        <button
          type="button"
          onClick={() => setChat(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-fuchsia-500 py-2 pl-2 pr-4 text-sm font-semibold text-white shadow-[0_16px_34px_-14px_rgba(124,58,237,0.9)] transition-transform hover:-translate-y-0.5"
        >
          <span className="grid size-8 place-items-center rounded-full bg-white/20">
            <Sparkles className="size-4" />
          </span>
          Esther RRHH
        </button>
      )}
      {chat && (
        <ChatEsther
          mensajes={mensajes}
          pensando={pensando}
          onPreguntar={preguntar}
          onCerrar={() => setChat(false)}
          onLimpiar={() => setMensajes([])}
        />
      )}

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background shadow-xl"
          role="status"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

/* ───────────── Chat de Esther ───────────── */

function ChatEsther({
  mensajes,
  pensando,
  onPreguntar,
  onCerrar,
  onLimpiar,
}: {
  mensajes: Mensaje[];
  pensando: boolean;
  onPreguntar: (q: string) => void;
  onCerrar: () => void;
  onLimpiar: () => void;
}) {
  const [txt, setTxt] = useState("");
  const fin = useRef<HTMLDivElement>(null);
  useEffect(
    () => fin.current?.scrollIntoView({ behavior: "smooth", block: "end" }),
    [mensajes, pensando],
  );
  return (
    <aside
      role="dialog"
      aria-label="Esther RRHH"
      className="fixed bottom-4 right-4 z-50 flex max-h-[min(640px,calc(100vh-2rem))] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[26px] border border-primary/20 bg-white shadow-[0_30px_70px_-30px_rgba(76,29,149,0.7)]"
    >
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-violet-500 to-fuchsia-500 p-4 text-white">
        <div className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-white/15 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <span className="relative grid size-11 place-items-center rounded-2xl bg-white/20 font-display text-lg font-bold">
            E
            <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white bg-emerald-400" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Esther · Recursos humanos</p>
            <p className="text-[11px] text-white/80">Respondo con los datos reales de tu equipo</p>
          </div>
          <button
            type="button"
            aria-label="Cerrar Esther"
            onClick={onCerrar}
            className="grid size-8 place-items-center rounded-xl hover:bg-white/15"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
      <div className="scroll-sutil flex-1 space-y-2.5 overflow-y-auto bg-gradient-to-b from-primary/[0.03] to-transparent p-3">
        {mensajes.length === 0 && (
          <div className="rounded-2xl bg-white p-3 text-sm ring-1 ring-primary/10">
            ¡Hola! Soy Esther. Puedo contarte quién falta hoy, qué vence, cuánto cuesta el equipo,
            quién llega tarde o el saldo de vacaciones. También podés preguntarme por una persona.
          </div>
        )}
        {mensajes.map((m) => (
          <div key={m.id} className={`flex ${m.de === "yo" ? "justify-end" : "justify-start"}`}>
            <p
              className={`max-w-[88%] whitespace-pre-line rounded-2xl px-3 py-2 text-[13px] leading-5 ${m.de === "yo" ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-white ring-1 ring-primary/10"}`}
            >
              {m.texto}
            </p>
          </div>
        ))}
        {pensando && (
          <div
            className="flex w-fit items-center gap-1 rounded-2xl rounded-bl-md bg-white px-3 py-2.5 ring-1 ring-primary/10"
            aria-label="Esther está pensando"
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-1.5 animate-bounce rounded-full bg-primary/60"
                style={{ animationDelay: `${i * 120}ms` }}
              />
            ))}
          </div>
        )}
        <div ref={fin} />
      </div>
      <div className="border-t border-primary/10 p-3">
        <div className="scroll-sutil -mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {PREGUNTAS_RRHH.map((q) => (
            <button
              key={q}
              type="button"
              disabled={pensando}
              onClick={() => onPreguntar(q)}
              className="shrink-0 rounded-full bg-primary/[0.07] px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/15 disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onPreguntar(txt);
            setTxt("");
          }}
          className="flex gap-2"
        >
          <input
            value={txt}
            onChange={(e) => setTxt(e.target.value)}
            placeholder="Preguntale a Esther…"
            aria-label="Pregunta para Esther"
            className="h-10 min-w-0 flex-1 rounded-xl border border-primary/15 bg-white px-3 text-sm outline-none focus:border-primary/45"
          />
          <button
            type="submit"
            aria-label="Enviar pregunta"
            disabled={pensando || !txt.trim()}
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-white disabled:opacity-40"
          >
            <Send className="size-4" />
          </button>
        </form>
        {mensajes.length > 0 && (
          <button
            type="button"
            onClick={onLimpiar}
            className="mt-1.5 text-[11px] text-muted-foreground hover:text-primary"
          >
            Nueva conversación
          </button>
        )}
      </div>
    </aside>
  );
}

/* ───────────── Resumen ───────────── */

const NIVEL: Record<InsightRRHH["nivel"], { clase: string; icon: LucideIcon }> = {
  alta: { clase: "bg-rose-50/80 ring-rose-200 text-rose-700", icon: AlertTriangle },
  media: { clase: "bg-amber-50/70 ring-amber-200 text-amber-700", icon: AlertTriangle },
  info: { clase: "bg-sky-50/70 ring-sky-200 text-sky-700", icon: Info },
};

function Resumen({
  ctx,
  insights,
  d,
  ausencias,
}: {
  ctx: Ctx;
  insights: InsightRRHH[];
  d: ReturnType<typeof datosRRHH>;
  ausencias: ReturnType<typeof useEquipo>["ausencias"];
}) {
  const hoy = diaISO();
  const trabajan = d.lista.filter(({ m }) => horarioDe(m, hoy));
  const proximas = ausencias
    .filter((a) => a.desde > hoy && a.desde <= diaISO(30))
    .sort((a, b) => a.desde.localeCompare(b.desde));
  const porRol = (Object.keys(ROL_LABEL) as (keyof typeof ROL_LABEL)[]).map((r) => ({
    r,
    n: d.activos.filter((m) => m.role === r).length,
  }));
  const nombre = (id: string) => {
    const m = d.eq.miembros.find((x) => x.id === id);
    return m ? nombreDe(m) : "—";
  };
  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.55fr_1fr]">
      <div className="space-y-3">
        <div className="card-grad p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="size-4 text-fuchsia-500" /> Esther detectó
            </p>
            <span className="text-[11px] text-muted-foreground">{insights.length} temas</span>
          </div>
          {insights.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Todo en orden: no hay nada pendiente en RRHH.
            </p>
          ) : (
            <ul className="scroll-sutil mt-3 max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
              {insights.map((i) => {
                const N = NIVEL[i.nivel];
                return (
                  <li
                    key={i.id}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 ring-1 ${N.clase}`}
                  >
                    <N.icon className="size-4 shrink-0" />
                    <div className="min-w-0 flex-1 text-foreground">
                      <p className="text-sm font-semibold">{i.titulo}</p>
                      <p className="text-[11px] text-muted-foreground">{i.detalle}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => ctx.ir(i.seccion as Parameters<Ctx["ir"]>[0])}
                      className="flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-primary ring-1 ring-primary/15 hover:bg-primary/10"
                    >
                      Resolver <ArrowRight className="size-3" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card-grad p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">Hoy en la clínica</p>
            <button
              type="button"
              className="text-[11px] font-semibold text-primary hover:underline"
              onClick={() => ctx.ir("asistencia")}
            >
              Ver asistencia
            </button>
          </div>
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {trabajan.map(({ m, l }) => {
              const f = d.deHoy.find((x) => x.miembroId === m.id);
              const lic = d.ausentesHoy.find((a) => a.miembroId === m.id);
              const h = horarioDe(m, hoy);
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => ctx.abrirPersona(m.id)}
                    className="flex w-full items-center gap-2.5 rounded-2xl bg-white/85 p-2.5 text-left ring-1 ring-primary/10 hover:ring-primary/30"
                  >
                    <span className="relative">
                      <Avatar m={m} tam="size-9" />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white ${lic ? "bg-amber-400" : f ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold">{nombreDe(m)}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {lic
                          ? lic.tipo
                          : f
                            ? `Entró ${f.entrada}${f.tarde ? ` · ${f.tarde}′ tarde` : ""}`
                            : `Entra ${h?.start ?? ""} · ${l.sucursal.replace("Clínica ", "")}`}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="card-grad p-4">
            <p className="text-sm font-semibold">Equipo por rol</p>
            <ul className="mt-3 space-y-2.5">
              {porRol.map(({ r, n }) => (
                <li key={r}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>{ROL_LABEL[r]}</span>
                    <b>{n}</b>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-primary/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-fuchsia-500"
                      style={{ width: `${d.activos.length ? (n / d.activos.length) * 100 : 0}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="card-grad p-4">
            <p className="text-sm font-semibold">
              Nómina de {fecha(`${d.periodo.periodo}-01`).slice(3)}
            </p>
            <p className="mt-2 text-3xl font-bold text-primary">
              {ars(d.recibos.reduce((a, r) => a + r.neto, 0))}
            </p>
            <p className="text-[11px] text-muted-foreground">
              neto a pagar · {d.periodo.estado.toLowerCase()}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Pill clase="bg-primary/10 text-primary">
                Costo {ars(d.recibos.reduce((a, r) => a + r.costo, 0))}
              </Pill>
              {d.recibos.some((r) => r.pierdePresentismo) && (
                <Pill clase="bg-orange-100 text-orange-700">
                  {d.recibos.filter((r) => r.pierdePresentismo).length} pierden presentismo
                </Pill>
              )}
            </div>
            <button
              type="button"
              className={`${BTN_SECUNDARIO} mt-3`}
              onClick={() => ctx.ir("nomina")}
            >
              <Receipt className="size-4" />
              Ir a nómina
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-primary via-violet-500 to-fuchsia-500 p-5 text-white shadow-[0_24px_50px_-28px_rgba(124,58,237,0.9)]">
          <div className="pointer-events-none absolute -right-14 -top-14 size-48 rounded-full bg-white/15 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-white/20 font-display text-xl font-bold">
                E
              </span>
              <div>
                <p className="font-semibold">Esther, tu asistente de RRHH</p>
                <p className="text-[11px] text-white/80">
                  Analiza asistencia, licencias, vencimientos y costos
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/95">
              {responderRRHH("resumen").split("\n").slice(0, 3).join(" ")}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {PREGUNTAS_RRHH.slice(0, 4).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => ctx.preguntar(q)}
                  className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold hover:bg-white/30"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card-grad p-4">
          <p className="text-sm font-semibold">Licencias y ausencias (30 días)</p>
          {d.ausentesHoy.length + proximas.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">Sin licencias próximas.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {[...d.ausentesHoy, ...proximas].slice(0, 6).map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-white/80 px-3 py-2 text-xs ring-1 ring-primary/10"
                >
                  <span className="truncate">
                    <b>{nombre(a.miembroId)}</b> · {a.tipo}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {a.desde <= hoy ? "hoy" : fecha(a.desde)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className={`${BTN_SECUNDARIO} mt-3`}
            onClick={() => ctx.ir("licencias")}
          >
            <Palmtree className="size-4" />
            Ver calendario
          </button>
        </div>

        <div className="card-grad p-4">
          <p className="text-sm font-semibold">Último comunicado</p>
          {d.r.comunicados[0] ? (
            <>
              <p className="mt-2 text-sm font-medium">{d.r.comunicados[0].titulo}</p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {d.r.comunicados[0].texto}
              </p>
            </>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">Sin comunicados.</p>
          )}
          <button
            type="button"
            className={`${BTN_SECUNDARIO} mt-3`}
            onClick={() => ctx.ir("comunicacion")}
          >
            <Megaphone className="size-4" />
            Comunicar al equipo
          </button>
        </div>
      </div>
    </div>
  );
}
