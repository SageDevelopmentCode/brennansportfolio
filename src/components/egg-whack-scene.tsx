"use client";

import {
  getScrollSpeed,
  laneToX,
  LANE_WIDTH,
  type Banana,
  type EggGameState,
  type Obstacle,
} from "@/lib/eggs";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { Group, Mesh, MeshStandardMaterial, PerspectiveCamera } from "three";

export type EggWhackFxRef = {
  collectAt: number;
  hurtAt: number;
};

export type EggWhackSceneProps = {
  gameState: EggGameState | null;
  gameStateRef: React.RefObject<EggGameState | null>;
  clockRef: React.RefObject<number>;
  fxRef: React.RefObject<EggWhackFxRef>;
};

function VisibilityPause() {
  const setFrameloop = useThree((s) => s.setFrameloop);
  useEffect(() => {
    const onChange = () => {
      setFrameloop(document.hidden ? "never" : "always");
    };
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, [setFrameloop]);
  return null;
}

function ChaseCamera({ gameStateRef }: { gameStateRef: React.RefObject<EggGameState | null> }) {
  useFrame((state) => {
    const elapsed = gameStateRef.current?.elapsed ?? 0;
    const t = state.clock.elapsedTime;
    const bob = Math.sin(t * 8) * 0.04;
    const fovPulse = Math.sin(elapsed * 0.35) * 0.6;
    const cam = state.camera as PerspectiveCamera;
    cam.fov = 54 + fovPulse;
    cam.updateProjectionMatrix();
    state.camera.position.set(0, 2.5 + bob, 5.1);
    state.camera.lookAt(0, 1.1 + bob * 0.3, -8);
  });
  return null;
}

function LaneGuides() {
  return (
    <group position={[0, 0.02, -2]}>
      {([-1, 0, 1] as const).map((lane) => (
        <mesh
          key={lane}
          position={[laneToX(lane), 0, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[LANE_WIDTH * 0.88, 14]} />
          <meshStandardMaterial
            color="#84cc16"
            transparent
            opacity={0.06}
            emissive="#65a30d"
            emissiveIntensity={0.12}
          />
        </mesh>
      ))}
    </group>
  );
}

function ScrollingJungle({
  gameStateRef,
}: {
  gameStateRef: React.RefObject<EggGameState | null>;
}) {
  const trackRef = useRef<Group>(null);
  const segmentCount = 14;

  useFrame(() => {
    const elapsed = gameStateRef.current?.elapsed ?? 0;
    const speed = getScrollSpeed(elapsed);
    const track = trackRef.current;
    if (track) {
      track.position.z = (elapsed * speed * 0.15) % 6;
    }
  });

  return (
    <group>
      <hemisphereLight args={["#bbf7d0", "#14532d", 0.65]} />
      <directionalLight position={[4, 12, 6]} intensity={1.15} castShadow={false} />
      <pointLight position={[-3, 4, -10]} intensity={6} color="#fef08a" distance={28} />

      <group ref={trackRef}>
        {Array.from({ length: segmentCount }, (_, i) => {
          const z = -i * 6;
          return (
            <group key={i} position={[0, 0, z]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[7.8, 6.2]} />
                <meshStandardMaterial
                  color={i % 2 === 0 ? "#a16207" : "#92400e"}
                  roughness={0.85}
                />
              </mesh>
              {[-3.6, 3.6].map((x) => (
                <group key={x} position={[x, 0, -1]}>
                  <mesh position={[0, 1.2, 0]}>
                    <cylinderGeometry args={[0.35, 0.45, 2.4, 8]} />
                    <meshStandardMaterial color="#3f6212" roughness={0.9} />
                  </mesh>
                  <mesh position={[0.35, 2.5, 0.2]}>
                    <sphereGeometry args={[0.9, 8, 8]} />
                    <meshStandardMaterial color="#15803d" roughness={0.8} />
                  </mesh>
                  <mesh position={[-0.4, 2.8, -0.3]}>
                    <sphereGeometry args={[0.7, 8, 8]} />
                    <meshStandardMaterial color="#16a34a" roughness={0.8} />
                  </mesh>
                </group>
              ))}
            </group>
          );
        })}
      </group>

      <mesh position={[0, 1.5, -78]}>
        <planeGeometry args={[12, 8]} />
        <meshStandardMaterial color="#166534" />
      </mesh>
    </group>
  );
}

function depthScale(z: number): number {
  const t = Math.max(0, Math.min(1, (z + 48) / 50));
  return 0.35 + t * 0.75;
}

function BananaMesh({ banana }: { banana: Banana }) {
  const groupRef = useRef<Group>(null);

  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;
    const scale = depthScale(banana.z);
    const pulse =
      banana.kind === "golden"
        ? 1 + Math.sin(state.clock.elapsedTime * 12) * 0.08
        : 1;
    g.position.set(laneToX(banana.lane), 0.42 + scale * 0.12, banana.z);
    g.scale.setScalar(0.32 * scale * pulse);
    g.rotation.y = state.clock.elapsedTime * 2;
  });

  const yellow = banana.kind === "golden" ? "#fde047" : "#facc15";

  return (
    <group ref={groupRef}>
      <mesh rotation={[0, 0, 0.4]}>
        <capsuleGeometry args={[0.22, 0.55, 4, 10]} />
        <meshStandardMaterial
          color={yellow}
          emissive={banana.kind === "golden" ? "#ca8a04" : "#000000"}
          emissiveIntensity={banana.kind === "golden" ? 0.35 : 0}
        />
      </mesh>
    </group>
  );
}

function ObstacleMesh({ obstacle }: { obstacle: Obstacle }) {
  const groupRef = useRef<Group>(null);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const s = depthScale(obstacle.z);
    g.position.set(laneToX(obstacle.lane), 0, obstacle.z);
    g.scale.setScalar(s);
  });

  if (obstacle.kind === "lane") {
    return (
      <group ref={groupRef}>
        <mesh position={[0, 0.55, 0]} rotation={[0, 0.15, 0]}>
          <boxGeometry args={[1.1, 0.5, 0.45]} />
          <meshStandardMaterial color="#57534e" roughness={0.85} />
        </mesh>
        <mesh position={[0.15, 0.35, 0.2]}>
          <cylinderGeometry args={[0.08, 0.1, 0.35, 6]} />
          <meshStandardMaterial color="#44403c" />
        </mesh>
      </group>
    );
  }

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.35, 0.42, 0.55, 10]} />
        <meshStandardMaterial color="#78350f" roughness={0.9} />
      </mesh>
    </group>
  );
}

function PlayerApe({
  gameStateRef,
  clockRef,
  fxRef,
}: Pick<EggWhackSceneProps, "gameStateRef" | "clockRef" | "fxRef">) {
  const groupRef = useRef<Group>(null);
  const displayX = useRef(0);

  useFrame((state, dt) => {
    const gs = gameStateRef.current;
    const group = groupRef.current;
    if (!gs || !group) return;

    const targetX = laneToX(gs.playerLane);
    displayX.current += (targetX - displayX.current) * Math.min(1, dt * 16);
    group.position.set(displayX.current, gs.playerY, 0);

    const onGround = gs.playerY < 0.05;
    const runBob = onGround ? Math.sin(state.clock.elapsedTime * 14) * 0.04 : 0;
    group.position.y = gs.playerY + runBob;

    const hurtAge = clockRef.current - fxRef.current.hurtAt;
    if (hurtAge < 400) {
      group.rotation.z = Math.sin(hurtAge * 0.08) * 0.12;
    } else {
      group.rotation.z = 0;
    }

    const squash = onGround ? 1 : 1 + gs.playerVy * 0.02;
    group.scale.set(1, Math.max(0.85, squash), 1);
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.55, 0]} scale={[1.1, 0.65, 0.75]}>
        <boxGeometry args={[0.9, 1, 0.55]} />
        <meshStandardMaterial color="#5c4033" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.45, 0.32]} scale={[0.85, 0.5, 0.35]}>
        <sphereGeometry args={[0.35, 10, 10]} />
        <meshStandardMaterial color="#78716c" />
      </mesh>
      <mesh position={[0, 1.15, 0]} scale={[1.05, 1, 1]}>
        <sphereGeometry args={[0.38, 12, 12]} />
        <meshStandardMaterial color="#6b4f3a" roughness={0.8} />
      </mesh>
      <mesh position={[-0.32, 1.35, 0]} scale={[0.35, 0.35, 0.2]}>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshStandardMaterial color="#5c4033" />
      </mesh>
      <mesh position={[0.32, 1.35, 0]} scale={[0.35, 0.35, 0.2]}>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshStandardMaterial color="#5c4033" />
      </mesh>
      <mesh position={[0, 1.05, 0.32]} scale={[0.5, 0.25, 0.15]}>
        <sphereGeometry args={[0.4, 8, 8]} />
        <meshStandardMaterial color="#44403c" />
      </mesh>
      <mesh position={[0.55, 0.65, 0.15]} rotation={[0.3, 0, -0.4]}>
        <capsuleGeometry args={[0.1, 0.35, 4, 8]} />
        <meshStandardMaterial color="#5c4033" />
      </mesh>
    </group>
  );
}

function CollectRing({
  fxRef,
  gameStateRef,
  clockRef,
}: {
  fxRef: React.RefObject<EggWhackFxRef>;
  gameStateRef: React.RefObject<EggGameState | null>;
  clockRef: React.RefObject<number>;
}) {
  const meshRef = useRef<Mesh>(null);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const lane = gameStateRef.current?.playerLane ?? 0;
    mesh.position.x = laneToX(lane);
    const now = clockRef.current;
    const collectAge = now - fxRef.current.collectAt;
    const hurtAge = now - fxRef.current.hurtAt;
    let scale = 1;
    let opacity = 0.15;
    if (collectAge < 200) {
      scale = 1 + (1 - collectAge / 200) * 0.35;
      opacity = 0.3;
      (mesh.material as MeshStandardMaterial).color.set("#facc15");
    } else if (hurtAge < 350) {
      opacity = 0.45;
      (mesh.material as MeshStandardMaterial).color.set("#ef4444");
    } else {
      (mesh.material as MeshStandardMaterial).color.set("#84cc16");
    }
    mesh.scale.set(scale, scale, 1);
    (mesh.material as MeshStandardMaterial).opacity = opacity;
  });

  return (
    <mesh ref={meshRef} position={[0, 0.03, 0.35]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.5, 0.68, 32]} />
      <meshStandardMaterial
        color="#84cc16"
        transparent
        opacity={0.15}
        emissive="#65a30d"
        emissiveIntensity={0.35}
      />
    </mesh>
  );
}

function GameEntities(props: EggWhackSceneProps) {
  const state = props.gameState;
  if (!state) return null;

  return (
    <>
      {state.bananas.map((banana) => (
        <BananaMesh key={banana.id} banana={banana} />
      ))}
      {state.obstacles.map((obstacle) => (
        <ObstacleMesh key={obstacle.id} obstacle={obstacle} />
      ))}
      <PlayerApe
        gameStateRef={props.gameStateRef}
        clockRef={props.clockRef}
        fxRef={props.fxRef}
      />
    </>
  );
}

function SceneInner(props: EggWhackSceneProps) {
  return (
    <>
      <VisibilityPause />
      <ChaseCamera gameStateRef={props.gameStateRef} />
      <ScrollingJungle gameStateRef={props.gameStateRef} />
      <LaneGuides />
      <CollectRing
        fxRef={props.fxRef}
        gameStateRef={props.gameStateRef}
        clockRef={props.clockRef}
      />
      <GameEntities {...props} />
    </>
  );
}

export default function EggWhackScene(props: EggWhackSceneProps) {
  return (
    <Canvas
      className="absolute inset-0"
      camera={{ fov: 54, near: 0.1, far: 120, position: [0, 2.5, 5.1] }}
      gl={{ antialias: true }}
      frameloop="always"
    >
      <color attach="background" args={["#0f2918"]} />
      <fog attach="fog" args={["#14532d", 12, 55]} />
      <SceneInner {...props} />
    </Canvas>
  );
}
