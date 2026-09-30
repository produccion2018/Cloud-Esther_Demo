import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/cloud-esther/AppShell";
import { CloudEstherProvider } from "@/lib/cloud-esther/data";
import { Presupuestos } from "@/components/cloud-esther/presupuestos/Presupuestos";

export const Route = createFileRoute("/demo_/presupuestos")({
  head: () => ({ meta: [{ title: "Presupuestos | Cloud Esther" }] }),
  component: () => (
    <CloudEstherProvider>
      <AppShell>
        <Presupuestos />
      </AppShell>
    </CloudEstherProvider>
  ),
});
