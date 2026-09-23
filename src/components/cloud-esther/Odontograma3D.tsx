"use client";

import {
  Component,
  type ErrorInfo,
  type ReactNode,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  OrbitControls,
  PerspectiveCamera,
  useGLTF,
} from "@react-three/drei";

import * as THREE from "three";

import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Expand,
  Eye,
  FileImage,
  History,
  Images,
  Maximize2,
  Minimize2,
  Minus,
  Move3D,
  Plus,
  RotateCcw,
  Sparkles,
  Stethoscope,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type EstadoDiente =
  | "sano"
  | "tratado"
  | "caries"
  | "ausente"
  | "endodoncia"
  | "corona";

type Diente = {
  fdi: number;
  estado: EstadoDiente;
};

type Vista = "anterior" | "oclusal" | "derecha" | "izquierda";

type Tab = "historial" | "evolucion" | "imagenes";

type Evento = {
  id: string;
  fecha: string;
  titulo: string;
  profesional: string;
  imagen?: string;
};

type Props = {
  pacienteId: string;
  onToast?: (msg: string) => void;
  dientes?: Diente[];
  eventos?: Evento[];
};

type TipoDiente = "incisivo" | "canino" | "premolar" | "molar";

type ToothLayout = {
  fdi: number;
  estado: EstadoDiente;
  tipo: TipoDiente;
  upper: boolean;
  index: number;
};

type ToothMiniProps = {
  fdi: number;
  estado: EstadoDiente;
  selected: boolean;
  onSelect: (fdi: number) => void;
};

/* =========================================================
   CLINICAL CONFIG
========================================================= */

const ESTADOS: Record<
  EstadoDiente,
  {
    label: string;
    color: string;
    accent: string;
    description: string;
  }
> = {
  sano: {
    label: "Sano",
    color: "#f8fafc",
    accent: "#a78bfa",
    description: "Sin hallazgos registrados",
  },
  tratado: {
    label: "Tratado",
    color: "#dbeafe",
    accent: "#3b82f6",
    description: "Tratamiento registrado",
  },
  caries: {
    label: "Caries",
    color: "#ffe4e6",
    accent: "#f43f5e",
    description: "Caries registrada",
  },
  ausente: {
    label: "Ausente",
    color: "#e2e8f0",
    accent: "#94a3b8",
    description: "Pieza ausente",
  },
  endodoncia: {
    label: "Endodoncia",
    color: "#fef3c7",
    accent: "#f59e0b",
    description: "Tratamiento endodóntico",
  },
  corona: {
    label: "Corona",
    color: "#ede9fe",
    accent: "#8b5cf6",
    description: "Corona protésica",
  },
};

const CUADRANTES = [
  [18, 17, 16, 15, 14, 13, 12, 11],
  [21, 22, 23, 24, 25, 26, 27, 28],
  [48, 47, 46, 45, 44, 43, 42, 41],
  [31, 32, 33, 34, 35, 36, 37, 38],
];

const TODAS_LAS_PIEZAS = CUADRANTES.flat();

const VISTAS: Array<{
  id: Vista;
  label: string;
  icon: typeof ArrowUp;
}> = [
  {
    id: "anterior",
    label: "Anterior",
    icon: ArrowUp,
  },
  {
    id: "oclusal",
    label: "Oclusal",
    icon: ArrowDown,
  },
  {
    id: "derecha",
    label: "Derecha",
    icon: ArrowRight,
  },
  {
    id: "izquierda",
    label: "Izquierda",
    icon: ArrowLeft,
  },
];

/* Preset camera framing for each quick view. The rig below eases the
   camera and the orbit target toward these whenever `view` or `zoom`
   changes, so the buttons in the left panel actually move the 3D
   camera instead of just toggling a label. */

type ViewPreset = {
  position: [number, number, number];
  target: [number, number, number];
};

const VIEW_PRESETS: Record<Vista, ViewPreset> = {
  anterior: {
    position: [0, 1.1, 8.8],
    target: [0, -0.2, 0],
  },
  oclusal: {
    position: [0, 8.6, 0.6],
    target: [0, -0.2, 0],
  },
  derecha: {
    position: [8.6, 1.1, 0],
    target: [0, -0.2, 0],
  },
  izquierda: {
    position: [-8.6, 1.1, 0],
    target: [0, -0.2, 0],
  },
};

const MODEL_URL = "/models/odontograma-mouth.glb";

const MOUTH_IMAGE = "/models/odontograma-mouth.glb.png";

/* =========================================================
   HELPERS
========================================================= */

function getTipoDiente(fdi: number): TipoDiente {
  const number = fdi % 10;

  if (number === 1 || number === 2) {
    return "incisivo";
  }

  if (number === 3) {
    return "canino";
  }

  if (number === 4 || number === 5) {
    return "premolar";
  }

  return "molar";
}

function getNombreDiente(fdi: number): string {
  const tipo = getTipoDiente(fdi);

  const nombres: Record<TipoDiente, string> = {
    incisivo: "Incisivo",
    canino: "Canino",
    premolar: "Premolar",
    molar: "Molar",
  };

  const lado =
    fdi >= 11 && fdi <= 18
      ? "superior derecho"
      : fdi >= 21 && fdi <= 28
        ? "superior izquierdo"
        : fdi >= 41 && fdi <= 48
          ? "inferior derecho"
          : "inferior izquierdo";

  return `${nombres[tipo]} ${lado}`;
}

function getDientesIniciales(): Diente[] {
  return TODAS_LAS_PIEZAS.map((fdi) => ({
    fdi,
    estado: "sano",
  }));
}

function buildToothLayout(dientes: Diente[]): ToothLayout[] {
  const layout: ToothLayout[] = [];

  CUADRANTES.forEach((quadrant, quadrantIndex) => {
    quadrant.forEach((fdi, index) => {
      const existing = dientes.find((d) => d.fdi === fdi);

      layout.push({
        fdi,
        estado: existing?.estado ?? "sano",
        tipo: getTipoDiente(fdi),
        upper: quadrantIndex < 2,
        index,
      });
    });
  });

  return layout;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function findFdiFromObject(object: THREE.Object3D): number | null {
  let current: THREE.Object3D | null = object;

  while (current) {
    const match = current.name.match(
      /(?:^|[^0-9])([1-4][1-8])(?:[^0-9]|$)/,
    );

    if (match) {
      const value = Number(match[1]);

      if (TODAS_LAS_PIEZAS.includes(value)) {
        return value;
      }
    }

    current = current.parent;
  }

  return null;
}

/* =========================================================
   TOOTH MINIATURE
========================================================= */

function ToothSilhouette({
  tipo,
  estado,
  selected,
}: {
  tipo: TipoDiente;
  estado: EstadoDiente;
  selected: boolean;
}) {
  const accent = ESTADOS[estado].accent;

  /* Clean, simplified crown-and-root silhouettes. Each shape uses a
     smooth outer contour plus one internal cervical line separating
     the crown from the root, which reads much clearer at thumbnail
     size than a single busy outline. */
  const paths: Record<
    TipoDiente,
    { outline: string; cervical: string; cusp?: string }
  > = {
    incisivo: {
      outline:
        "M50 10 C39 10 32 17 32 27 C32 33 33 38 34 42 C35 44 35 46 35 48 L38 82 C39 92 44 97 50 97 C56 97 61 92 62 82 L65 48 C65 46 65 44 66 42 C67 38 68 33 68 27 C68 17 61 10 50 10Z",
      cervical: "M35 44 C41 48 59 48 65 44",
    },
    canino: {
      outline:
        "M50 8 C39 8 33 16 34 27 C34 32 36 37 37 41 C38 43 39 45 39 47 L42 78 C43 88 46 96 50 99 C54 96 57 88 58 78 L61 47 C61 45 62 43 63 41 C64 37 66 32 66 27 C67 16 61 8 50 8Z",
      cervical: "M37 43 C43 47 57 47 63 43",
    },
    premolar: {
      outline:
        "M50 10 C38 10 29 18 30 29 C30 34 32 39 34 44 C35 46 35 48 35 50 L37 82 C38 92 43 97 50 97 C57 97 62 92 63 82 L65 50 C65 48 65 46 66 44 C68 39 70 34 70 29 C71 18 62 10 50 10Z",
      cervical: "M35 46 C41 50 59 50 65 46",
      cusp: "M41 22 C45 26 55 26 59 22",
    },
    molar: {
      outline:
        "M50 10 C36 10 25 18 25 30 C25 36 28 41 31 46 C32 48 32 50 32 52 L34 81 C35 91 41 97 50 97 C59 97 65 91 66 81 L68 52 C68 50 68 48 69 46 C72 41 75 36 75 30 C75 18 64 10 50 10Z",
      cervical: "M32 48 C40 53 60 53 68 48",
      cusp: "M38 24 C42 29 48 21 50 26 C52 21 58 29 62 24",
    },
  };

  const shape = paths[tipo];

  const fill =
    estado === "sano"
      ? "#fffdf9"
      : estado === "ausente"
        ? "#d5dbe3"
        : ESTADOS[estado].color;

  const strokeColor = selected ? "#7c3aed" : "#ddd7cc";

  return (
    <svg
      viewBox="0 0 100 105"
      className="h-12 w-10 drop-shadow-[0_5px_10px_rgba(71,47,155,0.14)]"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={`tooth-${tipo}-${estado}`}
          x1="0.15"
          y1="0"
          x2="0.85"
          y2="1"
        >
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor={fill} />
          <stop offset="100%" stopColor={accent} stopOpacity="0.5" />
        </linearGradient>

        <linearGradient
          id={`tooth-shine-${tipo}-${estado}`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <path
        d={shape.outline}
        fill={`url(#tooth-${tipo}-${estado})`}
        stroke={strokeColor}
        strokeWidth={selected ? 2.6 : 1.3}
        strokeLinejoin="round"
      />

      <path
        d="M39 18 C41 26 40 34 38 40"
        fill="none"
        stroke={`url(#tooth-shine-${tipo}-${estado})`}
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      <path
        d={shape.cervical}
        fill="none"
        stroke={selected ? "#a78bfa" : "#e4dfd4"}
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.8"
      />

      {shape.cusp && (
        <path
          d={shape.cusp}
          fill="none"
          stroke={selected ? "#a78bfa" : "#e4dfd4"}
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.8"
        />
      )}

      {estado !== "sano" && estado !== "ausente" && (
        <circle
          cx="72"
          cy="16"
          r="7.5"
          fill={accent}
          stroke="#fff"
          strokeWidth="2"
        />
      )}
    </svg>
  );
}

function ToothMiniCard({
  fdi,
  estado,
  selected,
  onSelect,
}: ToothMiniProps) {
  const tipo = getTipoDiente(fdi);
  const config = ESTADOS[estado];

  return (
    <button
      type="button"
      onClick={() => onSelect(fdi)}
      className={[
        "group relative w-[80px] shrink-0 rounded-2xl border p-2.5 text-center transition-all duration-200",
        "bg-white/90 shadow-[0_5px_20px_rgba(86,63,160,0.07)]",
        "hover:-translate-y-1 hover:border-violet-300 hover:shadow-[0_10px_28px_rgba(124,58,237,0.15)]",
        selected
          ? "border-violet-400 bg-violet-50 shadow-[0_8px_28px_rgba(124,58,237,0.18)] ring-2 ring-violet-200"
          : "border-slate-200",
      ].join(" ")}
      title={`${fdi} — ${config.label}`}
    >
      {selected && (
        <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-violet-600 ring-2 ring-violet-100" />
      )}

      <div className="flex justify-center">
        <ToothSilhouette
          tipo={tipo}
          estado={estado}
          selected={selected}
        />
      </div>

      <div className="mt-1 text-[13px] font-bold text-slate-800">
        {fdi}
      </div>

      <div
        className="mx-auto mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold"
        style={{
          color: config.accent,
          backgroundColor: `${config.accent}15`,
        }}
      >
        {config.label}
      </div>
    </button>
  );
}

/* =========================================================
   3D MODEL
========================================================= */

function DentalModel({
  selectedFdi,
  dientes,
  onSelect,
}: {
  selectedFdi: number;
  dientes: Diente[];
  onSelect: (fdi: number) => void;
}) {
  const gltf = useGLTF(MODEL_URL);

  const scene = useMemo(() => {
    const cloned = gltf.scene.clone(true);

    cloned.traverse((object) => {
      const mesh = object as THREE.Mesh;

      if (!mesh.isMesh) {
        return;
      }

      mesh.castShadow = true;
      mesh.receiveShadow = true;

      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((material) => {
          const clonedMaterial = material.clone();

          if ("roughness" in clonedMaterial) {
            clonedMaterial.roughness = 0.42;
          }

          if ("metalness" in clonedMaterial) {
            clonedMaterial.metalness = 0.02;
          }

          return clonedMaterial;
        });
      } else if (mesh.material) {
        mesh.material = mesh.material.clone();

        if ("roughness" in mesh.material) {
          mesh.material.roughness = 0.42;
        }

        if ("metalness" in mesh.material) {
          mesh.material.metalness = 0.02;
        }
      }
    });

    return cloned;
  }, [gltf.scene]);

  useEffect(() => {
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh;

      if (!mesh.isMesh) {
        return;
      }

      const fdi = findFdiFromObject(mesh);

      if (!fdi) {
        return;
      }

      const tooth = dientes.find((item) => item.fdi === fdi);
      const estado = tooth?.estado ?? "sano";
      const selected = fdi === selectedFdi;
      const accent = ESTADOS[estado].accent;

      mesh.visible = estado !== "ausente";

      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];

      materials.forEach((material) => {
        const mat = material as THREE.MeshStandardMaterial;

        if (!mat) {
          return;
        }

        if ("emissive" in mat) {
          mat.emissive = new THREE.Color(
            selected ? accent : "#000000",
          );

          mat.emissiveIntensity = selected ? 0.34 : 0;
        }

        if ("roughness" in mat) {
          mat.roughness = selected ? 0.28 : 0.42;
        }
      });
    });
  }, [scene, selectedFdi, dientes]);

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();

    const fdi = findFdiFromObject(event.object);

    if (fdi) {
      onSelect(fdi);
    }
  };

  return (
    <primitive
      object={scene}
      onPointerDown={handlePointerDown}
      scale={2.85}
      position={[0, -1.55, 0]}
    />
  );
}

/* =========================================================
   CAMERA RIG
   Eases the camera and orbit target toward the active view/zoom
   preset. It only takes over the camera while a transition is in
   progress; once the target is reached it steps aside so
   OrbitControls' own damping / autoRotate loop keeps running
   untouched.
========================================================= */

function CameraRig({
  view,
  zoom,
  controlsRef,
}: {
  view: Vista;
  zoom: number;
  controlsRef: React.MutableRefObject<any>;
}) {
  const { camera } = useThree();

  const targetPosition = useRef(
    new THREE.Vector3(...VIEW_PRESETS.anterior.position),
  );

  const targetLookAt = useRef(
    new THREE.Vector3(...VIEW_PRESETS.anterior.target),
  );

  const transitioning = useRef(true);

  useEffect(() => {
    const preset = VIEW_PRESETS[view];
    const distanceScale = 1 / zoom;

    targetPosition.current.set(
      preset.position[0] * distanceScale,
      preset.position[1] * distanceScale,
      preset.position[2] * distanceScale,
    );

    targetLookAt.current.set(...preset.target);

    /* Only steer the camera right after the person picks a view or
       taps the zoom controls. Free mouse drag / scroll-wheel zoom is
       left completely alone the rest of the time, so it never gets
       pulled back to the preset mid-gesture. */
    transitioning.current = true;
  }, [view, zoom]);

  useFrame(() => {
    if (!transitioning.current) {
      return;
    }

    const distance = camera.position.distanceTo(targetPosition.current);

    if (distance > 0.03) {
      camera.position.lerp(targetPosition.current, 0.08);

      if (controlsRef.current) {
        controlsRef.current.target.lerp(targetLookAt.current, 0.08);
        controlsRef.current.update();
      }
    } else {
      transitioning.current = false;
    }
  });

  return null;
}

/* =========================================================
   MODEL ERROR BOUNDARY
========================================================= */

type ErrorBoundaryProps = {
  children: ReactNode;
  onError: () => void;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

class ModelErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return {
      hasError: true,
    };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    this.props.onError();
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}

/* =========================================================
   3D LOADING
========================================================= */

function ModelLoading() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="rounded-2xl border border-violet-200 bg-white/90 px-5 py-4 shadow-xl backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
          <div>
            <div className="text-sm font-semibold text-slate-800">
              Cargando modelo 3D
            </div>
            <div className="text-xs text-slate-500">
              Preparando anatomía dental...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   INTERACTIVE MOUTH IMAGE
   Since there is no real GLB in `public/models`, only a PNG, this
   gives the flat photo the same feel as the 3D viewer: it sways
   slowly on its own, the view buttons tilt it, the mouse wheel and
   the zoom buttons scale it, and "Mover" lets you drag it around.
========================================================= */

const IMAGE_TILT: Record<Vista, { rotateX: number; rotateY: number }> = {
  anterior: { rotateX: 0, rotateY: 0 },
  oclusal: { rotateX: 16, rotateY: 0 },
  derecha: { rotateX: 0, rotateY: 16 },
  izquierda: { rotateX: 0, rotateY: -16 },
};

function InteractiveMouthImage({
  image,
  uploadedImages,
  view,
  zoom,
  autoRotate,
  panMode,
  onZoomBy,
}: {
  image: string;
  uploadedImages: string[];
  view: Vista;
  zoom: number;
  autoRotate: boolean;
  panMode: boolean;
  onZoomBy: (amount: number) => void;
}) {
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const dragState = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  useEffect(() => {
    setPan({ x: 0, y: 0 });
  }, [view]);

  const tilt = IMAGE_TILT[view];

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!panMode) {
      return;
    }

    dragState.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!panMode || !dragState.current) {
      return;
    }

    const limit = 70;
    const dx = event.clientX - dragState.current.startX;
    const dy = event.clientY - dragState.current.startY;

    setPan({
      x: Math.min(limit, Math.max(-limit, dragState.current.originX + dx)),
      y: Math.min(limit, Math.max(-limit, dragState.current.originY + dy)),
    });
  }

  function handlePointerUp() {
    dragState.current = null;
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    onZoomBy(event.deltaY > 0 ? -0.08 : 0.08);
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-[26px] bg-[#100d27]"
      style={{ perspective: "1600px" }}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <style>{`
        @keyframes mouthSway {
          0% { transform: rotateY(-6deg) rotateX(1.5deg); }
          50% { transform: rotateY(6deg) rotateX(-1.5deg); }
          100% { transform: rotateY(-6deg) rotateX(1.5deg); }
        }
      `}</style>

      <div
        className="h-full w-full ease-out"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale(${zoom})`,
          transformStyle: "preserve-3d",
          transition: "transform 0.5s ease-out",
          cursor: panMode ? "grab" : "default",
        }}
      >
        <div
          className="h-full w-full"
          style={{
            transformStyle: "preserve-3d",
            animationName: "mouthSway",
            animationDuration: "16s",
            animationTimingFunction: "ease-in-out",
            animationIterationCount: "infinite",
            animationPlayState: autoRotate ? "running" : "paused",
          }}
        >
          <img
            src={image}
            alt="Vista interactiva del odontograma"
            className="h-full w-full object-contain"
            draggable={false}
          />
        </div>
      </div>

      {uploadedImages.length > 0 && (
        <div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white backdrop-blur">
          <Images className="h-4 w-4" />
          {uploadedImages.length} imagen
          {uploadedImages.length === 1 ? "" : "es"} clínica
          {uploadedImages.length === 1 ? "" : "s"}
        </div>
      )}

      <div className="pointer-events-none absolute bottom-4 right-4 rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-[10px] text-white/80 backdrop-blur">
        {autoRotate ? "Rotación automática activa" : "Rotación en pausa"}
        {" · "}
        {panMode ? "arrastrá para mover" : "rueda para zoom"}
      </div>
    </div>
  );
}

/* =========================================================
   LEGEND
========================================================= */

function Legend() {
  return (
    <div className="grid grid-cols-2 gap-2">
      {(Object.keys(ESTADOS) as EstadoDiente[]).map((estado) => {
        const config = ESTADOS[estado];

        return (
          <div
            key={estado}
            className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-2.5 py-2"
          >
            <span
              className="h-3 w-3 rounded-full ring-2"
              style={{
                backgroundColor: config.accent,
                boxShadow: `0 0 0 3px ${config.accent}18`,
              }}
            />

            <span className="text-[11px] font-medium text-slate-600">
              {config.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* =========================================================
   SELECTED TOOTH PANEL
========================================================= */

function SelectedToothPanel({
  tooth,
  onAnalyze,
  onUpload,
}: {
  tooth: Diente;
  onAnalyze: () => void;
  onUpload: () => void;
}) {
  const config = ESTADOS[tooth.estado];
  const tipo = getTipoDiente(tooth.fdi);

  return (
    <div className="rounded-[24px] border border-violet-100 bg-white p-5 shadow-[0_12px_40px_rgba(92,67,160,0.08)]">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50">
              <ToothSilhouette
                tipo={tipo}
                estado={tooth.estado}
                selected
              />
            </div>

            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-violet-500">
                Pieza seleccionada
              </div>

              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {tooth.fdi}
                </span>

                <span
                  className="rounded-full px-2.5 py-1 text-[10px] font-bold"
                  style={{
                    color: config.accent,
                    backgroundColor: `${config.accent}18`,
                  }}
                >
                  {config.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          title="Cerrar selección"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">
            Tipo
          </div>
          <div className="mt-1 text-xs font-semibold capitalize text-slate-700">
            {tipo}
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">
            FDI
          </div>
          <div className="mt-1 text-xs font-semibold text-slate-700">
            {tooth.fdi}
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-slate-100 p-3.5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-400">
              Estado clínico
            </div>

            <div className="mt-1 flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: config.accent,
                }}
              />

              <span className="text-sm font-bold text-slate-800">
                {config.label}
              </span>
            </div>
          </div>

          <Activity
            className="h-4 w-4"
            style={{ color: config.accent }}
          />
        </div>

        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
          {config.description}
        </p>
      </div>

      <button
        type="button"
        onClick={onAnalyze}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-3 text-xs font-bold text-white shadow-[0_8px_22px_rgba(124,58,237,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(124,58,237,0.32)]"
      >
        <Sparkles className="h-4 w-4" />
        Analizar con Esther IA
      </button>

      <button
        type="button"
        onClick={onUpload}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-violet-200 bg-violet-50/50 px-4 py-3 text-xs font-semibold text-violet-600 transition hover:border-violet-400 hover:bg-violet-50"
      >
        <Upload className="h-4 w-4" />
        Agregar foto clínica
      </button>
    </div>
  );
}

/* =========================================================
   BOTTOM TABS
========================================================= */

function BottomTabs({
  active,
  onChange,
  eventos,
  uploadedImages,
}: {
  active: Tab;
  onChange: (tab: Tab) => void;
  eventos: Evento[];
  uploadedImages: string[];
}) {
  const tabs: Array<{
    id: Tab;
    label: string;
    icon: typeof History;
  }> = [
    {
      id: "historial",
      label: "Historial",
      icon: History,
    },
    {
      id: "evolucion",
      label: "Evolución",
      icon: Activity,
    },
    {
      id: "imagenes",
      label: "Imágenes",
      icon: Images,
    },
  ];

  return (
    <div className="rounded-[24px] border border-violet-100 bg-white p-4 shadow-[0_10px_35px_rgba(92,67,160,0.06)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = active === tab.id;

          return (
            <button
              type="button"
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={[
                "flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition",
                selected
                  ? "bg-violet-600 text-white shadow-[0_6px_18px_rgba(124,58,237,0.2)]"
                  : "text-slate-500 hover:bg-violet-50 hover:text-violet-600",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="pt-4">
        {active === "historial" && (
          <div className="space-y-3">
            {eventos.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-5 text-center text-xs text-slate-500">
                No hay eventos clínicos registrados todavía.
              </div>
            ) : (
              eventos.slice(0, 4).map((evento) => (
                <div
                  key={evento.id}
                  className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 transition hover:border-violet-200 hover:bg-violet-50/30"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50">
                    <History className="h-4 w-4 text-violet-600" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-bold text-slate-800">
                      {evento.titulo}
                    </div>

                    <div className="mt-0.5 text-[10px] text-slate-500">
                      {evento.fecha} · {evento.profesional}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {active === "evolucion" && (
          <div className="rounded-2xl bg-gradient-to-r from-violet-50 to-purple-50 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
                <Activity className="h-5 w-5 text-violet-600" />
              </div>

              <div>
                <div className="text-sm font-bold text-slate-800">
                  Evolución odontológica
                </div>
                <div className="text-[11px] text-slate-500">
                  Preparado para datos históricos del backend.
                </div>
              </div>
            </div>
          </div>
        )}

        {active === "imagenes" && (
          <div>
            {uploadedImages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 p-7 text-center">
                <FileImage className="mx-auto h-8 w-8 text-violet-400" />
                <div className="mt-2 text-xs font-bold text-slate-700">
                  Todavía no hay imágenes adjuntas
                </div>
                <div className="mt-1 text-[10px] text-slate-500">
                  Las fotografías clínicas aparecerán acá.
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {uploadedImages.map((image, index) => (
                  <div
                    key={image}
                    className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
                  >
                    <img
                      src={image}
                      alt={`Imagen clínica ${index + 1}`}
                      className="aspect-square w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export function Odontograma3D({
  pacienteId,
  onToast,
  dientes,
  eventos,
}: Props) {
  const data = dientes ?? getDientesIniciales();

  const toothLayout = useMemo(
    () => buildToothLayout(data),
    [data],
  );

  const [selectedFdi, setSelectedFdi] = useState<number>(16);

  const [view, setView] = useState<Vista>("anterior");

  const [tab, setTab] = useState<Tab>("historial");

  const [zoom, setZoom] = useState(1);

  const [modelAvailable, setModelAvailable] = useState(false);

  const [modelFailed, setModelFailed] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);

  const [aiMessage, setAiMessage] = useState("");

  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  const [autoRotate, setAutoRotate] = useState(true);

  const [panMode, setPanMode] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const controlsRef = useRef<any>(null);

  const viewerRef = useRef<HTMLDivElement>(null);

  const selectedTooth =
    data.find((tooth) => tooth.fdi === selectedFdi) ??
    data[0] ??
    {
      fdi: 16,
      estado: "sano" as EstadoDiente,
    };

  const selectedConfig = ESTADOS[selectedTooth.estado];

  const totalWithIssues = data.filter(
    (tooth) => tooth.estado !== "sano",
  ).length;

  /* -------------------------------------------------------
     Detect GLB without crashing if it does not exist
  ------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    fetch(MODEL_URL, {
      method: "HEAD",
      cache: "no-store",
    })
      .then((response) => {
        if (!cancelled) {
          setModelAvailable(response.ok);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setModelAvailable(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* -------------------------------------------------------
     Fullscreen viewer
  ------------------------------------------------------- */

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange,
      );
    };
  }, []);

  function toggleFullscreen() {
    const element = viewerRef.current;

    if (!element) {
      return;
    }

    if (!document.fullscreenElement) {
      element.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  /* -------------------------------------------------------
     File upload
  ------------------------------------------------------- */

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      onToast?.("Seleccioná una imagen clínica válida.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);

    setUploadedImages((current) => [...current, objectUrl]);

    setTab("imagenes");

    onToast?.("Imagen clínica agregada.");

    event.target.value = "";
  }

  /* -------------------------------------------------------
     AI mockup
  ------------------------------------------------------- */

  function handleAiAnalysis() {
    setAiLoading(true);
    setAiMessage("");

    window.setTimeout(() => {
      setAiLoading(false);

      setAiMessage(
        `Esther IA tiene preparada la pieza ${selectedFdi} para análisis clínico. Esta integración es un mockup y todavía no realiza diagnóstico automático.`,
      );
    }, 1000);
  }

  /* -------------------------------------------------------
     View controls
  ------------------------------------------------------- */

  function resetView() {
    setView("anterior");
    setZoom(1);
    setPanMode(false);
    setAutoRotate(true);
  }

  function changeZoom(amount: number) {
    setZoom((current) =>
      Math.min(1.45, Math.max(0.75, current + amount)),
    );
  }

  function toggleAutoRotate() {
    setAutoRotate((current) => !current);
  }

  function togglePanMode() {
    setPanMode((current) => !current);
  }

  const eventosFinales =
    eventos ??
    [
      {
        id: "1",
        fecha: formatDate(new Date()),
        titulo: `Evaluación odontológica · pieza ${selectedFdi}`,
        profesional: "CloudEsther",
      },
      {
        id: "2",
        fecha: "12/09/2026",
        titulo: "Actualización de odontograma",
        profesional: "Profesional tratante",
      },
    ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf9ff] via-white to-[#f2efff] text-slate-800">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="sticky top-0 z-30 border-b border-violet-100/80 bg-white/90 px-4 py-3 backdrop-blur-xl md:px-6">
        <div className="mx-auto flex max-w-[1600px] items-center gap-4">
          <div className="flex min-w-[210px] items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-purple-500 shadow-[0_7px_22px_rgba(124,58,237,0.25)]">
              <Stethoscope className="h-5 w-5 text-white" />
            </div>

            <div>
              <div className="text-lg font-extrabold tracking-tight text-slate-900">
                CloudEsther
              </div>

              <div className="text-[10px] font-medium text-violet-500">
                Odontograma 3D
              </div>
            </div>
          </div>

          <div className="hidden h-10 w-px bg-slate-200 lg:block" />

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="hidden h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-100 md:flex">
              <span className="text-sm font-bold text-violet-600">
                P
              </span>
            </div>

            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-slate-900">
                Paciente
              </div>

              <div className="text-[10px] text-slate-500">
                ID: {pacienteId} · Odontograma clínico
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-1 rounded-2xl bg-violet-50 p-1 md:flex">
            {(
              [
                ["historial", History],
                ["evolucion", Activity],
                ["imagenes", Images],
              ] as const
            ).map(([id, Icon]) => {
              const active = tab === id;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={[
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-bold transition",
                    active
                      ? "bg-white text-violet-700 shadow-sm"
                      : "text-slate-500 hover:text-violet-600",
                  ].join(" ")}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {id === "historial"
                    ? "Historial"
                    : id === "evolucion"
                      ? "Evolución"
                      : "Imágenes"}
                </button>
              );
            })}
          </div>

          <div className="hidden items-center gap-2 rounded-2xl border border-violet-100 bg-white px-3 py-2 shadow-sm sm:flex">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100">
              <Sparkles className="h-3.5 w-3.5 text-violet-600" />
            </div>

            <div>
              <div className="text-[10px] font-bold text-slate-700">
                Esther IA
              </div>
              <div className="text-[9px] text-slate-400">
                Asistente dental
              </div>
            </div>

            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>
      </header>

      {/* ===================================================
          CONTENT
      =================================================== */}

      <main className="mx-auto max-w-[1600px] p-4 md:p-6">
        <div className="grid gap-5 xl:grid-cols-[230px_minmax(0,1fr)_300px]">
          {/* =================================================
              LEFT CONTROLS
          ================================================= */}

          <aside className="space-y-4">
            <section className="rounded-[24px] border border-violet-100 bg-white p-4 shadow-[0_10px_35px_rgba(92,67,160,0.06)]">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    Controles de vista
                  </div>

                  <div className="mt-0.5 text-[10px] text-slate-400">
                    Navegación del modelo
                  </div>
                </div>

                <Move3D className="h-5 w-5 text-violet-500" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {VISTAS.map((item) => {
                  const Icon = item.icon;
                  const active = view === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setView(item.id)}
                      className={[
                        "flex flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-[10px] font-bold transition",
                        active
                          ? "border-violet-500 bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-[0_7px_20px_rgba(124,58,237,0.25)]"
                          : "border-slate-100 bg-slate-50 text-slate-500 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-600",
                      ].join(" ")}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <div className="my-4 h-px bg-slate-100" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50">
                    <ZoomIn className="h-4 w-4 text-violet-600" />
                  </div>

                  <span className="text-xs font-bold text-slate-700">
                    Zoom
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => changeZoom(-0.1)}
                    className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-violet-50 hover:text-violet-600"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => changeZoom(0.1)}
                    className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-violet-50 hover:text-violet-600"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-400 to-violet-600 transition-all"
                  style={{
                    width: `${((zoom - 0.75) / 0.7) * 100}%`,
                  }}
                />
              </div>

              <button
                type="button"
                onClick={resetView}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-600"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restablecer vista
              </button>
            </section>

            <section className="rounded-[24px] border border-violet-100 bg-white p-4 shadow-[0_10px_35px_rgba(92,67,160,0.06)]">
              <div className="text-sm font-bold text-slate-900">
                Acciones
              </div>

              <button
                type="button"
                onClick={handleUploadClick}
                className="mt-3 flex w-full items-center gap-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-3 text-left text-xs font-bold text-white shadow-[0_7px_20px_rgba(124,58,237,0.2)] transition hover:-translate-y-0.5"
              >
                <Camera className="h-4 w-4" />
                Agregar foto
              </button>

              <p className="mt-2 px-1 text-[10px] leading-relaxed text-slate-400">
                Subí fotografías clínicas, radiografías o fotos intraorales.
              </p>
            </section>

            <section className="rounded-[24px] border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>

                <div>
                  <div className="text-xs font-bold text-slate-800">
                    Estado del odontograma
                  </div>

                  <div className="text-[10px] text-slate-500">
                    {totalWithIssues} piezas con estado clínico
                  </div>
                </div>
              </div>
            </section>
          </aside>

          {/* =================================================
              CENTER 3D VIEWER
          ================================================= */}

          <section className="min-w-0">
            <div
              ref={viewerRef}
              className="relative overflow-hidden rounded-[28px] border border-violet-100 bg-white shadow-[0_15px_50px_rgba(72,51,135,0.10)]"
            >
              <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-xl border border-white/20 bg-slate-950/65 px-3 py-2 text-xs font-bold text-white shadow-lg backdrop-blur">
                <span
                  className={[
                    "h-2 w-2 rounded-full",
                    modelAvailable && !modelFailed
                      ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
                      : "bg-amber-400",
                  ].join(" ")}
                />

                {modelAvailable && !modelFailed
                  ? "Modelo 3D"
                  : "Vista interactiva"}
              </div>

              <button
                type="button"
                onClick={toggleFullscreen}
                className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-xl border border-white/15 bg-slate-950/65 px-3 py-2 text-xs font-bold text-white shadow-lg backdrop-blur transition hover:bg-slate-900"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Expand className="h-3.5 w-3.5" />
                )}
                {isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
              </button>

              <div className="relative h-[680px] overflow-hidden bg-[#110d2b] md:h-[820px] xl:h-[900px]">
                {modelAvailable && !modelFailed ? (
                  <ModelErrorBoundary
                    onError={() => setModelFailed(true)}
                  >
                    <Canvas
                      shadows
                      dpr={[1, 2]}
                      gl={{
                        antialias: true,
                        alpha: true,
                      }}
                    >
                      <PerspectiveCamera
                        makeDefault
                        position={[0, 1.2, 8.8]}
                        fov={38}
                      />

                      <color
                        attach="background"
                        args={["#110d2b"]}
                      />

                      <ambientLight intensity={1.35} />

                      <directionalLight
                        position={[4, 7, 6]}
                        intensity={3.2}
                        castShadow
                        shadow-mapSize-width={2048}
                        shadow-mapSize-height={2048}
                      />

                      <directionalLight
                        position={[-5, 3, 4]}
                        intensity={1.8}
                      />

                      <pointLight
                        position={[0, 2, 5]}
                        intensity={2.2}
                        color="#c4b5fd"
                      />

                      <Suspense fallback={null}>
                        <DentalModel
                          selectedFdi={selectedFdi}
                          dientes={data}
                          onSelect={setSelectedFdi}
                        />

                        <Environment preset="studio" />

                        <ContactShadows
                          position={[0, -3.1, 0]}
                          opacity={0.38}
                          scale={8}
                          blur={2.8}
                          far={6}
                        />
                      </Suspense>

                      <CameraRig
                        view={view}
                        zoom={zoom}
                        controlsRef={controlsRef}
                      />

                      <OrbitControls
                        ref={controlsRef}
                        enablePan
                        enableZoom
                        enableDamping
                        dampingFactor={0.08}
                        autoRotate={autoRotate}
                        autoRotateSpeed={0.4}
                        minDistance={5}
                        maxDistance={15}
                        mouseButtons={{
                          LEFT: panMode
                            ? THREE.MOUSE.PAN
                            : THREE.MOUSE.ROTATE,
                          MIDDLE: THREE.MOUSE.DOLLY,
                          RIGHT: THREE.MOUSE.PAN,
                        }}
                        touches={{
                          ONE: panMode
                            ? THREE.TOUCH.PAN
                            : THREE.TOUCH.ROTATE,
                          TWO: THREE.TOUCH.DOLLY_PAN,
                        }}
                        makeDefault
                      />
                    </Canvas>

                    <div className="pointer-events-none absolute bottom-4 left-4 rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-[10px] text-white/80 backdrop-blur">
                      {autoRotate
                        ? "Rotación automática activa"
                        : "Arrastrá para rotar"}{" "}
                      · rueda para zoom
                    </div>
                  </ModelErrorBoundary>
                ) : (
                  <InteractiveMouthImage
                    image={MOUTH_IMAGE}
                    uploadedImages={uploadedImages}
                    view={view}
                    zoom={zoom}
                    autoRotate={autoRotate}
                    panMode={panMode}
                    onZoomBy={changeZoom}
                  />
                )}

                {/* Viewer controls */}

                <div className="absolute right-4 top-1/2 z-10 -translate-y-1/2 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/65 shadow-xl backdrop-blur">
                  <button
                    type="button"
                    onClick={toggleAutoRotate}
                    title={
                      autoRotate
                        ? "Detener rotación automática"
                        : "Activar rotación automática"
                    }
                    className={[
                      "flex h-14 w-14 flex-col items-center justify-center gap-1 border-b border-white/10 text-white transition",
                      autoRotate
                        ? "bg-violet-600/50"
                        : "hover:bg-violet-600/40",
                    ].join(" ")}
                  >
                    <Move3D className="h-4 w-4" />
                    <span className="text-[8px]">Rotar</span>
                  </button>

                  <button
                    type="button"
                    onClick={togglePanMode}
                    title={
                      panMode
                        ? "Modo desplazamiento activo"
                        : "Activar modo desplazamiento"
                    }
                    className={[
                      "flex h-14 w-14 flex-col items-center justify-center gap-1 border-b border-white/10 text-white transition",
                      panMode
                        ? "bg-violet-600/50"
                        : "hover:bg-violet-600/40",
                    ].join(" ")}
                  >
                    <Maximize2 className="h-4 w-4" />
                    <span className="text-[8px]">Mover</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => changeZoom(0.1)}
                    className="flex h-14 w-14 flex-col items-center justify-center gap-1 border-b border-white/10 text-white transition hover:bg-violet-600/40"
                  >
                    <ZoomIn className="h-4 w-4" />
                    <span className="text-[8px]">Zoom</span>
                  </button>

                  <button
                    type="button"
                    onClick={resetView}
                    className="flex h-14 w-14 flex-col items-center justify-center gap-1 text-white transition hover:bg-violet-600/40"
                  >
                    <Eye className="h-4 w-4" />
                    <span className="text-[8px]">Vista</span>
                  </button>
                </div>
              </div>
            </div>

            {/* =================================================
                32 TEETH — anatomical arches, one horizontal row
                per arch instead of a stacked grid
            ================================================= */}

            <section className="mt-5 rounded-[28px] border border-violet-100 bg-white p-4 shadow-[0_12px_40px_rgba(92,67,160,0.07)] md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50">
                    <Stethoscope className="h-5 w-5 text-violet-600" />
                  </div>

                  <div>
                    <div className="text-base font-extrabold text-slate-900">
                      Las 32 piezas dentales
                    </div>

                    <div className="text-[10px] text-slate-400">
                      Seleccioná una pieza para ver su información clínica
                    </div>
                  </div>
                </div>

                <div className="rounded-full bg-violet-50 px-3 py-1.5 text-[10px] font-bold text-violet-600">
                  32 piezas · FDI
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {toothLayout.slice(0, 16).map((tooth) => (
                    <ToothMiniCard
                      key={tooth.fdi}
                      fdi={tooth.fdi}
                      estado={tooth.estado}
                      selected={selectedFdi === tooth.fdi}
                      onSelect={setSelectedFdi}
                    />
                  ))}
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2">
                  {toothLayout.slice(16, 32).map((tooth) => (
                    <ToothMiniCard
                      key={tooth.fdi}
                      fdi={tooth.fdi}
                      estado={tooth.estado}
                      selected={selectedFdi === tooth.fdi}
                      onSelect={setSelectedFdi}
                    />
                  ))}
                </div>
              </div>
            </section>

            {/* =================================================
                TABS
            ================================================= */}

            <div className="mt-5">
              <BottomTabs
                active={tab}
                onChange={setTab}
                eventos={eventosFinales}
                uploadedImages={uploadedImages}
              />
            </div>
          </section>

          {/* =================================================
              RIGHT SIDEBAR
          ================================================= */}

          <aside className="space-y-4">
            <SelectedToothPanel
              tooth={selectedTooth}
              onAnalyze={handleAiAnalysis}
              onUpload={handleUploadClick}
            />

            {/* AI result */}

            {(aiLoading || aiMessage) && (
              <section className="rounded-[24px] border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 shadow-[0_10px_35px_rgba(92,67,160,0.07)]">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      Esther IA
                    </div>

                    <div className="text-[10px] text-slate-500">
                      Asistente dental
                    </div>
                  </div>
                </div>

                {aiLoading ? (
                  <div className="mt-4 flex items-center gap-2 text-xs text-violet-600">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
                    Preparando análisis...
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl bg-white p-3 text-[11px] leading-relaxed text-slate-600">
                    {aiMessage}
                  </p>
                )}
              </section>
            )}

            {/* Color references */}

            <section className="rounded-[24px] border border-violet-100 bg-white p-4 shadow-[0_10px_35px_rgba(92,67,160,0.06)]">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-bold text-slate-900">
                  Referencias de colores
                </div>

                <CircleDot className="h-4 w-4 text-violet-400" />
              </div>

              <Legend />
            </section>

            {/* Photo upload */}

            <section className="rounded-[24px] border border-violet-100 bg-white p-4 shadow-[0_10px_35px_rgba(92,67,160,0.06)]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    Imágenes clínicas
                  </div>

                  <div className="mt-0.5 text-[10px] text-slate-400">
                    {uploadedImages.length} adjuntas
                  </div>
                </div>

                <Images className="h-5 w-5 text-violet-500" />
              </div>

              <button
                type="button"
                onClick={handleUploadClick}
                className="mt-3 flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 px-4 py-6 transition hover:border-violet-400 hover:bg-violet-50"
              >
                <Upload className="h-6 w-6 text-violet-500" />

                <span className="mt-2 text-xs font-bold text-violet-600">
                  Agregar foto
                </span>

                <span className="mt-1 text-[10px] text-slate-400">
                  Arrastrá o seleccioná una imagen
                </span>
              </button>

              {uploadedImages.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {uploadedImages.slice(-3).map((image, index) => (
                    <div
                      key={image}
                      className="overflow-hidden rounded-xl border border-slate-100"
                    >
                      <img
                        src={image}
                        alt={`Imagen clínica ${index + 1}`}
                        className="aspect-square w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </div>
      </main>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="border-t border-violet-100 bg-white/80 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-50">
              <Stethoscope className="h-3 w-3 text-violet-500" />
            </div>

            CloudEsther · Odontograma 3D
          </div>

          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Sistema listo
          </div>
        </div>
      </footer>
    </div>
  );
}