import type { CurrentWeather } from "@/lib/weather";
import type { SupabaseClient } from "@supabase/supabase-js";

export type FavoriteCity = {
  id: string;
  cityKey: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  createdAt: string;
  weather?: CurrentWeather;
};

type FavoriteCityRow = {
  id: string;
  city_key: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  created_at: string;
};

function toFavoriteCity(row: FavoriteCityRow): FavoriteCity {
  return {
    id: row.id,
    cityKey: row.city_key,
    name: row.name,
    country: row.country,
    latitude: row.latitude,
    longitude: row.longitude,
    timezone: row.timezone,
    createdAt: row.created_at,
  };
}

export async function getCityFavorites(
  supabase: SupabaseClient,
): Promise<FavoriteCity[]> {
  const { data, error } = await supabase
    .from("favorite_cities")
    .select(
      "id, city_key, name, country, latitude, longitude, timezone, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toFavoriteCity);
}

export async function getCityFavoriteByKey(
  supabase: SupabaseClient,
  cityKey: string,
): Promise<FavoriteCity | null> {
  const { data, error } = await supabase
    .from("favorite_cities")
    .select(
      "id, city_key, name, country, latitude, longitude, timezone, created_at",
    )
    .eq("city_key", cityKey)
    .maybeSingle();

  if (error) throw error;
  return data ? toFavoriteCity(data) : null;
}

export async function isCityFavorited(
  supabase: SupabaseClient,
  cityKey: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("favorite_cities")
    .select("id")
    .eq("city_key", cityKey)
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}

export type AddCityFavoriteInput = {
  cityKey: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

export async function addCityFavorite(
  supabase: SupabaseClient,
  input: AddCityFavoriteInput,
): Promise<FavoriteCity> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Must be logged in to save favorite cities");
  }

  const { data, error } = await supabase
    .from("favorite_cities")
    .insert({
      user_id: user.id,
      city_key: input.cityKey,
      name: input.name,
      country: input.country,
      latitude: input.latitude,
      longitude: input.longitude,
      timezone: input.timezone,
    })
    .select(
      "id, city_key, name, country, latitude, longitude, timezone, created_at",
    )
    .single();

  if (error) throw error;
  return toFavoriteCity(data);
}

export async function removeCityFavorite(
  supabase: SupabaseClient,
  cityKey: string,
): Promise<void> {
  const { error } = await supabase
    .from("favorite_cities")
    .delete()
    .eq("city_key", cityKey);

  if (error) throw error;
}

export async function getCityFavoriteCount(
  supabase: SupabaseClient,
): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 0;

  const { count, error } = await supabase
    .from("favorite_cities")
    .select("*", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
}

export async function getLatestCityFavorite(
  supabase: SupabaseClient,
): Promise<FavoriteCity | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("favorite_cities")
    .select(
      "id, city_key, name, country, latitude, longitude, timezone, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? toFavoriteCity(data) : null;
}
