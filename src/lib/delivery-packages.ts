import type { DeliverySkateboard } from "@/lib/delivery";
import { SIM_ADVANCE_CHUNK_MS } from "@/lib/delivery-rush-difficulty";
import type { DeliveryAnimal, DeliveryAnimalId } from "@/lib/delivery-mounts";
import {
  DELIVERY_BASE_EARN_PER_PACKAGE,
  earnPerPackage,
  effectiveSpeed,
  getAnimal,
} from "@/lib/delivery-mounts";

export const MAX_UNDELIVERED = 30;
export const DEFAULT_SPAWN_INTERVAL_MS = 6000;
export const DELIVERY_EARN_PER_PACKAGE = DELIVERY_BASE_EARN_PER_PACKAGE;

export const RARE_PACKAGE_PAYOUT = DELIVERY_BASE_EARN_PER_PACKAGE;
/** Chance each new spawn is a rare ($100) package. */
export const RARE_PACKAGE_SPAWN_CHANCE = 0.06;

export type PackageKind = "standard" | "rare";

export type DeliveryPackagePending = {
  id: string;
  createdAt: string;
  kind: PackageKind;
};

export type DeliveryPackageInTransit = {
  id: string;
  packageIds: string[];
  packageKinds: PackageKind[];
  skateboardId: string;
  courierName: string;
  mount: DeliveryAnimalId;
  assignedAt: string;
  returnAt: string;
};

export type CompletedDeliveryCredit = {
  packageId: string;
  mount: DeliveryAnimalId;
  kind: PackageKind;
};

export type CompletedTripSummary = {
  skateboardId: string;
  mount: DeliveryAnimalId;
  packageCount: number;
};

export type DeliveryIdleCourier = {
  id: string;
  name: string;
  mount: DeliveryAnimalId;
};

export type DeliveryPackageBoard = {
  pending: DeliveryPackagePending[];
  inTransit: DeliveryPackageInTransit[];
  idleCouriers: DeliveryIdleCourier[];
  busyCourierIds: string[];
  pendingCount: number;
};

export type DeliveryRushState = {
  pending: DeliveryPackagePending[];
  inTransit: DeliveryPackageInTransit[];
  gameOver: boolean;
  startedAt: number;
  lastSpawnAt: number;
  deliveredCount: number;
};

export type AssignPackageResult =
  | { ok: true; state: DeliveryRushState; returnAt: string; tripSeconds: number }
  | {
      ok: false;
      code:
        | "game_over"
        | "not_pending"
        | "invalid_courier"
        | "courier_busy"
        | "courier_unavailable"
        | "unknown";
    };

export type AutoAssignPackagesResult =
  | { ok: true; state: DeliveryRushState; assignedCount: number }
  | { ok: false; code: "game_over" | "nothing_to_assign" };

export type TickRushResult = {
  state: DeliveryRushState;
  completedTrips: number;
  completedTripSummaries: CompletedTripSummary[];
  completedPackageIds: string[];
  completedCredits: CompletedDeliveryCredit[];
  spawned: boolean;
  justLost: boolean;
};

export function createPackageId(): string {
  return crypto.randomUUID();
}

export function rollPackageKind(): PackageKind {
  return Math.random() < RARE_PACKAGE_SPAWN_CHANCE ? "rare" : "standard";
}

export function createSpawnedPackage(createdAtMs: number): DeliveryPackagePending {
  return {
    id: createPackageId(),
    createdAt: new Date(createdAtMs).toISOString(),
    kind: rollPackageKind(),
  };
}

export function payoutForPackage(
  kind: PackageKind,
  mount: DeliveryAnimalId,
): number {
  if (kind === "rare") return RARE_PACKAGE_PAYOUT;
  return earnPerPackage(getAnimal(mount));
}

export function packageKindForTrip(
  trip: DeliveryPackageInTransit,
  packageId: string,
  index: number,
): PackageKind {
  if (trip.packageKinds.length > index) {
    return trip.packageKinds[index];
  }
  return "standard";
}

export function createInitialRushState(nowMs = Date.now()): DeliveryRushState {
  return {
    pending: [],
    inTransit: [],
    gameOver: false,
    startedAt: nowMs,
    lastSpawnAt: nowMs,
    deliveredCount: 0,
  };
}

export function tripDurationMs(speed: number): number {
  const seconds = Math.round(120 / Math.max(1, speed));
  return seconds * 1000;
}

export function formatTripDuration(totalSeconds: number): string {
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return secs === 0 ? `${mins}m` : `${mins}m ${secs}s`;
}

export function formatCountdown(returnAtIso: string, nowMs = Date.now()): string {
  const remaining = Math.max(
    0,
    Math.ceil((new Date(returnAtIso).getTime() - nowMs) / 1000),
  );
  return formatTripDuration(remaining);
}

export function expectedTripSeconds(mount: DeliveryAnimalId): number {
  return Math.round(tripDurationMs(effectiveSpeed(getAnimal(mount))) / 1000);
}

export function totalEarnForCredits(credits: CompletedDeliveryCredit[]): number {
  let total = 0;
  for (const credit of credits) {
    total += payoutForPackage(credit.kind, credit.mount);
  }
  return total;
}

export function packagesPerTrip(
  animal: DeliveryAnimal,
  pendingCount: number,
): number {
  if (pendingCount <= 0) return 0;
  return Math.min(Math.max(1, animal.capacity), pendingCount);
}

export function expectedTripEarnings(
  mount: DeliveryAnimalId,
  pending: DeliveryPackagePending[],
): number {
  const animal = getAnimal(mount);
  const count = packagesPerTrip(animal, pending.length);
  const hauled = pending.slice(0, count);
  let total = 0;
  for (const pkg of hauled) {
    total += payoutForPackage(pkg.kind, mount);
  }
  return total;
}

function compareCouriersForAutoAssign(
  a: DeliveryIdleCourier,
  b: DeliveryIdleCourier,
): number {
  const animalA = getAnimal(a.mount);
  const animalB = getAnimal(b.mount);
  const capDiff = animalB.capacity - animalA.capacity;
  if (capDiff !== 0) return capDiff;
  return expectedTripSeconds(b.mount) - expectedTripSeconds(a.mount);
}

function busyCourierIds(inTransit: DeliveryPackageInTransit[]): string[] {
  return inTransit.map((trip) => trip.skateboardId);
}

export function buildBoard(
  pending: DeliveryPackagePending[],
  inTransit: DeliveryPackageInTransit[],
  skateboards: DeliverySkateboard[],
  eligibleCourierIds?: Set<string>,
): DeliveryPackageBoard {
  const busy = new Set(busyCourierIds(inTransit));
  const idleCouriers: DeliveryIdleCourier[] = skateboards
    .filter((c) => !busy.has(c.id))
    .filter((c) => !eligibleCourierIds || eligibleCourierIds.has(c.id))
    .map((c) => ({ id: c.id, name: c.name, mount: c.mount }));

  return {
    pending,
    inTransit,
    idleCouriers,
    busyCourierIds: [...busy],
    pendingCount: pending.length,
  };
}

function withGameOverCheck(state: DeliveryRushState): DeliveryRushState {
  if (state.gameOver) return state;
  if (state.pending.length >= MAX_UNDELIVERED) {
    return { ...state, gameOver: true };
  }
  return state;
}

export function tickRushState(
  state: DeliveryRushState,
  nowMs: number,
  spawnIntervalMs = DEFAULT_SPAWN_INTERVAL_MS,
): TickRushResult {
  if (state.gameOver) {
    return {
      state,
      completedTrips: 0,
      completedTripSummaries: [],
      completedPackageIds: [],
      completedCredits: [],
      spawned: false,
      justLost: false,
    };
  }

  const stillInTransit: DeliveryPackageInTransit[] = [];
  const completedPackageIds: string[] = [];
  const completedCredits: CompletedDeliveryCredit[] = [];
  const completedTripSummaries: CompletedTripSummary[] = [];
  let completedTrips = 0;
  for (const trip of state.inTransit) {
    if (new Date(trip.returnAt).getTime() <= nowMs) {
      completedTrips += 1;
      const ids =
        trip.packageIds.length > 0 ? trip.packageIds : [trip.id];
      completedTripSummaries.push({
        skateboardId: trip.skateboardId,
        mount: trip.mount,
        packageCount: ids.length,
      });
      ids.forEach((packageId, index) => {
        completedPackageIds.push(packageId);
        completedCredits.push({
          packageId,
          mount: trip.mount,
          kind: packageKindForTrip(trip, packageId, index),
        });
      });
    } else {
      stillInTransit.push(trip);
    }
  }

  let pending = state.pending;
  let lastSpawnAt = state.lastSpawnAt;
  let spawned = false;

  const maxSpawnCatchUp = 64;
  let spawnCatchUp = 0;
  while (
    spawnCatchUp < maxSpawnCatchUp &&
    nowMs - lastSpawnAt >= spawnIntervalMs &&
    pending.length < MAX_UNDELIVERED
  ) {
    pending = [...pending, createSpawnedPackage(nowMs)];
    lastSpawnAt += spawnIntervalMs;
    spawned = true;
    spawnCatchUp += 1;
  }

  const wasPlaying = !state.gameOver;
  let next: DeliveryRushState = {
    ...state,
    pending,
    inTransit: stillInTransit,
    lastSpawnAt,
    deliveredCount: state.deliveredCount + completedPackageIds.length,
  };
  next = withGameOverCheck(next);
  const justLost = wasPlaying && next.gameOver;

  return {
    state: next,
    completedTrips,
    completedTripSummaries,
    completedPackageIds,
    completedCredits,
    spawned,
    justLost,
  };
}

export type RushSimTimeOptions = {
  /** Simulation clock ms (not wall clock). Defaults to Date.now(). */
  nowMs?: number;
};

export type AdvanceRushSimResult = {
  state: DeliveryRushState;
  endSimMs: number;
  completedCredits: CompletedDeliveryCredit[];
};

/** Advance sim time in chunks so spawns and trips scale with sim speed. */
export function advanceRushSim(
  state: DeliveryRushState,
  startSimMs: number,
  simAdvanceMs: number,
  spawnIntervalMs: number,
  chunkMs = SIM_ADVANCE_CHUNK_MS,
): AdvanceRushSimResult {
  if (simAdvanceMs <= 0 || state.gameOver) {
    return { state, endSimMs: startSimMs, completedCredits: [] };
  }

  let current = state;
  let simMs = startSimMs;
  let remaining = simAdvanceMs;
  const completedCredits: CompletedDeliveryCredit[] = [];

  while (remaining > 0 && !current.gameOver) {
    const step = Math.min(chunkMs, remaining);
    simMs += step;
    remaining -= step;
    const result = tickRushState(current, simMs, spawnIntervalMs);
    current = result.state;
    completedCredits.push(...result.completedCredits);
  }

  return { state: current, endSimMs: simMs, completedCredits };
}

export function assignPackage(
  state: DeliveryRushState,
  packageId: string,
  skateboardId: string,
  couriers: DeliverySkateboard[],
  eligibleCourierIds?: Set<string>,
  options?: RushSimTimeOptions,
): AssignPackageResult {
  if (state.gameOver) {
    return { ok: false, code: "game_over" };
  }

  if (!state.pending.some((p) => p.id === packageId)) {
    return { ok: false, code: "not_pending" };
  }

  const courier = couriers.find((c) => c.id === skateboardId);
  if (!courier) {
    return { ok: false, code: "invalid_courier" };
  }

  const busy = new Set(busyCourierIds(state.inTransit));
  if (busy.has(skateboardId)) {
    return { ok: false, code: "courier_busy" };
  }

  if (eligibleCourierIds && !eligibleCourierIds.has(skateboardId)) {
    return { ok: false, code: "courier_unavailable" };
  }

  const animal = getAnimal(courier.mount);
  const haulCount = packagesPerTrip(animal, state.pending.length);
  const hauled = state.pending.slice(0, haulCount);
  const hauledIds = new Set(hauled.map((p) => p.id));
  const pending = state.pending.filter((p) => !hauledIds.has(p.id));

  const nowMs = options?.nowMs ?? Date.now();
  const tripSeconds = expectedTripSeconds(courier.mount);
  const returnAt = new Date(nowMs + tripSeconds * 1000).toISOString();
  const assignedAt = new Date(nowMs).toISOString();
  const packageIds = hauled.map((p) => p.id);
  const packageKinds = hauled.map((p) => p.kind);

  const inTransit: DeliveryPackageInTransit[] = [
    ...state.inTransit,
    {
      id: packageIds[0],
      packageIds,
      packageKinds,
      skateboardId: courier.id,
      courierName: courier.name,
      mount: courier.mount,
      assignedAt,
      returnAt,
    },
  ];

  const next = withGameOverCheck({
    ...state,
    pending,
    inTransit,
  });

  return {
    ok: true,
    state: next,
    returnAt,
    tripSeconds,
  };
}

export function autoAssignPackages(
  state: DeliveryRushState,
  couriers: DeliverySkateboard[],
  eligibleCourierIds?: Set<string>,
  options?: RushSimTimeOptions,
): AutoAssignPackagesResult {
  if (state.gameOver) {
    return { ok: false, code: "game_over" };
  }

  let current = state;
  let assignedCount = 0;

  while (!current.gameOver) {
    const idle = buildBoard(
      current.pending,
      current.inTransit,
      couriers,
      eligibleCourierIds,
    )
      .idleCouriers.slice()
      .sort(compareCouriersForAutoAssign);
    const pkg = current.pending[0];
    if (!pkg || idle.length === 0) {
      break;
    }

    const result = assignPackage(
      current,
      pkg.id,
      idle[0].id,
      couriers,
      eligibleCourierIds,
      options,
    );
    if (!result.ok) {
      break;
    }

    current = result.state;
    assignedCount++;
  }

  if (assignedCount > 0) {
    return { ok: true, state: current, assignedCount };
  }

  if (current.gameOver) {
    return { ok: false, code: "game_over" };
  }

  return { ok: false, code: "nothing_to_assign" };
}
