import {
  CHUNK_SIZE_X,
  CHUNK_SIZE_Y,
  CHUNK_SIZE_Z,
  getBlock,
  isBreakableBlock,
  isSolidAt,
} from "@/lib/blockrealm-world";
import type { BlockId } from "@/lib/blockrealm-world";

export const PLAYER_HEIGHT = 1.7;
export const PLAYER_RADIUS = 0.3;
export const PLAYER_EYE = 1.55;
export const MOVE_SPEED = 5.6;
export const JUMP_VELOCITY = 8.2;
export const GRAVITY = 24;
export const TERMINAL_VELOCITY = -42;
export const REACH_DISTANCE = 7;
export const GROUND_PROBE = 0.08;

export type Vec3 = {
  x: number;
  y: number;
  z: number;
};

export type PlayerPose = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  onGround: boolean;
};

export type KeyState = {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
};

export type Aabb = {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
};

export type VoxelHit = {
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
  distance: number;
};

export function defaultSpawn(): Vec3 {
  return {
    x: CHUNK_SIZE_X / 2,
    y: 5.02,
    z: CHUNK_SIZE_Z / 2,
  };
}

export function createPlayerPose(): PlayerPose {
  const spawn = defaultSpawn();
  return {
    x: spawn.x,
    y: spawn.y,
    z: spawn.z,
    vx: 0,
    vy: 0,
    vz: 0,
    onGround: true,
  };
}

export function playerAabb(x: number, y: number, z: number): Aabb {
  return {
    minX: x - PLAYER_RADIUS,
    maxX: x + PLAYER_RADIUS,
    minY: y,
    maxY: y + PLAYER_HEIGHT,
    minZ: z - PLAYER_RADIUS,
    maxZ: z + PLAYER_RADIUS,
  };
}

function aabbOverlapsVoxel(box: Aabb, vx: number, vy: number, vz: number): boolean {
  return (
    box.maxX > vx &&
    box.minX < vx + 1 &&
    box.maxY > vy &&
    box.minY < vy + 1 &&
    box.maxZ > vz &&
    box.minZ < vz + 1
  );
}

export function aabbHitsSolid(
  box: Aabb,
  isSolid: (x: number, y: number, z: number) => boolean,
): boolean {
  const x0 = Math.floor(box.minX);
  const y0 = Math.floor(box.minY);
  const z0 = Math.floor(box.minZ);
  const x1 = Math.floor(box.maxX - 1e-6);
  const y1 = Math.floor(box.maxY - 1e-6);
  const z1 = Math.floor(box.maxZ - 1e-6);

  for (let y = y0; y <= y1; y += 1) {
    for (let z = z0; z <= z1; z += 1) {
      for (let x = x0; x <= x1; x += 1) {
        if (isSolid(x, y, z)) return true;
      }
    }
  }

  return false;
}

export function playerOverlapsBlock(
  player: Vec3,
  bx: number,
  by: number,
  bz: number,
): boolean {
  return aabbOverlapsVoxel(playerAabb(player.x, player.y, player.z), bx, by, bz);
}

export function wishVelocity(
  keys: KeyState,
  forwardX: number,
  forwardZ: number,
  rightX: number,
  rightZ: number,
): { x: number; z: number } {
  let x = 0;
  let z = 0;

  if (keys.forward) {
    x += forwardX;
    z += forwardZ;
  }
  if (keys.back) {
    x -= forwardX;
    z -= forwardZ;
  }
  if (keys.right) {
    x += rightX;
    z += rightZ;
  }
  if (keys.left) {
    x -= rightX;
    z -= rightZ;
  }

  const length = Math.hypot(x, z);
  if (length > 0) {
    x = (x / length) * MOVE_SPEED;
    z = (z / length) * MOVE_SPEED;
  }

  return { x, z };
}

export function moveAndCollide(
  player: PlayerPose,
  wish: { x: number; z: number },
  jumpPressed: boolean,
  dt: number,
  isSolid: (x: number, y: number, z: number) => boolean,
): PlayerPose {
  const next: PlayerPose = { ...player };
  const clampedDt = Math.min(dt, 0.05);

  next.vx = wish.x;
  next.vz = wish.z;

  if (jumpPressed && next.onGround) {
    next.vy = JUMP_VELOCITY;
    next.onGround = false;
  }

  next.vy -= GRAVITY * clampedDt;
  if (next.vy < TERMINAL_VELOCITY) next.vy = TERMINAL_VELOCITY;

  next.x += next.vx * clampedDt;
  if (aabbHitsSolid(playerAabb(next.x, next.y, next.z), isSolid)) {
    next.x = player.x;
    next.vx = 0;
  }

  next.z += next.vz * clampedDt;
  if (aabbHitsSolid(playerAabb(next.x, next.y, next.z), isSolid)) {
    next.z = player.z;
    next.vz = 0;
  }

  next.y += next.vy * clampedDt;
  if (aabbHitsSolid(playerAabb(next.x, next.y, next.z), isSolid)) {
    if (next.vy < 0) next.onGround = true;
    next.y = player.y;
    next.vy = 0;
  } else {
    next.onGround = aabbHitsSolid(
      playerAabb(next.x, next.y - GROUND_PROBE, next.z),
      isSolid,
    );
  }

  if (next.y < -10) {
    return createPlayerPose();
  }

  return next;
}

export function voxelRaycast(
  origin: Vec3,
  direction: Vec3,
  maxDistance: number,
  isTarget: (x: number, y: number, z: number) => boolean,
): VoxelHit | null {
  const { x: dx, y: dy, z: dz } = direction;
  let x = Math.floor(origin.x);
  let y = Math.floor(origin.y);
  let z = Math.floor(origin.z);

  const stepX = Math.sign(dx);
  const stepY = Math.sign(dy);
  const stepZ = Math.sign(dz);

  const tDeltaX = stepX !== 0 ? Math.abs(1 / dx) : Number.POSITIVE_INFINITY;
  const tDeltaY = stepY !== 0 ? Math.abs(1 / dy) : Number.POSITIVE_INFINITY;
  const tDeltaZ = stepZ !== 0 ? Math.abs(1 / dz) : Number.POSITIVE_INFINITY;

  const boundX = stepX > 0 ? x + 1 : x;
  const boundY = stepY > 0 ? y + 1 : y;
  const boundZ = stepZ > 0 ? z + 1 : z;

  let tMaxX =
    stepX !== 0 ? (boundX - origin.x) / dx : Number.POSITIVE_INFINITY;
  let tMaxY =
    stepY !== 0 ? (boundY - origin.y) / dy : Number.POSITIVE_INFINITY;
  let tMaxZ =
    stepZ !== 0 ? (boundZ - origin.z) / dz : Number.POSITIVE_INFINITY;

  let nx = 0;
  let ny = 0;
  let nz = 0;
  let t = 0;

  while (t <= maxDistance) {
    if (isTarget(x, y, z)) {
      return { x, y, z, nx, ny, nz, distance: t };
    }

    if (tMaxX < tMaxY) {
      if (tMaxX < tMaxZ) {
        x += stepX;
        t = tMaxX;
        tMaxX += tDeltaX;
        nx = -stepX;
        ny = 0;
        nz = 0;
      } else {
        z += stepZ;
        t = tMaxZ;
        tMaxZ += tDeltaZ;
        nx = 0;
        ny = 0;
        nz = -stepZ;
      }
    } else if (tMaxY < tMaxZ) {
      y += stepY;
      t = tMaxY;
      tMaxY += tDeltaY;
      nx = 0;
      ny = -stepY;
      nz = 0;
    } else {
      z += stepZ;
      t = tMaxZ;
      tMaxZ += tDeltaZ;
      nx = 0;
      ny = 0;
      nz = -stepZ;
    }
  }

  return null;
}

export function targetNonAir(
  voxels: Uint8Array,
  origin: Vec3,
  direction: Vec3,
): VoxelHit | null {
  return voxelRaycast(origin, direction, REACH_DISTANCE, (x, y, z) => {
    const block = getBlock(voxels, x, y, z);
    return block !== 0;
  });
}

export function placeCellFromHit(hit: VoxelHit): Vec3 {
  return {
    x: hit.x + hit.nx,
    y: hit.y + hit.ny,
    z: hit.z + hit.nz,
  };
}

export function canBreakHit(voxels: Uint8Array, hit: VoxelHit): boolean {
  return isBreakableBlock(getBlock(voxels, hit.x, hit.y, hit.z));
}

export function canPlaceAt(
  voxels: Uint8Array,
  player: Vec3,
  x: number,
  y: number,
  z: number,
): boolean {
  if (x < 0 || y < 0 || z < 0) return false;
  if (x >= CHUNK_SIZE_X || y >= CHUNK_SIZE_Y || z >= CHUNK_SIZE_Z) {
    return false;
  }
  if (getBlock(voxels, x, y, z) !== 0) return false;
  if (playerOverlapsBlock(player, x, y, z)) return false;
  return true;
}

export function worldIsSolid(voxels: Uint8Array) {
  return (x: number, y: number, z: number) => isSolidAt(voxels, x, y, z);
}

export type CycleInfo = {
  phase: number;
  isNight: boolean;
  sky: string;
  ambient: number;
  sunIntensity: number;
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpHex(a: string, b: string, t: number): string {
  const parse = (hex: string) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const toHex = (n: number) =>
    Math.round(n).toString(16).padStart(2, "0");
  return `#${toHex(lerp(ar, br, t))}${toHex(lerp(ag, bg, t))}${toHex(lerp(ab, bb, t))}`;
}

export const DAY_CYCLE_SECONDS = 60;
const DAY_SKY = "#87ceeb";
const NIGHT_SKY = "#0b1220";

export function dayNightFromTime(elapsedSeconds: number): CycleInfo {
  const phase = (elapsedSeconds % DAY_CYCLE_SECONDS) / DAY_CYCLE_SECONDS;
  const wave = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);
  const nightAmount = wave;
  return {
    phase,
    isNight: nightAmount > 0.55,
    sky: lerpHex(DAY_SKY, NIGHT_SKY, nightAmount),
    ambient: lerp(0.85, 0.15, nightAmount),
    sunIntensity: lerp(1.15, 0.08, nightAmount),
  };
}

export function formatCoords(x: number, y: number, z: number): string {
  return `${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}`;
}

export type { BlockId };
