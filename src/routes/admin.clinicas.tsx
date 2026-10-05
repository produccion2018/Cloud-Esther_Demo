import { createFileRoute } from "@tanstack/react-router";
import { Building2, Mail, Pencil, Phone, Search, UserRound, Users } from "lucide-react";
import { useState } from "react";

import { BarraUso, Cargando, KpiCard, Seccion, StatusBadge, Vacio } from "@/components/admin/bits";
import { Campo, INPUT } from "@/components/admin/formularios";
import { permisos, useRole } from "@/components/admin/role";
import { AdminShell } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { guardarMontosClinica } from "@/lib/admin/api";
import { useAccion, useClinicas, usePlanes } from "@/lib/admin/consultas";
import {
  ETIQUETA_PAGO,
  NOMBRE_PLAN,
  fecha,
  haceCuanto,
  miles,
  minutosTexto,
  precio,
} from "@/lib/admin/formato";
import type { Clinica, EstadoPago, PlanConfig, PlanId } from "@/lib/admin/tipos";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/clinicas")({
  head: () => ({
    meta: [
      { title: "Clínicas clientes — Cloud Esther Administración" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ClinicsPage,
});

const SELECT =
  "h-10 rounded-xl border border-input bg-card px-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10";

function ClinicsPage() {
  const { role } = useRole();
  const { data: clinicas, isLoading } = useClinicas();
  const { data: planes } = usePlanes();
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<EstadoPago | "">("");
  const [plan, setPlan] = useState<PlanId | "">("");
  const [abierta, setAbierta] = useState<string | null>(null);

  const lista = clinicas ?? [];
  const limite = (id: PlanId) => planes?.find((p) => p.id === id);
  const texto = q.trim().toLowerCase();
  const filtradas = lista.filter(
    (c) =>
      (!texto ||
        `${c.nombre} ${c.ciudad} ${c.contacto.nombre} ${c.contacto.email}`
          .toLowerCase()
          .includes(texto)) &&
      (!estado || c.estadoPago === estado) &&
      (!plan || c.plan === plan),
  );
  const seleccionada = lista.find((c) => c.id === abierta) ?? null;

  return (
    <AdminShell
      title="Clínicas clientes"
      description="Todas las empresas que usan Cloud Esther: plan, uso contra los límites del plan, estado de pago y último acceso."
    >
      {isLoading ? (
        <Cargando />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
            <KpiCard
              accent
              label="Clínicas"
              value={String(lista.length)}
              hint={`${lista.filter((c) => c.estadoPago !== "suspendida").length} activas`}
              icon={<Building2 className="h-4 w-4" />}
            />
            <KpiCard
              label="Usuarios internos"
              value={miles(lista.reduce((s, c) => s + c.uso.usuariosInternos, 0))}
              hint="Equipo de todas las clínicas"
              icon={<Users className="h-4 w-4" />}
            />
            <KpiCard
              label="Pacientes activos"
              value={miles(lista.reduce((s, c) => s + c.uso.pacientesActivos, 0))}
              hint={`${miles(lista.reduce((s, c) => s + c.uso.pacientesArchivados, 0))} archivados (no cuentan)`}
              icon={<UserRound className="h-4 w-4" />}
            />
            <KpiCard
              label="Sucursales"
              value={miles(lista.reduce((s, c) => s + c.uso.sucursales, 0))}
              hint="En toda la plataforma"
              icon={<Building2 className="h-4 w-4" />}
            />
          </div>

          <Seccion
            titulo="Listado de clínicas"
            descripcion="Tocá una clínica para ver el detalle."
            sinPadding
          >
            <div className="flex flex-wrap gap-2 border-b border-border/60 px-5 py-3">
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar clínica, ciudad o contacto"
                  className="h-10 rounded-xl pl-9"
                />
              </div>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value as PlanId | "")}
                className={SELECT}
                aria-label="Plan"
              >
                <option value="">Todos los planes</option>
                {(Object.keys(NOMBRE_PLAN) as PlanId[]).map((p) => (
                  <option key={p} value={p}>
                    {NOMBRE_PLAN[p]}
                  </option>
                ))}
              </select>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as EstadoPago | "")}
                className={SELECT}
                aria-label="Estado de pago"
              >
                <option value="">Todos los estados de pago</option>
                {(Object.keys(ETIQUETA_PAGO) as EstadoPago[]).map((e) => (
                  <option key={e} value={e}>
                    {ETIQUETA_PAGO[e]}
                  </option>
                ))}
              </select>
            </div>
            {filtradas.length === 0 ? (
              <div className="p-5">
                <Vacio titulo="No hay clínicas con esos filtros" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-sm">
                  <thead>
                    <tr className="bg-primary/[0.035] text-left text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                      <th className="px-5 py-2.5">Clínica</th>
                      <th className="px-3 py-2.5">Plan</th>
                      <th className="px-3 py-2.5">Usuarios internos</th>
                      <th className="px-3 py-2.5">Pacientes activos</th>
                      <th className="px-3 py-2.5">Sucursales</th>
                      <th className="px-3 py-2.5">Pago</th>
                      <th className="px-5 py-2.5">Último acceso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtradas.map((c) => {
                      const p = limite(c.plan);
                      return (
                        <tr
                          key={c.id}
                          onClick={() => setAbierta(c.id)}
                          className="cursor-pointer border-t border-border/60 transition-colors hover:bg-primary/[0.03]"
                        >
                          <td className="px-5 py-3">
                            <p className="font-semibold">{c.nombre}</p>
                            <p className="text-xs text-muted-foreground">
                              {c.ciudad} · cliente desde {fecha(c.clienteDesde)}
                            </p>
                          </td>
                          <td className="px-3 py-3">
                            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                              {NOMBRE_PLAN[c.plan]}
                            </span>
                            <p className="mt-1 text-[11px] text-muted-foreground">{c.ciclo}</p>
                          </td>
                          <td className="px-3 py-3">
                            {p && (
                              <BarraUso
                                usado={c.uso.usuariosInternos}
                                limite={p.usuariosInternos}
                              />
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {p && (
                              <BarraUso
                                usado={c.uso.pacientesActivos}
                                limite={p.pacientesActivos}
                              />
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {p && <BarraUso usado={c.uso.sucursales} limite={p.sucursales} />}
                          </td>
                          <td className="px-3 py-3">
                            <StatusBadge status={c.estadoPago} />
                          </td>
                          <td className="px-5 py-3 text-xs text-muted-foreground">
                            {haceCuanto(c.ultimoAcceso)}
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

      <Sheet open={!!seleccionada} onOpenChange={(v) => !v && setAbierta(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-lg">
          {seleccionada && (
            <DetalleClinica
              clinica={seleccionada}
              plan={limite(seleccionada.plan)}
              importes={permisos.verImportes(role)}
              editarMontos={permisos.editarPlanes(role)}
            />
          )}
        </SheetContent>
      </Sheet>
    </AdminShell>
  );
}

function DetalleClinica({
  clinica: c,
  plan,
  importes,
  editarMontos,
}: {
  clinica: Clinica;
  plan: PlanConfig | undefined;
  importes: boolean;
  editarMontos: boolean;
}) {
  const filas: [string, string][] = [
    ["Plan", `${NOMBRE_PLAN[c.plan]} · ${c.ciclo}`],
    ["Odontograma", plan ? plan.odontograma : "—"],
    ["Próximo cobro", fecha(c.proximoCobro)],
    ["Cliente desde", fecha(c.clienteDesde)],
    ["Consumo de IA (mes)", minutosTexto(c.uso.minutosIA)],
    ["Pacientes archivados", `${miles(c.uso.pacientesArchivados)} (no cuentan para el límite)`],
  ];
  return (
    <div>
      <div
        className="px-6 pb-5 pt-6 text-primary-foreground"
        style={{ background: "var(--gradient-primary)" }}
      >
        <SheetTitle className="text-xl font-extrabold text-primary-foreground">
          {c.nombre}
        </SheetTitle>
        <p className="text-sm opacity-90">
          {c.ciudad}, {c.pais}
        </p>
        <div className="mt-3">
          <StatusBadge status={c.estadoPago} />
        </div>
      </div>
      <div className="space-y-5 p-6">
        <div className="rounded-2xl border border-border p-4">
          <p className="text-sm font-bold">Contacto</p>
          <p className="mt-1 text-sm">{c.contacto.nombre}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <a
              href={`mailto:${c.contacto.email}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary"
            >
              <Mail className="h-3.5 w-3.5" /> {c.contacto.email}
            </a>
            <a
              href={`tel:${c.contacto.telefono.replace(/[^0-9+]/g, "")}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary"
            >
              <Phone className="h-3.5 w-3.5" /> {c.contacto.telefono}
            </a>
          </div>
        </div>
        {plan && (
          <div className="grid gap-3 rounded-2xl border border-border p-4">
            <p className="text-sm font-bold">Uso del plan</p>
            {(
              [
                ["Usuarios internos", c.uso.usuariosInternos, plan.usuariosInternos],
                ["Pacientes activos", c.uso.pacientesActivos, plan.pacientesActivos],
                ["Sucursales", c.uso.sucursales, plan.sucursales],
              ] as const
            ).map(([l, u, m]) => (
              <div
                key={l}
                className="grid grid-cols-[130px_minmax(0,1fr)] items-center gap-3 text-xs"
              >
                <span className="font-semibold">{l}</span>
                <BarraUso usado={u} limite={m} />
              </div>
            ))}
          </div>
        )}
        {importes && <MontosClinica clinica={c} plan={plan} editable={editarMontos} />}
        <dl className="divide-y divide-border/60 rounded-2xl border border-border">
          {filas.map(([k, v]) => (
            <div key={k} className={cn("flex justify-between gap-3 px-4 py-2.5 text-sm")}>
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-right font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

/** Montos del contrato de la clínica (tenant): inicial y mensual. Vacíos hasta que se carguen. */
function MontosClinica({
  clinica: c,
  plan,
  editable,
}: {
  clinica: Clinica;
  plan: PlanConfig | undefined;
  editable: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [inicial, setInicial] = useState(c.montoInicial == null ? "" : String(c.montoInicial));
  const [mensual, setMensual] = useState(c.importe == null ? "" : String(c.importe));
  const [error, setError] = useState<string | null>(null);
  const guardarMontos = useAccion(guardarMontosClinica, ["clinicas"], "Montos guardados");
  const numero = (t: string) => (t.trim() === "" ? null : Number(t.replace(",", ".")));

  const guardar = () => {
    const a = numero(inicial);
    const m = numero(mensual);
    if (
      (a !== null && (!Number.isFinite(a) || a < 0)) ||
      (m !== null && (!Number.isFinite(m) || m < 0))
    )
      return setError("Escribí importes válidos (o dejalos vacíos).");
    setError(null);
    guardarMontos.mutate(
      { id: c.id, montoInicial: a, montoMensual: m },
      { onSuccess: () => setEditando(false) },
    );
  };

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold">Montos del contrato</p>
          <p className="text-[11px] text-muted-foreground">
            De esta clínica y su plan {NOMBRE_PLAN[c.plan]}. Se administran desde el backend.
          </p>
        </div>
        {editable && !editando && (
          <Button variant="outline" size="sm" onClick={() => setEditando(true)}>
            <Pencil className="h-3.5 w-3.5" /> Editar
          </Button>
        )}
      </div>
      {editando ? (
        <div className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Monto inicial (US$)" ayuda="Lo que paga al comenzar">
              <input
                inputMode="decimal"
                value={inicial}
                onChange={(e) => setInicial(e.target.value)}
                placeholder="Sin definir"
                className={INPUT}
              />
            </Campo>
            <Campo label="Monto mensual (US$)" ayuda="Importe recurrente">
              <input
                inputMode="decimal"
                value={mensual}
                onChange={(e) => setMensual(e.target.value)}
                placeholder="Sin definir"
                className={INPUT}
              />
            </Campo>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditando(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={guardar} disabled={guardarMontos.isPending}>
              Guardar
            </Button>
          </div>
        </div>
      ) : (
        <dl className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-card p-3">
            <dt className="text-[11px] text-muted-foreground">Monto inicial</dt>
            <dd className="mt-0.5 text-base font-extrabold tabular-nums">
              {c.montoInicial == null ? "Sin definir" : precio(c.montoInicial)}
            </dd>
          </div>
          <div className="rounded-xl bg-card p-3">
            <dt className="text-[11px] text-muted-foreground">Monto mensual</dt>
            <dd className="mt-0.5 text-base font-extrabold tabular-nums">
              {c.importe != null
                ? precio(c.importe)
                : plan?.precioMensual != null
                  ? `${precio(plan.precioMensual)} (del plan)`
                  : "Sin definir"}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}
