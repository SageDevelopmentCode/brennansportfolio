"use client";

import type { RaceResultReport } from "@/lib/physics-ramp";
import { useEffect, useRef } from "react";

type PhysicsRaceResultDialogProps = {
  report: RaceResultReport | null;
  onClose: () => void;
};

export function PhysicsRaceResultDialog({
  report,
  onClose,
}: PhysicsRaceResultDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (report) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [report]);

  function handleBackdropClick(event: React.MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) {
      onClose();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="physics-dialog physics-dialog-wide"
      onClick={handleBackdropClick}
      onClose={onClose}
    >
      {report && (
        <div className="physics-dialog-inner">
          <h2 className="text-xl font-bold text-[var(--physics-ink)]">
            {report.title}
          </h2>
          {report.predictionLine && (
            <p
              className={`mt-2 text-sm font-semibold ${
                report.predictionCorrect
                  ? "text-emerald-700"
                  : "text-amber-700"
              }`}
            >
              {report.predictionLine}
            </p>
          )}
          <p className="mt-3 text-sm font-semibold text-[var(--physics-muted)]">
            Why (in simple terms):
          </p>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--physics-ink)]">
            {report.bullets.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <button
            type="button"
            className="physics-btn physics-btn-primary mt-6 w-full"
            onClick={onClose}
          >
            Got it
          </button>
        </div>
      )}
    </dialog>
  );
}
