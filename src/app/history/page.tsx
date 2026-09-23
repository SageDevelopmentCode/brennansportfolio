import { HistoryTimelineClient } from "@/components/history-timeline-client";
import { CURATED_US_EVENTS } from "@/lib/history";
import Link from "next/link";

export default function HistoryPage() {
  return (
    <main className="history-bg relative flex flex-1 flex-col gap-10 overflow-hidden px-4 py-8 sm:px-8 sm:py-12">
      <div
        aria-hidden
        className="history-float-icon left-[6%] top-[18%] opacity-50"
        style={{ animationDelay: "0s" }}
      >
        📜
      </div>
      <div
        aria-hidden
        className="history-float-icon right-[10%] top-[28%] opacity-50"
        style={{ animationDelay: "2s" }}
      >
        🏛️
      </div>
      <div
        aria-hidden
        className="history-float-icon left-[42%] top-[62%] hidden opacity-50 sm:block"
        style={{ animationDelay: "4s" }}
      >
        ⭐
      </div>

      <div className="relative z-10">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--history-border)] bg-[var(--history-glass)] px-4 py-2 text-sm font-semibold text-[var(--history-accent)] backdrop-blur-sm transition hover:border-[var(--history-accent)] hover:shadow-[0_0_16px_rgba(180,83,9,0.25)]"
        >
          ← All projects
        </Link>
      </div>

      <header className="relative z-10 max-w-3xl">
        <span className="inline-block rounded-full bg-[var(--history-accent-soft)] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[var(--history-accent)] ring-1 ring-[var(--history-border)]">
          Wikipedia
        </span>
        <h1 className="mt-4 text-5xl font-extrabold leading-tight sm:text-6xl md:text-7xl">
          <span className="history-title-glow">US History</span>
        </h1>
        <p className="mt-4 text-lg text-[var(--history-muted)]">
          Scroll through key moments in American history. Click any event to
          read its Wikipedia summary, or search to add your own milestones.
        </p>
      </header>

      <div className="relative z-10 w-full max-w-5xl">
        <HistoryTimelineClient curatedEvents={CURATED_US_EVENTS} />
      </div>
    </main>
  );
}
