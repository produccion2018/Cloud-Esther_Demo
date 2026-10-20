import { useState } from "react";

import { Accesos, ActividadPortal } from "@/components/cloud-esther/PortalMonitor";
import { ControlPortalPaciente } from "@/components/cloud-esther/portales/ControlPortalPaciente";
import { PestanasPortal } from "@/components/cloud-esther/portales/PortalShell";
import { storePortal } from "@/lib/cloud-esther/portal-store";

/* Ubicación: src/components/cloud-esther/portales/PortalPacienteAdmin.tsx
   PORTAL DEL PACIENTE en Administración (Enterprise o con el adicional):
   - Control y envíos: qué ve el paciente, cómo le llega, quién envía y la bandeja.
   - Accesos: invitar, nuevo código, quitar acceso y «Ver como el paciente».
   - Actividad: qué hizo cada paciente en su portal.
   Cada paciente ve SOLO lo suyo. */

type Pestana = "control" | "accesos" | "actividad";

export function PortalPacienteAdmin({
  usuario,
  puedeConfigurar,
  puedeEnviar,
  onToast,
}: {
  usuario: string;
  puedeConfigurar: boolean;
  puedeEnviar: boolean;
  onToast: (m: string) => void;
}) {
  const [pestana, setPestana] = useState<Pestana>("control");
  const { accesos } = storePortal.usar();
  const conAcceso = Object.values(accesos).filter((a) => a.estado !== "Revocado").length;
  return (
    <div className="space-y-4">
      <PestanasPortal
        valor={pestana}
        onCambiar={setPestana}
        opciones={[
          { id: "control", label: "Control y envíos" },
          ...(puedeConfigurar ? [{ id: "accesos" as const, label: "Accesos de pacientes", cantidad: conAcceso }] : []),
          ...(puedeConfigurar ? [{ id: "actividad" as const, label: "Actividad" }] : []),
        ]}
      />
      {pestana === "control" && (
        <ControlPortalPaciente
          usuario={usuario}
          puedeConfigurar={puedeConfigurar}
          puedeEnviar={puedeEnviar}
          onToast={onToast}
          onVerAccesos={puedeConfigurar ? () => setPestana("accesos") : undefined}
        />
      )}
      {pestana === "accesos" && puedeConfigurar && (
        <div className="ce-clinica">
          <Accesos onToast={onToast} />
        </div>
      )}
      {pestana === "actividad" && puedeConfigurar && (
        <div className="ce-clinica">
          <ActividadPortal onToast={onToast} />
        </div>
      )}
    </div>
  );
}
