import { useMemo } from "react";
import * as THREE from "three";
import { Tooth3D } from "./Tooth3D";

type Diente = {
  fdi: number;
  estado?: string;
};

type Props = {
  dientes?: Diente[];
  selectedFdi?: number;
  onSelect?: (fdi: number) => void;
};

const UPPER = [
  18, 17, 16, 15, 14, 13, 12, 11,
  21, 22, 23, 24, 25, 26, 27, 28,
];

const LOWER = [
  48, 47, 46, 45, 44, 43, 42, 41,
  31, 32, 33, 34, 35, 36, 37, 38,
];

function getToothPosition(index: number, total: number, upper: boolean) {
  const center = (total - 1) / 2;
  const normalized = (index - center) / center;

  const x = normalized * 3.05;

  const archDepth =
    0.45 -
    Math.pow(Math.abs(normalized), 1.7) * 1.18;

  const y = upper ? 0.72 : -0.72;

  return {
    position: [x, y, archDepth] as [number, number, number],
    rotation: [
      upper ? -0.05 : Math.PI + 0.05,
      normalized * 0.18,
      -normalized * 0.18,
    ] as [number, number, number],
  };
}

function buildArchPoints(upper: boolean) {
  const points: THREE.Vector3[] = [];

  for (let i = 0; i <= 32; i++) {
    const t = i / 32;
    const x = -3.25 + t * 6.5;
    const normalized = x / 3.25;

    const z =
      0.38 -
      Math.pow(Math.abs(normalized), 1.65) * 1.2;

    points.push(
      new THREE.Vector3(
        x,
        upper ? 0.48 : -0.48,
        z,
      ),
    );
  }

  return points;
}

export function DentalMouth3D({
  dientes = [],
  selectedFdi,
  onSelect,
}: Props) {
  const data = useMemo(() => {
    const map = new Map<number, Diente>();

    dientes.forEach((diente) => {
      map.set(diente.fdi, diente);
    });

    return map;
  }, [dientes]);

  const upperGum = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      buildArchPoints(true),
    );

    return new THREE.TubeGeometry(
      curve,
      64,
      0.30,
      16,
      false,
    );
  }, []);

  const lowerGum = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      buildArchPoints(false),
    );

    return new THREE.TubeGeometry(
      curve,
      64,
      0.30,
      16,
      false,
    );
  }, []);

  return (
    <group>
      {/* ENCÍA SUPERIOR */}
      <mesh
        geometry={upperGum}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color="#d96f8d"
          roughness={0.72}
        />
      </mesh>

      {/* ENCÍA INFERIOR */}
      <mesh
        geometry={lowerGum}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color="#cf6685"
          roughness={0.72}
        />
      </mesh>

      {/* PALADAR */}
      <mesh
        position={[0, 0.25, -0.72]}
        scale={[2.9, 0.34, 1.35]}
        rotation={[-0.15, 0, 0]}
        receiveShadow
      >
        <sphereGeometry args={[1, 40, 24]} />
        <meshStandardMaterial
          color="#e9a2b2"
          roughness={0.8}
        />
      </mesh>

      {/* LENGUA */}
      <mesh
        position={[0, -0.02, 0.18]}
        scale={[2.25, 0.34, 1.35]}
        rotation={[-0.08, 0, 0]}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[1, 48, 24]} />
        <meshStandardMaterial
          color="#d95f78"
          roughness={0.82}
        />
      </mesh>

      {/* PEQUEÑA PUNTA DE LA LENGUA */}
      <mesh
        position={[0, -0.02, 0.98]}
        scale={[1.65, 0.27, 0.72]}
        castShadow
      >
        <sphereGeometry args={[1, 32, 20]} />
        <meshStandardMaterial
          color="#e16d82"
          roughness={0.78}
        />
      </mesh>

      {/* DIENTES SUPERIORES */}
      {UPPER.map((fdi, index) => {
        const tooth = data.get(fdi);
        const layout = getToothPosition(
          index,
          UPPER.length,
          true,
        );

        return (
          <Tooth3D
            key={fdi}
            fdi={fdi}
            estado={tooth?.estado ?? "sano"}
            position={layout.position}
            rotation={layout.rotation}
            selected={selectedFdi === fdi}
            onSelect={onSelect}
          />
        );
      })}

      {/* DIENTES INFERIORES */}
      {LOWER.map((fdi, index) => {
        const tooth = data.get(fdi);
        const layout = getToothPosition(
          index,
          LOWER.length,
          false,
        );

        return (
          <Tooth3D
            key={fdi}
            fdi={fdi}
            estado={tooth?.estado ?? "sano"}
            position={layout.position}
            rotation={layout.rotation}
            selected={selectedFdi === fdi}
            onSelect={onSelect}
          />
        );
      })}
    </group>
  );
}