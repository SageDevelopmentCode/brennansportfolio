"use client";

import {
  MAX_HEALTH,
  PLAYER_SPEED,
  PLAYER_WIDTH,
  WIN_SCORE,
  type Blob,
  type Chicken,
  type EggGameState,
  type HeartPickup,
  createInitialState,
  getPlayerY,
  isSwinging,
  loadHighScore,
  movePlayer,
  saveHighScore,
  startSwing,
  tick,
} from "@/lib/eggs";
import { playBlobBoom } from "@/lib/egg-sounds";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type GamePhase = "menu" | "playing" | "win" | "gameover";

function getHeartState(
  index: number,
  health: number
): "full" | "half" | "empty" {
  const heartValue = health - index;
  if (heartValue >= 1) return "full";
  if (heartValue >= 0.5) return "half";
  return "empty";
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, "#fef9e7");
  gradient.addColorStop(0.4, "#fde68a");
  gradient.addColorStop(1, "#fbbf24");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(180, 120, 40, 0.08)";
  ctx.lineWidth = 1;
  const tile = 48;
  for (let x = 0; x < w; x += tile) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += tile) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
}

function drawEgg(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 1.15);

  ctx.beginPath();
  ctx.ellipse(0, 0, radius, radius * 0.95, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#fffef5";
  ctx.fill();
  ctx.strokeStyle = "rgba(200, 180, 140, 0.6)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(0, radius * 0.15, radius * 0.45, radius * 0.38, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#fbbf24";
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(-radius * 0.25, -radius * 0.35, radius * 0.12, radius * 0.08, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.fill();

  ctx.restore();
}

function drawSpike(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number
) {
  ctx.save();
  ctx.translate(x, y);

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-width / 2, height);
  ctx.lineTo(width / 2, height);
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, "#9ca3af");
  grad.addColorStop(0.5, "#6b7280");
  grad.addColorStop(1, "#374151");
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "#1f2937";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

function drawBlob(
  ctx: CanvasRenderingContext2D,
  blob: Blob,
  time: number
) {
  const { x, y, radius, wobblePhase } = blob;
  const wobble = Math.sin(time * 6 + wobblePhase) * 4;
  const r = radius + wobble * 0.12;

  ctx.save();
  ctx.translate(x, y);

  const bodyGrad = ctx.createRadialGradient(-r * 0.25, -r * 0.25, r * 0.1, 0, 0, r);
  bodyGrad.addColorStop(0, "#ff6b6b");
  bodyGrad.addColorStop(0.55, "#ef4444");
  bodyGrad.addColorStop(1, "#b91c1c");

  ctx.beginPath();
  ctx.ellipse(wobble * 0.15, 0, r * 1.08, r * 0.94, 0, 0, Math.PI * 2);
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  ctx.strokeStyle = "#7f1d1d";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = "#fca5a5";
  ctx.beginPath();
  ctx.ellipse(-r * 0.62, r * 0.08, r * 0.22, r * 0.18, 0, 0, Math.PI * 2);
  ctx.ellipse(r * 0.62, r * 0.08, r * 0.22, r * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.strokeStyle = "#450a0a";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-r * 0.38, -r * 0.22);
  ctx.lineTo(-r * 0.18, -r * 0.08);
  ctx.moveTo(r * 0.38, -r * 0.22);
  ctx.lineTo(r * 0.18, -r * 0.08);
  ctx.stroke();

  ctx.fillStyle = "#1a0505";
  ctx.beginPath();
  ctx.ellipse(-r * 0.22, -r * 0.02, r * 0.1, r * 0.14, 0.2, 0, Math.PI * 2);
  ctx.ellipse(r * 0.22, -r * 0.02, r * 0.1, r * 0.14, -0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, r * 0.32, r * 0.28, 0.15, Math.PI - 0.15);
  ctx.strokeStyle = "#450a0a";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.restore();
}

function drawHeartPickup(
  ctx: CanvasRenderingContext2D,
  heart: HeartPickup,
  time: number
) {
  const pulse = 1 + Math.sin(time * 6) * 0.08;
  const r = heart.radius * pulse;

  ctx.save();
  ctx.translate(heart.x, heart.y);
  ctx.scale(r / 16, r / 16);

  ctx.shadowColor = "rgba(239, 68, 68, 0.5)";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.bezierCurveTo(0, -2, -10, -2, -10, 4);
  ctx.bezierCurveTo(-10, 10, 0, 16, 0, 20);
  ctx.bezierCurveTo(0, 16, 10, 10, 10, 4);
  ctx.bezierCurveTo(10, -2, 0, -2, 0, 4);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  ctx.beginPath();
  ctx.ellipse(-3, 2, 3, 2.5, -0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawChicken(
  ctx: CanvasRenderingContext2D,
  chicken: Chicken
) {
  const { x, y, facing, flapPhase } = chicken;
  const flap = Math.sin(flapPhase) * 6;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing, 1);

  ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
  ctx.beginPath();
  ctx.ellipse(0, 14, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fef3c7";
  ctx.beginPath();
  ctx.ellipse(0, 2, 14, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#d97706";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#fbbf24";
  ctx.beginPath();
  ctx.ellipse(-10, 4 + flap * 0.3, 8, 5, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-10, 4 - flap * 0.3, 8, 5, 0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f59e0b";
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(20, 2);
  ctx.lineTo(12, 4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.moveTo(-2, -8);
  ctx.lineTo(2, -14);
  ctx.lineTo(6, -8);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#1a1a2e";
  ctx.beginPath();
  ctx.arc(6, -2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(7, -2.5, 0.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#d97706";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-6, 12);
  ctx.lineTo(-6, 18);
  ctx.moveTo(4, 12);
  ctx.lineTo(4, 18);
  ctx.stroke();

  ctx.restore();
}

function drawSpatula(
  ctx: CanvasRenderingContext2D,
  swingProgress: number
) {
  const angle = -0.25 - swingProgress * 1.1;

  ctx.save();
  ctx.rotate(angle);

  const handleGrad = ctx.createLinearGradient(0, -2, 30, 2);
  handleGrad.addColorStop(0, "#8B6914");
  handleGrad.addColorStop(1, "#c4a574");
  ctx.fillStyle = handleGrad;
  ctx.fillRect(0, -2.5, 30, 5);
  ctx.strokeStyle = "#6b4f1a";
  ctx.lineWidth = 0.8;
  ctx.strokeRect(0, -2.5, 30, 5);

  ctx.beginPath();
  ctx.ellipse(34, 0, 11, 8, 0, 0, Math.PI * 2);
  const headGrad = ctx.createRadialGradient(30, -2, 1, 34, 0, 11);
  headGrad.addColorStop(0, "#e8d4b0");
  headGrad.addColorStop(1, "#c4a574");
  ctx.fillStyle = headGrad;
  ctx.fill();
  ctx.strokeStyle = "#a08060";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  swingProgress: number,
  time: number
) {
  const bob = Math.sin(time * 4) * 1.5;

  ctx.save();
  ctx.translate(x, y + bob);

  ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
  ctx.beginPath();
  ctx.ellipse(0, 34, 22, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2d2d2d";
  ctx.fillRect(-11, 28, 9, 10);
  ctx.fillRect(2, 28, 9, 10);
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(-12, 36, 11, 4);
  ctx.fillRect(1, 36, 11, 4);

  const pantsGrad = ctx.createLinearGradient(-14, 18, 14, 30);
  pantsGrad.addColorStop(0, "#374151");
  pantsGrad.addColorStop(1, "#1f2937");
  ctx.fillStyle = pantsGrad;
  ctx.fillRect(-14, 18, 28, 14);

  const shirtGrad = ctx.createLinearGradient(-18, 4, 18, 20);
  shirtGrad.addColorStop(0, "#f8fafc");
  shirtGrad.addColorStop(1, "#e2e8f0");
  ctx.fillStyle = shirtGrad;
  ctx.beginPath();
  ctx.moveTo(-18, 6);
  ctx.lineTo(18, 6);
  ctx.lineTo(16, 22);
  ctx.lineTo(-16, 22);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#f1f5f9";
  ctx.fillRect(-10, 8, 20, 16);
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1;
  ctx.strokeRect(-10, 8, 20, 16);
  ctx.beginPath();
  ctx.moveTo(-10, 12);
  ctx.lineTo(10, 12);
  ctx.stroke();

  ctx.fillStyle = "#f5d0a9";
  ctx.beginPath();
  ctx.ellipse(-20, 14, 6, 5, 0.3, 0, Math.PI * 2);
  ctx.ellipse(20, 14, 6, 5, -0.3, 0, Math.PI * 2);
  ctx.fill();

  const headGrad = ctx.createRadialGradient(-4, -6, 2, 0, -2, 16);
  headGrad.addColorStop(0, "#ffe4c4");
  headGrad.addColorStop(1, "#e8b88a");
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(0, -2, 15, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#3d2914";
  ctx.beginPath();
  ctx.arc(0, -6, 14, Math.PI, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(0, -18, 16, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#f1f5f9";
  ctx.fillRect(-14, -20, 28, 5);

  ctx.fillStyle = "#1a1a2e";
  ctx.beginPath();
  ctx.ellipse(-5, -1, 2.8, 3.2, 0, 0, Math.PI * 2);
  ctx.ellipse(5, -1, 2.8, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(-4, -2, 1, 0, Math.PI * 2);
  ctx.arc(6, -2, 1, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#c49a6c";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 4, 4, 0.2, Math.PI - 0.2);
  ctx.stroke();

  ctx.save();
  ctx.translate(18, 12);
  drawSpatula(ctx, swingProgress);
  ctx.restore();

  if (swingProgress > 0) {
    ctx.strokeStyle = `rgba(251, 191, 36, ${0.25 + swingProgress * 0.45})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(8, -6, 44 + swingProgress * 12, Math.PI * 1.05, Math.PI * 1.65);
    ctx.stroke();
  }

  ctx.restore();
}

function renderGame(
  ctx: CanvasRenderingContext2D,
  state: EggGameState,
  width: number,
  height: number,
  now: number,
  time: number
) {
  drawBackground(ctx, width, height);

  for (const egg of state.eggs) {
    drawEgg(ctx, egg.x, egg.y, egg.radius);
  }

  for (const spike of state.spikes) {
    drawSpike(ctx, spike.x, spike.y, spike.width, spike.height);
  }

  for (const heart of state.hearts) {
    drawHeartPickup(ctx, heart, time);
  }

  for (const chicken of state.chickens) {
    drawChicken(ctx, chicken);
  }

  for (const blob of state.blobs) {
    drawBlob(ctx, blob, time);
  }

  const swinging = isSwinging(state, now);
  const swingProgress = swinging
    ? 1 - (state.swingUntil - now) / 220
    : 0;

  drawPlayer(ctx, state.playerX, getPlayerY(height), swingProgress, time);
}

export function EggWhackClient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [gameState, setGameState] = useState<EggGameState | null>(null);
  const [highScore, setHighScore] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isNewBest, setIsNewBest] = useState(false);

  const phaseRef = useRef(phase);
  const gameStateRef = useRef<EggGameState | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const lastFrameRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    setHighScore(loadHighScore());
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    setDimensions({ width, height });

    if (gameStateRef.current) {
      const updated = {
        ...gameStateRef.current,
        playerX: Math.min(
          width - PLAYER_WIDTH / 2 - 8,
          Math.max(PLAYER_WIDTH / 2 + 8, gameStateRef.current.playerX)
        ),
      };
      gameStateRef.current = updated;
      setGameState(updated);
    }
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  const startGame = useCallback(() => {
    const width = window.innerWidth;
    const state = createInitialState(width);
    gameStateRef.current = state;
    setGameState(state);
    setIsNewBest(false);
    setPhase("playing");
    lastFrameRef.current = performance.now();
  }, []);

  const handleSwing = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    const state = gameStateRef.current;
    if (!state) return;
    const now = performance.now();
    const next = startSwing(state, now);
    gameStateRef.current = next;
    setGameState(next);
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;

    const loop = (now: number) => {
      if (phaseRef.current !== "playing") return;

      const dt = Math.min((now - lastFrameRef.current) / 1000, 0.05);
      lastFrameRef.current = now;

      let state = gameStateRef.current;
      if (!state) return;

      const keys = keysRef.current;
      let dx = 0;
      if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) dx -= PLAYER_SPEED * dt;
      if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) dx += PLAYER_SPEED * dt;

      if (dx !== 0) {
        state = movePlayer(state, dx, dimensions.width || window.innerWidth);
      }

      const tickResult = tick(
        state,
        dt,
        now,
        dimensions.width || window.innerWidth,
        dimensions.height || window.innerHeight
      );
      state = tickResult.state;

      if (tickResult.events.blobsKilled > 0) {
        for (let i = 0; i < tickResult.events.blobsKilled; i++) {
          playBlobBoom();
        }
      }

      gameStateRef.current = state;
      setGameState(state);

      if (state.won) {
        const prevHigh = loadHighScore();
        const newBest = saveHighScore(state.score);
        setHighScore(newBest);
        setIsNewBest(state.score > prevHigh);
        setPhase("win");
        return;
      }

      if (state.gameOver) {
        saveHighScore(state.score);
        setPhase("gameover");
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx && canvas) {
        const w = dimensions.width || window.innerWidth;
        const h = dimensions.height || window.innerHeight;
        renderGame(ctx, state, w, h, now, now / 1000);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, dimensions]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);

      if (phaseRef.current === "playing") {
        if (e.key === " " || e.key === "Spacebar") {
          e.preventDefault();
          handleSwing();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [handleSwing]);

  const handlePointerDown = () => {
    if (phase !== "playing") return;
    handleSwing();
  };

  const handleMoveLeft = () => {
    if (phase !== "playing") return;
    const state = gameStateRef.current;
    if (!state) return;
    const w = dimensions.width || window.innerWidth;
    const next = movePlayer(state, -PLAYER_SPEED * 0.05, w);
    gameStateRef.current = next;
    setGameState(next);
  };

  const handleMoveRight = () => {
    if (phase !== "playing") return;
    const state = gameStateRef.current;
    if (!state) return;
    const w = dimensions.width || window.innerWidth;
    const next = movePlayer(state, PLAYER_SPEED * 0.05, w);
    gameStateRef.current = next;
    setGameState(next);
  };

  const score = gameState?.score ?? 0;
  const health = gameState?.health ?? MAX_HEALTH;

  return (
    <div className="eggs-game-root relative h-[100dvh] w-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none"
        onPointerDown={handlePointerDown}
        aria-label="Egg Whack game arena"
      />

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
        <div className="flex items-start justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <Link
            href="/"
            className="pointer-events-auto eggs-hud-pill text-sm font-semibold"
          >
            ← All projects
          </Link>
          <div className="eggs-hud-pill text-sm font-semibold">
            Best: <strong>{highScore}</strong>
          </div>
        </div>

        {phase === "playing" && (
          <div className="flex flex-col items-center gap-3">
            <div className="eggs-score-display">
              {score} / {WIN_SCORE}
            </div>
            <div
              className="eggs-health-bar"
              aria-label={`Health: ${health} of ${MAX_HEALTH} hearts`}
            >
              {Array.from({ length: MAX_HEALTH }, (_, i) => {
                const heartState = getHeartState(i, health);
                return (
                  <span
                    key={i}
                    className={`eggs-heart eggs-heart-${heartState}${
                      health <= 2 && heartState !== "empty" ? " critical" : ""
                    }`}
                    aria-hidden
                  >
                    {heartState === "half" ? (
                      <span className="eggs-heart-half-wrap">
                        <span className="eggs-heart-half-fill">♥</span>
                        <span className="eggs-heart-half-empty">♡</span>
                      </span>
                    ) : heartState === "full" ? (
                      "♥"
                    ) : (
                      "♡"
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {phase === "playing" && (
        <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-center gap-4 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:hidden">
          <button
            type="button"
            className="eggs-mobile-btn"
            onPointerDown={(e) => {
              e.preventDefault();
              handleMoveLeft();
            }}
            aria-label="Move left"
          >
            ←
          </button>
          <button
            type="button"
            className="eggs-mobile-btn"
            onPointerDown={(e) => {
              e.preventDefault();
              handleMoveRight();
            }}
            aria-label="Move right"
          >
            →
          </button>
        </div>
      )}

      {phase === "menu" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="eggs-menu-card mx-4 max-w-md p-8 text-center">
            <span className="text-6xl" aria-hidden>🍳</span>
            <h1 className="eggs-title mt-4 text-5xl font-extrabold">Egg Whack</h1>
            <p className="mt-3 text-[var(--eggs-muted)]">
              Move with arrow keys or A/D. Press space or tap to swing your
              spatula. Whack 100 eggs to win! Dodge spikes and chickens (2
              hearts!), whack angry red blobs, and catch falling hearts for
              extra health.
            </p>
            {highScore > 0 && (
              <p className="eggs-stat-pill mt-4 inline-flex">
                Best score: <strong>{highScore}</strong>
              </p>
            )}
            <button
              type="button"
              className="eggs-btn-primary mt-6 w-full"
              onClick={startGame}
            >
              Start game
            </button>
          </div>
        </div>
      )}

      {phase === "win" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="eggs-menu-card mx-4 max-w-md p-8 text-center">
            <h2 className="text-3xl font-bold text-[var(--eggs-ink)]">
              You whacked 100 eggs!
            </h2>
            <p className="mt-2 text-5xl font-extrabold text-[var(--eggs-accent)]">
              {score}
            </p>
            {isNewBest && (
              <p className="mt-3 text-lg font-bold text-[var(--eggs-accent)]">
                New best score!
              </p>
            )}
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                className="eggs-btn-primary w-full"
                onClick={startGame}
              >
                Play again
              </button>
              <Link href="/" className="eggs-btn-secondary w-full text-center">
                Back to projects
              </Link>
            </div>
          </div>
        </div>
      )}

      {phase === "gameover" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="eggs-menu-card mx-4 max-w-md p-8 text-center">
            <h2 className="text-3xl font-bold text-[var(--eggs-ink)]">
              Ouch! Out of health!
            </h2>
            <p className="mt-2 text-5xl font-extrabold text-[var(--eggs-accent)]">
              {score}
            </p>
            <p className="mt-1 text-sm text-[var(--eggs-muted)]">
              eggs whacked
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                className="eggs-btn-primary w-full"
                onClick={startGame}
              >
                Try again
              </button>
              <Link href="/" className="eggs-btn-secondary w-full text-center">
                Back to projects
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
