import { useMemo, useRef, useEffect, useState, type ReactNode } from "react";
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
  realista: { roughness: 0.28, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.25, sheen: 0.3, transmission: 0, wireframe: false, usarColor: true },
  // Modelo de yeso: mate, sin reflejos, color hueso uniforme.
  yeso: { roughness: 0.95, metalness: 0, clearcoat: 0, clearcoatRoughness: 1, sheen: 0, transmission: 0, wireframe: false, usarColor: false },
  // Escaneo brillante: superficie muy pulida y reflejos marcados.
  glossy: { roughness: 0.06, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.04, sheen: 0, transmission: 0, wireframe: false, usarColor: true },
  // Malla técnica: solo las aristas de la geometría.
  wireframe: { roughness: 0.5, metalness: 0, clearcoat: 0, clearcoatRoughness: 0.5, sheen: 0, transmission: 0, wireframe: true, usarColor: true },
};

const COLOR_YESO = "#efe7d6";

/** Posición de la cámara en cada vista (como estaba originalmente: muestra la boca completa). */
const VIEWS: Record<ViewName, [number, number, number]> = {
  front: [0, 6, 140],
  top: [0, -130, 30],
  bottom: [0, 130, 30],
  side: [115, 10, 60],
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

/* CameraRig: mueve la cámara a la posición de la vista elegida, mirando al centro (como el
   original que mostraba la boca completa). */
function CameraRig({ view, nonce }: { view: ViewName; nonce: number }) {
  const { camera } = useThree();
  const controls = useThree((s) => s.controls) as unknown as {
    target: THREE.Vector3;
    update: () => void;
  } | null;
  const goal = useRef<THREE.Vector3 | null>(null);
  useEffect(() => {
    goal.current = new THREE.Vector3(...VIEWS[view]);
  }, [view, nonce]);
  useFrame(() => {
    if (!goal.current) return;
    camera.position.lerp(goal.current, 0.08);
    controls?.target.lerp(new THREE.Vector3(0, 0, 0), 0.08);
    controls?.update();
    if (camera.position.distanceTo(goal.current) < 0.3) goal.current = null;
  });
  return null;
}

/* Si el lienzo es más angosto que la imagen de referencia (celular), se aleja la cámara un poco
   para que la boca entre completa a lo ancho. En pantallas anchas queda igual que el standalone. */
function AjusteAncho() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  useEffect(() => {
    camera.zoom = Math.min(1, aspect / 1.35);
    camera.updateProjectionMatrix();
  }, [camera, aspect]);
  return null;
}

/* Movimiento infinito suave cuando nadie la está usando: balanceo lento + flotación.
   Se frena solo al tocar/arrastrar o al elegir una pieza, y vuelve a los 3 s sin uso. */
function MovimientoReposo({ quieto, children }: { quieto: boolean; children: ReactNode }) {
  const grupo = useRef<THREE.Group>(null);
  const controls = useThree((s) => s.controls) as unknown as THREE.EventDispatcher<{ start: object; end: object }> | null;
  const ultimoUso = useRef(-10);
  const usando = useRef(false);
  const peso = useRef(0);
  const t = useRef(0);
  useEffect(() => {
    if (!controls) return;
    const ini = () => { usando.current = true; };
    const fin = () => { usando.current = false; ultimoUso.current = performance.now() / 1000; };
    controls.addEventListener("start", ini);
    controls.addEventListener("end", fin);
    return () => {
      controls.removeEventListener("start", ini);
      controls.removeEventListener("end", fin);
    };
  }, [controls]);
  useFrame((_, dt) => {
    const g = grupo.current;
    if (!g) return;
    const reposo = !quieto && !usando.current && performance.now() / 1000 - ultimoUso.current > 3;
    peso.current += ((reposo ? 1 : 0) - peso.current) * Math.min(1, dt * 1.5);
    t.current += dt;
    g.rotation.y = peso.current * Math.sin(t.current * 0.45) * 0.32;
    g.position.y = peso.current * Math.sin(t.current * 1.1) * 1.4;
  });
  return <group ref={grupo}>{children}</group>;
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
      dpr={[1, 1.5]}
      camera={{ position: VIEWS.front, fov: 32, near: 1, far: 1000 }}
      gl={{
        antialias: false,
        powerPreference: "low-power",
        failIfMajorPerformanceCaveat: false,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      onCreated={({ gl }) => {
        glRef.current = gl;
      }}
      onPointerMissed={() => onSelect(null)}
    >
      <ambientLight intensity={0.25} />
      <directionalLight position={[30, 60, 80]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004}>
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

      {/* Igual que el periodontograma standalone: sin escala ni giro, la cámara encuadra la boca. */}
      <MovimientoReposo quieto={selected != null}>
      <group rotation={[0.08, 0, 0]}>
        {showUpper && <Jaw jaw="upper" offset={open ? 6 : 0} estados={estados} modo={material} mat={preset} selected={selected} hovered={hovered} onSelect={onSelect} onHover={setHovered} />}
        {showLower && <Jaw jaw="lower" offset={open ? -6 : 0} estados={estados} modo={material} mat={preset} selected={selected} hovered={hovered} onSelect={onSelect} onHover={setHovered} />}
      </group>
      </MovimientoReposo>

      <ContactShadows position={[0, -30, 0]} opacity={0.35} scale={140} blur={2.8} far={40} color="#3a2a6a" />
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={35} maxDistance={180} rotateSpeed={0.7} zoomSpeed={0.8} />
      <CameraRig view={view} nonce={nonce} />
      <AjusteAncho />
    </Canvas>
  );
}
