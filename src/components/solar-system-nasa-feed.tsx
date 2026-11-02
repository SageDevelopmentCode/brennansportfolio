"use client";

import type { SolarSystemFeedPayload } from "@/lib/solar-system/types";

type SolarSystemNasaFeedProps = {
  loading: boolean;
  error: string | null;
  feed: SolarSystemFeedPayload | null;
};

function formatKm(km: number): string {
  if (km >= 1_000_000) {
    return `${(km / 1_000_000).toFixed(2)}M km`;
  }
  return `${Math.round(km).toLocaleString()} km`;
}

export function SolarSystemNasaFeed({
  loading,
  error,
  feed,
}: SolarSystemNasaFeedProps) {
  if (loading) {
    return (
      <section
        className="solarsystem-glass-card rounded-3xl p-6 text-sm text-[var(--ss-muted)]"
        aria-busy="true"
      >
        Loading live NASA feeds…
      </section>
    );
  }

  if (error) {
    return (
      <section className="solarsystem-glass-card rounded-3xl p-6 text-sm text-red-300">
        {error}
      </section>
    );
  }

  if (!feed) return null;

  const { apod, asteroids, warning } = feed;
  const apodImage =
    apod && apod.mediaType === "image" ? (apod.hdurl ?? apod.url) : null;

  return (
    <section className="solarsystem-glass-card grid gap-6 rounded-3xl p-6 lg:grid-cols-2 lg:p-8">
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--ss-accent)]">
          Astronomy Picture of the Day
        </h2>
        {apod ? (
          <div className="mt-3">
            {apodImage ? (
              <a
                href={apod.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-2xl border border-[var(--ss-border)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={apodImage}
                  alt={apod.title}
                  className="max-h-40 w-full object-cover"
                />
              </a>
            ) : null}
            <h3 className="mt-3 text-lg font-bold text-[var(--ss-ink)]">
              <a
                href={apod.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--ss-accent)]"
              >
                {apod.title}
              </a>
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--ss-muted)]">
              {apod.explanation}
            </p>
            <p className="mt-2 text-xs text-[var(--ss-muted)]">
              {apod.date}
              {apod.copyright ? ` · © ${apod.copyright}` : null}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--ss-muted)]">
            APOD is not available right now.
          </p>
        )}
      </div>

      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--ss-accent)]">
          Asteroid watch (next 7 days)
        </h2>
        {asteroids.length > 0 ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[20rem] text-left text-sm">
              <thead>
                <tr className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--ss-muted)]">
                  <th className="pb-2 pr-2">Name</th>
                  <th className="pb-2 pr-2">Date</th>
                  <th className="pb-2 pr-2">Miss</th>
                  <th className="pb-2">PHA</th>
                </tr>
              </thead>
              <tbody>
                {asteroids.map((asteroid) => (
                  <tr
                    key={`${asteroid.name}-${asteroid.closeApproachDate}`}
                    className="border-t border-[var(--ss-border)] text-[var(--ss-ink)]"
                  >
                    <td className="py-2 pr-2 font-semibold">{asteroid.name}</td>
                    <td className="py-2 pr-2 text-[var(--ss-muted)]">
                      {asteroid.closeApproachDate}
                    </td>
                    <td className="py-2 pr-2 text-[var(--ss-muted)]">
                      {formatKm(asteroid.missDistanceKm)}
                    </td>
                    <td className="py-2">
                      {asteroid.potentiallyHazardous ? (
                        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-200">
                          Yes
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--ss-muted)]">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--ss-muted)]">
            No close approaches in this window.
          </p>
        )}
        <p className="mt-3 text-xs text-[var(--ss-muted)]">
          Data from NASA NeoWs.{" "}
          <a
            href="https://api.nasa.gov/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[var(--ss-accent)] underline-offset-2 hover:underline"
          >
            api.nasa.gov
          </a>
        </p>
      </div>

      {warning ? (
        <p className="text-xs text-amber-200/90 lg:col-span-2">{warning}</p>
      ) : null}
    </section>
  );
}
