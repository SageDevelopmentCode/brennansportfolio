"use client";

import {
  EventFormFields,
  type EventFormData,
} from "@/components/event-form-fields";
import { getCurrentUsername } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import type { Event } from "@/lib/events";
import { formatSupabaseError, validateEventDateTime } from "@/lib/events";
import { FormEvent, useRef, useState } from "react";

const emptyForm: EventFormData = {
  name: "",
  theme: "",
  location: "",
  description: "",
  date: "",
  time: "",
  host: "",
  foods: "",
};

export function CreateEventDialog({
  currentUsername,
  onEventCreated,
}: {
  currentUsername: string | null;
  onEventCreated?: (event: Event) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = "create-event-title";
  const descriptionId = "create-event-description";
  const [form, setForm] = useState<EventFormData>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openDialog() {
    setError(null);
    setForm({
      ...emptyForm,
      host: currentUsername ? `@${currentUsername}` : "",
    });
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

  function updateField<K extends keyof EventFormData>(
    field: K,
    value: EventFormData[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.date || !form.time) {
      setError("Name, date, and time are required.");
      return;
    }

    const dateError = validateEventDateTime(form.date, form.time);
    if (dateError) {
      setError(dateError);
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      setError("You must be logged in to create an event.");
      return;
    }

    const createdBy = await getCurrentUsername(supabase);
    if (!createdBy) {
      setLoading(false);
      setError("Your profile could not be found. Try logging out and back in.");
      return;
    }

    const { data, error: insertError } = await supabase
      .from("events")
      .insert({
        name: form.name.trim(),
        theme: form.theme.trim() || null,
        location: form.location.trim() || null,
        description: form.description.trim() || null,
        date: form.date,
        time: form.time,
        host: form.host.trim() || null,
        foods: form.foods.trim() || null,
        created_by: createdBy,
        created_by_user_id: user.id,
      })
      .select(
        "id, name, theme, location, description, date, time, host, foods, created_by, created_by_user_id",
      )
      .single();

    setLoading(false);

    if (insertError) {
      setError(formatSupabaseError(insertError));
      return;
    }

    setForm(emptyForm);
    closeDialog();
    onEventCreated?.(data);
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-accent-coral via-accent-purple to-accent-mint px-6 py-3 text-base font-semibold text-white shadow-lg shadow-accent-purple/30 transition hover:scale-105 hover:shadow-xl hover:shadow-accent-purple/40 active:scale-100"
      >
        <span className="text-lg transition group-hover:rotate-12" aria-hidden>
          ➕
        </span>
        Create Event
      </button>

      <dialog
        ref={dialogRef}
        onClick={handleBackdropClick}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="event-dialog rounded-3xl border-2 border-accent-purple/20 bg-white p-0 shadow-2xl shadow-accent-purple/20"
      >
        <form
          onSubmit={handleSubmit}
          className="flex max-h-[inherit] flex-col gap-4 overflow-y-auto overscroll-contain p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-2xl" aria-hidden>🎪</p>
              <h2
                id={titleId}
                className="font-display text-2xl font-bold text-foreground"
              >
                Plan Something Fun!
              </h2>
              <p
                id={descriptionId}
                className="mt-1 text-sm text-foreground/60"
              >
                Tell the neighborhood what&apos;s going on.
              </p>
            </div>
            <button
              type="button"
              onClick={closeDialog}
              className="rounded-full bg-foreground/5 px-2.5 py-1 text-sm text-foreground/60 transition hover:bg-foreground/10 hover:text-foreground"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <EventFormFields
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
              className="min-h-11 w-full rounded-full border-2 border-accent-purple/20 px-5 py-3 text-sm font-semibold text-foreground/70 transition hover:bg-accent-purple/5 sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="min-h-11 w-full rounded-full bg-gradient-to-r from-accent-coral to-accent-purple px-5 py-3 text-sm font-semibold text-white shadow-md shadow-accent-purple/25 transition hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 sm:w-auto"
            >
              {loading ? "Saving..." : "🚀 Save Event"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
