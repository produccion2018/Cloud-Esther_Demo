import { createFileRoute } from "@tanstack/react-router";
import { UserRound } from "lucide-react";

import { AppShell } from "@/components/cloud-esther/AppShell";
import { MiCuentaClinica } from "@/components/clinica/mi-cuenta";
import { CloudEstherProvider } from "@/lib/cloud-esther/data";
import { useClinicaReal } from "@/lib/clinica/modo-clinica";

/* Ubicación: src/routes/demo_.mi-cuenta.tsx
   MI CUENTA (clínica real): mis datos y cambiar mi contraseña. */

export const Route = createFileRoute("/demo_/mi-cuenta")({
  head: () => ({ meta: [{ title: "Mi cuenta | Cloud Esther" }] }),
  component: () => (
    <CloudEstherProvider>
      <AppShell>
        <MiCuenta />
      </AppShell>
    </CloudEstherProvider>
  ),
});

function MiCuenta() {
  const real = useClinicaReal();
  return (
    <div className="ce-clinica mx-auto w-full max-w-[1200px] px-4 py-6 md:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow-[0_12px_26px_-14px_rgba(124,58,237,0.9)]">
          <UserRound className="size-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Mi cuenta</h1>
          <p className="text-sm text-muted-foreground">Tus datos y tu contraseña.</p>
        </div>
      </div>
      {real ? (
        <MiCuentaClinica slug={real.slug} sesion={real.sesion} />
      ) : (
        <p className="card-premium p-6 text-sm text-muted-foreground">Ingresá desde la dirección de tu clínica.</p>
      )}
    </div>
  );
}
