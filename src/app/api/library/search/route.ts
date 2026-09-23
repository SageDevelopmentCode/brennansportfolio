import { searchAuthors } from "@/lib/open-library";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";

  if (!query.trim()) {
    return NextResponse.json({ authors: [] });
  }

  try {
    const authors = await searchAuthors(query);
    return NextResponse.json({ authors });
  } catch {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
