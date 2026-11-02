import { createClient } from "@/lib/supabase/server";
import {
  StocksApiError,
  getStockQuote,
  isValidStockSymbol,
  normalizeStockSymbol,
} from "@/lib/stocks";
import {
  executePaperTrade,
  paperTradeErrorMessage,
} from "@/lib/stock-portfolio";
import { NextResponse } from "next/server";

type TradeBody = {
  action?: string;
  symbol?: string;
  shares?: number;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Log in to trade." }, { status: 401 });
  }

  let body: TradeBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const action = body.action === "sell" ? "sell" : body.action === "buy" ? "buy" : null;
  if (!action) {
    return NextResponse.json({ error: "Action must be buy or sell." }, { status: 400 });
  }

  const symbol = normalizeStockSymbol(body.symbol ?? "");
  if (!isValidStockSymbol(symbol)) {
    return NextResponse.json({ error: "Invalid stock symbol." }, { status: 400 });
  }

  const shares = Number(body.shares);
  if (!Number.isInteger(shares) || shares < 1) {
    return NextResponse.json(
      { error: "Shares must be a whole number of at least 1." },
      { status: 400 },
    );
  }

  let quote;
  try {
    quote = await getStockQuote(symbol);
  } catch (error) {
    if (error instanceof StocksApiError) {
      const status = error.code === "quota" ? 429 : 502;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Could not load stock price." }, { status: 502 });
  }

  if (!quote) {
    return NextResponse.json({ error: "Symbol not found." }, { status: 404 });
  }

  try {
    const result = await executePaperTrade(supabase, {
      action,
      symbol,
      shares,
      price: quote.price,
      name: quote.name,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: paperTradeErrorMessage(result.code) },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      cashBalance: result.cashBalance,
      shares: result.shares,
      executedPrice: quote.price,
    });
  } catch {
    return NextResponse.json({ error: "Trade could not be completed." }, { status: 500 });
  }
}
