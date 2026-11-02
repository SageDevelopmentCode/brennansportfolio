"use client";

import { getHandPose, NEUTRAL_POSE, type FingerPose, type HandPose } from "@/lib/asl/hand-poses";
import { ContactShadows } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const SKIN_COLOR = "#e0a882";
const NAIL_COLOR = "#f4d0c4";
const HAND_SCALE = 0.72;

type FingerName = keyof Pick<HandPose, "thumb" | "index" | "middle" | "ring" | "pinky">;

const FINGERS: {
  id: Exclude<FingerName, "thumb">;
  position: [number, number, number];
  length: number;
  thickness: number;
}[] = [
  { id: "index", position: [-0.26, 0.5, 0.04], length: 0.62, thickness: 0.078 },
  { id: "middle", position: [-0.08, 0.56, 0.05], length: 0.72, thickness: 0.084 },
  { id: "ring", position: [0.1, 0.52, 0.04], length: 0.66, thickness: 0.076 },
  { id: "pinky", position: [0.28, 0.42, 0.02], length: 0.5, thickness: 0.062 },
];

function lerpFinger(a: FingerPose, b: FingerPose, t: number): FingerPose {
  return {
    mcp: THREE.MathUtils.lerp(a.mcp, b.mcp, t),
    pip: THREE.MathUtils.lerp(a.pip, b.pip, t),
    dip: THREE.MathUtils.lerp(a.dip, b.dip, t),
    spread: THREE.MathUtils.lerp(a.spread, b.spread, t),
  };
}

function lerpHand(from: HandPose, to: HandPose, t: number): HandPose {
  return {
    wrist: {
      x: THREE.MathUtils.lerp(from.wrist.x, to.wrist.x, t),
      y: THREE.MathUtils.lerp(from.wrist.y, to.wrist.y, t),
      z: THREE.MathUtils.lerp(from.wrist.z, to.wrist.z, t),
    },
    thumb: lerpFinger(from.thumb, to.thumb, t),
    index: lerpFinger(from.index, to.index, t),
    middle: lerpFinger(from.middle, to.middle, t),
    ring: lerpFinger(from.ring, to.ring, t),
    pinky: lerpFinger(from.pinky, to.pinky, t),
  };
}

function useHandMaterials() {
  const skin = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: SKIN_COLOR,
        roughness: 0.58,
        metalness: 0,
        sheen: 0.42,
        sheenColor: new THREE.Color("#ffd0b4"),
        sheenRoughness: 0.48,
        clearcoat: 0.06,
        clearcoatRoughness: 0.55,
      }),
    [],
  );
  const nail = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: NAIL_COLOR,
        roughness: 0.26,
        metalness: 0,
        clearcoat: 0.7,
        clearcoatRoughness: 0.18,
      }),
    [],
  );

  useEffect(() => {
    return () => {
      skin.dispose();
      nail.dispose();
    };
  }, [skin, nail]);

  return { skin, nail };
}

function Palm({ skin }: { skin: THREE.Material }) {
  return (
    <group>
      <mesh position={[0.02, 0.06, 0]} scale={[0.48, 0.58, 0.2]} castShadow receiveShadow material={skin}>
        <sphereGeometry args={[1, 40, 28]} />
      </mesh>
      <mesh position={[-0.3, -0.2, 0.08]} scale={[0.24, 0.3, 0.16]} castShadow receiveShadow material={skin}>
        <sphereGeometry args={[1, 28, 20]} />
      </mesh>
      <mesh position={[0.32, -0.16, 0.03]} scale={[0.16, 0.34, 0.14]} castShadow receiveShadow material={skin}>
        <sphereGeometry args={[1, 24, 18]} />
      </mesh>
      <mesh position={[0, 0.5, 0.02]} scale={[0.44, 0.12, 0.14]} castShadow receiveShadow material={skin}>
        <sphereGeometry args={[1, 24, 16]} />
      </mesh>
      <mesh position={[-0.16, 0.46, 0.06]} scale={[0.07, 0.05, 0.05]} castShadow material={skin}>
        <sphereGeometry args={[1, 12, 10]} />
      </mesh>
      <mesh position={[0.02, 0.46, 0.06]} scale={[0.07, 0.05, 0.05]} castShadow material={skin}>
        <sphereGeometry args={[1, 12, 10]} />
      </mesh>
      <mesh position={[0.18, 0.44, 0.05]} scale={[0.06, 0.045, 0.045]} castShadow material={skin}>
        <sphereGeometry args={[1, 12, 10]} />
      </mesh>
      <mesh position={[0, -0.58, 0.01]} scale={[0.3, 0.2, 0.18]} castShadow receiveShadow material={skin}>
        <sphereGeometry args={[1, 28, 20]} />
      </mesh>
      <mesh position={[0, -1.02, 0]} scale={[0.24, 0.42, 0.2]} castShadow receiveShadow material={skin}>
        <capsuleGeometry args={[1, 1, 8, 18]} />
      </mesh>
    </group>
  );
}

type FingerRigProps = {
  poseRef: React.RefObject<HandPose>;
  finger: FingerName;
  position: [number, number, number];
  thickness: number;
  length: number;
  skin: THREE.Material;
  nail: THREE.Material;
};

function FingerRig({ poseRef, finger, position, thickness, length, skin, nail }: FingerRigProps) {
  const spreadRef = useRef<THREE.Group>(null);
  const mcpRef = useRef<THREE.Group>(null);
  const pipRef = useRef<THREE.Group>(null);
  const dipRef = useRef<THREE.Group>(null);

  const r1 = thickness / 2;
  const r2 = r1 * 0.86;
  const r3 = r1 * 0.72;
  const len1 = length * 0.42;
  const len2 = length * 0.3;
  const len3 = length * 0.22;
  const yPip = len1 + r1 * 0.95;
  const yDip = len2 + r2 * 0.95;

  useFrame(() => {
    const pose = poseRef.current?.[finger];
    if (!pose) return;
    if (spreadRef.current) spreadRef.current.rotation.z = pose.spread;
    if (mcpRef.current) mcpRef.current.rotation.x = pose.mcp;
    if (pipRef.current) pipRef.current.rotation.x = pose.pip;
    if (dipRef.current) dipRef.current.rotation.x = pose.dip;
  });

  return (
    <group position={position}>
      <group ref={spreadRef}>
        <group ref={mcpRef}>
          <mesh castShadow material={skin}>
            <sphereGeometry args={[r1 * 1.15, 16, 12]} />
          </mesh>
          <mesh position={[0, len1 / 2 + r1 * 0.08, 0]} castShadow material={skin}>
            <capsuleGeometry args={[r1, len1, 8, 16]} />
          </mesh>
          <group ref={pipRef} position={[0, yPip, 0]}>
            <mesh castShadow material={skin}>
              <sphereGeometry args={[r2 * 1.12, 14, 10]} />
            </mesh>
            <mesh position={[0, len2 / 2 + r2 * 0.06, 0]} castShadow material={skin}>
              <capsuleGeometry args={[r2, len2, 6, 14]} />
            </mesh>
            <group ref={dipRef} position={[0, yDip, 0]}>
              <mesh castShadow material={skin}>
                <sphereGeometry args={[r3 * 1.08, 12, 10]} />
              </mesh>
              <mesh position={[0, len3 / 2, 0]} castShadow material={skin}>
                <capsuleGeometry args={[r3, len3, 6, 14]} />
              </mesh>
              <mesh
                position={[0, len3 * 0.82, -r3 * 0.55]}
                rotation={[0.45, 0, 0]}
                scale={[r3 * 1.25, len3 * 0.38, r3 * 0.18]}
                material={nail}
              >
                <sphereGeometry args={[1, 12, 8]} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

function Thumb({
  poseRef,
  skin,
  nail,
}: {
  poseRef: React.RefObject<HandPose>;
  skin: THREE.Material;
  nail: THREE.Material;
}) {
  return (
    <group position={[-0.5, -0.06, 0.08]} rotation={[0.55, -0.25, 1.15]}>
      <mesh position={[0, 0.1, 0]} castShadow material={skin}>
        <capsuleGeometry args={[0.07, 0.16, 6, 14]} />
      </mesh>
      <mesh position={[0, 0.02, 0]} castShadow material={skin}>
        <sphereGeometry args={[0.09, 16, 12]} />
      </mesh>
      <FingerRig
        poseRef={poseRef}
        finger="thumb"
        position={[0, 0.24, 0]}
        thickness={0.092}
        length={0.42}
        skin={skin}
        nail={nail}
      />
    </group>
  );
}

function AnimatedHand({ poseId }: { poseId: string }) {
  const { skin, nail } = useHandMaterials();
  const poseRef = useRef<HandPose>({ ...NEUTRAL_POSE });
  const wristRef = useRef<THREE.Group>(null);
  const reducedMotion = useRef(false);
  const anim = useRef({
    from: NEUTRAL_POSE,
    to: NEUTRAL_POSE,
    t: 1,
  });

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      reducedMotion.current = media.matches;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    anim.current = {
      from: { ...poseRef.current },
      to: getHandPose(poseId),
      t: 0,
    };
  }, [poseId]);

  useFrame((state, delta) => {
    const blend = anim.current;
    if (blend.t < 1) {
      blend.t = Math.min(1, blend.t + delta * 7);
      const eased = 1 - (1 - blend.t) ** 3;
      poseRef.current = lerpHand(blend.from, blend.to, eased);
    } else {
      poseRef.current = blend.to;
    }

    const wrist = poseRef.current.wrist;
    if (!wristRef.current) return;

    let x = wrist.x;
    let y = wrist.y;
    let z = wrist.z;
    if (!reducedMotion.current && blend.t >= 1) {
      const time = state.clock.elapsedTime;
      x += Math.sin(time * 0.7) * 0.015;
      y += Math.sin(time * 0.45) * 0.02;
      z += Math.cos(time * 0.55) * 0.012;
    }
    wristRef.current.rotation.set(x, y, z);
  });

  return (
    <group ref={wristRef}>
      <Palm skin={skin} />
      {FINGERS.map((finger) => (
        <FingerRig
          key={finger.id}
          poseRef={poseRef}
          finger={finger.id}
          position={finger.position}
          thickness={finger.thickness}
          length={finger.length}
          skin={skin}
          nail={nail}
        />
      ))}
      <Thumb poseRef={poseRef} skin={skin} nail={nail} />
    </group>
  );
}

function SceneContent({ poseId }: { poseId: string }) {
  return (
    <>
      <color attach="background" args={["#020617"]} />
      <ambientLight intensity={0.28} />
      <hemisphereLight args={["#dbe7ff", "#3a2a22", 0.38]} />
      <directionalLight
        position={[1.8, 2.6, 2.4]}
        intensity={1.15}
        color="#fff1e0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-2.4, 0.8, 1.6]} intensity={0.38} color="#c7d7ff" />
      <directionalLight position={[0.2, 1.6, -2.6]} intensity={0.72} color="#ffe8d0" />
      <group position={[0.05, 0.08, 0]} rotation={[0.12, -0.42, 0]} scale={HAND_SCALE}>
        <AnimatedHand poseId={poseId} />
      </group>
      <ContactShadows position={[0, -1.05, 0]} opacity={0.4} scale={3.2} blur={2.4} far={2.4} />
    </>
  );
}

export type SignHandSceneProps = {
  poseId: string;
  className?: string;
};

export default function SignHandScene({ poseId, className }: SignHandSceneProps) {
  return (
    <div className={className}>
      <Canvas
        shadows
        camera={{ position: [0.62, 0.22, 4.15], fov: 34 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <SceneContent poseId={poseId} />
      </Canvas>
    </div>
  );
}
