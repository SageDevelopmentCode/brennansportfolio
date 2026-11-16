export const BIBLE_VERSES_KEY = "bbh-verses";
export const BIBLE_SETTINGS_KEY = "bbh-settings";
export const DEFAULT_BIBLE_VERSION = "kjv";
export const FONT_SCALES = [1.35, 1.55, 1.75, 1.95] as const;

const DAY_MS = 24 * 60 * 60 * 1000;
const GOOD_INTERVAL_DAYS = [1, 3, 7];

export type BibleSettings = {
  version: string;
  fontScale: number;
};

export type MemoryVerse = {
  id: string;
  version: string;
  versionName: string;
  book: string;
  bookName: string;
  chapter: number;
  verse: number;
  verseEnd: number;
  reference: string;
  text: string;
  copyright: string;
  addedAt: string;
  correctStreak: number;
  lapses: number;
  nextReviewAt: string;
  lastResult: "good" | "again" | null;
};

export type VerseToSave = {
  version: string;
  versionName: string;
  book: string;
  bookName: string;
  chapter: number;
  verse: number;
  verseEnd: number;
  reference: string;
  text: string;
  copyright: string;
  /** Partial or cross-verse selections use a span-based id so they do not replace a full verse. */
  id?: string;
};

const DEFAULT_SETTINGS: BibleSettings = {
  version: DEFAULT_BIBLE_VERSION,
  fontScale: FONT_SCALES[1],
};

const EMPTY_VERSES: MemoryVerse[] = [];
const settingsListeners = new Set<() => void>();
const verseListeners = new Set<() => void>();
let settingsSnapshot: BibleSettings = DEFAULT_SETTINGS;
let settingsRaw: string | null | undefined;
let verseSnapshot: MemoryVerse[] = EMPTY_VERSES;
let verseRaw: string | null | undefined;

function emitSettings(): void {
  settingsListeners.forEach((listener) => listener());
}

function emitVerses(): void {
  verseListeners.forEach((listener) => listener());
}

export function memoryId(
  version: string,
  book: string,
  chapter: number,
  verse: number,
  verseEnd: number,
): string {
  return `${version}:${book}:${chapter}:${verse}-${verseEnd}`;
}

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

function normalizeSettings(value: unknown): BibleSettings {
  if (!value || typeof value !== "object") return DEFAULT_SETTINGS;
  const record = value as Partial<BibleSettings>;
  const version =
    typeof record.version === "string" && record.version.trim()
      ? record.version
      : DEFAULT_SETTINGS.version;
  const fontScale = FONT_SCALES.find((scale) => scale === record.fontScale);
  return {
    version,
    fontScale: fontScale ?? DEFAULT_SETTINGS.fontScale,
  };
}

export function loadBibleSettings(): BibleSettings {
  if (!canUseStorage()) return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(BIBLE_SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveBibleSettings(settings: BibleSettings): void {
  if (!canUseStorage()) return;
  const normalized = normalizeSettings(settings);
  const raw = JSON.stringify(normalized);
  window.localStorage.setItem(BIBLE_SETTINGS_KEY, raw);
  settingsSnapshot = normalized;
  settingsRaw = raw;
  emitSettings();
}

export function subscribeBibleSettings(listener: () => void): () => void {
  settingsListeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== BIBLE_SETTINGS_KEY) return;
    settingsRaw = undefined;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    settingsListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function getBibleSettingsSnapshot(): BibleSettings {
  try {
    const raw = window.localStorage.getItem(BIBLE_SETTINGS_KEY);
    if (raw === settingsRaw) return settingsSnapshot;
    settingsRaw = raw;
    settingsSnapshot = loadBibleSettings();
    return settingsSnapshot;
  } catch {
    return settingsSnapshot;
  }
}

export function getBibleSettingsServerSnapshot(): BibleSettings {
  return DEFAULT_SETTINGS;
}

function normalizeVerse(value: unknown): MemoryVerse | null {
  if (!value || typeof value !== "object") return null;
  const verse = value as Partial<MemoryVerse>;
  if (
    typeof verse.id !== "string" ||
    typeof verse.text !== "string" ||
    typeof verse.reference !== "string"
  ) {
    return null;
  }

  const start = typeof verse.verse === "number" ? verse.verse : 0;
  return {
    id: verse.id,
    version: verse.version ?? DEFAULT_BIBLE_VERSION,
    versionName: verse.versionName ?? "KJV",
    book: verse.book ?? "",
    bookName: verse.bookName ?? "",
    chapter: typeof verse.chapter === "number" ? verse.chapter : 0,
    verse: start,
    verseEnd: typeof verse.verseEnd === "number" ? verse.verseEnd : start,
    reference: verse.reference,
    text: verse.text,
    copyright: verse.copyright ?? "",
    addedAt: verse.addedAt ?? new Date(0).toISOString(),
    correctStreak: typeof verse.correctStreak === "number" ? verse.correctStreak : 0,
    lapses: typeof verse.lapses === "number" ? verse.lapses : 0,
    nextReviewAt: verse.nextReviewAt ?? new Date(0).toISOString(),
    lastResult:
      verse.lastResult === "good" || verse.lastResult === "again" ? verse.lastResult : null,
  };
}

function persistVerses(verses: MemoryVerse[]): void {
  if (!canUseStorage()) return;
  const raw = JSON.stringify(verses);
  window.localStorage.setItem(BIBLE_VERSES_KEY, raw);
  verseSnapshot = verses;
  verseRaw = raw;
  emitVerses();
}

export function subscribeMemoryVerses(listener: () => void): () => void {
  verseListeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== BIBLE_VERSES_KEY) return;
    verseRaw = undefined;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    verseListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function getMemoryVersesSnapshot(): MemoryVerse[] {
  try {
    const raw = window.localStorage.getItem(BIBLE_VERSES_KEY);
    if (raw === verseRaw) return verseSnapshot;
    verseRaw = raw;
    verseSnapshot = loadMemoryVerses();
    return verseSnapshot;
  } catch {
    return verseSnapshot;
  }
}

export function getMemoryVersesServerSnapshot(): MemoryVerse[] {
  return EMPTY_VERSES;
}

export function loadMemoryVerses(): MemoryVerse[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(BIBLE_VERSES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      const verse = normalizeVerse(item);
      return verse ? [verse] : [];
    });
  } catch {
    return [];
  }
}

export function saveMemoryVerse(input: VerseToSave): MemoryVerse {
  const verses = loadMemoryVerses();
  const id =
    input.id ??
    memoryId(input.version, input.book, input.chapter, input.verse, input.verseEnd);
  const existing = verses.find((verse) => verse.id === id);
  if (existing) {
    const updated: MemoryVerse = { ...existing, ...input, id };
    persistVerses(verses.map((verse) => (verse.id === id ? updated : verse)));
    return updated;
  }

  const created: MemoryVerse = {
    ...input,
    id,
    addedAt: new Date().toISOString(),
    correctStreak: 0,
    lapses: 0,
    nextReviewAt: new Date().toISOString(),
    lastResult: null,
  };
  persistVerses([created, ...verses]);
  return created;
}

export function removeMemoryVerse(id: string): void {
  persistVerses(loadMemoryVerses().filter((verse) => verse.id !== id));
}

export function gradeMemoryVerse(id: string, result: "good" | "again"): MemoryVerse | null {
  const verses = loadMemoryVerses();
  const index = verses.findIndex((verse) => verse.id === id);
  if (index < 0) return null;

  const current = verses[index];
  const now = Date.now();
  const next: MemoryVerse =
    result === "again"
      ? {
          ...current,
          correctStreak: 0,
          lapses: current.lapses + 1,
          nextReviewAt: new Date(now).toISOString(),
          lastResult: "again",
        }
      : {
          ...current,
          correctStreak: current.correctStreak + 1,
          nextReviewAt: new Date(
            now +
              GOOD_INTERVAL_DAYS[
                Math.min(current.correctStreak, GOOD_INTERVAL_DAYS.length - 1)
              ] *
                DAY_MS,
          ).toISOString(),
          lastResult: "good",
        };

  const updated = [...verses];
  updated[index] = next;
  persistVerses(updated);
  return next;
}

export function isDue(verse: MemoryVerse, now = Date.now()): boolean {
  const time = Date.parse(verse.nextReviewAt);
  return !Number.isFinite(time) || time <= now;
}

export function practiceOrder(
  verses: MemoryVerse[],
  mode: "due" | "all",
  now = Date.now(),
): MemoryVerse[] {
  const sorted = [...verses].sort(
    (a, b) => Date.parse(a.nextReviewAt) - Date.parse(b.nextReviewAt),
  );
  if (mode === "all") return sorted;
  return sorted.filter((verse) => isDue(verse, now));
}

export function countDue(verses: MemoryVerse[], now = Date.now()): number {
  return verses.filter((verse) => isDue(verse, now)).length;
}

export function reviewLabel(iso: string, now = Date.now()): string {
  const delta = Date.parse(iso) - now;
  if (!Number.isFinite(delta) || delta <= 60_000) return "Due now";
  const days = Math.ceil(delta / DAY_MS);
  if (days <= 1) return "Tomorrow";
  return `In ${days} days`;
}

export function streakLabel(verse: MemoryVerse): string {
  if (verse.correctStreak > 0) {
    return `Remembered ${verse.correctStreak} in a row`;
  }
  if (verse.lastResult === "again") return "Still learning";
  return "New";
}
