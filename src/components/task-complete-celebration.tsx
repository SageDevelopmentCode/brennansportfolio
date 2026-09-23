"use client";

type TaskCompleteCelebrationProps = {
  message: string | null;
  onDismiss: () => void;
};

export function TaskCompleteCelebration({
  message,
  onDismiss,
}: TaskCompleteCelebrationProps) {
  if (!message) return null;

  return (
    <div
      className="fixed inset-x-4 top-6 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border-2 border-lime-400 bg-white px-5 py-4 shadow-[0_12px_40px_rgba(132,204,22,0.35)] animate-homework-pop"
      role="status"
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl" aria-hidden>🎉</span>
        <p className="text-lg font-extrabold text-[var(--homework-ink)]">
          {message}
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-full px-2 py-1 text-sm font-bold text-[var(--homework-muted)] transition hover:bg-violet-100 hover:text-violet-700"
      >
        OK
      </button>
    </div>
  );
}
