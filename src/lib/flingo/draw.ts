import {
  MAX_AIM,
  PLAYER_R,
  smashColor,
  worldToScreenY,
  type GameState,
  type SmashKind,
} from "@/lib/flingo/engine";

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function skyGradient(ctx: CanvasRenderingContext2D, h: number, height: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  const t = Math.min(1, height / 6000);
  // Day → dusk → wild neon night as you climb
  const top = lerpColor("#0ea5e9", "#312e81", t);
  const mid = lerpColor("#7dd3fc", "#7c3aed", t);
  const bot = lerpColor("#fef3c7", "#f97316", t * 0.85);
  g.addColorStop(0, top);
  g.addColorStop(0.55, mid);
  g.addColorStop(1, bot);
  return g;
}

function lerpColor(a: string, b: string, t: number) {
  const pa = hex(a);
  const pb = hex(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

function hex(c: string): [number, number, number] {
  const n = c.replace("#", "");
  return [
    parseInt(n.slice(0, 2), 16),
    parseInt(n.slice(2, 4), 16),
    parseInt(n.slice(4, 6), 16),
  ];
}

function drawClouds(ctx: CanvasRenderingContext2D, s: GameState) {
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  for (let i = 0; i < 8; i++) {
    const seed = s.seed + i * 97;
    const x = ((Math.sin(seed) * 0.5 + 0.5) * s.w + s.t * (8 + i)) % (s.w + 120) - 60;
    const wy = s.camY + 200 + i * 180 + Math.sin(seed * 2) * 40;
    const y = worldToScreenY(s, wy);
    if (y < -40 || y > s.h + 40) continue;
    ctx.beginPath();
    ctx.ellipse(x, y, 48 + (i % 3) * 12, 18, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 30, y + 4, 34, 14, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 28, y + 6, 28, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlatform(
  ctx: CanvasRenderingContext2D,
  s: GameState,
  p: GameState["platforms"][number],
) {
  const y = worldToScreenY(s, p.y + p.h);
  const colors = {
    normal: ["#34d399", "#059669"],
    bounce: ["#a3e635", "#65a30d"],
    ice: ["#bae6fd", "#38bdf8"],
    crumble: ["#d6d3d1", "#a8a29e"],
  } as const;
  const [c0, c1] = colors[p.kind];
  const g = ctx.createLinearGradient(p.x, y, p.x, y + p.h);
  g.addColorStop(0, c0);
  g.addColorStop(1, c1);
  ctx.globalAlpha = Math.max(0.35, p.life);
  ctx.fillStyle = g;
  roundRect(ctx, p.x, y, p.w, p.h, 8);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  roundRect(ctx, p.x + 4, y + 2, p.w - 8, 4, 3);
  ctx.fill();
  if (p.kind === "bounce") {
    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("BOING", p.x + p.w / 2, y + p.h - 4);
  }
  ctx.globalAlpha = 1;
}

function drawSmashGlyph(
  ctx: CanvasRenderingContext2D,
  kind: SmashKind,
  x: number,
  y: number,
  r: number,
  rot: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const emoji =
    kind === "donut"
      ? "🍩"
      : kind === "tv"
        ? "📺"
        : kind === "duck"
          ? "🦆"
          : kind === "pinata"
            ? "🪅"
            : kind === "star"
              ? "⭐"
              : kind === "can"
                ? "🥫"
                : "🎈";
  ctx.font = `${r * 1.7}px system-ui`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, 0, 2);
  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, s: GameState) {
  const pl = s.player;
  const x = pl.x;
  const y = worldToScreenY(s, pl.y);
  const blink = pl.invuln > 0 && Math.floor(s.t * 20) % 2 === 0;
  if (blink) return;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pl.facing * pl.stretch, pl.squish);

  // Body
  const body = ctx.createRadialGradient(-6, -8, 4, 0, 0, PLAYER_R);
  body.addColorStop(0, "#fef08a");
  body.addColorStop(0.55, "#f97316");
  body.addColorStop(1, "#c2410c");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, PLAYER_R, PLAYER_R * 0.95, 0, 0, Math.PI * 2);
  ctx.fill();

  // Shine
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.ellipse(-7, -8, 7, 5, -0.5, 0, Math.PI * 2);
  ctx.fill();

  // Googly eyes
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(-6, -4, 7, 0, Math.PI * 2);
  ctx.arc(7, -4, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0f172a";
  const pupil = pl.grounded ? 0 : Math.max(-2, Math.min(2, pl.vx * 0.01));
  ctx.beginPath();
  ctx.arc(-6 + pupil, -3, 3.2, 0, Math.PI * 2);
  ctx.arc(7 + pupil, -3, 3, 0, Math.PI * 2);
  ctx.fill();

  // Grin
  ctx.strokeStyle = "#7c2d12";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(1, 6, 8, 0.15, Math.PI - 0.15);
  ctx.stroke();

  // Tiny arms
  ctx.strokeStyle = "#ea580c";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-PLAYER_R + 2, 2);
  ctx.lineTo(-PLAYER_R - 6, pl.grounded ? 8 : -4);
  ctx.moveTo(PLAYER_R - 2, 2);
  ctx.lineTo(PLAYER_R + 6, pl.grounded ? 8 : -6);
  ctx.stroke();

  ctx.restore();

  // Dash pips
  if (!pl.grounded) {
    for (let i = 0; i < 2; i++) {
      ctx.fillStyle = i < pl.dash ? "#67e8f9" : "rgba(255,255,255,0.2)";
      ctx.beginPath();
      ctx.arc(x - 10 + i * 20, y + PLAYER_R + 14, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawAim(ctx: CanvasRenderingContext2D, s: GameState) {
  if (!s.aiming) return;
  const pl = s.player;
  const x0 = pl.x;
  const y0 = worldToScreenY(s, pl.y);
  const power = Math.hypot(s.aimDx, s.aimDy) / MAX_AIM;
  const dx = s.aimDx;
  const dy = -s.aimDy; // screen y flips

  // Rubber band
  ctx.strokeStyle = `rgba(254,240,138,${0.4 + power * 0.5})`;
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x0 - dx, y0 - dy);
  ctx.stroke();
  ctx.setLineDash([]);

  // Trajectory dots
  let simX = pl.x;
  let simY = pl.y;
  let vx = s.aimDx * 8.6;
  let vy = s.aimDy * 8.6;
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  for (let i = 0; i < 14; i++) {
    vy -= 1650 * 0.04;
    vx *= 1 - 0.18 * 0.04;
    simX += vx * 0.04;
    simY += vy * 0.04;
    const sy = worldToScreenY(s, simY);
    const r = 3.5 - i * 0.15;
    if (r > 0.5) {
      ctx.beginPath();
      ctx.arc(simX, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Pull handle
  ctx.fillStyle = "#fde68a";
  ctx.beginPath();
  ctx.arc(x0 - dx, y0 - dy, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#c2410c";
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawHazard(ctx: CanvasRenderingContext2D, s: GameState, i: number) {
  const hz = s.hazards[i];
  if (!hz) return;
  const y = worldToScreenY(s, hz.y);
  ctx.save();
  ctx.translate(hz.x, y);
  ctx.rotate(s.t * 6 + hz.phase);
  ctx.fillStyle = "#64748b";
  ctx.beginPath();
  ctx.arc(0, 0, hz.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e2e8f0";
  for (let t = 0; t < 8; t++) {
    const a = (t / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * hz.r, Math.sin(a) * hz.r);
    ctx.lineTo(Math.cos(a + 0.2) * (hz.r * 0.55), Math.sin(a + 0.2) * (hz.r * 0.55));
    ctx.fill();
  }
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(0, 0, hz.r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawGame(ctx: CanvasRenderingContext2D, s: GameState) {
  const shakeX = s.shake > 0 ? (Math.random() - 0.5) * s.shake * 28 : 0;
  const shakeY = s.shake > 0 ? (Math.random() - 0.5) * s.shake * 28 : 0;

  ctx.save();
  ctx.translate(shakeX, shakeY);

  ctx.fillStyle = skyGradient(ctx, s.h, s.maxHeight);
  ctx.fillRect(-20, -20, s.w + 40, s.h + 40);

  drawClouds(ctx, s);

  // Soft parallax stars when high
  if (s.maxHeight > 1500) {
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    for (let i = 0; i < 30; i++) {
      const sx = ((s.seed + i * 41) % 1000) / 1000 * s.w;
      const sy = ((i * 97 + s.camY * 0.15) % s.h);
      ctx.fillRect(sx, sy, 2, 2);
    }
  }

  for (const p of s.platforms) drawPlatform(ctx, s, p);

  for (let i = 0; i < s.hazards.length; i++) drawHazard(ctx, s, i);

  for (const m of s.smash) {
    const y = worldToScreenY(s, m.y);
    ctx.beginPath();
    ctx.fillStyle = smashColor(m.kind);
    ctx.globalAlpha = 0.25;
    ctx.arc(m.x, y, m.r + 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    drawSmashGlyph(ctx, m.kind, m.x, y, m.r, m.rot);
  }

  for (const p of s.particles) {
    const y = worldToScreenY(s, p.y);
    const a = Math.max(0, p.life / p.max);
    ctx.globalAlpha = a;
    if (p.text) {
      ctx.font = `${14 + p.size}px system-ui`;
      ctx.fillText(p.text, p.x, y);
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, y, p.size * a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  for (const f of s.floaters) {
    const y = worldToScreenY(s, f.y);
    ctx.globalAlpha = Math.max(0, f.life);
    ctx.fillStyle = f.color;
    ctx.font = "bold 20px system-ui";
    ctx.textAlign = "center";
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 4;
    ctx.strokeText(f.text, f.x, y);
    ctx.fillText(f.text, f.x, y);
    ctx.globalAlpha = 1;
  }

  drawAim(ctx, s);
  drawPlayer(ctx, s);

  if (s.flash > 0) {
    ctx.fillStyle = `rgba(254,240,138,${s.flash * 1.5})`;
    ctx.fillRect(0, 0, s.w, s.h);
  }

  if (s.bannerT > 0 && s.banner) {
    const a = Math.min(1, s.bannerT * 2);
    ctx.globalAlpha = a;
    ctx.fillStyle = "#fff";
    ctx.font = "bold 42px system-ui";
    ctx.textAlign = "center";
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = 8;
    ctx.strokeText(s.banner, s.w / 2, 90);
    ctx.fillText(s.banner, s.w / 2, 90);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}
