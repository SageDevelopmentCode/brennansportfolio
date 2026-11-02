import { getActiveStormsWithGeometry } from "@/lib/nhc-storms";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const payload = await getActiveStormsWithGeometry();
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(
      { error: "Could not load storm data from NOAA. Try again." },
      { status: 502 },
    );
  }
}
