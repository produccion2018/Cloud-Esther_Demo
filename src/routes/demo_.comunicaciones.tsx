import { createFileRoute } from "@tanstack/react-router";
import { Comunicacion } from "@/components/cloud-esther/Comunicacion";

export const Route = createFileRoute("/demo_/comunicaciones")({
  component: Comunicacion,
});