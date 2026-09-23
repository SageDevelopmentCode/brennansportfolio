import { SnakeGameClient } from "@/components/snake-game-client";
import Link from "next/link";

export default function SnakePage() {
  return (
    <main className="snake-bg relative flex flex-1 flex-col gap-10 overflow-hidden px-4 py-8 sm:px-8 sm:py-12">
      <div className="relative z-10">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--snake-border-soft)] bg-[var(--snake-glass)] px-4 py-2 text-sm font-semibold text-[var(--snake-accent)] backdrop-blur-sm transition hover:border-[var(--snake-accent)] hover:shadow-[0_0_16px_rgba(180,83,9,0.2)]"
        >
          ← All projects
        </Link>
      </div>

      <header className="relative z-10 max-w-3xl">
        <span className="inline-block rounded-full bg-[var(--snake-accent-soft)] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[var(--snake-accent)] ring-1 ring-[var(--snake-border-soft)]">
          Desert arena
        </span>
        <h1 className="mt-4 text-5xl font-extrabold leading-tight sm:text-6xl md:text-7xl">
          <span className="snake-title-glow">Dot Snake</span>
        </h1>
        <p className="mt-4 text-lg text-[var(--snake-muted)]">
          Stay inside the red-line box, chase the apple, and grow as long as you
          can. No login needed — your high score saves on this device.
        </p>
      </header>

      <div className="relative z-10 w-full max-w-xl">
        <SnakeGameClient />
      </div>
    </main>
  );
}
