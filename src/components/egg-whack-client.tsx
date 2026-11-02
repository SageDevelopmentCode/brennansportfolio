"use client";

import type { EggWhackFxRef } from "@/components/egg-whack-scene";
import {
  HUNGER_MAX,
  createInitialState,
  getDifficultyLabel,
  loadHighScore,
  saveHighScore,
  tick,
  tryChangeLane,
  tryJump,
  type EggGameState,
} from "@/lib/eggs";
import {
  playBananaCollect,
  playCrash,
  startJungleAmbient,
  stopJungleAmbient,
} from "@/lib/egg-sounds";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const EggWhackScene = dynamic(() => import("@/components/egg-whack-scene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm font-semibold text-white/70">
      Loading jungle…
    </div>
  ),
});

type GamePhase = "menu" | "playing" | "gameover";

export function EggWhackClient() {
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [gameState, setGameState] = useState<EggGameState | null>(null);
  const [highScore, setHighScore] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [scorePop, setScorePop] = useState(false);

  const phaseRef = useRef(phase);
  const prevScoreRef = useRef(0);
  const fxRef = useRef<EggWhackFxRef>({ collectAt: 0, hurtAt: 0 });
  const gameStateRef = useRef<EggGameState | null>(null);
  const clockRef = useRef(0);
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
    return () => stopJungleAmbient();
  }, []);

  const startGame = useCallback(() => {
    const state = createInitialState();
    gameStateRef.current = state;
    prevScoreRef.current = 0;
    fxRef.current = { collectAt: 0, hurtAt: 0 };
    setGameState(state);
    setIsNewBest(false);
    setScorePop(false);
    setPhase("playing");
    lastFrameRef.current = performance.now();
    startJungleAmbient();
  }, []);

  const handleJump = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    const state = gameStateRef.current;
    if (!state) return;
    const now = performance.now();
    const next = tryJump(state, now);
    if (next.playerVy === state.playerVy) return;
    gameStateRef.current = next;
    setGameState(next);
  }, []);

  const handleLane = useCallback((direction: -1 | 1) => {
    if (phaseRef.current !== "playing") return;
    const state = gameStateRef.current;
    if (!state) return;
    const now = performance.now();
    const next = tryChangeLane(state, direction, now);
    if (next.playerLane === state.playerLane) return;
    gameStateRef.current = next;
    setGameState(next);
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;

    const loop = (now: number) => {
      if (phaseRef.current !== "playing") return;

      clockRef.current = now;
      const dt = Math.min((now - lastFrameRef.current) / 1000, 0.05);
      lastFrameRef.current = now;

      let state = gameStateRef.current;
      if (!state) return;

      const tickResult = tick(state, dt, now);
      state = tickResult.state;

      const { bananasCollected, goldenBananasCollected, crashed } =
        tickResult.events;
      const collectCount = bananasCollected + goldenBananasCollected;
      if (collectCount > 0) {
        fxRef.current.collectAt = now;
        for (let i = 0; i < collectCount; i++) {
          playBananaCollect(goldenBananasCollected > 0);
        }
      }
      if (crashed) {
        fxRef.current.hurtAt = now;
        playCrash();
      }

      if (state.score > prevScoreRef.current) {
        prevScoreRef.current = state.score;
        setScorePop(true);
        window.setTimeout(() => setScorePop(false), 280);
      }

      gameStateRef.current = state;
      setGameState(state);

      if (state.gameOver) {
        const prevHigh = loadHighScore();
        const newBest = saveHighScore(state.score);
        setHighScore(newBest);
        setIsNewBest(state.score > prevHigh);
        stopJungleAmbient();
        setPhase("gameover");
        return;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phaseRef.current === "playing") {
        if (
          e.key === " " ||
          e.key === "Spacebar" ||
          e.key === "ArrowUp" ||
          e.key === "w" ||
          e.key === "W"
        ) {
          e.preventDefault();
          handleJump();
        }
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
          e.preventDefault();
          handleLane(-1);
        }
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
          e.preventDefault();
          handleLane(1);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleJump, handleLane]);

  const score = gameState?.score ?? 0;
  const hunger = gameState?.hunger ?? HUNGER_MAX;
  const hungerPct = Math.round((hunger / HUNGER_MAX) * 100);
  const elapsed = gameState?.elapsed ?? 0;
  const heatLabel = getDifficultyLabel(elapsed);
  const timeLabel = `${Math.floor(elapsed / 60)}:${String(Math.floor(elapsed % 60)).padStart(2, "0")}`;
  const showScene = phase === "playing" || phase === "gameover";
  const gameOverReason = gameState?.gameOverReason;

  return (
    <div className="eggs-game-root relative h-[100dvh] w-full overflow-hidden">
      {showScene && (
        <div className="absolute inset-0 z-0">
          <EggWhackScene
            gameState={gameState}
            gameStateRef={gameStateRef}
            clockRef={clockRef}
            fxRef={fxRef}
          />
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
        <div className="flex items-start justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <Link
            href="/"
            className="pointer-events-auto eggs-hud-pill text-sm font-semibold"
          >
            ← All projects
          </Link>
          <div className="eggs-hud-pill text-sm font-semibold">
            Best: <strong>{highScore}</strong> 🍌
          </div>
        </div>

        {phase === "playing" && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="eggs-heat-pill">
                Pace: <strong>{heatLabel}</strong>
              </span>
              <span className="eggs-heat-pill">{timeLabel}</span>
            </div>
            <div
              className={`eggs-score-display${scorePop ? " eggs-score-pop" : ""}`}
            >
              🍌 {score}
            </div>
            <div
              className="eggs-hunger-bar"
              role="meter"
              aria-valuenow={hungerPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Hunger ${hungerPct} percent`}
            >
              <span className="eggs-hunger-label" aria-hidden>🦍</span>
              <div className="eggs-hunger-track">
                <div
                  className={`eggs-hunger-fill${hungerPct <= 25 ? " critical" : ""}`}
                  style={{ width: `${hungerPct}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {phase === "playing" && (
        <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-center gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:hidden">
          <button
            type="button"
            className="eggs-mobile-btn pointer-events-auto"
            onPointerDown={(e) => {
              e.preventDefault();
              handleLane(-1);
            }}
            aria-label="Move left"
          >
            ←
          </button>
          <button
            type="button"
            className="eggs-mobile-btn pointer-events-auto eggs-mobile-btn-jump"
            onPointerDown={(e) => {
              e.preventDefault();
              handleJump();
            }}
            aria-label="Jump"
          >
            ↑
          </button>
          <button
            type="button"
            className="eggs-mobile-btn pointer-events-auto"
            onPointerDown={(e) => {
              e.preventDefault();
              handleLane(1);
            }}
            aria-label="Move right"
          >
            →
          </button>
        </div>
      )}

      {phase === "menu" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-stone-950/55 backdrop-blur-sm">
          <div className="eggs-menu-card mx-4 max-w-md p-8 text-center">
            <span className="text-6xl" aria-hidden>🦍</span>
            <h1 className="eggs-title mt-4 text-5xl font-extrabold">
              Hungry Ape Run
            </h1>
            <p className="mt-3 text-[var(--eggs-muted)]">
              Jungle endless runner! A/D or arrows to switch lanes. Space, W, or
              up to jump over stumps. Grab bananas to feed your hunger — starve
              or hit one obstacle and it&apos;s game over!
            </p>
            {highScore > 0 && (
              <p className="eggs-stat-pill mt-4 inline-flex">
                Best bananas: <strong>{highScore}</strong>
              </p>
            )}
            <button
              type="button"
              className="eggs-btn-primary mt-6 w-full"
              onClick={startGame}
            >
              Start run
            </button>
          </div>
        </div>
      )}

      {phase === "gameover" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-stone-950/55 backdrop-blur-sm">
          <div className="eggs-menu-card mx-4 max-w-md p-8 text-center">
            <h2 className="text-3xl font-bold text-[var(--eggs-ink)]">
              {gameOverReason === "crash"
                ? "Oof! You crashed!"
                : "So hungry… you starved!"}
            </h2>
            <p className="mt-2 text-5xl font-extrabold text-[var(--eggs-accent)]">
              🍌 {score}
            </p>
            <p className="mt-1 text-sm text-[var(--eggs-muted)]">
              bananas collected
            </p>
            {isNewBest && (
              <p className="mt-3 text-lg font-bold text-[var(--eggs-accent)]">
                New best run!
              </p>
            )}
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
