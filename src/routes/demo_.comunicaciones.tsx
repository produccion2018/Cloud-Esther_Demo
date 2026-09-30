import { createFileRoute } from "@tanstack/react-router";
import { ComunicacionPage } from "@/components/cloud-esther/Comunicacion";

export const Route = createFileRoute("/demo_/comunicaciones")({
  head: () => ({
    meta: [{ title: "Comunicación | Cloud Esther" }],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: ComunicacionPage,
});
