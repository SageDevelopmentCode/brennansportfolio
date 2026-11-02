import {
  drawCastShadow,
  drawHelmetDriver,
  drawRagdollCharacter,
  drawWheelStyled,
  shadeHex,
  twoToneBody,
  type DriverPose,
  type WheelDraw,
  type WheelStyle,
} from "@/lib/hill-climb/art";
import type { RagdollPartRender, WheelRender } from "@/lib/hill-climb/engine";
import { HILL_CLIMBER_PALETTE, paletteForVehicle, type VehiclePalette } from "@/lib/hill-climb/vehicleStyle";
import { getVehicleById } from "@/lib/hill-climb/vehicles";
import { getStageById } from "@/lib/hill-climb/stages";
import type { VehicleDefinition, VehicleUpgradeLevels } from "@/lib/hill-climb/types";

export type VehicleDrawVisual = {
  upgradeLevels: VehicleUpgradeLevels;
  compression: number[];
  gasDown: boolean;
  airborne: number;
};

export function wheelStyleFor(vehicleId: string, archetype: string): WheelStyle {
  if (vehicleId === "race-car" || vehicleId === "dragster" || vehicleId === "luxury-car" || vehicleId === "fast-car")
    return "slick";
  if (archetype === "tank" || vehicleId === "tank") return "track";
  if (archetype === "bike") return "knobby";
  return "knobby";
}

export function exhaustLocal(vehicleId: string, w: number, h: number): { x: number; y: number } {
  const v = getVehicleById(vehicleId);
  if (v.archetype === "bike" || v.archetype === "rocket") return { x: -w * 0.35, y: h * 0.1 };
  if (v.archetype === "hover") return { x: -w * 0.1, y: h * 0.35 };
  return { x: -w * 0.48, y: h * 0.08 };
}

function lvl(visual: VehicleDrawVisual | undefined, part: string): number {
  return visual?.upgradeLevels[part] ?? 0;
}

function drawShock(
  ctx: CanvasRenderingContext2D,
  x: number,
  yTop: number,
  yBot: number,
  compression: number
) {
  const len = Math.max(4, yBot - yTop);
  const sag = compression * 6;
  ctx.strokeStyle = "#6b7280";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, yTop);
  for (let i = 0; i < 5; i++) {
    const t = i / 5;
    const yy = yTop + (len - sag) * t;
    ctx.lineTo(x + (i % 2 === 0 ? -4 : 4), yy);
  }
  ctx.lineTo(x, yTop + len - sag);
  ctx.stroke();
}

const INK = "#1a1208";

function traceJeepShell(
  ctx: CanvasRenderingContext2D,
  rearX: number,
  frontX: number,
  bottomY: number,
  beltY: number,
  hoodY: number,
  cabTop: number,
  cabRear: number,
  cabFront: number,
  wheelX: number,
  wheelY: number,
  archR: number
) {
  ctx.moveTo(rearX, bottomY);
  ctx.lineTo(rearX, beltY);
  ctx.quadraticCurveTo(rearX + 4, cabTop + 10, cabRear, cabTop);
  ctx.lineTo(cabFront, cabTop);
  ctx.lineTo(cabFront + (frontX - cabFront) * 0.42, hoodY);
  ctx.lineTo(frontX, hoodY + 7);
  ctx.lineTo(frontX, bottomY);
  ctx.closePath();
  ctx.moveTo(-wheelX + archR, wheelY);
  ctx.arc(-wheelX, wheelY, archR, 0, Math.PI * 2, true);
  ctx.moveTo(wheelX + archR, wheelY);
  ctx.arc(wheelX, wheelY, archR, 0, Math.PI * 2, true);
}

/** Open-top jeep drawn larger than the physics box so the cab, seats, and arches read clearly. */
function drawCar2OpenJeep(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  colors: VehiclePalette,
  visual?: VehicleDrawVisual,
  opts: { hoodExtra?: number; accentStripe?: boolean } = {}
) {
  const eng = lvl(visual, "engine");
  const susp = lvl(visual, "suspension");
  const fuel = lvl(visual, "fuel");
  const fourWd = lvl(visual, "fourWd");
  const comp = visual?.compression[0] ?? 0;
  const wheelX = w * 0.32;
  const wheelY = h * 0.45;
  const archR = h * 0.8;
  const rearX = -w * 0.58;
  const frontX = w * (0.56 + (opts.hoodExtra ?? 0) + eng * 0.012);
  const bottomY = h * 0.62;
  const beltY = -h * 0.02;
  const hoodY = -h * 0.32;
  const cabTop = -h * 1.05;
  const cabRear = -w * 0.1;
  const cabFront = w * 0.2;

  ctx.fillStyle = shadeHex(colors.body, -55);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.roundRect(rearX + 8, h * 0.18, frontX - rearX - 16, h * 0.32, 5);
  ctx.fill();
  ctx.stroke();

  const shell = () =>
    traceJeepShell(ctx, rearX, frontX, bottomY, beltY, hoodY, cabTop, cabRear, cabFront, wheelX, wheelY, archR);

  ctx.beginPath();
  shell();
  ctx.fillStyle = colors.body;
  ctx.fill("evenodd");
  ctx.save();
  ctx.clip("evenodd");
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.fillRect(rearX, cabTop, frontX - rearX, hoodY - cabTop + 8);
  ctx.fillStyle = "rgba(0,0,0,0.14)";
  ctx.fillRect(rearX, beltY, frontX - rearX, bottomY - beltY + 4);
  ctx.restore();
  ctx.beginPath();
  shell();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.lineCap = "round";
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.arc(sx * wheelX, wheelY, archR + 1.5, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle = shadeHex(colors.body, 28);
    ctx.lineWidth = 2.2;
    ctx.arc(sx * wheelX, wheelY, archR - 1.5, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();
  }
  ctx.lineCap = "butt";

  const cabW = cabFront - cabRear - 6;
  const cabH = beltY - cabTop - 8;
  ctx.fillStyle = colors.cab;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(cabRear + 3, cabTop + 4, cabW, cabH, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(186, 230, 253, 0.9)";
  ctx.beginPath();
  ctx.moveTo(cabFront - 2, cabTop + 6);
  ctx.lineTo(cabFront + w * 0.08, hoodY + 2);
  ctx.lineTo(cabFront - w * 0.06, hoodY + 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = shadeHex(colors.accent, 20);
  ctx.beginPath();
  ctx.roundRect(cabRear + 8, beltY - h * 0.42, w * 0.1, h * 0.36, 3);
  ctx.roundRect(w * 0.02, beltY - h * 0.46, w * 0.1, h * 0.4, 3);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = shadeHex(colors.body, -40);
  ctx.lineWidth = 3.5;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(cabRear + 2, beltY - 2);
  ctx.lineTo(cabRear + 2, cabTop - 3);
  ctx.lineTo(cabFront + 2, cabTop - 3);
  ctx.lineTo(cabFront + 4, hoodY + 2);
  ctx.stroke();

  const spareR = h * 0.42;
  const spareX = rearX + spareR * 0.15;
  const spareY = beltY - 2;
  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.arc(spareX, spareY, spareR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = "#d6d3d1";
  ctx.beginPath();
  ctx.arc(spareX, spareY, spareR * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = shadeHex(colors.body, -35);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(frontX - 7, hoodY + 8, 10, h * 0.55, 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#9ca3af";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    const gy = hoodY + 14 + i * 4;
    ctx.beginPath();
    ctx.moveTo(frontX - 5, gy);
    ctx.lineTo(frontX + 1, gy);
    ctx.stroke();
  }

  if (opts.accentStripe) {
    ctx.fillStyle = colors.accent;
    ctx.fillRect(cabFront + 4, hoodY + 3, frontX - cabFront - 14, 4);
  }

  const lampY = hoodY + h * 0.38;
  if (visual?.gasDown) {
    const beam = ctx.createLinearGradient(frontX, lampY, frontX + w * 0.85, lampY);
    beam.addColorStop(0, "rgba(254, 240, 138, 0.55)");
    beam.addColorStop(1, "rgba(254, 240, 138, 0)");
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(frontX + 2, lampY - 5);
    ctx.lineTo(frontX + w * 0.8, lampY - 16);
    ctx.lineTo(frontX + w * 0.8, lampY + 14);
    ctx.closePath();
    ctx.fill();
  }
  for (const ly of [lampY - 5, lampY + 4]) {
    ctx.fillStyle = HILL_CLIMBER_PALETTE.headlight;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(frontX - 1, ly, ly < lampY ? 4.5 : 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.arc(frontX - 2.2, ly - 1, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }

  if (fourWd > 0) {
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 2.5 + fourWd * 0.12;
    ctx.beginPath();
    ctx.moveTo(-wheelX, wheelY);
    ctx.lineTo(wheelX, wheelY);
    ctx.stroke();
  }

  const canScale = 1 + fuel * 0.08;
  ctx.fillStyle = "#dc2626";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(rearX + 10, beltY - h * 0.55, 10 * canScale, 14 * canScale, 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(rearX + 12, beltY - h * 0.58, 6 * canScale, 4);

  if (susp > 0) {
    drawShock(ctx, -wheelX, h * 0.02, wheelY, comp);
    drawShock(ctx, wheelX, h * 0.02, wheelY, comp);
  }
}

function drawHillClimber(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  colors: VehiclePalette,
  visual?: VehicleDrawVisual
) {
  drawCar2OpenJeep(ctx, w, h, colors, visual, { hoodExtra: 0, accentStripe: true });
}

function drawJeepLike(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  colors: VehiclePalette,
  visual: VehicleDrawVisual | undefined,
  opts: { openCab?: boolean; long?: boolean; low?: boolean; wing?: boolean }
) {
  if (opts.long) {
    twoToneBody(ctx, -w / 2, -h * 0.12, w, h * 0.85, 6, colors.body);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = "rgba(186, 230, 253, 0.75)";
      ctx.fillRect(-w / 2 + 12 + i * (w / 5), -h * 0.65, w / 8, h * 0.35);
    }
    return;
  }
  if (opts.low) {
    twoToneBody(ctx, -w / 2, h * 0.05, w, h * 0.55, 4, colors.body);
    twoToneBody(ctx, -w * 0.08, -h * 0.35, w * 0.35, h * 0.35, 4, colors.cab);
    if (opts.wing) {
      ctx.fillStyle = colors.accent;
      ctx.fillRect(-w * 0.45, -h * 0.15, w * 0.9, 4);
      ctx.fillRect(-w * 0.08, -h * 0.35, 6, h * 0.25);
      ctx.fillRect(w * 0.02, -h * 0.35, 6, h * 0.25);
    }
    return;
  }
  drawHillClimber(ctx, w, h, colors, visual);
}

function drawCar2Recipe(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  colors: VehiclePalette,
  visual?: VehicleDrawVisual,
  opts: { hoodExtra?: number; closedRoof?: boolean } = {}
) {
  if (opts.closedRoof) {
    drawCar2OpenJeep(ctx, w, h, colors, visual, { hoodExtra: opts.hoodExtra ?? 0.04 });
    ctx.fillStyle = colors.body;
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.roundRect(-w * 0.28, -h * 0.58, w * 0.52, h * 0.22, 4);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#1a1208";
    ctx.lineWidth = 2;
    ctx.stroke();
    return;
  }
  drawCar2OpenJeep(ctx, w, h, colors, visual, { hoodExtra: opts.hoodExtra ?? 0.02 });
}

function drawMotocrossBike(ctx: CanvasRenderingContext2D, w: number, h: number, colors: VehiclePalette) {
  ctx.strokeStyle = colors.body;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-w * 0.38, h * 0.2);
  ctx.lineTo(-w * 0.05, -h * 0.15);
  ctx.lineTo(w * 0.12, h * 0.05);
  ctx.stroke();
  ctx.fillStyle = colors.cab;
  ctx.strokeStyle = "#1a1208";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-w * 0.12, -h * 0.08, w * 0.28, h * 0.12, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = shadeHex(colors.body, -20);
  ctx.beginPath();
  ctx.ellipse(-w * 0.32, h * 0.08, w * 0.18, h * 0.12, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#6b7280";
  ctx.fillRect(-w * 0.42, h * 0.02, w * 0.12, h * 0.08);
}

function drawChopperBike(ctx: CanvasRenderingContext2D, w: number, h: number, colors: VehiclePalette) {
  ctx.strokeStyle = colors.body;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-w * 0.45, h * 0.25);
  ctx.lineTo(-w * 0.08, -h * 0.05);
  ctx.lineTo(w * 0.1, h * 0.08);
  ctx.stroke();
  twoToneBody(ctx, -w * 0.1, -h * 0.35, w * 0.22, h * 0.22, 8, colors.cab);
  ctx.fillStyle = colors.accent;
  ctx.beginPath();
  ctx.ellipse(-w * 0.05, -h * 0.2, w * 0.12, h * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawMonsterTruck(ctx: CanvasRenderingContext2D, w: number, h: number, colors: VehiclePalette, visual?: VehicleDrawVisual) {
  const gap = h * 0.55 + lvl(visual, "suspension") * 2;
  twoToneBody(ctx, -w * 0.32, -h * 0.35, w * 0.64, h * 0.55, 6, colors.cab);
  twoToneBody(ctx, -w * 0.42, -h * 0.05, w * 0.84, h * 0.35, 5, colors.body);
  ctx.strokeStyle = "#1a1208";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-w * 0.35, gap * 0.3);
  ctx.lineTo(-w * 0.35, gap);
  ctx.moveTo(w * 0.35, gap * 0.3);
  ctx.lineTo(w * 0.35, gap);
  ctx.stroke();
  if (lvl(visual, "suspension") > 0) {
    drawShock(ctx, -w * 0.35, -h * 0.05, gap, visual?.compression[0] ?? 0);
    drawShock(ctx, w * 0.35, -h * 0.05, gap, visual?.compression[1] ?? 0);
  }
}

function drawTractor(ctx: CanvasRenderingContext2D, w: number, h: number, colors: VehiclePalette) {
  twoToneBody(ctx, -w * 0.35, -h * 0.25, w * 0.7, h * 0.55, 5, colors.body);
  ctx.fillStyle = colors.accent;
  ctx.fillRect(w * 0.05, -h * 1.1, 8, h * 0.9);
  ctx.strokeStyle = "#1a1208";
  ctx.lineWidth = 2;
  ctx.strokeRect(w * 0.05, -h * 1.1, 8, h * 0.9);
}

function drawTank(ctx: CanvasRenderingContext2D, w: number, h: number, colors: VehiclePalette) {
  twoToneBody(ctx, -w / 2, -h * 0.15, w, h * 0.55, 4, colors.body);
  twoToneBody(ctx, -w * 0.18, -h * 0.55, w * 0.36, h * 0.35, 4, shadeHex(colors.body, -15));
  ctx.fillStyle = shadeHex(colors.body, -25);
  ctx.fillRect(-w / 2, h * 0.12, w, h * 0.28);
}

function drawRaceCar(ctx: CanvasRenderingContext2D, w: number, h: number, colors: VehiclePalette) {
  drawJeepLike(ctx, w, h, colors, undefined, { low: true, wing: true });
}

function drawTouristBus(ctx: CanvasRenderingContext2D, w: number, h: number, colors: VehiclePalette) {
  drawJeepLike(ctx, w, h, colors, undefined, { long: true });
}

function drawQuadBike(ctx: CanvasRenderingContext2D, w: number, h: number, colors: VehiclePalette) {
  twoToneBody(ctx, -w * 0.35, -h * 0.05, w * 0.7, h * 0.45, 5, colors.body);
  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-w * 0.1, -h * 0.15);
  ctx.lineTo(w * 0.15, -h * 0.35);
  ctx.stroke();
}

function drawTrophyTruck(ctx: CanvasRenderingContext2D, w: number, h: number, colors: VehiclePalette, visual?: VehicleDrawVisual) {
  twoToneBody(ctx, -w / 2, -h * 0.1, w, h * 0.6, 6, colors.body);
  twoToneBody(ctx, -w * 0.08, -h * 0.55, w * 0.35, h * 0.4, 4, colors.cab);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 10px system-ui";
  ctx.fillText("1", -4, -h * 0.35);
  drawShock(ctx, -w * 0.38, h * 0.05, h * 0.55 + lvl(visual, "suspension") * 3, visual?.compression[0] ?? 0);
  drawShock(ctx, w * 0.38, h * 0.05, h * 0.55 + lvl(visual, "suspension") * 3, visual?.compression[1] ?? 0);
}

function drawHovercraft(ctx: CanvasRenderingContext2D, w: number, h: number, colors: VehiclePalette) {
  twoToneBody(ctx, -w / 2, -h * 0.35, w, h * 0.55, 8, colors.body);
  ctx.fillStyle = colors.cab;
  ctx.beginPath();
  ctx.ellipse(0, h * 0.35, w * 0.48, h * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a1208";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#94a3b8";
  ctx.beginPath();
  ctx.arc(-w * 0.2, -h * 0.45, 8, 0, Math.PI * 2);
  ctx.arc(w * 0.2, -h * 0.45, 8, 0, Math.PI * 2);
  ctx.fill();
}

function drawRocket(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  colors: VehiclePalette,
  visual?: VehicleDrawVisual,
  legs = false
) {
  twoToneBody(ctx, -w * 0.22, -h * 0.85, w * 0.44, h * 1.35, 6, colors.body);
  if (legs) {
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 3;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * w * 0.15, h * 0.35);
      ctx.lineTo(sx * w * 0.35, h * 0.65);
      ctx.stroke();
    }
  }
  if (visual?.gasDown) {
    const flame = 12 + lvl(visual, "engine") * 2;
    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.moveTo(0, h * 0.55);
    ctx.lineTo(-w * 0.12, h * 0.35);
    ctx.lineTo(w * 0.12, h * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fde047";
    ctx.beginPath();
    ctx.moveTo(0, h * 0.55);
    ctx.lineTo(-w * 0.06, h * 0.4);
    ctx.lineTo(w * 0.06, h * 0.4);
    ctx.closePath();
    ctx.fill();
    void flame;
  }
}

function drawSpecial(ctx: CanvasRenderingContext2D, w: number, h: number, colors: VehiclePalette, vehicleId: string) {
  if (vehicleId === "finger-screw") {
    ctx.fillStyle = colors.body;
    ctx.beginPath();
    ctx.ellipse(0, h * 0.1, w * 0.15, h * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1a1208";
    ctx.lineWidth = 2;
    ctx.stroke();
    return;
  }
  if (vehicleId === "big-finger") {
    ctx.fillStyle = colors.body;
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.2, h * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (vehicleId === "sleigh") {
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-w * 0.4, h * 0.3);
    ctx.quadraticCurveTo(0, h * 0.5, w * 0.4, h * 0.3);
    ctx.stroke();
    twoToneBody(ctx, -w * 0.3, -h * 0.2, w * 0.6, h * 0.35, 4, colors.body);
    return;
  }
  if (vehicleId === "carantula") {
    ctx.fillStyle = colors.body;
    ctx.beginPath();
    ctx.ellipse(0, h * 0.05, w * 0.35, h * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.fillStyle = colors.body;
  ctx.beginPath();
  ctx.ellipse(0, h * 0.05, w * 0.42, h * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawCar4Generic(ctx: CanvasRenderingContext2D, w: number, h: number, colors: VehiclePalette, visual?: VehicleDrawVisual) {
  twoToneBody(ctx, -w / 2, -h * 0.12, w, h * 0.85, 6, colors.body);
  twoToneBody(ctx, -w * 0.1, -h * 0.65, w * 0.42, h * 0.45, 5, colors.cab);
  if (lvl(visual, "fourWd") > 0) {
    ctx.strokeStyle = "#1a1208";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-w * 0.35, h * 0.2);
    ctx.lineTo(w * 0.35, h * 0.2);
    ctx.stroke();
  }
}

const JEEP_LIKE = new Set([
  "hill-climber",
  "super-hill-climber",
  "tractor",
  "hippie-van",
  "police-car",
  "ambulance",
  "electric-car",
  "rally-car",
  "dune-buggy",
  "lowrider",
  "mutant",
  "hot-rod",
  "fire-truck",
]);

function drawChassisById(
  ctx: CanvasRenderingContext2D,
  vehicleId: string,
  v: VehicleDefinition,
  w: number,
  h: number,
  colors: VehiclePalette,
  visual?: VehicleDrawVisual
) {
  switch (vehicleId) {
    case "hill-climber":
      drawHillClimber(ctx, w, h, colors, visual);
      return;
    case "super-hill-climber":
      drawCar2OpenJeep(ctx, w, h, colors, visual, { hoodExtra: 0.08, accentStripe: true });
      return;
    case "motocross-bike":
    case "snowmobile":
    case "minibike":
    case "onewheeler":
      drawMotocrossBike(ctx, w, h, colors);
      return;
    case "chopper":
      drawChopperBike(ctx, w, h, colors);
      return;
    case "monster-truck":
    case "truck":
    case "super-offroad":
    case "super-diesel":
    case "kiddie-express":
      if (vehicleId === "monster-truck") drawMonsterTruck(ctx, w, h, colors, visual);
      else drawCar4Generic(ctx, w, h, colors, visual);
      return;
    case "tractor":
      drawTractor(ctx, w, h, colors);
      return;
    case "tank":
      drawTank(ctx, w, h, colors);
      return;
    case "race-car":
    case "dragster":
    case "fast-car":
      drawRaceCar(ctx, w, h, colors);
      return;
    case "tourist-bus":
    case "fire-truck":
      if (vehicleId === "tourist-bus") drawTouristBus(ctx, w, h, colors);
      else drawJeepLike(ctx, w, h, colors, visual, { long: true });
      return;
    case "quad-bike":
      drawQuadBike(ctx, w, h, colors);
      return;
    case "trophy-truck":
      drawTrophyTruck(ctx, w, h, colors, visual);
      return;
    case "hovercraft":
      drawHovercraft(ctx, w, h, colors);
      return;
    case "moonlander":
      drawRocket(ctx, w, h, colors, visual, true);
      return;
    case "the-rocket":
      drawRocket(ctx, w, h, colors, visual, false);
      return;
    default:
      if (v.archetype === "bike") drawMotocrossBike(ctx, w, h, colors);
      else if (v.archetype === "car4") drawCar4Generic(ctx, w, h, colors, visual);
      else if (v.archetype === "tank") drawTank(ctx, w, h, colors);
      else if (v.archetype === "hover") drawHovercraft(ctx, w, h, colors);
      else if (v.archetype === "rocket") drawRocket(ctx, w, h, colors, visual, vehicleId === "moonlander");
      else if (v.archetype === "special") drawSpecial(ctx, w, h, colors, vehicleId);
      else if (JEEP_LIKE.has(vehicleId)) drawCar2Recipe(ctx, w, h, colors, visual, {});
      else if (v.archetype === "car2") drawCar2Recipe(ctx, w, h, colors, visual, {});
      else drawHillClimber(ctx, w, h, colors, visual);
  }
}

function driverPoseFor(
  w: number,
  h: number,
  bike: boolean,
  colors: VehiclePalette,
  angularVelocity: number,
  visual?: VehicleDrawVisual,
  angle = 0
): DriverPose {
  const wheelie = angle < -0.45;
  const bounce = (visual?.compression[0] ?? 0) * 3;
  return {
    x: (bike ? -w * 0.02 : w * 0.02) + Math.max(-6, Math.min(6, -angularVelocity * 3)),
    y: bike ? -h * 0.35 : -h * 0.15,
    lean: Math.max(-0.35, Math.min(0.35, -angularVelocity * 0.08 + (wheelie ? -0.15 : 0))),
    bike,
    helmetColor: colors.accent,
    suitColor: bike ? colors.body : "#2563eb",
    wheelie,
    bounce,
  };
}

export function drawVehicleScene(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  angularVelocity: number,
  vehicleId: string,
  wheels: WheelRender[],
  ragdoll: RagdollPartRender[],
  visual?: VehicleDrawVisual
) {
  const v = getVehicleById(vehicleId);
  const w = v.base.chassisWidth;
  const h = v.base.chassisHeight;
  const colors = paletteForVehicle(vehicleId);
  const style = wheelStyleFor(vehicleId, v.archetype);
  const rim = vehicleId === "hill-climber" || vehicleId === "super-hill-climber" ? HILL_CLIMBER_PALETTE.rim : "#d6d3d1";
  const airborne = visual?.airborne ?? 0;

  drawCastShadow(ctx, x, y, w, angle, airborne);

  const hideWheels = v.archetype === "hover";
  if (!hideWheels) {
    for (const wheel of wheels) {
      drawWheelStyled(ctx, wheel as WheelDraw, style, rim);
    }
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  drawChassisById(ctx, vehicleId, v, w, h, colors, visual);
  const bike = v.archetype === "bike";
  if (ragdoll.length === 0) {
    drawHelmetDriver(ctx, driverPoseFor(w, h, bike, colors, angularVelocity, visual, angle));
  }
  ctx.restore();

  if (ragdoll.length > 0) drawRagdollCharacter(ctx, ragdoll);
}

export function drawVehiclePreview(
  ctx: CanvasRenderingContext2D,
  vehicleId: string,
  upgradeLevels: VehicleUpgradeLevels,
  width: number,
  height: number
) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#87ceeb";
  ctx.fillRect(0, 0, width, height * 0.55);
  ctx.fillStyle = "#6bc93f";
  ctx.fillRect(0, height * 0.55, width, height * 0.45);
  const v = getVehicleById(vehicleId);
  const scale = Math.min(width / (v.base.chassisWidth * 2.2), height / (v.base.chassisHeight * 6));
  const fakeWheels: WheelRender[] = [
    { x: -v.base.chassisWidth * 0.32, y: v.base.chassisHeight * 0.45, angle: 0.4, r: v.base.wheelRadius, speed: 0 },
    { x: v.base.chassisWidth * 0.32, y: v.base.chassisHeight * 0.45, angle: 0.15, r: v.base.wheelRadius, speed: 0 },
  ];
  ctx.save();
  ctx.translate(width / 2, height * 0.62);
  ctx.scale(scale, scale);
  drawVehicleScene(ctx, 0, 0, 0, 0, vehicleId, fakeWheels, [], {
    upgradeLevels,
    compression: [0.2, 0.2],
    gasDown: false,
    airborne: 0,
  });
  ctx.restore();
}

export function drawStageThumbnail(ctx: CanvasRenderingContext2D, stageId: string, width: number, height: number) {
  const stage = getStageById(stageId);
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, stage.sky.top);
  grad.addColorStop(1, stage.sky.bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = stage.ground.dirt;
  ctx.beginPath();
  ctx.moveTo(0, height * 0.72);
  for (let x = 0; x <= width; x += 8) {
    const y = height * 0.72 + Math.sin(x * 0.04) * 12;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = stage.ground.grass;
  ctx.fillRect(0, height * 0.68, width, 8);
  if (stageId === "desert") {
    ctx.fillStyle = "#3f7d46";
    ctx.fillRect(width * 0.7, height * 0.55, 6, 20);
  } else if (stageId === "moon") {
    ctx.fillStyle = "#808080";
    ctx.beginPath();
    ctx.arc(width * 0.3, height * 0.78, 10, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "#2f7d32";
    ctx.beginPath();
    ctx.ellipse(width * 0.75, height * 0.62, 14, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
