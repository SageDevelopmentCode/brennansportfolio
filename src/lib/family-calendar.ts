import type { SupabaseClient } from "@supabase/supabase-js";

export const GRID_START_HOUR = 6;
export const GRID_END_HOUR = 22;
export const HOUR_HEIGHT_PX = 56;

export const MEMBER_COLOR_PRESETS = [
  "#f43f5e",
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#06b6d4",
  "#f97316",
  "#6366f1",
] as const;

export const FAMILY_ROSTER_SIZE = 6;

export const DEFAULT_MEMBERS = [
  { name: "Person 1", color: MEMBER_COLOR_PRESETS[0] },
  { name: "Person 2", color: MEMBER_COLOR_PRESETS[1] },
  { name: "Person 3", color: MEMBER_COLOR_PRESETS[2] },
  { name: "Person 4", color: MEMBER_COLOR_PRESETS[3] },
  { name: "Person 5", color: MEMBER_COLOR_PRESETS[4] },
  { name: "Person 6", color: MEMBER_COLOR_PRESETS[5] },
] as const;

/** Soft wash behind each day column (Sun → Sat). */
export const DAY_COLUMN_TINTS = [
  "rgba(251, 113, 133, 0.42)",
  "rgba(96, 165, 250, 0.45)",
  "rgba(52, 211, 153, 0.42)",
  "rgba(192, 132, 252, 0.45)",
  "rgba(251, 146, 60, 0.45)",
  "rgba(250, 204, 21, 0.48)",
  "rgba(244, 114, 182, 0.48)",
] as const;

/** Sunday → Saturday header flair. */
export const DAY_VIBE_EMOJI = ["☀️", "💥", "⚡", "🌈", "🔥", "🎉", "🛋️"] as const;

export const MEMBER_FLAIR_EMOJI = [
  "💖",
  "🦸",
  "🌟",
  "🎨",
  "🏆",
  "🎸",
  "🦄",
  "🚀",
] as const;

export function weekHypeMessage(eventCount: number): string {
  if (eventCount === 0) {
    return "Blank week = infinite possibilities. Tap a slot and make something happen!";
  }
  if (eventCount === 1) {
    return "One plan down — the week is officially getting interesting.";
  }
  if (eventCount < 4) {
    return `${eventCount} things on the board. The squad is on the move!`;
  }
  if (eventCount < 8) {
    return `${eventCount} events?! This week is STACKED. Buckle up!`;
  }
  return `${eventCount} events — your family calendar is a full-on adventure map! 🗺️`;
}

export type FamilyCalendarMember = {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
};

export type FamilyCalendarEvent = {
  id: string;
  memberIds: string[];
  title: string;
  startsAt: string;
  endsAt: string;
  notes: string | null;
};

export type WeekRange = {
  weekStart: Date;
  weekEnd: Date;
  days: Date[];
};

export type EventBlockLayout = {
  topPx: number;
  heightPx: number;
};

type MemberRow = {
  id: string;
  name: string;
  color: string;
  sort_order: number;
};

type EventAssignmentRow = {
  member_id: string;
};

type EventRow = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  notes: string | null;
  family_calendar_event_members: EventAssignmentRow[] | null;
};

function toMember(row: MemberRow): FamilyCalendarMember {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    sortOrder: row.sort_order,
  };
}

function toEvent(row: EventRow): FamilyCalendarEvent {
  const memberIds = (row.family_calendar_event_members ?? []).map(
    (assignment) => assignment.member_id,
  );
  return {
    id: row.id,
    memberIds,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    notes: row.notes,
  };
}

export function allMemberIds(members: FamilyCalendarMember[]): string[] {
  return members.map((member) => member.id);
}

export function orderMemberIds(
  memberIds: string[],
  members: FamilyCalendarMember[],
): string[] {
  const order = new Map(members.map((member) => [member.id, member.sortOrder]));
  return [...memberIds].sort(
    (a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99),
  );
}

export function isAllMembersSelected(
  memberIds: string[],
  members: FamilyCalendarMember[],
): boolean {
  if (members.length === 0 || memberIds.length === 0) return false;
  const selected = new Set(memberIds);
  return (
    memberIds.length === members.length &&
    members.every((member) => selected.has(member.id))
  );
}

export function eventAttendeeLabel(
  memberIds: string[],
  members: FamilyCalendarMember[],
): string {
  if (isAllMembersSelected(memberIds, members)) return "All";
  const ordered = orderMemberIds(memberIds, members);
  const names = ordered
    .map((id) => members.find((member) => member.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  if (names.length <= 2) return names.join(", ");
  return `${names[0]}, ${names[1]} +${names.length - 2}`;
}

export function eventBlockGradient(
  memberIds: string[],
  members: FamilyCalendarMember[],
): string {
  const ordered = orderMemberIds(memberIds, members);
  const colors = ordered
    .map((id) => members.find((member) => member.id === id)?.color)
    .filter((color): color is string => Boolean(color));

  if (colors.length === 0) {
    return "linear-gradient(145deg, #64748b, #475569)";
  }
  if (colors.length === 1) {
    const color = colors[0];
    return `linear-gradient(145deg, ${color} 0%, color-mix(in srgb, ${color} 72%, #1c1917) 100%)`;
  }

  const stops = colors
    .map((color, index) => {
      const pct = (index / (colors.length - 1)) * 100;
      return `${color} ${pct}%`;
    })
    .join(", ");
  return `linear-gradient(145deg, ${stops})`;
}

export async function syncEventMemberAssignments(
  supabase: SupabaseClient,
  eventId: string,
  memberIds: string[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("family_calendar_event_members")
    .delete()
    .eq("event_id", eventId);

  if (deleteError) throw deleteError;

  if (memberIds.length === 0) return;

  const { error: insertError } = await supabase
    .from("family_calendar_event_members")
    .insert(
      memberIds.map((memberId) => ({
        event_id: eventId,
        member_id: memberId,
      })),
    );

  if (insertError) throw insertError;
}

const EVENT_SELECT =
  "id, title, starts_at, ends_at, notes, family_calendar_event_members(member_id)";

export async function fetchFamilyCalendarEventById(
  supabase: SupabaseClient,
  eventId: string,
): Promise<FamilyCalendarEvent | null> {
  const { data, error } = await supabase
    .from("family_calendar_events")
    .select(EVENT_SELECT)
    .eq("id", eventId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return toEvent(data as EventRow);
}

/** Sunday-start week containing `anchor` (local time). */
export function getWeekRange(anchor: Date): WeekRange {
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  const dayOfWeek = start.getDay();
  start.setDate(start.getDate() - dayOfWeek);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }

  const weekEnd = new Date(start);
  weekEnd.setDate(weekEnd.getDate() + 7);

  return { weekStart: start, weekEnd, days };
}

export function addWeeks(anchor: Date, delta: number): Date {
  const next = new Date(anchor);
  next.setDate(next.getDate() + delta * 7);
  return next;
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatHourLabel(hour: number): string {
  const normalized = hour % 24;
  if (normalized === 0) return "12 AM";
  if (normalized < 12) return `${normalized} AM`;
  if (normalized === 12) return "12 PM";
  return `${normalized - 12} PM`;
}

export function formatDayHeader(date: Date): { weekday: string; dayNum: string } {
  return {
    weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
    dayNum: String(date.getDate()),
  };
}

export function formatWeekLabel(range: WeekRange): string {
  const start = range.days[0];
  const end = range.days[6];
  const sameMonth = start.getMonth() === end.getMonth();
  const startStr = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endStr = end.toLocaleDateString("en-US", {
    month: sameMonth ? undefined : "short",
    day: "numeric",
    year: start.getFullYear() === end.getFullYear() ? undefined : "numeric",
  });
  const year =
    start.getFullYear() === end.getFullYear()
      ? start.getFullYear()
      : `${start.getFullYear()}–${end.getFullYear()}`;
  return `${startStr} – ${endStr}, ${year}`;
}

export function formatTimeRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  };
  return `${start.toLocaleTimeString("en-US", opts)} – ${end.toLocaleTimeString("en-US", opts)}`;
}

export function layoutEventBlock(
  startsAt: Date,
  endsAt: Date,
): EventBlockLayout {
  const gridStartMinutes = GRID_START_HOUR * 60;
  const gridEndMinutes = GRID_END_HOUR * 60;

  const startMinutes = startsAt.getHours() * 60 + startsAt.getMinutes();
  const endMinutes = endsAt.getHours() * 60 + endsAt.getMinutes();

  const clampedStart = Math.max(startMinutes, gridStartMinutes);
  const clampedEnd = Math.min(endMinutes, gridEndMinutes);

  const topPx = ((clampedStart - gridStartMinutes) / 60) * HOUR_HEIGHT_PX;
  const heightPx = Math.max(
    ((clampedEnd - clampedStart) / 60) * HOUR_HEIGHT_PX,
    20,
  );

  return { topPx, heightPx };
}

export function eventOccursOnDay(event: FamilyCalendarEvent, day: Date): boolean {
  const start = new Date(event.startsAt);
  return isSameLocalDay(start, day);
}

export type EventValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export function validateEventInput(
  title: string,
  dateStr: string,
  startTime: string,
  endTime: string,
): EventValidationResult {
  const trimmed = title.trim();
  if (!trimmed) {
    return { ok: false, message: "Title is required." };
  }
  if (!dateStr || !startTime || !endTime) {
    return { ok: false, message: "Date and times are required." };
  }

  const startsAt = parseLocalDateTime(dateStr, startTime);
  const endsAt = parseLocalDateTime(dateStr, endTime);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return { ok: false, message: "Invalid date or time." };
  }
  if (endsAt <= startsAt) {
    return { ok: false, message: "End time must be after start time." };
  }
  return { ok: true };
}

export function parseLocalDateTime(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.slice(0, 5).split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

export function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function toTimeInputValue(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export async function getFamilyCalendarMembers(
  supabase: SupabaseClient,
): Promise<FamilyCalendarMember[]> {
  const { data, error } = await supabase
    .from("family_calendar_members")
    .select("id, name, color, sort_order")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(toMember);
}

async function insertDefaultRoster(
  supabase: SupabaseClient,
  userId: string,
): Promise<FamilyCalendarMember[]> {
  const { data, error } = await supabase
    .from("family_calendar_members")
    .insert(
      DEFAULT_MEMBERS.map((member, index) => ({
        user_id: userId,
        name: member.name,
        color: member.color,
        sort_order: index,
      })),
    )
    .select("id, name, color, sort_order");

  if (error) throw error;
  return (data ?? []).map(toMember);
}

/** Exactly six people — resets roster if count drifts (e.g. old Mom/Dad/Kid seed). */
export async function ensureFamilyRoster(
  supabase: SupabaseClient,
  userId: string,
): Promise<FamilyCalendarMember[]> {
  const existing = await getFamilyCalendarMembers(supabase);
  if (existing.length === FAMILY_ROSTER_SIZE) return existing;

  const { error: deleteError } = await supabase
    .from("family_calendar_members")
    .delete()
    .eq("user_id", userId);

  if (deleteError) throw deleteError;

  return insertDefaultRoster(supabase, userId);
}

export async function getFamilyCalendarEventsForWeek(
  supabase: SupabaseClient,
  range: WeekRange,
): Promise<FamilyCalendarEvent[]> {
  const { data, error } = await supabase
    .from("family_calendar_events")
    .select(EVENT_SELECT)
    .gte("starts_at", range.weekStart.toISOString())
    .lt("starts_at", range.weekEnd.toISOString())
    .order("starts_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => toEvent(row as EventRow));
}

export function gridTotalHeightPx(): number {
  return (GRID_END_HOUR - GRID_START_HOUR) * HOUR_HEIGHT_PX;
}

export function hourSlots(): number[] {
  const slots: number[] = [];
  for (let h = GRID_START_HOUR; h < GRID_END_HOUR; h++) {
    slots.push(h);
  }
  return slots;
}
