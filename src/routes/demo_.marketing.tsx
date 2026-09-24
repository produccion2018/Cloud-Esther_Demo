import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/cloud-esther/AppShell";
import { CloudEstherProvider } from "@/lib/cloud-esther/data";
import Marketing from "@/components/cloud-esther/Marketing";

export const Route = createFileRoute("/demo_/marketing")({
  component: MarketingPage,
});

function MarketingPage() {
  return (
    <CloudEstherProvider>
      <AppShell>
        <Marketing />
      </AppShell>
    </CloudEstherProvider>
  );
}