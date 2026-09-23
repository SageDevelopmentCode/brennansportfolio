import { planTrip } from "@/lib/roadtrip";
import { NextResponse } from "next/server";

export const maxDuration = 120;

type PlanRequestBody = {
  from?: string;
  to?: string;
  fromLat?: number;
  fromLng?: number;
  toLat?: number;
  toLng?: number;
};

export async function POST(request: Request) {
  let body: PlanRequestBody;

  try {
    body = (await request.json()) as PlanRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const hasFromCoords =
    body.fromLat !== undefined &&
    body.fromLng !== undefined &&
    Number.isFinite(body.fromLat) &&
    Number.isFinite(body.fromLng);
  const hasToCoords =
    body.toLat !== undefined &&
    body.toLng !== undefined &&
    Number.isFinite(body.toLat) &&
    Number.isFinite(body.toLng);

  if (!hasFromCoords && !body.from?.trim()) {
    return NextResponse.json({ error: "Please enter a starting point." }, { status: 400 });
  }

  if (!hasToCoords && !body.to?.trim()) {
    return NextResponse.json({ error: "Please enter a destination." }, { status: 400 });
  }

  try {
    const plan = await planTrip({
      fromQuery: body.from,
      toQuery: body.to,
      fromLat: body.fromLat,
      fromLng: body.fromLng,
      toLat: body.toLat,
      toLng: body.toLng,
    });

    return NextResponse.json({ plan });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not plan this trip. Try again.";

    if (
      message.includes("Please enter") ||
      message.includes("Could not find")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
