import {
  BlockId,
  isSolidBlock,
  type BlockId as BlockIdType,
} from "@/lib/blockrealm-world";

export const DENIAL_SIZE_X = 20;
export const DENIAL_SIZE_Y = 12;
export const DENIAL_SIZE_Z = 44;
export const DENIAL_VOLUME = DENIAL_SIZE_X * DENIAL_SIZE_Y * DENIAL_SIZE_Z;

export const DENIAL_PLAYER_SPAWN = { x: 10, y: 5.02, z: 4 };
export const DENIAL_PIG_SPAWN = { x: 10, y: 5.02, z: 2 };
export const DENIAL_GARY_POS = { x: 10, y: 5.02, z: 40 };

export const DENIAL_EXIT_ZONE = {
  minX: 7,
  maxX: 13,
  minZ: 34,
  maxZ: 36,
};

export function denialVoxelIndex(x: number, y: number, z: number): number {
  return y * DENIAL_SIZE_X * DENIAL_SIZE_Z + z * DENIAL_SIZE_X + x;
}

export function denialInBounds(x: number, y: number, z: number): boolean {
  return (
    x >= 0 &&
    y >= 0 &&
    z >= 0 &&
    x < DENIAL_SIZE_X &&
    y < DENIAL_SIZE_Y &&
    z < DENIAL_SIZE_Z
  );
}

export function denialGetBlock(
  voxels: Uint8Array,
  x: number,
  y: number,
  z: number,
): BlockIdType {
  if (!denialInBounds(x, y, z)) return BlockId.Air;
  return voxels[denialVoxelIndex(x, y, z)] as BlockIdType;
}

export function denialSetBlock(
  voxels: Uint8Array,
  x: number,
  y: number,
  z: number,
  id: BlockIdType,
): void {
  if (!denialInBounds(x, y, z)) return;
  voxels[denialVoxelIndex(x, y, z)] = id;
}

export function denialIsSolidAt(
  voxels: Uint8Array,
  x: number,
  y: number,
  z: number,
): boolean {
  if (!denialInBounds(x, y, z)) return true;
  return isSolidBlock(denialGetBlock(voxels, x, y, z));
}

function fillBox(
  voxels: Uint8Array,
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  id: BlockIdType,
) {
  for (let y = y0; y <= y1; y += 1) {
    for (let z = z0; z <= z1; z += 1) {
      for (let x = x0; x <= x1; x += 1) {
        denialSetBlock(voxels, x, y, z, id);
      }
    }
  }
}

export function generateShelterDenialWorld(): Uint8Array {
  const voxels = new Uint8Array(DENIAL_VOLUME);

  fillBox(voxels, 0, 0, 0, DENIAL_SIZE_X - 1, 3, DENIAL_SIZE_Z - 1, BlockId.Stone);

  const floorY = 4;
  const ceilY = 9;

  for (let z = 1; z < DENIAL_SIZE_Z - 1; z += 1) {
    for (let x = 1; x < DENIAL_SIZE_X - 1; x += 1) {
      denialSetBlock(voxels, x, floorY, z, BlockId.Dirt);
    }
  }

  for (let z = 1; z < DENIAL_SIZE_Z - 1; z += 1) {
    denialSetBlock(voxels, 0, floorY, z, BlockId.Stone);
    denialSetBlock(voxels, DENIAL_SIZE_X - 1, floorY, z, BlockId.Stone);
    for (let y = floorY + 1; y <= ceilY; y += 1) {
      denialSetBlock(voxels, 0, y, z, BlockId.Stone);
      denialSetBlock(voxels, DENIAL_SIZE_X - 1, y, z, BlockId.Stone);
    }
  }

  for (let x = 1; x < DENIAL_SIZE_X - 1; x += 1) {
    for (let y = floorY + 1; y <= ceilY; y += 1) {
      denialSetBlock(voxels, x, y, 0, BlockId.Stone);
      denialSetBlock(voxels, x, y, DENIAL_SIZE_Z - 1, BlockId.Stone);
    }
  }

  for (let x = 1; x < DENIAL_SIZE_X - 1; x += 1) {
    for (let z = 1; z < DENIAL_SIZE_Z - 1; z += 1) {
      denialSetBlock(voxels, x, ceilY, z, BlockId.Wood);
    }
  }

  for (let z = 5; z < 34; z += 1) {
    denialSetBlock(voxels, 5, floorY + 1, z, BlockId.Stone);
    denialSetBlock(voxels, 14, floorY + 1, z, BlockId.Stone);
  }

  fillBox(voxels, 8, floorY + 1, 18, 11, floorY + 1, 20, BlockId.Stone);

  for (let x = 8; x <= 12; x += 1) {
    denialSetBlock(voxels, x, floorY + 1, 36, BlockId.Air);
    denialSetBlock(voxels, x, floorY + 2, 36, BlockId.Air);
    denialSetBlock(voxels, x, floorY + 3, 36, BlockId.Air);
  }

  for (let z = 37; z < DENIAL_SIZE_Z - 2; z += 1) {
    for (let x = 6; x <= 14; x += 1) {
      denialSetBlock(voxels, x, floorY, z, BlockId.Grass);
    }
  }

  denialSetBlock(voxels, 10, floorY + 1, 38, BlockId.Wood);
  denialSetBlock(voxels, 9, floorY + 1, 39, BlockId.Wood);
  denialSetBlock(voxels, 11, floorY + 1, 39, BlockId.Wood);

  denialSetBlock(voxels, 18, floorY + 1, 32, BlockId.Grass);

  return voxels;
}

export function playerInExitZone(x: number, z: number): boolean {
  return (
    x >= DENIAL_EXIT_ZONE.minX &&
    x <= DENIAL_EXIT_ZONE.maxX &&
    z >= DENIAL_EXIT_ZONE.minZ &&
    z <= DENIAL_EXIT_ZONE.maxZ
  );
}

const FLOOR_Y = 4;

/** Top-down walkable map: true = wall (from 3D layout at chest height). */
export function buildDenial2dWallGrid(voxels: Uint8Array): boolean[][] {
  const grid: boolean[][] = [];
  for (let z = 0; z < DENIAL_SIZE_Z; z += 1) {
    const row: boolean[] = [];
    for (let x = 0; x < DENIAL_SIZE_X; x += 1) {
      const edge =
        x === 0 ||
        z === 0 ||
        x === DENIAL_SIZE_X - 1 ||
        z === DENIAL_SIZE_Z - 1;
      const blocked =
        edge || denialIsSolidAt(voxels, x, FLOOR_Y + 1, z);
      row.push(blocked);
    }
    grid.push(row);
  }
  return grid;
}

export function isDenial2dWall(
  grid: boolean[][],
  x: number,
  z: number,
): boolean {
  const tx = Math.floor(x);
  const tz = Math.floor(z);
  if (tz < 0 || tz >= grid.length) return true;
  if (tx < 0 || tx >= grid[0].length) return true;
  return grid[tz][tx];
}

export function moveDenialPlayer2d(
  player: DenialVec2,
  vx: number,
  vz: number,
  dt: number,
  grid: boolean[][],
  radius: number,
): DenialVec2 {
  const next = { ...player };
  const stepX = vx * dt;
  const stepZ = vz * dt;

  const tryPos = (px: number, pz: number) => {
    const points = [
      [px - radius, pz - radius],
      [px + radius, pz - radius],
      [px - radius, pz + radius],
      [px + radius, pz + radius],
    ];
    for (const [sx, sz] of points) {
      if (isDenial2dWall(grid, sx, sz)) return false;
    }
    return true;
  };

  if (tryPos(next.x + stepX, next.z)) {
    next.x += stepX;
  }
  if (tryPos(next.x, next.z + stepZ)) {
    next.z += stepZ;
  }

  return next;
}

export type DenialVec2 = { x: number; z: number };
