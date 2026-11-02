import { GymAppClient } from "@/components/gym-app-client";
import Link from "next/link";

export default function GymPage() {
  return (
    <main className="gym-bg relative flex flex-1 flex-col gap-8 px-4 py-8 touch-manipulation sm:px-8 sm:py-12">
      <div>
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--gym-border)] bg-[var(--gym-glass)] px-4 py-2 text-sm font-semibold text-[var(--gym-accent)] transition hover:border-[var(--gym-accent)]"
        >
          ← All projects
        </Link>
      </div>

      <header className="max-w-3xl">
        <span className="inline-block rounded-full bg-[var(--gym-accent-soft)] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[var(--gym-accent)] ring-1 ring-[var(--gym-border)]">
          Gym sim
        </span>
        <h1 className="mt-4 font-[family-name:var(--font-gym-display)] text-5xl font-bold uppercase leading-tight tracking-tight sm:text-6xl">
          <span className="gym-title-gradient">Iron Desk</span>
        </h1>
        <p className="mt-4 text-lg text-[var(--gym-muted)]">
          Pick a role — owner, front desk, family (play as a saved family or
          check in fresh), or teacher — then play. Teachers can sign up from the
          Teacher screen. Owner builds classes and assigns teachers to kids from
          other families. No login; open two tabs to simulate for real.
        </p>
      </header>

      <GymAppClient />
    </main>
  );
}
