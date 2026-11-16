import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

export function scriptureStyle(fontScale: number): CSSProperties {
  return {
    fontSize: `${fontScale * 1.5}rem`,
    lineHeight: 1.65,
    color: "var(--bible-scripture)",
  };
}

export function BibleMain({ children }: { children: ReactNode }) {
  return (
    <main className="bible-bg relative flex flex-1 flex-col gap-8 px-4 py-8 touch-manipulation sm:px-8 sm:py-12">
      {children}
    </main>
  );
}

export function BibleBackLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--bible-border)] bg-[var(--bible-glass)] px-4 py-2 font-sans text-sm font-semibold text-[var(--bible-accent)] transition hover:border-[var(--bible-accent)]"
    >
      {children}
    </Link>
  );
}

export function BibleKicker({ children }: { children: string }) {
  return (
    <span className="inline-block rounded-full bg-[var(--bible-accent-soft)] px-3 py-1 font-sans text-xs font-bold uppercase tracking-widest text-[var(--bible-accent)] ring-1 ring-[var(--bible-border)]">
      {children}
    </span>
  );
}

export function BibleCopyright({ notice }: { notice: string }) {
  const text = notice.trim();
  if (!text) {
    return (
      <p className="font-sans text-xs leading-relaxed text-[var(--bible-muted)]">
        This translation did not include a copyright line.
      </p>
    );
  }

  return (
    <p className="font-sans text-xs leading-relaxed whitespace-pre-line text-[var(--bible-muted)]">
      {text}
    </p>
  );
}

export function BibleAlert({ children }: { children: string }) {
  return (
    <p
      role="alert"
      className="rounded-2xl border border-[var(--bible-border)] bg-[var(--bible-glass)] px-4 py-3 font-sans text-sm text-[var(--bible-ink)]"
    >
      {children}
    </p>
  );
}
