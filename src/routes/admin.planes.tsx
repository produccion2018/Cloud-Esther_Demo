import { createFileRoute } from "@tanstack/react-router";
import { Box, Building2, Grid2x2, Info, Lock, UserRound, Users } from "lucide-react";
import { useState } from "react";

import { Cargando, Seccion } from "@/components/admin/bits";
import { RestrictedView } from "@/components/admin/restricted";
import { canAccess, permisos, useRole } from "@/components/admin/role";
import { AdminShell } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { guardarPlan } from "@/lib/admin/api";
import { useAccion, useClinicas, usePlanes } from "@/lib/admin/consultas";
import { miles, precio, precioAnual } from "@/lib/admin/formato";
import type { PlanConfig } from "@/lib/admin/tipos";

export const Route = createFileRoute("/admin/planes")({
  head: () => ({
    meta: [
      { title: "Planes y precios — Cloud Esther Administración" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PlanesPage,
});

function PlanesPage() {
  const { role } = useRole();
  const { data: planes, isLoading } = usePlanes();
  const { data: clinicas } = useClinicas();
  if (!canAccess(role, "/admin/planes")) return <RestrictedView />;
  const editable = permisos.editarPlanes(role);

  return (
    <AdminShell
      title="Planes y precios"
      description="Precio, descuento anual y capacidad de cada plan. Es lo que ven las clínicas en la web, en el registro y dentro de la app: no hace falta tocar el código para cambiarlo."
    >
      <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/[0.05] px-4 py-3 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-foreground/85">
          El <b>monto inicial</b> se cobra una sola vez al contratar; el <b>precio mensual</b> es el
          recurrente. Mientras un plan no tenga precio, no se muestra en la web. El precio anual se
          calcula solo: <b>precio mensual × 12 × (1 − descuento)</b>. El odontograma de cada plan es
          una regla fija: <b>Start y Pro usan el 2D · Plus y Enterprise usan el 3D</b>.
          {!editable && " Tu perfil puede ver los planes; los cambia el Dueño."}
        </p>
      </div>

      {isLoading || !planes ? (
        <Cargando />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          {planes.map((p) => (
            <TarjetaPlan
              key={p.id}
              plan={p}
              editable={editable}
              clinicas={(clinicas ?? []).filter((c) => c.plan === p.id).length}
            />
          ))}
        </div>
      )}
    </AdminShell>
  );
}

function TarjetaPlan({
  plan,
  editable,
  clinicas,
}: {
  plan: PlanConfig;
  editable: boolean;
  clinicas: number;
}) {
  const [f, setF] = useState({
    inicial: plan.precioInicial == null ? "" : String(plan.precioInicial),
    precio: plan.precioMensual === null ? "" : String(plan.precioMensual),
    descuento: String(Math.round(plan.descuentoAnual * 100)),
    sucursales: String(plan.sucursales),
    usuarios: String(plan.usuariosInternos),
    pacientes: String(plan.pacientesActivos),
  });
  const guardar = useAccion(
    (c: Parameters<typeof guardarPlan>[1]) => guardarPlan(plan.id, c),
    ["planes"],
    `Plan ${plan.nombre} actualizado`,
  );

  const num = (v: string) => Math.max(0, Math.round(Number(v.replace(",", ".")) || 0));
  const precioMensual = f.precio.trim() === "" ? null : num(f.precio);
  const precioInicial = f.inicial.trim() === "" ? null : num(f.inicial);
  const borrador = { precioMensual, descuentoAnual: Math.min(90, num(f.descuento)) / 100 };
  const cambios =
    precioMensual !== plan.precioMensual ||
    precioInicial !== (plan.precioInicial ?? null) ||
    borrador.descuentoAnual !== plan.descuentoAnual ||
    num(f.sucursales) !== plan.sucursales ||
    num(f.usuarios) !== plan.usuariosInternos ||
    num(f.pacientes) !== plan.pacientesActivos;

  const campo = (id: keyof typeof f, label: string, icono: React.ReactNode, sufijo?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`${plan.id}-${id}`} className="flex items-center gap-1.5 text-xs">
        {icono}
        {label}
      </Label>
      <div className="relative">
        <Input
          id={`${plan.id}-${id}`}
          inputMode="numeric"
          value={f[id]}
          disabled={!editable}
          placeholder={id === "precio" || id === "inicial" ? "Sin definir" : ""}
          onChange={(e) => setF((x) => ({ ...x, [id]: e.target.value.replace(/[^0-9.,]/g, "") }))}
          className="h-10 rounded-xl pr-12"
        />
        {sufijo && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {sufijo}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <Seccion
      titulo={plan.nombre}
      descripcion={`${clinicas} ${clinicas === 1 ? "clínica" : "clínicas"} con este plan`}
      acciones={
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
          {plan.odontograma === "3D" ? (
            <Box className="h-3 w-3" />
          ) : (
            <Grid2x2 className="h-3 w-3" />
          )}
          Odontograma {plan.odontograma}
          <Lock className="h-3 w-3 opacity-60" />
        </span>
      }
    >
      <div className="rounded-2xl bg-gradient-to-br from-primary/[0.08] to-transparent p-3">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-primary/75">
          Así se ve en la web
        </p>
        <p className="mt-1 text-2xl font-extrabold tracking-tight text-primary">
          {precio(precioMensual)}{" "}
          <span className="text-xs font-semibold text-muted-foreground">/ mes</span>
        </p>
        <p className="text-xs font-semibold text-foreground/80">
          Monto inicial (pago único):{" "}
          {precioInicial === null ? "sin definir" : precio(precioInicial)}
        </p>
        <p className="text-xs text-muted-foreground">
          Anual: {precio(precioAnual(borrador))} / año ({Math.round(borrador.descuentoAnual * 100)}%
          de descuento)
        </p>
        <p className="mt-2 text-[11px] leading-5 text-foreground/80">
          {num(f.sucursales) === 1 ? "1 sucursal" : `Hasta ${miles(num(f.sucursales))} sucursales`}{" "}
          · Hasta {miles(num(f.usuarios))} usuarios internos · Hasta {miles(num(f.pacientes))}{" "}
          pacientes activos
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="col-span-2">
          {campo(
            "inicial",
            "Monto inicial · pago único al contratar",
            <span className="font-bold text-primary">US$</span>,
          )}
        </div>
        {campo("precio", "Precio mensual", <span className="font-bold text-primary">US$</span>)}
        {campo(
          "descuento",
          "Descuento anual",
          <span className="font-bold text-primary">%</span>,
          "%",
        )}
        {campo("sucursales", "Sucursales", <Building2 className="h-3.5 w-3.5 text-primary" />)}
        {campo("usuarios", "Usuarios internos", <Users className="h-3.5 w-3.5 text-primary" />)}
        <div className="col-span-2">
          {campo(
            "pacientes",
            "Pacientes activos",
            <UserRound className="h-3.5 w-3.5 text-primary" />,
          )}
        </div>
      </div>

      {editable && (
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!cambios}
            onClick={() =>
              setF({
                inicial: plan.precioInicial == null ? "" : String(plan.precioInicial),
                precio: plan.precioMensual === null ? "" : String(plan.precioMensual),
                descuento: String(Math.round(plan.descuentoAnual * 100)),
                sucursales: String(plan.sucursales),
                usuarios: String(plan.usuariosInternos),
                pacientes: String(plan.pacientesActivos),
              })
            }
          >
            Deshacer
          </Button>
          <Button
            size="sm"
            disabled={!cambios || guardar.isPending}
            onClick={() =>
              guardar.mutate({
                precioMensual,
                precioInicial,
                descuentoAnual: borrador.descuentoAnual,
                sucursales: Math.max(1, num(f.sucursales)),
                usuariosInternos: Math.max(1, num(f.usuarios)),
                pacientesActivos: Math.max(1, num(f.pacientes)),
              })
            }
          >
            Guardar cambios
          </Button>
        </div>
      )}
    </Seccion>
  );
}
