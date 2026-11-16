"use client";

import {
  BibleApiError,
  applyBookSuggestion,
  chapterPath,
  getVerseOfTheDay,
  getVersions,
  parseReference,
  versionLabel,
  type BibleVersion,
  type VerseOfTheDay,
} from "@/lib/bible";
import { countDue, memoryId, saveMemoryVerse } from "@/lib/bible-memory";
import { BibleMarksHome } from "@/components/bible-marks-home";
import { BiblePreferences } from "@/components/bible-preferences";
import { useBibleSettings, useMemoryVerses } from "@/components/use-bible-settings";
import { BibleAlert, BibleCopyright, scriptureStyle } from "@/components/bible-ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function BibleHome() {
  const router = useRouter();
  const { settings, ready, update } = useBibleSettings();
  const saved = useMemoryVerses();
  const [versions, setVersions] = useState<BibleVersion[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [votdState, setVotdState] = useState<{
    key: string;
    verse: VerseOfTheDay | null;
    error: string | null;
  } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [lookupPending, setLookupPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getVersions("en")
      .then((list) => {
        if (!cancelled) setVersions(list);
      })
      .catch(() => {
        if (!cancelled) setVersions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const votdKey = `${settings.version}:${reloadKey}`;

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const key = votdKey;

    getVerseOfTheDay(settings.version)
      .then((verse) => {
        if (!cancelled) setVotdState({ key, verse, error: null });
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setVotdState({
          key,
          verse: null,
          error:
            caught instanceof BibleApiError
              ? caught.message
              : "Today's verse could not be loaded.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [ready, settings.version, votdKey]);

  const votd = votdState?.key === votdKey ? votdState.verse : null;
  const votdError = votdState?.key === votdKey ? votdState.error : null;
  const votdLoading = !ready || votdState?.key !== votdKey;
  const savedId = votd
    ? memoryId(votd.version, votd.book, votd.chapter, votd.verse, votd.verseEnd)
    : "";
  const votdSaved = saved.some((verse) => verse.id === savedId);
  const dueCount = countDue(saved);

  function memorizeToday() {
    if (!votd) return;
    try {
      saveMemoryVerse({
        version: votd.version,
        versionName: versionLabel(versions, votd.version),
        book: votd.book,
        bookName: votd.reference.match(/^(.*)\s+\d+:\d+/)?.[1]?.trim() || votd.book,
        chapter: votd.chapter,
        verse: votd.verse,
        verseEnd: votd.verseEnd,
        reference: votd.reference,
        text: votd.text,
        copyright: votd.copyright,
      });
      setSaveError(null);
    } catch {
      setSaveError("Could not save that verse on this device.");
    }
  }

  async function lookup(reference: string) {
    setLookupPending(true);
    setLookupError(null);
    setSuggestion(null);
    try {
      const parsed = await parseReference(reference);
      router.push(chapterPath(parsed.book, parsed.chapter, parsed.verse, parsed.verseEnd));
    } catch (caught) {
      if (caught instanceof BibleApiError) {
        setLookupError(caught.message);
        setSuggestion(caught.didYouMean ?? null);
      } else {
        setLookupError("Could not look up that reference.");
      }
    } finally {
      setLookupPending(false);
    }
  }

  return (
    <div className="flex w-full max-w-4xl flex-col gap-8">
      <BiblePreferences settings={settings} onChange={update} />

      <section className="rounded-3xl border border-[var(--bible-border)] bg-[var(--bible-glass)] p-6 sm:p-8">
        <h2 className="font-sans text-xs font-bold uppercase tracking-widest text-[var(--bible-accent)]">
          Verse of the day
        </h2>
        {votdLoading ? (
          <p className="mt-4 text-[var(--bible-muted)]">Loading today&apos;s verse…</p>
        ) : null}
        {votdError ? (
          <div className="mt-4 flex flex-col items-start gap-3">
            <BibleAlert>{votdError}</BibleAlert>
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="rounded-full border border-[var(--bible-border)] bg-white px-4 py-2 font-sans text-sm font-semibold text-[var(--bible-accent)]"
            >
              Try again
            </button>
          </div>
        ) : null}
        {votd ? (
          <div className="mt-4">
            <Link
              href={chapterPath(votd.book, votd.chapter, votd.verse, votd.verseEnd)}
              className="font-sans text-sm font-bold uppercase tracking-wide text-[var(--bible-accent)]"
            >
              {votd.reference}
              <span className="ml-2 font-semibold normal-case tracking-normal text-[var(--bible-muted)]">
                {versionLabel(versions, votd.version)}
              </span>
            </Link>
            <p className="mt-3" style={scriptureStyle(settings.fontScale)}>
              {votd.text}
            </p>
            <div className="mt-4">
              <BibleCopyright notice={votd.copyright} />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              {votdSaved ? (
                <Link
                  href="/bible/memorize"
                  className="rounded-full bg-[var(--bible-success)] px-4 py-2 font-sans text-sm font-semibold text-white"
                >
                  Saved
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={memorizeToday}
                  className="rounded-full bg-[var(--bible-accent)] px-4 py-2 font-sans text-sm font-semibold text-white"
                >
                  Memorize this verse
                </button>
              )}
              <Link
                href={chapterPath(votd.book, votd.chapter)}
                className="rounded-full border border-[var(--bible-border)] bg-white px-4 py-2 font-sans text-sm font-semibold text-[var(--bible-ink)]"
              >
                Read the chapter
              </Link>
            </div>
            {saveError ? (
              <div className="mt-4">
                <BibleAlert>{saveError}</BibleAlert>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <form
        className="rounded-3xl border border-[var(--bible-border)] bg-[var(--bible-glass)] p-6"
        onSubmit={(event) => {
          event.preventDefault();
          void lookup(query);
        }}
      >
        <label htmlFor="bible-reference" className="font-sans text-sm font-semibold">
          Look up a reference
        </label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            id="bible-reference"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="John 3:16"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-2xl border border-[var(--bible-border)] bg-white px-4 py-3 font-sans text-base text-[var(--bible-ink)]"
          />
          <button
            type="submit"
            disabled={lookupPending}
            className="rounded-full bg-[var(--bible-accent)] px-5 py-3 font-sans text-sm font-semibold text-white disabled:opacity-60"
          >
            {lookupPending ? "Looking up…" : "Open"}
          </button>
        </div>
        {lookupError ? (
          <div className="mt-4 flex flex-col items-start gap-3">
            <BibleAlert>{lookupError}</BibleAlert>
            {suggestion ? (
              <button
                type="button"
                onClick={() => {
                  const next = applyBookSuggestion(query, suggestion);
                  setQuery(next);
                  void lookup(next);
                }}
                className="rounded-full border border-[var(--bible-border)] bg-white px-4 py-2 font-sans text-sm font-semibold text-[var(--bible-accent)]"
              >
                Try {suggestion}
              </button>
            ) : null}
          </div>
        ) : null}
      </form>

      <BibleMarksHome versions={versions} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/bible/read"
          className="rounded-3xl border border-[var(--bible-border)] bg-[var(--bible-glass)] p-6 transition hover:border-[var(--bible-accent)]"
        >
          <h2 className="text-3xl font-bold">Read</h2>
          <p className="mt-2 font-sans text-sm text-[var(--bible-muted)]">
            Browse books and open a chapter.
          </p>
        </Link>
        <Link
          href="/bible/memorize"
          className="rounded-3xl border border-[var(--bible-border)] bg-[var(--bible-glass)] p-6 transition hover:border-[var(--bible-accent)]"
        >
          <h2 className="text-3xl font-bold">Memorize</h2>
          <p className="mt-2 font-sans text-sm text-[var(--bible-muted)]">
            {!ready
              ? "Loading saved verses…"
              : saved.length === 0
                ? "No verses saved yet."
                : `${dueCount} due · ${saved.length} saved`}
          </p>
        </Link>
      </div>
    </div>
  );
}
