"use client";

import type { ForcastrStorm } from "@/lib/nhc-storms";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const SkylineForcastrMap = dynamic(
  () =>
    import("@/components/skyline-forcastr-map").then((mod) => ({
      default: mod.SkylineForcastrMap,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="skyline-skeleton h-full min-h-[200px] rounded-xl" />
    ),
  },
);

type StormsResponse = {
  storms?: ForcastrStorm[];
  updatedAt?: string;
  error?: string;
};

export function ForcastrMapCard() {
  const [storms, setStorms] = useState<ForcastrStorm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch("/api/weather/storms");
        const data = (await res.json()) as StormsResponse;
        if (!res.ok) {
          if (!cancelled) {
            setStorms([]);
            setError(true);
          }
          return;
        }
        if (!cancelled) setStorms(data.storms ?? []);
      } catch {
        if (!cancelled) {
          setStorms([]);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeCount = storms.length;

  return (
    <article className="skyline-glass-card skyline-card flex h-full min-h-[280px] flex-col gap-3 rounded-2xl p-5 sm:min-h-[320px]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-xl font-extrabold text-[var(--skyline-ink)]">
            Forcastr
          </h3>
          <p className="mt-0.5 text-sm font-medium text-[var(--skyline-muted)]">
            Active tropical storms
          </p>
        </div>
        <span
          className="rounded-full bg-[var(--skyline-accent-soft)] px-3 py-1 text-xs font-bold text-[var(--skyline-accent)] ring-1 ring-[var(--skyline-border)]"
          aria-live="polite"
        >
          {loading ? "…" : activeCount}
        </span>
      </div>

      <div className="skyline-map-shell min-h-0 flex-1 overflow-hidden rounded-xl border border-[var(--skyline-border)]">
        {loading ? (
          <div className="skyline-skeleton h-full min-h-[200px]" />
        ) : error ? (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center px-4 text-center">
            <p className="text-sm font-semibold text-[var(--skyline-ink)]">
              Storm data unavailable
            </p>
            <p className="mt-1 text-xs text-[var(--skyline-muted)]">
              NOAA feed could not be loaded. Try refreshing.
            </p>
          </div>
        ) : activeCount === 0 ? (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center px-4 text-center">
            <p className="text-3xl opacity-70" aria-hidden>🌊</p>
            <p className="mt-2 text-sm font-semibold text-[var(--skyline-ink)]">
              No active storms in NHC basins
            </p>
          </div>
        ) : (
          <SkylineForcastrMap storms={storms} />
        )}
      </div>

      <p className="text-[10px] leading-snug text-[var(--skyline-muted)]">
        Data: NOAA/NHC · Map: OpenStreetMap
      </p>
    </article>
  );
}
