"use client";

import {
  MAX_HEALTH,
  PLAYER_SPEED,
  PLAYER_WIDTH,
  type Bubble,
  type TorchGameState,
  createInitialState,
  getPlayerY,
  loadHighScore,
  movePlayer,
  saveHighScore,
  throwTorch,
  tick,
} from "@/lib/torch";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type GamePhase = "menu" | "playing" | "gameover";

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, "#0f0a1e");
  gradient.addColorStop(0.5, "#1a1035");
  gradient.addColorStop(1, "#2d1b4e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "rgba(255, 140, 50, 0.03)";
  for (let i = 0; i < 30; i++) {
    const x = ((i * 137) % w) + Math.sin(i) * 20;
    const y = (i * 89) % h;
    const r = 1 + (i % 3);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBubble(
  ctx: CanvasRenderingContext2D,
  bubble: Bubble,
  time: number
) {
  const { x, y, radius, wobblePhase, rimOffset } = bubble;
  const wobbleRadius = radius + Math.sin(time * 2 + wobblePhase) * 1.5;
  const rimHue = (rimOffset * 360 + time * 40) % 360;

  ctx.save();

  const glowGrad = ctx.createRadialGradient(x, y, wobbleRadius * 0.5, x, y, wobbleRadius * 1.3);
  glowGrad.addColorStop(0, "rgba(200, 220, 255, 0.08)");
  glowGrad.addColorStop(1, "rgba(200, 220, 255, 0)");
  ctx.beginPath();
  ctx.arc(x, y, wobbleRadius * 1.3, 0, Math.PI * 2);
  ctx.fillStyle = glowGrad;
  ctx.fill();

  const bodyGrad = ctx.createRadialGradient(
    x - wobbleRadius * 0.25,
    y - wobbleRadius * 0.25,
    wobbleRadius * 0.05,
    x,
    y,
    wobbleRadius
  );
  bodyGrad.addColorStop(0, "rgba(255, 255, 255, 0.18)");
  bodyGrad.addColorStop(0.4, "rgba(200, 230, 255, 0.12)");
  bodyGrad.addColorStop(0.75, "rgba(180, 200, 255, 0.06)");
  bodyGrad.addColorStop(1, "rgba(150, 180, 255, 0.02)");

  ctx.beginPath();
  ctx.arc(x, y, wobbleRadius, 0, Math.PI * 2);
  ctx.fillStyle = bodyGrad;
  ctx.globalAlpha = 0.35;
  ctx.fill();
  ctx.globalAlpha = 1;

  const rimGrad = ctx.createLinearGradient(
    x - wobbleRadius,
    y - wobbleRadius,
    x + wobbleRadius,
    y + wobbleRadius
  );
  rimGrad.addColorStop(0, `hsla(${rimHue}, 70%, 75%, 0.55)`);
  rimGrad.addColorStop(0.25, `hsla(${(rimHue + 60) % 360}, 65%, 70%, 0.45)`);
  rimGrad.addColorStop(0.5, `hsla(${(rimHue + 120) % 360}, 60%, 72%, 0.5)`);
  rimGrad.addColorStop(0.75, `hsla(${(rimHue + 200) % 360}, 65%, 68%, 0.45)`);
  rimGrad.addColorStop(1, `hsla(${(rimHue + 280) % 360}, 70%, 75%, 0.55)`);

  ctx.beginPath();
  ctx.arc(x, y, wobbleRadius, 0, Math.PI * 2);
  ctx.strokeStyle = rimGrad;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(
    x - wobbleRadius * 0.35,
    y - wobbleRadius * 0.38,
    wobbleRadius * 0.22,
    wobbleRadius * 0.14,
    -0.5,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(
    x + wobbleRadius * 0.28,
    y + wobbleRadius * 0.22,
    wobbleRadius * 0.1,
    wobbleRadius * 0.06,
    0.4,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y + wobbleRadius * 0.55, wobbleRadius * 0.55, Math.PI * 1.1, Math.PI * 1.9);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

function drawTorch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number
) {
  const flicker = Math.sin(time * 20) * 2;

  ctx.save();
  ctx.translate(x, y);

  ctx.beginPath();
  ctx.moveTo(-3, 6);
  ctx.lineTo(3, 6);
  ctx.lineTo(2, 14);
  ctx.lineTo(-2, 14);
  ctx.closePath();
  ctx.fillStyle = "#8B4513";
  ctx.fill();

  const flameGrad = ctx.createRadialGradient(0, -4 + flicker, 0, 0, -4, 12);
  flameGrad.addColorStop(0, "#fff7c2");
  flameGrad.addColorStop(0.4, "#ff9500");
  flameGrad.addColorStop(1, "rgba(255, 80, 0, 0)");

  ctx.beginPath();
  ctx.ellipse(0, -4 + flicker, 6, 10, 0, 0, Math.PI * 2);
  ctx.fillStyle = flameGrad;
  ctx.fill();

  ctx.shadowColor = "#ff6600";
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(0, -4, 4, 0, Math.PI * 2);
  ctx.fillStyle = "#ffcc00";
  ctx.fill();

  ctx.restore();
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number
) {
  const bob = Math.sin(time * 4) * 2;

  ctx.save();
  ctx.translate(x, y + bob);

  ctx.fillStyle = "#4a3728";
  ctx.beginPath();
  ctx.ellipse(0, 28, 18, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#e8c4a0";
  ctx.beginPath();
  ctx.arc(0, 4, 14, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#3d2914";
  ctx.beginPath();
  ctx.arc(0, 2, 12, Math.PI, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#1a1a2e";
  ctx.beginPath();
  ctx.arc(-5, 4, 2.5, 0, Math.PI * 2);
  ctx.arc(5, 4, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#c45c26";
  ctx.fillRect(-16, 14, 32, 28);
  ctx.fillStyle = "#a04820";
  ctx.fillRect(-14, 16, 28, 4);

  ctx.save();
  ctx.translate(14, 18);
  ctx.rotate(-0.4);
  drawTorch(ctx, 0, 0, time);
  ctx.restore();

  ctx.restore();
}

function drawParticle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  life: number,
  maxLife: number,
  hue: number
) {
  const alpha = life / maxLife;
  ctx.beginPath();
  ctx.arc(x, y, 3 * alpha, 0, Math.PI * 2);
  ctx.fillStyle = `hsla(${hue}, 80%, 70%, ${alpha})`;
  ctx.fill();
}

function renderGame(
  ctx: CanvasRenderingContext2D,
  state: TorchGameState,
  width: number,
  height: number,
  time: number
) {
  drawBackground(ctx, width, height);

  for (const bubble of state.bubbles) {
    drawBubble(ctx, bubble, time);
  }

  for (const torch of state.torches) {
    drawTorch(ctx, torch.x, torch.y, time);
  }

  for (const particle of state.particles) {
    drawParticle(ctx, particle.x, particle.y, particle.life, 0.7, particle.hue);
  }

  drawPlayer(ctx, state.playerX, getPlayerY(height), time);
}

function fireTorch(
  state: TorchGameState,
  height: number
): TorchGameState {
  return throwTorch(state, height);
}

export function TorchGameClient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [gameState, setGameState] = useState<TorchGameState | null>(null);
  const [highScore, setHighScore] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isNewBest, setIsNewBest] = useState(false);
  const [diedFromHealth, setDiedFromHealth] = useState(false);

  const phaseRef = useRef(phase);
  const gameStateRef = useRef<TorchGameState | null>(null);
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

  const endGame = useCallback((finalState: TorchGameState, fromHealth = false) => {
    const prevHigh = loadHighScore();
    const newBest = saveHighScore(finalState.score);
    setHighScore(newBest);
    setIsNewBest(finalState.score > prevHigh);
    setDiedFromHealth(fromHealth);
    setPhase("gameover");
  }, []);

  const startGame = useCallback(() => {
    const width = window.innerWidth;
    const state = createInitialState(width);
    gameStateRef.current = state;
    setGameState(state);
    setIsNewBest(false);
    setDiedFromHealth(false);
    setPhase("playing");
    lastFrameRef.current = performance.now();
  }, []);

  const handleThrow = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    const state = gameStateRef.current;
    if (!state) return;
    const h = dimensions.height || window.innerHeight;
    const next = fireTorch(state, h);
    gameStateRef.current = next;
    setGameState(next);
  }, [dimensions.height]);

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

      state = tick(
        state,
        dt,
        dimensions.width || window.innerWidth,
        dimensions.height || window.innerHeight
      );

      gameStateRef.current = state;
      setGameState(state);

      if (state.gameOver) {
        endGame(state, true);
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx && canvas) {
        const w = dimensions.width || window.innerWidth;
        const h = dimensions.height || window.innerHeight;
        renderGame(ctx, state, w, h, now / 1000);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, dimensions, endGame]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);

      if (phaseRef.current === "playing") {
        if (e.key === " " || e.key === "Spacebar") {
          e.preventDefault();
          handleThrow();
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
  }, [handleThrow]);

  const handlePointerDown = () => {
    if (phase !== "playing") return;
    handleThrow();
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
    <div className="torch-game-root relative h-[100dvh] w-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none"
        onPointerDown={handlePointerDown}
        aria-label="Torch Pop game arena"
      />

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
        <div className="flex items-start justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <Link
            href="/"
            className="pointer-events-auto torch-hud-pill text-sm font-semibold"
          >
            ← All projects
          </Link>
          <div className="torch-hud-pill text-sm font-semibold">
            Best: <strong>{highScore}</strong>
          </div>
        </div>

        {phase === "playing" && (
          <div className="flex flex-col items-center gap-3">
            <div className="torch-score-display">{score}</div>
            <div
              className="torch-health-bar"
              aria-label={`Health: ${health} of ${MAX_HEALTH}`}
            >
              {Array.from({ length: MAX_HEALTH }, (_, i) => (
                <div
                  key={i}
                  className={`torch-health-segment${i < health ? " filled" : ""}${
                    health <= 3 && i < health ? " critical" : health <= 6 && i < health ? " low" : ""
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {phase === "playing" && (
        <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-center gap-4 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:hidden">
          <button
            type="button"
            className="torch-mobile-btn"
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
            className="torch-mobile-btn"
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

      {phase === "playing" && (
        <button
          type="button"
          className="torch-end-btn absolute bottom-4 right-4 z-10"
          onClick={() => {
            const state = gameStateRef.current;
            if (state) endGame(state, false);
          }}
        >
          End run
        </button>
      )}

      {phase === "menu" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="torch-menu-card mx-4 max-w-md p-8 text-center">
            <span className="text-6xl" aria-hidden>🔥</span>
            <h1 className="torch-title mt-4 text-5xl font-extrabold">Torch Pop</h1>
            <p className="mt-3 text-[var(--torch-muted)]">
              Move with arrow keys or A/D. Press space or tap to throw torches
              straight up. Pop bubbles for 1 point — don&apos;t let them hit you!
            </p>
            {highScore > 0 && (
              <p className="torch-stat-pill mt-4 inline-flex">
                High score: <strong>{highScore}</strong>
              </p>
            )}
            <button
              type="button"
              className="torch-btn-primary mt-6 w-full"
              onClick={startGame}
            >
              Start game
            </button>
          </div>
        </div>
      )}

      {phase === "gameover" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="torch-menu-card mx-4 max-w-md p-8 text-center">
            <h2 className="text-3xl font-bold text-[var(--torch-ink)]">
              {diedFromHealth ? "Out of health!" : "Run over!"}
            </h2>
            <p className="mt-2 text-5xl font-extrabold text-[var(--torch-accent)]">
              {score}
            </p>
            <p className="mt-1 text-sm text-[var(--torch-muted)]">bubbles popped</p>
            {isNewBest && (
              <p className="mt-3 text-lg font-bold text-[var(--torch-accent)]">
                New high score!
              </p>
            )}
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                className="torch-btn-primary w-full"
                onClick={startGame}
              >
                Play again
              </button>
              <Link href="/" className="torch-btn-secondary w-full text-center">
                Back to projects
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
