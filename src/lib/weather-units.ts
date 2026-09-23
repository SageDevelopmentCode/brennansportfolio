export type TempUnit = "f" | "c";

export const TEMP_UNIT_STORAGE_KEY = "skyline-temp-unit";

export function fahrenheitToCelsius(fahrenheit: number): number {
  return ((fahrenheit - 32) * 5) / 9;
}

export function formatTemperature(
  valueFahrenheit: number,
  unit: TempUnit,
): string {
  if (unit === "c") {
    return `${Math.round(fahrenheitToCelsius(valueFahrenheit))}°C`;
  }
  return `${Math.round(valueFahrenheit)}°F`;
}

export function getStoredTempUnit(): TempUnit {
  if (typeof window === "undefined") return "f";
  const stored = localStorage.getItem(TEMP_UNIT_STORAGE_KEY);
  return stored === "c" ? "c" : "f";
}

export function storeTempUnit(unit: TempUnit): void {
  localStorage.setItem(TEMP_UNIT_STORAGE_KEY, unit);
}
