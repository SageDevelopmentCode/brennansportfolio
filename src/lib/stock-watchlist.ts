import type { StockQuote } from "@/lib/stocks";
import type { SupabaseClient } from "@supabase/supabase-js";

export type FavoriteStock = {
  id: string;
  symbol: string;
  name: string;
  exchange: string | null;
  createdAt: string;
  quote?: StockQuote;
};

type FavoriteStockRow = {
  id: string;
  symbol: string;
  name: string;
  exchange: string | null;
  created_at: string;
};

function toFavoriteStock(row: FavoriteStockRow): FavoriteStock {
  return {
    id: row.id,
    symbol: row.symbol,
    name: row.name,
    exchange: row.exchange,
    createdAt: row.created_at,
  };
}

export async function getStockWatchlist(
  supabase: SupabaseClient,
): Promise<FavoriteStock[]> {
  const { data, error } = await supabase
    .from("favorite_stocks")
    .select("id, symbol, name, exchange, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toFavoriteStock);
}

export async function getStockWatchlistBySymbol(
  supabase: SupabaseClient,
  symbol: string,
): Promise<FavoriteStock | null> {
  const normalized = symbol.trim().toUpperCase();
  const { data, error } = await supabase
    .from("favorite_stocks")
    .select("id, symbol, name, exchange, created_at")
    .eq("symbol", normalized)
    .maybeSingle();

  if (error) throw error;
  return data ? toFavoriteStock(data) : null;
}

export async function isStockWatchlisted(
  supabase: SupabaseClient,
  symbol: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("favorite_stocks")
    .select("id")
    .eq("symbol", symbol.trim().toUpperCase())
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}

export type AddStockWatchlistInput = {
  symbol: string;
  name: string;
  exchange?: string | null;
};

export async function getStockWatchlistCount(
  supabase: SupabaseClient,
): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 0;

  const { count, error } = await supabase
    .from("favorite_stocks")
    .select("*", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
}

export async function getLatestStockWatchlistEntry(
  supabase: SupabaseClient,
): Promise<FavoriteStock | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("favorite_stocks")
    .select("id, symbol, name, exchange, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? toFavoriteStock(data) : null;
}
