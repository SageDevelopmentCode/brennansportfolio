"use client";

import { inputClassName } from "@/components/event-form-fields";
import { createClient } from "@/lib/supabase/client";
import type { Rsvp } from "@/lib/events";
import {
  countAttendees,
  countRsvps,
  formatSupabaseError,
  MAX_GUEST_COUNT,
} from "@/lib/events";
import { FormEvent, useState } from "react";

type EventRsvpProps = {
  eventId: string;
  rsvps: Rsvp[];
  canRsvp?: boolean;
  isHost?: boolean;
  onRsvpAdded: (rsvp: Rsvp) => void;
};

export function EventRsvp({
  eventId,
  rsvps,
  canRsvp = true,
  isHost = false,
  onRsvpAdded,
}: EventRsvpProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [guestCount, setGuestCount] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const person = name.trim();
    const trimmedAddress = address.trim();
    const parsedGuestCount = Number.parseInt(guestCount, 10);

    if (!person) {
      setError("Please enter your name.");
      return;
    }

    if (!trimmedAddress) {
      setError("Please enter your address.");
      return;
    }

    if (
      Number.isNaN(parsedGuestCount) ||
      parsedGuestCount < 0 ||
      parsedGuestCount > MAX_GUEST_COUNT
    ) {
      setError(
        `Please enter a valid number of additional guests (0–${MAX_GUEST_COUNT}).`,
      );
      return;
    }

    const duplicate = rsvps.some(
      (rsvp) => rsvp.person.trim().toLowerCase() === person.toLowerCase(),
    );
    if (duplicate) {
      setError("Someone with that name has already RSVP'd to this event.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("rsvps").insert({
      event_id: eventId,
      person,
      address: trimmedAddress,
      guest_count: parsedGuestCount,
    });

    if (insertError) {
      setLoading(false);
      setError(formatSupabaseError(insertError));
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("rsvp_public")
      .select("id, event_id, person, guest_count, created_at")
      .eq("event_id", eventId)
      .eq("person", person)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    setLoading(false);

    if (fetchError) {
      setError(formatSupabaseError(fetchError));
      return;
    }

    setName("");
    setAddress("");
    setGuestCount("0");
    onRsvpAdded(data);
  }

  const attendees = countAttendees(rsvps);
  const rsvpCount = countRsvps(rsvps);

  return (
    <div className="mt-4 rounded-xl border-2 border-accent-purple/15 bg-white/50 px-3 py-3">
      <p className="text-sm font-semibold text-foreground/80">
        {rsvpCount} {rsvpCount === 1 ? "RSVP" : "RSVPs"}
        {rsvpCount > 0 && <> · {attendees} attending</>}
      </p>

      {rsvpCount > 0 && (
        <ul className="mt-2 flex flex-col gap-2">
          {rsvps.map((rsvp) => (
            <li
              key={rsvp.id}
              className="rounded-xl bg-accent-purple/10 px-3 py-2"
            >
              <p className="text-xs font-medium text-accent-purple">
                {rsvp.person}
                {rsvp.guest_count > 0 && ` (+${rsvp.guest_count})`}
              </p>
              {isHost && rsvp.address && (
                <p className="mt-0.5 text-xs text-foreground/60">
                  {rsvp.address}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {canRsvp ? (
        <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-foreground/80">
            Your name
            <input
              id={`rsvp-name-${eventId}`}
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              className={inputClassName}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-foreground/80">
            Your address
            <input
              id={`rsvp-address-${eventId}`}
              type="text"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="123 Main St"
              className={inputClassName}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-foreground/80">
            Additional guests
            <input
              id={`rsvp-guests-${eventId}`}
              type="number"
              min={0}
              max={MAX_GUEST_COUNT}
              value={guestCount}
              onChange={(event) => setGuestCount(event.target.value)}
              className={inputClassName}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="min-h-11 rounded-full bg-gradient-to-r from-accent-coral to-accent-purple px-4 py-3 text-sm font-semibold text-white shadow-md shadow-accent-purple/20 transition hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? "Saving..." : "RSVP"}
          </button>
        </form>
      ) : (
        <p className="mt-3 text-sm text-foreground/60">
          You&apos;re hosting this event — neighbor RSVPs will appear here.
        </p>
      )}

      {canRsvp && error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
