import OpeningHours from "opening_hours";
import { searchCities } from "@/lib/weather";

const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const OVERPASS_USER_AGENT = "brennansportfolio-open-road/1.0";

const SAMPLE_INTERVAL_KM = 50;
const MAX_SAMPLE_POINTS = 8;
const CORRIDOR_RADIUS_M = 12_000;
const OVERPASS_BATCH_SIZE = 4;
const OVERPASS_MIRROR_URL = "https://overpass.kumi.systems/api/interpreter";

export type TripLocation = {
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  country: string;
};

export type StopType = "gas" | "grocery";

export type OpenStatus = "open" | "closed" | "unknown";

export type RouteStop = {
  id: string;
  name: string;
  type: StopType;
  latitude: number;
  longitude: number;
  address?: string;
  openStatus: OpenStatus;
  openingHours?: string;
  distanceAlongRouteKm: number;
};

export type TripPlan = {
  from: TripLocation;
  to: TripLocation;
  route: GeoJSON.LineString;
  summary: {
    distanceMi: number;
    durationMin: number;
  };
  stops: RouteStop[];
  stopsWarning?: string;
};

type PlanTripInput = {
  fromQuery?: string;
  toQuery?: string;
  fromLat?: number;
  fromLng?: number;
  toLat?: number;
  toLng?: number;
};

export type PlanProgressStage =
  | "geocoding"
  | "routing"
  | "stops"
  | "complete"
  | "error";

export type PlanProgressUpdate = {
  stage: PlanProgressStage;
  message: string;
  batch?: number;
  totalBatches?: number;
};

export type TripRoutePreview = {
  from: TripLocation;
  to: TripLocation;
  route: GeoJSON.LineString;
  summary: {
    distanceMi: number;
    durationMin: number;
  };
};

export type PlanTripOptions = PlanTripInput & {
  onProgress?: (update: PlanProgressUpdate) => void;
  onRoute?: (preview: TripRoutePreview) => void;
};

function emitProgress(
  onProgress: PlanTripOptions["onProgress"],
  update: PlanProgressUpdate,
): void {
  onProgress?.(update);
}

type OsrmRouteResponse = {
  routes?: {
    geometry: GeoJSON.LineString;
    distance: number;
    duration: number;
  }[];
  code?: string;
  message?: string;
};

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements?: OverpassElement[];
};

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatLocationName(
  name: string,
  admin1?: string,
  country?: string,
): string {
  return [name, admin1, country].filter(Boolean).join(", ");
}

async function resolveLocation(
  query: string | undefined,
  lat: number | undefined,
  lng: number | undefined,
  label: "origin" | "destination",
): Promise<TripLocation> {
  if (lat !== undefined && lng !== undefined && Number.isFinite(lat) && Number.isFinite(lng)) {
    return {
      name: query?.trim() || `${label} point`,
      latitude: lat,
      longitude: lng,
      country: "",
    };
  }

  if (!query?.trim()) {
    throw new Error(`Please enter a ${label}.`);
  }

  const results = await searchCities(query);
  const match = results[0];
  if (!match) {
    throw new Error(`Could not find ${label} "${query.trim()}".`);
  }

  return {
    name: formatLocationName(match.name, match.admin1, match.country),
    latitude: match.latitude,
    longitude: match.longitude,
    admin1: match.admin1,
    country: match.country,
  };
}

async function fetchDrivingRoute(
  from: TripLocation,
  to: TripLocation,
): Promise<{ geometry: GeoJSON.LineString; distanceKm: number; durationMin: number }> {
  const coords = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`;
  const url = `${OSRM_URL}/${coords}?overview=full&geometries=geojson&steps=false`;

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error("Could not fetch driving route.");
  }

  const data = (await res.json()) as OsrmRouteResponse;
  const route = data.routes?.[0];
  if (!route?.geometry?.coordinates?.length) {
    throw new Error(data.message ?? "No driving route found between those locations.");
  }

  return {
    geometry: route.geometry,
    distanceKm: route.distance / 1000,
    durationMin: Math.round(route.duration / 60),
  };
}

function sampleRoutePoints(coordinates: [number, number][]): [number, number][] {
  if (coordinates.length <= 2) return coordinates;

  const cumulative: number[] = [0];
  for (let i = 1; i < coordinates.length; i++) {
    const [lon1, lat1] = coordinates[i - 1];
    const [lon2, lat2] = coordinates[i];
    cumulative.push(cumulative[i - 1] + haversineKm(lat1, lon1, lat2, lon2));
  }

  const totalDistance = cumulative[cumulative.length - 1];
  const interval =
    totalDistance / MAX_SAMPLE_POINTS < SAMPLE_INTERVAL_KM
      ? totalDistance / MAX_SAMPLE_POINTS
      : SAMPLE_INTERVAL_KM;

  const samples: [number, number][] = [coordinates[0]];
  let nextTarget = interval;

  for (let i = 1; i < coordinates.length; i++) {
    while (nextTarget <= cumulative[i] && samples.length < MAX_SAMPLE_POINTS) {
      const segmentLength = cumulative[i] - cumulative[i - 1];
      const ratio =
        segmentLength === 0
          ? 0
          : (nextTarget - cumulative[i - 1]) / segmentLength;
      const [lon1, lat1] = coordinates[i - 1];
      const [lon2, lat2] = coordinates[i];
      samples.push([
        lon1 + (lon2 - lon1) * ratio,
        lat1 + (lat2 - lat1) * ratio,
      ]);
      nextTarget += interval;
    }
  }

  const last = coordinates[coordinates.length - 1];
  const lastSample = samples[samples.length - 1];
  if (lastSample[0] !== last[0] || lastSample[1] !== last[1]) {
    samples.push(last);
  }

  return samples.slice(0, MAX_SAMPLE_POINTS);
}

function buildOverpassQuery(
  samplePoints: [number, number][],
  mode: "full" | "nodes",
): string {
  const aroundClauses = samplePoints
    .map(([lon, lat]) => {
      const nodeClauses = `
  node["amenity"="fuel"](around:${CORRIDOR_RADIUS_M},${lat},${lon});
  node["shop"~"supermarket|grocery|convenience"](around:${CORRIDOR_RADIUS_M},${lat},${lon});`;

      if (mode === "nodes") return nodeClauses;

      return `${nodeClauses}
  way["amenity"="fuel"](around:${CORRIDOR_RADIUS_M},${lat},${lon});
  way["shop"~"supermarket|grocery|convenience"](around:${CORRIDOR_RADIUS_M},${lat},${lon});`;
    })
    .join("");

  const timeout = mode === "nodes" ? 60 : 90;
  const output = mode === "nodes" ? "out tags;" : "out center tags;";

  return `
[out:json][timeout:${timeout}];
(${aroundClauses}
);
${output}`.trim();
}

function chunkSamplePoints(
  samplePoints: [number, number][],
): [number, number][][] {
  const chunks: [number, number][][] = [];
  for (let i = 0; i < samplePoints.length; i += OVERPASS_BATCH_SIZE) {
    chunks.push(samplePoints.slice(i, i + OVERPASS_BATCH_SIZE));
  }
  return chunks;
}

async function executeOverpassQuery(
  query: string,
  endpoint: string,
  meta: { batchIndex: number; mode: "full" | "nodes"; attempt: number },
): Promise<{ ok: true; elements: OverpassElement[] } | { ok: false; status: number }> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": OVERPASS_USER_AGENT,
    },
    body: `data=${encodeURIComponent(query)}`,
    cache: "no-store",
  });

  if (!res.ok) {
    return { ok: false, status: res.status };
  }

  const data = (await res.json()) as OverpassResponse;

  return { ok: true, elements: data.elements ?? [] };
}

async function queryOverpassBatch(
  samplePoints: [number, number][],
  batchIndex: number,
  onProgress?: PlanTripOptions["onProgress"],
): Promise<OverpassElement[]> {
  const attempts: Array<{ mode: "full" | "nodes"; endpoint: string; attempt: number }> = [
    { mode: "full", endpoint: OVERPASS_URL, attempt: 1 },
    { mode: "full", endpoint: OVERPASS_MIRROR_URL, attempt: 2 },
    { mode: "nodes", endpoint: OVERPASS_URL, attempt: 3 },
  ];

  for (const { mode, endpoint, attempt } of attempts) {
    if (attempt > 1) {
      emitProgress(onProgress, {
        stage: "stops",
        message: "Retrying with alternate map data…",
      });
    }

    const query = buildOverpassQuery(samplePoints, mode);
    const result = await executeOverpassQuery(query, endpoint, {
      batchIndex,
      mode,
      attempt,
    });
    if (result.ok) {
      return result.elements;
    }
  }

  return [];
}

async function queryOverpass(
  samplePoints: [number, number][],
  onProgress?: PlanTripOptions["onProgress"],
): Promise<{
  elements: OverpassElement[];
  warning?: string;
}> {
  if (samplePoints.length === 0) {
    return { elements: [] };
  }

  const batches = chunkSamplePoints(samplePoints);
  const elementMap = new Map<string, OverpassElement>();
  let failedBatches = 0;

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    emitProgress(onProgress, {
      stage: "stops",
      message: `Scanning route segment ${batchIndex + 1} of ${batches.length}…`,
      batch: batchIndex + 1,
      totalBatches: batches.length,
    });

    const elements = await queryOverpassBatch(
      batches[batchIndex],
      batchIndex,
      onProgress,
    );
    if (elements.length === 0) {
      failedBatches += 1;
      continue;
    }

    for (const element of elements) {
      elementMap.set(`${element.type}/${element.id}`, element);
    }
  }

  const merged = [...elementMap.values()];
  if (merged.length === 0) {
    return {
      elements: [],
      warning:
        "We couldn't load stops along this route right now. The map and route are still available — try planning again in a moment.",
    };
  }

  if (failedBatches > 0) {
    return {
      elements: merged,
      warning:
        "Some stops may be missing because the map data service was busy. Try planning again for fuller results.",
    };
  }

  return { elements: merged };
}

function getElementCoordinates(
  element: OverpassElement,
): { lat: number; lon: number } | null {
  if (element.lat !== undefined && element.lon !== undefined) {
    return { lat: element.lat, lon: element.lon };
  }
  if (element.center) {
    return { lat: element.center.lat, lon: element.center.lon };
  }
  return null;
}

function getStopType(tags: Record<string, string>): StopType | null {
  if (tags.amenity === "fuel") return "gas";
  if (/^(supermarket|grocery|convenience)$/.test(tags.shop ?? "")) {
    return "grocery";
  }
  return null;
}

function buildAddress(tags: Record<string, string>): string | undefined {
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:city"],
    tags["addr:state"],
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : undefined;
}

function parseOpenStatus(openingHoursTag?: string): OpenStatus {
  if (!openingHoursTag?.trim()) return "unknown";

  try {
    const oh = new OpeningHours(openingHoursTag);
    if (oh.getUnknown()) return "unknown";
    return oh.getState() ? "open" : "closed";
  } catch {
    return "unknown";
  }
}

function distanceAlongRouteKm(
  coordinates: [number, number][],
  lat: number,
  lon: number,
): number {
  let bestDistance = Infinity;
  let bestAlongRoute = 0;
  let traversed = 0;

  for (let i = 1; i < coordinates.length; i++) {
    const [lon1, lat1] = coordinates[i - 1];
    const [lon2, lat2] = coordinates[i];
    const segmentLength = haversineKm(lat1, lon1, lat2, lon2);

    const dx = lon2 - lon1;
    const dy = lat2 - lat1;
    const segmentLenSq = dx * dx + dy * dy;
    let ratio = 0;
    if (segmentLenSq > 0) {
      ratio = Math.max(
        0,
        Math.min(1, ((lon - lon1) * dx + (lat - lat1) * dy) / segmentLenSq),
      );
    }

    const projLat = lat1 + dy * ratio;
    const projLon = lon1 + dx * ratio;
    const distToSegment = haversineKm(lat, lon, projLat, projLon);
    const along = traversed + segmentLength * ratio;

    if (distToSegment < bestDistance) {
      bestDistance = distToSegment;
      bestAlongRoute = along;
    }

    traversed += segmentLength;
  }

  return bestAlongRoute;
}

async function fetchStopsAlongRoute(
  coordinates: [number, number][],
  onProgress?: PlanTripOptions["onProgress"],
): Promise<{ stops: RouteStop[]; warning?: string }> {
  const samplePoints = sampleRoutePoints(coordinates);

  emitProgress(onProgress, {
    stage: "stops",
    message: "Searching for gas and grocery stops…",
  });

  const { elements, warning } = await queryOverpass(samplePoints, onProgress);
  const elementMap = new Map<string, OverpassElement>();

  for (const element of elements) {
    elementMap.set(`${element.type}/${element.id}`, element);
  }

  const stops: RouteStop[] = [];

  for (const element of elementMap.values()) {
    const coords = getElementCoordinates(element);
    const tags = element.tags;
    if (!coords || !tags) continue;

    const stopType = getStopType(tags);
    if (!stopType) continue;

    stops.push({
      id: `${element.type}/${element.id}`,
      name: tags.name ?? (stopType === "gas" ? "Gas station" : "Grocery store"),
      type: stopType,
      latitude: coords.lat,
      longitude: coords.lon,
      address: buildAddress(tags),
      openStatus: parseOpenStatus(tags.opening_hours),
      openingHours: tags.opening_hours,
      distanceAlongRouteKm: distanceAlongRouteKm(
        coordinates,
        coords.lat,
        coords.lon,
      ),
    });
  }

  stops.sort((a, b) => a.distanceAlongRouteKm - b.distanceAlongRouteKm);
  return { stops, warning };
}

export async function searchTripLocations(query: string): Promise<TripLocation[]> {
  const results = await searchCities(query);
  return results.map((result) => ({
    name: formatLocationName(result.name, result.admin1, result.country),
    latitude: result.latitude,
    longitude: result.longitude,
    admin1: result.admin1,
    country: result.country,
  }));
}

export async function planTrip(input: PlanTripOptions): Promise<TripPlan> {
  const { onProgress, onRoute, ...locationInput } = input;

  emitProgress(onProgress, {
    stage: "geocoding",
    message: "Finding your start and destination…",
  });

  const [from, to] = await Promise.all([
    resolveLocation(
      locationInput.fromQuery,
      locationInput.fromLat,
      locationInput.fromLng,
      "origin",
    ),
    resolveLocation(
      locationInput.toQuery,
      locationInput.toLat,
      locationInput.toLng,
      "destination",
    ),
  ]);

  emitProgress(onProgress, {
    stage: "routing",
    message: "Calculating the driving route…",
  });

  const { geometry, distanceKm, durationMin } = await fetchDrivingRoute(from, to);
  const coordinates = geometry.coordinates as [number, number][];

  const summary = {
    distanceMi: Math.round(distanceKm * 0.621371),
    durationMin,
  };

  onRoute?.({
    from,
    to,
    route: geometry,
    summary,
  });

  const { stops, warning } = await fetchStopsAlongRoute(coordinates, onProgress);

  emitProgress(onProgress, {
    stage: "complete",
    message: "Trip ready!",
  });

  return {
    from,
    to,
    route: geometry,
    summary,
    stops,
    stopsWarning: warning,
  };
}
