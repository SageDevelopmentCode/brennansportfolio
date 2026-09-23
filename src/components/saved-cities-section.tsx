"use client";

import { CityCard } from "@/components/city-card";
import type { FavoriteCity } from "@/lib/city-favorites";
import { createClient } from "@/lib/supabase/client";
import type { CityWithWeather } from "@/lib/weather";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type SavedCitiesSectionProps = {
  favorites: FavoriteCity[];
  isLoggedIn: boolean;
};

function toCityWithWeather(favorite: FavoriteCity): CityWithWeather | null {
  if (!favorite.weather) return null;
  return {
    cityKey: favorite.cityKey,
    name: favorite.name,
    country: favorite.country,
    countryCode: "",
    latitude: favorite.latitude,
    longitude: favorite.longitude,
    timezone: favorite.timezone,
    weather: favorite.weather,
  };
}

export function SavedCitiesSection({
  favorites,
  isLoggedIn,
}: SavedCitiesSectionProps) {
  const router = useRouter();
  const [items, setItems] = useState(favorites);
  const [removing, setRemoving] = useState<string | null>(null);

  async function handleRemove(cityKey: string) {
    setRemoving(cityKey);
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from("favorite_cities")
        .delete()
        .eq("city_key", cityKey);
      if (error) throw error;
      setItems((current) => current.filter((f) => f.cityKey !== cityKey));
      router.refresh();
    } catch {
      // keep current state on error
    } finally {
      setRemoving(null);
    }
  }

  const citiesWithWeather = items
    .map(toCityWithWeather)
    .filter((city): city is CityWithWeather => city !== null);

  return (
    <section className="flex flex-col gap-5 border-t border-[var(--skyline-border)] pt-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-extrabold text-[var(--skyline-ink)]">
          Your Cities
        </h2>
        {isLoggedIn && (
          <span className="rounded-full bg-[var(--skyline-accent-soft)] px-4 py-1.5 text-sm font-bold text-[var(--skyline-accent)] ring-1 ring-[var(--skyline-border)]">
            {items.length} saved
          </span>
        )}
      </div>

      {!isLoggedIn ? (
        <p className="text-[var(--skyline-muted)]">
          <Link
            href="/login"
            className="font-semibold text-[var(--skyline-accent)] hover:underline"
          >
            Log in
          </Link>{" "}
          to save your favorite cities.
        </p>
      ) : items.length === 0 ? (
        <div className="skyline-glass-card rounded-2xl border-2 border-dashed border-[var(--skyline-border)] px-6 py-10 text-center">
          <p className="text-4xl opacity-60" aria-hidden>🌤</p>
          <p className="mt-4 font-semibold text-[var(--skyline-ink)]">
            No cities saved yet
          </p>
          <p className="mt-1 text-sm text-[var(--skyline-muted)]">
            Search a city above and tap save to add it here.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {citiesWithWeather.map((city) => (
            <div key={city.cityKey} className="group relative">
              <CityCard
                city={city}
                isLoggedIn={isLoggedIn}
                isFavorited={true}
                showFavoriteButton={false}
              />
              <button
                type="button"
                onClick={() => handleRemove(city.cityKey)}
                disabled={removing === city.cityKey}
                className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--skyline-accent)] text-sm font-bold text-white opacity-0 shadow-lg transition group-hover:opacity-100 disabled:opacity-50"
                aria-label={`Remove ${city.name} from saved cities`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
