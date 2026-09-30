import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/cloud-esther/AppShell";
import { CloudEstherProvider } from "@/lib/cloud-esther/data";
import { RRHH } from "@/components/cloud-esther/rrhh/RRHH";

export const Route = createFileRoute("/demo_/rrhh")({
  component: DemoRRHH,
  head: () => ({
    meta: [{ title: "Recursos Humanos | Cloud Esther" }],
  }),
});

function DemoRRHH() {
  return (
    <CloudEstherProvider>
      <AppShell>
        <RRHH />
      </AppShell>
    </CloudEstherProvider>
  );
}
