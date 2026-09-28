// Las 4 imágenes de Esther van en src/assets/ con exactamente estos nombres.
import restingUrl from "@/assets/esther-pose-resting.png";
import wavingUrl from "@/assets/esther-pose-waving.png";
import walkingUrl from "@/assets/esther-pose-walking.png";
import bendingUrl from "@/assets/esther-pose-bending.png";

export type EstherState =
  | "idle"
  | "listening"
  | "thinking"
  | "processing"
  | "action"
  | "success"
  | "error";

export type EstherPose = "resting" | "waving" | "walking" | "bending";

export const estherPoses: Record<EstherPose, { url: string; alt: string }> = {
  resting: { url: restingUrl, alt: "Esther de pie, disponible" },
  waving: { url: wavingUrl, alt: "Esther saludando" },
  walking: { url: walkingUrl, alt: "Esther caminando, trabajando" },
  bending: { url: bendingUrl, alt: "Esther con su maletín, ejecutando una tarea" },
};

export type EstherStateConfig = {
  pose: EstherPose;
  label: string;
  message: string;
  glow: number;
  particles: number;
  drift: number;
  dataFlow: boolean;
  scale: number;
  duration: number;
};

export const estherStates: Record<EstherState, EstherStateConfig> = {
  idle: {
    pose: "resting",
    label: "Disponible",
    message: "Estoy lista.",
    glow: 0.35,
    particles: 8,
    drift: 0.5,
    dataFlow: false,
    scale: 1,
    duration: 1600,
  },
  listening: {
    pose: "waving",
    label: "Escuchando",
    message: "Te estoy escuchando...",
    glow: 0.55,
    particles: 12,
    drift: 0.75,
    dataFlow: false,
    scale: 1.02,
    duration: 1400,
  },
  thinking: {
    pose: "resting",
    label: "Analizando",
    message: "Estoy analizando la información...",
    glow: 0.75,
    particles: 18,
    drift: 1.1,
    dataFlow: true,
    scale: 1.01,
    duration: 1800,
  },
  processing: {
    pose: "walking",
    label: "Procesando",
    message: "Estoy procesando la información...",
    glow: 0.8,
    particles: 22,
    drift: 1.5,
    dataFlow: true,
    scale: 1.03,
    duration: 2200,
  },
  action: {
    pose: "bending",
    label: "Ejecutando",
    message: "Estoy preparando todo...",
    glow: 0.9,
    particles: 24,
    drift: 1.7,
    dataFlow: true,
    scale: 1.04,
    duration: 2000,
  },
  success: {
    pose: "waving",
    label: "Completado",
    message: "Listo.",
    glow: 0.5,
    particles: 10,
    drift: 0.6,
    dataFlow: false,
    scale: 1.01,
    duration: 1600,
  },
  error: {
    pose: "resting",
    label: "Revisión necesaria",
    message: "Encontré un problema. Voy a revisarlo.",
    glow: 0.45,
    particles: 9,
    drift: 0.4,
    dataFlow: false,
    scale: 0.99,
    duration: 2000,
  },
};

export const estherSequence: EstherState[] = [
  "listening",
  "thinking",
  "processing",
  "action",
  "success",
];