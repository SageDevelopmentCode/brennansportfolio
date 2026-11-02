import { getStockQuotes, getStockQuotesFresh, type StockQuote } from "@/lib/stocks";
import type { SupabaseClient } from "@supabase/supabase-js";

export const PAPER_STARTING_CASH = 100_000;

export type PaperPortfolio = {
  userId: string;
  cashBalance: number;
  createdAt: string;
};

export type PaperHolding = {
  symbol: string;
  shares: number;
  name: string;
};

export type PaperHoldingWithQuote = PaperHolding & {
  quote?: StockQuote;
  marketValue?: number;
};

export type PaperPortfolioSummary = {
  portfolio: PaperPortfolio | null;
  holdings: PaperHoldingWithQuote[];
  cashBalance: number;
  holdingsValue: number;
  totalEquity: number;
};

type PortfolioRow = {
  user_id: string;
  cash_balance: number;
  created_at: string;
};

type HoldingRow = {
  symbol: string;
  shares: number;
  name: string;
};

function toPortfolio(row: PortfolioRow): PaperPortfolio {
  return {
    userId: row.user_id,
    cashBalance: Number(row.cash_balance),
    createdAt: row.created_at,
  };
}

function toHolding(row: HoldingRow): PaperHolding {
  return {
    symbol: row.symbol,
    shares: row.shares,
    name: row.name,
  };
}

export async function getOrCreatePortfolio(
  supabase: SupabaseClient,
): Promise<PaperPortfolio | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existing, error: readError } = await supabase
    .from("paper_portfolios")
    .select("user_id, cash_balance, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (readError) throw readError;
  if (existing) return toPortfolio(existing);

  const { data: created, error: insertError } = await supabase
    .from("paper_portfolios")
    .insert({ user_id: user.id, cash_balance: PAPER_STARTING_CASH })
    .select("user_id, cash_balance, created_at")
    .single();

  if (insertError) throw insertError;
  return toPortfolio(created);
}

export async function getHoldings(supabase: SupabaseClient): Promise<PaperHolding[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("paper_holdings")
    .select("symbol, shares, name")
    .eq("user_id", user.id)
    .order("symbol", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(toHolding);
}

export async function getHoldingShares(
  supabase: SupabaseClient,
  symbol: string,
): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const normalized = symbol.trim().toUpperCase();
  const { data, error } = await supabase
    .from("paper_holdings")
    .select("shares")
    .eq("user_id", user.id)
    .eq("symbol", normalized)
    .maybeSingle();

  if (error) throw error;
  return data?.shares ?? 0;
}

export async function getPortfolioSummary(
  supabase: SupabaseClient,
): Promise<PaperPortfolioSummary> {
  const portfolio = await getOrCreatePortfolio(supabase);
  if (!portfolio) {
    return {
      portfolio: null,
      holdings: [],
      cashBalance: 0,
      holdingsValue: 0,
      totalEquity: 0,
    };
  }

  const holdings = await getHoldings(supabase);
  if (holdings.length === 0) {
    return {
      portfolio,
      holdings: [],
      cashBalance: portfolio.cashBalance,
      holdingsValue: 0,
      totalEquity: portfolio.cashBalance,
    };
  }

  let quotes: StockQuote[] = [];
  try {
    quotes = await getStockQuotes(holdings.map((h) => h.symbol));
  } catch {
    quotes = [];
  }

  const quoteBySymbol = new Map(quotes.map((q) => [q.symbol, q]));
  const holdingsWithQuotes: PaperHoldingWithQuote[] = holdings.map((holding) => {
    const quote = quoteBySymbol.get(holding.symbol);
    const marketValue = quote ? quote.price * holding.shares : undefined;
    return { ...holding, quote, marketValue };
  });

  const holdingsValue = holdingsWithQuotes.reduce(
    (sum, h) => sum + (h.marketValue ?? 0),
    0,
  );

  return {
    portfolio,
    holdings: holdingsWithQuotes,
    cashBalance: portfolio.cashBalance,
    holdingsValue,
    totalEquity: portfolio.cashBalance + holdingsValue,
  };
}

function buildSummaryFromQuotes(
  portfolio: PaperPortfolio,
  holdings: PaperHolding[],
  quotes: StockQuote[],
): PaperPortfolioSummary {
  const quoteBySymbol = new Map(quotes.map((q) => [q.symbol, q]));
  const holdingsWithQuotes: PaperHoldingWithQuote[] = holdings.map((holding) => {
    const quote = quoteBySymbol.get(holding.symbol);
    const marketValue = quote ? quote.price * holding.shares : undefined;
    return { ...holding, quote, marketValue };
  });

  const holdingsValue = holdingsWithQuotes.reduce(
    (sum, h) => sum + (h.marketValue ?? 0),
    0,
  );

  return {
    portfolio,
    holdings: holdingsWithQuotes,
    cashBalance: portfolio.cashBalance,
    holdingsValue,
    totalEquity: portfolio.cashBalance + holdingsValue,
  };
}

export async function getPortfolioSummaryFresh(
  supabase: SupabaseClient,
): Promise<PaperPortfolioSummary> {
  const portfolio = await getOrCreatePortfolio(supabase);
  if (!portfolio) {
    return {
      portfolio: null,
      holdings: [],
      cashBalance: 0,
      holdingsValue: 0,
      totalEquity: 0,
    };
  }

  const holdings = await getHoldings(supabase);
  if (holdings.length === 0) {
    return {
      portfolio,
      holdings: [],
      cashBalance: portfolio.cashBalance,
      holdingsValue: 0,
      totalEquity: portfolio.cashBalance,
    };
  }

  let quotes: StockQuote[] = [];
  try {
    quotes = await getStockQuotesFresh(holdings.map((h) => h.symbol));
  } catch {
    quotes = [];
  }

  return buildSummaryFromQuotes(portfolio, holdings, quotes);
}

export type PaperTradeResult = {
  ok: boolean;
  code?: string;
  cashBalance?: number;
  shares?: number;
};

export async function executePaperTrade(
  supabase: SupabaseClient,
  input: {
    action: "buy" | "sell";
    symbol: string;
    shares: number;
    price: number;
    name: string;
  },
): Promise<PaperTradeResult> {
  const { data, error } = await supabase.rpc("paper_trade", {
    p_action: input.action,
    p_symbol: input.symbol.trim().toUpperCase(),
    p_shares: input.shares,
    p_price: input.price,
    p_name: input.name,
  });

  if (error) throw error;
  return data as PaperTradeResult;
}

export function paperTradeErrorMessage(code: string | undefined): string {
  switch (code) {
    case "not_authenticated":
      return "You must be logged in to trade.";
    case "insufficient_cash":
      return "Not enough practice cash for that purchase.";
    case "insufficient_shares":
      return "You do not own enough shares to sell.";
    case "invalid_shares":
      return "Enter at least 1 whole share.";
    case "invalid_symbol":
      return "Invalid stock symbol.";
    case "invalid_price":
      return "Could not get a valid price for this trade.";
    case "invalid_action":
      return "Invalid trade action.";
    default:
      return "Trade could not be completed. Try again.";
  }
}
