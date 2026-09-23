"use client";

import { EventFormFields, type EventFormData } from "@/components/event-form-fields";
import { createClient } from "@/lib/supabase/client";
import type { Event } from "@/lib/events";
import { formatSupabaseError, validateEventDateTime } from "@/lib/events";
import { FormEvent, useRef, useState } from "react";

function eventToFormData(event: Event): EventFormData {
  return {
    name: event.name,
    theme: event.theme ?? "",
    location: event.location ?? "",
    description: event.description ?? "",
    date: event.date,
    time: event.time.slice(0, 5),
    host: event.host ?? "",
    foods: event.foods ?? "",
  };
}

export function EditEventDialog({
  event,
  onEventUpdated,
}: {
  event: Event;
  onEventUpdated?: (event: Event) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = `edit-event-title-${event.id}`;
  const descriptionId = `edit-event-description-${event.id}`;
  const [form, setForm] = useState<EventFormData>(() => eventToFormData(event));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openDialog() {
    setForm(eventToFormData(event));
    setError(null);
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  function handleBackdropClick(mouseEvent: React.MouseEvent<HTMLDialogElement>) {
    const dialog = dialogRef.current;
    if (dialog && mouseEvent.target === dialog) {
      closeDialog();
    }
  }

  function updateField<K extends keyof EventFormData>(
    field: K,
    value: EventFormData[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
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
    const { data, error: updateError } = await supabase
      .from("events")
      .update({
        name: form.name.trim(),
        theme: form.theme.trim() || null,
        location: form.location.trim() || null,
        description: form.description.trim() || null,
        date: form.date,
        time: form.time,
        host: form.host.trim() || null,
        foods: form.foods.trim() || null,
      })
      .eq("id", event.id)
      .select(
        "id, name, theme, location, description, date, time, host, foods, created_by, created_by_user_id",
      )
      .single();

    setLoading(false);

    if (updateError) {
      setError(formatSupabaseError(updateError));
      return;
    }

    closeDialog();
    onEventUpdated?.(data);
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="min-h-11 rounded-full border-2 border-accent-purple/30 bg-white/70 px-4 text-sm font-semibold text-accent-purple transition hover:bg-accent-purple/10"
      >
        Edit
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
              <p className="text-2xl" aria-hidden>✏️</p>
              <h2
                id={titleId}
                className="font-display text-2xl font-bold text-foreground"
              >
                Edit Event
              </h2>
              <p
                id={descriptionId}
                className="mt-1 text-sm text-foreground/60"
              >
                Update the details for this event.
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
            idPrefix={`edit-${event.id}`}
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
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
