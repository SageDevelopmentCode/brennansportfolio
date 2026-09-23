"use client";

import type { AddFavoriteInput } from "@/lib/favorites";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useState } from "react";

type FavoriteButtonProps = {
  workKey: string;
  initialFavorited: boolean;
  favoriteData: AddFavoriteInput;
  isLoggedIn: boolean;
};

export function FavoriteButton({
  workKey,
  initialFavorited,
  favoriteData,
  isLoggedIn,
}: FavoriteButtonProps) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);
  const [popping, setPopping] = useState(false);

  if (!isLoggedIn) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--library-accent)] bg-[var(--library-glass)] px-5 py-2.5 text-sm font-bold text-[var(--library-accent)] backdrop-blur-sm transition hover:bg-[var(--library-accent-soft)] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]"
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
          .from("favorite_works")
          .delete()
          .eq("work_key", workKey);
        if (error) throw error;
        setFavorited(false);
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from("favorite_works").insert({
          user_id: user.id,
          work_key: favoriteData.workKey,
          title: favoriteData.title,
          author_names: favoriteData.authorNames,
          cover_id: favoriteData.coverId ?? null,
          first_publish_year: favoriteData.firstPublishYear ?? null,
        });
        if (error) throw error;
        setFavorited(true);
        setPopping(true);
        setTimeout(() => setPopping(false), 350);
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
          ? "bg-[var(--library-accent)] text-[#0a0612] shadow-[0_0_24px_rgba(245,158,11,0.5)] hover:opacity-90"
          : "border-2 border-[var(--library-accent)] bg-[var(--library-glass)] text-[var(--library-accent)] backdrop-blur-sm hover:bg-[var(--library-accent-soft)] hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]"
      }`}
    >
      {favorited ? "♥ Added to collection" : "♡ Save to collection"}
    </button>
  );
}
