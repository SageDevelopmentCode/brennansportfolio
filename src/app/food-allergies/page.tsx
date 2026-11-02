import { FoodAllergyClient } from "@/components/food-allergy-client";
import { FOODS_PER_MEAL } from "@/lib/food-allergies";
import Link from "next/link";

export default function FoodAllergiesPage() {
  return (
    <main className="allergies-bg relative flex flex-1 flex-col gap-8 px-4 py-8 touch-manipulation sm:px-8 sm:py-12">
      <div className="allergies-no-print">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--allergies-border)] bg-[var(--allergies-glass)] px-4 py-2 text-sm font-semibold text-[var(--allergies-accent)] transition hover:border-[var(--allergies-accent)] hover:shadow-[0_0_16px_rgba(234,88,12,0.2)]"
        >
          ← All projects
        </Link>
      </div>

      <header className="allergies-no-print max-w-3xl">
        <span className="inline-block rounded-full bg-[var(--allergies-accent-soft)] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[var(--allergies-accent)] ring-1 ring-[var(--allergies-border)]">
          Know what to skip
        </span>
        <h1 className="mt-4 text-5xl font-extrabold leading-tight sm:text-6xl">
          <span className="allergies-title-gradient">Allergy Plate</span>
        </h1>
        <p className="mt-4 text-lg text-[var(--allergies-muted)]">
          Pick your allergens, search millions of foods worldwide via Open Food Facts, and plan
          breakfast, lunch, and dinner with up to {FOODS_PER_MEAL} foods each.
        </p>
      </header>

      <div className="w-full max-w-6xl">
        <FoodAllergyClient />
      </div>
    </main>
  );
}
