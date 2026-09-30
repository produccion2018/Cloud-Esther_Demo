import { createFileRoute } from "@tanstack/react-router";
import PortalEquipo from "@/components/cloud-esther/PortalEquipo";

/* Entrada del equipo (odontólogos, asistentes, secretarias y administración) desde el celular o la PC. */
export const Route = createFileRoute("/equipo")({
  head: () => ({
    meta: [
      { title: "Portal del equipo | Cloud Esther" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
    ],
  }),
  component: PortalEquipo,
});
