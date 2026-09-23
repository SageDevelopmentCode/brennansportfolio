"use client";

import { HistoryEventDetail } from "@/components/history-event-detail";
import { HistoryEventGraph } from "@/components/history-event-graph";
import { HistoryWikipediaSearch } from "@/components/history-wikipedia-search";
import {
  CUSTOM_EVENTS_STORAGE_KEY,
  createCustomEvent,
  formatEventYear,
  mergeEvents,
  type HistoryEvent,
} from "@/lib/history";
import type { WikiSearchResult } from "@/lib/wikipedia";
import { useCallback, useEffect, useMemo, useState } from "react";

type HistoryTimelineClientProps = {
  curatedEvents: HistoryEvent[];
};

function loadCustomEvents(): HistoryEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_EVENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCustomEvents(events: HistoryEvent[]) {
  localStorage.setItem(CUSTOM_EVENTS_STORAGE_KEY, JSON.stringify(events));
}

export function HistoryTimelineClient({
  curatedEvents,
}: HistoryTimelineClientProps) {
  const [customEvents, setCustomEvents] = useState<HistoryEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"timeline" | "graph">("timeline");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCustomEvents(loadCustomEvents());
    setHydrated(true);
  }, []);

  const allEvents = useMemo(
    () => mergeEvents(curatedEvents, customEvents),
    [curatedEvents, customEvents],
  );

  const selectedEvent = useMemo(
    () => allEvents.find((event) => event.id === selectedId) ?? null,
    [allEvents, selectedId],
  );

  const handleAddEvent = useCallback(
    (result: WikiSearchResult, year: number) => {
      const newEvent = createCustomEvent(result.title, year, result.title);
      setCustomEvents((prev) => {
        const exists = prev.some((event) => event.id === newEvent.id);
        if (exists) return prev;
        const next = [...prev, newEvent];
        saveCustomEvents(next);
        return next;
      });
      setSelectedId(newEvent.id);
    },
    [],
  );

  const handleRemoveEvent = useCallback((eventId: string) => {
    setCustomEvents((prev) => {
      const next = prev.filter((event) => event.id !== eventId);
      saveCustomEvents(next);
      return next;
    });
    setSelectedId(null);
  }, []);

  if (!hydrated) {
    return (
      <div className="flex flex-col gap-8">
        <div className="history-skeleton h-48 rounded-3xl" />
        <div className="history-skeleton h-96 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <HistoryWikipediaSearch onAddEvent={handleAddEvent} />

      <section className="history-glass-card rounded-3xl p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="text-lg font-bold text-[var(--history-ink)]">
              {view === "timeline" ? "Timeline" : "Graph"}
            </h2>
            <p className="text-sm text-[var(--history-muted)]">
              {allEvents.length} events
            </p>
          </div>

          <div className="flex gap-2" role="tablist" aria-label="View mode">
            <button
              type="button"
              role="tab"
              aria-selected={view === "timeline"}
              onClick={() => setView("timeline")}
              className={`history-view-toggle ${view === "timeline" ? "history-view-toggle-active" : ""}`}
            >
              Timeline
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "graph"}
              onClick={() => setView("graph")}
              className={`history-view-toggle ${view === "graph" ? "history-view-toggle-active" : ""}`}
            >
              Graph
            </button>
          </div>
        </div>

        {view === "timeline" ? (
          <ol className="mt-6 flex flex-col">
            {allEvents.map((event, index) => {
              const isSelected = selectedId === event.id;
              const isLast = index === allEvents.length - 1;

              return (
                <li key={event.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`history-timeline-dot ${isSelected ? "history-timeline-dot-selected" : ""}`}
                      aria-hidden
                    />
                    {!isLast ? (
                      <div className="history-timeline-connector" aria-hidden />
                    ) : null}
                  </div>

                  <div className="mb-6 flex-1">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedId(isSelected ? null : event.id)
                      }
                      className={`history-timeline-event w-full rounded-2xl px-5 py-4 text-left ${isSelected ? "history-timeline-event-selected" : ""}`}
                      aria-expanded={isSelected}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold uppercase tracking-wide text-[var(--history-accent)]">
                          {formatEventYear(event.year)}
                        </span>
                        {event.isCustom ? (
                          <span className="rounded-full bg-[var(--history-accent-soft)] px-2 py-0.5 text-xs font-bold text-[var(--history-accent)]">
                            Added by you
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-lg font-bold text-[var(--history-ink)]">
                        {event.emoji ? `${event.emoji} ` : ""}
                        {event.title}
                      </p>
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <HistoryEventGraph
            events={allEvents}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        )}

        {selectedEvent ? (
          <div className="mt-4">
            <HistoryEventDetail
              event={selectedEvent}
              onClose={() => setSelectedId(null)}
              onRemove={
                selectedEvent.isCustom
                  ? () => handleRemoveEvent(selectedEvent.id)
                  : undefined
              }
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
