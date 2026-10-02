import { createFileRoute } from "@tanstack/react-router";

/* Subrutas de /admin (ej. /admin/demos): las resuelve admin.tsx, que lleva al panel. */
export const Route = createFileRoute("/admin/$")({
  component: () => null,
});
