import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PublicLayout, PageHero } from "@/components/site/PublicLayout";
import { PlanGrid } from "@/components/site/PlanCards";
import { Reveal } from "@/components/site/Reveal";
import { comparison, plans } from "@/lib/site-data";

export const Route = createFileRoute("/planes")({
  head: () => ({
    meta: [
      { title: "Planes y precios | Cloud Esther" },
      {
        name: "description",
        content:
          "Cuatro planes para clínicas odontológicas: Esencial, Profesional, Avanzado y Enterprise, con comparador de funciones.",
      },
      { property: "og:title", content: "Planes y precios de Cloud Esther" },
      {
        property: "og:description",
        content: "Elegí el plan que mejor se adapta al tamaño y ritmo de tu clínica.",
      },
    ],
  }),
  component: Planes,
});

function Planes() {
  const navigate = useNavigate();

  return (
    <PublicLayout>
      <PageHero
        eyebrow="Planes y precios"
        title="Un plan para cada etapa de tu clínica."
        subtitle="Precios claros, implementación acompañada y módulos que se suman cuando los necesitás."
      />

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <PlanGrid onSelect={(plan) => navigate({ to: "/registro", search: { plan: plan.id } })} />
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24 lg:px-8">
        <Reveal className="text-center">
          <h2 className="text-3xl font-bold lg:text-4xl">Compará los planes</h2>
          <p className="mt-4 text-muted-foreground">
            Todas las funciones incluidas en cada plan de Cloud Esther.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="card-premium mt-10 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-4 text-left font-semibold">Función</th>
                  {plans.map((p) => (
                    <th
                      key={p.id}
                      className={`p-4 text-center font-semibold ${
                        p.featured ? "text-primary" : ""
                      }`}
                    >
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparison.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={`border-b border-border transition-colors last:border-0 hover:bg-lavender/60 ${
                      i % 2 ? "bg-muted/30" : ""
                    }`}
                  >
                    <td className="p-4 font-medium">{row.feature}</td>
                    {row.values.map((v, j) => (
                      <td
                        key={j}
                        className={`p-4 text-center ${
                          v === "—" ? "text-muted-foreground" : "text-foreground"
                        }`}
                      >
                        {v === "✓" ? <span className="text-primary">✓</span> : v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </section>
    </PublicLayout>
  );
}
