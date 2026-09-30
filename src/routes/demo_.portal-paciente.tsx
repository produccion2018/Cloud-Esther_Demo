import { createFileRoute } from "@tanstack/react-router";
import { PortalMonitorPage } from "@/components/cloud-esther/PortalMonitor";

export const Route = createFileRoute("/demo_/portal-paciente")({
  head: () => ({ meta: [{ title: "Portal del paciente | Cloud Esther" }] }),
  component: PortalMonitorPage,
});
