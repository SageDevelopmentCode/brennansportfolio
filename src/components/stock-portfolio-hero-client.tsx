"use client";

import {
  PAPER_STARTING_CASH,
  type PaperPortfolioSummary,
} from "@/lib/stock-portfolio";
import { changeToneClass, formatUsdPrice } from "@/lib/stocks";
import Link from "next/link";
import { useState } from "react";

type StockPortfolioHeroClientProps = {
  initialSummary: PaperPortfolioSummary;
};

export function StockPortfolioHeroClient({
  initialSummary,
}: StockPortfolioHeroClientProps) {
  const [summary, setSummary] = useState(initialSummary);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [previousEquity, setPreviousEquity] = useState<number | null>(null);
  const [flashTone, setFlashTone] = useState<"up" | "down" | null>(null);

  const pl = summary.totalEquity - PAPER_STARTING_CASH;
  const plSign = pl >= 0 ? "+" : "";
  const sinceUpdate =
    previousEquity !== null ? summary.totalEquity - previousEquity : null;

  async function updateValue() {
    setLoading(true);
    setError(null);
    setFlashTone(null);
    const before = summary.totalEquity;
    try {
      const res = await fetch("/api/stocks/portfolio/summary");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not update value.");
        return;
      }
      const next = data.summary as PaperPortfolioSummary;
      setPreviousEquity(before);
      setSummary(next);
      setLastUpdated(new Date());
      if (next.totalEquity > before) setFlashTone("up");
      else if (next.totalEquity < before) setFlashTone("down");
    } catch {
      setError("Could not update value.");
    } finally {
      setLoading(false);
    }
  }

  if (!summary.portfolio) {
    return (
      <div className="market-portfolio-hero market-glass-card mt-8 rounded-3xl border-2 border-[var(--market-border)] p-8 text-center sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--market-muted)]">
          Practice portfolio
        </p>
        <p className="market-title-glow mt-3 text-5xl font-extrabold sm:text-6xl">
          {formatUsdPrice(PAPER_STARTING_CASH)}
        </p>
        <p className="mt-4 text-sm text-[var(--market-muted)]">
          <Link
            href="/login"
            className="font-bold text-[var(--market-accent)] hover:underline"
          >
            Log in
          </Link>{" "}
          to track your total as you buy stocks — cash plus live stock prices.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`market-portfolio-hero market-glass-card mt-8 w-full max-w-4xl rounded-3xl border-2 border-[var(--market-accent)] p-8 shadow-[0_0_48px_rgba(52,211,153,0.12)] transition-shadow sm:p-10 ${
        flashTone === "up"
          ? "shadow-[0_0_56px_rgba(52,211,153,0.28)]"
          : flashTone === "down"
            ? "shadow-[0_0_56px_rgba(248,113,113,0.2)]"
            : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--market-muted)]">
          Your portfolio value
        </p>
        <button
          type="button"
          onClick={updateValue}
          disabled={loading}
          className="rounded-full border-2 border-[var(--market-accent)] bg-[var(--market-glass)] px-4 py-2 text-xs font-bold text-[var(--market-accent)] transition hover:bg-[var(--market-accent-soft)] disabled:opacity-50"
        >
          {loading ? "Updating…" : "Update value"}
        </button>
      </div>
      <p className="market-title-glow mt-2 text-5xl font-extrabold leading-none sm:text-6xl md:text-7xl">
        {formatUsdPrice(summary.totalEquity)}
      </p>
      <p className="mt-4 text-base font-semibold text-[var(--market-ink)] sm:text-lg">
        {formatUsdPrice(summary.cashBalance)} cash
        <span className="mx-2 text-[var(--market-muted)]">·</span>
        {formatUsdPrice(summary.holdingsValue)} in stocks
      </p>
      <p className={`mt-2 text-sm font-bold ${changeToneClass(pl)}`}>
        {plSign}
        {formatUsdPrice(Math.abs(pl))} vs {formatUsdPrice(PAPER_STARTING_CASH)} start
      </p>
      {sinceUpdate !== null && sinceUpdate !== 0 && (
        <p className={`mt-1 text-sm font-semibold ${changeToneClass(sinceUpdate)}`}>
          {sinceUpdate >= 0 ? "+" : ""}
          {formatUsdPrice(sinceUpdate)} since last update
        </p>
      )}
      <p className="mt-3 text-xs text-[var(--market-muted)]">
        {lastUpdated
          ? `Last updated ${lastUpdated.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} — cash plus current stock prices.`
          : "Tap Update value for the latest prices — total is cash plus current stock prices."}
      </p>
      {error && (
        <p className="mt-2 text-sm font-semibold text-[var(--market-down)]">{error}</p>
      )}
    </div>
  );
}
