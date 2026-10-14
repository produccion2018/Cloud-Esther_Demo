import { createFileRoute } from "@tanstack/react-router";
import { Building2, Mail, ShieldCheck, Sparkles, UserRound } from "lucide-react";

import { AppShell } from "@/components/cloud-esther/AppShell";
import { MiCuentaClinica } from "@/components/clinica/mi-cuenta";
import { HeroModulo } from "@/components/clinica/hero-modulo";
import { CloudEstherProvider, PLANS, useCloudEsther } from "@/lib/cloud-esther/data";
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
  const { plan } = useCloudEsther();
  const u = real?.sesion.usuario;
  return (
    <div className="ce-clinica mx-auto w-full max-w-[1400px] space-y-5 px-4 py-6 md:px-6 lg:px-8">
      <HeroModulo
        chip="Tu cuenta"
        icon={UserRound}
        titulo="Mi cuenta"
        descripcion="Tus datos para entrar a la clínica y tu contraseña. Al cambiarla, se cierran tus sesiones abiertas en otras computadoras o celulares."
        kpis={
          u && real
            ? [
                { l: "Tu rol", v: u.rolNombre, s: "lo define el Administrador", i: ShieldCheck },
                { l: "Clínica", v: real.sesion.clinica.nombre, s: "donde trabajás", i: Building2 },
                { l: "Plan", v: PLANS[plan].name, s: "contratado por la clínica", i: Sparkles },
                { l: "Correo", v: u.email, s: "con el que ingresás", i: Mail },
              ]
            : []
        }
      />
      {real ? (
        <MiCuentaClinica slug={real.slug} sesion={real.sesion} />
      ) : (
        <p className="card-premium p-6 text-sm text-muted-foreground">Ingresá desde la dirección de tu clínica.</p>
      )}
    </div>
  );
}
