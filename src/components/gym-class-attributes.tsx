"use client";

import {
  formatGymClassChaosLevel,
  formatGymClassDungeonRoom,
  formatGymClassSweatRating,
  formatGymClassTacoBudget,
  formatGymTeacherField,
  type GymClassOwnerPicks,
} from "@/lib/gym-teachers";

type GymClassAttributesProps = {
  picks: GymClassOwnerPicks;
  compact?: boolean;
};

const rowClass =
  "grid gap-0.5 text-sm sm:grid-cols-[minmax(0,9rem)_1fr] sm:gap-3";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={rowClass}>
      <span className="font-semibold text-[var(--gym-muted)]">{label}</span>
      <span className="text-[var(--gym-ink)]">{value}</span>
    </div>
  );
}

export function GymClassAttributes({ picks, compact }: GymClassAttributesProps) {
  return (
    <div
      className={
        compact
          ? "mt-3 flex flex-col gap-2 rounded-lg border border-[var(--gym-border)] bg-[var(--gym-glass)] p-3"
          : "mt-3 flex flex-col gap-2"
      }
    >
      <p className="text-xs font-bold uppercase tracking-widest text-[var(--gym-muted)]">
        Class setup
      </p>
      <Row label="Chaos" value={formatGymClassChaosLevel(picks.chaosLevel)} />
      <Row
        label="Mascot"
        value={formatGymTeacherField(picks.mascotCreature)}
      />
      <Row
        label="Sweat forecast"
        value={formatGymClassSweatRating(picks.sweatRating)}
      />
      <Row label="Battle cry" value={formatGymTeacherField(picks.battleCry)} />
      <Row
        label="Forbidden move"
        value={formatGymTeacherField(picks.forbiddenMove)}
      />
      <Row label="Taco fund" value={formatGymClassTacoBudget(picks.tacoBudget)} />
      <Row
        label="Dungeon room"
        value={formatGymClassDungeonRoom(picks.dungeonRoom)}
      />
    </div>
  );
}
