"use client";

import {
  FamilyCalendarEventDialog,
  type EventDialogDraft,
} from "@/components/family-calendar-event-dialog";
import { FamilyCalendarMembersDialog } from "@/components/family-calendar-members-dialog";
import { FamilyCalendarWeekGrid } from "@/components/family-calendar-week-grid";
import {
  type FamilyCalendarEvent,
  type FamilyCalendarMember,
  addWeeks,
  formatWeekLabel,
  getFamilyCalendarEventsForWeek,
  getWeekRange,
  weekHypeMessage,
  MEMBER_FLAIR_EMOJI,
} from "@/lib/family-calendar";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type FamilyCalendarAppClientProps = {
  initialMembers: FamilyCalendarMember[];
  initialEvents: FamilyCalendarEvent[];
  initialWeekAnchor: string;
};

export function FamilyCalendarAppClient({
  initialMembers,
  initialEvents,
  initialWeekAnchor,
}: FamilyCalendarAppClientProps) {
  const [weekAnchor, setWeekAnchor] = useState(
    () => new Date(initialWeekAnchor),
  );
  const [members, setMembers] = useState(initialMembers);
  const [events, setEvents] = useState(initialEvents);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<FamilyCalendarEvent | null>(
    null,
  );
  const [slotDraft, setSlotDraft] = useState<EventDialogDraft | null>(null);

  const [membersDialogOpen, setMembersDialogOpen] = useState(false);

  const weekRange = useMemo(() => getWeekRange(weekAnchor), [weekAnchor]);
  const weekLabel = useMemo(() => formatWeekLabel(weekRange), [weekRange]);

  const loadWeekEvents = useCallback(async (range: ReturnType<typeof getWeekRange>) => {
    setLoadingWeek(true);
    setError(null);
    try {
      const supabase = createClient();
      const next = await getFamilyCalendarEventsForWeek(supabase, range);
      setEvents(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load events.");
    } finally {
      setLoadingWeek(false);
    }
  }, []);

  const skipInitialWeekFetch = useRef(true);

  useEffect(() => {
    if (skipInitialWeekFetch.current) {
      skipInitialWeekFetch.current = false;
      const initialRange = getWeekRange(new Date(initialWeekAnchor));
      if (weekRange.weekStart.getTime() === initialRange.weekStart.getTime()) {
        return;
      }
    }
    void loadWeekEvents(weekRange);
  }, [weekRange, loadWeekEvents, initialWeekAnchor]);

  function openCreateDialog(draft?: EventDialogDraft) {
    setEditingEvent(null);
    setSlotDraft(draft ?? null);
    setEventDialogOpen(true);
  }

  function openEditDialog(event: FamilyCalendarEvent) {
    setEditingEvent(event);
    setSlotDraft(null);
    setEventDialogOpen(true);
  }

  function closeEventDialog() {
    setEventDialogOpen(false);
    setEditingEvent(null);
    setSlotDraft(null);
  }

  function handleEventSaved(saved: FamilyCalendarEvent) {
    setEvents((current) => {
      const exists = current.some((e) => e.id === saved.id);
      if (exists) {
        return current.map((e) => (e.id === saved.id ? saved : e));
      }
      const start = new Date(saved.startsAt);
      if (
        start >= weekRange.weekStart &&
        start < weekRange.weekEnd
      ) {
        return [...current, saved].sort(
          (a, b) =>
            new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
        );
      }
      return current;
    });
  }

  function handleEventDeleted(eventId: string) {
    setEvents((current) => current.filter((e) => e.id !== eventId));
  }

  const weekEventCount = events.length;

  return (
    <main className="fcal-bg relative flex flex-1 flex-col gap-6 px-4 py-8 sm:px-8 sm:py-10">
      <div className="fcal-floaters" aria-hidden>
        <span className="fcal-floater left-[6%] top-[12%]" style={{ animationDelay: "0s" }}>
          🎈
        </span>
        <span
          className="fcal-floater fcal-floater-alt right-[8%] top-[18%]"
          style={{ animationDelay: "1.2s" }}
        >
          ⚡
        </span>
        <span className="fcal-floater left-[12%] bottom-[20%]" style={{ animationDelay: "0.6s" }}>
          🌟
        </span>
        <span
          className="fcal-floater fcal-floater-alt right-[14%] bottom-[28%]"
          style={{ animationDelay: "1.8s" }}
        >
          🎉
        </span>
        <span className="fcal-floater left-[45%] top-[4%]" style={{ animationDelay: "2.4s" }}>
          📅
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-full border-2 border-[var(--fcal-border)] bg-[var(--fcal-glass)] px-4 py-2 text-sm font-bold text-[#c2410c] shadow-sm transition hover:border-[#e85d4c] hover:bg-white"
        >
          ← All projects
        </Link>
        <div className="fcal-week-pill flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setWeekAnchor(new Date())}
            className="fcal-btn-secondary !border-transparent !bg-white/80 !py-2 !text-sm"
          >
            ⚡ Today
          </button>
          <button
            type="button"
            onClick={() => setWeekAnchor((d) => addWeeks(d, -1))}
            className="fcal-btn-secondary !border-transparent !bg-white/80 !px-3 !py-2"
            aria-label="Previous week"
          >
            ◀
          </button>
          <span className="min-w-[10rem] px-1 text-center text-sm font-extrabold text-[var(--fcal-ink)]">
            {weekLabel}
          </span>
          <button
            type="button"
            onClick={() => setWeekAnchor((d) => addWeeks(d, 1))}
            className="fcal-btn-secondary !border-transparent !bg-white/80 !px-3 !py-2"
            aria-label="Next week"
          >
            ▶
          </button>
        </div>
      </div>

      <header className="fcal-cozy-card flex flex-wrap items-end justify-between gap-4 p-6 sm:p-8">
        <div className="max-w-xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-block rounded-full bg-gradient-to-r from-orange-200 via-pink-200 to-violet-200 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#9a3412] ring-2 ring-white/80">
              Week view
            </span>
            <span className="fcal-stat-pill">
              {weekEventCount} {weekEventCount === 1 ? "plan" : "plans"} this week
            </span>
          </div>
          <h1 className="mt-3 text-4xl font-extrabold leading-tight sm:text-6xl">
            <span className="fcal-title-gradient">Home Week</span>
            <span className="ml-2 inline-block animate-[fcal-wiggle_2s_ease-in-out_infinite]">
              🎊
            </span>
          </h1>
          <p className="mt-2 text-base font-bold text-[#9a3412]">
            Plot the chaos! Tap any hour, drop a plan, watch the week light up.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMembersDialogOpen(true)}
            className="fcal-btn-secondary"
          >
            👨‍👩‍👧 Crew
          </button>
          <button
            type="button"
            onClick={() => openCreateDialog()}
            className="fcal-btn-primary"
          >
            🚀 New plan!
          </button>
        </div>
      </header>

      <p className="fcal-hype-banner">{weekHypeMessage(weekEventCount)}</p>

      <div className="flex flex-wrap items-center gap-2">
        {members.map((member, index) => (
          <span
            key={member.id}
            className="fcal-member-chip inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-extrabold text-[var(--fcal-ink)]"
            style={{
              borderColor: member.color,
              backgroundColor: `color-mix(in srgb, ${member.color} 22%, white)`,
            }}
          >
            <span
              className="h-3.5 w-3.5 rounded-full ring-2 ring-white"
              style={{ backgroundColor: member.color }}
              aria-hidden
            />
            <span aria-hidden>{MEMBER_FLAIR_EMOJI[index % MEMBER_FLAIR_EMOJI.length]}</span>
            {member.name}
          </span>
        ))}
      </div>

      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">
          {error}
        </p>
      ) : null}

      <div className="relative">
        {loadingWeek ? (
          <div
            className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center pt-8"
            aria-live="polite"
          >
            <span className="fcal-stat-pill !text-sm !normal-case !tracking-normal">
              Zipping through time… 🌀
            </span>
          </div>
        ) : null}
        <FamilyCalendarWeekGrid
          weekRange={weekRange}
          events={events}
          members={members}
          onSlotClick={(draft) => openCreateDialog(draft)}
          onEventClick={openEditDialog}
        />
      </div>

      <FamilyCalendarEventDialog
        open={eventDialogOpen}
        onClose={closeEventDialog}
        members={members}
        editingEvent={editingEvent}
        slotDraft={slotDraft}
        onSaved={handleEventSaved}
        onDeleted={handleEventDeleted}
      />

      <FamilyCalendarMembersDialog
        open={membersDialogOpen}
        onClose={() => setMembersDialogOpen(false)}
        members={members}
        onMembersChange={setMembers}
      />
    </main>
  );
}
