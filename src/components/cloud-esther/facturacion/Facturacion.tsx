import { telefonoInternacional } from "@/lib/clinica/whatsapp";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AlarmClock,
  ArrowDownLeft,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  Ban,
  BarChart3,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Copy,
  Crown,
  Download,
  FileSpreadsheet,
  FileText,
  Landmark,
  Link2,
  Lock,
  LockOpen,
  Mail,
  MessageCircle,
  Plus,
  Printer,
  Receipt,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Stethoscope,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  CONDICIONES_IVA,
  MEDIOS_PAGO,
  PAISES_FISCALES,
  codigoAutorizacion,
  deudaDe,
  diaISO,
  estadoComprobante,
  numeroComprobante,
  pagado,
  paisFiscal,
  saldo,
  setFacturacion,
  mesISO,
  siguienteNumero,
  storeFacturacion,
  tipoSugerido,
  totalesComprobante,
  type Comprobante,
  type CondicionIva,
  type ConfigFiscal,
  type EstadoComprobante,
  type ItemFactura,
  type LiquidacionOS,
  type MedioPago,
  type Prestacion,
} from "@/lib/cloud-esther/facturacion-store";
import {
  useRegistrosPacientes,
  useTodosLosRegistros,
} from "@/components/cloud-esther/PacienteSecciones";
import { usePacientes, type Paciente } from "@/lib/cloud-esther/pacientes";
import { DocPaciente } from "@/components/cloud-esther/EtiquetaPais";
import { useEquipo } from "@/lib/cloud-esther/equipo-store";
import { useSesion } from "@/lib/cloud-esther/auth-store";
import { useClinicaReal } from "@/lib/clinica/modo-clinica";
import { MODULES, availableIn, planLevel, useCloudEsther } from "@/lib/cloud-esther/data";
import { storeN8n } from "@/lib/cloud-esther/n8n-store";
import { SUCURSALES, storeAgenda, type Turno } from "@/lib/cloud-esther/agenda-store";
import { storePresupuestos } from "@/lib/cloud-esther/presupuestos-store";
import { CoberturasNomenclador } from "@/components/cloud-esther/coberturas/Coberturas";
import { formatoMoneda } from "@/lib/cloud-esther/nomina-paises";
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
  fecha,
  fechaHora,
  imprimirHTML,
} from "@/components/cloud-esther/rrhh/ui";
import { descargarExcel } from "@/components/cloud-esther/rrhh/excel";
import {
  MiPlan,
  facturaPendiente,
  useSuscripcion,
} from "@/components/cloud-esther/facturacion/MiPlan";
import { IconoWhatsApp } from "@/components/cloud-esther/IconoWhatsApp";
import { abrirWhatsAppConEnlacePago } from "@/lib/clinica/enlace-estudio";
import { setPortal, storePortal } from "@/lib/cloud-esther/portal-store";
import { setNotificaciones } from "@/lib/cloud-esther/notificaciones-store";
import { useClinicSettings } from "@/lib/cloud-esther/settings-store";
import { pdfBlobDeHtml, descargarBlob } from "@/lib/descargas";
import { Seleccion } from "@/components/ui/seleccion";

/* Ubicación: src/components/cloud-esther/facturacion/Facturacion.tsx
   Facturación electrónica según el país fiscal de la clínica, cobros (se registran en la cuenta
   corriente del paciente y en la caja), cuentas por cobrar, caja diaria, obras sociales y reportes. */

function M(props: Parameters<typeof ModalBase>[0]) {
  return <ModalBase {...props} modulo="Facturación" />;
}

type Seccion =
  | "hoy"
  | "resumen"
  | "comprobantes"
  | "facturar"
  | "cobranzas"
  | "caja"
  | "obras"
  | "reportes"
  | "config"
  | "plan";
type Ctx = {
  onToast: (m: string) => void;
  usuario: string;
  $: (n: number) => string;
  abrir: (id: string) => void;
  nuevo: (base?: BaseComprobante) => void;
  ir: (s: Seccion) => void;
  nivel: number;
};
type BaseComprobante = {
  pacienteId?: number;
  items?: ItemFactura[];
  origen?: string;
  cargo?: string;
  profesional?: string;
  cliente?: Comprobante["cliente"];
};

const ESTILO: Record<EstadoComprobante, string> = {
  Emitida: "bg-violet-100 text-violet-700",
  Parcial: "bg-sky-100 text-sky-700",
  Pagada: "bg-emerald-100 text-emerald-700",
  Vencida: "bg-rose-100 text-rose-700",
  Anulada: "bg-muted text-muted-foreground line-through",
};
const nombrePac = (p: Paciente | undefined) => (p ? `${p.nombre} ${p.apellido}` : "");
function wa(tel: string, texto: string) {
  return `https://wa.me/${telefonoInternacional(tel)}?text=${encodeURIComponent(texto)}`;
}
function mismoMes(iso: string, n = 0) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - n);
  return iso.startsWith(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
}

/* ───────────── Acciones ───────────── */

function useAccionesFact(ctx: Ctx) {
  const { cambiar } = useRegistrosPacientes();
  const est = storeFacturacion.usar();
  const cajaAbierta = (sucursal: string) =>
    est.sesiones.find((s) => s.sucursal === sucursal && !s.cerrada);
  return {
    cobrar(c: Comprobante, monto: number, medio: MedioPago, referencia: string) {
      const p = {
        id: `p-${Date.now()}`,
        fecha: diaISO(),
        monto,
        medio,
        referencia,
        usuario: ctx.usuario,
      };
      setFacturacion("comprobantes", (prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, pagos: [...x.pagos, p] } : x)),
      );
      if (c.pacienteId)
        cambiar(c.pacienteId, "cuenta", (prev) => [
          ...prev,
          {
            id: Date.now(),
            fecha: diaISO(),
            tipo: "Pago",
            concepto: `Cobro ${c.tipo} ${numeroComprobante(c)}`,
            medio,
            monto,
            notas: referencia,
          },
        ]);
      const caja = cajaAbierta(c.sucursal);
      if (caja && medio !== "Obra social")
        setFacturacion("movimientos", (prev) => [
          ...prev,
          {
            id: `m-${Date.now()}`,
            sesionId: caja.id,
            fecha: new Date().toISOString(),
            tipo: "Ingreso",
            concepto: `${c.tipo} ${numeroComprobante(c)} · ${c.cliente.nombre}`,
            medio,
            monto,
            comprobanteId: c.id,
          },
        ]);
      return !!caja;
    },
    anular(c: Comprobante, motivo: string) {
      const cfg = storeFacturacion.leer().config;
      const nc: Comprobante = {
        ...c,
        id: `c-${Date.now()}`,
        clase: "Nota de crédito",
        tipo: `Nota de crédito ${c.tipo.split(" ").at(-1)}`,
        numero: siguienteNumero(
          storeFacturacion.leer().comprobantes,
          "Nota de crédito",
          cfg.puntoVenta,
        ),
        puntoVenta: cfg.puntoVenta,
        fecha: diaISO(),
        vencimiento: diaISO(),
        items: [
          {
            descripcion: `Anula ${c.tipo} ${numeroComprobante(c)} (${motivo})`,
            cantidad: 1,
            precio: totalesComprobante(c).total,
            ivaPct: 0,
          },
        ],
        descuentoPct: 0,
        cae: codigoAutorizacion(cfg.pais),
        caeVto: diaISO(10),
        pagos: [],
        anulada: false,
        asociadaA: c.id,
        linkPago: "",
      };
      setFacturacion("comprobantes", (prev) => [
        ...prev.map((x) => (x.id === c.id ? { ...x, anulada: true } : x)),
        nc,
      ]);
      if (c.pacienteId)
        cambiar(c.pacienteId, "cuenta", (prev) => [
          ...prev,
          {
            id: Date.now(),
            fecha: diaISO(),
            tipo: "Nota de crédito",
            concepto: `${nc.tipo} ${numeroComprobante(nc)}`,
            medio: "—",
            monto: totalesComprobante(c).total - pagado(c),
            notas: motivo,
          },
        ]);
      return nc;
    },
    linkPago(c: Comprobante) {
      const link = `https://mpago.la/${Math.random().toString(36).slice(2, 9)}`;
      setFacturacion("comprobantes", (prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, linkPago: link } : x)),
      );
      return link;
    },
  };
}

function imprimirComprobante(c: Comprobante, cfg: ConfigFiscal) {
  const pf = paisFiscal(cfg.pais);
  const t = totalesComprobante(c);
  const $ = (n: number) => formatoMoneda(n, pf.moneda);
  const letra = c.tipo.split(" ").at(-1) ?? "";
  // Código visual tipo QR (simulado) generado a partir del código de autorización.
  let semilla = 0;
  for (const ch of c.cae) semilla = (semilla * 31 + ch.charCodeAt(0)) % 2147483647;
  const celdas = Array.from({ length: 21 * 21 }, (_, i) => {
    semilla = (semilla * 48271) % 2147483647;
    const x = i % 21,
      y = Math.floor(i / 21);
    const marco = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
    const lleno = marco
      ? x % 6 === 0 ||
        y % 6 === 0 ||
        (x > 1 && x < 5 && y > 1 && y < 5) ||
        (x > 15 && x < 19 && y > 1 && y < 5) ||
        (x > 1 && x < 5 && y > 15 && y < 19) ||
        x === 20 ||
        y === 20
      : semilla % 2 === 0;
    return lleno ? `<rect x="${x}" y="${y}" width="1" height="1"/>` : "";
  }).join("");
  imprimirHTML(
    `${c.tipo} ${numeroComprobante(c)}`,
    `<div style="display:flex;justify-content:space-between;align-items:flex-start;border:1px solid #e9e3fb;border-radius:12px;padding:14px"><div><h1>${cfg.razonSocial}</h1><p>${cfg.domicilio}<br>${pf.idFiscal} ${cfg.idFiscal} · ${cfg.condicion}<br>Inicio de actividades ${fecha(cfg.inicioActividades)}</p></div>
<div style="text-align:center;border:2px solid #6d28d9;border-radius:10px;padding:6px 14px"><div style="font-size:30px;font-weight:800;color:#6d28d9">${letra.length <= 2 ? letra : ""}</div><div style="font-size:10px">${pf.ente}</div></div>
<div style="text-align:right"><b>${c.tipo}</b><br>N.º ${numeroComprobante(c)}<br>Fecha ${fecha(c.fecha)}<br>Vence ${fecha(c.vencimiento)}</div></div>
<div class="meta"><div><b>${c.cliente.nombre}</b><br>${c.cliente.documento ? `Doc. ${c.cliente.documento}` : ""} · ${c.cliente.condicion}</div><div>${c.profesional ? `Profesional: ${c.profesional}<br>` : ""}Sucursal: ${c.sucursal}<br>${c.origen !== "Manual" ? `Origen: ${c.origen}` : ""}</div></div>
<table style="margin-top:16px"><thead><tr><th>Descripción</th><th class="r">Cant.</th><th class="r">Precio</th><th class="r">IVA</th><th class="r">Subtotal</th></tr></thead><tbody>
${c.items.map((i) => `<tr><td>${i.descripcion}</td><td class="r">${i.cantidad}</td><td class="r">${$(i.precio)}</td><td class="r">${i.ivaPct}%</td><td class="r">${$(i.cantidad * i.precio)}</td></tr>`).join("")}
${t.descuento ? `<tr><td colspan="4" class="r">Descuento ${c.descuentoPct}%</td><td class="r">−${$(t.descuento)}</td></tr>` : ""}
<tr><td colspan="4" class="r">Neto gravado / exento</td><td class="r">${$(t.neto)}</td></tr><tr><td colspan="4" class="r">IVA</td><td class="r">${$(t.iva)}</td></tr>
<tr class="tot"><td colspan="4">Total</td><td class="r">${$(t.total)}</td></tr></tbody></table>
<div style="display:flex;gap:18px;align-items:center;margin-top:18px"><svg viewBox="0 0 21 21" width="96" height="96" shape-rendering="crispEdges" fill="#1f1b2e">${celdas}</svg>
<div><b>${pf.codigoAutorizacion}:</b> ${c.cae}<br><b>Vto. ${pf.codigoAutorizacion}:</b> ${fecha(c.caeVto)}<br><small>Comprobante autorizado por ${pf.ente}${cfg.conectado ? "" : " (modo de prueba)"}</small><br><small>${cfg.leyenda}</small></div></div>
${c.anulada ? `<p style="color:#be123c;font-weight:700">ANULADA</p>` : ""}`,
  );
}

/* ───────────── Página ───────────── */

export function Facturacion() {
  const { usuario: u } = useSesion();
  const { plan } = useCloudEsther();
  const est = storeFacturacion.usar();
  const registros = useTodosLosRegistros();
  const [montado, setMontado] = useState(false);
  const [seccion, setSeccion] = useState<Seccion>("hoy");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState<BaseComprobante | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  useEffect(() => setMontado(true), []);
  const pf = paisFiscal(est.config.pais);
  const nivel = planLevel(plan);
  const onToast = (m: string) => {
    setToast(m);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 3000);
  };
  const ctx: Ctx = {
    onToast,
    usuario: u?.nombre ?? "Recepción",
    $: (n) => formatoMoneda(n, pf.moneda),
    abrir: setAbierto,
    nuevo: (b) => setNuevo(b ?? {}),
    ir: setSeccion,
    nivel,
  };

  const facturas = est.comprobantes.filter((c) => c.clase === "Factura" && !c.anulada);
  const delMes = facturas.filter((c) => mismoMes(c.fecha));
  const cobradoMes = est.comprobantes
    .flatMap((c) => c.pagos)
    .filter((p) => mismoMes(p.fecha))
    .reduce((a, p) => a + p.monto, 0);
  const porCobrar = facturas.reduce((a, c) => a + saldo(c), 0);
  const vencido = facturas
    .filter((c) => estadoComprobante(c) === "Vencida")
    .reduce((a, c) => a + saldo(c), 0);
  const pendientes = cargosPendientes(registros, est.cargosFacturados);
  const suscPendiente = facturaPendiente(useSuscripcion(), plan);

  const SECCIONES: {
    id: Seccion;
    label: string;
    icon: LucideIcon;
    badge?: number;
    min?: number;
  }[] = [
    { id: "hoy", label: "Cobrar hoy", icon: Banknote },
    { id: "resumen", label: "Resumen", icon: BarChart3 },
    { id: "comprobantes", label: "Comprobantes", icon: FileText },
    { id: "facturar", label: "Por facturar", icon: Receipt, badge: pendientes.length },
    {
      id: "cobranzas",
      label: "Cobranzas",
      icon: Wallet,
      badge: facturas.filter((c) => estadoComprobante(c) === "Vencida").length,
    },
    { id: "caja", label: "Caja", icon: Landmark, min: 2 },
    { id: "obras", label: "Obras sociales", icon: Stethoscope, min: 2 },
    { id: "reportes", label: "Reportes", icon: BarChart3 },
    { id: "config", label: "Datos fiscales", icon: Settings2 },
    { id: "plan", label: "Mi plan", icon: Crown, badge: suscPendiente ? 1 : 0 },
  ];
  const visibles = SECCIONES.filter((s) => !s.min || nivel >= s.min);

  const kpis = [
    {
      l: "Facturado del mes",
      v: ctx.$(delMes.reduce((a, c) => a + totalesComprobante(c).total, 0)),
      s1: `${delMes.length} comprobantes`,
      s2: "emitidos",
      i: FileText,
    },
    {
      l: "Cobrado del mes",
      v: ctx.$(cobradoMes),
      s1: `${est.comprobantes.flatMap((c) => c.pagos).filter((p) => mismoMes(p.fecha)).length} cobros`,
      s2: "registrados",
      i: CheckCircle2,
    },
    { l: "Por cobrar", v: ctx.$(porCobrar), s1: ctx.$(vencido), s2: "vencido", i: AlarmClock },
    {
      l: "Por facturar",
      v: ctx.$(pendientes.reduce((a, p) => a + p.monto, 0)),
      s1: `${pendientes.length} cargos`,
      s2: "de cuentas corrientes",
      i: Receipt,
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
                    <Receipt className="size-3.5" />
                    Administración
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold ${est.config.conectado ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}
                  >
                    {est.config.conectado ? (
                      <ShieldCheck className="size-3.5" />
                    ) : (
                      <AlarmClock className="size-3.5" />
                    )}
                    {pf.bandera} {pf.ente} {est.config.conectado ? "conectado" : "en modo prueba"}
                  </span>
                </div>
                <h1 className="mt-4 text-[34px] font-bold tracking-[-0.035em] md:text-[42px]">
                  Facturación
                </h1>
                <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-foreground md:text-sm">
                  Comprobantes electrónicos, cobros, cuentas por cobrar, caja diaria y obras
                  sociales. Cada cobro queda en la cuenta corriente del paciente.
                </p>
              </div>
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
                <button
                  type="button"
                  className={BTN_SECUNDARIO}
                  onClick={() => setSeccion("facturar")}
                >
                  <Receipt className="size-4" />
                  Por facturar
                </button>
                <button type="button" className={BTN_PRIMARIO} onClick={() => setNuevo({})}>
                  <Plus className="size-4" />
                  Nuevo comprobante
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
              aria-label="Secciones de facturación"
            >
              {visibles.map((s) => (
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

        {montado && suscPendiente && seccion !== "plan" && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-primary/[0.04] px-4 py-3">
            <span className="grid size-9 place-items-center rounded-xl bg-amber-100 text-amber-700">
              <Crown className="size-4" />
            </span>
            <p className="min-w-0 flex-1 text-sm">
              <b>Tu suscripción a Cloud Esther</b> vence el {fecha(suscPendiente.vence)} · factura{" "}
              <span className="font-semibold text-primary">{suscPendiente.numero}</span>
            </p>
            <button type="button" className={BTN_PRIMARIO} onClick={() => setSeccion("plan")}>
              <Wallet className="size-4" /> Pagar ahora
            </button>
          </div>
        )}

        <div className="mt-5">
          {!montado ? (
            <div className="card-grad h-[480px] animate-pulse" />
          ) : seccion === "hoy" ? (
            <CobroDelDia ctx={ctx} />
          ) : seccion === "resumen" ? (
            <Resumen ctx={ctx} />
          ) : seccion === "comprobantes" ? (
            <Comprobantes ctx={ctx} />
          ) : seccion === "facturar" ? (
            <PorFacturar ctx={ctx} />
          ) : seccion === "cobranzas" ? (
            <Cobranzas ctx={ctx} />
          ) : seccion === "caja" ? (
            <Caja ctx={ctx} />
          ) : seccion === "obras" ? (
            <ObrasSociales ctx={ctx} />
          ) : seccion === "reportes" ? (
            <Reportes ctx={ctx} />
          ) : seccion === "plan" ? (
            <MiPlan
              onToast={onToast}
              razonSocial={est.config.razonSocial}
              idFiscal={est.config.idFiscal}
            />
          ) : (
            <DatosFiscales ctx={ctx} />
          )}
        </div>
      </div>
      {abierto && <Detalle ctx={ctx} id={abierto} onClose={() => setAbierto(null)} />}
      {nuevo && (
        <M titulo="Nuevo comprobante" onClose={() => setNuevo(null)} ancho="max-w-4xl">
          <Emitir
            ctx={ctx}
            base={nuevo}
            onCancel={() => setNuevo(null)}
            onListo={(m, id) => {
              setNuevo(null);
              onToast(m);
              setAbierto(id);
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

/* ───────────── Cargos pendientes de facturar ───────────── */

type CargoPendiente = {
  key: string;
  pacienteId: number;
  fecha: string;
  concepto: string;
  monto: number;
  notas: string;
};
function cargosPendientes(
  registros: ReturnType<typeof useTodosLosRegistros>,
  facturados: string[],
): CargoPendiente[] {
  return Object.entries(registros).flatMap(([pid, r]) =>
    r.cuenta
      .filter((m) => m.tipo === "Cargo" && !facturados.includes(`${pid}:${m.id}`))
      .map((m) => ({
        key: `${pid}:${m.id}`,
        pacienteId: Number(pid),
        fecha: m.fecha,
        concepto: m.concepto,
        monto: m.monto,
        notas: m.notas,
      })),
  );
}

/* ───────────── Resumen ───────────── */

function FilaComp({ ctx, c, derecha }: { ctx: Ctx; c: Comprobante; derecha?: ReactNode }) {
  const e = estadoComprobante(c);
  return (
    <li className="flex items-center gap-3 rounded-xl bg-white/85 px-3 py-2 ring-1 ring-primary/10">
      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => ctx.abrir(c.id)}>
        <p className="truncate text-sm font-semibold">
          {c.cliente.nombre}{" "}
          <span className="font-normal text-muted-foreground">
            · {c.tipo} {numeroComprobante(c)}
          </span>
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {fecha(c.fecha)} · {c.items.map((i) => i.descripcion).join(", ")}
        </p>
      </button>
      <span className="shrink-0 text-right text-sm font-bold text-primary">
        {ctx.$(totalesComprobante(c).total)}
        {saldo(c) > 0 && e !== "Emitida" && (
          <span className="block text-[10px] font-medium text-rose-600">
            debe {ctx.$(saldo(c))}
          </span>
        )}
      </span>
      <Pill clase={ESTILO[e]}>{e}</Pill>
      {derecha}
    </li>
  );
}

function Resumen({ ctx }: { ctx: Ctx }) {
  const est = storeFacturacion.usar();
  const registros = useTodosLosRegistros();
  const ultimos = [...est.comprobantes]
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.numero - a.numero)
    .slice(0, 6);
  const vencidas = est.comprobantes.filter((c) => estadoComprobante(c) === "Vencida");
  const pendientes = cargosPendientes(registros, est.cargosFacturados);
  const sesion = est.sesiones.find((s) => !s.cerrada);
  const movs = est.movimientos.filter((m) => m.sesionId === sesion?.id);
  const osPend = est.liquidaciones.filter(
    (l) => l.estado === "Presentada" || l.estado === "Borrador",
  );
  const medios = Object.entries(
    est.comprobantes
      .flatMap((c) => c.pagos)
      .filter((p) => mismoMes(p.fecha))
      .reduce<Record<string, number>>(
        (a, p) => ({ ...a, [p.medio]: (a[p.medio] ?? 0) + p.monto }),
        {},
      ),
  ).sort((a, b) => b[1] - a[1]);
  const maxM = Math.max(1, ...medios.map(([, v]) => v));
  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.5fr_1fr]">
      <div className="space-y-3">
        <div className="card-grad p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Últimos comprobantes</p>
            <button
              type="button"
              className="text-[11px] font-semibold text-primary hover:underline"
              onClick={() => ctx.ir("comprobantes")}
            >
              Ver todos
            </button>
          </div>
          <ul className="mt-3 space-y-1.5">
            {ultimos.map((c) => (
              <FilaComp key={c.id} ctx={ctx} c={c} />
            ))}
          </ul>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="card-grad p-4">
            <p className="text-sm font-semibold">Cobrado este mes por medio</p>
            {medios.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">Sin cobros este mes.</p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {medios.map(([k, v]) => (
                  <li key={k}>
                    <div className="mb-1 flex flex-wrap justify-between gap-x-2 text-xs">
                      <span className="min-w-0">{k}</span>
                      <b className="whitespace-nowrap">{ctx.$(v)}</b>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-primary/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-fuchsia-500"
                        style={{ width: `${(v / maxM) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="card-grad p-4">
            <p className="text-sm font-semibold">Para facturar</p>
            <p className="mt-2 text-2xl font-bold text-primary">
              {ctx.$(pendientes.reduce((a, p) => a + p.monto, 0))}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {pendientes.length} cargos en cuentas corrientes (presupuestos aprobados,
              prestaciones)
            </p>
            <button
              type="button"
              className={`${BTN_PRIMARIO} mt-3`}
              onClick={() => ctx.ir("facturar")}
            >
              <Receipt className="size-4" />
              Facturar ahora
            </button>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <div className="card-grad p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <AlarmClock className="size-4 text-rose-600" /> Vencidas ({vencidas.length})
          </p>
          {vencidas.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">No hay facturas vencidas.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {vencidas.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => ctx.abrir(c.id)}
                    className="flex w-full items-center justify-between gap-2 rounded-xl bg-rose-50/70 px-3 py-2 text-left text-xs ring-1 ring-rose-200"
                  >
                    <span className="truncate">
                      <b>{c.cliente.nombre}</b> · vence {fecha(c.vencimiento)}
                    </span>
                    <b className="shrink-0 text-rose-700">{ctx.$(saldo(c))}</b>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {ctx.nivel >= 2 && (
          <div className="card-grad p-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Landmark className="size-4 text-primary" /> Caja de hoy
            </p>
            {sesion ? (
              <>
                <p className="mt-2 text-xs text-muted-foreground">
                  {sesion.sucursal} · abierta {fechaHora(sesion.abierta)} por {sesion.usuario}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-xl bg-emerald-50 py-2">
                    <p className="text-sm font-bold text-emerald-700">
                      {ctx.$(
                        movs.filter((m) => m.tipo === "Ingreso").reduce((a, m) => a + m.monto, 0),
                      )}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Ingresos</p>
                  </div>
                  <div className="rounded-xl bg-rose-50 py-2">
                    <p className="text-sm font-bold text-rose-700">
                      {ctx.$(
                        movs.filter((m) => m.tipo === "Egreso").reduce((a, m) => a + m.monto, 0),
                      )}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Egresos</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">No hay caja abierta.</p>
            )}
            <button
              type="button"
              className={`${BTN_SECUNDARIO} mt-3`}
              onClick={() => ctx.ir("caja")}
            >
              <Landmark className="size-4" /> Ir a caja
            </button>
          </div>
        )}
        {ctx.nivel >= 2 && (
          <div className="card-grad p-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Stethoscope className="size-4 text-primary" /> Obras sociales
            </p>
            <ul className="mt-2 space-y-1.5">
              {osPend.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-white/80 px-3 py-2 text-xs ring-1 ring-primary/10"
                >
                  <span className="truncate">
                    <b>{l.obraSocial}</b> · {l.periodo}
                  </span>
                  <Pill
                    clase={
                      l.estado === "Borrador"
                        ? "bg-muted text-muted-foreground"
                        : "bg-violet-100 text-violet-700"
                    }
                  >
                    {l.estado}
                  </Pill>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className={`${BTN_SECUNDARIO} mt-3`}
              onClick={() => ctx.ir("obras")}
            >
              <Stethoscope className="size-4" /> Liquidaciones
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────── Comprobantes ───────────── */

function Comprobantes({ ctx }: { ctx: Ctx }) {
  const { comprobantes } = storeFacturacion.usar();
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<"" | EstadoComprobante | "NC">("");
  const lista = [...comprobantes]
    .filter((c) =>
      estado === "NC"
        ? c.clase === "Nota de crédito"
        : !estado || (c.clase === "Factura" && estadoComprobante(c) === estado),
    )
    .filter(
      (c) =>
        !q ||
        normalizarBusqueda(
          `${c.cliente.nombre} ${c.cliente.documento} ${numeroComprobante(c)} ${c.items.map((i) => i.descripcion).join(" ")}`,
        ).includes(normalizarBusqueda(q)),
    )
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.numero - a.numero);
  return (
    <div className="space-y-3">
      <Encabezado
        icon={FileText}
        titulo="Comprobantes"
        descripcion="Facturas, notas de crédito y recibos emitidos."
      >
        <button type="button" className={BTN_PRIMARIO} onClick={() => ctx.nuevo()}>
          <Plus className="size-4" />
          Nuevo comprobante
        </button>
      </Encabezado>
      <div className="card-grad space-y-2.5 p-3">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary/60" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar cliente, documento, número o concepto"
            className={`${INPUT} pl-9`}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {(["", "Emitida", "Parcial", "Pagada", "Vencida", "Anulada", "NC"] as const).map((e) => (
            <button
              key={e || "t"}
              type="button"
              className={CHIP(estado === e)}
              onClick={() => setEstado(e)}
            >
              {e === "" ? "Todas" : e === "NC" ? "Notas de crédito" : e}
            </button>
          ))}
        </div>
        {lista.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No hay comprobantes con esos filtros.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {lista.map((c) => (
              <FilaComp key={c.id} ctx={ctx} c={c} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ───────────── Por facturar ───────────── */

function PorFacturar({ ctx }: { ctx: Ctx }) {
  const registros = useTodosLosRegistros();
  const { cargosFacturados } = storeFacturacion.usar();
  const { pacientes } = usePacientes();
  const lista = cargosPendientes(registros, cargosFacturados).sort((a, b) =>
    b.fecha.localeCompare(a.fecha),
  );
  return (
    <div className="space-y-3">
      <Encabezado
        icon={Receipt}
        titulo="Por facturar"
        descripcion="Cargos de las cuentas corrientes todavía sin comprobante: presupuestos aprobados, prestaciones y cobros del portal."
      />
      {lista.length === 0 ? (
        <Vacio
          icon={CheckCircle2}
          texto="Todo facturado. Los nuevos cargos aparecen acá automáticamente."
        />
      ) : (
        <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          {lista.map((c) => {
            const p = pacientes.find((x) => x.id === c.pacienteId);
            return (
              <li key={c.key} className="card-grad flex items-center gap-3 p-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Receipt className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{nombrePac(p) || "Paciente"}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {c.concepto} · {fecha(c.fecha)}
                    {c.notas ? ` · ${c.notas}` : ""}
                  </p>
                </div>
                <b className="shrink-0 text-primary">{ctx.$(c.monto)}</b>
                <button
                  type="button"
                  className={BTN_PRIMARIO}
                  onClick={() =>
                    ctx.nuevo({
                      pacienteId: c.pacienteId,
                      items: [{ descripcion: c.concepto, cantidad: 1, precio: c.monto, ivaPct: 0 }],
                      origen: c.concepto.replace(" aprobado", ""),
                      cargo: c.key,
                    })
                  }
                >
                  <FileText className="size-4" />
                  Facturar
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ───────────── Emitir ───────────── */

function Emitir({
  ctx,
  base,
  onCancel,
  onListo,
}: {
  ctx: Ctx;
  base: BaseComprobante;
  onCancel: () => void;
  onListo: (m: string, id: string) => void;
}) {
  const est = storeFacturacion.usar();
  const cfg = est.config;
  const pf = paisFiscal(cfg.pais);
  const { pacientes } = usePacientes();
  const { miembros } = useEquipo();
  const { aranceles } = storePresupuestos.usar();
  const acc = useAccionesFact(ctx);
  const odontologos = miembros
    .filter((m) => m.role === "odontologo" && m.status !== "inactivo")
    .map((m) => `${m.firstName} ${m.lastName}`);
  const [modo, setModo] = useState<"paciente" | "otro">(base.cliente ? "otro" : "paciente");
  const [pid, setPid] = useState<number | null>(base.pacienteId ?? null);
  const [qPac, setQPac] = useState("");
  const [cli, setCli] = useState<Comprobante["cliente"]>(
    base.cliente ?? {
      nombre: "",
      documento: "",
      condicion: "Consumidor Final",
      email: "",
      telefono: "",
    },
  );
  const pac = pacientes.find((x) => x.id === pid);
  const receptor: CondicionIva = modo === "paciente" ? "Consumidor Final" : cli.condicion;
  const [tipo, setTipo] = useState(tipoSugerido(cfg, receptor));
  useEffect(() => setTipo(tipoSugerido(cfg, receptor)), [receptor, cfg]);
  const [items, setItems] = useState<ItemFactura[]>(base.items ?? []);
  const [descuento, setDescuento] = useState("0");
  const [sucursal, setSucursal] = useState(SUCURSALES[0] ?? "Clínica Centro");
  const [profesional, setProfesional] = useState(base.profesional ?? odontologos[0] ?? "");
  const [vto, setVto] = useState(diaISO(cfg.vencimientoDias));
  const [cobrarYa, setCobrarYa] = useState(false);
  const [medio, setMedio] = useState<MedioPago>("Efectivo");
  const [qAr, setQAr] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const t = totalesComprobante({ items, descuentoPct: Number(descuento) || 0 });
  const candidatos = qPac
    ? pacientes
        .filter((x) =>
          normalizarBusqueda(`${x.nombre} ${x.apellido} ${x.documento}`).includes(
            normalizarBusqueda(qPac),
          ),
        )
        .slice(0, 6)
    : [];
  const sug = aranceles
    .filter(
      (a) => a.activo && (!qAr || normalizarBusqueda(a.nombre).includes(normalizarBusqueda(qAr))),
    )
    .slice(0, 6);
  const emitir = () => {
    setError("");
    const cliente =
      modo === "paciente"
        ? pac
          ? {
              nombre: nombrePac(pac),
              documento: pac.documento,
              condicion: "Consumidor Final" as CondicionIva,
              email: pac.email,
              telefono: pac.telefono,
            }
          : null
        : cli;
    if (!cliente || !cliente.nombre.trim())
      return setError(
        modo === "paciente" ? "Elegí el paciente." : "Completá el nombre del cliente.",
      );
    if (tipo === "Factura A" && !/^\d{2}-?\d{8}-?\d$/.test(cliente.documento.trim()))
      return setError("La Factura A necesita el CUIT del cliente.");
    if (
      !items.length ||
      items.some((i) => !i.descripcion.trim() || i.cantidad <= 0 || i.precio < 0)
    )
      return setError("Revisá los ítems: descripción, cantidad y precio.");
    setEnviando(true);
    window.setTimeout(() => {
      const actual = storeFacturacion.leer();
      const c: Comprobante = {
        id: `c-${Date.now()}`,
        tipo,
        clase: /recibo|receipt/i.test(tipo) ? "Recibo" : "Factura",
        puntoVenta: cfg.puntoVenta,
        numero: siguienteNumero(actual.comprobantes, "Factura", cfg.puntoVenta),
        fecha: diaISO(),
        vencimiento: vto,
        pacienteId: modo === "paciente" ? pid : null,
        cliente: { ...cliente, nombre: cliente.nombre.trim() },
        items,
        descuentoPct: Number(descuento) || 0,
        cae: codigoAutorizacion(cfg.pais),
        caeVto: diaISO(10),
        pagos: [],
        anulada: false,
        profesional,
        sucursal,
        origen: base.origen ?? "Manual",
        asociadaA: "",
        linkPago: "",
      };
      setFacturacion("comprobantes", (p) => [...p, c]);
      if (base.cargo) setFacturacion("cargosFacturados", (p) => [...p, base.cargo!]);
      let extra = "";
      if (cobrarYa) {
        const conCaja = acc.cobrar(c, totalesComprobante(c).total, medio, "Cobro al emitir");
        extra = conCaja ? " · cobrado y registrado en caja" : " · cobrado";
      }
      setEnviando(false);
      onListo(
        `${tipo} ${numeroComprobante(c)} autorizada por ${pf.ente} (${pf.codigoAutorizacion} ${c.cae.slice(0, 14)})${extra}`,
        c.id,
      );
    }, 900);
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        emitir();
      }}
      className="space-y-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-full bg-primary/[0.05] p-1">
          <button
            type="button"
            className={CHIP(modo === "paciente")}
            onClick={() => setModo("paciente")}
          >
            Paciente
          </button>
          <button type="button" className={CHIP(modo === "otro")} onClick={() => setModo("otro")}>
            Empresa u otro cliente
          </button>
        </div>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {pf.bandera} {pf.ente} · punto de venta {String(cfg.puntoVenta).padStart(4, "0")}
        </span>
      </div>
      {modo === "paciente" ? (
        <div>
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Paciente *
          </span>
          {pac ? (
            <div className="flex h-9 items-center justify-between rounded-xl bg-primary/[0.06] px-3 text-sm ring-1 ring-primary/15">
              <span className="truncate font-semibold">
                {nombrePac(pac)}{" "}
                <span className="font-normal text-muted-foreground">
                  · <DocPaciente documento={pac.documento} sinFormato /> · {pac.obraSocial}
                </span>
              </span>
              <button
                type="button"
                className="text-[11px] font-semibold text-primary"
                onClick={() => setPid(null)}
              >
                Cambiar
              </button>
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
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Field label="Razón social / nombre *">
            <input
              value={cli.nombre}
              onChange={(e) => setCli((p) => ({ ...p, nombre: e.target.value }))}
              className={INPUT}
            />
          </Field>
          <Field label={`${pf.idFiscal} / documento`}>
            <input
              value={cli.documento}
              onChange={(e) => setCli((p) => ({ ...p, documento: e.target.value }))}
              className={INPUT}
              placeholder="30-71234567-9"
            />
          </Field>
          <Field label="Condición frente al IVA">
            <Sel
              value={cli.condicion}
              onChange={(v) => setCli((p) => ({ ...p, condicion: v }))}
              opciones={CONDICIONES_IVA}
            />
          </Field>
          <Field label="Correo">
            <input
              value={cli.email}
              onChange={(e) => setCli((p) => ({ ...p, email: e.target.value }))}
              className={INPUT}
            />
          </Field>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Comprobante">
          <Sel
            value={tipo}
            onChange={setTipo}
            etiqueta="Tipo de comprobante"
            opciones={pf.comprobantes}
          />
        </Field>
        <Field label="Sucursal">
          <Sel value={sucursal} onChange={setSucursal} opciones={SUCURSALES} />
        </Field>
        <Field label="Profesional">
          <Sel
            value={profesional}
            onChange={setProfesional}
            opciones={["", ...odontologos].map((o) => ({
              value: o,
              label: o || "Sin profesional",
            }))}
          />
        </Field>
        <Field label="Vencimiento">
          <input
            type="date"
            value={vto}
            onChange={(e) => setVto(e.target.value)}
            className={INPUT}
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_260px]">
        <div className="space-y-2">
          <div className="overflow-hidden rounded-2xl ring-1 ring-primary/10">
            <table className="w-full text-xs">
              <thead className="bg-primary/[0.05] text-left text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                <tr>
                  <th className="p-2 font-semibold">Descripción</th>
                  <th className="w-16 p-2 font-semibold">Cant.</th>
                  <th className="w-28 p-2 font-semibold">Precio</th>
                  <th className="w-20 p-2 font-semibold">IVA</th>
                  <th className="w-24 p-2 text-right font-semibold">Subtotal</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-muted-foreground">
                      Agregá ítems desde los aranceles →
                    </td>
                  </tr>
                )}
                {items.map((it, i) => (
                  <tr key={i} className="border-t border-primary/10 bg-white/80">
                    <td className="p-1.5">
                      <input
                        value={it.descripcion}
                        onChange={(e) =>
                          setItems((p) =>
                            p.map((x, k) => (k === i ? { ...x, descripcion: e.target.value } : x)),
                          )
                        }
                        className={`${INPUT} h-8`}
                        aria-label="Descripción"
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        type="number"
                        min={1}
                        value={it.cantidad}
                        onChange={(e) =>
                          setItems((p) =>
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
                        value={it.precio}
                        onChange={(e) =>
                          setItems((p) =>
                            p.map((x, k) =>
                              k === i ? { ...x, precio: Number(e.target.value) } : x,
                            ),
                          )
                        }
                        className={`${INPUT} h-8`}
                        aria-label="Precio"
                      />
                    </td>
                    <td className="p-1.5">
                      <Seleccion
                        value={it.ivaPct}
                        onChange={(e) =>
                          setItems((p) =>
                            p.map((x, k) =>
                              k === i ? { ...x, ivaPct: Number(e.target.value) } : x,
                            ),
                          )
                        }
                        className={`${INPUT} h-8 px-2`}
                        aria-label="IVA"
                      >
                        {pf.tasas.map((t) => (
                          <option key={t} value={t}>
                            {t === 0 ? "Exento" : `${t}%`}
                          </option>
                        ))}
                      </Seleccion>
                    </td>
                    <td className="p-1.5 text-right font-semibold">
                      {ctx.$(it.cantidad * it.precio)}
                    </td>
                    <td className="p-1.5">
                      <button
                        type="button"
                        aria-label="Quitar ítem"
                        className={BTN_ICONO}
                        onClick={() => setItems((p) => p.filter((_, k) => k !== i))}
                      >
                        <X className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <button
              type="button"
              className={BTN_SECUNDARIO}
              onClick={() =>
                setItems((p) => [
                  ...p,
                  { descripcion: "", cantidad: 1, precio: 0, ivaPct: pf.tasaSalud },
                ])
              }
            >
              <Plus className="size-4" /> Ítem libre
            </button>
            <div className="w-40">
              <Field label="Descuento %">
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
          </div>
          <div className="rounded-2xl bg-primary/[0.04] p-3 ring-1 ring-primary/10">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={cobrarYa}
                onChange={(e) => setCobrarYa(e.target.checked)}
                className="size-4 accent-primary"
              />
              Cobrar ahora el total
            </label>
            {cobrarYa && (
              <div className="mt-2 w-56">
                <Sel
                  value={medio}
                  onChange={setMedio}
                  etiqueta="Medio de cobro"
                  opciones={MEDIOS_PAGO}
                />
              </div>
            )}
          </div>
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
              {sug.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setItems((p) => [
                        ...p,
                        {
                          descripcion: a.nombre,
                          cantidad: 1,
                          precio: a.precio,
                          ivaPct: pf.tasaSalud,
                        },
                      ])
                    }
                    className="flex w-full items-center justify-between gap-2 rounded-lg bg-white/85 px-2 py-1.5 text-left text-[11px] hover:bg-card"
                  >
                    <span className="truncate">{a.nombre}</span>
                    <b className="shrink-0 text-primary">{ctx.$(a.precio)}</b>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500 p-3 text-white">
            <div className="flex justify-between text-xs text-white/85">
              <span>Neto</span>
              <span>{ctx.$(t.neto)}</span>
            </div>
            <div className="flex justify-between text-xs text-white/85">
              <span>IVA</span>
              <span>{ctx.$(t.iva)}</span>
            </div>
            <div className="mt-1 flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{ctx.$(t.total)}</span>
            </div>
          </div>
        </div>
      </div>
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      {enviando ? (
        <p className="flex items-center justify-end gap-2 text-sm font-medium text-primary">
          <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />{" "}
          Solicitando {pf.codigoAutorizacion} a {pf.ente}…
        </p>
      ) : (
        <Acciones etiqueta="Emitir comprobante" onCancel={onCancel} icon={BadgeCheck} />
      )}
    </form>
  );
}

/* ───────────── Detalle ───────────── */

function Detalle({ ctx, id, onClose }: { ctx: Ctx; id: string; onClose: () => void }) {
  const est = storeFacturacion.usar();
  const acc = useAccionesFact(ctx);
  const { setActivoId } = usePacientes();
  const navigate = useNavigate();
  const [cobro, setCobro] = useState(false);
  const [anular, setAnular] = useState(false);
  const c = est.comprobantes.find((x) => x.id === id);
  if (!c) return null;
  const pf = paisFiscal(est.config.pais);
  const t = totalesComprobante(c);
  const e = estadoComprobante(c);
  const asociada = est.comprobantes.find((x) => x.id === c.asociadaA || x.asociadaA === c.id);
  const texto = `Hola ${c.cliente.nombre.split(" ")[0]}, te enviamos tu ${c.tipo} ${numeroComprobante(c)} por ${ctx.$(t.total)}.${saldo(c) > 0 ? ` Saldo pendiente: ${ctx.$(saldo(c))}.` : ""}${c.linkPago ? ` Podés pagar acá: ${c.linkPago}` : ""}`;
  return (
    <M titulo={`${c.tipo} ${numeroComprobante(c)}`} onClose={onClose} ancho="max-w-3xl">
      <div className="flex flex-wrap items-center gap-2">
        <Pill clase={ESTILO[e]}>{e}</Pill>
        <span className="text-[11px] text-muted-foreground">
          Emitida {fecha(c.fecha)} · vence {fecha(c.vencimiento)} · {c.sucursal}
          {c.profesional ? ` · ${c.profesional}` : ""}
          {c.origen !== "Manual" ? ` · ${c.origen}` : ""}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-white/85 p-3 ring-1 ring-primary/10 text-sm">
          <p className="font-semibold">{c.cliente.nombre}</p>
          <p className="text-[11px] text-muted-foreground">
            {c.cliente.documento ? `Doc. ${c.cliente.documento} · ` : ""}
            {c.cliente.condicion}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {[c.cliente.email, c.cliente.telefono].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="rounded-2xl bg-emerald-50/70 p-3 text-xs ring-1 ring-emerald-200">
          <p className="flex items-center gap-1.5 font-semibold text-emerald-800">
            <ShieldCheck className="size-3.5" /> Autorizado por {pf.ente}
          </p>
          <p className="mt-1 break-all font-mono text-[11px]">
            {pf.codigoAutorizacion}: {c.cae}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Vencimiento {pf.codigoAutorizacion}: {fecha(c.caeVto)}
          </p>
        </div>
      </div>
      <div className="mt-3 overflow-hidden rounded-2xl ring-1 ring-primary/10">
        <table className="w-full text-xs">
          <thead className="bg-primary/[0.05] text-left text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            <tr>
              <th className="p-2 font-semibold">Descripción</th>
              <th className="p-2 text-right font-semibold">Cant.</th>
              <th className="p-2 text-right font-semibold">Precio</th>
              <th className="p-2 text-right font-semibold">IVA</th>
              <th className="p-2 text-right font-semibold">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {c.items.map((i, k) => (
              <tr key={k} className="border-t border-primary/10 bg-white/80">
                <td className="p-2">{i.descripcion}</td>
                <td className="p-2 text-right">{i.cantidad}</td>
                <td className="p-2 text-right">{ctx.$(i.precio)}</td>
                <td className="p-2 text-right">{i.ivaPct ? `${i.ivaPct}%` : "Exento"}</td>
                <td className="p-2 text-right font-semibold">{ctx.$(i.cantidad * i.precio)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-white/85 p-3 ring-1 ring-primary/10">
          <p className="text-xs font-semibold">Cobros</p>
          {c.pagos.length === 0 ? (
            <p className="mt-1 text-[11px] text-muted-foreground">Sin cobros registrados.</p>
          ) : (
            <ul className="mt-1.5 space-y-1">
              {c.pagos.map((p) => (
                <li key={p.id} className="flex justify-between gap-2 text-[11px]">
                  <span>
                    {fecha(p.fecha)} · {p.medio}
                    {p.referencia ? ` · ${p.referencia}` : ""}
                  </span>
                  <b className="text-emerald-700">{ctx.$(p.monto)}</b>
                </li>
              ))}
            </ul>
          )}
          {c.linkPago && (
            <p className="mt-2 truncate text-[11px] text-primary">Link de pago: {c.linkPago}</p>
          )}
          {asociada && (
            <button
              type="button"
              className="mt-2 text-[11px] font-semibold text-primary hover:underline"
              onClick={() => ctx.abrir(asociada.id)}
            >
              Ver {asociada.tipo} {numeroComprobante(asociada)}
            </button>
          )}
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-primary/[0.08] to-fuchsia-500/[0.05] p-3 text-sm">
          {t.descuento > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Descuento {c.descuentoPct}%</span>
              <span>−{ctx.$(t.descuento)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Neto</span>
            <span>{ctx.$(t.neto)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">IVA</span>
            <span>{ctx.$(t.iva)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-primary/15 pt-1 text-base font-bold text-primary">
            <span>Total</span>
            <span>{ctx.$(t.total)}</span>
          </div>
          {c.clase === "Factura" && !c.anulada && (
            <div className="flex justify-between text-xs font-semibold">
              <span>Saldo</span>
              <span className={saldo(c) ? "text-rose-600" : "text-emerald-600"}>
                {ctx.$(saldo(c))}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-primary/10 pt-3">
        {saldo(c) > 0 && (
          <>
            <button type="button" className={BTN_PRIMARIO} onClick={() => setCobro(true)}>
              <Wallet className="size-4" /> Registrar cobro
            </button>
            <button
              type="button"
              className={BTN_SECUNDARIO}
              onClick={() => {
                const l = c.linkPago || acc.linkPago(c);
                void navigator.clipboard?.writeText(l).catch(() => {});
                ctx.onToast("Link de pago de Mercado Pago generado y copiado");
              }}
            >
              <Link2 className="size-4" /> Link de pago
            </button>
          </>
        )}
        {c.cliente.telefono && (
          <a
            href={wa(c.cliente.telefono, texto)}
            target="_blank"
            rel="noreferrer"
            className="btn-wa"
          >
            <IconoWhatsApp /> WhatsApp
          </a>
        )}
        {c.cliente.email && (
          <a
            href={`mailto:${c.cliente.email}?subject=${encodeURIComponent(`${c.tipo} ${numeroComprobante(c)}`)}&body=${encodeURIComponent(texto)}`}
            className={BTN_SECUNDARIO}
          >
            <Mail className="size-4" /> Correo
          </a>
        )}
        <button
          type="button"
          className={BTN_SECUNDARIO}
          onClick={() => imprimirComprobante(c, est.config)}
        >
          <Printer className="size-4" /> PDF
        </button>
        {c.pacienteId && (
          <button
            type="button"
            className={BTN_SECUNDARIO}
            onClick={() => {
              setActivoId(c.pacienteId!);
              void navigate({ to: "/demo/pacientes" });
            }}
          >
            <UserRound className="size-4" /> Ver ficha
          </button>
        )}
        {c.clase === "Factura" && !c.anulada && (
          <button
            type="button"
            className={`${BTN_SECUNDARIO} ml-auto`}
            onClick={() => setAnular(true)}
          >
            <Ban className="size-4" /> Anular con nota de crédito
          </button>
        )}
      </div>
      {cobro && (
        <M titulo={`Cobrar ${c.tipo} ${numeroComprobante(c)}`} onClose={() => setCobro(false)}>
          <CobroForm
            ctx={ctx}
            saldo={saldo(c)}
            onCancel={() => setCobro(false)}
            onCobrar={(monto, medio, ref) => {
              const conCaja = acc.cobrar(c, monto, medio, ref);
              setCobro(false);
              ctx.onToast(
                `Cobro de ${ctx.$(monto)} registrado en la cuenta del paciente${conCaja ? " y en la caja" : ""}`,
              );
            }}
          />
        </M>
      )}
      {anular && (
        <M titulo="Anular comprobante" onClose={() => setAnular(false)}>
          <AnularForm
            onCancel={() => setAnular(false)}
            onAnular={(m) => {
              const nc = acc.anular(c, m);
              setAnular(false);
              ctx.onToast(`${nc.tipo} ${numeroComprobante(nc)} emitida`);
              ctx.abrir(nc.id);
            }}
          />
        </M>
      )}
    </M>
  );
}

function CobroForm({
  ctx,
  saldo: s,
  onCancel,
  onCobrar,
}: {
  ctx: Ctx;
  saldo: number;
  onCancel: () => void;
  onCobrar: (m: number, medio: MedioPago, ref: string) => void;
}) {
  const [monto, setMonto] = useState(String(s));
  const [medio, setMedio] = useState<MedioPago>("Efectivo");
  const [ref, setRef] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const n = Number(monto);
        if (!(n > 0) || n > s) return setError(`El monto tiene que ser entre 1 y ${ctx.$(s)}.`);
        onCobrar(n, medio, ref.trim());
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Monto">
          <input
            type="number"
            min={1}
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className={INPUT}
            aria-label="Monto a cobrar"
          />
        </Field>
        <Field label="Medio">
          <Sel value={medio} onChange={setMedio} opciones={MEDIOS_PAGO} etiqueta="Medio de pago" />
        </Field>
        <Field label="Referencia">
          <input
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            className={INPUT}
            placeholder="Cuotas, n.º de operación…"
          />
        </Field>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Saldo actual: <b className="text-foreground">{ctx.$(s)}</b>. Si es parcial, la factura queda
        con saldo pendiente.
      </p>
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      <Acciones etiqueta="Registrar cobro" onCancel={onCancel} icon={Wallet} />
    </form>
  );
}

function AnularForm({
  onCancel,
  onAnular,
}: {
  onCancel: () => void;
  onAnular: (m: string) => void;
}) {
  const motivos = [
    "Error en los datos del cliente",
    "Error en el importe",
    "Prestación no realizada",
    "Devolución al paciente",
  ];
  const [m, setM] = useState(motivos[0]!);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onAnular(m);
      }}
      className="space-y-3"
    >
      <p className="text-sm text-muted-foreground">
        Las facturas electrónicas no se borran: se emite una nota de crédito por el total, que
        también se autoriza ante el ente fiscal.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {motivos.map((x) => (
          <button
            key={x}
            type="button"
            className={`${CHIP(m === x)} ring-1 ring-primary/15`}
            onClick={() => setM(x)}
          >
            {x}
          </button>
        ))}
      </div>
      <Acciones etiqueta="Emitir nota de crédito" onCancel={onCancel} icon={Ban} />
    </form>
  );
}

/* ───────────── Cobranzas ───────────── */

function Cobranzas({ ctx }: { ctx: Ctx }) {
  const { comprobantes } = storeFacturacion.usar();
  const deudas = comprobantes.filter((c) => saldo(c) > 0);
  const hoy = diaISO();
  const dias = (v: string) =>
    Math.round(
      (new Date(`${hoy}T12:00:00`).getTime() - new Date(`${v}T12:00:00`).getTime()) / 86_400_000,
    );
  const tramo = (c: Comprobante) => {
    const d = dias(c.vencimiento);
    return d <= 0
      ? "Al día"
      : d <= 30
        ? "1 a 30 días"
        : d <= 60
          ? "31 a 60 días"
          : "Más de 60 días";
  };
  const tramos = ["Al día", "1 a 30 días", "31 a 60 días", "Más de 60 días"] as const;
  const porCliente = Object.values(
    deudas.reduce<Record<string, { nombre: string; tel: string; lista: Comprobante[] }>>((a, c) => {
      const k = c.cliente.documento || c.cliente.nombre;
      (a[k] ??= { nombre: c.cliente.nombre, tel: c.cliente.telefono, lista: [] }).lista.push(c);
      return a;
    }, {}),
  ).sort(
    (a, b) => b.lista.reduce((s, c) => s + saldo(c), 0) - a.lista.reduce((s, c) => s + saldo(c), 0),
  );
  const recientes = comprobantes
    .flatMap((c) => c.pagos.map((p) => ({ c, p })))
    .sort((a, b) => b.p.fecha.localeCompare(a.p.fecha))
    .slice(0, 8);
  return (
    <div className="space-y-3">
      <Encabezado
        icon={Wallet}
        titulo="Cobranzas"
        descripcion="Saldos pendientes por antigüedad, recordatorios y cobros recientes."
      />
      <PacientesQueDeben ctx={ctx} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tramos.map((t, i) => (
          <Mini
            key={t}
            label={t}
            valor={ctx.$(deudas.filter((c) => tramo(c) === t).reduce((a, c) => a + saldo(c), 0))}
            icon={i === 0 ? CheckCircle2 : AlarmClock}
            tono={i === 0 ? "text-emerald-600" : i === 1 ? "text-amber-600" : "text-rose-600"}
            sub={`${deudas.filter((c) => tramo(c) === t).length} comprobantes`}
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.4fr_1fr]">
        <div className="card-grad p-4">
          <p className="text-sm font-semibold">Deudores</p>
          {porCliente.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">No hay saldos pendientes.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {porCliente.map((x) => {
                const total = x.lista.reduce((a, c) => a + saldo(c), 0);
                return (
                  <li key={x.nombre} className="rounded-2xl bg-white/85 p-3 ring-1 ring-primary/10">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm font-semibold">{x.nombre}</p>
                      <b className="text-rose-600">{ctx.$(total)}</b>
                      {x.tel && (
                        <a
                          href={wa(
                            x.tel,
                            `Hola ${x.nombre.split(" ")[0]}, te recordamos que tenés un saldo pendiente de ${ctx.$(total)} con la clínica. Podés abonarlo por transferencia o Mercado Pago. ¡Gracias!`,
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className={BTN_SECUNDARIO}
                          onClick={() => ctx.onToast(`Recordatorio enviado a ${x.nombre}`)}
                        >
                          <MessageCircle className="size-4" /> Recordar
                        </a>
                      )}
                    </div>
                    <ul className="mt-1.5 space-y-1">
                      {x.lista.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => ctx.abrir(c.id)}
                            className="flex w-full justify-between gap-2 text-left text-[11px] hover:text-primary"
                          >
                            <span>
                              {c.tipo} {numeroComprobante(c)} · vence {fecha(c.vencimiento)} ·{" "}
                              <b>{tramo(c)}</b>
                            </span>
                            <span className="shrink-0 font-semibold">{ctx.$(saldo(c))}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="card-grad h-fit p-4">
          <p className="text-sm font-semibold">Cobros recientes</p>
          <ul className="mt-2 space-y-1.5">
            {recientes.map(({ c, p }) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-white/80 px-3 py-2 text-xs ring-1 ring-primary/10"
              >
                <span className="min-w-0 truncate">
                  <b>{c.cliente.nombre}</b> · {p.medio} · {fecha(p.fecha)}
                </span>
                <b className="shrink-0 text-emerald-700">{ctx.$(p.monto)}</b>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Caja ───────────── */

function Caja({ ctx }: { ctx: Ctx }) {
  const { sesiones, movimientos } = storeFacturacion.usar();
  const [suc, setSuc] = useState(SUCURSALES[0] ?? "Clínica Centro");
  const [mov, setMov] = useState<"Ingreso" | "Egreso" | null>(null);
  const [cerrar, setCerrar] = useState(false);
  const abierta = sesiones.find((s) => s.sucursal === suc && !s.cerrada);
  // Para abrir: lo que quedó en la caja al último cierre (nada inventado)
  const ultimoCierre = sesiones
    .filter((s) => s.sucursal === suc && s.cerrada)
    .sort((a, b) => b.cerrada.localeCompare(a.cerrada))[0];
  const [inicial, setInicial] = useState("");
  const { miembros } = useEquipo();
  const [resumen, setResumen] = useState<string | null>(null);
  const movs = movimientos
    .filter((m) => m.sesionId === abierta?.id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const ef = (t: "Ingreso" | "Egreso") =>
    movs.filter((m) => m.tipo === t && m.medio === "Efectivo").reduce((a, m) => a + m.monto, 0);
  const esperado = (abierta?.inicial ?? 0) + ef("Ingreso") - ef("Egreso");
  const porMedio = Object.entries(
    movs
      .filter((m) => m.tipo === "Ingreso")
      .reduce<Record<string, number>>(
        (a, m) => ({ ...a, [m.medio]: (a[m.medio] ?? 0) + m.monto }),
        {},
      ),
  );
  const historial = sesiones
    .filter((s) => s.sucursal === suc && s.cerrada)
    .sort((a, b) => b.abierta.localeCompare(a.abierta))
    .slice(0, 6);
  return (
    <div className="space-y-3">
      <Encabezado
        icon={Landmark}
        titulo="Caja diaria"
        descripcion="Apertura, ingresos y egresos del día y arqueo al cierre. Los cobros en el mostrador entran solos."
      >
        <div className="w-52">
          <Sel value={suc} onChange={setSuc} opciones={SUCURSALES} etiqueta="Sucursal de la caja" />
        </div>
      </Encabezado>
      {!abierta ? (
        <div className="card-grad flex flex-wrap items-end gap-3 p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Lock className="size-6" />
            </span>
            <div>
              <p className="text-sm font-semibold">La caja de {suc} está cerrada</p>
              <p className="text-xs text-muted-foreground">
                Abrila con el efectivo inicial para registrar los cobros del día.
                {ultimoCierre ? ` Al último cierre quedaron ${ctx.$(ultimoCierre.contado)}.` : ""}
              </p>
            </div>
          </div>
          <div className="ml-auto w-44">
            <Field label="Efectivo inicial">
              <input
                type="number"
                min={0}
                value={inicial}
                placeholder={ultimoCierre ? String(ultimoCierre.contado) : "0"}
                onChange={(e) => setInicial(e.target.value)}
                className={INPUT}
                aria-label="Efectivo inicial"
              />
            </Field>
          </div>
          <button
            type="button"
            className={BTN_PRIMARIO}
            onClick={() => {
              setFacturacion("sesiones", (p) => [
                ...p,
                {
                  id: `s-${Date.now()}`,
                  sucursal: suc,
                  abierta: new Date().toISOString(),
                  inicial: inicial.trim() === "" ? (ultimoCierre?.contado ?? 0) : Number(inicial) || 0,
                  cerrada: "",
                  contado: 0,
                  usuario: ctx.usuario,
                },
              ]);
              ctx.onToast(`Caja de ${suc} abierta`);
            }}
          >
            <LockOpen className="size-4" /> Abrir caja
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Mini
              label="Efectivo inicial"
              valor={ctx.$(abierta.inicial)}
              icon={Wallet}
              sub={`Abierta ${fechaHora(abierta.abierta)}`}
            />
            <Mini
              label="Ingresos"
              valor={ctx.$(
                movs.filter((m) => m.tipo === "Ingreso").reduce((a, m) => a + m.monto, 0),
              )}
              icon={ArrowDownLeft}
              tono="text-emerald-600"
              sub={`${movs.filter((m) => m.tipo === "Ingreso").length} movimientos`}
            />
            <Mini
              label="Egresos"
              valor={ctx.$(
                movs.filter((m) => m.tipo === "Egreso").reduce((a, m) => a + m.monto, 0),
              )}
              icon={ArrowUpRight}
              tono="text-rose-600"
            />
            <Mini
              label="Efectivo esperado"
              valor={ctx.$(esperado)}
              icon={CircleDollarSign}
              tono="text-primary"
              sub="Para el arqueo"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.4fr_1fr]">
            <div className="card-grad p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">Movimientos de hoy</p>
                <div className="flex gap-2">
                  <button type="button" className={BTN_SECUNDARIO} onClick={() => setMov("Egreso")}>
                    <ArrowUpRight className="size-4" /> Egreso
                  </button>
                  <button
                    type="button"
                    className={BTN_SECUNDARIO}
                    onClick={() => setMov("Ingreso")}
                  >
                    <ArrowDownLeft className="size-4" /> Ingreso
                  </button>
                  <button type="button" className={BTN_PRIMARIO} onClick={() => setCerrar(true)}>
                    <Lock className="size-4" /> Cerrar caja
                  </button>
                </div>
              </div>
              {movs.length === 0 ? (
                <p className="mt-3 text-xs text-muted-foreground">Sin movimientos todavía.</p>
              ) : (
                <ul className="mt-3 space-y-1.5">
                  {movs.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center gap-3 rounded-xl bg-white/85 px-3 py-2 ring-1 ring-primary/10"
                    >
                      <span
                        className={`grid size-8 shrink-0 place-items-center rounded-full ${m.tipo === "Ingreso" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                      >
                        {m.tipo === "Ingreso" ? (
                          <ArrowDownLeft className="size-4" />
                        ) : (
                          <ArrowUpRight className="size-4" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold">{m.concepto}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {m.medio} · {fechaHora(m.fecha).slice(11)}
                        </p>
                      </div>
                      <b className={m.tipo === "Ingreso" ? "text-emerald-700" : "text-rose-700"}>
                        {m.tipo === "Ingreso" ? "+" : "−"}
                        {ctx.$(m.monto)}
                      </b>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="card-grad h-fit p-4">
              <p className="text-sm font-semibold">Ingresos por medio</p>
              <ul className="mt-2 space-y-1.5">
                {porMedio.map(([k, v]) => (
                  <li
                    key={k}
                    className="flex justify-between rounded-xl bg-white/80 px-3 py-2 text-xs ring-1 ring-primary/10"
                  >
                    <span>{k}</span>
                    <b>{ctx.$(v)}</b>
                  </li>
                ))}
                {porMedio.length === 0 && (
                  <li className="text-xs text-muted-foreground">Sin ingresos.</li>
                )}
              </ul>
            </div>
          </div>
        </>
      )}
      {historial.length > 0 && (
        <div className="card-grad p-4">
          <p className="text-sm font-semibold">Cierres anteriores</p>
          <ul className="mt-2 space-y-1.5">
            {historial.map((s) => {
              const ms = movimientos.filter((m) => m.sesionId === s.id);
              const esp =
                s.inicial +
                ms
                  .filter((m) => m.tipo === "Ingreso" && m.medio === "Efectivo")
                  .reduce((a, m) => a + m.monto, 0) -
                ms
                  .filter((m) => m.tipo === "Egreso" && m.medio === "Efectivo")
                  .reduce((a, m) => a + m.monto, 0);
              const dif = s.contado - esp;
              return (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/80 px-3 py-2 text-xs ring-1 ring-primary/10"
                >
                  <span>
                    {fechaHora(s.abierta)} → {fechaHora(s.cerrada).slice(11)} · {s.usuario}
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <span>
                      Contado {ctx.$(s.contado)} ·{" "}
                      <b className={dif === 0 ? "text-emerald-600" : "text-rose-600"}>
                        {dif === 0 ? "sin diferencias" : `diferencia ${ctx.$(dif)}`}
                      </b>
                      {s.notaCierre ? ` · «${s.notaCierre}»` : ""}
                    </span>
                    <button type="button" className="font-semibold text-primary" onClick={() => setResumen(textoResumenCaja(ctx, suc, s, ms, esp))}>
                      Ver resumen
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {resumen && (
        <M titulo="Resumen del día" onClose={() => setResumen(null)}>
          <ResumenCaja texto={resumen} miembros={miembros} onCerrar={() => setResumen(null)} />
        </M>
      )}
      {mov && abierta && (
        <M titulo={`Registrar ${mov.toLowerCase()}`} onClose={() => setMov(null)}>
          <MovCajaForm
            tipo={mov}
            onCancel={() => setMov(null)}
            onListo={(concepto, medio, monto) => {
              setFacturacion("movimientos", (p) => [
                ...p,
                {
                  id: `m-${Date.now()}`,
                  sesionId: abierta.id,
                  fecha: new Date().toISOString(),
                  tipo: mov,
                  concepto,
                  medio,
                  monto,
                  comprobanteId: "",
                },
              ]);
              setMov(null);
              ctx.onToast(`${mov} registrado`);
            }}
          />
        </M>
      )}
      {cerrar && abierta && (
        <M titulo={`Cerrar caja de ${suc}`} onClose={() => setCerrar(false)}>
          <CierreForm
            esperado={esperado}
            ctx={ctx}
            movs={movs}
            inicial={abierta.inicial}
            onCancel={() => setCerrar(false)}
            onCerrar={(contado, nota) => {
              const cerrada = new Date().toISOString();
              setFacturacion("sesiones", (p) =>
                p.map((s) =>
                  s.id === abierta.id ? { ...s, cerrada, contado, cerradaPor: ctx.usuario, ...(nota ? { notaCierre: nota } : {}) } : s,
                ),
              );
              const texto = textoResumenCaja(ctx, suc, { ...abierta, cerrada, contado, cerradaPor: ctx.usuario, ...(nota ? { notaCierre: nota } : {}) }, movs, esperado);
              // Le llega a la Dirección (Dueño/a) en Notificaciones, esté donde esté
              const dif = contado - esperado;
              setNotificaciones("manuales", (prev) => [
                {
                  id: `caja-cierre-${abierta.id}`,
                  titulo: `Caja de ${suc} cerrada${dif === 0 ? " sin diferencias" : `: ${dif > 0 ? "sobran" : "faltan"} ${ctx.$(Math.abs(dif))}`}`,
                  detalle: texto.split("\n").slice(1).join(" · "),
                  categoria: "Administración",
                  prioridad: dif === 0 ? "Baja" : "Alta",
                  asignado: "Dirección",
                  vence: diaISO(),
                  horaVence: "",
                  creada: cerrada,
                  creadaPor: ctx.usuario,
                },
                ...prev.filter((x) => x.id !== `caja-cierre-${abierta.id}`),
              ]);
              setCerrar(false);
              setResumen(texto);
              ctx.onToast(dif === 0 ? "Caja cerrada sin diferencias" : `Caja cerrada: ${dif > 0 ? "sobran" : "faltan"} ${ctx.$(Math.abs(dif))}`);
            }}
          />
        </M>
      )}
    </div>
  );
}

function MovCajaForm({
  tipo,
  onCancel,
  onListo,
}: {
  tipo: "Ingreso" | "Egreso";
  onCancel: () => void;
  onListo: (c: string, m: MedioPago, n: number) => void;
}) {
  const [concepto, setConcepto] = useState("");
  const [medio, setMedio] = useState<MedioPago>("Efectivo");
  const [monto, setMonto] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!concepto.trim() || !(Number(monto) > 0)) return setError("Completá concepto y monto.");
        onListo(concepto.trim(), medio, Number(monto));
      }}
      className="space-y-3"
    >
      <Field label="Concepto">
        <input
          autoFocus
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
          className={INPUT}
          placeholder={
            tipo === "Egreso" ? "Ej: compra de café, cadetería" : "Ej: venta de cepillos"
          }
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Medio">
          <Sel
            value={medio}
            onChange={setMedio}
            opciones={MEDIOS_PAGO.filter((m) => m !== "Obra social")}
          />
        </Field>
        <Field label="Monto">
          <input
            type="number"
            min={1}
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className={INPUT}
            aria-label="Monto del movimiento"
          />
        </Field>
      </div>
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      <Acciones etiqueta="Registrar" onCancel={onCancel} />
    </form>
  );
}

function CierreForm({
  esperado,
  ctx,
  movs,
  inicial,
  onCancel,
  onCerrar,
}: {
  esperado: number;
  ctx: Ctx;
  movs: { tipo: string; medio: string; monto: number }[];
  inicial: number;
  onCancel: () => void;
  onCerrar: (n: number, nota: string) => void;
}) {
  const [contado, setContado] = useState("");
  const [nota, setNota] = useState("");
  const [error, setError] = useState("");
  const n = contado.trim() === "" ? null : Number(contado.replace(",", ".")) || 0;
  const dif = n === null ? 0 : n - esperado;
  const ef = (t: string) => movs.filter((m) => m.tipo === t && m.medio === "Efectivo").reduce((a, m) => a + m.monto, 0);
  const otros = movs.filter((m) => m.tipo === "Ingreso" && m.medio !== "Efectivo").reduce((a, m) => a + m.monto, 0);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (n === null) return setError("Escribí cuánto efectivo contaste.");
        if (dif !== 0 && !nota.trim()) return setError("Contá brevemente por qué hay diferencia (sirve para el Dueño/a).");
        onCerrar(n, nota.trim());
      }}
      className="space-y-3"
    >
      <div className="rounded-2xl bg-primary/[0.04] p-3 ring-1 ring-primary/10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Efectivo que debería haber</p>
        <ul className="mt-1.5 space-y-0.5 text-xs">
          <li className="flex justify-between"><span>Inicial</span><span>{ctx.$(inicial)}</span></li>
          <li className="flex justify-between text-emerald-700"><span>+ Cobros en efectivo</span><span>{ctx.$(ef("Ingreso"))}</span></li>
          <li className="flex justify-between text-rose-700"><span>− Egresos en efectivo</span><span>{ctx.$(ef("Egreso"))}</span></li>
          <li className="flex justify-between border-t border-primary/10 pt-1 text-sm font-bold"><span>Esperado</span><span>{ctx.$(esperado)}</span></li>
        </ul>
        {otros > 0 && <p className="mt-1.5 text-[11px] text-muted-foreground">Además entraron {ctx.$(otros)} por transferencia, tarjeta u otros (no están en la caja).</p>}
      </div>
      <Field label="Efectivo contado">
        <input
          inputMode="decimal"
          value={contado}
          onChange={(e) => setContado(e.target.value)}
          placeholder="Contá los billetes y escribí el total"
          className={`${INPUT} text-lg font-bold`}
          aria-label="Efectivo contado"
          autoFocus
        />
      </Field>
      {n !== null && (
        <p className={`rounded-xl px-3 py-2 text-sm font-semibold ${dif === 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          {dif === 0 ? "✓ Coincide: sin diferencias" : dif > 0 ? `Sobran ${ctx.$(dif)}` : `Faltan ${ctx.$(-dif)}`}
        </p>
      )}
      {n !== null && dif !== 0 && (
        <div>
          <div className="mb-1.5 flex flex-wrap gap-1">
            {["Vuelto mal dado", "Cobro sin registrar", "Gasto sin registrar", "Error al contar"].map((m) => (
              <button key={m} type="button" className={CHIP(nota === m)} onClick={() => setNota(m)}>
                {m}
              </button>
            ))}
          </div>
          <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={160} placeholder="¿Por qué hay diferencia?" className={INPUT} />
        </div>
      )}
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <Acciones etiqueta="Cerrar caja" onCancel={onCancel} icon={Lock} />
    </form>
  );
}

/** Texto del resumen del día (para Notificaciones y para mandarle al Dueño/a por WhatsApp) */
function textoResumenCaja(
  ctx: Ctx,
  suc: string,
  s: { abierta: string; cerrada: string; inicial: number; contado: number; cerradaPor?: string; usuario: string; notaCierre?: string },
  movs: { tipo: string; medio: string; monto: number }[],
  esperado: number,
) {
  const ingresos = movs.filter((m) => m.tipo === "Ingreso");
  const egresos = movs.filter((m) => m.tipo === "Egreso").reduce((a, m) => a + m.monto, 0);
  const porMedio = Object.entries(ingresos.reduce<Record<string, number>>((a, m) => ({ ...a, [m.medio]: (a[m.medio] ?? 0) + m.monto }), {}));
  const dif = s.contado - esperado;
  return [
    `Caja de ${suc} · ${fecha(s.abierta.slice(0, 10))}`,
    `Cobrado: ${ctx.$(ingresos.reduce((a, m) => a + m.monto, 0))} (${ingresos.length} ${ingresos.length === 1 ? "cobro" : "cobros"})`,
    ...porMedio.map(([m, v]) => `  ${m}: ${ctx.$(v)}`),
    `Gastos: ${ctx.$(egresos)}`,
    `Efectivo contado: ${ctx.$(s.contado)} (esperado ${ctx.$(esperado)})`,
    dif === 0 ? "Sin diferencias ✓" : `${dif > 0 ? "Sobran" : "Faltan"} ${ctx.$(Math.abs(dif))}${s.notaCierre ? `: ${s.notaCierre}` : ""}`,
    `Cerró: ${s.cerradaPor || s.usuario}`,
  ].join("\n");
}

function ResumenCaja({ texto, miembros, onCerrar }: { texto: string; miembros: { role: string; firstName: string; lastName: string; phone: string; status: string }[]; onCerrar: () => void }) {
  const duenos = miembros.filter((m) => m.role === "administrador" && m.status !== "inactivo" && m.phone);
  const [l0, ...resto] = texto.split("\n");
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-sky-50 p-4 ring-1 ring-emerald-200">
        <p className="text-sm font-bold">{l0}</p>
        <ul className="mt-2 space-y-0.5 text-xs text-slate-700">
          {resto.map((l, i) => (
            <li key={i} className={l.startsWith("  ") ? "pl-3 text-muted-foreground" : ""}>
              {l.trim()}
            </li>
          ))}
        </ul>
      </div>
      <p className="text-[11px] text-muted-foreground">Ya le llegó a la Dirección en Notificaciones. Si querés, mandáselo también por WhatsApp.</p>
      <div className="flex flex-wrap justify-end gap-2">
        {duenos.map((d) => (
          <a key={d.phone} href={wa(d.phone, texto)} target="_blank" rel="noreferrer" className="btn-wa">
            <IconoWhatsApp /> {d.firstName}
          </a>
        ))}
        {!duenos.length && (
          <a href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer" className="btn-wa">
            <IconoWhatsApp /> Mandar por WhatsApp
          </a>
        )}
        <button type="button" className={BTN_SECUNDARIO} onClick={onCerrar}>
          Listo
        </button>
      </div>
    </div>
  );
}

/* ───────────── Obras sociales ───────────── */

function ObrasSociales({ ctx }: { ctx: Ctx }) {
  // Coberturas y nomenclador (catálogo de la clínica) o las liquidaciones mensuales
  const [vista, setVista] = useState<"liquidaciones" | "catalogo">("liquidaciones");
  return (
    <div className="space-y-3">
      <div className="inline-flex gap-1 rounded-2xl border border-primary/10 bg-card p-1 shadow-sm" role="tablist">
        {(
          [
            ["liquidaciones", "Liquidaciones"],
            ["catalogo", "Coberturas y nomenclador"],
          ] as const
        ).map(([id, l]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={vista === id}
            onClick={() => setVista(id)}
            className={`min-h-9 rounded-xl px-3.5 text-[13px] font-semibold transition ${vista === id ? "bg-gradient-to-r from-primary to-fuchsia-500 text-white shadow" : "text-muted-foreground hover:text-foreground"}`}
          >
            {l}
          </button>
        ))}
      </div>
      {vista === "catalogo" ? <CoberturasNomenclador onToast={ctx.onToast} /> : <LiquidacionesObras ctx={ctx} />}
    </div>
  );
}

function LiquidacionesObras({ ctx }: { ctx: Ctx }) {
  const { liquidaciones } = storeFacturacion.usar();
  const { pacientes } = usePacientes();
  const { coberturas = [] } = storePresupuestos.usar();
  const [abierta, setAbierta] = useState<string | null>(null);
  const [nueva, setNueva] = useState(false);
  const obras = [
    ...new Set([
      ...coberturas.filter((c) => c.activa).map((c) => c.nombre),
      ...pacientes.map((p) => p.obraSocial).filter((o) => o && !/particular|no aplica/i.test(o)),
    ]),
  ].sort();
  const total = (l: LiquidacionOS) =>
    l.prestaciones.filter((p) => !p.debitado).reduce((a, p) => a + p.importe, 0);
  const lista = [...liquidaciones].sort((a, b) => b.periodo.localeCompare(a.periodo));
  const l = liquidaciones.find((x) => x.id === abierta);
  const EST: Record<LiquidacionOS["estado"], string> = {
    Borrador: "bg-muted text-muted-foreground",
    Presentada: "bg-violet-100 text-violet-700",
    Pagada: "bg-emerald-100 text-emerald-700",
    "Con débitos": "bg-amber-100 text-amber-700",
  };
  return (
    <div className="space-y-3">
      <Encabezado
        icon={Stethoscope}
        titulo="Obras sociales y prepagas"
        descripcion="Liquidaciones mensuales de prestaciones: armado, presentación, cobro y débitos."
      >
        <button type="button" className={BTN_PRIMARIO} onClick={() => setNueva(true)}>
          <Plus className="size-4" /> Nueva liquidación
        </button>
      </Encabezado>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Mini
          label="En preparación"
          valor={ctx.$(
            liquidaciones.filter((x) => x.estado === "Borrador").reduce((a, x) => a + total(x), 0),
          )}
          icon={FileText}
        />
        <Mini
          label="Presentado a cobrar"
          valor={ctx.$(
            liquidaciones
              .filter((x) => x.estado === "Presentada")
              .reduce((a, x) => a + total(x), 0),
          )}
          icon={Send}
          tono="text-primary"
        />
        <Mini
          label="Cobrado"
          valor={ctx.$(
            liquidaciones
              .filter((x) => x.estado === "Pagada" || x.estado === "Con débitos")
              .reduce((a, x) => a + total(x), 0),
          )}
          icon={CheckCircle2}
          tono="text-emerald-600"
        />
        <Mini
          label="Débitos"
          valor={ctx.$(
            liquidaciones
              .flatMap((x) => x.prestaciones)
              .filter((p) => p.debitado)
              .reduce((a, p) => a + p.importe, 0),
          )}
          icon={Ban}
          tono="text-rose-600"
        />
      </div>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {lista.map((x) => (
          <li key={x.id}>
            <button
              type="button"
              onClick={() => setAbierta(x.id)}
              className="card-grad flex w-full flex-col p-4 text-left transition-transform hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{x.obraSocial}</p>
                <Pill clase={EST[x.estado]}>{x.estado}</Pill>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Período {x.periodo} · {x.prestaciones.length} prestaciones
              </p>
              <p className="mt-2 text-xl font-bold text-primary">{ctx.$(total(x))}</p>
              {x.prestaciones.some((p) => p.debitado) && (
                <p className="text-[11px] text-rose-600">
                  {x.prestaciones.filter((p) => p.debitado).length} débito(s)
                </p>
              )}
            </button>
          </li>
        ))}
      </ul>
      {l && (
        <M
          titulo={`${l.obraSocial} · ${l.periodo}`}
          onClose={() => setAbierta(null)}
          ancho="max-w-3xl"
        >
          <DetalleLiquidacion ctx={ctx} l={l} obras={obras} />
        </M>
      )}
      {nueva && (
        <M titulo="Nueva liquidación" onClose={() => setNueva(false)}>
          <NuevaLiquidacion
            obras={obras}
            onCancel={() => setNueva(false)}
            onListo={(id) => {
              setNueva(false);
              setAbierta(id);
              ctx.onToast("Liquidación creada: agregá las prestaciones");
            }}
          />
        </M>
      )}
    </div>
  );
}

function NuevaLiquidacion({
  obras,
  onCancel,
  onListo,
}: {
  obras: string[];
  onCancel: () => void;
  onListo: (id: string) => void;
}) {
  const [os, setOs] = useState(obras[0] ?? "OSDE");
  const [periodo, setPeriodo] = useState(diaISO().slice(0, 7));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const id = `l-${Date.now()}`;
        setFacturacion("liquidaciones", (p) => [
          ...p,
          {
            id,
            obraSocial: os,
            periodo,
            estado: "Borrador",
            presentada: "",
            cobrada: "",
            prestaciones: [],
          },
        ]);
        onListo(id);
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Obra social">
          <Sel value={os} onChange={setOs} opciones={obras.length ? obras : ["OSDE"]} />
        </Field>
        <Field label="Período">
          <input
            type="month"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className={INPUT}
          />
        </Field>
      </div>
      <Acciones etiqueta="Crear" onCancel={onCancel} />
    </form>
  );
}

function DetalleLiquidacion({ ctx, l, obras }: { ctx: Ctx; l: LiquidacionOS; obras: string[] }) {
  const { pacientes } = usePacientes();
  const afiliados = pacientes.filter((p) => p.obraSocial === l.obraSocial);
  const [pid, setPid] = useState(String(afiliados[0]?.id ?? ""));
  const [cod, setCod] = useState("01.01");
  const [desc, setDesc] = useState("Consulta");
  const [imp, setImp] = useState("18000");
  const editar = l.estado === "Borrador";
  const upd = (fn: (x: LiquidacionOS) => LiquidacionOS) =>
    setFacturacion("liquidaciones", (p) => p.map((x) => (x.id === l.id ? fn(x) : x)));
  const total = l.prestaciones.filter((p) => !p.debitado).reduce((a, p) => a + p.importe, 0);
  void obras;
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl ring-1 ring-primary/10">
        <table className="w-full text-xs">
          <thead className="bg-primary/[0.05] text-left text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            <tr>
              <th className="p-2 font-semibold">Fecha</th>
              <th className="p-2 font-semibold">Afiliado</th>
              <th className="p-2 font-semibold">Código</th>
              <th className="p-2 font-semibold">Prestación</th>
              <th className="p-2 text-right font-semibold">Importe</th>
              <th className="w-24 p-2" />
            </tr>
          </thead>
          <tbody>
            {l.prestaciones.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-muted-foreground">
                  Sin prestaciones cargadas.
                </td>
              </tr>
            )}
            {l.prestaciones.map((p, i) => (
              <tr
                key={i}
                className={`border-t border-primary/10 ${p.debitado ? "bg-rose-50/60" : "bg-white/80"}`}
              >
                <td className="p-2">{fecha(p.fecha)}</td>
                <td className="p-2">{p.paciente}</td>
                <td className="p-2 font-mono">{p.codigo}</td>
                <td className="p-2">
                  {p.descripcion}
                  {p.debitado && (
                    <span className="block text-[10px] text-rose-600">
                      Debitado: {p.motivoDebito}
                    </span>
                  )}
                </td>
                <td
                  className={`p-2 text-right font-semibold ${p.debitado ? "text-rose-600 line-through" : ""}`}
                >
                  {ctx.$(p.importe)}
                </td>
                <td className="p-2 text-right">
                  {editar ? (
                    <button
                      type="button"
                      aria-label="Quitar prestación"
                      className={BTN_ICONO}
                      onClick={() =>
                        upd((x) => ({
                          ...x,
                          prestaciones: x.prestaciones.filter((_, k) => k !== i),
                        }))
                      }
                    >
                      <X className="size-3.5" />
                    </button>
                  ) : (
                    l.estado === "Presentada" && (
                      <button
                        type="button"
                        className="text-[11px] font-semibold text-rose-600 hover:underline"
                        onClick={() =>
                          upd((x) => ({
                            ...x,
                            prestaciones: x.prestaciones.map((q, k) =>
                              k === i
                                ? {
                                    ...q,
                                    debitado: !q.debitado,
                                    motivoDebito: q.debitado ? "" : "Falta orden / autorización",
                                  }
                                : q,
                            ),
                          }))
                        }
                      >
                        {p.debitado ? "Quitar débito" : "Debitar"}
                      </button>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editar && (
        <form
          className="grid grid-cols-2 gap-2 rounded-2xl bg-primary/[0.04] p-3 ring-1 ring-primary/10 sm:grid-cols-[1.4fr_90px_1.2fr_110px_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            const p = afiliados.find((x) => String(x.id) === pid);
            if (!p || !(Number(imp) > 0)) return;
            const nueva: Prestacion = {
              pacienteId: p.id,
              paciente: nombrePac(p),
              fecha: diaISO(),
              codigo: cod,
              descripcion: desc,
              importe: Number(imp),
              debitado: false,
              motivoDebito: "",
            };
            upd((x) => ({ ...x, prestaciones: [...x.prestaciones, nueva] }));
          }}
        >
          <Sel
            value={pid}
            onChange={setPid}
            etiqueta="Afiliado"
            opciones={
              afiliados.length
                ? afiliados.map((p) => ({ value: String(p.id), label: nombrePac(p) }))
                : [{ value: "", label: "Sin afiliados cargados" }]
            }
          />
          <input
            value={cod}
            onChange={(e) => setCod(e.target.value)}
            className={INPUT}
            aria-label="Código"
          />
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className={INPUT}
            aria-label="Prestación"
          />
          <input
            type="number"
            value={imp}
            onChange={(e) => setImp(e.target.value)}
            className={INPUT}
            aria-label="Importe"
          />
          <button type="submit" className={BTN_SECUNDARIO}>
            <Plus className="size-4" /> Agregar
          </button>
        </form>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto text-lg font-bold text-primary">{ctx.$(total)}</p>
        <button
          type="button"
          className={BTN_SECUNDARIO}
          onClick={() =>
            void descargarExcel(
              `liquidacion-${l.obraSocial}-${l.periodo}.xlsx`.replace(/\s+/g, "-"),
              [
                {
                  nombre: l.obraSocial,
                  nota: `Liquidación ${l.obraSocial} · período ${l.periodo} · ${l.estado}`,
                  columnas: [
                    { titulo: "Fecha", clave: "f", ancho: 12 },
                    { titulo: "Afiliado", clave: "p", ancho: 24 },
                    { titulo: "Código", clave: "c", ancho: 10 },
                    { titulo: "Prestación", clave: "d", ancho: 28 },
                    { titulo: "Importe", clave: "i", moneda: true, ancho: 14 },
                    { titulo: "Débito", clave: "db", ancho: 26 },
                  ],
                  filas: l.prestaciones.map((p) => ({
                    f: fecha(p.fecha),
                    p: p.paciente,
                    c: p.codigo,
                    d: p.descripcion,
                    i: p.importe,
                    db: p.debitado ? p.motivoDebito : "",
                  })),
                  totales: { p: "Total a cobrar", i: total },
                },
              ],
            ).then(() => ctx.onToast("Liquidación exportada a Excel"))
          }
        >
          <FileSpreadsheet className="size-4" /> Excel
        </button>
        {l.estado === "Borrador" && (
          <button
            type="button"
            className={BTN_PRIMARIO}
            disabled={!l.prestaciones.length}
            onClick={() => {
              upd((x) => ({ ...x, estado: "Presentada", presentada: diaISO() }));
              ctx.onToast(`Liquidación presentada a ${l.obraSocial}`);
            }}
          >
            <Send className="size-4" /> Presentar
          </button>
        )}
        {l.estado === "Presentada" && (
          <button
            type="button"
            className={BTN_PRIMARIO}
            onClick={() => {
              const deb = l.prestaciones.some((p) => p.debitado);
              upd((x) => ({ ...x, estado: deb ? "Con débitos" : "Pagada", cobrada: diaISO() }));
              ctx.onToast(
                deb ? "Cobro registrado con débitos" : "Cobro de la obra social registrado",
              );
            }}
          >
            <CheckCircle2 className="size-4" /> Registrar cobro
          </button>
        )}
      </div>
      {l.presentada && (
        <p className="text-[11px] text-muted-foreground">
          Presentada {fecha(l.presentada)}
          {l.cobrada ? ` · cobrada ${fecha(l.cobrada)}` : ""}
        </p>
      )}
    </div>
  );
}

/* ───────────── Reportes ───────────── */

function Reportes({ ctx }: { ctx: Ctx }) {
  const { comprobantes, config, historico = [] } = storeFacturacion.usar();
  const pf = paisFiscal(config.pais);
  const validas = comprobantes.filter((c) => c.clase === "Factura" && !c.anulada);
  const meses = Array.from({ length: 6 }, (_, i) => 5 - i);
  const previo = (n: number) => historico.find((h) => h.mes === mesISO(n));
  const serie = meses.map((n) => ({
    n,
    facturado:
      (previo(n)?.facturado ?? 0) +
      validas
        .filter((c) => mismoMes(c.fecha, n))
        .reduce((a, c) => a + totalesComprobante(c).total, 0),
    cobrado:
      (previo(n)?.cobrado ?? 0) +
      comprobantes
        .flatMap((c) => c.pagos)
        .filter((p) => mismoMes(p.fecha, n))
        .reduce((a, p) => a + p.monto, 0),
  }));
  const max = Math.max(1, ...serie.flatMap((s) => [s.facturado, s.cobrado]));
  const porProf = Object.entries(
    validas.reduce<Record<string, number>>(
      (a, c) => ({
        ...a,
        [c.profesional || "Sin profesional"]:
          (a[c.profesional || "Sin profesional"] ?? 0) + totalesComprobante(c).total,
      }),
      {},
    ),
  ).sort((a, b) => b[1] - a[1]);
  const maxP = Math.max(1, ...porProf.map(([, v]) => v));
  const nombreMes = (n: number) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - n);
    return d.toLocaleDateString("es-AR", { month: "short" });
  };
  const libroIva = () =>
    void descargarExcel(`libro-iva-ventas-${diaISO().slice(0, 7)}.xlsx`, [
      {
        nombre: "IVA Ventas",
        nota: `Libro IVA Ventas · ${config.razonSocial} · ${pf.idFiscal} ${config.idFiscal} · ${pf.ente}`,
        columnas: [
          { titulo: "Fecha", clave: "f", ancho: 12 },
          { titulo: "Comprobante", clave: "t", ancho: 18 },
          { titulo: "Número", clave: "n", ancho: 16 },
          { titulo: "Cliente", clave: "c", ancho: 28 },
          { titulo: "Documento", clave: "d", ancho: 16 },
          { titulo: "Condición", clave: "cond", ancho: 20 },
          { titulo: "Neto", clave: "neto", moneda: true },
          { titulo: "IVA", clave: "iva", moneda: true },
          { titulo: "Total", clave: "tot", moneda: true },
          { titulo: pf.codigoAutorizacion, clave: "cae", ancho: 20 },
          { titulo: "Estado", clave: "e", ancho: 10 },
        ],
        filas: [...comprobantes]
          .sort((a, b) => a.fecha.localeCompare(b.fecha))
          .map((c) => {
            const t = totalesComprobante(c);
            const s = c.clase === "Nota de crédito" ? -1 : 1;
            return {
              f: fecha(c.fecha),
              t: c.tipo,
              n: numeroComprobante(c),
              c: c.cliente.nombre,
              d: c.cliente.documento,
              cond: c.cliente.condicion,
              neto: s * t.neto,
              iva: s * t.iva,
              tot: s * t.total,
              cae: c.cae,
              e: c.anulada ? "Anulada" : "Vigente",
            };
          }),
        totales: {
          c: "Total del período",
          neto: comprobantes.reduce(
            (a, c) => a + (c.clase === "Nota de crédito" ? -1 : 1) * totalesComprobante(c).neto,
            0,
          ),
          iva: comprobantes.reduce(
            (a, c) => a + (c.clase === "Nota de crédito" ? -1 : 1) * totalesComprobante(c).iva,
            0,
          ),
          tot: comprobantes.reduce(
            (a, c) => a + (c.clase === "Nota de crédito" ? -1 : 1) * totalesComprobante(c).total,
            0,
          ),
        },
      },
    ]).then(() => ctx.onToast("Libro IVA Ventas descargado"));
  return (
    <div className="space-y-3">
      <Encabezado
        icon={BarChart3}
        titulo="Reportes"
        descripcion="Facturado vs. cobrado, por profesional y libro de IVA para el contador."
      >
        {ctx.nivel >= 3 ? (
          <button type="button" className={BTN_SECUNDARIO} onClick={libroIva}>
            <Download className="size-4" /> Libro IVA Ventas (Excel)
          </button>
        ) : (
          <Pill clase="bg-muted text-muted-foreground">
            Libro IVA desde el plan Plus
          </Pill>
        )}
      </Encabezado>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="card-grad p-4">
          <p className="text-sm font-semibold">Facturado vs. cobrado (6 meses)</p>
          <div className="mt-4 flex h-44 items-end gap-3">
            {serie.map((s) => (
              <div key={s.n} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full items-end justify-center gap-1" style={{ height: 130 }}>
                  <div
                    title={`Facturado ${ctx.$(s.facturado)}`}
                    className="w-1/2 rounded-t-lg bg-primary/25"
                    style={{ height: `${Math.max(3, (s.facturado / max) * 130)}px` }}
                  />
                  <div
                    title={`Cobrado ${ctx.$(s.cobrado)}`}
                    className="w-1/2 rounded-t-lg bg-gradient-to-t from-emerald-500 to-emerald-300"
                    style={{ height: `${Math.max(3, (s.cobrado / max) * 130)}px` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{nombreMes(s.n)}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="size-2.5 rounded bg-primary/25" /> Facturado
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2.5 rounded bg-emerald-400" /> Cobrado
            </span>
          </div>
        </div>
        <div className="card-grad p-4">
          <p className="text-sm font-semibold">Facturado por profesional</p>
          <ul className="mt-3 space-y-2.5">
            {porProf.map(([k, v]) => (
              <li key={k}>
                <div className="mb-1 flex justify-between text-xs">
                  <span>{k}</span>
                  <b>{ctx.$(v)}</b>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-primary/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-fuchsia-500"
                    style={{ width: `${(v / maxP) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Datos fiscales ───────────── */

function DatosFiscales({ ctx }: { ctx: Ctx }) {
  const { config } = storeFacturacion.usar();
  const [f, setF] = useState<ConfigFiscal>(config);
  const [conectando, setConectando] = useState(false);
  const pf = paisFiscal(f.pais);
  const set = (c: Partial<ConfigFiscal>) => setF((p) => ({ ...p, ...c }));
  return (
    <div className="space-y-3">
      <Encabezado
        icon={Building2}
        titulo="Datos fiscales"
        descripcion="Emisor, país fiscal y conexión con el ente para autorizar comprobantes."
      />
      <form
        className="card-grad space-y-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          setFacturacion("config", () => f);
          ctx.onToast("Datos fiscales guardados");
        }}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="País fiscal">
            <Sel
              value={f.pais}
              onChange={(v) => set({ pais: v, conectado: false })}
              etiqueta="País fiscal"
              opciones={PAISES_FISCALES.map((p) => ({
                value: p.id,
                label: `${p.bandera} ${p.nombre} · ${p.ente}`,
              }))}
            />
          </Field>
          <Field label="Razón social">
            <input
              value={f.razonSocial}
              onChange={(e) => set({ razonSocial: e.target.value })}
              className={INPUT}
            />
          </Field>
          <Field label={pf.idFiscal}>
            <input
              value={f.idFiscal}
              onChange={(e) => set({ idFiscal: e.target.value })}
              className={INPUT}
            />
          </Field>
          <Field label="Condición">
            <Sel
              value={f.condicion}
              onChange={(v) => set({ condicion: v })}
              opciones={CONDICIONES_IVA.filter((c) => c !== "Consumidor Final")}
            />
          </Field>
          <Field label="Punto de venta">
            <input
              type="number"
              min={1}
              value={f.puntoVenta}
              onChange={(e) => set({ puntoVenta: Number(e.target.value) || 1 })}
              className={INPUT}
            />
          </Field>
          <Field label="Vencimiento (días)">
            <input
              type="number"
              min={0}
              value={f.vencimientoDias}
              onChange={(e) => set({ vencimientoDias: Number(e.target.value) || 0 })}
              className={INPUT}
            />
          </Field>
          <Field label="Domicilio fiscal">
            <input
              value={f.domicilio}
              onChange={(e) => set({ domicilio: e.target.value })}
              className={INPUT}
            />
          </Field>
          <Field label="Inicio de actividades">
            <input
              type="date"
              value={f.inicioActividades}
              onChange={(e) => set({ inicioActividades: e.target.value })}
              className={INPUT}
            />
          </Field>
          <Field label="Leyenda al pie">
            <input
              value={f.leyenda}
              onChange={(e) => set({ leyenda: e.target.value })}
              className={INPUT}
            />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-primary/[0.04] p-3 ring-1 ring-primary/10">
          <span
            className={`grid size-10 place-items-center rounded-2xl ${f.conectado ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
          >
            <ShieldCheck className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {pf.bandera} {pf.ente}: {f.conectado ? "conectado" : "sin conectar (modo prueba)"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Comprobantes: {pf.comprobantes.join(", ")} · código de autorización:{" "}
              {pf.codigoAutorizacion} · moneda {pf.moneda}
            </p>
          </div>
          <button
            type="button"
            className={f.conectado ? BTN_SECUNDARIO : BTN_PRIMARIO}
            onClick={() => {
              if (f.conectado) {
                set({ conectado: false });
                return;
              }
              setConectando(true);
              window.setTimeout(() => {
                setConectando(false);
                set({ conectado: true });
                ctx.onToast(`Certificado validado con ${pf.ente}`);
              }, 900);
            }}
          >
            {conectando
              ? "Validando certificado…"
              : f.conectado
                ? "Desconectar"
                : "Conectar certificado"}
          </button>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className={BTN_SECUNDARIO} onClick={() => setF(config)}>
            Descartar
          </button>
          <button type="submit" className={BTN_PRIMARIO}>
            <CheckCircle2 className="size-4" /> Guardar
          </button>
        </div>
      </form>
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Copy className="size-3.5" /> La autorización es simulada para practicar. TODO backend:
        integración con el web service de cada ente fiscal.
      </p>
    </div>
  );
}

/* ───────────── Cobrar hoy (cobro rápido desde el celular) ───────────── */

type MovCuenta = { tipo: string; monto: number; fecha: string; turnoId?: number };
/** Lo que debe el paciente en su cuenta corriente (cargos − pagos − notas de crédito) */
const saldoCuenta = (cuenta: MovCuenta[] | undefined) =>
  (cuenta ?? []).reduce((a, m) => a + (m.tipo === "Cargo" ? m.monto : -m.monto), 0);

/** Pacientes con turno hoy: lo que deben, lo que se les hizo y un cobro en 2 toques. */
function CobroDelDia({ ctx }: { ctx: Ctx }) {
  const { turnos } = storeAgenda.usar();
  const registros = useTodosLosRegistros();
  const { cambiar } = useRegistrosPacientes();
  const { pacientes } = usePacientes();
  const { aranceles } = storePresupuestos.usar();
  const { sesiones } = storeFacturacion.usar();
  const hoy = diaISO();
  const [abierto, setAbierto] = useState<number | null>(null);
  const [recibo, setRecibo] = useState<Recibo | null>(null);
  const nuevoRecibo = useNuevoRecibo();
  const porNombre = new Map(pacientes.map((p) => [normalizarBusqueda(`${p.nombre} ${p.apellido}`), p]));
  const precioDe = (tratamiento: string) => {
    const t = normalizarBusqueda(tratamiento.replace(/\s*\(sesión.*\)$/i, ""));
    const a = aranceles.filter((x) => x.activo && x.precio > 0);
    return (a.find((x) => normalizarBusqueda(x.nombre) === t) ?? a.find((x) => t.length >= 4 && normalizarBusqueda(x.nombre).includes(t)))?.precio ?? 0;
  };
  const filas = turnos
    .filter((t) => t.fecha === hoy && t.estado !== "Cancelada" && t.estado !== "Ausente")
    .sort((a, b) => a.hora.localeCompare(b.hora))
    .map((t) => {
      const pac = porNombre.get(normalizarBusqueda(t.paciente));
      const cuenta = pac ? (registros[pac.id]?.cuenta ?? []) : [];
      const delTurno = cuenta.filter((m) => m.turnoId === t.id);
      const cargado = delTurno.some((m) => m.tipo === "Cargo");
      const cobradoHoy = delTurno.filter((m) => m.tipo === "Pago").reduce((a, m) => a + m.monto, 0);
      return { t, pac, debe: Math.max(0, saldoCuenta(cuenta)), cargado, cobradoHoy, precio: precioDe(t.tratamiento) };
    });
  // Si un paciente tiene 2 turnos hoy, la deuda se muestra una sola vez
  const vistos = new Set<number>();
  for (const f of filas) {
    if (!f.pac) continue;
    if (vistos.has(f.pac.id)) f.debe = 0;
    vistos.add(f.pac.id);
  }
  const cobrado = Object.values(registros)
    .flatMap((r) => r.cuenta)
    .filter((m) => m.tipo === "Pago" && m.fecha === hoy)
    .reduce((a, m) => a + m.monto, 0);
  const falta = filas.reduce((a, f) => a + f.debe + (!f.cargado && f.t.estado === "Atendida" ? f.precio : 0), 0);
  const cajaAbierta = sesiones.some((s) => !s.cerrada);

  return (
    <div className="space-y-3">
      <Encabezado
        icon={Banknote}
        titulo="Cobrar hoy"
        descripcion="Los pacientes con turno hoy: lo que deben y lo que se les hizo. Cobrás en dos toques y queda en su cuenta y en la caja."
      />
      <div className="grid grid-cols-2 gap-3">
        <Mini label="Cobrado hoy" valor={ctx.$(cobrado)} icon={CheckCircle2} tono="text-emerald-600" />
        <Mini label="Falta cobrar" valor={ctx.$(falta)} icon={AlarmClock} tono={falta ? "text-rose-600" : "text-foreground"} />
      </div>
      {ctx.nivel >= 2 && !cajaAbierta && (
        <p className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900 ring-1 ring-amber-200">
          <span>La caja de hoy está cerrada: los cobros quedan en la cuenta del paciente, pero no en la caja.</span>
          <button type="button" className="font-semibold underline-offset-2 hover:underline" onClick={() => ctx.ir("caja")}>
            Abrir caja
          </button>
        </p>
      )}
      <PagosAvisados ctx={ctx} onRecibo={setRecibo} />
      {recibo && <ReciboModal recibo={recibo} plata={ctx.$} onClose={() => setRecibo(null)} />}
      {filas.length === 0 ? (
        <Vacio icon={Banknote} texto="Hoy no hay turnos en la agenda." />
      ) : (
        <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          {filas.map((f) => {
            const sugerido = f.debe + (!f.cargado ? f.precio : 0);
            const listo = f.cargado && f.debe === 0;
            return (
              <li key={f.t.id} className={`card-grad p-3 ${listo ? "opacity-80" : ""}`}>
                <div className="flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-sm font-bold text-primary">{f.t.hora}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{f.t.paciente}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {f.t.tratamiento}
                      {f.t.odontologo ? ` · ${f.t.odontologo}` : ""}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Pill clase={f.t.estado === "Atendida" ? "bg-emerald-100 text-emerald-700" : f.t.estado === "Confirmada" ? "bg-sky-100 text-sky-700" : "bg-muted text-muted-foreground"}>
                        {f.t.estado === "Atendida" ? "Atendido" : f.t.llegada ? "En sala" : f.t.estado}
                      </Pill>
                      {f.debe > 0 && <Pill clase="bg-rose-50 text-rose-700">Debe {ctx.$(f.debe)}</Pill>}
                      {f.cobradoHoy > 0 && <Pill clase="bg-emerald-50 text-emerald-700">Cobrado {ctx.$(f.cobradoHoy)}</Pill>}
                    </div>
                  </div>
                  {f.pac?.telefono && f.debe > 0 && (
                    <button
                      type="button"
                      aria-label="Mandar link de pago por WhatsApp"
                      title="Mandar link de pago: ve cuánto debe y avisa «ya pagué» con el comprobante"
                      className="btn-wa-icono shrink-0"
                      onClick={() =>
                        abrirWhatsAppConEnlacePago(telefonoInternacional(f.pac!.telefono), f.pac!.id, (enlace) =>
                          `Hola ${f.pac!.nombre} 👋 Te queda un saldo de ${ctx.$(f.debe)} en la clínica.${enlace ? ` Acá ves los datos para pagar y nos avisás cuando lo hagas (con la foto del comprobante):\n${enlace}` : " Cualquier duda, escribinos por acá."}`,
                        )
                      }
                    >
                      <IconoWhatsApp />
                    </button>
                  )}
                  {listo ? (
                    <CheckCircle2 className="size-6 shrink-0 text-emerald-500" />
                  ) : f.pac ? (
                    <button type="button" className={BTN_PRIMARIO} onClick={() => setAbierto(abierto === f.t.id ? null : f.t.id)}>
                      <Banknote className="size-4" />
                      {sugerido > 0 ? ctx.$(sugerido) : "Cobrar"}
                    </button>
                  ) : (
                    <span className="max-w-24 shrink-0 text-right text-[10px] text-muted-foreground">Sin ficha de paciente</span>
                  )}
                </div>
                {abierto === f.t.id && f.pac && (
                  <CobroRapido
                    ctx={ctx}
                    turno={f.t}
                    pac={f.pac}
                    debe={f.debe}
                    cargar={f.cargado ? 0 : f.precio}
                    yaCargado={f.cargado}
                    onListo={(m, cobro) => {
                      setAbierto(null);
                      ctx.onToast(m);
                      if (cobro && f.pac)
                        setRecibo(
                          nuevoRecibo({
                            paciente: `${f.pac.nombre} ${f.pac.apellido}`,
                            telefono: f.pac.telefono,
                            monto: cobro.monto,
                            medio: cobro.medio,
                            concepto: cobro.concepto,
                            saldo: Math.max(0, f.debe + cobro.cargo - cobro.monto),
                          }),
                        );
                    }}
                    cambiar={cambiar}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CobroRapido({
  ctx,
  turno,
  pac,
  debe,
  cargar,
  yaCargado,
  onListo,
  cambiar,
}: {
  ctx: Ctx;
  turno: Turno;
  pac: Paciente;
  debe: number;
  cargar: number;
  yaCargado: boolean;
  onListo: (m: string, cobro?: { monto: number; medio: string; concepto: string; cargo: number }) => void;
  cambiar: ReturnType<typeof useRegistrosPacientes>["cambiar"];
}) {
  // Lo que se hizo hoy (si todavía no está cargado) + lo que ya debía
  const [concepto, setConcepto] = useState(turno.tratamiento);
  const [precio, setPrecio] = useState(cargar ? String(cargar) : "");
  const [incluir, setIncluir] = useState(true);
  const [medio, setMedio] = useState<MedioPago>("Efectivo");
  const cargo = incluir && !yaCargado ? Math.max(0, Number(precio.replace(",", ".")) || 0) : 0;
  const total = debe + cargo;
  const [monto, setMonto] = useState<string | null>(null);
  const aCobrar = monto === null ? total : Math.max(0, Number(monto.replace(",", ".")) || 0);
  const cobrar = () => {
    if (aCobrar <= 0 && cargo <= 0) return;
    const ahora = Date.now();
    const hoy = diaISO();
    cambiar(pac.id, "cuenta", (prev) => [
      ...prev,
      ...(cargo > 0 ? [{ id: ahora, fecha: hoy, tipo: "Cargo" as const, concepto: concepto.trim() || turno.tratamiento, medio: "", monto: cargo, notas: `Turno ${turno.hora}${turno.odontologo ? ` · ${turno.odontologo}` : ""}`, turnoId: turno.id }] : []),
      ...(aCobrar > 0 ? [{ id: ahora + 1, fecha: hoy, tipo: "Pago" as const, concepto: `Cobro del ${fecha(hoy)}`, medio, monto: aCobrar, notas: "", turnoId: turno.id }] : []),
    ]);
    const abiertas = storeFacturacion.leer().sesiones.filter((s) => !s.cerrada);
    const caja = abiertas.find((s) => s.sucursal === turno.sucursal) ?? (abiertas.length === 1 ? abiertas[0] : undefined);
    if (caja && aCobrar > 0 && medio !== "Obra social")
      setFacturacion("movimientos", (prev) => [
        ...prev,
        { id: `m-${ahora}`, sesionId: caja.id, fecha: new Date().toISOString(), tipo: "Ingreso", concepto: `${concepto.trim() || turno.tratamiento} · ${pac.nombre} ${pac.apellido}`, medio, monto: aCobrar, comprobanteId: "" },
      ]);
    onListo(
      aCobrar > 0
        ? `Cobrado ${ctx.$(aCobrar)} a ${pac.nombre}${caja ? " · sumado a la caja" : ""}`
        : `Cargado ${ctx.$(cargo)} en la cuenta de ${pac.nombre}`,
      aCobrar > 0 ? { monto: aCobrar, medio, concepto: concepto.trim() || turno.tratamiento, cargo } : undefined,
    );
  };
  return (
    <div className="mt-3 space-y-2.5 rounded-2xl bg-white/90 p-3 ring-1 ring-primary/15">
      {!yaCargado && (
        <label className="flex items-start gap-2.5">
          <input type="checkbox" checked={incluir} onChange={(e) => setIncluir(e.target.checked)} className="mt-2.5 size-4 shrink-0 accent-[var(--color-primary)]" />
          <span className="grid flex-1 grid-cols-[1fr_7rem] gap-1.5">
            <input value={concepto} onChange={(e) => setConcepto(e.target.value)} aria-label="Qué se hizo" className={INPUT} />
            <input inputMode="decimal" value={precio} onChange={(e) => { setPrecio(e.target.value); setMonto(null); }} placeholder="Precio" aria-label="Precio" className={INPUT} />
            {!cargar && <span className="col-span-2 text-[10px] text-muted-foreground">Sin precio cargado: escribilo acá, o cargalo en Presupuestos → Aranceles para que salga solo.</span>}
          </span>
        </label>
      )}
      {debe > 0 && (
        <p className="flex justify-between rounded-xl bg-rose-50 px-3 py-1.5 text-xs text-rose-800">
          <span>Ya debía</span>
          <b>{ctx.$(debe)}</b>
        </p>
      )}
      <div className="flex items-end gap-2">
        <label className="block flex-1">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Cobra ahora</span>
          <input inputMode="decimal" value={monto ?? String(total)} onChange={(e) => setMonto(e.target.value)} className={`${INPUT} text-lg font-bold`} />
        </label>
        {monto !== null && Number(monto) !== total && total > 0 && (
          <button type="button" className={CHIP(false)} onClick={() => setMonto(null)}>
            Todo {ctx.$(total)}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {MEDIOS_PAGO.filter((m) => m !== "Obra social").map((m) => (
          <button key={m} type="button" className={CHIP(medio === m)} onClick={() => setMedio(m)}>
            {m}
          </button>
        ))}
      </div>
      {aCobrar < total && aCobrar >= 0 && cargo > 0 && (
        <p className="text-[11px] text-muted-foreground">Queda debiendo {ctx.$(total - aCobrar)} en su cuenta.</p>
      )}
      <button type="button" className={`${BTN_PRIMARIO} w-full justify-center`} disabled={aCobrar <= 0 && cargo <= 0} onClick={cobrar}>
        <CheckCircle2 className="size-4" />
        {aCobrar > 0 ? `Cobrar ${ctx.$(aCobrar)} · ${medio}` : "Solo cargar en la cuenta"}
      </button>
    </div>
  );
}

/** «Ya pagué» que avisaron los pacientes (enlace de pago o portal): la clínica revisa que haya
    llegado y lo confirma. Recién ahí se descuenta de su saldo (y entra en la caja si está abierta). */
function PagosAvisados({ ctx, onRecibo }: { ctx: Ctx; onRecibo?: (r: Recibo) => void }) {
  const { pagosInformados = [] } = storePortal.usar();
  const { cambiar } = useRegistrosPacientes();
  const registros = useTodosLosRegistros();
  const { pacientes } = usePacientes();
  const nuevoRecibo = useNuevoRecibo();
  const pendientes = pagosInformados.filter((p) => p.estado === "Pendiente");
  if (!pendientes.length) return null;
  const resolver = (id: string, estado: "Confirmado" | "Rechazado") => {
    const p = pagosInformados.find((x) => x.id === id);
    if (!p) return;
    if (estado === "Confirmado") {
      const medio = (MEDIOS_PAGO as readonly string[]).includes(p.medio) ? (p.medio as MedioPago) : "Transferencia";
      cambiar(p.pacienteId, "cuenta", (prev) => [
        ...prev,
        {
          id: Date.now(),
          fecha: diaISO(),
          tipo: "Pago",
          concepto: "Pago avisado por el paciente",
          medio: p.medio,
          monto: p.monto,
          notas: [p.referencia && `Ref. ${p.referencia}`, p.comprobante && "con comprobante"].filter(Boolean).join(" · "),
        },
      ]);
      const abiertas = storeFacturacion.leer().sesiones.filter((s) => !s.cerrada);
      if (abiertas.length === 1)
        setFacturacion("movimientos", (prev) => [
          ...prev,
          { id: `m-${Date.now()}`, sesionId: abiertas[0]!.id, fecha: new Date().toISOString(), tipo: "Ingreso", concepto: `Pago avisado · ${p.paciente}`, medio, monto: p.monto, comprobanteId: "" },
        ]);
    }
    setPortal("pagosInformados", (prev = []) => prev.map((x) => (x.id === id ? { ...x, estado } : x)));
    ctx.onToast(estado === "Confirmado" ? `Pago de ${p.paciente} confirmado: ya figura en su cuenta` : "Marcado como no recibido");
    if (estado === "Confirmado" && onRecibo) {
      const pac = pacientes.find((x) => x.id === p.pacienteId);
      onRecibo(
        nuevoRecibo({
          paciente: p.paciente,
          telefono: pac?.telefono ?? "",
          monto: p.monto,
          medio: p.medio,
          concepto: "Pago a cuenta",
          saldo: Math.max(0, deudaDe(registros[p.pacienteId]?.cuenta).saldo - p.monto),
        }),
      );
    }
  };
  return (
    <div className="card-grad p-4 ring-1 ring-amber-200">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <BadgeCheck className="size-4 text-amber-600" /> Pagos para confirmar ({pendientes.length})
      </p>
      <p className="text-[11px] text-muted-foreground">Los pacientes avisaron que pagaron. Revisá que haya llegado y confirmalo: recién ahí se descuenta de su saldo.</p>
      <ul className="mt-3 space-y-2">
        {pendientes.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-white/90 p-3 ring-1 ring-primary/10">
            {p.comprobante && (
              <a href={p.comprobante} target="_blank" rel="noreferrer" className="shrink-0" aria-label="Ver comprobante">
                <img src={p.comprobante.replace("/upload/", "/upload/w_120,h_120,c_fill/")} alt="" className="size-12 rounded-lg object-cover ring-1 ring-black/10" />
              </a>
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">
                {p.paciente} · {ctx.$(p.monto)}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                {p.medio}
                {p.referencia ? ` · ref. ${p.referencia}` : ""} · {new Date(p.fecha).toLocaleDateString("es")}
                {p.comprobante && (
                  <>
                    {" · "}
                    <a href={p.comprobante} target="_blank" rel="noreferrer" className="font-semibold text-primary">
                      Ver comprobante
                    </a>
                  </>
                )}
              </span>
            </span>
            <button type="button" className={BTN_SECUNDARIO} onClick={() => resolver(p.id, "Rechazado")}>
              No llegó
            </button>
            <button type="button" className={BTN_PRIMARIO} onClick={() => resolver(p.id, "Confirmado")}>
              <CheckCircle2 className="size-4" /> Confirmar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ───────────── Pacientes que deben (cuenta corriente) ───────────── */

function PacientesQueDeben({ ctx }: { ctx: Ctx }) {
  const registros = useTodosLosRegistros();
  const { pacientes } = usePacientes();
  const { recordatoriosDeuda = {} } = storeFacturacion.usar();
  const { pagosInformados = [] } = storePortal.usar();
  const { plan } = useCloudEsther();
  const { flujos } = storeN8n.usar();
  const modAuto = MODULES.find((m) => m.id === "automatizaciones");
  const conAuto = !!modAuto && availableIn(modAuto, plan);
  const autoActivo = conAuto && flujos.some((f) => f.activo && f.evento === "saldo_pendiente");
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState<"todos" | "30" | "sin">("todos");
  const hoy = diaISO();
  const diasDesde = (f: string) => Math.max(0, Math.round((new Date(`${hoy}T12:00:00`).getTime() - new Date(`${f.slice(0, 10)}T12:00:00`).getTime()) / 86_400_000));
  const lista = pacientes
    .map((p) => {
      const d = deudaDe(registros[p.id]?.cuenta);
      const avisado = pagosInformados.filter((x) => x.pacienteId === p.id && x.estado === "Pendiente").reduce((a, x) => a + x.monto, 0);
      const recordado = recordatoriosDeuda[String(p.id)] ?? "";
      return { p, ...d, dias: d.desde ? diasDesde(d.desde) : 0, avisado, recordado };
    })
    .filter((x) => x.saldo > 0)
    .sort((a, b) => b.dias - a.dias || b.saldo - a.saldo);
  const visibles = lista.filter((x) =>
    filtro === "30" ? x.dias >= 30 : filtro === "sin" ? !x.recordado || diasDesde(x.recordado) >= 7 : true,
  );
  const total = lista.reduce((a, x) => a + x.saldo, 0);
  const recordar = (x: (typeof lista)[number]) => {
    abrirWhatsAppConEnlacePago(telefonoInternacional(x.p.telefono), x.p.id, (enlace) =>
      `Hola ${x.p.nombre} 👋 ¿Cómo estás? Te escribimos de la clínica para recordarte que te queda un saldo de ${ctx.$(x.saldo)}.${enlace ? ` Acá ves cómo pagarlo y nos avisás cuando lo hagas:\n${enlace}` : " Cuando puedas, lo abonás en la clínica o por transferencia."}\nSi ya lo pagaste, avisanos y lo revisamos. ¡Gracias!`,
    );
    setFacturacion("recordatoriosDeuda", (prev) => ({ ...(prev ?? {}), [String(x.p.id)]: hoy }));
    ctx.onToast(`Recordatorio enviado a ${x.p.nombre}`);
  };
  return (
    <div className="card-grad p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Pacientes que deben</p>
          <p className="text-[11px] text-muted-foreground">
            {lista.length ? `${lista.length} ${lista.length === 1 ? "paciente debe" : "pacientes deben"} ${ctx.$(total)} en su cuenta corriente.` : "Nadie debe nada en su cuenta corriente."}
          </p>
        </div>
        {lista.length > 0 && (
          <div className="flex gap-1 rounded-full bg-white/80 p-1 ring-1 ring-primary/10">
            {(
              [
                ["todos", "Todos"],
                ["30", "+30 días"],
                ["sin", "Sin recordar"],
              ] as const
            ).map(([v, l]) => (
              <button key={v} type="button" className={CHIP(filtro === v)} onClick={() => setFiltro(v)}>
                {l}
              </button>
            ))}
          </div>
        )}
      </div>
      <div
        className={`mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl px-3 py-2.5 text-xs ring-1 ${autoActivo ? "bg-emerald-50 text-emerald-900 ring-emerald-200" : "bg-gradient-to-r from-sky-50 to-violet-50 text-slate-700 ring-primary/10"}`}
      >
        <span className="min-w-0">
          {autoActivo ? (
            <>
              <b>Recordatorio automático activo:</b> a los 15 días con saldo, Cloud Esther le escribe sola al paciente con el link para pagar.
            </>
          ) : conAuto ? (
            <>
              <b>¿Que se haga solo?</b> Activá «Recordatorio de saldos pendientes» en Automatizaciones.
            </>
          ) : (
            <>
              <b>Un toque por paciente:</b> «Recordar» le manda un mensaje amable con el link para ver cómo pagar y avisar «ya pagué».
            </>
          )}
        </span>
        {conAuto && !autoActivo && (
          <button type="button" className="font-semibold text-primary underline-offset-2 hover:underline" onClick={() => void navigate({ to: "/demo/automatizaciones" })}>
            Activar
          </button>
        )}
      </div>
      {visibles.length > 0 && (
        <ul className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
          {visibles.map((x) => (
            <li key={x.p.id} className="flex items-center gap-3 rounded-2xl bg-white/85 p-3 ring-1 ring-primary/10">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {x.p.nombre} {x.p.apellido}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {x.dias ? `Debe hace ${x.dias} ${x.dias === 1 ? "día" : "días"}` : "Debe desde hoy"}
                  {x.recordado ? ` · recordado ${x.recordado === hoy ? "hoy" : `el ${fecha(x.recordado)}`}` : ""}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Pill clase={x.dias >= 60 ? "bg-rose-100 text-rose-700" : x.dias >= 30 ? "bg-amber-100 text-amber-800" : "bg-muted text-muted-foreground"}>{ctx.$(x.saldo)}</Pill>
                  {x.avisado > 0 && <Pill clase="bg-sky-100 text-sky-700">Avisó que pagó {ctx.$(x.avisado)}</Pill>}
                </div>
              </div>
              {x.p.telefono ? (
                <button type="button" className={BTN_SECUNDARIO} disabled={x.recordado === hoy} onClick={() => recordar(x)}>
                  <MessageCircle className="size-4" />
                  {x.recordado === hoy ? "Recordado" : "Recordar"}
                </button>
              ) : (
                <span className="max-w-24 text-right text-[10px] text-muted-foreground">Sin WhatsApp cargado</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {lista.length > 0 && visibles.length === 0 && <p className="mt-3 text-xs text-muted-foreground">Nadie en este filtro.</p>}
    </div>
  );
}

/* ───────────── Recibo de pago (lindo, con el logo de la clínica) ───────────── */

export type Recibo = {
  numero: string;
  fecha: string;
  paciente: string;
  telefono: string;
  monto: number;
  medio: string;
  concepto: string;
  saldo: number;
  clinica: { nombre: string; direccion: string; telefono: string; logo: string; color: string; fiscal: string };
};

/** Arma el recibo con el número que sigue (se numeran solos por clínica). */
export function useNuevoRecibo() {
  const { clinic } = useCloudEsther();
  const settings = useClinicSettings(clinic);
  const { clinica: delaSesion } = useSesion();
  const real = useClinicaReal();
  return (d: Omit<Recibo, "numero" | "fecha" | "clinica">): Recibo => {
    const n = (storeFacturacion.leer().ultimoRecibo ?? 0) + 1;
    setFacturacion("ultimoRecibo", () => n);
    const dc = settings.datosClinica;
    return {
      ...d,
      numero: `R-${String(n).padStart(6, "0")}`,
      fecha: new Date().toISOString(),
      clinica: {
        nombre: dc.nombre || real?.sesion.clinica.nombre || delaSesion?.nombre || "Tu clínica",
        direccion: dc.direccion,
        telefono: dc.telefono,
        logo: settings.marca?.logo ?? "",
        color: /^#[0-9a-fA-F]{6}$/.test(settings.marca?.color ?? "") ? settings.marca!.color : "#7c3aed",
        fiscal: dc.identificacionFiscal,
      },
    };
  };
}

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

function htmlRecibo(r: Recibo, plata: (n: number) => string) {
  const c = r.clinica;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Recibo ${r.numero}</title>
<style>body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#1f1a33;margin:0;padding:28px}
.card{border:1px solid #ece7f8;border-radius:22px;overflow:hidden}.top{height:8px;background:linear-gradient(90deg,${c.color},#d946ef,#fcd34d)}
.in{padding:24px}.hd{display:flex;align-items:center;gap:14px}.logo{width:56px;height:56px;border-radius:14px;object-fit:contain;border:1px solid #eee}
.ini{width:56px;height:56px;border-radius:14px;background:${c.color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px}
h1{margin:0;font-size:20px}.sub{color:#6b6385;font-size:12px;margin-top:2px}.tag{display:inline-block;margin-top:18px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:800;color:${c.color}}
.monto{font-size:34px;font-weight:800;margin:4px 0 2px;color:#1f1a33}.fila{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #f1edfb;font-size:13px}
.fila span:first-child{color:#6b6385}.pie{margin-top:18px;font-size:11px;color:#8a83a3;text-align:center}.ok{color:#059669;font-weight:700}</style></head>
<body><div class="card"><div class="top"></div><div class="in">
<div class="hd">${c.logo ? `<img class="logo" src="${c.logo}">` : `<div class="ini">${esc(c.nombre.slice(0, 1).toUpperCase())}</div>`}
<div><h1>${esc(c.nombre)}</h1><div class="sub">${[c.direccion, c.telefono, c.fiscal].filter(Boolean).map(esc).join(" · ")}</div></div></div>
<div class="tag">Recibo de pago · ${r.numero}</div>
<div class="monto">${plata(r.monto)}</div>
<div class="sub">Recibimos de <b>${esc(r.paciente)}</b> el ${new Date(r.fecha).toLocaleDateString("es")} a las ${new Date(r.fecha).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}.</div>
<div style="margin-top:14px">
<div class="fila"><span>Concepto</span><span>${esc(r.concepto)}</span></div>
<div class="fila"><span>Medio de pago</span><span>${esc(r.medio)}</span></div>
<div class="fila"><span>Saldo pendiente</span><span>${r.saldo > 0 ? plata(r.saldo) : '<span class="ok">Al día ✓</span>'}</span></div>
</div>
<div class="pie">¡Gracias por tu pago! · Comprobante de pago, no válido como factura.</div>
</div></div></body></html>`;
}

function textoRecibo(r: Recibo, plata: (n: number) => string) {
  return [
    `Hola ${r.paciente.split(" ")[0]} 👋 ¡Gracias por tu pago!`,
    "",
    `🧾 Recibo ${r.numero} · ${r.clinica.nombre}`,
    `Monto: ${plata(r.monto)}`,
    `Concepto: ${r.concepto}`,
    `Medio: ${r.medio}`,
    `Fecha: ${new Date(r.fecha).toLocaleDateString("es")}`,
    r.saldo > 0 ? `Saldo pendiente: ${plata(r.saldo)}` : "Quedaste al día ✓",
  ].join("\n");
}

/** Después de cobrar: el recibo listo para mandar por WhatsApp (con el PDF en el celular) o descargar. */
export function ReciboModal({ recibo: r, plata, onClose }: { recibo: Recibo; plata: (n: number) => string; onClose: () => void }) {
  const [trabajando, setTrabajando] = useState(false);
  const archivo = `recibo-${r.numero}.pdf`;
  // El PDF se prepara apenas se abre: así «Mandar» lo comparte en el mismo toque (el celular lo exige)
  const [blob, setBlob] = useState<Blob | null>(null);
  useEffect(() => {
    let vivo = true;
    void pdfBlobDeHtml(htmlRecibo(r, plata), "a5").then((b) => vivo && setBlob(b));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- se arma una vez por recibo
  }, [r]);
  const porWhatsApp = () => {
    const numero = r.telefono ? telefonoInternacional(r.telefono) : "";
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(textoRecibo(r, plata))}`, "_blank", "noopener,noreferrer");
  };
  const compartir = () => {
    const file = blob ? new File([blob], archivo, { type: "application/pdf" }) : null;
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    if (file && nav.canShare?.({ files: [file] })) {
      navigator.share({ files: [file], text: textoRecibo(r, plata) }).catch((e: unknown) => {
        if (!(e instanceof DOMException && e.name === "AbortError")) porWhatsApp();
      });
    } else porWhatsApp();
  };
  const descargar = async () => {
    setTrabajando(true);
    try {
      const b = blob ?? (await pdfBlobDeHtml(htmlRecibo(r, plata), "a5"));
      if (b) descargarBlob(archivo, b);
    } finally {
      setTrabajando(false);
    }
  };
  return (
    <M titulo="Recibo listo" onClose={onClose}>
      <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-black/5">
        <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${r.clinica.color}, #d946ef, #fcd34d)` }} />
        <div className="p-4">
          <div className="flex items-center gap-3">
            {r.clinica.logo ? (
              <img src={r.clinica.logo} alt="" className="size-11 rounded-xl object-contain ring-1 ring-black/5" />
            ) : (
              <span className="grid size-11 place-items-center rounded-xl text-lg font-bold text-white" style={{ background: r.clinica.color }}>
                {r.clinica.nombre.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{r.clinica.nombre}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: r.clinica.color }}>
                Recibo {r.numero}
              </p>
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold tabular-nums">{plata(r.monto)}</p>
          <p className="text-xs text-muted-foreground">
            De <b className="text-foreground">{r.paciente}</b> · {r.medio}
          </p>
          <div className="mt-3 space-y-1 text-xs">
            <p className="flex justify-between border-b border-primary/10 pb-1">
              <span className="text-muted-foreground">Concepto</span>
              <span className="truncate pl-3">{r.concepto}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">Saldo pendiente</span>
              <span className={r.saldo > 0 ? "" : "font-semibold text-emerald-600"}>{r.saldo > 0 ? plata(r.saldo) : "Al día ✓"}</span>
            </p>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button type="button" className={BTN_SECUNDARIO} disabled={trabajando} onClick={() => void descargar()}>
          <Download className="size-4" /> PDF
        </button>
        <button type="button" className="btn-wa" onClick={compartir}>
          <IconoWhatsApp /> Mandar recibo
        </button>
      </div>
      <p className="mt-2 text-right text-[10px] text-muted-foreground">Desde el celular se manda el PDF; en la compu, el recibo en el mensaje.</p>
    </M>
  );
}
