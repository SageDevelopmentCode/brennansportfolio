"use client";

import type { DeliveryFoodStock } from "@/lib/delivery-food";
import { listStockedFeeds, totalFoodMeals } from "@/lib/delivery-food";
import { FARM_EATING_SLOTS } from "@/lib/delivery-farm";
import type { DeliveryAnimalId } from "@/lib/delivery-mounts";

type DeliveryFarmPanelProps = {
  gameOver: boolean;
  farmAutoAssignEnabled: boolean;
  onFarmAutoAssignEnabledChange: (enabled: boolean) => void;
  farmEatingCount: number;
  farmWaitingCount: number;
  foodStock: DeliveryFoodStock;
  pantryMountIds: DeliveryAnimalId[];
};

export function DeliveryFarmPanel({
  gameOver,
  farmAutoAssignEnabled,
  onFarmAutoAssignEnabledChange,
  farmEatingCount,
  farmWaitingCount,
  foodStock,
  pantryMountIds,
}: DeliveryFarmPanelProps) {
  const stocked = listStockedFeeds(foodStock, pantryMountIds);
  const pantryTotal = totalFoodMeals(foodStock);

  return (
    <div
      className="pointer-events-auto absolute top-3 left-1/2 z-10 w-[min(92%,18rem)] -translate-x-1/2 rounded-2xl border border-amber-700/40 bg-amber-50/95 px-3 py-2 shadow-lg sm:top-4"
    >
      <p className="text-[10px] font-bold tracking-widest text-amber-900/70 uppercase">
        Animal farm
      </p>
      <p className="mt-0.5 text-[10px] font-semibold text-stone-700">
        Eating: {farmEatingCount}/{FARM_EATING_SLOTS}
        {farmWaitingCount > 0 ? ` · Waiting: ${farmWaitingCount}` : ""}
      </p>

      <div className="mt-1.5 border-t border-amber-800/15 pt-1.5">
        <p className="text-[10px] font-bold tracking-wide text-amber-900/80 uppercase">
          Pantry · {pantryTotal} meal{pantryTotal === 1 ? "" : "s"}
        </p>
        {stocked.length === 0 ? (
          <p className="mt-0.5 text-[10px] font-medium text-amber-900/80">
            No feed — open Store → Feed pantry and buy a bag.
          </p>
        ) : (
          <ul
            className="mt-1 max-h-20 space-y-0.5 overflow-y-auto text-[10px] font-semibold text-stone-800"
            aria-label="Farm feed pantry"
          >
            {stocked.map((row) => (
              <li key={row.mountId} className="flex justify-between gap-2">
                <span className="truncate">
                  <span aria-hidden>{row.emoji}</span> {row.label}
                </span>
                <span className="shrink-0 text-teal-800">× {row.meals}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        disabled={gameOver}
        aria-pressed={farmAutoAssignEnabled}
        onClick={() => onFarmAutoAssignEnabledChange(!farmAutoAssignEnabled)}
        className={`mt-1.5 flex w-full items-center justify-center gap-2 rounded-full px-2.5 py-1 text-xs font-bold transition disabled:opacity-50 ${
          farmAutoAssignEnabled
            ? "bg-teal-600 text-white hover:bg-teal-500"
            : "bg-amber-600 text-stone-950 hover:bg-amber-500"
        }`}
      >
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] leading-none ${
            farmAutoAssignEnabled
              ? "border-white/80 bg-white/20"
              : "border-stone-800/40 bg-white/90"
          }`}
          aria-hidden
        >
          {farmAutoAssignEnabled ? "✓" : ""}
        </span>
        Farm auto-assign
      </button>
      {farmAutoAssignEnabled && !gameOver ? (
        <p className="mt-1 text-[10px] font-semibold text-teal-800">
          On — hungry couriers line up (2 eat when their feed is in the pantry)
        </p>
      ) : null}
    </div>
  );
}
