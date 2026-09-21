import { createFileRoute } from "@tanstack/react-router";
import { Pill } from "lucide-react";
import { PaginaSeccionPaciente, headSeccion } from "@/components/cloud-esther/SeccionDirecta";

export const Route = createFileRoute("/demo_/recetas")({
  head: headSeccion("Receta digital"),
  component: Pagina,
});

function Pagina() {
  return (
    <PaginaSeccionPaciente
      seccion="recetas"
      titulo="Receta digital"
      descripcion="Buscá al paciente y emití o consultá sus recetas digitales, con medicamentos, posología e indicaciones."
      icon={Pill}
    />
  );
}