import { useState } from "react";

import { Cargando, Seccion, Vacio } from "@/components/admin/bits";
import { Pestanas, Pildora } from "@/components/admin/formularios";
import { permisos, useRole } from "@/components/admin/role";
import { CON_BACKEND } from "@/lib/admin/api";
import { useFacturacion } from "@/lib/admin/consultas";
import { NOMBRE_PLAN, fecha } from "@/lib/admin/formato";

/* Ubicación: src/components/admin/facturacion-en-linea.tsx
   FACTURACIÓN EN LÍNEA (Paddle): cobros (alta y renovaciones) con importe sin impuestos, impuestos y
   total; suscripciones con su estado y próxima renovación; reembolsos. Solo Dueño y Socio (importes).
   Los datos llegan solos con los avisos firmados de Paddle: acá no se edita nada. */

const ESTADO_SUSCRIPCION: Record<string, { texto: string; tono: "ok" | "alerta" | "peligro" | "neutro" }> = {
  activa: { texto: "Activa", tono: "ok" },
  pendiente: { texto: "Pendiente", tono: "neutro" },
  gracia: { texto: "Pago rechazado · en gracia", tono: "alerta" },
  pago_rechazado: { texto: "Pago rechazado", tono: "peligro" },
  vencida: { texto: "Vencida", tono: "peligro" },
  suspendida: { texto: "Suspendida", tono: "peligro" },
  cancelada: { texto: "Cancelada", tono: "neutro" },
};
const ESTADO_PAGO: Record<string, { texto: string; tono: "ok" | "alerta" | "peligro" | "neutro" }> = {
  pagado: { texto: "Pagado", tono: "ok" },
  fallido: { texto: "Rechazado", tono: "peligro" },
  vencido: { texto: "Vencido", tono: "alerta" },
};
const TIPO_PAGO: Record<string, string> = { alta: "Alta (inicial + 1.er período)", renovacion: "Renovación", otro: "Otro" };

const dinero = (moneda: string, n: number) =>
  `${moneda} ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TH = "px-3 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground";
const TD = "px-3 py-2.5 text-sm";

export function FacturacionEnLinea() {
  const { role } = useRole();
  const puede = CON_BACKEND && permisos.verImportes(role);
  const { data, isLoading } = useFacturacion(puede);
  const [vista, setVista] = useState<"pagos" | "suscripciones" | "ajustes">("pagos");
  if (!puede) return null;

  return (
    <Seccion
      titulo="Facturación en línea (Paddle)"
      descripcion={
        data && !data.pagosEnLinea
          ? "El pago en línea está apagado en el servidor (faltan las llaves de Paddle)."
          : "Cobros, impuestos, renovaciones y reembolsos confirmados por Paddle. Se actualiza solo."
      }
      acciones={
        <Pestanas
          valor={vista}
          onCambiar={setVista}
          opciones={[
            { id: "pagos", label: "Cobros", cantidad: data?.pagos.length ?? 0 },
            { id: "suscripciones", label: "Suscripciones", cantidad: data?.suscripciones.length ?? 0 },
            { id: "ajustes", label: "Reembolsos", cantidad: data?.ajustes.length ?? 0 },
          ]}
        />
      }
      sinPadding
    >
      {isLoading || !data ? (
        <div className="p-5">
          <Cargando />
        </div>
      ) : vista === "pagos" ? (
        data.pagos.length === 0 ? (
          <div className="p-5">
            <Vacio titulo="Todavía no hay cobros en línea" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="bg-primary/[0.035]">
                  <th className={TH}>Fecha</th>
                  <th className={TH}>Clínica</th>
                  <th className={TH}>Tipo</th>
                  <th className={`${TH} text-right`}>Sin impuestos</th>
                  <th className={`${TH} text-right`}>Impuestos</th>
                  <th className={`${TH} text-right`}>Total</th>
                  <th className={TH}>Estado</th>
                  <th className={TH}>Comprobante</th>
                </tr>
              </thead>
              <tbody>
                {data.pagos.map((p) => (
                  <tr key={p.id} className="border-t border-border/60">
                    <td className={TD}>{fecha(p.fecha)}</td>
                    <td className={TD}>
                      {p.clinica || "—"}
                      {p.pais && <span className="ml-1 text-xs text-muted-foreground">({p.pais})</span>}
                    </td>
                    <td className={TD}>{TIPO_PAGO[p.tipo] ?? p.tipo}</td>
                    <td className={`${TD} text-right tabular-nums`}>{dinero(p.moneda, p.sinImpuestos)}</td>
                    <td className={`${TD} text-right tabular-nums`}>{dinero(p.moneda, p.impuestos)}</td>
                    <td className={`${TD} text-right font-semibold tabular-nums`}>{dinero(p.moneda, p.total)}</td>
                    <td className={TD}>
                      <Pildora tono={ESTADO_PAGO[p.estado]?.tono ?? "neutro"}>{ESTADO_PAGO[p.estado]?.texto ?? p.estado}</Pildora>
                    </td>
                    <td className={`${TD} text-xs text-muted-foreground`}>
                      {p.comprobante ?? "—"}
                      <span className="block font-mono text-[10px]">{p.paddleId}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : vista === "suscripciones" ? (
        data.suscripciones.length === 0 ? (
          <div className="p-5">
            <Vacio titulo="Todavía no hay suscripciones en línea" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="bg-primary/[0.035]">
                  <th className={TH}>Clínica</th>
                  <th className={TH}>Plan</th>
                  <th className={TH}>Estado</th>
                  <th className={TH}>Próxima renovación</th>
                  <th className={TH}>Período pagado hasta</th>
                </tr>
              </thead>
              <tbody>
                {data.suscripciones.map((s) => (
                  <tr key={s.id} className="border-t border-border/60">
                    <td className={TD}>
                      {s.clinica || "— (esperando el pago)"}
                      <span className="block font-mono text-[10px] text-muted-foreground">{s.paddleId}</span>
                    </td>
                    <td className={TD}>
                      {s.plan ? NOMBRE_PLAN[s.plan] : "—"} · {s.ciclo}
                    </td>
                    <td className={TD}>
                      <Pildora tono={ESTADO_SUSCRIPCION[s.estado]?.tono ?? "neutro"}>
                        {ESTADO_SUSCRIPCION[s.estado]?.texto ?? s.estado}
                      </Pildora>
                    </td>
                    <td className={TD}>{s.canceladaEl ? `Cancelada el ${fecha(s.canceladaEl)}` : fecha(s.proximoCobro)}</td>
                    <td className={TD}>{fecha(s.periodoHasta)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : data.ajustes.length === 0 ? (
        <div className="p-5">
          <Vacio titulo="No hay reembolsos" texto="Los reembolsos se hacen desde Paddle y aparecen acá solos." />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-primary/[0.035]">
                <th className={TH}>Fecha</th>
                <th className={TH}>Tipo</th>
                <th className={TH}>Estado</th>
                <th className={`${TH} text-right`}>Total</th>
                <th className={TH}>Cobro</th>
                <th className={TH}>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {data.ajustes.map((a) => (
                <tr key={a.id} className="border-t border-border/60">
                  <td className={TD}>{fecha(a.fecha)}</td>
                  <td className={TD}>{a.tipo === "refund" ? "Reembolso" : a.tipo === "chargeback" ? "Contracargo" : a.tipo}</td>
                  <td className={TD}>{a.estado === "approved" ? "Aprobado" : a.estado === "rejected" ? "Rechazado" : a.estado}</td>
                  <td className={`${TD} text-right font-semibold tabular-nums`}>{dinero(a.moneda, a.total)}</td>
                  <td className={`${TD} font-mono text-[11px]`}>{a.cobro}</td>
                  <td className={TD}>{a.motivo || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Seccion>
  );
}
