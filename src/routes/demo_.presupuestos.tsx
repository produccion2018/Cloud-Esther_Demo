import { createFileRoute } from "@tanstack/react-router";
import { ReceiptText } from "lucide-react";
import { PaginaSeccionPaciente, headSeccion } from "@/components/cloud-esther/SeccionDirecta";

export const Route = createFileRoute("/demo_/presupuestos")({
  head: headSeccion("Presupuestos"),
  component: Pagina,
});

function Pagina() {
  return (
    <PaginaSeccionPaciente
      seccion="presupuestos"
      titulo="Presupuestos"
      descripcion="Buscá al paciente y accedé a sus presupuestos con prácticas y estado de aprobación."
      icon={ReceiptText}
    />
  );
}