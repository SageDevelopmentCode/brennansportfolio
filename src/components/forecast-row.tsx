"use client";

import { useWeatherUnit } from "@/components/weather-unit-provider";
import type { DailyForecastDay } from "@/lib/weather";
import { formatTemperature } from "@/lib/weather-units";
import {
  formatForecastDayLabel,
  weatherCodeToEmoji,
} from "@/lib/weather";

type ForecastRowProps = {
  days: DailyForecastDay[];
};

export function ForecastRow({ days }: ForecastRowProps) {
  const { unit } = useWeatherUnit();

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-extrabold text-[var(--skyline-ink)]">
        5-day forecast
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {days.map((day) => (
          <div
            key={day.date}
            className="skyline-glass-card flex flex-col items-center gap-2 rounded-2xl p-4 text-center"
          >
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--skyline-muted)]">
              {formatForecastDayLabel(day.date)}
            </p>
            <span className="text-3xl" aria-hidden>
              {weatherCodeToEmoji(day.weatherCode)}
            </span>
            <p className="text-sm font-extrabold text-[var(--skyline-ink)]">
              {formatTemperature(day.tempMax, unit)}
            </p>
            <p className="text-xs font-semibold text-[var(--skyline-muted)]">
              {formatTemperature(day.tempMin, unit)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
