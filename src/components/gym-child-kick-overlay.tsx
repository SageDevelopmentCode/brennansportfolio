"use client";

import { useEffect } from "react";

const DURATION_MS = 2800;

type GymChildKickOverlayProps = {
  childName: string;
  onComplete: () => void;
};

export function GymChildKickOverlay({
  childName,
  onComplete,
}: GymChildKickOverlayProps) {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className="gym-kick-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${childName} launched into space`}
    >
      <div className="gym-kick-panel relative max-w-md w-full overflow-hidden rounded-2xl p-8 text-center">
        <p className="gym-kick-rocket text-6xl" aria-hidden>
          🚀
        </p>
        <h3 className="mt-4 font-[family-name:var(--font-gym-display)] text-xl font-bold uppercase tracking-tight text-[var(--gym-ink)]">
          Kicked off Earth
        </h3>
        <p className="mt-2 text-[var(--gym-muted)]">
          <strong>{childName}</strong> is now floating in the void. Butt Face
          says they&apos;re &quot;fine.&quot;
        </p>
        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-[var(--gym-danger)]">
          Space prison awaits
        </p>
      </div>
    </div>
  );
}
