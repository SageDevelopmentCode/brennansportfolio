import { StockFavoriteButton } from "@/components/stock-favorite-button";
import { StockPriceChart } from "@/components/stock-price-chart";
import { StockTradePanel } from "@/components/stock-trade-panel";
import { getCurrentUsername } from "@/lib/auth";
import {
  getPortfolioSummary,
} from "@/lib/stock-portfolio";
import { isStockWatchlisted } from "@/lib/stock-watchlist";
import { createClient } from "@/lib/supabase/server";
import {
  StocksApiError,
  changeToneClass,
  formatCompactUsd,
  formatPercentChange,
  formatUsdPrice,
  getStockHistoryForPage,
  getStockQuote,
  isValidStockSymbol,
  normalizeStockSymbol,
} from "@/lib/stocks";
import Link from "next/link";
import { notFound } from "next/navigation";

type StockDetailPageProps = {
  params: Promise<{ symbol: string }>;
};

export default async function StockDetailPage({ params }: StockDetailPageProps) {
  const { symbol: rawSymbol } = await params;
  const symbol = normalizeStockSymbol(decodeURIComponent(rawSymbol));

  if (!isValidStockSymbol(symbol)) notFound();

  const supabase = await createClient();
  const currentUsername = await getCurrentUsername(supabase);

  let quote;
  try {
    quote = await getStockQuote(symbol);
  } catch (error) {
    if (
      error instanceof StocksApiError &&
      (error.code === "not_found" || error.code === "quota")
    ) {
      notFound();
    }
    throw error;
  }

  if (!quote) notFound();

  const { history, historyError } = await getStockHistoryForPage(symbol);

  const watchlisted = currentUsername
    ? await isStockWatchlisted(supabase, symbol)
    : false;

  const portfolioSummary = currentUsername
    ? await getPortfolioSummary(supabase)
    : null;
  const sharesOwned =
    portfolioSummary?.holdings.find((h) => h.symbol === symbol)?.shares ?? 0;
  const cashBalance = portfolioSummary?.cashBalance ?? 0;
  const totalEquity = portfolioSummary?.totalEquity;

  const tone = changeToneClass(quote.changesPercentage);

  return (
    <main className="market-bg relative flex flex-1 flex-col gap-10 px-4 py-8 sm:px-8 sm:py-12">
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/stocks"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--market-border)] bg-[var(--market-glass)] px-4 py-2 text-sm font-semibold text-[var(--market-accent)] backdrop-blur-sm transition hover:border-[var(--market-accent)] hover:shadow-[0_0_16px_rgba(52,211,153,0.25)]"
        >
          ← Ticker Tape
        </Link>
      </div>

      <header className="relative z-10 max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-widest text-[var(--market-muted)]">
          {quote.exchange}
        </p>
        <h1 className="mt-2 text-4xl font-extrabold text-[var(--market-ink)] sm:text-5xl">
          {symbol}
        </h1>
        <p className="mt-1 text-lg text-[var(--market-muted)]">{quote.name}</p>

        <div className="mt-6 flex flex-wrap items-end gap-4">
          <p className="text-5xl font-extrabold text-[var(--market-ink)] sm:text-6xl">
            {formatUsdPrice(quote.price)}
          </p>
          <p className={`pb-2 text-lg font-bold ${tone}`}>
            {formatUsdPrice(quote.change)} ({formatPercentChange(quote.changesPercentage)})
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="market-stat-card rounded-xl p-4">
            <p className="text-xs font-bold uppercase text-[var(--market-muted)]">
              Open
            </p>
            <p className="mt-1 font-extrabold text-[var(--market-ink)]">
              {formatUsdPrice(quote.open)}
            </p>
          </div>
          <div className="market-stat-card rounded-xl p-4">
            <p className="text-xs font-bold uppercase text-[var(--market-muted)]">
              Day range
            </p>
            <p className="mt-1 font-extrabold text-[var(--market-ink)]">
              {formatUsdPrice(quote.dayLow)} – {formatUsdPrice(quote.dayHigh)}
            </p>
          </div>
          <div className="market-stat-card rounded-xl p-4">
            <p className="text-xs font-bold uppercase text-[var(--market-muted)]">
              52-wk range
            </p>
            <p className="mt-1 font-extrabold text-[var(--market-ink)]">
              {formatUsdPrice(quote.yearLow)} – {formatUsdPrice(quote.yearHigh)}
            </p>
          </div>
          <div className="market-stat-card rounded-xl p-4">
            <p className="text-xs font-bold uppercase text-[var(--market-muted)]">
              Market cap
            </p>
            <p className="mt-1 font-extrabold text-[var(--market-ink)]">
              {quote.marketCap ? formatCompactUsd(quote.marketCap) : "—"}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <StockFavoriteButton
            symbol={symbol}
            initialWatchlisted={watchlisted}
            favoriteData={{
              symbol,
              name: quote.name,
              exchange: quote.exchange,
            }}
            isLoggedIn={currentUsername !== null}
          />
        </div>
      </header>

      <div className="relative z-10 flex w-full max-w-4xl flex-col gap-8">
        <StockTradePanel
          symbol={symbol}
          price={quote.price}
          cashBalance={cashBalance}
          sharesOwned={sharesOwned}
          totalEquity={totalEquity}
          isLoggedIn={currentUsername !== null}
        />
        <StockPriceChart
          symbol={symbol}
          initialHistory={history}
          initialError={historyError}
        />
      </div>
    </main>
  );
}
