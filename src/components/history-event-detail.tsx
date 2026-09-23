"use client";

import type { HistoryEvent } from "@/lib/history";
import { formatEventYear } from "@/lib/history";
import type { WikiSummary } from "@/lib/wikipedia";
import Image from "next/image";
import { useEffect, useState } from "react";

type HistoryEventDetailProps = {
  event: HistoryEvent;
  onClose: () => void;
  onRemove?: () => void;
};

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="history-skeleton h-8 w-2/3 rounded-lg" />
      <div className="history-skeleton h-4 w-1/3 rounded-lg" />
      <div className="history-skeleton h-32 rounded-xl" />
      <div className="history-skeleton h-20 rounded-xl" />
    </div>
  );
}

export function HistoryEventDetail({
  event,
  onClose,
  onRemove,
}: HistoryEventDetailProps) {
  const [summary, setSummary] = useState<WikiSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      setLoading(true);
      setError(false);
      setSummary(null);

      try {
        const res = await fetch(
          `/api/wikipedia/summary?title=${encodeURIComponent(event.wikipediaTitle)}`,
        );
        const data = await res.json();

        if (cancelled) return;

        if (!res.ok) {
          setError(true);
          return;
        }

        setSummary(data.summary ?? null);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSummary();

    return () => {
      cancelled = true;
    };
  }, [event.wikipediaTitle]);

  return (
    <section
      className="history-detail-panel rounded-3xl p-6 sm:p-8"
      aria-labelledby="history-detail-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-[var(--history-accent)]">
            {formatEventYear(event.year)}
          </p>
          <h3
            id="history-detail-title"
            className="mt-1 text-2xl font-bold text-[var(--history-ink)]"
          >
            {event.emoji ? `${event.emoji} ` : ""}
            {event.title}
          </h3>
        </div>

        <div className="flex gap-2">
          {onRemove ? (
            <button
              type="button"
              onClick={onRemove}
              className="history-btn-secondary text-red-700 hover:border-red-300 hover:bg-red-50"
            >
              Remove
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="history-btn-secondary"
            aria-label="Close details"
          >
            Close
          </button>
        </div>
      </div>

      <div className="mt-6">
        {loading ? <DetailSkeleton /> : null}

        {error ? (
          <p className="text-sm text-red-600">
            Could not load Wikipedia details. Please try again.
          </p>
        ) : null}

        {!loading && !error && !summary ? (
          <p className="text-sm text-[var(--history-muted)]">
            No Wikipedia article found for this event.
          </p>
        ) : null}

        {!loading && summary ? (
          <div className="flex flex-col gap-4">
            {summary.description ? (
              <p className="text-sm font-semibold text-[var(--history-muted)]">
                {summary.description}
              </p>
            ) : null}

            {summary.thumbnailUrl ? (
              <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-2xl">
                <Image
                  src={summary.thumbnailUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 400px"
                  unoptimized
                />
              </div>
            ) : null}

            <p className="leading-relaxed text-[var(--history-ink)]">
              {summary.extract}
            </p>

            <div className="flex flex-col gap-2 border-t border-[var(--history-border)] pt-4">
              <a
                href={summary.pageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-1 text-sm font-bold text-[var(--history-accent)] underline-offset-2 hover:underline"
              >
                Read on Wikipedia →
              </a>
              <p className="text-xs text-[var(--history-muted)]">
                Content from Wikipedia, licensed under CC BY-SA 4.0.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
