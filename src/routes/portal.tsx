import { createFileRoute } from "@tanstack/react-router";
import PortalPaciente from "@/components/cloud-esther/PortalPaciente";

/* Entrada pública del portal: los pacientes ingresan con su DNI o correo y un código.
   TODO backend: identificar la clínica por subdominio o ruta (ej. /portal/mi-clinica). */
export const Route = createFileRoute("/portal")({
  head: () => ({ meta: [{ title: "Portal del paciente | Cloud Esther" }] }),
  component: PortalPaciente,
});
