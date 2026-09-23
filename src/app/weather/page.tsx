import { CitySearch } from "@/components/city-search";
import { HottestCityStat } from "@/components/hottest-city-stat";
import { SavedCitiesSection } from "@/components/saved-cities-section";
import { WeatherUnitToggle } from "@/components/weather-unit-provider";
import { getCurrentUsername } from "@/lib/auth";
import { getCityFavorites } from "@/lib/city-favorites";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWeather, getFeaturedCities } from "@/lib/weather";
import Link from "next/link";

async function enrichFavoritesWithWeather(
  favorites: Awaited<ReturnType<typeof getCityFavorites>>,
) {
  return Promise.all(
    favorites.map(async (favorite) => {
      try {
        const weather = await getCurrentWeather(
          favorite.latitude,
          favorite.longitude,
        );
        return { ...favorite, weather };
      } catch {
        return favorite;
      }
    }),
  );
}

export default async function WeatherPage() {
  const supabase = await createClient();
  const currentUsername = await getCurrentUsername(supabase);

  const [rawFavorites, featuredCities] = await Promise.all([
    currentUsername ? getCityFavorites(supabase) : Promise.resolve([]),
    getFeaturedCities(),
  ]);

  const favorites = await enrichFavoritesWithWeather(rawFavorites);
  const favoritedCityKeys = favorites.map((f) => f.cityKey);

  const hottestCity = favorites.reduce<(typeof favorites)[number] | null>(
    (hottest, city) => {
      if (!city.weather) return hottest;
      if (!hottest?.weather) return city;
      return city.weather.temperature > hottest.weather.temperature
        ? city
        : hottest;
    },
    null,
  );

  const latestFavorite = favorites[0] ?? null;

  return (
    <main className="skyline-bg relative flex flex-1 flex-col gap-10 overflow-hidden px-4 py-8 sm:px-8 sm:py-12">
      <div
        aria-hidden
        className="skyline-float-cloud left-[5%] top-[15%] opacity-40"
        style={{ animationDelay: "0s" }}
      >
        ☁️
      </div>
      <div
        aria-hidden
        className="skyline-float-cloud right-[8%] top-[25%] opacity-40"
        style={{ animationDelay: "2s" }}
      >
        🌤
      </div>
      <div
        aria-hidden
        className="skyline-float-cloud left-[40%] top-[60%] hidden opacity-40 sm:block"
        style={{ animationDelay: "4s" }}
      >
        ⛅
      </div>

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--skyline-border)] bg-[var(--skyline-glass)] px-4 py-2 text-sm font-semibold text-[var(--skyline-accent)] backdrop-blur-sm transition hover:border-[var(--skyline-accent)] hover:shadow-[0_0_16px_rgba(14,165,233,0.3)]"
        >
          ← All projects
        </Link>
        <WeatherUnitToggle />
      </div>

      <header className="relative z-10 max-w-3xl">
        <span className="inline-block rounded-full bg-[var(--skyline-accent-soft)] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[var(--skyline-accent)] ring-1 ring-[var(--skyline-border)]">
          Open-Meteo
        </span>
        <h1 className="mt-4 text-5xl font-extrabold leading-tight sm:text-6xl md:text-7xl">
          <span className="skyline-title-glow">Skyline</span>
        </h1>
        <p className="mt-4 text-lg text-[var(--skyline-muted)]">
          Search any city, check live conditions, and build your personal weather
          watchlist.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="skyline-stat-card rounded-2xl p-5">
            <p className="text-3xl text-[var(--skyline-accent)]" aria-hidden>♥</p>
            <p className="mt-2 text-4xl font-extrabold text-[var(--skyline-accent)]">
              {favorites.length}
            </p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[var(--skyline-muted)]">
              Cities saved
            </p>
          </div>
          <div className="skyline-stat-card rounded-2xl p-5">
            <p className="text-3xl text-[var(--skyline-accent)]" aria-hidden>🌡</p>
            {hottestCity?.weather ? (
              <HottestCityStat
                temperature={hottestCity.weather.temperature}
                cityName={hottestCity.name}
              />
            ) : (
              <>
                <p className="mt-2 text-4xl font-extrabold text-[var(--skyline-muted)]">
                  —
                </p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[var(--skyline-muted)]">
                  Hottest saved
                </p>
              </>
            )}
          </div>
          <div className="skyline-stat-card rounded-2xl p-5">
            <p className="text-3xl text-[var(--skyline-accent)]" aria-hidden>📍</p>
            {latestFavorite ? (
              <>
                <p className="mt-2 truncate text-lg font-extrabold text-[var(--skyline-ink)]">
                  {latestFavorite.name}
                </p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[var(--skyline-muted)]">
                  Latest save
                </p>
              </>
            ) : (
              <>
                <p className="mt-2 text-4xl font-extrabold text-[var(--skyline-muted)]">
                  —
                </p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[var(--skyline-muted)]">
                  Latest save
                </p>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="relative z-10 flex w-full max-w-4xl flex-col gap-10">
        <CitySearch
          featuredCities={featuredCities}
          favoritedCityKeys={favoritedCityKeys}
          isLoggedIn={currentUsername !== null}
        />
        <SavedCitiesSection
          favorites={favorites}
          isLoggedIn={currentUsername !== null}
        />
      </div>
    </main>
  );
}
