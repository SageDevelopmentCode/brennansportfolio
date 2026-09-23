import { EventsSection } from "@/components/events-section";
import { getCurrentUsername } from "@/lib/auth";
import type { Rsvp } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

type PublicRsvp = {
  id: string;
  event_id: string;
  person: string;
  guest_count: number;
  created_at: string;
};

export default async function OverlookPage() {
  const supabase = await createClient();
  const [
    { data: events, error: eventsError },
    { data: publicRsvps, error: rsvpsError },
    currentUsername,
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase
      .from("events")
      .select(
        "id, name, theme, location, description, date, time, host, foods, created_by, created_by_user_id",
      )
      .order("date", { ascending: true })
      .order("time", { ascending: true }),
    supabase
      .from("rsvp_public")
      .select("id, event_id, person, guest_count, created_at")
      .order("created_at", { ascending: true }),
    getCurrentUsername(supabase),
    supabase.auth.getUser(),
  ]);

  const loadError = eventsError?.message ?? rsvpsError?.message ?? null;
  const eventList = events ?? [];
  const isLoggedIn = user !== null;

  let rsvpList: Rsvp[] = (publicRsvps as PublicRsvp[] | null) ?? [];

  if (currentUsername) {
    const hostedEventIds = eventList
      .filter((event) => event.created_by === currentUsername)
      .map((event) => event.id);

    if (hostedEventIds.length > 0) {
      const { data: hostRsvps } = await supabase
        .from("rsvps")
        .select("id, address")
        .in("event_id", hostedEventIds);

      const addressById = new Map(
        (hostRsvps ?? []).map((rsvp) => [rsvp.id, rsvp.address]),
      );

      rsvpList = rsvpList.map((rsvp) => ({
        ...rsvp,
        address: addressById.get(rsvp.id),
      }));
    }
  }

  return (
    <main className="relative flex flex-1 flex-col items-center gap-8 overflow-hidden px-4 py-6 sm:py-10">
      <Link
        href="/"
        className="relative z-10 self-start text-sm font-medium text-foreground/60 transition hover:text-accent-purple"
      >
        ← All projects
      </Link>

      <header className="relative z-10 flex flex-col items-center gap-4 text-center">
        <span className="inline-block rounded-full bg-accent-purple/15 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-accent-purple">
          Neighborhood HQ
        </span>
        <span className="animate-float inline-block text-5xl sm:text-6xl">🎉</span>
        <h1 className="font-display text-5xl font-bold tracking-tight text-foreground sm:text-6xl md:text-7xl">
          <span className="bg-gradient-to-r from-accent-coral via-accent-purple to-accent-mint bg-clip-text text-transparent animate-shimmer">
            Overlook Events
          </span>
        </h1>
        <p className="max-w-md text-lg text-foreground/70">
          What&apos;s happening in the neighborhood? Plan something epic!
        </p>
      </header>

      {loadError ? (
        <div
          className="relative z-10 w-full max-w-lg rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-4 text-center"
          role="alert"
        >
          <p className="font-semibold text-red-700">Could not load events</p>
          <p className="mt-1 text-sm text-red-600">{loadError}</p>
        </div>
      ) : (
        <EventsSection
          initialEvents={eventList}
          initialRsvps={rsvpList}
          currentUsername={currentUsername}
          isLoggedIn={isLoggedIn}
        />
      )}
    </main>
  );
}
