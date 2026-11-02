"use client";

import {
  GymCheckInChildrenFields,
  isChildDraftComplete,
  isChildDraftEmpty,
  type GymCheckInChildDraft,
} from "@/components/gym-check-in-children-fields";
import {
  getGymCheckIn,
  submitGymCheckIn,
  type GymCheckInChildInput,
  type GymCheckInRequest,
} from "@/lib/gym";
import { createClient } from "@/lib/supabase/client";
import { useState, type ReactNode } from "react";

type GymCheckInFormProps = {
  title: string;
  description: string;
  submitLabel: string;
  submittingLabel?: string;
  onSubmitted: (request: GymCheckInRequest) => void;
  footer?: ReactNode;
};

export function GymCheckInForm({
  title,
  description,
  submitLabel,
  submittingLabel = "Sending to owner…",
  onSubmitted,
  footer,
}: GymCheckInFormProps) {
  const [familyName, setFamilyName] = useState("");
  const [memberSummary, setMemberSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [children, setChildren] = useState<GymCheckInChildDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const childRows = children.filter((child) => !isChildDraftEmpty(child));
    for (const child of childRows) {
      if (!isChildDraftComplete(child)) {
        setError("Finish every child row or remove it.");
        setSubmitting(false);
        return;
      }
    }

    const childPayload: GymCheckInChildInput[] = childRows.map((child) => ({
      name: child.name.trim(),
      age: Number(child.age),
      height: child.height.trim(),
      size: child.size.trim(),
      favoriteFood: child.favoriteFood.trim(),
    }));

    try {
      const supabase = createClient();
      const result = await submitGymCheckIn(
        supabase,
        familyName,
        memberSummary,
        notes,
        childPayload,
      );

      if (!result.ok) {
        if (result.code === "invalid_family") {
          setError("Need a family name.");
        } else if (result.code === "invalid_members") {
          setError("Who is working out? (e.g. Mom + 2 kids)");
        } else if (result.code === "invalid_child") {
          setError("Check each child — name, age, height, size, and favorite food.");
        } else {
          setError("Could not submit. Run the gym migration and try again.");
        }
        return;
      }

      const row = await getGymCheckIn(supabase, result.requestId);
      if (!row) {
        setError("Submitted but could not load request.");
        return;
      }

      onSubmitted(row);
      setFamilyName("");
      setMemberSummary("");
      setNotes("");
      setChildren([]);
    } catch {
      setError("Something went wrong. Check Supabase and refresh.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="gym-glass-card rounded-2xl p-5 sm:p-6">
      <h2 className="font-[family-name:var(--font-gym-display)] text-lg font-bold uppercase tracking-tight text-[var(--gym-ink)]">
        {title}
      </h2>
      <p className="mt-1 text-sm text-[var(--gym-muted)]">{description}</p>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--gym-ink)]">
          Family name
          <input
            className="gym-input"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            placeholder="The Martinez family"
            required
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--gym-ink)]">
          Who wants in?
          <input
            className="gym-input"
            value={memberSummary}
            onChange={(e) => setMemberSummary(e.target.value)}
            placeholder="Mom, Dad, and one kid who will only use the vending machine"
            required
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--gym-ink)]">
          Notes (optional)
          <textarea
            className="gym-input min-h-[72px] resize-y"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Guest pass? Birthday workout?"
          />
        </label>

        <GymCheckInChildrenFields children={children} onChange={setChildren} />

        {error && (
          <p className="rounded-xl bg-[var(--gym-danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--gym-danger)]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="gym-btn-primary mt-1"
        >
          {submitting ? submittingLabel : submitLabel}
        </button>
      </form>

      {footer}
    </div>
  );
}
