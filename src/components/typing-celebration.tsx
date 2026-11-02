"use client";

import { BADGE_DEFINITIONS } from "@/lib/typing-progress";
import { useEffect, useMemo } from "react";

type TypingCelebrationProps = {
  show: boolean;
  message: string;
  newBadges: string[];
  onDismiss: () => void;
};

export function TypingCelebration({
  show,
  message,
  newBadges,
  onDismiss,
}: TypingCelebrationProps) {
  const particles = useMemo(
    () =>
      Array.from({ length: 28 }, (_, index) => ({
        id: index,
        tx: `${(Math.random() - 0.5) * 240}px`,
        ty: `${(Math.random() - 0.5) * 240}px`,
        color:
          index % 3 === 0
            ? "#22d3ee"
            : index % 3 === 1
              ? "#e879f9"
              : "#34d399",
        left: `${40 + Math.random() * 20}%`,
        top: `${30 + Math.random() * 20}%`,
      })),
    [show]
  );

  useEffect(() => {
    if (!show) return;
    const timer = window.setTimeout(onDismiss, 4500);
    return () => window.clearTimeout(timer);
  }, [show, onDismiss]);

  if (!show) return null;

  const badgeDetails = newBadges
    .map((id) => BADGE_DEFINITIONS.find((badge) => badge.id === id))
    .filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-label="New record celebration"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-[var(--typing-accent)] bg-[#0f1020] p-8 text-center shadow-[0_0_60px_rgba(34,211,238,0.35)] typing-celebration-flash">
        {particles.map((particle) => (
          <span
            key={particle.id}
            className="typing-particle"
            style={
              {
                left: particle.left,
                top: particle.top,
                backgroundColor: particle.color,
                "--tx": particle.tx,
                "--ty": particle.ty,
              } as React.CSSProperties
            }
          />
        ))}

        <p className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--typing-accent)]">
          New Record
        </p>
        <p className="typing-record-glow mt-4 text-4xl font-extrabold text-white">
          {message}
        </p>
        <p className="mt-2 text-6xl" aria-hidden>⚡</p>

        {badgeDetails.length > 0 && (
          <div className="mt-6 space-y-2">
            {badgeDetails.map((badge) => (
              <div
                key={badge!.id}
                className="rounded-2xl border border-[var(--typing-border-soft)] bg-white/5 px-4 py-3"
              >
                <p className="text-2xl">{badge!.emoji}</p>
                <p className="font-bold text-white">{badge!.label}</p>
                <p className="text-sm text-[var(--typing-muted)]">
                  {badge!.description}
                </p>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={onDismiss}
          className="typing-btn-primary mt-8"
        >
          Keep Blitzing
        </button>
      </div>
    </div>
  );
}
