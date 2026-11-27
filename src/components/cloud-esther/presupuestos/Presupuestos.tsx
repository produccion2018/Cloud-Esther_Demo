import { telefonoInternacional } from "@/lib/clinica/whatsapp";
import { crearEnlacePresupuesto } from "@/lib/clinica/enlace-estudio";
import { useEffect, useRef, useState } from "react";
import { CaraEsther } from "@/components/cloud-esther/esther-ai/CaraEsther";
import { useNavigate } from "@tanstack/react-router";
import {
  AlarmClock,
  ArrowRight,
  Layers,
  BarChart3,
  BadgePercent,
  Calculator,
  CalendarClock,
  CalendarPlus,
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
import { DocPaciente } from "@/components/cloud-esther/EtiquetaPais";
import { useEquipo } from "@/lib/cloud-esther/equipo-store";
import { useSesion } from "@/lib/cloud-esther/auth-store";
import { MODULES, availableIn, useCloudEsther } from "@/lib/cloud-esther/data";
import { storeN8n } from "@/lib/cloud-esther/n8n-store";
import { MEDIOS_PAGO, setFacturacion, storeFacturacion, type MedioPago } from "@/lib/cloud-esther/facturacion-store";
import { storePortal } from "@/lib/cloud-esther/portal-store";
import { setTurnosStore, storeAgenda, SUCURSALES, type Turno } from "@/lib/cloud-esther/agenda-store";
import { proponerSesiones } from "@/lib/cloud-esther/reservas-online";
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
/** Lo que el paciente ya pagó de este presupuesto (pagos de su cuenta marcados con el presupuesto) */
function pagadoDe(cuenta: { tipo: string; monto: number; presupuestoId?: number }[] | undefined, id: number) {
  return (cuenta ?? []).filter((m) => m.tipo === "Pago" && m.presupuestoId === id).reduce((a, m) => a + m.monto, 0);
}

/** «Opción A · Económica» (vacío si el presupuesto no tiene opciones) */
const etiquetaOpcion = (p: PresupuestoPaciente) =>
  p.grupoOpciones && p.opcion ? `Opción ${p.opcion}${p.opcionNombre ? ` · ${p.opcionNombre}` : ""}` : "";
const nombrePac = (x: Paciente | undefined) => (x ? `${x.nombre} ${x.apellido}` : "Paciente");
const vencido = (p: PresupuestoPaciente) =>
  p.estado === "Enviado" && !!p.validez && p.validez < hoyISO();
const estadoVisual = (p: PresupuestoPaciente) => (vencido(p) ? "Vencido" : p.estado);
function wa(tel: string, texto: string) {
  return `https://wa.me/${telefonoInternacional(tel)}?text=${encodeURIComponent(texto)}`;
}
/** Abre WhatsApp con el enlace para que el paciente vea y apruebe (con su firma) el presupuesto.
    La ventana se abre YA (si no, el celular la bloquea) y el enlace se completa en un instante. */
function abrirWhatsAppConEnlace(tel: string, pid: number, presupuestoId: number, armar: (enlace: string | null) => string) {
  const ventana = window.open("", "_blank");
  void crearEnlacePresupuesto(pid, presupuestoId)
    .catch(() => null)
    .then((enlace) => {
      const url = wa(tel, armar(enlace));
      if (ventana && !ventana.closed) {
        ventana.opener = null;
        ventana.location.href = url;
      } else window.open(url, "_blank", "noopener,noreferrer");
    });
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
  const t = (f: Fila) => totalesPresupuesto(f.p, planes).total;
  // Opciones A / B: en los números cuenta una sola por grupo (la de mayor monto), no la suma
  const unaPorGrupo = (l: Fila[]) => {
    const mejor = new Map<string, Fila>();
    for (const f of l) {
      if (!f.p.grupoOpciones) continue;
      const k = `${f.pid}:${f.p.grupoOpciones}`;
      const m = mejor.get(k);
      if (!m || t(f) > t(m)) mejor.set(k, f);
    }
    return l.filter((f) => !f.p.grupoOpciones || mejor.get(`${f.pid}:${f.p.grupoOpciones}`) === f);
  };
  const recientes = unaPorGrupo(filas.filter((f) => f.p.fecha >= hace30));
  const resueltos = filas.filter(
    (f) => f.p.estado === "Aprobado" || (f.p.estado === "Rechazado" && f.p.motivoRechazo !== "Eligió otra opción"),
  );
  const aprobados = filas.filter((f) => f.p.estado === "Aprobado");
  const enEspera = unaPorGrupo(filas.filter((f) => f.p.estado === "Enviado"));

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
                  mandalos por WhatsApp para que el paciente los apruebe con su firma desde el celular y seguí cada uno hasta que se
                  apruebe.
                </p>
              </div>
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
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
              aria-label="Secciones de presupuestos"
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
      // Con opciones A / B se mandan todas juntas (el paciente las compara en el mismo enlace)
      const grupo = f.p.grupoOpciones;
      cambiar(f.pid, "presupuestos", (prev) =>
        prev.map((p) =>
          p.id === f.p.id || (grupo && p.grupoOpciones === grupo && (p.estado === "Borrador" || p.estado === "Enviado"))
            ? {
                ...p,
                estado: p.estado === "Borrador" ? "Enviado" : p.estado,
                enviado: hoyISO(),
                validez: p.validez && p.validez >= hoyISO() ? p.validez : hoyISO(config.validezDias),
                seguimientos: [...(p.seguimientos ?? []), seguimiento(`Enviado por ${via}`)],
              }
            : p,
        ),
      );
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
      // Las otras opciones del mismo grupo quedan cerradas
      if (f.p.grupoOpciones)
        cambiar(f.pid, "presupuestos", (prev) =>
          prev.map((p) =>
            p.id !== f.p.id && p.grupoOpciones === f.p.grupoOpciones && (p.estado === "Borrador" || p.estado === "Enviado")
              ? {
                  ...p,
                  estado: "Rechazado",
                  respondido: hoyISO(),
                  motivoRechazo: "Eligió otra opción",
                  seguimientos: [...(p.seguimientos ?? []), seguimiento(`El paciente eligió la opción ${f.p.opcion ?? f.p.numero}`)],
                }
              : p,
          ),
        );
      cambiar(f.pid, "cuenta", (prev) => [
        ...prev,
        {
          id: Date.now(),
          fecha: hoyISO(),
          tipo: "Cargo",
          concepto: `Presupuesto ${f.p.numero} aprobado`,
          presupuestoId: f.p.id,
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
    recordado(f: Fila) {
      actualizar(f.pid, f.p.id, (p) => ({
        ...p,
        ultimoRecordatorio: hoyISO(),
        seguimientos: [...(p.seguimientos ?? []), seguimiento("Recordatorio enviado por WhatsApp (con el link para aprobar)")],
      }));
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
    textoWhatsApp(f: Fila, enlace: string | null = null) {
      const tot = totalesPresupuesto(f.p, planes);
      return `Hola ${f.pac?.nombre ?? ""} 👋 Te enviamos tu presupuesto ${f.p.numero} por ${ars(tot.final)}${tot.plan && tot.cuotas > 1 ? ` (${tot.cuotas} cuotas de ${ars(tot.cuota)})` : ""}.${enlace ? ` Miralo y, si estás de acuerdo, aprobalo con tu firma desde el celular:\n${enlace}` : " Cualquier duda, escribinos por acá."}`;
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
${f.p.firmaPaciente?.imagen ? `<div class="firma"><span>Profesional</span><span><img src="${f.p.firmaPaciente.imagen}" style="height:48px;display:block;margin:0 auto 4px" alt="">Conformidad: ${f.p.firmaPaciente.nombre.replace(/[<>&"]/g, "")} · ${fecha(f.p.firmaPaciente.fecha.slice(0, 10))}</span></div>` : `<div class="firma"><span>Profesional</span><span>Conformidad del paciente</span></div>`}`,
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
            {f.p.numero}
            {etiquetaOpcion(f.p) ? ` · ${etiquetaOpcion(f.p)}` : ""} · {f.p.lineas[0]?.descripcion ?? "Sin prestaciones"}
            {f.p.lineas.length > 1 ? ` +${f.p.lineas.length - 1}` : ""}
          </p>
        </div>
        {ev === "Vencido" && <Pill clase={ESTILO.Vencido}>Vencido</Pill>}
      </div>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-x-2 gap-y-0.5">
        <p className="whitespace-nowrap text-lg font-bold text-primary">{ars(tot.final)}</p>
        <p className="min-w-0 text-left text-[10.5px] text-muted-foreground sm:text-right">
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
  const { plan } = useCloudEsther();
  const navigate = useNavigate();
  const acc = useAcciones(ctx);
  const enviados = filas
    .filter((f) => f.p.estado === "Enviado")
    .sort((a, b) => (a.p.enviado ?? a.p.fecha).localeCompare(b.p.enviado ?? b.p.fecha));
  const vencidos = enviados.filter((f) => vencido(f.p));
  // Se recuerda cada «recordatorioDias» desde el envío o desde el último recordatorio
  const ultimo = (f: Fila) => (f.p.ultimoRecordatorio ?? f.p.enviado ?? f.p.fecha).slice(0, 10);
  const recordar = enviados.filter((f) => !vencido(f.p) && dias(ultimo(f)) >= config.recordatorioDias);
  const recientes = enviados.filter((f) => !vencido(f.p) && dias(ultimo(f)) < config.recordatorioDias);
  const modAuto = MODULES.find((m) => m.id === "automatizaciones");
  const conAuto = !!modAuto && availableIn(modAuto, plan);
  const autoActivo = conAuto && storeN8n.usar().flujos.some((fl) => fl.activo && fl.evento === "presupuesto_sin_respuesta");
  const borradores = filas.filter((f) => f.p.estado === "Borrador");
  const { turnos } = storeAgenda.usar();
  const conTurnos = new Set(turnos.filter((t) => t.serie?.startsWith("pres-") && t.estado !== "Cancelada").map((t) => t.serie));
  const sinTurnos = filas
    .filter((f) => f.p.estado === "Aprobado" && !f.p.turnosAgendados && !conTurnos.has(`pres-${f.p.id}`) && (f.p.respondido ?? f.p.fecha) >= hoyISO(-60))
    .sort((a, b) => (b.p.respondido ?? b.p.fecha).localeCompare(a.p.respondido ?? a.p.fecha));
  const registrosTodos = useTodosLosRegistros();
  const conSaldo = filas
    .filter((f) => f.p.estado === "Aprobado")
    .map((f) => ({ f, falta: totalesPresupuesto(f.p, planes).final - pagadoDe(registrosTodos[f.pid]?.cuenta, f.p.id) }))
    .filter((x) => x.falta > 0 && (x.f.p.respondido ?? x.f.p.fecha) >= hoyISO(-180))
    .sort((a, b) => b.falta - a.falta)
    .map((x) => x.f);
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
  const btnWA = (f: Fila, texto: (enlace: string | null) => string) =>
    f.pac?.telefono ? (
      <button
        type="button"
        className={BTN_PRIMARIO}
        onClick={() => {
          abrirWhatsAppConEnlace(f.pac!.telefono, f.pid, f.p.id, texto);
          acc.recordado(f);
          ctx.onToast(`Recordatorio registrado para ${nombrePac(f.pac)}`);
        }}
      >
        <MessageCircle className="size-4" />
        Recordar
      </button>
    ) : null;
  return (
    <div className="space-y-3">
      <Encabezado
        icon={AlarmClock}
        titulo="Seguimiento"
        descripcion={`Los presupuestos sin respuesta después de ${config.recordatorioDias} días conviene recordarlos. Los vencidos se renuevan o se cierran.`}
      />
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3.5 ring-1 ${autoActivo ? "bg-emerald-50/80 ring-emerald-200" : "bg-gradient-to-r from-sky-50 to-violet-50 ring-primary/10"}`}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span className={`grid size-9 shrink-0 place-items-center rounded-xl text-white ${autoActivo ? "bg-emerald-500" : "bg-gradient-to-br from-sky-500 to-violet-500"}`}>
            {autoActivo ? <Check className="size-4" /> : <AlarmClock className="size-4" />}
          </span>
          <p className="min-w-0 text-xs leading-relaxed text-slate-700">
            {autoActivo ? (
              <>
                <b>Seguimiento automático activo.</b> A los días sin respuesta, Cloud Esther le escribe solo al paciente por WhatsApp con el link para aprobarlo, y lo anota acá.
              </>
            ) : conAuto ? (
              <>
                <b>¿Querés que se haga solo?</b> Activá «Seguimiento de presupuestos» en Automatizaciones y los recordatorios salen solos, con el link para aprobar.
              </>
            ) : (
              <>
                <b>Te avisamos cada día</b> en Notificaciones qué presupuestos recordar y cuáles vencen. Con «Recordar» le llega al paciente el link para aprobarlo desde el celular.
              </>
            )}
          </p>
        </div>
        {conAuto && !autoActivo && (
          <button type="button" className={BTN_PRIMARIO} onClick={() => void navigate({ to: "/demo/automatizaciones" })}>
            Activar
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {sinTurnos.length > 0 && (
          <Bloque
            titulo="Aprobados sin turnos"
            icon={CalendarPlus}
            tono="text-emerald-600"
            lista={sinTurnos}
            accion={(f) => (
              <button type="button" className={BTN_PRIMARIO} onClick={() => ctx.abrir(f.pid, f.p.id)}>
                <CalendarPlus className="size-4" />
                Agendar
              </button>
            )}
          />
        )}
        {conSaldo.length > 0 && (
          <Bloque
            titulo="Aprobados con saldo por cobrar"
            icon={CircleDollarSign}
            tono="text-emerald-600"
            lista={conSaldo}
            accion={(f) => (
              <button type="button" className={BTN_SECUNDARIO} onClick={() => ctx.abrir(f.pid, f.p.id)}>
                <CircleDollarSign className="size-4" />
                Cobrar
              </button>
            )}
          />
        )}
        <Bloque
          titulo="Para recordar hoy"
          icon={AlarmClock}
          tono="text-amber-600"
          lista={recordar}
          accion={(f) =>
            btnWA(
              f,
              (enlace) =>
                `Hola ${f.pac?.nombre ?? ""}, ¿pudiste ver el presupuesto ${f.p.numero}? ${enlace ? `Lo tenés acá para verlo y aprobarlo desde el celular:\n${enlace}\n` : ""}Si tenés dudas sobre el tratamiento o las cuotas, escribinos. ¡Te esperamos!`,
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
                if (f.pac?.telefono) {
                  abrirWhatsAppConEnlace(f.pac.telefono, f.pid, f.p.id, (enlace) => acc.textoWhatsApp(f, enlace));
                  acc.enviar(f, "WhatsApp");
                  ctx.onToast(`${f.p.numero} enviado: el paciente lo aprueba desde el enlace`);
                } else {
                  acc.enviar(f, "la clínica");
                  ctx.onToast(`${f.p.numero} marcado como enviado (el paciente no tiene WhatsApp cargado)`);
                }
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
  const hermanos = p.grupoOpciones
    ? (registros[pid]?.presupuestos ?? []).filter((x) => x.grupoOpciones === p.grupoOpciones).sort((a, b) => (a.opcion ?? "").localeCompare(b.opcion ?? ""))
    : [];
  const tot = totalesPresupuesto(p, planes);
  const ev = estadoVisual(p);
  return (
    <M titulo={`${p.numero}${etiquetaOpcion(p) ? ` · ${etiquetaOpcion(p)}` : ""} · ${nombrePac(pac)}`} onClose={onClose} ancho="max-w-3xl">
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
      {hermanos.length > 1 && (
        <div className="mt-3 rounded-2xl bg-gradient-to-r from-violet-50 to-fuchsia-50 p-2.5 ring-1 ring-primary/10">
          <p className="px-1 text-[11px] font-semibold text-muted-foreground">
            Opciones para el paciente: las ve juntas en el mismo enlace y elige una
          </p>
          <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {hermanos.map((h) => {
              const th = totalesPresupuesto(h, planes);
              const actual = h.id === p.id;
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => !actual && ctx.abrir(pid, h.id)}
                  className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-left ring-1 ${actual ? "bg-white ring-primary/40" : "bg-white/60 ring-primary/10 hover:bg-white"}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold">{etiquetaOpcion(h)}</span>
                    <span className="block text-[10px] text-muted-foreground">{h.numero} · {estadoVisual(h)}</span>
                  </span>
                  <b className="shrink-0 text-sm text-primary">{ars(th.final)}</b>
                </button>
              );
            })}
          </div>
        </div>
      )}
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
      {p.estado === "Aprobado" && <PagosPresupuesto ctx={ctx} f={f} />}
      {p.estado === "Aprobado" && <AgendarTratamiento ctx={ctx} f={f} />}
      {p.firmaPaciente?.imagen && (
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-emerald-50/70 px-3 py-2 ring-1 ring-emerald-200">
          <img src={p.firmaPaciente.imagen} alt="Firma del paciente" className="h-12 w-28 shrink-0 rounded-lg bg-white object-contain ring-1 ring-emerald-100" />
          <p className="min-w-0 text-[11px] text-emerald-900">
            <b>Aprobado y firmado por {p.firmaPaciente.nombre}</b>
            <br />
            desde el enlace, el {fecha(p.firmaPaciente.fecha.slice(0, 10))} a las {new Date(p.firmaPaciente.fecha).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2 border-t border-primary/10 pt-3">
        {(p.estado === "Borrador" || p.estado === "Enviado") && (
          <>
            {pac?.telefono && (
              <button
                type="button"
                className={BTN_PRIMARIO}
                onClick={() => {
                  abrirWhatsAppConEnlace(pac.telefono, f.pid, p.id, (enlace) => acc.textoWhatsApp(f, enlace));
                  acc.enviar(f, "WhatsApp");
                  ctx.onToast("Enviado por WhatsApp: el paciente lo ve y lo aprueba con su firma desde el celular");
                }}
              >
                <MessageCircle className="size-4" />
                WhatsApp
              </button>
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
        {(p.estado === "Borrador" || p.estado === "Enviado") && hermanos.length < 3 && (
          <button
            type="button"
            className={BTN_SECUNDARIO}
            title="Armá una alternativa (más económica o más completa) para que el paciente elija"
            onClick={() => {
              onClose();
              ctx.nuevo({
                pacienteId: pid,
                lineas: p.lineas,
                profesional: p.profesional ?? "",
                descuentoPct: p.descuentoPct ?? 0,
                planId: p.planId ?? "",
                notas: p.notas,
                grupo: p.grupoOpciones || `g-${p.id}`,
                desdeId: p.id,
              });
            }}
          >
            <Layers className="size-4" />
            Otra opción
          </button>
        )}
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
  /** Opciones A / B: grupo al que se suma esta opción y el presupuesto del que sale */
  grupo?: string;
  desdeId?: number;
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
  const editado = base.editarId && base.pacienteId ? registros[base.pacienteId]?.presupuestos.find((x) => x.id === base.editarId) : undefined;
  const grupo = base.grupo ?? editado?.grupoOpciones;
  const [opcionNombre, setOpcionNombre] = useState(editado?.opcionNombre ?? "");
  const [nombreOriginal, setNombreOriginal] = useState("");
  const original = base.desdeId && base.pacienteId ? registros[base.pacienteId]?.presupuestos.find((x) => x.id === base.desdeId) : undefined;
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
    const datos = {
      lineas,
      profesional,
      descuentoPct: pct,
      planId,
      validez,
      notas: notas.trim(),
      ...(grupo ? { opcionNombre: opcionNombre.trim().slice(0, 40) } : {}),
    };
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
    // Opciones A / B: la original pasa a ser la «A» (si todavía no tenía letra) y esta la siguiente
    let letra = "";
    if (grupo) {
      const delGrupo = (registros[pid]?.presupuestos ?? []).filter((x) => x.grupoOpciones === grupo || x.id === base.desdeId);
      const usadas = new Set(delGrupo.map((x) => x.opcion ?? "A"));
      letra = ["A", "B", "C", "D"].find((l) => !usadas.has(l)) ?? "D";
      cambiar(pid, "presupuestos", (prev) =>
        prev.map((x) =>
          x.id === base.desdeId && !x.grupoOpciones
            ? { ...x, grupoOpciones: grupo, opcion: "A", ...(nombreOriginal.trim() ? { opcionNombre: nombreOriginal.trim().slice(0, 40) } : {}) }
            : x,
        ),
      );
    }
    cambiar(pid, "presupuestos", (prev) => [
      ...prev,
      {
        id,
        numero,
        fecha: hoyISO(),
        estado: enviar ? "Enviado" : "Borrador",
        ...datos,
        ...(grupo ? { grupoOpciones: grupo, opcion: letra } : {}),
        ...(enviar ? { enviado: hoyISO() } : {}),
        seguimientos: [
          {
            fecha: new Date().toISOString(),
            texto: enviar ? "Creado y marcado como enviado" : "Creado como borrador",
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
        ? `${numero} creado. Mandalo por WhatsApp para que el paciente lo apruebe`
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
      {grupo && (
        <div className="rounded-2xl bg-gradient-to-r from-violet-50 to-fuchsia-50 p-3 ring-1 ring-primary/15">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Layers className="size-4 text-primary" />
            {base.desdeId ? "Otra opción para que el paciente elija" : `Opción ${editado?.opcion ?? ""}`}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Cambiá las prestaciones (por ejemplo, una más económica o una más completa). El paciente ve las opciones juntas en el
            mismo enlace y elige una con su firma.
          </p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {original && !original.grupoOpciones && (
              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Nombre de la original ({original.numero})
                </span>
                <input value={nombreOriginal} onChange={(e) => setNombreOriginal(e.target.value)} maxLength={40} placeholder="Ej: Económica" className={INPUT} />
              </label>
            )}
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Nombre de esta opción</span>
              <input value={opcionNombre} onChange={(e) => setOpcionNombre(e.target.value)} maxLength={40} placeholder="Ej: Completa" className={INPUT} />
            </label>
          </div>
        </div>
      )}
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
              {!base.editarId && !grupo && (
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
                          · <DocPaciente documento={c.documento} sinFormato />
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
                    className="flex w-full items-center justify-between gap-2 rounded-lg bg-white/85 px-2 py-1.5 text-left text-[11px] hover:bg-card"
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
                {a.categoria} · {a.duracion} min{(a.sesiones ?? 1) > 1 ? ` · ${a.sesiones} sesiones` : ""}{a.activo ? "" : " · inactiva"}
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
    sesiones: String(inicial?.sesiones ?? 1),
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
          sesiones: Math.max(1, Math.min(60, Math.round(Number(f.sesiones) || 1))),
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
      <Field label="Sesiones que suele llevar">
        <input
          type="number"
          min={1}
          max={60}
          value={f.sesiones}
          onChange={(e) => setF((p) => ({ ...p, sesiones: e.target.value }))}
          className={`${INPUT} sm:max-w-[160px]`}
          aria-label="Sesiones que suele llevar"
        />
      </Field>
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
    senaPct?: number;
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
      <Field label="Seña al aprobar (% del total · 0 = sin seña)">
        <input
          type="number"
          min={0}
          max={100}
          value={c.senaPct ?? 0}
          onChange={(e) => setC((p) => ({ ...p, senaPct: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))}
          className={INPUT}
        />
      </Field>
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
            <CaraEsther className="size-4 text-primary" /> Simulador para el paciente
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

/* ───────────── Del presupuesto aprobado a la agenda ───────────── */

const diaCorto = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const t = d.toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** Un turno por sesión con el profesional del presupuesto, en los primeros huecos libres.
    Se puede cambiar el día y la hora de cada uno antes de agendar. */
function AgendarTratamiento({ ctx, f }: { ctx: Ctx; f: Fila }) {
  const { aranceles } = storePresupuestos.usar();
  const agenda = storeAgenda.usar();
  const { miembros, ausencias } = useEquipo();
  const { cambiar } = useRegistrosPacientes();
  const p = f.p;
  const serie = `pres-${p.id}`;
  const yaDados = agenda.turnos.filter((t) => t.serie === serie && t.estado !== "Cancelada").sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`));
  const intervalo = Math.round(agenda.ajustes?.intervaloMin ?? 30);
  const sesionesBase = p.lineas.flatMap((l) => {
    const a = aranceles.find((x) => x.id === l.arancelId) ?? aranceles.find((x) => x.nombre === l.descripcion);
    const n = Math.max(1, Math.min(12, a?.sesiones ?? 1));
    return Array.from({ length: n }, (_, i) => ({
      tratamiento: n > 1 ? `${l.descripcion} (sesión ${i + 1} de ${n})` : l.descripcion,
      duracion: a?.duracion || intervalo,
    }));
  }).slice(0, 12);
  const [abierto, setAbierto] = useState(false);
  const [quitadas, setQuitadas] = useState<Set<number>>(new Set());
  const [cada, setCada] = useState("7");
  const [franja, setFranja] = useState<"" | "manana" | "tarde">("");
  const [cambios, setCambios] = useState<Record<number, { fecha?: string; hora?: string }>>({});
  const manana = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  const [desde, setDesde] = useState(manana);
  const sesiones = sesionesBase.filter((_, i) => !quitadas.has(i));
  const propuesta = proponerSesiones({
    agenda,
    miembros,
    ausencias,
    profesional: p.profesional ?? "",
    duraciones: sesiones.map((x) => x.duracion),
    cadaDias: Math.max(1, Math.min(90, Number(cada) || 7)),
    desde,
    franja,
  });
  const filas = sesiones.map((x, i) => {
    const base = propuesta[i];
    const c = cambios[i] ?? {};
    return { ...x, fecha: c.fecha ?? base?.fecha ?? "", hora: c.hora ?? base?.hora ?? "", odontologo: base?.odontologo ?? p.profesional ?? "" };
  });
  const sinHueco = filas.some((x) => !x.fecha || !x.hora);
  const nombre = nombrePac(f.pac);

  const agendar = () => {
    if (sinHueco || !filas.length) return;
    const ahora = Date.now();
    const nuevos: Turno[] = filas.map((x, i) => ({
      id: ahora + i,
      fecha: x.fecha,
      hora: x.hora,
      paciente: nombre,
      tratamiento: x.tratamiento,
      odontologo: x.odontologo,
      sucursal: SUCURSALES[0] ?? "",
      gabinete: "",
      estado: "Pendiente",
      notas: `Presupuesto ${p.numero}`,
      duracion: x.duracion,
      serie,
      serieN: yaDados.length + i + 1,
      serieTotal: yaDados.length + filas.length,
    }));
    setTurnosStore((prev) => [...prev, ...nuevos]);
    cambiar(f.pid, "presupuestos", (prev) =>
      prev.map((x) =>
        x.id === p.id
          ? {
              ...x,
              turnosAgendados: hoyISO(),
              seguimientos: [
                ...(x.seguimientos ?? []),
                { fecha: new Date().toISOString(), texto: `Se agendaron ${nuevos.length} turnos del tratamiento`, autor: ctx.usuario },
              ],
            }
          : x,
      ),
    );
    setAbierto(false);
    setCambios({});
    ctx.onToast(`Listo: ${nuevos.length} ${nuevos.length === 1 ? "turno agendado" : "turnos agendados"} para ${nombre}`);
  };

  const textoTurnos = `Hola ${f.pac?.nombre ?? ""} 👋 Ya te reservamos los turnos de tu tratamiento:\n${yaDados
    .map((t) => `• ${diaCorto(t.fecha)} a las ${t.hora} hs${t.odontologo ? ` con ${t.odontologo}` : ""}`)
    .join("\n")}\nSi alguno no te queda cómodo, avisanos por acá y lo cambiamos.`;

  return (
    <div className="mt-3 rounded-2xl bg-gradient-to-br from-sky-50 to-violet-50 p-3 ring-1 ring-primary/15">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-violet-500 text-white">
            <CalendarPlus className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{yaDados.length ? "Turnos del tratamiento" : "Agendá el tratamiento"}</p>
            <p className="text-[11px] text-muted-foreground">
              {yaDados.length
                ? `${yaDados.length} ${yaDados.length === 1 ? "turno dado" : "turnos dados"} en la agenda`
                : `Te proponemos ${sesionesBase.length} ${sesionesBase.length === 1 ? "turno" : "turnos"} en los primeros huecos libres${p.profesional ? ` de ${p.profesional}` : ""}.`}
            </p>
          </div>
        </div>
        {!abierto && (
          <button type="button" className={yaDados.length ? BTN_SECUNDARIO : BTN_PRIMARIO} onClick={() => setAbierto(true)}>
            <CalendarPlus className="size-4" />
            {yaDados.length ? "Agendar más" : "Ver turnos propuestos"}
          </button>
        )}
      </div>

      {yaDados.length > 0 && !abierto && (
        <>
          <ul className="mt-2.5 space-y-1">
            {yaDados.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/80 px-3 py-1.5 text-xs ring-1 ring-primary/10">
                <span className="min-w-0 truncate">
                  <b>{diaCorto(t.fecha)} · {t.hora}</b> · {t.tratamiento}
                </span>
                <Pill clase={t.estado === "Atendida" ? "bg-emerald-100 text-emerald-700" : t.estado === "Confirmada" ? "bg-sky-100 text-sky-700" : "bg-muted text-muted-foreground"}>{t.estado}</Pill>
              </li>
            ))}
          </ul>
          {f.pac?.telefono && (
            <a href={wa(f.pac.telefono, textoTurnos)} target="_blank" rel="noreferrer" className="btn-wa mt-2.5 inline-flex">
              <MessageCircle className="size-4" /> Mandarle los turnos por WhatsApp
            </a>
          )}
        </>
      )}

      {abierto && (
        <div className="mt-3 space-y-2.5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Desde</span>
              <input type="date" value={desde} min={hoyISO()} onChange={(e) => { setDesde(e.target.value); setCambios({}); }} className={INPUT} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Cada cuántos días</span>
              <input type="number" min={1} max={90} value={cada} onChange={(e) => { setCada(e.target.value); setCambios({}); }} className={INPUT} />
            </label>
            <div className="col-span-2 sm:col-span-1">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Prefiere</span>
              <div className="flex gap-1 rounded-full bg-white/80 p-1 ring-1 ring-primary/10">
                {([["", "Cualquiera"], ["manana", "Mañana"], ["tarde", "Tarde"]] as const).map(([v, l]) => (
                  <button key={v} type="button" className={`${CHIP(franja === v)} flex-1`} onClick={() => { setFranja(v); setCambios({}); }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <ul className="space-y-1.5">
            {filas.map((x, i) => {
              const idx = sesionesBase.indexOf(sesiones[i]!);
              return (
                <li key={idx} className={`rounded-xl bg-white/90 px-3 py-2 ring-1 ${!x.fecha ? "ring-amber-300" : "ring-primary/10"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-xs font-semibold">
                      {i + 1}. {x.tratamiento}
                    </p>
                    <button type="button" aria-label="Quitar este turno" className="text-muted-foreground hover:text-rose-600" onClick={() => { setQuitadas((q) => new Set(q).add(idx)); setCambios({}); }}>
                      <X className="size-3.5" />
                    </button>
                  </div>
                  {x.fecha ? (
                    <div className="mt-1.5 grid grid-cols-[1fr_6.5rem] gap-1.5">
                      <input type="date" value={x.fecha} min={hoyISO()} aria-label="Día" onChange={(e) => setCambios((c) => ({ ...c, [i]: { ...c[i], fecha: e.target.value } }))} className={INPUT} />
                      <input type="time" value={x.hora} step={intervalo * 60} aria-label="Hora" onChange={(e) => setCambios((c) => ({ ...c, [i]: { ...c[i], hora: e.target.value } }))} className={INPUT} />
                      <p className="col-span-2 text-[10px] text-muted-foreground">{diaCorto(x.fecha)} · {x.odontologo} · {x.duracion} min</p>
                    </div>
                  ) : (
                    <p className="mt-1 text-[11px] text-amber-800">
                      No hay hueco en los próximos 60 días{p.profesional ? ` para ${p.profesional}` : ""}. Revisá sus horarios en Equipo o elegí otra fecha de inicio.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          {!filas.length && <p className="text-xs text-muted-foreground">Quitaste todos los turnos.</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className={BTN_SECUNDARIO} onClick={() => { setAbierto(false); setCambios({}); setQuitadas(new Set()); }}>
              Cancelar
            </button>
            <button type="button" className={BTN_PRIMARIO} disabled={sinHueco || !filas.length} onClick={agendar}>
              <Check className="size-4" />
              Agendar {filas.length} {filas.length === 1 ? "turno" : "turnos"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────── Seña y saldo del presupuesto (conectado con Pagos) ───────────── */

function PagosPresupuesto({ ctx, f }: { ctx: Ctx; f: Fila }) {
  const registros = useTodosLosRegistros();
  const { planes, config } = storePresupuestos.usar();
  const { config: cfgPortal } = storePortal.usar();
  const { cambiar } = useRegistrosPacientes();
  const p = f.p;
  const tot = totalesPresupuesto(p, planes);
  const pagos = (registros[f.pid]?.cuenta ?? []).filter((m) => m.tipo === "Pago" && m.presupuestoId === p.id);
  const pagado = pagadoDe(registros[f.pid]?.cuenta, p.id);
  const falta = Math.max(0, tot.final - pagado);
  const senaPct = Math.max(0, Math.min(100, config.senaPct ?? 0));
  const sena = Math.round((tot.final * senaPct) / 100);
  const faltaSena = Math.max(0, sena - pagado);
  const [abierto, setAbierto] = useState(false);
  const [monto, setMonto] = useState("");
  const [medio, setMedio] = useState<MedioPago>("Efectivo");
  const [nota, setNota] = useState("");
  const [error, setError] = useState("");
  const dp = cfgPortal.datosPago;
  const datos = dp
    ? [dp.alias && `Alias: ${dp.alias}`, dp.cuenta && `Cuenta: ${dp.cuenta}`, dp.titular && `Titular: ${dp.titular}`, dp.banco && `Banco: ${dp.banco}`, dp.link && `Pagá online: ${dp.link}`, dp.instrucciones]
        .filter(Boolean)
        .join("\n")
    : "";
  const pedir = faltaSena > 0 ? faltaSena : falta;
  const textoPedido = `Hola ${f.pac?.nombre ?? ""} 👋 ${faltaSena > 0 ? `Para reservar los turnos de tu tratamiento, la seña es de ${ars(faltaSena)}` : `Te queda un saldo de ${ars(falta)} del presupuesto ${p.numero}`}.${datos ? `\n\n${datos}` : ""}\n\nCuando lo hagas, mandanos el comprobante por acá. ¡Gracias!`;

  const registrar = () => {
    const n = Math.round(Number(monto.replace(",", ".")) * 100) / 100;
    if (!n || n <= 0) return setError("Escribí el monto que pagó.");
    const fecha = hoyISO();
    cambiar(f.pid, "cuenta", (prev) => [
      ...prev,
      { id: Date.now(), fecha, tipo: "Pago", concepto: `Pago presupuesto ${p.numero}${pagado + n >= tot.final ? " (saldado)" : pagado === 0 && sena > 0 ? " (seña)" : ""}`, medio, monto: n, notas: nota.trim(), presupuestoId: p.id },
    ]);
    // Si la caja de la sede está abierta, el cobro entra también en la caja del día
    const { sesiones } = storeFacturacion.leer();
    const abiertas = sesiones.filter((s) => !s.cerrada);
    const caja = abiertas.find((s) => s.sucursal === f.pac?.sucursal) ?? (abiertas.length === 1 ? abiertas[0] : undefined);
    if (caja && medio !== "Obra social")
      setFacturacion("movimientos", (prev) => [
        ...prev,
        { id: `m-${Date.now()}`, sesionId: caja.id, fecha: new Date().toISOString(), tipo: "Ingreso", concepto: `Presupuesto ${p.numero} · ${nombrePac(f.pac)}`, medio, monto: n, comprobanteId: "" },
      ]);
    cambiar(f.pid, "presupuestos", (prev) =>
      prev.map((x) =>
        x.id === p.id
          ? { ...x, seguimientos: [...(x.seguimientos ?? []), { fecha: new Date().toISOString(), texto: `Pago de ${ars(n)} (${medio})`, autor: ctx.usuario }] }
          : x,
      ),
    );
    setAbierto(false);
    setMonto("");
    setNota("");
    setError("");
    ctx.onToast(`Pago de ${ars(n)} registrado${caja ? " y sumado a la caja" : ""}`);
  };

  return (
    <div className="mt-3 rounded-2xl bg-gradient-to-br from-emerald-50 to-sky-50 p-3 ring-1 ring-emerald-200/70">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Seña y pagos</p>
          <p className="text-[11px] text-muted-foreground">
            {falta === 0
              ? "Está todo pagado."
              : faltaSena > 0
                ? `Falta la seña de ${ars(faltaSena)} (${senaPct}%) para reservar los turnos.`
                : senaPct > 0
                  ? `Seña pagada. Falta ${ars(falta)} del tratamiento.`
                  : `Falta cobrar ${ars(falta)}.`}
          </p>
        </div>
        {falta > 0 && !abierto && (
          <div className="flex flex-wrap gap-1.5">
            {f.pac?.telefono && (
              <a href={wa(f.pac.telefono, textoPedido)} target="_blank" rel="noreferrer" className={BTN_SECUNDARIO}>
                <MessageCircle className="size-4" />
                {faltaSena > 0 ? "Pedir la seña" : "Pedir el saldo"}
              </a>
            )}
            <button
              type="button"
              className={BTN_PRIMARIO}
              onClick={() => {
                setMonto(String(pedir));
                setAbierto(true);
              }}
            >
              <Plus className="size-4" />
              Registrar pago
            </button>
          </div>
        )}
      </div>
      <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-center">
        {[
          ["Total", ars(tot.final), "text-foreground"],
          ["Pagado", ars(pagado), "text-emerald-600"],
          ["Falta", ars(falta), falta ? "text-rose-600" : "text-emerald-600"],
        ].map(([l, v, c]) => (
          <div key={l} className="rounded-xl bg-white/80 px-2 py-1.5 ring-1 ring-black/5">
            <p className="text-[10px] text-muted-foreground">{l}</p>
            <p className={`text-sm font-bold tabular-nums ${c}`}>{v}</p>
          </div>
        ))}
      </div>
      <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-white ring-1 ring-black/5">
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600" style={{ width: `${tot.final ? Math.min(100, (pagado / tot.final) * 100) : 0}%` }} />
        {senaPct > 0 && senaPct < 100 && <span className="absolute inset-y-0 w-0.5 bg-amber-500" style={{ left: `${senaPct}%` }} title={`Seña ${senaPct}%`} />}
      </div>
      {pagos.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
          {pagos.map((m) => (
            <li key={m.id} className="flex justify-between gap-2">
              <span className="truncate">
                {fecha(m.fecha)} · {m.medio}
                {m.notas ? ` · ${m.notas}` : ""}
              </span>
              <b className="shrink-0 text-foreground">{ars(m.monto)}</b>
            </li>
          ))}
        </ul>
      )}
      {abierto && (
        <div className="mt-3 space-y-2 rounded-xl bg-white/90 p-2.5 ring-1 ring-primary/10">
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Monto</span>
              <input inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} className={INPUT} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Medio</span>
              <select value={medio} onChange={(e) => setMedio(e.target.value as MedioPago)} className={INPUT}>
                {MEDIOS_PAGO.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-1">
            {sena > 0 && faltaSena > 0 && (
              <button type="button" className={CHIP(Number(monto) === faltaSena)} onClick={() => setMonto(String(faltaSena))}>
                Seña {ars(faltaSena)}
              </button>
            )}
            <button type="button" className={CHIP(Number(monto) === falta)} onClick={() => setMonto(String(falta))}>
              Todo {ars(falta)}
            </button>
            {tot.cuotas > 1 && (
              <button type="button" className={CHIP(Number(monto) === Math.min(falta, tot.cuota))} onClick={() => setMonto(String(Math.min(falta, tot.cuota)))}>
                1 cuota {ars(Math.min(falta, tot.cuota))}
              </button>
            )}
          </div>
          <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={120} placeholder="Nota (opcional): n.º de operación, quién pagó…" className={INPUT} />
          {error && <p className="text-xs text-rose-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className={BTN_SECUNDARIO} onClick={() => setAbierto(false)}>
              Cancelar
            </button>
            <button type="button" className={BTN_PRIMARIO} onClick={registrar}>
              <Check className="size-4" />
              Registrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
