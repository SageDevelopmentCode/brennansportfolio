"use client";

import { EditEventDialog } from "@/components/edit-event-dialog";
import { EventRsvp } from "@/components/event-rsvp";
import { createClient } from "@/lib/supabase/client";
import type { Event, Rsvp } from "@/lib/events";
import {
  formatEventDateTime,
  formatEventTime,
  formatSupabaseError,
} from "@/lib/events";
import Link from "next/link";
import { useRef, useState } from "react";

type EventListProps = {
  events: Event[];
  rsvpsByEventId: Record<string, Rsvp[]>;
  currentUsername: string | null;
  isLoggedIn: boolean;
  onEventUpdated?: (event: Event) => void;
  onEventDeleted?: (id: string) => void;
  onEventDeleteFailed?: (event: Event, rsvps: Rsvp[]) => void;
  onRsvpAdded?: (rsvp: Rsvp) => void;
};

const cardAccents = [
  "from-accent-coral/20 to-accent-sun/10 border-accent-coral/40",
  "from-accent-purple/20 to-accent-coral/10 border-accent-purple/40",
  "from-accent-mint/20 to-accent-purple/10 border-accent-mint/50",
  "from-accent-sun/25 to-accent-mint/10 border-accent-sun/50",
];

export function EventList({
  events,
  rsvpsByEventId,
  currentUsername,
  isLoggedIn,
  onEventUpdated,
  onEventDeleted,
  onEventDeleteFailed,
  onRsvpAdded,
}: EventListProps) {
  const confirmDialogRef = useRef<HTMLDialogElement>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});
  const [pendingDelete, setPendingDelete] = useState<Event | null>(null);

  function openDeleteConfirm(event: Event) {
    setPendingDelete(event);
    confirmDialogRef.current?.showModal();
  }

  function closeDeleteConfirm() {
    confirmDialogRef.current?.close();
    setPendingDelete(null);
  }

  function handleConfirmBackdropClick(
    mouseEvent: React.MouseEvent<HTMLDialogElement>,
  ) {
    const dialog = confirmDialogRef.current;
    if (dialog && mouseEvent.target === dialog) {
      closeDeleteConfirm();
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) {
      return;
    }

    const event = pendingDelete;
    const savedRsvps = rsvpsByEventId[event.id] ?? [];
    closeDeleteConfirm();

    setDeleteErrors((current) => {
      const next = { ...current };
      delete next[event.id];
      return next;
    });
    setDeletingId(event.id);

    onEventDeleted?.(event.id);

    const supabase = createClient();
    const { error } = await supabase.from("events").delete().eq("id", event.id);

    setDeletingId(null);

    if (error) {
      onEventDeleteFailed?.(event, savedRsvps);
      setDeleteErrors((current) => ({
        ...current,
        [event.id]: formatSupabaseError(error),
      }));
    }
  }

  if (events.length === 0) {
    return (
      <div className="animate-pop-in flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-accent-purple/30 bg-white/60 px-6 py-10 text-center backdrop-blur-sm">
        <span className="text-4xl" aria-hidden>✨</span>
        <p className="font-display text-lg font-medium text-foreground">
          No upcoming events!
        </p>
        <p className="text-sm text-foreground/60">
          {isLoggedIn
            ? "Be the first to plan something awesome for the neighborhood."
            : "Log in to create the first event for the neighborhood."}
        </p>
        {!isLoggedIn && (
          <Link
            href="/login?redirect=/overlook"
            className="mt-2 rounded-full bg-accent-purple/15 px-4 py-2 text-sm font-semibold text-accent-purple transition hover:bg-accent-purple/25"
          >
            Log in
          </Link>
        )}
      </div>
    );
  }

  return (
    <>
      <ul className="flex w-full flex-col gap-4">
        {events.map((event, index) => {
          const canManage =
            currentUsername !== null && event.created_by === currentUsername;
          const isHost = canManage;

          return (
            <li
              key={event.id}
              className={`animate-pop-in rounded-2xl border-2 bg-gradient-to-br p-4 shadow-md shadow-accent-purple/10 transition-transform sm:p-5 sm:hover:-translate-y-1 sm:hover:shadow-lg sm:hover:shadow-accent-purple/15 ${cardAccents[index % cardAccents.length]}`}
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="flex items-start gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 text-xl shadow-sm"
                  aria-hidden
                >
                  🎊
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="min-w-0 flex-1 break-words font-display text-xl font-semibold leading-tight text-foreground">
                      {event.name}
                    </h3>
                    {canManage && (
                      <div className="flex shrink-0 items-center gap-2">
                        <EditEventDialog
                          event={event}
                          onEventUpdated={onEventUpdated}
                        />
                        <button
                          type="button"
                          onClick={() => openDeleteConfirm(event)}
                          disabled={deletingId === event.id}
                          aria-busy={deletingId === event.id}
                          className="min-h-11 rounded-full border-2 border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          {deletingId === event.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    )}
                  </div>
                  {deleteErrors[event.id] && (
                    <p
                      className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600"
                      role="alert"
                    >
                      {deleteErrors[event.id]}
                    </p>
                  )}
                  {event.theme && (
                    <p className="mt-1 text-sm font-medium text-accent-purple">
                      Theme: {event.theme}
                    </p>
                  )}
                  <p className="mt-2 flex items-center gap-2 text-sm font-medium text-foreground/75">
                    <span aria-hidden>📅</span>
                    {formatEventDateTime(event.date, event.time)} ·{" "}
                    {formatEventTime(event.time)}
                  </p>
                  {event.location && (
                    <p className="mt-2 flex items-center gap-2 text-sm text-foreground/70">
                      <span aria-hidden>📍</span>
                      {event.location}
                    </p>
                  )}
                  {event.host && (
                    <p className="mt-1 flex items-center gap-2 text-sm text-foreground/65">
                      <span aria-hidden>🙋</span>
                      Hosted by {event.host}
                    </p>
                  )}
                  {event.created_by && (
                    <p className="mt-1 flex items-center gap-2 text-sm text-foreground/65">
                      <span aria-hidden>✍️</span>
                      Created by @{event.created_by}
                    </p>
                  )}
                  {event.foods && (
                    <p className="mt-1 flex items-center gap-2 text-sm text-foreground/70">
                      <span aria-hidden>🍕</span>
                      Foods: {event.foods}
                    </p>
                  )}
                  {event.description && (
                    <p className="mt-3 whitespace-pre-wrap rounded-xl bg-white/50 px-3 py-2 text-sm leading-relaxed text-foreground/80">
                      {event.description}
                    </p>
                  )}
                  <EventRsvp
                    eventId={event.id}
                    rsvps={rsvpsByEventId[event.id] ?? []}
                    canRsvp={!canManage}
                    isHost={isHost}
                    isLoggedIn={isLoggedIn}
                    onRsvpAdded={(rsvp) => onRsvpAdded?.(rsvp)}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <dialog
        ref={confirmDialogRef}
        onClick={handleConfirmBackdropClick}
        aria-labelledby="delete-event-title"
        aria-describedby="delete-event-description"
        className="event-dialog rounded-3xl border-2 border-red-200 bg-white p-0 shadow-2xl shadow-red-100"
      >
        <div className="flex flex-col gap-4 p-6">
          <div>
            <p className="text-2xl" aria-hidden>🗑️</p>
            <h2
              id="delete-event-title"
              className="font-display text-xl font-bold text-foreground"
            >
              Delete &quot;{pendingDelete?.name}&quot;?
            </h2>
            <p
              id="delete-event-description"
              className="mt-2 text-sm text-foreground/70"
            >
              This will permanently remove the event and all RSVPs. This cannot
              be undone.
            </p>
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeDeleteConfirm}
              className="min-h-11 rounded-full border-2 border-accent-purple/20 px-5 py-3 text-sm font-semibold text-foreground/70 transition hover:bg-accent-purple/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="min-h-11 rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Delete Event
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
