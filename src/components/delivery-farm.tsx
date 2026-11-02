"use client";

import type { DeliverySkateboard } from "@/lib/delivery";
import { makeCourierSpriteTexture } from "@/lib/delivery-courier-sprite";
import {
  farmEatingSlot,
  farmWaitingSlot,
} from "@/lib/delivery-farm";
import { getCourierHunger } from "@/lib/delivery-hunger";
import {
  DELIVERY_ANIMALS,
  type DeliveryAnimalId,
} from "@/lib/delivery-mounts";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  CanvasTexture,
  SRGBColorSpace,
  type Group,
} from "three";

export const FARM_WORLD_POSITION: [number, number, number] = [0, 0, -7.5];

function parkedMount(mount: DeliveryAnimalId) {
  const animal = DELIVERY_ANIMALS[mount];
  if (!animal) {
    return { emoji: "❓", label: "Unknown" };
  }
  return { emoji: animal.emoji, label: animal.label };
}

function makeFarmSignTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not draw farm sign");
  }
  ctx.fillStyle = "#a16207";
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = "#fef3c7";
  ctx.font = "700 64px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("FARM", 128, 68);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function DeliveryFarmPlot() {
  const signTexture = useMemo(() => makeFarmSignTexture(), []);
  useEffect(() => () => signTexture.dispose(), [signTexture]);

  const posts = [-2.4, -1.2, 0, 1.2, 2.4];

  return (
    <group position={FARM_WORLD_POSITION}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <planeGeometry args={[5.6, 4.2]} />
        <meshLambertMaterial color="#78350f" />
      </mesh>
      {[-0.9, 0.9].map((x) => (
        <mesh key={`trough-${x}`} position={[x, 0.12, 0.2]}>
          <boxGeometry args={[0.7, 0.14, 0.5]} />
          <meshLambertMaterial color="#ca8a04" />
        </mesh>
      ))}
      {[-0.8, 0, 0.8].map((z) => (
        <mesh
          key={z}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.04, z]}
        >
          <planeGeometry args={[4.8, 0.35]} />
          <meshLambertMaterial color="#92400e" />
        </mesh>
      ))}
      <mesh position={[-2.1, 0.22, 1.5]}>
        <boxGeometry args={[0.55, 0.4, 0.45]} />
        <meshLambertMaterial color="#ca8a04" />
      </mesh>
      <mesh position={[2, 0.22, -1.4]}>
        <boxGeometry args={[0.55, 0.4, 0.45]} />
        <meshLambertMaterial color="#ca8a04" />
      </mesh>
      {posts.map((x) => (
        <mesh key={`post-${x}`} position={[x, 0.32, -2.15]}>
          <boxGeometry args={[0.1, 0.64, 0.1]} />
          <meshLambertMaterial color="#57534e" />
        </mesh>
      ))}
      <mesh position={[0, 0.48, -2.15]}>
        <boxGeometry args={[5, 0.06, 0.06]} />
        <meshLambertMaterial color="#78716c" />
      </mesh>
      <mesh position={[0, 0.72, -1.85]} rotation={[0, 0, 0]}>
        <planeGeometry args={[1.2, 0.45]} />
        <meshLambertMaterial map={signTexture} toneMapped={false} />
      </mesh>
    </group>
  );
}

function FarmParkedCourier({
  courier,
  position,
  hunger,
}: {
  courier: DeliverySkateboard;
  position: [number, number, number];
  hunger: number;
}) {
  const bob = useRef<Group>(null);
  const animal = parkedMount(courier.mount);

  const texture = useMemo(
    () => makeCourierSpriteTexture(animal.emoji, courier.name),
    [animal.emoji, courier.name],
  );

  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(({ clock }) => {
    if (bob.current) {
      bob.current.position.y = Math.sin(clock.elapsedTime * 2.2) * 0.04;
    }
  });

  return (
    <group position={position}>
      <group ref={bob}>
        <sprite position={[0, 0.58, 0]} scale={[0.9, 1.28, 1]}>
          <spriteMaterial
            map={texture}
            transparent
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      </group>
    </group>
  );
}

export function DeliveryFarmParked({
  eatingCouriers,
  waitingCouriers,
  courierHunger,
}: {
  eatingCouriers: DeliverySkateboard[];
  waitingCouriers: DeliverySkateboard[];
  courierHunger: Record<string, number>;
}) {
  if (eatingCouriers.length === 0 && waitingCouriers.length === 0) {
    return null;
  }

  return (
    <group position={FARM_WORLD_POSITION}>
      {eatingCouriers.map((courier, index) => (
        <FarmParkedCourier
          key={courier.id}
          courier={courier}
          position={farmEatingSlot(index)}
          hunger={
            courierHunger[courier.id] ??
            getCourierHunger({}, courier.id, courier.mount)
          }
        />
      ))}
      {waitingCouriers.map((courier, index) => (
        <FarmParkedCourier
          key={courier.id}
          courier={courier}
          position={farmWaitingSlot(index)}
          hunger={
            courierHunger[courier.id] ??
            getCourierHunger({}, courier.id, courier.mount)
          }
        />
      ))}
    </group>
  );
}
