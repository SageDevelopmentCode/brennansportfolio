"use client";

import { BibleApiError, getBooks, type BibleBook } from "@/lib/bible";
import { BiblePreferences } from "@/components/bible-preferences";
import { useBibleSettings } from "@/components/use-bible-settings";
import { BibleAlert } from "@/components/bible-ui";
import Link from "next/link";
import { useEffect, useState } from "react";

function BookList({
  title,
  books,
  openSlug,
  onToggle,
}: {
  title: string;
  books: BibleBook[];
  openSlug: string | null;
  onToggle: (slug: string) => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-sans text-xs font-bold uppercase tracking-widest text-[var(--bible-accent)]">
        {title}
      </h2>
      <ul className="flex flex-col gap-3">
        {books.map((book) => {
          const open = openSlug === book.slug;
          return (
            <li
              key={book.slug}
              className="rounded-3xl border border-[var(--bible-border)] bg-[var(--bible-glass)] p-4"
            >
              <button
                type="button"
                aria-expanded={open}
                onClick={() => onToggle(book.slug)}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <span>
                  <span className="block text-xl font-bold">{book.name}</span>
                  <span className="mt-1 block font-sans text-xs capitalize text-[var(--bible-muted)]">
                    {book.abbrev} · {book.chapters}{" "}
                    {book.chapters === 1 ? "chapter" : "chapters"}
                    {book.category ? ` · ${book.category.replace(/-/g, " ")}` : ""}
                  </span>
                </span>
                <span className="font-sans text-sm font-semibold text-[var(--bible-accent)]">
                  {open ? "Hide" : "Chapters"}
                </span>
              </button>
              {open ? (
                <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-8">
                  {Array.from({ length: book.chapters }, (_, index) => {
                    const chapter = index + 1;
                    return (
                      <Link
                        key={chapter}
                        href={`/bible/read/${book.slug}/${chapter}`}
                        aria-label={`${book.name} chapter ${chapter}`}
                        className="flex h-11 items-center justify-center rounded-xl border border-[var(--bible-border)] bg-white font-sans text-sm font-semibold text-[var(--bible-ink)] hover:border-[var(--bible-accent)]"
                      >
                        {chapter}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function BibleBooks() {
  const { settings, ready, update } = useBibleSettings();
  const [bookState, setBookState] = useState<{
    key: number;
    books: BibleBook[];
    error: string | null;
  } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const key = reloadKey;
    getBooks()
      .then((list) => {
        if (!cancelled) setBookState({ key, books: list, error: null });
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setBookState({
          key,
          books: [],
          error: caught instanceof BibleApiError ? caught.message : "The books could not be loaded.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const books = bookState?.key === reloadKey ? bookState.books : [];
  const error = bookState?.key === reloadKey ? bookState.error : null;
  const loading = bookState?.key !== reloadKey;

  const oldBooks = books.filter((book) => book.testament === "old");
  const newBooks = books.filter((book) => book.testament === "new");

  return (
    <div className="flex w-full max-w-4xl flex-col gap-8">
      {ready ? <BiblePreferences settings={settings} onChange={update} /> : null}
      {loading ? <p className="text-[var(--bible-muted)]">Loading the books…</p> : null}
      {error ? (
        <div className="flex flex-col items-start gap-3">
          <BibleAlert>{error}</BibleAlert>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="rounded-full border border-[var(--bible-border)] bg-white px-4 py-2 font-sans text-sm font-semibold text-[var(--bible-accent)]"
          >
            Try again
          </button>
        </div>
      ) : null}
      {books.length > 0 ? (
        <div className="grid gap-8 lg:grid-cols-2">
          <BookList
            title="Old Testament"
            books={oldBooks}
            openSlug={openSlug}
            onToggle={(slug) => setOpenSlug((current) => (current === slug ? null : slug))}
          />
          <BookList
            title="New Testament"
            books={newBooks}
            openSlug={openSlug}
            onToggle={(slug) => setOpenSlug((current) => (current === slug ? null : slug))}
          />
        </div>
      ) : null}
    </div>
  );
}
