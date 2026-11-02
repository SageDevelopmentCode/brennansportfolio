import {
  StocksApiError,
  getStockHistory,
  normalizeStockSymbol,
} from "@/lib/stocks";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ symbol: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { symbol: rawSymbol } = await context.params;
  const symbol = normalizeStockSymbol(decodeURIComponent(rawSymbol));

  try {
    const history = await getStockHistory(symbol);
    return NextResponse.json({ history });
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
      { error: "Could not load chart data. Try again." },
      { status: 500 },
    );
  }
}
