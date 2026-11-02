import { PhysicsRampClient } from "@/components/physics-ramp-client";
import Link from "next/link";

export default function PhysicsPage() {
  return (
    <main className="physics-bg relative flex flex-1 flex-col gap-8 px-4 py-8 sm:px-8 sm:py-12">
      <div>
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--physics-border)] bg-[var(--physics-glass)] px-4 py-2 text-sm font-semibold text-[var(--physics-accent)] transition hover:border-[var(--physics-accent)] hover:shadow-[0_0_16px_rgba(167,139,250,0.25)]"
        >
          ← All projects
        </Link>
      </div>

      <header className="max-w-3xl">
        <span className="inline-block rounded-full bg-[var(--physics-accent-soft)] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[var(--physics-accent)] ring-1 ring-[var(--physics-border)]">
          Physics playground
        </span>
        <h1 className="mt-4 text-5xl font-extrabold leading-tight sm:text-6xl">
          <span className="physics-title-gradient">Ramp Lab</span>
        </h1>
        <p className="mt-4 text-lg text-[var(--physics-muted)]">
          Try classic ramps or wavy hill tracks — drag the scene sideways to see
          the whole course. Add multiple balls, predict the winner, and use the
          arrows and info buttons to see why they move the way they do.
        </p>
      </header>

      <PhysicsRampClient />
    </main>
  );
}
