import { createFileRoute } from "@tanstack/react-router";

import PortalPaciente from "@/components/cloud-esther/PortalPaciente";

export const Route = createFileRoute("/demo_/portal-paciente")({
  component: PortalPaciente,
});