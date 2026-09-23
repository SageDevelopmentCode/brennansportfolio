"use client";

import { PasswordInput } from "@/components/password-input";
import {
  EMAIL_VALIDATION_MESSAGE,
  isValidEmail,
  isValidUsername,
  signUpWithUsername,
  USERNAME_VALIDATION_MESSAGE,
} from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function SignUpForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!isValidUsername(username)) {
      setError(USERNAME_VALIDATION_MESSAGE);
      return;
    }

    if (!isValidEmail(email)) {
      setError(EMAIL_VALIDATION_MESSAGE);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: signUpError } = await signUpWithUsername(
      supabase,
      username,
      email,
      password,
    );
    setLoading(false);

    if (signUpError) {
      setError(signUpError);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="signup-username" className="text-sm font-semibold text-foreground/80">
          Username
        </label>
        <input
          id="signup-username"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="rounded-xl border-2 border-accent-purple/20 bg-white px-4 py-2.5 text-base text-foreground outline-none transition focus:border-accent-purple/50"
          placeholder="your_username"
        />
        <p className="text-xs text-foreground/50">
          Use 3–20 characters: letters, numbers, <code>_</code>, or <code>.</code>
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="signup-email" className="text-sm font-semibold text-foreground/80">
          Email
        </label>
        <input
          id="signup-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="rounded-xl border-2 border-accent-purple/20 bg-white px-4 py-2.5 text-base text-foreground outline-none transition focus:border-accent-purple/50"
          placeholder="you@example.com"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="signup-password" className="text-sm font-semibold text-foreground/80">
          Password
        </label>
        <PasswordInput
          id="signup-password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="signup-confirm-password"
          className="text-sm font-semibold text-foreground/80"
        >
          Confirm password
        </label>
        <PasswordInput
          id="signup-confirm-password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="••••••••"
        />
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="min-h-11 rounded-full bg-gradient-to-r from-accent-coral to-accent-purple px-5 py-3 text-sm font-semibold text-white shadow-md shadow-accent-purple/25 transition hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
      >
        {loading ? "Creating account..." : "Create account"}
      </button>

      <p className="text-center text-sm text-foreground/60">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-accent-purple hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
