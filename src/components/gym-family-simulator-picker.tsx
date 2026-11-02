"use client";

import { listSimulatableFamilies } from "@/lib/gym-teachers";
import type { GymCheckInRequest } from "@/lib/gym";
import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useState } from "react";

type GymFamilySimulatorPickerProps = {
  onSelectFamily: (request: GymCheckInRequest) => void;
  onNewCheckIn: () => void;
  onLobbyCode: () => void;
};

export function GymFamilySimulatorPicker({
  onSelectFamily,
  onNewCheckIn,
  onLobbyCode,
}: GymFamilySimulatorPickerProps) {
  const [families, setFamilies] = useState<GymCheckInRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const supabase = createClient();
      const rows = await listSimulatableFamilies(supabase);
      setFamilies(rows);
      setError(null);
    } catch {
      setError("Could not load families. Apply migrations and refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const supabase = createClient();
    const channel = supabase
      .channel("gym-family-sim")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gym_check_in_requests" },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return (
    <div className="gym-glass-card rounded-2xl p-5 sm:p-6">
      <h2 className="font-[family-name:var(--font-gym-display)] text-lg font-bold uppercase tracking-tight text-[var(--gym-ink)]">
        Family
      </h2>
      <p className="mt-1 text-sm text-[var(--gym-muted)]">
        Play as a family already in the system — or start a new check-in.
      </p>

      {error && (
        <p className="mt-4 rounded-xl bg-[var(--gym-danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--gym-danger)]">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-[var(--gym-muted)]">Loading families…</p>
      ) : families.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--gym-muted)]">
          No approved families yet. Check in at the desk or submit as a new family.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {families.map((family) => (
            <li key={family.id}>
              <button
                type="button"
                onClick={() => onSelectFamily(family)}
                className="gym-role-card w-full text-left"
              >
                <span className="font-bold text-[var(--gym-ink)]">
                  {family.familyName}
                </span>
                {family.familyCode && (
                  <span className="ml-2 font-mono text-sm text-[var(--gym-accent)]">
                    {family.familyCode}
                  </span>
                )}
                <p className="mt-1 text-sm text-[var(--gym-muted)]">
                  {family.memberSummary}
                  {family.children.length > 0 &&
                    ` · ${family.children.length} kid(s)`}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex flex-col gap-2 border-t border-[var(--gym-border)] pt-6">
        <button type="button" onClick={onLobbyCode} className="gym-btn-ghost w-full">
          Enter lobby code
        </button>
        <button type="button" onClick={onNewCheckIn} className="gym-btn-primary w-full">
          New family check-in
        </button>
      </div>
    </div>
  );
}
