import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/cloud-esther/AppShell";
import { ComunicacionInterna } from "@/components/clinica/comunicacion-interna";
import { CloudEstherProvider } from "@/lib/cloud-esther/data";

/* Ubicación: src/routes/demo_.comunicacion-interna.tsx
   COMUNICACIÓN INTERNA del equipo (estilo Teams): todos los planes, todos los roles. */

export const Route = createFileRoute("/demo_/comunicacion-interna")({
  head: () => ({ meta: [{ title: "Comunicación interna | Cloud Esther" }] }),
  component: () => (
    <CloudEstherProvider>
      <AppShell>
        <div className="mx-auto w-full max-w-[1500px] px-4 py-6 md:px-6 lg:px-8">
          <ComunicacionInterna />
        </div>
      </AppShell>
    </CloudEstherProvider>
  ),
});
