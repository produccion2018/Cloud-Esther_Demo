import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [{ title: "Demo | Cloud Esther" }],
  }),
});