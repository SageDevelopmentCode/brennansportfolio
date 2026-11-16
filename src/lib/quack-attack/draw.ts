import {
  METER_MAX,
  PASSIVE_DEFS,
  PASSIVE_IDS,
  WEAPON_DEFS,
  WEAPON_IDS,
  livingBoss,
  type Enemy,
  type EnemyKind,
  type GameState,
  type PickupKind,
  type Player,
} from "@/lib/quack-attack/engine";

export type View = { w: number; h: number; dpr: number; zoom: number };
export type Joy = { active: boolean; ox: number; oy: number; x: number; y: number };
export type DrawOptions = { hud: boolean; joy: Joy | null; touch: boolean };

const TAU = Math.PI * 2;
const TILE = 160;
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const HUD_FONT = 'ui-rounded, "Fredoka", system-ui, sans-serif';

const spriteCache = new Map<string, HTMLCanvasElement>();

function emojiSprite(emoji: string, size: number) {
  const px = Math.max(8, Math.round(size * 2));
  const key = `${emoji}:${px}`;
  let sprite = spriteCache.get(key);
  if (!sprite) {
    sprite = document.createElement("canvas");
    const dim = Math.ceil(px * 1.35);
    sprite.width = dim;
    sprite.height = dim;
    const c = sprite.getContext("2d")!;
    c.font = `${px}px ${EMOJI_FONT}`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(emoji, dim / 2, dim / 2 + px * 0.06);
    spriteCache.set(key, sprite);
  }
  return sprite;
}

function drawEmoji(ctx: CanvasRenderingContext2D, emoji: string, x: number, y: number, size: number, angle = 0) {
  const sprite = emojiSprite(emoji, size);
  const dim = size * 1.35;
  if (angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.drawImage(sprite, -dim / 2, -dim / 2, dim, dim);
    ctx.restore();
  } else {
    ctx.drawImage(sprite, x - dim / 2, y - dim / 2, dim, dim);
  }
}

function hash(x: number, y: number) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

function drawGround(ctx: CanvasRenderingContext2D, cx: number, cy: number, vw: number, vh: number, t: number) {
  const x0 = Math.floor((cx - vw / 2) / TILE) - 1;
  const x1 = Math.floor((cx + vw / 2) / TILE) + 1;
  const y0 = Math.floor((cy - vh / 2) / TILE) - 1;
  const y1 = Math.floor((cy + vh / 2) / TILE) + 1;
  for (let gx = x0; gx <= x1; gx++) {
    for (let gy = y0; gy <= y1; gy++) {
      const px = gx * TILE;
      const py = gy * TILE;
      ctx.fillStyle = (gx + gy) & 1 ? "#86d45a" : "#7ccb51";
      ctx.fillRect(px, py, TILE + 1, TILE + 1);
      const h = hash(gx, gy);
      const ox = px + 20 + hash(gy, gx) * (TILE - 40);
      const oy = py + 20 + hash(gx * 7, gy * 3) * (TILE - 40);
      if (h < 0.22) {
        const petal = ["#ff8fab", "#ffd166", "#ffffff", "#c77dff"][(h * 100) & 3];
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * TAU + t * 0.2;
          ctx.fillStyle = petal;
          ctx.beginPath();
          ctx.arc(ox + Math.cos(a) * 5, oy + Math.sin(a) * 5, 4, 0, TAU);
          ctx.fill();
        }
        ctx.fillStyle = "#ffb703";
        ctx.beginPath();
        ctx.arc(ox, oy, 3.5, 0, TAU);
        ctx.fill();
      } else if (h < 0.45) {
        ctx.strokeStyle = "#5fae3c";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        for (let i = -1; i <= 1; i++) {
          ctx.moveTo(ox + i * 6, oy);
          ctx.lineTo(ox + i * 9, oy - 12 - (i === 0 ? 5 : 0));
        }
        ctx.stroke();
      } else if (h < 0.5) {
        ctx.fillStyle = "#9ca3af";
        ctx.beginPath();
        ctx.ellipse(ox, oy, 16, 11, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#d1d5db";
        ctx.beginPath();
        ctx.ellipse(ox - 4, oy - 4, 7, 4, 0, 0, TAU);
        ctx.fill();
      } else if (h < 0.53) {
        ctx.fillStyle = "rgba(96,165,250,0.55)";
        ctx.beginPath();
        ctx.ellipse(ox, oy, 28, 14, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.beginPath();
        ctx.ellipse(ox - 8, oy - 3, 8, 3, 0, 0, TAU);
        ctx.fill();
      }
    }
  }
}

const ENEMY_COLORS: Record<EnemyKind, [string, string]> = {
  blob: ["#6ee05a", "#2f9e44"],
  mini: ["#b5f27a", "#5fa83a"],
  bat: ["#a78bfa", "#5b21b6"],
  brute: ["#f87171", "#b91c1c"],
  splitter: ["#5cc8ff", "#0369a1"],
  spitter: ["#fdba74", "#c2410c"],
  boss: ["#c084fc", "#6b21a8"],
};

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, p: Player, t: number) {
  const [fill, dark] = ENEMY_COLORS[e.kind];
  const squish = Math.sin(t * 8 + e.seed) * 0.08;
  const rx = e.r * (1 + squish);
  const ry = e.r * (1 - squish);

  ctx.fillStyle = "rgba(0,0,0,0.16)";
  ctx.beginPath();
  ctx.ellipse(e.x, e.y + e.r * 0.85, e.r * 0.9, e.r * 0.3, 0, 0, TAU);
  ctx.fill();

  if (e.kind === "bat") {
    const flap = Math.sin(t * 20 + e.seed);
    ctx.fillStyle = dark;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(e.x + side * e.r * 0.5, e.y);
      ctx.lineTo(e.x + side * e.r * 2.2, e.y - e.r * (0.6 + flap * 0.7));
      ctx.lineTo(e.x + side * e.r * 1.5, e.y + e.r * 0.5);
      ctx.closePath();
      ctx.fill();
    }
  }

  const windup = e.kind === "boss" && e.mode === "windup" && Math.floor(t * 16) % 2 === 0;
  ctx.fillStyle = e.flash > 0 ? "#ffffff" : windup ? "#ff4d4d" : fill;
  ctx.beginPath();
  ctx.ellipse(e.x, e.y, rx, ry, 0, 0, TAU);
  ctx.fill();
  ctx.lineWidth = Math.max(2, e.r * 0.12);
  ctx.strokeStyle = dark;
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.ellipse(e.x - e.r * 0.38, e.y - e.r * 0.42, e.r * 0.26, e.r * 0.15, -0.5, 0, TAU);
  ctx.fill();

  if (e.kind === "splitter") {
    ctx.fillStyle = dark;
    for (const [ox, oy] of [
      [0.45, 0.35],
      [-0.1, 0.5],
      [0.25, 0.62],
    ]) {
      ctx.beginPath();
      ctx.arc(e.x + e.r * ox, e.y + e.r * oy, e.r * 0.09, 0, TAU);
      ctx.fill();
    }
  }

  let lx = p.x - e.x;
  let ly = p.y - e.y;
  const ld = Math.hypot(lx, ly) || 1;
  lx /= ld;
  ly /= ld;
  const eyeY = e.y - e.r * 0.15;
  const eyeR = e.r * (e.kind === "boss" ? 0.2 : 0.26);
  for (const side of [-1, 1]) {
    const ex = e.x + side * e.r * 0.35 + lx * e.r * 0.08;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(ex, eyeY, eyeR, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.arc(ex + lx * eyeR * 0.45, eyeY + ly * eyeR * 0.45, eyeR * 0.5, 0, TAU);
    ctx.fill();
    if (e.kind === "brute" || e.kind === "boss") {
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = Math.max(2, e.r * 0.09);
      ctx.beginPath();
      ctx.moveTo(ex - side * eyeR * 1.1, eyeY - eyeR * 1.5);
      ctx.lineTo(ex + side * eyeR * 0.9, eyeY - eyeR * 0.9);
      ctx.stroke();
    }
  }

  if (e.kind === "spitter") {
    ctx.fillStyle = "#7c2d12";
    ctx.beginPath();
    ctx.arc(e.x, e.y + e.r * 0.4, e.r * 0.2, 0, TAU);
    ctx.fill();
  }

  if (e.kind === "brute") {
    ctx.fillStyle = "#fef3c7";
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(e.x + side * e.r * 0.45, e.y - e.r * 0.8);
      ctx.lineTo(e.x + side * e.r * 0.7, e.y - e.r * 1.3);
      ctx.lineTo(e.x + side * e.r * 0.2, e.y - e.r * 0.92);
      ctx.closePath();
      ctx.fill();
    }
  }

  if (e.kind === "boss") {
    const cy = e.y - e.r * 0.85;
    ctx.fillStyle = "#facc15";
    ctx.strokeStyle = "#a16207";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(e.x - e.r * 0.5, cy);
    ctx.lineTo(e.x - e.r * 0.6, cy - e.r * 0.55);
    ctx.lineTo(e.x - e.r * 0.25, cy - e.r * 0.25);
    ctx.lineTo(e.x, cy - e.r * 0.7);
    ctx.lineTo(e.x + e.r * 0.25, cy - e.r * 0.25);
    ctx.lineTo(e.x + e.r * 0.6, cy - e.r * 0.55);
    ctx.lineTo(e.x + e.r * 0.5, cy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(e.x, cy - e.r * 0.2, e.r * 0.08, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#3b0764";
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + e.r * 0.4, e.r * 0.3, e.r * 0.14, 0, 0, Math.PI);
    ctx.fill();
  }
}

function drawDuck(ctx: CanvasRenderingContext2D, p: Player, t: number, spin: number) {
  const bob = p.moving ? Math.sin(t * 18) * 2.5 : Math.sin(t * 3) * 1;
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + p.r * 0.95, p.r * 1.05, p.r * 0.35, 0, 0, TAU);
  ctx.fill();

  if (p.invuln > 0 && Math.floor(t * 20) % 2 === 0) ctx.globalAlpha = 0.45;
  ctx.save();
  ctx.translate(p.x, p.y + bob);
  if (spin) ctx.rotate(spin);
  ctx.scale(p.face, 1);

  ctx.fillStyle = "#ffd93d";
  ctx.strokeStyle = "#d99a00";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-20, 0);
  ctx.lineTo(-27, -8);
  ctx.lineTo(-17, -4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(-2, 4, 20, 15, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  const flap = p.moving ? Math.sin(t * 22) * 0.4 : 0;
  ctx.fillStyle = "#ffc300";
  ctx.beginPath();
  ctx.ellipse(-6, 5, 10, 6, -0.2 + flap, 0, TAU);
  ctx.fill();

  ctx.fillStyle = "#ffd93d";
  ctx.beginPath();
  ctx.arc(9, -11, 12, 0, TAU);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#ff8c1a";
  ctx.strokeStyle = "#c2410c";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(21, -7, 8, 4, 0.1, 0, TAU);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.roundRect(4, -18, 9, 7, 2.5);
  ctx.roundRect(14, -18, 8, 7, 2.5);
  ctx.fill();
  ctx.fillRect(0, -16, 16, 2);
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(6, -16.5);
  ctx.lineTo(9, -13.5);
  ctx.moveTo(16, -16.5);
  ctx.lineTo(19, -13.5);
  ctx.stroke();

  ctx.restore();
  ctx.globalAlpha = 1;
}

const PICKUP_EMOJI: Record<PickupKind, string> = {
  pizza: "🍕",
  magnet: "🧲",
  nuke: "💥",
  chest: "🎁",
};

function drawWorld(ctx: CanvasRenderingContext2D, s: GameState, vw: number, vh: number) {
  const t = s.t;
  const p = s.player;
  drawGround(ctx, s.cam.x, s.cam.y, vw, vh, t);

  if (s.stats.auraR > 0) {
    const r = s.stats.auraR;
    const grad = ctx.createRadialGradient(p.x, p.y, r * 0.2, p.x, p.y, r);
    grad.addColorStop(0, "rgba(190,255,210,0.05)");
    grad.addColorStop(1, "rgba(130,240,170,0.28)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, TAU);
    ctx.fill();
    ctx.setLineDash([10, 12]);
    ctx.lineDashOffset = -t * 30;
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < 8; i++) {
      const a = t * 0.8 + (i / 8) * TAU;
      const br = 3 + ((i * 7) % 5);
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x + Math.cos(a) * r * 0.85, p.y + Math.sin(a) * r * 0.85, br, 0, TAU);
      ctx.stroke();
    }
  }

  for (const g of s.gems) {
    const size = g.value >= 20 ? 9 : g.value >= 5 ? 7 : 5;
    const color = g.value >= 20 ? "#f43f5e" : g.value >= 5 ? "#34d399" : "#60a5fa";
    ctx.fillStyle = color;
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y - size * 1.3);
    ctx.lineTo(g.x + size, g.y);
    ctx.lineTo(g.x, g.y + size * 1.3);
    ctx.lineTo(g.x - size, g.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  for (const pk of s.pickups) {
    const bob = Math.sin(pk.age * 4) * 4;
    const pulse = 0.5 + Math.sin(pk.age * 6) * 0.2;
    ctx.fillStyle = pk.kind === "chest" ? `rgba(253,224,71,${pulse})` : `rgba(255,255,255,${pulse * 0.6})`;
    ctx.beginPath();
    ctx.arc(pk.x, pk.y + bob, pk.kind === "chest" ? 30 : 22, 0, TAU);
    ctx.fill();
    drawEmoji(ctx, PICKUP_EMOJI[pk.kind], pk.x, pk.y + bob, pk.kind === "chest" ? 38 : 28);
  }

  for (const e of s.enemies) if (e.kind !== "boss") drawEnemy(ctx, e, p, t);
  for (const e of s.enemies) if (e.kind === "boss") drawEnemy(ctx, e, p, t);

  for (const b of s.bombs) {
    const k = b.t / b.dur;
    const x = b.x0 + (b.x1 - b.x0) * k;
    const y = b.y0 + (b.y1 - b.y0) * k;
    const h = Math.sin(Math.PI * k) * 90;
    ctx.fillStyle = "rgba(255,80,80,0.18)";
    ctx.beginPath();
    ctx.arc(b.x1, b.y1, b.radius * (0.5 + k * 0.5), 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(x, y + 8, 10, 4, 0, 0, TAU);
    ctx.fill();
    drawEmoji(ctx, "💣", x, y - h, 24, k * 8);
  }

  drawDuck(ctx, p, t, s.dying > 0 ? (1.6 - s.dying) * 7 : 0);

  if (p.hp < s.stats.maxHp && s.dying <= 0) {
    const w = 44;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath();
    ctx.roundRect(p.x - w / 2, p.y + 28, w, 6, 3);
    ctx.fill();
    ctx.fillStyle = p.hp / s.stats.maxHp < 0.3 ? "#ff4d6d" : "#4ade80";
    ctx.beginPath();
    ctx.roundRect(p.x - w / 2, p.y + 28, w * (p.hp / s.stats.maxHp), 6, 3);
    ctx.fill();
  }

  const chickenLv = s.weapons.chicken;
  if (chickenLv) {
    const n = [2, 3, 3, 4, 6][chickenLv - 1];
    for (let k = 0; k < n; k++) {
      const a = s.chickenAngle + (k * TAU) / n;
      drawEmoji(
        ctx,
        "🐔",
        p.x + Math.cos(a) * s.stats.chickenR,
        p.y + Math.sin(a) * s.stats.chickenR,
        26 * s.stats.areaMul,
        a + Math.PI / 2,
      );
    }
  }

  for (const pr of s.projs) {
    if (pr.kind === "spit") {
      ctx.fillStyle = "rgba(255,90,40,0.35)";
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, pr.r * 1.8, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#ff6b35";
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, pr.r, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#ffe066";
      ctx.beginPath();
      ctx.arc(pr.x - pr.r * 0.3, pr.y - pr.r * 0.3, pr.r * 0.4, 0, TAU);
      ctx.fill();
    } else if (pr.kind === "bread") {
      drawEmoji(ctx, "🍞", pr.x, pr.y, pr.r * 2.2, pr.spin);
    } else {
      drawEmoji(ctx, "🩴", pr.x, pr.y, pr.r * 2.2, pr.spin);
    }
  }

  ctx.lineCap = "round";
  for (const b of s.beams) {
    const a = b.ttl / b.max;
    const ex = p.x + Math.cos(b.angle) * b.len;
    const ey = p.y + Math.sin(b.angle) * b.len;
    ctx.strokeStyle = `rgba(255,40,80,${0.45 * a})`;
    ctx.lineWidth = b.width * 2 * a;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 12);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${a})`;
    ctx.lineWidth = b.width * 0.5 * a;
    ctx.stroke();
  }

  for (const bolt of s.bolts) {
    const a = bolt.ttl / bolt.max;
    for (const [color, width] of [
      [`rgba(103,232,249,${a})`, 7],
      [`rgba(255,255,255,${a})`, 2.5],
    ] as const) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(bolt.pts[0].x, bolt.pts[0].y);
      for (let i = 1; i < bolt.pts.length; i++) {
        const prev = bolt.pts[i - 1];
        const cur = bolt.pts[i];
        const mx = (prev.x + cur.x) / 2 + (Math.random() - 0.5) * 24;
        const my = (prev.y + cur.y) / 2 + (Math.random() - 0.5) * 24;
        ctx.lineTo(mx, my);
        ctx.lineTo(cur.x, cur.y);
      }
      ctx.stroke();
    }
  }

  for (const r of s.rings) {
    const k = 1 - r.ttl / r.max;
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = r.width * (1 - k * 0.6);
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * (1 - Math.pow(1 - k, 3)), 0, TAU);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  for (const pt of s.particles) {
    ctx.globalAlpha = pt.ttl / pt.max;
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  for (const tx of s.texts) {
    const k = tx.ttl / tx.max;
    const pop = k > 0.8 ? 1 + (k - 0.8) * 2 : 1;
    ctx.globalAlpha = Math.min(1, k * 2);
    ctx.font = `900 ${Math.round(tx.size * pop)}px ${HUD_FONT}`;
    ctx.strokeStyle = "rgba(0,0,0,0.75)";
    ctx.lineWidth = 4;
    ctx.strokeText(tx.text, tx.x, tx.y);
    ctx.fillStyle = tx.color;
    ctx.fillText(tx.text, tx.x, tx.y);
  }
  ctx.globalAlpha = 1;
}

function outlinedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
  align: CanvasTextAlign = "center",
  stroke = 5,
) {
  ctx.font = `900 ${size}px ${HUD_FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(0,0,0,0.8)";
  ctx.lineWidth = stroke;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function bar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frac: number, fill: string | CanvasGradient) {
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
  if (frac > 0) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.stroke();
}

function edgeArrow(ctx: CanvasRenderingContext2D, s: GameState, v: View, wx: number, wy: number, emoji: string) {
  const sx = (wx - s.cam.x) * v.zoom + v.w / 2;
  const sy = (wy - s.cam.y) * v.zoom + v.h / 2;
  const margin = 40;
  if (sx > margin && sx < v.w - margin && sy > margin && sy < v.h - margin) return;
  const cx = v.w / 2;
  const cy = v.h / 2;
  const a = Math.atan2(sy - cy, sx - cx);
  const hw = v.w / 2 - margin;
  const hh = v.h / 2 - margin;
  const k = Math.min(hw / Math.abs(Math.cos(a) || 1e-6), hh / Math.abs(Math.sin(a) || 1e-6));
  const ax = cx + Math.cos(a) * k;
  const ay = cy + Math.sin(a) * k;
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(a);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.moveTo(22, 0);
  ctx.lineTo(8, -10);
  ctx.lineTo(8, 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  drawEmoji(ctx, emoji, ax - Math.cos(a) * 6, ay - Math.sin(a) * 6, 22);
}

function formatTime(t: number) {
  const m = Math.floor(t / 60);
  const sec = Math.floor(t % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function drawHud(ctx: CanvasRenderingContext2D, s: GameState, v: View, touch: boolean) {
  const { w, h } = v;
  const t = s.t;
  const narrow = w < 560;

  const xpGrad = ctx.createLinearGradient(0, 0, w, 0);
  xpGrad.addColorStop(0, "#22d3ee");
  xpGrad.addColorStop(1, "#6366f1");
  bar(ctx, 8, 8, w - 16, 12, s.xp / s.xpNeed, xpGrad);
  outlinedText(ctx, `LV ${s.level}`, 14, 36, 20, "#ffffff", "left", 4);

  outlinedText(ctx, formatTime(t), w / 2, 42, narrow ? 28 : 36, "#ffffff");

  const hpY = 58;
  const hpW = narrow ? 120 : 180;
  bar(ctx, 14, hpY, hpW, 14, s.player.hp / s.stats.maxHp, s.player.hp / s.stats.maxHp < 0.3 ? "#ff4d6d" : "#4ade80");
  outlinedText(ctx, `❤️ ${Math.ceil(s.player.hp)}`, 18 + hpW, hpY + 7, 14, "#ffffff", "left", 3);
  outlinedText(ctx, `💀 ${s.kills.toLocaleString()}`, 14, hpY + 30, 18, "#ffffff", "left", 4);
  outlinedText(ctx, `⭐ ${s.score.toLocaleString()}`, 14, hpY + 54, 18, "#fde047", "left", 4);

  if (s.combo >= 5) {
    const size = Math.min(64, 26 + Math.sqrt(s.combo) * 2.2);
    const pulse = 1 + Math.max(0, s.comboTimer - 1.8) * 1.5;
    const hue = (s.combo * 3) % 360;
    outlinedText(ctx, `x${s.combo}`, w - 18, 96, Math.round(size * pulse), `hsl(${hue} 95% 62%)`, "right", 6);
    outlinedText(ctx, "COMBO", w - 18, 96 + size * 0.7, 14, "#ffffff", "right", 3);
  }

  const boss = livingBoss(s);
  if (boss) {
    const bw = Math.min(520, w - 60);
    const bx = (w - bw) / 2;
    const by = 72;
    outlinedText(ctx, `👑 ${s.bossName}`, w / 2, by - 4, 16, "#f0abfc", "center", 4);
    bar(ctx, bx, by + 8, bw, 16, boss.hp / boss.maxHp, "#d946ef");
    edgeArrow(ctx, s, v, boss.x, boss.y, "👑");
  }
  for (const pk of s.pickups) if (pk.kind === "chest") edgeArrow(ctx, s, v, pk.x, pk.y, "🎁");

  const meterW = Math.min(300, w - 140);
  const mx = (w - meterW) / 2;
  const my = h - 44;
  const full = s.meter >= METER_MAX;
  const meterGrad = ctx.createLinearGradient(mx, 0, mx + meterW, 0);
  meterGrad.addColorStop(0, full ? `hsl(${(t * 400) % 360} 95% 60%)` : "#facc15");
  meterGrad.addColorStop(1, full ? `hsl(${(t * 400 + 120) % 360} 95% 60%)` : "#fb923c");
  bar(ctx, mx, my, meterW, 18, s.meter / METER_MAX, meterGrad);
  if (full) {
    const wob = 1 + Math.sin(t * 12) * 0.08;
    outlinedText(ctx, touch ? "TAP 🦆 FOR MEGA QUACK!" : "PRESS SPACE: MEGA QUACK!", w / 2, my - 16, Math.round(18 * wob), "#fde047", "center", 4);
  } else {
    outlinedText(ctx, "🦆 MEGA QUACK", w / 2, my - 14, 14, "#ffffff", "center", 3);
  }

  if (!narrow) {
    let ix = 16;
    const iy = h - 30;
    for (const id of WEAPON_IDS) {
      const lv = s.weapons[id];
      if (!lv) continue;
      drawEmoji(ctx, WEAPON_DEFS[id].emoji, ix + 12, iy - 6, 20);
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = i < lv ? "#fde047" : "rgba(255,255,255,0.3)";
        ctx.fillRect(ix + 2 + i * 4.5, iy + 10, 3.5, 4);
      }
      ix += 30;
    }
    let px = w - 16;
    for (const id of PASSIVE_IDS) {
      const lv = s.passives[id];
      if (!lv) continue;
      drawEmoji(ctx, PASSIVE_DEFS[id].emoji, px - 12, iy - 6, 18);
      outlinedText(ctx, String(lv), px - 2, iy + 10, 11, "#ffffff", "center", 3);
      px -= 28;
    }
  }

  if (s.banner) {
    const b = s.banner;
    const age = b.max - b.ttl;
    const scale = age < 0.25 ? 0.4 + (age / 0.25) * 0.75 : age < 0.4 ? 1.15 - ((age - 0.25) / 0.15) * 0.15 : 1;
    const alpha = Math.min(1, b.ttl / 0.4);
    ctx.globalAlpha = alpha;
    const size = Math.round(Math.min(64, w / 11) * scale);
    outlinedText(ctx, b.text, w / 2, h * 0.28, size, b.color, "center", 8);
    if (b.sub) outlinedText(ctx, b.sub, w / 2, h * 0.28 + size * 0.75, Math.max(14, Math.round(size * 0.3)), "#ffffff", "center", 4);
    ctx.globalAlpha = 1;
  }

  const hpFrac = s.player.hp / s.stats.maxHp;
  if (hpFrac < 0.3 && s.dying <= 0) {
    const pulse = 0.25 + Math.sin(t * 6) * 0.12;
    const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
    grad.addColorStop(0, "rgba(255,0,60,0)");
    grad.addColorStop(1, `rgba(255,0,60,${pulse})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }
}

export function drawGame(ctx: CanvasRenderingContext2D, s: GameState, v: View, opts: DrawOptions) {
  const { w, h, dpr, zoom } = v;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#7ccb51";
  ctx.fillRect(0, 0, w, h);

  const sx = (Math.random() - 0.5) * s.shake * 2;
  const sy = (Math.random() - 0.5) * s.shake * 2;
  ctx.save();
  ctx.translate(w / 2 + sx, h / 2 + sy);
  ctx.scale(zoom, zoom);
  ctx.translate(-s.cam.x, -s.cam.y);
  drawWorld(ctx, s, w / zoom, h / zoom);
  ctx.restore();

  if (opts.hud) drawHud(ctx, s, v, opts.touch);

  const joy = opts.joy;
  if (joy?.active) {
    const dx = joy.x - joy.ox;
    const dy = joy.y - joy.oy;
    const d = Math.hypot(dx, dy);
    const k = d > 60 ? 60 / d : 1;
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(joy.ox, joy.oy, 60, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.arc(joy.ox + dx * k, joy.oy + dy * k, 26, 0, TAU);
    ctx.fill();
  }
}
