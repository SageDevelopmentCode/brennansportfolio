import type { DeliverySkateboard } from "@/lib/delivery";
import type {
  CompletedTripSummary,
  DeliveryPackageInTransit,
} from "@/lib/delivery-packages";
import type { DeliveryAnimalId } from "@/lib/delivery-mounts";
import { getAnimal } from "@/lib/delivery-mounts";

export const HUNGER_MAX = 100;
export const HUNGER_FEED_PER_SEC = 20;

export type CourierFarmRole = "eating" | "waiting" | null;

export type CourierStation = "depot" | "farm";

export type CourierCare = {
  packagesSinceFeed: number;
  needsFood: boolean;
  feedProgress: number;
  station: CourierStation;
  farmRole: CourierFarmRole;
};

export type CourierCareMap = Record<string, CourierCare>;

function defaultCare(): CourierCare {
  return {
    packagesSinceFeed: 0,
    needsFood: false,
    feedProgress: 0,
    station: "depot",
    farmRole: null,
  };
}

export function createInitialCourierCare(
  skateboards: DeliverySkateboard[],
): CourierCareMap {
  const care: CourierCareMap = {};
  for (const board of skateboards) {
    care[board.id] = defaultCare();
  }
  return care;
}

export function mergeCourierCare(
  existing: CourierCareMap,
  skateboards: DeliverySkateboard[],
): CourierCareMap {
  const next: CourierCareMap = { ...existing };
  for (const board of skateboards) {
    if (!next[board.id]) {
      next[board.id] = defaultCare();
    }
  }
  for (const id of Object.keys(next)) {
    if (!skateboards.some((b) => b.id === id)) {
      delete next[id];
    }
  }
  return next;
}

function inTransitIds(inTransit: DeliveryPackageInTransit[]): Set<string> {
  return new Set(inTransit.map((trip) => trip.skateboardId));
}

export function courierIdsEligibleForDelivery(
  care: CourierCareMap,
  inTransit: DeliveryPackageInTransit[],
): Set<string> {
  const delivering = inTransitIds(inTransit);
  const eligible = new Set<string>();
  for (const [id, entry] of Object.entries(care)) {
    if (delivering.has(id)) continue;
    if (entry.station !== "depot") continue;
    if (entry.needsFood) continue;
    eligible.add(id);
  }
  return eligible;
}

function addPackagesForCourier(
  entry: CourierCare,
  mount: DeliverySkateboard["mount"],
  packageCount: number,
): CourierCare {
  if (packageCount <= 0) return entry;
  const threshold = getAnimal(mount).feedAfterPackages;
  let packagesSinceFeed = entry.packagesSinceFeed + packageCount;
  let needsFood = entry.needsFood;

  while (packagesSinceFeed >= threshold) {
    needsFood = true;
    packagesSinceFeed %= threshold;
  }

  return {
    ...entry,
    packagesSinceFeed,
    needsFood,
  };
}

export function applyPackagesDelivered(
  care: CourierCareMap,
  trips: CompletedTripSummary[],
  skateboards: DeliverySkateboard[],
): CourierCareMap {
  if (trips.length === 0) return care;

  const next: CourierCareMap = { ...care };
  for (const trip of trips) {
    const board = skateboards.find((b) => b.id === trip.skateboardId);
    if (!board) continue;
    const current = next[trip.skateboardId] ?? defaultCare();
    next[trip.skateboardId] = addPackagesForCourier(
      current,
      board.mount,
      trip.packageCount,
    );
  }
  return next;
}

export type TickCourierFeedingResult = {
  care: CourierCareMap;
  mountsFed: DeliveryAnimalId[];
};

export function tickCourierFeeding(
  care: CourierCareMap,
  skateboards: DeliverySkateboard[],
  inTransit: DeliveryPackageInTransit[],
  deltaSec: number,
): TickCourierFeedingResult {
  const delivering = inTransitIds(inTransit);
  const next: CourierCareMap = { ...care };
  const mountsFed: DeliveryAnimalId[] = [];

  for (const board of skateboards) {
    const current = next[board.id] ?? defaultCare();
    let entry = current;

    if (delivering.has(board.id)) {
      next[board.id] = {
        ...entry,
        station: "depot",
        farmRole: null,
        feedProgress: 0,
      };
      continue;
    }

    if (entry.station === "farm" && entry.farmRole === "eating") {
      let feedProgress = Math.min(
        HUNGER_MAX,
        entry.feedProgress + HUNGER_FEED_PER_SEC * deltaSec,
      );
      if (feedProgress >= HUNGER_MAX) {
        mountsFed.push(board.mount);
        entry = {
          packagesSinceFeed: 0,
          needsFood: false,
          feedProgress: 0,
          station: "depot",
          farmRole: null,
        };
      } else {
        entry = { ...entry, feedProgress };
      }
    }

    next[board.id] = entry;
  }

  return { care: next, mountsFed };
}

/** @deprecated use tickCourierFeeding */
export function tickCourierCare(
  care: CourierCareMap,
  skateboards: DeliverySkateboard[],
  inTransit: DeliveryPackageInTransit[],
  deltaSec: number,
): TickCourierFeedingResult {
  return tickCourierFeeding(care, skateboards, inTransit, deltaSec);
}

export function countFarmEating(care: CourierCareMap): number {
  let n = 0;
  for (const entry of Object.values(care)) {
    if (entry.station === "farm" && entry.farmRole === "eating") n++;
  }
  return n;
}

export function countFarmWaiting(care: CourierCareMap): number {
  let n = 0;
  for (const entry of Object.values(care)) {
    if (entry.station === "farm" && entry.farmRole === "waiting") n++;
  }
  return n;
}

/** Bar fill 0–100 for courier sprites at depot (meal progress) or farm (eating). */
export function courierSpriteBarPct(
  care: CourierCare,
  mount: DeliverySkateboard["mount"],
): number {
  if (care.station === "farm") {
    if (care.farmRole === "waiting") return 8;
    return Math.max(0, Math.min(100, care.feedProgress));
  }
  if (care.needsFood) return 0;
  const threshold = getAnimal(mount).feedAfterPackages;
  if (threshold <= 0) return 100;
  return Math.max(
    0,
    Math.min(100, (care.packagesSinceFeed / threshold) * 100),
  );
}

export function getCourierHunger(
  care: CourierCareMap,
  courierId: string,
  mount?: DeliverySkateboard["mount"],
): number {
  const entry = care[courierId];
  if (!entry) return HUNGER_MAX;
  if (mount) {
    return courierSpriteBarPct(entry, mount);
  }
  if (entry.station === "farm" && entry.farmRole === "eating") {
    return entry.feedProgress;
  }
  return entry.needsFood ? 0 : HUNGER_MAX;
}
