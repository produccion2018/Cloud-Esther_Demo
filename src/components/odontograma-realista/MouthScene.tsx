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

const VIEWS: Record<ViewName, [number, number, number]> = {
  front: [0, 6, 140],
  top: [0, -130, 30],
  bottom: [0, 130, 30],
  side: [115, 10, 60],
};

function Tooth({ t, color, mat: preset, selected, hovered, onSelect, onHover }: {
  t: PlacedTooth; color: string; mat: MatPreset; selected: boolean; hovered: boolean;
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

function Jaw({ jaw, offset, estados, mat, selected, hovered, onSelect, onHover }: {
  jaw: "upper" | "lower"; offset: number; estados: Record<number, string>; mat: MatPreset; selected: number | null; hovered: number | null;
  onSelect: (id: number) => void; onHover: (id: number | null) => void;
}) {
  const arch = useMemo(() => buildArch(jaw), [jaw]);
  const gum = useMemo(() => buildGumGeometry(arch), [arch]);
  const palate = useMemo(() => buildPalateGeometry(arch), [arch]);
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (group.current) group.current.position.y += (offset - group.current.position.y) * 0.1;
  });
  const gumMat = mat.usarColor ? (
    <meshPhysicalMaterial vertexColors roughness={mat.wireframe ? 0.5 : 0.42} clearcoat={mat.clearcoat * 0.8} clearcoatRoughness={0.35}
      sheen={0.6} sheenColor="#ffb3b8" sheenRoughness={0.5} wireframe={mat.wireframe} side={THREE.DoubleSide} />
  ) : (
    <meshPhysicalMaterial color={COLOR_YESO} roughness={0.95} clearcoat={0} sheen={0} side={THREE.DoubleSide} />
  );
  return (
    <group ref={group}>
      <mesh geometry={gum} castShadow receiveShadow>{gumMat}</mesh>
      <mesh geometry={palate} receiveShadow>{gumMat}</mesh>
      {arch.teeth.map((t) => (
        <Tooth key={t.id} t={t} color={estados[t.id] ?? "#ffffff"} mat={mat} selected={selected === t.id} hovered={hovered === t.id} onSelect={onSelect} onHover={onHover} />
      ))}
    </group>
  );
}

function CameraRig({ view, nonce }: { view: ViewName; nonce: number }) {
  const { camera } = useThree();
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;
  const goal = useRef<THREE.Vector3 | null>(null);
  useEffect(() => { goal.current = new THREE.Vector3(...VIEWS[view]); }, [view, nonce]);
  useFrame(() => {
    if (!goal.current) return;
    camera.position.lerp(goal.current, 0.08);
    controls?.target.lerp(new THREE.Vector3(0, 0, 0), 0.08);
    controls?.update();
    if (camera.position.distanceTo(goal.current) < 0.3) goal.current = null;
  });
  return null;
}

export default function MouthScene({ view, nonce, open, estados = {}, material = "realista", selected, onSelect, showUpper, showLower }: {
  view: ViewName; nonce: number; open: boolean; estados?: Record<number, string>; material?: MatMode; selected: number | null; onSelect: (id: number | null) => void;
  showUpper: boolean; showLower: boolean;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const preset = MAT[material];
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: VIEWS.front, fov: 32, near: 1, far: 1000 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      onPointerMissed={() => onSelect(null)}
    >
      <ambientLight intensity={0.25} />
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

      <group rotation={[0.08, 0, 0]}>
        {showUpper && <Jaw jaw="upper" offset={open ? 6 : 0} estados={estados} mat={preset} selected={selected} hovered={hovered} onSelect={onSelect} onHover={setHovered} />}
        {showLower && <Jaw jaw="lower" offset={open ? -6 : 0} estados={estados} mat={preset} selected={selected} hovered={hovered} onSelect={onSelect} onHover={setHovered} />}
      </group>

      <ContactShadows position={[0, -30, 0]} opacity={0.35} scale={140} blur={2.8} far={40} color="#3a2a6a" />
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} autoRotate autoRotateSpeed={0.6} minDistance={35} maxDistance={180} rotateSpeed={0.7} zoomSpeed={0.8} />
      <CameraRig view={view} nonce={nonce} />
    </Canvas>
  );
}
