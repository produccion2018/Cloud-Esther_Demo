import { createFileRoute } from "@tanstack/react-router";
import { Building2, Sparkles, TrendingUp, Trophy } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Cargando, KpiCard, Seccion, tooltipGrafico } from "@/components/admin/bits";
import { RestrictedView } from "@/components/admin/restricted";
import { canAccess, useRole } from "@/components/admin/role";
import { AdminShell } from "@/components/admin/shell";
import { useClinicas, useConsumoIA } from "@/lib/admin/consultas";
import { NOMBRE_PLAN, miles, minutosTexto } from "@/lib/admin/formato";

export const Route = createFileRoute("/admin/ia")({
  head: () => ({
    meta: [
      { title: "Consumo de IA — Cloud Esther Administración" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AiPage,
});

function AiPage() {
  const { role } = useRole();
  const { data: clinicas, isLoading } = useClinicas();
  const { data: mensual } = useConsumoIA();
  if (!canAccess(role, "/admin/ia")) return <RestrictedView />;

  const conIA = (clinicas ?? []).filter((c) => c.uso.minutosIA > 0);
  const ranking = [...conIA].sort((a, b) => b.uso.minutosIA - a.uso.minutosIA);
  const total = ranking.reduce((s, c) => s + c.uso.minutosIA, 0);
  const mes = mensual?.at(-1)?.minutos ?? 0;
  const anterior = mensual?.at(-2)?.minutos ?? 0;

  return (
    <AdminShell
      title="Consumo de IA"
      description="Cuánto usa cada clínica a Esther IA (rayos X, simulador de sonrisa, asistente clínico y reportes) y la evolución en toda la plataforma. La IA está incluida desde el plan Plus."
    >
      {isLoading ? (
        <Cargando />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
            <KpiCard
              accent
              label="Minutos este mes"
              value={miles(mes)}
              hint={
                anterior
                  ? `${mes >= anterior ? "+" : ""}${Math.round(((mes - anterior) / anterior) * 100)}% vs. mes anterior`
                  : ""
              }
              icon={<Sparkles className="h-4 w-4" />}
            />
            <KpiCard
              label="Clínicas que usan IA"
              value={String(conIA.length)}
              hint={`de ${(clinicas ?? []).length} clínicas`}
              icon={<Building2 className="h-4 w-4" />}
            />
            <KpiCard
              label="Promedio por clínica"
              value={minutosTexto(conIA.length ? Math.round(total / conIA.length) : 0)}
              hint="Entre las que usan IA"
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <KpiCard
              label="Mayor consumo"
              value={ranking[0] ? minutosTexto(ranking[0].uso.minutosIA) : "—"}
              hint={ranking[0]?.nombre ?? ""}
              icon={<Trophy className="h-4 w-4" />}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Seccion titulo="Evolución mensual" descripcion="Minutos de IA en toda la plataforma">
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mensual ?? []} margin={{ left: -6, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} fontSize={12} />
                    <Tooltip {...tooltipGrafico} />
                    <Line
                      type="monotone"
                      dataKey="minutos"
                      name="Minutos"
                      stroke="var(--primary)"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "var(--primary)" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Seccion>
            <Seccion titulo="Ranking por clínica" descripcion="Minutos usados este mes">
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={ranking.slice(0, 8)}
                    layout="vertical"
                    margin={{ left: 0, right: 16 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      horizontal={false}
                    />
                    <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis
                      type="category"
                      dataKey="nombre"
                      width={170}
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                    />
                    <Tooltip {...tooltipGrafico} cursor={{ fill: "var(--muted)" }} />
                    <Bar dataKey="uso.minutosIA" name="Minutos" radius={[0, 8, 8, 0]}>
                      {ranking.slice(0, 8).map((c, i) => (
                        <Cell
                          key={c.id}
                          fill={
                            i === 0
                              ? "var(--primary-deep)"
                              : i < 3
                                ? "var(--primary)"
                                : "var(--primary-glow)"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Seccion>
          </div>

          <Seccion
            titulo="Detalle por clínica"
            descripcion="Participación sobre el total de la plataforma"
            sinPadding
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="bg-primary/[0.035] text-left text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    <th className="px-5 py-2.5">Clínica</th>
                    <th className="px-3 py-2.5">Plan</th>
                    <th className="px-3 py-2.5">Minutos</th>
                    <th className="px-5 py-2.5">% del total</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((c) => {
                    const pct = total ? (c.uso.minutosIA / total) * 100 : 0;
                    return (
                      <tr key={c.id} className="border-t border-border/60">
                        <td className="px-5 py-3 font-semibold">{c.nombre}</td>
                        <td className="px-3 py-3 text-xs font-semibold">{NOMBRE_PLAN[c.plan]}</td>
                        <td className="px-3 py-3 tabular-nums">{miles(c.uso.minutosIA)}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs tabular-nums">{pct.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Seccion>
        </>
      )}
    </AdminShell>
  );
}
