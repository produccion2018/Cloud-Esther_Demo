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
export type WholeFinding =
  | "corona"
  | "endodoncia"
  | "implante"
  | "extraccion"
  | "ausente"
  | "perno"
  | "carilla"
  | "puente"
  | "resto"
  | "retenido";

export type Tool = SurfaceFinding | WholeFinding | "borrar";

export const SURFACE_FINDINGS: SurfaceFinding[] = ["caries", "obturacion", "sellante", "fractura"];

export const WHOLE_FINDINGS: WholeFinding[] = [
  "corona",
  "endodoncia",
  "implante",
  "extraccion",
  "ausente",
  "perno",
  "carilla",
  "puente",
  "resto",
  "retenido",
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
  perno: "Perno-muñón",
  carilla: "Carilla",
  puente: "Puente",
  resto: "Resto radicular",
  retenido: "No erupcionado / retenido",
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
  perno: "var(--perno)",
  carilla: "var(--carilla)",
  puente: "var(--puente)",
  resto: "var(--resto)",
  retenido: "var(--retenido)",
};

/* CONVENCIÓN ROJO / AZUL (la que se usa en Argentina y en la región):
   rojo = lo que hay que hacer (a realizar), azul = lo que ya está hecho (existente).
   Las patologías (caries, fractura, extracción indicada, resto radicular) son siempre "a realizar". */
export const SIEMPRE_A_REALIZAR = new Set<SurfaceFinding | WholeFinding>(["caries", "fractura", "extraccion", "resto"]);
export const ROJO_A_REALIZAR = "#dc2626";
export const AZUL_EXISTENTE = "#2563eb";
/** Clave de un hallazgo dentro de la pieza: "s:O" (cara) o "w:corona" (pieza completa). */
export const claveHallazgo = (tipo: "s" | "w", valor: string) => `${tipo}:${valor}`;

export function isWholeFinding(tool: Tool): tool is WholeFinding {
  return (WHOLE_FINDINGS as string[]).includes(tool);
}

export interface ToothState {
  surfaces: Partial<Record<Surface, SurfaceFinding>>;
  whole: WholeFinding[];
  /** Hallazgos marcados como "a realizar" (rojo); los demás son existentes (azul). */
  aRealizar?: string[];
}

/** ¿Este hallazgo está por hacer? (las patologías siempre lo están) */
export function esARealizar(t: ToothState, tipo: "s" | "w", clave: string, hallazgo: SurfaceFinding | WholeFinding) {
  return SIEMPRE_A_REALIZAR.has(hallazgo) || (t.aRealizar ?? []).includes(claveHallazgo(tipo, clave));
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
