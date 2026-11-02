"use client";

import {
  formatDurationMs,
  formatSessionDate,
  type WorkoutSession,
} from "@/lib/workout";

type WorkoutSessionHistoryProps = {
  sessions: WorkoutSession[];
};

export function WorkoutSessionHistory({ sessions }: WorkoutSessionHistoryProps) {
  if (sessions.length === 0) {
    return (
      <div className="workout-empty-card rounded-2xl px-6 py-12 text-center">
        <span className="text-4xl" aria-hidden>
          🏁
        </span>
        <p className="mt-3 text-lg font-bold text-[var(--workout-ink)]">
          No finished workouts yet
        </p>
        <p className="mt-1 text-sm text-[var(--workout-muted)]">
          Start a template and hit Finish to log your first session.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {sessions.map((session) => {
        const completedCount = session.exercises.filter(
          (exercise) => exercise.completedAt,
        ).length;
        const duration =
          session.durationMs != null
            ? formatDurationMs(session.durationMs)
            : "—";

        return (
          <li
            key={session.id}
            className="workout-glass-card rounded-2xl px-5 py-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-lg font-extrabold text-[var(--workout-ink)]">
                  {session.templateName}
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--workout-muted)]">
                  {formatSessionDate(session.startedAt)}
                </p>
              </div>
              <p className="font-mono text-xl font-bold tabular-nums text-[var(--workout-accent)]">
                {duration}
              </p>
            </div>
            {session.exercises.length > 0 ? (
              <p className="mt-3 text-xs font-bold uppercase tracking-widest text-[var(--workout-muted)]">
                {completedCount}/{session.exercises.length} exercises checked off
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
