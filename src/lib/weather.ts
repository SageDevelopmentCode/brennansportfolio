const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

export type CityLocation = {
  cityKey: string;
  name: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
  admin1?: string;
};

export type CurrentWeather = {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  weatherCode: number;
  windSpeed: number;
  uvIndex: number;
};

export type DailyForecastDay = {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
};

export type CityWeatherBundle = {
  current: CurrentWeather;
  daily: DailyForecastDay[];
};

export type CityWithWeather = CityLocation & {
  weather: CurrentWeather;
};

type GeocodingResult = {
  id: number;
  name: string;
  country: string;
  country_code: string;
  latitude: number;
  longitude: number;
  timezone: string;
  admin1?: string;
};

type GeocodingResponse = {
  results?: GeocodingResult[];
};

type ForecastResponse = {
  current?: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    uv_index: number;
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
};

export function uvIndexToSunScale(uvIndex: number): number {
  if (uvIndex <= 0) return 1;
  return Math.min(10, Math.round(uvIndex));
}

export function humidityToScale(humidity: number): number {
  return Math.max(1, Math.min(10, Math.round(humidity / 10)));
}

function toCityLocation(result: GeocodingResult): CityLocation {
  return {
    cityKey: String(result.id),
    name: result.name,
    country: result.country,
    countryCode: result.country_code,
    latitude: result.latitude,
    longitude: result.longitude,
    timezone: result.timezone,
    admin1: result.admin1,
  };
}

function parseCurrentWeather(
  current: NonNullable<ForecastResponse["current"]>,
): CurrentWeather {
  return {
    temperature: current.temperature_2m,
    apparentTemperature: current.apparent_temperature ?? current.temperature_2m,
    humidity: current.relative_humidity_2m,
    weatherCode: current.weather_code,
    windSpeed: current.wind_speed_10m,
    uvIndex: current.uv_index ?? 0,
  };
}

function parseDailyForecast(
  daily: NonNullable<ForecastResponse["daily"]>,
): DailyForecastDay[] {
  return daily.time.map((date, index) => ({
    date,
    weatherCode: daily.weather_code[index],
    tempMax: daily.temperature_2m_max[index],
    tempMin: daily.temperature_2m_min[index],
  }));
}

export function getCityLocationFromCoords(
  cityKey: string,
  latitude: number,
  longitude: number,
  meta: {
    name: string;
    country: string;
    timezone: string;
    countryCode?: string;
    admin1?: string;
  },
): CityLocation {
  return {
    cityKey,
    name: meta.name,
    country: meta.country,
    countryCode: meta.countryCode ?? "",
    latitude,
    longitude,
    timezone: meta.timezone,
    admin1: meta.admin1,
  };
}

export function cityDetailHref(city: CityLocation): string {
  const params = new URLSearchParams({
    lat: String(city.latitude),
    lon: String(city.longitude),
    name: city.name,
    country: city.country,
    timezone: city.timezone,
  });
  if (city.admin1) params.set("admin1", city.admin1);
  return `/weather/cities/${city.cityKey}?${params.toString()}`;
}

export function weatherCodeToEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "🌫️";
  if (code <= 57) return "🌦️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌧️";
  if (code <= 86) return "🌨️";
  if (code <= 99) return "⛈️";
  return "🌤️";
}

export function weatherCodeToLabel(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  if (code <= 86) return "Snow showers";
  if (code <= 99) return "Thunderstorm";
  return "Unknown";
}

export function formatForecastDayLabel(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  const today = new Date();
  const isToday =
    parsed.getFullYear() === today.getFullYear() &&
    parsed.getMonth() === today.getMonth() &&
    parsed.getDate() === today.getDate();

  if (isToday) return "Today";

  return parsed.toLocaleDateString("en-US", { weekday: "short" });
}

export async function searchCities(query: string): Promise<CityLocation[]> {
  const url = new URL(GEOCODING_URL);
  url.searchParams.set("name", query.trim());
  url.searchParams.set("count", "10");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error("Geocoding request failed");

  const data = (await res.json()) as GeocodingResponse;
  return (data.results ?? []).map(toCityLocation);
}

export async function getCityWeatherBundle(
  latitude: number,
  longitude: number,
): Promise<CityWeatherBundle> {
  const url = new URL(FORECAST_URL);
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set(
    "current",
    "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,uv_index",
  );
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min",
  );
  url.searchParams.set("forecast_days", "5");
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("wind_speed_unit", "mph");
  url.searchParams.set("timezone", "auto");

  const res = await fetch(url.toString(), { next: { revalidate: 300 } });
  if (!res.ok) throw new Error("Weather request failed");

  const data = (await res.json()) as ForecastResponse;
  const current = data.current;
  const daily = data.daily;
  if (!current || !daily) throw new Error("No weather data");

  return {
    current: parseCurrentWeather(current),
    daily: parseDailyForecast(daily),
  };
}

export async function getCurrentWeather(
  latitude: number,
  longitude: number,
): Promise<CurrentWeather> {
  const bundle = await getCityWeatherBundle(latitude, longitude);
  return bundle.current;
}

export async function attachWeatherToCities(
  cities: CityLocation[],
): Promise<CityWithWeather[]> {
  const results = await Promise.all(
    cities.map(async (city) => {
      try {
        const weather = await getCurrentWeather(city.latitude, city.longitude);
        return { ...city, weather };
      } catch {
        return null;
      }
    }),
  );
  return results.filter((city): city is CityWithWeather => city !== null);
}

const FEATURED_CITY_NAMES = ["New York", "London", "Tokyo"];

export async function getFeaturedCities(): Promise<CityWithWeather[]> {
  const locations = await Promise.all(
    FEATURED_CITY_NAMES.map(async (name) => {
      const cities = await searchCities(name);
      return cities[0] ?? null;
    }),
  );
  const valid = locations.filter((city): city is CityLocation => city !== null);
  return attachWeatherToCities(valid);
}
