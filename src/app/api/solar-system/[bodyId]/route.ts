import {
  fetchBodyExtrasSafe,
  fetchNasaPlanetMedia,
  NasaApiError,
} from "@/lib/nasa";
import {
  getSolarBody,
  isBodyId,
  NASA_FACT_SHEET_URL,
} from "@/lib/solar-system/bodies";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ bodyId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { bodyId: rawId } = await context.params;
  const bodyId = rawId.toLowerCase();

  if (!isBodyId(bodyId)) {
    return NextResponse.json({ error: "Unknown solar system body." }, { status: 404 });
  }

  const body = getSolarBody(bodyId);

  const { extras, extrasWarning } = await fetchBodyExtrasSafe(bodyId);

  try {
    const media = await fetchNasaPlanetMedia(bodyId);
    return NextResponse.json({
      body,
      imageUrl: media.imageUrl,
      imageCaption: media.imageCaption,
      sourceUrl: media.sourceUrl,
      factSheetUrl: NASA_FACT_SHEET_URL,
      extras,
      extrasWarning,
    });
  } catch (error) {
    if (error instanceof NasaApiError && error.code === "config") {
      return NextResponse.json(
        {
          body,
          imageUrl: null,
          imageCaption: null,
          sourceUrl: null,
          factSheetUrl: NASA_FACT_SHEET_URL,
          warning: error.message,
          extras,
          extrasWarning,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        body,
        imageUrl: null,
        imageCaption: null,
        sourceUrl: null,
        factSheetUrl: NASA_FACT_SHEET_URL,
        warning: "Could not load NASA media right now.",
        extras,
        extrasWarning,
      },
      { status: 200 },
    );
  }
}
