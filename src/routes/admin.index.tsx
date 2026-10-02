import { Link, createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CircleDollarSign,
  Flame,
  LifeBuoy,
  MonitorPlay,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Cargando,
  EstadoDemoBadge,
  InteresBadge,
  KpiCard,
  Seccion,
  Vacio,
  tooltipGrafico,
} from "@/components/admin/bits";
import { canAccess, permisos, roleDescription, roleLabel, useRole } from "@/components/admin/role";
import { AdminShell } from "@/components/admin/shell";
import {
  useActividad,
  useClinicas,
  useConsumoIA,
  useCrecimiento,
  useDemos,
  usePlanes,
  useTickets,
} from "@/lib/admin/consultas";
import {
  ETIQUETA_PAGO,
  diasHasta,
  haceCuanto,
  miles,
  minutosTexto,
  precio,
  resumenDemo,
} from "@/lib/admin/formato";
import { useSesionAdmin } from "@/lib/admin/sesion";
import type { EstadoPago } from "@/lib/admin/tipos";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Resumen — Cloud Esther Administración" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminDashboard,
});

const COLOR_PAGO: Record<EstadoPago, string> = {
  "al-dia": "var(--success)",
  pendiente: "var(--warning)",
  mora: "var(--destructive)",
  suspendida: "var(--muted-foreground)",
};

type Tarea = { texto: string; detalle: string; to: string; icono: LucideIcon; tono: string };

function AdminDashboard() {
  const { role } = useRole();
  const sesion = useSesionAdmin();
  const clinicas = useClinicas();
  const demos = useDemos();
  const tickets = useTickets();
  const actividad = useActividad();
  const ia = useConsumoIA();
  const crecimiento = useCrecimiento();
  const planes = usePlanes();

  const nombre = sesion?.usuario.nombre.split(" ")[0] ?? roleLabel[role];
  const cargando = clinicas.isLoading || demos.isLoading;

  const lista = clinicas.data ?? [];
  const activas = lista.filter((c) => c.estadoPago !== "suspendida");
  const conteo = (e: EstadoPago) => lista.filter((c) => c.estadoPago === e).length;
  const pagos = (["al-dia", "pendiente", "mora", "suspendida"] as EstadoPago[]).map((k) => ({
    key: k,
    label: ETIQUETA_PAGO[k],
    value: conteo(k),
  }));
  const demosR = (demos.data ?? []).map((d) => ({ d, r: resumenDemo(d) }));
  const abiertas = demosR.filter(({ d }) => d.estado !== "Convertida" && d.estado !== "Descartada");
  const altoSinContactar = abiertas.filter(
    ({ d, r }) => r.interes === "Alto" && d.estado !== "Contactada",
  );
  const iaMes = ia.data?.at(-1)?.minutos ?? 0;
  const iaAnterior = ia.data?.at(-2)?.minutos ?? 0;
  const precioDe = (id: string) => planes.data?.find((p) => p.id === id)?.precioMensual ?? null;
  const facturacion = activas.reduce<number | null>((s, c) => {
    const p = c.importe ?? precioDe(c.plan);
    return p === null ? s : (s ?? 0) + p;
  }, null);

  // Lo que cada perfil tiene que resolver hoy.
  const tareas: Tarea[] = [];
  if (canAccess(role, "/admin/demos") && altoSinContactar.length)
    tareas.push({
      texto: `${altoSinContactar.length} ${altoSinContactar.length === 1 ? "demo" : "demos"} con interés alto sin contactar`,
      detalle: altoSinContactar
        .map(({ d }) => d.clinica)
        .slice(0, 3)
        .join(", "),
      to: "/admin/demos",
      icono: Flame,
      tono: "text-success bg-success/10",
    });
  if (canAccess(role, "/admin/pagos")) {
    const mora = lista.filter((c) => c.estadoPago === "mora");
    if (mora.length)
      tareas.push({
        texto: `${mora.length} ${mora.length === 1 ? "clínica" : "clínicas"} en mora`,
        detalle: mora.map((c) => c.nombre).join(", "),
        to: "/admin/pagos",
        icono: AlertTriangle,
        tono: "text-destructive bg-destructive/10",
      });
    const proximos = lista.filter(
      (c) =>
        c.estadoPago !== "suspendida" &&
        diasHasta(c.proximoCobro) >= 0 &&
        diasHasta(c.proximoCobro) <= 7,
    );
    if (proximos.length)
      tareas.push({
        texto: `${proximos.length} cobros en los próximos 7 días`,
        detalle: proximos
          .map((c) => c.nombre)
          .slice(0, 3)
          .join(", "),
        to: "/admin/pagos",
        icono: CircleDollarSign,
        tono: "text-warning-foreground bg-warning/15",
      });
  }
  const sinAsignar = (tickets.data ?? []).filter(
    (t) => t.estado !== "Resuelto" && t.estado !== "Cerrado" && !t.responsable,
  );
  if (sinAsignar.length)
    tareas.push({
      texto: `${sinAsignar.length} ${sinAsignar.length === 1 ? "ticket" : "tickets"} sin asignar`,
      detalle: sinAsignar
        .map((t) => t.asunto)
        .slice(0, 2)
        .join(" · "),
      to: "/admin/soporte",
      icono: LifeBuoy,
      tono: "text-primary bg-primary/10",
    });
  const cercaLimite = lista.filter((c) => {
    const p = planes.data?.find((x) => x.id === c.plan);
    return (
      p &&
      (c.uso.usuariosInternos / p.usuariosInternos >= 0.85 ||
        c.uso.pacientesActivos / p.pacientesActivos >= 0.85 ||
        c.uso.sucursales / p.sucursales >= 1)
    );
  });
  if (cercaLimite.length && (role === "owner" || role === "partner"))
    tareas.push({
      texto: `${cercaLimite.length} ${cercaLimite.length === 1 ? "clínica está" : "clínicas están"} cerca del límite de su plan`,
      detalle: "Oportunidad para ofrecer más capacidad o un plan superior",
      to: "/admin/clinicas",
      icono: Building2,
      tono: "text-primary bg-primary/10",
    });

  return (
    <AdminShell
      title={`Hola, ${nombre}`}
      description={`${roleLabel[role]} · ${roleDescription[role]}`}
    >
      {cargando ? (
        <Cargando />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
            <KpiCard
              accent
              label="Clínicas activas"
              value={String(activas.length)}
              hint={`${conteo("suspendida")} suspendidas`}
              icon={<Building2 className="h-4 w-4" />}
            />
            <KpiCard
              label="Demos abiertas"
              value={String(abiertas.length)}
              hint={`${altoSinContactar.length} con interés alto sin contactar`}
              icon={<MonitorPlay className="h-4 w-4" />}
            />
            {permisos.verImportes(role) ? (
              <KpiCard
                label="Facturación mensual"
                value={precio(facturacion)}
                hint={
                  facturacion === null
                    ? "Cargá los precios en Planes y precios"
                    : "Suma de las clínicas activas"
                }
                icon={<CircleDollarSign className="h-4 w-4" />}
              />
            ) : (
              <KpiCard
                label="Cobranza"
                value={`${conteo("al-dia")} / ${activas.length}`}
                hint={`${conteo("pendiente")} por pagar · ${conteo("mora")} en mora`}
                icon={<CircleDollarSign className="h-4 w-4" />}
              />
            )}
            <KpiCard
              label="Consumo de IA (mes)"
              value={minutosTexto(iaMes)}
              hint={
                iaAnterior
                  ? `${iaMes >= iaAnterior ? "+" : ""}${Math.round(((iaMes - iaAnterior) / iaAnterior) * 100)}% vs. mes anterior`
                  : ""
              }
              icon={<Sparkles className="h-4 w-4" />}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <Seccion
              titulo="Para resolver"
              descripcion="Lo pendiente para tu perfil, ordenado por importancia."
            >
              {tareas.length === 0 ? (
                <Vacio titulo="Todo al día" texto="No hay pendientes para tu perfil." />
              ) : (
                <ul className="space-y-2">
                  {tareas.map((t) => (
                    <li key={t.texto}>
                      <Link
                        to={t.to}
                        className="group flex items-center gap-3 rounded-2xl border border-border/80 p-3 transition hover:border-primary/35 hover:bg-primary/[0.03]"
                      >
                        <span
                          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${t.tono}`}
                        >
                          <t.icono className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">{t.texto}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {t.detalle}
                          </span>
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Seccion>

            <Seccion titulo="Estado de pagos" descripcion={`${lista.length} clínicas clientes`}>
              <div className="grid grid-cols-[150px_minmax(0,1fr)] items-center gap-4">
                <div className="h-[150px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pagos}
                        dataKey="value"
                        nameKey="label"
                        innerRadius={46}
                        outerRadius={70}
                        paddingAngle={3}
                        stroke="none"
                      >
                        {pagos.map((s) => (
                          <Cell key={s.key} fill={COLOR_PAGO[s.key]} />
                        ))}
                      </Pie>
                      <Tooltip {...tooltipGrafico} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="space-y-2">
                  {pagos.map((s) => (
                    <li key={s.key} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: COLOR_PAGO[s.key] }}
                        />
                        {s.label}
                      </span>
                      <span className="font-bold tabular-nums">{s.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Seccion>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Seccion
              titulo="Últimas demos"
              descripcion="Quién está probando Cloud Esther"
              acciones={
                <Link
                  to="/admin/demos"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Ver todas
                </Link>
              }
              sinPadding
            >
              <ul className="divide-y divide-border/60">
                {[...demosR]
                  .sort((a, b) => (b.r.ultimo ?? "").localeCompare(a.r.ultimo ?? ""))
                  .slice(0, 5)
                  .map(({ d, r }) => (
                    <li key={d.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{d.clinica}</span>
                        <span className="block text-xs text-muted-foreground">
                          {r.ingresos} ingresos · {minutosTexto(r.minutos)} · {haceCuanto(r.ultimo)}
                        </span>
                      </span>
                      <InteresBadge interes={r.interes} />
                      <EstadoDemoBadge estado={d.estado} />
                    </li>
                  ))}
              </ul>
            </Seccion>

            <Seccion titulo="Crecimiento de clínicas" descripcion="Altas por mes y total acumulado">
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={crecimiento.data ?? []} margin={{ left: -20, right: 8, top: 8 }}>
                    <defs>
                      <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                    <Tooltip {...tooltipGrafico} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    <Area
                      type="monotone"
                      name="Total de clínicas"
                      dataKey="total"
                      stroke="var(--primary)"
                      strokeWidth={2.5}
                      fill="url(#gTotal)"
                    />
                    <Area
                      type="monotone"
                      name="Altas del mes"
                      dataKey="nuevas"
                      stroke="var(--primary-glow)"
                      strokeWidth={2}
                      fill="transparent"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Seccion>
          </div>

          {canAccess(role, "/admin/auditoria") && (
            <Seccion
              titulo="Actividad reciente"
              acciones={
                <Link
                  to="/admin/auditoria"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Ver auditoría
                </Link>
              }
            >
              <ul className="grid gap-2 md:grid-cols-2">
                {(actividad.data ?? []).slice(0, 6).map((e) => (
                  <li
                    key={e.id}
                    className="flex items-start gap-2 rounded-xl bg-muted/50 px-3 py-2 text-sm"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span className="min-w-0">
                      <span className="block">{e.accion}</span>
                      <span className="text-xs text-muted-foreground">
                        {e.actor} · {haceCuanto(e.fecha)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </Seccion>
          )}

          <p className="text-center text-[11px] text-muted-foreground">
            {miles(lista.reduce((s, c) => s + c.uso.pacientesActivos, 0))} pacientes activos y{" "}
            {miles(lista.reduce((s, c) => s + c.uso.usuariosInternos, 0))} usuarios internos en toda
            la plataforma.
          </p>
        </>
      )}
    </AdminShell>
  );
}
