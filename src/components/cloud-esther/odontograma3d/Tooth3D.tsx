import * as THREE from "three";
import { useMemo } from "react";
import { ThreeEvent } from "@react-three/fiber";

export type Tooth3DProps = {
  fdi: number;
  estado?: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  selected?: boolean;
  onSelect?: (fdi: number) => void;
};

const ESTADO_COLOR: Record<string, string> = {
  sano: "#fffaf0",
  tratado: "#dbeafe",
  caries: "#e9a46a",
  ausente: "#000000",
  endodoncia: "#d8b4fe",
  corona: "#f5d76e",
};

function getToothShape(fdi: number) {
  const n = fdi % 10;

  if (n === 1 || n === 2) {
    return {
      width: 0.34,
      height: 0.72,
      depth: 0.25,
      cusp: 0.08,
    };
  }

  if (n === 3) {
    return {
      width: 0.38,
      height: 0.76,
      depth: 0.29,
      cusp: 0.16,
    };
  }

  if (n === 4 || n === 5) {
    return {
      width: 0.43,
      height: 0.66,
      depth: 0.34,
      cusp: 0.14,
    };
  }

  return {
    width: 0.54,
    height: 0.68,
    depth: 0.42,
    cusp: 0.18,
  };
}

export function Tooth3D({
  fdi,
  estado = "sano",
  position,
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  selected = false,
  onSelect,
}: Tooth3DProps) {
  const shape = getToothShape(fdi);

  const geometry = useMemo(() => {
    const points: THREE.Vector2[] = [
      new THREE.Vector2(0, -shape.height / 2),
      new THREE.Vector2(shape.width * 0.34, -shape.height / 2),
      new THREE.Vector2(shape.width / 2, -shape.height * 0.28),
      new THREE.Vector2(shape.width * 0.48, shape.height * 0.24),
      new THREE.Vector2(shape.width * 0.34, shape.height * 0.46),
      new THREE.Vector2(0, shape.height / 2),
      new THREE.Vector2(-shape.width * 0.34, shape.height * 0.46),
      new THREE.Vector2(-shape.width * 0.48, shape.height * 0.24),
      new THREE.Vector2(-shape.width / 2, -shape.height * 0.28),
      new THREE.Vector2(-shape.width * 0.34, -shape.height / 2),
    ];

    const geometry = new THREE.LatheGeometry(
      points.map((point) => new THREE.Vector2(
        Math.max(0.025, point.x + shape.width * 0.22),
        point.y,
      )),
      12,
    );

    geometry.computeVertexNormals();

    return geometry;
  }, [shape]);

  if (estado === "ausente") {
    return (
      <group position={position} rotation={rotation} scale={scale}>
        <mesh
          onClick={(event: ThreeEvent<MouseEvent>) => {
            event.stopPropagation();
            onSelect?.(fdi);
          }}
        >
          <torusGeometry args={[0.23, 0.035, 8, 24]} />
          <meshStandardMaterial
            color="#ef4444"
            transparent
            opacity={0.75}
            roughness={0.5}
          />
        </mesh>
      </group>
    );
  }

  const color = ESTADO_COLOR[estado] ?? ESTADO_COLOR.sano;

  return (
    <group
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        onSelect?.(fdi);
      }}
    >
      {selected && (
        <mesh scale={[1.18, 1.12, 1.18]}>
          <sphereGeometry args={[0.34, 20, 20]} />
          <meshBasicMaterial
            color="#8b5cf6"
            transparent
            opacity={0.24}
          />
        </mesh>
      )}

      <mesh
        geometry={geometry}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={color}
          roughness={0.24}
          metalness={0.02}
        />
      </mesh>

      <mesh position={[0, shape.height * 0.34, 0]} scale={[1, 0.55, 1]}>
        <sphereGeometry args={[shape.cusp, 12, 8]} />
        <meshStandardMaterial
          color={color}
          roughness={0.22}
        />
      </mesh>

      {estado === "caries" && (
        <mesh position={[0, 0.12, shape.depth * 0.65]}>
          <sphereGeometry args={[0.075, 12, 8]} />
          <meshStandardMaterial
            color="#7c2d12"
            roughness={0.7}
          />
        </mesh>
      )}

      {estado === "corona" && (
        <mesh scale={[1.06, 1.02, 1.06]}>
          <torusGeometry
            args={[
              Math.max(shape.width * 0.32, 0.12),
              0.018,
              8,
              20,
            ]}
          />
          <meshStandardMaterial
            color="#d4af37"
            metalness={0.7}
            roughness={0.2}
          />
        </mesh>
      )}
    </group>
  );
}