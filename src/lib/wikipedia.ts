const WIKI_API = "https://en.wikipedia.org/w/api.php";
const WIKI_REST = "https://en.wikipedia.org/api/rest_v1";
const USER_AGENT = "brennansportfolio/1.0 (educational portfolio)";

export type WikiSearchResult = {
  title: string;
  pageId: number;
  snippet: string;
};

export type WikiSummary = {
  title: string;
  pageId: number;
  extract: string;
  thumbnailUrl?: string;
  pageUrl: string;
  description?: string;
};

type WikiSearchResponse = {
  query?: {
    search?: Array<{
      title: string;
      pageid: number;
      snippet: string;
    }>;
  };
};

type WikiSummaryResponse = {
  title: string;
  pageid?: number;
  extract?: string;
  description?: string;
  thumbnail?: {
    source: string;
  };
  content_urls?: {
    desktop?: {
      page: string;
    };
  };
};

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function fetchWikiJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    next: { revalidate: 86400 },
    headers: { "User-Agent": USER_AGENT },
  });

  if (!res.ok) {
    throw new Error(`Wikipedia request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export async function searchWikipedia(
  query: string,
  limit = 8,
): Promise<WikiSearchResult[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];

  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: normalizedQuery,
    srlimit: String(limit),
    format: "json",
    origin: "*",
  });

  const data = await fetchWikiJson<WikiSearchResponse>(
    `${WIKI_API}?${params.toString()}`,
  );

  return (data.query?.search ?? []).map((result) => ({
    title: result.title,
    pageId: result.pageid,
    snippet: stripHtml(result.snippet),
  }));
}

export async function getWikiSummary(title: string): Promise<WikiSummary | null> {
  const normalizedTitle = title.trim();
  if (!normalizedTitle) return null;

  try {
    const data = await fetchWikiJson<WikiSummaryResponse>(
      `${WIKI_REST}/page/summary/${encodeURIComponent(normalizedTitle)}`,
    );

    if (!data.extract) return null;

    return {
      title: data.title,
      pageId: data.pageid ?? 0,
      extract: data.extract,
      description: data.description,
      thumbnailUrl: data.thumbnail?.source,
      pageUrl:
        data.content_urls?.desktop?.page ??
        `https://en.wikipedia.org/wiki/${encodeURIComponent(data.title)}`,
    };
  } catch {
    return null;
  }
}
