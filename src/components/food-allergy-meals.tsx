"use client";

import { FoodSearchGrid } from "@/components/food-search-grid";
import { FoodAllergyMealCalendar } from "@/components/food-allergy-meal-calendar";
import {
  addCustomMeal,
  addFoodToMeal,
  countDayMealFoods,
  createEmptyDayMeals,
  clearMealsForDate,
  FOODS_PER_MEAL,
  formatMealPlanDateLabel,
  getFoodById,
  getLocalDateKey,
  getSafeFoods,
  isDefaultMealId,
  loadMealsForDate,
  removeFoodFromMeal,
  removeMeal,
  saveMealsForDate,
  type MealBlock,
} from "@/lib/food-allergies";
import { useCallback, useEffect, useState } from "react";

type FoodAllergyMealsProps = {
  avoidedFoodIds: string[];
  onBack?: () => void;
};

export function FoodAllergyMeals({ avoidedFoodIds, onBack }: FoodAllergyMealsProps) {
  const [selectedDateKey, setSelectedDateKey] = useState(getLocalDateKey);
  const [meals, setMeals] = useState<MealBlock[]>(() => loadMealsForDate(getLocalDateKey()).meals);
  const [activeMealId, setActiveMealId] = useState<string>("breakfast");
  const [pickError, setPickError] = useState<string | null>(null);
  const [newMealName, setNewMealName] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(() => {
    const loaded = loadMealsForDate(getLocalDateKey());
    return loaded.updatedAt || null;
  });
  const [hydrated, setHydrated] = useState(false);
  const [planVersion, setPlanVersion] = useState(0);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const loaded = loadMealsForDate(selectedDateKey);
    setMeals(loaded.meals);
    setSavedAt(loaded.updatedAt || null);
    setActiveMealId("breakfast");
    setPickError(null);
  }, [selectedDateKey, hydrated]);

  const safeFoods = getSafeFoods(avoidedFoodIds);
  const dateLabel = formatMealPlanDateLabel(selectedDateKey);
  const totalFoods = countDayMealFoods(meals);
  const activeMeal = meals.find((m) => m.id === activeMealId) ?? meals[0];

  const persist = useCallback(
    (next: MealBlock[]) => {
      const saved = saveMealsForDate(selectedDateKey, next);
      setMeals(saved.meals);
      setSavedAt(saved.updatedAt);
      setPlanVersion((v) => v + 1);
    },
    [selectedDateKey],
  );

  const pickFood = (foodId: string) => {
    if (!activeMeal) return;
    const result = addFoodToMeal(meals, activeMeal.id, foodId);
    if (result.error) {
      setPickError(result.error);
      return;
    }
    setPickError(null);
    persist(result.meals);
  };

  const removeFood = (mealId: string, foodId: string) => {
    setPickError(null);
    persist(removeFoodFromMeal(meals, mealId, foodId));
  };

  const clearDay = () => {
    if (!window.confirm(`Clear all meal picks for ${dateLabel}?`)) return;
    const empty = createEmptyDayMeals(selectedDateKey).meals;
    setMeals(empty);
    clearMealsForDate(selectedDateKey);
    setSavedAt(null);
    setActiveMealId("breakfast");
    setPlanVersion((v) => v + 1);
  };

  const handleAddMeal = () => {
    const next = addCustomMeal(meals, newMealName);
    if (next.length === meals.length) return;
    setNewMealName("");
    const added = next[next.length - 1];
    persist(next);
    if (added) setActiveMealId(added.id);
  };

  const handleRemoveMeal = (mealId: string) => {
    if (isDefaultMealId(mealId)) return;
    if (!window.confirm("Remove this meal section?")) return;
    const next = removeMeal(meals, mealId);
    persist(next);
    if (activeMealId === mealId) {
      setActiveMealId("breakfast");
    }
  };

  if (!hydrated) {
    return (
      <div className="allergies-glass-card rounded-3xl p-8 text-center text-[var(--allergies-muted)]">
        Loading today&apos;s meals…
      </div>
    );
  }

  const inner = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-[var(--allergies-ink)]">
            Make your meals of the day
          </h2>
          <p className="mt-1 text-sm font-semibold text-[var(--allergies-muted)]">{dateLabel}</p>
          <p className="mt-2 text-[var(--allergies-muted)]">
            Select a meal on the left, then search and tap foods on the right (up to{" "}
            {FOODS_PER_MEAL} per meal). Picked foods stay red.
          </p>
        </div>
        {onBack && (
          <button type="button" onClick={onBack} className="allergies-btn-secondary shrink-0">
            Back to plate
          </button>
        )}
      </div>

      {safeFoods.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-[var(--allergies-danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--allergies-danger)]">
          Every food is on your avoid list — edit your plate first so you have OK foods to plan with.
        </p>
      ) : (
        <>
          <FoodAllergyMealCalendar
            selectedDateKey={selectedDateKey}
            onSelectDate={setSelectedDateKey}
            planVersion={planVersion}
          />

          <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:items-start">
            <div className="flex flex-col gap-3">
              {meals.map((meal) => {
              const isActive = activeMealId === meal.id;
              return (
                <div
                  key={meal.id}
                  className={`rounded-2xl border-2 p-4 transition ${
                    isActive
                      ? "border-[var(--allergies-accent)] bg-[var(--allergies-accent-soft)]"
                      : "border-[var(--allergies-border)] bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMealId(meal.id);
                        setPickError(null);
                      }}
                      className="flex flex-1 items-start justify-between gap-2 text-left"
                    >
                      <span className="text-sm font-bold uppercase tracking-widest text-[var(--allergies-ink)]">
                        {meal.emoji} {meal.label}
                      </span>
                      <span className="text-xs font-bold text-[var(--allergies-muted)]">
                        {meal.foodIds.length}/{FOODS_PER_MEAL}
                        {isActive ? " · picking" : ""}
                      </span>
                    </button>
                    {!isDefaultMealId(meal.id) && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMeal(meal.id)}
                        className="text-xs font-bold text-[var(--allergies-danger)]"
                      >
                        Remove meal
                      </button>
                    )}
                  </div>
                  {meal.foodIds.length === 0 ? (
                    <p className="mt-2 text-sm text-[var(--allergies-muted)]">
                      No foods yet — pick on the right.
                    </p>
                  ) : (
                    <ul className="mt-3 flex flex-col gap-2">
                      {meal.foodIds.map((foodId) => {
                        const food = getFoodById(foodId);
                        if (!food) return null;
                        return (
                          <li
                            key={foodId}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--allergies-border)] bg-white px-3 py-2"
                          >
                            <span className="font-semibold text-[var(--allergies-ink)]">
                              {food.emoji} {food.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeFood(meal.id, foodId)}
                              className="text-xs font-bold text-[var(--allergies-danger)]"
                            >
                              Remove
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}

              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={newMealName}
                  onChange={(e) => setNewMealName(e.target.value)}
                  placeholder="New meal name (e.g. Snack)"
                  className="allergies-input flex-1"
                />
                <button
                  type="button"
                  onClick={handleAddMeal}
                  className="allergies-btn-secondary shrink-0"
                  disabled={!newMealName.trim()}
                >
                  Add another meal
                </button>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <p className="text-sm font-bold text-[var(--allergies-success)]">
                  {totalFoods} food{totalFoods === 1 ? "" : "s"} planned today
                </p>
                {savedAt && (
                  <p className="text-sm text-[var(--allergies-muted)]">
                    Saved · {new Date(savedAt).toLocaleTimeString()}
                  </p>
                )}
                <button
                  type="button"
                  onClick={clearDay}
                  className="allergies-btn-danger sm:ml-auto"
                >
                  Clear this day
                </button>
              </div>
            </div>

            {activeMeal && (
              <div className="lg:sticky lg:top-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--allergies-muted)]">
                  Foods for {activeMeal.label}
                </h3>
                {pickError && (
                  <p className="mt-2 text-sm font-bold text-[var(--allergies-danger)]">{pickError}</p>
                )}
                <div className="mt-4">
                  <FoodSearchGrid
                    foods={safeFoods}
                    mode="pick"
                    selectedIds={activeMeal.foodIds}
                    onPick={pickFood}
                    allowCustomFood
                    emptyHint="Nothing on your OK list matches — try another word or add a custom food."
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );

  return (
    <div className="allergies-glass-card rounded-3xl p-6 sm:p-8">{inner}</div>
  );
}
