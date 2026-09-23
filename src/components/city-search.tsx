"use client";

import { CityCard } from "@/components/city-card";
import type { CityWithWeather } from "@/lib/weather";
import { useEffect, useState } from "react";

const QUICK_PICKS = ["New York", "London", "Tokyo", "Paris", "Sydney"];

type CitySearchProps = {
  featuredCities: CityWithWeather[];
  favoritedCityKeys: string[];
  isLoggedIn: boolean;
};

function SearchSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          className="skyline-skeleton flex h-48 rounded-2xl"
          aria-hidden
        />
      ))}
    </div>
  );
}

export function CitySearch({
  featuredCities,
  favoritedCityKeys,
  isLoggedIn,
}: CitySearchProps) {
  const [query, setQuery] = useState("");
  const [cities, setCities] = useState<CityWithWeather[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setCities([]);
      setSearched(false);
      setError(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(
          `/api/weather/search?q=${encodeURIComponent(query)}`,
        );
        const data = await res.json();
        if (!res.ok) {
          setCities([]);
          setError(true);
          setSearched(true);
          return;
        }
        setCities(data.cities ?? []);
        setSearched(true);
      } catch {
        setCities([]);
        setError(true);
        setSearched(true);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const showFeatured = !query.trim() && !loading;

  return (
    <section className="flex flex-col gap-6">
      <div>
        <label htmlFor="city-search" className="sr-only">
          Search cities
        </label>
        <input
          id="city-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search cities by name…"
          className="skyline-input w-full"
          autoComplete="off"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_PICKS.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setQuery(name)}
            className="rounded-full border border-[var(--skyline-border)] bg-[var(--skyline-glass)] px-4 py-1.5 text-sm font-semibold text-[var(--skyline-accent)] backdrop-blur-sm transition hover:border-[var(--skyline-accent)] hover:bg-[var(--skyline-accent-soft)] hover:shadow-[0_0_16px_rgba(14,165,233,0.3)]"
          >
            {name}
          </button>
        ))}
      </div>

      {loading && <SearchSkeleton />}

      {!loading && error && (
        <p className="text-sm font-semibold text-[var(--skyline-accent)]">
          Could not load weather. Try again.
        </p>
      )}

      {!loading && !error && searched && cities.length === 0 && query.trim() && (
        <p className="text-sm text-[var(--skyline-muted)]">
          No cities found for &ldquo;{query}&rdquo;
        </p>
      )}

      {!loading && cities.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {cities.map((city, index) => (
            <div
              key={city.cityKey}
              className="animate-skyline-slide-in"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <CityCard
                city={city}
                isLoggedIn={isLoggedIn}
                isFavorited={favoritedCityKeys.includes(city.cityKey)}
              />
            </div>
          ))}
        </div>
      )}

      {showFeatured && (
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-extrabold text-[var(--skyline-ink)]">
            Popular cities
          </h2>
          {featuredCities.length > 0 ? (
            <>
              <p className="text-sm text-[var(--skyline-muted)]">
                Or pick a city above to jump right in.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {featuredCities.map((city, index) => (
                  <div
                    key={city.cityKey}
                    className="animate-skyline-slide-in"
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <CityCard
                      city={city}
                      isLoggedIn={isLoggedIn}
                      isFavorited={favoritedCityKeys.includes(city.cityKey)}
                    />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--skyline-muted)]">
              Weather data is temporarily unavailable. Try searching for a city
              above.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
