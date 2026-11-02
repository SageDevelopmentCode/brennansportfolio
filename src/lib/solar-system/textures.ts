import type { BodyId } from "@/lib/solar-system/bodies";

export const TEXTURE_ANISOTROPY = 4;

const TEXTURE_BASE = "/solar-system/textures";

export const BODY_TEXTURE_URL: Record<BodyId, string> = {
  sun: `${TEXTURE_BASE}/sun.jpg`,
  mercury: `${TEXTURE_BASE}/mercury.jpg`,
  venus: `${TEXTURE_BASE}/venus.jpg`,
  earth: `${TEXTURE_BASE}/earth.jpg`,
  mars: `${TEXTURE_BASE}/mars.jpg`,
  jupiter: `${TEXTURE_BASE}/jupiter.jpg`,
  saturn: `${TEXTURE_BASE}/saturn.jpg`,
  uranus: `${TEXTURE_BASE}/uranus.jpg`,
  neptune: `${TEXTURE_BASE}/neptune.jpg`,
};

export const SATURN_RING_URL = `${TEXTURE_BASE}/saturn_ring.png`;
export const EARTH_CLOUDS_URL = `${TEXTURE_BASE}/earth_clouds.png`;

export const ALL_SOLAR_TEXTURE_URLS = [
  ...Object.values(BODY_TEXTURE_URL),
  SATURN_RING_URL,
  EARTH_CLOUDS_URL,
];

export type BodyMaterialProps = {
  roughness: number;
  metalness: number;
};

export const BODY_MATERIAL_PROPS: Record<BodyId, BodyMaterialProps> = {
  sun: { roughness: 0.85, metalness: 0 },
  mercury: { roughness: 0.95, metalness: 0.05 },
  venus: { roughness: 0.9, metalness: 0.02 },
  earth: { roughness: 0.65, metalness: 0.05 },
  mars: { roughness: 0.92, metalness: 0.03 },
  jupiter: { roughness: 0.55, metalness: 0.08 },
  saturn: { roughness: 0.5, metalness: 0.1 },
  uranus: { roughness: 0.45, metalness: 0.12 },
  neptune: { roughness: 0.4, metalness: 0.15 },
};
