"use client";

/** Orbit radii and sphere sizes are stylized for layout; surface maps are realistic 2K textures. */

import {
  BodySphere,
  SaturnRings,
  SunLight,
} from "@/components/solar-system-planet-mesh";
import {
  SOLAR_BODIES,
  SOLAR_BODY_IDS,
  type BodyId,
} from "@/lib/solar-system/bodies";
import { ALL_SOLAR_TEXTURE_URLS } from "@/lib/solar-system/textures";
import { Loader, OrbitControls, Stars } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Suspense, useCallback, useEffect, useMemo, useRef } from "react";
import { TextureLoader, Vector3, type Group, type Mesh } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

type SolarSystemSceneProps = {
  selectedBodyId: BodyId | null;
  onSelectBody: (id: BodyId) => void;
};

type OrbitingBodyProps = {
  bodyId: BodyId;
  selected: boolean;
  onSelect: (id: BodyId) => void;
  setAnchorRef: (bodyId: BodyId, group: Group | null) => void;
};

function TextureWarmup() {
  useEffect(() => {
    const loader = new TextureLoader();
    for (const url of ALL_SOLAR_TEXTURE_URLS) {
      loader.load(url, () => undefined, undefined, () => undefined);
    }
  }, []);
  return null;
}

function OrbitingBody({
  bodyId,
  selected,
  onSelect,
  setAnchorRef,
}: OrbitingBodyProps) {
  const body = SOLAR_BODIES[bodyId];
  const orbitRef = useRef<Group>(null);
  const spinRef = useRef<Mesh>(null);
  const angleRef = useRef(Math.random() * Math.PI * 2);
  const isSun = bodyId === "sun";

  useFrame((_, delta) => {
    if (!isSun) {
      angleRef.current += body.orbitSpeed * delta;
      if (orbitRef.current) {
        orbitRef.current.rotation.y = angleRef.current;
      }
    }
    if (spinRef.current) {
      spinRef.current.rotation.y += body.spinSpeed * delta;
    }
  });

  const scale = selected ? 1.25 : 1;

  return (
    <group ref={orbitRef}>
      {!isSun ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[body.orbitRadius - 0.02, body.orbitRadius + 0.02, 128]} />
          <meshBasicMaterial color="#334155" transparent opacity={0.22} />
        </mesh>
      ) : null}

      <group
        ref={(node) => setAnchorRef(bodyId, node)}
        position={isSun ? [0, 0, 0] : [body.orbitRadius, 0, 0]}
      >
        <BodySphere
          bodyId={bodyId}
          radius={body.radius}
          selected={selected}
          spinRef={spinRef}
          onPointerDown={() => onSelect(bodyId)}
        />

        {bodyId === "saturn" ? (
          <SaturnRings radius={body.radius} scale={scale} />
        ) : null}

        {isSun ? <SunLight /> : null}
      </group>
    </group>
  );
}

function CameraFocus({
  selectedBodyId,
  bodyAnchors,
  controlsRef,
}: {
  selectedBodyId: BodyId | null;
  bodyAnchors: React.MutableRefObject<Partial<Record<BodyId, Group>>>;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const focus = useRef(new Vector3(0, 0, 0));
  const desired = useRef(new Vector3(0, 0, 0));
  const world = useRef(new Vector3());

  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (selectedBodyId && bodyAnchors.current[selectedBodyId]) {
      bodyAnchors.current[selectedBodyId]!.getWorldPosition(world.current);
      desired.current.copy(world.current);
    } else {
      desired.current.set(0, 0, 0);
    }

    focus.current.lerp(desired.current, 0.06);
    controls.target.lerp(focus.current, 0.06);
    controls.update();
  });

  return null;
}

function SolarSystemWorld({
  selectedBodyId,
  onSelectBody,
}: SolarSystemSceneProps) {
  const planetIds = useMemo(
    () => SOLAR_BODY_IDS.filter((id) => id !== "sun"),
    [],
  );
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const bodyAnchors = useRef<Partial<Record<BodyId, Group>>>({});

  const setAnchorRef = useCallback((bodyId: BodyId, group: Group | null) => {
    if (group) {
      bodyAnchors.current[bodyId] = group;
    } else {
      delete bodyAnchors.current[bodyId];
    }
  }, []);

  return (
    <>
      <TextureWarmup />
      <color attach="background" args={["#020617"]} />
      <ambientLight intensity={0.08} />
      <Stars radius={80} depth={40} count={3000} factor={3} fade speed={0.35} />

      <OrbitingBody
        bodyId="sun"
        selected={selectedBodyId === "sun"}
        onSelect={onSelectBody}
        setAnchorRef={setAnchorRef}
      />
      {planetIds.map((id) => (
        <OrbitingBody
          key={id}
          bodyId={id}
          selected={selectedBodyId === id}
          onSelect={onSelectBody}
          setAnchorRef={setAnchorRef}
        />
      ))}

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        minDistance={6}
        maxDistance={42}
        maxPolarAngle={Math.PI / 2 + 0.35}
      />

      <CameraFocus
        selectedBodyId={selectedBodyId}
        bodyAnchors={bodyAnchors}
        controlsRef={controlsRef}
      />

      <EffectComposer multisampling={0}>
        <Bloom
          intensity={0.45}
          luminanceThreshold={0.82}
          luminanceSmoothing={0.4}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

export function SolarSystemScene({
  selectedBodyId,
  onSelectBody,
}: SolarSystemSceneProps) {
  return (
    <div className="solarsystem-glass-card relative h-[min(52vh,520px)] min-h-[420px] w-full overflow-hidden rounded-3xl">
      <Canvas
        camera={{ position: [0, 14, 22], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <Suspense fallback={null}>
          <SolarSystemWorld
            selectedBodyId={selectedBodyId}
            onSelectBody={onSelectBody}
          />
        </Suspense>
        <Loader
          containerStyles={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(2, 6, 23, 0.55)",
            pointerEvents: "none",
          }}
          innerStyles={{ width: "120px", height: "2px" }}
          barStyles={{ background: "#fbbf24" }}
          dataStyles={{
            color: "#94a3b8",
            fontFamily: "inherit",
            fontSize: "12px",
            marginTop: "8px",
          }}
        />
      </Canvas>
    </div>
  );
}
