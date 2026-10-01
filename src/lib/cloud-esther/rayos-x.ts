import { crearStorePorEmpresa } from "@/lib/cloud-esther/tenant-store";
import { cargar } from "@/components/cloud-esther/esther-ai/imagenes";

/* Ubicación: src/lib/cloud-esther/rayos-x.ts
   Análisis de radiografías dentro del Odontograma 3D.

   - RX_IA_CONECTADA = false: todavía no hay un modelo de IA clínico conectado.
   - Caso de demostración: radiografía ilustrada con hallazgos preparados (se muestra como demo).
   - Fotos reales: «Detección preliminar» con un algoritmo local de contraste que solo marca
     ÁREAS A REVISAR (no las clasifica como caries); el profesional confirma, cambia el tipo,
     descarta o marca a mano. Nada se presenta como diagnóstico.
   TODO backend: POST /ia/radiografias { imagenId } → hallazgos con tipo, pieza FDI,
   coordenadas y confianza (modelo de visión odontológico), con el token del tenant. */

export const RX_IA_CONECTADA = false;

export type TipoHallazgoRX =
  "caries" | "periapical" | "perdida-osea" | "restauracion" | "endodoncia" | "implante" | "revisar";

export const TIPOS_RX: Record<
  TipoHallazgoRX,
  {
    nombre: string;
    color: string;
    profesional: string;
    paciente: string;
    estado3D?: "caries" | "tratado" | "endodoncia" | "corona";
  }
> = {
  caries: {
    nombre: "Caries",
    color: "#e34948",
    profesional:
      "Radiolucidez coronaria compatible con lesión cariosa. Correlacionar con examen clínico.",
    paciente: "una zona oscura que puede ser una caries",
    estado3D: "caries",
  },
  periapical: {
    nombre: "Lesión periapical",
    color: "#eb6834",
    profesional: "Imagen radiolúcida en región periapical. Evaluar vitalidad pulpar y síntomas.",
    paciente: "una sombra en la punta de la raíz que conviene controlar",
  },
  "perdida-osea": {
    nombre: "Pérdida ósea",
    color: "#eda100",
    profesional: "Disminución de la altura de la cresta ósea. Evaluar estado periodontal.",
    paciente: "una disminución del hueso que sostiene el diente",
  },
  restauracion: {
    nombre: "Restauración",
    color: "#2a78d6",
    profesional: "Radiopacidad compatible con restauración previa. Verificar adaptación marginal.",
    paciente: "un arreglo anterior",
    estado3D: "tratado",
  },
  endodoncia: {
    nombre: "Tratamiento de conducto",
    color: "#7c3aed",
    profesional: "Material radiopaco en conductos radiculares. Controlar sellado apical.",
    paciente: "un tratamiento de conducto previo",
    estado3D: "endodoncia",
  },
  implante: {
    nombre: "Implante / corona",
    color: "#1baf7a",
    profesional: "Estructura protésica o implante. Evaluar integración y tejidos de soporte.",
    paciente: "un implante o corona",
    estado3D: "corona",
  },
  revisar: {
    nombre: "Área a revisar",
    color: "#64748b",
    profesional: "Variación de densidad no concluyente. Requiere evaluación del profesional.",
    paciente: "un área que el odontólogo va a mirar con más detalle",
  },
};

export type Severidad = "Leve" | "Moderada" | "Severa";

export type HallazgoRX = {
  id: string;
  x: number; // % de la imagen
  y: number;
  tipo: TipoHallazgoRX;
  pieza: string;
  severidad: Severidad;
  estado: "Sugerido" | "Confirmado" | "Descartado";
  origen: "demo" | "deteccion" | "manual";
};

export type OrigenRX = "demo" | "paciente";

/** Pieza FDI aproximada según la posición en una panorámica (izquierda de la imagen = derecha del paciente). */
export function piezaPorPosicion(xPct: number, yPct: number) {
  const i = Math.min(15, Math.max(0, Math.round(((xPct - 50) / 40) * 7.5 + 7.5)));
  if (yPct < 50) return String(i < 8 ? 18 - i : 21 + (i - 8));
  return String(i < 8 ? 48 - i : 31 + (i - 8));
}

const nuevoId = () => `h-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/** Hallazgos preparados del caso de demostración (coinciden con la radiografía ilustrada). */
function hallazgosDemo(): HallazgoRX[] {
  const base: [number, number, TipoHallazgoRX, Severidad][] = [
    [35.3, 37.5, "caries", "Moderada"],
    [63.9, 84.5, "periapical", "Severa"],
    [27.4, 35.9, "restauracion", "Leve"],
    [72.4, 60.2, "restauracion", "Leve"],
  ];
  return base.map(([x, y, tipo, severidad]) => ({
    id: nuevoId(),
    x,
    y,
    tipo,
    pieza: piezaPorPosicion(x, y),
    severidad,
    estado: "Sugerido",
    origen: "demo",
  }));
}

/** Detección preliminar local: zonas oscuras rodeadas de estructura clara (contraste). */
async function deteccionPreliminar(src: string): Promise<HallazgoRX[]> {
  const img = await cargar(src);
  const W = 80;
  const H = Math.max(24, Math.round((img.height / img.width) * W));
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  if (!g) return [];
  g.drawImage(img, 0, 0, W, H);
  const d = g.getImageData(0, 0, W, H).data;
  const lum = (x: number, y: number) => {
    const i = (y * W + x) * 4;
    return ((d[i] ?? 0) * 0.3 + (d[i + 1] ?? 0) * 0.59 + (d[i + 2] ?? 0) * 0.11) / 255;
  };
  const cand: { x: number; y: number; s: number }[] = [];
  for (let y = 3; y < H - 3; y += 2)
    for (let x = 3; x < W - 3; x += 2) {
      const centro = lum(x, y);
      const alrededor = (lum(x - 3, y) + lum(x + 3, y) + lum(x, y - 3) + lum(x, y + 3)) / 4;
      const s = alrededor > 0.45 ? alrededor - centro : 0;
      if (s > 0.12) cand.push({ x, y, s });
    }
  cand.sort((a, b) => b.s - a.s);
  const elegidos: typeof cand = [];
  for (const k of cand) {
    if (elegidos.every((e) => Math.hypot(e.x - k.x, e.y - k.y) > 10)) elegidos.push(k);
    if (elegidos.length >= 5) break;
  }
  return elegidos.map((k) => {
    const x = (k.x / W) * 100;
    const y = (k.y / H) * 100;
    return {
      id: nuevoId(),
      x,
      y,
      tipo: "revisar",
      pieza: piezaPorPosicion(x, y),
      severidad: k.s > 0.25 ? "Moderada" : "Leve",
      estado: "Sugerido",
      origen: "deteccion",
    };
  });
}

export async function analizarRadiografia(imagen: string, origen: OrigenRX): Promise<HallazgoRX[]> {
  await new Promise((r) => setTimeout(r, 1300));
  // TODO backend: con RX_IA_CONECTADA, devolver los hallazgos del modelo de visión.
  return origen === "demo" ? hallazgosDemo() : deteccionPreliminar(imagen);
}

export function nuevoHallazgoManual(x: number, y: number, tipo: TipoHallazgoRX): HallazgoRX {
  return {
    id: nuevoId(),
    x,
    y,
    tipo,
    pieza: piezaPorPosicion(x, y),
    severidad: "Moderada",
    estado: "Confirmado",
    origen: "manual",
  };
}

/** Imagen con las marcas de colores (para el informe, la impresión y la descarga). */
export async function imagenAnotada(src: string, hallazgos: HallazgoRX[]): Promise<string> {
  const img = await cargar(src);
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext("2d");
  if (!g) return src;
  g.drawImage(img, 0, 0);
  const r = Math.max(14, Math.round(img.width / 45));
  hallazgos
    .filter((h) => h.estado !== "Descartado")
    .forEach((h, i) => {
      const x = (h.x / 100) * img.width;
      const y = (h.y / 100) * img.height;
      const color = TIPOS_RX[h.tipo].color;
      g.lineWidth = Math.max(3, r / 5);
      g.strokeStyle = color;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = color;
      g.beginPath();
      g.arc(x + r * 0.85, y - r * 0.85, r * 0.55, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#fff";
      g.font = `700 ${Math.round(r * 0.7)}px Inter, system-ui, sans-serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(String(i + 1), x + r * 0.85, y - r * 0.85);
    });
  return c.toDataURL("image/jpeg", 0.9);
}

/* ───────────── Historial por empresa ───────────── */

export type AnalisisRX = {
  id: string;
  fecha: string;
  pacienteId: number;
  profesional: string;
  tipoEstudio: string;
  origen: OrigenRX;
  imagen: string;
  hallazgos: HallazgoRX[];
};

export const storeRayosX = crearStorePorEmpresa<{ analisis: AnalisisRX[] }>(
  () => ({ analisis: [] }),
  { persistir: "rayos-x" },
);

export function guardarAnalisisRX(a: AnalisisRX) {
  const e = storeRayosX.leer();
  storeRayosX.poner({ analisis: [a, ...e.analisis.filter((x) => x.id !== a.id)].slice(0, 30) });
}

export function eliminarAnalisisRX(id: string) {
  const e = storeRayosX.leer();
  storeRayosX.poner({ analisis: e.analisis.filter((x) => x.id !== id) });
}
