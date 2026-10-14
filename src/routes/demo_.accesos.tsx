import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Clock3, MailPlus, ShieldCheck, Users } from "lucide-react";

import { AppShell } from "@/components/cloud-esther/AppShell";
import { EquipoClinicaPanel } from "@/components/clinica/equipo";
import { HeroModulo } from "@/components/clinica/hero-modulo";
import type { EquipoClinica } from "@/lib/clinica/api";
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
  const [equipo, setEquipo] = useState<EquipoClinica | null>(null);
  const hoy = new Date().toDateString();
  const conAcceso = equipo?.personas.filter((p) => p.estado !== "desactivada").length ?? 0;
  const libres = equipo?.limite == null ? null : Math.max(0, equipo.limite - equipo.usados);
  return (
    <div className="ce-clinica mx-auto w-full max-w-[1400px] space-y-5 px-4 py-6 md:px-6 lg:px-8">
      <HeroModulo
        chip="Tu equipo"
        icon={ShieldCheck}
        titulo="Accesos del equipo"
        descripcion="Quién entra a la clínica, con qué rol y desde cuándo. Invitá de a una persona, varias juntas o subiendo un Excel: a cada una le llega su correo."
        kpis={[
          { l: "Con acceso", v: equipo ? conAcceso : "–", s: equipo?.limite ? `de ${equipo.limite} lugares del plan` : "personas activas", i: Users },
          { l: "Lugares libres", v: equipo ? (libres ?? "∞") : "–", s: libres === null ? "tu plan no tiene límite" : "para sumar personas", i: ShieldCheck },
          { l: "Invitaciones", v: equipo ? equipo.personas.filter((p) => p.estado === "invitada").length : "–", s: "esperando su contraseña", i: MailPlus },
          {
            l: "Entraron hoy",
            v: equipo ? equipo.personas.filter((p) => p.ultimoIngreso && new Date(p.ultimoIngreso).toDateString() === hoy).length : "–",
            s: "personas con ingreso hoy",
            i: Clock3,
          },
        ]}
      />
      {real?.rol === "admin" ? (
        <EquipoClinicaPanel slug={real.slug} onEquipo={setEquipo} />
      ) : (
        <p className="card-premium p-6 text-sm text-muted-foreground">
          Los accesos los maneja el Administrador de tu clínica.
        </p>
      )}
    </div>
  );
}
