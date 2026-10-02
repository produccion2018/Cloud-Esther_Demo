import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/demo_/admin")({
  beforeLoad: () => {
    throw redirect({ to: "/app" });
  },
});