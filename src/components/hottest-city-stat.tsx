"use client";

import { useWeatherUnit } from "@/components/weather-unit-provider";
import { formatTemperature } from "@/lib/weather-units";

type HottestCityStatProps = {
  temperature: number;
  cityName: string;
};

export function HottestCityStat({ temperature, cityName }: HottestCityStatProps) {
  const { unit } = useWeatherUnit();

  return (
    <>
      <p className="mt-2 text-4xl font-extrabold text-[var(--skyline-accent)]">
        {formatTemperature(temperature, unit)}
      </p>
      <p className="mt-1 truncate text-xs font-bold uppercase tracking-wide text-[var(--skyline-muted)]">
        Hottest: {cityName}
      </p>
    </>
  );
}
