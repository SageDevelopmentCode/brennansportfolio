"use client";

import {
  BADGES,
  type MathProgress,
  isBadgeUnlocked,
} from "@/lib/multiplication";

type MathBadgesRowProps = {
  progress: MathProgress;
  sessionStreak?: number;
};

export function MathBadgesRow({ progress, sessionStreak }: MathBadgesRowProps) {
  const unlockedCount = BADGES.filter((badge) =>
    isBadgeUnlocked(badge, progress, sessionStreak)
  ).length;

  return (
    <section className="math-glass-card rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--math-muted)]">
            Badges
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--math-ink)]">
            {unlockedCount} of {BADGES.length} unlocked
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        {BADGES.map((badge) => {
          const unlocked = isBadgeUnlocked(badge, progress, sessionStreak);
          return (
            <div
              key={badge.id}
              className={`flex min-w-[5.5rem] flex-col items-center rounded-xl border-2 px-3 py-3 text-center transition ${
                unlocked
                  ? "border-emerald-400 bg-emerald-50 shadow-sm"
                  : "border-sky-200 bg-white/60 opacity-60"
              }`}
              title={unlocked ? badge.name : badge.description}
            >
              <span className="text-2xl" aria-hidden>{badge.emoji}</span>
              <p className="mt-1 text-xs font-bold text-[var(--math-ink)]">
                {badge.name}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
