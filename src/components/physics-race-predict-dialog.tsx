"use client";

import { BALL_MATERIALS, type RaceBall } from "@/lib/physics-ramp";
import { useEffect, useRef, useState } from "react";

type PhysicsRacePredictDialogProps = {
  open: boolean;
  balls: RaceBall[];
  onConfirm: (predictedBallId: string) => void;
  onCancel: () => void;
};

export function PhysicsRacePredictDialog({
  open,
  balls,
  onConfirm,
  onCancel,
}: PhysicsRacePredictDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pick, setPick] = useState<string>("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      setPick(balls[0]?.id ?? "");
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open, balls]);

  function handleBackdropClick(event: React.MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) {
      onCancel();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="physics-dialog"
      onClick={handleBackdropClick}
      onClose={onCancel}
    >
      <div className="physics-dialog-inner">
        <h2 className="text-lg font-bold text-[var(--physics-ink)]">
          Which ball will finish first?
        </h2>
        <p className="mt-2 text-sm text-[var(--physics-muted)]">
          Make your prediction, then we&apos;ll run the race.
        </p>
        <ul className="mt-4 flex flex-col gap-2">
          {balls.map((ball) => {
            const mat = BALL_MATERIALS[ball.materialId];
            return (
              <li key={ball.id}>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 ${
                    pick === ball.id
                      ? "border-[var(--physics-accent)] bg-[var(--physics-accent-soft)]"
                      : "border-[var(--physics-border)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="race-pick"
                    value={ball.id}
                    checked={pick === ball.id}
                    onChange={() => setPick(ball.id)}
                    className="accent-[var(--physics-accent)]"
                  />
                  <span
                    className="h-4 w-4 rounded-full"
                    style={{ background: mat.color }}
                    aria-hidden
                  />
                  <span className="font-semibold text-[var(--physics-ink)]">
                    {mat.label}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            className="physics-btn physics-btn-primary"
            disabled={!pick}
            onClick={() => onConfirm(pick)}
          >
            Run race
          </button>
          <button
            type="button"
            className="physics-btn physics-btn-outline"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </dialog>
  );
}
