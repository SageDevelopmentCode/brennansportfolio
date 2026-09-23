"use client";

import { BADGES } from "@/lib/homework-hub";

type BadgesRowProps = {
  totalCompletions: number;
};

export function BadgesRow({ totalCompletions }: BadgesRowProps) {
  return (
    <section className="homework-glass-card rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--homework-muted)]">
            Badges
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--homework-ink)]">
            {totalCompletions} task{totalCompletions === 1 ? "" : "s"} completed
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        {BADGES.map((badge) => {
          const unlocked = totalCompletions >= badge.threshold;
          return (
            <div
              key={badge.id}
              className={`flex min-w-[5.5rem] flex-col items-center rounded-xl border-2 px-3 py-3 text-center transition ${
                unlocked
                  ? "border-lime-400 bg-lime-50 shadow-sm"
                  : "border-violet-200 bg-white/60 opacity-60"
              }`}
              title={
                unlocked
                  ? badge.name
                  : `${badge.name} — complete ${badge.threshold} tasks`
              }
            >
              <span className="text-2xl" aria-hidden>{badge.emoji}</span>
              <p className="mt-1 text-xs font-bold text-[var(--homework-ink)]">
                {badge.name}
              </p>
              <p className="text-[10px] font-semibold text-[var(--homework-muted)]">
                {badge.threshold}+
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
