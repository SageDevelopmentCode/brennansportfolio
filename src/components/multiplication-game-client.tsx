"use client";

import { MathBadgesRow } from "@/components/math-badges-row";
import { MathCelebration } from "@/components/math-celebration";
import {
  DIFFICULTY_CONFIG,
  SPEED_ROUND_SECONDS,
  type Difficulty,
  type GameMode,
  type MathProgress,
  type MultiplicationProblem,
  generateProblem,
  getCelebrationMessage,
  loadProgress,
  recordAnswer,
  updateBestSpeedScore,
  updateBestStreak,
} from "@/lib/multiplication";
import { useCallback, useEffect, useRef, useState } from "react";

type GamePhase = "setup" | "playing" | "summary";

type Feedback = {
  type: "correct" | "wrong";
  message: string;
} | null;

const FOCUS_OPTIONS = [
  { value: null, label: "All tables" },
  ...Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: `×${i + 1} only`,
  })),
];

export function MultiplicationGameClient() {
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [mode, setMode] = useState<GameMode>("practice");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [focusTable, setFocusTable] = useState<number | null>(null);
  const [progress, setProgress] = useState<MathProgress>(() => loadProgress());
  const [problem, setProblem] = useState<MultiplicationProblem | null>(null);
  const [answer, setAnswer] = useState("");
  const [streak, setStreak] = useState(0);
  const [sessionScore, setSessionScore] = useState(0);
  const [sessionAttempts, setSessionAttempts] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SPEED_ROUND_SECONDS);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [celebration, setCelebration] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [summaryIsNewBest, setSummaryIsNewBest] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionScoreRef = useRef(0);
  const progressRef = useRef(progress);

  useEffect(() => {
    sessionScoreRef.current = sessionScore;
  }, [sessionScore]);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  const config = DIFFICULTY_CONFIG[difficulty];

  const spawnProblem = useCallback(() => {
    setProblem(
      generateProblem({
        minTable: config.minTable,
        maxTable: config.maxTable,
        focusTable,
      })
    );
    setAnswer("");
    setFeedback(null);
    setShake(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [config.minTable, config.maxTable, focusTable]);

  const endSpeedRound = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const score = sessionScoreRef.current;
    setSummaryIsNewBest(
      score > progressRef.current.bestSpeedScore && score > 0
    );
    setProgress((prev) => updateBestSpeedScore(prev, score));
    setPhase("summary");
  }, []);

  const startGame = () => {
    setStreak(0);
    setSessionScore(0);
    setSessionAttempts(0);
    setTimeLeft(SPEED_ROUND_SECONDS);
    setPhase("playing");
    spawnProblem();

    if (mode === "speed") {
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            endSpeedRound();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
  };

  const handleSubmit = () => {
    if (!problem || feedback) return;

    const parsed = parseInt(answer, 10);
    if (Number.isNaN(parsed)) return;

    const correct = parsed === problem.answer;
    setSessionAttempts((n) => n + 1);

    if (correct) {
      const newStreak = streak + 1;
      const msg = getCelebrationMessage();
      setStreak(newStreak);
      setSessionScore((s) => s + 1);
      setProgress((prev) => {
        const afterRecord = recordAnswer(prev, problem, correct);
        return updateBestStreak(afterRecord, newStreak);
      });
      setFeedback({ type: "correct", message: msg });
      setCelebration(msg);

      setTimeout(() => {
        if (mode === "speed" && timeLeft <= 0) return;
        spawnProblem();
      }, 800);
    } else {
      setProgress((prev) => recordAnswer(prev, problem, correct));
      setStreak(0);
      setShake(true);
      setFeedback({
        type: "wrong",
        message: `Not quite — ${problem.a} × ${problem.b} = ${problem.answer}`,
      });

      setTimeout(() => {
        if (mode === "speed" && timeLeft <= 0) return;
        spawnProblem();
      }, 1500);
    }
  };

  const handleDigit = (digit: string) => {
    if (feedback) return;
    if (digit === "back") {
      setAnswer((a) => a.slice(0, -1));
      return;
    }
    if (answer.length >= 3) return;
    setAnswer((a) => a + digit);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const accuracy =
    sessionAttempts > 0
      ? Math.round((sessionScore / sessionAttempts) * 100)
      : 0;

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <MathCelebration
        message={celebration}
        onDismiss={() => setCelebration(null)}
      />

      {phase === "setup" && (
        <div className="math-glass-card rounded-3xl p-6 sm:p-8">
          <h2 className="text-2xl font-extrabold text-[var(--math-ink)]">
            Choose your game
          </h2>
          <p className="mt-2 text-[var(--math-muted)]">
            Pick a mode and difficulty, then start multiplying!
          </p>

          <div className="mt-6 space-y-5">
            <fieldset>
              <legend className="text-sm font-bold uppercase tracking-widest text-[var(--math-muted)]">
                Mode
              </legend>
              <div className="mt-2 flex flex-wrap gap-3">
                {(
                  [
                    { value: "practice" as GameMode, label: "Practice", desc: "No timer" },
                    { value: "speed" as GameMode, label: "Speed Round", desc: "60 seconds" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMode(opt.value)}
                    className={`math-choice-btn ${mode === opt.value ? "math-choice-btn-active" : ""}`}
                  >
                    <span className="font-bold">{opt.label}</span>
                    <span className="text-xs opacity-75">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-bold uppercase tracking-widest text-[var(--math-muted)]">
                Difficulty
              </legend>
              <div className="mt-2 flex flex-wrap gap-3">
                {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`math-choice-btn ${difficulty === d ? "math-choice-btn-active" : ""}`}
                  >
                    {DIFFICULTY_CONFIG[d].label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-bold uppercase tracking-widest text-[var(--math-muted)]">
                Focus table
              </legend>
              <select
                value={focusTable ?? ""}
                onChange={(e) =>
                  setFocusTable(e.target.value ? Number(e.target.value) : null)
                }
                className="math-select mt-2 w-full"
              >
                {FOCUS_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.value ?? ""}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </fieldset>
          </div>

          <button
            type="button"
            onClick={startGame}
            className="math-btn-primary mt-8 w-full"
          >
            Start playing!
          </button>

          {progress.bestStreak > 0 && (
            <p className="mt-4 text-center text-sm font-semibold text-[var(--math-muted)]">
              Your best streak: {progress.bestStreak} 🔥
            </p>
          )}
        </div>
      )}

      {phase === "playing" && problem && (
        <div className="math-glass-card rounded-3xl p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-4">
              <div className="math-stat-pill">
                <span className="text-xs font-bold uppercase text-[var(--math-muted)]">Streak</span>
                <span className="text-xl font-extrabold text-[var(--math-ink)]">{streak}</span>
              </div>
              <div className="math-stat-pill">
                <span className="text-xs font-bold uppercase text-[var(--math-muted)]">Score</span>
                <span className="text-xl font-extrabold text-[var(--math-ink)]">{sessionScore}</span>
              </div>
              {mode === "speed" && (
                <div className="math-stat-pill math-stat-pill-timer">
                  <span className="text-xs font-bold uppercase text-[var(--math-muted)]">Time</span>
                  <span className="text-xl font-extrabold text-[var(--math-accent)]">{timeLeft}s</span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                if (timerRef.current) clearInterval(timerRef.current);
                setPhase("setup");
              }}
              className="text-sm font-bold text-[var(--math-muted)] hover:text-[var(--math-accent)]"
            >
              Quit
            </button>
          </div>

          <div
            className={`mt-10 text-center ${shake ? "animate-math-shake" : ""}`}
            aria-live="polite"
          >
            <p className="math-problem-display">
              {problem.a} × {problem.b} = ?
            </p>

            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={answer}
              onChange={(e) => {
                if (feedback) return;
                const val = e.target.value.replace(/\D/g, "").slice(0, 3);
                setAnswer(val);
              }}
              onKeyDown={handleKeyDown}
              className="math-answer-input mt-6"
              placeholder="?"
              aria-label="Your answer"
              disabled={!!feedback}
            />

            {feedback && (
              <p
                className={`mt-4 text-lg font-bold ${
                  feedback.type === "correct"
                    ? "text-emerald-600"
                    : "text-rose-500"
                }`}
              >
                {feedback.message}
              </p>
            )}
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "back", "0", "go"].map(
              (key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    if (key === "go") handleSubmit();
                    else handleDigit(key);
                  }}
                  disabled={!!feedback && key !== "go"}
                  className={`math-numpad-btn ${
                    key === "go" ? "math-numpad-btn-go" : ""
                  } ${key === "back" ? "text-sm" : ""}`}
                >
                  {key === "back" ? "⌫" : key === "go" ? "Go!" : key}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {phase === "summary" && (
        <div className="math-glass-card rounded-3xl p-6 sm:p-8 text-center">
          <span className="text-5xl" aria-hidden>🏆</span>
          <h2 className="mt-4 text-3xl font-extrabold text-[var(--math-ink)]">
            Time&apos;s up!
          </h2>
          <p className="mt-2 text-lg text-[var(--math-muted)]">
            You got <strong className="text-[var(--math-ink)]">{sessionScore}</strong> correct
            {sessionAttempts > 0 && (
              <> with <strong className="text-[var(--math-ink)]">{accuracy}%</strong> accuracy</>
            )}
          </p>
          {summaryIsNewBest && (
            <p className="mt-2 font-bold text-emerald-600">New personal best! 🎉</p>
          )}
          {!summaryIsNewBest && progress.bestSpeedScore > 0 && (
            <p className="mt-2 text-sm text-[var(--math-muted)]">
              Personal best: {progress.bestSpeedScore}
            </p>
          )}
          <button
            type="button"
            onClick={() => setPhase("setup")}
            className="math-btn-primary mt-8"
          >
            Play again
          </button>
        </div>
      )}

      <MathBadgesRow progress={progress} sessionStreak={streak} />
    </div>
  );
}
