import {
  FOOD_CATALOG,
  searchFoods,
  searchLocalCandies,
  type FoodItem,
} from "@/lib/food-allergies";
import { searchOpenFoodFacts, searchOpenFoodFactsCandies } from "@/lib/open-food-facts";
import { NextResponse } from "next/server";

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function mergeFoodResults(local: FoodItem[], remote: FoodItem[], limit: number): FoodItem[] {
  const seen = new Set<string>();
  const out: FoodItem[] = [];

  const tryAdd = (food: FoodItem) => {
    const key = normalizeName(food.name);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(food);
  };

  for (const food of local) {
    tryAdd(food);
    if (out.length >= limit) return out;
  }
  for (const food of remote) {
    tryAdd(food);
    if (out.length >= limit) return out;
  }
  return out;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const candyMode = searchParams.get("candy") === "1";
  const limitRaw = Number(searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 80) : 50;

  const trimmed = query.trim();

  if (candyMode) {
    try {
      const local = searchLocalCandies(trimmed, limit);
      const remote = await searchOpenFoodFactsCandies(trimmed, limit);
      const foods = mergeFoodResults(local, remote, limit);
      return NextResponse.json({ foods, candy: true });
    } catch {
      const local = searchLocalCandies(trimmed, limit);
      return NextResponse.json({
        foods: local,
        candy: true,
        warning: "Worldwide candy search unavailable",
      });
    }
  }

  if (trimmed.length < 2) {
    return NextResponse.json({ foods: [] });
  }

  try {
    const local = searchFoods(trimmed, FOOD_CATALOG, limit);
    const remote = await searchOpenFoodFacts(trimmed, limit);
    const foods = mergeFoodResults(local, remote, limit);
    return NextResponse.json({ foods });
  } catch {
    const local = searchFoods(trimmed, FOOD_CATALOG, limit);
    return NextResponse.json({ foods: local, warning: "Worldwide search unavailable" });
  }
}
