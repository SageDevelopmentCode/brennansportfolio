import {
  StocksApiError,
  attachQuotesToMatches,
  searchUsStocks,
} from "@/lib/stocks";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";

  if (!query.trim()) {
    return NextResponse.json({ stocks: [] });
  }

  try {
    const matches = await searchUsStocks(query, 8);
    if (matches.length === 0) {
      return NextResponse.json({ stocks: [] });
    }

    const stocks = await attachQuotesToMatches(matches);
    if (stocks.length === 0) {
      return NextResponse.json(
        { error: "Could not load prices for matching symbols." },
        { status: 502 },
      );
    }

    return NextResponse.json({ stocks });
  } catch (error) {
    if (error instanceof StocksApiError) {
      const status =
        error.code === "config"
          ? 503
          : error.code === "quota"
            ? 429
            : 502;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json(
      { error: "Could not search stocks. Try again." },
      { status: 500 },
    );
  }
}
