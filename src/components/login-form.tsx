"use client";

import { PasswordInput } from "@/components/password-input";
import {
  isValidEmail,
  isValidUsername,
  signInWithUsername,
  USERNAME_VALIDATION_MESSAGE,
} from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type LoginFormProps = {
  redirectTo?: string;
};

export function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      setError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Password is required.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: signInError } = await signInWithUsername(
      supabase,
      username,
      email,
      password,
    );
    setLoading(false);

    if (signInError) {
      setError(signInError);
      return;
    }

    const destination =
      redirectTo && redirectTo.startsWith("/") ? redirectTo : "/";
    router.push(destination);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="login-username" className="text-sm font-semibold text-foreground/80">
          Username
        </label>
        <input
          id="login-username"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="rounded-xl border-2 border-accent-purple/20 bg-white px-4 py-2.5 text-base text-foreground outline-none transition focus:border-accent-purple/50"
          placeholder="your_username"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="login-email" className="text-sm font-semibold text-foreground/80">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="rounded-xl border-2 border-accent-purple/20 bg-white px-4 py-2.5 text-base text-foreground outline-none transition focus:border-accent-purple/50"
          placeholder="you@example.com"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="login-password" className="text-sm font-semibold text-foreground/80">
          Password
        </label>
        <PasswordInput
          id="login-password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
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
        {loading ? "Logging in..." : "Log in"}
      </button>

      <p className="text-center text-sm text-foreground/60">
        Need an account?{" "}
        <Link href="/signup" className="font-semibold text-accent-purple hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}
