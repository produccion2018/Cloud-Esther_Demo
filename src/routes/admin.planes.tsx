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
import { limiteTexto, precio, precioAnual } from "@/lib/admin/formato";
import type { CambiosPlan, PlanConfig } from "@/lib/admin/tipos";

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
          recurrente. Mientras un plan no tenga precio, no se muestra en la web. En los límites,{" "}
          <b>dejar la caja vacía = sin límite</b>. El precio anual se
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
              // Si cambian los datos guardados, la tarjeta se vuelve a armar con ellos:
              // lo que ves después de "Guardar" es lo que quedó guardado de verdad.
              key={`${p.id}:${JSON.stringify(p)}`}
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

/** Texto de una caja → importe con hasta 2 decimales. "" = sin definir. NaN = inválido. */
function leerImporte(v: string): number | null {
  const t = v.trim();
  if (t === "") return null;
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : Number.NaN;
}

/** Texto de una caja → límite entero. "" = sin límite (null). NaN = inválido. */
function leerLimite(v: string): number | null {
  const t = v.trim();
  if (t === "") return null;
  const n = Number(t.replace(",", "."));
  return Number.isInteger(n) && n >= 1 ? n : Number.NaN;
}

const aCaja = (n: number | null | undefined) =>
  n === null || n === undefined || !Number.isFinite(n) ? "" : String(n);
const limiteDelPlan = (n: number) => (Number.isFinite(n) ? n : null);

function TarjetaPlan({
  plan,
  editable,
  clinicas,
}: {
  plan: PlanConfig;
  editable: boolean;
  clinicas: number;
}) {
  const inicialForm = () => ({
    inicial: aCaja(plan.precioInicial),
    precio: aCaja(plan.precioMensual),
    descuento: String(Math.round(plan.descuentoAnual * 100)),
    sucursales: aCaja(plan.sucursales),
    usuarios: aCaja(plan.usuariosInternos),
    pacientes: aCaja(plan.pacientesActivos),
  });
  const [f, setF] = useState(inicialForm);
  const guardar = useAccion(
    (c: CambiosPlan) => guardarPlan(plan.id, c),
    ["planes"],
    `Plan ${plan.nombre} guardado`,
  );

  const precioMensual = leerImporte(f.precio);
  const precioInicial = leerImporte(f.inicial);
  const descuentoNum = Number(f.descuento.trim() === "" ? "0" : f.descuento.replace(",", "."));
  const descuentoAnual =
    Number.isInteger(descuentoNum) && descuentoNum >= 0 && descuentoNum <= 90
      ? descuentoNum / 100
      : Number.NaN;
  const sucursales = leerLimite(f.sucursales);
  const usuariosInternos = leerLimite(f.usuarios);
  const pacientesActivos = leerLimite(f.pacientes);

  const errores: string[] = [];
  if (Number.isNaN(precioMensual) || Number.isNaN(precioInicial))
    errores.push("Los precios tienen que ser números (hasta 2 decimales).");
  if (Number.isNaN(descuentoAnual)) errores.push("El descuento va de 0 a 90 (número entero).");
  if ([sucursales, usuariosInternos, pacientesActivos].some((n) => Number.isNaN(n)))
    errores.push("Los límites son números enteros de 1 en adelante (o vacío = sin límite).");

  // Solo se manda lo que cambió
  const cambios: CambiosPlan = {};
  if (precioMensual !== plan.precioMensual) cambios.precioMensual = precioMensual;
  if (precioInicial !== (plan.precioInicial ?? null)) cambios.precioInicial = precioInicial;
  if (descuentoAnual !== plan.descuentoAnual) cambios.descuentoAnual = descuentoAnual;
  if (sucursales !== limiteDelPlan(plan.sucursales)) cambios.sucursales = sucursales;
  if (usuariosInternos !== limiteDelPlan(plan.usuariosInternos))
    cambios.usuariosInternos = usuariosInternos;
  if (pacientesActivos !== limiteDelPlan(plan.pacientesActivos))
    cambios.pacientesActivos = pacientesActivos;
  const hayCambios = Object.keys(cambios).length > 0;

  const vista = (n: number | null) => (n === null || Number.isNaN(n) ? null : n);
  const anual = precioAnual({
    precioMensual: vista(precioMensual),
    descuentoAnual: Number.isNaN(descuentoAnual) ? 0 : descuentoAnual,
  });
  const lim = (n: number | null) => limiteTexto(vista(n) ?? Number.POSITIVE_INFINITY);

  const campo = (
    id: keyof typeof f,
    label: string,
    icono: React.ReactNode,
    opciones: { sufijo?: string; vacio?: string } = {},
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={`${plan.id}-${id}`} className="flex items-center gap-1.5 text-xs">
        {icono}
        {label}
      </Label>
      <div className="relative">
        <Input
          id={`${plan.id}-${id}`}
          inputMode="decimal"
          value={f[id]}
          disabled={!editable || guardar.isPending}
          placeholder={opciones.vacio ?? ""}
          onChange={(e) => setF((x) => ({ ...x, [id]: e.target.value.replace(/[^0-9.,]/g, "") }))}
          className="h-10 rounded-xl pr-12"
        />
        {opciones.sufijo && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {opciones.sufijo}
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
          {precio(vista(precioMensual))}{" "}
          <span className="text-xs font-semibold text-muted-foreground">/ mes</span>
        </p>
        <p className="text-xs font-semibold text-foreground/80">
          Monto inicial (pago único):{" "}
          {vista(precioInicial) === null ? "sin definir" : precio(vista(precioInicial))}
        </p>
        <p className="text-xs text-muted-foreground">
          Anual: {precio(anual)} / año (
          {Number.isNaN(descuentoAnual) ? "—" : Math.round(descuentoAnual * 100)}% de descuento)
        </p>
        <p className="mt-2 text-[11px] leading-5 text-foreground/80">
          Sucursales: {lim(sucursales)} · Usuarios internos: {lim(usuariosInternos)} · Pacientes
          activos: {lim(pacientesActivos)}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="col-span-2">
          {campo(
            "inicial",
            "Monto inicial · pago único al contratar",
            <span className="font-bold text-primary">US$</span>,
            { vacio: "Sin definir" },
          )}
        </div>
        {campo("precio", "Precio mensual", <span className="font-bold text-primary">US$</span>, {
          vacio: "Sin definir",
        })}
        {campo("descuento", "Descuento anual", <span className="font-bold text-primary">%</span>, {
          sufijo: "%",
        })}
        {campo("sucursales", "Sucursales", <Building2 className="h-3.5 w-3.5 text-primary" />, {
          vacio: "Sin límite",
        })}
        {campo("usuarios", "Usuarios internos", <Users className="h-3.5 w-3.5 text-primary" />, {
          vacio: "Sin límite",
        })}
        <div className="col-span-2">
          {campo(
            "pacientes",
            "Pacientes activos",
            <UserRound className="h-3.5 w-3.5 text-primary" />,
            { vacio: "Sin límite" },
          )}
        </div>
      </div>

      {editable && errores.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs font-medium text-destructive">
          {errores.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      {editable && (
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!hayCambios || guardar.isPending}
            onClick={() => setF(inicialForm())}
          >
            Deshacer
          </Button>
          <Button
            size="sm"
            disabled={!hayCambios || errores.length > 0 || guardar.isPending}
            onClick={() => guardar.mutate(cambios)}
          >
            {guardar.isPending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      )}
    </Seccion>
  );
}
