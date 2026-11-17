import { useState } from "react";
import { CaraEsther } from "@/components/cloud-esther/esther-ai/CaraEsther";
import type { FormEvent } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Crown,
  Download,
  Landmark,
  Lock,
  Receipt,
  Repeat2,
  Rocket,
  ShieldCheck,
  Star,
  Wallet,
  Zap,
} from "lucide-react";
import { PlanCard } from "@/components/site/PlanCards";
import { plans as PLANES_SITIO, type Plan } from "@/lib/site-data";
import {
  MODULES,
  ModuleIcon,
  PLANS,
  comprableEn,
  useCloudEsther,
  type PlanId,
} from "@/lib/cloud-esther/data";
import {
  contratarModuloExtra,
  quitarModuloExtra,
  storeModulosExtra,
} from "@/lib/cloud-esther/modulos-extra-store";
import { DialogoCompraModulo } from "@/components/cloud-esther/facturacion/DialogoCompraModulo";
import { useSesion } from "@/lib/cloud-esther/auth-store";
import { useClinicaReal } from "@/lib/clinica/modo-clinica";
import {
  formatearPrecio,
  leerConfigPlanes,
} from "@/lib/cloud-esther/planes-config";
import {
  consecuenciasDe,
  direccionCambio,
} from "@/lib/cloud-esther/cambio-plan";
import { avisarModuloAdicional } from "@/lib/clinica/api";
import {
  setFacturacion,
  storeFacturacion,
  suscripcionEjemplo,
  type FacturaSuscripcion,
  type MedioSuscripcion,
  type Suscripcion,
} from "@/lib/cloud-esther/facturacion-store";
import {
  Acciones,
  BTN_PRIMARIO,
  BTN_SECUNDARIO,
  Encabezado,
  Field,
  INPUT,
  Modal as ModalBase,
  Pill,
  fecha,
  imprimirHTML,
} from "@/components/cloud-esther/rrhh/ui";

/* Ubicación: src/components/cloud-esther/facturacion/MiPlan.tsx
   La suscripción de la clínica a Cloud Esther: plan actual con el mismo diseño de la página de
   planes, facturas de Cloud Esther y pago (tarjeta, Mercado Pago o transferencia).
   Muestra solo el plan de la empresa; los precios e importes los informa el backend.
   TODO backend: pasarela de pago y facturación de la suscripción. */

const ORDEN: PlanId[] = ["inicial", "profesional", "avanzada", "grupo"];
/** La página pública usa nombres comerciales cortos; en la app se muestran los del plan. */
const NOMBRE_SITIO: Record<string, string> = {
  Start: PLANS.inicial.name,
  Pro: PLANS.profesional.name,
  Plus: PLANS.avanzada.name,
};
function planDelSitio(id: PlanId): Plan {
  const base = PLANES_SITIO[ORDEN.indexOf(id)] ?? PLANES_SITIO[0]!;
  return {
    ...base,
    name: PLANS[id].name,
    tagline: PLANS[id].audience,
    features: base.features.map((f) =>
      f.replace(/plan (Start|Pro|Plus)$/, (_, n: string) => `plan ${NOMBRE_SITIO[n] ?? n}`),
    ),
  };
}

function M(props: Parameters<typeof ModalBase>[0]) {
  return <ModalBase {...props} modulo="Mi plan" />;
}

function nombrePeriodo(periodo: string) {
  const [a = "2026", m = "1"] = periodo.split("-");
  const t = new Date(Number(a), Number(m) - 1, 1).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function useSuscripcion(): Suscripcion {
  return storeFacturacion.usar().suscripcion ?? suscripcionEjemplo();
}
function setSuscripcion(fn: (s: Suscripcion) => Suscripcion) {
  setFacturacion("suscripcion", (s) => fn(s ?? suscripcionEjemplo()));
}

/** Factura pendiente de la suscripción con el precio del plan activo. */
export function facturaPendiente(s: Suscripcion, plan: PlanId): FacturaSuscripcion | undefined {
  const f = s.facturas.find((x) => x.estado === "Pendiente");
  return f && { ...f, planId: plan };
}

function imprimirFactura(
  f: FacturaSuscripcion,
  cliente: { razonSocial: string; idFiscal: string },
) {
  imprimirHTML(
    `Factura ${f.numero}`,
    `<h1>Cloud Esther</h1><p>Cloud Esther S.A.S. · Software de gestión odontológica</p>
<div class="meta"><div><b>Factura A ${f.numero}</b><br>Fecha: ${fecha(f.fecha)}<br>Vence: ${fecha(f.vence)}</div>
<div><b>${cliente.razonSocial}</b><br>${cliente.idFiscal}</div></div>
<h2>Detalle</h2><table><tr><th>Concepto</th></tr>
<tr><td>Plan ${PLANS[f.planId].name} · ${f.ciclo === "Anual" ? "12 meses desde" : "período"} ${nombrePeriodo(f.periodo)}</td></tr></table>
<p>${f.estado === "Pagada" ? `Pagada el ${fecha(f.pagada ?? "")} con ${f.medio ?? ""}` : "Pendiente de pago"}</p>`,
  );
}

export function MiPlan({
  onToast,
  razonSocial,
  idFiscal,
}: {
  onToast: (m: string) => void;
  razonSocial: string;
  idFiscal: string;
}) {
  const { plan, planContratado } = useCloudEsther();
  const sus = useSuscripcion();
  const [pagar, setPagar] = useState<FacturaSuscripcion | null>(null);
  const [medio, setMedio] = useState(false);
  const pendiente = facturaPendiente(sus, plan);
  const pagadas = sus.facturas.filter((f) => f.estado === "Pagada");
  const info = PLANS[plan];
  const vencida = pendiente && pendiente.vence < new Date().toISOString().slice(0, 10);
  const proximo = new Date();
  proximo.setMonth(proximo.getMonth() + (sus.ciclo === "Anual" ? 12 : 1), 10);

  return (
    <div className="space-y-4">
      <Encabezado
        icon={Crown}
        titulo="Mi plan"
        descripcion="Tu suscripción a Cloud Esther: plan, facturas y pagos."
      />

      {/* Tarjeta de la suscripción */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-[#4c1d95] via-[#7c3aed] to-[#9333ea] p-5 text-white shadow-[0_25px_60px_-30px_rgba(88,28,135,0.7)] md:p-6">
        <div className="pointer-events-none absolute -left-16 -top-16 size-56 rounded-full bg-white/10 blur-[80px]" />
        <div className="pointer-events-none absolute -bottom-16 -right-10 size-56 rounded-full bg-white/10 blur-[80px]" />
        <div className="relative grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]">
                <Crown className="size-3.5" /> Tu suscripción
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${vencida ? "bg-rose-500/90" : pendiente ? "bg-amber-400/90 text-amber-950" : "bg-emerald-400/90 text-emerald-950"}`}
              >
                {vencida ? "Pago vencido" : pendiente ? "Pago pendiente" : "Al día"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold">
                {planContratado ? (
                  <>
                    <Lock className="size-3" /> Plan contratado
                  </>
                ) : (
                  <>
                    <CaraEsther className="size-3" /> Demo: el plan se cambia desde el menú
                  </>
                )}
              </span>
            </div>
            <h3 className="mt-4 text-3xl font-bold tracking-tight">{info.name}</h3>
            <p className="mt-1 text-sm text-white/80">
              {info.audience} · facturación {sus.ciclo.toLowerCase()}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[12px]">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/12 px-3 py-2">
                <CreditCard className="size-4" />
                {sus.medio ? sus.medio.detalle : "Sin medio de pago"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/12 px-3 py-2">
                <CalendarClock className="size-4" />
                {pendiente
                  ? `Vence ${fecha(pendiente.vence)}`
                  : `Próximo cobro ${fecha(proximo.toISOString())}`}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/12 px-3 py-2">
                <ShieldCheck className="size-4" />
                Débito automático {sus.debitoAutomatico ? "activo" : "desactivado"}
              </span>
            </div>
          </div>
          <div className="rounded-2xl bg-white/12 p-4 ring-1 ring-white/20 backdrop-blur">
            {pendiente ? (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">
                  A pagar · {nombrePeriodo(pendiente.periodo)}
                </p>
                <p className="mt-1 text-2xl font-bold tracking-tight">
                  {PLANS[pendiente.planId].name}
                </p>
                <p className="mt-1 text-[12px] text-white/75">
                  Factura {pendiente.numero} · vence {fecha(pendiente.vence)}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setPagar(pendiente)}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-primary shadow-lg shadow-black/10 transition hover:-translate-y-0.5"
                  >
                    <Wallet className="size-4" /> Pagar ahora
                  </button>
                  <button
                    type="button"
                    onClick={() => imprimirFactura(pendiente, { razonSocial, idFiscal })}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/15 px-4 text-sm font-semibold text-white hover:bg-white/25"
                  >
                    <Download className="size-4" /> Factura
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">
                  Estado de cuenta
                </p>
                <p className="mt-1 flex items-center gap-2 text-2xl font-bold">
                  <BadgeCheck className="size-6" /> Todo pagado
                </p>
                <p className="mt-1 text-[12px] text-white/75">
                  La próxima factura se emite el {fecha(proximo.toISOString())}.
                </p>
              </>
            )}
            <button
              type="button"
              onClick={() => setMedio(true)}
              className="mt-3 text-[12px] font-semibold text-white/90 underline-offset-2 hover:underline"
            >
              Cambiar medio de pago
            </button>
          </div>
        </div>
      </div>

      {/* El plan de la empresa, con el mismo diseño de la página de planes */}
      <div className="grid grid-cols-1 gap-4 pt-3 lg:grid-cols-[minmax(0,360px)_1fr]">
        <div className="grid grid-rows-[auto_auto_1fr_auto]">
          <PlanCard
            plan={planDelSitio(plan)}
            index={ORDEN.indexOf(plan)}
            actual
            cta={planContratado ? "Plan contratado" : "Plan del demo"}
          />
        </div>
        <div className="space-y-3">
          <div className="card-grad p-4">
            <p className="flex items-center gap-2 text-sm font-semibold tracking-[-0.01em]">
              <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                <Receipt className="size-3.5" />
              </span>
              Facturas de Cloud Esther
            </p>
            <ul className="scroll-sutil mt-3 max-h-[340px] space-y-2 overflow-y-auto pr-1">
              {[...(pendiente ? [pendiente] : []), ...[...pagadas].reverse()].map((f) => (
                <li
                  key={f.id}
                  className="flex flex-wrap items-center gap-3 rounded-2xl bg-card/90 px-3 py-2 ring-1 ring-primary/10 transition-all duration-200 hover:ring-primary/25"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Receipt className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {nombrePeriodo(f.periodo)}{" "}
                      <span className="font-normal text-muted-foreground">
                        · {PLANS[f.planId].name}
                      </span>
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      Factura A {f.numero} ·{" "}
                      {f.estado === "Pagada"
                        ? `pagada ${fecha(f.pagada ?? "")} · ${f.medio ?? ""}`
                        : `vence ${fecha(f.vence)}`}
                    </p>
                  </div>
                  <Pill
                    clase={
                      f.estado === "Pagada"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }
                  >
                    {f.estado}
                  </Pill>
                  {f.estado === "Pendiente" ? (
                    <button type="button" className={BTN_PRIMARIO} onClick={() => setPagar(f)}>
                      <Wallet className="size-4" /> Pagar
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={BTN_SECUNDARIO}
                      onClick={() => imprimirFactura(f, { razonSocial, idFiscal })}
                    >
                      <Download className="size-4" /> PDF
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {/* Medio de pago: tarjeta premium (como una tarjeta real) + débito automático */}
            <div className="relative overflow-hidden rounded-3xl border border-primary/12 bg-gradient-to-br from-card via-card to-primary/[0.05] p-4 shadow-[0_18px_40px_-30px_rgba(76,29,149,0.6)]">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-semibold tracking-[-0.01em]">
                  <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                    <CreditCard className="size-3.5" />
                  </span>
                  Medio de pago
                </p>
                <button
                  type="button"
                  onClick={() => setMedio(true)}
                  className="rounded-full border border-border/70 px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary/30 hover:text-primary"
                >
                  Cambiar
                </button>
              </div>
              <div className="relative mt-3 overflow-hidden rounded-2xl bg-gradient-to-br from-[#2e1065] via-[#6d28d9] to-[#c026d3] p-4 text-white shadow-[0_18px_36px_-18px_rgba(109,40,217,0.85)]">
                <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-white/15 blur-2xl" />
                <div aria-hidden className="pointer-events-none absolute -bottom-14 left-6 size-36 rounded-full bg-fuchsia-300/25 blur-2xl" />
                <div className="relative flex items-start justify-between">
                  <span className="h-6 w-8 rounded-md bg-gradient-to-br from-amber-200 via-amber-300 to-amber-500 shadow-inner" aria-hidden />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
                    {sus.medio?.tipo ?? "Sin medio"}
                  </span>
                </div>
                <p className="relative mt-4 truncate font-mono text-[15px] tracking-[0.12em]">
                  {sus.medio?.detalle ?? "Agregá uno para pagar más rápido"}
                </p>
                <p className="relative mt-1 text-[10.5px] uppercase tracking-[0.14em] text-white/65">{razonSocial}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={sus.debitoAutomatico}
                disabled={sus.medio?.tipo !== "Tarjeta"}
                onClick={() => {
                  const v = !sus.debitoAutomatico;
                  setSuscripcion((s2) => ({ ...s2, debitoAutomatico: v }));
                  onToast(v ? "Débito automático activado" : "Débito automático desactivado");
                }}
                className="mt-3 flex w-full items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/80 px-3 py-2.5 text-left transition hover:border-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>
                  <span className="block text-[13px] font-semibold">Débito automático</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {sus.medio?.tipo === "Tarjeta" ? "Se cobra solo el día de vencimiento" : "Disponible con tarjeta"}
                  </span>
                </span>
                <span
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${sus.debitoAutomatico ? "bg-gradient-to-r from-primary to-fuchsia-500" : "bg-muted-foreground/25"}`}
                >
                  <span className={`size-5 rounded-full bg-white shadow transition-transform ${sus.debitoAutomatico ? "translate-x-[22px]" : "translate-x-0.5"}`} />
                </span>
              </button>
            </div>

            {/* Datos de facturación */}
            <div className="relative overflow-hidden rounded-3xl border border-primary/12 bg-gradient-to-br from-card via-card to-fuchsia-500/[0.05] p-4 shadow-[0_18px_40px_-30px_rgba(76,29,149,0.6)]">
              <p className="flex items-center gap-2 text-sm font-semibold tracking-[-0.01em]">
                <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-sky-500 to-indigo-500 text-white">
                  <Building2 className="size-3.5" />
                </span>
                Datos de facturación
              </p>
              <dl className="mt-3 divide-y divide-border/60 rounded-2xl border border-border/60 bg-card/80">
                <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <dt className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Razón social</dt>
                  <dd className="truncate text-right text-[13px] font-medium">{razonSocial}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <dt className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Identificación fiscal</dt>
                  <dd className="truncate text-right font-mono text-[13px] tabular-nums">{idFiscal}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <dt className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Factura</dt>
                  <dd className="text-right text-[13px] font-medium">Tipo A · electrónica</dd>
                </div>
              </dl>
              <p className="mt-3 flex items-start gap-2 rounded-2xl bg-primary/[0.05] px-3 py-2 text-[11.5px] leading-relaxed text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />
                Cloud Esther te factura a los datos fiscales de la clínica (pestaña Datos fiscales).
              </p>
            </div>
          </div>
        </div>
      </div>

      <CambiarDePlan onToast={onToast} />

      <ModulosAdicionales onToast={onToast} />

      {pagar && (
        <M titulo={`Pagar ${nombrePeriodo(pagar.periodo)}`} onClose={() => setPagar(null)}>
          <PagoForm
            factura={pagar}
            sus={sus}
            onCancel={() => setPagar(null)}
            onPagado={(detalle, tipo, guardar) => {
              const hoy = new Date().toISOString().slice(0, 10);
              setSuscripcion((s) => ({
                ...s,
                ...(guardar ? { medio: { tipo, detalle } } : {}),
                ...(guardar && tipo === "Tarjeta" ? { debitoAutomatico: true } : {}),
                facturas: s.facturas.map((f) =>
                  f.id === pagar.id
                    ? {
                        ...f,
                        planId: pagar.planId,
                        ciclo: pagar.ciclo,
                        estado: "Pagada",
                        pagada: hoy,
                        medio: detalle,
                      }
                    : f,
                ),
              }));
              setPagar(null);
              onToast(
                tipo === "Transferencia"
                  ? "Transferencia informada: la factura quedó pagada"
                  : `Pago aprobado`,
              );
            }}
          />
        </M>
      )}
      {medio && (
        <M titulo="Medio de pago" onClose={() => setMedio(false)}>
          <MedioForm
            onCancel={() => setMedio(false)}
            onGuardar={(tipo, detalle) => {
              setSuscripcion((s) => ({
                ...s,
                medio: { tipo, detalle },
                debitoAutomatico: tipo === "Tarjeta" ? s.debitoAutomatico : false,
              }));
              setMedio(false);
              onToast("Medio de pago actualizado");
            }}
          />
        </M>
      )}
    </div>
  );
}

/* ───────────── Pago ───────────── */

const MEDIOS: { id: MedioSuscripcion; icon: typeof CreditCard; sub: string }[] = [
  { id: "Tarjeta", icon: CreditCard, sub: "Crédito o débito" },
  { id: "Mercado Pago", icon: Wallet, sub: "Dinero en cuenta o cuotas" },
  { id: "Transferencia", icon: Landmark, sub: "CBU / alias" },
];

function marcaTarjeta(n: string) {
  return /^4/.test(n)
    ? "Visa"
    : /^5[1-5]/.test(n)
      ? "Mastercard"
      : /^3[47]/.test(n)
        ? "Amex"
        : "Tarjeta";
}

/** Campos de tarjeta: solo se guardan la marca y los últimos 4 números. */
function useTarjeta() {
  const [numero, setNumero] = useState("");
  const [vto, setVto] = useState("");
  const [cvc, setCvc] = useState("");
  const [titular, setTitular] = useState("");
  const digitos = numero.replace(/\D/g, "");
  const error =
    digitos.length < 15
      ? "Ingresá el número de la tarjeta"
      : !/^(0[1-9]|1[0-2])\/\d{2}$/.test(vto)
        ? "Vencimiento con formato MM/AA"
        : cvc.replace(/\D/g, "").length < 3
          ? "Ingresá el código de seguridad"
          : !titular.trim()
            ? "Ingresá el nombre del titular"
            : "";
  const marca = marcaTarjeta(digitos);
  const detalle = `${marca} •••• ${digitos.slice(-4)}`;

  // Previsualización premium: una tarjeta real que se va completando mientras escribís.
  const numeroVista = digitos.padEnd(16, "•").slice(0, 16).replace(/(.{4})(?=.)/g, "$1 ");
  const preview = (
    <div
      className="relative overflow-hidden rounded-2xl p-5 text-white shadow-[0_22px_48px_-22px_rgba(76,29,149,0.85)]"
      style={{ background: "linear-gradient(135deg,#3b1673 0%,#7c3aed 55%,#a855f7 100%)" }}
    >
      <div className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-white/15 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-8 size-44 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex items-center justify-between">
        {/* Chip dorado + contactless */}
        <span className="flex items-center gap-2">
          <span className="h-7 w-10 rounded-md bg-gradient-to-br from-amber-200 via-yellow-300 to-amber-400 ring-1 ring-white/50" />
          {/* Símbolo contactless */}
          <svg viewBox="0 0 24 24" fill="none" className="size-4 text-white/70" aria-hidden>
            <path d="M8.5 7.5a7 7 0 0 1 0 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            <path d="M12 5a10 10 0 0 1 0 14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            <path d="M15.5 2.5a13 13 0 0 1 0 19" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </span>
        <span className="text-sm font-extrabold uppercase italic tracking-wide text-white/95">
          {marca !== "Tarjeta" ? marca : "Cloud Esther"}
        </span>
      </div>
      <p className="relative mt-5 font-mono text-[18px] tracking-[0.2em] [font-variant-numeric:tabular-nums]">
        {numeroVista}
      </p>
      <div className="relative mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <span className="block text-[8.5px] font-medium uppercase tracking-[0.18em] text-white/55">
            Titular
          </span>
          <span className="block truncate text-[13px] font-semibold uppercase tracking-wide">
            {titular || "Nombre Apellido"}
          </span>
        </div>
        <div className="shrink-0 text-right">
          <span className="block text-[8.5px] font-medium uppercase tracking-[0.18em] text-white/55">
            Vence
          </span>
          <span className="block text-[13px] font-semibold tabular-nums">{vto || "MM/AA"}</span>
        </div>
      </div>
    </div>
  );

  const campos = (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <Field label="Número de tarjeta">
          <input
            inputMode="numeric"
            autoComplete="cc-number"
            aria-label="Número de tarjeta"
            placeholder="4242 4242 4242 4242"
            value={numero}
            onChange={(e) =>
              setNumero(
                e.target.value
                  .replace(/\D/g, "")
                  .slice(0, 16)
                  .replace(/(\d{4})(?=\d)/g, "$1 "),
              )
            }
            className={INPUT}
          />
        </Field>
      </div>
      <Field label="Vencimiento">
        <input
          aria-label="Vencimiento"
          placeholder="MM/AA"
          autoComplete="cc-exp"
          value={vto}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, "").slice(0, 4);
            setVto(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
          }}
          className={INPUT}
        />
      </Field>
      <Field label="Código de seguridad">
        <input
          aria-label="Código de seguridad"
          inputMode="numeric"
          autoComplete="cc-csc"
          placeholder="123"
          value={cvc}
          onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
          className={INPUT}
        />
      </Field>
      <div className="col-span-2">
        <Field label="Titular">
          <input
            aria-label="Titular"
            autoComplete="cc-name"
            placeholder="Como figura en la tarjeta"
            value={titular}
            onChange={(e) => setTitular(e.target.value)}
            className={INPUT}
          />
        </Field>
      </div>
    </div>
  );
  return { error, detalle, campos, preview };
}

function ElegirMedio({
  valor,
  onChange,
}: {
  valor: MedioSuscripcion;
  onChange: (m: MedioSuscripcion) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Medio de pago">
      {MEDIOS.map((m) => {
        const activo = valor === m.id;
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={activo}
            onClick={() => onChange(m.id)}
            className={`group relative flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition-all duration-200 ${
              activo
                ? "border-primary bg-gradient-to-b from-primary/[0.1] to-fuchsia-500/[0.05] shadow-[0_12px_26px_-18px_rgba(124,58,237,0.9)] ring-2 ring-primary/25"
                : "border-primary/12 bg-white hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_10px_22px_-18px_rgba(124,58,237,0.6)]"
            }`}
          >
            {activo && (
              <CheckCircle2 className="absolute right-1.5 top-1.5 size-3.5 text-primary" />
            )}
            <span
              className={`grid size-9 place-items-center rounded-xl transition-colors ${
                activo
                  ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white"
                  : "bg-primary/10 text-primary group-hover:bg-primary/15"
              }`}
            >
              <m.icon className="size-4" />
            </span>
            <span className="text-[13px] font-semibold leading-tight">{m.id}</span>
            <span className="text-[10px] leading-tight text-muted-foreground">{m.sub}</span>
          </button>
        );
      })}
    </div>
  );
}

function PagoForm({
  factura,
  sus,
  onCancel,
  onPagado,
}: {
  factura: FacturaSuscripcion;
  sus: Suscripcion;
  onCancel: () => void;
  onPagado: (detalle: string, tipo: MedioSuscripcion, guardar: boolean) => void;
}) {
  const guardado = sus.medio;
  const [tipo, setTipo] = useState<MedioSuscripcion>(guardado?.tipo ?? "Tarjeta");
  const [usarGuardada, setUsarGuardada] = useState(guardado?.tipo === "Tarjeta");
  const [guardar, setGuardar] = useState(true);
  const [error, setError] = useState("");
  const [procesando, setProcesando] = useState(false);
  const tarjeta = useTarjeta();

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    let detalle = "";
    if (tipo === "Tarjeta") {
      if (usarGuardada && guardado?.tipo === "Tarjeta") detalle = guardado.detalle;
      else if (tarjeta.error) return setError(tarjeta.error);
      else detalle = tarjeta.detalle;
    } else detalle = tipo === "Mercado Pago" ? "Mercado Pago" : "Transferencia bancaria";
    setError("");
    setProcesando(true);
    window.setTimeout(
      () => onPagado(detalle, tipo, guardar && !(usarGuardada && tipo === "Tarjeta")),
      900,
    );
  };

  return (
    <form className="space-y-4" onSubmit={enviar}>
      <div className="rounded-2xl bg-primary/[0.05] p-3 text-sm ring-1 ring-primary/10">
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            Plan {PLANS[factura.planId].name} · {factura.ciclo}
          </span>
          <span className="font-semibold">Factura A {factura.numero}</span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          El importe lo informa Cloud Esther en la factura.
        </p>
      </div>
      <ElegirMedio valor={tipo} onChange={setTipo} />
      {tipo === "Tarjeta" &&
        (guardado?.tipo === "Tarjeta" && usarGuardada ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 text-sm ring-1 ring-primary/12">
            <span className="flex items-center gap-2">
              <CreditCard className="size-4 text-primary" />
              {guardado.detalle}
            </span>
            <button
              type="button"
              className="text-[12px] font-semibold text-primary hover:underline"
              onClick={() => setUsarGuardada(false)}
            >
              Usar otra tarjeta
            </button>
          </div>
        ) : (
          <>
            {tarjeta.preview}
            {tarjeta.campos}
            <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <input
                type="checkbox"
                checked={guardar}
                onChange={(e) => setGuardar(e.target.checked)}
                className="accent-[var(--primary)]"
              />
              Guardar la tarjeta y activar el débito automático
            </label>
          </>
        ))}
      {tipo === "Mercado Pago" && (
        <p className="rounded-xl bg-sky-50 px-3 py-2.5 text-[12px] text-sky-800 ring-1 ring-sky-100">
          Se abre el checkout de Mercado Pago para pagar con dinero en cuenta, tarjeta o cuotas.
        </p>
      )}
      {tipo === "Transferencia" && (
        <div className="rounded-xl bg-white px-3 py-2.5 text-[12px] ring-1 ring-primary/12">
          <p>
            Alias <b>cloudesther.pagos</b> · CBU <b>0170099220000067891234</b>
          </p>
          <p className="text-muted-foreground">
            Cloud Esther S.A.S. · Referencia: {factura.numero}
          </p>
        </div>
      )}
      {error && (tipo !== "Tarjeta" || tarjeta.error) && (
        <p className="text-[12px] font-medium text-rose-600">
          {tipo === "Tarjeta" ? tarjeta.error : error}
        </p>
      )}
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Lock className="size-3" /> Pago simulado para practicar: no se guardan los datos completos
        de la tarjeta.
      </p>
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className={BTN_SECUNDARIO} onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className={BTN_PRIMARIO} disabled={procesando}>
          <Wallet className="size-4" />
          {procesando
            ? "Procesando…"
            : tipo === "Transferencia"
              ? "Informar transferencia"
              : "Pagar"}
        </button>
      </div>
    </form>
  );
}

function MedioForm({
  onCancel,
  onGuardar,
}: {
  onCancel: () => void;
  onGuardar: (tipo: MedioSuscripcion, detalle: string) => void;
}) {
  const [tipo, setTipo] = useState<MedioSuscripcion>("Tarjeta");
  const [error, setError] = useState("");
  const tarjeta = useTarjeta();
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (tipo === "Tarjeta" && tarjeta.error) return setError(tarjeta.error);
        onGuardar(
          tipo,
          tipo === "Tarjeta"
            ? tarjeta.detalle
            : tipo === "Mercado Pago"
              ? "Mercado Pago"
              : "Transferencia bancaria",
        );
      }}
    >
      <ElegirMedio valor={tipo} onChange={setTipo} />
      {tipo === "Tarjeta" && (
        <>
          {tarjeta.preview}
          {tarjeta.campos}
        </>
      )}
      {error && (tipo !== "Tarjeta" || tarjeta.error) && (
        <p className="text-[12px] font-medium text-rose-600">
          {tipo === "Tarjeta" ? tarjeta.error : error}
        </p>
      )}
      <Acciones etiqueta="Guardar" onCancel={onCancel} />
    </form>
  );
}

/* ───────────── Cambiar de plan ───────────── */

/** Ícono y degradé por nivel de plan (de menor a mayor), para darle jerarquía visual. */
const TIER_PLAN: Record<PlanId, { Icono: typeof Crown; grad: string }> = {
  inicial: { Icono: Star, grad: "from-violet-300 to-violet-400" },
  profesional: { Icono: Zap, grad: "from-violet-400 to-violet-500" },
  avanzada: { Icono: Rocket, grad: "from-violet-500 to-fuchsia-500" },
  grupo: { Icono: Crown, grad: "from-[#5b21b6] to-[#7c3aed]" },
};

/** Degradé de marca para el plan actual (siempre violeta, nunca otro color). */
const GRAD_ACTUAL = "from-[#4c1d95] via-[#6d28d9] to-[#9333ea]";

/** Capacidad incluida (pacientes · usuarios · sucursales) como mini-stats; ∞ cuando no hay tope. */
function capacidadDe(id: PlanId) {
  const c = leerConfigPlanes()[id];
  const f = (n: number) => (Number.isFinite(n) ? n.toLocaleString("es-AR") : "∞");
  return [
    { n: f(c.pacientesActivos), l: "pacientes" },
    { n: f(c.usuariosInternos), l: "usuarios" },
    { n: f(c.sucursales), l: "sucursales" },
  ];
}

/** Cambiar de plan (subir o bajar). En el demo cambia al instante; en la clínica real lo gestiona
    el asesor de Cloud Esther. Siempre se muestran las consecuencias antes de confirmar. */
function CambiarDePlan({ onToast }: { onToast: (m: string) => void }) {
  const { plan, setPlan, planContratado } = useCloudEsther();
  const real = useClinicaReal();
  const [destino, setDestino] = useState<PlanId | null>(null);

  // En la clínica real solo el Administrador ve esta gestión.
  if (real && real.rol !== "admin") return null;

  const dir = destino ? direccionCambio(plan, destino) : 0;
  const consecuencias = destino ? consecuenciasDe(plan, destino) : [];

  const confirmar = () => {
    if (!destino) return;
    // Clínica real: el plan lo cambia el asesor desde el panel de Cloud Esther (no es self-service).
    if (planContratado) {
      onToast("Le avisamos a tu asesor de Cloud Esther que querés cambiar de plan.");
      setDestino(null);
      return;
    }
    setPlan(destino);
    onToast(`Cambiaste al plan ${PLANS[destino].name}.`);
    setDestino(null);
  };

  return (
    <div className="card-grad p-4">
      <div className="mb-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Repeat2 className="size-4 text-primary" /> Cambiar de plan
        </p>
        <p className="text-[12px] text-muted-foreground">
          {planContratado
            ? "Elegí el plan al que querés pasar y mirá qué cambia. El cambio lo gestiona tu asesor de Cloud Esther."
            : "Elegí el plan al que querés pasar y mirá qué cambia antes de confirmar."}
        </p>
      </div>

      <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {ORDEN.map((id) => {
          const actual = id === plan;
          const elegido = id === destino;
          const d = direccionCambio(plan, id);
          const { Icono, grad } = TIER_PLAN[id];
          const cfg = leerConfigPlanes()[id];
          const subtitulo =
            cfg.precioMensual !== null
              ? `${formatearPrecio(cfg.precioMensual)} /mes`
              : PLANS[id].audience;
          return (
            <li key={id}>
              <button
                type="button"
                disabled={actual}
                onClick={() => setDestino(elegido ? null : id)}
                className={`group relative flex w-full flex-col gap-3 overflow-hidden rounded-2xl p-3.5 text-left transition-all duration-200 ${
                  actual
                    ? `cursor-default bg-gradient-to-br ${GRAD_ACTUAL} text-white shadow-[0_18px_40px_-22px_rgba(76,29,149,0.9)]`
                    : elegido
                      ? "bg-white ring-2 ring-primary/40 shadow-[0_14px_30px_-20px_rgba(124,58,237,0.7)]"
                      : "bg-white ring-1 ring-primary/10 hover:-translate-y-0.5 hover:ring-primary/25 hover:shadow-[0_14px_28px_-20px_rgba(124,58,237,0.6)]"
                }`}
              >
                {actual && (
                  <span className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full bg-white/15 blur-2xl" />
                )}
                <div className="relative flex items-center gap-2.5">
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                      actual ? "bg-white/20 text-white" : `bg-gradient-to-br ${grad} text-white`
                    }`}
                  >
                    <Icono className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block text-[14px] font-bold leading-tight">{PLANS[id].name}</b>
                    <span
                      className={`block text-[11px] leading-tight ${actual ? "text-white/80" : "text-muted-foreground"}`}
                    >
                      {subtitulo}
                    </span>
                  </span>
                  {actual ? (
                    <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold">
                      Tu plan
                    </span>
                  ) : (
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${
                        d > 0
                          ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {d > 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                      {d > 0 ? "Subir" : "Bajar"}
                    </span>
                  )}
                </div>
                <div className="relative grid grid-cols-3 gap-1.5">
                  {capacidadDe(id).map((x) => (
                    <div
                      key={x.l}
                      className={`rounded-xl px-1.5 py-1.5 text-center ${actual ? "bg-white/12" : "bg-primary/[0.05]"}`}
                    >
                      <span
                        className={`block text-[12.5px] font-bold leading-none tabular-nums ${actual ? "text-white" : "text-foreground"}`}
                      >
                        {x.n}
                      </span>
                      <span
                        className={`mt-0.5 block text-[8.5px] font-medium uppercase tracking-wide ${actual ? "text-white/70" : "text-muted-foreground"}`}
                      >
                        {x.l}
                      </span>
                    </div>
                  ))}
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Consecuencias del cambio elegido: honesto, nunca borra datos. */}
      {destino && consecuencias.length > 0 && (
        <div
          className={`mt-3 rounded-2xl p-3 ring-1 ${
            dir < 0
              ? "bg-amber-500/10 ring-amber-500/30"
              : "bg-primary/[0.06] ring-primary/20"
          }`}
        >
          <p className="flex items-center gap-1.5 text-[12px] font-semibold">
            {dir < 0 ? (
              <AlertTriangle className="size-3.5 text-amber-600" />
            ) : (
              <ArrowUpRight className="size-3.5 text-primary" />
            )}
            {dir < 0 ? "Al bajar a" : "Al subir a"} {PLANS[destino].name}:
          </p>
          <ul className="mt-1.5 space-y-1">
            {consecuencias.map((t, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11.5px] text-muted-foreground">
                <span className="mt-1 size-1 shrink-0 rounded-full bg-current opacity-60" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={BTN_PRIMARIO} onClick={confirmar}>
              {planContratado ? "Solicitar cambio a mi asesor" : `Cambiar al plan ${PLANS[destino].name}`}
            </button>
            <button type="button" className={BTN_SECUNDARIO} onClick={() => setDestino(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────── Módulos adicionales ───────────── */

/** Start, Pro y Plus pueden sumar módulos que su plan no incluye (el precio lo informa el backend). */
function ModulosAdicionales({ onToast }: { onToast: (m: string) => void }) {
  const { plan, planContratado } = useCloudEsther();
  const { usuario } = useSesion();
  // Clínica real: solo el Administrador suma módulos (y el panel recibe el aviso para facturarlo)
  const real = useClinicaReal();
  const [guardando, setGuardando] = useState<string | null>(null);
  const [comprar, setComprar] = useState<(typeof MODULES)[number] | null>(null);
  const activos = storeModulosExtra.usar().activos;
  if (real && real.rol !== "admin") return null;
  const comprables = MODULES.filter((m) => comprableEn(m, plan) && !m.maxPlan);
  if (!comprables.length) return null;
  return (
    <div className="card-grad p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Módulos adicionales</p>
          <p className="text-[12px] text-muted-foreground">
            Sumá a tu plan {PLANS[plan].name} los módulos que necesites, sin cambiar de plan.
            {planContratado
              ? " El cargo se agrega a tu próxima factura de Cloud Esther."
              : " En el demo se activan al instante."}
          </p>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {activos.filter((a) => comprables.some((m) => m.id === a.id)).length} activos
        </span>
      </div>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-4">
        {comprables.map((m) => {
          const activo = activos.some((a) => a.id === m.id);
          return (
            <li
              key={m.id}
              className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 ring-1 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-20px_rgba(124,58,237,0.7)] ${activo ? "bg-gradient-to-br from-primary/[0.09] to-fuchsia-500/[0.06] ring-primary/30" : "bg-card/90 ring-primary/10 hover:ring-primary/25"}`}
            >
              <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${activo ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white" : "bg-primary/10 text-primary"}`}>
                <ModuleIcon name={m.icon} className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <b className="line-clamp-2 block text-[13px] font-semibold leading-snug" title={m.label}>{m.label}</b>
                <span className="text-[11px] text-muted-foreground">
                  {activo ? "Activo en tu plan" : `Incluido desde ${PLANS[m.minPlan].name}`}
                </span>
              </span>
              <button
                type="button"
                className={activo ? BTN_SECUNDARIO : BTN_PRIMARIO}
                disabled={guardando === m.id}
                onClick={async () => {
                  // Agregar: pedimos confirmación en una tarjeta antes de contratar.
                  if (!activo) {
                    setComprar(m);
                    return;
                  }
                  // Quitar: en la clínica real avisamos al panel de Cloud Esther primero.
                  if (real) {
                    setGuardando(m.id);
                    try {
                      await avisarModuloAdicional(real.slug, m.id, "quitar");
                    } catch (e) {
                      onToast(e instanceof Error ? e.message : "No se pudo avisar a Cloud Esther. Probá de nuevo.");
                      return;
                    } finally {
                      setGuardando(null);
                    }
                  }
                  quitarModuloExtra(m.id);
                  onToast(real ? `${m.label} quitado: le avisamos a Cloud Esther` : `${m.label} quitado de tu plan`);
                }}
              >
                {activo ? "Quitar" : "Agregar"}
              </button>
            </li>
          );
        })}
      </ul>

      <DialogoCompraModulo
        abierto={!!comprar}
        modulo={comprar}
        planContratado={planContratado}
        onCerrar={() => setComprar(null)}
        onConfirmar={async () => {
          const m = comprar;
          if (!m) return;
          // Clínica real: primero se avisa al panel de Cloud Esther (para facturarlo)
          if (real) {
            try {
              await avisarModuloAdicional(real.slug, m.id, "agregar");
            } catch (e) {
              onToast(e instanceof Error ? e.message : "No se pudo avisar a Cloud Esther. Probá de nuevo.");
              return;
            }
          }
          // Activa + registra (módulo, fecha, hora, usuario) + avisa a admin/socio/secretaría
          contratarModuloExtra(m.id, m.label, usuario?.nombre ?? "Administración");
          setComprar(null);
          onToast(
            real
              ? `${m.label} contratado: se suma a tu próxima factura de Cloud Esther`
              : `${m.label} contratado y activado en tu plan ${PLANS[plan].name}`,
          );
        }}
      />
    </div>
  );
}
