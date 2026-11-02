"use client";

import { DeliveryDepotParked } from "@/components/delivery-depot";
import type { DeliverySkateboard } from "@/lib/delivery";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  CanvasTexture,
  MeshLambertMaterial,
  OrthographicCamera,
  SRGBColorSpace,
  type Group,
} from "three";

type DeliveryMapWorldProps = {
  depotCouriers: DeliverySkateboard[];
  pendingCount: number;
  onOpenStore: () => void;
  onOpenHire: () => void;
};

function makeLabelTexture(label: string, background: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not draw map label");
  }
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = "#1c1917";
  ctx.font = "700 72px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 128, 68);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function fitOrthoCamera(
  camera: OrthographicCamera,
  width: number,
  height: number,
) {
  camera.position.set(10, 12, 10);
  camera.lookAt(0, 0.4, 0);
  camera.zoom = Math.min(width, height) / 15;
  camera.updateProjectionMatrix();
}

function FrameCamera() {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);

  useLayoutEffect(() => {
    if (camera instanceof OrthographicCamera) {
      fitOrthoCamera(camera, size.width, size.height);
    }
  }, [camera, size.height, size.width]);

  return null;
}

function VisibilityPause() {
  const setFrameloop = useThree((state) => state.setFrameloop);

  useEffect(() => {
    const onChange = () => {
      setFrameloop(document.hidden ? "never" : "always");
    };
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, [setFrameloop]);

  return null;
}

function Ground() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[24, 24]} />
        <meshLambertMaterial color="#6b9b5a" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 3.4]}>
        <planeGeometry args={[24, 2.4]} />
        <meshLambertMaterial color="#a8a29e" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 3.4]}>
        <planeGeometry args={[7, 0.12]} />
        <meshLambertMaterial color="#f97316" />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[7.2, 0.16, 5.2]} />
        <meshLambertMaterial color="#115e59" />
      </mesh>
      {[-1.6, 0, 1.6].map((x) => (
        <mesh key={x} position={[x, 0.21, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.12, 3.2]} />
          <meshLambertMaterial color="#5eead4" />
        </mesh>
      ))}
      <mesh position={[0, 0.205, -2.35]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.4, 0.35]} />
        <meshLambertMaterial color="#2dd4bf" />
      </mesh>
    </group>
  );
}

function Fence() {
  const posts = [-3.1, -1.55, 0, 1.55, 3.1];
  return (
    <group position={[-4.2, 0, 0]}>
      {posts.map((z) => (
        <mesh key={z} position={[0, 0.38, z]}>
          <boxGeometry args={[0.12, 0.76, 0.12]} />
          <meshLambertMaterial color="#44403c" />
        </mesh>
      ))}
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[0.08, 0.08, 6.4]} />
        <meshLambertMaterial color="#57534e" />
      </mesh>
      <mesh position={[0, 0.24, 0]}>
        <boxGeometry args={[0.08, 0.08, 6.4]} />
        <meshLambertMaterial color="#57534e" />
      </mesh>
    </group>
  );
}

function Crates({ count }: { count: number }) {
  const stack = Math.min(count, 8);
  if (stack === 0) return null;
  const offsets = [
    [0, 0],
    [0.55, 0.35],
    [-0.5, 0.4],
    [0.3, -0.45],
    [0.85, -0.2],
    [-0.35, -0.35],
    [0.65, 0.75],
    [-0.7, 0.15],
  ];

  return (
    <group position={[-3.8, 0, 0.5]}>
      {offsets.slice(0, stack).map(([x, z], index) => (
        <mesh
          key={index}
          position={[x, 0.22 + (index % 3) * 0.18, z]}
        >
          <boxGeometry args={[0.48, 0.48, 0.48]} />
          <meshLambertMaterial
            color={index % 2 === 0 ? "#c2410c" : "#0f766e"}
          />
        </mesh>
      ))}
    </group>
  );
}

function StoreBuilding({ onOpen }: { onOpen: () => void }) {
  const group = useRef<Group>(null);
  const sign = useRef<Group>(null);
  const vane = useRef<Group>(null);
  const windowMat = useRef<MeshLambertMaterial>(null);
  const scale = useRef(1);
  const [hovered, setHovered] = useState(false);
  const texture = useMemo(() => makeLabelTexture("STORE", "#fdba74"), []);

  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    if (sign.current) {
      sign.current.position.y = 1.72 + Math.sin(t * 2) * 0.06;
    }
    if (vane.current) {
      vane.current.rotation.y = t * 0.7;
    }
    if (windowMat.current) {
      windowMat.current.emissiveIntensity = 0.35 + Math.sin(t * 3) * 0.3;
    }
    const target = hovered ? 1.06 : 1;
    scale.current += (target - scale.current) * Math.min(1, delta * 8);
    group.current?.scale.setScalar(scale.current);
  });

  return (
    <group
      ref={group}
      position={[0.8, 0, -4.6]}
      rotation={[0, Math.PI / 4, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onOpen();
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
    >
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[1.7, 1.4, 1.5]} />
        <meshLambertMaterial color="#ea580c" />
      </mesh>
      <mesh position={[0, 1.52, 0]}>
        <boxGeometry args={[1.95, 0.28, 1.75]} />
        <meshLambertMaterial color="#9a3412" />
      </mesh>
      <mesh position={[0, 0.42, 0.76]}>
        <boxGeometry args={[0.46, 0.72, 0.06]} />
        <meshLambertMaterial color="#44403c" />
      </mesh>
      <mesh position={[0.42, 0.78, 0.76]}>
        <planeGeometry args={[0.42, 0.36]} />
        <meshLambertMaterial
          ref={windowMat}
          color="#ffedd5"
          emissive="#fb923c"
          emissiveIntensity={0.4}
        />
      </mesh>
      <group ref={sign} position={[0, 1.72, 0.9]}>
        <mesh>
          <planeGeometry args={[1.15, 0.42]} />
          <meshLambertMaterial map={texture} toneMapped={false} />
        </mesh>
      </group>
      <group ref={vane} position={[0.55, 1.7, -0.2]}>
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.36, 6]} />
          <meshLambertMaterial color="#e7e5e4" />
        </mesh>
        <mesh position={[0.16, 0.34, 0]}>
          <boxGeometry args={[0.32, 0.05, 0.08]} />
          <meshLambertMaterial color="#2dd4bf" />
        </mesh>
      </group>
    </group>
  );
}

function HireKiosk({ onOpen }: { onOpen: () => void }) {
  const group = useRef<Group>(null);
  const sign = useRef<Group>(null);
  const scale = useRef(1);
  const [hovered, setHovered] = useState(false);
  const texture = useMemo(() => makeLabelTexture("HIRE", "#5eead4"), []);

  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(({ clock }, delta) => {
    if (sign.current) {
      sign.current.position.y = 1.15 + Math.sin(clock.elapsedTime * 2.2) * 0.05;
    }
    const target = hovered ? 1.06 : 1;
    scale.current += (target - scale.current) * Math.min(1, delta * 8);
    group.current?.scale.setScalar(scale.current);
  });

  return (
    <group
      ref={group}
      position={[-1.4, 0, 4.15]}
      rotation={[0, Math.PI / 4, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onOpen();
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
    >
      <mesh position={[0, 0.38, 0]}>
        <boxGeometry args={[1.15, 0.76, 0.9]} />
        <meshLambertMaterial color="#0f766e" />
      </mesh>
      <mesh position={[0, 0.86, 0]}>
        <boxGeometry args={[1.35, 0.12, 1.1]} />
        <meshLambertMaterial color="#115e59" />
      </mesh>
      <group ref={sign} position={[0, 1.15, 0.5]}>
        <mesh>
          <planeGeometry args={[0.9, 0.36]} />
          <meshLambertMaterial map={texture} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

export function DeliveryMapWorld({
  depotCouriers,
  pendingCount,
  onOpenStore,
  onOpenHire,
}: DeliveryMapWorldProps) {
  return (
    <Canvas
      className="absolute inset-0"
      orthographic
      camera={{ position: [10, 12, 10], zoom: 40, near: 0.1, far: 80 }}
      dpr={[1, 1.5]}
      frameloop="always"
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      }}
    >
      <color attach="background" args={["#87ceeb"]} />
      <FrameCamera />
      <VisibilityPause />
      <ambientLight intensity={1.15} />
      <directionalLight position={[10, 18, 8]} intensity={1.55} />
      <Ground />
      <DeliveryDepotParked couriers={depotCouriers} />
      <Fence />
      <Crates count={pendingCount} />
      <StoreBuilding onOpen={onOpenStore} />
      <HireKiosk onOpen={onOpenHire} />
    </Canvas>
  );
}

export default DeliveryMapWorld;
