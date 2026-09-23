"use client";

import {
  formatDueDate,
  groupTasksByPriority,
  PRIORITY_LABELS,
  type HomeworkTask,
  type HubMode,
  type TaskType,
} from "@/lib/homework-hub";

type TaskListProps = {
  tasks: HomeworkTask[];
  taskType: TaskType;
  mode: HubMode;
  onComplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  completingId: string | null;
};

export function TaskList({
  tasks,
  taskType,
  mode,
  onComplete,
  onDelete,
  completingId,
}: TaskListProps) {
  const filtered = tasks.filter((task) => task.taskType === taskType);
  const groups = groupTasksByPriority(filtered);

  if (groups.length === 0) {
    return (
      <div className="homework-empty-card rounded-2xl px-6 py-12 text-center">
        <p className="text-4xl" aria-hidden>
          {taskType === "homework" ? "📚" : "🧹"}
        </p>
        <p className="mt-3 text-lg font-bold text-[var(--homework-ink)]">
          Nothing here yet!
        </p>
        <p className="mt-1 text-sm text-[var(--homework-muted)]">
          {mode === "parent"
            ? `Add a ${taskType === "homework" ? "homework" : "chore"} task to get started.`
            : `Switch to Parent mode to add ${taskType === "homework" ? "homework" : "chores"}.`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.priority}>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-[var(--homework-muted)]">
            {PRIORITY_LABELS[group.priority]}
          </h3>
          <ul className="space-y-3">
            {group.tasks.map((task) => (
              <li
                key={task.id}
                className="homework-task-card flex items-start gap-3 rounded-2xl border-2 border-violet-200 bg-white p-4 shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => onComplete(task.id)}
                  disabled={completingId === task.id}
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-lime-500 bg-lime-50 text-lg font-bold text-lime-600 transition hover:scale-110 hover:bg-lime-100 disabled:opacity-50"
                  aria-label={`Complete ${task.title}`}
                >
                  ✓
                </button>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[var(--homework-ink)]">{task.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--homework-muted)]">
                    {task.dueDate ? (
                      <span>Due {formatDueDate(task.dueDate)}</span>
                    ) : null}
                    {task.repeat !== "none" ? (
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-violet-700">
                        Repeats {task.repeat}
                      </span>
                    ) : null}
                  </div>
                </div>
                {mode === "parent" ? (
                  <button
                    type="button"
                    onClick={() => onDelete(task.id)}
                    className="shrink-0 rounded-lg px-2 py-1 text-sm font-bold text-rose-500 transition hover:bg-rose-50"
                    aria-label={`Delete ${task.title}`}
                  >
                    Delete
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
