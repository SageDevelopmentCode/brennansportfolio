"use client";

import {
  getStopwatchElapsedMs,
  WorkoutStopwatch,
} from "@/components/workout-stopwatch";
import { exerciseDetailLabel, type WorkoutSession } from "@/lib/workout";
import { createClient } from "@/lib/supabase/client";
import { useCallback, useState } from "react";

type WorkoutActiveSessionProps = {
  session: WorkoutSession;
  onFinished: (session: WorkoutSession) => void;
};

export function WorkoutActiveSession({
  session,
  onFinished,
}: WorkoutActiveSessionProps) {
  const [exercises, setExercises] = useState(session.exercises);
  const [timerStartedAt, setTimerStartedAt] = useState<string | null>(null);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [accumulatedPauseMs, setAccumulatedPauseMs] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleStartTimer = useCallback(() => {
    setTimerStartedAt(new Date().toISOString());
    setPausedAt(null);
    setAccumulatedPauseMs(0);
  }, []);

  const handlePause = useCallback(() => {
    setPausedAt(Date.now());
  }, []);

  const handleResume = useCallback(() => {
    setPausedAt((current) => {
      if (current == null) return null;
      setAccumulatedPauseMs((total) => total + (Date.now() - current));
      return null;
    });
  }, []);

  async function toggleExercise(exerciseId: string, completed: boolean) {
    setError(null);
    setTogglingId(exerciseId);
    const supabase = createClient();
    const completedAt = completed ? new Date().toISOString() : null;

    const { error: updateError } = await supabase
      .from("workout_session_exercises")
      .update({ completed_at: completedAt })
      .eq("id", exerciseId);

    setTogglingId(null);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setExercises((current) =>
      current.map((exercise) =>
        exercise.id === exerciseId
          ? { ...exercise, completedAt: completedAt }
          : exercise,
      ),
    );
  }

  async function handleFinish() {
    setError(null);
    if (!timerStartedAt) {
      setError("Start the timer before finishing.");
      return;
    }

    setFinishing(true);
    const durationMs = getStopwatchElapsedMs(
      timerStartedAt,
      pausedAt,
      accumulatedPauseMs,
      Date.now(),
    );
    const endedAt = new Date().toISOString();

    const supabase = createClient();
    const { data, error: updateError } = await supabase
      .from("workout_sessions")
      .update({
        ended_at: endedAt,
        duration_ms: durationMs,
      })
      .eq("id", session.id)
      .select(
        "id, template_id, template_name, started_at, ended_at, duration_ms",
      )
      .single();

    setFinishing(false);

    if (updateError || !data) {
      setError(updateError?.message ?? "Could not save session.");
      return;
    }

    onFinished({
      ...session,
      templateId: data.template_id,
      templateName: data.template_name,
      startedAt: data.started_at,
      endedAt: data.ended_at,
      durationMs: data.duration_ms,
      exercises,
    });
  }

  return (
    <section className="workout-glass-card rounded-3xl p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--workout-muted)]">
            Active session
          </p>
          <h2 className="mt-1 text-3xl font-extrabold text-[var(--workout-ink)]">
            {session.templateName}
          </h2>
        </div>
      </div>

      <div className="my-8">
        <WorkoutStopwatch
          startedAt={timerStartedAt}
          pausedAt={pausedAt}
          accumulatedPauseMs={accumulatedPauseMs}
          onStart={handleStartTimer}
          onPause={handlePause}
          onResume={handleResume}
          onFinish={handleFinish}
          finishing={finishing}
        />
      </div>

      {exercises.length > 0 ? (
        <ul className="space-y-2">
          {exercises.map((exercise) => {
            const done = exercise.completedAt != null;
            const detail = exerciseDetailLabel(exercise);

            return (
              <li key={exercise.id}>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 transition ${
                    done
                      ? "border-emerald-400 bg-emerald-50"
                      : "border-[var(--workout-border)] bg-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={done}
                    disabled={togglingId === exercise.id}
                    onChange={(event) =>
                      toggleExercise(exercise.id, event.target.checked)
                    }
                    className="h-5 w-5 rounded border-stone-300 text-[var(--workout-accent)]"
                  />
                  <span className="flex-1">
                    <span
                      className={`block font-bold text-[var(--workout-ink)] ${done ? "line-through opacity-70" : ""}`}
                    >
                      {exercise.name}
                    </span>
                    {detail ? (
                      <span className="text-sm font-semibold text-[var(--workout-muted)]">
                        {detail}
                      </span>
                    ) : null}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-center text-sm font-semibold text-[var(--workout-muted)]">
          No exercises in this template — just finish when you are done.
        </p>
      )}

      {error ? (
        <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">
          {error}
        </p>
      ) : null}
    </section>
  );
}
