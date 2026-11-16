"use client";

import { versionLabel, type BibleVersion } from "@/lib/bible";
import {
  markReaderHref,
  markReferenceLabel,
  sortHighlightsNewestFirst,
  sortNotesNewestFirst,
  type BibleHighlight,
  type BibleNote,
} from "@/lib/bible-marks";
import { useBibleHighlights, useBibleNotes } from "@/components/use-bible-marks";
import Link from "next/link";

type BibleMarksHomeProps = {
  versions: BibleVersion[];
};

function HighlightRow({
  item,
  versionName,
}: {
  item: BibleHighlight;
  versionName: string;
}) {
  return (
    <Link
      href={markReaderHref(item)}
      className="block rounded-2xl border border-[var(--bible-border)] bg-white/60 px-4 py-3 transition hover:border-[var(--bible-accent)]"
    >
      <p className="font-sans text-sm font-semibold text-[var(--bible-accent)]">
        {markReferenceLabel(item)}
        <span className="ml-2 font-normal text-[var(--bible-muted)]">{versionName}</span>
      </p>
      <p className="mt-1 font-sans text-sm text-[var(--bible-muted)] line-clamp-2">
        &ldquo;{item.quote}&rdquo;
      </p>
    </Link>
  );
}

function NoteRow({ item, versionName }: { item: BibleNote; versionName: string }) {
  return (
    <Link
      href={markReaderHref(item)}
      className="block rounded-2xl border border-[var(--bible-border)] bg-white/60 px-4 py-3 transition hover:border-[var(--bible-accent)]"
    >
      <p className="font-sans text-sm font-semibold text-[var(--bible-accent)]">
        {markReferenceLabel(item)}
        <span className="ml-2 font-normal text-[var(--bible-muted)]">{versionName}</span>
      </p>
      <p className="mt-1 font-sans text-xs text-[var(--bible-muted)] line-clamp-2">
        &ldquo;{item.quote}&rdquo;
      </p>
      <p className="mt-2 font-sans text-sm text-[var(--bible-ink)] line-clamp-3 whitespace-pre-wrap">
        {item.body}
      </p>
    </Link>
  );
}

export function BibleMarksHome({ versions }: BibleMarksHomeProps) {
  const highlights = useBibleHighlights();
  const notes = useBibleNotes();
  const sortedHighlights = sortHighlightsNewestFirst(highlights);
  const sortedNotes = sortNotesNewestFirst(notes);
  const empty = sortedHighlights.length === 0 && sortedNotes.length === 0;

  if (empty) {
    return (
      <section className="rounded-3xl border border-[var(--bible-border)] bg-[var(--bible-glass)] p-6 sm:p-8">
        <h2 className="font-sans text-xs font-bold uppercase tracking-widest text-[var(--bible-accent)]">
          My study
        </h2>
        <p className="mt-4 font-sans text-sm text-[var(--bible-muted)]">
          No highlights or notes yet. Select text in a chapter to highlight or add a note.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-[var(--bible-border)] bg-[var(--bible-glass)] p-6 sm:p-8">
      <h2 className="font-sans text-xs font-bold uppercase tracking-widest text-[var(--bible-accent)]">
        My study
      </h2>

      {sortedHighlights.length > 0 ? (
        <div className="mt-6">
          <h3 className="font-sans text-sm font-semibold text-[var(--bible-ink)]">Highlights</h3>
          <ul className="mt-3 flex flex-col gap-2">
            {sortedHighlights.map((item) => (
              <li key={item.id}>
                <HighlightRow
                  item={item}
                  versionName={versionLabel(versions, item.version)}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {sortedNotes.length > 0 ? (
        <div className={sortedHighlights.length > 0 ? "mt-8" : "mt-6"}>
          <h3 className="font-sans text-sm font-semibold text-[var(--bible-ink)]">Notes</h3>
          <ul className="mt-3 flex flex-col gap-2">
            {sortedNotes.map((item) => (
              <li key={item.id}>
                <NoteRow item={item} versionName={versionLabel(versions, item.version)} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
