const BASE_URL = "https://openlibrary.org";

export type Author = {
  key: string;
  name: string;
  birthDate?: string;
  deathDate?: string;
  photoUrl?: string;
  workCount?: number;
  topWork?: string;
};

export type Work = {
  key: string;
  title: string;
  authors: string[];
  authorKeys?: string[];
  coverUrl?: string;
  coverId?: number;
  firstPublishYear?: number;
  description?: string;
};

export const FEATURED_AUTHOR_KEYS = [
  "OL26320A", // Tolkien
  "OL21594A", // Austen
  "OL19981A", // Stephen King
  "OL53810A", // Toni Morrison
  "OL23919A", // Rowling
  "OL13640A", // Hemingway
] as const;

type AuthorSearchDoc = {
  key: string;
  name: string;
  birth_date?: string;
  death_date?: string;
  work_count?: number;
  top_work?: string;
};

type AuthorDetailResponse = {
  key: string;
  name: string;
  birth_date?: string;
  death_date?: string;
  photos?: number[];
  bio?: string | { type: string; value: string };
};

type EditionSearchDoc = {
  key?: string;
  title?: string;
  cover_i?: number;
  language?: string[];
};

type WorkSearchDoc = {
  key: string;
  title: string;
  cover_i?: number;
  first_publish_year?: number;
  author_name?: string[];
  editions?: {
    docs: EditionSearchDoc[];
  };
};

type WorkDetailResponse = {
  key: string;
  title: string;
  description?: string | { type: string; value: string };
  covers?: number[];
  first_publish_date?: string;
  authors?: Array<{ author: { key: string } }>;
};

function stripKey(key: string): string {
  return key.replace(/^\//, "").split("/").pop() ?? key;
}

function authorPhotoUrl(photoId: number): string {
  return `https://covers.openlibrary.org/a/id/${photoId}-M.jpg`;
}

export function coverUrl(coverId: number): string {
  return `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
}

function resolveCoverFromSearchDoc(doc: WorkSearchDoc): number | undefined {
  const editions = doc.editions?.docs ?? [];

  for (const edition of editions) {
    if (edition.cover_i && edition.language?.includes("eng")) {
      return edition.cover_i;
    }
  }

  if (doc.cover_i) return doc.cover_i;

  for (const edition of editions) {
    if (edition.cover_i) return edition.cover_i;
  }

  return undefined;
}

async function resolveWorkCover(workKey: string): Promise<number | undefined> {
  const data = await fetchJson<{ docs: WorkSearchDoc[] }>(
    `/search.json?q=${encodeURIComponent(`key:/works/${workKey} language:eng`)}&fields=key,title,cover_i,editions,editions.cover_i,editions.language&limit=1`,
  );

  const doc = data.docs?.[0];
  if (!doc) return undefined;
  return resolveCoverFromSearchDoc(doc);
}

function parseDescription(
  description?: string | { type: string; value: string },
): string | undefined {
  if (!description) return undefined;
  if (typeof description === "string") return description;
  return description.value;
}

function parseBio(bio?: string | { type: string; value: string }): string | undefined {
  return parseDescription(bio);
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    throw new Error(`Open Library request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function searchAuthors(query: string, limit = 20): Promise<Author[]> {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  const data = await fetchJson<{ docs: AuthorSearchDoc[] }>(
    `/search/authors.json?q=${encodeURIComponent(query)}&limit=50`,
  );

  return (data.docs ?? [])
    .map((doc) => ({
      key: stripKey(doc.key),
      name: doc.name,
      birthDate: doc.birth_date,
      deathDate: doc.death_date,
      workCount: doc.work_count,
      topWork: doc.top_work,
    }))
    .filter((author) => author.name.toLowerCase().includes(normalizedQuery))
    .sort((a, b) => (b.workCount ?? 0) - (a.workCount ?? 0))
    .slice(0, limit);
}

export async function getAuthor(key: string): Promise<Author & { bio?: string }> {
  const data = await fetchJson<AuthorDetailResponse>(`/authors/${key}.json`);

  return {
    key: stripKey(data.key),
    name: data.name,
    birthDate: data.birth_date,
    deathDate: data.death_date,
    photoUrl: data.photos?.[0] ? authorPhotoUrl(data.photos[0]) : undefined,
    bio: parseBio(data.bio),
  };
}

export async function getAuthorWorks(key: string, limit = 100): Promise<Work[]> {
  const data = await fetchJson<{ docs: WorkSearchDoc[] }>(
    `/search.json?q=${encodeURIComponent(`author_key:${key} language:eng`)}&fields=key,title,cover_i,first_publish_year,author_name,editions,editions.cover_i,editions.language&limit=${limit}`,
  );

  const worksByKey = new Map<string, Work>();

  for (const doc of data.docs ?? []) {
    const workKey = stripKey(doc.key);
    const coverId = resolveCoverFromSearchDoc(doc);
    if (!coverId) continue;

    const existing = worksByKey.get(workKey);
    if (existing) continue;

    worksByKey.set(workKey, {
      key: workKey,
      title: doc.title,
      authors: doc.author_name ?? [],
      coverId,
      coverUrl: coverUrl(coverId),
      firstPublishYear: doc.first_publish_year,
    });
  }

  return Array.from(worksByKey.values());
}

export async function getWork(key: string): Promise<Work> {
  const data = await fetchJson<WorkDetailResponse>(`/works/${key}.json`);

  let coverId = data.covers?.[0];
  if (!coverId) {
    coverId = await resolveWorkCover(key);
  }

  const firstPublishYear = data.first_publish_date
    ? parseInt(data.first_publish_date.slice(0, 4), 10)
    : undefined;

  const authorKeys = (data.authors ?? []).map((a) => stripKey(a.author.key));
  const authorNames = await Promise.all(
    authorKeys.map(async (authorKey) => {
      try {
        const author = await fetchJson<{ name: string }>(`/authors/${authorKey}.json`);
        return author.name;
      } catch {
        return authorKey;
      }
    }),
  );

  return {
    key: stripKey(data.key),
    title: data.title,
    authors: authorNames,
    authorKeys,
    coverId,
    coverUrl: coverId ? coverUrl(coverId) : undefined,
    firstPublishYear: Number.isNaN(firstPublishYear) ? undefined : firstPublishYear,
    description: parseDescription(data.description),
  };
}

export async function getFeaturedAuthors(): Promise<Author[]> {
  const results = await Promise.allSettled(
    FEATURED_AUTHOR_KEYS.map((key) => getAuthor(key)),
  );
  return results
    .filter((r): r is PromiseFulfilledResult<Author & { bio?: string }> => r.status === "fulfilled")
    .map((r) => r.value);
}
