import { createFileRoute } from "@tanstack/react-router";
import PortalPaciente from "@/components/cloud-esther/PortalPaciente";
import { InstalarPortal } from "@/components/site/InstalarPortal";

/* Entrada pública del portal: los pacientes ingresan con su DNI o correo y un código.
   TODO backend: identificar la clínica por subdominio o ruta (ej. /portal/mi-clinica). */
export const Route = createFileRoute("/portal")({
  head: () => ({ meta: [{ title: "Portal del paciente | Cloud Esther" }] }),
  component: PortalPacienteRuta,
});

function PortalPacienteRuta() {
  return (
    <>
      <PortalPaciente />
      {/* PWA: el portal del paciente se instala como su propia app. */}
      <InstalarPortal
        manifest="/portal-paciente.webmanifest"
        titulo="Mi portal"
        nombre="el Portal del paciente"
      />
    </>
  );
}
