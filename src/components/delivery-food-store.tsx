"use client";

import type { DeliveryCompanyState } from "@/lib/delivery";
import {
  feedBagPrice,
  feedInfoForMount,
  foodCount,
  formatFeedBagPrice,
  MEALS_PER_FEED_PURCHASE,
  totalFoodMeals,
} from "@/lib/delivery-food";
import { formatPrice, getAnimal, type DeliveryAnimalId } from "@/lib/delivery-mounts";

type DeliveryFoodStoreProps = {
  company: DeliveryCompanyState;
  buyingFoodId: DeliveryAnimalId | null;
  buyFoodError: string | null;
  onBuyFood: (mountId: DeliveryAnimalId) => void;
};

export function DeliveryFoodStore({
  company,
  buyingFoodId,
  buyFoodError,
  onBuyFood,
}: DeliveryFoodStoreProps) {
  const mountSet = new Set<DeliveryAnimalId>([
    ...company.ownedMountIds,
    ...company.assignedMountIds,
  ]);
  const owned = [...mountSet].sort(
    (a, b) => getAnimal(a).price - getAnimal(b).price,
  );
  const pantryTotal = totalFoodMeals(company.foodStock);

  if (owned.length === 0) {
    return (
      <p className="text-sm font-semibold text-stone-700">
        Buy an animal first, then stock its feed here. Hungry couriers wait at
        the farm until you have the right food.
      </p>
    );
  }

  return (
    <div className="w-full">
      {buyFoodError ? (
        <p className="mb-4 text-sm font-semibold text-red-600" role="alert">
          {buyFoodError}
        </p>
      ) : null}
      <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-100/80 px-4 py-3">
        <p className="text-sm font-bold text-amber-950">
          Pantry total: {pantryTotal} meal{pantryTotal === 1 ? "" : "s"}
        </p>
        {pantryTotal === 0 ? (
          <p className="mt-1 text-sm text-amber-950/90">
            Nothing stocked yet — buy a <strong>5-meal bag</strong> for the
            species your hungry courier rides.
          </p>
        ) : null}
      </div>
      <p className="mb-4 text-sm text-stone-700">
        Each species eats only its own feed. One purchase adds{" "}
        {MEALS_PER_FEED_PURCHASE} meals; the farm uses 1 meal per feed. Without
        stock, couriers wait in line.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {owned.map((mountId) => {
          const animal = getAnimal(mountId);
          const feed = feedInfoForMount(mountId);
          const stock = foodCount(company.foodStock, mountId);
          const busy = buyingFoodId === mountId;
          const bagPrice = feedBagPrice(animal);
          const canAfford = company.balance >= bagPrice;

          return (
            <li
              key={mountId}
              className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-stone-900">
                    <span aria-hidden>{feed.emoji}</span> {feed.label}
                  </p>
                  <p className="text-sm text-stone-600">
                    For {animal.emoji} {animal.label}
                  </p>
                </div>
                <p className="text-sm font-bold text-teal-800">
                  Meals: {stock}
                </p>
              </div>
              <p className="text-sm font-semibold text-stone-800">
                Bag ({MEALS_PER_FEED_PURCHASE} meals) · {formatFeedBagPrice(animal)}
              </p>
              <button
                type="button"
                disabled={busy || buyingFoodId !== null || !canAfford}
                onClick={() => onBuyFood(mountId)}
                className="mt-auto rounded-full bg-amber-600 px-4 py-2 text-sm font-bold text-stone-950 transition hover:bg-amber-500 disabled:opacity-60"
              >
                {busy
                  ? "Buying…"
                  : `Buy bag (${MEALS_PER_FEED_PURCHASE} meals) · ${formatPrice(bagPrice)}`}
              </button>
              {!canAfford ? (
                <p className="text-xs font-semibold text-orange-800">
                  Need more delivery cash
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
