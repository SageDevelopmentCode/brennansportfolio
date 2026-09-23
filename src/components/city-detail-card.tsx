"use client";

import { CityFavoriteButton } from "@/components/city-favorite-button";
import { WeatherScaleBar } from "@/components/weather-scale-bar";
import { useWeatherUnit } from "@/components/weather-unit-provider";
import type { AddCityFavoriteInput } from "@/lib/city-favorites";
import type { CityLocation, CityWeatherBundle } from "@/lib/weather";
import { formatTemperature } from "@/lib/weather-units";
import {
  humidityToScale,
  uvIndexToSunScale,
  weatherCodeToEmoji,
  weatherCodeToLabel,
} from "@/lib/weather";

type CityDetailCardProps = {
  city: CityLocation;
  bundle: CityWeatherBundle;
  isLoggedIn: boolean;
  isFavorited: boolean;
};

export function CityDetailCard({
  city,
  bundle,
  isLoggedIn,
  isFavorited,
}: CityDetailCardProps) {
  const { unit } = useWeatherUnit();
  const { current } = bundle;

  const favoriteData: AddCityFavoriteInput = {
    cityKey: city.cityKey,
    name: city.name,
    country: city.country,
    latitude: city.latitude,
    longitude: city.longitude,
    timezone: city.timezone,
  };

  const locationLabel = city.admin1
    ? `${city.admin1}, ${city.country}`
    : city.country;

  return (
    <article className="skyline-glass-card flex flex-col gap-6 rounded-3xl p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-4xl font-extrabold text-[var(--skyline-ink)] sm:text-5xl">
            {city.name}
          </h1>
          <p className="mt-2 text-lg font-medium text-[var(--skyline-muted)]">
            {locationLabel}
          </p>
        </div>
        <span className="text-6xl" aria-hidden>
          {weatherCodeToEmoji(current.weatherCode)}
        </span>
      </div>

      <div>
        <p className="text-6xl font-extrabold leading-none text-[var(--skyline-accent)] sm:text-7xl">
          {formatTemperature(current.temperature, unit)}
        </p>
        <p className="mt-2 text-lg font-semibold text-[var(--skyline-muted)]">
          Feels like {formatTemperature(current.apparentTemperature, unit)}
        </p>
        <p className="mt-1 text-base font-semibold text-[var(--skyline-ink)]">
          {weatherCodeToLabel(current.weatherCode)}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <WeatherScaleBar
          label="Sun radiation"
          value={uvIndexToSunScale(current.uvIndex)}
        />
        <WeatherScaleBar
          label="Humidity"
          value={humidityToScale(current.humidity)}
          suffix={`${current.humidity}%`}
        />
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--skyline-muted)]">
          Wind {Math.round(current.windSpeed)} mph
        </p>
      </div>

      <CityFavoriteButton
        cityKey={city.cityKey}
        initialFavorited={isFavorited}
        favoriteData={favoriteData}
        isLoggedIn={isLoggedIn}
      />
    </article>
  );
}
