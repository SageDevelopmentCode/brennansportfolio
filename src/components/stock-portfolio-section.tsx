import type { PaperPortfolioSummary } from "@/lib/stock-portfolio";
import { formatUsdPrice, stockDetailHref } from "@/lib/stocks";
import Link from "next/link";

type StockPortfolioSectionProps = {
  summary: PaperPortfolioSummary;
  isLoggedIn: boolean;
};

export function StockPortfolioSection({
  summary,
  isLoggedIn,
}: StockPortfolioSectionProps) {
  return (
    <section className="flex flex-col gap-5 border-t border-[var(--market-border)] pt-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-extrabold text-[var(--market-ink)]">
          Your holdings
        </h2>
      </div>

      {!isLoggedIn ? (
        <p className="text-[var(--market-muted)]">
          <Link
            href="/login"
            className="font-semibold text-[var(--market-accent)] hover:underline"
          >
            Log in
          </Link>{" "}
          to get $100,000 in pretend money and buy whole shares.
        </p>
      ) : (
        <>
          {summary.holdings.length === 0 ? (
            <div className="market-glass-card rounded-2xl border-2 border-dashed border-[var(--market-border)] px-6 py-10 text-center">
              <p className="font-semibold text-[var(--market-ink)]">
                No shares yet
              </p>
              <p className="mt-1 text-sm text-[var(--market-muted)]">
                Open a stock page and use Buy to spend your practice cash on whole
                shares.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {summary.holdings.map((holding) => (
                <Link
                  key={holding.symbol}
                  href={stockDetailHref(holding.symbol)}
                  className="market-glass-card market-card rounded-2xl p-5 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xl font-extrabold text-[var(--market-ink)]">
                        {holding.symbol}
                      </p>
                      <p className="text-sm text-[var(--market-muted)]">
                        {holding.name}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-[var(--market-accent)]">
                      {holding.shares} sh
                    </p>
                  </div>
                  {holding.marketValue !== undefined && (
                    <p className="mt-3 text-lg font-extrabold text-[var(--market-ink)]">
                      {formatUsdPrice(holding.marketValue)}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
