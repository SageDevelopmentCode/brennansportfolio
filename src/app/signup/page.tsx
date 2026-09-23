import { SignUpForm } from "@/components/signup-form";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-8 overflow-hidden px-4 py-6 sm:py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 top-10 h-40 w-40 rounded-full bg-accent-coral/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 top-32 h-48 w-48 rounded-full bg-accent-purple/20 blur-3xl"
      />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-4xl">✨</span>
          <h1 className="font-display text-3xl font-bold text-foreground">Create an account</h1>
          <p className="text-sm text-foreground/60">
            Pick a username, email, and password to get started.
          </p>
        </div>

        <SignUpForm />

        <Link
          href="/"
          className="text-sm font-medium text-foreground/50 transition hover:text-accent-purple"
        >
          ← Back to events
        </Link>
      </div>
    </main>
  );
}
