"use client";

import { BookList } from "@/components/book-list";
import { CreateBookDialog } from "@/components/create-book-dialog";
import { averageScore, getTopBook, type Book } from "@/lib/books";
import Link from "next/link";
import { useState } from "react";

type BooksPageClientProps = {
  initialBooks: Book[];
  currentUsername: string | null;
};

function sortBooks(books: Book[]) {
  return [...books].sort((a, b) => {
    if (a.score === null && b.score === null) {
      return a.name.localeCompare(b.name);
    }
    if (a.score === null) return 1;
    if (b.score === null) return -1;
    if (b.score !== a.score) return b.score - a.score;
    return a.name.localeCompare(b.name);
  });
}

export function BooksPageClient({
  initialBooks,
  currentUsername,
}: BooksPageClientProps) {
  const [books, setBooks] = useState<Book[]>(initialBooks);

  const avg = averageScore(books);
  const topBook = getTopBook(books);

  function handleBookCreated(book: Book) {
    setBooks((current) => sortBooks([...current, book]));
  }

  function handleBookUpdated(updated: Book) {
    setBooks((current) =>
      sortBooks(
        current.map((book) => (book.id === updated.id ? updated : book)),
      ),
    );
  }

  function handleBookDeleted(id: string) {
    setBooks((current) => current.filter((book) => book.id !== id));
  }

  return (
    <main className="books-leaderboard-bg relative flex flex-1 flex-col gap-10 px-4 py-8 sm:px-8 sm:py-12">
      <Link
        href="/"
        className="relative z-10 inline-flex w-fit items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-4 py-2 text-sm font-semibold text-indigo-600 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
      >
        ← All projects
      </Link>

      <header className="relative z-10 max-w-3xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-block rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-600">
              Reading leaderboard
            </span>
            <h1 className="mt-4 text-5xl font-extrabold leading-tight sm:text-6xl md:text-7xl">
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-500 bg-clip-text text-transparent">
                Book Shelf
              </span>
            </h1>
            <p className="mt-4 text-lg text-[var(--books-muted)]">
              Rate everything you read. Climb the ranks. Claim the crown.
            </p>
          </div>
          {topBook && (
            <span
              className="animate-trophy text-6xl drop-shadow-lg"
              aria-hidden
              title="Top rated"
            >
              🏆
            </span>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="books-stat-card rounded-2xl border-2 border-indigo-200 bg-white p-5 shadow-sm">
            <p className="text-3xl" aria-hidden>📚</p>
            <p className="mt-2 text-4xl font-extrabold text-indigo-600">
              {books.length}
            </p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[var(--books-muted)]">
              Books logged
            </p>
          </div>
          <div className="books-stat-card rounded-2xl border-2 border-amber-200 bg-white p-5 shadow-sm">
            <p className="text-3xl" aria-hidden>⭐</p>
            <p className="mt-2 text-4xl font-extrabold text-amber-500">
              {avg !== null ? avg : "—"}
            </p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[var(--books-muted)]">
              Avg score
            </p>
          </div>
          <div className="books-stat-card rounded-2xl border-2 border-rose-200 bg-white p-5 shadow-sm">
            <p className="text-3xl" aria-hidden>👑</p>
            {topBook ? (
              <>
                <p className="mt-2 truncate text-lg font-extrabold text-rose-600">
                  {topBook.name}
                </p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[var(--books-muted)]">
                  #1 · {topBook.score}/10
                </p>
              </>
            ) : (
              <>
                <p className="mt-2 text-4xl font-extrabold text-rose-300">—</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[var(--books-muted)]">
                  Champion
                </p>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="relative z-10 flex w-full max-w-3xl flex-col gap-8">
        {currentUsername ? (
          <CreateBookDialog onBookCreated={handleBookCreated} />
        ) : (
          <Link
            href="/login"
            className="inline-flex w-fit items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:scale-105 hover:shadow-xl"
          >
            Log in to add a book
          </Link>
        )}

        <section className="flex w-full flex-col gap-5 border-t-2 border-indigo-100 pt-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-3xl font-extrabold text-[var(--books-ink)]">
              The Rankings
            </h2>
            <span className="rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-1.5 text-sm font-bold text-white shadow-md shadow-amber-400/30">
              {books.length} {books.length === 1 ? "book" : "books"}
            </span>
          </div>
          <BookList
            books={books}
            isLoggedIn={currentUsername !== null}
            onBookUpdated={handleBookUpdated}
            onBookDeleted={handleBookDeleted}
          />
        </section>
      </div>
    </main>
  );
}
