import type { ToothType } from "./types";

/**
 * Geometría anatómica de cada pieza.
 * Sistema canónico: viewBox 0 0 100 190, raíz arriba y corona abajo
 * (orientación de una pieza superior). Las piezas inferiores se
 * reflejan verticalmente al dibujarse.
 */
export interface ToothGeometry {
  /** contorno de la corona: también se usa como clip de las superficies */
  crown: string;
  /** una o varias raíces */
  roots: string[];
  /** líneas anatómicas decorativas (surcos, cúspides, borde incisal) */
  details: string[];
  /** caja de la corona [x, y, w, h] para repartir las superficies */
  crownBox: [number, number, number, number];
}

const INCISIVO: ToothGeometry = {
  crown:
    "M30 92 C23 110 22 146 27 166 Q29 175 39 175 L61 175 Q71 175 73 166 C78 146 77 110 70 92 Z",
  roots: ["M41 96 C38 62 39 28 50 6 C61 28 62 62 59 96 Z"],
  details: [
    "M31 162 Q50 170 69 162",
    "M43 104 C42 124 42 142 43 156",
    "M57 104 C58 124 58 142 57 156",
  ],
  crownBox: [24, 92, 52, 83],
};

const CANINO: ToothGeometry = {
  crown: "M27 92 C20 112 22 146 34 167 Q42 179 50 179 Q58 179 66 167 C78 146 80 112 73 92 Z",
  roots: ["M39 96 C36 58 37 22 50 2 C63 22 64 58 61 96 Z"],
  details: [
    "M35 160 L50 174 L65 160",
    "M50 104 C49 128 49 152 50 172",
    "M39 108 C38 128 39 146 41 156",
  ],
  crownBox: [22, 92, 56, 87],
};

const PREMOLAR: ToothGeometry = {
  crown:
    "M21 90 C16 112 19 143 28 160 Q35 170 42 161 L46 154 Q50 149 54 154 L58 161 Q65 170 72 160 C81 143 84 112 79 90 Z",
  roots: ["M36 94 C32 58 35 24 50 8 C65 24 68 58 64 94 Z"],
  details: [
    "M30 152 Q50 143 70 152",
    "M50 96 L50 150",
    "M35 104 C33 122 34 138 37 148",
    "M65 104 C67 122 66 138 63 148",
  ],
  crownBox: [18, 90, 64, 80],
};

const MOLAR: ToothGeometry = {
  crown:
    "M13 88 C9 114 12 146 21 160 Q27 169 33 160 L37 151 Q41 146 45 151 L49 158 Q50 160 51 158 L55 151 Q59 146 63 151 L67 160 Q73 169 79 160 C88 146 91 114 87 88 Z",
  roots: [
    "M19 92 C14 58 19 24 34 10 C41 28 39 60 36 92 Z",
    "M81 92 C86 58 81 24 66 10 C59 28 61 60 64 92 Z",
  ],
  details: [
    "M50 100 L50 152",
    "M22 118 L50 128 L78 118",
    "M28 148 L50 138 L72 148",
    "M24 100 C21 122 23 140 28 152",
    "M76 100 C79 122 77 140 72 152",
  ],
  crownBox: [10, 88, 80, 78],
};

export const GEOMETRY: Record<ToothType, ToothGeometry> = {
  incisivo: INCISIVO,
  canino: CANINO,
  premolar: PREMOLAR,
  molar: MOLAR,
};
