import { degToRad } from "@/lib/physics-ramp";
import type { TrackPath } from "@/lib/physics-ramp";

export type TrackPresetId = "classic" | "hills" | "longRun";

export const TRACK_PRESETS: { id: TrackPresetId; label: string }[] = [
  { id: "classic", label: "Classic ramp" },
  { id: "hills", label: "Hills" },
  { id: "longRun", label: "Long run" },
];

const FLAT_RUNOUT_M = 6;

export function buildClassicTrack(angleDeg: number, lengthM: number): TrackPath {
  const theta = degToRad(angleDeg);
  const footX = lengthM * Math.cos(theta);
  const footY = lengthM * Math.sin(theta);
  return createTrackFromPoints([
    { x: 0, y: 0 },
    { x: footX, y: footY },
    { x: footX + FLAT_RUNOUT_M, y: footY },
  ]);
}

function createTrackFromPoints(
  points: { x: number; y: number }[]
): TrackPath {
  const cumulative: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    cumulative.push(cumulative[i - 1] + Math.hypot(dx, dy));
  }
  const totalLength = cumulative[cumulative.length - 1] ?? 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  return {
    points,
    cumulative,
    totalLength,
    bounds: { minX, maxX, minY, maxY },
  };
}

/** ~32 m rolling hills */
export function buildHillsTrack(): TrackPath {
  return createTrackFromPoints([
    { x: 0, y: 0 },
    { x: 5, y: 3 },
    { x: 10, y: 1 },
    { x: 15, y: 4 },
    { x: 20, y: 1.5 },
    { x: 25, y: 3.5 },
    { x: 30, y: 2 },
    { x: 32, y: 2 },
  ]);
}

/** ~60 m wavy course */
export function buildLongRunTrack(): TrackPath {
  return createTrackFromPoints([
    { x: 0, y: 0 },
    { x: 6, y: 1.5 },
    { x: 12, y: 0.4 },
    { x: 18, y: 3.5 },
    { x: 24, y: 2 },
    { x: 30, y: 5 },
    { x: 36, y: 2.8 },
    { x: 42, y: 4.5 },
    { x: 48, y: 3 },
    { x: 54, y: 4 },
    { x: 60, y: 3.2 },
  ]);
}

export function getTrackForPreset(
  preset: TrackPresetId,
  angleDeg: number,
  lengthM: number
): TrackPath {
  switch (preset) {
    case "classic":
      return buildClassicTrack(angleDeg, lengthM);
    case "hills":
      return buildHillsTrack();
    case "longRun":
      return buildLongRunTrack();
  }
}
