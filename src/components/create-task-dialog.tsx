"use client";

import type { Priority, Repeat, TaskType } from "@/lib/homework-hub";
import { createClient } from "@/lib/supabase/client";
import { FormEvent, useRef, useState } from "react";

type CreateTaskDialogProps = {
  taskType: TaskType;
  onTaskCreated: (task: {
    id: string;
    title: string;
    taskType: TaskType;
    priority: Priority;
    dueDate: string | null;
    repeat: Repeat;
    completedAt: string | null;
    createdAt: string;
  }) => void;
};

type FormState = {
  title: string;
  dueDate: string;
  priority: Priority;
  repeat: Repeat;
};

const emptyForm = (priority: Priority = "normal"): FormState => ({
  title: "",
  dueDate: "",
  priority,
  repeat: "none",
});

export function CreateTaskDialog({
  taskType,
  onTaskCreated,
}: CreateTaskDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openDialog() {
    setError(null);
    setForm(emptyForm());
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }

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

    const { data, error: insertError } = await supabase
      .from("homework_hub_tasks")
      .insert({
        user_id: user.id,
        title: form.title.trim(),
        task_type: taskType,
        priority: form.priority,
        due_date: form.dueDate || null,
        repeat: form.repeat,
      })
      .select(
        "id, title, task_type, priority, due_date, repeat, completed_at, created_at",
      )
      .single();

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    onTaskCreated({
      id: data.id,
      title: data.title,
      taskType: data.task_type,
      priority: data.priority,
      dueDate: data.due_date,
      repeat: data.repeat,
      completedAt: data.completed_at,
      createdAt: data.created_at,
    });
    closeDialog();
  }

  const label = taskType === "homework" ? "Homework" : "Chore";

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="homework-btn-primary"
      >
        + Add {label}
      </button>

      <dialog
        ref={dialogRef}
        onClick={handleBackdropClick}
        className="homework-dialog w-[min(100%,28rem)] rounded-2xl border-2 border-violet-200 bg-white p-0 shadow-2xl backdrop:bg-violet-950/40"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          <div>
            <h2 className="text-xl font-extrabold text-[var(--homework-ink)]">
              New {label}
            </h2>
            <p className="mt-1 text-sm text-[var(--homework-muted)]">
              Title and optional due date — keep it simple!
            </p>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-[var(--homework-ink)]">
              Title
            </span>
            <input
              type="text"
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              className="homework-input"
              placeholder={
                taskType === "homework"
                  ? "Math worksheet p. 42"
                  : "Clean your room"
              }
              maxLength={120}
              required
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-[var(--homework-ink)]">
              Due date (optional)
            </span>
            <input
              type="date"
              value={form.dueDate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  dueDate: event.target.value,
                }))
              }
              className="homework-input"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-[var(--homework-ink)]">
              Priority
            </span>
            <select
              value={form.priority}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  priority: event.target.value as Priority,
                }))
              }
              className="homework-input"
            >
              <option value="urgent">Urgent</option>
              <option value="normal">Normal</option>
              <option value="later">Later</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-[var(--homework-ink)]">
              Repeats
            </span>
            <select
              value={form.repeat}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  repeat: event.target.value as Repeat,
                }))
              }
              className="homework-input"
            >
              <option value="none">Does not repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </label>

          {error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeDialog}
              className="homework-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="homework-btn-primary disabled:opacity-60"
            >
              {loading ? "Saving..." : "Add task"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
