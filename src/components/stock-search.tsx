"use client";

import { FeaturedStockCard } from "@/components/featured-stock-card";
import { StockCard } from "@/components/stock-card";
import { STOCK_QUICK_PICKS, type FeaturedStock, type StockWithQuote } from "@/lib/stocks";
import { useEffect, useState } from "react";

type StockSearchProps = {
  featuredStocks: FeaturedStock[];
  pennyStocks: FeaturedStock[];
  watchlistedSymbols: string[];
  isLoggedIn: boolean;
};

function SearchSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          className="market-skeleton flex h-48 rounded-2xl"
          aria-hidden
        />
      ))}
    </div>
  );
}

export function StockSearch({
  featuredStocks,
  pennyStocks,
  watchlistedSymbols,
  isLoggedIn,
}: StockSearchProps) {
  const [query, setQuery] = useState("");
  const [stocks, setStocks] = useState<StockWithQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setStocks([]);
      setSearched(false);
      setError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/stocks/search?q=${encodeURIComponent(query)}`,
        );
        const data = await res.json();
        if (!res.ok) {
          setStocks([]);
          setError(data.error ?? "Search failed.");
          setSearched(true);
          return;
        }
        setStocks(data.stocks ?? []);
        setSearched(true);
      } catch {
        setStocks([]);
        setError("Could not search. Try again.");
        setSearched(true);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const showFeatured = !query.trim() && !loading;
  const watchlistSet = new Set(watchlistedSymbols);

  return (
    <section className="flex flex-col gap-6">
      <div>
        <label htmlFor="stock-search" className="sr-only">
          Search US stocks
        </label>
        <input
          id="stock-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by ticker or company name…"
          className="market-input w-full"
          autoComplete="off"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {STOCK_QUICK_PICKS.map((symbol) => (
          <button
            key={symbol}
            type="button"
            onClick={() => setQuery(symbol)}
            className="rounded-full border border-[var(--market-border)] bg-[var(--market-glass)] px-4 py-1.5 text-sm font-bold text-[var(--market-accent)] transition hover:border-[var(--market-accent)] hover:bg-[var(--market-accent-soft)]"
          >
            {symbol}
          </button>
        ))}
      </div>

      {loading && <SearchSkeleton />}

      {error && !loading && (
        <p className="rounded-xl border border-[var(--market-down)]/30 bg-[var(--market-down)]/10 px-4 py-3 text-sm font-semibold text-[var(--market-down)]">
          {error}
        </p>
      )}

      {showFeatured && (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-extrabold text-[var(--market-ink)]">
              Featured tickers
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {featuredStocks.map((stock) => (
                <FeaturedStockCard
                  key={stock.symbol}
                  stock={stock}
                  isLoggedIn={isLoggedIn}
                  isWatchlisted={watchlistSet.has(stock.symbol)}
                />
              ))}
            </div>
          </div>
          {pennyStocks.length > 0 ? (
            <div className="flex flex-col gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-[var(--market-ink)]">
                  Penny picks
                </h2>
                <p className="mt-1 text-sm text-[var(--market-muted)]">
                  Lower share prices — still real US listings.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {pennyStocks.map((stock) => (
                  <FeaturedStockCard
                    key={stock.symbol}
                    stock={stock}
                    isLoggedIn={isLoggedIn}
                    isWatchlisted={watchlistSet.has(stock.symbol)}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {!loading && query.trim() && searched && stocks.length === 0 && !error && (
        <p className="text-[var(--market-muted)]">
          No US listings matched &ldquo;{query}&rdquo;.
        </p>
      )}

      {!loading && stocks.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {stocks.map((stock) => (
            <StockCard
              key={stock.symbol}
              stock={stock}
              isLoggedIn={isLoggedIn}
              isWatchlisted={watchlistSet.has(stock.symbol)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
