import { getOpenRequestLogs } from "@/lib/austin-311";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number.parseInt(limitParam, 10) : 50;

  try {
    const requests = await getOpenRequestLogs(
      Number.isFinite(limit) ? limit : 50,
    );
    return NextResponse.json({
      requests,
      fetchedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not load Austin 311 request log. Try again." },
      { status: 502 },
    );
  }
}
