"use client";

import { StockCard } from "@/components/stock-card";
import type { FavoriteStock } from "@/lib/stock-watchlist";
import type { StockWithQuote } from "@/lib/stocks";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type StockWatchlistSectionProps = {
  favorites: FavoriteStock[];
  isLoggedIn: boolean;
};

function toStockWithQuote(favorite: FavoriteStock): StockWithQuote | null {
  if (!favorite.quote) return null;
  return {
    symbol: favorite.symbol,
    name: favorite.name,
    exchange: favorite.exchange ?? "US",
    quote: favorite.quote,
  };
}

export function StockWatchlistSection({
  favorites,
  isLoggedIn,
}: StockWatchlistSectionProps) {
  const router = useRouter();
  const [items, setItems] = useState(favorites);
  const [removing, setRemoving] = useState<string | null>(null);

  async function handleRemove(symbol: string) {
    setRemoving(symbol);
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from("favorite_stocks")
        .delete()
        .eq("symbol", symbol);
      if (error) throw error;
      setItems((current) => current.filter((f) => f.symbol !== symbol));
      router.refresh();
    } catch {
      // keep current state on error
    } finally {
      setRemoving(null);
    }
  }

  const stocksWithQuotes = items
    .map(toStockWithQuote)
    .filter((stock): stock is StockWithQuote => stock !== null);

  return (
    <section className="flex flex-col gap-5 border-t border-[var(--market-border)] pt-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-extrabold text-[var(--market-ink)]">
          Your watchlist
        </h2>
        {isLoggedIn && (
          <span className="rounded-full bg-[var(--market-accent-soft)] px-4 py-1.5 text-sm font-bold text-[var(--market-accent)] ring-1 ring-[var(--market-border)]">
            {items.length} saved
          </span>
        )}
      </div>

      {!isLoggedIn ? (
        <p className="text-[var(--market-muted)]">
          <Link
            href="/login"
            className="font-semibold text-[var(--market-accent)] hover:underline"
          >
            Log in
          </Link>{" "}
          to save tickers you want to track.
        </p>
      ) : items.length === 0 ? (
        <div className="market-glass-card rounded-2xl border-2 border-dashed border-[var(--market-border)] px-6 py-10 text-center">
          <p className="text-4xl opacity-60" aria-hidden>
            📈
          </p>
          <p className="mt-4 font-semibold text-[var(--market-ink)]">
            No tickers on your watchlist yet
          </p>
          <p className="mt-1 text-sm text-[var(--market-muted)]">
            Search above and tap add to watchlist.
          </p>
        </div>
      ) : stocksWithQuotes.length === 0 ? (
        <p className="text-sm text-[var(--market-muted)]">
          Saved tickers could not load live prices right now. Try refreshing in a
          moment.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {stocksWithQuotes.map((stock) => (
            <div key={stock.symbol} className="group relative">
              <StockCard
                stock={stock}
                isLoggedIn={isLoggedIn}
                isWatchlisted={true}
                showFavoriteButton={false}
              />
              <button
                type="button"
                onClick={() => handleRemove(stock.symbol)}
                disabled={removing === stock.symbol}
                className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--market-accent)] text-sm font-bold text-[var(--market-bg)] opacity-0 shadow-lg transition group-hover:opacity-100 disabled:opacity-50"
                aria-label={`Remove ${stock.symbol} from watchlist`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
