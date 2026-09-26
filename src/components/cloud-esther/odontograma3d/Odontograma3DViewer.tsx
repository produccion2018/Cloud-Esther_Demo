import { Suspense, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  OrbitControls,
  PerspectiveCamera,
} from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { DentalMouth3D } from "./DentalMouth3D";

type Diente = {
  fdi: number;
  estado?: string;
};

type Props = {
  dientes?: Diente[];
  selectedFdi?: number;
  onSelect?: (fdi: number) => void;
};

export function Odontograma3DViewer({
  dientes = [],
  selectedFdi = 16,
  onSelect,
}: Props) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  return (
    <div className="relative h-full min-h-[680px] w-full overflow-hidden rounded-2xl bg-[#110d2b]">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: false,
        }}
      >
        <PerspectiveCamera
          makeDefault
          position={[0, 0.1, 9.5]}
          fov={38}
        />

        <color
          attach="background"
          args={["#110d2b"]}
        />

        {/* LUZ GENERAL */}
        <ambientLight intensity={1.6} />

        {/* LUZ PRINCIPAL */}
        <directionalLight
          position={[4, 7, 7]}
          intensity={3.4}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />

        {/* LUZ LATERAL */}
        <directionalLight
          position={[-5, 2, 4]}
          intensity={2}
        />

        {/* LUZ FRONTAL */}
        <pointLight
          position={[0, 1, 6]}
          intensity={2.5}
          distance={15}
        />

        <Suspense fallback={null}>
          <DentalMouth3D
            dientes={dientes}
            selectedFdi={selectedFdi}
            onSelect={onSelect}
          />

          <Environment preset="studio" />

          <ContactShadows
            position={[0, -1.7, 0]}
            opacity={0.28}
            scale={10}
            blur={2.8}
            far={5}
          />
        </Suspense>

        <OrbitControls
          ref={controlsRef}
          enablePan
          enableZoom
          enableRotate
          dampingFactor={0.08}
          minDistance={6}
          maxDistance={14}
          minPolarAngle={Math.PI * 0.22}
          maxPolarAngle={Math.PI * 0.78}
          target={[0, 0, -0.15]}
          enableDamping
        />
      </Canvas>

      {selectedFdi && (
        <div className="absolute left-5 top-5 rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-white shadow-xl backdrop-blur-md">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-300">
            Pieza seleccionada
          </div>

          <div className="mt-0.5 text-2xl font-bold">
            {selectedFdi}
          </div>
        </div>
      )}

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/45 px-5 py-2 text-xs text-white/80 backdrop-blur-md">
        Arrastrá para rotar · rueda para zoom · clic en un diente
      </div>
    </div>
  );
}