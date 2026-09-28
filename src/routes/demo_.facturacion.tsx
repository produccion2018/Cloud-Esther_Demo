import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/cloud-esther/AppShell";
import { CloudEstherProvider } from "@/lib/cloud-esther/data";
import { Facturacion } from "@/components/cloud-esther/Facturacion";

export const Route = createFileRoute("/demo_/facturacion")({
  component: DemoFacturacion,
  head: () => ({
    meta: [{ title: "Facturación | Cloud Esther" }],
  }),
});

function DemoFacturacion() {
  return (
    <CloudEstherProvider>
      <AppShell>
        <Facturacion />
      </AppShell>
    </CloudEstherProvider>
  );
}