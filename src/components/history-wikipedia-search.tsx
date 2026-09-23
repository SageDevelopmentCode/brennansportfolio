"use client";

import type { WikiSearchResult } from "@/lib/wikipedia";
import { useEffect, useState } from "react";

type HistoryWikipediaSearchProps = {
  onAddEvent: (result: WikiSearchResult, year: number) => void;
};

function SearchSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          className="history-skeleton h-14 rounded-xl"
          aria-hidden
        />
      ))}
    </div>
  );
}

export function HistoryWikipediaSearch({
  onAddEvent,
}: HistoryWikipediaSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WikiSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<WikiSearchResult | null>(null);
  const [year, setYear] = useState("");

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      setError(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(
          `/api/wikipedia/search?q=${encodeURIComponent(query)}`,
        );
        const data = await res.json();
        if (!res.ok) {
          setResults([]);
          setError(true);
          setSearched(true);
          return;
        }
        setResults(data.results ?? []);
        setSearched(true);
      } catch {
        setResults([]);
        setError(true);
        setSearched(true);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  function handleSelectResult(result: WikiSearchResult) {
    setSelected(result);
    setYear("");
  }

  function handleAdd() {
    if (!selected) return;
    const parsedYear = parseInt(year, 10);
    if (Number.isNaN(parsedYear) || parsedYear < 1 || parsedYear > 2100) return;

    onAddEvent(selected, parsedYear);
    setSelected(null);
    setQuery("");
    setResults([]);
    setSearched(false);
    setYear("");
  }

  const yearValid =
    year.trim() !== "" &&
    !Number.isNaN(parseInt(year, 10)) &&
    parseInt(year, 10) >= 1 &&
    parseInt(year, 10) <= 2100;

  return (
    <section className="history-glass-card rounded-3xl p-6 sm:p-8">
      <h2 className="text-lg font-bold text-[var(--history-ink)]">
        Add from Wikipedia
      </h2>
      <p className="mt-1 text-sm text-[var(--history-muted)]">
        Search for a topic, pick a result, and place it on the timeline.
      </p>

      <div className="mt-4">
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
          }}
          placeholder="Search Wikipedia…"
          className="history-input w-full"
          aria-label="Search Wikipedia"
        />
      </div>

      {loading ? <div className="mt-4"><SearchSkeleton /></div> : null}

      {error ? (
        <p className="mt-4 text-sm text-red-600">
          Search failed. Please try again.
        </p>
      ) : null}

      {searched && !loading && !error && results.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--history-muted)]">
          No articles found for &ldquo;{query}&rdquo;.
        </p>
      ) : null}

      {!loading && results.length > 0 && !selected ? (
        <ul className="mt-4 flex flex-col gap-2" role="listbox">
          {results.map((result) => (
            <li key={result.pageId}>
              <button
                type="button"
                onClick={() => handleSelectResult(result)}
                className="w-full rounded-xl border border-[var(--history-border)] bg-white px-4 py-3 text-left transition hover:border-[var(--history-accent)] hover:bg-[var(--history-accent-soft)]"
                role="option"
              >
                <p className="font-semibold text-[var(--history-ink)]">
                  {result.title}
                </p>
                <p className="mt-0.5 line-clamp-2 text-sm text-[var(--history-muted)]">
                  {result.snippet}
                </p>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {selected ? (
        <div className="mt-4 rounded-2xl border border-[var(--history-accent)] bg-[var(--history-accent-soft)] p-4">
          <p className="font-semibold text-[var(--history-ink)]">
            {selected.title}
          </p>
          <p className="mt-1 text-sm text-[var(--history-muted)]">
            {selected.snippet}
          </p>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wide text-[var(--history-muted)]">
                Year
              </span>
              <input
                type="number"
                min={1}
                max={2100}
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="e.g. 1969"
                className="history-input w-32"
                aria-label="Event year"
              />
            </label>

            <button
              type="button"
              onClick={handleAdd}
              disabled={!yearValid}
              className="history-btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add to timeline
            </button>

            <button
              type="button"
              onClick={() => setSelected(null)}
              className="history-btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
