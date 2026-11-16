import { DealershipClient } from "@/components/dealership-client";
import Link from "next/link";

export default function DealershipPage() {
  return (
    <main className="dealership-bg relative flex flex-1 flex-col gap-8 px-4 py-8 sm:px-8 sm:py-12">
      <div>
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--lot-border)] bg-[var(--lot-glass)] px-4 py-2 text-sm font-semibold text-[var(--lot-accent)] transition hover:border-[var(--lot-accent)]"
        >
          ← All projects
        </Link>
      </div>

      <header className="max-w-3xl">
        <span className="inline-block rounded-full bg-[var(--lot-accent-soft)] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[var(--lot-accent)] ring-1 ring-[var(--lot-border)]">
          Brennan&apos;s lot
        </span>
        <h1 className="mt-4 text-5xl font-extrabold leading-tight sm:text-6xl">
          <span className="dealership-title">Rush Motors</span>
        </h1>
        <p className="mt-4 text-lg text-[var(--lot-muted)]">
          Every Hill Rush car is already on the lot, drawn the same way as in the garage.
          Record buyer details when you sell, track customers in your CRM, and browse the sales log anytime.
        </p>
      </header>

      <DealershipClient />
    </main>
  );
}
