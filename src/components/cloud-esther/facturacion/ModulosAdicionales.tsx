import { useState } from "react";

import {
  MODULES,
  ModuleIcon,
  PLANS,
  comprableEn,
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
     · Start (que no tiene Facturación) → la ve dentro de Configuración › Mi plan.
   El precio de cada módulo lo fija el Dueño en el panel administrativo (precios-modulos). */

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
  const comprables = MODULES.filter((m) => comprableEn(m, plan) && !m.maxPlan);
  if (!comprables.length) return null;
  const precioTexto = (id: string) => formatearPrecioModulo(precios[id] ?? null);
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
