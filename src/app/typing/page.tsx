import { TypingGameClient } from "@/components/typing-game-client";
import Link from "next/link";

export default function TypingPage() {
  return (
    <main className="typing-bg relative flex flex-1 flex-col gap-8 overflow-x-hidden px-4 py-8 touch-manipulation sm:px-8 sm:py-12">
      <div className="relative z-10">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--typing-border-soft)] bg-[var(--typing-glass)] px-4 py-2 text-sm font-semibold text-[var(--typing-accent)] backdrop-blur-sm transition hover:border-[var(--typing-accent)] hover:shadow-[0_0_16px_rgba(34,211,238,0.25)]"
        >
          ← All projects
        </Link>
      </div>

      <header className="relative z-10 max-w-3xl">
        <span className="inline-block rounded-full bg-[var(--typing-accent-soft)] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[var(--typing-accent)] ring-1 ring-[var(--typing-border-soft)]">
          Neon arcade
        </span>
        <h1 className="mt-4 text-5xl font-extrabold leading-tight sm:text-6xl md:text-7xl">
          <span className="typing-title-glow">Key Blitz</span>
        </h1>
        <p className="mt-4 text-lg text-[var(--typing-muted)]">
          Classic 60-second tests, falling words, survival runs, and smart key
          drills. Pick your name, chase family high scores — all saved on this
          device.
        </p>
      </header>

      <div className="relative z-10 w-full max-w-4xl">
        <TypingGameClient />
      </div>
    </main>
  );
}
