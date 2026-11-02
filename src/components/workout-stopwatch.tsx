"use client";

import { useEffect, useState } from "react";

type WorkoutStopwatchProps = {
  startedAt: string | null;
  pausedAt: number | null;
  accumulatedPauseMs: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  finishing?: boolean;
};

export function getStopwatchElapsedMs(
  startedAt: string | null,
  pausedAt: number | null,
  accumulatedPauseMs: number,
  now: number,
): number {
  if (!startedAt) return 0;
  const startMs = new Date(startedAt).getTime();
  if (pausedAt != null) {
    return Math.max(0, pausedAt - startMs - accumulatedPauseMs);
  }
  return Math.max(0, now - startMs - accumulatedPauseMs);
}

export function WorkoutStopwatch({
  startedAt,
  pausedAt,
  accumulatedPauseMs,
  onStart,
  onPause,
  onResume,
  onFinish,
  finishing = false,
}: WorkoutStopwatchProps) {
  const [now, setNow] = useState(Date.now());

  const isRunning = startedAt != null && pausedAt == null;
  const isPaused = startedAt != null && pausedAt != null;
  const isIdle = startedAt == null;

  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [isRunning]);

  const elapsedMs = getStopwatchElapsedMs(
    startedAt,
    pausedAt,
    accumulatedPauseMs,
    now,
  );

  const display = formatStopwatchDisplay(elapsedMs);

  return (
    <div className="workout-stopwatch flex flex-col items-center gap-4">
      <p
        className="font-mono text-6xl font-bold tabular-nums tracking-tight text-[var(--workout-ink)] sm:text-7xl"
        aria-live="polite"
      >
        {display}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {isIdle ? (
          <button type="button" onClick={onStart} className="workout-btn-primary">
            Start timer
          </button>
        ) : null}
        {isRunning ? (
          <button type="button" onClick={onPause} className="workout-btn-secondary">
            Pause
          </button>
        ) : null}
        {isPaused ? (
          <button type="button" onClick={onResume} className="workout-btn-primary">
            Resume
          </button>
        ) : null}
        {!isIdle ? (
          <button
            type="button"
            onClick={onFinish}
            disabled={finishing}
            className="workout-btn-accent disabled:opacity-60"
          >
            {finishing ? "Saving..." : "Finish workout"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function formatStopwatchDisplay(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((ms % 1000) / 100);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}.${tenths}`;
}
