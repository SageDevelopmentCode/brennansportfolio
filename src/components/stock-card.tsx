"use client";

import { StockFavoriteButton } from "@/components/stock-favorite-button";
import type { AddStockWatchlistInput } from "@/lib/stock-watchlist";
import type { StockWithQuote } from "@/lib/stocks";
import {
  changeToneClass,
  formatPercentChange,
  formatUsdPrice,
  stockDetailHref,
} from "@/lib/stocks";
import Link from "next/link";

type StockCardProps = {
  stock: StockWithQuote;
  isLoggedIn: boolean;
  isWatchlisted: boolean;
  showFavoriteButton?: boolean;
};

export function StockCard({
  stock,
  isLoggedIn,
  isWatchlisted,
  showFavoriteButton = true,
}: StockCardProps) {
  const favoriteData: AddStockWatchlistInput = {
    symbol: stock.symbol,
    name: stock.name,
    exchange: stock.exchange,
  };

  const { quote } = stock;
  const tone = changeToneClass(quote.changesPercentage);

  return (
    <article className="market-glass-card market-card flex flex-col gap-4 rounded-2xl p-5">
      <Link href={stockDetailHref(stock.symbol)} className="flex flex-col gap-4 transition">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-xl font-extrabold text-[var(--market-ink)]">
              {stock.symbol}
            </h3>
            <p className="mt-0.5 truncate text-sm font-medium text-[var(--market-muted)]">
              {stock.name}
            </p>
          </div>
          <span className="rounded-md bg-[var(--market-accent-soft)] px-2 py-1 text-xs font-bold uppercase text-[var(--market-accent)]">
            {stock.exchange}
          </span>
        </div>

        <div>
          <p className="text-5xl font-extrabold leading-none text-[var(--market-ink)]">
            {formatUsdPrice(quote.price)}
          </p>
          <p className={`mt-1 text-sm font-bold ${tone}`}>
            {formatUsdPrice(quote.change)} ({formatPercentChange(quote.changesPercentage)})
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-[var(--market-muted)]">
          <p>
            Open{" "}
            <span className="text-[var(--market-ink)]">
              {formatUsdPrice(quote.open)}
            </span>
          </p>
          <p>
            Prev close{" "}
            <span className="text-[var(--market-ink)]">
              {formatUsdPrice(quote.previousClose)}
            </span>
          </p>
        </div>
      </Link>

      {showFavoriteButton && (
        <StockFavoriteButton
          symbol={stock.symbol}
          initialWatchlisted={isWatchlisted}
          favoriteData={favoriteData}
          isLoggedIn={isLoggedIn}
        />
      )}
    </article>
  );
}
