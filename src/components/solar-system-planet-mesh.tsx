"use client";

import {
  SOLAR_BODIES,
  type BodyId,
} from "@/lib/solar-system/bodies";
import {
  BODY_MATERIAL_PROPS,
  BODY_TEXTURE_URL,
  EARTH_CLOUDS_URL,
  SATURN_RING_URL,
  TEXTURE_ANISOTROPY,
} from "@/lib/solar-system/textures";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import {
  DoubleSide,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  type Mesh,
} from "three";

function useOptionalTexture(url: string | null): Texture | null {
  const [map, setMap] = useState<Texture | null>(null);

  useEffect(() => {
    if (!url) {
      setMap(null);
      return;
    }
    let active = true;
    const loader = new TextureLoader();
    loader.load(
      url,
      (texture) => {
        if (!active) {
          texture.dispose();
          return;
        }
        texture.colorSpace = SRGBColorSpace;
        texture.anisotropy = TEXTURE_ANISOTROPY;
        setMap(texture);
      },
      undefined,
      () => {
        if (active) setMap(null);
      },
    );
    return () => {
      active = false;
    };
  }, [url]);

  return map;
}

type BodySphereProps = {
  bodyId: BodyId;
  radius: number;
  selected: boolean;
  spinRef: React.RefObject<Mesh | null>;
  onPointerDown: () => void;
};

export function BodySphere({
  bodyId,
  radius,
  selected,
  spinRef,
  onPointerDown,
}: BodySphereProps) {
  const body = SOLAR_BODIES[bodyId];
  const map = useOptionalTexture(BODY_TEXTURE_URL[bodyId]);
  const cloudMap = useOptionalTexture(
    bodyId === "earth" ? EARTH_CLOUDS_URL : null,
  );
  const cloudRef = useRef<Mesh>(null);
  const { roughness, metalness } = BODY_MATERIAL_PROPS[bodyId];
  const isSun = bodyId === "sun";
  const scale = selected ? 1.25 : 1;

  useFrame((_, delta) => {
    if (cloudRef.current) {
      cloudRef.current.rotation.y -= delta * 0.04;
    }
  });

  return (
    <group scale={scale}>
      <mesh
        ref={spinRef}
        onPointerDown={(event) => {
          event.stopPropagation();
          onPointerDown();
        }}
      >
        <sphereGeometry args={[radius, 64, 64]} />
        {isSun ? (
          <meshBasicMaterial
            map={map ?? undefined}
            color={map ? "#ffffff" : body.color}
            toneMapped={false}
          />
        ) : (
          <meshStandardMaterial
            map={map ?? undefined}
            color={map ? "#ffffff" : body.color}
            roughness={roughness}
            metalness={metalness}
            emissive={selected ? body.color : "#000000"}
            emissiveIntensity={selected ? 0.25 : 0}
          />
        )}
      </mesh>

      {bodyId === "earth" && cloudMap ? (
        <mesh ref={cloudRef} scale={1.015}>
          <sphereGeometry args={[radius, 48, 48]} />
          <meshStandardMaterial
            map={cloudMap}
            transparent
            opacity={0.55}
            depthWrite={false}
            roughness={1}
            metalness={0}
          />
        </mesh>
      ) : null}
    </group>
  );
}

type SaturnRingsProps = {
  radius: number;
  scale: number;
};

export function SaturnRings({ radius, scale }: SaturnRingsProps) {
  const ringMap = useOptionalTexture(SATURN_RING_URL);

  return (
    <mesh rotation={[Math.PI / 2.2, 0, 0]} scale={scale}>
      <ringGeometry args={[radius * 1.35, radius * 2.15, 128]} />
      <meshBasicMaterial
        map={ringMap ?? undefined}
        color={ringMap ? "#ffffff" : "#e7e5e4"}
        transparent
        opacity={ringMap ? 1 : 0.65}
        side={DoubleSide}
        depthWrite={false}
        alphaTest={ringMap ? 0.08 : 0}
      />
    </mesh>
  );
}

type SunLightProps = {
  intensity?: number;
};

export function SunLight({ intensity = 3.2 }: SunLightProps) {
  return (
    <pointLight
      intensity={intensity}
      distance={120}
      decay={2}
      color="#fff8e7"
    />
  );
}
