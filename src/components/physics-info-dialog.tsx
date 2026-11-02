"use client";

import type { PhysicsHelpTopic } from "@/lib/physics-help";
import { PHYSICS_HELP } from "@/lib/physics-help";
import { useEffect, useRef } from "react";

type PhysicsInfoDialogProps = {
  topic: PhysicsHelpTopic | null;
  onClose: () => void;
};

export function PhysicsInfoDialog({ topic, onClose }: PhysicsInfoDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (topic) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [topic]);

  const entry = topic ? PHYSICS_HELP[topic] : null;

  function handleBackdropClick(event: React.MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) {
      onClose();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="physics-dialog"
      onClick={handleBackdropClick}
      onClose={onClose}
    >
      {entry && (
        <div className="physics-dialog-inner">
          <h2 className="text-lg font-bold text-[var(--physics-ink)]">
            {entry.title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--physics-muted)]">
            {entry.body}
          </p>
          <button
            type="button"
            className="physics-btn physics-btn-primary mt-6"
            onClick={onClose}
          >
            Got it
          </button>
        </div>
      )}
    </dialog>
  );
}
