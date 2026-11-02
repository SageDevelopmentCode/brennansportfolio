"use client";

import { FoodSearchGrid } from "@/components/food-search-grid";
import { FoodAllergyMeals } from "@/components/food-allergy-meals";
import { FoodAllergyShowCard } from "@/components/food-allergy-show-card";
import {
  ALLERGENS,
  buildAllergyCardContent,
  clearProfile,
  clearAllFoodCaches,
  clearTodayMeals,
  formatFoodAllergens,
  getAvoidedFoods,
  getSafeFoods,
  getUntappedAllergenMatches,
  hasSavedProfile,
  loadCardSettings,
  loadProfile,
  saveCardSettings,
  saveProfile,
  type AllergenId,
  type AllergyProfile,
} from "@/lib/food-allergies";
import { useCallback, useEffect, useState } from "react";

type Step = "allergens" | "foods" | "summary";
type SummaryTab = "plate" | "card" | "safe" | "meals" | "manage";

const SUMMARY_TABS: { id: SummaryTab; label: string }[] = [
  { id: "plate", label: "My plate" },
  { id: "card", label: "My card" },
  { id: "safe", label: "OK for me" },
  { id: "meals", label: "Meals" },
  { id: "manage", label: "Manage" },
];

function toggleInList<T extends string>(list: T[], id: T): T[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function FoodAllergyClient() {
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState<Step>("allergens");
  const [allergenIds, setAllergenIds] = useState<AllergenId[]>([]);
  const [avoidedFoodIds, setAvoidedFoodIds] = useState<string[]>([]);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [summaryTab, setSummaryTab] = useState<SummaryTab>("plate");
  const [cardDisplayName, setCardDisplayName] = useState("");
  const [cardNameDraft, setCardNameDraft] = useState("");

  useEffect(() => {
    const existing = loadProfile();
    const cardSettings = loadCardSettings();
    if (cardSettings.displayName) {
      setCardDisplayName(cardSettings.displayName);
      setCardNameDraft(cardSettings.displayName);
    }
    if (hasSavedProfile(existing)) {
      setAllergenIds(existing.allergenIds);
      setAvoidedFoodIds(existing.avoidedFoodIds);
      setSavedAt(existing.updatedAt);
      setStep("summary");
    }
    setHydrated(true);
  }, []);

  const draftProfile: AllergyProfile = {
    allergenIds,
    avoidedFoodIds,
    updatedAt: savedAt ?? "",
  };

  const persistAndSummarize = useCallback(() => {
    const saved = saveProfile({ allergenIds, avoidedFoodIds });
    setSavedAt(saved.updatedAt);
    setStep("summary");
    setSummaryTab("plate");
  }, [allergenIds, avoidedFoodIds]);

  const handleStartOver = () => {
    if (
      !window.confirm(
        "Clear your allergy plate and start over? This removes saved choices on this device.",
      )
    ) {
      return;
    }
    clearProfile();
    clearAllFoodCaches();
    clearTodayMeals();
    setAllergenIds([]);
    setAvoidedFoodIds([]);
    setSavedAt(null);
    setSummaryTab("plate");
    setStep("allergens");
  };

  const toggleAllergen = (id: AllergenId) => {
    setAllergenIds((prev) => toggleInList(prev, id));
  };

  const toggleFood = (id: string) => {
    setAvoidedFoodIds((prev) => toggleInList(prev, id));
  };

  if (!hydrated) {
    return (
      <div className="allergies-glass-card rounded-3xl p-8 text-center text-[var(--allergies-muted)]">
        Loading your plate…
      </div>
    );
  }

  const avoidedFoods = getAvoidedFoods(avoidedFoodIds);
  const safeFoods = getSafeFoods(avoidedFoodIds);
  const allergenMatches = getUntappedAllergenMatches(draftProfile);
  const cardContent = buildAllergyCardContent(draftProfile, {
    displayName: cardDisplayName || undefined,
  });

  const saveCardName = () => {
    const saved = saveCardSettings({ displayName: cardNameDraft });
    setCardDisplayName(saved.displayName ?? "");
    setCardNameDraft(saved.displayName ?? "");
  };

  const widthClass =
    step === "summary" && summaryTab === "meals" ? "max-w-6xl" : "max-w-3xl";

  return (
    <div className={`flex w-full flex-col gap-6 ${widthClass}`}>
      {step !== "summary" && (
        <nav
          className="allergies-subtab-list"
          role="tablist"
          aria-label="Setup steps"
        >
          <button
            type="button"
            role="tab"
            aria-selected={step === "allergens"}
            id="allergies-setup-tab-allergens"
            aria-controls="allergies-setup-panel"
            onClick={() => setStep("allergens")}
            className={`allergies-subtab ${step === "allergens" ? "allergies-subtab-active" : ""}`}
          >
            Allergies
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={step === "foods"}
            id="allergies-setup-tab-foods"
            aria-controls="allergies-setup-panel"
            onClick={() => setStep("foods")}
            className={`allergies-subtab ${step === "foods" ? "allergies-subtab-active" : ""}`}
          >
            Foods
          </button>
        </nav>
      )}

      {step === "summary" && (
        <nav
          className="allergies-subtab-list allergies-no-print"
          role="tablist"
          aria-label="Allergy plate sections"
        >
          {SUMMARY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={summaryTab === tab.id}
              id={`allergies-summary-tab-${tab.id}`}
              aria-controls="allergies-summary-panel"
              onClick={() => setSummaryTab(tab.id)}
              className={`allergies-subtab ${summaryTab === tab.id ? "allergies-subtab-active" : ""}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      )}

      {step === "allergens" && (
        <div
          id="allergies-setup-panel"
          role="tabpanel"
          aria-labelledby="allergies-setup-tab-allergens"
          className="allergies-glass-card rounded-3xl p-6 sm:p-8"
        >
          <h2 className="text-2xl font-extrabold text-[var(--allergies-ink)]">
            What are you allergic to?
          </h2>
          <p className="mt-2 text-[var(--allergies-muted)]">
            Tap every allergen that applies to you. It&apos;s OK if none apply — you can still pick
            foods to avoid next.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ALLERGENS.map((allergen) => {
              const selected = allergenIds.includes(allergen.id);
              return (
                <button
                  key={allergen.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleAllergen(allergen.id)}
                  className={`allergies-chip ${selected ? "allergies-chip-active" : ""}`}
                >
                  <span className="text-2xl" aria-hidden>
                    {allergen.emoji}
                  </span>
                  <span className="font-bold">{allergen.label}</span>
                </button>
              );
            })}
          </div>

          {allergenIds.length === 0 && (
            <p className="mt-4 rounded-2xl bg-[var(--allergies-accent-soft)] px-4 py-3 text-sm font-semibold text-[var(--allergies-ink)]">
              No allergens selected — you can still list foods you skip on the next step.
            </p>
          )}

          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setStep("foods")}
              className="allergies-btn-primary w-full"
            >
              Continue to foods
            </button>
            {savedAt && (
              <button
                type="button"
                onClick={persistAndSummarize}
                className="allergies-btn-secondary w-full"
              >
                Save allergies & back to summary
              </button>
            )}
          </div>
        </div>
      )}

      {step === "foods" && (
        <div
          id="allergies-setup-panel"
          role="tabpanel"
          aria-labelledby="allergies-setup-tab-foods"
          className="allergies-glass-card rounded-3xl p-6 sm:p-8"
        >
          <h2 className="text-2xl font-extrabold text-[var(--allergies-ink)]">
            Search and tap foods you cannot eat
          </h2>
          <p className="mt-2 text-[var(--allergies-muted)]">
            Search hundreds of foods from around the world. Can&apos;t find one? Add your own name
            at the bottom of the search results.
          </p>
          <p className="mt-3 text-sm font-bold text-[var(--allergies-danger)]">
            {avoidedFoodIds.length} food{avoidedFoodIds.length === 1 ? "" : "s"} marked avoid
          </p>

          <div className="mt-6">
            <FoodSearchGrid
              mode="toggle"
              selectedIds={avoidedFoodIds}
              onToggle={toggleFood}
            />
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setStep("allergens")}
              className="allergies-btn-secondary flex-1"
            >
              Back
            </button>
            <button
              type="button"
              onClick={persistAndSummarize}
              className="allergies-btn-primary flex-1"
            >
              Save my plate
            </button>
          </div>
        </div>
      )}

      {step === "summary" && (
        <div
          id="allergies-summary-panel"
          role="tabpanel"
          aria-labelledby={`allergies-summary-tab-${summaryTab}`}
          className="flex flex-col gap-6"
        >
          {summaryTab === "plate" && (
            <div className="allergies-glass-card rounded-3xl p-6 sm:p-8">
              <h2 className="text-2xl font-extrabold text-[var(--allergies-ink)]">
                Your allergy plate
              </h2>
              {savedAt && (
                <p className="mt-1 text-sm text-[var(--allergies-muted)]">
                  Saved on this device · {new Date(savedAt).toLocaleString()}
                </p>
              )}

              <section className="mt-6">
                <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--allergies-muted)]">
                  My allergies
                </h3>
                {allergenIds.length === 0 ? (
                  <p className="mt-2 text-[var(--allergies-ink)]">None listed</p>
                ) : (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {allergenIds.map((id) => {
                      const info = ALLERGENS.find((a) => a.id === id);
                      if (!info) return null;
                      return (
                        <li
                          key={id}
                          className="rounded-full bg-[var(--allergies-accent-soft)] px-3 py-1 text-sm font-bold text-[var(--allergies-ink)]"
                        >
                          {info.emoji} {info.label}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section className="mt-8">
                <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--allergies-danger)]">
                  Do not eat
                </h3>
                {avoidedFoods.length === 0 ? (
                  <p className="mt-2 text-[var(--allergies-muted)]">
                    No foods marked — use the Manage tab to edit foods.
                  </p>
                ) : (
                  <ul className="mt-3 flex flex-col gap-2">
                    {avoidedFoods.map((food) => (
                      <li
                        key={food.id}
                        className="rounded-2xl border border-[var(--allergies-danger-soft)] bg-[var(--allergies-danger-bg)] px-4 py-3"
                      >
                        <span className="font-bold text-[var(--allergies-ink)]">
                          {food.emoji} {food.name}
                        </span>
                        <span className="mt-1 block text-xs font-semibold text-[var(--allergies-muted)]">
                          Contains: {formatFoodAllergens(food)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => setSummaryTab("meals")}
                  className="allergies-btn-primary w-full sm:w-auto"
                >
                  Plan meals
                </button>
                <button
                  type="button"
                  onClick={() => setSummaryTab("card")}
                  className="allergies-btn-secondary w-full sm:w-auto"
                >
                  Show my card
                </button>
              </div>
            </div>
          )}

          {summaryTab === "card" && (
            <FoodAllergyShowCard
              content={cardContent}
              onGoManage={() => setSummaryTab("manage")}
              onGoSetup={() => setStep("allergens")}
            />
          )}

          {summaryTab === "safe" && (
            <div className="allergies-glass-card rounded-3xl p-6 sm:p-8">
              <h2 className="text-2xl font-extrabold text-[var(--allergies-ink)]">
                OK for me
              </h2>
              <p className="mt-2 text-sm text-[var(--allergies-muted)]">
                Foods from the catalog that are not on your avoid list ({safeFoods.length}).
              </p>

              {safeFoods.length === 0 ? (
                <p className="mt-6 text-[var(--allergies-muted)]">
                  No OK foods yet — edit your avoid list on the Manage tab.
                </p>
              ) : (
                <ul className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {safeFoods.map((food) => (
                    <li
                      key={food.id}
                      className="rounded-xl border border-[var(--allergies-border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--allergies-ink)]"
                    >
                      {food.emoji} {food.name}
                    </li>
                  ))}
                </ul>
              )}

              {allergenMatches.length > 0 && (
                <aside className="mt-8 rounded-2xl border border-[var(--allergies-border)] bg-[var(--allergies-accent-soft)] px-4 py-4">
                  <h3 className="text-sm font-bold text-[var(--allergies-ink)]">
                    Heads up — not on your avoid list
                  </h3>
                  <p className="mt-1 text-sm text-[var(--allergies-muted)]">
                    These foods match allergens you listed, but you didn&apos;t tap them as avoid.
                    Double-check with a grown-up if you need to.
                  </p>
                  <ul className="mt-3 flex flex-col gap-2">
                    {allergenMatches.map((food) => (
                      <li key={food.id} className="text-sm font-semibold text-[var(--allergies-ink)]">
                        {food.emoji} {food.name} — {formatFoodAllergens(food)}
                      </li>
                    ))}
                  </ul>
                </aside>
              )}
            </div>
          )}

          {summaryTab === "meals" && (
            <FoodAllergyMeals avoidedFoodIds={avoidedFoodIds} />
          )}

          {summaryTab === "manage" && (
            <div className="allergies-glass-card rounded-3xl p-6 sm:p-8">
              <h2 className="text-2xl font-extrabold text-[var(--allergies-ink)]">Manage</h2>
              <p className="mt-2 text-[var(--allergies-muted)]">
                Update your allergies or avoid list, save again, or clear everything on this device.
              </p>

              <div className="mt-6 rounded-2xl border border-[var(--allergies-border)] bg-white p-4">
                <label className="flex flex-col gap-2 text-sm font-bold text-[var(--allergies-ink)]">
                  Name on card (optional)
                  <input
                    type="text"
                    value={cardNameDraft}
                    onChange={(e) => setCardNameDraft(e.target.value)}
                    placeholder="Your first name"
                    className="allergies-input font-normal"
                    autoComplete="given-name"
                  />
                </label>
                <button
                  type="button"
                  onClick={saveCardName}
                  className="allergies-btn-secondary mt-3"
                >
                  Save name for card
                </button>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => setStep("allergens")}
                  className="allergies-btn-secondary flex-1 sm:min-w-[10rem]"
                >
                  Edit allergies
                </button>
                <button
                  type="button"
                  onClick={() => setStep("foods")}
                  className="allergies-btn-secondary flex-1 sm:min-w-[10rem]"
                >
                  Edit foods
                </button>
                <button
                  type="button"
                  onClick={() => persistAndSummarize()}
                  className="allergies-btn-primary flex-1 sm:min-w-[10rem]"
                >
                  Save again
                </button>
                <button
                  type="button"
                  onClick={handleStartOver}
                  className="allergies-btn-danger w-full sm:w-auto"
                >
                  Start over
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
