import { createFileRoute } from "@tanstack/react-router";
import { Images } from "lucide-react";
import { PaginaSeccionPaciente, headSeccion } from "@/components/cloud-esther/SeccionDirecta";

export const Route = createFileRoute("/demo_/estudios")({
  head: headSeccion("Estudios y diagnóstico"),
  component: Pagina,
});

function Pagina() {
  return (
    <PaginaSeccionPaciente
      seccion="estudios"
      titulo="Estudios y diagnóstico"
      descripcion="Buscá al paciente y accedé a sus radiografías, tomografías, fotografías clínicas, mediciones y diagnósticos."
      icon={Images}
    />
  );
}