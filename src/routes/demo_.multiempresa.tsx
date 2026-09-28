// src/routes/demo_.multiempresa.tsx

import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/cloud-esther/AppShell";
import { MultiEmpresa } from "@/components/cloud-esther/MultiEmpresa";
import { CloudEstherProvider } from "@/lib/cloud-esther/data";

export const Route = createFileRoute("/demo_/multiempresa")({
  component: MultiEmpresaPage,
});

function MultiEmpresaPage() {
  return (
    <CloudEstherProvider>
      <AppShell>
        <MultiEmpresa />
      </AppShell>
    </CloudEstherProvider>
  );
}