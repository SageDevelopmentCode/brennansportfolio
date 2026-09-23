"use client";

import { CreateEventDialog } from "@/components/create-event-dialog";
import { EventList } from "@/components/event-list";
import { OverlookStats } from "@/components/overlook-stats";
import { createClient } from "@/lib/supabase/client";
import type { Event, Rsvp } from "@/lib/events";
import {
  countAllRsvps,
  filterUpcomingEvents,
  formatEventDate,
  groupRsvpsByEventId,
  sortEventsByDateTime,
} from "@/lib/events";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type EventsSectionProps = {
  initialEvents: Event[];
  initialRsvps: Rsvp[];
  currentUsername: string | null;
  isLoggedIn: boolean;
};

function stripAddressUnlessHost(
  rsvp: Rsvp,
  event: Event | undefined,
  currentUsername: string | null,
): Rsvp {
  const isHost =
    currentUsername !== null && event?.created_by === currentUsername;

  if (isHost) {
    return rsvp;
  }

  const { address: _address, ...publicRsvp } = rsvp;
  return publicRsvp;
}

export function EventsSection({
  initialEvents,
  initialRsvps,
  currentUsername,
  isLoggedIn,
}: EventsSectionProps) {
  const [events, setEvents] = useState<Event[]>(() =>
    sortEventsByDateTime(initialEvents),
  );
  const [rsvpsByEventId, setRsvpsByEventId] = useState<Record<string, Rsvp[]>>(
    () => groupRsvpsByEventId(initialRsvps),
  );
  const eventsRef = useRef(events);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    const supabase = createClient();

    const eventsChannel = supabase
      .channel("overlook-events")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newEvent = payload.new as Event;
            setEvents((current) => {
              if (current.some((event) => event.id === newEvent.id)) {
                return current;
              }
              return sortEventsByDateTime([...current, newEvent]);
            });
          }

          if (payload.eventType === "UPDATE") {
            const updated = payload.new as Event;
            setEvents((current) =>
              sortEventsByDateTime(
                current.map((event) =>
                  event.id === updated.id ? updated : event,
                ),
              ),
            );
          }

          if (payload.eventType === "DELETE") {
            const deleted = payload.old as { id: string };
            setEvents((current) =>
              current.filter((event) => event.id !== deleted.id),
            );
            setRsvpsByEventId((current) => {
              const next = { ...current };
              delete next[deleted.id];
              return next;
            });
          }
        },
      )
      .subscribe();

    const rsvpsChannel = supabase
      .channel("overlook-rsvps")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rsvps" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newRsvp = payload.new as Rsvp;
            const event = eventsRef.current.find(
              (item) => item.id === newRsvp.event_id,
            );
            const sanitized = stripAddressUnlessHost(
              newRsvp,
              event,
              currentUsername,
            );
            setRsvpsByEventId((current) => {
              const existing = current[newRsvp.event_id] ?? [];
              if (existing.some((rsvp) => rsvp.id === newRsvp.id)) {
                return current;
              }
              return {
                ...current,
                [newRsvp.event_id]: [...existing, sanitized],
              };
            });
          }

          if (payload.eventType === "DELETE") {
            const deleted = payload.old as { id: string; event_id: string };
            setRsvpsByEventId((current) => ({
              ...current,
              [deleted.event_id]: (current[deleted.event_id] ?? []).filter(
                (rsvp) => rsvp.id !== deleted.id,
              ),
            }));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(rsvpsChannel);
    };
  }, [currentUsername]);

  function handleEventCreated(event: Event) {
    setEvents((current) => sortEventsByDateTime([...current, event]));
  }

  function handleEventUpdated(updated: Event) {
    setEvents((current) =>
      sortEventsByDateTime(
        current.map((event) => (event.id === updated.id ? updated : event)),
      ),
    );
  }

  function handleEventDeleted(id: string) {
    setEvents((current) => current.filter((event) => event.id !== id));
    setRsvpsByEventId((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function handleEventDeleteFailed(event: Event, rsvps: Rsvp[]) {
    setEvents((current) => sortEventsByDateTime([...current, event]));
    if (rsvps.length > 0) {
      setRsvpsByEventId((current) => ({
        ...current,
        [event.id]: rsvps,
      }));
    }
  }

  function handleRsvpAdded(rsvp: Rsvp) {
    const event = events.find((item) => item.id === rsvp.event_id);
    const sanitized = stripAddressUnlessHost(rsvp, event, currentUsername);
    setRsvpsByEventId((current) => ({
      ...current,
      [rsvp.event_id]: [...(current[rsvp.event_id] ?? []), sanitized],
    }));
  }

  const upcomingEvents = filterUpcomingEvents(events);
  const nextEvent = upcomingEvents[0]
    ? {
        name: upcomingEvents[0].name,
        date: formatEventDate(
          upcomingEvents[0].date,
          upcomingEvents[0].time,
        ),
      }
    : null;

  return (
    <>
      <OverlookStats
        eventCount={upcomingEvents.length}
        rsvpCount={countAllRsvps(rsvpsByEventId)}
        nextEvent={nextEvent}
      />

      <div className="relative z-10 flex w-full max-w-lg flex-col items-center gap-8">
        {isLoggedIn ? (
          <CreateEventDialog
            currentUsername={currentUsername}
            onEventCreated={handleEventCreated}
          />
        ) : (
          <Link
            href="/login?redirect=/overlook"
            className="rounded-full border-2 border-accent-purple/20 bg-white/80 px-6 py-3 text-base font-semibold text-foreground/70 shadow-sm transition hover:bg-accent-purple/5 hover:text-accent-purple"
          >
            Log in to create an event
          </Link>
        )}

        <section className="flex w-full flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Upcoming Events
            </h2>
            <span className="rounded-full bg-accent-purple/15 px-3 py-1 text-sm font-medium text-accent-purple">
              {upcomingEvents.length}{" "}
              {upcomingEvents.length === 1 ? "event" : "events"}
            </span>
          </div>
          <EventList
            events={upcomingEvents}
            rsvpsByEventId={rsvpsByEventId}
            currentUsername={currentUsername}
            isLoggedIn={isLoggedIn}
            onEventUpdated={handleEventUpdated}
            onEventDeleted={handleEventDeleted}
            onEventDeleteFailed={handleEventDeleteFailed}
            onRsvpAdded={handleRsvpAdded}
          />
        </section>
      </div>
    </>
  );
}
