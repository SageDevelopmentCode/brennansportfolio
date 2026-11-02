import { unzipSync } from "fflate";

const CURRENT_STORMS_URL = "https://www.nhc.noaa.gov/CurrentStorms.json";
const CACHE_SECONDS = 900;

export type ForcastrStorm = {
  id: string;
  name: string;
  classification: string;
  classificationLabel: string;
  color: string;
  intensityKts: number;
  pressureMb: number | null;
  latitude: number;
  longitude: number;
  lastUpdate: string;
  graphicsUrl: string | null;
  track: [number, number][];
  cone: [number, number][];
};

type NhcStormRecord = {
  id: string;
  name: string;
  classification: string;
  intensity: string | number;
  pressure: string | number | null;
  latitudeNumeric: number;
  longitudeNumeric: number;
  lastUpdate: string;
  forecastGraphics?: { url?: string } | null;
  forecastTrack?: { kmzFile?: string } | null;
  trackCone?: { kmzFile?: string } | null;
};

type NhcCurrentStormsResponse = {
  activeStorms?: NhcStormRecord[];
};

const CLASSIFICATION_LABELS: Record<string, string> = {
  TD: "Tropical Depression",
  TS: "Tropical Storm",
  HU: "Hurricane",
  STD: "Subtropical Depression",
  STS: "Subtropical Storm",
  PTC: "Post-tropical Cyclone",
  PC: "Potential Tropical Cyclone",
};

const CLASSIFICATION_COLORS: Record<string, string> = {
  TD: "#5eb6ff",
  TS: "#3d9e48",
  HU: "#e85d04",
  STD: "#7b9acc",
  STS: "#2d8a4e",
  PTC: "#9ca3af",
  PC: "#f59e0b",
};

export function classificationLabel(code: string): string {
  return CLASSIFICATION_LABELS[code] ?? code;
}

export function classificationColor(code: string): string {
  return CLASSIFICATION_COLORS[code] ?? "#0ea5e9";
}

function parseCoordinateString(raw: string): [number, number][] {
  return raw
    .trim()
    .split(/\s+/)
    .map((token) => {
      const parts = token.split(",");
      const lon = Number(parts[0]);
      const lat = Number(parts[1]);
      return [lat, lon] as [number, number];
    })
    .filter(([lat, lon]) => Number.isFinite(lat) && Number.isFinite(lon));
}

function extractLineStrings(kml: string): [number, number][][] {
  const lines: [number, number][][] = [];
  const pattern =
    /<LineString>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/gi;
  let match = pattern.exec(kml);
  while (match) {
    const coords = parseCoordinateString(match[1]);
    if (coords.length > 1) lines.push(coords);
    match = pattern.exec(kml);
  }
  return lines;
}

function extractFirstPolygon(kml: string): [number, number][] {
  const match = kml.match(
    /<Polygon>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/i,
  );
  if (!match) return [];
  return parseCoordinateString(match[1]);
}

function longestLine(lines: [number, number][][]): [number, number][] {
  if (lines.length === 0) return [];
  return lines.reduce((best, line) => (line.length > best.length ? line : best));
}

async function fetchKmzAsKml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { next: { revalidate: CACHE_SECONDS } });
    if (!res.ok) return null;
    const buffer = new Uint8Array(await res.arrayBuffer());
    const files = unzipSync(buffer);
    const kmlName = Object.keys(files).find((name) =>
      name.toLowerCase().endsWith(".kml"),
    );
    if (!kmlName) return null;
    return new TextDecoder().decode(files[kmlName]);
  } catch {
    return null;
  }
}

async function loadTrackFromKmz(kmzUrl: string | undefined): Promise<[number, number][]> {
  if (!kmzUrl) return [];
  const kml = await fetchKmzAsKml(kmzUrl);
  if (!kml) return [];
  return longestLine(extractLineStrings(kml));
}

async function loadConeFromKmz(kmzUrl: string | undefined): Promise<[number, number][]> {
  if (!kmzUrl) return [];
  const kml = await fetchKmzAsKml(kmzUrl);
  if (!kml) return [];
  return extractFirstPolygon(kml);
}

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function getActiveStormsWithGeometry(): Promise<{
  storms: ForcastrStorm[];
  updatedAt: string;
}> {
  const res = await fetch(CURRENT_STORMS_URL, {
    next: { revalidate: CACHE_SECONDS },
  });
  if (!res.ok) throw new Error("NHC storm list request failed");

  const data = (await res.json()) as NhcCurrentStormsResponse;
  const active = data.activeStorms ?? [];

  const storms = await Promise.all(
    active.map(async (storm) => {
      const [track, cone] = await Promise.all([
        loadTrackFromKmz(storm.forecastTrack?.kmzFile),
        loadConeFromKmz(storm.trackCone?.kmzFile),
      ]);

      const intensityKts = toNumber(storm.intensity) ?? 0;
      const pressureMb = toNumber(storm.pressure);

      return {
        id: storm.id,
        name: storm.name,
        classification: storm.classification,
        classificationLabel: classificationLabel(storm.classification),
        color: classificationColor(storm.classification),
        intensityKts,
        pressureMb,
        latitude: storm.latitudeNumeric,
        longitude: storm.longitudeNumeric,
        lastUpdate: storm.lastUpdate,
        graphicsUrl: storm.forecastGraphics?.url ?? null,
        track,
        cone,
      } satisfies ForcastrStorm;
    }),
  );

  return {
    storms,
    updatedAt: new Date().toISOString(),
  };
}
