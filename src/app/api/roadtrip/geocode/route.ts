import { searchTripLocations } from "@/lib/roadtrip";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";

  if (!query.trim()) {
    return NextResponse.json({ locations: [] });
  }

  try {
    const locations = await searchTripLocations(query);
    return NextResponse.json({ locations });
  } catch {
    return NextResponse.json(
      { error: "Could not search locations. Try again." },
      { status: 500 },
    );
  }
}
