import { ChessGameClient } from "@/components/chess-game-client";
import Link from "next/link";

export default function ChessPage() {
  return (
    <main className="chess-bg relative flex flex-1 flex-col gap-10 overflow-hidden px-4 py-8 sm:px-8 sm:py-12">
      <div className="relative z-10">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--chess-border-soft)] bg-[var(--chess-glass)] px-4 py-2 text-sm font-semibold text-[var(--chess-accent)] backdrop-blur-sm transition hover:border-[var(--chess-accent)] hover:shadow-[0_0_16px_rgba(45,90,39,0.2)]"
        >
          ← All projects
        </Link>
      </div>

      <header className="relative z-10 max-w-3xl">
        <span className="inline-block rounded-full bg-[var(--chess-accent-soft)] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[var(--chess-accent)] ring-1 ring-[var(--chess-border-soft)]">
          Checkmate challenge
        </span>
        <h1 className="mt-4 text-5xl font-extrabold leading-tight sm:text-6xl md:text-7xl">
          <span className="chess-title-glow">Royal Check</span>
        </h1>
        <p className="mt-4 text-lg text-[var(--chess-muted)]">
          Play as white against the computer. Full rules — castling, en passant,
          and promotion included. No login needed — your record saves on this
          device.
        </p>
      </header>

      <div className="relative z-10 w-full max-w-4xl">
        <ChessGameClient />
      </div>
    </main>
  );
}
