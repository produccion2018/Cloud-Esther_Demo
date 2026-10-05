import { createFileRoute, redirect } from "@tanstack/react-router";

/* El registro de actividad ahora forma parte de Auditoría (/admin/auditoria).
   Esta ruta queda para que los enlaces viejos sigan funcionando. */
export const Route = createFileRoute("/admin/actividad")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/auditoria" });
  },
});
