import { useEffect, useRef, useState } from "react";
import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export type CameraView = "anterior" | "oclusal" | "derecha" | "izquierda";

export const CAMERA_VIEWS: Record<CameraView, { label: string; position: [number, number, number]; target: [number, number, number] }> = {
  // +x is the patient's left, so the patient's right side is viewed from -x.
  anterior: { label: "Anterior", position: [0, 0.6, 17.5], target: [0, 0, 0] },
  oclusal: { label: "Oclusal", position: [0, 12.5, 10], target: [0, -0.2, 0.4] },
  derecha: { label: "Derecha", position: [-17.5, 2.5, 8.5], target: [0, 0, 0.5] },
  izquierda: { label: "Izquierda", position: [17.5, 2.5, 8.5], target: [0, 0, 0.5] },
};

/** Zoom pedido desde los botones (+ / −): factor de distancia y un id para repetirlo. */
export type ZoomPedido = { factor: number; id: number };

const MIN_DIST = 5.5;
const MAX_DIST = 30;

export function CameraRig({
  view,
  nonce,
  zoom,
  enabled = true,
}: {
  view: CameraView;
  nonce: number;
  zoom?: ZoomPedido | undefined;
  /** false mientras los dedos se usan para abrir o cerrar la boca. */
  enabled?: boolean;
}) {
  const controls = useRef<any>(null);
  const desired = useRef(new THREE.Vector3());
  const desiredTarget = useRef(new THREE.Vector3());
  const animating = useRef(false);
  // Gira sola hasta que la persona toca o arrastra el modelo por primera vez.
  const [autoGiro, setAutoGiro] = useState(true);
  const { size, camera } = useThree();
  // En pantallas angostas (celular vertical) la cámara se aleja para que entre toda la boca.
  const aspecto = size.width / Math.max(1, size.height);
  const alejar = Math.min(2.2, Math.max(1, 1.08 / aspecto));

  useEffect(() => {
    const v = CAMERA_VIEWS[view];
    desiredTarget.current.set(...v.target);
    desired.current
      .set(...v.position)
      .sub(desiredTarget.current)
      .multiplyScalar(alejar)
      .add(desiredTarget.current);
    animating.current = true;
  }, [view, nonce, alejar]);

  useEffect(() => {
    if (!zoom || !controls.current) return;
    const target: THREE.Vector3 = controls.current.target;
    const dir = camera.position.clone().sub(target);
    const dist = THREE.MathUtils.clamp(dir.length() * zoom.factor, MIN_DIST, MAX_DIST * alejar);
    desiredTarget.current.copy(target);
    desired.current.copy(target).add(dir.setLength(dist));
    animating.current = true;
    setAutoGiro(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom?.id]);

  useFrame(({ camera }, delta) => {
    if (!animating.current || !controls.current) return;
    const k = 1 - Math.exp(-6 * delta);
    camera.position.lerp(desired.current, k);
    controls.current.target.lerp(desiredTarget.current, k);
    controls.current.update();
    if (camera.position.distanceTo(desired.current) < 0.02) animating.current = false;
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enabled={enabled}
      enablePan
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.9}
      zoomSpeed={0.9}
      minDistance={MIN_DIST}
      maxDistance={MAX_DIST * alejar}
      // Táctil: un dedo rota, dos dedos pellizcan para zoom y arrastran para mover.
      touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
      autoRotate={autoGiro}
      autoRotateSpeed={0.4}
      onStart={() => {
        animating.current = false;
        setAutoGiro(false);
      }}
    />
  );
}
