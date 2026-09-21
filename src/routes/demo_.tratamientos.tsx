import { createFileRoute } from "@tanstack/react-router";
import { Stethoscope } from "lucide-react";
import { PaginaSeccionPaciente, headSeccion } from "@/components/cloud-esther/SeccionDirecta";

export const Route = createFileRoute("/demo_/tratamientos")({
  head: headSeccion("Tratamientos"),
  component: Pagina,
});

function Pagina() {
  return (
    <PaginaSeccionPaciente
      seccion="tratamientos"
      titulo="Tratamientos"
      descripcion="Buscá al paciente y gestioná sus tratamientos planificados, en curso y finalizados."
      icon={Stethoscope}
    />
  );
}