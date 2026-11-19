import { useState, type ReactNode } from "react";
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
import { DialogoCompraModulo } from "@/components/cloud-esther/facturacion/DialogoCompraModulo";
import { useSesion } from "@/lib/cloud-esther/auth-store";
import { useClinicaReal } from "@/lib/clinica/modo-clinica";
import { avisarModuloAdicional } from "@/lib/clinica/api";
import { BTN_PRIMARIO, BTN_SECUNDARIO } from "@/components/cloud-esther/rrhh/ui";

/* Ubicación: src/components/cloud-esther/facturacion/ModulosAdicionales.tsx
   Tarjeta «Módulos adicionales»: Start, Pro y Plus pueden sumar módulos que su plan no incluye.
   Es la MISMA tarjeta en dos lugares (todo conectado):
     · Pro/Plus/Enterprise → la ven dentro de Facturación › Mi plan.
     · Todos los planes → también en Configuración › Mi plan.
   El odontograma va como un INTERRUPTOR 2D/3D (al pasar a 3D se va el 2D y queda el 3D, en el
   odontograma y en el periodontograma); el resto de los módulos van con botón «Agregar».
   El precio de cada módulo lo fija el Dueño en el panel administrativo (precios-modulos). */

/* ───────────── Interruptor Odontograma 2D ⇄ 3D ───────────── */

/** Start/Pro: pasar del odontograma 2D al 3D (y volver). Al pasar a 3D se va el 2D y queda el 3D
    en el odontograma y en el periodontograma. En Plus/Enterprise no se muestra (el 3D viene por
    plan y no se cambia). El 3D se cobra en la próxima factura (en el demo se activa al instante). */
function OdontogramaSwitch({ onToast }: { onToast: (m: string) => void }) {
  const { plan, planContratado } = useCloudEsther();
  const { usuario } = useSesion();
  const real = useClinicaReal();
  const precios = usePreciosModulos();
  storeModulosExtra.usar(); // reacciona al instante al contratar/quitar el 3D
  const [cambiando, setCambiando] = useState(false);
  if (real && real.rol !== "admin") return null;
  if (tres3DPorPlan(plan)) return null; // Plus/Enterprise: el 3D viene por plan
  const es3D = usa3D(plan);
  const precio = formatearPrecioModulo(precios["odontograma3d"] ?? null);

  const pasarA3D = async () => {
    if (es3D || cambiando) return;
    setCambiando(true);
    try {
      if (real) await avisarModuloAdicional(real.slug, "odontograma3d", "agregar");
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
      if (real) await avisarModuloAdicional(real.slug, "odontograma3d", "quitar");
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
  const precios = usePreciosModulos();
  const [guardando, setGuardando] = useState<string | null>(null);
  const [comprar, setComprar] = useState<(typeof MODULES)[number] | null>(null);
  const activos = storeModulosExtra.usar().activos;
  if (real && real.rol !== "admin") return null;
  // El odontograma 3D NO va en la grilla: tiene su propio interruptor 2D/3D arriba.
  const comprables = MODULES.filter(
    (m) => comprableEn(m, plan) && !m.maxPlan && m.id !== "odontograma3d",
  );
  const haySwitch = !tres3DPorPlan(plan);
  if (!comprables.length && !haySwitch) return null;
  const precioTexto = (id: string) => formatearPrecioModulo(precios[id] ?? null);
  return (
    <div className="space-y-4">
      <OdontogramaSwitch onToast={onToast} />

      {comprables.length > 0 && (
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
        </div>
      )}

      <DialogoCompraModulo
        abierto={!!comprar}
        modulo={comprar}
        precio={comprar ? precioTexto(comprar.id) : undefined}
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
