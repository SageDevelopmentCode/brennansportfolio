import { chapterPath, formatReference } from "@/lib/bible";

export const BIBLE_HIGHLIGHTS_KEY = "bbh-highlights";
export const BIBLE_NOTES_KEY = "bbh-notes";

export type BibleSpan = {
  id: string;
  version: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  charStart: number;
  charEnd: number;
  quote: string;
};

export type BibleHighlight = BibleSpan & {
  addedAt: string;
};

export type BibleNote = BibleSpan & {
  body: string;
  createdAt: string;
  updatedAt: string;
};

const EMPTY_HIGHLIGHTS: BibleHighlight[] = [];
const EMPTY_NOTES: BibleNote[] = [];
const highlightListeners = new Set<() => void>();
const noteListeners = new Set<() => void>();
let highlightSnapshot: BibleHighlight[] = EMPTY_HIGHLIGHTS;
let highlightRaw: string | null | undefined;
let noteSnapshot: BibleNote[] = EMPTY_NOTES;
let noteRaw: string | null | undefined;

function emitHighlights(): void {
  highlightListeners.forEach((listener) => listener());
}

function emitNotes(): void {
  noteListeners.forEach((listener) => listener());
}

export function markId(
  version: string,
  book: string,
  chapter: number,
  verseStart: number,
  verseEnd: number,
  charStart: number,
  charEnd: number,
): string {
  return `${version}:${book}:${chapter}:${verseStart}@${charStart}-${verseEnd}@${charEnd}`;
}

export function spansMatch(a: BibleSpan, b: Pick<BibleSpan, "verseStart" | "verseEnd" | "charStart" | "charEnd">): boolean {
  return (
    a.verseStart === b.verseStart &&
    a.verseEnd === b.verseEnd &&
    a.charStart === b.charStart &&
    a.charEnd === b.charEnd
  );
}

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

function normalizeHighlight(value: unknown): BibleHighlight | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<BibleHighlight>;
  if (
    typeof row.id !== "string" ||
    typeof row.version !== "string" ||
    typeof row.book !== "string" ||
    typeof row.quote !== "string"
  ) {
    return null;
  }
  const verseStart = typeof row.verseStart === "number" ? row.verseStart : 0;
  const verseEnd = typeof row.verseEnd === "number" ? row.verseEnd : verseStart;
  const charStart = typeof row.charStart === "number" ? row.charStart : 0;
  const charEnd = typeof row.charEnd === "number" ? row.charEnd : charStart;
  return {
    id: row.id,
    version: row.version,
    book: row.book,
    chapter: typeof row.chapter === "number" ? row.chapter : 0,
    verseStart,
    verseEnd,
    charStart,
    charEnd,
    quote: row.quote,
    addedAt: row.addedAt ?? new Date(0).toISOString(),
  };
}

function normalizeNote(value: unknown): BibleNote | null {
  const base = normalizeHighlight(value);
  if (!base) return null;
  const row = value as Partial<BibleNote>;
  if (typeof row.body !== "string") return null;
  const now = new Date(0).toISOString();
  return {
    ...base,
    body: row.body,
    createdAt: row.createdAt ?? now,
    updatedAt: row.updatedAt ?? row.createdAt ?? now,
  };
}

function persistHighlights(highlights: BibleHighlight[]): void {
  if (!canUseStorage()) return;
  const raw = JSON.stringify(highlights);
  window.localStorage.setItem(BIBLE_HIGHLIGHTS_KEY, raw);
  highlightSnapshot = highlights;
  highlightRaw = raw;
  emitHighlights();
}

function persistNotes(notes: BibleNote[]): void {
  if (!canUseStorage()) return;
  const raw = JSON.stringify(notes);
  window.localStorage.setItem(BIBLE_NOTES_KEY, raw);
  noteSnapshot = notes;
  noteRaw = raw;
  emitNotes();
}

export function loadHighlights(): BibleHighlight[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(BIBLE_HIGHLIGHTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      const row = normalizeHighlight(item);
      return row ? [row] : [];
    });
  } catch {
    return [];
  }
}

export function loadNotes(): BibleNote[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(BIBLE_NOTES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      const row = normalizeNote(item);
      return row ? [row] : [];
    });
  } catch {
    return [];
  }
}

export function getHighlightsSnapshot(): BibleHighlight[] {
  try {
    const raw = window.localStorage.getItem(BIBLE_HIGHLIGHTS_KEY);
    if (raw === highlightRaw) return highlightSnapshot;
    highlightRaw = raw;
    highlightSnapshot = loadHighlights();
    return highlightSnapshot;
  } catch {
    return highlightSnapshot;
  }
}

export function getNotesSnapshot(): BibleNote[] {
  try {
    const raw = window.localStorage.getItem(BIBLE_NOTES_KEY);
    if (raw === noteRaw) return noteSnapshot;
    noteRaw = raw;
    noteSnapshot = loadNotes();
    return noteSnapshot;
  } catch {
    return noteSnapshot;
  }
}

export function getHighlightsServerSnapshot(): BibleHighlight[] {
  return EMPTY_HIGHLIGHTS;
}

export function getNotesServerSnapshot(): BibleNote[] {
  return EMPTY_NOTES;
}

export function subscribeHighlights(listener: () => void): () => void {
  highlightListeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== BIBLE_HIGHLIGHTS_KEY) return;
    highlightRaw = undefined;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    highlightListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function subscribeNotes(listener: () => void): () => void {
  noteListeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== BIBLE_NOTES_KEY) return;
    noteRaw = undefined;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    noteListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function listHighlightsForChapter(
  highlights: BibleHighlight[],
  version: string,
  book: string,
  chapter: number,
): BibleHighlight[] {
  return highlights.filter(
    (row) => row.version === version && row.book === book && row.chapter === chapter,
  );
}

export function listNotesForChapter(
  notes: BibleNote[],
  version: string,
  book: string,
  chapter: number,
): BibleNote[] {
  return notes.filter((row) => row.version === version && row.book === book && row.chapter === chapter);
}

export function listNotesForVerse(notes: BibleNote[], verse: number): BibleNote[] {
  return notes.filter((row) => row.verseStart === verse);
}

export type HighlightSpanInput = Omit<BibleSpan, "id" | "addedAt"> & { id?: string };

export function toggleHighlight(input: HighlightSpanInput): boolean {
  const verses = loadHighlights();
  const id =
    input.id ??
    markId(
      input.version,
      input.book,
      input.chapter,
      input.verseStart,
      input.verseEnd,
      input.charStart,
      input.charEnd,
    );
  const existing = verses.find(
    (row) =>
      row.id === id ||
      (row.version === input.version &&
        row.book === input.book &&
        row.chapter === input.chapter &&
        spansMatch(row, input)),
  );
  if (existing) {
    persistHighlights(verses.filter((row) => row.id !== existing.id));
    return false;
  }
  const created: BibleHighlight = {
    ...input,
    id,
    addedAt: new Date().toISOString(),
  };
  persistHighlights([created, ...verses]);
  return true;
}

export function upsertNote(
  input: HighlightSpanInput,
  body: string,
  existingId?: string,
): BibleNote {
  const notes = loadNotes();
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error("Note body is empty");
  }
  const now = new Date().toISOString();
  const id =
    existingId ??
    markId(
      input.version,
      input.book,
      input.chapter,
      input.verseStart,
      input.verseEnd,
      input.charStart,
      input.charEnd,
    );
  const existing = notes.find((row) => row.id === id);
  if (existing) {
    const updated: BibleNote = { ...existing, ...input, id, body: trimmed, updatedAt: now };
    persistNotes(notes.map((row) => (row.id === id ? updated : row)));
    return updated;
  }
  const created: BibleNote = {
    ...input,
    id,
    body: trimmed,
    createdAt: now,
    updatedAt: now,
  };
  persistNotes([created, ...notes]);
  return created;
}

export function updateNoteBody(id: string, body: string): BibleNote | null {
  const trimmed = body.trim();
  if (!trimmed) return null;
  const notes = loadNotes();
  const index = notes.findIndex((row) => row.id === id);
  if (index < 0) return null;
  const now = new Date().toISOString();
  const updated: BibleNote = { ...notes[index], body: trimmed, updatedAt: now };
  const next = [...notes];
  next[index] = updated;
  persistNotes(next);
  return updated;
}

export function removeNote(id: string): void {
  persistNotes(loadNotes().filter((row) => row.id !== id));
}

export function removeHighlight(id: string): void {
  persistHighlights(loadHighlights().filter((row) => row.id !== id));
}

export type VerseHighlightSlice = {
  charStart: number;
  charEnd: number;
};

/** Highlights that touch this verse number, with offsets relative to that verse's text. */
export function highlightsForVerse(
  highlights: BibleHighlight[],
  verseNumber: number,
): VerseHighlightSlice[] {
  const slices: VerseHighlightSlice[] = [];
  for (const row of highlights) {
    if (verseNumber < row.verseStart || verseNumber > row.verseEnd) continue;
    let start = 0;
    let end = Infinity;
    if (verseNumber === row.verseStart) start = row.charStart;
    if (verseNumber === row.verseEnd && row.verseEnd === row.verseStart) {
      end = row.charEnd;
    } else if (verseNumber === row.verseEnd) {
      end = row.charEnd;
    } else if (verseNumber === row.verseStart && row.verseStart !== row.verseEnd) {
      end = Infinity;
    }
    if (Number.isFinite(end) && end <= start) continue;
    slices.push({
      charStart: start,
      charEnd: end,
    });
  }
  return mergeSlices(slices);
}

function mergeSlices(slices: VerseHighlightSlice[]): VerseHighlightSlice[] {
  if (slices.length === 0) return [];
  const sorted = [...slices].sort((a, b) => a.charStart - b.charStart);
  const merged: VerseHighlightSlice[] = [];
  let current = { ...sorted[0] };
  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    const currentEnd = current.charEnd;
    const nextEnd = next.charEnd;
    const overlap =
      currentEnd === Infinity ||
      next.charStart <= currentEnd ||
      next.charStart <= currentEnd + 1;
    if (overlap) {
      if (currentEnd === Infinity || nextEnd === Infinity) {
        current.charEnd = Infinity;
      } else {
        current.charEnd = Math.max(currentEnd, nextEnd);
      }
    } else {
      merged.push(current);
      current = { ...next };
    }
  }
  merged.push(current);
  return merged;
}

function bookNameFromSlug(slug: string): string {
  return decodeURIComponent(slug)
    .replace(/-/g, " ")
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

export function markReferenceLabel(
  mark: Pick<BibleSpan, "book" | "chapter" | "verseStart" | "verseEnd">,
): string {
  const bookName = bookNameFromSlug(mark.book);
  return formatReference(bookName, mark.chapter, mark.verseStart, mark.verseEnd);
}

export function markReaderHref(
  mark: Pick<BibleSpan, "book" | "chapter" | "verseStart" | "verseEnd">,
): string {
  return chapterPath(mark.book, mark.chapter, mark.verseStart, mark.verseEnd);
}

export function sortHighlightsNewestFirst(highlights: BibleHighlight[]): BibleHighlight[] {
  return [...highlights].sort(
    (a, b) => Date.parse(b.addedAt) - Date.parse(a.addedAt),
  );
}

export function sortNotesNewestFirst(notes: BibleNote[]): BibleNote[] {
  return [...notes].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );
}
