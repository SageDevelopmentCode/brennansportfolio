import {
  PAPER_STARTING_CASH,
  type PaperPortfolioSummary,
} from "@/lib/stock-portfolio";
import { changeToneClass, formatUsdPrice } from "@/lib/stocks";
import Link from "next/link";

type StockPortfolioHeroProps = {
  summary: PaperPortfolioSummary;
  isLoggedIn: boolean;
};

export function StockPortfolioHero({
  summary,
  isLoggedIn,
}: StockPortfolioHeroProps) {
  if (!isLoggedIn) {
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

  const pl = summary.totalEquity - PAPER_STARTING_CASH;
  const plSign = pl >= 0 ? "+" : "";

  return (
    <div className="market-portfolio-hero market-glass-card mt-8 w-full max-w-4xl rounded-3xl border-2 border-[var(--market-accent)] p-8 shadow-[0_0_48px_rgba(52,211,153,0.12)] sm:p-10">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--market-muted)]">
        Your portfolio value
      </p>
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
        {formatUsdPrice(Math.abs(pl))} vs {formatUsdPrice(PAPER_STARTING_CASH)}{" "}
        start
      </p>
      <p className="mt-3 text-xs text-[var(--market-muted)]">
        Updates when you refresh or trade — total is cash plus current stock
        prices.
      </p>
    </div>
  );
}
