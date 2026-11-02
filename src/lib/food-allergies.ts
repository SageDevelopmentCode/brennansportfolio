import { FOOD_CATALOG as RAW_CATALOG, isCatalogCandyId } from "@/lib/food-catalog";
import {
  clearExternalFoods as clearExternalFoodsStorage,
  loadExternalFoods,
  registerExternalFood as saveExternalFood,
} from "@/lib/food-external-cache";

export function registerExternalFood(food: FoodItem): void {
  saveExternalFood(food);
  rebuildFoodLookup();
}

export function clearExternalFoods(): void {
  clearExternalFoodsStorage();
  rebuildFoodLookup();
}

export const PROFILE_STORAGE_KEY = "allergy-plate-profile-v1";
export const MEALS_STORAGE_KEY = "allergy-plate-meals-v1";
export const MEALS_BY_DATE_STORAGE_KEY = "allergy-plate-meals-by-date-v2";
export const CUSTOM_FOODS_STORAGE_KEY = "allergy-plate-custom-foods-v1";
export const CARD_SETTINGS_STORAGE_KEY = "allergy-plate-card-settings-v1";

export type AllergyCardSettings = {
  displayName?: string;
};

export type AllergyCardContent = {
  displayName: string | null;
  allergens: AllergenInfo[];
  avoidFoods: { id: string; name: string; emoji: string }[];
  isEmpty: boolean;
};

export const FOODS_PER_MEAL = 50;

export const DEFAULT_MEAL_IDS = ["breakfast", "lunch", "dinner"] as const;
export type DefaultMealId = (typeof DEFAULT_MEAL_IDS)[number];
export type MealBlockId = DefaultMealId | string;

export type MealBlock = {
  id: MealBlockId;
  label: string;
  emoji: string;
  foodIds: string[];
};

export type DayMeals = {
  date: string;
  meals: MealBlock[];
  updatedAt: string;
};

export const DEFAULT_MEALS: MealBlock[] = [
  { id: "breakfast", label: "Breakfast", emoji: "🌅", foodIds: [] },
  { id: "lunch", label: "Lunch", emoji: "☀️", foodIds: [] },
  { id: "dinner", label: "Dinner", emoji: "🌙", foodIds: [] },
];

function cloneDefaultMeals(): MealBlock[] {
  return DEFAULT_MEALS.map((m) => ({ ...m, foodIds: [] }));
}

export function isDefaultMealId(id: string): id is DefaultMealId {
  return (DEFAULT_MEAL_IDS as readonly string[]).includes(id);
}

function sanitizeFoodIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const out: string[] = [];
  for (const id of ids) {
    if (typeof id !== "string" || !isKnownFoodId(id)) continue;
    if (out.includes(id)) continue;
    out.push(id);
    if (out.length >= FOODS_PER_MEAL) break;
  }
  return out;
}

function sanitizeMealBlock(raw: unknown): MealBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<MealBlock>;
  if (typeof o.id !== "string" || typeof o.label !== "string") return null;
  return {
    id: o.id,
    label: o.label.trim() || "Meal",
    emoji: typeof o.emoji === "string" ? o.emoji : "🍽️",
    foodIds: sanitizeFoodIds(o.foodIds),
  };
}

export function sanitizeMeals(meals: MealBlock[]): MealBlock[] {
  return meals.map((m) => ({
    ...m,
    foodIds: sanitizeFoodIds(m.foodIds),
  }));
}

export function addFoodToMeal(
  meals: MealBlock[],
  mealId: string,
  foodId: string,
): { meals: MealBlock[]; error?: string } {
  if (!isKnownFoodId(foodId)) {
    return { meals, error: "Unknown food" };
  }
  let blocked = false;
  let atLimit = false;
  const next = meals.map((meal) => {
    if (meal.id !== mealId) return meal;
    if (meal.foodIds.includes(foodId)) {
      blocked = true;
      return meal;
    }
    if (meal.foodIds.length >= FOODS_PER_MEAL) {
      atLimit = true;
      return meal;
    }
    return { ...meal, foodIds: [...meal.foodIds, foodId] };
  });
  if (atLimit) return { meals, error: `Only ${FOODS_PER_MEAL} foods per meal` };
  if (blocked) return { meals, error: "Already on this meal" };
  return { meals: next };
}

export function removeFoodFromMeal(
  meals: MealBlock[],
  mealId: string,
  foodId: string,
): MealBlock[] {
  return meals.map((meal) =>
    meal.id !== mealId
      ? meal
      : { ...meal, foodIds: meal.foodIds.filter((id) => id !== foodId) },
  );
}

export function addCustomMeal(meals: MealBlock[], label: string): MealBlock[] {
  const trimmed = label.trim();
  if (!trimmed) return meals;
  const id = `custom-${Date.now()}`;
  return [
    ...meals,
    { id, label: trimmed, emoji: "🍽️", foodIds: [] },
  ];
}

export function removeMeal(meals: MealBlock[], mealId: string): MealBlock[] {
  if (isDefaultMealId(mealId)) return meals;
  return meals.filter((m) => m.id !== mealId);
}

export function countDayMealFoods(meals: MealBlock[]): number {
  return meals.reduce((sum, m) => sum + m.foodIds.length, 0);
}

export function dayMealsHasAnyFood(meals: MealBlock[]): boolean {
  return countDayMealFoods(meals) > 0;
}

export type AllergenId =
  | "peanut"
  | "tree_nut"
  | "milk"
  | "egg"
  | "wheat"
  | "soy"
  | "fish"
  | "shellfish"
  | "sesame";

export type FoodCategory = "snacks" | "meals" | "drinks";

export type FoodItem = {
  id: string;
  name: string;
  emoji: string;
  category: FoodCategory;
  allergens: AllergenId[];
};

export type AllergenInfo = {
  id: AllergenId;
  label: string;
  emoji: string;
};

export type AllergyProfile = {
  allergenIds: AllergenId[];
  avoidedFoodIds: string[];
  updatedAt: string;
};

export const ALLERGENS: AllergenInfo[] = [
  { id: "peanut", label: "Peanuts", emoji: "🥜" },
  { id: "tree_nut", label: "Tree nuts", emoji: "🌰" },
  { id: "milk", label: "Milk", emoji: "🥛" },
  { id: "egg", label: "Eggs", emoji: "🥚" },
  { id: "wheat", label: "Wheat", emoji: "🌾" },
  { id: "soy", label: "Soy", emoji: "🫘" },
  { id: "fish", label: "Fish", emoji: "🐟" },
  { id: "shellfish", label: "Shellfish", emoji: "🦐" },
  { id: "sesame", label: "Sesame", emoji: "🫓" },
];

const ALLERGEN_IDS = new Set<string>(ALLERGENS.map((a) => a.id));

function isAllergenId(value: unknown): value is AllergenId {
  return typeof value === "string" && ALLERGEN_IDS.has(value);
}

function toFoodItem(raw: (typeof RAW_CATALOG)[number]): FoodItem {
  return {
    id: raw.id,
    name: raw.name,
    emoji: raw.emoji,
    category: raw.category,
    allergens: raw.allergens.filter(isAllergenId),
  };
}

export const FOOD_CATALOG: FoodItem[] = RAW_CATALOG.map(toFoodItem);

function loadCustomFoodsFromStorage(): FoodItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_FOODS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const o = item as Partial<FoodItem>;
        if (typeof o.id !== "string" || typeof o.name !== "string") return null;
        return {
          id: o.id,
          name: o.name,
          emoji: typeof o.emoji === "string" ? o.emoji : "🍽️",
          category:
            o.category === "snacks" || o.category === "meals" || o.category === "drinks"
              ? o.category
              : "meals",
          allergens: Array.isArray(o.allergens) ? o.allergens.filter(isAllergenId) : [],
        } satisfies FoodItem;
      })
      .filter((f): f is FoodItem => Boolean(f));
  } catch {
    return [];
  }
}

export function getCustomFoods(): FoodItem[] {
  return loadCustomFoodsFromStorage();
}

function saveCustomFoods(foods: FoodItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CUSTOM_FOODS_STORAGE_KEY, JSON.stringify(foods));
}

export function getAllFoods(): FoodItem[] {
  return [...FOOD_CATALOG, ...loadCustomFoodsFromStorage(), ...loadExternalFoods()];
}

export function addCustomFood(name: string): FoodItem {
  const trimmed = name.trim();
  const slug = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const food: FoodItem = {
    id: `custom-${slug || "food"}-${Date.now()}`,
    name: trimmed,
    emoji: "🍽️",
    category: "meals",
    allergens: [],
  };
  saveCustomFoods([...loadCustomFoodsFromStorage(), food]);
  rebuildFoodLookup();
  return food;
}

export function isKnownFoodId(id: string): boolean {
  if (FOOD_BY_ID.has(id)) return true;
  if (FOOD_CATALOG.some((f) => f.id === id)) return true;
  if (id.startsWith("custom-")) {
    return loadCustomFoodsFromStorage().some((f) => f.id === id);
  }
  if (id.startsWith("off-")) {
    return loadExternalFoods().some((f) => f.id === id);
  }
  return false;
}

let FOOD_BY_ID = new Map<string, FoodItem>();

function rebuildFoodLookup(): void {
  FOOD_BY_ID = new Map(getAllFoods().map((f) => [f.id, f]));
}

rebuildFoodLookup();

export function normalizeFoodSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function searchFoods(
  query: string,
  foods: FoodItem[] = getAllFoods(),
  limit = 100,
): FoodItem[] {
  const q = normalizeFoodSearchQuery(query);
  if (!q) return foods.slice(0, limit);
  return foods.filter((food) => food.name.toLowerCase().includes(q)).slice(0, limit);
}

export const FOOD_CATALOG_COUNT = FOOD_CATALOG.length;

export function getLocalCandyFoods(): FoodItem[] {
  return FOOD_CATALOG.filter((f) => isCatalogCandyId(f.id));
}

export function searchLocalCandies(query: string, limit = 80): FoodItem[] {
  return searchFoods(query, getLocalCandyFoods(), limit);
}

export const LOCAL_CANDY_COUNT = getLocalCandyFoods().length;

export const CATEGORY_LABELS: Record<FoodCategory, string> = {
  snacks: "Snacks",
  meals: "Meals",
  drinks: "Drinks",
};

export const CATEGORY_ORDER: FoodCategory[] = ["snacks", "meals", "drinks"];

const DEFAULT_PROFILE: AllergyProfile = {
  allergenIds: [],
  avoidedFoodIds: [],
  updatedAt: "",
};

function parseProfile(raw: unknown): AllergyProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Partial<AllergyProfile>;
  const allergenIds = Array.isArray(obj.allergenIds)
    ? obj.allergenIds.filter(isAllergenId)
    : [];
  const avoidedFoodIds = Array.isArray(obj.avoidedFoodIds)
    ? obj.avoidedFoodIds.filter(
        (id): id is string => typeof id === "string" && isKnownFoodId(id),
      )
    : [];
  const updatedAt =
    typeof obj.updatedAt === "string" ? obj.updatedAt : new Date().toISOString();

  if (!allergenIds.length && !avoidedFoodIds.length && !obj.updatedAt) {
    return null;
  }

  return { allergenIds, avoidedFoodIds, updatedAt };
}

export function loadProfile(): AllergyProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    return parseProfile(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function saveProfile(profile: Omit<AllergyProfile, "updatedAt">): AllergyProfile {
  const full: AllergyProfile = {
    ...profile,
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(full));
  }
  return full;
}

export function clearProfile(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PROFILE_STORAGE_KEY);
}

function parseCardSettings(raw: unknown): AllergyCardSettings {
  if (!raw || typeof raw !== "object") return {};
  const displayName = (raw as { displayName?: unknown }).displayName;
  if (typeof displayName === "string" && displayName.trim()) {
    return { displayName: displayName.trim() };
  }
  return {};
}

export function loadCardSettings(): AllergyCardSettings {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CARD_SETTINGS_STORAGE_KEY);
    if (!raw) return {};
    return parseCardSettings(JSON.parse(raw) as unknown);
  } catch {
    return {};
  }
}

export function saveCardSettings(partial: AllergyCardSettings): AllergyCardSettings {
  const current = loadCardSettings();
  const next: AllergyCardSettings = { ...current, ...partial };
  if (next.displayName !== undefined) {
    const trimmed = next.displayName.trim();
    if (trimmed) next.displayName = trimmed;
    else delete next.displayName;
  }
  if (typeof window !== "undefined") {
    localStorage.setItem(CARD_SETTINGS_STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

export function buildAllergyCardContent(
  profile: Pick<AllergyProfile, "allergenIds" | "avoidedFoodIds">,
  settings: AllergyCardSettings = {},
): AllergyCardContent {
  const allergens = profile.allergenIds
    .map((id) => getAllergenById(id))
    .filter((a): a is AllergenInfo => Boolean(a));
  const avoidFoods = getAvoidedFoods(profile.avoidedFoodIds).map((f) => ({
    id: f.id,
    name: f.name,
    emoji: f.emoji,
  }));
  const displayName = settings.displayName?.trim() ? settings.displayName.trim() : null;
  return {
    displayName,
    allergens,
    avoidFoods,
    isEmpty: allergens.length === 0 && avoidFoods.length === 0,
  };
}

export function clearCustomFoods(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CUSTOM_FOODS_STORAGE_KEY);
  rebuildFoodLookup();
}

export function clearAllFoodCaches(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CUSTOM_FOODS_STORAGE_KEY);
  clearExternalFoodsStorage();
  rebuildFoodLookup();
}

export function getAllergenById(id: AllergenId): AllergenInfo | undefined {
  return ALLERGENS.find((a) => a.id === id);
}

export function getFoodById(id: string): FoodItem | undefined {
  const cached = FOOD_BY_ID.get(id);
  if (cached) return cached;
  const fromCatalog = FOOD_CATALOG.find((f) => f.id === id);
  if (fromCatalog) {
    FOOD_BY_ID.set(id, fromCatalog);
    return fromCatalog;
  }
  const custom = loadCustomFoodsFromStorage().find((f) => f.id === id);
  if (custom) {
    FOOD_BY_ID.set(id, custom);
    return custom;
  }
  const external = loadExternalFoods().find((f) => f.id === id);
  if (external) {
    FOOD_BY_ID.set(id, external);
    return external;
  }
  return undefined;
}

export function formatAllergenList(ids: AllergenId[]): string {
  if (!ids.length) return "None listed";
  return ids
    .map((id) => {
      const info = getAllergenById(id);
      return info ? `${info.emoji} ${info.label}` : id;
    })
    .join(", ");
}

export function formatFoodAllergens(food: FoodItem): string {
  if (!food.allergens.length) return "No major allergens tagged";
  return food.allergens
    .map((id) => getAllergenById(id)?.label ?? id)
    .join(", ");
}

export function getFoodsByCategory(category: FoodCategory): FoodItem[] {
  return getAllFoods().filter((f) => f.category === category);
}

export function getSafeFoods(avoidedFoodIds: string[]): FoodItem[] {
  const avoid = new Set(avoidedFoodIds);
  return getAllFoods().filter((f) => !avoid.has(f.id));
}

export function getAvoidedFoods(avoidedFoodIds: string[]): FoodItem[] {
  return avoidedFoodIds
    .map((id) => getFoodById(id))
    .filter((f): f is FoodItem => Boolean(f));
}

/** Foods that contain one of your listed allergens but you did not mark as avoided. */
export function getUntappedAllergenMatches(profile: AllergyProfile): FoodItem[] {
  const allergenSet = new Set(profile.allergenIds);
  if (!allergenSet.size) return [];
  const avoided = new Set(profile.avoidedFoodIds);
  return getAllFoods().filter(
    (food) =>
      !avoided.has(food.id) &&
      food.allergens.some((a) => allergenSet.has(a)),
  );
}

export function hasSavedProfile(profile: AllergyProfile | null): profile is AllergyProfile {
  if (!profile) return false;
  return Boolean(profile.updatedAt);
}

export function emptyDraft(): AllergyProfile {
  return { ...DEFAULT_PROFILE, updatedAt: "" };
}

/** Local calendar date as YYYY-MM-DD. */
export function getLocalDateKey(date = new Date()): string {
  return date.toLocaleDateString("en-CA");
}

function parseDayMeals(raw: unknown): DayMeals | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.date !== "string") return null;

  const updatedAt =
    typeof obj.updatedAt === "string" ? obj.updatedAt : new Date().toISOString();

  if (Array.isArray(obj.meals)) {
    const parsed = obj.meals
      .map(sanitizeMealBlock)
      .filter((m): m is MealBlock => Boolean(m));
    const meals = ensureDefaultMeals(parsed);
    return { date: obj.date, meals: sanitizeMeals(meals), updatedAt };
  }

  if (obj.slots && typeof obj.slots === "object") {
    return {
      date: obj.date,
      meals: migrateLegacySlots(obj.slots as Record<string, unknown>),
      updatedAt,
    };
  }

  return null;
}

function ensureDefaultMeals(meals: MealBlock[]): MealBlock[] {
  const byId = new Map(meals.map((m) => [m.id, m]));
  const merged: MealBlock[] = DEFAULT_MEALS.map((def) => {
    const existing = byId.get(def.id);
    byId.delete(def.id);
    return existing
      ? { ...def, ...existing, id: def.id, label: def.label, emoji: def.emoji }
      : { ...def, foodIds: [] };
  });
  for (const extra of byId.values()) {
    merged.push(extra);
  }
  return merged;
}

function pushFood(meals: MealBlock[], mealId: DefaultMealId, foodId: string): void {
  if (!isKnownFoodId(foodId)) return;
  const meal = meals.find((m) => m.id === mealId);
  if (!meal || meal.foodIds.includes(foodId) || meal.foodIds.length >= FOODS_PER_MEAL) {
    return;
  }
  meal.foodIds.push(foodId);
}

function migrateLegacySlots(legacy: Record<string, unknown>): MealBlock[] {
  const meals = cloneDefaultMeals();
  const extras: string[] = [];

  const assign = (key: string, target: DefaultMealId) => {
    const v = legacy[key];
    if (typeof v === "string") pushFood(meals, target, v);
  };

  assign("breakfast", "breakfast");
  assign("lunch", "lunch");
  assign("dinner", "dinner");
  assign("pick1", "breakfast");
  assign("pick3", "lunch");
  assign("pick4", "dinner");

  for (const key of ["pick2", "pick5", "snack", "extra"]) {
    const v = legacy[key];
    if (typeof v === "string" && isKnownFoodId(v)) extras.push(v);
  }

  if (extras.length) {
    meals.push({
      id: `custom-snack-${Date.now()}`,
      label: "Snack",
      emoji: "🍎",
      foodIds: sanitizeFoodIds(extras),
    });
  }

  return sanitizeMeals(meals);
}

export function createEmptyDayMeals(date = getLocalDateKey()): DayMeals {
  return {
    date,
    meals: cloneDefaultMeals(),
    updatedAt: "",
  };
}

type MealsByDateStore = Record<string, DayMeals>;

function readMealsStore(): MealsByDateStore {
  if (typeof window === "undefined") return {};
  try {
    const rawV2 = localStorage.getItem(MEALS_BY_DATE_STORAGE_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as unknown;
      if (!parsed || typeof parsed !== "object") return {};
      const store: MealsByDateStore = {};
      for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
        const day = parseDayMeals({ ...(value as object), date: key });
        if (day) store[key] = day;
      }
      return store;
    }
    const rawV1 = localStorage.getItem(MEALS_STORAGE_KEY);
    if (!rawV1) return {};
    const legacy = parseDayMeals(JSON.parse(rawV1) as unknown);
    if (!legacy) return {};
    return { [legacy.date]: legacy };
  } catch {
    return {};
  }
}

function writeMealsStore(store: MealsByDateStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MEALS_BY_DATE_STORAGE_KEY, JSON.stringify(store));
  localStorage.removeItem(MEALS_STORAGE_KEY);
}

export function loadMealsForDate(dateKey: string): DayMeals {
  if (typeof window === "undefined") {
    return createEmptyDayMeals(dateKey);
  }
  const store = readMealsStore();
  return store[dateKey] ?? createEmptyDayMeals(dateKey);
}

export function saveMealsForDate(dateKey: string, meals: MealBlock[]): DayMeals {
  const full: DayMeals = {
    date: dateKey,
    meals: sanitizeMeals(ensureDefaultMeals(meals)),
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    const store = readMealsStore();
    store[dateKey] = full;
    writeMealsStore(store);
  }
  return full;
}

export function dateHasPlannedMeals(dateKey: string): boolean {
  const day = loadMealsForDate(dateKey);
  return dayMealsHasAnyFood(day.meals);
}

export function listMealPlanDates(): string[] {
  const store = readMealsStore();
  return Object.keys(store).filter((key) => dayMealsHasAnyFood(store[key]?.meals ?? []));
}

export function parseDateKeyToLocalDate(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function formatMealPlanDateLabel(dateKey: string): string {
  return parseDateKeyToLocalDate(dateKey).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function loadTodayMeals(): DayMeals {
  return loadMealsForDate(getLocalDateKey());
}

export function saveTodayMeals(meals: MealBlock[]): DayMeals {
  return saveMealsForDate(getLocalDateKey(), meals);
}

export function clearMealsForDate(dateKey: string): void {
  if (typeof window === "undefined") return;
  const store = readMealsStore();
  delete store[dateKey];
  writeMealsStore(store);
}

export function clearTodayMeals(): void {
  clearAllMealPlans();
}

export function clearAllMealPlans(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(MEALS_BY_DATE_STORAGE_KEY);
  localStorage.removeItem(MEALS_STORAGE_KEY);
}

export function isFoodSafeForProfile(foodId: string, avoidedFoodIds: string[]): boolean {
  return !avoidedFoodIds.includes(foodId);
}
