import { coverUrl } from "@/lib/open-library";
import type { SupabaseClient } from "@supabase/supabase-js";

export type FavoriteWork = {
  id: string;
  workKey: string;
  title: string;
  authorNames: string[];
  coverId: number | null;
  coverUrl?: string;
  firstPublishYear: number | null;
  createdAt: string;
};

type FavoriteRow = {
  id: string;
  work_key: string;
  title: string;
  author_names: string[];
  cover_id: number | null;
  first_publish_year: number | null;
  created_at: string;
};

function toFavoriteWork(row: FavoriteRow): FavoriteWork {
  return {
    id: row.id,
    workKey: row.work_key,
    title: row.title,
    authorNames: row.author_names,
    coverId: row.cover_id,
    coverUrl: row.cover_id ? coverUrl(row.cover_id) : undefined,
    firstPublishYear: row.first_publish_year,
    createdAt: row.created_at,
  };
}

export async function getFavorites(
  supabase: SupabaseClient,
): Promise<FavoriteWork[]> {
  const { data, error } = await supabase
    .from("favorite_works")
    .select("id, work_key, title, author_names, cover_id, first_publish_year, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toFavoriteWork);
}

export async function isFavorited(
  supabase: SupabaseClient,
  workKey: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("favorite_works")
    .select("id")
    .eq("work_key", workKey)
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}

export type AddFavoriteInput = {
  workKey: string;
  title: string;
  authorNames: string[];
  coverId?: number | null;
  firstPublishYear?: number | null;
};

export async function addFavorite(
  supabase: SupabaseClient,
  input: AddFavoriteInput,
): Promise<FavoriteWork> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Must be logged in to save favorites");
  }

  const { data, error } = await supabase
    .from("favorite_works")
    .insert({
      user_id: user.id,
      work_key: input.workKey,
      title: input.title,
      author_names: input.authorNames,
      cover_id: input.coverId ?? null,
      first_publish_year: input.firstPublishYear ?? null,
    })
    .select("id, work_key, title, author_names, cover_id, first_publish_year, created_at")
    .single();

  if (error) throw error;
  return toFavoriteWork(data);
}

export async function removeFavorite(
  supabase: SupabaseClient,
  workKey: string,
): Promise<void> {
  const { error } = await supabase
    .from("favorite_works")
    .delete()
    .eq("work_key", workKey);

  if (error) throw error;
}

export async function getFavoriteCount(
  supabase: SupabaseClient,
): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 0;

  const { count, error } = await supabase
    .from("favorite_works")
    .select("*", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
}
