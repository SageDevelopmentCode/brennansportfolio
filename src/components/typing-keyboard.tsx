"use client";

import { getKeyHeat, type ProfileStats } from "@/lib/typing-progress";

const ROWS = [
  ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="],
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'"],
  ["z", "x", "c", "v", "b", "n", "m", ",", ".", "/"],
];

const FINGER_ZONES: Record<string, number> = {
  "`": 0, "1": 0, "2": 0, "q": 0, "a": 0, "z": 0,
  "3": 1, "w": 1, "s": 1, "x": 1,
  "4": 1, "e": 1, "d": 1, "c": 1,
  "5": 2, "r": 2, "f": 2, "v": 2,
  "6": 2, "t": 2, "g": 2, "b": 2,
  "7": 3, "8": 3, "9": 3, "0": 3, "-": 3, "=": 3,
  "y": 3, "h": 3, "n": 3,
  "u": 4, "j": 4, "m": 4,
  "i": 4, "k": 4, ",": 4, ".": 4, "/": 4,
  "o": 5, "l": 5, ";": 5, "'": 5,
  "p": 5, "[": 5, "]": 5, "\\": 5,
};

const ZONE_COLORS = [
  "rgba(34, 211, 238, 0.18)",
  "rgba(52, 211, 153, 0.18)",
  "rgba(250, 204, 21, 0.18)",
  "rgba(232, 121, 249, 0.18)",
  "rgba(251, 146, 60, 0.18)",
  "rgba(248, 113, 113, 0.18)",
];

type TypingKeyboardProps = {
  targetKey?: string | null;
  pressedKey?: string | null;
  errorKey?: string | null;
  profile?: ProfileStats;
  onKeyPress?: (key: string) => void;
  compact?: boolean;
};

function heatColor(errorRate: number, total: number): string {
  if (total < 5) return "rgba(255, 255, 255, 0.04)";
  if (errorRate < 0.05) return "rgba(52, 211, 153, 0.25)";
  if (errorRate < 0.15) return "rgba(250, 204, 21, 0.25)";
  if (errorRate < 0.3) return "rgba(251, 146, 60, 0.3)";
  return "rgba(239, 68, 68, 0.35)";
}

export function TypingKeyboard({
  targetKey,
  pressedKey,
  errorKey,
  profile,
  onKeyPress,
  compact = false,
}: TypingKeyboardProps) {
  const normalizedTarget = targetKey?.toLowerCase() ?? null;

  return (
    <div className={`w-full ${compact ? "max-w-md" : "max-w-2xl"}`}>
      <div className="flex flex-col gap-1">
        {ROWS.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="flex justify-center gap-1"
            style={{ paddingLeft: `${rowIndex * 12}px` }}
          >
            {row.map((key) => {
              const zone = FINGER_ZONES[key] ?? 0;
              const heat = profile ? getKeyHeat(profile, key) : null;
              const isTarget = normalizedTarget === key;
              const isPressed = pressedKey?.toLowerCase() === key;
              const isError = errorKey?.toLowerCase() === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onKeyPress?.(key)}
                  className={`typing-key min-w-[1.75rem] flex-1 ${
                    isTarget ? "typing-key-target" : ""
                  } ${isPressed ? "typing-key-pressed" : ""} ${
                    isError ? "typing-key-error" : ""
                  }`}
                  style={{
                    backgroundColor: heat
                      ? heatColor(heat.errorRate, heat.total)
                      : ZONE_COLORS[zone],
                  }}
                  aria-label={`Key ${key}`}
                >
                  {key.toUpperCase()}
                </button>
              );
            })}
          </div>
        ))}
        <div className="mt-1 flex justify-center">
          <button
            type="button"
            onClick={() => onKeyPress?.(" ")}
            className={`typing-key w-48 ${
              normalizedTarget === " " ? "typing-key-target" : ""
            } ${pressedKey === " " ? "typing-key-pressed" : ""}`}
          >
            SPACE
          </button>
        </div>
      </div>
    </div>
  );
}
