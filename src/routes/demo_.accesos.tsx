import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, Clock3, MailPlus, ShieldCheck, Users } from "lucide-react";

import { AppShell } from "@/components/cloud-esther/AppShell";
import { EquipoClinicaPanel } from "@/components/clinica/equipo";
import { ActividadEquipo } from "@/components/clinica/actividad-equipo";
import { cn } from "@/lib/utils";
import { HeroModulo } from "@/components/clinica/hero-modulo";
import type { EquipoClinica } from "@/lib/clinica/api";
import { CloudEstherProvider } from "@/lib/cloud-esther/data";
import { useClinicaReal } from "@/lib/clinica/modo-clinica";
import { SLUG_DEMO } from "@/lib/clinica/demo-admin";

/* Ubicación: src/routes/demo_.accesos.tsx
   ACCESOS DEL EQUIPO (clínica real, solo el Administrador): quién entra a la clínica y con qué rol.
   Invitar (de a una o varias), cambiar el rol, quitar o devolver el acceso, elegir QUÉ VE cada
   persona y ver la ACTIVIDAD de todo el equipo (#actividad). */

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
  // Demo: las mismas pantallas con el equipo de ejemplo (en el demo sos el Dueño/a)
  const slug = real?.slug ?? SLUG_DEMO;
  const esAdmin = !real || real.rol === "admin";
  const [equipo, setEquipo] = useState<EquipoClinica | null>(null);
  const [pestana, setPestana] = useState<"equipo" | "actividad">("equipo");
  useEffect(() => {
    if (window.location.hash === "#actividad") setPestana("actividad");
  }, []);
  const hoy = new Date().toDateString();
  const conAcceso = equipo?.personas.filter((p) => p.estado !== "desactivada").length ?? 0;
  const libres = equipo?.limite == null ? null : Math.max(0, equipo.limite - equipo.usados);
  return (
    <div className="ce-clinica mx-auto w-full max-w-[1400px] space-y-5 px-4 py-6 md:px-6 lg:px-8">
      <HeroModulo
        chip="Tu equipo"
        icon={ShieldCheck}
        titulo="Accesos del equipo"
        descripcion="Quién entra a la clínica, con qué rol y qué ve cada persona. Invitá de a una, varias juntas o con un Excel, y mirá todo lo que hace tu equipo en «Actividad»."
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
      {esAdmin ? (
        <>
          <div className="flex w-full gap-1 rounded-full bg-card p-1 shadow-[0_1px_2px_rgba(30,0,60,0.06)] ring-1 ring-border sm:w-fit" role="tablist">
            {(
              [
                ["equipo", "Equipo y permisos", ShieldCheck],
                ["actividad", "Actividad del equipo", Activity],
              ] as const
            ).map(([id, label, Icono]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={pestana === id}
                onClick={() => {
                  setPestana(id);
                  history.replaceState(null, "", id === "actividad" ? "#actividad" : window.location.pathname);
                }}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition sm:flex-none",
                  pestana === id
                    ? "bg-gradient-to-r from-primary to-fuchsia-500 text-white shadow-[0_8px_20px_-10px_rgba(124,58,237,0.9)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icono className="size-4" />
                {label}
              </button>
            ))}
          </div>
          {pestana === "equipo" ? (
            <EquipoClinicaPanel slug={slug} onEquipo={setEquipo} />
          ) : (
            <ActividadEquipo slug={slug} />
          )}
        </>
      ) : (
        <p className="card-premium p-6 text-sm text-muted-foreground">
          Los accesos los maneja el Administrador de tu clínica.
        </p>
      )}
    </div>
  );
}
