const BASE = "https://api.midvash.com/v1";

export class BibleApiError extends Error {
  code: string;
  didYouMean?: string;

  constructor(message: string, code: string, didYouMean?: string) {
    super(message);
    this.name = "BibleApiError";
    this.code = code;
    this.didYouMean = didYouMean;
  }
}

export type BiblePassage = {
  version: string;
  book: string;
  bookName: string;
  chapter: number;
  verse: number;
  verseEnd: number;
  text: string;
  verses: string[];
  reference: string;
  copyright: string;
};

export type BibleBook = {
  id: number;
  name: string;
  slug: string;
  abbrev: string;
  chapters: number;
  testament: "old" | "new";
  category: string;
};

export type BibleVersion = {
  slug: string;
  name: string;
  shortName: string;
  language: string;
};

export type ParsedReference = {
  book: string;
  chapter: number;
  verse: number | null;
  verseEnd: number | null;
  reference: string;
};

export type VerseOfTheDay = {
  reference: string;
  text: string;
  version: string;
  book: string;
  chapter: number;
  verse: number;
  verseEnd: number;
  copyright: string;
};

export type PassageBatchItem =
  | {
      ok: true;
      reference: string;
      version: string;
      book: string;
      bookName: string;
      chapter: number;
      verse: number;
      verseEnd: number;
      text: string;
      copyright: string;
    }
  | {
      ok: false;
      ref: string;
      message: string;
    };

type ErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: { didYouMean?: string };
  };
};

type Localized = string | { en?: string };

type RawPassage = {
  version?: string;
  book?: string;
  bookName?: string;
  chapter?: number;
  verse?: number;
  verseEnd?: number;
  text?: string;
  verses?: unknown;
};

type Envelope = {
  data?: unknown;
  meta?: {
    reference?: string;
    copyright?: string;
    total?: number;
  };
};

function englishLabel(value: Localized | undefined, fallback: string): string {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object" && value.en?.trim()) return value.en;
  return fallback;
}

function verseLines(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((line) => {
    if (typeof line === "string" && line.trim()) return [line];
    if (line && typeof line === "object" && "text" in line && typeof line.text === "string") {
      return [line.text];
    }
    return [];
  });
}

export function formatReference(
  bookName: string,
  chapter: number,
  verse: number,
  verseEnd: number,
): string {
  if (verseEnd > verse) return `${bookName} ${chapter}:${verse}-${verseEnd}`;
  return `${bookName} ${chapter}:${verse}`;
}

export function chapterPath(
  book: string,
  chapter: number,
  verse?: number | null,
  verseEnd?: number | null,
): string {
  const path = `/bible/read/${encodeURIComponent(book)}/${chapter}`;
  if (!verse) return path;
  const params = new URLSearchParams();
  params.set("verse", String(verse));
  if (verseEnd && verseEnd > verse) params.set("verseEnd", String(verseEnd));
  return `${path}?${params.toString()}`;
}

export function versionLabel(versions: BibleVersion[], slug: string): string {
  return versions.find((version) => version.slug === slug)?.shortName ?? slug.toUpperCase();
}

export function applyBookSuggestion(query: string, suggestion: string): string {
  const trimmed = query.trim();
  const replaced = trimmed.replace(/^(\d+\s+)?[A-Za-z][A-Za-z']*/, suggestion);
  if (replaced !== trimmed) return replaced;
  return `${suggestion} ${trimmed}`.trim();
}

export function neighborChapters(
  books: BibleBook[],
  bookSlug: string,
  chapter: number,
): {
  book: BibleBook | null;
  prev: { book: string; chapter: number; label: string } | null;
  next: { book: string; chapter: number; label: string } | null;
} {
  const index = books.findIndex((book) => book.slug === bookSlug);
  if (index < 0) return { book: null, prev: null, next: null };
  const book = books[index];
  let prev: { book: string; chapter: number; label: string } | null = null;
  let next: { book: string; chapter: number; label: string } | null = null;

  if (chapter > 1) {
    prev = {
      book: book.slug,
      chapter: chapter - 1,
      label: `${book.name} ${chapter - 1}`,
    };
  } else if (index > 0) {
    const previous = books[index - 1];
    prev = {
      book: previous.slug,
      chapter: previous.chapters,
      label: `${previous.name} ${previous.chapters}`,
    };
  }

  if (chapter < book.chapters) {
    next = {
      book: book.slug,
      chapter: chapter + 1,
      label: `${book.name} ${chapter + 1}`,
    };
  } else if (index < books.length - 1) {
    const following = books[index + 1];
    next = {
      book: following.slug,
      chapter: 1,
      label: `${following.name} 1`,
    };
  }

  return { book, prev, next };
}

async function readBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function request(path: string, params?: Record<string, string>): Promise<unknown> {
  const url = new URL(path.startsWith("http") ? path : `${BASE}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new BibleApiError(
      "The Bible service could not be reached. Check your connection and try again.",
      "NETWORK",
    );
  }

  const body = await readBody(response);
  if (!response.ok) {
    const error = (body as ErrorBody | null)?.error;
    throw new BibleApiError(
      error?.message ?? "The Bible text could not be loaded.",
      error?.code ?? "INTERNAL_ERROR",
      error?.details?.didYouMean,
    );
  }
  return body;
}

function toPassage(body: unknown): BiblePassage {
  const envelope = body as Envelope;
  const data = envelope.data as RawPassage | undefined;
  if (!data || typeof data.text !== "string" || typeof data.book !== "string") {
    throw new BibleApiError("The Bible text came back in an unexpected shape.", "BAD_RESPONSE");
  }

  const lines = verseLines(data.verses);
  const verses = lines.length > 0 ? lines : [data.text];
  const verse = typeof data.verse === "number" ? data.verse : 1;
  const verseEnd = typeof data.verseEnd === "number" ? data.verseEnd : verse + verses.length - 1;
  const bookName = data.bookName || data.book;
  const reference =
    typeof envelope.meta?.reference === "string" && envelope.meta.reference.trim()
      ? envelope.meta.reference
      : formatReference(bookName, data.chapter ?? 1, verse, verseEnd);

  return {
    version: data.version ?? "",
    book: data.book,
    bookName,
    chapter: data.chapter ?? 1,
    verse,
    verseEnd,
    text: data.text,
    verses,
    reference,
    copyright: envelope.meta?.copyright ?? "",
  };
}

function contentPath(version: string, book: string, chapter: number, verse?: string): string {
  const parts = [version, book, String(chapter)];
  if (verse) parts.push(verse);
  return `/${parts.map((part) => encodeURIComponent(part)).join("/")}`;
}

export async function getChapter(
  version: string,
  book: string,
  chapter: number,
): Promise<BiblePassage> {
  return toPassage(await request(contentPath(version, book, chapter)));
}

export async function getVerse(
  version: string,
  book: string,
  chapter: number,
  verse: string,
): Promise<BiblePassage> {
  return toPassage(await request(contentPath(version, book, chapter, verse)));
}

export async function getBooks(): Promise<BibleBook[]> {
  const body = (await request("/books")) as Envelope;
  if (!Array.isArray(body.data)) {
    throw new BibleApiError("The book list came back in an unexpected shape.", "BAD_RESPONSE");
  }

  const books: BibleBook[] = [];
  for (const item of body.data) {
    if (!item || typeof item !== "object") continue;
    const book = item as {
      id?: number;
      name?: Localized;
      slug?: Localized;
      abbrev?: Localized;
      chapters?: number;
      testament?: string;
      category?: string;
    };
    if (book.testament !== "old" && book.testament !== "new") continue;
    const slug = englishLabel(book.slug, "");
    if (!slug) continue;
    books.push({
      id: book.id ?? books.length + 1,
      name: englishLabel(book.name, slug),
      slug,
      abbrev: englishLabel(book.abbrev, slug.slice(0, 3)),
      chapters: typeof book.chapters === "number" ? book.chapters : 0,
      testament: book.testament,
      category: book.category ?? "",
    });
  }

  return books.sort((a, b) => a.id - b.id);
}

export async function getVersions(language = "en"): Promise<BibleVersion[]> {
  const body = (await request("/versions", { language })) as Envelope;
  if (!Array.isArray(body.data)) {
    throw new BibleApiError("The version list came back in an unexpected shape.", "BAD_RESPONSE");
  }

  return body.data.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const version = item as {
      slug?: string;
      name?: string;
      shortName?: string;
      language?: string;
    };
    if (!version.slug || !version.name) return [];
    return [
      {
        slug: version.slug,
        name: version.name,
        shortName: version.shortName || version.slug.toUpperCase(),
        language: version.language ?? language,
      },
    ];
  });
}

export async function parseReference(query: string): Promise<ParsedReference> {
  const q = query.trim();
  if (!q) {
    throw new BibleApiError("Type a reference such as John 3:16.", "INVALID_PARAMS");
  }

  const body = (await request("/parse", { q })) as Envelope;
  const data = body.data as {
    book_slug?: string;
    chapter?: number;
    verse_start?: number | null;
    verse_end?: number | null;
  } | undefined;

  if (!data?.book_slug || typeof data.chapter !== "number") {
    throw new BibleApiError("That reference could not be read.", "BAD_RESPONSE");
  }

  const verse = typeof data.verse_start === "number" ? data.verse_start : null;
  const verseEnd =
    verse === null
      ? null
      : typeof data.verse_end === "number"
        ? data.verse_end
        : verse;

  return {
    book: data.book_slug,
    chapter: data.chapter,
    verse,
    verseEnd,
    reference: body.meta?.reference ?? q,
  };
}

export async function getVerseOfTheDay(version: string): Promise<VerseOfTheDay> {
  const body = await request("/votd", { language: "en", version });
  if (!body || typeof body !== "object") {
    throw new BibleApiError("Today's verse came back in an unexpected shape.", "BAD_RESPONSE");
  }
  const verse = body as {
    reference?: string;
    text?: string;
    version?: string;
    book_slug?: string;
    chapter?: number;
    verse_start?: number;
    verse_end?: number;
    copyright?: string;
  };
  if (
    typeof verse.text !== "string" ||
    typeof verse.reference !== "string" ||
    typeof verse.book_slug !== "string" ||
    typeof verse.chapter !== "number" ||
    typeof verse.verse_start !== "number"
  ) {
    throw new BibleApiError("Today's verse came back in an unexpected shape.", "BAD_RESPONSE");
  }

  return {
    reference: verse.reference,
    text: verse.text,
    version: verse.version ?? version,
    book: verse.book_slug,
    chapter: verse.chapter,
    verse: verse.verse_start,
    verseEnd: verse.verse_end ?? verse.verse_start,
    copyright: verse.copyright ?? "",
  };
}

export async function getPassages(version: string, refs: string[]): Promise<PassageBatchItem[]> {
  const body = (await request("/passages", {
    version,
    refs: refs.join(","),
  })) as Envelope;
  if (!Array.isArray(body.data)) {
    throw new BibleApiError("Those passages came back in an unexpected shape.", "BAD_RESPONSE");
  }

  const copyright = body.meta?.copyright ?? "";
  return body.data.map((item) => {
    const passage = item as {
      ref?: string;
      error?: string;
      reference?: string;
      version?: string;
      book?: string;
      bookName?: string;
      chapter?: number;
      verse?: number;
      verseEnd?: number;
      text?: string;
    };
    if (passage.error || typeof passage.text !== "string") {
      return {
        ok: false as const,
        ref: passage.ref ?? "",
        message: passage.error ?? "That reference could not be loaded.",
      };
    }
    return {
      ok: true as const,
      reference: passage.reference ?? passage.ref ?? "",
      version: passage.version ?? version,
      book: passage.book ?? "",
      bookName: passage.bookName ?? "",
      chapter: passage.chapter ?? 0,
      verse: passage.verse ?? 0,
      verseEnd: passage.verseEnd ?? passage.verse ?? 0,
      text: passage.text,
      copyright,
    };
  });
}
