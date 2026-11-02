"use client";

import {
  createPlayerPose,
  dayNightFromTime,
  defaultSpawn,
  moveAndCollide,
  PLAYER_EYE,
  targetNonAir,
  wishVelocity,
  worldIsSolid,
  type KeyState,
  type PlayerPose,
  type Vec3,
  type VoxelHit,
} from "@/lib/blockrealm-controls";
import {
  BLOCK_DEFS,
  CHUNK_SIZE_X,
  CHUNK_SIZE_Y,
  CHUNK_SIZE_Z,
  CHUNK_VOLUME,
  voxelIndex,
} from "@/lib/blockrealm-world";
import { PointerLockControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  Color,
  DirectionalLight,
  Fog,
  InstancedMesh,
  Mesh,
  Object3D,
  Vector3,
  type AmbientLight,
} from "three";
import type { PointerLockControls as PointerLockControlsImpl } from "three-stdlib";

export type BlockRealmSceneProps = {
  voxelsRef: React.MutableRefObject<Uint8Array>;
  revision: number;
  spawnToken: number;
  showCoords: boolean;
  onLockChange: (locked: boolean) => void;
  onRegisterLock: (lock: () => void) => void;
  onBreak: (hit: VoxelHit) => void;
  onPlace: (hit: VoxelHit) => void;
  onPlayerMove: (x: number, y: number, z: number) => void;
  onDayNight: (isNight: boolean) => void;
  playerRef: React.MutableRefObject<Vec3>;
};

function BlockLayer({
  voxels,
  revision,
  blockId,
  color,
  transparent = false,
}: {
  voxels: Uint8Array;
  revision: number;
  blockId: number;
  color: string;
  transparent?: boolean;
}) {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    let i = 0;
    for (let y = 0; y < CHUNK_SIZE_Y; y += 1) {
      for (let z = 0; z < CHUNK_SIZE_Z; z += 1) {
        for (let x = 0; x < CHUNK_SIZE_X; x += 1) {
          if (voxels[voxelIndex(x, y, z)] !== blockId) continue;
          dummy.position.set(x + 0.5, y + 0.5, z + 0.5);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
          i += 1;
        }
      }
    }

    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
  }, [voxels, revision, blockId, dummy]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, CHUNK_VOLUME]}
      frustumCulled={false}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={color}
        transparent={transparent}
        opacity={transparent ? 0.48 : 1}
        depthWrite={!transparent}
        roughness={0.85}
        metalness={0}
      />
    </instancedMesh>
  );
}

function PlayLoop({
  voxelsRef,
  revision,
  spawnToken,
  showCoords,
  onLockChange,
  onRegisterLock,
  onBreak,
  onPlace,
  onPlayerMove,
  onDayNight,
  playerRef,
}: BlockRealmSceneProps) {
  const { camera } = useThree();
  const controlsRef = useRef<PointerLockControlsImpl>(null);
  const keysRef = useRef<KeyState>({
    forward: false,
    back: false,
    left: false,
    right: false,
    jump: false,
  });
  const poseRef = useRef<PlayerPose>(createPlayerPose());
  const lockedRef = useRef(false);
  const hitRef = useRef<VoxelHit | null>(null);
  const highlightRef = useRef<Mesh>(null);
  const ambientRef = useRef<AmbientLight>(null);
  const sunRef = useRef<DirectionalLight>(null);
  const skyColor = useMemo(() => new Color("#87ceeb"), []);
  const forward = useMemo(() => new Vector3(), []);
  const right = useMemo(() => new Vector3(), []);
  const look = useMemo(() => new Vector3(), []);
  const lastNight = useRef<boolean | null>(null);
  const frame = useRef(0);

  const onBreakRef = useRef(onBreak);
  const onPlaceRef = useRef(onPlace);
  const onLockChangeRef = useRef(onLockChange);
  const onPlayerMoveRef = useRef(onPlayerMove);
  const onDayNightRef = useRef(onDayNight);
  const onRegisterLockRef = useRef(onRegisterLock);
  onBreakRef.current = onBreak;
  onPlaceRef.current = onPlace;
  onLockChangeRef.current = onLockChange;
  onPlayerMoveRef.current = onPlayerMove;
  onDayNightRef.current = onDayNight;
  onRegisterLockRef.current = onRegisterLock;

  useEffect(() => {
    const spawn = defaultSpawn();
    poseRef.current = createPlayerPose();
    camera.position.set(spawn.x, spawn.y + PLAYER_EYE, spawn.z);
    camera.rotation.order = "YXZ";
    camera.rotation.x = -0.28;
    playerRef.current = spawn;
  }, [spawnToken, camera, playerRef]);

  useEffect(() => {
    onRegisterLockRef.current(() => {
      const target =
        controlsRef.current?.domElement ??
        document.querySelector("canvas");
      if (!target || !("requestPointerLock" in target)) return;
      const result = (
        target as HTMLElement & {
          requestPointerLock: () => Promise<void> | void;
        }
      ).requestPointerLock();
      if (result && typeof result.catch === "function") {
        void result.catch(() => {});
      }
    });
  }, []);

  useEffect(() => {
    const applyKey = (code: string, pressed: boolean) => {
      if (code === "KeyW") keysRef.current.forward = pressed;
      if (code === "KeyS") keysRef.current.back = pressed;
      if (code === "KeyA") keysRef.current.left = pressed;
      if (code === "KeyD") keysRef.current.right = pressed;
      if (code === "Space") keysRef.current.jump = pressed;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      applyKey(event.code, true);
      if (event.code === "Space" && lockedRef.current) {
        event.preventDefault();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => applyKey(event.code, false);

    const onMouseDown = (event: MouseEvent) => {
      if (!lockedRef.current) return;
      const hit = hitRef.current;
      if (!hit) return;
      if (event.button === 0) onBreakRef.current(hit);
      if (event.button === 2) {
        event.preventDefault();
        onPlaceRef.current(hit);
      }
    };

    const onContextMenu = (event: MouseEvent) => {
      if (lockedRef.current) event.preventDefault();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("contextmenu", onContextMenu);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("contextmenu", onContextMenu);
    };
  }, []);

  useFrame((state, delta) => {
    const cycle = dayNightFromTime(state.clock.elapsedTime);
    skyColor.set(cycle.sky);
    state.scene.background = skyColor;
    if (state.scene.fog instanceof Fog) {
      state.scene.fog.color.copy(skyColor);
    }
    if (ambientRef.current) ambientRef.current.intensity = cycle.ambient;
    if (sunRef.current) {
      sunRef.current.intensity = cycle.sunIntensity;
      const angle = cycle.phase * Math.PI * 2;
      sunRef.current.position.set(
        Math.cos(angle) * 24,
        Math.sin(angle) * 18 + 6,
        10,
      );
    }
    if (lastNight.current !== cycle.isNight) {
      lastNight.current = cycle.isNight;
      onDayNightRef.current(cycle.isNight);
    }

    if (lockedRef.current) {
      camera.getWorldDirection(forward);
      forward.y = 0;
      if (forward.lengthSq() > 0) forward.normalize();
      right.set(-forward.z, 0, forward.x);
      const wish = wishVelocity(
        keysRef.current,
        forward.x,
        forward.z,
        right.x,
        right.z,
      );
      poseRef.current = moveAndCollide(
        poseRef.current,
        wish,
        keysRef.current.jump,
        delta,
        worldIsSolid(voxelsRef.current),
      );
    }

    const pose = poseRef.current;
    camera.position.set(pose.x, pose.y + PLAYER_EYE, pose.z);
    playerRef.current = { x: pose.x, y: pose.y, z: pose.z };

    camera.getWorldDirection(look);
    hitRef.current = targetNonAir(
      voxelsRef.current,
      {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
      },
      { x: look.x, y: look.y, z: look.z },
    );

    if (highlightRef.current) {
      if (hitRef.current) {
        highlightRef.current.visible = true;
        highlightRef.current.position.set(
          hitRef.current.x + 0.5,
          hitRef.current.y + 0.5,
          hitRef.current.z + 0.5,
        );
      } else {
        highlightRef.current.visible = false;
      }
    }

    frame.current += 1;
    if (showCoords && frame.current % 6 === 0) {
      onPlayerMoveRef.current(pose.x, pose.y, pose.z);
    }
  });

  const opaque = BLOCK_DEFS.filter((def) => !def.transparent);
  const glass = BLOCK_DEFS.filter((def) => def.transparent);

  return (
    <>
      <color attach="background" args={["#87ceeb"]} />
      <hemisphereLight args={["#c8e7ff", "#6b8f4e", 0.7]} />
      <ambientLight ref={ambientRef} intensity={0.95} />
      <directionalLight ref={sunRef} position={[12, 18, 8]} intensity={1.35} />
      <fog attach="fog" args={["#87ceeb", 28, 55]} />
      <PointerLockControls
        ref={controlsRef}
        onLock={() => {
          lockedRef.current = true;
          onLockChangeRef.current(true);
        }}
        onUnlock={() => {
          lockedRef.current = false;
          onLockChangeRef.current(false);
        }}
      />
      {opaque.map((def) => (
        <BlockLayer
          key={def.id}
          voxels={voxelsRef.current}
          revision={revision}
          blockId={def.id}
          color={def.color}
        />
      ))}
      {glass.map((def) => (
        <BlockLayer
          key={def.id}
          voxels={voxelsRef.current}
          revision={revision}
          blockId={def.id}
          color={def.color}
          transparent
        />
      ))}
      <mesh ref={highlightRef} visible={false}>
        <boxGeometry args={[1.02, 1.02, 1.02]} />
        <meshBasicMaterial
          color="#ffffff"
          wireframe
          transparent
          opacity={0.85}
        />
      </mesh>
    </>
  );
}

export default function BlockRealmScene(props: BlockRealmSceneProps) {
  const spawn = defaultSpawn();

  return (
    <Canvas
      camera={{
        fov: 75,
        near: 0.08,
        far: 80,
        position: [spawn.x, spawn.y + PLAYER_EYE, spawn.z],
      }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      }}
      dpr={[1, 1.5]}
      onCreated={({ gl, scene }) => {
        const sky = new Color("#87ceeb");
        scene.background = sky;
        gl.setClearColor(sky, 1);
      }}
    >
      <PlayLoop {...props} />
    </Canvas>
  );
}
