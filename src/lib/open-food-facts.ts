import type { AllergenId, FoodCategory, FoodItem } from "@/lib/food-allergies";

const OFF_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl";
const REQUEST_TIMEOUT_MS = 10000;

type OffProduct = {
  code?: string;
  product_name?: string;
  generic_name?: string;
  brands?: string;
  categories?: string;
  allergens_tags?: string[];
};

type OffSearchResponse = {
  products?: OffProduct[];
};

const ALLERGEN_TAG_MAP: Record<string, AllergenId> = {
  "en:peanuts": "peanut",
  "en:peanut": "peanut",
  "en:nuts": "tree_nut",
  "en:tree-nuts": "tree_nut",
  "en:almonds": "tree_nut",
  "en:milk": "milk",
  "en:eggs": "egg",
  "en:egg": "egg",
  "en:gluten": "wheat",
  "en:wheat": "wheat",
  "en:soybeans": "soy",
  "en:soy": "soy",
  "en:fish": "fish",
  "en:crustaceans": "shellfish",
  "en:shellfish": "shellfish",
  "en:sesame-seeds": "sesame",
  "en:sesame": "sesame",
};

const CANDY_CATEGORY_TAGS = ["candies", "chocolates", "confectioneries"] as const;

function inferCategory(categories: string | undefined): FoodCategory {
  const c = (categories ?? "").toLowerCase();
  if (c.includes("beverage") || c.includes("drink") || c.includes("juice")) return "drinks";
  if (
    c.includes("snack") ||
    c.includes("chocolate") ||
    c.includes("candy") ||
    c.includes("confectionery")
  ) {
    return "snacks";
  }
  return "meals";
}

function mapAllergenTags(tags: string[] | undefined): AllergenId[] {
  if (!tags?.length) return [];
  const out = new Set<AllergenId>();
  for (const tag of tags) {
    const key = tag.toLowerCase();
    const mapped = ALLERGEN_TAG_MAP[key];
    if (mapped) out.add(mapped);
  }
  return [...out];
}

function productName(product: OffProduct): string | null {
  const name = product.product_name?.trim();
  if (name) return name;
  const generic = product.generic_name?.trim();
  if (generic) return generic;
  return null;
}

export function mapOffProductToFoodItem(
  product: OffProduct,
  options?: { candyEmoji?: boolean },
): FoodItem | null {
  const code = product.code?.trim();
  const name = productName(product);
  if (!code || !name) return null;

  const brand = product.brands?.split(",")[0]?.trim();
  const displayName = brand && !name.toLowerCase().includes(brand.toLowerCase())
    ? `${name} (${brand})`
    : name;

  const categories = product.categories ?? "";
  const isCandy =
    options?.candyEmoji ||
    /candy|chocolate|confectionery|sweet/i.test(categories);

  return {
    id: `off-${code}`,
    name: displayName.slice(0, 120),
    emoji: isCandy ? "🍬" : "🍽️",
    category: "snacks",
    allergens: mapAllergenTags(product.allergens_tags),
  };
}

async function fetchOffProducts(url: URL): Promise<FoodItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as OffSearchResponse;
    const items: FoodItem[] = [];
    for (const product of data.products ?? []) {
      const food = mapOffProductToFoodItem(product);
      if (food) items.push(food);
    }
    return items;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function searchOpenFoodFacts(
  query: string,
  limit = 30,
): Promise<FoodItem[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url = new URL(OFF_SEARCH_URL);
  url.searchParams.set("search_terms", q);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", String(Math.min(limit, 50)));
  url.searchParams.set("fields", "code,product_name,generic_name,brands,categories,allergens_tags");

  const items = await fetchOffProducts(url);
  return items.slice(0, limit);
}

async function fetchOffCategory(
  categoryTag: string,
  query: string,
  pageSize: number,
): Promise<FoodItem[]> {
  const url = new URL(OFF_SEARCH_URL);
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("tagtype_0", "categories");
  url.searchParams.set("tag_contains_0", "contains");
  url.searchParams.set("tag_0", categoryTag);
  url.searchParams.set("page_size", String(pageSize));
  url.searchParams.set("fields", "code,product_name,generic_name,brands,categories,allergens_tags");
  const q = query.trim();
  if (q.length >= 2) {
    url.searchParams.set("search_terms", q);
    url.searchParams.set("search_simple", "1");
  }

  const items = await fetchOffProducts(url);
  return items.map((food) => ({ ...food, emoji: "🍬", category: "snacks" as const }));
}

function dedupeFoods(items: FoodItem[], limit: number): FoodItem[] {
  const seen = new Set<string>();
  const out: FoodItem[] = [];
  for (const food of items) {
    const key = food.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(food);
    if (out.length >= limit) break;
  }
  return out;
}

/** Browse/search candies from Open Food Facts category tags. */
export async function searchOpenFoodFactsCandies(
  query: string,
  limit = 60,
): Promise<FoodItem[]> {
  const perTag = Math.ceil(limit / CANDY_CATEGORY_TAGS.length);
  const batches = await Promise.all(
    CANDY_CATEGORY_TAGS.map((tag) => fetchOffCategory(tag, query, Math.min(perTag, 50))),
  );
  return dedupeFoods(batches.flat(), limit);
}
