"use client";

const TEACHER_QUESTIONS = [
  "Is an interactive practice app OK if the main goal is learning—like a typing trainer or math drill with scores?",
  "Do we need to use a database or user accounts, or is a client-only app enough?",
  "Can I add a separate personal section on my portfolio site that isn't part of the graded project?",
];

const PROJECT_PITCH =
  "This is an interactive multiplication practice app. Users build fluency on times tables with difficulty levels, optional focus on one table, timed drills, and progress saved on this device. Scoring and badges are motivation—like a typing tutor—not a standalone entertainment game.";

export function MathClassProjectBrief() {
  return (
    <details className="math-glass-card rounded-2xl p-4 sm:p-5">
      <summary className="cursor-pointer text-sm font-bold text-[var(--math-accent)]">
        For class / your teacher
      </summary>
      <div className="mt-4 space-y-4 text-sm text-[var(--math-muted)]">
        <p className="font-semibold text-[var(--math-ink)]">
          Path A: practice tool (this project)
        </p>
        <p>{PROJECT_PITCH}</p>
        <div>
          <p className="font-bold text-[var(--math-ink)]">
            Questions to ask your teacher
          </p>
          <ol className="mt-2 list-decimal space-y-2 pl-5">
            {TEACHER_QUESTIONS.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ol>
        </div>
        <p className="text-xs">
          Pure arcade games on this site live under Jonathan&apos;s Projects tab;
          this page is for times-table practice.
        </p>
      </div>
    </details>
  );
}
