// src/components/cloud-esther/OdontogramaGate.tsx

import { OdontogramaSec } from "@/components/cloud-esther/Odontograma2D";
import { Odontograma3D } from "@/components/cloud-esther/Odontograma3D";

function planIncluye3D(plan: string): boolean {
  const planNormalizado = plan.trim().toLowerCase();

  return (
    planNormalizado === "avanzada" ||
    planNormalizado === "avanzado" ||
    planNormalizado === "grupo" ||
    planNormalizado === "enterprise" ||
    planNormalizado === "clínica avanzada" ||
    planNormalizado === "clinica avanzada"
  );
}

type Props = {
  pacienteId: string;
  onToast: (msg: string) => void;
  plan: string;
};

export function OdontogramaGate({
  pacienteId,
  onToast,
  plan,
}: Props) {
  if (planIncluye3D(plan)) {
    return (
      <Odontograma3D
        pacienteId={pacienteId}
        onToast={onToast}
      />
    );
  }

  return (
    <OdontogramaSec
      pacienteId={pacienteId}
      onToast={onToast}
    />
  );
}