import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout, PageHero } from "@/components/site/PublicLayout";
import { FaqCards } from "@/components/site/FaqCards";
import { Reveal } from "@/components/site/Reveal";
import { faqs } from "@/lib/site-data";

export const Route = createFileRoute("/preguntas-frecuentes")({
  head: () => ({
    meta: [
      { title: "Preguntas frecuentes | Cloud Esther" },
      {
        name: "description",
        content:
          "Resolvé tus dudas sobre planes, sucursales, migración de datos, seguridad e inteligencia artificial en Cloud Esther.",
      },
      { property: "og:title", content: "Preguntas frecuentes — Cloud Esther" },
      { property: "og:description", content: "Todo lo que necesitás saber antes de empezar." },
    ],
  }),
  component: Faq,
});

function Faq() {
  return (
    <PublicLayout>
      <PageHero
        eyebrow="Soporte"
        title="Preguntas frecuentes"
        subtitle="Todo lo que suelen consultarnos las clínicas antes de empezar con Cloud Esther."
      />

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <FaqCards items={faqs} />

        <Reveal className="mt-14 text-center">
          <div className="card-premium mx-auto max-w-2xl p-8">
            <h2 className="text-2xl font-bold">¿Te quedó alguna duda?</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Coordinamos una demostración personalizada y respondemos todo sobre tu clínica.
            </p>
            <Button asChild variant="hero" size="lg" className="mt-6">
              <Link to="/demostracion">
                Solicitar demostración <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </Reveal>
      </section>
    </PublicLayout>
  );
}
