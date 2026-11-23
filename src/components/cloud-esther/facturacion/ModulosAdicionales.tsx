import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Box, Grid2x2 } from "lucide-react";

import {
  MODULES,
  ModuleIcon,
  PLANS,
  comprableEn,
  tres3DPorPlan,
  usa3D,
  useCloudEsther,
} from "@/lib/cloud-esther/data";
import {
  contratarModuloExtra,
  quitarModuloExtra,
  storeModulosExtra,
} from "@/lib/cloud-esther/modulos-extra-store";
import { usePreciosModulos, formatearPrecioModulo } from "@/lib/cloud-esther/precios-modulos";
import { useConfigPlanes } from "@/lib/cloud-esther/planes-config";
import { DialogoCompraModulo } from "@/components/cloud-esther/facturacion/DialogoCompraModulo";
import { useSesion } from "@/lib/cloud-esther/auth-store";
import { useClinicaReal } from "@/lib/clinica/modo-clinica";
import {
  avisarModuloAdicional,
  verModulosDeMiClinica,
  vistaPreviaModulo,
  type ModulosDeMiClinica,
  type VistaPreviaModulo,
} from "@/lib/clinica/api";
import { BTN_PRIMARIO, BTN_SECUNDARIO } from "@/components/cloud-esther/rrhh/ui";
import { CapacidadDeMiPlan } from "@/components/clinica/pedir-capacidad";

const usd = (n: number) => `USD ${n.toLocaleString("es-AR", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const dia = (iso: string) => new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });

/** «Tu próxima factura»: plan + módulos adicionales + capacidad extra (clínica real). */
function ProximaFactura({ datos }: { datos: ModulosDeMiClinica }) {
  const cada = datos.ciclo === "anual" ? "por año" : "por mes";
  const extras = datos.activos;
  const totalExtras = extras.reduce((t, a) => t + a.importe, 0);
  // El importe del plan que carga Cloud Esther es mensual: se suma solo si el plan se paga por mes
  const plan = datos.ciclo === "mensual" && datos.planMensual != null ? datos.planMensual : null;
  if (!extras.length && plan === null) return null;
  return (
    <div className="card-grad p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">Tu próxima factura</p>
        {datos.proximoCobro && <span className="text-[12px] text-muted-foreground">{dia(datos.proximoCobro)}</span>}
      </div>
      <ul className="mt-2 divide-y divide-border/60 text-[13px]">
        {plan !== null && (
          <li className="flex justify-between gap-3 py-1.5">
            <span>Tu plan</span>
            <b>{usd(plan)}</b>
          </li>
        )}
        {extras.map((a) => (
          <li key={a.modulo} className="flex justify-between gap-3 py-1.5">
            <span className="min-w-0 truncate">{a.nombre}</span>
            <b className="shrink-0">{usd(a.importe)}</b>
          </li>
        ))}
      </ul>
      <p className="mt-2 flex justify-between gap-3 border-t border-primary/15 pt-2 text-sm">
        <span className="font-semibold">{plan !== null ? "Total" : "Adicionales"} {cada}</span>
        <b className="text-primary">{usd((plan ?? 0) + totalExtras)}</b>
      </p>
      <p className="mt-1 text-[11.5px] text-muted-foreground">
        {datos.cobroAutomatico
          ? "Se cobra solo con tu tarjeta. Lo que agregues hoy entra en esta factura (proporcional a los días que lo uses). "
          : "Cloud Esther te la envía con todo lo que tengas activo ese día. "}
        Precios sin impuestos.
      </p>
    </div>
  );
}

/* Ubicación: src/components/cloud-esther/facturacion/ModulosAdicionales.tsx
   Tarjeta «Módulos adicionales»: Start, Pro y Plus pueden sumar módulos que su plan no incluye.
   Es la MISMA tarjeta en dos lugares (todo conectado):
     · Pro/Plus/Enterprise → la ven dentro de Facturación › Mi plan.
     · Todos los planes → también en Configuración › Mi plan.
   El odontograma va como un INTERRUPTOR 2D/3D (al pasar a 3D se va el 2D y queda el 3D, en el
   odontograma y en el periodontograma); el resto de los módulos van con botón «Agregar».
   El precio de cada módulo lo fija el Dueño en el panel administrativo (precios-modulos). */

/* ───────────── Precios para MI clínica (clínica real) ─────────────
   El servidor dice el ciclo de la clínica (mensual/anual) y el precio de cada módulo para ella
   (anual = mensual × 12 con el descuento anual de su plan). En el demo se usa el precio mensual. */
let cacheMios: { slug: string; datos: ModulosDeMiClinica } | null = null;
const oyentesMios = new Set<() => void>();
function useModulosDeMiClinica(slug: string | null) {
  const [datos, setDatos] = useState<ModulosDeMiClinica | null>(
    slug && cacheMios?.slug === slug ? cacheMios.datos : null,
  );
  const recargar = useCallback(async () => {
    if (!slug) return;
    try {
      const d = await verModulosDeMiClinica(slug);
      cacheMios = { slug, datos: d };
      oyentesMios.forEach((o) => o());
    } catch {
      /* sin conexión: se muestran los precios mensuales */
    }
  }, [slug]);
  useEffect(() => {
    if (!slug) return;
    const o = () => setDatos(cacheMios?.slug === slug ? cacheMios.datos : null);
    oyentesMios.add(o);
    if (!cacheMios || cacheMios.slug !== slug) void recargar();
    return () => {
      oyentesMios.delete(o);
    };
  }, [slug, recargar]);
  return { datos, recargar };
}

/** Texto del precio para esta clínica: «USD 204 / año» o «USD 20 / mes». */
export function usePrecioTexto(slug: string | null) {
  const precios = usePreciosModulos();
  const { datos, recargar } = useModulosDeMiClinica(slug);
  const texto = (id: string) =>
    datos
      ? formatearPrecioModulo(datos.precios[id]?.porPeriodo ?? null, datos.ciclo)
      : formatearPrecioModulo(precios[id] ?? null);
  return { texto, datos, recargar };
}

/* ───────────── Interruptor Odontograma 2D ⇄ 3D ───────────── */

/** Start/Pro: pasar del odontograma 2D al 3D (y volver). Al pasar a 3D se va el 2D y queda el 3D
    en el odontograma y en el periodontograma. En Plus/Enterprise no se muestra (el 3D viene por
    plan y no se cambia). El 3D se cobra en la próxima factura (en el demo se activa al instante). */
function OdontogramaSwitch({ onToast }: { onToast: (m: string) => void }) {
  const { plan, planContratado } = useCloudEsther();
  const { usuario } = useSesion();
  const real = useClinicaReal();
  const { texto: precioDe, recargar } = usePrecioTexto(real?.slug ?? null);
  storeModulosExtra.usar(); // reacciona al instante al contratar/quitar el 3D
  const [cambiando, setCambiando] = useState(false);
  if (real && real.rol !== "admin") return null;
  if (tres3DPorPlan(plan)) return null; // Plus/Enterprise: el 3D viene por plan
  const es3D = usa3D(plan);
  const precio = precioDe("odontograma3d");

  const pasarA3D = async () => {
    if (es3D || cambiando) return;
    setCambiando(true);
    try {
      if (real) {
        if (!precio) {
          onToast("El Odontograma 3D todavía no tiene precio publicado. Escribinos y un asesor te pasa la propuesta.");
          return;
        }
        await avisarModuloAdicional(real.slug, "odontograma3d", "agregar");
        void recargar();
      }
      contratarModuloExtra("odontograma3d", "Odontograma 3D", usuario?.nombre ?? "Administración");
      onToast(
        real
          ? "Odontograma y periodontograma en 3D: se suma a tu próxima factura"
          : "Odontograma y periodontograma ahora en 3D",
      );
    } catch (e) {
      onToast(e instanceof Error ? e.message : "No se pudo cambiar a 3D. Probá de nuevo.");
    } finally {
      setCambiando(false);
    }
  };

  const volverA2D = async () => {
    if (!es3D || cambiando) return;
    setCambiando(true);
    try {
      if (real) {
        await avisarModuloAdicional(real.slug, "odontograma3d", "quitar");
        void recargar();
      }
      quitarModuloExtra("odontograma3d");
      onToast(
        real
          ? "Volviste al odontograma 2D: le avisamos a Cloud Esther"
          : "Odontograma y periodontograma ahora en 2D",
      );
    } catch (e) {
      onToast(e instanceof Error ? e.message : "No se pudo cambiar a 2D. Probá de nuevo.");
    } finally {
      setCambiando(false);
    }
  };

  const Opcion = ({
    activo,
    icono,
    titulo,
    sub,
    onClick,
  }: {
    activo: boolean;
    icono: ReactNode;
    titulo: string;
    sub: string;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={activo || cambiando}
      aria-pressed={activo}
      className={`flex flex-1 items-center gap-3 rounded-2xl px-3 py-2.5 text-left ring-1 transition-all ${
        activo
          ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white ring-transparent shadow-[0_14px_28px_-16px_rgba(124,58,237,0.9)]"
          : "bg-card/90 text-foreground ring-primary/15 hover:-translate-y-0.5 hover:ring-primary/30 disabled:opacity-100"
      }`}
    >
      <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${activo ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`}>
        {icono}
      </span>
      <span className="min-w-0">
        <b className="block text-[13px] font-semibold leading-snug">{titulo}</b>
        <span className={`block text-[11px] ${activo ? "text-white/85" : "text-muted-foreground"}`}>{sub}</span>
      </span>
      {activo && <span className="ml-auto text-[11px] font-bold uppercase tracking-wide">Activo</span>}
    </button>
  );

  return (
    <div className="card-grad p-4">
      <div className="mb-3">
        <p className="text-sm font-semibold">Odontograma</p>
        <p className="text-[12px] text-muted-foreground">
          Elegí cómo trabajás el odontograma y el periodontograma. Al pasar a 3D, el 2D se reemplaza
          automáticamente por el 3D.
          {precio && !es3D ? ` Pasar a 3D: ${precio}.` : ""}
          {planContratado ? " El cargo se agrega a tu próxima factura." : " En el demo se cambia al instante."}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Opcion
          activo={!es3D}
          icono={<Grid2x2 className="size-4" />}
          titulo="Odontograma 2D"
          sub="Incluido en tu plan"
          onClick={volverA2D}
        />
        <Opcion
          activo={es3D}
          icono={<Box className="size-4" />}
          titulo="Odontograma 3D"
          sub={es3D ? "Boca 3D activa" : precio ? `Sumar · ${precio}` : "Sumar a tu plan"}
          onClick={pasarA3D}
        />
      </div>
    </div>
  );
}

/* ───────────── Módulos adicionales ───────────── */

/** Start, Pro y Plus pueden sumar módulos que su plan no incluye (el precio lo informa el panel). */
export function ModulosAdicionales({ onToast }: { onToast: (m: string) => void }) {
  const { plan, planContratado } = useCloudEsther();
  const { usuario } = useSesion();
  // Clínica real: solo el Administrador suma módulos (y el panel recibe el aviso para facturarlo)
  const real = useClinicaReal();
  const { texto: precioDe, datos: mios, recargar } = usePrecioTexto(real?.slug ?? null);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [comprar, setComprar] = useState<(typeof MODULES)[number] | null>(null);
  const [detalle, setDetalle] = useState<VistaPreviaModulo | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);
  // Al abrir la compra en la clínica real: el servidor calcula el precio para su ciclo y lo de hoy
  useEffect(() => {
    setDetalle(null);
    setErrorDetalle(null);
    if (!comprar || !real) return;
    let vivo = true;
    setCargandoDetalle(true);
    vistaPreviaModulo(real.slug, comprar.id)
      .then((d) => vivo && setDetalle(d))
      .catch((e: unknown) => vivo && setErrorDetalle(e instanceof Error ? e.message : "No se pudo calcular el precio."))
      .finally(() => vivo && setCargandoDetalle(false));
    return () => {
      vivo = false;
    };
  }, [comprar, real?.slug]);
  const activos = storeModulosExtra.usar().activos;
  // Demo: «Tu próxima factura» con el precio del plan (Planes y precios) y los adicionales que sume
  const configPlanes = useConfigPlanes();
  const preciosDemo = usePreciosModulos();
  if (real && real.rol !== "admin") return null;
  const facturaDemo: ModulosDeMiClinica | null = real
    ? null
    : {
        ciclo: "mensual",
        descuentoAnual: 0,
        cobroAutomatico: true,
        proximoCobro: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
        planMensual: configPlanes[plan]?.precioMensual ?? null,
        precios: {},
        activos: activos.map((a) => ({
          modulo: a.id,
          nombre: MODULES.find((m) => m.id === a.id)?.label ?? a.id,
          importe: preciosDemo[a.id] ?? 0,
          ciclo: "mensual" as const,
          desde: a.desde,
          cobro: "paddle" as const,
        })),
      };
  // El odontograma 3D NO va en la grilla: tiene su propio interruptor 2D/3D arriba.
  const comprables = MODULES.filter(
    (m) => comprableEn(m, plan) && !m.maxPlan && m.id !== "odontograma3d",
  );
  const haySwitch = !tres3DPorPlan(plan);
  const precioTexto = precioDe;
  // Demo y clínica real muestran lo mismo: en el demo, los datos salen de la factura simulada.
  const datos = mios ?? facturaDemo;
  const cadaTexto = datos?.ciclo === "anual" ? "por año" : "por mes";
  const totalModulos = datos?.activos.reduce((t, a) => t + a.importe, 0) ?? 0;
  return (
    <div className="space-y-4">
      {(mios ?? facturaDemo) && <ProximaFactura datos={(mios ?? facturaDemo)!} />}

      {haySwitch && <OdontogramaSwitch onToast={onToast} />}

      {comprables.length > 0 && (
        <div className="card-grad p-4">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">Módulos adicionales</p>
              <p className="text-[12px] text-muted-foreground">
                Sumá a tu plan {PLANS[plan].name} los módulos que necesites, sin cambiar de plan.
                {!planContratado
                  ? " En el demo se activan al instante."
                  : mios?.cobroAutomatico
                    ? " Se activan al instante y van en tu próxima factura (cobro automático con tu tarjeta); después se renuevan con tu plan."
                    : " Se activan al instante y el cargo se agrega a tu próxima factura de Cloud Esther."}
                {datos && (
                  <>
                    {" "}
                    Tu plan es <b>{datos.ciclo === "anual" ? "anual" : "mensual"}</b>, así que los precios son {cadaTexto}
                    {datos.ciclo === "anual" && datos.descuentoAnual > 0
                      ? ` (con ${Math.round(datos.descuentoAnual * 100)} % de descuento anual)`
                      : ""}
                    . Precios sin impuestos.
                  </>
                )}
              </p>
              {datos && datos.activos.length > 0 && totalModulos > 0 && (
                <p className="mt-1 text-[12px] font-semibold text-primary">
                  Hoy pagás por módulos adicionales: USD {totalModulos.toFixed(totalModulos % 1 ? 2 : 0)} {cadaTexto}
                </p>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground">
              {activos.filter((a) => comprables.some((m) => m.id === a.id)).length} activos
            </span>
          </div>
          <ul data-movil="1col" className="grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-4">
            {comprables.map((m) => {
              const activo = activos.some((a) => a.id === m.id);
              const precio = precioTexto(m.id);
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
                    <span className="block text-[11px] text-muted-foreground">
                      {activo ? "Activo en tu plan" : `Incluido desde ${PLANS[m.minPlan].name}`}
                    </span>
                    {!activo && precio && (
                      <span className="mt-0.5 block text-[11px] font-semibold text-primary">{precio}</span>
                    )}
                    {!activo && !precio && real && (
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">Precio a consultar</span>
                    )}
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
                          void recargar();
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
        </div>
      )}

      <CapacidadDeMiPlan onToast={onToast} alCambiar={() => void recargar()} />

      <DialogoCompraModulo
        abierto={!!comprar}
        modulo={comprar}
        precio={comprar ? precioTexto(comprar.id) : undefined}
        planContratado={planContratado}
        detalle={detalle}
        cargandoDetalle={cargandoDetalle}
        errorDetalle={errorDetalle}
        onCerrar={() => setComprar(null)}
        onConfirmar={async () => {
          const m = comprar;
          if (!m) return;
          // Clínica real: primero se avisa al panel de Cloud Esther (para facturarlo)
          let cobro: "paddle" | "manual" | undefined;
          if (real) {
            try {
              cobro = (await avisarModuloAdicional(real.slug, m.id, "agregar"))?.cobro;
              void recargar();
            } catch (e) {
              onToast(e instanceof Error ? e.message : "No se pudo avisar a Cloud Esther. Probá de nuevo.");
              return;
            }
          }
          // Activa + registra (módulo, fecha, hora, usuario) + avisa a admin/socio/secretaría
          contratarModuloExtra(m.id, m.label, usuario?.nombre ?? "Administración");
          setComprar(null);
          onToast(
            !real
              ? `${m.label} contratado y activado en tu plan ${PLANS[plan].name}`
              : cobro === "paddle"
                ? `${m.label} contratado: va en tu próxima factura`
                : `${m.label} contratado: se suma a tu próxima factura de Cloud Esther`,
          );
        }}
      />
    </div>
  );
}
