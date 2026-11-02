import { BlockRealmGameClient } from "@/components/blockrealm-game-client";
import Link from "next/link";

export default function BlockRealmPage() {
  return (
    <main className="blockrealm-bg relative flex flex-1 flex-col gap-10 overflow-hidden px-4 py-8 sm:px-8 sm:py-12">
      <div className="relative z-10">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--blockrealm-border-soft)] bg-[var(--blockrealm-glass)] px-4 py-2 text-sm font-semibold text-[var(--blockrealm-accent)] backdrop-blur-sm transition hover:border-[var(--blockrealm-accent)] hover:shadow-[0_0_16px_rgba(34,197,94,0.2)]"
        >
          ← All projects
        </Link>
      </div>

      <header className="relative z-10 max-w-3xl">
        <span className="inline-block rounded-full bg-[var(--blockrealm-accent-soft)] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[var(--blockrealm-accent)] ring-1 ring-[var(--blockrealm-border-soft)]">
          Little lands
        </span>
        <h1 className="mt-4 text-5xl font-extrabold leading-tight sm:text-6xl md:text-7xl">
          <span className="blockrealm-title-glow">Block Realm</span>
        </h1>
        <p className="mt-4 text-lg text-[var(--blockrealm-muted)]">
          Place blocks, break blocks, survive the night. A tiny voxel sandbox —
          no login needed, your world saves on this device.
        </p>
      </header>

      <section
        className="blockrealm-glass-card relative z-10 max-w-3xl rounded-3xl p-6 sm:p-8"
        aria-labelledby="blockrealm-how-to"
      >
        <h2
          id="blockrealm-how-to"
          className="text-xl font-extrabold text-[var(--blockrealm-ink)]"
        >
          How to play
        </h2>
        <ul className="mt-4 grid gap-3 text-sm text-[var(--blockrealm-muted)] sm:grid-cols-2">
          <li>
            <strong className="text-[var(--blockrealm-ink)]">WASD</strong> move,
            <strong className="text-[var(--blockrealm-ink)]"> Space</strong> jump
          </li>
          <li>
            <strong className="text-[var(--blockrealm-ink)]">Mouse</strong> look
            after you click play
          </li>
          <li>
            <strong className="text-[var(--blockrealm-ink)]">Left click</strong>{" "}
            break a block
          </li>
          <li>
            <strong className="text-[var(--blockrealm-ink)]">Right click</strong>{" "}
            place the selected block
          </li>
          <li>
            <strong className="text-[var(--blockrealm-ink)]">1–6</strong> pick a
            block from the hotbar
          </li>
          <li>
            <strong className="text-[var(--blockrealm-ink)]">Esc</strong> unlock
            the mouse
          </li>
        </ul>
      </section>

      <div className="relative z-10 w-full max-w-5xl">
        <BlockRealmGameClient />
      </div>
    </main>
  );
}
