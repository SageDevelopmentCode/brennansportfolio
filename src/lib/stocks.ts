import { unstable_cache } from "next/cache";

const FMP_BASE = "https://financialmodelingprep.com/stable";

const US_EXCHANGES = new Set(["NASDAQ", "NYSE", "AMEX", "NYSEARCA", "BATS"]);

export type FeaturedStock = {
  symbol: string;
  name: string;
};

/** Curated brands verified on FMP free `/quote` (402 = not on plan). Re-check: node --env-file=.env.local scripts/check-fmp-featured.mjs */
export const FEATURED_STOCKS: readonly FeaturedStock[] = [
  { symbol: "AAPL", name: "Apple" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "GOOGL", name: "Google" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "META", name: "Meta (Instagram)" },
  { symbol: "TSLA", name: "Tesla" },
  { symbol: "NFLX", name: "Netflix" },
  { symbol: "DIS", name: "Disney" },
  { symbol: "NKE", name: "Nike" },
  { symbol: "SBUX", name: "Starbucks" },
  { symbol: "KO", name: "Coca-Cola" },
  { symbol: "PEP", name: "PepsiCo" },
  { symbol: "WMT", name: "Walmart" },
  { symbol: "TGT", name: "Target" },
  { symbol: "COST", name: "Costco" },
  { symbol: "RBLX", name: "Roblox" },
  { symbol: "SNAP", name: "Snapchat" },
  { symbol: "UBER", name: "Uber" },
  { symbol: "SONY", name: "Sony (PlayStation)" },
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "AMD", name: "AMD" },
  { symbol: "INTC", name: "Intel" },
  { symbol: "BA", name: "Boeing" },
  { symbol: "F", name: "Ford" },
  { symbol: "GM", name: "General Motors" },
  { symbol: "SPY", name: "S&P 500 (ETF)" },
] as const;

/** Lower-priced US listings; verified on FMP free `/quote`. Re-check: node --env-file=.env.local scripts/check-fmp-featured.mjs */
export const PENNY_STOCKS: readonly FeaturedStock[] = [
  { symbol: "NIO", name: "NIO (EV)" },
  { symbol: "SOFI", name: "SoFi" },
  { symbol: "NOK", name: "Nokia" },
  { symbol: "RIOT", name: "Riot Platforms" },
  { symbol: "LCID", name: "Lucid Motors" },
  { symbol: "AAL", name: "American Airlines" },
  { symbol: "RIVN", name: "Rivian" },
  { symbol: "CCL", name: "Carnival" },
] as const;

export const STOCK_QUICK_PICKS = [
  "DIS",
  "NKE",
  "RBLX",
  "NFLX",
  "AAPL",
  "TSLA",
  "WMT",
  "SBUX",
  "SPY",
  "NIO",
  "SOFI",
  "RIVN",
] as const;

export type StockSymbolMatch = {
  symbol: string;
  name: string;
  exchange: string;
};

export type StockQuote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changesPercentage: number;
  previousClose: number;
  dayHigh: number;
  dayLow: number;
  yearHigh: number;
  yearLow: number;
  volume: number;
  marketCap: number | null;
  exchange: string;
  open: number;
};

export type StockWithQuote = StockSymbolMatch & {
  quote: StockQuote;
};

export type StockEodBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export class StocksApiError extends Error {
  constructor(
    message: string,
    readonly code: "config" | "quota" | "not_found" | "upstream",
  ) {
    super(message);
    this.name = "StocksApiError";
  }
}

export function getFmpApiKey(): string {
  const key = process.env.FMP_API_KEY?.trim();
  if (!key) {
    throw new StocksApiError(
      "Stock data is not configured. Add FMP_API_KEY to your environment.",
      "config",
    );
  }
  return key;
}

export function normalizeStockSymbol(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidStockSymbol(symbol: string): boolean {
  return /^[A-Z]{1,5}(\.[A-Z]{1,2})?$/.test(symbol);
}

export function stockDetailHref(symbol: string): string {
  return `/stocks/${encodeURIComponent(normalizeStockSymbol(symbol))}`;
}

function isUsListing(exchangeShortName: string | undefined): boolean {
  if (!exchangeShortName) return false;
  const upper = exchangeShortName.toUpperCase();
  if (US_EXCHANGES.has(upper)) return true;
  return upper.includes("NASDAQ") || upper.includes("NYSE");
}

type FmpSearchRow = {
  symbol?: string;
  name?: string;
  exchangeShortName?: string;
  exchange?: string;
  currency?: string;
};

function exchangeFromSearchRow(row: FmpSearchRow): string | undefined {
  return row.exchangeShortName ?? row.exchange;
}

type FmpQuoteRow = {
  symbol?: string;
  name?: string;
  price?: number;
  change?: number;
  changesPercentage?: number;
  changePercentage?: number;
  previousClose?: number;
  dayHigh?: number;
  dayLow?: number;
  yearHigh?: number;
  yearLow?: number;
  volume?: number;
  marketCap?: number;
  exchange?: string;
  open?: number;
};

type FmpEodRow = {
  date?: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
};

function messageFromFmpBody(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "Could not load market data.";
  return trimmed.slice(0, 300);
}

function fmpErrorCodeFromMessage(message: string): StocksApiError["code"] {
  if (/limit|quota|bandwidth|premium|402/i.test(message)) return "quota";
  return "upstream";
}

async function fmpFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const apiKey = getFmpApiKey();
  const url = new URL(`${FMP_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("apikey", apiKey);

  const res = await fetch(url.toString(), {
    next: { revalidate: 0 },
  });

  const text = await res.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    // #region agent log
    fetch("http://127.0.0.1:7380/ingest/87f3419d-18bb-4b16-a6a8-dcdb1c7d5c46", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "69d501",
      },
      body: JSON.stringify({
        sessionId: "69d501",
        runId: "pre-fix",
        hypothesisId: "H1",
        location: "stocks.ts:fmpFetch:jsonParse",
        message: "FMP non-JSON body",
        data: {
          path,
          status: res.status,
          ok: res.ok,
          textLen: text.length,
          textPrefix: text.trim().slice(0, 120),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    const message = messageFromFmpBody(text);
    throw new StocksApiError(message, fmpErrorCodeFromMessage(message));
  }

  if (!res.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "Error Message" in payload &&
      typeof (payload as { "Error Message": unknown })["Error Message"] === "string"
        ? (payload as { "Error Message": string })["Error Message"]
        : text.trim().slice(0, 200) || "Could not load market data.";
    if (/limit|quota|bandwidth|premium/i.test(message)) {
      throw new StocksApiError(message, "quota");
    }
    throw new StocksApiError(message, "upstream");
  }

  if (
    typeof payload === "object" &&
    payload !== null &&
    "Error Message" in payload
  ) {
    const message = String((payload as { "Error Message": string })["Error Message"]);
    if (/limit|quota|bandwidth|premium/i.test(message)) {
      throw new StocksApiError(message, "quota");
    }
    throw new StocksApiError(message, "upstream");
  }

  return payload as T;
}

function toSymbolMatch(row: FmpSearchRow): StockSymbolMatch | null {
  if (!row.symbol || !row.name) return null;
  const listingExchange = exchangeFromSearchRow(row);
  if (!isUsListing(listingExchange)) return null;
  if (row.currency && row.currency !== "USD") return null;
  return {
    symbol: normalizeStockSymbol(row.symbol),
    name: row.name,
    exchange: listingExchange ?? "US",
  };
}

function toQuote(row: FmpQuoteRow): StockQuote | null {
  if (!row.symbol || typeof row.price !== "number") return null;
  return {
    symbol: normalizeStockSymbol(row.symbol),
    name: row.name ?? row.symbol,
    price: row.price,
    change: row.change ?? 0,
    changesPercentage: row.changesPercentage ?? row.changePercentage ?? 0,
    previousClose: row.previousClose ?? row.price,
    dayHigh: row.dayHigh ?? row.price,
    dayLow: row.dayLow ?? row.price,
    yearHigh: row.yearHigh ?? row.price,
    yearLow: row.yearLow ?? row.price,
    volume: row.volume ?? 0,
    marketCap: typeof row.marketCap === "number" ? row.marketCap : null,
    exchange: row.exchange ?? "US",
    open: row.open ?? row.price,
  };
}

function toEodBar(row: FmpEodRow): StockEodBar | null {
  if (!row.date || typeof row.close !== "number") return null;
  return {
    date: row.date,
    open: row.open ?? row.close,
    high: row.high ?? row.close,
    low: row.low ?? row.close,
    close: row.close,
    volume: row.volume ?? 0,
  };
}

async function searchSymbolsUncached(query: string, limit: number): Promise<StockSymbolMatch[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const rows = await fmpFetch<FmpSearchRow[]>("/search-symbol", {
    query: trimmed,
  });

  const matches: StockSymbolMatch[] = [];
  const seen = new Set<string>();

  for (const row of rows ?? []) {
    const match = toSymbolMatch(row);
    if (!match || seen.has(match.symbol)) continue;
    seen.add(match.symbol);
    matches.push(match);
    if (matches.length >= limit) break;
  }

  if (matches.length >= limit) return matches;

  const exactSymbol = normalizeStockSymbol(trimmed);
  if (matches.some((m) => m.symbol === exactSymbol)) {
    return matches;
  }

  const nameRows = await fmpFetch<FmpSearchRow[]>("/search-name", {
    query: trimmed,
  });

  for (const row of nameRows ?? []) {
    const match = toSymbolMatch(row);
    if (!match || seen.has(match.symbol)) continue;
    seen.add(match.symbol);
    matches.push(match);
    if (matches.length >= limit) break;
  }

  return matches;
}

async function fetchQuoteUncached(symbol: string): Promise<StockQuote | null> {
  const normalized = normalizeStockSymbol(symbol);
  try {
    const rows = await fmpFetch<FmpQuoteRow[]>("/quote", { symbol: normalized });
    const list = Array.isArray(rows) ? rows : rows ? [rows] : [];
    const quote = list.map(toQuote).find((q): q is StockQuote => q !== null);
    return quote ?? null;
  } catch (error) {
    if (error instanceof StocksApiError && error.code === "quota") {
      // #region agent log
      fetch("http://127.0.0.1:7380/ingest/87f3419d-18bb-4b16-a6a8-dcdb1c7d5c46", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "69d501",
        },
        body: JSON.stringify({
          sessionId: "69d501",
          runId: "post-fix",
          hypothesisId: "H6",
          location: "stocks.ts:fetchQuoteUncached",
          message: "quote skipped not on free plan",
          data: { symbol: normalized },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      return null;
    }
    throw error;
  }
}

async function fetchHistoryUncached(symbol: string): Promise<StockEodBar[]> {
  const normalized = normalizeStockSymbol(symbol);
  const end = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - 5);

  const from = start.toISOString().slice(0, 10);
  const to = end.toISOString().slice(0, 10);

  const rows = await fmpFetch<FmpEodRow[]>("/historical-price-eod/full", {
    symbol: normalized,
    from,
    to,
  });

  const bars = (rows ?? [])
    .map(toEodBar)
    .filter((bar): bar is StockEodBar => bar !== null);

  bars.sort((a, b) => a.date.localeCompare(b.date));
  return bars;
}

function cachedSearch(query: string, limit: number) {
  return unstable_cache(
    async () => searchSymbolsUncached(query, limit),
    ["fmp-search-v2", query.toLowerCase(), String(limit)],
    { revalidate: 120 },
  )();
}

const QUOTE_CACHE_SECONDS = 900;

function cachedQuoteForSymbol(symbol: string) {
  const normalized = normalizeStockSymbol(symbol);
  return unstable_cache(
    async () => fetchQuoteUncached(normalized),
    ["fmp-quote-v4", normalized],
    { revalidate: QUOTE_CACHE_SECONDS },
  )();
}

function cachedHistory(symbol: string) {
  const normalized = normalizeStockSymbol(symbol);
  return unstable_cache(
    async () => fetchHistoryUncached(normalized),
    ["fmp-history", normalized],
    { revalidate: 900 },
  )();
}

export async function searchUsStocks(
  query: string,
  limit = 8,
): Promise<StockSymbolMatch[]> {
  return cachedSearch(query, limit);
}

export async function getStockQuotes(symbols: string[]): Promise<StockQuote[]> {
  const normalized = [...new Set(symbols.map(normalizeStockSymbol))].filter(Boolean);
  if (normalized.length === 0) return [];

  const quotes = await Promise.all(normalized.map((symbol) => cachedQuoteForSymbol(symbol)));
  return quotes.filter((quote): quote is StockQuote => quote !== null);
}

/** Live quotes for portfolio refresh (bypasses Next.js quote cache). */
export async function getStockQuotesFresh(symbols: string[]): Promise<StockQuote[]> {
  const normalized = [...new Set(symbols.map(normalizeStockSymbol))].filter(Boolean);
  if (normalized.length === 0) return [];

  const quotes = await Promise.all(
    normalized.map((symbol) => fetchQuoteUncached(symbol)),
  );
  return quotes.filter((quote): quote is StockQuote => quote !== null);
}

export async function getStockQuote(symbol: string): Promise<StockQuote | null> {
  const quotes = await getStockQuotes([symbol]);
  const normalized = normalizeStockSymbol(symbol);
  return quotes.find((q) => q.symbol === normalized) ?? null;
}

export async function getStockHistory(symbol: string): Promise<StockEodBar[]> {
  if (!isValidStockSymbol(normalizeStockSymbol(symbol))) {
    throw new StocksApiError("Invalid stock symbol.", "not_found");
  }
  const bars = await cachedHistory(symbol);
  if (bars.length === 0) {
    throw new StocksApiError("No price history found for this symbol.", "not_found");
  }
  return bars;
}

/** Loads chart history when available; never throws (detail page can still render quote/trade). */
export async function getStockHistoryForPage(
  symbol: string,
): Promise<{ history: StockEodBar[]; historyError: string | null }> {
  try {
    const history = await getStockHistory(symbol);
    // #region agent log
    fetch("http://127.0.0.1:7380/ingest/87f3419d-18bb-4b16-a6a8-dcdb1c7d5c46", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "69d501",
      },
      body: JSON.stringify({
        sessionId: "69d501",
        runId: "pre-fix",
        hypothesisId: "H4",
        location: "stocks.ts:getStockHistoryForPage",
        message: "history loaded",
        data: { symbol: normalizeStockSymbol(symbol), barCount: history.length },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return { history, historyError: null };
  } catch (error) {
    const message =
      error instanceof StocksApiError
        ? error.message
        : "Could not load price history.";
    // #region agent log
    fetch("http://127.0.0.1:7380/ingest/87f3419d-18bb-4b16-a6a8-dcdb1c7d5c46", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "69d501",
      },
      body: JSON.stringify({
        sessionId: "69d501",
        runId: "pre-fix",
        hypothesisId: "H4",
        location: "stocks.ts:getStockHistoryForPage:catch",
        message: "history failed soft",
        data: {
          symbol: normalizeStockSymbol(symbol),
          code: error instanceof StocksApiError ? error.code : "unknown",
          errorMessage: message.slice(0, 120),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return { history: [], historyError: message };
  }
}

export async function attachQuotesToMatches(
  matches: StockSymbolMatch[],
): Promise<StockWithQuote[]> {
  if (matches.length === 0) return [];
  const quotes = await getStockQuotes(matches.map((m) => m.symbol));
  const quoteBySymbol = new Map(quotes.map((q) => [q.symbol, q]));

  const withQuotes: StockWithQuote[] = [];
  for (const match of matches) {
    const quote = quoteBySymbol.get(match.symbol);
    if (!quote) continue;
    withQuotes.push({ ...match, quote });
  }
  return withQuotes;
}

export function getFeaturedStocks(): FeaturedStock[] {
  return [...FEATURED_STOCKS];
}

export function getPennyStocks(): FeaturedStock[] {
  return [...PENNY_STOCKS];
}

export function formatUsdPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCompactUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPercentChange(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function changeToneClass(value: number): string {
  if (value > 0) return "text-[var(--market-up)]";
  if (value < 0) return "text-[var(--market-down)]";
  return "text-[var(--market-muted)]";
}
