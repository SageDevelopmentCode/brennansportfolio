import { StocksApiError, getStockQuote, normalizeStockSymbol } from "@/lib/stocks";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ symbol: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { symbol: rawSymbol } = await context.params;
  const symbol = normalizeStockSymbol(decodeURIComponent(rawSymbol));

  try {
    const quote = await getStockQuote(symbol);
    if (!quote) {
      return NextResponse.json({ error: "Symbol not found." }, { status: 404 });
    }
    return NextResponse.json({ quote });
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
      { error: "Could not load quote. Try again." },
      { status: 500 },
    );
  }
}
