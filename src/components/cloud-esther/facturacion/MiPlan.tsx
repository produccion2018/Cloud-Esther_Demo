import { useState } from "react";
import type { FormEvent } from "react";
import {
  BadgeCheck,
  Building2,
  CalendarClock,
  CreditCard,
  Crown,
  Download,
  Landmark,
  Lock,
  Receipt,
  ShieldCheck,
  Sparkles,
  Wallet,
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
  agregarModuloExtra,
  quitarModuloExtra,
  storeModulosExtra,
} from "@/lib/cloud-esther/modulos-extra-store";
import { useSesion } from "@/lib/cloud-esther/auth-store";
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
                    <Sparkles className="size-3" /> Demo: el plan se cambia desde el menú
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
            <p className="text-sm font-semibold">Facturas de Cloud Esther</p>
            <ul className="scroll-sutil mt-3 max-h-[340px] space-y-2 overflow-y-auto pr-1">
              {[...(pendiente ? [pendiente] : []), ...[...pagadas].reverse()].map((f) => (
                <li
                  key={f.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl bg-white/85 px-3 py-2 ring-1 ring-primary/10"
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
            <div className="card-grad p-4">
              <p className="text-sm font-semibold">Medio de pago</p>
              <div className="mt-3 flex items-center gap-3 rounded-xl bg-white/85 px-3 py-2.5 ring-1 ring-primary/10">
                <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  {sus.medio?.tipo === "Transferencia" ? (
                    <Landmark className="size-4" />
                  ) : (
                    <CreditCard className="size-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {sus.medio?.detalle ?? "Sin medio de pago"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {sus.medio?.tipo ?? "Agregá uno para pagar más rápido"}
                  </p>
                </div>
                <button type="button" className={BTN_SECUNDARIO} onClick={() => setMedio(true)}>
                  Cambiar
                </button>
              </div>
              <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-white/85 px-3 py-2.5 text-sm ring-1 ring-primary/10">
                <span>
                  <b className="block text-[13px]">Débito automático</b>
                  <span className="text-[11px] text-muted-foreground">
                    Se cobra solo el día de vencimiento
                  </span>
                </span>
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--primary)]"
                  checked={sus.debitoAutomatico}
                  disabled={sus.medio?.tipo !== "Tarjeta"}
                  onChange={(e) => {
                    const v = e.target.checked;
                    setSuscripcion((s) => ({ ...s, debitoAutomatico: v }));
                    onToast(v ? "Débito automático activado" : "Débito automático desactivado");
                  }}
                />
              </label>
            </div>
            <div className="card-grad p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Building2 className="size-4 text-primary" /> Datos de facturación
              </p>
              <p className="mt-2 text-sm">{razonSocial}</p>
              <p className="text-[12px] text-muted-foreground">{idFiscal}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Cloud Esther te factura a los datos fiscales de la clínica (pestaña Datos fiscales).
              </p>
            </div>
          </div>
        </div>
      </div>

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
  const detalle = `${marcaTarjeta(digitos)} •••• ${digitos.slice(-4)}`;
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
  return { error, detalle, campos };
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
      {MEDIOS.map((m) => (
        <button
          key={m.id}
          type="button"
          role="radio"
          aria-checked={valor === m.id}
          onClick={() => onChange(m.id)}
          className={`flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-all ${valor === m.id ? "border-primary bg-primary/[0.06] ring-2 ring-primary/20" : "border-primary/12 bg-white hover:border-primary/30"}`}
        >
          <m.icon className="size-4 text-primary" />
          <span className="text-[13px] font-semibold">{m.id}</span>
          <span className="text-[10.5px] text-muted-foreground">{m.sub}</span>
        </button>
      ))}
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
      {tipo === "Tarjeta" && tarjeta.campos}
      {error && (tipo !== "Tarjeta" || tarjeta.error) && (
        <p className="text-[12px] font-medium text-rose-600">
          {tipo === "Tarjeta" ? tarjeta.error : error}
        </p>
      )}
      <Acciones etiqueta="Guardar" onCancel={onCancel} />
    </form>
  );
}

/* ───────────── Módulos adicionales ───────────── */

/** Start, Pro y Plus pueden sumar módulos que su plan no incluye (el precio lo informa el backend). */
function ModulosAdicionales({ onToast }: { onToast: (m: string) => void }) {
  const { plan, planContratado } = useCloudEsther();
  const { usuario } = useSesion();
  const activos = storeModulosExtra.usar().activos;
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
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {comprables.map((m) => {
          const activo = activos.some((a) => a.id === m.id);
          return (
            <li
              key={m.id}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ring-1 ${activo ? "bg-primary/[0.07] ring-primary/30" : "bg-white/85 ring-primary/10"}`}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <ModuleIcon name={m.icon} className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[13px]">{m.label}</b>
                <span className="text-[11px] text-muted-foreground">
                  {activo ? "Activo en tu plan" : `Incluido desde ${PLANS[m.minPlan].name}`}
                </span>
              </span>
              <button
                type="button"
                className={activo ? BTN_SECUNDARIO : BTN_PRIMARIO}
                onClick={() => {
                  if (activo) {
                    quitarModuloExtra(m.id);
                    onToast(`${m.label} quitado de tu plan`);
                  } else {
                    agregarModuloExtra(m.id, usuario?.nombre ?? "Administración");
                    onToast(`${m.label} agregado a tu plan ${PLANS[plan].name}`);
                  }
                }}
              >
                {activo ? "Quitar" : "Agregar"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
