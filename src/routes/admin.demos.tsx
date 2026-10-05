import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarClock,
  Clock,
  Flame,
  Mail,
  MessageCircle,
  MonitorPlay,
  Phone,
  Search,
  Trophy,
  UserCheck,
  Handshake,
  TimerOff,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import {
  Cargando,
  EstadoDemoBadge,
  InteresBadge,
  KpiCard,
  Seccion,
  Vacio,
  tooltipGrafico,
} from "@/components/admin/bits";
import { RestrictedView } from "@/components/admin/restricted";
import { canAccess, permisos, useRole } from "@/components/admin/role";
import { LimitesDemo, SinLimiteCuenta } from "@/components/admin/limites-demo";
import { AdminShell } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { actualizarDemo } from "@/lib/admin/api";
import { useAccion, useDemos, useEquipo } from "@/lib/admin/consultas";
import { fecha, haceCuanto, minutosTexto, resumenDemo, type Interes } from "@/lib/admin/formato";
import type { CuentaDemo, EstadoDemo } from "@/lib/admin/tipos";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/demos")({
  head: () => ({
    meta: [
      { title: "Demos e interesados — Cloud Esther Administración" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DemosPage,
});

const ESTADOS: EstadoDemo[] = [
  "En curso",
  "Sin actividad",
  "Contactada",
  "Convertida",
  "Descartada",
];
const SELECT =
  "h-10 rounded-xl border border-input bg-card px-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10";

function DemosPage() {
  const { role } = useRole();
  const { data: demos, isLoading } = useDemos();
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<EstadoDemo | "">("");
  const [interes, setInteres] = useState<Interes | "">("");
  const [orden, setOrden] = useState<"recientes" | "interes">("recientes");
  const [abierta, setAbierta] = useState<string | null>(null);

  const filas = useMemo(() => (demos ?? []).map((d) => ({ demo: d, r: resumenDemo(d) })), [demos]);

  if (!canAccess(role, "/admin/demos")) return <RestrictedView />;

  const texto = q.trim().toLowerCase();
  const lista = filas
    .filter(
      ({ demo, r }) =>
        (!texto ||
          `${demo.nombre} ${demo.clinica} ${demo.email} ${demo.pais}`
            .toLowerCase()
            .includes(texto)) &&
        (!estado || demo.estado === estado) &&
        (!interes || r.interes === interes),
    )
    .sort((a, b) =>
      orden === "interes"
        ? b.r.minutos + b.r.ingresos * 20 - (a.r.minutos + a.r.ingresos * 20)
        : (b.r.ultimo ?? "").localeCompare(a.r.ultimo ?? ""),
    );

  // Indicadores (últimos 30 días)
  const desde = Date.now() - 30 * 86_400_000;
  const ingresos30 = filas.flatMap(({ demo }) =>
    demo.ingresos.filter((i) => new Date(i.inicio).getTime() >= desde),
  );
  const minutos30 = ingresos30.reduce((s, i) => s + i.minutos, 0);
  const convertidas = filas.filter(({ demo }) => demo.estado === "Convertida").length;
  const expiraron30 = ingresos30.filter((i) => i.cierre === "Expiró").length;
  const solicitudes30 = filas.flatMap(({ demo }) =>
    (demo.solicitudes ?? []).filter((x) => new Date(x.fecha).getTime() >= desde),
  );
  const altos = filas.filter(
    ({ demo, r }) =>
      r.interes === "Alto" && demo.estado !== "Convertida" && demo.estado !== "Descartada",
  ).length;

  // Ingresos por día (últimos 14 días)
  const porDia = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86_400_000);
    const clave = d.toISOString().slice(0, 10);
    return {
      dia: d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }),
      ingresos: ingresos30.filter((x) => x.inicio.slice(0, 10) === clave).length,
    };
  });

  const modulos = new Map<string, number>();
  filas.forEach(({ r }) =>
    r.modulos.forEach((m) => modulos.set(m.nombre, (modulos.get(m.nombre) ?? 0) + m.veces)),
  );
  const topModulos = Array.from(modulos.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7);
  const maxModulo = topModulos[0]?.[1] ?? 1;

  const seleccionada = filas.find(({ demo }) => demo.id === abierta) ?? null;

  return (
    <AdminShell
      title="Demos e interesados"
      description="Quién probó Cloud Esther, cuántas veces entró, cuánto tiempo usó el demo y qué módulos miró. Cada ingreso dura 30 minutos: volver a entrar es una señal de interés."
    >
      {isLoading ? (
        <Cargando />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4 2xl:grid-cols-7">
            <KpiCard
              accent
              label="Cuentas de demo"
              value={String(filas.length)}
              hint={`${filas.filter(({ demo }) => demo.estado === "En curso").length} con actividad reciente`}
              icon={<MonitorPlay className="h-4 w-4" />}
            />
            <KpiCard
              label="Ingresos (30 días)"
              value={String(ingresos30.length)}
              hint="Cada ingreso dura hasta 30 min"
              icon={<CalendarClock className="h-4 w-4" />}
            />
            <KpiCard
              label="Tiempo promedio"
              value={minutosTexto(
                ingresos30.length ? Math.round(minutos30 / ingresos30.length) : 0,
              )}
              hint="Por ingreso al demo"
              icon={<Clock className="h-4 w-4" />}
            />
            <KpiCard
              label="Agotaron el tiempo"
              value={String(expiraron30)}
              hint={`${ingresos30.length ? Math.round((expiraron30 / ingresos30.length) * 100) : 0}% de los ingresos`}
              icon={<TimerOff className="h-4 w-4" />}
            />
            <KpiCard
              label="Solicitudes comerciales"
              value={String(solicitudes30.length)}
              hint={`${solicitudes30.filter((x) => x.tipo === "Contratación").length} para contratar · 30 días`}
              icon={<Handshake className="h-4 w-4" />}
              tono="success"
            />
            <KpiCard
              label="Interés alto"
              value={String(altos)}
              hint="Para contactar primero"
              icon={<Flame className="h-4 w-4" />}
              tono="success"
            />
            <KpiCard
              label="Convertidas"
              value={`${convertidas}`}
              hint={`${filas.length ? Math.round((convertidas / filas.length) * 100) : 0}% pasaron a cliente`}
              icon={<Trophy className="h-4 w-4" />}
            />
          </div>

          <LimitesDemo />

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Seccion titulo="Ingresos al demo por día" descripcion="Últimos 14 días">
              <div className="h-[230px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={porDia} margin={{ left: -20, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="dia" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                    <Tooltip {...tooltipGrafico} cursor={{ fill: "var(--muted)" }} />
                    <Bar
                      dataKey="ingresos"
                      name="Ingresos"
                      fill="var(--primary)"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Seccion>
            <Seccion titulo="Lo que más miran" descripcion="Módulos visitados en los demos">
              {topModulos.length === 0 ? (
                <Vacio titulo="Sin datos todavía" />
              ) : (
                <ul className="space-y-2.5">
                  {topModulos.map(([nombre, veces]) => (
                    <li key={nombre}>
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold">{nombre}</span>
                        <span className="text-muted-foreground">{veces} visitas</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-primary-glow"
                          style={{ width: `${(veces / maxModulo) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Seccion>
          </div>

          <Seccion
            titulo="Cuentas de demo"
            descripcion="Tocá una fila para ver cada ingreso y hacer el seguimiento."
            sinPadding
          >
            <div className="flex flex-wrap gap-2 border-b border-border/60 px-5 py-3">
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por nombre, clínica, correo o país"
                  className="h-10 rounded-xl pl-9"
                />
              </div>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as EstadoDemo | "")}
                className={SELECT}
                aria-label="Estado"
              >
                <option value="">Todos los estados</option>
                {ESTADOS.map((e) => (
                  <option key={e}>{e}</option>
                ))}
              </select>
              <select
                value={interes}
                onChange={(e) => setInteres(e.target.value as Interes | "")}
                className={SELECT}
                aria-label="Interés"
              >
                <option value="">Todo el interés</option>
                <option value="Alto">Interés alto</option>
                <option value="Medio">Interés medio</option>
                <option value="Bajo">Interés bajo</option>
              </select>
              <select
                value={orden}
                onChange={(e) => setOrden(e.target.value as "recientes" | "interes")}
                className={SELECT}
                aria-label="Orden"
              >
                <option value="recientes">Más recientes</option>
                <option value="interes">Mayor interés</option>
              </select>
            </div>

            {lista.length === 0 ? (
              <div className="p-5">
                <Vacio titulo="No hay demos con esos filtros" texto="Probá con otra búsqueda." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-sm">
                  <thead>
                    <tr className="bg-primary/[0.035] text-left text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                      <th className="px-5 py-2.5">Interesado</th>
                      <th className="px-3 py-2.5">Plan elegido</th>
                      <th className="px-3 py-2.5 text-center">Ingresos</th>
                      <th className="px-3 py-2.5">Tiempo de uso</th>
                      <th className="px-3 py-2.5">Último ingreso</th>
                      <th className="px-3 py-2.5">Interés</th>
                      <th className="px-5 py-2.5">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map(({ demo, r }) => (
                      <tr
                        key={demo.id}
                        onClick={() => setAbierta(demo.id)}
                        className="cursor-pointer border-t border-border/60 transition-colors hover:bg-primary/[0.03]"
                      >
                        <td className="px-5 py-3">
                          <p className="font-semibold">{demo.clinica}</p>
                          <p className="text-xs text-muted-foreground">
                            {demo.nombre} · {demo.pais}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                            {demo.planElegido}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center text-base font-bold tabular-nums">
                          {r.ingresos}
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-semibold">{minutosTexto(r.minutos)}</p>
                          <p className="text-xs text-muted-foreground">
                            {minutosTexto(r.promedio)} por ingreso
                          </p>
                        </td>
                        <td className="px-3 py-3 text-xs">
                          <p className="font-semibold">{haceCuanto(r.ultimo)}</p>
                          <p className="text-muted-foreground">
                            Registro: {fecha(demo.registrado)}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <InteresBadge interes={r.interes} />
                        </td>
                        <td className="px-5 py-3">
                          <EstadoDemoBadge estado={demo.estado} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Seccion>
        </>
      )}

      <Sheet open={!!seleccionada} onOpenChange={(v) => !v && setAbierta(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-xl">
          {seleccionada && (
            <DetalleDemo
              key={seleccionada.demo.id}
              demo={seleccionada.demo}
              puedeGestionar={permisos.gestionarDemos(role)}
            />
          )}
        </SheetContent>
      </Sheet>
    </AdminShell>
  );
}

function DetalleDemo({ demo, puedeGestionar }: { demo: CuentaDemo; puedeGestionar: boolean }) {
  const r = resumenDemo(demo);
  const { data: equipo } = useEquipo();
  const [notas, setNotas] = useState(demo.notas);
  const accion = useAccion(
    (c: Parameters<typeof actualizarDemo>[1]) => actualizarDemo(demo.id, c),
    ["demos"],
    "Seguimiento guardado",
  );
  const telefono = demo.telefono.replace(/[^0-9]/g, "");

  return (
    <div>
      <div
        className="relative overflow-hidden px-6 pb-5 pt-6 text-primary-foreground"
        style={{ background: "var(--gradient-primary)" }}
      >
        <SheetTitle className="text-xl font-extrabold text-primary-foreground">
          {demo.clinica}
        </SheetTitle>
        <p className="text-sm opacity-90">
          {demo.nombre} · {demo.pais} · plan elegido {demo.planElegido}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={`mailto:${demo.email}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold hover:bg-white/25"
          >
            <Mail className="h-3.5 w-3.5" /> {demo.email}
          </a>
          {telefono && (
            <>
              <a
                href={`tel:+${telefono}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold hover:bg-white/25"
              >
                <Phone className="h-3.5 w-3.5" /> {demo.telefono}
              </a>
              <a
                href={`https://wa.me/${telefono}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold hover:bg-white/25"
              >
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
            </>
          )}
        </div>
      </div>

      <div className="space-y-5 p-6">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(
            [
              ["Ingresos", String(r.ingresos)],
              ["Tiempo total", minutosTexto(r.minutos)],
              ["Usó los 30 min", `${r.expiraciones} veces`],
              ["Último ingreso", haceCuanto(r.ultimo)],
            ] as const
          ).map(([l, v]) => (
            <div
              key={l}
              className="rounded-2xl border border-primary/15 bg-primary/[0.04] px-3 py-2"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-primary/75">
                {l}
              </p>
              <p className="text-sm font-bold">{v}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <InteresBadge interes={r.interes} />
          <EstadoDemoBadge estado={demo.estado} />
          {r.planes.map((p) => (
            <span
              key={p}
              className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-semibold"
            >
              Probó {p}
            </span>
          ))}
        </div>

        {/* Seguimiento comercial */}
        <div className="rounded-2xl border border-border p-4">
          <p className="text-sm font-bold">Seguimiento</p>
          {puedeGestionar ? (
            <>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(["Contactada", "Convertida", "Descartada"] as const).map((e) => (
                  <Button
                    key={e}
                    size="sm"
                    variant={demo.estado === e ? "default" : "outline"}
                    onClick={() => accion.mutate({ estado: e })}
                    disabled={accion.isPending}
                  >
                    {e === "Contactada" && <UserCheck className="mr-1 h-3.5 w-3.5" />}
                    {e === "Convertida"
                      ? "Pasó a cliente"
                      : e === "Contactada"
                        ? "Marcar contactada"
                        : "Descartar"}
                  </Button>
                ))}
              </div>
              <label className="mt-3 block text-xs font-semibold text-muted-foreground">
                Responsable
                <select
                  value={demo.responsable ?? ""}
                  onChange={(e) => accion.mutate({ responsable: e.target.value || null })}
                  className={cn(SELECT, "mt-1 w-full")}
                >
                  <option value="">Sin asignar</option>
                  {(equipo ?? [])
                    .filter((a) => a.activo)
                    .map((a) => (
                      <option key={a.id} value={a.nombre}>
                        {a.nombre}
                      </option>
                    ))}
                </select>
              </label>
              <label className="mt-3 block text-xs font-semibold text-muted-foreground">
                Notas
                <Textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={3}
                  placeholder="Qué habló, qué necesita, cuándo volver a llamar…"
                  className="mt-1"
                />
              </label>
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  onClick={() => accion.mutate({ notas })}
                  disabled={accion.isPending || notas === demo.notas}
                >
                  Guardar notas
                </Button>
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              {demo.notas || "Sin notas."}{" "}
              {demo.responsable ? `· Responsable: ${demo.responsable}` : ""}
            </p>
          )}
        </div>

        <SinLimiteCuenta email={demo.email} />

        {/* Solicitudes */}
        {(demo.solicitudes ?? []).length > 0 && (
          <div>
            <p className="text-sm font-bold">Pidió contacto desde el demo</p>
            <ul className="mt-2 space-y-1.5">
              {(demo.solicitudes ?? []).map((x) => (
                <li
                  key={x.fecha}
                  className="flex items-center justify-between gap-2 rounded-xl bg-success/10 px-3 py-2 text-xs"
                >
                  <span className="inline-flex items-center gap-1.5 font-semibold text-success">
                    <Handshake className="h-3.5 w-3.5" /> {x.tipo}
                  </span>
                  <span className="text-muted-foreground">{fecha(x.fecha, true)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Módulos */}
        <div>
          <p className="text-sm font-bold">Módulos que miró</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {r.modulos.map((m) => (
              <span
                key={m.nombre}
                className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
              >
                {m.nombre} · {m.veces}
              </span>
            ))}
          </div>
        </div>

        {/* Ingresos */}
        <div>
          <p className="text-sm font-bold">Cada ingreso</p>
          <ol className="relative mt-3 space-y-3 border-l-2 border-primary/15 pl-4">
            {[...demo.ingresos]
              .sort((a, b) => b.inicio.localeCompare(a.inicio))
              .map((i) => (
                <li key={i.id} className="relative">
                  <span className="absolute -left-[23px] top-3 h-3 w-3 rounded-full border-2 border-card bg-primary" />
                  <div className="rounded-2xl border border-border/80 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-bold">{fecha(i.inicio, true)}</p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
                          i.cierre === "Expiró"
                            ? "bg-success/10 text-success"
                            : i.cierre === "En curso"
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground",
                        )}
                      >
                        {i.minutos} min ·{" "}
                        {i.cierre === "Expiró"
                          ? "usó los 30 min"
                          : i.cierre === "En curso"
                            ? "en curso"
                            : "salió"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{i.modulos.join(" · ")}</p>
                  </div>
                </li>
              ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
