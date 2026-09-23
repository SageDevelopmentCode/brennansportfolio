import { attachWeatherToCities, searchCities } from "@/lib/weather";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";

  if (!query.trim()) {
    return NextResponse.json({ cities: [] });
  }

  try {
    const locations = await searchCities(query);
    if (locations.length === 0) {
      return NextResponse.json({ cities: [] });
    }

    const cities = await attachWeatherToCities(locations);
    if (cities.length === 0) {
      return NextResponse.json(
        { error: "Could not load weather for matching cities" },
        { status: 502 },
      );
    }

    return NextResponse.json({ cities });
  } catch {
    return NextResponse.json(
      { error: "Could not load weather. Try again." },
      { status: 500 },
    );
  }
}
