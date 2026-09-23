import {
  planTrip,
  type PlanProgressUpdate,
  type TripPlan,
  type TripRoutePreview,
} from "@/lib/roadtrip";

export const maxDuration = 120;

type PlanRequestBody = {
  from?: string;
  to?: string;
  fromLat?: number;
  fromLng?: number;
  toLat?: number;
  toLng?: number;
};

type StreamProgressEvent = {
  type: "progress";
} & PlanProgressUpdate;

type StreamRouteEvent = {
  type: "route";
} & TripRoutePreview;

type StreamCompleteEvent = {
  type: "complete";
  plan: TripPlan;
};

type StreamErrorEvent = {
  type: "error";
  message: string;
};

type StreamEvent =
  | StreamProgressEvent
  | StreamRouteEvent
  | StreamCompleteEvent
  | StreamErrorEvent;

function encodeEvent(event: StreamEvent): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

function validateBody(body: PlanRequestBody): string | null {
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
    return "Please enter a starting point.";
  }

  if (!hasToCoords && !body.to?.trim()) {
    return "Please enter a destination.";
  }

  return null;
}

export async function POST(request: Request) {
  let body: PlanRequestBody;

  try {
    body = (await request.json()) as PlanRequestBody;
  } catch {
    return new Response(JSON.stringify({ type: "error", message: "Invalid request body." }), {
      status: 400,
      headers: { "Content-Type": "application/x-ndjson" },
    });
  }

  const validationError = validateBody(body);
  if (validationError) {
    return new Response(
      JSON.stringify({ type: "error", message: validationError }),
      {
        status: 400,
        headers: { "Content-Type": "application/x-ndjson" },
      },
    );
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enqueue = (event: StreamEvent) => {
        controller.enqueue(encodeEvent(event));
      };

      try {
        const plan = await planTrip({
          fromQuery: body.from,
          toQuery: body.to,
          fromLat: body.fromLat,
          fromLng: body.fromLng,
          toLat: body.toLat,
          toLng: body.toLng,
          onProgress: (update) => {
            enqueue({ type: "progress", ...update });
          },
          onRoute: (preview) => {
            enqueue({ type: "route", ...preview });
          },
        });

        enqueue({ type: "complete", plan });
        controller.close();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Could not plan this trip. Try again.";

        enqueue({ type: "error", message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
    },
  });
}
