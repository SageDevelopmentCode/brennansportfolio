"use client";

import { AuthorCard } from "@/components/author-card";
import type { Author } from "@/lib/open-library";
import { useEffect, useState } from "react";

const QUICK_PICKS = ["Tolkien", "Austen", "King", "Morrison", "Rowling"];

type AuthorSearchProps = {
  featuredAuthors: Author[];
};

function SearchSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          className="library-skeleton flex h-24 rounded-2xl"
          aria-hidden
        />
      ))}
    </div>
  );
}

export function AuthorSearch({ featuredAuthors }: AuthorSearchProps) {
  const [query, setQuery] = useState("");
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setAuthors([]);
      setSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/library/search?q=${encodeURIComponent(query)}`,
        );
        const data = await res.json();
        setAuthors(data.authors ?? []);
        setSearched(true);
      } catch {
        setAuthors([]);
        setSearched(true);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const showFeatured = !query.trim() && !loading;

  return (
    <section className="flex flex-col gap-6">
      <div>
        <label htmlFor="author-search" className="sr-only">
          Search authors
        </label>
        <input
          id="author-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search authors by name…"
          className="library-input w-full"
          autoComplete="off"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_PICKS.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setQuery(name)}
            className="rounded-full border border-[var(--library-border)] bg-[var(--library-glass)] px-4 py-1.5 text-sm font-semibold text-[var(--library-accent)] backdrop-blur-sm transition hover:border-[var(--library-accent)] hover:bg-[var(--library-accent-soft)] hover:shadow-[0_0_16px_rgba(245,158,11,0.3)]"
          >
            {name}
          </button>
        ))}
      </div>

      {loading && <SearchSkeleton />}

      {!loading && searched && authors.length === 0 && query.trim() && (
        <p className="text-sm text-[var(--library-muted)]">
          The stacks are quiet… no authors found for &ldquo;{query}&rdquo;
        </p>
      )}

      {!loading && authors.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {authors.map((author, index) => (
            <div
              key={author.key}
              className="animate-library-slide-in"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <AuthorCard author={author} />
            </div>
          ))}
        </div>
      )}

      {showFeatured && featuredAuthors.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-extrabold text-[var(--library-ink)]">
            Start exploring
          </h2>
          <p className="text-sm text-[var(--library-muted)]">
            Or pick a name above to jump right in.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {featuredAuthors.map((author, index) => (
              <div
                key={author.key}
                className="animate-library-slide-in"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <AuthorCard author={author} />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
