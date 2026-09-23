import { CityDetailCard } from "@/components/city-detail-card";
import { ForecastRow } from "@/components/forecast-row";
import { WeatherUnitToggle } from "@/components/weather-unit-provider";
import { getCurrentUsername } from "@/lib/auth";
import { getCityFavoriteByKey, isCityFavorited } from "@/lib/city-favorites";
import { createClient } from "@/lib/supabase/server";
import {
  getCityLocationFromCoords,
  getCityWeatherBundle,
} from "@/lib/weather";
import Link from "next/link";
import { notFound } from "next/navigation";

type CityPageProps = {
  params: Promise<{ key: string }>;
  searchParams: Promise<{
    lat?: string;
    lon?: string;
    name?: string;
    country?: string;
    timezone?: string;
    admin1?: string;
  }>;
};

export default async function CityPage({ params, searchParams }: CityPageProps) {
  const { key } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const currentUsername = await getCurrentUsername(supabase);

  let latitude = query.lat ? Number(query.lat) : NaN;
  let longitude = query.lon ? Number(query.lon) : NaN;
  let name = query.name ?? "";
  let country = query.country ?? "";
  let timezone = query.timezone ?? "auto";
  let admin1 = query.admin1;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !name) {
    const favorite = currentUsername
      ? await getCityFavoriteByKey(supabase, key)
      : null;

    if (!favorite) notFound();

    latitude = favorite.latitude;
    longitude = favorite.longitude;
    name = favorite.name;
    country = favorite.country;
    timezone = favorite.timezone;
  }

  let bundle;
  try {
    bundle = await getCityWeatherBundle(latitude, longitude);
  } catch {
    notFound();
  }

  const city = getCityLocationFromCoords(key, latitude, longitude, {
    name,
    country,
    timezone,
    admin1,
  });

  const favorited = currentUsername
    ? await isCityFavorited(supabase, key)
    : false;

  return (
    <main className="skyline-bg relative flex flex-1 flex-col gap-10 px-4 py-8 sm:px-8 sm:py-12">
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/weather"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--skyline-border)] bg-[var(--skyline-glass)] px-4 py-2 text-sm font-semibold text-[var(--skyline-accent)] backdrop-blur-sm transition hover:border-[var(--skyline-accent)] hover:shadow-[0_0_16px_rgba(14,165,233,0.3)]"
        >
          ← Back to search
        </Link>
        <WeatherUnitToggle />
      </div>

      <div className="relative z-10 flex max-w-4xl flex-col gap-10">
        <CityDetailCard
          city={city}
          bundle={bundle}
          isLoggedIn={currentUsername !== null}
          isFavorited={favorited}
        />
        <ForecastRow days={bundle.daily} />
      </div>
    </main>
  );
}
