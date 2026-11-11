import { useMemo, useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { buildArch, buildGumGeometry, buildPalateGeometry, buildToothGeometry, type PlacedTooth } from "./anatomy";

export type ViewName = "front" | "top" | "bottom" | "side";

/** Acabados del modelo 3D, como el visor STL de Oclu: realista / yeso / glossy / wireframe. */
export type MatMode = "realista" | "yeso" | "glossy" | "wireframe";

type MatPreset = {
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  sheen: number;
  transmission: number;
  wireframe: boolean;
  /** true = respeta el color clínico de cada pieza; false = material neutro (yeso). */
  usarColor: boolean;
};

export const MAT: Record<MatMode, MatPreset> = {
  // Esmalte real: translúcido, con brillo suave y profundidad.
  realista: { roughness: 0.52, metalness: 0, clearcoat: 0.12, clearcoatRoughness: 0.4, sheen: 0.22, transmission: 0.03, wireframe: false, usarColor: true },
  // Modelo de yeso: mate, sin reflejos, color hueso uniforme.
  yeso: { roughness: 0.95, metalness: 0, clearcoat: 0, clearcoatRoughness: 1, sheen: 0, transmission: 0, wireframe: false, usarColor: false },
  // Escaneo brillante: superficie muy pulida y reflejos marcados.
  glossy: { roughness: 0.06, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.04, sheen: 0, transmission: 0, wireframe: false, usarColor: true },
  // Malla técnica: solo las aristas de la geometría.
  wireframe: { roughness: 0.5, metalness: 0, clearcoat: 0, clearcoatRoughness: 0.5, sheen: 0, transmission: 0, wireframe: true, usarColor: true },
};

const COLOR_YESO = "#efe7d6";

/** Dirección (no distancia) desde la que mira la cámara en cada vista. La distancia la calcula
    solo AutoFrame según el tamaño real del modelo, así siempre llena el visor y queda centrado. */
const VIEWS: Record<ViewName, [number, number, number]> = {
  front: [0, 0.13, 1],
  top: [0, -0.96, 0.28],
  bottom: [0, 0.96, 0.28],
  side: [0.86, 0.17, 0.48],
};

function Tooth({ t, color, modo, mat: preset, selected, hovered, onSelect, onHover }: {
  t: PlacedTooth; color: string; modo: MatMode; mat: MatPreset; selected: boolean; hovered: boolean;
  onSelect: (id: number) => void; onHover: (id: number | null) => void;
}) {
  const geo = useMemo(() => buildToothGeometry(t.type, t.jaw, t.id).geo, [t]);
  const mat = useRef<THREE.MeshPhysicalMaterial>(null);
  useFrame(() => {
    if (!mat.current) return;
    const target = selected ? 0.35 : hovered ? 0.15 : 0;
    mat.current.emissiveIntensity += (target - mat.current.emissiveIntensity) * 0.15;
  });
  return (
    <mesh
      geometry={geo}
      position={t.position}
      quaternion={t.quaternion}
      castShadow
      receiveShadow
      onClick={(e) => { e.stopPropagation(); onSelect(t.id); }}
      onPointerOver={(e) => { e.stopPropagation(); onHover(t.id); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { onHover(null); document.body.style.cursor = ""; }}
    >
      <meshPhysicalMaterial
        key={modo}
        ref={mat}
        vertexColors={preset.usarColor}
        color={preset.usarColor ? color : COLOR_YESO}
        roughness={preset.roughness}
        metalness={preset.metalness}
        clearcoat={preset.clearcoat}
        clearcoatRoughness={preset.clearcoatRoughness}
        sheen={preset.sheen}
        sheenColor="#fff6e6"
        transmission={preset.transmission}
        thickness={2}
        ior={1.62}
        wireframe={preset.wireframe}
        emissive={selected ? "#7c5cff" : "#5ec8ff"}
        emissiveIntensity={0}
      />
    </mesh>
  );
}

/* Material de la encía. Igual que en los dientes, al cambiar de acabado (sobre todo volver de
   "Wireframe" a "Realista") three.js necesita recompilar el shader; sin needsUpdate la encía
   quedaba con el acabado anterior. */
function GumMaterial({ mat }: { mat: MatPreset }) {
  const ref = useRef<THREE.MeshPhysicalMaterial>(null);
  useEffect(() => {
    if (ref.current) ref.current.needsUpdate = true;
  }, [mat]);
  if (!mat.usarColor) {
    return (
      <meshPhysicalMaterial
        ref={ref}
        color={COLOR_YESO}
        roughness={0.95}
        clearcoat={0}
        sheen={0}
        wireframe={mat.wireframe}
        side={THREE.DoubleSide}
      />
    );
  }
  return (
    <meshPhysicalMaterial
      ref={ref}
      vertexColors
      roughness={mat.wireframe ? 0.5 : 0.42}
      clearcoat={mat.clearcoat * 0.8}
      clearcoatRoughness={0.35}
      sheen={0.6}
      sheenColor="#ffb3b8"
      sheenRoughness={0.5}
      wireframe={mat.wireframe}
      side={THREE.DoubleSide}
    />
  );
}

function Jaw({ jaw, offset, estados, modo, mat, selected, hovered, onSelect, onHover }: {
  jaw: "upper" | "lower"; offset: number; estados: Record<number, string>; modo: MatMode; mat: MatPreset; selected: number | null; hovered: number | null;
  onSelect: (id: number) => void; onHover: (id: number | null) => void;
}) {
  const arch = useMemo(() => buildArch(jaw), [jaw]);
  const gum = useMemo(() => buildGumGeometry(arch), [arch]);
  const palate = useMemo(() => buildPalateGeometry(arch), [arch]);
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (group.current) group.current.position.y += (offset - group.current.position.y) * 0.1;
  });
  return (
    <group ref={group}>
      <mesh geometry={gum} castShadow receiveShadow><GumMaterial key={modo} mat={mat} /></mesh>
      <mesh geometry={palate} receiveShadow><GumMaterial key={modo} mat={mat} /></mesh>
      {arch.teeth.map((t) => (
        <Tooth key={t.id} t={t} color={estados[t.id] ?? "#ffffff"} modo={modo} mat={mat} selected={selected === t.id} hovered={hovered === t.id} onSelect={onSelect} onHover={onHover} />
      ))}
    </group>
  );
}

/* Encuadre del modelo — TODO por propiedades fijas (no por cámara), porque mover la cámara lo
   pisa OrbitControls. Se ajusta a mano con estos 3 números:
     CAM_DIST      distancia de la cámara (menor = boca más grande)
     MODEL_SHIFT_Y baja el modelo para centrarlo en el visor (más negativo = más abajo)
     MODEL_SCALE   agranda el modelo (mayor = más grande) */
const CAM_DIST = 120;
const MODEL_SCALE = 1.3;

/* Centrar: centra el modelo en el origen midiendo su tamaño real (esto SÍ funciona, a diferencia
   de mover la cámara, que OrbitControls pisa). Así la boca queda centrada en el visor. */
function Centrar({
  groupRef,
  open,
  showUpper,
  showLower,
}: {
  groupRef: { current: THREE.Group | null };
  open: boolean;
  showUpper: boolean;
  showLower: boolean;
}) {
  const necesita = useRef(true);
  useEffect(() => {
    necesita.current = true;
  }, [open, showUpper, showLower]);
  useFrame(() => {
    if (!necesita.current) return;
    const g = groupRef.current;
    if (!g) return;
    g.position.set(0, 0, 0);
    g.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(g);
    if (box.isEmpty()) return;
    const c = box.getCenter(new THREE.Vector3());
    g.position.set(-c.x, -c.y, -c.z);
    necesita.current = false;
  });
  return null;
}

/* CameraRig: al cambiar de vista (Frontal/Superior/…), apunta la cámara desde esa dirección
   hacia el centro del modelo (el origen), a CAM_DIST. */
function CameraRig({ view, nonce }: { view: ViewName; nonce: number }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as {
    target: THREE.Vector3;
    update: () => void;
  } | null;
  useEffect(() => {
    const dir = new THREE.Vector3(...VIEWS[view]).normalize().multiplyScalar(CAM_DIST);
    camera.position.copy(dir);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    if (controls) {
      controls.target.set(0, 0, 0);
      controls.update();
    }
  }, [view, nonce, camera, controls]);
  return null;
}

export default function MouthScene({ view, nonce, open, estados = {}, material = "realista", selected, onSelect, showUpper, showLower }: {
  view: ViewName; nonce: number; open: boolean; estados?: Record<number, string>; material?: MatMode; selected: number | null; onSelect: (id: number | null) => void;
  showUpper: boolean; showLower: boolean;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const preset = MAT[material];
  // Al salir de la vista 3D se libera el contexto WebGL de inmediato (forceContextLoss). Sin esto,
  // navegar entre vistas 3D va acumulando contextos y el navegador llega a su límite ("Error
  // creating WebGL context"), dejando el 3D en blanco.
  const glRef = useRef<THREE.WebGLRenderer | null>(null);
  const modeloRef = useRef<THREE.Group>(null);
  useEffect(
    () => () => {
      const gl = glRef.current;
      if (!gl) return;
      try {
        gl.forceContextLoss();
      } catch {
        /* ignorar */
      }
      try {
        gl.dispose();
      } catch {
        /* ignorar */
      }
      glRef.current = null;
    },
    [],
  );
  return (
    <Canvas
      shadows
      dpr={[1, 1.25]}
      camera={{ position: [0, 10, 119], fov: 32, near: 1, far: 2000 }}
      gl={{
        antialias: false,
        powerPreference: "low-power",
        failIfMajorPerformanceCaveat: false,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.18,
      }}
      onCreated={({ gl }) => {
        glRef.current = gl;
      }}
      onPointerMissed={() => onSelect(null)}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[30, 60, 80]} intensity={1.6} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004}>
        <orthographicCamera attach="shadow-camera" args={[-60, 60, 60, -60, 1, 300]} />
      </directionalLight>
      <directionalLight position={[-50, -20, 40]} intensity={0.5} color="#cfe6ff" />
      <pointLight position={[0, 0, 30]} intensity={300} distance={120} color="#fff1e0" />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={2.2} position={[0, 40, 60]} scale={[80, 30, 1]} />
        <Lightformer form="rect" intensity={1} color="#bfe3ff" position={[-60, 0, 20]} scale={[30, 60, 1]} />
        <Lightformer form="rect" intensity={1} color="#e6dcff" position={[60, 0, 20]} scale={[30, 60, 1]} />
        <Lightformer form="ring" intensity={1.4} position={[0, -40, 40]} scale={20} />
      </Environment>

      {/* El modelo: escala fija (agranda) + centrado dinámico (Centrar lo pone en el origen). */}
      <group ref={modeloRef}>
        <group scale={MODEL_SCALE}>
          <group rotation={[0.08, 0, 0]}>
            {showUpper && <Jaw jaw="upper" offset={open ? 6 : 0} estados={estados} modo={material} mat={preset} selected={selected} hovered={hovered} onSelect={onSelect} onHover={setHovered} />}
            {showLower && <Jaw jaw="lower" offset={open ? -6 : 0} estados={estados} modo={material} mat={preset} selected={selected} hovered={hovered} onSelect={onSelect} onHover={setHovered} />}
          </group>
        </group>
      </group>

      <ContactShadows position={[0, -30, 0]} opacity={0.35} scale={140} blur={2.8} far={40} color="#3a2a6a" />
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} autoRotate autoRotateSpeed={0.6} minDistance={1} maxDistance={5000} rotateSpeed={0.7} zoomSpeed={0.8} />
      <Centrar groupRef={modeloRef} open={open} showUpper={showUpper} showLower={showLower} />
      <CameraRig view={view} nonce={nonce} />
    </Canvas>
  );
}
