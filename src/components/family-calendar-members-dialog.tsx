"use client";

import type { FamilyCalendarMember } from "@/lib/family-calendar";
import { FAMILY_ROSTER_SIZE } from "@/lib/family-calendar";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useRef, useState } from "react";

type FamilyCalendarMembersDialogProps = {
  open: boolean;
  onClose: () => void;
  members: FamilyCalendarMember[];
  onMembersChange: (members: FamilyCalendarMember[]) => void;
};

export function FamilyCalendarMembersDialog({
  open,
  onClose,
  members,
  onMembersChange,
}: FamilyCalendarMembersDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      dialogRef.current?.close();
      return;
    }
    setError(null);
    dialogRef.current?.showModal();
  }, [open]);

  function handleBackdropClick(event: React.MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) {
      onClose();
    }
  }

  async function persistAllMemberNames() {
    for (const member of members) {
      const trimmed = member.name.trim();
      if (!trimmed) continue;
      await updateMember(member, { name: trimmed });
    }
  }

  async function handleDone() {
    await persistAllMemberNames();
    onClose();
  }

  async function updateMember(
    member: FamilyCalendarMember,
    patch: Partial<Pick<FamilyCalendarMember, "name" | "color">>,
  ) {
    setError(null);
    const supabase = createClient();
    const { data, error: updateError } = await supabase
      .from("family_calendar_members")
      .update({
        name: patch.name ?? member.name,
        color: patch.color ?? member.color,
      })
      .eq("id", member.id)
      .select("id, name, color, sort_order")
      .single();

    if (updateError || !data) {
      setError(updateError?.message ?? "Could not update member.");
      return;
    }

    onMembersChange(
      members.map((m) =>
        m.id === member.id
          ? {
              id: data.id,
              name: data.name,
              color: data.color,
              sortOrder: data.sort_order,
            }
          : m,
      ),
    );
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      onClose={onClose}
      className="fcal-dialog w-[min(100%,32rem)] p-0"
    >
      <div className="fcal-dialog-inner flex max-h-[min(90vh,36rem)] flex-col gap-4">
        <div className="fcal-dialog-stripe" aria-hidden />
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-6">
          <div>
            <h2 className="text-xl font-extrabold text-[var(--fcal-ink)]">
              👨‍👩‍👧 Your crew of {FAMILY_ROSTER_SIZE}
            </h2>
            <p className="mt-1 text-sm font-semibold text-[var(--fcal-muted)]">
              Six spots, no more, no less — rename and recolor each person.
            </p>
          </div>

          <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
            {members.map((member, index) => (
              <li
                key={member.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--fcal-border)] bg-[var(--fcal-surface)] p-3"
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-extrabold text-[var(--fcal-muted)] ring-2 ring-white"
                  aria-hidden
                >
                  {index + 1}
                </span>
                <input
                  type="color"
                  value={member.color}
                  onChange={(e) =>
                    updateMember(member, { color: e.target.value })
                  }
                  className="h-9 w-9 cursor-pointer rounded-lg border border-[var(--fcal-border)] bg-white"
                  aria-label={`Color for ${member.name}`}
                />
                <input
                  type="text"
                  value={member.name}
                  onChange={(e) =>
                    onMembersChange(
                      members.map((m) =>
                        m.id === member.id ? { ...m, name: e.target.value } : m,
                      ),
                    )
                  }
                  onBlur={(e) => {
                    const trimmed = e.target.value.trim();
                    if (!trimmed) return;
                    void updateMember(member, { name: trimmed });
                  }}
                  className="fcal-input min-w-[6rem] flex-1"
                  maxLength={40}
                />
              </li>
            ))}
          </ul>

          {error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void handleDone()}
              className="fcal-btn-secondary"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
