import { RoadtripPlannerClient } from "@/components/roadtrip-planner-client";
import Link from "next/link";

export default function RoadtripPage() {
  return (
    <main className="roadtrip-bg relative flex flex-1 flex-col gap-10 overflow-hidden px-4 py-8 sm:px-8 sm:py-12">
      <div
        aria-hidden
        className="roadtrip-float-sign left-[6%] top-[18%] opacity-50"
        style={{ animationDelay: "0s" }}
      >
        🛣️
      </div>
      <div
        aria-hidden
        className="roadtrip-float-sign right-[10%] top-[28%] opacity-50"
        style={{ animationDelay: "2s" }}
      >
        ⛽
      </div>
      <div
        aria-hidden
        className="roadtrip-float-sign left-[42%] top-[62%] hidden opacity-50 sm:block"
        style={{ animationDelay: "4s" }}
      >
        🛒
      </div>

      <div className="relative z-10">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--roadtrip-border)] bg-[var(--roadtrip-glass)] px-4 py-2 text-sm font-semibold text-[var(--roadtrip-accent)] backdrop-blur-sm transition hover:border-[var(--roadtrip-accent)] hover:shadow-[0_0_16px_rgba(5,150,105,0.25)]"
        >
          ← All projects
        </Link>
      </div>

      <header className="relative z-10 max-w-3xl">
        <span className="inline-block rounded-full bg-[var(--roadtrip-accent-soft)] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[var(--roadtrip-accent)] ring-1 ring-[var(--roadtrip-border)]">
          OSRM · OpenStreetMap
        </span>
        <h1 className="mt-4 text-5xl font-extrabold leading-tight sm:text-6xl md:text-7xl">
          <span className="roadtrip-title-glow">Open Road</span>
        </h1>
        <p className="mt-4 text-lg text-[var(--roadtrip-muted)]">
          Enter where you&apos;re leaving from and where you&apos;re headed. See
          the driving route plus gas stations and grocery stores along the way.
        </p>
      </header>

      <div className="relative z-10 w-full max-w-6xl">
        <RoadtripPlannerClient />
      </div>
    </main>
  );
}
