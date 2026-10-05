import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Search,
} from "lucide-react";
import { useState } from "react";

import { Cargando, KpiCard, Seccion, StatusBadge, Vacio } from "@/components/admin/bits";
import { RestrictedView } from "@/components/admin/restricted";
import { canAccess, permisos, useRole } from "@/components/admin/role";
import { AdminShell } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { enviarRecordatorioPago } from "@/lib/admin/api";
import { useAccion, useClinicas, usePlanes } from "@/lib/admin/consultas";
import { NOMBRE_PLAN, diasHasta, fecha, precio } from "@/lib/admin/formato";
import type { EstadoPago } from "@/lib/admin/tipos";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/pagos")({
  head: () => ({
    meta: [
      { title: "Pagos y cobranza — Cloud Esther Administración" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PaymentsPage,
});

const PESTANAS: [EstadoPago | "todas", string][] = [
  ["todas", "Todas"],
  ["pendiente", "Falta pagar"],
  ["mora", "En mora"],
  ["al-dia", "Al día"],
  ["suspendida", "Suspendidas"],
];

function PaymentsPage() {
  const { role } = useRole();
  const { data: clinicas, isLoading } = useClinicas();
  const { data: planes } = usePlanes();
  const [pestana, setPestana] = useState<EstadoPago | "todas">("todas");
  const [q, setQ] = useState("");
  const recordar = useAccion(
    (c: { id: string; nombre: string }) => enviarRecordatorioPago(c.id),
    ["clinicas"],
    (c) => `Recordatorio de pago enviado a ${c.nombre}`,
  );
  if (!canAccess(role, "/admin/pagos")) return <RestrictedView />;

  const importes = permisos.verImportes(role);
  const lista = clinicas ?? [];
  const cuenta = (e: EstadoPago) => lista.filter((c) => c.estadoPago === e).length;
  const precioDe = (id: string) => planes?.find((p) => p.id === id)?.precioMensual ?? null;
  const sumar = (estados: EstadoPago[]) =>
    lista
      .filter((c) => estados.includes(c.estadoPago))
      .reduce<number | null>((s, c) => {
        const p = c.importe ?? precioDe(c.plan);
        return p === null ? s : (s ?? 0) + p;
      }, null);
  const texto = q.trim().toLowerCase();
  const filas = lista
    .filter(
      (c) =>
        (pestana === "todas" || c.estadoPago === pestana) &&
        (!texto || c.nombre.toLowerCase().includes(texto)),
    )
    .sort((a, b) => a.proximoCobro.localeCompare(b.proximoCobro));

  return (
    <AdminShell
      title={importes ? "Pagos y cobranza" : "Seguimiento de pagos"}
      description="Quién pagó, a quién le falta pagar y quién está en mora, con la próxima fecha de cobro de cada clínica."
    >
      {isLoading ? (
        <Cargando />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
            <KpiCard
              accent
              label="Al día"
              value={String(cuenta("al-dia"))}
              hint={`${lista.length ? Math.round((cuenta("al-dia") / lista.length) * 100) : 0}% de las clínicas`}
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
            <KpiCard
              label="Falta pagar"
              value={String(cuenta("pendiente"))}
              hint={importes ? `${precio(sumar(["pendiente"]))} por cobrar` : "Dentro del plazo"}
              icon={<Clock className="h-4 w-4" />}
              tono="warning"
            />
            <KpiCard
              label="En mora"
              value={String(cuenta("mora"))}
              hint={importes ? `${precio(sumar(["mora"]))} vencido` : "Vencidas"}
              icon={<AlertTriangle className="h-4 w-4" />}
              tono="destructive"
            />
            {importes ? (
              <KpiCard
                label="Facturación mensual"
                value={precio(sumar(["al-dia", "pendiente", "mora"]))}
                hint="Clínicas activas, según el precio de cada plan"
                icon={<CircleDollarSign className="h-4 w-4" />}
              />
            ) : (
              <KpiCard
                label="Suspendidas"
                value={String(cuenta("suspendida"))}
                hint="Sin acceso hasta regularizar"
                icon={<AlertTriangle className="h-4 w-4" />}
              />
            )}
          </div>

          <Seccion
            titulo="Cobranza por clínica"
            descripcion="Ordenado por fecha de cobro."
            sinPadding
          >
            <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-5 py-3">
              <div className="flex flex-wrap gap-1 rounded-xl bg-muted p-1">
                {PESTANAS.map(([id, l]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPestana(id)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                      pestana === id
                        ? "bg-card text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {l}
                    {id !== "todas" && <span className="ml-1 opacity-60">{cuenta(id)}</span>}
                  </button>
                ))}
              </div>
              <div className="relative ml-auto min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar clínica"
                  className="h-9 rounded-xl pl-9"
                />
              </div>
            </div>
            {filas.length === 0 ? (
              <div className="p-5">
                <Vacio titulo="No hay clínicas en este estado" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="bg-primary/[0.035] text-left text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                      <th className="px-5 py-2.5">Clínica</th>
                      <th className="px-3 py-2.5">Plan</th>
                      {importes && <th className="px-3 py-2.5">Importe</th>}
                      <th className="px-3 py-2.5">Estado</th>
                      <th className="px-3 py-2.5">Próximo cobro</th>
                      <th className="px-5 py-2.5 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((c) => {
                      const dias = diasHasta(c.proximoCobro);
                      return (
                        <tr key={c.id} className="border-t border-border/60">
                          <td className="px-5 py-3">
                            <p className="font-semibold">{c.nombre}</p>
                            <p className="text-xs text-muted-foreground">{c.contacto.nombre}</p>
                          </td>
                          <td className="px-3 py-3 text-xs font-semibold">
                            {NOMBRE_PLAN[c.plan]} · {c.ciclo}
                          </td>
                          {importes && (
                            <td className="px-3 py-3 font-semibold">
                              {precio(c.importe ?? precioDe(c.plan))}
                            </td>
                          )}
                          <td className="px-3 py-3">
                            <StatusBadge status={c.estadoPago} />
                          </td>
                          <td className="px-3 py-3">
                            <p className="font-semibold">{fecha(c.proximoCobro)}</p>
                            <p
                              className={cn(
                                "text-xs",
                                dias < 0
                                  ? "text-destructive"
                                  : dias <= 7
                                    ? "text-warning-foreground"
                                    : "text-muted-foreground",
                              )}
                            >
                              {dias < 0
                                ? `Venció hace ${-dias} días`
                                : dias === 0
                                  ? "Vence hoy"
                                  : `En ${dias} días`}
                            </p>
                          </td>
                          <td className="px-5 py-3 text-right">
                            {c.estadoPago !== "al-dia" && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={recordar.isPending}
                                onClick={() => recordar.mutate({ id: c.id, nombre: c.nombre })}
                              >
                                <BellRing className="mr-1.5 h-3.5 w-3.5" />
                                Enviar recordatorio
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Seccion>
        </>
      )}
    </AdminShell>
  );
}
