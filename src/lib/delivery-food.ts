import type { DeliveryAnimal, DeliveryAnimalId } from "@/lib/delivery-mounts";
import { DELIVERY_ANIMAL_IDS, getAnimal, WEIRD_FOODS } from "@/lib/delivery-mounts";

export const MEALS_PER_FEED_PURCHASE = 5;

export const FEED_UNIT_MIN = 1;
export const FEED_UNIT_MAX = 100;
const ANIMAL_PRICE_MIN = 18;
const ANIMAL_PRICE_MAX = 100_000;

export type DeliveryFoodStock = Partial<Record<DeliveryAnimalId, number>>;

export type StockedFeedRow = {
  mountId: DeliveryAnimalId;
  label: string;
  emoji: string;
  meals: number;
};

export type AnimalFeedInfo = {
  mountId: DeliveryAnimalId;
  label: string;
  emoji: string;
  unitPrice: number;
};

/** Each courier species eats its own feed (unique label per animal). */
export function feedInfoForAnimal(animal: DeliveryAnimal): AnimalFeedInfo {
  if (animal.foodId) {
    const weird = WEIRD_FOODS[animal.foodId];
    return {
      mountId: animal.id,
      label: `${animal.label} ${weird.label}`,
      emoji: weird.emoji,
      unitPrice: feedUnitPrice(animal),
    };
  }
  return {
    mountId: animal.id,
    label: `${animal.label} chow`,
    emoji: animal.emoji,
    unitPrice: feedUnitPrice(animal),
  };
}

export function feedInfoForMount(mountId: DeliveryAnimalId): AnimalFeedInfo {
  return feedInfoForAnimal(getAnimal(mountId));
}

export function feedUnitPrice(animal: DeliveryAnimal): number {
  const span = ANIMAL_PRICE_MAX - ANIMAL_PRICE_MIN;
  const t = span <= 0 ? 0 : (animal.price - ANIMAL_PRICE_MIN) / span;
  return Math.max(
    FEED_UNIT_MIN,
    Math.min(
      FEED_UNIT_MAX,
      Math.round(FEED_UNIT_MIN + t * (FEED_UNIT_MAX - FEED_UNIT_MIN)),
    ),
  );
}

export function feedBagPrice(animal: DeliveryAnimal): number {
  return feedUnitPrice(animal) * MEALS_PER_FEED_PURCHASE;
}

export function formatFeedPrice(animal: DeliveryAnimal): string {
  return `$${feedUnitPrice(animal).toLocaleString("en-US")}`;
}

export function formatFeedBagPrice(animal: DeliveryAnimal): string {
  return `$${feedBagPrice(animal).toLocaleString("en-US")}`;
}

export function listStockedFeeds(
  stock: DeliveryFoodStock,
  mountIds: DeliveryAnimalId[],
): StockedFeedRow[] {
  const rows: StockedFeedRow[] = [];
  for (const mountId of mountIds) {
    const meals = foodCount(stock, mountId);
    if (meals <= 0) continue;
    const feed = feedInfoForMount(mountId);
    rows.push({
      mountId,
      label: feed.label,
      emoji: feed.emoji,
      meals,
    });
  }
  return rows.sort((a, b) => a.label.localeCompare(b.label));
}

export function foodCount(stock: DeliveryFoodStock, mount: DeliveryAnimalId): number {
  return stock[mount] ?? 0;
}

export function parseFoodStock(value: unknown): DeliveryFoodStock {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const out: DeliveryFoodStock = {};
  for (const id of DELIVERY_ANIMAL_IDS) {
    const raw = (value as Record<string, unknown>)[id];
    const n =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
          ? Number(raw)
          : NaN;
    if (Number.isFinite(n) && n > 0) {
      out[id] = Math.floor(n);
    }
  }
  return out;
}

export function addFoodStock(
  stock: DeliveryFoodStock,
  mount: DeliveryAnimalId,
  amount: number,
): DeliveryFoodStock {
  if (amount <= 0) return stock;
  const next = { ...stock };
  next[mount] = foodCount(stock, mount) + amount;
  return next;
}

export function totalFoodMeals(stock: DeliveryFoodStock): number {
  let total = 0;
  for (const id of DELIVERY_ANIMAL_IDS) {
    total += foodCount(stock, id);
  }
  return total;
}

export function consumeFoodStock(
  stock: DeliveryFoodStock,
  mount: DeliveryAnimalId,
): DeliveryFoodStock | null {
  const current = foodCount(stock, mount);
  if (current <= 0) return null;
  const next = { ...stock };
  const left = current - 1;
  if (left <= 0) {
    delete next[mount];
  } else {
    next[mount] = left;
  }
  return next;
}
