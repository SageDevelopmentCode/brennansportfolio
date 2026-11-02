"use client";

import { exerciseDetailLabel, type WorkoutTemplate } from "@/lib/workout";

type WorkoutTemplateListProps = {
  templates: WorkoutTemplate[];
  onStart: (template: WorkoutTemplate) => void;
  onDelete: (templateId: string) => void;
  busyTemplateId: string | null;
  deletingId: string | null;
};

export function WorkoutTemplateList({
  templates,
  onStart,
  onDelete,
  busyTemplateId,
  deletingId,
}: WorkoutTemplateListProps) {
  if (templates.length === 0) {
    return (
      <div className="workout-empty-card rounded-2xl px-6 py-12 text-center">
        <span className="text-4xl" aria-hidden>
          🏋️
        </span>
        <p className="mt-3 text-lg font-bold text-[var(--workout-ink)]">
          No workouts yet
        </p>
        <p className="mt-1 text-sm text-[var(--workout-muted)]">
          Tap Create workout to build your first template.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {templates.map((template) => {
        const starting = busyTemplateId === template.id;
        const deleting = deletingId === template.id;

        return (
          <li
            key={template.id}
            className="workout-glass-card flex flex-col gap-4 rounded-2xl p-5"
          >
            <div>
              <h3 className="text-xl font-extrabold text-[var(--workout-ink)]">
                {template.name}
              </h3>
              <p className="mt-1 text-sm font-semibold text-[var(--workout-muted)]">
                {template.exercises.length} exercise
                {template.exercises.length === 1 ? "" : "s"}
              </p>
            </div>

            {template.exercises.length > 0 ? (
              <ul className="space-y-2 text-sm font-semibold text-[var(--workout-ink)]">
                {template.exercises.slice(0, 4).map((exercise) => {
                  const detail = exerciseDetailLabel(exercise);
                  return (
                    <li key={exercise.id} className="flex justify-between gap-2">
                      <span>{exercise.name}</span>
                      {detail ? (
                        <span className="text-[var(--workout-muted)]">{detail}</span>
                      ) : null}
                    </li>
                  );
                })}
                {template.exercises.length > 4 ? (
                  <li className="text-[var(--workout-muted)]">
                    +{template.exercises.length - 4} more
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="text-sm text-[var(--workout-muted)]">
                No exercises listed — add some when you create the workout.
              </p>
            )}

            <div className="mt-auto flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onStart(template)}
                disabled={starting || deleting || busyTemplateId != null}
                className="workout-btn-primary disabled:opacity-60"
              >
                {starting ? "Starting..." : "Start"}
              </button>
              <button
                type="button"
                onClick={() => onDelete(template.id)}
                disabled={starting || deleting || deletingId != null}
                className="workout-btn-secondary disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
