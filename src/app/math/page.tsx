import { MultiplicationGameClient } from "@/components/multiplication-game-client";
import Link from "next/link";

export default function MathPage() {
  return (
    <main className="math-bg relative flex flex-1 flex-col gap-10 overflow-hidden px-4 py-8 sm:px-8 sm:py-12">
      <div
        aria-hidden
        className="math-float-symbol left-[8%] top-[15%] opacity-40"
        style={{ animationDelay: "0s" }}
      >
        ×
      </div>
      <div
        aria-hidden
        className="math-float-symbol right-[12%] top-[22%] opacity-40"
        style={{ animationDelay: "1.5s" }}
      >
        =
      </div>
      <div
        aria-hidden
        className="math-float-symbol left-[45%] top-[65%] hidden opacity-30 sm:block"
        style={{ animationDelay: "3s" }}
      >
        ✖️
      </div>

      <div className="relative z-10">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--math-border)] bg-[var(--math-glass)] px-4 py-2 text-sm font-semibold text-[var(--math-accent)] backdrop-blur-sm transition hover:border-[var(--math-accent)] hover:shadow-[0_0_16px_rgba(14,165,233,0.25)]"
        >
          ← All projects
        </Link>
      </div>

      <header className="relative z-10 max-w-3xl">
        <span className="inline-block rounded-full bg-[var(--math-accent-soft)] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[var(--math-accent)] ring-1 ring-[var(--math-border)]">
          Times tables practice
        </span>
        <h1 className="mt-4 text-5xl font-extrabold leading-tight sm:text-6xl md:text-7xl">
          <span className="math-title-glow">Math Blitz</span>
        </h1>
        <p className="mt-4 text-lg text-[var(--math-muted)]">
          Multiply fast, build streaks, and unlock badges. No login needed — your
          progress saves on this device.
        </p>
      </header>

      <div className="relative z-10 w-full max-w-2xl">
        <MultiplicationGameClient />
      </div>
    </main>
  );
}
