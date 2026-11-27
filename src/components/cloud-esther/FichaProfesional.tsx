import { BadgeCheck } from "lucide-react";
import type { TeamMember } from "@/lib/cloud-esther/equipo-profesional-data";

/* Ubicación: src/components/cloud-esther/FichaProfesional.tsx
   FICHA DEL PROFESIONAL PARA PACIENTES: foto, especialidades, matrícula y una presentación
   corta. La carga cada clínica en Equipo → (integrante) → «Ficha para pacientes» y se ve en el
   portal del paciente (al pedir turno y en «Tu equipo»). */

/** ¿Este integrante se muestra a los pacientes? (profesionales activos, salvo que lo oculten) */
export const visibleParaPacientes = (m: TeamMember) => m.role === "odontologo" && m.status === "activo" && m.mostrarEnPortal !== false;

export function FichaProfesional({ m, compacta = false }: { m: TeamMember; compacta?: boolean }) {
  const nombre = `${m.firstName} ${m.lastName}`.trim();
  const iniciales = `${m.firstName[0] ?? ""}${m.lastName[0] ?? ""}`.toUpperCase();
  const especialidades = (m.specialties ?? []).filter(Boolean);
  return (
    <div className={`flex gap-3 rounded-2xl border border-primary/10 bg-white ${compacta ? "items-center p-2.5" : "items-start p-3.5"}`}>
      {m.avatarUrl ? (
        <img
          src={m.avatarUrl}
          alt={`Foto de ${nombre}`}
          className={`${compacta ? "size-11" : "size-14"} shrink-0 rounded-2xl object-cover ring-2 ring-white shadow-[0_8px_18px_-10px_rgba(124,58,237,0.6)]`}
        />
      ) : (
        <span
          className={`${compacta ? "size-11 text-sm" : "size-14 text-base"} grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500 font-bold text-white`}
        >
          {iniciales}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{nombre}</p>
        <p className="truncate text-[11.5px] font-medium text-primary">{especialidades.join(" · ") || "Odontología general"}</p>
        {m.licenseNumber && (
          <p className="mt-0.5 inline-flex items-center gap-1 text-[10.5px] text-muted-foreground">
            <BadgeCheck className="size-3 text-emerald-600" /> Matrícula {m.licenseNumber}
          </p>
        )}
        {!compacta && m.bioPublica && <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{m.bioPublica}</p>}
      </div>
    </div>
  );
}
