"use client";

import {
  BibleApiError,
  chapterPath,
  formatReference,
  getBooks,
  getChapter,
  getVersions,
  neighborChapters,
  versionLabel,
  type BibleBook,
  type BiblePassage,
  type BibleVersion,
} from "@/lib/bible";
import {
  highlightsForVerse,
  listHighlightsForChapter,
  listNotesForVerse,
  markId,
  removeNote,
  spansMatch,
  toggleHighlight,
  updateNoteBody,
  upsertNote,
  type BibleHighlight,
} from "@/lib/bible-marks";
import { memoryId, saveMemoryVerse } from "@/lib/bible-memory";
import { renderScriptureWithMarks } from "@/lib/bible-scripture-render";
import type { ScriptureSelection } from "@/lib/bible-scripture-selection";
import { BiblePreferences } from "@/components/bible-preferences";
import { BibleSelectionBar } from "@/components/bible-selection-bar";
import { useBibleHighlights, useBibleNotes } from "@/components/use-bible-marks";
import { useBibleScriptureSelection } from "@/components/use-bible-scripture-selection";
import { useBibleSettings, useMemoryVerses } from "@/components/use-bible-settings";
import { BibleAlert, BibleCopyright, scriptureStyle } from "@/components/bible-ui";
import Link from "next/link";
import { useEffect, useState } from "react";

type BibleChapterProps = {
  book: string;
  chapter: number;
  verse: number | null;
  verseEnd: number | null;
};

function isWholeVerseSelection(selection: ScriptureSelection, line: string): boolean {
  return (
    selection.verseStart === selection.verseEnd &&
    selection.charStart === 0 &&
    selection.charEnd === line.length &&
    selection.quote === line.trim()
  );
}

function memoryIdForSelection(
  passage: BiblePassage,
  selection: ScriptureSelection,
  lineAtStart: string,
): string {
  if (isWholeVerseSelection(selection, lineAtStart)) {
    return memoryId(
      passage.version,
      passage.book,
      passage.chapter,
      selection.verseStart,
      selection.verseStart,
    );
  }
  return markId(
    passage.version,
    passage.book,
    passage.chapter,
    selection.verseStart,
    selection.verseEnd,
    selection.charStart,
    selection.charEnd,
  );
}

function VerseNoteCard({ id, quote, body }: { id: string; quote: string; body: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(body);

  useEffect(() => {
    setDraft(body);
  }, [body]);

  return (
    <div className="mt-2 rounded-xl border border-[var(--bible-border)] bg-white/70 px-3 py-2 font-sans text-sm">
      <p className="text-xs text-[var(--bible-muted)] line-clamp-2">&ldquo;{quote}&rdquo;</p>
      {editing ? (
        <div className="mt-2 flex flex-col gap-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={2}
            className="w-full resize-y rounded-lg border border-[var(--bible-border)] bg-white px-2 py-1.5 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                const saved = updateNoteBody(id, draft);
                if (saved) setEditing(false);
              }}
              className="rounded-full bg-[var(--bible-accent)] px-3 py-1 text-xs font-semibold text-white"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(body);
                setEditing(false);
              }}
              className="rounded-full border border-[var(--bible-border)] px-3 py-1 text-xs font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-1 text-[var(--bible-ink)] whitespace-pre-wrap">{body}</p>
      )}
      {!editing ? (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-semibold text-[var(--bible-accent)]"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => removeNote(id)}
            className="text-xs font-semibold text-[var(--bible-muted)]"
          >
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function BibleChapter({ book, chapter, verse, verseEnd }: BibleChapterProps) {
  const { settings, ready, update } = useBibleSettings();
  const saved = useMemoryVerses();
  const allHighlights = useBibleHighlights();
  const allNotes = useBibleNotes();
  const [scriptureRoot, setScriptureRoot] = useState<HTMLElement | null>(null);
  const { locked, dismiss, setNoteComposing } = useBibleScriptureSelection(scriptureRoot);
  const [chapterState, setChapterState] = useState<{
    key: string;
    passage: BiblePassage | null;
    books: BibleBook[];
    error: string | null;
  } | null>(null);
  const [versions, setVersions] = useState<BibleVersion[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

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

  const requestKey = `${settings.version}:${book}:${chapter}:${reloadKey}`;

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const key = requestKey;

    Promise.all([
      getChapter(settings.version, book, chapter),
      getBooks().catch(() => [] as BibleBook[]),
    ])
      .then(([nextPassage, nextBooks]) => {
        if (cancelled) return;
        setChapterState({ key, passage: nextPassage, books: nextBooks, error: null });
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setChapterState({
          key,
          passage: null,
          books: [],
          error:
            caught instanceof BibleApiError ? caught.message : "That chapter could not be loaded.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [ready, settings.version, book, chapter, requestKey]);

  const passage = chapterState?.key === requestKey ? chapterState.passage : null;
  const books = chapterState?.key === requestKey ? chapterState.books : [];
  const error = chapterState?.key === requestKey ? chapterState.error : null;
  const loading = !ready || chapterState?.key !== requestKey;

  const chapterHighlights: BibleHighlight[] =
    passage && ready
      ? listHighlightsForChapter(allHighlights, passage.version, passage.book, passage.chapter)
      : [];

  const chapterNotes =
    passage && ready
      ? allNotes.filter(
          (row) =>
            row.version === passage.version &&
            row.book === passage.book &&
            row.chapter === passage.chapter,
        )
      : [];

  useEffect(() => {
    if (!passage || verse === null) return;
    document.getElementById(`verse-${verse}`)?.scrollIntoView({ block: "center" });
  }, [passage, verse]);

  function memorizeLine(line: string, number: number) {
    if (!passage) return;
    try {
      saveMemoryVerse({
        version: passage.version,
        versionName: versionLabel(versions, passage.version),
        book: passage.book,
        bookName: passage.bookName,
        chapter: passage.chapter,
        verse: number,
        verseEnd: number,
        reference: formatReference(passage.bookName, passage.chapter, number, number),
        text: line,
        copyright: passage.copyright,
      });
      setSaveError(null);
    } catch {
      setSaveError("Could not save that verse on this device.");
    }
  }

  function buildSpanInput(selection: ScriptureSelection) {
    if (!passage) return null;
    return {
      version: passage.version,
      book: passage.book,
      chapter: passage.chapter,
      verseStart: selection.verseStart,
      verseEnd: selection.verseEnd,
      charStart: selection.charStart,
      charEnd: selection.charEnd,
      quote: selection.quote,
    };
  }

  function memorizeSelection(selection: ScriptureSelection) {
    if (!passage) return;
    const lineAtStart =
      passage.verses[selection.verseStart - passage.verse] ?? selection.quote;
    try {
      saveMemoryVerse({
        version: passage.version,
        versionName: versionLabel(versions, passage.version),
        book: passage.book,
        bookName: passage.bookName,
        chapter: passage.chapter,
        verse: selection.verseStart,
        verseEnd: selection.verseEnd,
        reference: formatReference(
          passage.bookName,
          passage.chapter,
          selection.verseStart,
          selection.verseEnd,
        ),
        text: selection.quote,
        copyright: passage.copyright,
        id: memoryIdForSelection(passage, selection, lineAtStart),
      });
      setSaveError(null);
      dismiss();
    } catch {
      setSaveError("Could not save that passage on this device.");
    }
  }

  function highlightActiveForSelection(selection: ScriptureSelection): boolean {
    return chapterHighlights.some(
      (row) =>
        spansMatch(row, selection) ||
        row.quote === selection.quote,
    );
  }

  function toggleSelectionHighlight(selection: ScriptureSelection) {
    const input = buildSpanInput(selection);
    if (!input) return;
    toggleHighlight(input);
    dismiss();
  }

  function saveSelectionNote(selection: ScriptureSelection, body: string) {
    const input = buildSpanInput(selection);
    if (!input) return;
    try {
      upsertNote(input, body);
      dismiss();
    } catch {
      setSaveError("Could not save that note on this device.");
    }
  }

  const neighbors = passage ? neighborChapters(books, passage.book, passage.chapter) : null;
  const highlightEnd = verseEnd ?? verse;

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      {ready ? <BiblePreferences settings={settings} onChange={update} /> : null}
      {loading ? <p className="text-[var(--bible-muted)]">Loading chapter…</p> : null}
      {error ? (
        <div className="flex flex-col items-start gap-3">
          <BibleAlert>{error}</BibleAlert>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="rounded-full border border-[var(--bible-border)] bg-white px-4 py-2 font-sans text-sm font-semibold text-[var(--bible-accent)]"
          >
            Try again
          </button>
        </div>
      ) : null}
      {passage ? (
        <>
          <header>
            <h1 className="text-4xl font-extrabold sm:text-5xl">
              <span className="bible-title">
                {passage.bookName} {passage.chapter}
              </span>
            </h1>
            <p className="mt-2 font-sans text-sm text-[var(--bible-muted)]">
              {versionLabel(versions, passage.version)}
              {verse ? ` · verse ${verse} marked` : ""}
            </p>
          </header>

          <div ref={setScriptureRoot} className="flex flex-col gap-2">
            {passage.verses.map((line, index) => {
              const number = passage.verse + index;
              const highlighted =
                verse !== null && highlightEnd !== null && number >= verse && number <= highlightEnd;
              const id = memoryId(passage.version, passage.book, passage.chapter, number, number);
              const alreadySaved = saved.some((item) => item.id === id);
              const verseHighlightSlices = highlightsForVerse(chapterHighlights, number);
              const verseNotes = listNotesForVerse(chapterNotes, number);
              return (
                <article
                  key={number}
                  id={`verse-${number}`}
                  aria-current={highlighted ? "true" : undefined}
                  className={`bible-verse rounded-2xl px-3 py-3 ${
                    highlighted ? "bg-[var(--bible-highlight)]" : ""
                  }`}
                >
                  <div className="flex gap-3">
                    <span className="w-10 shrink-0 select-none pt-1 font-sans text-base font-bold text-[var(--bible-scripture-number)] tabular-nums">
                      {number}
                    </span>
                    <p
                      data-scripture
                      data-verse={number}
                      className="min-w-0 flex-1"
                      style={scriptureStyle(settings.fontScale)}
                    >
                      {renderScriptureWithMarks(line, verseHighlightSlices)}
                    </p>
                  </div>
                  {verseNotes.map((note) => (
                    <VerseNoteCard key={note.id} id={note.id} quote={note.quote} body={note.body} />
                  ))}
                  <div className="mt-2 flex justify-end select-none">
                    {alreadySaved ? (
                      <Link
                        href="/bible/memorize"
                        className="rounded-full bg-[var(--bible-success)] px-3 py-1.5 font-sans text-sm font-semibold text-white"
                      >
                        Saved
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => memorizeLine(line, number)}
                        className="rounded-full border border-[var(--bible-border)] bg-white px-3 py-1.5 font-sans text-sm font-semibold text-[var(--bible-accent)]"
                      >
                        Memorize
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {locked ? (
            <BibleSelectionBar
              rect={locked.rect}
              selection={locked.selection}
              highlightActive={highlightActiveForSelection(locked.selection)}
              onMemorize={() => memorizeSelection(locked.selection)}
              onHighlight={() => toggleSelectionHighlight(locked.selection)}
              onSaveNote={(body) => saveSelectionNote(locked.selection, body)}
              onDismiss={dismiss}
              onNoteComposingChange={setNoteComposing}
            />
          ) : null}

          {saveError ? <BibleAlert>{saveError}</BibleAlert> : null}

          <aside className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 rounded-2xl border border-[var(--bible-border)] bg-[var(--bible-glass)] px-4 py-3 shadow-lg backdrop-blur-sm">
            <BibleCopyright notice={passage.copyright} />
          </aside>

          <nav className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            {neighbors?.prev ? (
              <Link
                href={chapterPath(neighbors.prev.book, neighbors.prev.chapter)}
                className="rounded-full border border-[var(--bible-border)] bg-white px-4 py-3 text-center font-sans text-sm font-semibold text-[var(--bible-ink)]"
              >
                ← {neighbors.prev.label}
              </Link>
            ) : (
              <span />
            )}
            {neighbors?.next ? (
              <Link
                href={chapterPath(neighbors.next.book, neighbors.next.chapter)}
                className="rounded-full border border-[var(--bible-border)] bg-white px-4 py-3 text-center font-sans text-sm font-semibold text-[var(--bible-ink)]"
              >
                {neighbors.next.label} →
              </Link>
            ) : null}
          </nav>
        </>
      ) : null}
    </div>
  );
}
