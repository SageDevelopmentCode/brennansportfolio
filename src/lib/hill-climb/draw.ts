import { drawLandingRing, drawOutlinedText, shadeHex } from "@/lib/hill-climb/art";
import { getStageById } from "@/lib/hill-climb/stages";
import {
  buildChunkSurfacePoints,
  CHUNK_WIDTH,
  surfaceSlopeAt,
  terrainHeightAt,
} from "@/lib/hill-climb/terrain";
import { DEBUG_DRAW_PHYSICS_SURFACE, METERS_PER_PIXEL } from "@/lib/hill-climb/tuning";
import type { HillClimbEngine, WheelRender } from "@/lib/hill-climb/engine";
import type { PickupKind, StageHazardKind } from "@/lib/hill-climb/types";
import { drawVehicleScene, drawStageThumbnail, drawVehiclePreview, exhaustLocal } from "@/lib/hill-climb/vehicleDraw";
import { getVehicleById } from "@/lib/hill-climb/vehicles";

export { drawStageThumbnail, drawVehiclePreview };

type Puff = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number };

type CanvasBonus = { text: string; x: number; y: number; born: number; life: number };

const dustPuffs: Puff[] = [];
const exhaustPuffs: Puff[] = [];
const canvasBonuses: CanvasBonus[] = [];
let collectTexts: { text: string; x: number; y: number; until: number }[] = [];

export function resetDriveFx(): void {
  dustPuffs.length = 0;
  exhaustPuffs.length = 0;
  canvasBonuses.length = 0;
  collectTexts = [];
}

export function pushCanvasBonus(text: string, x: number, y: number): void {
  canvasBonuses.push({ text, x, y, born: performance.now(), life: 1400 });
  if (canvasBonuses.length > 8) canvasBonuses.shift();
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cameraX: number,
  cameraY: number,
  stageId: string,
  engine: HillClimbEngine,
  vehicleId: string,
  seed: number,
  shakeX = 0,
  shakeY = 0,
  gasDown = false,
  landingImpact = 0,
  bestDistanceM = 0,
  zoom = 1
) {
  const stage = getStageById(stageId);
  drawSky(ctx, width, height, stage.sky.top, stage.sky.bottom, stageId);
  drawSunOrMoon(ctx, width, stageId);
  drawClouds(ctx, width, cameraX);
  drawFarHills(ctx, width, height, cameraX, stageId, seed);
  drawMidgroundProps(ctx, width, height, cameraX, stageId, stage, seed);
  drawHaze(ctx, width, height);

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-width / 2, -height / 2);
  ctx.translate(-cameraX + shakeX, -cameraY + shakeY);

  const viewLeft = cameraX - 40;
  const viewRight = cameraX + width / zoom + 80;
  const startChunk = Math.floor(viewLeft / CHUNK_WIDTH) - 1;
  const endChunk = Math.floor(viewRight / CHUNK_WIDTH) + 1;
  const hazards = engine.getHazardsForRender();

  for (let ci = startChunk; ci <= endChunk; ci++) {
    drawGroundChunk(ctx, ci, stage, seed, height, cameraY);
    drawSurfaceDecor(ctx, ci, stageId, stage, seed);
  }

  for (let ci = startChunk; ci <= endChunk; ci++) {
    drawProps(ctx, ci, stageId, stage, seed, cameraY, hazards);
    drawGrassBlades(ctx, ci, stage, seed, hazards, stageId);
  }

  drawForegroundTufts(ctx, width, height, cameraX, cameraY, stage, seed);

  if (DEBUG_DRAW_PHYSICS_SURFACE) {
    ctx.strokeStyle = "rgba(255, 0, 80, 0.85)";
    ctx.lineWidth = 2;
    for (let ci = startChunk; ci <= endChunk; ci++) {
      const pts = buildChunkSurfacePoints(ci, stage, seed);
      ctx.beginPath();
      pts.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    }
  }

  if (bestDistanceM > 20) {
    const flagX = engine.getStartX() + bestDistanceM / METERS_PER_PIXEL;
    if (flagX > viewLeft && flagX < viewRight) {
      drawRecordFlag(ctx, flagX, terrainHeightAt(flagX, stage, seed));
    }
  }

  for (const hz of hazards) {
    drawHazard(ctx, hz.kind, hz.x, hz.y, hz.w, hz.h);
  }

  const now = performance.now();
  for (const fx of engine.getCollectFx(now)) {
    drawCollectFx(ctx, fx.x, fx.y, fx.kind, fx.t, fx.value);
  }
  for (const pickup of engine.getPickups()) {
    const p = pickup.body.position;
    const bob = Math.sin(now / 180 + p.x) * 3.5;
    drawPickup(ctx, p.x, p.y + bob, pickup.kind, pickup.value);
  }

  const wheels = engine.getWheelRenderState();
  const pos = engine.getChassisPosition();
  const visual = engine.getVisualState(gasDown);
  const dustColor = dustColorForStage(stageId);
  stepDust(wheels, engine, gasDown, landingImpact);
  stepExhaust(pos.x, pos.y, pos.angle, gasDown, vehicleId, visual.upgradeLevels.engine ?? 0);
  drawPuffs(ctx, dustPuffs, dustColor);
  drawPuffs(ctx, exhaustPuffs, "rgba(60, 60, 60, 0.45)");

  if (landingImpact > 0.15) {
    drawLandingRing(ctx, pos.x, pos.y + 20, Math.min(1, landingImpact));
  }

  drawVehicleScene(
    ctx,
    pos.x,
    pos.y,
    pos.angle,
    pos.angularVelocity,
    vehicleId,
    wheels,
    engine.getRagdollRender(),
    visual
  );

  drawCanvasBonuses(ctx, cameraX, cameraY, now);
  drawCollectTexts(ctx, now);

  ctx.restore();
}

function drawMidgroundProps(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cameraX: number,
  stageId: string,
  stage: ReturnType<typeof getStageById>,
  seed: number
) {
  const factor = 0.65;
  for (let i = 0; i < 4; i++) {
    const wx = cameraX * factor + i * 420 + (seed % 97);
    const sx = wx - cameraX + width * 0.5;
    if (sx < -60 || sx > width + 60) continue;
    const y = height * 0.62 + Math.sin(i + seed) * 8;
    if (stageId === "countryside" && i === 0) {
      ctx.fillStyle = "#8b4513";
      ctx.fillRect(sx - 28, y - 40, 56, 36);
      ctx.fillStyle = "#b91c1c";
      ctx.beginPath();
      ctx.moveTo(sx - 34, y - 40);
      ctx.lineTo(sx, y - 58);
      ctx.lineTo(sx + 34, y - 40);
      ctx.closePath();
      ctx.fill();
    } else if (stageId === "desert" && i === 1) {
      ctx.fillStyle = "#a16207";
      ctx.fillRect(sx - 40, y - 50, 80, 50);
    } else if (stageId === "forest" || stageId === "countryside") {
      drawTree(ctx, sx, y + 20, 0.85);
    }
  }
}

function drawSurfaceDecor(
  ctx: CanvasRenderingContext2D,
  chunkIndex: number,
  stageId: string,
  stage: ReturnType<typeof getStageById>,
  seed: number
) {
  const x0 = chunkIndex * CHUNK_WIDTH;
  if (stageId === "highway") {
    ctx.strokeStyle = "rgba(255,255,220,0.85)";
    ctx.lineWidth = 2;
    ctx.setLineDash([18, 16]);
    for (let x = x0; x < x0 + CHUNK_WIDTH; x += 4) {
      const y = terrainHeightAt(x, stage, seed) + 6;
      if (x % 34 === 0) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 14, y);
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);
    return;
  }
  if (stageId === "desert" || stageId === "beach") {
    ctx.strokeStyle = "rgba(180, 140, 90, 0.35)";
    ctx.lineWidth = 1;
    for (let x = x0 + 10; x < x0 + CHUNK_WIDTH; x += 24) {
      const y = terrainHeightAt(x, stage, seed);
      ctx.beginPath();
      ctx.moveTo(x, y + 2);
      ctx.quadraticCurveTo(x + 6, y + 5, x + 12, y + 2);
      ctx.stroke();
    }
  }
  if (stageId === "moon" || stageId === "space") {
    ctx.fillStyle = "rgba(100,100,110,0.5)";
    for (let i = 0; i < 3; i++) {
      const x = x0 + chunkRand(seed, chunkIndex, i + 20) * CHUNK_WIDTH;
      const y = terrainHeightAt(x, stage, seed);
      ctx.beginPath();
      ctx.arc(x, y + 8, 8 + i * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawForegroundTufts(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cameraX: number,
  cameraY: number,
  stage: ReturnType<typeof getStageById>,
  seed: number
) {
  ctx.save();
  ctx.globalAlpha = 0.3;
  const bottom = cameraY + height - 20;
  for (let i = 0; i < 10; i++) {
    const x = cameraX + i * 95 + (seed % 40) - 40;
    if (x < cameraX - 20 || x > cameraX + width / 1 + 20) continue;
    ctx.strokeStyle = shadeHex(stage.ground.grass, -25);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, bottom);
    ctx.lineTo(x - 5, bottom - 12);
    ctx.moveTo(x, bottom);
    ctx.lineTo(x + 5, bottom - 9);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSky(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  top: string,
  bottom: string,
  stageId: string
) {
  const dark = ["cave", "moon", "space", "arctic-cave"].includes(stageId);
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, shadeHex(top, dark ? -10 : -36));
  grad.addColorStop(0.55, top);
  grad.addColorStop(1, dark ? bottom : "#f6d7a8");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

function drawSunOrMoon(ctx: CanvasRenderingContext2D, width: number, stageId: string) {
  const dark = ["cave", "moon", "space", "arctic-cave"].includes(stageId);
  const x = width - 78;
  const y = 58;
  if (dark) {
    ctx.fillStyle = "#e8eef5";
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = stageId === "cave" ? "#1a1a1a" : "#0b1020";
    ctx.beginPath();
    ctx.arc(x + 7, y - 3, 14, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const glow = ctx.createRadialGradient(x, y, 4, x, y, 70);
  glow.addColorStop(0, "rgba(255, 236, 170, 0.95)");
  glow.addColorStop(0.35, "rgba(255, 196, 90, 0.35)");
  glow.addColorStop(1, "rgba(255, 196, 90, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffe08a";
  ctx.beginPath();
  ctx.arc(x, y, 18, 0, Math.PI * 2);
  ctx.fill();
}

function drawCloudBlob(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  const blobs = [
    [0, 0, 28, 16],
    [22, 4, 22, 13],
    [-20, 5, 18, 12],
    [8, -8, 16, 12],
  ];
  for (const [ox, oy, rx, ry] of blobs) {
    ctx.beginPath();
    ctx.ellipse(x + ox * s, y + oy * s, rx * s, ry * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function dustColorForStage(stageId: string): string {
  if (stageId === "desert" || stageId === "beach" || stageId === "mars") return "rgba(194, 154, 108, 0.4)";
  if (stageId === "arctic" || stageId === "arctic-cave") return "rgba(230, 240, 255, 0.45)";
  if (stageId === "moon" || stageId === "space") return "rgba(140, 140, 150, 0.35)";
  if (stageId === "highway") return "rgba(80, 80, 80, 0.3)";
  return "rgba(120, 90, 50, 0.38)";
}

function drawCanvasBonuses(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, now: number) {
  for (let i = canvasBonuses.length - 1; i >= 0; i--) {
    const b = canvasBonuses[i];
    const t = (now - b.born) / b.life;
    if (t >= 1) {
      canvasBonuses.splice(i, 1);
      continue;
    }
    const alpha = 1 - t;
    const y = b.y - t * 48;
    drawOutlinedText(ctx, b.text, b.x, y, 18 + (1 - t) * 4, alpha);
  }
}

function drawCollectTexts(ctx: CanvasRenderingContext2D, now: number) {
  collectTexts = collectTexts.filter((c) => c.until > now);
  for (const c of collectTexts) {
    const t = (c.until - now) / 160;
    drawOutlinedText(ctx, c.text, c.x, c.y - (1 - t) * 20, 14, Math.min(1, t));
  }
}

function drawClouds(ctx: CanvasRenderingContext2D, width: number, cameraX: number) {
  const layer = { factor: 0.15, y: 64, scale: 1, count: 6, gap: 240 };
  const span = layer.gap * layer.count;
  for (let i = 0; i < layer.count; i++) {
    const base = i * layer.gap;
    const x = ((base - cameraX * layer.factor) % span + span) % span - 40;
    if (x > width + 80) continue;
    drawCloudBlob(ctx, x, layer.y + (i % 2) * 12, layer.scale);
  }
}

function drawFarHills(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cameraX: number,
  stageId: string,
  seed: number
) {
  const desert = stageId === "desert" || stageId === "beach" || stageId === "mars";
  const seasonBand =
    stageId === "seasons" ? Math.sin(cameraX * 0.0008 + seed) * 0.5 + 0.5 : 0.5;
  const layers = [
    {
      factor: 0.35,
      color: desert ? "#d7a15a" : seasonBand > 0.66 ? "#7ea85a" : seasonBand > 0.33 ? "#6f93b4" : "#9ca3af",
      base: 0.58,
      amp: 28,
      freq: 0.007,
    },
    {
      factor: 0.35,
      color: desert ? "#c4843a" : "#6f93b4",
      base: 0.72,
      amp: 22,
      freq: 0.011,
    },
  ];
  for (const layer of layers) {
    ctx.fillStyle = layer.color;
    ctx.beginPath();
    const ox = cameraX * layer.factor;
    for (let x = -20; x <= width + 20; x += 10) {
      const y = height * layer.base + Math.sin((x + ox) * layer.freq) * layer.amp + Math.sin((x + ox) * 0.02) * 8;
      if (x === -20) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(width + 20, height);
    ctx.lineTo(-20, height);
    ctx.closePath();
    ctx.fill();
  }
}

function drawHaze(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const haze = ctx.createLinearGradient(0, height * 0.52, 0, height * 0.78);
  haze.addColorStop(0, "rgba(255,255,255,0)");
  haze.addColorStop(1, "rgba(255,244,220,0.35)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, height * 0.52, width, height * 0.26);
}

function drawGroundChunk(
  ctx: CanvasRenderingContext2D,
  chunkIndex: number,
  stage: ReturnType<typeof getStageById>,
  seed: number,
  viewHeight: number,
  cameraY: number
) {
  const x0 = chunkIndex * CHUNK_WIDTH;
  const x1 = x0 + CHUNK_WIDTH;
  const samples: { x: number; y: number }[] = [];
  for (let x = x0; x <= x1; x += 8) {
    samples.push({ x, y: terrainHeightAt(x, stage, seed) });
  }
  const floorY = cameraY + viewHeight + 200;

  ctx.beginPath();
  samples.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.lineTo(x1, floorY);
  ctx.lineTo(x0, floorY);
  ctx.closePath();
  const dirtGrad = ctx.createLinearGradient(0, samples[0]?.y ?? 0, 0, floorY);
  dirtGrad.addColorStop(0, stage.ground.dirt);
  dirtGrad.addColorStop(1, shadeHex(stage.ground.dirt, -35));
  ctx.fillStyle = dirtGrad;
  ctx.fill();

  for (let i = 0; i < samples.length - 1; i++) {
    const slope = surfaceSlopeAt(samples[i].x, stage, seed);
    if (slope > 0.02) {
      ctx.fillStyle = "rgba(0,0,0,0.06)";
      ctx.fillRect(samples[i].x, samples[i].y, samples[i + 1].x - samples[i].x, 24);
    }
  }

  ctx.beginPath();
  samples.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y + 16) : ctx.lineTo(p.x, p.y + 16)));
  for (let i = samples.length - 1; i >= 0; i--) ctx.lineTo(samples[i].x, samples[i].y + 34);
  ctx.closePath();
  ctx.fillStyle = shadeHex(stage.ground.dirt, -28);
  ctx.fill();

  ctx.beginPath();
  samples.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  for (let i = samples.length - 1; i >= 0; i--) ctx.lineTo(samples[i].x, samples[i].y + 18);
  ctx.closePath();
  ctx.fillStyle = stage.ground.grass;
  ctx.fill();

  ctx.beginPath();
  samples.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y + 14) : ctx.lineTo(p.x, p.y + 14)));
  for (let i = samples.length - 1; i >= 0; i--) ctx.lineTo(samples[i].x, samples[i].y + 18);
  ctx.closePath();
  ctx.fillStyle = shadeHex(stage.ground.grass, -35);
  ctx.fill();

  ctx.beginPath();
  samples.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  for (let i = samples.length - 1; i >= 0; i--) ctx.lineTo(samples[i].x, samples[i].y + 4);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.fill();
}

function nearHazard(x: number, hazards: { x: number; w: number }[]): boolean {
  return hazards.some((h) => Math.abs(h.x - x) < h.w * 0.6 + 12);
}

function drawGrassBlades(
  ctx: CanvasRenderingContext2D,
  chunkIndex: number,
  stage: ReturnType<typeof getStageById>,
  seed: number,
  hazards: { x: number; w: number }[],
  stageId: string
) {
  if (!["countryside", "seasons", "forest", "mountain", "boot-camp"].includes(stageId)) return;
  const x0 = chunkIndex * CHUNK_WIDTH;
  ctx.strokeStyle = shadeHex(stage.ground.grass, -30);
  ctx.lineWidth = 1.5;
  for (let x = x0 + 20; x < x0 + CHUNK_WIDTH; x += 90) {
    if (nearHazard(x, hazards)) continue;
    const y = terrainHeightAt(x, stage, seed);
    for (let b = 0; b < 3; b++) {
      const bx = x + b * 5 - 5;
      ctx.beginPath();
      ctx.moveTo(bx, y);
      ctx.lineTo(bx + (b - 1) * 2, y - 8 - b);
      ctx.stroke();
    }
  }
}

function chunkRand(seed: number, chunk: number, i: number): number {
  const s = Math.sin(seed * 12.9898 + chunk * 78.233 + i * 45.164) * 43758.5453;
  return s - Math.floor(s);
}

function drawProps(
  ctx: CanvasRenderingContext2D,
  chunkIndex: number,
  stageId: string,
  stage: ReturnType<typeof getStageById>,
  seed: number,
  cameraY: number,
  hazards: { x: number; w: number }[]
) {
  const x0 = chunkIndex * CHUNK_WIDTH;
  const spawnSkip = x0 < 400 && chunkIndex <= 0;
  const kind =
    stageId === "arctic-cave" || stageId === "cave"
      ? "cave"
      : stageId === "arctic"
        ? "arctic"
        : stageId === "desert" || stageId === "beach"
          ? "desert"
          : stageId === "forest" || stageId === "boot-camp"
            ? "forest"
            : stageId === "volcano" || stageId === "ragnarok"
              ? "volcano"
              : "country";

  if (kind === "cave") {
    ctx.fillStyle = "#4b5563";
    for (let i = 0; i < 4; i++) {
      const x = x0 + 80 + chunkRand(seed, chunkIndex, i) * (CHUNK_WIDTH - 160);
      const h = 36 + chunkRand(seed, chunkIndex, i + 3) * 48;
      ctx.beginPath();
      ctx.moveTo(x - 10, cameraY);
      ctx.lineTo(x + 10, cameraY);
      ctx.lineTo(x, cameraY + h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "#a855f7";
    for (let i = 0; i < 2; i++) {
      const x = x0 + chunkRand(seed, chunkIndex, i + 30) * CHUNK_WIDTH;
      const y = terrainHeightAt(x, stage, seed) - 8;
      ctx.beginPath();
      ctx.ellipse(x, y, 5, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (kind === "arctic") {
    for (let i = 0; i < 3; i++) {
      const x = x0 + 100 + ((i * 370 + chunkRand(seed, chunkIndex, i) * 80) % (CHUNK_WIDTH - 140));
      if (spawnSkip && x < 420) continue;
      const y = terrainHeightAt(x, stage, seed);
      drawTree(ctx, x, y, 0.9);
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.ellipse(x, y - 38, 18, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  for (let i = 0; i < 3; i++) {
    const x = x0 + 100 + ((i * 370 + chunkRand(seed, chunkIndex, i) * 80) % (CHUNK_WIDTH - 140));
    if (spawnSkip && x < 420) continue;
    const y = terrainHeightAt(x, stage, seed);
    if (kind === "country" && i === 2 && chunkRand(seed, chunkIndex, 9) > 0.7) {
      ctx.strokeStyle = "#6b4423";
      ctx.lineWidth = 3;
      for (let f = 0; f < 4; f++) {
        ctx.beginPath();
        ctx.moveTo(x + f * 14, y - 4);
        ctx.lineTo(x + f * 14, y - 22);
        ctx.stroke();
      }
    }
    if (kind === "desert") {
      if (i % 2 === 0) drawCactus(ctx, x, y);
      else drawRock(ctx, x, y, 16);
    } else if (kind === "forest") {
      drawTree(ctx, x, y, 1);
    } else if (kind === "volcano") {
      drawRock(ctx, x, y, 18);
      ctx.fillStyle = "rgba(249, 115, 22, 0.35)";
      ctx.beginPath();
      ctx.ellipse(x, y - 4, 22, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (i % 2 === 0) {
      drawBush(ctx, x, y);
    } else {
      drawRock(ctx, x, y, 14);
    }
  }
}

function drawBush(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#3f8f3a";
  ctx.beginPath();
  ctx.ellipse(x, y - 12, 16, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#57a84a";
  ctx.beginPath();
  ctx.ellipse(x - 10, y - 8, 10, 8, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawRock(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = "#6b7280";
  ctx.beginPath();
  ctx.ellipse(x, y - r * 0.35, r, r * 0.65, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#9ca3af";
  ctx.beginPath();
  ctx.ellipse(x - r * 0.25, y - r * 0.55, r * 0.35, r * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawCactus(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#3f7d46";
  ctx.fillRect(x - 5, y - 36, 10, 36);
  ctx.fillRect(x - 16, y - 26, 12, 6);
  ctx.fillRect(x - 16, y - 26, 6, 14);
  ctx.fillRect(x + 4, y - 22, 12, 6);
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.fillStyle = "#6b3e26";
  ctx.fillRect(x - 4 * scale, y - 28 * scale, 8 * scale, 28 * scale);
  ctx.fillStyle = "#2f7d32";
  ctx.beginPath();
  ctx.ellipse(x, y - 36 * scale, 16 * scale, 12 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3d9a40";
  ctx.beginPath();
  ctx.ellipse(x + 6 * scale, y - 30 * scale, 12 * scale, 10 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawRecordFlag(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#5c3d1e";
  ctx.fillRect(x - 3, y - 88, 6, 88);
  ctx.strokeStyle = "#1a1208";
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 3, y - 88, 6, 88);
  const cols = 4;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < cols; col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? "#111827" : "#f8fafc";
      ctx.fillRect(x + 4 + col * 7, y - 84 + row * 7, 7, 7);
    }
  }
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#1a1208";
  ctx.lineWidth = 2;
  ctx.font = "bold 9px system-ui,sans-serif";
  ctx.fillText("BEST", x + 8, y - 90);
  ctx.strokeText("BEST", x + 8, y - 90);
}

function drawHazard(
  ctx: CanvasRenderingContext2D,
  kind: StageHazardKind,
  x: number,
  y: number,
  w: number,
  h: number
) {
  if (kind === "logs") {
    ctx.fillStyle = "#6b3e26";
    ctx.beginPath();
    ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8b5a38";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x - w * 0.15, y, w * 0.12, h * 0.35, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (kind === "ceiling") {
    ctx.fillStyle = "#374151";
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
  } else if (kind === "lava") {
    ctx.fillStyle = "#7c2d12";
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
    ctx.fillStyle = "#ea580c";
    ctx.shadowColor = "#f97316";
    ctx.shadowBlur = 16;
    ctx.fillRect(x - w / 2 + 4, y - h / 2 + 4, w - 8, h - 8);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(253, 186, 116, 0.5)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x - w * 0.3 + i * 12, y - h * 0.2);
      ctx.quadraticCurveTo(x - w * 0.2 + i * 12, y - h * 0.5, x - w * 0.1 + i * 12, y - h * 0.2);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = "#6b7280";
    ctx.beginPath();
    ctx.arc(x, y, Math.max(w, h) / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCollectFx(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  kind: PickupKind,
  t: number,
  value?: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = kind === "coin" ? "#fbbf24" : kind === "fuel" ? "#ef4444" : "#fff";
  ctx.lineWidth = 3;
  ctx.globalAlpha = Math.max(0, Math.min(1, t));
  ctx.beginPath();
  ctx.arc(0, 0, 16 + (1 - Math.max(0, Math.min(1, t))) * 10, 0, Math.PI * 2);
  ctx.stroke();
  if (kind === "coin" && value) {
    collectTexts.push({ text: `+${value}`, x, y, until: performance.now() + 160 });
  }
  ctx.restore();
}

function drawPickup(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  kind: PickupKind,
  value: number
) {
  if (kind === "coin") {
    const r = value >= 500 ? 18 : value >= 100 ? 15 : value >= 25 ? 13 : 11;
    const spin = Math.sin(performance.now() / 200 + x * 0.01) * 0.25 + 0.75;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(spin, 1);
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#b45309";
    ctx.fill();
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(0, 0, r - 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fde68a";
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.35);
    ctx.lineTo(r * 0.08, -r * 0.08);
    ctx.lineTo(-r * 0.08, -r * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    if (value > 5) {
      ctx.fillStyle = "#78350f";
      ctx.font = `bold ${Math.max(8, r * 0.7)}px system-ui,sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(value), x, y + 1);
    }
    return;
  }
  if (kind === "fuel") {
    roundRect(ctx, x - 9, y - 14, 18, 24, 3, "#dc2626");
    ctx.strokeStyle = "#1a1208";
    ctx.lineWidth = 2;
    ctx.stroke();
    roundRect(ctx, x - 5, y - 19, 10, 7, 2, "#f8fafc");
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillRect(x - 7, y - 8, 4, 12);
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = "#0891b2";
  ctx.strokeStyle = "#1a1208";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(8, 0);
  ctx.lineTo(0, 10);
  ctx.lineTo(-8, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(-2, -2, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function spawnPuff(list: Puff[], x: number, y: number, r: number, life: number, vx: number, vy: number) {
  if (list.length >= 12) list.shift();
  list.push({ x, y, vx, vy, life, max: life, r });
}

function stepDust(
  wheels: WheelRender[],
  engine: HillClimbEngine,
  gasDown: boolean,
  landingImpact: number
) {
  if (!wheels.length) return;
  const rear = wheels.reduce((a, b) => (a.x < b.x ? a : b));
  const active = (gasDown && engine.isDriveWheelGrounded()) || landingImpact > 0.2;
  if (rear && active && (rear.speed > 80 || landingImpact > 0.2)) {
    const burst = landingImpact > 0.2 ? 4 : 1;
    for (let i = 0; i < burst; i++) {
      spawnPuff(
        dustPuffs,
        rear.x - rear.r * 0.5,
        rear.y + rear.r * 0.35,
        landingImpact > 0.2 ? 12 : 6,
        0.34,
        -50 - i * 5,
        -8
      );
    }
  }
  for (const p of dustPuffs) {
    p.life -= 1 / 60;
    p.x += p.vx / 60;
    p.y += p.vy / 60;
    p.r += 0.35;
  }
  for (let i = dustPuffs.length - 1; i >= 0; i--) {
    if (dustPuffs[i].life <= 0) dustPuffs.splice(i, 1);
  }
}

function stepExhaust(
  x: number,
  y: number,
  angle: number,
  gasDown: boolean,
  vehicleId: string,
  engineLevel: number
) {
  if (gasDown) {
    const v = getVehicleById(vehicleId);
    const local = exhaustLocal(vehicleId, v.base.chassisWidth, v.base.chassisHeight);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const bx = x + local.x * cos - local.y * sin;
    const by = y + local.x * sin + local.y * cos;
    const size = 4 + engineLevel * 0.35;
    const freq = engineLevel > 3 ? 2 : 1;
    for (let i = 0; i < freq; i++) {
      spawnPuff(
        exhaustPuffs,
        bx,
        by,
        size,
        0.3,
        -cos * (28 + engineLevel),
        -sin * (28 + engineLevel)
      );
    }
  }
  for (const p of exhaustPuffs) {
    p.life -= 1 / 60;
    p.x += p.vx / 60;
    p.y += p.vy / 60;
    p.r += 0.4;
  }
  for (let i = exhaustPuffs.length - 1; i >= 0; i--) {
    if (exhaustPuffs[i].life <= 0) exhaustPuffs.splice(i, 1);
  }
}

function drawPuffs(ctx: CanvasRenderingContext2D, list: Puff[], color: string) {
  for (const p of list) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.r, p.r * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
