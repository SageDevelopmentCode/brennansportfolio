import type { DeliverySkateboard } from "@/lib/delivery";
import type { DeliveryFoodStock } from "@/lib/delivery-food";
import { foodCount } from "@/lib/delivery-food";
import type { DeliveryAnimalId } from "@/lib/delivery-mounts";
import type { DeliveryPackageInTransit } from "@/lib/delivery-packages";
import type { CourierCare, CourierCareMap } from "@/lib/delivery-hunger";

export const FARM_EATING_SLOTS = 2;

export type SendCourierToFarmResult =
  | { ok: true; care: CourierCareMap; waitOrder: string[] }
  | {
      ok: false;
      code:
        | "not_found"
        | "delivering"
        | "not_at_depot"
        | "not_hungry"
        | "already_at_farm";
    };

export type AutoSendStarvingToFarmResult =
  | { ok: true; care: CourierCareMap; waitOrder: string[]; sentCount: number }
  | { ok: false; code: "nothing_to_send" };

export type TickFarmQueueResult = {
  care: CourierCareMap;
  waitOrder: string[];
};

function inTransitIds(inTransit: DeliveryPackageInTransit[]): Set<string> {
  return new Set(inTransit.map((trip) => trip.skateboardId));
}

function isOnFarm(entry: CourierCare): boolean {
  return entry.station === "farm";
}

function mountForCourier(
  skateboards: DeliverySkateboard[],
  courierId: string,
): DeliveryAnimalId | null {
  const board = skateboards.find((b) => b.id === courierId);
  return board?.mount ?? null;
}

/** Meals already at the trough (not yet deducted from pantry). */
function reservedFoodForMount(
  care: CourierCareMap,
  skateboards: DeliverySkateboard[],
  mount: DeliveryAnimalId,
): number {
  let n = 0;
  for (const board of skateboards) {
    if (board.mount !== mount) continue;
    const entry = care[board.id];
    if (entry?.station === "farm" && entry.farmRole === "eating") {
      n++;
    }
  }
  return n;
}

function availableFoodForMount(
  foodStock: DeliveryFoodStock,
  care: CourierCareMap,
  skateboards: DeliverySkateboard[],
  mount: DeliveryAnimalId,
): number {
  return Math.max(
    0,
    foodCount(foodStock, mount) - reservedFoodForMount(care, skateboards, mount),
  );
}

function courierCanEatNow(
  care: CourierCareMap,
  skateboards: DeliverySkateboard[],
  foodStock: DeliveryFoodStock,
  courierId: string,
): boolean {
  const mount = mountForCourier(skateboards, courierId);
  if (!mount) return false;
  return availableFoodForMount(foodStock, care, skateboards, mount) > 0;
}

function assignFarmRoles(
  care: CourierCareMap,
  waitOrder: string[],
  skateboards: DeliverySkateboard[],
  foodStock: DeliveryFoodStock,
): CourierCareMap {
  const next: CourierCareMap = { ...care };
  const eatingIds: string[] = [];
  const waitingIds: string[] = [];

  for (const id of waitOrder) {
    const entry = next[id];
    if (!entry || !isOnFarm(entry)) continue;
    if (
      eatingIds.length < FARM_EATING_SLOTS &&
      courierCanEatNow(next, skateboards, foodStock, id)
    ) {
      eatingIds.push(id);
    } else {
      waitingIds.push(id);
    }
  }

  for (const id of Object.keys(next)) {
    const entry = next[id];
    if (!isOnFarm(entry)) continue;
    if (eatingIds.includes(id)) {
      next[id] = {
        ...entry,
        farmRole: "eating",
        feedProgress: entry.farmRole === "eating" ? entry.feedProgress : 0,
      };
    } else if (waitingIds.includes(id)) {
      next[id] = { ...entry, farmRole: "waiting", feedProgress: 0 };
    }
  }

  return next;
}

export function enqueueCourierForFeed(
  care: CourierCareMap,
  waitOrder: string[],
  courierId: string,
  inTransit: DeliveryPackageInTransit[],
  skateboards: DeliverySkateboard[],
  foodStock: DeliveryFoodStock,
): SendCourierToFarmResult {
  const entry = care[courierId];
  if (!entry) {
    return { ok: false, code: "not_found" };
  }
  if (inTransitIds(inTransit).has(courierId)) {
    return { ok: false, code: "delivering" };
  }
  if (isOnFarm(entry)) {
    return { ok: false, code: "already_at_farm" };
  }
  if (entry.station !== "depot") {
    return { ok: false, code: "not_at_depot" };
  }
  if (!entry.needsFood) {
    return { ok: false, code: "not_hungry" };
  }

  const nextOrder = waitOrder.includes(courierId)
    ? waitOrder
    : [...waitOrder, courierId];

  let nextCare: CourierCareMap = {
    ...care,
    [courierId]: {
      ...entry,
      station: "farm",
      farmRole: "waiting",
      feedProgress: 0,
    },
  };

  nextCare = assignFarmRoles(nextCare, nextOrder, skateboards, foodStock);

  return { ok: true, care: nextCare, waitOrder: nextOrder };
}

export function sendCourierToFarm(
  care: CourierCareMap,
  waitOrder: string[],
  courierId: string,
  inTransit: DeliveryPackageInTransit[],
  skateboards: DeliverySkateboard[],
  foodStock: DeliveryFoodStock,
): SendCourierToFarmResult {
  return enqueueCourierForFeed(
    care,
    waitOrder,
    courierId,
    inTransit,
    skateboards,
    foodStock,
  );
}

export function autoSendStarvingToFarm(
  care: CourierCareMap,
  waitOrder: string[],
  skateboards: DeliverySkateboard[],
  inTransit: DeliveryPackageInTransit[],
  foodStock: DeliveryFoodStock,
): AutoSendStarvingToFarmResult {
  let current = care;
  let order = waitOrder;
  let sentCount = 0;
  const delivering = inTransitIds(inTransit);

  for (const board of skateboards) {
    const entry = current[board.id];
    if (!entry) continue;
    if (delivering.has(board.id)) continue;
    if (entry.station !== "depot") continue;
    if (!entry.needsFood) continue;

    const result = enqueueCourierForFeed(
      current,
      order,
      board.id,
      inTransit,
      skateboards,
      foodStock,
    );
    if (!result.ok) continue;
    current = result.care;
    order = result.waitOrder;
    sentCount++;
  }

  if (sentCount > 0) {
    return { ok: true, care: current, waitOrder: order, sentCount };
  }

  return { ok: false, code: "nothing_to_send" };
}

export function tickFarmQueue(
  care: CourierCareMap,
  waitOrder: string[],
  skateboards: DeliverySkateboard[],
  foodStock: DeliveryFoodStock,
): TickFarmQueueResult {
  const cleanedOrder = waitOrder.filter((id) => {
    const entry = care[id];
    return entry && isOnFarm(entry);
  });
  const next = assignFarmRoles(care, cleanedOrder, skateboards, foodStock);
  return { care: next, waitOrder: cleanedOrder };
}

export function syncFarmQueue(
  care: CourierCareMap,
  waitOrder: string[],
  skateboards: DeliverySkateboard[],
  foodStock: DeliveryFoodStock,
): TickFarmQueueResult {
  return tickFarmQueue(care, waitOrder, skateboards, foodStock);
}

export function removeFromFarmWaitOrder(
  waitOrder: string[],
  courierId: string,
): string[] {
  return waitOrder.filter((id) => id !== courierId);
}

/** Slot on the farm plot (x, y, z) in local farm group units. */
export function farmSlot(index: number, total: number): [number, number, number] {
  const cols = Math.min(4, Math.max(1, total));
  const rows = Math.ceil(total / cols);
  const col = index % cols;
  const row = Math.floor(index / cols);
  const gapX = 1.2;
  const gapZ = 1;
  const width = (cols - 1) * gapX;
  const depth = (rows - 1) * gapZ;
  const x = cols === 1 ? 0 : -width / 2 + col * gapX;
  const z = rows === 1 ? 0 : -depth / 2 + row * gapZ;
  return [x, 0.28, z];
}

/** Fixed positions for the two feeding troughs. */
export function farmEatingSlot(index: number): [number, number, number] {
  const x = index === 0 ? -0.9 : 0.9;
  return [x, 0.28, 0.2];
}

/** Queue line behind the troughs. */
export function farmWaitingSlot(index: number): [number, number, number] {
  const x = -1.8 + (index % 4) * 1.2;
  const z = -1.1 - Math.floor(index / 4) * 0.9;
  return [x, 0.28, z];
}
