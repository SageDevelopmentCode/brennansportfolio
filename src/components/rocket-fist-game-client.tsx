"use client";

import {
  BOSS_LABEL,
  MAX_HEARTS,
  PLAYER_RADIUS,
  createInitialState,
  getArena,
  HIGH_SCORE_STORAGE_KEY,
  isBossKind,
  livingBoss,
  loadBest,
  saveBest,
  tick,
  type BestRecord,
  type Enemy,
  type Fist,
  type Hazard,
  type Particle,
  type Pickup,
  type RocketState,
} from "@/lib/rocket-fist";
import {
  playRocketBlock,
  playRocketBoss,
  playRocketDash,
  playRocketExplode,
  playRocketHurt,
  playRocketPickup,
  playRocketPunch,
  playRocketWave,
  resumeRocketAudio,
} from "@/lib/rocket-fist-sounds";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type Phase = "menu" | "playing" | "gameover";

type Hud = {
  score: number;
  hearts: number;
  combo: number;
  wave: number;
  banner: string;
  bannerOn: boolean;
  triple: number;
  shield: number;
  slow: number;
  bossName: string | null;
  bossHp: number;
  bossMax: number;
  dashReady: boolean;
  bestCombo: number;
  kills: number;
};

type Junk = {
  x: number;
  y: number;
  kind: number;
  size: number;
  rot: number;
};

const EMPTY_BEST: BestRecord = { score: 0, combo: 0 };
let bestSnapshot: BestRecord = EMPTY_BEST;
let bestRaw: string | null = null;

function readBestSnapshot(): BestRecord {
  try {
    const raw = localStorage.getItem(HIGH_SCORE_STORAGE_KEY);
    if (raw === bestRaw) return bestSnapshot;
    bestRaw = raw;
    bestSnapshot = raw ? loadBest() : EMPTY_BEST;
    return bestSnapshot;
  } catch {
    return bestSnapshot;
  }
}

function subscribeBest(onStoreChange: () => void) {
  window.addEventListener("rocket-fist-best", onStoreChange);
  return () => window.removeEventListener("rocket-fist-best", onStoreChange);
}

function notifyBest() {
  window.dispatchEvent(new Event("rocket-fist-best"));
}

const EMPTY_HUD: Hud = {
  score: 0,
  hearts: MAX_HEARTS,
  combo: 0,
  wave: 0,
  banner: "",
  bannerOn: false,
  triple: 0,
  shield: 0,
  slow: 0,
  bossName: null,
  bossHp: 0,
  bossMax: 1,
  dashReady: true,
  bestCombo: 0,
  kills: 0,
};

function hudFrom(state: RocketState): Hud {
  const boss = livingBoss(state);
  return {
    score: state.score,
    hearts: state.hearts,
    combo: state.combo,
    wave: state.wave,
    banner: state.banner,
    bannerOn: state.bannerLeft > 0 && state.banner.length > 0,
    triple: state.tripleLeft,
    shield: state.shieldLeft,
    slow: state.slowLeft,
    bossName: boss && isBossKind(boss.kind) ? BOSS_LABEL[boss.kind] : null,
    bossHp: boss?.hp ?? 0,
    bossMax: boss?.maxHp ?? 1,
    dashReady: state.dashCd <= 0,
    bestCombo: state.bestCombo,
    kills: state.kills,
  };
}

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
  ctx.fill();
}

function junkFor(w: number, h: number): Junk[] {
  const items: Junk[] = [];
  let seed = Math.round(w * 13 + h * 7) || 1;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const count = Math.max(8, Math.floor((w * h) / 32000));
  for (let i = 0; i < count; i += 1) {
    items.push({
      x: rand() * w,
      y: rand() * h,
      kind: Math.floor(rand() * 3),
      size: 16 + rand() * 34,
      rot: rand() * Math.PI,
    });
  }
  return items;
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  junk: Junk[]
) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#070b18");
  sky.addColorStop(0.45, "#14102a");
  sky.addColorStop(1, "#1c1430");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const moonX = w * 0.82;
  const moonY = h * 0.16;
  const moon = ctx.createRadialGradient(moonX, moonY, 8, moonX, moonY, 70);
  moon.addColorStop(0, "rgba(255,244,214,0.95)");
  moon.addColorStop(1, "rgba(255,244,214,0)");
  ctx.fillStyle = moon;
  ctx.beginPath();
  ctx.arc(moonX, moonY, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f8f1d8";
  ctx.beginPath();
  ctx.arc(moonX, moonY, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(56, 189, 248, 0.08)";
  ctx.lineWidth = 1;
  const grid = 48;
  const drift = (time * 12) % grid;
  for (let x = -grid; x < w + grid; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x + drift, h * 0.42);
    ctx.lineTo(x - 80, h);
    ctx.stroke();
  }

  for (const piece of junk) {
    ctx.save();
    ctx.translate(piece.x, piece.y);
    ctx.rotate(piece.rot);
    ctx.globalAlpha = 0.35;
    if (piece.kind === 0) {
      ctx.fillStyle = "#3f3558";
      fillRoundRect(ctx, -piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.72, 4);
    } else if (piece.kind === 1) {
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, piece.size * 0.28, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#7f1d1d";
      ctx.beginPath();
      ctx.moveTo(0, -piece.size * 0.4);
      ctx.lineTo(piece.size * 0.28, piece.size * 0.3);
      ctx.lineTo(-piece.size * 0.28, piece.size * 0.3);
      ctx.fill();
    }
    ctx.restore();
  }

  const box = getArena(w, h);
  ctx.strokeStyle = "rgba(248, 113, 113, 0.35)";
  ctx.lineWidth = 3;
  ctx.strokeRect(box.left, box.top, box.right - box.left, box.bottom - box.top);
  ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
  ctx.lineWidth = 1;
  ctx.strokeRect(box.left + 6, box.top + 6, box.right - box.left - 12, box.bottom - box.top - 12);
}

function drawPickup(ctx: CanvasRenderingContext2D, pickup: Pickup, time: number) {
  const bob = Math.sin(time * 5 + pickup.x) * 4;
  const x = pickup.x;
  const y = pickup.y + bob;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, 16, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  const color =
    pickup.kind === "triple"
      ? "#fb923c"
      : pickup.kind === "shield"
        ? "#38bdf8"
        : pickup.kind === "slow"
          ? "#c084fc"
          : "#facc15";
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, pickup.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0f172a";
  ctx.font = "700 11px Fredoka, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const label =
    pickup.kind === "triple" ? "x3" : pickup.kind === "shield" ? "SH" : pickup.kind === "slow" ? "SLOW" : "PZ";
  ctx.fillText(label, 0, 1);
  ctx.restore();
}

function drawHazard(ctx: CanvasRenderingContext2D, hazard: Hazard, time: number) {
  if (hazard.kind === "bomb") {
    const blink = hazard.fuse < 0.35 && Math.sin(time * 30) > 0;
    ctx.fillStyle = blink ? "#ef4444" : "#111827";
    ctx.beginPath();
    ctx.arc(hazard.x, hazard.y, hazard.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hazard.x, hazard.y - hazard.radius);
    ctx.lineTo(hazard.x + 6, hazard.y - hazard.radius - 8);
    ctx.stroke();
    ctx.fillStyle = "#fde68a";
    ctx.beginPath();
    ctx.arc(hazard.x + 7, hazard.y - hazard.radius - 8, 2.5, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const glow = ctx.createRadialGradient(hazard.x, hazard.y, 2, hazard.x, hazard.y, hazard.radius * 1.8);
  glow.addColorStop(0, "#fff7ed");
  glow.addColorStop(0.4, "#fb923c");
  glow.addColorStop(1, "rgba(251, 146, 60, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(hazard.x, hazard.y, hazard.radius * 1.8, 0, Math.PI * 2);
  ctx.fill();
}

function drawFist(ctx: CanvasRenderingContext2D, fist: Fist) {
  const angle = Math.atan2(fist.vy, fist.vx);
  ctx.save();
  ctx.translate(fist.x, fist.y);
  ctx.rotate(angle);
  ctx.fillStyle = "#fdba74";
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(-18, 8);
  ctx.lineTo(-8, 0);
  ctx.lineTo(-18, -8);
  ctx.fill();
  ctx.fillStyle = "#fff7ed";
  ctx.beginPath();
  ctx.arc(2, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ea580c";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, time: number) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  if (enemy.hurtFlash > 0) ctx.globalAlpha = 0.7;

  if (enemy.kind === "chomp") {
    ctx.rotate(enemy.angle);
    ctx.fillStyle = "#e11d48";
    fillRoundRect(ctx, -18, -16, 36, 32, 8);
    ctx.fillStyle = "#fecdd3";
    fillRoundRect(ctx, -6, -6, 16, 12, 3);
    ctx.fillStyle = "#fff";
    ctx.fillRect(-4, -2, 4, 6);
    ctx.fillRect(4, -2, 4, 6);
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(10, -2, 3, 0, Math.PI * 2);
    ctx.arc(10, 6, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.kind === "balloon") {
    const bob = Math.sin(time * 3 + enemy.angle) * 3;
    ctx.translate(0, bob);
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 16);
    ctx.lineTo(0, 28);
    ctx.stroke();
    ctx.fillStyle = enemy.attackTimer < 0.4 ? "#f43f5e" : "#a855f7";
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.ellipse(-7, -8, 5, 8, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillRect(-8, -2, 5, 5);
    ctx.fillRect(4, -2, 5, 5);
  } else if (enemy.kind === "saw") {
    ctx.rotate(enemy.angle);
    ctx.fillStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#94a3b8";
    for (let i = 0; i < 8; i += 1) {
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.moveTo(enemy.radius - 2, -4);
      ctx.lineTo(enemy.radius + 8, 0);
      ctx.lineTo(enemy.radius - 2, 4);
      ctx.fill();
    }
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.kind === "washer") {
    const step = Math.sin(time * 8) * 4;
    ctx.fillStyle = "#1e293b";
    fillRoundRect(ctx, -16, 28, 12, 16 + step, 3);
    fillRoundRect(ctx, 6, 28, 12, 16 - step, 3);
    ctx.fillStyle = "#e0f2fe";
    fillRoundRect(ctx, -40, -36, 80, 78, 12);
    ctx.fillStyle = "#0ea5e9";
    ctx.beginPath();
    ctx.arc(0, 6, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 6, 12, time * 3, time * 3 + 1.4);
    ctx.stroke();
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(-10, -24, 6, 6);
    ctx.fillRect(4, -24, 6, 6);
    if (enemy.attackTimer < 0.45) {
      ctx.strokeStyle = "rgba(248,113,113,0.8)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 70 + (0.45 - enemy.attackTimer) * 40, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (enemy.kind === "dragon") {
    ctx.rotate(enemy.angle + Math.PI / 2);
    ctx.fillStyle = "#fb923c";
    ctx.beginPath();
    ctx.ellipse(0, 8, 28, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.ellipse(-20, -6, 16, 8, -0.6, 0, Math.PI * 2);
    ctx.ellipse(20, -6, 16, 8, 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fdba74";
    ctx.beginPath();
    ctx.ellipse(0, -16, 16, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(-8, 4, 4, 0, Math.PI * 2);
    ctx.arc(8, 6, 3, 0, Math.PI * 2);
    ctx.arc(0, 12, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillRect(-6, -22, 4, 4);
    ctx.fillRect(3, -22, 4, 4);
    if (enemy.attackTimer < 0.28) {
      ctx.fillStyle = "#fef08a";
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(8, 10);
      ctx.lineTo(-8, 10);
      ctx.fill();
    }
  } else {
    ctx.rotate(enemy.angle);
    if (enemy.phase === 1) ctx.scale(1.08, 0.92);
    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.ellipse(-18, 6, 16, 10, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(8, 0, 24, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(28, -8, 16, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#14532d";
    fillRoundRect(ctx, 16, -14, 22, 8, 3);
    ctx.fillStyle = "#0f172a";
    fillRoundRect(ctx, 18, -12, 16, 5, 2);
    ctx.fillStyle = "#fff";
    ctx.fillRect(28, -11, 3, 3);
    if (enemy.phase === 0 && enemy.attackTimer < 0.4) {
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 4;
      ctx.strokeRect(-36, -28, 78, 52);
    }
  }

  ctx.restore();

  if (enemy.boss) {
    const ratio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    fillRoundRect(ctx, enemy.x - 28, enemy.y - enemy.radius - 16, 56, 7, 3);
    ctx.fillStyle = "#f43f5e";
    fillRoundRect(ctx, enemy.x - 28, enemy.y - enemy.radius - 16, 56 * ratio, 7, 3);
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, state: RocketState, time: number) {
  const { playerX: x, playerY: y, facing } = state;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1.7, 1.7);
  if (state.invuln > 0 && Math.sin(time * 28) > 0) ctx.globalAlpha = 0.45;

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, 18, 16, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  if (state.shieldLeft > 0) {
    ctx.strokeStyle = `rgba(125,211,252,${0.55 + Math.sin(time * 8) * 0.25})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 2, PLAYER_RADIUS + 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = "#f8fafc";
  ctx.beginPath();
  ctx.arc(2, 2, PLAYER_RADIUS + 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2563eb";
  fillRoundRect(ctx, -11, -4, 22, 22, 8);
  ctx.fillStyle = "#fde68a";
  ctx.beginPath();
  ctx.arc(0, -8, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0f172a";
  fillRoundRect(ctx, -8, -12, 16, 6, 3);

  ctx.save();
  ctx.rotate(facing);
  ctx.fillStyle = "#ea580c";
  ctx.beginPath();
  ctx.arc(PLAYER_RADIUS + 1, 2, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffedd5";
  ctx.beginPath();
  ctx.arc(PLAYER_RADIUS + 3, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  if (state.tripleLeft > 0) {
    ctx.fillStyle = "#fef08a";
    ctx.beginPath();
    ctx.arc(PLAYER_RADIUS + 1, -8, 4, 0, Math.PI * 2);
    ctx.arc(PLAYER_RADIUS + 1, 10, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const particle of particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawWorld(
  ctx: CanvasRenderingContext2D,
  state: RocketState,
  w: number,
  h: number,
  time: number
) {
  ctx.save();
  if (state.shake > 0.4) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }

  for (const pickup of state.pickups) drawPickup(ctx, pickup, time);
  for (const hazard of state.hazards) drawHazard(ctx, hazard, time);
  for (const enemy of state.enemies) drawEnemy(ctx, enemy, time);
  for (const fist of state.fists) drawFist(ctx, fist);
  drawParticles(ctx, state.particles);
  drawPlayer(ctx, state, time);

  ctx.font = "800 22px Fredoka, sans-serif";
  ctx.textAlign = "center";
  for (const floater of state.floaters) {
    ctx.globalAlpha = Math.max(0, floater.life / floater.maxLife);
    ctx.fillStyle = floater.big ? "#fef08a" : "#fff";
    ctx.font = floater.big ? "800 26px Fredoka, sans-serif" : "700 16px Fredoka, sans-serif";
    ctx.fillText(floater.text, floater.x, floater.y);
  }
  ctx.globalAlpha = 1;

  if (state.hearts === 1 && !state.gameOver) {
    const pulse = 0.12 + Math.sin(time * 8) * 0.05;
    const vignette = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.7);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, `rgba(239,68,68,${pulse})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  }

  if (state.hurtFlash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${state.hurtFlash})`;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

function drawAttract(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  ctx.save();
  ctx.translate(w / 2, h / 2 + Math.sin(time * 3) * 10);
  ctx.rotate(Math.sin(time * 2) * 0.15);
  ctx.fillStyle = "#fb923c";
  ctx.beginPath();
  ctx.arc(0, 0, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffedd5";
  ctx.beginPath();
  ctx.arc(8, -8, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function RocketFistGameClient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<RocketState | null>(null);
  const phaseRef = useRef<Phase>("menu");
  const keysRef = useRef<Set<string>>(new Set());
  const aimRef = useRef<{ x: number; y: number } | null>(null);
  const stickRef = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const spacePunchRef = useRef(false);
  const buttonPunchRef = useRef(false);
  const mousePunchRef = useRef(false);
  const hudKeyRef = useRef("");
  const dashEdgeRef = useRef(false);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const junkRef = useRef<Junk[]>([]);
  const knobRef = useRef<HTMLSpanElement>(null);

  const [phase, setPhase] = useState<Phase>("menu");
  const [hud, setHud] = useState<Hud>(EMPTY_HUD);
  const best = useSyncExternalStore(subscribeBest, readBestSnapshot, () => EMPTY_BEST);
  const [isNewBest, setIsNewBest] = useState(false);
  const [stickActive, setStickActive] = useState(false);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      sizeRef.current = { w, h, dpr };
      junkRef.current = junkFor(w, h);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(parent);

    let raf = 0;
    let last = performance.now();
    let alive = true;

    const loop = (now: number) => {
      if (!alive) return;
      const { w, h, dpr } = sizeRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx && w > 0 && h > 0) {
        if (phaseRef.current === "playing" && gameRef.current) {
          const dt = Math.min(0.033, (now - last) / 1000);
          const move = readMove(keysRef.current, stickRef.current);
          const aim = aimRef.current ?? {
            x: gameRef.current.playerX + 80,
            y: gameRef.current.playerY,
          };
          const events = tick(gameRef.current, dt, {
            moveX: move.x,
            moveY: move.y,
            aimX: aim.x,
            aimY: aim.y,
            punch: spacePunchRef.current || buttonPunchRef.current || mousePunchRef.current,
            dash: dashEdgeRef.current,
            width: w,
            height: h,
          });
          dashEdgeRef.current = false;
          reactTo(events, gameRef.current);
          const nextHud = hudFrom(gameRef.current);
          const hudKey = [
            nextHud.score,
            nextHud.hearts,
            nextHud.combo,
            nextHud.wave,
            nextHud.banner,
            nextHud.bannerOn,
            nextHud.triple > 0,
            nextHud.shield > 0,
            nextHud.slow > 0,
            nextHud.bossName,
            nextHud.bossHp,
            nextHud.dashReady,
            nextHud.bestCombo,
            nextHud.kills,
          ].join("|");
          if (hudKey !== hudKeyRef.current) {
            hudKeyRef.current = hudKey;
            setHud(nextHud);
          }
        }
        last = now;
        if (knobRef.current) {
          knobRef.current.style.transform = `translate(${stickRef.current.px}px, ${stickRef.current.py}px)`;
        }

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        drawBackground(ctx, w, h, now / 1000, junkRef.current);
        if (gameRef.current && phaseRef.current !== "menu") {
          drawWorld(ctx, gameRef.current, w, h, now / 1000);
        } else {
          drawAttract(ctx, w, h, now / 1000);
        }
      }
      raf = requestAnimationFrame(loop);
    };

    const reactTo = (events: ReturnType<typeof tick>, state: RocketState) => {
      for (const event of events) {
        if (event.type === "punch") playRocketPunch();
        if (event.type === "explode") playRocketExplode(event.big);
        if (event.type === "dash") playRocketDash();
        if (event.type === "hurt") playRocketHurt();
        if (event.type === "block") playRocketBlock();
        if (event.type === "pickup") playRocketPickup(event.kind);
        if (event.type === "wave") playRocketWave();
        if (event.type === "boss") playRocketBoss();
        if (event.type === "gameover") {
          const saved = saveBest(state.score, state.bestCombo);
          notifyBest();
          setIsNewBest(saved.isNewScore);
          phaseRef.current = "gameover";
          setPhase("gameover");
          mousePunchRef.current = false;
          spacePunchRef.current = false;
          buttonPunchRef.current = false;
        }
      }
    };

    raf = requestAnimationFrame(loop);
    return () => {
      alive = false;
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      keysRef.current.add(key);
      if (phaseRef.current !== "playing") return;
      if (event.code === "Space" || event.key === " ") {
        event.preventDefault();
        spacePunchRef.current = true;
      }
      if (event.key === "Shift" && !event.repeat) dashEdgeRef.current = true;
      if (key.startsWith("arrow")) event.preventDefault();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current.delete(event.key.toLowerCase());
      if (event.code === "Space" || event.key === " ") spacePunchRef.current = false;
    };
    const onPointerUp = () => {
      mousePunchRef.current = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  const startGame = () => {
    const { w, h } = sizeRef.current;
    const width = w || window.innerWidth;
    const height = h || window.innerHeight;
    const state = createInitialState(width, height);
    gameRef.current = state;
    aimRef.current = { x: width * 0.72, y: height / 2 };
    dashEdgeRef.current = false;
    mousePunchRef.current = false;
    spacePunchRef.current = false;
    buttonPunchRef.current = false;
    phaseRef.current = "playing";
    setPhase("playing");
    setIsNewBest(false);
    setHud(hudFrom(state));
    hudKeyRef.current = "";
    void resumeRocketAudio();
  };

  const moveStick = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = event.clientX - cx;
    let dy = event.clientY - cy;
    const max = rect.width * 0.34;
    const magnitude = Math.hypot(dx, dy);
    if (magnitude > max && magnitude > 0) {
      dx = (dx / magnitude) * max;
      dy = (dy / magnitude) * max;
    }
    stickRef.current = { x: dx / max, y: dy / max, px: dx, py: dy };
  };

  const releaseStick = () => {
    stickRef.current = { x: 0, y: 0, px: 0, py: 0 };
    setStickActive(false);
    if (knobRef.current) knobRef.current.style.transform = "translate(0px, 0px)";
  };

  return (
    <div className="rocket-game-root relative h-full w-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="rocket-arena absolute inset-0 h-full w-full touch-none"
        aria-label="Rocket Fist arena"
        onPointerDown={(event) => {
          if (phaseRef.current !== "playing") return;
          const rect = event.currentTarget.getBoundingClientRect();
          aimRef.current = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          };
          mousePunchRef.current = true;
        }}
        onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          aimRef.current = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          };
        }}
      />

      <div className="pointer-events-none absolute inset-0 z-10">
        <div className="flex items-start justify-between gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <Link href="/" className="pointer-events-auto rocket-hud-pill text-sm font-semibold">
            ← All projects
          </Link>
          <div className="rocket-hud-pill text-sm font-semibold">
            Best: <strong>{best.score}</strong>
          </div>
        </div>

        {phase === "playing" && (
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-3 px-4">
            <div className="rocket-score">{hud.score}</div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <div className="rocket-hearts" aria-label={`${hud.hearts} hearts left`}>
                {Array.from({ length: MAX_HEARTS }, (_, index) => (
                  <span key={index} className={index < hud.hearts ? "is-full" : ""}>
                    ♥
                  </span>
                ))}
              </div>
              <div className="rocket-hud-pill text-sm font-bold">
                Wave <strong>{Math.max(hud.wave, 1)}</strong>
              </div>
              {hud.triple > 0 && <span className="rocket-chip rocket-chip-triple">Triple</span>}
              {hud.shield > 0 && <span className="rocket-chip rocket-chip-shield">Shield</span>}
              {hud.slow > 0 && <span className="rocket-chip rocket-chip-slow">Slow-mo</span>}
            </div>
            {hud.combo >= 2 && <div className="rocket-combo">COMBO x{hud.combo}</div>}
            {hud.bossName && (
              <div className="rocket-boss">
                <div className="flex items-center justify-between text-xs font-extrabold tracking-wide">
                  <span>{hud.bossName}</span>
                  <span>
                    {hud.bossHp}/{hud.bossMax}
                  </span>
                </div>
                <div className="rocket-boss-track">
                  <div style={{ width: `${Math.max(0, (hud.bossHp / hud.bossMax) * 100)}%` }} />
                </div>
              </div>
            )}
            {hud.bannerOn && <div className="rocket-banner">{hud.banner}</div>}
          </div>
        )}
      </div>

      {phase === "playing" && (
        <>
          <div
            className={`rocket-stick${stickActive ? " is-active" : ""}`}
            onPointerDown={(event) => {
              event.preventDefault();
              event.currentTarget.setPointerCapture(event.pointerId);
              setStickActive(true);
              moveStick(event);
            }}
            onPointerMove={(event) => {
              if (!stickActive && event.currentTarget.hasPointerCapture(event.pointerId) === false) {
                return;
              }
              if (event.currentTarget.hasPointerCapture(event.pointerId)) moveStick(event);
            }}
            onPointerUp={releaseStick}
            onPointerCancel={releaseStick}
          >
            <span ref={knobRef} className="rocket-stick-knob" />
            <span className="rocket-stick-label">Move</span>
          </div>
          <div className="rocket-actions">
            <button
              type="button"
              className={`rocket-action${hud.dashReady ? "" : " is-cooling"}`}
              onPointerDown={(event) => {
                event.preventDefault();
                dashEdgeRef.current = true;
              }}
            >
              Dash
            </button>
            <button
              type="button"
              className="rocket-action rocket-action-punch"
              onPointerDown={(event) => {
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
                buttonPunchRef.current = true;
              }}
              onPointerUp={() => {
                buttonPunchRef.current = false;
              }}
              onPointerCancel={() => {
                buttonPunchRef.current = false;
              }}
            >
              Punch
            </button>
          </div>
        </>
      )}

      {phase === "menu" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="rocket-menu-card w-full max-w-md p-8 text-center">
            <p className="text-5xl" aria-hidden>
              👊
            </p>
            <h1 className="rocket-title mt-3 text-5xl font-extrabold">Rocket Fist</h1>
            <p className="mt-3 text-[var(--rocket-muted)]">
              You found a rocket glove in the junkyard. Monsters want it. They can&apos;t have it.
            </p>
            <ul className="mt-5 space-y-2 text-left text-sm font-semibold text-[var(--rocket-ink)]">
              <li className="rocket-control">Move — WASD or arrows</li>
              <li className="rocket-control">Aim — mouse</li>
              <li className="rocket-control">Punch — click or space</li>
              <li className="rocket-control">Dash — shift</li>
            </ul>
            {best.score > 0 && (
              <p className="rocket-hud-pill mt-4 inline-flex text-sm font-semibold">
                Best score <strong>{best.score}</strong>
                <span className="text-[var(--rocket-muted)]">· combo {best.combo}</span>
              </p>
            )}
            <button type="button" className="rocket-btn-primary mt-6 w-full" onClick={startGame}>
              Play
            </button>
          </div>
        </div>
      )}

      {phase === "gameover" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="rocket-menu-card w-full max-w-md p-8 text-center">
            <h2 className="text-3xl font-extrabold">They got the glove.</h2>
            <p className="rocket-score mt-3 text-6xl">{hud.score}</p>
            <p className="mt-1 text-sm font-semibold text-[var(--rocket-muted)]">
              {hud.kills} smashed · best combo x{hud.bestCombo} · wave {hud.wave}
            </p>
            {isNewBest && <p className="mt-3 text-lg font-extrabold text-[var(--rocket-accent)]">New best!</p>}
            <div className="mt-6 flex flex-col gap-3">
              <button type="button" className="rocket-btn-primary w-full" onClick={startGame}>
                Play again
              </button>
              <Link href="/" className="rocket-btn-secondary w-full text-center">
                Back to projects
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function readMove(keys: Set<string>, stick: { x: number; y: number }) {
  let x = stick.x;
  let y = stick.y;
  if (keys.has("a") || keys.has("arrowleft")) x -= 1;
  if (keys.has("d") || keys.has("arrowright")) x += 1;
  if (keys.has("w") || keys.has("arrowup")) y -= 1;
  if (keys.has("s") || keys.has("arrowdown")) y += 1;
  const magnitude = Math.hypot(x, y);
  if (magnitude > 1) {
    x /= magnitude;
    y /= magnitude;
  }
  return { x, y };
}
