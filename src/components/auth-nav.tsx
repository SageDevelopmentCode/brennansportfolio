import { AuthLogoutButton } from "@/components/auth-logout-button";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export async function AuthNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <nav className="flex flex-wrap items-center justify-end gap-2">
        <Link
          href="/"
          className="rounded-full border-2 border-accent-purple/20 px-4 py-1.5 text-sm font-semibold text-foreground/70 transition hover:bg-accent-purple/5"
        >
          Home
        </Link>
        <Link
          href="/login"
          className="rounded-full border-2 border-accent-purple/20 px-4 py-1.5 text-sm font-semibold text-foreground/70 transition hover:bg-accent-purple/5"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="rounded-full bg-gradient-to-r from-accent-coral to-accent-purple px-4 py-1.5 text-sm font-semibold text-white shadow-md shadow-accent-purple/25 transition hover:scale-105"
        >
          Sign up
        </Link>
      </nav>
    );
  }

  const { data: profile } = await supabase
    .from("users")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <nav className="flex flex-wrap items-center justify-end gap-2">
      <Link
        href="/"
        className="rounded-full border-2 border-accent-purple/20 px-4 py-1.5 text-sm font-semibold text-foreground/70 transition hover:bg-accent-purple/5"
      >
        Home
      </Link>
      <span className="max-w-[10rem] truncate rounded-full bg-accent-purple/15 px-3 py-1 text-sm font-medium text-accent-purple sm:max-w-none">
        @{profile?.username ?? "user"}
      </span>
      <AuthLogoutButton />
    </nav>
  );
}
