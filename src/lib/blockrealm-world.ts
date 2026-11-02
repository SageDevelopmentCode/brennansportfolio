export const CHUNK_SIZE_X = 16;
export const CHUNK_SIZE_Y = 12;
export const CHUNK_SIZE_Z = 16;
export const CHUNK_VOLUME = CHUNK_SIZE_X * CHUNK_SIZE_Y * CHUNK_SIZE_Z;

export const STORAGE_KEY = "blockrealm-world";
export const SAVE_VERSION = 1;

export const BlockId = {
  Air: 0,
  Grass: 1,
  Dirt: 2,
  Stone: 3,
  Wood: 4,
  Sand: 5,
  Water: 6,
  Bedrock: 7,
} as const;

export type BlockId = (typeof BlockId)[keyof typeof BlockId];

export type BlockDef = {
  id: Exclude<BlockId, 0>;
  name: string;
  color: string;
  solid: boolean;
  breakable: boolean;
  transparent: boolean;
};

export const BLOCK_DEFS: readonly BlockDef[] = [
  {
    id: BlockId.Grass,
    name: "Grass",
    color: "#5aa344",
    solid: true,
    breakable: true,
    transparent: false,
  },
  {
    id: BlockId.Dirt,
    name: "Dirt",
    color: "#8d6e4c",
    solid: true,
    breakable: true,
    transparent: false,
  },
  {
    id: BlockId.Stone,
    name: "Stone",
    color: "#8a8f99",
    solid: true,
    breakable: true,
    transparent: false,
  },
  {
    id: BlockId.Wood,
    name: "Wood",
    color: "#c0844a",
    solid: true,
    breakable: true,
    transparent: false,
  },
  {
    id: BlockId.Sand,
    name: "Sand",
    color: "#e8d48b",
    solid: true,
    breakable: true,
    transparent: false,
  },
  {
    id: BlockId.Water,
    name: "Water",
    color: "#3b82c4",
    solid: false,
    breakable: true,
    transparent: true,
  },
  {
    id: BlockId.Bedrock,
    name: "Bedrock",
    color: "#3d3a3a",
    solid: true,
    breakable: false,
    transparent: false,
  },
];

export const HOTBAR_BLOCKS: readonly Exclude<BlockId, 0 | 7>[] = [
  BlockId.Grass,
  BlockId.Dirt,
  BlockId.Stone,
  BlockId.Wood,
  BlockId.Sand,
  BlockId.Water,
];

const BLOCK_BY_ID: Record<number, BlockDef | undefined> = Object.fromEntries(
  BLOCK_DEFS.map((def) => [def.id, def]),
);

export type SavedWorld = {
  version: number;
  size: { x: number; y: number; z: number };
  blocks: Array<[number, number, number, number]>;
  selectedBlock: BlockId;
  showCoords: boolean;
};

export function voxelIndex(x: number, y: number, z: number): number {
  return y * CHUNK_SIZE_X * CHUNK_SIZE_Z + z * CHUNK_SIZE_X + x;
}

export function inBounds(x: number, y: number, z: number): boolean {
  return (
    x >= 0 &&
    y >= 0 &&
    z >= 0 &&
    x < CHUNK_SIZE_X &&
    y < CHUNK_SIZE_Y &&
    z < CHUNK_SIZE_Z
  );
}

export function createEmptyWorld(): Uint8Array {
  return new Uint8Array(CHUNK_VOLUME);
}

export function generateFlatWorld(): Uint8Array {
  const voxels = createEmptyWorld();

  for (let z = 0; z < CHUNK_SIZE_Z; z += 1) {
    for (let x = 0; x < CHUNK_SIZE_X; x += 1) {
      voxels[voxelIndex(x, 0, z)] = BlockId.Bedrock;
      voxels[voxelIndex(x, 1, z)] = BlockId.Stone;
      voxels[voxelIndex(x, 2, z)] = BlockId.Stone;
      voxels[voxelIndex(x, 3, z)] = BlockId.Dirt;
      voxels[voxelIndex(x, 4, z)] = BlockId.Grass;
    }
  }

  return voxels;
}

export function getBlock(
  voxels: Uint8Array,
  x: number,
  y: number,
  z: number,
): BlockId {
  if (!inBounds(x, y, z)) return BlockId.Air;
  return voxels[voxelIndex(x, y, z)] as BlockId;
}

export function setBlock(
  voxels: Uint8Array,
  x: number,
  y: number,
  z: number,
  id: BlockId,
): boolean {
  if (!inBounds(x, y, z)) return false;
  voxels[voxelIndex(x, y, z)] = id;
  return true;
}

export function getBlockDef(id: number): BlockDef | undefined {
  return BLOCK_BY_ID[id];
}

export function isSolidBlock(id: number): boolean {
  return BLOCK_BY_ID[id]?.solid ?? false;
}

export function isBreakableBlock(id: number): boolean {
  return BLOCK_BY_ID[id]?.breakable ?? false;
}

export function isSolidAt(
  voxels: Uint8Array,
  x: number,
  y: number,
  z: number,
): boolean {
  return isSolidBlock(getBlock(voxels, x, y, z));
}

export function serializeWorld(
  voxels: Uint8Array,
  selectedBlock: BlockId,
  showCoords: boolean,
): SavedWorld {
  const blocks: SavedWorld["blocks"] = [];

  for (let y = 0; y < CHUNK_SIZE_Y; y += 1) {
    for (let z = 0; z < CHUNK_SIZE_Z; z += 1) {
      for (let x = 0; x < CHUNK_SIZE_X; x += 1) {
        const id = voxels[voxelIndex(x, y, z)];
        if (id !== BlockId.Air) {
          blocks.push([x, y, z, id]);
        }
      }
    }
  }

  return {
    version: SAVE_VERSION,
    size: { x: CHUNK_SIZE_X, y: CHUNK_SIZE_Y, z: CHUNK_SIZE_Z },
    blocks,
    selectedBlock,
    showCoords,
  };
}

export function deserializeWorld(saved: SavedWorld): Uint8Array | null {
  if (
    saved.size.x !== CHUNK_SIZE_X ||
    saved.size.y !== CHUNK_SIZE_Y ||
    saved.size.z !== CHUNK_SIZE_Z
  ) {
    return null;
  }

  const voxels = createEmptyWorld();

  for (const entry of saved.blocks) {
    const [x, y, z, id] = entry;
    if (!inBounds(x, y, z)) continue;
    if (id === BlockId.Air || !BLOCK_BY_ID[id]) continue;
    voxels[voxelIndex(x, y, z)] = id;
  }

  return voxels;
}

function isPlaceableId(id: number): id is BlockId {
  return HOTBAR_BLOCKS.includes(id as (typeof HOTBAR_BLOCKS)[number]);
}

export function loadSavedState(): {
  voxels: Uint8Array;
  selectedBlock: BlockId;
  showCoords: boolean;
} | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedWorld>;
    if (parsed.version !== SAVE_VERSION || !parsed.size || !parsed.blocks) {
      return null;
    }

    const voxels = deserializeWorld({
      version: parsed.version,
      size: parsed.size,
      blocks: parsed.blocks,
      selectedBlock: parsed.selectedBlock ?? BlockId.Grass,
      showCoords: parsed.showCoords ?? false,
    });
    if (!voxels) return null;

    return {
      voxels,
      selectedBlock: isPlaceableId(parsed.selectedBlock ?? BlockId.Grass)
        ? parsed.selectedBlock!
        : BlockId.Grass,
      showCoords: Boolean(parsed.showCoords),
    };
  } catch {
    return null;
  }
}

export function saveWorldState(
  voxels: Uint8Array,
  selectedBlock: BlockId,
  showCoords: boolean,
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(serializeWorld(voxels, selectedBlock, showCoords)),
  );
}
