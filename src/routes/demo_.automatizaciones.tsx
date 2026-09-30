import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/cloud-esther/AppShell";
import { Automatizaciones } from "@/components/cloud-esther/automatizaciones/Automatizaciones";
import { CloudEstherProvider } from "@/lib/cloud-esther/data";

export const Route = createFileRoute("/demo_/automatizaciones")({
  head: () => ({
    meta: [{ title: "Automatizaciones | Cloud Esther" }],
  }),
  component: AutomatizacionesPage,
});

function AutomatizacionesPage() {
  return (
    <CloudEstherProvider>
      <AppShell>
        <Automatizaciones />
      </AppShell>
    </CloudEstherProvider>
  );
}
