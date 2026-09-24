import { createFileRoute } from "@tanstack/react-router";
import Notificaciones from "@/components/cloud-esther/Notificaciones";

export const Route = createFileRoute("/demo_/notificaciones")({
  head: () => ({
    meta: [{ title: "Notificaciones | Cloud Esther" }],
  }),
  component: Notificaciones,
});