"use client";

import { GYM_TEACHER_TAGLINE } from "@/lib/gym-teacher-lore";
import type { GymRole } from "@/lib/gym-roles";

type GymRolePickerProps = {
  onPick: (role: GymRole) => void;
};

export function GymRolePicker({ onPick }: GymRolePickerProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-sm font-semibold text-[var(--gym-muted)] sm:text-left">
        Who are you today?
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => onPick("owner")}
          className="gym-role-card text-left"
        >
          <span className="text-4xl" aria-hidden>
            👑
          </span>
          <h2 className="mt-3 font-[family-name:var(--font-gym-display)] text-xl font-bold uppercase tracking-tight text-[var(--gym-ink)]">
            Owner
          </h2>
          <p className="mt-2 text-sm text-[var(--gym-muted)]">
            Queue, roster, classes, and assigning teachers.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onPick("family")}
          className="gym-role-card text-left"
        >
          <span className="text-4xl" aria-hidden>
            👨‍👩‍👧
          </span>
          <h2 className="mt-3 font-[family-name:var(--font-gym-display)] text-xl font-bold uppercase tracking-tight text-[var(--gym-ink)]">
            Family
          </h2>
          <p className="mt-2 text-sm text-[var(--gym-muted)]">
            Pick a saved family or check in fresh — lobby code still works.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onPick("employee")}
          className="gym-role-card gym-role-card-desk text-left"
        >
          <span className="text-4xl" aria-hidden>
            🛎️
          </span>
          <h2 className="mt-3 font-[family-name:var(--font-gym-display)] text-xl font-bold uppercase tracking-tight text-[var(--gym-ink)]">
            Front desk
          </h2>
          <p className="mt-2 text-sm text-[var(--gym-muted)]">
            Walk-ins ask here. Submit their check-in and give them the lobby
            code (one number + one letter).
          </p>
        </button>

        <button
          type="button"
          onClick={() => onPick("teacher")}
          className="gym-role-card text-left"
        >
          <span className="text-4xl" aria-hidden>
            🌮
          </span>
          <h2 className="mt-3 font-[family-name:var(--font-gym-display)] text-xl font-bold uppercase tracking-tight text-[var(--gym-ink)]">
            Teacher
          </h2>
          <p className="mt-2 text-sm text-[var(--gym-muted)]">{GYM_TEACHER_TAGLINE}</p>
        </button>
      </div>
    </div>
  );
}
