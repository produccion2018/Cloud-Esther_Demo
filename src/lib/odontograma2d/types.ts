export type ToothType = "incisivo" | "canino" | "premolar" | "molar";

export type Surface = "V" | "L" | "M" | "D" | "O";

export const SURFACE_LABELS: Record<Surface, string> = {
  V: "Vestibular",
  L: "Lingual / Palatina",
  M: "Mesial",
  D: "Distal",
  O: "Oclusal / Incisal",
};

export type SurfaceFinding = "caries" | "obturacion" | "sellante" | "fractura";
export type WholeFinding = "corona" | "endodoncia" | "implante" | "extraccion" | "ausente";

export type Tool = SurfaceFinding | WholeFinding | "borrar";

export const SURFACE_FINDINGS: SurfaceFinding[] = ["caries", "obturacion", "sellante", "fractura"];

export const WHOLE_FINDINGS: WholeFinding[] = [
  "corona",
  "endodoncia",
  "implante",
  "extraccion",
  "ausente",
];

export const FINDING_LABELS: Record<SurfaceFinding | WholeFinding, string> = {
  caries: "Caries",
  obturacion: "Obturación",
  sellante: "Sellante",
  fractura: "Fractura",
  corona: "Corona",
  endodoncia: "Endodoncia",
  implante: "Implante",
  extraccion: "Extracción indicada",
  ausente: "Ausente",
};

export const FINDING_COLOR_VAR: Record<SurfaceFinding | WholeFinding, string> = {
  caries: "var(--caries)",
  obturacion: "var(--obturacion)",
  sellante: "var(--sellante)",
  fractura: "var(--fractura)",
  corona: "var(--corona)",
  endodoncia: "var(--endodoncia)",
  implante: "var(--implante)",
  extraccion: "var(--extraccion)",
  ausente: "var(--ausente)",
};

export function isWholeFinding(tool: Tool): tool is WholeFinding {
  return (WHOLE_FINDINGS as string[]).includes(tool);
}

export interface ToothState {
  surfaces: Partial<Record<Surface, SurfaceFinding>>;
  whole: WholeFinding[];
}

/** odontograma de un paciente: FDI -> estado */
export type OdontogramState = Record<string, ToothState>;

/**
 * Preparado para persistencia multiempresa:
 * empresa/tenant -> paciente -> odontograma
 */
export type TenantOdontograms = Record<string, Record<string, OdontogramState>>;

export function odontogramKey(tenantId: string, patientId: string) {
  return `${tenantId}::${patientId}`;
}
