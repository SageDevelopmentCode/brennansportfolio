"use client";

import {
  BookFormFields,
  type BookFormData,
} from "@/components/book-form-fields";
import { createClient } from "@/lib/supabase/client";
import type { Book } from "@/lib/books";
import { FormEvent, useRef, useState } from "react";

const emptyForm: BookFormData = {
  name: "",
  score: "",
  pages: "",
  series: false,
};

function parseScore(value: string): number | null {
  if (!value.trim()) return null;
  const score = Number(value);
  if (Number.isNaN(score) || score < 0 || score > 10) return null;
  return score;
}

function parsePages(value: string): number | null {
  if (!value.trim()) return null;
  const pages = Number(value);
  if (Number.isNaN(pages) || pages < 1 || !Number.isInteger(pages)) return null;
  return pages;
}

export function CreateBookDialog({
  onBookCreated,
}: {
  onBookCreated?: (book: Book) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState<BookFormData>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openDialog() {
    setError(null);
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  function handleBackdropClick(event: React.MouseEvent<HTMLDialogElement>) {
    const dialog = dialogRef.current;
    if (dialog && event.target === dialog) {
      closeDialog();
    }
  }

  function updateField<K extends keyof BookFormData>(
    field: K,
    value: BookFormData[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("Book name is required.");
      return;
    }

    if (form.score.trim()) {
      const score = parseScore(form.score);
      if (score === null) {
        setError("Score must be between 0 and 10.");
        return;
      }
    }

    if (form.pages.trim()) {
      const pages = parsePages(form.pages);
      if (pages === null) {
        setError("Pages must be a whole number of at least 1.");
        return;
      }
    }

    setLoading(true);

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("books")
      .insert({
        name: form.name.trim(),
        score: parseScore(form.score),
        pages: parsePages(form.pages),
        series: form.series,
      })
      .select("id, name, score, pages, series")
      .single();

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setForm(emptyForm);
    closeDialog();
    onBookCreated?.(data);
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex w-fit items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:scale-105 hover:shadow-xl"
      >
        + Add Book
      </button>

      <dialog
        ref={dialogRef}
        onClick={handleBackdropClick}
        className="book-dialog p-0"
      >
        <form
          onSubmit={handleSubmit}
          className="flex max-h-[inherit] flex-col gap-4 overflow-y-auto overscroll-contain p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[var(--books-ink)]">
                Add a Book
              </h2>
              <p className="mt-1 text-sm text-[var(--books-muted)]">
                Log something you&apos;ve read and rate it.
              </p>
            </div>
            <button
              type="button"
              onClick={closeDialog}
              className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <BookFormFields
            form={form}
            onFieldChange={updateField}
            idPrefix="create"
          />

          {error && (
            <p
              className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600"
              role="alert"
            >
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeDialog}
              className="min-h-11 w-full rounded-xl border-2 border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="min-h-11 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 sm:w-auto"
            >
              {loading ? "Saving..." : "Save Book"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
