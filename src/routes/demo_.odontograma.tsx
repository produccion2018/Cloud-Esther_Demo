import { createFileRoute } from "@tanstack/react-router";
import { Activity } from "lucide-react";
import { PaginaSeccionPaciente, headSeccion } from "@/components/cloud-esther/SeccionDirecta";

export const Route = createFileRoute("/demo_/odontograma")({
  head: headSeccion("Odontograma"),
  component: Pagina,
});

function Pagina() {
  return (
    <PaginaSeccionPaciente
      seccion="odontograma"
      titulo="Odontograma"
      descripcion="Buscá al paciente y accedé a su odontograma."
      icon={Activity}
    />
  );
}