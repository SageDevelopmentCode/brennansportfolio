"use client";

import { MAX_LIVES } from "@/lib/typing";

type TypingHudProps = {
  wpm?: number;
  accuracy?: number;
  score?: number;
  combo?: number;
  timeLeftMs?: number;
  elapsedMs?: number;
  lives: number;
  level?: number;
  label?: string;
};

function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function TypingHud({
  wpm,
  accuracy,
  score,
  combo,
  timeLeftMs,
  elapsedMs,
  lives,
  level,
  label,
}: TypingHudProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2">
        {label && (
          <span className="typing-stat-pill">
            Mode <strong>{label}</strong>
          </span>
        )}
        {level !== undefined && (
          <span className="typing-stat-pill">
            Level <strong>{level}</strong>
          </span>
        )}
        {wpm !== undefined && (
          <span className="typing-stat-pill">
            WPM <strong>{wpm}</strong>
          </span>
        )}
        {accuracy !== undefined && (
          <span className="typing-stat-pill">
            Acc <strong>{accuracy}%</strong>
          </span>
        )}
        {score !== undefined && (
          <span className="typing-stat-pill">
            Score <strong>{score}</strong>
          </span>
        )}
        {combo !== undefined && combo > 0 && (
          <span className="typing-stat-pill">
            Combo <strong>x{combo}</strong>
          </span>
        )}
        {timeLeftMs !== undefined && (
          <span className="typing-stat-pill">
            Time <strong>{formatTime(timeLeftMs)}</strong>
          </span>
        )}
        {elapsedMs !== undefined && timeLeftMs === undefined && (
          <span className="typing-stat-pill">
            Time <strong>{formatTime(elapsedMs)}</strong>
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5" aria-label={`${lives} lives`}>
        {Array.from({ length: MAX_LIVES }, (_, index) => (
          <span
            key={index}
            className={`typing-life ${
              index < lives ? "" : "typing-life-empty"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
