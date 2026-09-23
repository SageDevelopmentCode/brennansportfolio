import { AuthorSearch } from "@/components/author-search";
import { FavoritesSection } from "@/components/favorites-section";
import { getCurrentUsername } from "@/lib/auth";
import { getFavorites } from "@/lib/favorites";
import { getFeaturedAuthors } from "@/lib/open-library";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

function uniqueAuthorCount(favorites: { authorNames: string[] }[]): number {
  const names = new Set<string>();
  for (const fav of favorites) {
    for (const name of fav.authorNames) {
      names.add(name);
    }
  }
  return names.size;
}

export default async function LibraryPage() {
  const supabase = await createClient();
  const currentUsername = await getCurrentUsername(supabase);
  const [favorites, featuredAuthors] = await Promise.all([
    currentUsername ? getFavorites(supabase) : Promise.resolve([]),
    getFeaturedAuthors(),
  ]);

  const authorCount = uniqueAuthorCount(favorites);
  const latestFavorite = favorites[0] ?? null;

  return (
    <main className="library-bg relative flex flex-1 flex-col gap-10 overflow-hidden px-4 py-8 sm:px-8 sm:py-12">
      <div
        aria-hidden
        className="library-float-book left-[5%] top-[15%] opacity-30"
        style={{ animationDelay: "0s" }}
      >
        📖
      </div>
      <div
        aria-hidden
        className="library-float-book right-[8%] top-[25%] opacity-30"
        style={{ animationDelay: "2s" }}
      >
        📚
      </div>
      <div
        aria-hidden
        className="library-float-book left-[40%] top-[60%] hidden opacity-30 sm:block"
        style={{ animationDelay: "4s" }}
      >
        📕
      </div>

      <Link
        href="/"
        className="relative z-10 inline-flex w-fit items-center gap-2 rounded-full border border-[var(--library-border)] bg-[var(--library-glass)] px-4 py-2 text-sm font-semibold text-[var(--library-accent)] backdrop-blur-sm transition hover:border-[var(--library-accent)] hover:shadow-[0_0_16px_rgba(245,158,11,0.3)]"
      >
        ← All projects
      </Link>

      <header className="relative z-10 max-w-3xl">
        <span className="inline-block rounded-full bg-[var(--library-accent-soft)] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[var(--library-accent)] ring-1 ring-[var(--library-border)]">
          Open Library
        </span>
        <h1 className="mt-4 text-5xl font-extrabold leading-tight sm:text-6xl md:text-7xl">
          <span className="library-title-glow">The Stacks</span>
        </h1>
        <p className="mt-4 text-lg text-[var(--library-muted)]">
          Get lost in the stacks. Hunt down authors, crack open their works, and
          build your collection.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="library-stat-card rounded-2xl p-5">
            <p className="text-3xl text-[var(--library-accent)]" aria-hidden>♥</p>
            <p className="mt-2 text-4xl font-extrabold text-[var(--library-accent)]">
              {favorites.length}
            </p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[var(--library-muted)]">
              Books saved
            </p>
          </div>
          <div className="library-stat-card rounded-2xl p-5">
            <p className="text-3xl text-[var(--library-accent)]" aria-hidden>✍</p>
            <p className="mt-2 text-4xl font-extrabold text-[var(--library-accent)]">
              {authorCount}
            </p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[var(--library-muted)]">
              Authors collected
            </p>
          </div>
          <div className="library-stat-card rounded-2xl p-5">
            <p className="text-3xl text-[var(--library-accent)]" aria-hidden>📕</p>
            {latestFavorite ? (
              <>
                <p className="mt-2 truncate text-lg font-extrabold text-[var(--library-ink)]">
                  {latestFavorite.title}
                </p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[var(--library-muted)]">
                  Latest save
                </p>
              </>
            ) : (
              <>
                <p className="mt-2 text-4xl font-extrabold text-[var(--library-muted)]">—</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[var(--library-muted)]">
                  Latest save
                </p>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="relative z-10 flex w-full max-w-4xl flex-col gap-10">
        <AuthorSearch featuredAuthors={featuredAuthors} />
        <FavoritesSection favorites={favorites} isLoggedIn={currentUsername !== null} />
      </div>
    </main>
  );
}
