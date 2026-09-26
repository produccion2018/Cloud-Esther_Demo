import { createFileRoute } from "@tanstack/react-router";
import Automatizaciones from "@/components/cloud-esther/Automatizaciones";

export const Route = createFileRoute("/demo_/automatizaciones")({
  head: () => ({
    meta: [{ title: "Automatización | Cloud Esther" }],
  }),
  component: Automatizaciones,
});