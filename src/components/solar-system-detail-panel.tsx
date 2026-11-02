"use client";

import { NASA_FACT_SHEET_URL } from "@/lib/solar-system/bodies";
import type { SolarSystemDetailPayload } from "@/lib/solar-system/types";

export type { SolarSystemDetailPayload } from "@/lib/solar-system/types";

type SolarSystemDetailPanelProps = {
  loading: boolean;
  error: string | null;
  payload: SolarSystemDetailPayload | null;
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--ss-border)] bg-black/20 px-3 py-2">
      <dt className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--ss-muted)]">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold text-[var(--ss-ink)]">{value}</dd>
    </div>
  );
}

function BodyExtrasSection({ payload }: { payload: SolarSystemDetailPayload }) {
  const { extras, extrasWarning } = payload;
  if (!extras && !extrasWarning) return null;

  return (
    <div className="mt-6 space-y-4 border-t border-[var(--ss-border)] pt-6">
      {extrasWarning ? (
        <p className="text-xs text-amber-200/90">{extrasWarning}</p>
      ) : null}

      {extras?.kind === "sun" ? (
        <div>
          <h3 className="text-sm font-bold text-[var(--ss-ink)]">
            Space weather (DONKI)
          </h3>
          {extras.flares.length > 0 ? (
            <ul className="mt-2 space-y-2 text-sm text-[var(--ss-muted)]">
              {extras.flares.map((flare) => (
                <li
                  key={`${flare.beginTime}-${flare.classType}`}
                  className="rounded-xl border border-[var(--ss-border)] bg-black/20 px-3 py-2"
                >
                  <span className="font-semibold text-[var(--ss-ink)]">
                    {flare.classType}
                  </span>
                  <span className="text-[var(--ss-muted)]">
                    {" "}
                    · {new Date(flare.beginTime).toLocaleString()} ·{" "}
                    {flare.sourceLocation}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-[var(--ss-muted)]">
              No solar flares reported in the last two weeks.
            </p>
          )}
          <p className="mt-2 text-xs text-[var(--ss-muted)]">
            <a
              href="https://api.nasa.gov/DONKI"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[var(--ss-accent)] underline-offset-2 hover:underline"
            >
              NASA DONKI
            </a>
          </p>
        </div>
      ) : null}

      {extras?.kind === "earth" && extras.epicImages.length > 0 ? (
        <div>
          <h3 className="text-sm font-bold text-[var(--ss-ink)]">
            Earth from EPIC
          </h3>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
            {extras.epicImages.map((image) => (
              <a
                key={image.date}
                href={image.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 overflow-hidden rounded-xl border border-[var(--ss-border)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.imageUrl}
                  alt={image.caption}
                  className="h-24 w-24 object-cover sm:h-28 sm:w-28"
                />
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {extras?.kind === "moons" ? (
        <div>
          <h3 className="text-sm font-bold text-[var(--ss-ink)]">Famous moons</h3>
          {extras.moons.length > 0 ? (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {extras.moons.map((moon) => (
                <figure
                  key={moon.name}
                  className="overflow-hidden rounded-2xl border border-[var(--ss-border)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={moon.imageUrl}
                    alt={moon.caption ?? moon.name}
                    className="h-32 w-full object-cover"
                  />
                  <figcaption className="px-3 py-2 text-xs text-[var(--ss-muted)]">
                    <span className="font-bold text-[var(--ss-ink)]">
                      {moon.name}
                    </span>
                    {moon.sourceUrl ? (
                      <>
                        {" "}
                        <a
                          href={moon.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-[var(--ss-accent)] underline-offset-2 hover:underline"
                        >
                          NASA
                        </a>
                      </>
                    ) : null}
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-[var(--ss-muted)]">
              No moon images found in the NASA library right now.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function SolarSystemDetailPanel({
  loading,
  error,
  payload,
}: SolarSystemDetailPanelProps) {
  if (!payload && !loading && !error) {
    return (
      <aside
        className="solarsystem-glass-card flex min-h-48 flex-col justify-center rounded-3xl p-6 text-center text-[var(--ss-muted)]"
        aria-live="polite"
      >
        <p className="text-sm font-medium">
          Click the Sun or a planet to open its NASA-backed fact card.
        </p>
      </aside>
    );
  }

  if (loading) {
    return (
      <aside
        className="solarsystem-glass-card rounded-3xl p-6 text-[var(--ss-muted)]"
        aria-busy="true"
      >
        Loading NASA data…
      </aside>
    );
  }

  if (error) {
    return (
      <aside className="solarsystem-glass-card rounded-3xl p-6 text-red-300">
        {error}
      </aside>
    );
  }

  if (!payload) return null;

  const { body, imageUrl, imageCaption, sourceUrl, warning } = payload;

  return (
    <aside
      className="solarsystem-glass-card rounded-3xl p-6 sm:p-8"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--ss-accent)]">
            {body.kind}
          </p>
          <h2 className="mt-1 text-3xl font-extrabold text-[var(--ss-ink)]">
            {body.name}
          </h2>
        </div>
        <span
          className="h-4 w-4 shrink-0 rounded-full ring-2 ring-white/30"
          style={{ backgroundColor: body.color }}
          aria-hidden
        />
      </div>

      <p className="mt-4 text-sm leading-relaxed text-[var(--ss-muted)]">
        {body.overview}
      </p>

      {warning ? (
        <p className="mt-3 text-xs text-amber-200/90">{warning}</p>
      ) : null}

      {imageUrl ? (
        <figure className="mt-5 overflow-hidden rounded-2xl border border-[var(--ss-border)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={imageCaption ?? `${body.name} from NASA`}
            className="max-h-56 w-full object-cover"
          />
          {imageCaption ? (
            <figcaption className="px-3 py-2 text-xs text-[var(--ss-muted)]">
              {imageCaption}
              {sourceUrl ? (
                <>
                  {" "}
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[var(--ss-accent)] underline-offset-2 hover:underline"
                  >
                    View on NASA
                  </a>
                </>
              ) : null}
            </figcaption>
          ) : null}
        </figure>
      ) : null}

      <dl className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Stat label="Diameter" value={body.diameter} />
        <Stat label="Mass" value={body.mass} />
        <Stat label="Day length" value={body.dayLength} />
        <Stat label="Year length" value={body.yearLength} />
        <Stat label="Moons" value={body.moons} />
        <Stat label="Atmosphere" value={body.atmosphere} />
        <Stat label="Distance from Sun" value={body.distanceFromSun} />
      </dl>

      <BodyExtrasSection payload={payload} />

      <p className="mt-6 text-xs text-[var(--ss-muted)]">
        Planetary numbers from{" "}
        <a
          href={NASA_FACT_SHEET_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[var(--ss-accent)] underline-offset-2 hover:underline"
        >
          NASA Planetary Fact Sheet
        </a>
        . Images from NASA open APIs when available.
      </p>
    </aside>
  );
}
