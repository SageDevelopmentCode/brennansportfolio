"use client";

import { TypingHud } from "@/components/typing-hud";
import { TypingKeyboard } from "@/components/typing-keyboard";
import {
  applyClassicKeystroke,
  calculateAccuracy,
  calculateWpm,
  createClassicRun,
  getClassicElapsedMs,
  getClassicTimeLeftMs,
  getCurrentTarget,
  getDisplayText,
  type ClassicRunState,
} from "@/lib/typing";
import type { ProfileStats } from "@/lib/typing-progress";
import {
  playCorrectWord,
  playErrorBuzz,
  playKeyClick,
} from "@/lib/typing-sounds";
import { useCallback, useEffect, useRef, useState } from "react";

type TypingClassicModeProps = {
  level: number;
  profile: ProfileStats;
  ghostProgress: number[];
  onFinish: (result: {
    wpm: number;
    accuracy: number;
    ghostProgress: number[];
    keyMistakes: Record<string, number>;
    keyHits: Record<string, number>;
  }) => void;
  onBack: () => void;
};

export function TypingClassicMode({
  level,
  profile,
  ghostProgress,
  onFinish,
  onBack,
}: TypingClassicModeProps) {
  const [state, setState] = useState<ClassicRunState>(() => createClassicRun(level));
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const finishedRef = useRef(false);
  const keyMistakesRef = useRef<Record<string, number>>({});
  const keyHitsRef = useRef<Record<string, number>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const finish = useCallback(
    (finalState: ClassicRunState) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      const elapsed = getClassicElapsedMs(finalState);
      const wpm = calculateWpm(finalState.correctChars, elapsed);
      const accuracy = calculateAccuracy(
        finalState.correctChars,
        finalState.totalKeystrokes
      );
      onFinish({
        wpm,
        accuracy,
        ghostProgress: finalState.ghostProgress,
        keyMistakes: keyMistakesRef.current,
        keyHits: keyHitsRef.current,
      });
    },
    [onFinish]
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (state.endedAt) {
      finish(state);
      return;
    }
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [state, finish]);

  useEffect(() => {
    if (!state.startedAt || state.endedAt) return;
    const elapsed = getClassicElapsedMs(state, now);
    if (elapsed >= 60_000) {
      setState((current) =>
        current.endedAt ? current : { ...current, endedAt: now }
      );
    }
  }, [now, state]);

  const handleKey = useCallback(
    (rawKey: string) => {
      if (state.endedAt) return;

      const target = getCurrentTarget(state);
      const result = applyClassicKeystroke(state, rawKey);
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
      if (event.key.length === 1 || event.key === " ") {
        event.preventDefault();
        handleKey(event.key === " " ? " " : event.key);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKey, onBack]);

  const elapsed = getClassicElapsedMs(state, now);
  const wpm = calculateWpm(state.correctChars, elapsed);
  const accuracy = calculateAccuracy(
    state.correctChars,
    state.totalKeystrokes
  );
  const display = getDisplayText(state);
  const targetKey = getCurrentTarget(state);
  const ghostAt =
    ghostProgress.length > 0
      ? ghostProgress.reduce(
          (best, chars, index) =>
            chars <= state.correctChars ? index : best,
          -1
        )
      : -1;
  const ghostChars = ghostAt >= 0 ? ghostProgress[ghostAt] : 0;
  const ghostDelta = ghostChars - state.correctChars;

  return (
    <div className="space-y-4">
      <TypingHud
        label="Classic Blitz"
        level={level}
        wpm={wpm}
        accuracy={accuracy}
        timeLeftMs={getClassicTimeLeftMs(state, now)}
        lives={state.lives}
      />

      <div className="typing-glass-card rounded-2xl p-6">
        {ghostProgress.length > 0 && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--typing-accent-2)]">
            Ghost race:{" "}
            {ghostDelta > 0
              ? `${ghostDelta} chars behind`
              : ghostDelta < 0
                ? `${Math.abs(ghostDelta)} chars ahead!`
                : "neck and neck"}
          </p>
        )}
        <p className="min-h-[4rem] text-2xl leading-relaxed sm:text-3xl">
          <span className="text-[var(--typing-muted)]">{display.completed}</span>
          <span className="rounded bg-[var(--typing-accent-soft)] px-1 text-[var(--typing-accent)] underline decoration-[var(--typing-accent-2)]">
            {display.current || "·"}
          </span>
          <span>{display.upcoming}</span>
        </p>
      </div>

      <TypingKeyboard
        targetKey={targetKey}
        pressedKey={pressedKey}
        errorKey={errorKey}
        profile={profile}
        onKeyPress={handleKey}
      />

      <input
        ref={inputRef}
        type="text"
        className="sr-only"
        aria-label="Typing input"
        onChange={() => {}}
      />
    </div>
  );
}
