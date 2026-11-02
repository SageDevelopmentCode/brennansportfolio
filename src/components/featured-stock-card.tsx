"use client";

import { StockFavoriteButton } from "@/components/stock-favorite-button";
import type { FeaturedStock } from "@/lib/stocks";
import { stockDetailHref } from "@/lib/stocks";
import Link from "next/link";

type FeaturedStockCardProps = {
  stock: FeaturedStock;
  isLoggedIn: boolean;
  isWatchlisted: boolean;
};

export function FeaturedStockCard({
  stock,
  isLoggedIn,
  isWatchlisted,
}: FeaturedStockCardProps) {
  return (
    <article className="market-glass-card market-card flex flex-col gap-3 rounded-2xl p-5">
      <Link href={stockDetailHref(stock.symbol)} className="flex flex-col gap-2 transition">
        <h3 className="text-2xl font-extrabold text-[var(--market-ink)]">
          {stock.symbol}
        </h3>
        <p className="line-clamp-2 text-sm font-medium text-[var(--market-muted)]">
          {stock.name}
        </p>
        <p className="text-xs font-bold text-[var(--market-accent)]">
          View price →
        </p>
      </Link>

      <StockFavoriteButton
        symbol={stock.symbol}
        initialWatchlisted={isWatchlisted}
        favoriteData={{
          symbol: stock.symbol,
          name: stock.name,
          exchange: "US",
        }}
        isLoggedIn={isLoggedIn}
      />
    </article>
  );
}
