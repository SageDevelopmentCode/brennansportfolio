"use client";

import type { SignToken } from "@/lib/asl/types";
import { useSignPlayback } from "@/lib/asl/playback";
import { SignHandStage } from "@/components/sign-hand-stage";
import { useCallback, useEffect, useRef } from "react";

type SignPlaybackPanelProps = {
  tokens: SignToken[];
  skippedChars: string[];
};

export function SignPlaybackPanel({ tokens, skippedChars }: SignPlaybackPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const {
    index,
    playing,
    speed,
    setSpeed,
    reducedMotion,
    goPrev,
    goNext,
    restart,
    togglePlay,
    selectIndex,
    current,
  } = useSignPlayback(tokens);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === " ") {
        event.preventDefault();
        togglePlay();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
    },
    [goNext, goPrev, togglePlay],
  );

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const chip = el.querySelector<HTMLElement>(`[data-sign-index="${index}"]`);
    chip?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [index]);

  if (tokens.length === 0) {
    return (
      <div className="sign-glass-card flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-lg font-semibold text-[var(--sign-ink)]">
          Type something above to see signs
        </p>
        <p className="max-w-md text-sm text-[var(--sign-muted)]">
          Known words play one sign each. Other words are fingerspelled letter by letter in 3D.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className="sign-glass-card flex flex-col gap-6 p-6 sm:p-8"
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label="Sign playback controls"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[var(--sign-muted)]">
          {index + 1} of {tokens.length}
        </p>
        {skippedChars.length > 0 ? (
          <p className="text-xs text-[var(--sign-warn)]">
            Skipped punctuation: {skippedChars.join(" ")}
          </p>
        ) : null}
      </div>

      <div className="sign-stage relative mx-auto flex w-full max-w-md flex-col items-center gap-4">
        <div className="sign-stage-frame relative aspect-[4/5] w-full min-h-[320px] overflow-hidden rounded-2xl bg-[var(--sign-stage)]">
          {current ? (
            <SignHandStage
              key={`${current.poseId}-${index}`}
              poseId={current.poseId}
              kind={current.kind}
              gloss={current.gloss}
            />
          ) : null}
        </div>
        <p
          className="sign-gloss text-3xl font-bold tracking-wide text-[var(--sign-accent)] sm:text-4xl"
          aria-live="polite"
        >
          {current?.gloss ?? "—"}
        </p>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--sign-muted)]">
          {current?.kind === "word" ? "Word sign · 3D hand" : "Fingerspelling · 3D hand"}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button type="button" className="sign-btn-secondary" onClick={restart}>
          Restart
        </button>
        <button type="button" className="sign-btn-secondary" onClick={goPrev} disabled={index === 0}>
          Previous
        </button>
        <button
          type="button"
          className="sign-btn-primary"
          onClick={togglePlay}
          disabled={reducedMotion}
          title={reducedMotion ? "Auto-play disabled (reduced motion)" : undefined}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          className="sign-btn-secondary"
          onClick={goNext}
          disabled={index >= tokens.length - 1}
        >
          Next
        </button>
      </div>

      <label className="mx-auto flex w-full max-w-xs flex-col gap-2 text-sm font-medium text-[var(--sign-muted)]">
        Speed ({speed.toFixed(1)}×)
        <input
          type="range"
          min={0.5}
          max={2}
          step={0.1}
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="sign-range w-full"
        />
      </label>

      {reducedMotion ? (
        <p className="text-center text-xs text-[var(--sign-muted)]">
          Auto-play is off because your device prefers reduced motion. Use Previous and Next.
        </p>
      ) : (
        <p className="text-center text-xs text-[var(--sign-muted)]">
          Tip: focus this panel and press Space to play or pause.
        </p>
      )}

      <div className="sign-strip flex gap-2 overflow-x-auto pb-2 pt-1">
        {tokens.map((token, i) => {
          const active = i === index;
          return (
            <button
              key={`${token.imageSrc}-${i}`}
              type="button"
              data-sign-index={i}
              onClick={() => selectIndex(i)}
              className={`sign-chip shrink-0 ${active ? "sign-chip-active" : ""} ${
                token.kind === "letter" ? "sign-chip-letter" : ""
              }`}
            >
              {token.gloss}
            </button>
          );
        })}
      </div>
    </div>
  );
}
