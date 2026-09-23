"use client";

import {
  getStoredTempUnit,
  storeTempUnit,
  type TempUnit,
} from "@/lib/weather-units";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type WeatherUnitContextValue = {
  unit: TempUnit;
  setUnit: (unit: TempUnit) => void;
  toggleUnit: () => void;
};

const WeatherUnitContext = createContext<WeatherUnitContextValue | null>(null);

export function WeatherUnitProvider({ children }: { children: ReactNode }) {
  const [unit, setUnitState] = useState<TempUnit>("f");

  useEffect(() => {
    setUnitState(getStoredTempUnit());
  }, []);

  function setUnit(next: TempUnit) {
    setUnitState(next);
    storeTempUnit(next);
  }

  function toggleUnit() {
    setUnit(unit === "f" ? "c" : "f");
  }

  return (
    <WeatherUnitContext.Provider value={{ unit, setUnit, toggleUnit }}>
      {children}
    </WeatherUnitContext.Provider>
  );
}

export function useWeatherUnit() {
  const context = useContext(WeatherUnitContext);
  if (!context) {
    throw new Error("useWeatherUnit must be used within WeatherUnitProvider");
  }
  return context;
}

export function WeatherUnitToggle() {
  const { unit, toggleUnit } = useWeatherUnit();

  return (
    <button
      type="button"
      onClick={toggleUnit}
      className="rounded-full border border-[var(--skyline-border)] bg-[var(--skyline-glass)] px-4 py-2 text-sm font-bold text-[var(--skyline-accent)] backdrop-blur-sm transition hover:border-[var(--skyline-accent)] hover:bg-[var(--skyline-accent-soft)]"
      aria-label={`Switch to ${unit === "f" ? "Celsius" : "Fahrenheit"}`}
    >
      °{unit.toUpperCase()} → °{unit === "f" ? "C" : "F"}
    </button>
  );
}
