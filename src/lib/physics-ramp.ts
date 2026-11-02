export const GRAVITY = 9.81;
export const BALL_RADIUS_M = 0.2;
export const PIXELS_PER_METER = 96;
export const LANE_SPACING_M = BALL_RADIUS_M * 2.8;
export const MAX_RACE_BALLS = 5;
export const MIN_BALL_SEPARATION_M = BALL_RADIUS_M * 2.1;
export const VIEWPORT_WIDTH_M = 9;

export const DEFAULT_ANGLE_DEG = 30;
export const DEFAULT_FRICTION = 0.15;
export const DEFAULT_LENGTH_M = 8;

export const ANGLE_MIN_DEG = 5;
export const ANGLE_MAX_DEG = 60;
export const FRICTION_MIN = 0;
export const FRICTION_MAX = 0.5;
export const LENGTH_MIN_M = 2;
export const LENGTH_MAX_M = 16;

export type BallMaterialId = "steel" | "rubber" | "wood" | "plastic" | "brick";

export type BallMaterial = {
  id: BallMaterialId;
  label: string;
  shortLabel: string;
  densityKgM3: number;
  frictionMultiplier: number;
  color: string;
  highlight: string;
  outline: string;
  trailColor: string;
};

export const BALL_MATERIALS: Record<BallMaterialId, BallMaterial> = {
  steel: {
    id: "steel",
    label: "Steel",
    shortLabel: "St",
    densityKgM3: 7850,
    frictionMultiplier: 0.85,
    color: "#64748b",
    highlight: "#cbd5e1",
    outline: "#334155",
    trailColor: "#64748b",
  },
  rubber: {
    id: "rubber",
    label: "Rubber",
    shortLabel: "Rb",
    densityKgM3: 1100,
    frictionMultiplier: 1.35,
    color: "#1e293b",
    highlight: "#475569",
    outline: "#0f172a",
    trailColor: "#334155",
  },
  wood: {
    id: "wood",
    label: "Wood",
    shortLabel: "Wd",
    densityKgM3: 700,
    frictionMultiplier: 1.05,
    color: "#d97706",
    highlight: "#fcd34d",
    outline: "#92400e",
    trailColor: "#ea580c",
  },
  plastic: {
    id: "plastic",
    label: "Plastic",
    shortLabel: "Pl",
    densityKgM3: 950,
    frictionMultiplier: 0.95,
    color: "#06b6d4",
    highlight: "#a5f3fc",
    outline: "#0e7490",
    trailColor: "#0891b2",
  },
  brick: {
    id: "brick",
    label: "Brick",
    shortLabel: "Br",
    densityKgM3: 2000,
    frictionMultiplier: 1.15,
    color: "#dc2626",
    highlight: "#fca5a5",
    outline: "#991b1b",
    trailColor: "#ef4444",
  },
};

export type TrackPoint = { x: number; y: number };

export type TrackPath = {
  points: TrackPoint[];
  cumulative: number[];
  totalLength: number;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
};

export type TrackSample = {
  x: number;
  y: number;
  tangentX: number;
  tangentY: number;
  slopeAngleRad: number;
};

export type BallPhase = "alongTrack" | "finished" | "stopped";

export type RaceBall = {
  id: string;
  materialId: BallMaterialId;
  s: number;
  speed: number;
  phase: BallPhase;
  finishTime?: number;
  laneIndex: number;
};

export type SimConfig = {
  frictionMu: number;
  elapsedSimTime: number;
};

export type ViewportLayout = {
  scale: number;
  paddingTop: number;
  paddingLeft: number;
  viewportWidthM: number;
};

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function effectiveFriction(
  baseMu: number,
  materialId: BallMaterialId
): number {
  return Math.min(
    FRICTION_MAX * 1.5,
    baseMu * BALL_MATERIALS[materialId].frictionMultiplier
  );
}

export function sampleTrackAt(path: TrackPath, s: number): TrackSample {
  const total = path.totalLength;
  const clamped = Math.max(0, Math.min(s, total));
  const { points, cumulative } = path;

  if (points.length < 2) {
    return {
      x: 0,
      y: 0,
      tangentX: 1,
      tangentY: 0,
      slopeAngleRad: 0,
    };
  }

  let seg = 0;
  for (let i = 1; i < cumulative.length; i++) {
    if (clamped <= cumulative[i] || i === cumulative.length - 1) {
      seg = i - 1;
      break;
    }
  }

  const s0 = cumulative[seg];
  const s1 = cumulative[seg + 1];
  const segLen = Math.max(s1 - s0, 1e-6);
  const t = (clamped - s0) / segLen;
  const p0 = points[seg];
  const p1 = points[seg + 1];
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const len = Math.hypot(dx, dy) || 1;
  const tangentX = dx / len;
  const tangentY = dy / len;

  return {
    x: p0.x + dx * t,
    y: p0.y + dy * t,
    tangentX,
    tangentY,
    slopeAngleRad: Math.atan2(dy, dx),
  };
}

export function accelerationAlongTrack(
  sample: TrackSample,
  muEff: number
): number {
  const ty = sample.tangentY;
  const tx = sample.tangentX;
  const net = GRAVITY * (ty - muEff * Math.abs(tx));
  return (5 / 7) * net;
}

export function ballMassKg(materialId: BallMaterialId): number {
  const density = BALL_MATERIALS[materialId].densityKgM3;
  const volume = (4 / 3) * Math.PI * BALL_RADIUS_M ** 3;
  return density * volume;
}

export function createRaceBall(
  id: string,
  materialId: BallMaterialId,
  laneIndex: number
): RaceBall {
  return {
    id,
    materialId,
    s: BALL_RADIUS_M * 1.2,
    speed: 0,
    phase: "alongTrack",
    laneIndex,
  };
}

export function createRaceBalls(materialIds: BallMaterialId[]): RaceBall[] {
  return materialIds.map((materialId, i) =>
    createRaceBall(`ball-${i}-${materialId}`, materialId, i)
  );
}

export function computeViewportLayout(
  canvasWidth: number,
  canvasHeight: number,
  path: TrackPath
): ViewportLayout {
  const paddingTop = 56;
  const paddingLeft = 24;
  const paddingBottom = 48;
  const viewportWidthM = VIEWPORT_WIDTH_M;
  const trackHeightM =
    path.bounds.maxY - path.bounds.minY + BALL_RADIUS_M * 4;
  const availH = canvasHeight - paddingTop - paddingBottom;
  const availW = canvasWidth - paddingLeft * 2;
  const scaleH = availH / trackHeightM;
  const scaleW = availW / viewportWidthM;
  const scale = Math.min(scaleH, scaleW, PIXELS_PER_METER);
  return { scale, paddingTop, paddingLeft, viewportWidthM };
}

export function worldToScreen(
  xM: number,
  yM: number,
  layout: ViewportLayout,
  cameraXM: number,
  path: TrackPath
): { x: number; y: number } {
  const yOffset = path.bounds.minY - BALL_RADIUS_M * 0.5;
  return {
    x: layout.paddingLeft + (xM - cameraXM) * layout.scale,
    y: layout.paddingTop + (yM - yOffset) * layout.scale,
  };
}

export function laneOffsetM(laneIndex: number, laneCount: number): number {
  if (laneCount <= 1) return 0;
  return (laneIndex - (laneCount - 1) / 2) * LANE_SPACING_M;
}

export function positionOnLane(
  path: TrackPath,
  s: number,
  laneIndex: number,
  laneCount: number,
  includeBallRadius: boolean
): { x: number; y: number; sample: TrackSample } {
  const sample = sampleTrackAt(path, s);
  const nx = -sample.tangentY;
  const ny = sample.tangentX;
  const lateral = laneOffsetM(laneIndex, laneCount);
  const normalDist = lateral + (includeBallRadius ? BALL_RADIUS_M : 0);
  return {
    x: sample.x + nx * normalDist,
    y: sample.y + ny * normalDist,
    sample,
  };
}

export function ballCenterOnTrack(
  path: TrackPath,
  s: number,
  laneIndex: number,
  laneCount: number
): { x: number; y: number; sample: TrackSample } {
  return positionOnLane(path, s, laneIndex, laneCount, true);
}

export function tickRaceBall(
  ball: RaceBall,
  dt: number,
  path: TrackPath,
  frictionMu: number,
  simTime: number
): RaceBall {
  if (ball.phase === "finished" || ball.phase === "stopped") {
    return ball;
  }

  const muEff = effectiveFriction(frictionMu, ball.materialId);
  const sample = sampleTrackAt(path, ball.s);
  let a = accelerationAlongTrack(sample, muEff);
  let speed = ball.speed + a * dt;
  if (speed < 0) speed = 0;
  let s = ball.s + speed * dt;

  if (s >= path.totalLength - BALL_RADIUS_M * 0.2) {
    return {
      ...ball,
      s: path.totalLength,
      speed: 0,
      phase: "finished",
      finishTime: simTime,
    };
  }

  if (speed < 0.0005 && a <= 0 && s < path.totalLength - 0.5) {
    return { ...ball, s, speed: 0, phase: "stopped" };
  }

  return { ...ball, s, speed };
}

export function applyBallSeparation(balls: RaceBall[]): RaceBall[] {
  const sorted = [...balls].sort((a, b) => a.s - b.s);
  const next = sorted.map((b) => ({ ...b }));

  for (let i = 1; i < next.length; i++) {
    const prev = next[i - 1];
    const cur = next[i];
    if (prev.phase !== "alongTrack" || cur.phase !== "alongTrack") continue;
    const gap = cur.s - prev.s;
    if (gap < MIN_BALL_SEPARATION_M && cur.speed > prev.speed) {
      next[i] = { ...cur, speed: prev.speed };
    }
  }

  const byId = new Map(next.map((b) => [b.id, b]));
  return balls.map((b) => byId.get(b.id) ?? b);
}

export function tickAllRaceBalls(
  balls: RaceBall[],
  dt: number,
  path: TrackPath,
  frictionMu: number,
  simTime: number
): RaceBall[] {
  let updated = balls.map((b) =>
    tickRaceBall(b, dt, path, frictionMu, simTime + dt)
  );
  updated = applyBallSeparation(updated);
  return updated;
}

export function allBallsDone(balls: RaceBall[]): boolean {
  return balls.every(
    (b) => b.phase === "finished" || b.phase === "stopped"
  );
}

export function getRaceWinner(balls: RaceBall[]): RaceBall | null {
  const finished = balls
    .filter((b) => b.phase === "finished" && b.finishTime !== undefined)
    .sort((a, b) => (a.finishTime ?? 0) - (b.finishTime ?? 0));
  if (finished.length === 0) {
    const moving = [...balls].sort((a, b) => b.s - a.s);
    return moving[0] ?? null;
  }
  return finished[0];
}

export function willAnyBallMove(
  path: TrackPath,
  frictionMu: number,
  materialIds: BallMaterialId[]
): boolean {
  const sample = sampleTrackAt(path, BALL_RADIUS_M * 1.5);
  return materialIds.some((id) => {
    const muEff = effectiveFriction(frictionMu, id);
    return accelerationAlongTrack(sample, muEff) > 0;
  });
}

export type RaceResultReport = {
  title: string;
  bullets: string[];
  predictionCorrect: boolean | null;
  predictionLine: string | null;
};

export function buildRaceResultReport(
  winner: RaceBall,
  balls: RaceBall[],
  frictionMu: number,
  predictedId: string | null,
  trackPreset: "classic" | "hills" | "longRun"
): RaceResultReport {
  const winMat = BALL_MATERIALS[winner.materialId];
  const multi = balls.length >= 2;
  const finished = balls
    .filter((b) => b.phase === "finished")
    .sort((a, b) => (a.finishTime ?? 0) - (b.finishTime ?? 0));
  const runnerUp = finished.find((b) => b.id !== winner.id) ?? null;

  const winMu = effectiveFriction(frictionMu, winner.materialId);
  const bullets: string[] = [];

  if (multi) {
    bullets.push(
      `${winMat.label} reached the finish first with effective friction μ≈${winMu.toFixed(2)} (your slider × this material's grip).`
    );
  } else {
    bullets.push(
      `Gravity pulled your ${winMat.label} ball downhill along the track. Friction μ≈${winMu.toFixed(2)} slowed it where the track was flat or rough.`
    );
  }

  if (runnerUp) {
    const runMu = effectiveFriction(frictionMu, runnerUp.materialId);
    const runMat = BALL_MATERIALS[runnerUp.materialId];
    if (winMu < runMu) {
      bullets.push(
        `${winMat.label} had less grip than ${runMat.label} (μ≈${runMu.toFixed(2)}), so it lost less speed on flats and gentle slopes.`
      );
    } else if (winMu > runMu) {
      bullets.push(
        `${winMat.label} gripped more than ${runMat.label}, but the track shape still worked in its favor on the fastest parts of the course.`
      );
    } else {
      bullets.push(
        `${runMat.label} had similar grip — small differences in timing on hills and flats decided the race.`
      );
    }
  }

  bullets.push(
    "Weight did not change roll speed here: a heavy ball and a light one accelerate the same on the same slope. Only grip and track shape mattered."
  );

  if (trackPreset === "classic") {
    bullets.push(
      "On this ramp, the steep drop gave a big speed boost; the winner kept more of that speed through the flat finish."
    );
  } else if (trackPreset === "hills") {
    bullets.push(
      "On hills, balls speed up on drops and slow on climbs — less grip often helps on long flat sections after a hill."
    );
  } else {
    bullets.push(
      "On a long wavy track, many small speed changes add up — materials with the right grip for each slope won overall."
    );
  }

  const predictionCorrect =
    multi && predictedId !== null ? predictedId === winner.id : null;

  let predictionLine: string | null = null;
  if (multi && predictedId !== null) {
    predictionLine = predictionCorrect
      ? "Your prediction was correct!"
      : `Your guess was ${BALL_MATERIALS[balls.find((b) => b.id === predictedId)?.materialId ?? winner.materialId].label} — close, but physics had other plans.`;
  }

  const title = multi
    ? `${winMat.label} won the race!`
    : "Run complete!";

  return {
    title,
    bullets: bullets.slice(0, 4),
    predictionCorrect,
    predictionLine,
  };
}
