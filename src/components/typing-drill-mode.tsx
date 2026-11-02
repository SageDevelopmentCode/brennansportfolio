"use client";

import { TypingHud } from "@/components/typing-hud";
import { TypingKeyboard } from "@/components/typing-keyboard";
import {
  applyDrillKeystroke,
  calculateAccuracy,
  createDrillState,
  getDrillText,
  getDrillTimeLeftMs,
  type DrillState,
} from "@/lib/typing";
import type { ProfileStats } from "@/lib/typing-progress";
import { getWeakestKeys } from "@/lib/typing-progress";
import {
  playCorrectWord,
  playErrorBuzz,
  playKeyClick,
} from "@/lib/typing-sounds";
import { getDrillPatternsForKeys } from "@/lib/typing-words";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TypingDrillModeProps = {
  profile: ProfileStats;
  onFinish: (result: {
    accuracy: number;
    keyMistakes: Record<string, number>;
    keyHits: Record<string, number>;
  }) => void;
  onBack: () => void;
};

export function TypingDrillMode({
  profile,
  onFinish,
  onBack,
}: TypingDrillModeProps) {
  const weakKeys = useMemo(() => getWeakestKeys(profile, 3), [profile]);
  const patterns = useMemo(
    () => getDrillPatternsForKeys(weakKeys),
    [weakKeys]
  );

  const [state, setState] = useState<DrillState>(() =>
    createDrillState(patterns, weakKeys)
  );
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const finishedRef = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!state.endedAt || finishedRef.current) return;
    finishedRef.current = true;

    const keyMistakes: Record<string, number> = {};
    const keyHits: Record<string, number> = {};
    for (const [key, stats] of Object.entries(state.keyAttempts)) {
      const misses = stats.total - stats.correct;
      if (misses > 0) keyMistakes[key] = misses;
      if (stats.correct > 0) keyHits[key] = stats.correct;
    }

    onFinish({
      accuracy: calculateAccuracy(state.correctChars, state.totalKeystrokes),
      keyMistakes,
      keyHits,
    });
  }, [state, onFinish]);

  const handleKey = useCallback(
    (rawKey: string) => {
      if (state.endedAt) return;
      const result = applyDrillKeystroke(state, rawKey);
      setPressedKey(rawKey);
      window.setTimeout(() => setPressedKey(null), 80);

      if (result.correct) {
        playKeyClick();
        if (result.patternCompleted) playCorrectWord();
      } else if (result.lifeLost) {
        playErrorBuzz();
        const text = getDrillText(state);
        setErrorKey(text[state.charIndex]);
        window.setTimeout(() => setErrorKey(null), 200);
      }

      setState(result.state);
    },
    [state]
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onBack();
        return;
      }
      if (event.key.length === 1 || event.key === " ") {
        event.preventDefault();
        handleKey(event.key);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKey, onBack]);

  const text = getDrillText(state);
  const typed = text.slice(0, state.charIndex);
  const rest = text.slice(state.charIndex);
  const targetKey = text[state.charIndex] ?? null;
  const accuracy = calculateAccuracy(state.correctChars, state.totalKeystrokes);

  return (
    <div className="space-y-4">
      <TypingHud
        label="Key Drills"
        accuracy={accuracy}
        timeLeftMs={getDrillTimeLeftMs(state, now)}
        lives={state.lives}
      />

      <div className="typing-glass-card rounded-2xl p-5">
        <p className="text-sm text-[var(--typing-muted)]">
          Targeting weak keys:{" "}
          <strong className="text-[var(--typing-accent)]">
            {weakKeys.join(", ").toUpperCase()}
          </strong>
        </p>
        <p className="mt-4 font-mono text-2xl leading-relaxed sm:text-3xl">
          <span className="text-[var(--typing-success)]">{typed}</span>
          <span className="bg-[var(--typing-accent-soft)] text-[var(--typing-accent)]">
            {rest[0] ?? ""}
          </span>
          <span className="text-[var(--typing-muted)]">{rest.slice(1)}</span>
        </p>
      </div>

      <TypingKeyboard
        targetKey={targetKey}
        pressedKey={pressedKey}
        errorKey={errorKey}
        profile={profile}
        onKeyPress={handleKey}
      />
    </div>
  );
}
