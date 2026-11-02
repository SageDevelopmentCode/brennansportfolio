import { SignTranslatorClient } from "@/components/sign-translator-client";
import Link from "next/link";

export default function SignPage() {
  return (
    <main className="sign-bg relative flex flex-1 flex-col gap-8 px-4 py-8 touch-manipulation sm:px-8 sm:py-12">
      <div>
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--sign-border)] bg-[var(--sign-glass)] px-4 py-2 text-sm font-semibold text-[var(--sign-accent)] transition hover:border-[var(--sign-accent)] hover:shadow-[0_0_16px_rgba(56,189,248,0.25)]"
        >
          ← All projects
        </Link>
      </div>

      <header className="max-w-3xl">
        <span className="inline-block rounded-full bg-[var(--sign-accent-soft)] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[var(--sign-accent)] ring-1 ring-[var(--sign-border)]">
          Type to sign
        </span>
        <h1 className="mt-4 text-5xl font-extrabold leading-tight sm:text-6xl">
          <span className="sign-title-gradient">Sign Bridge</span>
        </h1>
        <p className="mt-4 text-lg text-[var(--sign-muted)]">
          Choose sign language to watch a 3D hand, or text to audio to hear what you
          type — gloss practice, not certified interpretation.
        </p>
      </header>

      <div className="w-full max-w-4xl">
        <SignTranslatorClient />
      </div>
    </main>
  );
}
