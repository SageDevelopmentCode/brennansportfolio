/** Shared cartoon canvas primitives for hill-climb rendering. */

export type WheelStyle = "knobby" | "slick" | "track";

export function outlineWidth(zoom = 1): number {
  return Math.max(1.5, 2.5 / zoom);
}

export function shadeHex(hex: string, amt: number): string {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return hex;
  const ch = [0, 2, 4].map((i) => {
    const v = Math.max(0, Math.min(255, parseInt(raw.slice(i, i + 2), 16) + amt));
    return v.toString(16).padStart(2, "0");
  });
  return `#${ch.join("")}`;
}

export function roundBodyOutlined(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  stroke = "#1a1208",
  lw = 2.5
) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.stroke();
}

export function twoToneBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  stroke = "#1a1208",
  lw = 2.5
) {
  roundBodyOutlined(ctx, x, y, w, h, r, fill, stroke, lw);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.fillRect(x, y, w, h * 0.42);
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  ctx.fillRect(x, y + h * 0.62, w, h * 0.38);
  ctx.restore();
}

export function glossHighlight(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 2, w * 0.45, h * 0.35, r * 0.5);
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fill();
  ctx.restore();
}

export function drawCastShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  angle: number,
  airborne: number,
  slope = 0
) {
  const lift = Math.min(1, Math.max(0, airborne / 48));
  const alpha = 0.28 * (1 - lift * 0.55);
  const offsetY = 14 + lift * 16;
  const rx = w * 0.72;
  const ry = 14 * (1 - lift * 0.35);
  ctx.save();
  ctx.translate(x, y + offsetY);
  ctx.rotate(angle * 0.12 + slope * 0.08);
  ctx.scale(1, ry / rx);
  const glow = ctx.createRadialGradient(0, 0, rx * 0.15, 0, 0, rx);
  glow.addColorStop(0, `rgba(0,0,0,${alpha.toFixed(3)})`);
  glow.addColorStop(0.72, `rgba(0,0,0,${(alpha * 0.35).toFixed(3)})`);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export type WheelDraw = { x: number; y: number; angle: number; r: number; speed: number };

function drawAlloyRim(ctx: CanvasRenderingContext2D, r: number, rimColor: string) {
  ctx.fillStyle = shadeHex(rimColor, -28);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.52, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = shadeHex(rimColor, -55);
  ctx.lineWidth = Math.max(2.4, r * 0.11);
  ctx.lineCap = "round";
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.16, Math.sin(a) * r * 0.16);
    ctx.lineTo(Math.cos(a) * r * 0.46, Math.sin(a) * r * 0.46);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
  ctx.fillStyle = "#1f2937";
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a1208";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.beginPath();
  ctx.arc(-r * 0.05, -r * 0.05, r * 0.045, 0, Math.PI * 2);
  ctx.fill();
}

export function drawWheelStyled(
  ctx: CanvasRenderingContext2D,
  wheel: WheelDraw,
  style: WheelStyle,
  rimColor: string,
  tireColor = "#111827"
) {
  const spin = Math.abs(wheel.speed);
  ctx.save();
  ctx.translate(wheel.x, wheel.y);
  ctx.rotate(wheel.angle);
  const r = wheel.r;

  ctx.fillStyle = tireColor;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  if (style === "knobby") {
    ctx.fillStyle = shadeHex(tireColor, 22);
    const knobs = 12;
    for (let i = 0; i < knobs; i++) {
      ctx.save();
      ctx.rotate((i / knobs) * Math.PI * 2);
      ctx.beginPath();
      ctx.roundRect(r * 0.7, -r * 0.1, r * 0.26, r * 0.2, 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (style === "track") {
    ctx.strokeStyle = "#365314";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55);
      ctx.lineTo(Math.cos(a) * r * 0.88, Math.sin(a) * r * 0.88);
      ctx.stroke();
    }
  }

  ctx.fillStyle = shadeHex(tireColor, 36);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.74, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(-r * 0.08, -r * 0.08, r * 0.62, Math.PI * 1.1, Math.PI * 1.7);
  ctx.stroke();

  if (spin > 420) {
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = "#6b7280";
    ctx.lineWidth = 2;
    for (let j = 0; j < 3; j++) {
      const a = j * 0.7;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.88, a, a + 0.45);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  drawAlloyRim(ctx, r, rimColor);

  ctx.strokeStyle = "#1a1208";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export type DriverPose = {
  x: number;
  y: number;
  lean: number;
  bike: boolean;
  helmetColor: string;
  suitColor: string;
  wheelie: boolean;
  bounce: number;
};

function drawFace(ctx: CanvasRenderingContext2D, wheelie: boolean) {
  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.arc(-3.2, -1, 1.6, 0, Math.PI * 2);
  ctx.arc(3.2, -1, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a1208";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 2.5, 3.2, 0.15, Math.PI - 0.15);
  ctx.stroke();
  if (wheelie) {
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.arc(6, 4, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawHelmetDriver(ctx: CanvasRenderingContext2D, pose: DriverPose) {
  const { x: dx, y: dy, lean, bike, helmetColor, suitColor, wheelie, bounce } = pose;
  const by = dy + bounce;
  ctx.save();
  ctx.translate(dx, by);
  ctx.rotate(lean);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  if (bike) {
    ctx.fillStyle = suitColor;
    ctx.strokeStyle = "#1a1208";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 8, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-9, 4);
    ctx.lineTo(-16, -4);
    ctx.moveTo(9, 4);
    ctx.lineTo(16, -4);
    ctx.stroke();
  } else {
    const wheelX = 16;
    const wheelY = 4;
    ctx.strokeStyle = suitColor;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.quadraticCurveTo(4, 8, wheelX - 5, wheelY);
    ctx.moveTo(7, 0);
    ctx.quadraticCurveTo(10, 8, wheelX + 5, wheelY);
    ctx.stroke();

    ctx.fillStyle = suitColor;
    ctx.strokeStyle = "#1a1208";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-9, -2, 18, 16, 4);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(wheelX, wheelY, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(wheelX - 6, wheelY);
    ctx.lineTo(wheelX + 6, wheelY);
    ctx.moveTo(wheelX, wheelY - 6);
    ctx.lineTo(wheelX, wheelY + 6);
    ctx.stroke();
    ctx.fillStyle = "#374151";
    ctx.beginPath();
    ctx.arc(wheelX, wheelY, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#fde68a";
  ctx.strokeStyle = "#1a1208";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, -14, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = helmetColor;
  ctx.beginPath();
  ctx.arc(0, -16, 9.2, Math.PI, 0);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(-7.5, -17, 15, 3.5);
  ctx.strokeStyle = "#1a1208";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-7.5, -17, 15, 3.5);

  drawFace(ctx, wheelie);
  ctx.restore();
}

export function drawRagdollCharacter(
  ctx: CanvasRenderingContext2D,
  parts: {
    kind: "head" | "torso" | "limb";
    x: number;
    y: number;
    angle: number;
    w: number;
    h: number;
  }[]
) {
  for (const part of parts) {
    ctx.save();
    ctx.translate(part.x, part.y);
    ctx.rotate(part.angle);
    ctx.strokeStyle = "#1a1208";
    ctx.lineWidth = 2;
    if (part.kind === "head") {
      ctx.fillStyle = "#fde68a";
      ctx.beginPath();
      ctx.arc(0, 0, part.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#b91c1c";
      ctx.beginPath();
      ctx.arc(0, -2, part.w / 2, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.fillRect(-5, -6, 10, 2);
    } else if (part.kind === "torso") {
      ctx.fillStyle = "#2563eb";
      ctx.beginPath();
      ctx.roundRect(-part.w / 2, -part.h / 2, part.w, part.h, 4);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = "#fde68a";
      ctx.beginPath();
      ctx.roundRect(-part.w / 2, -part.h / 2, part.w, part.h, 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
}

export function drawOutlinedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  alpha = 1
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `800 ${size}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = Math.max(3, size * 0.12);
  ctx.strokeStyle = "#1a1208";
  ctx.fillStyle = "#fff";
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function drawLandingRing(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  const a = Math.max(0, 1 - t);
  ctx.save();
  ctx.globalAlpha = a * 0.85;
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, 8 + (1 - a) * 28, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
