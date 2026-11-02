import { Austin311DashboardClient } from "@/components/austin-311-dashboard-client";
import Link from "next/link";

export default function Austin311Page() {
  return (
    <main className="austin311-bg relative flex flex-1 flex-col gap-10 overflow-hidden px-4 py-8 sm:px-8 sm:py-12">
      <div
        aria-hidden
        className="austin311-float-icon left-[8%] top-[14%] opacity-40"
        style={{ animationDelay: "0s" }}
      >
        📞
      </div>
      <div
        aria-hidden
        className="austin311-float-icon right-[12%] top-[22%] opacity-40"
        style={{ animationDelay: "2.5s" }}
      >
        🚧
      </div>
      <div
        aria-hidden
        className="austin311-float-icon left-[38%] top-[58%] hidden opacity-35 sm:block"
        style={{ animationDelay: "4s" }}
      >
        🛣️
      </div>

      <div className="relative z-10">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--austin311-border)] bg-[var(--austin311-glass)] px-4 py-2 text-sm font-semibold text-[var(--austin311-accent)] backdrop-blur-sm transition hover:border-[var(--austin311-accent)] hover:shadow-[0_0_16px_rgba(13,148,136,0.25)]"
        >
          ← All projects
        </Link>
      </div>

      <header className="relative z-10 max-w-3xl">
        <span className="inline-block rounded-full bg-[var(--austin311-accent-soft)] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[var(--austin311-accent)] ring-1 ring-[var(--austin311-border)]">
          Austin Open Data
        </span>
        <h1 className="mt-4 text-5xl font-extrabold leading-tight sm:text-6xl md:text-7xl">
          <span className="austin311-title-glow">City Calls</span>
        </h1>
        <p className="mt-4 text-lg text-[var(--austin311-muted)]">
          311 service requests for Austin Transportation and Public Works — pulled
          live from{" "}
          <a
            href="https://data.austintexas.gov/Transportation-and-Mobility/311-Service-Requests-Austin-Transportation-and-Public-/38mr-dwji"
            className="font-semibold text-[var(--austin311-accent)] underline-offset-2 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            data.austintexas.gov
          </a>
          .
        </p>
      </header>

      <div className="relative z-10 max-w-6xl">
        <Austin311DashboardClient />
      </div>

      <footer className="relative z-10 max-w-3xl text-xs text-[var(--austin311-muted)]">
        Data courtesy City of Austin, Texas. Dates in the source dataset are
        reported in Central Time. Dataset updates about twice per day.
      </footer>
    </main>
  );
}
