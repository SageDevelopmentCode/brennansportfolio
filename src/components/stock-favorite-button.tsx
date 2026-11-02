"use client";

import type { AddStockWatchlistInput } from "@/lib/stock-watchlist";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type StockFavoriteButtonProps = {
  symbol: string;
  initialWatchlisted: boolean;
  favoriteData: AddStockWatchlistInput;
  isLoggedIn: boolean;
};

export function StockFavoriteButton({
  symbol,
  initialWatchlisted,
  favoriteData,
  isLoggedIn,
}: StockFavoriteButtonProps) {
  const router = useRouter();
  const [watchlisted, setWatchlisted] = useState(initialWatchlisted);
  const [loading, setLoading] = useState(false);
  const [popping, setPopping] = useState(false);

  if (!isLoggedIn) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--market-accent)] bg-[var(--market-glass)] px-5 py-2.5 text-sm font-bold text-[var(--market-accent)] backdrop-blur-sm transition hover:bg-[var(--market-accent-soft)] hover:shadow-[0_0_20px_rgba(52,211,153,0.35)]"
      >
        ☆ Log in to watch
      </Link>
    );
  }

  async function toggleWatchlist() {
    setLoading(true);
    const supabase = createClient();
    const normalized = symbol.trim().toUpperCase();

    try {
      if (watchlisted) {
        const { error } = await supabase
          .from("favorite_stocks")
          .delete()
          .eq("symbol", normalized);
        if (error) throw error;
        setWatchlisted(false);
        router.refresh();
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from("favorite_stocks").insert({
          user_id: user.id,
          symbol: favoriteData.symbol.trim().toUpperCase(),
          name: favoriteData.name,
          exchange: favoriteData.exchange ?? null,
        });
        if (error) throw error;
        setWatchlisted(true);
        setPopping(true);
        setTimeout(() => setPopping(false), 350);
        router.refresh();
      }
    } catch {
      // keep current state on error
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggleWatchlist}
      disabled={loading}
      className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition disabled:opacity-50 ${
        popping ? "animate-save-pop" : ""
      } ${
        watchlisted
          ? "bg-[var(--market-accent)] text-[var(--market-bg)] shadow-[0_0_24px_rgba(52,211,153,0.45)] hover:opacity-90"
          : "border-2 border-[var(--market-accent)] bg-[var(--market-glass)] text-[var(--market-accent)] backdrop-blur-sm hover:bg-[var(--market-accent-soft)] hover:shadow-[0_0_20px_rgba(52,211,153,0.25)]"
      }`}
    >
      {watchlisted ? "★ On watchlist" : "☆ Add to watchlist"}
    </button>
  );
}
