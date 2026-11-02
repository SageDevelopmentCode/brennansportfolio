"use client";

import {
  DEFAULT_GRADE,
  answersMatch,
  getUnitsForGrade,
  pickSessionWords,
  type SpellingWord,
} from "@/lib/spelling-words";
import {
  countMasteredInUnit,
  getCelebrationMessage,
  getWordStat,
  loadProgress,
  recordAttempt,
  speakWord,
  type SpellingProgress,
} from "@/lib/spelling";
import { useCallback, useEffect, useRef, useState } from "react";

type GamePhase = "setup" | "playing" | "summary";

type Feedback = {
  type: "correct" | "wrong";
  message: string;
} | null;

export function SpellingGameClient() {
  const units = getUnitsForGrade(DEFAULT_GRADE);
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [unitId, setUnitId] = useState(units[0]?.id ?? "");
  const [progress, setProgress] = useState<SpellingProgress>(() => loadProgress());
  const [queue, setQueue] = useState<SpellingWord[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [awaitingAdvance, setAwaitingAdvance] = useState(false);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionAttempts, setSessionAttempts] = useState(0);
  const [celebration, setCelebration] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentWord = queue[index] ?? null;
  const selectedUnit = units.find((u) => u.id === unitId);

  const playCurrentWord = useCallback(() => {
    if (currentWord) speakWord(currentWord.text);
  }, [currentWord]);

  useEffect(() => {
    if (phase !== "playing" || !currentWord || awaitingAdvance) return;
    const timer = setTimeout(() => speakWord(currentWord.text), 300);
    return () => clearTimeout(timer);
  }, [phase, currentWord, awaitingAdvance, index]);

  const focusInput = () => {
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const startSession = () => {
    const words = pickSessionWords(unitId);
    setQueue(words);
    setIndex(0);
    setAnswer("");
    setFeedback(null);
    setAwaitingAdvance(false);
    setSessionCorrect(0);
    setSessionAttempts(0);
    setPhase("playing");
    focusInput();
  };

  const goToSummary = () => {
    setPhase("summary");
  };

  const advanceWord = () => {
    setAnswer("");
    setFeedback(null);
    setAwaitingAdvance(false);
    if (index + 1 >= queue.length) {
      goToSummary();
      return;
    }
    setIndex((i) => i + 1);
    focusInput();
  };

  const handleSubmit = () => {
    if (!currentWord || !answer.trim() || (feedback && feedback.type === "correct"))
      return;

    const correct = answersMatch(answer, currentWord.text);
    setSessionAttempts((n) => n + 1);
    setProgress((prev) => recordAttempt(prev, currentWord.id, correct));

    if (correct) {
      setSessionCorrect((n) => n + 1);
      const msg = getCelebrationMessage();
      setFeedback({ type: "correct", message: msg });
      setCelebration(msg);
      setAwaitingAdvance(true);
      setTimeout(advanceWord, 900);
    } else {
      setFeedback({
        type: "wrong",
        message: `Correct spelling: ${currentWord.text}`,
      });
      setAwaitingAdvance(true);
    }
  };

  const handleTryAgain = () => {
    setAnswer("");
    setFeedback(null);
    setAwaitingAdvance(false);
    focusInput();
  };

  const handleSkip = () => {
    if (currentWord && feedback?.type === "wrong") {
      advanceWord();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (awaitingAdvance && feedback?.type === "wrong") return;
      handleSubmit();
    }
  };

  const unitWordIds = selectedUnit?.words.map((w) => w.id) ?? [];
  const masteredCount = countMasteredInUnit(progress, unitWordIds);
  const unitTotal = unitWordIds.length;

  const sessionAccuracy =
    sessionAttempts > 0
      ? Math.round((sessionCorrect / sessionAttempts) * 100)
      : 0;

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      {celebration && (
        <div
          className="spelling-toast"
          role="status"
          onAnimationEnd={() => setCelebration(null)}
        >
          {celebration}
        </div>
      )}

      {phase === "setup" && (
        <div className="spelling-glass-card rounded-3xl p-6 sm:p-8">
          <h2 className="text-2xl font-extrabold text-[var(--spelling-ink)]">
            Pick a word list
          </h2>
          <p className="mt-2 text-[var(--spelling-muted)]">
            Listen to each word, type what you hear, and build mastery on this
            device.
          </p>

          <fieldset className="mt-6">
            <legend className="text-sm font-bold uppercase tracking-widest text-[var(--spelling-muted)]">
              6th grade unit
            </legend>
            <div className="mt-3 flex flex-col gap-3">
              {units.map((unit) => {
                const ids = unit.words.map((w) => w.id);
                const mastered = countMasteredInUnit(progress, ids);
                return (
                  <button
                    key={unit.id}
                    type="button"
                    onClick={() => setUnitId(unit.id)}
                    className={`spelling-choice-btn ${unitId === unit.id ? "spelling-choice-btn-active" : ""}`}
                  >
                    <span className="font-bold">{unit.title}</span>
                    <span className="text-xs opacity-80">{unit.description}</span>
                    <span className="mt-1 text-xs font-semibold text-[var(--spelling-accent)]">
                      {mastered}/{unit.words.length} mastered
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <button
            type="button"
            onClick={startSession}
            className="spelling-btn-primary mt-8 w-full"
            disabled={!unitId}
          >
            Start practice
          </button>

          {progress.totalCorrect > 0 && (
            <p className="mt-4 text-center text-sm font-semibold text-[var(--spelling-muted)]">
              Lifetime correct: {progress.totalCorrect}
            </p>
          )}
        </div>
      )}

      {phase === "playing" && currentWord && (
        <div className="spelling-glass-card rounded-3xl p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-bold uppercase tracking-widest text-[var(--spelling-muted)]">
              Word {index + 1} of {queue.length}
            </p>
            <p className="text-sm font-semibold text-[var(--spelling-success)]">
              Unit: {masteredCount}/{unitTotal} mastered
            </p>
          </div>

          <div className="mt-8 flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={playCurrentWord}
              className="spelling-btn-secondary inline-flex items-center gap-2"
              aria-label="Play word again"
            >
              <span aria-hidden>🔊</span> Play word
            </button>
            {getWordStat(progress, currentWord.id).mastered && (
              <span className="rounded-full bg-[var(--spelling-success-soft)] px-3 py-1 text-xs font-bold text-[var(--spelling-success)]">
                Mastered
              </span>
            )}
          </div>

          <label className="mt-8 block">
            <span className="text-sm font-bold text-[var(--spelling-muted)]">
              Type the spelling
            </span>
            <input
              ref={inputRef}
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={feedback?.type === "correct"}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              className={`spelling-input mt-2 ${feedback?.type === "wrong" ? "spelling-input-wrong" : ""}`}
              placeholder="Start typing…"
            />
          </label>

          {feedback && (
            <p
              className={`mt-4 text-center text-lg font-bold ${
                feedback.type === "correct"
                  ? "text-[var(--spelling-success)]"
                  : "text-[var(--spelling-danger)]"
              }`}
            >
              {feedback.message}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {!awaitingAdvance || feedback?.type !== "wrong" ? (
              <button
                type="button"
                onClick={handleSubmit}
                className="spelling-btn-primary flex-1 min-w-[140px]"
                disabled={!answer.trim() || feedback?.type === "correct"}
              >
                Check
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleTryAgain}
                  className="spelling-btn-primary flex-1 min-w-[140px]"
                >
                  Try again
                </button>
                <button
                  type="button"
                  onClick={handleSkip}
                  className="spelling-btn-secondary flex-1 min-w-[140px]"
                >
                  Skip
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={goToSummary}
            className="mt-4 w-full text-sm font-semibold text-[var(--spelling-muted)] underline-offset-2 hover:underline"
          >
            End session early
          </button>
        </div>
      )}

      {phase === "summary" && (
        <div className="spelling-glass-card rounded-3xl p-6 sm:p-8 text-center">
          <h2 className="text-3xl font-extrabold text-[var(--spelling-ink)]">
            Session complete
          </h2>
          <p className="mt-4 text-5xl font-black text-[var(--spelling-accent)]">
            {sessionCorrect}/{sessionAttempts}
          </p>
          <p className="mt-1 text-[var(--spelling-muted)]">
            correct this round ({sessionAccuracy}%)
          </p>
          <p className="mt-4 text-sm font-semibold text-[var(--spelling-muted)]">
            {selectedUnit?.title}: {masteredCount}/{unitTotal} words mastered
            overall
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={startSession}
              className="spelling-btn-primary"
            >
              Practice again
            </button>
            <button
              type="button"
              onClick={() => setPhase("setup")}
              className="spelling-btn-secondary"
            >
              Choose another unit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
