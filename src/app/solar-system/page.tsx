import { SolarSystemClient } from "@/components/solar-system-client";
import Link from "next/link";

export default function SolarSystemPage() {
  return (
    <main className="solarsystem-bg relative flex flex-1 flex-col gap-8 px-4 py-8 sm:px-8 sm:py-12">
      <div>
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--ss-border)] bg-[var(--ss-glass)] px-4 py-2 text-sm font-semibold text-[var(--ss-accent)] transition hover:border-[var(--ss-accent)] hover:shadow-[0_0_16px_rgba(251,191,36,0.25)]"
        >
          ← All projects
        </Link>
      </div>

      <header className="max-w-3xl">
        <span className="inline-block rounded-full bg-[var(--ss-accent-soft)] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[var(--ss-accent)] ring-1 ring-[var(--ss-border)]">
          NASA
        </span>
        <h1 className="mt-4 text-5xl font-extrabold leading-tight sm:text-6xl">
          <span className="solarsystem-title-gradient">Solar System Explorer</span>
        </h1>
        <p className="mt-4 text-lg text-[var(--ss-muted)]">
          Live NASA feeds show today&apos;s astronomy picture and upcoming
          asteroid flybys. Drag to orbit the view, click the Sun or any planet,
          or pick a name below — sizes and distances are stylized; numbers come
          from NASA&apos;s planetary fact sheets.
        </p>
      </header>

      <SolarSystemClient />
    </main>
  );
}
