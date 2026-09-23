"use client";

import { EditBookDialog } from "@/components/edit-book-dialog";
import { createClient } from "@/lib/supabase/client";
import { getRankStyle, scoreToStars, type Book } from "@/lib/books";
import { useState } from "react";

type BookListProps = {
  books: Book[];
  isLoggedIn: boolean;
  onBookUpdated?: (book: Book) => void;
  onBookDeleted?: (id: string) => void;
};

function StarRating({ score }: { score: number | null }) {
  const filled = score !== null ? scoreToStars(score) : 0;

  return (
    <div
      className="flex gap-0.5"
      aria-label={score !== null ? `${score} out of 10` : "Unrated"}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={`text-base ${i < filled ? "text-amber-400" : "text-slate-200"}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export function BookList({
  books,
  isLoggedIn,
  onBookUpdated,
  onBookDeleted,
}: BookListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete(book: Book) {
    if (!window.confirm(`Delete "${book.name}"?`)) {
      return;
    }

    setDeleteError(null);
    setDeletingId(book.id);

    const supabase = createClient();
    const { error } = await supabase.from("books").delete().eq("id", book.id);

    setDeletingId(null);

    if (error) {
      setDeleteError(error.message);
      return;
    }

    onBookDeleted?.(book.id);
  }

  if (books.length === 0) {
    return (
      <div className="animate-leaderboard-slide-in flex w-full flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-indigo-200 bg-white px-8 py-16 text-center shadow-sm">
        <span className="text-5xl">📖</span>
        <p className="text-xl font-bold text-[var(--books-ink)]">
          No books yet — add your first read!
        </p>
        <p className="max-w-xs text-sm text-[var(--books-muted)]">
          Log a book, give it a score, and climb the leaderboard.
        </p>
      </div>
    );
  }

  return (
    <>
      {deleteError && (
        <p
          className="w-full rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600"
          role="alert"
        >
          {deleteError}
        </p>
      )}

      <ul className="flex w-full flex-col gap-3">
        {books.map((book, index) => {
          const rank = index + 1;
          const { badge, border } = getRankStyle(rank);

          return (
            <li
              key={book.id}
              className={`animate-leaderboard-slide-in group flex flex-col gap-3 rounded-2xl border border-slate-200 border-l-4 p-4 shadow-sm transition hover:translate-x-2 hover:shadow-lg sm:flex-row sm:items-center sm:gap-4 sm:p-5 ${border} ${
                rank === 1 ? "leaderboard-rank-1" : "bg-white"
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-extrabold ${badge}`}
              >
                {rank === 1 ? "👑" : `#${rank}`}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="truncate text-lg font-bold text-[var(--books-ink)] sm:text-xl">
                  {book.name}
                </h3>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StarRating score={book.score} />
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      book.series
                        ? "bg-purple-100 text-purple-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {book.series ? "Series" : "Standalone"}
                  </span>
                  {book.pages !== null && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      {book.pages} pages
                    </span>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-4 sm:flex-col sm:items-end">
                {book.score !== null ? (
                  <div className="text-right">
                    <p
                      className={`text-5xl font-extrabold leading-none text-indigo-600 ${
                        rank === 1 ? "animate-score-glow" : ""
                      }`}
                    >
                      {book.score}
                    </p>
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--books-muted)]">
                      / 10
                    </p>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-[var(--books-muted)]">
                    Unrated
                  </p>
                )}

                {isLoggedIn && (
                  <div className="flex gap-2">
                    <EditBookDialog book={book} onBookUpdated={onBookUpdated} />
                    <button
                      type="button"
                      onClick={() => handleDelete(book)}
                      disabled={deletingId === book.id}
                      className="min-h-9 rounded-lg border-2 border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                    >
                      {deletingId === book.id ? "..." : "Delete"}
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
