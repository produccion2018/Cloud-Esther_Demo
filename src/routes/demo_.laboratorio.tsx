import { createFileRoute } from "@tanstack/react-router";
import { FlaskConical } from "lucide-react";
import { PaginaSeccionPaciente, headSeccion } from "@/components/cloud-esther/SeccionDirecta";

export const Route = createFileRoute("/demo_/laboratorio")({
  head: headSeccion("Laboratorio"),
  component: Pagina,
});

function Pagina() {
  return (
    <PaginaSeccionPaciente
      seccion="laboratorio"
      titulo="Laboratorio"
      descripcion="Buscá al paciente y accedé directamente a sus trabajos de laboratorio: técnica, estado y enlace al odontograma 2D o 3D correspondiente."
      icon={FlaskConical}
    />
  );
}