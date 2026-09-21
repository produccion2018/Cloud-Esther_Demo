import { createFileRoute } from "@tanstack/react-router";
import { History } from "lucide-react";
import { PaginaSeccionPaciente, headSeccion } from "@/components/cloud-esther/SeccionDirecta";

export const Route = createFileRoute("/demo_/historia")({
  head: headSeccion("Historia clínica"),
  component: Pagina,
});

function Pagina() {
  return (
    <PaginaSeccionPaciente
      seccion="historia"
      titulo="Historia clínica"
      descripcion="Buscá al paciente y accedé directamente a su historia clínica: evolución de cada consulta, motivo, pieza y detalle."
      icon={History}
    />
  );
}