import {
  PAPER_STARTING_CASH,
  type PaperHolding,
  type PaperPortfolio,
} from "@/lib/stock-portfolio";
import {
  getStockHistory,
  getStockQuotesFresh,
  type StockEodBar,
} from "@/lib/stocks";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PortfolioRange = "1W" | "1M" | "1Y";

export type PortfolioEquityPoint = {
  date: string;
  equity: number;
};

export type PaperTrade = {
  id: string;
  symbol: string;
  action: "buy" | "sell";
  shares: number;
  price: number;
  name: string;
  tradedAt: string;
};

const BACKFILL_TRADED_AT = "2026-09-30T16:00:00.000Z";
const BACKFILL_PRICE_DATE = "2026-09-30";

const RANGE_CALENDAR_DAYS: Record<PortfolioRange, number> = {
  "1W": 7,
  "1M": 30,
  "1Y": 365,
};

type TradeRow = {
  id: string;
  symbol: string;
  action: string;
  shares: number;
  price: number;
  name: string;
  traded_at: string;
};

function toTrade(row: TradeRow): PaperTrade {
  return {
    id: row.id,
    symbol: row.symbol,
    action: row.action as "buy" | "sell",
    shares: row.shares,
    price: Number(row.price),
    name: row.name,
    tradedAt: row.traded_at,
  };
}

function roundCost(shares: number, price: number): number {
  return Math.round(shares * price * 100) / 100;
}

export function replayPortfolioState(
  trades: PaperTrade[],
  asOfDate: string,
): { cash: number; holdings: Map<string, number> } {
  let cash = PAPER_STARTING_CASH;
  const holdings = new Map<string, number>();

  const applicable = trades
    .filter((t) => t.tradedAt.slice(0, 10) <= asOfDate)
    .sort((a, b) => a.tradedAt.localeCompare(b.tradedAt));

  for (const trade of applicable) {
    const cost = roundCost(trade.shares, trade.price);
    if (trade.action === "buy") {
      cash -= cost;
      holdings.set(trade.symbol, (holdings.get(trade.symbol) ?? 0) + trade.shares);
    } else {
      cash += cost;
      const next = (holdings.get(trade.symbol) ?? 0) - trade.shares;
      if (next <= 0) holdings.delete(trade.symbol);
      else holdings.set(trade.symbol, next);
    }
  }

  return { cash, holdings };
}

function closeOnOrBefore(bars: StockEodBar[], date: string): number | undefined {
  let last: number | undefined;
  for (const bar of bars) {
    if (bar.date > date) break;
    last = bar.close;
  }
  return last;
}

function collectTradingDates(
  histories: Map<string, StockEodBar[]>,
  fromDate: string,
  toDate: string,
): string[] {
  const dates = new Set<string>();
  for (const bars of histories.values()) {
    for (const bar of bars) {
      if (bar.date >= fromDate && bar.date <= toDate) {
        dates.add(bar.date);
      }
    }
  }
  return [...dates].sort((a, b) => a.localeCompare(b));
}

function rangeFromDate(range: PortfolioRange): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - RANGE_CALENDAR_DAYS[range]);
  return d.toISOString().slice(0, 10);
}

function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getPaperTrades(
  supabase: SupabaseClient,
): Promise<PaperTrade[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("paper_trades")
    .select("id, symbol, action, shares, price, name, traded_at")
    .eq("user_id", user.id)
    .order("traded_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(toTrade);
}

async function closeOnBackfillDate(symbol: string): Promise<number | null> {
  try {
    const bars = await getStockHistory(symbol);
    const close = closeOnOrBefore(bars, BACKFILL_PRICE_DATE);
    return close ?? null;
  } catch {
    return null;
  }
}

/** One-time ledger rows for holdings created before paper_trades existed. */
export async function ensurePaperTradesBackfilled(
  supabase: SupabaseClient,
  holdings: PaperHolding[],
): Promise<void> {
  if (holdings.length === 0) return;

  const existing = await getPaperTrades(supabase);
  if (existing.length > 0) return;

  const payload: {
    symbol: string;
    shares: number;
    price: number;
    name: string;
    traded_at: string;
  }[] = [];

  for (const holding of holdings) {
    const price = await closeOnBackfillDate(holding.symbol);
    if (price === null) continue;
    payload.push({
      symbol: holding.symbol,
      shares: holding.shares,
      price,
      name: holding.name,
      traded_at: BACKFILL_TRADED_AT,
    });
  }

  if (payload.length === 0) return;

  const { error } = await supabase.rpc("paper_backfill_trades", {
    p_trades: payload,
  });
  if (error) throw error;
}

export async function buildPortfolioEquitySeries(
  supabase: SupabaseClient,
  range: PortfolioRange,
  portfolio: PaperPortfolio,
  holdings: PaperHolding[],
): Promise<PortfolioEquityPoint[]> {
  await ensurePaperTradesBackfilled(supabase, holdings);
  const trades = await getPaperTrades(supabase);

  const fromDate = rangeFromDate(range);
  const toDate = todayUtcDate();

  if (trades.length === 0) {
    return [{ date: toDate, equity: portfolio.cashBalance }];
  }

  const firstTradeDate = trades[0].tradedAt.slice(0, 10);
  const symbols = [...new Set(trades.map((t) => t.symbol))];

  const histories = new Map<string, StockEodBar[]>();
  await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const bars = await getStockHistory(symbol);
        histories.set(symbol, bars);
      } catch {
        histories.set(symbol, []);
      }
    }),
  );

  const tradingDates = collectTradingDates(histories, fromDate, toDate);
  const points: PortfolioEquityPoint[] = [];

  for (const date of tradingDates) {
    if (date < firstTradeDate) {
      points.push({ date, equity: PAPER_STARTING_CASH });
      continue;
    }

    const { cash, holdings: held } = replayPortfolioState(trades, date);
    let holdingsValue = 0;
    for (const [symbol, shares] of held) {
      const bars = histories.get(symbol) ?? [];
      const close = closeOnOrBefore(bars, date);
      if (close !== undefined) holdingsValue += shares * close;
    }
    points.push({ date, equity: cash + holdingsValue });
  }

  let todayEquity = portfolio.cashBalance;
  if (holdings.length > 0) {
    try {
      const quotes = await getStockQuotesFresh(holdings.map((h) => h.symbol));
      const quoteBySymbol = new Map(quotes.map((q) => [q.symbol, q]));
      const holdingsValue = holdings.reduce((sum, h) => {
        const quote = quoteBySymbol.get(h.symbol);
        return sum + (quote ? quote.price * h.shares : 0);
      }, 0);
      todayEquity = portfolio.cashBalance + holdingsValue;
    } catch {
      if (points.length > 0) {
        todayEquity = points[points.length - 1].equity;
      }
    }
  }

  const lastPoint = points[points.length - 1];
  if (!lastPoint || lastPoint.date !== toDate) {
    points.push({ date: toDate, equity: todayEquity });
  } else {
    lastPoint.equity = todayEquity;
  }

  if (points.length === 0) {
    points.push({ date: toDate, equity: todayEquity });
  }

  return points;
}
