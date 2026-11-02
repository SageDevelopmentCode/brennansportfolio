import { getPortfolioSummaryFresh } from "@/lib/stock-portfolio";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Log in to view your portfolio." }, { status: 401 });
  }

  try {
    const summary = await getPortfolioSummaryFresh(supabase);
    return NextResponse.json({ summary });
  } catch {
    return NextResponse.json(
      { error: "Could not update portfolio value. Try again." },
      { status: 500 },
    );
  }
}
