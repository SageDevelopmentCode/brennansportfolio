import type { StageDefinition } from "@/lib/hill-climb/types";
import type { Body } from "matter-js";

export const CHUNK_WIDTH = 1200;
export const GROUND_DEPTH = 400;
/** Physics/render sample spacing along X (smaller = smoother mesh, more vertices) */
export const SAMPLE_STEP = 12;

/** Flat run-up before the first hill (world px) */
const FLAT_START_X = 260;
const FLAT_BLEND_END_X = 1100;
/** Hills grow taller over this distance (world px), like later sections of a real run */
const DIFFICULTY_RAMP_PX = 55_000;
const DIFFICULTY_RAMP_MAX = 1.35;

const FEATURE_START_X = 400;

export function seededNoise(seed: number, x: number): number {
  const s = Math.sin(x * 0.017 + seed * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

function hash1(seed: number, i: number): number {
  const s = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Smooth 1D value noise in [0, 1] */
function valueNoise(seed: number, x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash1(seed, i) * (1 - u) + hash1(seed, i + 1) * u;
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function featureKey(seed: number, x: number): number {
  return Math.floor(x / 900) + Math.floor(seed * 17);
}

/** Seeded course features blended into height (same function for physics + draw) */
function terrainFeatureOffset(x: number, seed: number, amp: number): number {
  if (x < FEATURE_START_X) return 0;
  const k = featureKey(seed, x);
  const r1 = hash1(seed + 91, k);
  const r2 = hash1(seed + 193, k);
  const cx = k * 900 + 450 + (r1 - 0.5) * 200;
  const kind = Math.floor(r2 * 3);
  const width = 220 + r1 * 180;
  const t = smoothstep(cx - width, cx, x) * (1 - smoothstep(cx, cx + width, x));
  if (t <= 0) return 0;
  if (kind === 0) {
    const lip = smoothstep(cx - width * 0.3, cx - width * 0.05, x);
    return -amp * 0.35 * t * lip;
  }
  if (kind === 1) {
    return amp * 0.25 * t;
  }
  return -amp * 0.22 * t * Math.sin((x - cx) * 0.04);
}

export function terrainHeightAt(x: number, stage: StageDefinition, seed: number): number {
  const { amplitude, frequency, roughness } = stage.terrain;
  const ramp = 1 + Math.min(DIFFICULTY_RAMP_MAX, Math.max(0, x) / DIFFICULTY_RAMP_PX);
  const amp = amplitude * ramp * smoothstep(FLAT_START_X, FLAT_BLEND_END_X, x);
  const base =
    Math.sin(x * frequency * 0.55) * amp * 0.62 +
    Math.sin(x * frequency * 1.4 + 1.2) * amp * 0.22 +
    Math.sin(x * frequency * 0.28) * amp * 0.28;
  const bumps =
    (valueNoise(seed, x / 200) - 0.5) * amp * roughness +
    (valueNoise(seed + 17, x / 90) - 0.5) * amp * roughness * 0.25;
  const feature = terrainFeatureOffset(x, seed, amp);
  return base + bumps + feature;
}

export function buildChunkSurfacePoints(
  chunkIndex: number,
  stage: StageDefinition,
  seed: number
): { x: number; y: number }[] {
  const startX = chunkIndex * CHUNK_WIDTH;
  const endX = startX + CHUNK_WIDTH;
  const top: { x: number; y: number }[] = [];
  for (let x = startX; x <= endX; x += SAMPLE_STEP) {
    top.push({ x, y: terrainHeightAt(x, stage, seed) });
  }
  return top;
}

export function surfaceYAt(x: number, stage: StageDefinition, seed: number): number {
  return terrainHeightAt(x, stage, seed);
}

/**
 * Static terrain slab for one surface sample pair — top edge on a→b, extruded downward (+Y)
 * to match draw.ts. Vertices are placed via body centre so Matter does not collapse the
 * chunk at the origin.
 */
export function createTerrainSegmentBody(
  matter: typeof import("matter-js"),
  a: { x: number; y: number },
  b: { x: number; y: number },
  depth: number,
  options: { friction?: number; frictionStatic?: number; label?: string }
): Body | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 0.5) return null;

  const verts = [
    { x: a.x, y: a.y },
    { x: b.x, y: b.y },
    { x: b.x, y: b.y + depth },
    { x: a.x, y: a.y + depth },
  ];
  const { Bodies, Vertices } = matter;
  const centre = Vertices.centre(verts);
  const relative = verts.map((v) => ({ x: v.x - centre.x, y: v.y - centre.y }));
  const body = Bodies.fromVertices(centre.x, centre.y, [relative], {
    friction: options.friction,
    frictionStatic: options.frictionStatic,
    label: options.label,
    isStatic: true,
  });
  return body ?? null;
}

export function isValidTerrainBody(body: Body | null | undefined): body is Body {
  if (!body) return false;
  const w = body.bounds.max.x - body.bounds.min.x;
  const h = body.bounds.max.y - body.bounds.min.y;
  return w >= 1 && h >= 1;
}

/** Slope angle (radians): positive = ground drops to the right on screen (y grows down) */
export function surfaceAngleAt(x: number, stage: StageDefinition, seed: number): number {
  const sample = 10;
  const y1 = terrainHeightAt(x - sample, stage, seed);
  const y2 = terrainHeightAt(x + sample, stage, seed);
  return Math.atan2(y2 - y1, sample * 2);
}

/** Surface slope dy/dx for shading */
export function surfaceSlopeAt(x: number, stage: StageDefinition, seed: number): number {
  const sample = 12;
  const y1 = terrainHeightAt(x - sample, stage, seed);
  const y2 = terrainHeightAt(x + sample, stage, seed);
  return (y2 - y1) / (sample * 2);
}
