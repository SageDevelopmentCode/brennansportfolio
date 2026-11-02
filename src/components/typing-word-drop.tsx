"use client";

import { TypingHud } from "@/components/typing-hud";
import { TypingKeyboard } from "@/components/typing-keyboard";
import {
  applyWordDropKeystroke,
  calculateAccuracy,
  createWordDropState,
  tickWordDrop,
  WORD_DROP_CANVAS_HEIGHT,
  WORD_DROP_CANVAS_WIDTH,
  WORD_DROP_DANGER_Y,
  type WordDropState,
} from "@/lib/typing";
import type { ProfileStats } from "@/lib/typing-progress";
import {
  playCorrectWord,
  playErrorBuzz,
  playKeyClick,
} from "@/lib/typing-sounds";
import { useCallback, useEffect, useRef, useState } from "react";

type TypingWordDropProps = {
  level: number;
  profile: ProfileStats;
  onFinish: (result: {
    score: number;
    combo: number;
    accuracy: number;
    keyMistakes: Record<string, number>;
    keyHits: Record<string, number>;
  }) => void;
  onBack: () => void;
};

export function TypingWordDrop({
  level,
  profile,
  onFinish,
  onBack,
}: TypingWordDropProps) {
  const [state, setState] = useState<WordDropState>(() =>
    createWordDropState(level)
  );
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const finishedRef = useRef(false);
  const keyMistakesRef = useRef<Record<string, number>>({});
  const keyHitsRef = useRef<Record<string, number>>({});
  const stateRef = useRef(state);
  stateRef.current = state;

  const finish = useCallback(
    (finalState: WordDropState) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      const accuracy = calculateAccuracy(
        finalState.correctChars,
        finalState.totalKeystrokes
      );
      onFinish({
        score: finalState.score,
        combo: finalState.bestCombo,
        accuracy,
        keyMistakes: keyMistakesRef.current,
        keyHits: keyHitsRef.current,
      });
    },
    [onFinish]
  );

  useEffect(() => {
    if (state.endedAt) {
      finish(state);
    }
  }, [state, finish]);

  useEffect(() => {
    let last = performance.now();
    let frameId = 0;

    function loop(timestamp: number) {
      const delta = timestamp - last;
      last = timestamp;
      const current = stateRef.current;
      if (!current.endedAt) {
        const { state: next } = tickWordDrop(current, delta);
        if (next !== current) {
          setState(next);
        }
      }
      frameId = requestAnimationFrame(loop);
    }

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = WORD_DROP_CANVAS_WIDTH * dpr;
    canvas.height = WORD_DROP_CANVAS_HEIGHT * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const gradient = ctx.createLinearGradient(0, 0, 0, WORD_DROP_CANVAS_HEIGHT);
    gradient.addColorStop(0, "#0f1020");
    gradient.addColorStop(1, "#1a1035");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WORD_DROP_CANVAS_WIDTH, WORD_DROP_CANVAS_HEIGHT);

    ctx.strokeStyle = "rgba(239, 68, 68, 0.6)";
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(0, WORD_DROP_DANGER_Y);
    ctx.lineTo(WORD_DROP_CANVAS_WIDTH, WORD_DROP_DANGER_Y);
    ctx.stroke();
    ctx.setLineDash([]);

    for (const word of state.words) {
      const isActive = word.id === state.activeId;
      ctx.font = isActive ? "bold 22px sans-serif" : "18px sans-serif";
      ctx.fillStyle = isActive ? "#22d3ee" : "#e2e8f0";
      ctx.shadowColor = isActive ? "#22d3ee" : "transparent";
      ctx.shadowBlur = isActive ? 12 : 0;

      const typed = word.word.slice(0, word.typedIndex);
      const rest = word.word.slice(word.typedIndex);
      const fullWidth = ctx.measureText(word.word).width;
      const startX = word.x - fullWidth / 2;

      ctx.fillStyle = "#34d399";
      ctx.fillText(typed, startX, word.y);
      const typedWidth = ctx.measureText(typed).width;
      ctx.fillStyle = isActive ? "#22d3ee" : "#e2e8f0";
      ctx.fillText(rest, startX + typedWidth, word.y);
      ctx.shadowBlur = 0;
    }
  }, [state]);

  const activeWord = state.words.find((word) => word.id === state.activeId);
  const targetKey = activeWord?.word[activeWord.typedIndex] ?? null;

  const handleKey = useCallback(
    (rawKey: string) => {
      if (state.endedAt) return;
      const result = applyWordDropKeystroke(state, rawKey);
      setPressedKey(rawKey);
      window.setTimeout(() => setPressedKey(null), 80);

      const trackKey = (targetKey ?? rawKey).toLowerCase();
      if (result.correct) {
        keyHitsRef.current[trackKey] = (keyHitsRef.current[trackKey] ?? 0) + 1;
        playKeyClick();
        if (result.wordCleared) playCorrectWord();
      } else if (result.lifeLost) {
        keyMistakesRef.current[trackKey] =
          (keyMistakesRef.current[trackKey] ?? 0) + 1;
        playErrorBuzz();
        setErrorKey(targetKey);
        window.setTimeout(() => setErrorKey(null), 200);
      }

      setState(result.state);
    },
    [state, targetKey]
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

  const accuracy = calculateAccuracy(
    state.correctChars,
    state.totalKeystrokes
  );

  return (
    <div className="space-y-4">
      <TypingHud
        label="Word Drop"
        level={level}
        score={state.score}
        combo={state.combo}
        accuracy={accuracy}
        lives={state.lives}
      />

      <div className="typing-glass-card overflow-hidden rounded-2xl p-2">
        <canvas
          ref={canvasRef}
          className="mx-auto w-full max-w-full"
          style={{
            aspectRatio: `${WORD_DROP_CANVAS_WIDTH} / ${WORD_DROP_CANVAS_HEIGHT}`,
          }}
        />
      </div>

      {activeWord && (
        <p className="text-center text-lg text-[var(--typing-muted)]">
          Type:{" "}
          <strong className="text-[var(--typing-accent)]">{activeWord.word}</strong>
        </p>
      )}

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
