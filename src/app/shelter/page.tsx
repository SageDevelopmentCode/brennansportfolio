import { ShelterAppClient } from "@/components/shelter-app-client";
import { getShelterPets } from "@/lib/shelter";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function ShelterPage() {
  const supabase = await createClient();
  let pets: Awaited<ReturnType<typeof getShelterPets>> = [];

  try {
    pets = await getShelterPets(supabase);
  } catch {
    pets = [];
  }

  return (
    <main className="shelter-bg relative flex flex-1 flex-col gap-8 px-4 py-8 touch-manipulation sm:px-8 sm:py-12">
      <div>
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--shelter-border)] bg-[var(--shelter-glass)] px-4 py-2 text-sm font-semibold text-[var(--shelter-accent)] transition hover:border-[var(--shelter-accent)]"
        >
          ← All projects
        </Link>
      </div>

      <header className="max-w-3xl">
        <span className="inline-block rounded-full bg-[var(--shelter-accent-soft)] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[var(--shelter-accent)] ring-1 ring-[var(--shelter-border)]">
          Jonathan&apos;s shelter sim
        </span>
        <h1 className="mt-4 text-5xl font-extrabold leading-tight sm:text-6xl">
          <span className="shelter-title-gradient">Paw Shelter</span>
        </h1>
        <p className="mt-4 text-lg text-[var(--shelter-muted)]">
          This shelter holds animals, people, or basically anything. Pick visitor
          or staff — visitors sign waivers or face game over; staff add listings
          and talk to Gary (he&apos;s suspicious).
        </p>
      </header>

      <ShelterAppClient initialPets={pets} />
    </main>
  );
}
