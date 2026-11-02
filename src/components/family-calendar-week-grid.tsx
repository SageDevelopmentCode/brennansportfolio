"use client";

import {
  type FamilyCalendarEvent,
  type FamilyCalendarMember,
  type WeekRange,
  eventOccursOnDay,
  formatDayHeader,
  formatHourLabel,
  formatTimeRange,
  gridTotalHeightPx,
  hourSlots,
  HOUR_HEIGHT_PX,
  layoutEventBlock,
  DAY_COLUMN_TINTS,
  DAY_VIBE_EMOJI,
  eventAttendeeLabel,
  eventBlockGradient,
} from "@/lib/family-calendar";
import type { EventDialogDraft } from "@/components/family-calendar-event-dialog";

type FamilyCalendarWeekGridProps = {
  weekRange: WeekRange;
  events: FamilyCalendarEvent[];
  members: FamilyCalendarMember[];
  onSlotClick: (draft: EventDialogDraft) => void;
  onEventClick: (event: FamilyCalendarEvent) => void;
};

export function FamilyCalendarWeekGrid({
  weekRange,
  events,
  members,
  onSlotClick,
  onEventClick,
}: FamilyCalendarWeekGridProps) {
  const slots = hourSlots();
  const gridHeight = gridTotalHeightPx();
  const today = new Date();

  return (
    <div className="fcal-grid-shell overflow-hidden">
      <div className="fcal-grid-scroll overflow-auto">
        <div className="fcal-grid min-w-[44rem]">
          <div className="fcal-grid-header sticky top-0 z-20 grid grid-cols-[3.5rem_repeat(7,1fr)] border-b border-[var(--fcal-border)] bg-[var(--fcal-glass)] backdrop-blur-sm">
            <div className="border-r border-[var(--fcal-border)]" />
            {weekRange.days.map((day, dayIndex) => {
              const { weekday, dayNum } = formatDayHeader(day);
              const isToday = day.toDateString() === today.toDateString();
              return (
                <div
                  key={day.toISOString()}
                  className={`border-r border-[var(--fcal-border)] px-2 py-3 text-center last:border-r-0 ${
                    isToday ? "fcal-day-today-header" : ""
                  }`}
                  style={
                    isToday
                      ? undefined
                      : { backgroundColor: DAY_COLUMN_TINTS[dayIndex] }
                  }
                >
                  <div className="text-base leading-none" aria-hidden>
                    {DAY_VIBE_EMOJI[dayIndex]}
                  </div>
                  <div className="text-xs font-extrabold uppercase tracking-wide text-[var(--fcal-muted)]">
                    {weekday}
                  </div>
                  <div
                    className={`text-lg font-extrabold ${
                      isToday ? "text-[var(--fcal-accent)]" : "text-[var(--fcal-ink)]"
                    }`}
                  >
                    {dayNum}
                  </div>
                  {isToday ? (
                    <span className="fcal-day-today-badge">Today!</span>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-[3.5rem_repeat(7,1fr)]">
            <div
              className="relative border-r border-[var(--fcal-border)] bg-[var(--fcal-surface)]"
              style={{ height: gridHeight }}
            >
              {slots.map((hour, index) => (
                <div
                  key={hour}
                  className="absolute right-2 -translate-y-1/2 text-[0.65rem] font-bold text-[var(--fcal-muted)]"
                  style={{ top: index * HOUR_HEIGHT_PX }}
                >
                  {formatHourLabel(hour)}
                </div>
              ))}
            </div>

            {weekRange.days.map((day, dayIndex) => {
              const dayEvents = events.filter((event) =>
                eventOccursOnDay(event, day),
              );
              const isToday = day.toDateString() === today.toDateString();

              return (
                <div
                  key={day.toISOString()}
                  className={`fcal-day-col relative border-r border-[var(--fcal-border)] last:border-r-0 ${
                    isToday ? "fcal-day-today-col" : ""
                  }`}
                  style={{
                    height: gridHeight,
                    backgroundColor: isToday
                      ? undefined
                      : DAY_COLUMN_TINTS[dayIndex],
                  }}
                >
                  {slots.map((hour, index) => (
                    <button
                      key={hour}
                      type="button"
                      className="fcal-slot-btn absolute left-0 right-0 border-t border-[var(--fcal-grid-line)]"
                      style={{
                        top: index * HOUR_HEIGHT_PX,
                        height: HOUR_HEIGHT_PX,
                      }}
                      onClick={() =>
                        onSlotClick({ date: new Date(day), startHour: hour })
                      }
                      aria-label={`Add event on ${formatDayHeader(day).weekday} at ${formatHourLabel(hour)}`}
                    />
                  ))}

                  {dayEvents.map((event) => {
                    const start = new Date(event.startsAt);
                    const end = new Date(event.endsAt);
                    const { topPx, heightPx } = layoutEventBlock(start, end);
                    const attendeeLabel = eventAttendeeLabel(
                      event.memberIds,
                      members,
                    );
                    const blockBackground = eventBlockGradient(
                      event.memberIds,
                      members,
                    );

                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(event);
                        }}
                        className="fcal-event-block absolute left-1 right-1 overflow-hidden px-2 py-1 text-left text-white ring-2 ring-white/40"
                        style={{
                          top: topPx,
                          height: heightPx,
                          background: blockBackground,
                        }}
                      >
                        <span className="fcal-event-sparkle" aria-hidden>✨</span>
                        <div className="truncate text-xs font-extrabold leading-tight pr-3">
                          {event.title}
                        </div>
                        <div className="truncate text-[0.65rem] font-bold opacity-95">
                          {attendeeLabel}
                        </div>
                        <div className="truncate text-[0.6rem] font-semibold opacity-85">
                          {formatTimeRange(start, end)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
