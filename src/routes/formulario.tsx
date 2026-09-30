import { createFileRoute } from "@tanstack/react-router";
import { CloudEstherProvider } from "@/lib/cloud-esther/data";
import { FormularioPublico } from "@/components/cloud-esther/Marketing";

/* Formulario público de captación (se embebe en el sitio web o se comparte como link de referido).
   Cada envío entra como lead en Marketing. TODO backend: identificar la clínica por subdominio o ruta. */
export const Route = createFileRoute("/formulario")({
  head: () => ({ meta: [{ title: "Reservá tu evaluación | Cloud Esther" }] }),
  component: () => (
    <CloudEstherProvider>
      <FormularioPublico />
    </CloudEstherProvider>
  ),
});
