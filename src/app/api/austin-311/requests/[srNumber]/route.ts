import { getOpenRequestByNumber } from "@/lib/austin-311";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ srNumber: string }> },
) {
  const { srNumber } = await context.params;
  const decoded = decodeURIComponent(srNumber);

  try {
    const request = await getOpenRequestByNumber(decoded);
    if (!request) {
      return NextResponse.json(
        { error: "Request not found or no longer open." },
        { status: 404 },
      );
    }
    return NextResponse.json(request);
  } catch {
    return NextResponse.json(
      { error: "Could not load request details. Try again." },
      { status: 502 },
    );
  }
}
