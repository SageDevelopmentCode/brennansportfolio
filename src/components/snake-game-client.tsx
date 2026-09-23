"use client";

import {
  AppleFoodSvg,
  SnakeBodySvg,
  SnakeHeadSvg,
  SnakeTailSvg,
} from "@/components/snake-sprites";
import {
  GRID_SIZE,
  TICK_MS,
  type BorderWallSide,
  type SnakeGameState,
  type Direction,
  createInitialState,
  directionFromKey,
  getBorderWallSides,
  getCellKind,
  getSnakeSegmentInfo,
  loadHighScore,
  saveHighScore,
  tick,
} from "@/lib/snake";
import { useCallback, useEffect, useRef, useState } from "react";

type GamePhase = "menu" | "playing" | "gameover";

const WALL_SIDE_CLASS: Record<BorderWallSide, string> = {
  top: "snake-wall-top",
  right: "snake-wall-right",
  bottom: "snake-wall-bottom",
  left: "snake-wall-left",
};

function SnakeWallCell({ x, y }: { x: number; y: number }) {
  const sides = getBorderWallSides(x, y);
  const wallClasses = sides.map((side) => WALL_SIDE_CLASS[side]).join(" ");

  return (
    <div
      className={`snake-cell snake-wall-cell ${wallClasses}`}
      aria-hidden
    />
  );
}

function SnakeBoardCell({
  gameState,
  x,
  y,
}: {
  gameState: SnakeGameState;
  x: number;
  y: number;
}) {
  const kind = getCellKind(gameState, x, y);
  const current = { x, y };

  if (kind === "border") {
    return <SnakeWallCell x={x} y={y} />;
  }

  if (kind === "empty") {
    return <div className="snake-cell snake-cell-empty" aria-hidden />;
  }

  if (kind === "food") {
    return (
      <div className="snake-cell snake-cell-food" aria-hidden>
        <AppleFoodSvg />
      </div>
    );
  }

  const segment = getSnakeSegmentInfo(gameState, x, y);
  if (!segment) {
    return <div className="snake-cell snake-cell-empty" aria-hidden />;
  }

  if (segment.role === "head" && segment.direction) {
    return (
      <div className="snake-cell snake-cell-snake" aria-hidden>
        <SnakeHeadSvg direction={segment.direction} />
      </div>
    );
  }

  if (segment.role === "tail" && segment.from) {
    return (
      <div className="snake-cell snake-cell-snake" aria-hidden>
        <SnakeTailSvg from={segment.from} current={current} />
      </div>
    );
  }

  if (segment.role === "body" && segment.from && segment.to) {
    return (
      <div className="snake-cell snake-cell-snake" aria-hidden>
        <SnakeBodySvg
          from={segment.from}
          current={current}
          to={segment.to}
          segmentIndex={segment.index}
        />
      </div>
    );
  }

  return <div className="snake-cell snake-cell-empty" aria-hidden />;
}

function DPadButton({
  label,
  onClick,
  ariaLabel,
}: {
  label: string;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="snake-dpad-btn flex h-12 w-12 items-center justify-center text-lg font-bold"
    >
      {label}
    </button>
  );
}

export function SnakeGameClient() {
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [gameState, setGameState] = useState<SnakeGameState>(() =>
    createInitialState()
  );
  const [highScore, setHighScore] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const pendingDirectionRef = useRef<Direction>("right");
  const gameStateRef = useRef(gameState);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setHighScore(loadHighScore());
  }, []);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const queueDirection = useCallback((direction: Direction) => {
    pendingDirectionRef.current = direction;
  }, []);

  const startGame = useCallback(() => {
    const initial = createInitialState();
    pendingDirectionRef.current = initial.direction;
    setGameState(initial);
    setIsNewBest(false);
    setPhase("playing");
  }, []);

  const endGame = useCallback((finalState: SnakeGameState) => {
    const previousHigh = loadHighScore();
    const nextHighScore = saveHighScore(finalState.score);
    setHighScore(nextHighScore);
    setIsNewBest(finalState.score > previousHigh);
    setPhase("gameover");
  }, []);

  useEffect(() => {
    if (phase !== "playing") {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }

    tickRef.current = setInterval(() => {
      const current = gameStateRef.current;
      const next = tick(current, pendingDirectionRef.current);

      if (next.gameOver) {
        setGameState(next);
        endGame(next);
        return;
      }

      setGameState(next);
    }, TICK_MS);

    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [phase, endGame]);

  useEffect(() => {
    if (phase !== "playing") return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const direction = directionFromKey(event.key);
      if (!direction) return;

      event.preventDefault();
      queueDirection(direction);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, queueDirection]);

  const cells = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
    const x = index % GRID_SIZE;
    const y = Math.floor(index / GRID_SIZE);
    return { x, y, key: `${x}-${y}` };
  });

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="snake-glass-card rounded-3xl p-6 sm:p-8">
        {phase === "menu" && (
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-[var(--snake-muted)]">
                How to play
              </p>
              <p className="mt-2 text-[var(--snake-ink)]">
                Eat the apple to grow. Don&apos;t touch the red walls or your
                own tail!
              </p>
            </div>

            {highScore > 0 && (
              <div className="snake-stat-pill w-fit">
                High score: <strong>{highScore}</strong>
              </div>
            )}

            <button
              type="button"
              onClick={startGame}
              className="snake-btn-primary w-full sm:w-auto"
            >
              Start game
            </button>
          </div>
        )}

        {(phase === "playing" || phase === "gameover") && (
          <div className="flex flex-col items-center gap-5">
            <div className="flex w-full items-center justify-between gap-4">
              <div className="snake-stat-pill">
                Score: <strong>{gameState.score}</strong>
              </div>
              <div className="snake-stat-pill">
                Best: <strong>{highScore}</strong>
              </div>
            </div>

            <div
              className="snake-board aspect-square w-full max-w-xl"
              style={{
                gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
              }}
              role="grid"
              aria-label="Snake game board"
            >
              {cells.map((cell) => (
                <div key={cell.key} role="gridcell">
                  <SnakeBoardCell gameState={gameState} x={cell.x} y={cell.y} />
                </div>
              ))}
            </div>

            {phase === "playing" && (
              <div className="flex flex-col items-center gap-2">
                <DPadButton
                  label="↑"
                  ariaLabel="Move up"
                  onClick={() => queueDirection("up")}
                />
                <div className="flex gap-2">
                  <DPadButton
                    label="←"
                    ariaLabel="Move left"
                    onClick={() => queueDirection("left")}
                  />
                  <DPadButton
                    label="↓"
                    ariaLabel="Move down"
                    onClick={() => queueDirection("down")}
                  />
                  <DPadButton
                    label="→"
                    ariaLabel="Move right"
                    onClick={() => queueDirection("right")}
                  />
                </div>
                <p className="text-xs text-[var(--snake-muted)]">
                  Arrow keys or WASD also work
                </p>
              </div>
            )}

            {phase === "gameover" && (
              <div className="flex w-full flex-col items-center gap-4 text-center">
                <p className="text-2xl font-extrabold text-[var(--snake-ink)]">
                  Game over!
                </p>
                <p className="text-[var(--snake-muted)]">
                  You scored{" "}
                  <strong className="text-[var(--snake-accent)]">
                    {gameState.score}
                  </strong>
                  {isNewBest ? " — new high score!" : ""}
                </p>
                <button
                  type="button"
                  onClick={startGame}
                  className="snake-btn-primary w-full sm:w-auto"
                >
                  Play again
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
