import type { DeliveryFoodStock } from "@/lib/delivery-food";
import { parseFoodStock } from "@/lib/delivery-food";

const STORAGE_KEY = "skate-drop-food-pantry-v1";

export function loadLocalFoodPantry(): DeliveryFoodStock {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return parseFoodStock(JSON.parse(raw) as unknown);
  } catch {
    return {};
  }
}

export function saveLocalFoodPantry(stock: DeliveryFoodStock): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stock));
  } catch {
    // ignore quota / private mode
  }
}

/** Prefer the higher count per species (server + this browser). */
export function mergeFoodPantries(
  server: DeliveryFoodStock,
  local: DeliveryFoodStock,
): DeliveryFoodStock {
  const out: DeliveryFoodStock = { ...server };
  for (const [mount, qty] of Object.entries(local) as [
    keyof DeliveryFoodStock,
    number,
  ][]) {
    if (!qty || qty <= 0) continue;
    const serverQty = out[mount] ?? 0;
    out[mount] = Math.max(serverQty, qty);
  }
  return out;
}
