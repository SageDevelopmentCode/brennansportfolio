import type { SolarBodyFacts } from "@/lib/solar-system/bodies";

export type ApodPayload = {
  title: string;
  explanation: string;
  url: string;
  hdurl: string | null;
  mediaType: string;
  date: string;
  copyright: string | null;
};

export type NeoAsteroidPayload = {
  name: string;
  closeApproachDate: string;
  missDistanceKm: number;
  diameterMeters: number | null;
  potentiallyHazardous: boolean;
};

export type SolarSystemFeedPayload = {
  apod: ApodPayload | null;
  asteroids: NeoAsteroidPayload[];
  warning?: string;
};

export type DonkiFlarePayload = {
  beginTime: string;
  classType: string;
  sourceLocation: string;
};

export type EpicImagePayload = {
  imageUrl: string;
  caption: string;
  date: string;
  sourceUrl: string;
};

export type MoonImagePayload = {
  name: string;
  imageUrl: string;
  caption: string | null;
  sourceUrl: string | null;
};

export type BodyExtras =
  | { kind: "sun"; flares: DonkiFlarePayload[] }
  | { kind: "earth"; epicImages: EpicImagePayload[] }
  | { kind: "moons"; moons: MoonImagePayload[] };

export type SolarSystemDetailPayload = {
  body: SolarBodyFacts;
  imageUrl: string | null;
  imageCaption: string | null;
  sourceUrl: string | null;
  factSheetUrl: string;
  warning?: string;
  extras: BodyExtras | null;
  extrasWarning?: string;
};
