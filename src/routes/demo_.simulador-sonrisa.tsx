import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/cloud-esther/AppShell";
import { SimuladorSonrisa } from "@/components/cloud-esther/simulador/SimuladorSonrisa";
import { CloudEstherProvider } from "@/lib/cloud-esther/data";

export const Route = createFileRoute("/demo_/simulador-sonrisa")({
  head: () => ({
    meta: [{ title: "Simulador de Sonrisa | Cloud Esther" }],
  }),
  component: SimuladorSonrisaPage,
});

function SimuladorSonrisaPage() {
  return (
    <CloudEstherProvider>
      <AppShell>
        <SimuladorSonrisa />
      </AppShell>
    </CloudEstherProvider>
  );
}
