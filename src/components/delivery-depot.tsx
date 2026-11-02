"use client";

import type { DeliverySkateboard } from "@/lib/delivery";
import { makeCourierSpriteTexture } from "@/lib/delivery-courier-sprite";
import {
  DELIVERY_ANIMALS,
  type DeliveryAnimalId,
} from "@/lib/delivery-mounts";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  CanvasTexture,
  SRGBColorSpace,
  type Group,
} from "three";

const textureCache = new Map<string, CanvasTexture>();

function parkedMount(mount: DeliveryAnimalId) {
  const animal = DELIVERY_ANIMALS[mount];
  if (!animal) {
    return { emoji: "❓", label: "Unknown" };
  }
  return { emoji: animal.emoji, label: animal.label };
}

function makeEmptyLotTexture() {
  const key = "__empty_lot__";
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not draw empty lot label");
  }
  ctx.fillStyle = "rgba(15, 118, 110, 0.35)";
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = "#99f6e4";
  ctx.font = "600 36px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("No couriers parked", 256, 64);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}

/** Slot on the depot pad (x, y, z) in world units. */
export function parkSlot(index: number, total: number): [number, number, number] {
  const cols = Math.min(4, Math.max(1, total));
  const rows = Math.ceil(total / cols);
  const col = index % cols;
  const row = Math.floor(index / cols);
  const gapX = 1.35;
  const gapZ = 1.15;
  const width = (cols - 1) * gapX;
  const depth = (rows - 1) * gapZ;
  const x = cols === 1 ? 0 : -width / 2 + col * gapX;
  const z = rows === 1 ? 0 : -depth / 2 + row * gapZ;
  return [x, 0.3, z];
}

function ParkedCourier({
  courier,
  index,
  total,
}: {
  courier: DeliverySkateboard;
  index: number;
  total: number;
}) {
  const bob = useRef<Group>(null);
  const [x, , z] = parkSlot(index, total);
  const animal = parkedMount(courier.mount);
  const texture = useMemo(
    () => makeCourierSpriteTexture(animal.emoji, courier.name),
    [animal.emoji, courier.name],
  );
  const phase = index * 0.7;

  useFrame(({ clock }) => {
    if (bob.current) {
      bob.current.position.y = Math.sin(clock.elapsedTime * 2 + phase) * 0.05;
    }
  });

  return (
    <group position={[x, 0, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.22, 0]}>
        <circleGeometry args={[0.34, 20]} />
        <meshLambertMaterial color="#000000" transparent opacity={0.28} />
      </mesh>
      <mesh position={[0, 0.27, 0]}>
        <boxGeometry args={[0.52, 0.06, 0.22]} />
        <meshLambertMaterial color="#c2410c" />
      </mesh>
      <group ref={bob}>
        <sprite position={[0, 0.62, 0]} scale={[0.95, 1.35, 1]}>
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

function EmptyLotLabel() {
  const texture = useMemo(() => makeEmptyLotTexture(), []);
  return (
    <mesh position={[0, 0.24, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[3.2, 0.8]} />
      <meshLambertMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  );
}

export function DeliveryDepotParked({
  couriers,
}: {
  couriers: DeliverySkateboard[];
}) {
  return (
    <group>
      {couriers.length === 0 ? (
        <EmptyLotLabel />
      ) : (
        couriers.map((courier, index) => (
          <ParkedCourier
            key={courier.id}
            courier={courier}
            index={index}
            total={couriers.length}
          />
        ))
      )}
    </group>
  );
}
