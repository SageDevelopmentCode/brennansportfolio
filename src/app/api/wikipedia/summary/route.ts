import { getWikiSummary } from "@/lib/wikipedia";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") ?? "";

  if (!title.trim()) {
    return NextResponse.json({ summary: null });
  }

  try {
    const summary = await getWikiSummary(title);
    return NextResponse.json({ summary });
  } catch {
    return NextResponse.json(
      { error: "Could not load article" },
      { status: 500 },
    );
  }
}
