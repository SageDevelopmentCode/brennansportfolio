"use client";

import { getGymCheckIn, submitGymFamilyCode } from "@/lib/gym";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

type GymFamilyCodeFormProps = {
  requestId: string;
  familyName: string;
  onSaved: (familyCode: string) => void;
};

export function GymFamilyCodeForm({
  requestId,
  familyName,
  onSaved,
}: GymFamilyCodeFormProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const result = await submitGymFamilyCode(supabase, requestId, code);

      if (!result.ok) {
        if (result.code === "invalid_format") {
          setError("Use one number and one letter (e.g. 4M).");
        } else if (result.code === "taken") {
          setError("That code is taken — try another.");
        } else if (result.code === "already_set") {
          const row = await getGymCheckIn(supabase, requestId);
          if (row?.familyCode) onSaved(row.familyCode);
          return;
        } else if (result.code === "not_approved") {
          setError("You are not approved yet. Keep waiting on the owner.");
        } else {
          setError("Could not save your code. Try again.");
        }
        return;
      }

      onSaved(result.familyCode);
    } catch {
      setError("Could not save your code. Check Supabase and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gym-glass-card rounded-3xl p-8 text-center">
      <p className="text-5xl" aria-hidden>
        🎫
      </p>
      <h2 className="mt-6 font-[family-name:var(--font-gym-display)] text-2xl font-bold uppercase tracking-tight text-[var(--gym-ink)]">
        Pick your family code
      </h2>
      <p className="mt-3 text-[var(--gym-muted)]">
        <strong>{familyName}</strong> is approved. Choose a code you will remember
        — one number and one letter (not the lobby code from the desk).
      </p>
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 sm:mx-auto sm:max-w-xs">
        <input
          className="gym-input text-center font-mono text-2xl font-bold uppercase tracking-widest"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. 4M"
          maxLength={2}
          inputMode="text"
          autoComplete="off"
          required
        />
        <button type="submit" disabled={loading} className="gym-btn-primary">
          {loading ? "Saving…" : "Save my code"}
        </button>
      </form>
      {error && (
        <p className="mt-4 rounded-xl bg-[var(--gym-danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--gym-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}
