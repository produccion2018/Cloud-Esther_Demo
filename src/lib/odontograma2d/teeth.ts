import type { ToothType } from "./types";

export interface ToothDef {
  fdi: string;
  type: ToothType;
  arch: "upper" | "lower";
  quadrant: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  primary: boolean;
  /** hacia dónde queda la línea media: izquierda o derecha del dibujo */
  midlineSide: "left" | "right";
}

const PERMANENT_TYPES: ToothType[] = [
  "incisivo", // 1 central
  "incisivo", // 2 lateral
  "canino", // 3
  "premolar", // 4
  "premolar", // 5
  "molar", // 6
  "molar", // 7
  "molar", // 8
];

const PRIMARY_TYPES: ToothType[] = [
  "incisivo", // 1
  "incisivo", // 2
  "canino", // 3
  "molar", // 4
  "molar", // 5
];

function build(
  quadrant: ToothDef["quadrant"],
  arch: ToothDef["arch"],
  primary: boolean,
  midlineSide: ToothDef["midlineSide"],
): ToothDef[] {
  const types = primary ? PRIMARY_TYPES : PERMANENT_TYPES;
  return types.map((type, i) => ({
    fdi: `${quadrant}${i + 1}`,
    type,
    arch,
    quadrant,
    primary,
    midlineSide,
  }));
}

/** Cuadrante 1: 18 -> 11 (se dibuja de distal a mesial) */
export const Q1 = build(1, "upper", false, "right").reverse();
export const Q2 = build(2, "upper", false, "left");
export const Q4 = build(4, "lower", false, "right").reverse();
export const Q3 = build(3, "lower", false, "left");

export const Q5 = build(5, "upper", true, "right").reverse();
export const Q6 = build(6, "upper", true, "left");
export const Q8 = build(8, "lower", true, "right").reverse();
export const Q7 = build(7, "lower", true, "left");

export const ALL_TEETH: ToothDef[] = [...Q1, ...Q2, ...Q3, ...Q4, ...Q5, ...Q6, ...Q7, ...Q8];

export const TOOTH_BY_FDI: Record<string, ToothDef> = Object.fromEntries(
  ALL_TEETH.map((t) => [t.fdi, t]),
);
