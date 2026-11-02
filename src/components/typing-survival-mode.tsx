"use client";

import { TypingHud } from "@/components/typing-hud";
import { TypingKeyboard } from "@/components/typing-keyboard";
import {
  applySurvivalKeystroke,
  calculateAccuracy,
  createSurvivalState,
  getSurvivalElapsedMs,
  getSurvivalScore,
  type SurvivalState,
} from "@/lib/typing";
import type { ProfileStats } from "@/lib/typing-progress";
import {
  playCorrectWord,
  playErrorBuzz,
  playKeyClick,
} from "@/lib/typing-sounds";
import { useCallback, useEffect, useRef, useState } from "react";

type TypingSurvivalModeProps = {
  level: number;
  profile: ProfileStats;
  onFinish: (result: {
    score: number;
    timeMs: number;
    wordsCompleted: number;
    accuracy: number;
    keyMistakes: Record<string, number>;
    keyHits: Record<string, number>;
  }) => void;
  onBack: () => void;
};

export function TypingSurvivalMode({
  level,
  profile,
  onFinish,
  onBack,
}: TypingSurvivalModeProps) {
  const [state, setState] = useState<SurvivalState>(() =>
    createSurvivalState(level)
  );
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const finishedRef = useRef(false);
  const keyMistakesRef = useRef<Record<string, number>>({});
  const keyHitsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!state.endedAt || finishedRef.current) return;
    finishedRef.current = true;
    const elapsed = getSurvivalElapsedMs(state);
    onFinish({
      score: getSurvivalScore(state),
      timeMs: elapsed,
      wordsCompleted: state.wordsCompleted,
      accuracy: calculateAccuracy(
        state.correctChars,
        state.totalKeystrokes
      ),
      keyMistakes: keyMistakesRef.current,
      keyHits: keyHitsRef.current,
    });
  }, [state, onFinish]);

  const handleKey = useCallback(
    (rawKey: string) => {
      if (state.endedAt) return;
      const target = state.currentWord[state.typedIndex];
      const result = applySurvivalKeystroke(state, rawKey);
      setPressedKey(rawKey);
      window.setTimeout(() => setPressedKey(null), 80);

      const trackKey = (target ?? rawKey).toLowerCase();
      if (result.correct) {
        keyHitsRef.current[trackKey] = (keyHitsRef.current[trackKey] ?? 0) + 1;
        playKeyClick();
        if (result.wordCompleted) playCorrectWord();
      } else if (result.lifeLost) {
        keyMistakesRef.current[trackKey] =
          (keyMistakesRef.current[trackKey] ?? 0) + 1;
        playErrorBuzz();
        setErrorKey(target);
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
      if (event.key.length === 1) {
        event.preventDefault();
        handleKey(event.key);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKey, onBack]);

  const elapsed = getSurvivalElapsedMs(state, now);
  const typed = state.currentWord.slice(0, state.typedIndex);
  const rest = state.currentWord.slice(state.typedIndex);
  const targetKey = state.currentWord[state.typedIndex] ?? null;

  return (
    <div className="space-y-4">
      <TypingHud
        label="Survival"
        level={level}
        score={getSurvivalScore(state, now)}
        elapsedMs={elapsed}
        lives={state.lives}
      />

      <div className="typing-glass-card rounded-2xl p-6 text-center">
        <p className="text-sm text-[var(--typing-muted)]">
          Speed tier {state.speedTier} · {state.wordsCompleted} words cleared
        </p>
        <p className="mt-4 text-4xl font-extrabold sm:text-5xl">
          <span className="text-[var(--typing-success)]">{typed}</span>
          <span className="text-[var(--typing-accent)] underline">
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
