export type EstherContext = {
  section?: EstherSection;
  recordId?: string;
};

export type EstherSection =
  | "general"
  | "paciente"
  | "odontograma"
  | "historia"
  | "turnos"
  | "informe";

export type EstherReply = {
  text: string;
  needsRealData: boolean;
};

export const contextProgress: Record<EstherSection, string> = {
  general: "Estoy revisando la información disponible...",
  paciente: "Estoy revisando la información del paciente...",
  odontograma: "Estoy analizando el odontograma...",
  historia: "Estoy preparando un resumen de la historia clínica...",
  turnos: "Estoy revisando los próximos turnos...",
  informe: "Estoy preparando el informe...",
};

export type EstherQuickAction = {
  id: string;
  label: string;
  section: EstherSection;
};

export const estherQuickActions: EstherQuickAction[] = [
  { id: "analizar-paciente", label: "Analizar paciente", section: "paciente" },
  { id: "resumir-historia", label: "Resumir historia clínica", section: "historia" },
  { id: "revisar-odontograma", label: "Revisar odontograma", section: "odontograma" },
  { id: "preparar-informe", label: "Preparar informe", section: "informe" },
  { id: "buscar-informacion", label: "Buscar información", section: "general" },
  { id: "analizar-registros", label: "Analizar registros", section: "turnos" },
];

export async function askEsther(
  message: string,
  context: EstherContext = {},
): Promise<EstherReply> {
  await new Promise((resolve) => setTimeout(resolve, 400));

  const section = context.section ?? "general";
  return {
    text:
      `Recibí tu solicitud sobre ${sectionName(section)}: "${message}". ` +
      "Todavía no estoy conectada a los datos reales de Cloud Esther, " +
      "así que no voy a inventar información clínica. " +
      "Cuando se conecte la inteligencia artificial, voy a responder con datos reales.",
    needsRealData: true,
  };
}

function sectionName(section: EstherSection): string {
  const names: Record<EstherSection, string> = {
    general: "información general",
    paciente: "un paciente",
    odontograma: "el odontograma",
    historia: "la historia clínica",
    turnos: "los turnos",
    informe: "un informe",
  };
  return names[section];
}