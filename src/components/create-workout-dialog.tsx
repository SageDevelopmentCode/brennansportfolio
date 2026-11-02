"use client";

import type { WorkoutTemplate } from "@/lib/workout";
import { createClient } from "@/lib/supabase/client";
import { FormEvent, useRef, useState } from "react";

type ExerciseDraft = {
  key: string;
  name: string;
  sets: string;
  reps: string;
};

type CreateWorkoutDialogProps = {
  onCreated: (template: WorkoutTemplate) => void;
};

function newExerciseRow(): ExerciseDraft {
  return {
    key: crypto.randomUUID(),
    name: "",
    sets: "",
    reps: "",
  };
}

function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export function CreateWorkoutDialog({ onCreated }: CreateWorkoutDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [exercises, setExercises] = useState<ExerciseDraft[]>([
    newExerciseRow(),
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openDialog() {
    setError(null);
    setName("");
    setExercises([newExerciseRow()]);
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  function handleBackdropClick(event: React.MouseEvent<HTMLDialogElement>) {
    const dialog = dialogRef.current;
    if (dialog && event.target === dialog) {
      closeDialog();
    }
  }

  function updateExercise(key: string, patch: Partial<ExerciseDraft>) {
    setExercises((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function removeExercise(key: string) {
    setExercises((current) =>
      current.length <= 1 ? current : current.filter((row) => row.key !== key),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Workout name is required.");
      return;
    }

    const exerciseRows = exercises
      .map((row) => ({
        name: row.name.trim(),
        sets: parseOptionalInt(row.sets),
        reps: parseOptionalInt(row.reps),
      }))
      .filter((row) => row.name.length > 0);

    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      setError("You must be logged in.");
      return;
    }

    const { data: templateRow, error: templateError } = await supabase
      .from("workout_templates")
      .insert({
        user_id: user.id,
        name: trimmedName,
      })
      .select("id, name, created_at")
      .single();

    if (templateError || !templateRow) {
      setLoading(false);
      setError(templateError?.message ?? "Could not save workout.");
      return;
    }

    let createdExercises: WorkoutTemplate["exercises"] = [];

    if (exerciseRows.length > 0) {
      const { data: exerciseData, error: exerciseError } = await supabase
        .from("workout_template_exercises")
        .insert(
          exerciseRows.map((row, index) => ({
            template_id: templateRow.id,
            user_id: user.id,
            name: row.name,
            sets: row.sets,
            reps: row.reps,
            sort_order: index,
          })),
        )
        .select("id, name, sets, reps, sort_order");

      if (exerciseError) {
        await supabase.from("workout_templates").delete().eq("id", templateRow.id);
        setLoading(false);
        setError(exerciseError.message);
        return;
      }

      createdExercises = (exerciseData ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((row) => ({
          id: row.id,
          name: row.name,
          sets: row.sets,
          reps: row.reps,
          sortOrder: row.sort_order,
        }));
    }

    setLoading(false);
    onCreated({
      id: templateRow.id,
      name: templateRow.name,
      createdAt: templateRow.created_at,
      exercises: createdExercises,
    });
    closeDialog();
  }

  return (
    <>
      <button type="button" onClick={openDialog} className="workout-btn-primary">
        + Create workout
      </button>

      <dialog
        ref={dialogRef}
        onClick={handleBackdropClick}
        className="workout-dialog w-[min(100%,32rem)] rounded-2xl border-2 border-[var(--workout-border)] bg-white p-0 shadow-2xl backdrop:bg-stone-950/50"
      >
        <form onSubmit={handleSubmit} className="flex max-h-[min(90vh,40rem)] flex-col gap-4 p-6">
          <div>
            <h2 className="text-xl font-extrabold text-[var(--workout-ink)]">
              New workout template
            </h2>
            <p className="mt-1 text-sm text-[var(--workout-muted)]">
              Name your routine and add exercises you can reuse anytime.
            </p>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-[var(--workout-ink)]">
              Workout name
            </span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="workout-input"
              placeholder="Leg day, Upper body, etc."
              maxLength={80}
              required
            />
          </label>

          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-[var(--workout-ink)]">
                Exercises
              </span>
              <button
                type="button"
                onClick={() =>
                  setExercises((current) => [...current, newExerciseRow()])
                }
                className="text-sm font-bold text-[var(--workout-accent)] hover:underline"
              >
                + Add exercise
              </button>
            </div>

            {exercises.map((row, index) => (
              <div
                key={row.key}
                className="rounded-xl border-2 border-[var(--workout-border)] bg-[var(--workout-surface)] p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-[var(--workout-muted)]">
                    Exercise {index + 1}
                  </span>
                  {exercises.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeExercise(row.key)}
                      className="text-xs font-bold text-rose-600 hover:underline"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <input
                  type="text"
                  value={row.name}
                  onChange={(event) =>
                    updateExercise(row.key, { name: event.target.value })
                  }
                  className="workout-input mb-2"
                  placeholder="Push-ups"
                  maxLength={80}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={1}
                    value={row.sets}
                    onChange={(event) =>
                      updateExercise(row.key, { sets: event.target.value })
                    }
                    className="workout-input"
                    placeholder="Sets"
                  />
                  <input
                    type="number"
                    min={1}
                    value={row.reps}
                    onChange={(event) =>
                      updateExercise(row.key, { reps: event.target.value })
                    }
                    className="workout-input"
                    placeholder="Reps"
                  />
                </div>
              </div>
            ))}
          </div>

          {error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeDialog}
              className="workout-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="workout-btn-primary disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save workout"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
