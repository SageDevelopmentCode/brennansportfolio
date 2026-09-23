export type Event = {
  id: string;
  name: string;
  location: string | null;
  description: string | null;
  date: string;
  time: string;
  host: string | null;
  foods: string | null;
  theme: string | null;
  created_by: string | null;
  created_by_user_id?: string | null;
};

export type Rsvp = {
  id: string;
  event_id: string;
  person: string;
  guest_count: number;
  created_at: string;
  address?: string;
};

export const MAX_GUEST_COUNT = 20;

export function sortEventsByDateTime(events: Event[]): Event[] {
  return [...events].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.time.localeCompare(b.time);
  });
}

export function getEventDateTime(event: Event): Date {
  const [year, month, day] = event.date.split("-").map(Number);
  const timePart = event.time.slice(0, 5);
  const [hours, minutes] = timePart.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}

export function isUpcomingEvent(event: Event, now = new Date()): boolean {
  return getEventDateTime(event) >= now;
}

export function filterUpcomingEvents(events: Event[], now = new Date()): Event[] {
  return sortEventsByDateTime(events).filter((event) => isUpcomingEvent(event, now));
}

export function countRsvps(rsvps: Rsvp[]): number {
  return rsvps.length;
}

export function countAttendees(rsvps: Rsvp[]): number {
  return rsvps.reduce((total, rsvp) => total + 1 + rsvp.guest_count, 0);
}

export function countAllRsvps(
  rsvpsByEventId: Record<string, Rsvp[]>,
): number {
  return Object.values(rsvpsByEventId).reduce(
    (total, rsvps) => total + countRsvps(rsvps),
    0,
  );
}

export function formatEventDate(date: string, time: string): string {
  const eventDate = getEventDateTime({ date, time } as Event);
  return eventDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatEventDateTime(date: string, time: string): string {
  const eventDate = getEventDateTime({ date, time } as Event);
  return eventDate.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatEventTime(time: string): string {
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function isEventInPast(date: string, time: string, now = new Date()): boolean {
  return getEventDateTime({ date, time } as Event) < now;
}

export function validateEventDateTime(date: string, time: string): string | null {
  if (!date || !time) {
    return "Date and time are required.";
  }

  if (isEventInPast(date, time)) {
    return "Please choose a date and time in the future.";
  }

  return null;
}

export function groupRsvpsByEventId(rsvps: Rsvp[]): Record<string, Rsvp[]> {
  return rsvps.reduce<Record<string, Rsvp[]>>((groups, rsvp) => {
    const existing = groups[rsvp.event_id] ?? [];
    return { ...groups, [rsvp.event_id]: [...existing, rsvp] };
  }, {});
}

export function formatSupabaseError(error: { message: string; code?: string }): string {
  const message = error.message.toLowerCase();
  const code = error.code ?? "";

  if (code === "23505" || message.includes("duplicate key")) {
    return "Someone with that name has already RSVP'd to this event.";
  }

  if (
    message.includes("row-level security") ||
    message.includes("permission denied") ||
    message.includes("violates row-level security")
  ) {
    return "You don't have permission to RSVP to this event.";
  }

  if (message.includes("guest_count") && message.includes("check")) {
    return `Additional guests must be between 0 and ${MAX_GUEST_COUNT}.`;
  }

  if (message.includes("network") || message.includes("fetch")) {
    return "Network error. Please check your connection and try again.";
  }

  return error.message;
}
