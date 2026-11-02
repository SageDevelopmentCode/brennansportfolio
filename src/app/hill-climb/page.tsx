import { HillClimbGameClient } from "@/components/hill-climb-game-client";
import Link from "next/link";

export default function HillClimbPage() {
  return (
    <main className="hill-climb-bg relative flex flex-1 flex-col gap-6 px-4 py-8 sm:px-8">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--hill-border)] bg-[var(--hill-glass)] px-4 py-2 text-sm font-semibold text-[var(--hill-accent)] transition hover:border-[var(--hill-accent)]"
      >
        ← All projects
      </Link>

      <header className="max-w-2xl">
        <span className="inline-block rounded-full bg-[var(--hill-accent-soft)] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[var(--hill-accent)]">
          Adventure
        </span>
        <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">Hill Run</h1>
        <p className="mt-2 text-[var(--hill-muted)]">
          Gas and brake like classic hill-climb racing — wheelie up the hills, flip in the air, grab fuel cans and coin lines, then upgrade in the garage. Progress saves in your browser.
        </p>
      </header>

      <HillClimbGameClient />
    </main>
  );
}
