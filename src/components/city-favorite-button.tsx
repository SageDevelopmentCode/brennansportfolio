"use client";

import type { AddCityFavoriteInput } from "@/lib/city-favorites";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type CityFavoriteButtonProps = {
  cityKey: string;
  initialFavorited: boolean;
  favoriteData: AddCityFavoriteInput;
  isLoggedIn: boolean;
};

export function CityFavoriteButton({
  cityKey,
  initialFavorited,
  favoriteData,
  isLoggedIn,
}: CityFavoriteButtonProps) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);
  const [popping, setPopping] = useState(false);

  if (!isLoggedIn) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--skyline-accent)] bg-[var(--skyline-glass)] px-5 py-2.5 text-sm font-bold text-[var(--skyline-accent)] backdrop-blur-sm transition hover:bg-[var(--skyline-accent-soft)] hover:shadow-[0_0_20px_rgba(14,165,233,0.4)]"
      >
        ♡ Log in to save
      </Link>
    );
  }

  async function toggleFavorite() {
    setLoading(true);
    const supabase = createClient();

    try {
      if (favorited) {
        const { error } = await supabase
          .from("favorite_cities")
          .delete()
          .eq("city_key", cityKey);
        if (error) throw error;
        setFavorited(false);
        router.refresh();
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from("favorite_cities").insert({
          user_id: user.id,
          city_key: favoriteData.cityKey,
          name: favoriteData.name,
          country: favoriteData.country,
          latitude: favoriteData.latitude,
          longitude: favoriteData.longitude,
          timezone: favoriteData.timezone,
        });
        if (error) throw error;
        setFavorited(true);
        setPopping(true);
        setTimeout(() => setPopping(false), 350);
        router.refresh();
      }
    } catch {
      // keep current state on error
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggleFavorite}
      disabled={loading}
      className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition disabled:opacity-50 ${
        popping ? "animate-save-pop" : ""
      } ${
        favorited
          ? "bg-[var(--skyline-accent)] text-white shadow-[0_0_24px_rgba(14,165,233,0.5)] hover:opacity-90"
          : "border-2 border-[var(--skyline-accent)] bg-[var(--skyline-glass)] text-[var(--skyline-accent)] backdrop-blur-sm hover:bg-[var(--skyline-accent-soft)] hover:shadow-[0_0_20px_rgba(14,165,233,0.3)]"
      }`}
    >
      {favorited ? "♥ Saved city" : "♡ Save city"}
    </button>
  );
}
