import type { BodyId } from "@/lib/solar-system/bodies";
import { getSolarBody } from "@/lib/solar-system/bodies";
import type {
  ApodPayload,
  BodyExtras,
  DonkiFlarePayload,
  EpicImagePayload,
  MoonImagePayload,
  NeoAsteroidPayload,
  SolarSystemFeedPayload,
} from "@/lib/solar-system/types";

export class NasaApiError extends Error {
  constructor(
    message: string,
    readonly code: "config" | "upstream" | "not_found",
  ) {
    super(message);
    this.name = "NasaApiError";
  }
}

export function getNasaApiKey(): string {
  const key = process.env.NASA_API_KEY?.trim();
  if (!key) {
    throw new NasaApiError(
      "NASA data is not configured. Add NASA_API_KEY to your environment.",
      "config",
    );
  }
  return key;
}

export type NasaPlanetMedia = {
  imageUrl: string | null;
  imageCaption: string | null;
  sourceUrl: string | null;
};

type NasaImagesSearchItem = {
  data?: Array<{
    title?: string;
    description?: string;
    nasa_id?: string;
  }>;
  links?: Array<{
    href?: string;
    rel?: string;
    render?: string;
  }>;
};

type NasaImagesSearchResponse = {
  collection?: {
    items?: NasaImagesSearchItem[];
  };
};

type EpicNaturalImage = {
  identifier: string;
  caption: string;
  date: string;
  image: string;
};

type ApodApiResponse = {
  title?: string;
  explanation?: string;
  url?: string;
  hdurl?: string;
  media_type?: string;
  date?: string;
  copyright?: string;
};

type NeoFeedApproach = {
  close_approach_date?: string;
  miss_distance?: { kilometers?: string };
};

type NeoFeedObject = {
  name?: string;
  is_potentially_hazardous_asteroid?: boolean;
  estimated_diameter?: { meters?: { estimated_diameter_min?: number } };
  close_approach_data?: NeoFeedApproach[];
};

type NeoFeedResponse = {
  near_earth_objects?: Record<string, NeoFeedObject[]>;
};

type DonkiFlareResponse = {
  beginTime?: string;
  classType?: string;
  sourceLocation?: string;
};

const DONKI_URL = "https://api.nasa.gov/DONKI/FLR";
const APOD_TRUNCATE = 400;

function formatDateYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function truncateText(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function pickImageLink(item: NasaImagesSearchItem): string | null {
  const links = item.links ?? [];
  const preferred =
    links.find((link) => link.render === "image" && link.href) ??
    links.find((link) => link.rel === "preview" && link.href) ??
    links.find((link) => link.href);
  return preferred?.href ?? null;
}

async function fetchNasaImageLibraryMedia(
  query: string,
): Promise<NasaPlanetMedia> {
  const url = new URL("https://images-api.nasa.gov/search");
  url.searchParams.set("q", query);
  url.searchParams.set("media_type", "image");

  const response = await fetch(url.toString(), {
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    throw new NasaApiError("NASA Image Library request failed.", "upstream");
  }

  const payload = (await response.json()) as NasaImagesSearchResponse;
  const items = payload.collection?.items ?? [];

  for (const item of items) {
    const imageUrl = pickImageLink(item);
    if (!imageUrl) continue;
    const meta = item.data?.[0];
    const nasaId = meta?.nasa_id;
    return {
      imageUrl,
      imageCaption: meta?.title ?? meta?.description ?? null,
      sourceUrl: nasaId
        ? `https://images.nasa.gov/details/${nasaId}`
        : "https://images.nasa.gov/",
    };
  }

  return { imageUrl: null, imageCaption: null, sourceUrl: null };
}

async function fetchEpicEarthMedia(apiKey: string): Promise<NasaPlanetMedia> {
  const gallery = await fetchEpicGallery(apiKey, 1);
  const latest = gallery[0];
  if (!latest) {
    return { imageUrl: null, imageCaption: null, sourceUrl: null };
  }
  return {
    imageUrl: latest.imageUrl,
    imageCaption: latest.caption,
    sourceUrl: latest.sourceUrl,
  };
}

export async function fetchApod(): Promise<ApodPayload> {
  const apiKey = getNasaApiKey();
  const url = new URL("https://api.nasa.gov/planetary/apod");
  url.searchParams.set("api_key", apiKey);

  const response = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!response.ok) {
    throw new NasaApiError("NASA APOD request failed.", "upstream");
  }

  const data = (await response.json()) as ApodApiResponse;
  if (!data.title || !data.url || !data.date) {
    throw new NasaApiError("NASA APOD returned incomplete data.", "upstream");
  }

  return {
    title: data.title,
    explanation: truncateText(data.explanation ?? "", APOD_TRUNCATE),
    url: data.url,
    hdurl: data.hdurl ?? null,
    mediaType: data.media_type ?? "image",
    date: data.date,
    copyright: data.copyright ?? null,
  };
}

export async function fetchNeoFeed(): Promise<NeoAsteroidPayload[]> {
  const apiKey = getNasaApiKey();
  const start = new Date();
  const end = addDays(start, 6);
  const url = new URL("https://api.nasa.gov/neo/rest/v1/feed");
  url.searchParams.set("start_date", formatDateYmd(start));
  url.searchParams.set("end_date", formatDateYmd(end));
  url.searchParams.set("api_key", apiKey);

  const response = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!response.ok) {
    throw new NasaApiError("NASA NeoWs feed request failed.", "upstream");
  }

  const data = (await response.json()) as NeoFeedResponse;
  const byDate = data.near_earth_objects ?? [];
  const flattened: NeoAsteroidPayload[] = [];

  for (const objects of Object.values(byDate)) {
    for (const neo of objects) {
      const approach = neo.close_approach_data?.[0];
      if (!neo.name || !approach?.close_approach_date) continue;
      const missKm = Number(approach.miss_distance?.kilometers ?? "0");
      flattened.push({
        name: neo.name,
        closeApproachDate: approach.close_approach_date,
        missDistanceKm: Number.isFinite(missKm) ? missKm : 0,
        diameterMeters:
          neo.estimated_diameter?.meters?.estimated_diameter_min ?? null,
        potentiallyHazardous: Boolean(neo.is_potentially_hazardous_asteroid),
      });
    }
  }

  return flattened
    .sort((a, b) => a.closeApproachDate.localeCompare(b.closeApproachDate))
    .slice(0, 12);
}

export async function fetchDonkiFlares(): Promise<DonkiFlarePayload[]> {
  const apiKey = getNasaApiKey();
  const end = new Date();
  const start = addDays(end, -14);
  const url = new URL(DONKI_URL);
  url.searchParams.set("startDate", formatDateYmd(start));
  url.searchParams.set("endDate", formatDateYmd(end));
  url.searchParams.set("api_key", apiKey);

  const response = await fetch(url.toString(), { next: { revalidate: 21600 } });
  if (!response.ok) {
    throw new NasaApiError("NASA DONKI request failed.", "upstream");
  }

  const data = (await response.json()) as DonkiFlareResponse[];
  return data
    .filter((flare) => flare.beginTime && flare.classType)
    .slice(0, 5)
    .map((flare) => ({
      beginTime: flare.beginTime ?? "",
      classType: flare.classType ?? "",
      sourceLocation: flare.sourceLocation ?? "Unknown",
    }));
}

export async function fetchEpicGallery(
  apiKey: string,
  limit: number,
): Promise<EpicImagePayload[]> {
  const listUrl = `https://api.nasa.gov/EPIC/api/natural/images?api_key=${encodeURIComponent(apiKey)}`;
  const listResponse = await fetch(listUrl, { next: { revalidate: 3600 } });

  if (!listResponse.ok) {
    throw new NasaApiError("NASA EPIC request failed.", "upstream");
  }

  const images = (await listResponse.json()) as EpicNaturalImage[];
  return images.slice(0, limit).map((entry) => {
    const datePart = entry.date.split(" ")[0]?.replace(/-/g, "/") ?? "";
    return {
      imageUrl: `https://api.nasa.gov/EPIC/api/natural/image/${entry.image}?api_key=${encodeURIComponent(apiKey)}`,
      caption: entry.caption || "Earth from DSCOVR EPIC",
      date: entry.date,
      sourceUrl: `https://epic.gsfc.nasa.gov/archive/natural/${datePart}/png/${entry.image}.png`,
    };
  });
}

export async function fetchMoonGallery(
  entries: { label: string; query: string }[],
): Promise<MoonImagePayload[]> {
  const moons: MoonImagePayload[] = [];

  for (const entry of entries.slice(0, 2)) {
    try {
      const media = await fetchNasaImageLibraryMedia(entry.query);
      if (!media.imageUrl) continue;
      moons.push({
        name: entry.label,
        imageUrl: media.imageUrl,
        caption: media.imageCaption,
        sourceUrl: media.sourceUrl,
      });
    } catch {
      // skip failed moon query
    }
  }

  return moons;
}

export async function fetchSolarSystemFeed(): Promise<SolarSystemFeedPayload> {
  const warnings: string[] = [];
  let apod: ApodPayload | null = null;
  let asteroids: NeoAsteroidPayload[] = [];

  try {
    apod = await fetchApod();
  } catch (error) {
    warnings.push(
      error instanceof NasaApiError
        ? error.message
        : "Could not load Astronomy Picture of the Day.",
    );
  }

  try {
    asteroids = await fetchNeoFeed();
  } catch (error) {
    warnings.push(
      error instanceof NasaApiError
        ? error.message
        : "Could not load near-Earth asteroid feed.",
    );
  }

  return {
    apod,
    asteroids,
    warning: warnings.length > 0 ? warnings.join(" ") : undefined,
  };
}

export async function fetchBodyExtras(
  bodyId: BodyId,
): Promise<BodyExtras | null> {
  if (bodyId === "sun") {
    const flares = await fetchDonkiFlares();
    return { kind: "sun", flares };
  }

  if (bodyId === "earth") {
    const apiKey = getNasaApiKey();
    const epicImages = await fetchEpicGallery(apiKey, 5);
    return { kind: "earth", epicImages };
  }

  if (bodyId === "mars" || bodyId === "jupiter" || bodyId === "saturn") {
    const body = getSolarBody(bodyId);
    const queries = body.moonImageQueries ?? [];
    if (queries.length === 0) return null;
    const moons = await fetchMoonGallery(queries);
    return { kind: "moons", moons };
  }

  return null;
}

export async function fetchBodyExtrasSafe(
  bodyId: BodyId,
): Promise<{ extras: BodyExtras | null; extrasWarning?: string }> {
  const hasExtras =
    bodyId === "sun" ||
    bodyId === "earth" ||
    bodyId === "mars" ||
    bodyId === "jupiter" ||
    bodyId === "saturn";

  if (!hasExtras) {
    return { extras: null };
  }

  try {
    const extras = await fetchBodyExtras(bodyId);
    return { extras };
  } catch (error) {
    return {
      extras: null,
      extrasWarning:
        error instanceof NasaApiError
          ? error.message
          : "Could not load extra NASA data for this body.",
    };
  }
}

export async function fetchNasaPlanetMedia(
  bodyId: BodyId,
): Promise<NasaPlanetMedia> {
  if (bodyId === "earth") {
    const apiKey = getNasaApiKey();
    try {
      return await fetchEpicEarthMedia(apiKey);
    } catch {
      const body = getSolarBody(bodyId);
      return fetchNasaImageLibraryMedia(body.nasaImageQuery);
    }
  }

  const body = getSolarBody(bodyId);
  try {
    return await fetchNasaImageLibraryMedia(body.nasaImageQuery);
  } catch {
    return { imageUrl: null, imageCaption: null, sourceUrl: null };
  }
}
