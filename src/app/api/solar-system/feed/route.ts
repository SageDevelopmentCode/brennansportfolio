import { fetchSolarSystemFeed } from "@/lib/nasa";
import { NextResponse } from "next/server";

export async function GET() {
  const payload = await fetchSolarSystemFeed();
  return NextResponse.json(payload);
}
