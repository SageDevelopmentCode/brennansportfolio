"use client";

import { BookCover } from "@/components/book-cover";
import type { FavoriteWork } from "@/lib/favorites";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type FavoritesSectionProps = {
  favorites: FavoriteWork[];
  isLoggedIn: boolean;
};

export function FavoritesSection({ favorites, isLoggedIn }: FavoritesSectionProps) {
  const router = useRouter();
  const [items, setItems] = useState(favorites);
  const [removing, setRemoving] = useState<string | null>(null);

  async function handleRemove(workKey: string) {
    setRemoving(workKey);
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from("favorite_works")
        .delete()
        .eq("work_key", workKey);
      if (error) throw error;
      setItems((current) => current.filter((f) => f.workKey !== workKey));
      router.refresh();
    } catch {
      // keep current state on error
    } finally {
      setRemoving(null);
    }
  }

  return (
    <section className="flex flex-col gap-5 border-t border-[var(--library-border)] pt-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-extrabold text-[var(--library-ink)]">
          Your Collection
        </h2>
        {isLoggedIn && (
          <span className="rounded-full bg-[var(--library-accent-soft)] px-4 py-1.5 text-sm font-bold text-[var(--library-accent)] ring-1 ring-[var(--library-border)]">
            {items.length} saved
          </span>
        )}
      </div>

      {!isLoggedIn ? (
        <p className="text-[var(--library-muted)]">
          <Link href="/login" className="font-semibold text-[var(--library-accent)] hover:underline">
            Log in
          </Link>{" "}
          to start building your collection.
        </p>
      ) : items.length === 0 ? (
        <div className="library-glass-card rounded-2xl border-2 border-dashed border-[var(--library-border)] px-6 py-10 text-center">
          <p className="text-4xl opacity-60" aria-hidden>📚</p>
          <p className="mt-4 font-semibold text-[var(--library-ink)]">
            Your shelf is empty
          </p>
          <p className="mt-1 text-sm text-[var(--library-muted)]">
            Search an author above and save a book to get started.
          </p>
        </div>
      ) : (
        <div className="library-shelf">
          {items.map((favorite) => (
            <div key={favorite.id} className="library-shelf-item group relative">
              <Link
                href={`/library/works/${favorite.workKey}`}
                className="block"
                title={favorite.title}
              >
                <BookCover
                  title={favorite.title}
                  coverUrl={favorite.coverUrl}
                  coverId={favorite.coverId}
                  size="sm"
                />
              </Link>
              <button
                type="button"
                onClick={() => handleRemove(favorite.workKey)}
                disabled={removing === favorite.workKey}
                className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--library-accent)] text-xs font-bold text-[#0a0612] opacity-0 shadow-lg transition group-hover:opacity-100 disabled:opacity-50"
                aria-label={`Remove ${favorite.title} from collection`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
