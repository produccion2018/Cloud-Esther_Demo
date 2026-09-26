import { createFileRoute } from "@tanstack/react-router";
import Integraciones from "@/components/cloud-esther/Integraciones";

export const Route = createFileRoute("/demo_/integraciones")({
  head: () => ({
    meta: [{ title: "Integraciones | Cloud Esther" }],
  }),
  component: Integraciones,
});