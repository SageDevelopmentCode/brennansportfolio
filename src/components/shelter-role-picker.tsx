"use client";

import type { ShelterRole } from "@/lib/shelter-worker-lines";

type ShelterRolePickerProps = {
  onPick: (role: ShelterRole) => void;
};

export function ShelterRolePicker({ onPick }: ShelterRolePickerProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-sm font-semibold text-[var(--shelter-muted)] sm:text-left">
        Who are you today?
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onPick("visitor")}
          className="shelter-role-card text-left"
        >
          <span className="text-4xl" aria-hidden>🧑</span>
          <h2 className="mt-3 text-xl font-extrabold text-[var(--shelter-ink)]">
            I&apos;m just visiting
          </h2>
          <p className="mt-2 text-sm text-[var(--shelter-muted)]">
            Ask about a pet. Sign the waiver if you&apos;re lucky. Game over if
            you&apos;re not.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onPick("worker")}
          className="shelter-role-card shelter-role-card-sus text-left"
        >
          <span className="text-4xl" aria-hidden>🥸</span>
          <h2 className="mt-3 text-xl font-extrabold text-[var(--shelter-ink)]">
            I work here (definitely)
          </h2>
          <p className="mt-2 text-sm text-[var(--shelter-muted)]">
            Staff view. You see the truth. The guy at the desk is… suspicious.
          </p>
        </button>
      </div>
    </div>
  );
}
