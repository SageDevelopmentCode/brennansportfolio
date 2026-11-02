import type { FoodItem } from "@/lib/food-allergies";

export const EXTERNAL_FOODS_STORAGE_KEY = "allergy-plate-external-foods-v1";

function parseExternalFoods(raw: unknown): FoodItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is FoodItem => {
    if (!item || typeof item !== "object") return false;
    const o = item as Partial<FoodItem>;
    return typeof o.id === "string" && o.id.startsWith("off-") && typeof o.name === "string";
  });
}

export function loadExternalFoods(): FoodItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(EXTERNAL_FOODS_STORAGE_KEY);
    if (!raw) return [];
    return parseExternalFoods(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

export function registerExternalFood(food: FoodItem): void {
  if (typeof window === "undefined" || !food.id.startsWith("off-")) return;
  const existing = loadExternalFoods();
  if (existing.some((f) => f.id === food.id)) return;
  localStorage.setItem(
    EXTERNAL_FOODS_STORAGE_KEY,
    JSON.stringify([...existing, food]),
  );
}

export function clearExternalFoods(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(EXTERNAL_FOODS_STORAGE_KEY);
}
