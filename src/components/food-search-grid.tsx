"use client";

import {
  addCustomFood,
  FOOD_CATALOG_COUNT,
  getAllFoods,
  LOCAL_CANDY_COUNT,
  normalizeFoodSearchQuery,
  registerExternalFood,
  searchFoods,
  searchLocalCandies,
  type FoodItem,
} from "@/lib/food-allergies";
import { useEffect, useMemo, useState } from "react";

type FoodSearchGridProps = {
  foods?: FoodItem[];
  mode: "toggle" | "pick";
  selectedIds?: string[];
  selectedId?: string | null;
  onToggle?: (foodId: string) => void;
  onPick?: (foodId: string) => void;
  allowCustomFood?: boolean;
  emptyHint?: string;
};

function mergeUnique(local: FoodItem[], remote: FoodItem[], cap: number): FoodItem[] {
  const seen = new Set(local.map((f) => f.name.toLowerCase()));
  const merged = [...local];
  for (const food of remote) {
    const key = food.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(food);
    if (merged.length >= cap) break;
  }
  return merged;
}

export function FoodSearchGrid({
  foods,
  mode,
  selectedIds = [],
  selectedId = null,
  onToggle,
  onPick,
  allowCustomFood = true,
  emptyHint,
}: FoodSearchGridProps) {
  const [query, setQuery] = useState("");
  const [customTick, setCustomTick] = useState(0);
  const [candyBrowse, setCandyBrowse] = useState(false);
  const [remoteFoods, setRemoteFoods] = useState<FoodItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchWarning, setSearchWarning] = useState<string | null>(null);

  const pool = useMemo(() => {
    void customTick;
    return foods ?? getAllFoods();
  }, [foods, customTick]);

  const trimmed = normalizeFoodSearchQuery(query);

  useEffect(() => {
    const shouldFetchWorld =
      candyBrowse || trimmed.length >= 2;

    if (!shouldFetchWorld) {
      setRemoteFoods([]);
      setSearchLoading(false);
      setSearchWarning(null);
      return;
    }

    const controller = new AbortController();
    setSearchLoading(true);
    setSearchWarning(null);

    const timer = setTimeout(() => {
      const params = new URLSearchParams({
        q: query.trim(),
        limit: candyBrowse ? "80" : "50",
      });
      if (candyBrowse) params.set("candy", "1");

      fetch(`/api/foods/search?${params.toString()}`, {
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) throw new Error("Search failed");
          return res.json() as Promise<{ foods?: FoodItem[]; warning?: string }>;
        })
        .then((data) => {
          setRemoteFoods(Array.isArray(data.foods) ? data.foods : []);
          setSearchWarning(data.warning ?? null);
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setRemoteFoods([]);
            setSearchWarning(
              candyBrowse
                ? "Worldwide candy search unavailable — showing local candies."
                : "Worldwide search unavailable — showing local matches.",
            );
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearchLoading(false);
        });
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, query, candyBrowse]);

  const results = useMemo(() => {
    if (candyBrowse) {
      const localCandies = searchLocalCandies(query, 80);
      return mergeUnique(localCandies, remoteFoods, 100);
    }
    if (trimmed.length < 2) {
      return searchFoods(query, pool, 100);
    }
    const local = searchFoods(query, pool, 50);
    return mergeUnique(local, remoteFoods, 100);
  }, [query, pool, trimmed, remoteFoods, candyBrowse]);

  const canAddCustom =
    allowCustomFood &&
    trimmed.length >= 2 &&
    !pool.some((f) => f.name.toLowerCase() === trimmed) &&
    !results.some((f) => f.name.toLowerCase() === trimmed);

  const handlePick = (food: FoodItem) => {
    if (food.id.startsWith("off-")) {
      registerExternalFood(food);
    }
    if (mode === "toggle") {
      onToggle?.(food.id);
    } else {
      onPick?.(food.id);
    }
  };

  const handleAddCustom = () => {
    const food = addCustomFood(trimmed);
    setCustomTick((n) => n + 1);
    handlePick(food);
    setQuery("");
  };

  const statusLine = searchLoading
    ? candyBrowse
      ? "Loading candies worldwide…"
      : "Searching worldwide…"
    : candyBrowse
      ? `${results.length} candies · ${LOCAL_CANDY_COUNT} favorites + Open Food Facts`
      : trimmed.length >= 2
        ? `${results.length} result${results.length === 1 ? "" : "s"} · Open Food Facts + our list`
        : `Type 2+ letters to search · or tap World candies · ${FOOD_CATALOG_COUNT}+ in our list`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={candyBrowse}
          onClick={() => setCandyBrowse((v) => !v)}
          className={
            candyBrowse
              ? "allergies-btn-primary !min-h-[40px] !px-4 !py-2 !text-sm"
              : "allergies-btn-secondary !min-h-[40px] !px-4 !py-2 !text-sm"
          }
        >
          🍬 World candies
        </button>
        {candyBrowse && (
          <span className="self-center text-xs font-semibold text-[var(--allergies-muted)]">
            Candies, chocolates, and sweets from around the world
          </span>
        )}
      </div>
      <label className="block">
        <span className="text-sm font-bold text-[var(--allergies-muted)]">
          {candyBrowse ? "Filter candies" : "Search foods"}
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={candyBrowse ? "Try gummy, lollipop, chocolate…" : "Try sushi, nutella, ramen…"}
          className="allergies-input mt-2"
          autoComplete="off"
        />
      </label>
      <p className="text-xs font-semibold text-[var(--allergies-muted)]">{statusLine}</p>
      {searchWarning && (
        <p className="text-xs font-semibold text-[var(--allergies-danger)]">{searchWarning}</p>
      )}

      {results.length === 0 && !canAddCustom && !searchLoading ? (
        <p className="rounded-2xl bg-[var(--allergies-accent-soft)] px-4 py-3 text-sm font-semibold text-[var(--allergies-ink)]">
          {emptyHint ?? "No foods match that search. Try a shorter name."}
        </p>
      ) : (
        <div className="grid max-h-[28rem] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
          {results.map((food) => {
            const active =
              mode === "toggle"
                ? selectedIds.includes(food.id)
                : selectedIds.includes(food.id) || selectedId === food.id;
            return (
              <button
                key={food.id}
                type="button"
                aria-pressed={active}
                onClick={() => handlePick(food)}
                className={`allergies-food-btn min-h-[80px] ${
                  active ? "allergies-food-btn-avoid" : ""
                }`}
              >
                <span className="text-2xl" aria-hidden>
                  {food.emoji}
                </span>
                <span className="font-bold leading-tight">{food.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {canAddCustom && (
        <button type="button" onClick={handleAddCustom} className="allergies-btn-secondary w-full">
          Add &quot;{query.trim()}&quot; to my food list
        </button>
      )}
    </div>
  );
}
