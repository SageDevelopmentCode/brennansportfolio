import { SpellingGameClient } from "@/components/spelling-game-client";
import Link from "next/link";

export default function SpellingPage() {
  return (
    <main className="spelling-bg relative flex flex-1 flex-col gap-8 px-4 py-8 touch-manipulation sm:px-8 sm:py-12">
      <div>
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--spelling-border)] bg-[var(--spelling-glass)] px-4 py-2 text-sm font-semibold text-[var(--spelling-accent)] transition hover:border-[var(--spelling-accent)] hover:shadow-[0_0_16px_rgba(217,119,6,0.2)]"
        >
          ← All projects
        </Link>
      </div>

      <header className="max-w-3xl">
        <span className="inline-block rounded-full bg-[var(--spelling-accent-soft)] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[var(--spelling-accent)] ring-1 ring-[var(--spelling-border)]">
          Listen & spell
        </span>
        <h1 className="mt-4 text-5xl font-extrabold leading-tight sm:text-6xl">
          <span className="spelling-title-gradient">Spell Sound</span>
        </h1>
        <p className="mt-4 text-lg text-[var(--spelling-muted)]">
          Your browser reads each 6th-grade word out loud. Type the spelling,
          learn from mistakes, and watch words turn mastered after three correct
          tries in a row.
        </p>
      </header>

      <div className="w-full max-w-4xl">
        <SpellingGameClient />
      </div>
    </main>
  );
}
