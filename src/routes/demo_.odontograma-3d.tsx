import { createFileRoute } from "@tanstack/react-router";
import { Activity } from "lucide-react";
import { PaginaSeccionPaciente, headSeccion } from "@/components/cloud-esther/SeccionDirecta";

export const Route = createFileRoute("/demo_/odontograma-3d")({
  head: headSeccion("Odontograma 3D"),
  component: Pagina,
});

function Pagina() {
  return (
    <PaginaSeccionPaciente
      seccion="odontograma"
      titulo="Odontograma 3D"
      descripcion="Buscá al paciente y accedé a su odontograma en 3D."
      icon={Activity}
    />
  );
}