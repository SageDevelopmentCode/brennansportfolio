import {
  buildPortfolioEquitySeries,
  type PortfolioRange,
} from "@/lib/portfolio-equity-history";
import {
  getHoldings,
  getOrCreatePortfolio,
  PAPER_STARTING_CASH,
} from "@/lib/stock-portfolio";
import { StocksApiError } from "@/lib/stocks";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const VALID_RANGES = new Set<PortfolioRange>(["1W", "1M", "1Y"]);

function parseRange(raw: string | null): PortfolioRange {
  if (raw && VALID_RANGES.has(raw as PortfolioRange)) {
    return raw as PortfolioRange;
  }
  return "1M";
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Log in to view portfolio history." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const range = parseRange(searchParams.get("range"));

  try {
    const portfolio = await getOrCreatePortfolio(supabase);
    if (!portfolio) {
      return NextResponse.json({ error: "Portfolio not found." }, { status: 404 });
    }

    const holdings = await getHoldings(supabase);
    const points = await buildPortfolioEquitySeries(
      supabase,
      range,
      portfolio,
      holdings,
    );

    return NextResponse.json({
      points,
      range,
      asOf: new Date().toISOString(),
      startEquity: PAPER_STARTING_CASH,
    });
  } catch (error) {
    if (error instanceof StocksApiError) {
      const status =
        error.code === "config"
          ? 503
          : error.code === "quota"
            ? 429
            : error.code === "not_found"
              ? 404
              : 502;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json(
      { error: "Could not load portfolio chart. Try again." },
      { status: 500 },
    );
  }
}
