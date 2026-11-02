"use client";

import { formatUsdPrice } from "@/lib/stocks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type StockTradePanelProps = {
  symbol: string;
  price: number;
  cashBalance: number;
  sharesOwned: number;
  totalEquity?: number;
  isLoggedIn: boolean;
};

export function StockTradePanel({
  symbol,
  price,
  cashBalance,
  sharesOwned,
  totalEquity,
  isLoggedIn,
}: StockTradePanelProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [shares, setShares] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const maxBuy = price > 0 ? Math.floor(cashBalance / price) : 0;
  const maxSell = sharesOwned;
  const maxShares = mode === "buy" ? maxBuy : maxSell;
  const cost = shares * price;

  if (!isLoggedIn) {
    return (
      <div className="market-glass-card rounded-2xl p-6">
        <h2 className="text-lg font-extrabold text-[var(--market-ink)]">
          Practice trading
        </h2>
        <p className="mt-2 text-sm text-[var(--market-muted)]">
          Start with $100,000 in pretend money and buy whole shares at the live
          price shown above.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-flex rounded-full border-2 border-[var(--market-accent)] bg-[var(--market-glass)] px-5 py-2.5 text-sm font-bold text-[var(--market-accent)]"
        >
          Log in to trade
        </Link>
      </div>
    );
  }

  async function submitTrade() {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/stocks/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: mode, symbol, shares }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Trade failed.");
        return;
      }
      setSuccess(
        mode === "buy"
          ? `Bought ${shares} share${shares === 1 ? "" : "s"} of ${symbol}.`
          : `Sold ${shares} share${shares === 1 ? "" : "s"} of ${symbol}.`,
      );
      setShares(1);
      router.refresh();
    } catch {
      setError("Trade failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="market-glass-card flex flex-col gap-4 rounded-2xl p-6">
      <div>
        <h2 className="text-lg font-extrabold text-[var(--market-ink)]">
          Practice trading
        </h2>
        <p className="mt-1 text-xs text-[var(--market-muted)]">
          Pretend money only — not real investing advice.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <p className="text-[var(--market-muted)]">
          Cash{" "}
          <span className="font-bold text-[var(--market-ink)]">
            {formatUsdPrice(cashBalance)}
          </span>
        </p>
        <p className="text-[var(--market-muted)]">
          You own{" "}
          <span className="font-bold text-[var(--market-ink)]">
            {sharesOwned} share{sharesOwned === 1 ? "" : "s"}
          </span>
        </p>
      </div>
      {totalEquity !== undefined && (
        <p className="text-sm text-[var(--market-muted)]">
          Portfolio total{" "}
          <span className="font-bold text-[var(--market-accent)]">
            {formatUsdPrice(totalEquity)}
          </span>
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setMode("buy");
            setShares(1);
            setError(null);
          }}
          className={`flex-1 rounded-full py-2 text-sm font-bold transition ${
            mode === "buy"
              ? "bg-[var(--market-accent)] text-[var(--market-bg)]"
              : "border border-[var(--market-border)] text-[var(--market-muted)]"
          }`}
        >
          Buy
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("sell");
            setShares(1);
            setError(null);
          }}
          disabled={sharesOwned === 0}
          className={`flex-1 rounded-full py-2 text-sm font-bold transition disabled:opacity-40 ${
            mode === "sell"
              ? "bg-[var(--market-down)] text-white"
              : "border border-[var(--market-border)] text-[var(--market-muted)]"
          }`}
        >
          Sell
        </button>
      </div>

      <div>
        <label htmlFor="trade-shares" className="text-sm font-semibold text-[var(--market-muted)]">
          Whole shares
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            id="trade-shares"
            type="number"
            min={1}
            max={Math.max(maxShares, 1)}
            value={shares}
            onChange={(e) => setShares(Math.max(1, Number(e.target.value) || 1))}
            className="market-input w-28"
          />
          {maxShares > 0 && (
            <button
              type="button"
              onClick={() => setShares(maxShares)}
              className="text-xs font-bold text-[var(--market-accent)] hover:underline"
            >
              Max ({maxShares})
            </button>
          )}
        </div>
        <p className="mt-2 text-sm text-[var(--market-muted)]">
          {mode === "buy" ? "Cost" : "Proceeds"}:{" "}
          <span className="font-bold text-[var(--market-ink)]">
            {formatUsdPrice(cost)}
          </span>{" "}
          at {formatUsdPrice(price)} / share
        </p>
      </div>

      <button
        type="button"
        onClick={submitTrade}
        disabled={loading || maxShares < 1 || shares > maxShares}
        className="rounded-full bg-[var(--market-accent)] py-3 text-sm font-bold text-[var(--market-bg)] disabled:opacity-50"
      >
        {loading ? "Working…" : mode === "buy" ? "Buy shares" : "Sell shares"}
      </button>

      {error && (
        <p className="text-sm font-semibold text-[var(--market-down)]">{error}</p>
      )}
      {success && (
        <p className="text-sm font-semibold text-[var(--market-up)]">{success}</p>
      )}
    </div>
  );
}
