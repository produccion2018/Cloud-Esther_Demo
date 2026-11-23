import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  Eye,
  Info,
  LifeBuoy,
  Mail,
  Pencil,
  Phone,
  Search,
  UserRound,
  Users,
} from "lucide-react";
import { useState } from "react";

import {
  BarraUso,
  Cargando,
  KpiCard,
  Paginacion,
  Seccion,
  StatusBadge,
  Vacio,
  usePaginado,
} from "@/components/admin/bits";
import { RegistroEmpresasBorradas, ZonaBorrarPrueba } from "@/components/admin/borrar-empresa-prueba";
import { SolicitudesContratacion } from "@/components/admin/contrataciones";
import { Campo, DialogoFormulario, INPUT } from "@/components/admin/formularios";
import { permisos, puede, useRole } from "@/components/admin/role";
import { AdminShell } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { CON_BACKEND, entrarComoSoporte, guardarMontosClinica, ponerCapacidadExtra } from "@/lib/admin/api";
import { RECORDATORIO_ASESOR } from "@/lib/cloud-esther/cambio-plan";
import { usePreciosModulos } from "@/lib/cloud-esther/precios-modulos";
import { useAccion, useClinicas, usePlanes } from "@/lib/admin/consultas";
import {
  ETIQUETA_PAGO,
  enlaceWhatsApp,
  NOMBRE_PLAN,
  fecha,
  haceCuanto,
  miles,
  minutosTexto,
  precio,
} from "@/lib/admin/formato";
import type { Clinica, EstadoPago, PlanConfig, PlanId } from "@/lib/admin/tipos";
import { cn } from "@/lib/utils";
import { IconoWhatsApp } from "@/components/cloud-esther/IconoWhatsApp";

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
  const pag = usePaginado(filtradas, 10, `${texto}|${estado}|${plan}`);

  return (
    <AdminShell
      title="Clínicas clientes"
      description="Todas las empresas que usan Cloud Esther: plan, uso contra los límites del plan, estado de pago y último acceso."
    >
      {/* Contrataciones que llegan de la web: arriba de todo, para no perderlas */}
      <SolicitudesContratacion />

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
            descripcion="Clínicas activadas. Tocá una clínica para ver el detalle."
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
                    {pag.items.map((c) => {
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
                              {c.ciudad ? `${c.ciudad} · ` : ""}cliente desde {fecha(c.clienteDesde)}
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
            <Paginacion {...pag} nombre="clínicas" />
          </Seccion>

          <RegistroEmpresasBorradas />
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
              soporte={puede(role, "soporte")}
              editarCapacidad={role === "owner" || role === "partner"}
              onBorrada={() => setAbierta(null)}
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
  soporte,
  editarCapacidad,
  onBorrada,
}: {
  clinica: Clinica;
  plan: PlanConfig | undefined;
  importes: boolean;
  editarMontos: boolean;
  soporte: boolean;
  editarCapacidad: boolean;
  onBorrada: () => void;
}) {
  const ex = c.capacidadExtra ?? { pacientes: 0, usuarios: 0, sucursales: 0, nota: "" };
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
          {[c.ciudad, c.pais].filter(Boolean).join(", ")}
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
            {enlaceWhatsApp(c.contacto.telefono, undefined) && (
              <a
                href={enlaceWhatsApp(c.contacto.telefono, undefined) ?? undefined}
                target="_blank"
                rel="noreferrer"
                className="btn-wa !min-h-8 !text-xs"
              >
                <IconoWhatsApp /> WhatsApp
              </a>
            )}
          </div>
        </div>
        {soporte && <EntrarComoSoporte clinica={c} />}
        {plan && (
          <div className="grid gap-3 rounded-2xl border border-border p-4">
            <p className="text-sm font-bold">Uso del plan</p>
            {(
              [
                ["Usuarios internos", c.uso.usuariosInternos, plan.usuariosInternos + ex.usuarios],
                ["Pacientes activos", c.uso.pacientesActivos, plan.pacientesActivos + ex.pacientes],
                ["Sucursales", c.uso.sucursales, plan.sucursales + ex.sucursales],
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
        {/* Recordatorio para el asesor antes de cambiarle el plan al cliente (pedido de Camilo). */}
        <div className="flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-100">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <b>Recordatorio:</b> {RECORDATORIO_ASESOR}
          </span>
        </div>
        {importes && <MontosClinica clinica={c} plan={plan} editable={editarMontos} />}
        {importes && <AdicionalesClinica clinica={c} />}
        <CapacidadExtraClinica clinica={c} editable={editarCapacidad} />
        <dl className="divide-y divide-border/60 rounded-2xl border border-border">
          {filas.map(([k, v]) => (
            <div key={k} className={cn("flex justify-between gap-3 px-4 py-2.5 text-sm")}>
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-right font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        <ZonaBorrarPrueba clinica={c} onBorrada={onBorrada} />
      </div>
    </div>
  );
}

/** CAPACIDAD EXTRA: cuando la clínica pide más pacientes, personas o sucursales que su plan,
 *  el Dueño o el Socio se la suman acá (con el precio por mes que quieran; se cobra como adicional). */
function CapacidadExtraClinica({ clinica: c, editable }: { clinica: Clinica; editable: boolean }) {
  const ex = c.capacidadExtra ?? { pacientes: 0, usuarios: 0, sucursales: 0, nota: "" };
  const precioActual = (c.adicionales ?? []).find((a) => a.modulo === "capacidad-extra");
  const [editando, setEditando] = useState(false);
  const [f, setF] = useState({
    pacientes: String(ex.pacientes || ""),
    usuarios: String(ex.usuarios || ""),
    sucursales: String(ex.sucursales || ""),
    precio: precioActual ? String(/anual/i.test(precioActual.ciclo) ? "" : precioActual.importe) : "",
    nota: ex.nota,
  });
  const [error, setError] = useState<string | null>(null);
  const guardar = useAccion(ponerCapacidadExtra, ["clinicas"], "Capacidad extra guardada");
  const n = (v: string) => Number(v.replace(/\D/g, "") || 0);
  const tieneExtra = ex.pacientes + ex.usuarios + ex.sucursales > 0;
  // Precio de lista (Planes y precios › Capacidad extra) para lo que se está cargando
  const lista = usePreciosModulos();
  const hayLista = ["cap-pacientes", "cap-usuarios", "cap-sucursales"].some((k) => lista[k] !== undefined);
  const deLista =
    Math.ceil(
      ((lista["cap-pacientes"] ?? 0) * n(f.pacientes) +
        (lista["cap-usuarios"] ?? 0) * n(f.usuarios) * 100 +
        (lista["cap-sucursales"] ?? 0) * n(f.sucursales) * 100),
    ) / 100;
  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold">Capacidad extra</p>
        {editable && !editando && (
          <Button variant="outline" size="sm" onClick={() => setEditando(true)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> {tieneExtra ? "Cambiar" : "Sumar capacidad"}
          </Button>
        )}
      </div>
      {!editando ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {tieneExtra
            ? `Tiene +${miles(ex.pacientes)} pacientes, +${ex.usuarios} personas y +${ex.sucursales} sucursales además de su plan${
                precioActual ? ` · ${precio(precioActual.importe)} ${/anual/i.test(precioActual.ciclo) ? "por año" : "por mes"}` : " · sin cargo"
              }.${ex.nota ? ` Nota: ${ex.nota}` : ""}`
            : "Usa solo lo que trae su plan. Con precios de capacidad cargados (Planes y precios), la clínica la suma sola desde Mi plan; si pide algo especial, sumásela acá."}
        </p>
      ) : (
        <form
          className="mt-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const precioMensual = f.precio.trim() ? Number(f.precio.replace(",", ".")) : null;
            if (precioMensual !== null && (!Number.isFinite(precioMensual) || precioMensual < 0))
              return setError("El precio no es válido.");
            guardar.mutate(
              {
                id: c.id,
                pacientes: n(f.pacientes),
                usuarios: n(f.usuarios),
                sucursales: n(f.sucursales),
                precioMensual,
                nota: f.nota.trim(),
              },
              {
                onSuccess: () => setEditando(false),
                onError: (e2) => setError(e2 instanceof Error ? e2.message : "No se pudo guardar."),
              },
            );
          }}
        >
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["pacientes", "+ Pacientes"],
                ["usuarios", "+ Personas"],
                ["sucursales", "+ Sucursales"],
              ] as const
            ).map(([k, l]) => (
              <Campo key={k} label={l}>
                <input
                  className={INPUT}
                  inputMode="numeric"
                  value={f[k]}
                  placeholder="0"
                  onChange={(e) => setF({ ...f, [k]: e.target.value.replace(/\D/g, "") })}
                />
              </Campo>
            ))}
          </div>
          <Campo
            label="Precio por mes (USD, opcional)"
            ayuda="Se cobra como un adicional en su próxima factura: con Paddle se cobra solo (si paga anual: × 12 con su descuento). Vacío = sin cargo."
          >
            <input
              className={INPUT}
              inputMode="decimal"
              value={f.precio}
              placeholder="Ej.: 30"
              onChange={(e) => setF({ ...f, precio: e.target.value.replace(/[^0-9.,]/g, "") })}
            />
            {hayLista && deLista > 0 && (
              <button
                type="button"
                className="mt-1 text-xs font-semibold text-primary hover:underline"
                onClick={() => setF({ ...f, precio: String(deLista) })}
              >
                Usar precio de lista: USD {deLista.toLocaleString("es-AR")} por mes
              </button>
            )}
          </Campo>
          <Campo label="Nota (opcional)">
            <input className={INPUT} value={f.nota} maxLength={500} onChange={(e) => setF({ ...f, nota: e.target.value })} />
          </Campo>
          {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditando(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={guardar.isPending}>
              Guardar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

/** Módulos adicionales que contrató la clínica, con lo que se le cobra por período. */
function AdicionalesClinica({ clinica: c }: { clinica: Clinica }) {
  const lista = c.adicionales ?? [];
  const porMes = lista.reduce((t, a) => t + (/anual/i.test(a.ciclo) ? a.importe / 12 : a.importe), 0);
  return (
    <div className="rounded-2xl border border-border p-4">
      <p className="text-sm font-bold">Módulos adicionales</p>
      {lista.length === 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">No contrató módulos adicionales.</p>
      ) : (
        <>
          <ul className="mt-2 divide-y divide-border/60">
            {lista.map((a) => (
              <li key={a.modulo} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block font-semibold">{a.nombre}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    Desde {fecha(a.desde)} ·{" "}
                    {a.cobro === "paddle" ? "se cobra solo (Paddle)" : "facturar a mano"}
                  </span>
                </span>
                <span className="shrink-0 text-right font-semibold">
                  {precio(a.importe)}
                  <span className="block text-[11px] font-normal text-muted-foreground">
                    {/anual/i.test(a.ciclo) ? "por año" : "por mes"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 border-t border-border/60 pt-2 text-xs text-muted-foreground">
            Equivale a <b className="text-foreground">{precio(Math.round(porMes * 100) / 100)}</b> por mes (sin
            impuestos).
          </p>
        </>
      )}
    </div>
  );
}

/** «Entrar como» la clínica en modo SOPORTE: ve lo mismo que su Administrador, pero no puede
 *  cambiar nada, no ve el chat interno y dura 30 minutos. Se abre en otra pestaña y queda en
 *  la auditoría (quién, cuándo, motivo y qué módulos miró). */
function EntrarComoSoporte({ clinica: c }: { clinica: Clinica }) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const entrar = useAccion(entrarComoSoporte, ["actividad"]);
  const suspendida = c.estadoPago === "suspendida";
  const sinDireccion = !c.slug;

  const confirmarEntrada = () => {
    setError(null);
    if (motivo.trim().length < 5) return setError("Escribí el motivo (al menos 5 letras).");
    // La pestaña se abre YA (si no, el navegador la bloquea) y después se le pone la dirección
    const pestana = window.open("about:blank", "_blank");
    entrar.mutate(
      { id: c.id, motivo: motivo.trim() },
      {
        onSuccess: (a) => {
          const url = `/c/${a.slug}#soporte=${a.token}`;
          if (pestana) {
            pestana.opener = null;
            pestana.location.href = url;
          } else window.location.assign(url);
          setAbierto(false);
          setMotivo("");
        },
        onError: (e) => {
          pestana?.close();
          setError(e instanceof Error ? e.message : "No se pudo abrir el acceso de soporte.");
        },
      },
    );
  };

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-4">
      <p className="flex items-center gap-2 text-sm font-bold">
        <LifeBuoy className="h-4 w-4 text-primary" /> Soporte
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Mirá el sistema como lo ve el Administrador de la clínica, para ayudarla. Es{" "}
        <b>solo lectura</b> (no se puede cambiar nada), no muestra el chat interno y dura 30
        minutos. Queda registrado en la auditoría con el motivo.
      </p>
      <Button
        className="mt-3"
        size="sm"
        disabled={!CON_BACKEND || suspendida || sinDireccion}
        onClick={() => {
          setError(null);
          setAbierto(true);
        }}
      >
        <Eye className="mr-1.5 h-4 w-4" /> Entrar como la clínica (solo lectura)
      </Button>
      {(!CON_BACKEND || suspendida || sinDireccion) && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {!CON_BACKEND
            ? "Disponible con el servidor conectado."
            : suspendida
              ? "La clínica está suspendida: no se puede entrar."
              : "La clínica todavía no tiene dirección web."}
        </p>
      )}

      <DialogoFormulario
        abierto={abierto}
        titulo={`Entrar como ${c.nombre}`}
        descripcion="Solo lectura · 30 minutos · se abre en otra pestaña. El motivo queda en la auditoría."
        onCerrar={() => setAbierto(false)}
        onGuardar={confirmarEntrada}
        guardando={entrar.isPending}
        error={error}
        textoGuardar="Entrar (solo lectura)"
      >
        <Campo label="Motivo" ayuda="Ej.: La clínica dice que no ve los turnos de mañana (ticket #123)">
          <textarea
            className={`${INPUT} h-24 resize-none py-2`}
            value={motivo}
            maxLength={300}
            autoFocus
            onChange={(e) => setMotivo(e.target.value)}
          />
        </Campo>
      </DialogoFormulario>
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
              {c.montoInicial != null
                ? precio(c.montoInicial)
                : plan?.precioInicial != null
                  ? `${precio(plan.precioInicial)} (del plan)`
                  : "Sin definir"}
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
