import { getDashboardData } from "@/lib/austin-311";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const payload = await getDashboardData();
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(
      { error: "Could not load Austin 311 data. Try again in a moment." },
      { status: 502 },
    );
  }
}
