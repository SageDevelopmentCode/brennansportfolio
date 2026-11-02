"use client";

import {
  type FamilyCalendarEvent,
  type FamilyCalendarMember,
  allMemberIds,
  fetchFamilyCalendarEventById,
  isAllMembersSelected,
  parseLocalDateTime,
  syncEventMemberAssignments,
  toDateInputValue,
  toTimeInputValue,
  validateEventInput,
} from "@/lib/family-calendar";
import { createClient } from "@/lib/supabase/client";
import { FormEvent, useEffect, useRef, useState } from "react";

export type EventDialogDraft = {
  date: Date;
  startHour: number;
};

type FamilyCalendarEventDialogProps = {
  open: boolean;
  onClose: () => void;
  members: FamilyCalendarMember[];
  editingEvent: FamilyCalendarEvent | null;
  slotDraft: EventDialogDraft | null;
  onSaved: (event: FamilyCalendarEvent) => void;
  onDeleted: (eventId: string) => void;
};

export function FamilyCalendarEventDialog({
  open,
  onClose,
  members,
  editingEvent,
  slotDraft,
  onSaved,
  onDeleted,
}: FamilyCalendarEventDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      dialogRef.current?.close();
      return;
    }

    if (editingEvent) {
      const start = new Date(editingEvent.startsAt);
      const end = new Date(editingEvent.endsAt);
      setTitle(editingEvent.title);
      setDateStr(toDateInputValue(start));
      setStartTime(toTimeInputValue(start));
      setEndTime(toTimeInputValue(end));
      setSelectedMemberIds(editingEvent.memberIds);
      setNotes(editingEvent.notes ?? "");
    } else if (slotDraft) {
      const start = new Date(slotDraft.date);
      start.setHours(slotDraft.startHour, 0, 0, 0);
      const end = new Date(start);
      end.setHours(start.getHours() + 1);
      setTitle("");
      setDateStr(toDateInputValue(start));
      setStartTime(toTimeInputValue(start));
      setEndTime(toTimeInputValue(end));
      setSelectedMemberIds(members[0] ? [members[0].id] : []);
      setNotes("");
    } else {
      const now = new Date();
      const end = new Date(now);
      end.setHours(now.getHours() + 1);
      setTitle("");
      setDateStr(toDateInputValue(now));
      setStartTime(toTimeInputValue(now));
      setEndTime(toTimeInputValue(end));
      setSelectedMemberIds(members[0] ? [members[0].id] : []);
      setNotes("");
    }

    setError(null);
    dialogRef.current?.showModal();
  }, [open, editingEvent, slotDraft, members]);

  function handleBackdropClick(event: React.MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) {
      onClose();
    }
  }

  function toggleMember(memberId: string) {
    setSelectedMemberIds((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    );
  }

  function selectAllMembers() {
    setSelectedMemberIds(allMemberIds(members));
  }

  function clearMembers() {
    setSelectedMemberIds([]);
  }

  const allSelected = isAllMembersSelected(selectedMemberIds, members);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const validation = validateEventInput(title, dateStr, startTime, endTime);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }
    if (selectedMemberIds.length === 0) {
      setError("Pick at least one person (or tap All).");
      return;
    }

    const startsAt = parseLocalDateTime(dateStr, startTime);
    const endsAt = parseLocalDateTime(dateStr, endTime);

    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      setError("You must be logged in.");
      return;
    }

    const eventFields = {
      user_id: user.id,
      title: title.trim(),
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      notes: notes.trim() || null,
    };

    try {
      let eventId: string;

      if (editingEvent) {
        const { error: updateError } = await supabase
          .from("family_calendar_events")
          .update(eventFields)
          .eq("id", editingEvent.id);

        if (updateError) {
          setError(updateError.message);
          return;
        }
        eventId = editingEvent.id;
      } else {
        const { data, error: insertError } = await supabase
          .from("family_calendar_events")
          .insert(eventFields)
          .select("id")
          .single();

        if (insertError || !data) {
          setError(insertError?.message ?? "Could not create event.");
          return;
        }
        eventId = data.id;
      }

      await syncEventMemberAssignments(supabase, eventId, selectedMemberIds);

      const saved = await fetchFamilyCalendarEventById(supabase, eventId);
      if (!saved) {
        setError("Saved but could not reload event.");
        return;
      }

      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save event.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!editingEvent) return;
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("family_calendar_events")
      .delete()
      .eq("id", editingEvent.id);

    setLoading(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    onDeleted(editingEvent.id);
    onClose();
  }

  const isEdit = Boolean(editingEvent);

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      onClose={onClose}
      className="fcal-dialog w-[min(100%,28rem)] p-0"
    >
      <form onSubmit={handleSubmit} className="fcal-dialog-inner flex flex-col gap-4">
        <div className="fcal-dialog-stripe" aria-hidden />
        <div className="flex flex-col gap-4 p-6">
          <div>
            <h2 className="text-xl font-extrabold text-[var(--fcal-ink)]">
              {isEdit ? "✏️ Tweak the plan" : "🚀 Launch a new plan!"}
            </h2>
            <p className="mt-1 text-sm font-semibold text-[var(--fcal-muted)]">
              Pick everyone who&apos;s in — tap All for the whole crew.
            </p>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-[var(--fcal-ink)]">Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="fcal-input"
              placeholder="Soccer practice"
              maxLength={120}
              required
            />
          </label>

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold text-[var(--fcal-ink)]">
                Who&apos;s it for?
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllMembers}
                  className={`rounded-full px-3 py-1 text-xs font-extrabold ring-2 transition ${
                    allSelected
                      ? "bg-[var(--fcal-accent)] text-white ring-[var(--fcal-accent)]"
                      : "bg-white text-[var(--fcal-ink)] ring-[var(--fcal-border)] hover:ring-[var(--fcal-accent)]"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={clearMembers}
                  className="text-xs font-bold text-[var(--fcal-muted)] hover:text-[var(--fcal-accent)] hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {members.map((member) => {
                const selected = selectedMemberIds.includes(member.id);
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => toggleMember(member.id)}
                    className={`rounded-full border-2 px-3 py-1.5 text-sm font-extrabold transition ${
                      selected ? "text-[var(--fcal-ink)]" : "bg-white/80 text-[var(--fcal-muted)]"
                    }`}
                    style={{
                      borderColor: member.color,
                      backgroundColor: selected
                        ? `color-mix(in srgb, ${member.color} 28%, white)`
                        : undefined,
                      boxShadow: selected
                        ? `0 0 0 2px color-mix(in srgb, ${member.color} 35%, white)`
                        : undefined,
                    }}
                    aria-pressed={selected}
                  >
                    {member.name}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-[var(--fcal-ink)]">Date</span>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="fcal-input"
              required
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-[var(--fcal-ink)]">Starts</span>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="fcal-input"
                required
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-[var(--fcal-ink)]">Ends</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="fcal-input"
                required
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-[var(--fcal-ink)]">Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="fcal-input min-h-[4rem] resize-y"
              maxLength={500}
            />
          </label>

          {error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            {isEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="text-sm font-bold text-rose-600 hover:underline disabled:opacity-50"
              >
                Delete event
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="fcal-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="fcal-btn-primary disabled:opacity-60"
              >
                {loading ? "Saving…" : isEdit ? "Save changes" : "Add event"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </dialog>
  );
}
