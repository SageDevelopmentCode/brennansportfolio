import { StockPortfolioChart } from "@/components/stock-portfolio-chart";
import { StockPortfolioHero } from "@/components/stock-portfolio-hero";
import { StockPortfolioHeroClient } from "@/components/stock-portfolio-hero-client";
import { StockPortfolioSection } from "@/components/stock-portfolio-section";
import { StockSearch } from "@/components/stock-search";
import { StockWatchlistSection } from "@/components/stock-watchlist-section";
import { getCurrentUsername } from "@/lib/auth";
import { getPortfolioSummary } from "@/lib/stock-portfolio";
import { getStockWatchlist } from "@/lib/stock-watchlist";
import { createClient } from "@/lib/supabase/server";
import {
  getFeaturedStocks,
  getPennyStocks,
  getStockQuotes,
} from "@/lib/stocks";
import Link from "next/link";

async function enrichWatchlistWithQuotes(
  favorites: Awaited<ReturnType<typeof getStockWatchlist>>,
) {
  if (favorites.length === 0) return favorites;
  try {
    const quotes = await getStockQuotes(favorites.map((f) => f.symbol));
    const quoteBySymbol = new Map(quotes.map((q) => [q.symbol, q]));
    return favorites.map((favorite) => ({
      ...favorite,
      quote: quoteBySymbol.get(favorite.symbol),
    }));
  } catch {
    return favorites;
  }
}

export default async function StocksPage() {
  const supabase = await createClient();
  const currentUsername = await getCurrentUsername(supabase);

  const rawWatchlist = currentUsername
    ? await getStockWatchlist(supabase)
    : [];

  const featuredStocks = getFeaturedStocks();
  const pennyStocks = getPennyStocks();
  const portfolioSummary = currentUsername
    ? await getPortfolioSummary(supabase)
    : {
        portfolio: null,
        holdings: [],
        cashBalance: 0,
        holdingsValue: 0,
        totalEquity: 0,
      };
  const watchlist = await enrichWatchlistWithQuotes(rawWatchlist);
  const watchlistedSymbols = watchlist.map((w) => w.symbol);

  return (
    <main className="market-bg relative flex flex-1 flex-col gap-10 overflow-hidden px-4 py-8 sm:px-8 sm:py-12">
      <div
        aria-hidden
        className="market-ticker-line absolute left-0 top-24 w-full opacity-20"
      />

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--market-border)] bg-[var(--market-glass)] px-4 py-2 text-sm font-semibold text-[var(--market-accent)] backdrop-blur-sm transition hover:border-[var(--market-accent)]"
        >
          ← All projects
        </Link>
      </div>

      <header className="relative z-10 max-w-3xl">
        <span className="inline-block rounded-full bg-[var(--market-accent-soft)] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[var(--market-accent)] ring-1 ring-[var(--market-border)]">
          Financial Modeling Prep
        </span>
        <h1 className="mt-4 text-5xl font-extrabold leading-tight sm:text-6xl md:text-7xl">
          <span className="market-title-glow">Ticker Tape</span>
        </h1>
        <p className="mt-4 text-lg text-[var(--market-muted)]">
          Search US stocks, track prices on each page, and practice buying whole
          shares with $100,000 in pretend money.
        </p>

        {currentUsername ? (
          <>
            <StockPortfolioHeroClient initialSummary={portfolioSummary} />
            <StockPortfolioChart />
          </>
        ) : (
          <StockPortfolioHero
            summary={portfolioSummary}
            isLoggedIn={false}
          />
        )}

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="market-stat-card rounded-2xl p-5">
            <p className="text-3xl text-[var(--market-accent)]" aria-hidden>
              ★
            </p>
            <p className="mt-2 text-4xl font-extrabold text-[var(--market-accent)]">
              {watchlist.length}
            </p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[var(--market-muted)]">
              On watchlist
            </p>
          </div>
          {currentUsername ? (
            <div className="market-stat-card rounded-2xl p-5">
              <p className="text-3xl text-[var(--market-accent)]" aria-hidden>
                📦
              </p>
              <p className="mt-2 text-4xl font-extrabold text-[var(--market-ink)]">
                {portfolioSummary.holdings.length}
              </p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[var(--market-muted)]">
                Stocks owned
              </p>
            </div>
          ) : null}
        </div>
      </header>

      <div className="relative z-10 flex w-full max-w-4xl flex-col gap-10">
        <StockSearch
          featuredStocks={featuredStocks}
          pennyStocks={pennyStocks}
          watchlistedSymbols={watchlistedSymbols}
          isLoggedIn={currentUsername !== null}
        />
        <StockWatchlistSection
          favorites={watchlist}
          isLoggedIn={currentUsername !== null}
        />
        <StockPortfolioSection
          summary={portfolioSummary}
          isLoggedIn={currentUsername !== null}
        />
      </div>
    </main>
  );
}
