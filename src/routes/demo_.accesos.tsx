import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

import { AppShell } from "@/components/cloud-esther/AppShell";
import { EquipoClinicaPanel } from "@/components/clinica/equipo";
import { CloudEstherProvider } from "@/lib/cloud-esther/data";
import { useClinicaReal } from "@/lib/clinica/modo-clinica";

/* Ubicación: src/routes/demo_.accesos.tsx
   ACCESOS DEL EQUIPO (clínica real, solo el Administrador): quién entra a la clínica y con qué rol.
   Invitar (de a una o varias), cambiar el rol, quitar o devolver el acceso. */

export const Route = createFileRoute("/demo_/accesos")({
  head: () => ({ meta: [{ title: "Accesos del equipo | Cloud Esther" }] }),
  component: () => (
    <CloudEstherProvider>
      <AppShell>
        <Accesos />
      </AppShell>
    </CloudEstherProvider>
  ),
});

function Accesos() {
  const real = useClinicaReal();
  return (
    <div className="ce-clinica mx-auto w-full max-w-[1200px] px-4 py-6 md:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow-[0_12px_26px_-14px_rgba(124,58,237,0.9)]">
          <ShieldCheck className="size-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Accesos del equipo</h1>
          <p className="text-sm text-muted-foreground">Quién entra a la clínica, con qué rol y desde cuándo.</p>
        </div>
      </div>
      {real?.rol === "admin" ? (
        <EquipoClinicaPanel slug={real.slug} />
      ) : (
        <p className="card-premium p-6 text-sm text-muted-foreground">
          Los accesos los maneja el Administrador de tu clínica.
        </p>
      )}
    </div>
  );
}
