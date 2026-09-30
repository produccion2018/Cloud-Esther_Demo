import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AlarmClock,
  ArrowRight,
  BarChart3,
  BadgePercent,
  Calculator,
  CalendarClock,
  Check,
  CircleDollarSign,
  ClipboardList,
  Copy,
  Download,
  FileSpreadsheet,
  FolderOpen,
  LayoutGrid,
  List,
  Mail,
  MessageCircle,
  Pencil,
  Plus,
  Printer,
  ReceiptText,
  Search,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  TrendingUp,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  ESTADOS_PRESUPUESTO,
  useRegistrosPacientes,
  useTodosLosRegistros,
  type EstadoPresupuesto,
  type LineaPresupuesto,
  type PresupuestoPaciente,
} from "@/components/cloud-esther/PacienteSecciones";
import { usePacientes, type Paciente } from "@/lib/cloud-esther/pacientes";
import { useEquipo } from "@/lib/cloud-esther/equipo-store";
import { useSesion } from "@/lib/cloud-esther/auth-store";
import {
  CATEGORIAS_ARANCEL,
  MOTIVOS_RECHAZO,
  conPlan,
  setPresupuestos,
  storePresupuestos,
  type Arancel,
  type CategoriaArancel,
  type PlanFinanciacion,
  type Plantilla,
} from "@/lib/cloud-esther/presupuestos-store";
import { normalizarBusqueda } from "@/lib/utils";
import {
  Acciones,
  BTN_ICONO,
  BTN_PRIMARIO,
  BTN_SECUNDARIO,
  CHIP,
  Encabezado,
  Field,
  INPUT,
  Mini,
  Modal as ModalBase,
  Pill,
  Sel,
  Vacio,
  ars,
  fecha,
  imprimirHTML,
} from "@/components/cloud-esther/rrhh/ui";
import { descargarExcel, leerPlanilla } from "@/components/cloud-esther/rrhh/excel";

/* Ubicación: src/components/cloud-esther/presupuestos/Presupuestos.tsx
   Presupuestos de toda la clínica: se guardan en la ficha de cada paciente (los ve y aprueba
   desde el portal del paciente) y al aprobarse generan el cargo en su cuenta corriente. */

type Modal = Parameters<typeof ModalBase>[0];
function M(props: Modal) {
  return <ModalBase {...props} modulo="Presupuestos" />;
}

type Seccion =
  "tablero" | "lista" | "seguimiento" | "aranceles" | "plantillas" | "financiacion" | "reportes";
type Fila = { pid: number; pac: Paciente | undefined; p: PresupuestoPaciente };
type Ctx = {
  onToast: (m: string) => void;
  usuario: string;
  abrir: (pid: number, id: number) => void;
  nuevo: (base?: Partial<Borrador>) => void;
};

const ESTILO: Record<EstadoPresupuesto | "Vencido", string> = {
  Borrador: "bg-muted text-muted-foreground",
  Enviado: "bg-violet-100 text-violet-700",
  Aprobado: "bg-emerald-100 text-emerald-700",
  Rechazado: "bg-rose-100 text-rose-700",
  Vencido: "bg-amber-100 text-amber-700",
};

function hoyISO(n = 0) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function dias(desde: string, hasta = hoyISO()) {
  return Math.round(
    (new Date(`${hasta}T12:00:00`).getTime() - new Date(`${desde}T12:00:00`).getTime()) /
      86_400_000,
  );
}
export function totalesPresupuesto(
  p: Pick<PresupuestoPaciente, "lineas" | "descuentoPct" | "planId">,
  planes: PlanFinanciacion[],
) {
  const subtotal = p.lineas.reduce((a, l) => a + l.cantidad * l.precio, 0);
  const descuento = Math.round((subtotal * (p.descuentoPct ?? 0)) / 100);
  const total = subtotal - descuento;
  const plan = planes.find((x) => x.id === p.planId);
  return { subtotal, descuento, total, plan, ...conPlan(total, plan) };
}
const nombrePac = (x: Paciente | undefined) => (x ? `${x.nombre} ${x.apellido}` : "Paciente");
const vencido = (p: PresupuestoPaciente) =>
  p.estado === "Enviado" && !!p.validez && p.validez < hoyISO();
const estadoVisual = (p: PresupuestoPaciente) => (vencido(p) ? "Vencido" : p.estado);
function wa(tel: string, texto: string) {
  return `https://wa.me/${tel.replace(/[^\d]/g, "")}?text=${encodeURIComponent(texto)}`;
}

/* ───────────── Página ───────────── */

export function Presupuestos() {
  const { usuario: u } = useSesion();
  const registros = useTodosLosRegistros();
  const { pacientes } = usePacientes();
  const { planes } = storePresupuestos.usar();
  const [montado, setMontado] = useState(false);
  const [seccion, setSeccion] = useState<Seccion>("tablero");
  const [abierto, setAbierto] = useState<{ pid: number; id: number } | null>(null);
  const [nuevo, setNuevo] = useState<Partial<Borrador> | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  useEffect(() => setMontado(true), []);

  const onToast = (m: string) => {
    setToast(m);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 3000);
  };
  const ctx: Ctx = {
    onToast,
    usuario: u?.nombre ?? "Recepción",
    abrir: (pid, id) => setAbierto({ pid, id }),
    nuevo: (base) => setNuevo(base ?? {}),
  };
  const filas: Fila[] = Object.entries(registros).flatMap(([pid, r]) =>
    r.presupuestos.map((p) => ({
      pid: Number(pid),
      pac: pacientes.find((x) => x.id === Number(pid)),
      p,
    })),
  );
  const hace30 = hoyISO(-30);
  const recientes = filas.filter((f) => f.p.fecha >= hace30);
  const resueltos = filas.filter((f) => f.p.estado === "Aprobado" || f.p.estado === "Rechazado");
  const aprobados = filas.filter((f) => f.p.estado === "Aprobado");
  const enEspera = filas.filter((f) => f.p.estado === "Enviado");
  const t = (f: Fila) => totalesPresupuesto(f.p, planes).total;

  const SECCIONES: { id: Seccion; label: string; icon: LucideIcon; badge?: number }[] = [
    { id: "tablero", label: "Tablero", icon: LayoutGrid },
    { id: "lista", label: "Todos", icon: List },
    {
      id: "seguimiento",
      label: "Seguimiento",
      icon: AlarmClock,
      badge: enEspera.filter((f) => vencido(f.p) || dias(f.p.enviado ?? f.p.fecha) >= 3).length,
    },
    { id: "aranceles", label: "Aranceles", icon: ReceiptText },
    { id: "plantillas", label: "Plantillas", icon: FolderOpen },
    { id: "financiacion", label: "Financiación", icon: Calculator },
    { id: "reportes", label: "Reportes", icon: BarChart3 },
  ];
  const kpis = [
    {
      l: "Presupuestado (30 días)",
      v: ars(recientes.reduce((a, f) => a + t(f), 0)),
      s1: `${recientes.length} presupuestos`,
      s2: "emitidos",
      i: ReceiptText,
    },
    {
      l: "Tasa de aceptación",
      v: `${resueltos.length ? Math.round((aprobados.length / resueltos.length) * 100) : 0}%`,
      s1: `${aprobados.length} aprobados`,
      s2: `de ${resueltos.length} respondidos`,
      i: ThumbsUp,
    },
    {
      l: "Esperando respuesta",
      v: ars(enEspera.reduce((a, f) => a + t(f), 0)),
      s1: `${enEspera.length} enviados`,
      s2: `· ${enEspera.filter((f) => vencido(f.p)).length} vencidos`,
      i: AlarmClock,
    },
    {
      l: "Ticket promedio",
      v: ars(aprobados.length ? aprobados.reduce((a, f) => a + t(f), 0) / aprobados.length : 0),
      s1: ars(aprobados.reduce((a, f) => a + t(f), 0)),
      s2: "aprobado en total",
      i: TrendingUp,
    },
  ];

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
                    <ReceiptText className="size-3.5" />
                    Comercial
                  </span>
                  {montado && enEspera.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSeccion("seguimiento")}
                      className="rounded-full border border-amber-200/70 bg-amber-50/80 px-3 py-1.5 text-[11px] font-bold text-amber-700"
                    >
                      {enEspera.length} esperando respuesta
                    </button>
                  )}
                </div>
                <h1 className="mt-4 text-[34px] font-bold tracking-[-0.035em] md:text-[42px]">
                  Presupuestos
                </h1>
                <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-foreground md:text-sm">
                  Armá presupuestos con tus aranceles y plantillas, ofrecé planes de cuotas,
                  enviálos por WhatsApp o al portal del paciente y seguí cada uno hasta que se
                  apruebe.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={BTN_SECUNDARIO}
                  onClick={() => setSeccion("aranceles")}
                >
                  <ReceiptText className="size-4" />
                  Aranceles
                </button>
                <button type="button" className={BTN_PRIMARIO} onClick={() => setNuevo({})}>
                  <Plus className="size-4" />
                  Nuevo presupuesto
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
              aria-label="Secciones de presupuestos"
            >
              {SECCIONES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSeccion(s.id)}
                  aria-pressed={seccion === s.id}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${seccion === s.id ? "bg-primary text-primary-foreground shadow-[0_8px_18px_-10px_rgba(124,58,237,0.8)]" : "text-muted-foreground hover:bg-white hover:text-foreground"}`}
                >
                  <s.icon className="size-3.5" />
                  {s.label}
                  {montado && !!s.badge && (
                    <span
                      className={`grid min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold ${seccion === s.id ? "bg-white/25 text-white" : "bg-amber-500 text-white"}`}
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
          ) : seccion === "tablero" ? (
            <Tablero ctx={ctx} filas={filas} />
          ) : seccion === "lista" ? (
            <Lista ctx={ctx} filas={filas} />
          ) : seccion === "seguimiento" ? (
            <Seguimiento ctx={ctx} filas={filas} />
          ) : seccion === "aranceles" ? (
            <Aranceles ctx={ctx} />
          ) : seccion === "plantillas" ? (
            <Plantillas ctx={ctx} />
          ) : seccion === "financiacion" ? (
            <Financiacion ctx={ctx} />
          ) : (
            <Reportes filas={filas} />
          )}
        </div>
      </div>

      {abierto && (
        <Detalle ctx={ctx} pid={abierto.pid} id={abierto.id} onClose={() => setAbierto(null)} />
      )}
      {nuevo && (
        <M
          titulo={nuevo.editarId ? "Editar presupuesto" : "Nuevo presupuesto"}
          onClose={() => setNuevo(null)}
          ancho="max-w-4xl"
        >
          <Editor
            ctx={ctx}
            base={nuevo}
            onCancel={() => setNuevo(null)}
            onListo={(m, pid, id) => {
              setNuevo(null);
              onToast(m);
              setAbierto({ pid, id });
            }}
          />
        </M>
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

/* ───────────── Acciones comunes ───────────── */

function useAcciones(ctx: Ctx) {
  const { cambiar } = useRegistrosPacientes();
  const { planes, config } = storePresupuestos.usar();
  const auditar = (pid: number, accion: string) =>
    cambiar(pid, "auditoria", (prev) => [
      ...prev,
      {
        id: Date.now(),
        usuario: ctx.usuario,
        accion,
        fecha: hoyISO(),
        hora: new Date().toTimeString().slice(0, 5),
      },
    ]);
  const actualizar = (
    pid: number,
    id: number,
    fn: (p: PresupuestoPaciente) => PresupuestoPaciente,
  ) => cambiar(pid, "presupuestos", (prev) => prev.map((x) => (x.id === id ? fn(x) : x)));
  const seguimiento = (texto: string) => ({
    fecha: new Date().toISOString(),
    texto,
    autor: ctx.usuario,
  });
  return {
    enviar(f: Fila, via: string) {
      actualizar(f.pid, f.p.id, (p) => ({
        ...p,
        estado: p.estado === "Borrador" ? "Enviado" : p.estado,
        enviado: hoyISO(),
        validez: p.validez && p.validez >= hoyISO() ? p.validez : hoyISO(config.validezDias),
        seguimientos: [...(p.seguimientos ?? []), seguimiento(`Enviado por ${via}`)],
      }));
      auditar(f.pid, `Envió el presupuesto ${f.p.numero} por ${via}`);
    },
    aprobar(f: Fila, origen = "la clínica") {
      const tot = totalesPresupuesto(f.p, planes);
      actualizar(f.pid, f.p.id, (p) => ({
        ...p,
        estado: "Aprobado",
        respondido: hoyISO(),
        seguimientos: [...(p.seguimientos ?? []), seguimiento(`Aprobado por ${origen}`)],
      }));
      cambiar(f.pid, "cuenta", (prev) => [
        ...prev,
        {
          id: Date.now(),
          fecha: hoyISO(),
          tipo: "Cargo",
          concepto: `Presupuesto ${f.p.numero} aprobado`,
          medio: tot.plan ? tot.plan.nombre : "A definir",
          monto: tot.final,
          notas: tot.plan && tot.cuotas > 1 ? `${tot.cuotas} cuotas de ${ars(tot.cuota)}` : "",
        },
      ]);
      auditar(f.pid, `Aprobó el presupuesto ${f.p.numero} (${ars(tot.final)})`);
    },
    rechazar(f: Fila, motivo: string) {
      actualizar(f.pid, f.p.id, (p) => ({
        ...p,
        estado: "Rechazado",
        respondido: hoyISO(),
        motivoRechazo: motivo,
        seguimientos: [...(p.seguimientos ?? []), seguimiento(`Rechazado: ${motivo}`)],
      }));
      auditar(f.pid, `Marcó rechazado el presupuesto ${f.p.numero} (${motivo})`);
    },
    nota(f: Fila, texto: string) {
      actualizar(f.pid, f.p.id, (p) => ({
        ...p,
        seguimientos: [...(p.seguimientos ?? []), seguimiento(texto)],
      }));
    },
    renovar(f: Fila) {
      actualizar(f.pid, f.p.id, (p) => ({
        ...p,
        validez: hoyISO(config.validezDias),
        seguimientos: [
          ...(p.seguimientos ?? []),
          seguimiento(`Validez extendida al ${fecha(hoyISO(config.validezDias))}`),
        ],
      }));
    },
    eliminar(f: Fila) {
      cambiar(f.pid, "presupuestos", (prev) => prev.filter((x) => x.id !== f.p.id));
      auditar(f.pid, `Eliminó el presupuesto ${f.p.numero}`);
    },
    textoWhatsApp(f: Fila) {
      const tot = totalesPresupuesto(f.p, planes);
      const portal = typeof window !== "undefined" ? `${window.location.origin}/portal` : "/portal";
      return `Hola ${f.pac?.nombre ?? ""}, te enviamos tu presupuesto ${f.p.numero} por ${ars(tot.final)}${tot.plan && tot.cuotas > 1 ? ` (${tot.cuotas} cuotas de ${ars(tot.cuota)})` : ""}. Podés verlo y aprobarlo desde tu portal: ${portal}`;
    },
  };
}

function imprimir(f: Fila, planes: PlanFinanciacion[], condiciones: string) {
  const tot = totalesPresupuesto(f.p, planes);
  const filas = f.p.lineas
    .map(
      (l) =>
        `<tr><td>${l.descripcion}</td><td>${l.pieza || "—"}</td><td class="r">${l.cantidad}</td><td class="r">${ars(l.precio)}</td><td class="r">${ars(l.cantidad * l.precio)}</td></tr>`,
    )
    .join("");
  imprimirHTML(
    `Presupuesto ${f.p.numero}`,
    `<h1>Presupuesto ${f.p.numero}</h1><p>Clínica Dental Esther</p>
<div class="meta"><div><b>${nombrePac(f.pac)}</b><br>DNI ${f.pac?.documento ?? "—"} · ${f.pac?.obraSocial ?? ""}<br>${f.pac?.telefono ?? ""}</div><div>Fecha: ${fecha(f.p.fecha)}<br>Válido hasta: ${fecha(f.p.validez ?? "")}<br>Profesional: ${f.p.profesional ?? "—"}</div></div>
<table style="margin-top:18px"><thead><tr><th>Prestación</th><th>Pieza</th><th class="r">Cant.</th><th class="r">Precio</th><th class="r">Subtotal</th></tr></thead><tbody>${filas}
<tr><td colspan="4" class="r">Subtotal</td><td class="r">${ars(tot.subtotal)}</td></tr>
${tot.descuento ? `<tr><td colspan="4" class="r">Descuento ${f.p.descuentoPct}%</td><td class="r">−${ars(tot.descuento)}</td></tr>` : ""}
${tot.plan ? `<tr><td colspan="4" class="r">${tot.plan.nombre} (${tot.plan.recargoPct >= 0 ? "+" : ""}${tot.plan.recargoPct}%)</td><td class="r">${ars(tot.final - tot.total)}</td></tr>` : ""}
<tr class="tot"><td colspan="4">Total${tot.cuotas > 1 ? ` · ${tot.cuotas} cuotas de ${ars(tot.cuota)}` : ""}</td><td class="r">${ars(tot.final)}</td></tr></tbody></table>
${f.p.notas ? `<h2>Observaciones</h2><p>${f.p.notas}</p>` : ""}<h2>Condiciones</h2><p>${condiciones}</p>
<div class="firma"><span>Profesional</span><span>Conformidad del paciente</span></div>`,
  );
}

/* ───────────── Tablero ───────────── */

function Tarjeta({ ctx, f }: { ctx: Ctx; f: Fila }) {
  const { planes } = storePresupuestos.usar();
  const tot = totalesPresupuesto(f.p, planes);
  const ev = estadoVisual(f.p);
  const esperando = f.p.estado === "Enviado" ? dias(f.p.enviado ?? f.p.fecha) : null;
  return (
    <button
      type="button"
      onClick={() => ctx.abrir(f.pid, f.p.id)}
      className="w-full rounded-2xl bg-white/90 p-3 text-left ring-1 ring-primary/10 transition-all hover:-translate-y-0.5 hover:ring-primary/35"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{nombrePac(f.pac)}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {f.p.numero} · {f.p.lineas[0]?.descripcion ?? "Sin prestaciones"}
            {f.p.lineas.length > 1 ? ` +${f.p.lineas.length - 1}` : ""}
          </p>
        </div>
        {ev === "Vencido" && <Pill clase={ESTILO.Vencido}>Vencido</Pill>}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="text-lg font-bold text-primary">{ars(tot.final)}</p>
        <p className="text-right text-[10.5px] text-muted-foreground">
          {tot.cuotas > 1 ? `${tot.cuotas} × ${ars(tot.cuota)}` : (tot.plan?.nombre ?? "Sin plan")}
          <br />
          {esperando !== null ? `Enviado hace ${esperando} d` : fecha(f.p.fecha)}
        </p>
      </div>
      {f.p.profesional && (
        <p className="mt-1 truncate text-[10.5px] text-muted-foreground">👩‍⚕️ {f.p.profesional}</p>
      )}
    </button>
  );
}

function Tablero({ ctx, filas }: { ctx: Ctx; filas: Fila[] }) {
  const { planes } = storePresupuestos.usar();
  const [q, setQ] = useState("");
  const vis = filas.filter(
    (f) =>
      !q ||
      normalizarBusqueda(`${nombrePac(f.pac)} ${f.p.numero} ${f.p.profesional ?? ""}`).includes(
        normalizarBusqueda(q),
      ),
  );
  return (
    <div className="space-y-3">
      <Encabezado
        icon={LayoutGrid}
        titulo="Tablero de presupuestos"
        descripcion="De borrador a aprobado. Tocá una tarjeta para enviarla, aprobarla o registrar el seguimiento."
      >
        <div className="relative w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary/60" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar paciente, número o profesional"
            className={`${INPUT} pl-9`}
          />
        </div>
      </Encabezado>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {ESTADOS_PRESUPUESTO.map((e) => {
          const col = vis
            .filter((f) => f.p.estado === e)
            .sort((a, b) => b.p.fecha.localeCompare(a.p.fecha));
          return (
            <div key={e} className="card-grad flex min-h-[260px] flex-col p-3">
              <div className="mb-2 flex items-center justify-between">
                <Pill clase={ESTILO[e]}>{e}</Pill>
                <span className="text-[11px] text-muted-foreground">
                  {col.length} ·{" "}
                  {ars(col.reduce((a, f) => a + totalesPresupuesto(f.p, planes).final, 0))}
                </span>
              </div>
              <div className="scroll-sutil max-h-[560px] flex-1 space-y-2 overflow-y-auto pr-0.5">
                {col.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    Sin presupuestos.
                  </p>
                ) : (
                  col.map((f) => <Tarjeta key={`${f.pid}-${f.p.id}`} ctx={ctx} f={f} />)
                )}
              </div>
              {e === "Borrador" && (
                <button
                  type="button"
                  className={`${BTN_SECUNDARIO} mt-2`}
                  onClick={() => ctx.nuevo()}
                >
                  <Plus className="size-4" />
                  Nuevo
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────── Lista ───────────── */

function Lista({ ctx, filas }: { ctx: Ctx; filas: Fila[] }) {
  const { planes } = storePresupuestos.usar();
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<"" | EstadoPresupuesto | "Vencido">("");
  const [prof, setProf] = useState("");
  const profesionales = [
    ...new Set(filas.map((f) => f.p.profesional).filter((x): x is string => !!x)),
  ].sort();
  const lista = filas
    .filter(
      (f) =>
        !estado || estadoVisual(f.p) === estado || (estado !== "Vencido" && f.p.estado === estado),
    )
    .filter((f) => !prof || f.p.profesional === prof)
    .filter(
      (f) =>
        !q ||
        normalizarBusqueda(
          `${nombrePac(f.pac)} ${f.p.numero} ${f.p.lineas.map((l) => l.descripcion).join(" ")}`,
        ).includes(normalizarBusqueda(q)),
    )
    .sort((a, b) => b.p.fecha.localeCompare(a.p.fecha));
  const exportar = () =>
    void descargarExcel(`presupuestos-${hoyISO()}.xlsx`, [
      {
        nombre: "Presupuestos",
        columnas: [
          { titulo: "Número", clave: "numero", ancho: 10 },
          { titulo: "Fecha", clave: "fecha", ancho: 12 },
          { titulo: "Paciente", clave: "paciente", ancho: 24 },
          { titulo: "Profesional", clave: "prof", ancho: 20 },
          { titulo: "Estado", clave: "estado", ancho: 12 },
          { titulo: "Prestaciones", clave: "items", ancho: 40 },
          { titulo: "Subtotal", clave: "subtotal", moneda: true },
          { titulo: "Descuento", clave: "descuento", moneda: true },
          { titulo: "Plan", clave: "plan", ancho: 22 },
          { titulo: "Total", clave: "total", moneda: true },
          { titulo: "Motivo de rechazo", clave: "motivo", ancho: 22 },
        ],
        filas: lista.map((f) => {
          const tot = totalesPresupuesto(f.p, planes);
          return {
            numero: f.p.numero,
            fecha: fecha(f.p.fecha),
            paciente: nombrePac(f.pac),
            prof: f.p.profesional ?? "",
            estado: estadoVisual(f.p),
            items: f.p.lineas.map((l) => `${l.cantidad}× ${l.descripcion}`).join(", "),
            subtotal: tot.subtotal,
            descuento: tot.descuento,
            plan: tot.plan?.nombre ?? "",
            total: tot.final,
            motivo: f.p.motivoRechazo ?? "",
          };
        }),
        totales: {
          numero: "Total",
          total: lista.reduce((a, f) => a + totalesPresupuesto(f.p, planes).final, 0),
        },
      },
    ]).then(() => ctx.onToast("Excel descargado"));
  return (
    <div className="space-y-3">
      <Encabezado
        icon={List}
        titulo="Todos los presupuestos"
        descripcion="Buscá, filtrá y exportá a Excel."
      >
        <button type="button" className={BTN_SECUNDARIO} onClick={exportar}>
          <Download className="size-4" />
          Exportar a Excel
        </button>
      </Encabezado>
      <div className="card-grad space-y-2.5 p-3">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary/60" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar paciente, número o prestación"
              className={`${INPUT} pl-9`}
            />
          </div>
          <Sel
            value={prof}
            onChange={setProf}
            etiqueta="Profesional"
            opciones={[
              { value: "", label: "Todos los profesionales" },
              ...profesionales.map((p) => ({ value: p, label: p })),
            ]}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {(["", ...ESTADOS_PRESUPUESTO, "Vencido"] as const).map((e) => (
            <button
              key={e || "todos"}
              type="button"
              className={CHIP(estado === e)}
              onClick={() => setEstado(e)}
            >
              {e || "Todos"}
            </button>
          ))}
        </div>
        {lista.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No hay presupuestos con esos filtros.
          </p>
        ) : (
          <div className="scroll-sutil overflow-x-auto">
            <table className="w-full min-w-[820px] text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  <th className="pb-2 font-semibold">Número</th>
                  <th className="pb-2 font-semibold">Paciente</th>
                  <th className="pb-2 font-semibold">Prestaciones</th>
                  <th className="pb-2 font-semibold">Profesional</th>
                  <th className="pb-2 font-semibold">Estado</th>
                  <th className="pb-2 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((f) => {
                  const ev = estadoVisual(f.p);
                  return (
                    <tr
                      key={`${f.pid}-${f.p.id}`}
                      className="cursor-pointer border-t border-primary/10 hover:bg-primary/[0.03]"
                      onClick={() => ctx.abrir(f.pid, f.p.id)}
                    >
                      <td className="py-2 font-semibold">
                        {f.p.numero}
                        <p className="text-[10px] font-normal text-muted-foreground">
                          {fecha(f.p.fecha)}
                        </p>
                      </td>
                      <td className="py-2">{nombrePac(f.pac)}</td>
                      <td className="max-w-[260px] truncate py-2 text-muted-foreground">
                        {f.p.lineas.map((l) => l.descripcion).join(", ")}
                      </td>
                      <td className="py-2">{f.p.profesional ?? "—"}</td>
                      <td className="py-2">
                        <Pill clase={ESTILO[ev]}>{ev}</Pill>
                      </td>
                      <td className="py-2 text-right text-sm font-bold text-primary">
                        {ars(totalesPresupuesto(f.p, planes).final)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────── Seguimiento ───────────── */

function Seguimiento({ ctx, filas }: { ctx: Ctx; filas: Fila[] }) {
  const { planes, config } = storePresupuestos.usar();
  const acc = useAcciones(ctx);
  const enviados = filas
    .filter((f) => f.p.estado === "Enviado")
    .sort((a, b) => (a.p.enviado ?? a.p.fecha).localeCompare(b.p.enviado ?? b.p.fecha));
  const vencidos = enviados.filter((f) => vencido(f.p));
  const recordar = enviados.filter(
    (f) => !vencido(f.p) && dias(f.p.enviado ?? f.p.fecha) >= config.recordatorioDias,
  );
  const recientes = enviados.filter(
    (f) => !vencido(f.p) && dias(f.p.enviado ?? f.p.fecha) < config.recordatorioDias,
  );
  const borradores = filas.filter((f) => f.p.estado === "Borrador");
  const Bloque = ({
    titulo,
    icon: Icon,
    lista,
    tono,
    accion,
  }: {
    titulo: string;
    icon: LucideIcon;
    lista: Fila[];
    tono: string;
    accion: (f: Fila) => React.ReactNode;
  }) => (
    <div className="card-grad p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Icon className={`size-4 ${tono}`} /> {titulo} ({lista.length})
      </p>
      {lista.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">Nada por acá.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {lista.map((f) => (
            <li
              key={`${f.pid}-${f.p.id}`}
              className="flex flex-wrap items-center gap-2 rounded-xl bg-white/85 px-3 py-2 ring-1 ring-primary/10"
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => ctx.abrir(f.pid, f.p.id)}
              >
                <p className="truncate text-sm font-semibold">
                  {nombrePac(f.pac)} ·{" "}
                  <span className="text-primary">{ars(totalesPresupuesto(f.p, planes).final)}</span>
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {f.p.numero} ·{" "}
                  {f.p.estado === "Enviado"
                    ? `enviado hace ${dias(f.p.enviado ?? f.p.fecha)} días · vence ${fecha(f.p.validez ?? "")}`
                    : `creado ${fecha(f.p.fecha)}`}{" "}
                  · {(f.p.seguimientos ?? []).length} seguimientos
                </p>
              </button>
              {accion(f)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
  const btnWA = (f: Fila, texto: string) =>
    f.pac?.telefono ? (
      <a
        href={wa(f.pac.telefono, texto)}
        target="_blank"
        rel="noreferrer"
        className={BTN_PRIMARIO}
        onClick={() => {
          acc.nota(f, "Recordatorio enviado por WhatsApp");
          ctx.onToast(`Recordatorio registrado para ${nombrePac(f.pac)}`);
        }}
      >
        <MessageCircle className="size-4" />
        Recordar
      </a>
    ) : null;
  return (
    <div className="space-y-3">
      <Encabezado
        icon={AlarmClock}
        titulo="Seguimiento"
        descripcion={`Los presupuestos sin respuesta después de ${config.recordatorioDias} días conviene recordarlos. Los vencidos se renuevan o se cierran.`}
      />
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Bloque
          titulo="Para recordar hoy"
          icon={AlarmClock}
          tono="text-amber-600"
          lista={recordar}
          accion={(f) =>
            btnWA(
              f,
              `Hola ${f.pac?.nombre ?? ""}, ¿pudiste ver el presupuesto ${f.p.numero}? Si tenés dudas sobre el tratamiento o las cuotas, escribinos. ¡Te esperamos!`,
            )
          }
        />
        <Bloque
          titulo="Vencidos"
          icon={CalendarClock}
          tono="text-rose-600"
          lista={vencidos}
          accion={(f) => (
            <div className="flex gap-1.5">
              <button
                type="button"
                className={BTN_SECUNDARIO}
                onClick={() => {
                  acc.renovar(f);
                  ctx.onToast(`${f.p.numero}: validez extendida`);
                }}
              >
                <CalendarClock className="size-4" />
                Renovar
              </button>
              <button
                type="button"
                className={BTN_SECUNDARIO}
                onClick={() => {
                  acc.rechazar(f, "Va a pensarlo más adelante");
                  ctx.onToast(`${f.p.numero} cerrado como rechazado`);
                }}
              >
                <X className="size-4" />
                Cerrar
              </button>
            </div>
          )}
        />
        <Bloque
          titulo="Enviados recientemente"
          icon={Send}
          tono="text-primary"
          lista={recientes}
          accion={() => <Pill clase="bg-violet-100 text-violet-700">Esperando</Pill>}
        />
        <Bloque
          titulo="Borradores sin enviar"
          icon={Pencil}
          tono="text-muted-foreground"
          lista={borradores}
          accion={(f) => (
            <button
              type="button"
              className={BTN_PRIMARIO}
              onClick={() => {
                acc.enviar(f, "portal del paciente");
                ctx.onToast(`${f.p.numero} enviado: ya aparece en el portal del paciente`);
              }}
            >
              <Send className="size-4" />
              Enviar
            </button>
          )}
        />
      </div>
    </div>
  );
}

/* ───────────── Detalle ───────────── */

function Detalle({
  ctx,
  pid,
  id,
  onClose,
}: {
  ctx: Ctx;
  pid: number;
  id: number;
  onClose: () => void;
}) {
  const registros = useTodosLosRegistros();
  const { pacientes, setActivoId } = usePacientes();
  const { planes, config } = storePresupuestos.usar();
  const acc = useAcciones(ctx);
  const navigate = useNavigate();
  const [rechazo, setRechazo] = useState(false);
  const [confirmarAprobar, setConfirmarAprobar] = useState(false);
  const [nota, setNota] = useState("");
  const p = registros[pid]?.presupuestos.find((x) => x.id === id);
  if (!p) return null;
  const pac = pacientes.find((x) => x.id === pid);
  const f: Fila = { pid, pac, p };
  const tot = totalesPresupuesto(p, planes);
  const ev = estadoVisual(p);
  return (
    <M titulo={`${p.numero} · ${nombrePac(pac)}`} onClose={onClose} ancho="max-w-3xl">
      <div className="flex flex-wrap items-center gap-2">
        <Pill clase={ESTILO[ev]}>{ev}</Pill>
        <span className="text-[11px] text-muted-foreground">
          Creado {fecha(p.fecha)}
          {p.enviado ? ` · enviado ${fecha(p.enviado)}` : ""} · válido hasta{" "}
          {fecha(p.validez ?? "")}
          {p.profesional ? ` · ${p.profesional}` : ""}
        </span>
        {p.motivoRechazo && <Pill clase="bg-rose-50 text-rose-700">Motivo: {p.motivoRechazo}</Pill>}
      </div>
      <div className="mt-3 overflow-hidden rounded-2xl ring-1 ring-primary/10">
        <table className="w-full text-xs">
          <thead className="bg-primary/[0.05] text-left text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            <tr>
              <th className="p-2 font-semibold">Prestación</th>
              <th className="p-2 font-semibold">Pieza</th>
              <th className="p-2 text-right font-semibold">Cant.</th>
              <th className="p-2 text-right font-semibold">Precio</th>
              <th className="p-2 text-right font-semibold">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {p.lineas.map((l, i) => (
              <tr key={i} className="border-t border-primary/10 bg-white/80">
                <td className="p-2 font-medium">{l.descripcion}</td>
                <td className="p-2">{l.pieza || "—"}</td>
                <td className="p-2 text-right">{l.cantidad}</td>
                <td className="p-2 text-right">{ars(l.precio)}</td>
                <td className="p-2 text-right font-semibold">{ars(l.cantidad * l.precio)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-gradient-to-br from-primary/[0.08] to-fuchsia-500/[0.05] p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{ars(tot.subtotal)}</span>
          </div>
          {tot.descuento > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Descuento {p.descuentoPct}%</span>
              <span>−{ars(tot.descuento)}</span>
            </div>
          )}
          {tot.plan && tot.final !== tot.total && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {tot.plan.nombre} ({tot.plan.recargoPct > 0 ? "+" : ""}
                {tot.plan.recargoPct}%)
              </span>
              <span>
                {tot.final > tot.total ? "+" : "−"}
                {ars(Math.abs(tot.final - tot.total))}
              </span>
            </div>
          )}
          <div className="mt-1 flex justify-between border-t border-primary/15 pt-1 text-base font-bold text-primary">
            <span>Total</span>
            <span>{ars(tot.final)}</span>
          </div>
          {tot.cuotas > 1 && (
            <p className="text-right text-xs font-semibold text-fuchsia-700">
              {tot.cuotas} cuotas de {ars(tot.cuota)}
            </p>
          )}
        </div>
        <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-primary/10">
          <p className="text-xs font-semibold">Seguimiento</p>
          <ul className="scroll-sutil mt-1.5 max-h-28 space-y-1 overflow-y-auto">
            {(p.seguimientos ?? []).length === 0 && (
              <li className="text-[11px] text-muted-foreground">Sin movimientos todavía.</li>
            )}
            {[...(p.seguimientos ?? [])].reverse().map((s, i) => (
              <li key={i} className="text-[11px]">
                <b>{s.texto}</b>{" "}
                <span className="text-muted-foreground">
                  · {s.autor} · {fecha(s.fecha)}
                </span>
              </li>
            ))}
          </ul>
          <form
            className="mt-2 flex gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!nota.trim()) return;
              acc.nota(f, nota.trim());
              setNota("");
              ctx.onToast("Seguimiento registrado");
            }}
          >
            <input
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ej: llamó, lo consulta con la familia"
              className={`${INPUT} h-8 text-xs`}
              aria-label="Nota de seguimiento"
            />
            <button type="submit" className={BTN_ICONO} aria-label="Agregar seguimiento">
              <Plus className="size-3.5" />
            </button>
          </form>
        </div>
      </div>
      {p.notas && <p className="mt-2 text-xs italic text-muted-foreground">“{p.notas}”</p>}
      <div className="mt-4 flex flex-wrap gap-2 border-t border-primary/10 pt-3">
        {(p.estado === "Borrador" || p.estado === "Enviado") && (
          <>
            {pac?.telefono && (
              <a
                href={wa(pac.telefono, acc.textoWhatsApp(f))}
                target="_blank"
                rel="noreferrer"
                className={BTN_PRIMARIO}
                onClick={() => {
                  acc.enviar(f, "WhatsApp");
                  ctx.onToast("Enviado por WhatsApp y publicado en el portal del paciente");
                }}
              >
                <MessageCircle className="size-4" />
                WhatsApp
              </a>
            )}
            {pac?.email && (
              <a
                href={`mailto:${pac.email}?subject=${encodeURIComponent(`Presupuesto ${p.numero}`)}&body=${encodeURIComponent(acc.textoWhatsApp(f))}`}
                className={BTN_SECUNDARIO}
                onClick={() => {
                  acc.enviar(f, "correo");
                  ctx.onToast("Enviado por correo");
                }}
              >
                <Mail className="size-4" />
                Correo
              </a>
            )}
            <button
              type="button"
              className={BTN_SECUNDARIO}
              onClick={() => setConfirmarAprobar(true)}
            >
              <ThumbsUp className="size-4" />
              Aprobar
            </button>
            <button type="button" className={BTN_SECUNDARIO} onClick={() => setRechazo(true)}>
              <ThumbsDown className="size-4" />
              Rechazado
            </button>
            <button
              type="button"
              className={BTN_SECUNDARIO}
              onClick={() => {
                onClose();
                ctx.nuevo({
                  editarId: p.id,
                  pacienteId: pid,
                  lineas: p.lineas,
                  profesional: p.profesional ?? "",
                  descuentoPct: p.descuentoPct ?? 0,
                  planId: p.planId ?? "",
                  notas: p.notas,
                  validez: p.validez ?? "",
                });
              }}
            >
              <Pencil className="size-4" />
              Editar
            </button>
          </>
        )}
        {vencido(p) && (
          <button
            type="button"
            className={BTN_SECUNDARIO}
            onClick={() => {
              acc.renovar(f);
              ctx.onToast("Validez extendida");
            }}
          >
            <CalendarClock className="size-4" />
            Renovar validez
          </button>
        )}
        <button
          type="button"
          className={BTN_SECUNDARIO}
          onClick={() => imprimir(f, planes, config.condiciones)}
        >
          <Printer className="size-4" />
          PDF
        </button>
        <button
          type="button"
          className={BTN_SECUNDARIO}
          onClick={() => {
            onClose();
            ctx.nuevo({
              pacienteId: pid,
              lineas: p.lineas,
              profesional: p.profesional ?? "",
              descuentoPct: p.descuentoPct ?? 0,
              planId: p.planId ?? "",
              notas: p.notas,
            });
          }}
        >
          <Copy className="size-4" />
          Duplicar
        </button>
        <button
          type="button"
          className={BTN_SECUNDARIO}
          onClick={() => {
            setActivoId(pid);
            void navigate({ to: "/demo/pacientes" });
          }}
        >
          <UserRound className="size-4" />
          Ver ficha
        </button>
        <button
          type="button"
          aria-label="Eliminar presupuesto"
          className={`${BTN_ICONO} ml-auto`}
          onClick={() => {
            acc.eliminar(f);
            ctx.onToast(`${p.numero} eliminado`);
            onClose();
          }}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      {confirmarAprobar && (
        <M titulo={`Aprobar ${p.numero}`} onClose={() => setConfirmarAprobar(false)}>
          <p className="text-sm text-muted-foreground">
            Se registra la aprobación y se carga <b className="text-foreground">{ars(tot.final)}</b>{" "}
            en la cuenta corriente de {nombrePac(pac)}
            {tot.cuotas > 1 ? ` (${tot.cuotas} cuotas de ${ars(tot.cuota)})` : ""}.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className={BTN_SECUNDARIO}
              onClick={() => setConfirmarAprobar(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={BTN_PRIMARIO}
              onClick={() => {
                acc.aprobar(f);
                setConfirmarAprobar(false);
                ctx.onToast(`${p.numero} aprobado: cargo generado en la cuenta corriente`);
              }}
            >
              <Check className="size-4" />
              Confirmar aprobación
            </button>
          </div>
        </M>
      )}
      {rechazo && (
        <M titulo={`Rechazo de ${p.numero}`} onClose={() => setRechazo(false)}>
          <p className="text-sm text-muted-foreground">
            ¿Por qué no avanzó? Sirve para los reportes.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {MOTIVOS_RECHAZO.map((m) => (
              <button
                key={m}
                type="button"
                className={`${CHIP(false)} ring-1 ring-primary/15`}
                onClick={() => {
                  acc.rechazar(f, m);
                  setRechazo(false);
                  ctx.onToast(`${p.numero} marcado como rechazado (${m.toLowerCase()})`);
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </M>
      )}
    </M>
  );
}

/* ───────────── Editor (nuevo / editar) ───────────── */

type Borrador = {
  editarId?: number;
  pacienteId?: number;
  lineas: LineaPresupuesto[];
  profesional: string;
  descuentoPct: number;
  planId: string;
  notas: string;
  validez: string;
  plantillaId?: string;
};

function Editor({
  ctx,
  base,
  onCancel,
  onListo,
}: {
  ctx: Ctx;
  base: Partial<Borrador>;
  onCancel: () => void;
  onListo: (m: string, pid: number, id: number) => void;
}) {
  const { pacientes } = usePacientes();
  const { miembros } = useEquipo();
  const registros = useTodosLosRegistros();
  const { cambiar } = useRegistrosPacientes();
  const { aranceles, plantillas, planes, config } = storePresupuestos.usar();
  const odontologos = miembros
    .filter((m) => m.role === "odontologo" && m.status !== "inactivo")
    .map((m) => `${m.firstName} ${m.lastName}`);
  const [pid, setPid] = useState<number | null>(base.pacienteId ?? null);
  const [qPac, setQPac] = useState("");
  const [lineas, setLineas] = useState<LineaPresupuesto[]>(base.lineas ?? []);
  const [profesional, setProfesional] = useState(base.profesional || odontologos[0] || "");
  const [descuento, setDescuento] = useState(String(base.descuentoPct ?? 0));
  const [planId, setPlanId] = useState(base.planId ?? "f2");
  const [validez, setValidez] = useState(base.validez || hoyISO(config.validezDias));
  const [notas, setNotas] = useState(base.notas ?? "");
  const [qAr, setQAr] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (base.plantillaId) {
      const t = plantillas.find((x) => x.id === base.plantillaId);
      if (t)
        setLineas(
          t.items.flatMap((it) => {
            const a = aranceles.find((x) => x.id === it.arancelId);
            return a
              ? [
                  {
                    descripcion: a.nombre,
                    pieza: "",
                    cantidad: it.cantidad,
                    precio: a.precio,
                    arancelId: a.id,
                  },
                ]
              : [];
          }),
        );
    }
  }, [base.plantillaId, plantillas, aranceles]);
  const pac = pacientes.find((x) => x.id === pid);
  const candidatos = qPac
    ? pacientes
        .filter((x) =>
          normalizarBusqueda(`${x.nombre} ${x.apellido} ${x.documento}`).includes(
            normalizarBusqueda(qPac),
          ),
        )
        .slice(0, 6)
    : [];
  const sugeridos = aranceles
    .filter(
      (a) =>
        a.activo &&
        (!qAr ||
          normalizarBusqueda(`${a.nombre} ${a.codigo} ${a.categoria}`).includes(
            normalizarBusqueda(qAr),
          )),
    )
    .slice(0, 8);
  const pct = Math.max(0, Math.min(100, Number(descuento) || 0));
  const tot = totalesPresupuesto({ lineas, descuentoPct: pct, planId }, planes);
  const agregar = (a: Arancel) =>
    setLineas((p) => [
      ...p,
      { descripcion: a.nombre, pieza: "", cantidad: 1, precio: a.precio, arancelId: a.id },
    ]);
  const usarPlantilla = (t: Plantilla) =>
    setLineas((p) => [
      ...p,
      ...t.items.flatMap((it) => {
        const a = aranceles.find((x) => x.id === it.arancelId);
        return a
          ? [
              {
                descripcion: a.nombre,
                pieza: "",
                cantidad: it.cantidad,
                precio: a.precio,
                arancelId: a.id,
              },
            ]
          : [];
      }),
    ]);
  const guardar = (enviar: boolean) => {
    if (!pid) return setError("Elegí el paciente.");
    if (!lineas.length || lineas.some((l) => !l.descripcion.trim() || l.cantidad <= 0))
      return setError("Agregá al menos una prestación con cantidad.");
    if (pct > config.descuentoMaxPct)
      return setError(
        `El descuento máximo permitido es ${config.descuentoMaxPct}% (se cambia en Aranceles → reglas).`,
      );
    const todos = Object.values(registros).flatMap((r) => r.presupuestos);
    const numMax = todos.reduce((a, x) => Math.max(a, Number(x.numero.replace(/\D/g, "")) || 0), 0);
    const datos = { lineas, profesional, descuentoPct: pct, planId, validez, notas: notas.trim() };
    if (base.editarId) {
      const idE = base.editarId;
      cambiar(pid, "presupuestos", (prev) =>
        prev.map((x) =>
          x.id === idE
            ? {
                ...x,
                ...datos,
                ...(enviar ? { estado: "Enviado" as const, enviado: hoyISO() } : {}),
                seguimientos: [
                  ...(x.seguimientos ?? []),
                  {
                    fecha: new Date().toISOString(),
                    texto: "Presupuesto editado",
                    autor: ctx.usuario,
                  },
                ],
              }
            : x,
        ),
      );
      return onListo("Presupuesto actualizado", pid, idE);
    }
    const id = Date.now();
    const numero = `PR-${String(numMax + 1).padStart(4, "0")}`;
    cambiar(pid, "presupuestos", (prev) => [
      ...prev,
      {
        id,
        numero,
        fecha: hoyISO(),
        estado: enviar ? "Enviado" : "Borrador",
        ...datos,
        ...(enviar ? { enviado: hoyISO() } : {}),
        seguimientos: [
          {
            fecha: new Date().toISOString(),
            texto: enviar ? "Creado y enviado al portal del paciente" : "Creado como borrador",
            autor: ctx.usuario,
          },
        ],
      },
    ]);
    cambiar(pid, "auditoria", (prev) => [
      ...prev,
      {
        id,
        usuario: ctx.usuario,
        accion: `Creó el presupuesto ${numero}`,
        fecha: hoyISO(),
        hora: new Date().toTimeString().slice(0, 5),
      },
    ]);
    onListo(
      enviar
        ? `${numero} creado y enviado: el paciente lo ve en su portal`
        : `${numero} guardado como borrador`,
      pid,
      id,
    );
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        guardar(true);
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Paciente *
          </span>
          {pac ? (
            <div className="flex h-9 items-center justify-between rounded-xl bg-primary/[0.06] px-3 text-sm ring-1 ring-primary/15">
              <span className="truncate font-semibold">
                {nombrePac(pac)}{" "}
                <span className="font-normal text-muted-foreground">· {pac.obraSocial}</span>
              </span>
              {!base.editarId && (
                <button
                  type="button"
                  className="text-[11px] font-semibold text-primary"
                  onClick={() => setPid(null)}
                >
                  Cambiar
                </button>
              )}
            </div>
          ) : (
            <div className="relative">
              <input
                value={qPac}
                onChange={(e) => setQPac(e.target.value)}
                placeholder="Buscar por nombre o DNI"
                className={INPUT}
                aria-label="Buscar paciente"
                autoFocus
              />
              {candidatos.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-primary/15">
                  {candidatos.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-primary/[0.06]"
                        onClick={() => {
                          setPid(c.id);
                          setQPac("");
                        }}
                      >
                        {nombrePac(c)}{" "}
                        <span className="text-[11px] text-muted-foreground">
                          · DNI {c.documento}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <Field label="Profesional">
          <Sel
            value={profesional}
            onChange={setProfesional}
            opciones={odontologos.length ? odontologos : [profesional]}
            etiqueta="Profesional"
          />
        </Field>
        <Field label="Válido hasta">
          <input
            type="date"
            value={validez}
            onChange={(e) => setValidez(e.target.value)}
            className={INPUT}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_300px]">
        <div className="space-y-2">
          <div className="overflow-hidden rounded-2xl ring-1 ring-primary/10">
            <table className="w-full text-xs">
              <thead className="bg-primary/[0.05] text-left text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                <tr>
                  <th className="p-2 font-semibold">Prestación</th>
                  <th className="w-16 p-2 font-semibold">Pieza</th>
                  <th className="w-16 p-2 font-semibold">Cant.</th>
                  <th className="w-28 p-2 font-semibold">Precio</th>
                  <th className="w-24 p-2 text-right font-semibold">Subtotal</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {lineas.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-muted-foreground">
                      Agregá prestaciones desde los aranceles o usá una plantilla →
                    </td>
                  </tr>
                )}
                {lineas.map((l, i) => (
                  <tr key={i} className="border-t border-primary/10 bg-white/80">
                    <td className="p-1.5">
                      <input
                        value={l.descripcion}
                        onChange={(e) =>
                          setLineas((p) =>
                            p.map((x, k) => (k === i ? { ...x, descripcion: e.target.value } : x)),
                          )
                        }
                        className={`${INPUT} h-8`}
                        aria-label="Prestación"
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        value={l.pieza}
                        onChange={(e) =>
                          setLineas((p) =>
                            p.map((x, k) => (k === i ? { ...x, pieza: e.target.value } : x)),
                          )
                        }
                        className={`${INPUT} h-8`}
                        aria-label="Pieza"
                        placeholder="—"
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        type="number"
                        min={1}
                        value={l.cantidad}
                        onChange={(e) =>
                          setLineas((p) =>
                            p.map((x, k) =>
                              k === i ? { ...x, cantidad: Number(e.target.value) } : x,
                            ),
                          )
                        }
                        className={`${INPUT} h-8`}
                        aria-label="Cantidad"
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        type="number"
                        min={0}
                        value={l.precio}
                        onChange={(e) =>
                          setLineas((p) =>
                            p.map((x, k) =>
                              k === i ? { ...x, precio: Number(e.target.value) } : x,
                            ),
                          )
                        }
                        className={`${INPUT} h-8`}
                        aria-label="Precio"
                      />
                    </td>
                    <td className="p-1.5 text-right font-semibold">{ars(l.cantidad * l.precio)}</td>
                    <td className="p-1.5">
                      <button
                        type="button"
                        aria-label="Quitar prestación"
                        className={BTN_ICONO}
                        onClick={() => setLineas((p) => p.filter((_, k) => k !== i))}
                      >
                        <X className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Plan de pago">
              <Sel
                value={planId}
                onChange={setPlanId}
                etiqueta="Plan de pago"
                opciones={[
                  { value: "", label: "Sin plan" },
                  ...planes
                    .filter((x) => x.activo)
                    .map((x) => ({
                      value: x.id,
                      label: `${x.nombre} (${x.recargoPct > 0 ? "+" : ""}${x.recargoPct}%)`,
                    })),
                ]}
              />
            </Field>
            <Field label={`Descuento % (máx. ${config.descuentoMaxPct})`}>
              <input
                type="number"
                min={0}
                max={100}
                value={descuento}
                onChange={(e) => setDescuento(e.target.value)}
                className={INPUT}
                aria-label="Descuento"
              />
            </Field>
          </div>
          <Field label="Observaciones para el paciente">
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full rounded-xl border border-primary/12 bg-white px-3 py-2 text-sm outline-none focus:border-primary/45"
              placeholder="Ej: incluye controles, se puede empezar la semana próxima…"
            />
          </Field>
        </div>
        <div className="space-y-2">
          <div className="rounded-2xl bg-primary/[0.04] p-2.5 ring-1 ring-primary/10">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
              Aranceles
            </p>
            <input
              value={qAr}
              onChange={(e) => setQAr(e.target.value)}
              placeholder="Buscar prestación"
              className={`${INPUT} mt-1.5 h-8`}
              aria-label="Buscar arancel"
            />
            <ul className="scroll-sutil mt-1.5 max-h-44 space-y-1 overflow-y-auto">
              {sugeridos.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => agregar(a)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg bg-white/85 px-2 py-1.5 text-left text-[11px] hover:bg-white"
                  >
                    <span className="truncate">{a.nombre}</span>
                    <b className="shrink-0 text-primary">{ars(a.precio)}</b>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-primary/[0.04] p-2.5 ring-1 ring-primary/10">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
              Plantillas
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {plantillas.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => usarPlantilla(t)}
                  className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-primary ring-1 ring-primary/15 hover:bg-primary/10"
                >
                  + {t.nombre}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500 p-3 text-white">
            <div className="flex justify-between text-xs text-white/85">
              <span>Subtotal</span>
              <span>{ars(tot.subtotal)}</span>
            </div>
            {tot.descuento > 0 && (
              <div className="flex justify-between text-xs text-white/85">
                <span>Descuento</span>
                <span>−{ars(tot.descuento)}</span>
              </div>
            )}
            {tot.plan && tot.final !== tot.total && (
              <div className="flex justify-between text-xs text-white/85">
                <span>{tot.plan.nombre}</span>
                <span>
                  {tot.final > tot.total ? "+" : "−"}
                  {ars(Math.abs(tot.final - tot.total))}
                </span>
              </div>
            )}
            <div className="mt-1 flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{ars(tot.final)}</span>
            </div>
            {tot.cuotas > 1 && (
              <p className="text-right text-xs font-semibold">
                {tot.cuotas} cuotas de {ars(tot.cuota)}
              </p>
            )}
          </div>
        </div>
      </div>
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      <Acciones
        etiqueta={base.editarId ? "Guardar y enviar" : "Crear y enviar"}
        onCancel={onCancel}
        icon={Send}
        extra={
          <button type="button" className={BTN_SECUNDARIO} onClick={() => guardar(false)}>
            <ClipboardList className="size-4" />
            {base.editarId ? "Guardar" : "Guardar borrador"}
          </button>
        }
      />
    </form>
  );
}

/* ───────────── Aranceles ───────────── */

function Aranceles({ ctx }: { ctx: Ctx }) {
  const { aranceles, config } = storePresupuestos.usar();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"" | CategoriaArancel>("");
  const [editar, setEditar] = useState<Arancel | "nuevo" | null>(null);
  const [aumento, setAumento] = useState(false);
  const [reglas, setReglas] = useState(false);
  const archivo = useRef<HTMLInputElement>(null);
  const lista = aranceles.filter(
    (a) =>
      (!cat || a.categoria === cat) &&
      (!q || normalizarBusqueda(`${a.nombre} ${a.codigo}`).includes(normalizarBusqueda(q))),
  );
  const exportar = () =>
    void descargarExcel(`aranceles-${hoyISO()}.xlsx`, [
      {
        nombre: "Aranceles",
        nota: "Editá la columna Precio y volvé a importar el archivo para actualizar la lista.",
        columnas: [
          { titulo: "Código", clave: "codigo", ancho: 10 },
          { titulo: "Prestación", clave: "nombre", ancho: 38 },
          { titulo: "Categoría", clave: "categoria", ancho: 14 },
          { titulo: "Precio", clave: "precio", moneda: true, ancho: 14 },
          { titulo: "Duración (min)", clave: "duracion", ancho: 14 },
          { titulo: "Activo", clave: "activo", ancho: 8 },
        ],
        filas: aranceles.map((a) => ({
          codigo: a.codigo,
          nombre: a.nombre,
          categoria: a.categoria,
          precio: a.precio,
          duracion: a.duracion,
          activo: a.activo ? "Sí" : "No",
        })),
      },
    ]).then(() => ctx.onToast("Lista de precios descargada"));
  const importar = async (f: File) => {
    try {
      const filas = await leerPlanilla(f);
      let n = 0;
      setPresupuestos("aranceles", (prev) =>
        prev.map((a) => {
          const fila = filas.find((x) => String(x["Código"] ?? "").trim() === a.codigo);
          const precio = fila ? Number(fila["Precio"]) : NaN;
          if (fila && Number.isFinite(precio) && precio > 0 && precio !== a.precio) {
            n++;
            return { ...a, precio: Math.round(precio) };
          }
          return a;
        }),
      );
      ctx.onToast(
        n ? `${n} precios actualizados desde ${f.name}` : "El archivo no cambia ningún precio",
      );
    } catch {
      ctx.onToast("No pude leer el archivo. Usá la lista exportada.");
    }
  };
  return (
    <div className="space-y-3">
      <Encabezado
        icon={ReceiptText}
        titulo="Aranceles"
        descripcion="Tu lista de precios. Se usa al armar cada presupuesto (el precio se puede ajustar en cada uno)."
      >
        <button type="button" className={BTN_SECUNDARIO} onClick={() => setReglas(true)}>
          <BadgePercent className="size-4" />
          Reglas
        </button>
        <button type="button" className={BTN_SECUNDARIO} onClick={() => setAumento(true)}>
          <TrendingUp className="size-4" />
          Actualizar precios
        </button>
        <button type="button" className={BTN_SECUNDARIO} onClick={exportar}>
          <FileSpreadsheet className="size-4" />
          Excel
        </button>
        <button type="button" className={BTN_SECUNDARIO} onClick={() => archivo.current?.click()}>
          <Upload className="size-4" />
          Importar
        </button>
        <input
          ref={archivo}
          type="file"
          accept=".xlsx,.csv"
          className="hidden"
          aria-label="Importar aranceles"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importar(f);
            e.target.value = "";
          }}
        />
        <button type="button" className={BTN_PRIMARIO} onClick={() => setEditar("nuevo")}>
          <Plus className="size-4" />
          Nueva prestación
        </button>
      </Encabezado>
      <div className="card-grad space-y-2.5 p-3">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary/60" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar prestación o código"
            className={`${INPUT} pl-9`}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <button type="button" className={CHIP(!cat)} onClick={() => setCat("")}>
            Todas
          </button>
          {CATEGORIAS_ARANCEL.map((c) => (
            <button key={c} type="button" className={CHIP(cat === c)} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        {lista.map((a) => (
          <li
            key={a.id}
            className={`card-grad flex items-center gap-3 p-3 ${a.activo ? "" : "opacity-60"}`}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/10 font-mono text-[10px] font-bold text-primary">
              {a.codigo}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{a.nombre}</p>
              <p className="text-[11px] text-muted-foreground">
                {a.categoria} · {a.duracion} min{a.activo ? "" : " · inactiva"}
              </p>
            </div>
            <p className="text-sm font-bold text-primary">{ars(a.precio)}</p>
            <button
              type="button"
              aria-label={`Editar ${a.nombre}`}
              className={BTN_ICONO}
              onClick={() => setEditar(a)}
            >
              <Pencil className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      {editar && (
        <M
          titulo={editar === "nuevo" ? "Nueva prestación" : `Editar ${editar.nombre}`}
          onClose={() => setEditar(null)}
        >
          <ArancelForm
            inicial={editar === "nuevo" ? null : editar}
            onCancel={() => setEditar(null)}
            onListo={(m) => {
              setEditar(null);
              ctx.onToast(m);
            }}
          />
        </M>
      )}
      {aumento && (
        <M titulo="Actualizar precios" onClose={() => setAumento(false)}>
          <AumentoForm
            onCancel={() => setAumento(false)}
            onListo={(m) => {
              setAumento(false);
              ctx.onToast(m);
            }}
          />
        </M>
      )}
      {reglas && (
        <M titulo="Reglas de presupuestos" onClose={() => setReglas(false)}>
          <ReglasForm
            inicial={config}
            onCancel={() => setReglas(false)}
            onListo={(m) => {
              setReglas(false);
              ctx.onToast(m);
            }}
          />
        </M>
      )}
    </div>
  );
}

function ArancelForm({
  inicial,
  onCancel,
  onListo,
}: {
  inicial: Arancel | null;
  onCancel: () => void;
  onListo: (m: string) => void;
}) {
  const [f, setF] = useState({
    codigo: inicial?.codigo ?? "",
    nombre: inicial?.nombre ?? "",
    categoria: inicial?.categoria ?? ("Operatoria" as CategoriaArancel),
    precio: String(inicial?.precio ?? ""),
    duracion: String(inicial?.duracion ?? 30),
    activo: inicial?.activo ?? true,
  });
  const [error, setError] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!f.nombre.trim()) return setError("Escribí el nombre de la prestación.");
        if (!(Number(f.precio) > 0)) return setError("Indicá el precio.");
        const datos = {
          codigo: f.codigo.trim().toUpperCase() || `XX-${Date.now().toString().slice(-3)}`,
          nombre: f.nombre.trim()[0]!.toUpperCase() + f.nombre.trim().slice(1),
          categoria: f.categoria,
          precio: Number(f.precio),
          duracion: Number(f.duracion) || 30,
          activo: f.activo,
        };
        if (inicial)
          setPresupuestos("aranceles", (p) =>
            p.map((a) => (a.id === inicial.id ? { ...a, ...datos } : a)),
          );
        else setPresupuestos("aranceles", (p) => [...p, { ...datos, id: `a-${Date.now()}` }]);
        onListo(`${datos.nombre} guardada`);
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[120px_1fr]">
        <Field label="Código">
          <input
            value={f.codigo}
            onChange={(e) => setF((p) => ({ ...p, codigo: e.target.value }))}
            className={`${INPUT} font-mono uppercase`}
            placeholder="OP-03"
          />
        </Field>
        <Field label="Prestación *">
          <input
            autoFocus
            value={f.nombre}
            onChange={(e) => setF((p) => ({ ...p, nombre: e.target.value }))}
            className={INPUT}
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Categoría">
          <Sel
            value={f.categoria}
            onChange={(v) => setF((p) => ({ ...p, categoria: v }))}
            opciones={CATEGORIAS_ARANCEL}
          />
        </Field>
        <Field label="Precio *">
          <input
            type="number"
            min={0}
            value={f.precio}
            onChange={(e) => setF((p) => ({ ...p, precio: e.target.value }))}
            className={INPUT}
            aria-label="Precio del arancel"
          />
        </Field>
        <Field label="Duración (min)">
          <input
            type="number"
            min={5}
            value={f.duracion}
            onChange={(e) => setF((p) => ({ ...p, duracion: e.target.value }))}
            className={INPUT}
          />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={f.activo}
          onChange={(e) => setF((p) => ({ ...p, activo: e.target.checked }))}
          className="size-4 accent-primary"
        />{" "}
        Activa (aparece al armar presupuestos)
      </label>
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      <Acciones etiqueta="Guardar" onCancel={onCancel} />
    </form>
  );
}

function AumentoForm({
  onCancel,
  onListo,
}: {
  onCancel: () => void;
  onListo: (m: string) => void;
}) {
  const [pct, setPct] = useState("8");
  const [cat, setCat] = useState<"" | CategoriaArancel>("");
  const [redondeo, setRedondeo] = useState("500");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const p = Number(pct);
        if (!p) return;
        const r = Math.max(1, Number(redondeo) || 1);
        let n = 0;
        setPresupuestos("aranceles", (prev) =>
          prev.map((a) =>
            !cat || a.categoria === cat
              ? (n++, { ...a, precio: Math.round((a.precio * (1 + p / 100)) / r) * r })
              : a,
          ),
        );
        onListo(`Precios actualizados ${p > 0 ? "+" : ""}${p}% (${cat || "todas las categorías"})`);
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Porcentaje">
          <input
            type="number"
            step="any"
            value={pct}
            onChange={(e) => setPct(e.target.value)}
            className={INPUT}
            aria-label="Porcentaje de aumento"
          />
        </Field>
        <Field label="Categoría">
          <Sel
            value={cat}
            onChange={setCat}
            opciones={[
              { value: "", label: "Todas" },
              ...CATEGORIAS_ARANCEL.map((c) => ({ value: c, label: c })),
            ]}
          />
        </Field>
        <Field label="Redondear a">
          <input
            type="number"
            min={1}
            value={redondeo}
            onChange={(e) => setRedondeo(e.target.value)}
            className={INPUT}
          />
        </Field>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Los presupuestos ya emitidos conservan su precio.
      </p>
      <Acciones etiqueta="Aplicar" onCancel={onCancel} icon={TrendingUp} />
    </form>
  );
}

function ReglasForm({
  inicial,
  onCancel,
  onListo,
}: {
  inicial: {
    validezDias: number;
    descuentoMaxPct: number;
    recordatorioDias: number;
    condiciones: string;
  };
  onCancel: () => void;
  onListo: (m: string) => void;
}) {
  const [c, setC] = useState(inicial);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setPresupuestos("config", () => c);
        onListo("Reglas guardadas");
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Validez (días)">
          <input
            type="number"
            min={1}
            value={c.validezDias}
            onChange={(e) => setC((p) => ({ ...p, validezDias: Number(e.target.value) }))}
            className={INPUT}
          />
        </Field>
        <Field label="Descuento máximo %">
          <input
            type="number"
            min={0}
            max={100}
            value={c.descuentoMaxPct}
            onChange={(e) => setC((p) => ({ ...p, descuentoMaxPct: Number(e.target.value) }))}
            className={INPUT}
          />
        </Field>
        <Field label="Recordar a los (días)">
          <input
            type="number"
            min={1}
            value={c.recordatorioDias}
            onChange={(e) => setC((p) => ({ ...p, recordatorioDias: Number(e.target.value) }))}
            className={INPUT}
          />
        </Field>
      </div>
      <Field label="Condiciones que salen en el PDF">
        <textarea
          rows={3}
          value={c.condiciones}
          onChange={(e) => setC((p) => ({ ...p, condiciones: e.target.value }))}
          className="w-full rounded-xl border border-primary/12 bg-white px-3 py-2 text-sm outline-none focus:border-primary/45"
        />
      </Field>
      <Acciones etiqueta="Guardar reglas" onCancel={onCancel} />
    </form>
  );
}

/* ───────────── Plantillas ───────────── */

function Plantillas({ ctx }: { ctx: Ctx }) {
  const { plantillas, aranceles } = storePresupuestos.usar();
  const [editar, setEditar] = useState<Plantilla | "nueva" | null>(null);
  const totalDe = (t: Plantilla) =>
    t.items.reduce(
      (a, it) => a + (aranceles.find((x) => x.id === it.arancelId)?.precio ?? 0) * it.cantidad,
      0,
    );
  return (
    <div className="space-y-3">
      <Encabezado
        icon={FolderOpen}
        titulo="Plantillas de tratamientos"
        descripcion="Paquetes listos para presupuestar en un clic. Los precios salen de los aranceles vigentes."
      >
        <button type="button" className={BTN_PRIMARIO} onClick={() => setEditar("nueva")}>
          <Plus className="size-4" />
          Nueva plantilla
        </button>
      </Encabezado>
      {plantillas.length === 0 ? (
        <Vacio icon={FolderOpen} texto="Todavía no hay plantillas." />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {plantillas.map((t) => (
            <li key={t.id} className="card-grad flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{t.nombre}</p>
                  <p className="text-[11px] text-muted-foreground">{t.descripcion}</p>
                </div>
                <button
                  type="button"
                  aria-label={`Editar ${t.nombre}`}
                  className={BTN_ICONO}
                  onClick={() => setEditar(t)}
                >
                  <Pencil className="size-3.5" />
                </button>
              </div>
              <ul className="mt-2 space-y-0.5 text-[11px]">
                {t.items.map((it) => {
                  const a = aranceles.find((x) => x.id === it.arancelId);
                  return (
                    <li key={it.arancelId} className="flex justify-between gap-2">
                      <span className="truncate">
                        {it.cantidad}× {a?.nombre ?? "Prestación eliminada"}
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {ars((a?.precio ?? 0) * it.cantidad)}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                <p className="text-lg font-bold text-primary">{ars(totalDe(t))}</p>
                <button
                  type="button"
                  className={BTN_PRIMARIO}
                  onClick={() => ctx.nuevo({ plantillaId: t.id })}
                >
                  <ArrowRight className="size-4" />
                  Presupuestar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editar && (
        <M
          titulo={editar === "nueva" ? "Nueva plantilla" : `Editar ${editar.nombre}`}
          onClose={() => setEditar(null)}
          ancho="max-w-2xl"
        >
          <PlantillaForm
            inicial={editar === "nueva" ? null : editar}
            onCancel={() => setEditar(null)}
            onListo={(m) => {
              setEditar(null);
              ctx.onToast(m);
            }}
          />
        </M>
      )}
    </div>
  );
}

function PlantillaForm({
  inicial,
  onCancel,
  onListo,
}: {
  inicial: Plantilla | null;
  onCancel: () => void;
  onListo: (m: string) => void;
}) {
  const { aranceles } = storePresupuestos.usar();
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? "");
  const [items, setItems] = useState(
    inicial?.items ?? [{ arancelId: aranceles[0]?.id ?? "", cantidad: 1 }],
  );
  const [error, setError] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!nombre.trim()) return setError("Poné un nombre a la plantilla.");
        const validos = items.filter((i) => i.arancelId && i.cantidad > 0);
        if (!validos.length) return setError("Agregá al menos una prestación.");
        const datos = { nombre: nombre.trim(), descripcion: descripcion.trim(), items: validos };
        if (inicial)
          setPresupuestos("plantillas", (p) =>
            p.map((t) => (t.id === inicial.id ? { ...t, ...datos } : t)),
          );
        else setPresupuestos("plantillas", (p) => [...p, { ...datos, id: `t-${Date.now()}` }]);
        onListo(`Plantilla ${datos.nombre} guardada`);
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Nombre *">
          <input
            autoFocus
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={INPUT}
            placeholder="Ej: Rehabilitación completa"
          />
        </Field>
        <Field label="Descripción">
          <input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className={INPUT}
          />
        </Field>
      </div>
      <ul className="space-y-1.5">
        {items.map((it, n) => (
          <li key={n} className="grid grid-cols-[1fr_80px_32px] items-center gap-2">
            <Sel
              value={it.arancelId}
              onChange={(v) =>
                setItems((p) => p.map((x, k) => (k === n ? { ...x, arancelId: v } : x)))
              }
              etiqueta="Prestación de la plantilla"
              opciones={aranceles.map((a) => ({
                value: a.id,
                label: `${a.nombre} · ${ars(a.precio)}`,
              }))}
            />
            <input
              type="number"
              min={1}
              value={it.cantidad}
              onChange={(e) =>
                setItems((p) =>
                  p.map((x, k) => (k === n ? { ...x, cantidad: Number(e.target.value) } : x)),
                )
              }
              className={INPUT}
              aria-label="Cantidad"
            />
            <button
              type="button"
              aria-label="Quitar"
              className={BTN_ICONO}
              onClick={() => setItems((p) => p.filter((_, k) => k !== n))}
            >
              <X className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={BTN_SECUNDARIO}
        onClick={() => setItems((p) => [...p, { arancelId: aranceles[0]?.id ?? "", cantidad: 1 }])}
      >
        <Plus className="size-4" />
        Agregar prestación
      </button>
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      <Acciones
        etiqueta="Guardar plantilla"
        onCancel={onCancel}
        extra={
          inicial ? (
            <button
              type="button"
              className={BTN_SECUNDARIO}
              onClick={() => {
                setPresupuestos("plantillas", (p) => p.filter((t) => t.id !== inicial.id));
                onListo(`Plantilla ${inicial.nombre} eliminada`);
              }}
            >
              <Trash2 className="size-4" />
              Eliminar
            </button>
          ) : undefined
        }
      />
    </form>
  );
}

/* ───────────── Financiación ───────────── */

function Financiacion({ ctx }: { ctx: Ctx }) {
  const { planes } = storePresupuestos.usar();
  const [monto, setMonto] = useState("650000");
  const [nuevo, setNuevo] = useState(false);
  const m = Number(monto) || 0;
  return (
    <div className="space-y-3">
      <Encabezado
        icon={Calculator}
        titulo="Planes de financiación"
        descripcion="Cuotas con recargo o descuento por pago contado. Se ofrecen al armar cada presupuesto."
      >
        <button type="button" className={BTN_PRIMARIO} onClick={() => setNuevo(true)}>
          <Plus className="size-4" />
          Nuevo plan
        </button>
      </Encabezado>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.2fr_1fr]">
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {planes.map((p) => (
            <li key={p.id} className={`card-grad p-4 ${p.activo ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{p.nombre}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {p.cuotas} {p.cuotas === 1 ? "pago" : "cuotas"} ·{" "}
                    {p.recargoPct > 0
                      ? `recargo ${p.recargoPct}%`
                      : p.recargoPct < 0
                        ? `descuento ${-p.recargoPct}%`
                        : "sin interés"}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={p.activo}
                  aria-label={p.nombre}
                  onClick={() => {
                    setPresupuestos("planes", (prev) =>
                      prev.map((x) => (x.id === p.id ? { ...x, activo: !x.activo } : x)),
                    );
                    ctx.onToast(`${p.nombre}: ${p.activo ? "desactivado" : "activado"}`);
                  }}
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${p.activo ? "bg-primary" : "bg-muted-foreground/30"}`}
                >
                  <span
                    className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${p.activo ? "left-[18px]" : "left-0.5"}`}
                  />
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">Recargo %</span>
                <input
                  type="number"
                  step="any"
                  value={p.recargoPct}
                  onChange={(e) =>
                    setPresupuestos("planes", (prev) =>
                      prev.map((x) =>
                        x.id === p.id ? { ...x, recargoPct: Number(e.target.value) } : x,
                      ),
                    )
                  }
                  className={`${INPUT} h-8 w-24`}
                  aria-label={`Recargo ${p.nombre}`}
                />
              </div>
            </li>
          ))}
        </ul>
        <div className="card-grad p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-primary" /> Simulador para el paciente
          </p>
          <Field label="Monto del tratamiento">
            <input
              type="number"
              min={0}
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className={`${INPUT} mt-1`}
              aria-label="Monto a simular"
            />
          </Field>
          <ul className="mt-3 space-y-1.5">
            {planes
              .filter((p) => p.activo)
              .map((p) => {
                const r = conPlan(m, p);
                return (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-white/85 px-3 py-2 ring-1 ring-primary/10"
                  >
                    <span className="text-xs font-medium">{p.nombre}</span>
                    <span className="text-right text-xs">
                      <b className="text-primary">
                        {r.cuotas > 1 ? `${r.cuotas} × ${ars(r.cuota)}` : ars(r.final)}
                      </b>
                      <br />
                      <span className="text-muted-foreground">total {ars(r.final)}</span>
                    </span>
                  </li>
                );
              })}
          </ul>
        </div>
      </div>
      {nuevo && (
        <M titulo="Nuevo plan" onClose={() => setNuevo(false)}>
          <PlanForm
            onCancel={() => setNuevo(false)}
            onListo={(t) => {
              setNuevo(false);
              ctx.onToast(t);
            }}
          />
        </M>
      )}
    </div>
  );
}

function PlanForm({ onCancel, onListo }: { onCancel: () => void; onListo: (m: string) => void }) {
  const [nombre, setNombre] = useState("");
  const [cuotas, setCuotas] = useState("6");
  const [recargo, setRecargo] = useState("0");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!nombre.trim()) return;
        setPresupuestos("planes", (p) => [
          ...p,
          {
            id: `f-${Date.now()}`,
            nombre: nombre.trim(),
            cuotas: Math.max(1, Number(cuotas) || 1),
            recargoPct: Number(recargo) || 0,
            activo: true,
          },
        ]);
        onListo(`Plan ${nombre.trim()} creado`);
      }}
      className="space-y-3"
    >
      <Field label="Nombre">
        <input
          autoFocus
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className={INPUT}
          placeholder="Ej: 6 cuotas con tarjeta"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cuotas">
          <input
            type="number"
            min={1}
            value={cuotas}
            onChange={(e) => setCuotas(e.target.value)}
            className={INPUT}
          />
        </Field>
        <Field label="Recargo % (negativo = descuento)">
          <input
            type="number"
            step="any"
            value={recargo}
            onChange={(e) => setRecargo(e.target.value)}
            className={INPUT}
          />
        </Field>
      </div>
      <Acciones etiqueta="Crear plan" onCancel={onCancel} />
    </form>
  );
}

/* ───────────── Reportes ───────────── */

function Reportes({ filas }: { filas: Fila[] }) {
  const { planes } = storePresupuestos.usar();
  const t = (f: Fila) => totalesPresupuesto(f.p, planes).final;
  const agrupar = (clave: (f: Fila) => string) =>
    Object.entries(
      filas.reduce<Record<string, { total: number; aprob: number; resp: number; monto: number }>>(
        (a, f) => {
          const k = clave(f);
          const x = a[k] ?? { total: 0, aprob: 0, resp: 0, monto: 0 };
          x.total++;
          if (f.p.estado === "Aprobado") {
            x.aprob++;
            x.monto += t(f);
          }
          if (f.p.estado === "Aprobado" || f.p.estado === "Rechazado") x.resp++;
          a[k] = x;
          return a;
        },
        {},
      ),
    ).sort((a, b) => b[1].monto - a[1].monto);
  const porProf = agrupar((f) => f.p.profesional ?? "Sin asignar");
  const prestaciones = Object.entries(
    filas
      .flatMap((f) => f.p.lineas.map((l) => ({ l, ok: f.p.estado === "Aprobado" })))
      .reduce<Record<string, { veces: number; monto: number }>>((a, { l, ok }) => {
        const x = a[l.descripcion] ?? { veces: 0, monto: 0 };
        x.veces += l.cantidad;
        if (ok) x.monto += l.cantidad * l.precio;
        a[l.descripcion] = x;
        return a;
      }, {}),
  )
    .sort((a, b) => b[1].veces - a[1].veces)
    .slice(0, 8);
  const motivos = Object.entries(
    filas
      .filter((f) => f.p.motivoRechazo)
      .reduce<Record<string, number>>(
        (a, f) => ({ ...a, [f.p.motivoRechazo!]: (a[f.p.motivoRechazo!] ?? 0) + 1 }),
        {},
      ),
  );
  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const porMes = meses.map((m) => ({
    m,
    emitido: filas.filter((f) => f.p.fecha.startsWith(m)).reduce((a, f) => a + t(f), 0),
    aprobado: filas
      .filter((f) => f.p.fecha.startsWith(m) && f.p.estado === "Aprobado")
      .reduce((a, f) => a + t(f), 0),
  }));
  const maxMes = Math.max(1, ...porMes.map((x) => x.emitido));
  const maxPrest = Math.max(1, ...prestaciones.map(([, v]) => v.veces));
  return (
    <div className="space-y-3">
      <Encabezado
        icon={BarChart3}
        titulo="Reportes"
        descripcion="Qué se presupuesta, cuánto se aprueba y por qué se pierde."
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Mini label="Presupuestos" valor={String(filas.length)} icon={ReceiptText} />
        <Mini
          label="Monto aprobado"
          valor={ars(filas.filter((f) => f.p.estado === "Aprobado").reduce((a, f) => a + t(f), 0))}
          icon={CircleDollarSign}
          tono="text-emerald-600"
        />
        <Mini
          label="Monto perdido"
          valor={ars(filas.filter((f) => f.p.estado === "Rechazado").reduce((a, f) => a + t(f), 0))}
          icon={ThumbsDown}
          tono="text-rose-600"
        />
        <Mini
          label="Días promedio de respuesta"
          valor={(() => {
            const r = filas.filter((f) => f.p.respondido && f.p.enviado);
            return r.length
              ? `${Math.round(r.reduce((a, f) => a + dias(f.p.enviado!, f.p.respondido!), 0) / r.length)} d`
              : "—";
          })()}
          icon={AlarmClock}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="card-grad p-4">
          <p className="text-sm font-semibold">Emitido vs. aprobado (6 meses)</p>
          <div className="mt-4 flex h-44 items-end gap-3">
            {porMes.map((x) => (
              <div key={x.m} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full items-end justify-center gap-1" style={{ height: 130 }}>
                  <div
                    title={`Emitido ${ars(x.emitido)}`}
                    className="w-1/2 rounded-t-lg bg-primary/25"
                    style={{ height: `${Math.max(3, (x.emitido / maxMes) * 130)}px` }}
                  />
                  <div
                    title={`Aprobado ${ars(x.aprobado)}`}
                    className="w-1/2 rounded-t-lg bg-gradient-to-t from-primary to-fuchsia-400"
                    style={{ height: `${Math.max(3, (x.aprobado / maxMes) * 130)}px` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(`${x.m}-15T12:00:00`).toLocaleDateString("es-AR", { month: "short" })}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="size-2.5 rounded bg-primary/25" /> Emitido
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2.5 rounded bg-primary" /> Aprobado
            </span>
          </div>
        </div>
        <div className="card-grad p-4">
          <p className="text-sm font-semibold">Por profesional</p>
          <ul className="mt-3 space-y-2">
            {porProf.map(([k, v]) => (
              <li
                key={k}
                className="flex items-center justify-between gap-2 rounded-xl bg-white/80 px-3 py-2 ring-1 ring-primary/10 text-xs"
              >
                <span className="font-semibold">{k}</span>
                <span className="text-muted-foreground">
                  {v.total} emitidos ·{" "}
                  <b className="text-emerald-600">
                    {v.resp ? Math.round((v.aprob / v.resp) * 100) : 0}% aceptación
                  </b>{" "}
                  · <b className="text-primary">{ars(v.monto)}</b>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card-grad p-4">
          <p className="text-sm font-semibold">Prestaciones más presupuestadas</p>
          <ul className="mt-3 space-y-2.5">
            {prestaciones.map(([k, v]) => (
              <li key={k}>
                <div className="mb-1 flex justify-between gap-2 text-xs">
                  <span className="truncate">{k}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {v.veces} · aprobado {ars(v.monto)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-primary/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-fuchsia-500"
                    style={{ width: `${(v.veces / maxPrest) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="card-grad p-4">
          <p className="text-sm font-semibold">Motivos de rechazo</p>
          {motivos.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">Sin rechazos registrados.</p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {motivos.map(([k, v]) => (
                <li
                  key={k}
                  className="flex justify-between rounded-xl bg-rose-50/70 px-3 py-2 text-xs ring-1 ring-rose-200"
                >
                  <span>{k}</span>
                  <b className="text-rose-700">{v}</b>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
