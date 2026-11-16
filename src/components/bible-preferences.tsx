"use client";

import { BibleApiError, getVersions, type BibleVersion } from "@/lib/bible";
import { FONT_SCALES, type BibleSettings } from "@/lib/bible-memory";
import { useEffect, useState } from "react";

type BiblePreferencesProps = {
  settings: BibleSettings;
  onChange: (patch: Partial<BibleSettings>) => void;
  showVersion?: boolean;
};

export function BiblePreferences({
  settings,
  onChange,
  showVersion = true,
}: BiblePreferencesProps) {
  const [versions, setVersions] = useState<BibleVersion[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!showVersion) return;
    let cancelled = false;

    getVersions("en")
      .then((list) => {
        if (!cancelled) {
          setVersions(list);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(
          caught instanceof BibleApiError
            ? caught.message
            : "The translation list could not be loaded.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [showVersion]);

  const selected = versions.some((version) => version.slug === settings.version);

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-[var(--bible-border)] bg-[var(--bible-glass)] p-4 sm:flex-row sm:items-end sm:justify-between">
      {showVersion ? (
        <label className="flex min-w-0 flex-1 flex-col gap-2 font-sans text-sm font-semibold text-[var(--bible-ink)]">
          Translation
          <select
            value={settings.version}
            onChange={(event) => onChange({ version: event.target.value })}
            className="rounded-2xl border border-[var(--bible-border)] bg-white px-3 py-3 font-sans text-base text-[var(--bible-ink)]"
          >
            {!selected ? (
              <option value={settings.version}>{settings.version.toUpperCase()}</option>
            ) : null}
            {versions.map((version) => (
              <option key={version.slug} value={version.slug}>
                {version.shortName} — {version.name}
              </option>
            ))}
          </select>
          {error ? <span className="font-normal text-[var(--bible-muted)]">{error}</span> : null}
        </label>
      ) : (
        <p className="font-sans text-sm text-[var(--bible-muted)]">Text size for reading and practice</p>
      )}

      <div className="flex flex-col gap-2">
        <span className="font-sans text-sm font-semibold text-[var(--bible-ink)]">Text size</span>
        <div className="flex gap-2">
          {FONT_SCALES.map((scale, index) => {
            const selectedScale = scale === settings.fontScale;
            return (
              <button
                key={scale}
                type="button"
                aria-label={`Text size ${index + 1}`}
                aria-pressed={selectedScale}
                onClick={() => onChange({ fontScale: scale })}
                className={`flex h-11 w-11 items-center justify-center rounded-2xl border font-serif ${
                  selectedScale
                    ? "border-[var(--bible-accent)] bg-[var(--bible-accent)] text-white"
                    : "border-[var(--bible-border)] bg-white text-[var(--bible-ink)]"
                }`}
                style={{ fontSize: `${0.85 + index * 0.2}rem` }}
              >
                A
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
