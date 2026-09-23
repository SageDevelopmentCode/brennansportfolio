"use client";

import { CityFavoriteButton } from "@/components/city-favorite-button";
import { WeatherScaleBar } from "@/components/weather-scale-bar";
import { useWeatherUnit } from "@/components/weather-unit-provider";
import type { AddCityFavoriteInput } from "@/lib/city-favorites";
import type { CityWithWeather } from "@/lib/weather";
import { formatTemperature } from "@/lib/weather-units";
import {
  cityDetailHref,
  humidityToScale,
  uvIndexToSunScale,
  weatherCodeToEmoji,
  weatherCodeToLabel,
} from "@/lib/weather";
import Link from "next/link";

type CityCardProps = {
  city: CityWithWeather;
  isLoggedIn: boolean;
  isFavorited: boolean;
  showFavoriteButton?: boolean;
};

export function CityCard({
  city,
  isLoggedIn,
  isFavorited,
  showFavoriteButton = true,
}: CityCardProps) {
  const { unit } = useWeatherUnit();

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

  const detailHref = cityDetailHref(city);

  return (
    <article className="skyline-glass-card skyline-card flex flex-col gap-4 rounded-2xl p-5">
      <Link href={detailHref} className="flex flex-col gap-4 transition">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-xl font-extrabold text-[var(--skyline-ink)]">
              {city.name}
            </h3>
            <p className="mt-0.5 text-sm font-medium text-[var(--skyline-muted)]">
              {locationLabel}
            </p>
          </div>
          <span className="text-4xl" aria-hidden>
            {weatherCodeToEmoji(city.weather.weatherCode)}
          </span>
        </div>

        <div>
          <p className="text-5xl font-extrabold leading-none text-[var(--skyline-accent)]">
            {formatTemperature(city.weather.temperature, unit)}
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--skyline-muted)]">
            Feels like {formatTemperature(city.weather.apparentTemperature, unit)}
          </p>
        </div>

        <p className="text-sm font-semibold text-[var(--skyline-ink)]">
          {weatherCodeToLabel(city.weather.weatherCode)}
        </p>

        <div className="flex flex-col gap-3">
          <WeatherScaleBar
            label="Sun radiation"
            value={uvIndexToSunScale(city.weather.uvIndex)}
          />
          <WeatherScaleBar
            label="Humidity"
            value={humidityToScale(city.weather.humidity)}
            suffix={`${city.weather.humidity}%`}
          />
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--skyline-muted)]">
            Wind {Math.round(city.weather.windSpeed)} mph
          </p>
        </div>
      </Link>

      {showFavoriteButton && (
        <CityFavoriteButton
          cityKey={city.cityKey}
          initialFavorited={isFavorited}
          favoriteData={favoriteData}
          isLoggedIn={isLoggedIn}
        />
      )}
    </article>
  );
}
