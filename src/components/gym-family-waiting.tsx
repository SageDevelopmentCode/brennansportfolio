"use client";

import {
  findGymCheckInByLookup,
  getGymCheckIn,
  type GymCheckInRequest,
} from "@/lib/gym";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useRef, useState } from "react";

type GymFamilyWaitingProps = {
  request: GymCheckInRequest;
  onApproved: (request: GymCheckInRequest) => void;
  onDenied: () => void;
};

export function GymFamilyWaiting({
  request,
  onApproved,
  onDenied,
}: GymFamilyWaitingProps) {
  const onApprovedRef = useRef(onApproved);
  const onDeniedRef = useRef(onDenied);
  const decidedRef = useRef(false);
  onApprovedRef.current = onApproved;
  onDeniedRef.current = onDenied;

  useEffect(() => {
    const supabase = createClient();

    const handleDecision = async (status: string) => {
      if (decidedRef.current) return;
      if (status === "approved") {
        decidedRef.current = true;
        const row = await getGymCheckIn(supabase, request.id);
        if (row) onApprovedRef.current(row);
      } else if (status === "denied") {
        decidedRef.current = true;
        onDeniedRef.current();
      }
    };

    const checkStatus = async () => {
      const row = await getGymCheckIn(supabase, request.id);
      if (!row) return;
      handleDecision(row.status);
    };

    checkStatus();
    const pollInterval = window.setInterval(checkStatus, 2000);

    const channel = supabase
      .channel(`gym-request-${request.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "gym_check_in_requests",
          filter: `id=eq.${request.id}`,
        },
        (payload) => {
          const next = payload.new as {
            status?: string;
            family_name?: string;
          };
          if (next.status) {
            handleDecision(next.status);
          }
        },
      )
      .subscribe();

    return () => {
      window.clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [request.id]);

  return (
    <div className="gym-glass-card rounded-3xl p-8 text-center">
      <p className="text-5xl" aria-hidden>
        🏋️
      </p>
      <h2 className="mt-6 font-[family-name:var(--font-gym-display)] text-2xl font-bold uppercase tracking-tight text-[var(--gym-ink)]">
        Waiting on the owner…
      </h2>
      <p className="mt-3 text-[var(--gym-muted)]">
        <strong>{request.familyName}</strong> is in the lobby. Butt Face is
        pretending to look busy.
      </p>
      <p className="mt-6 animate-pulse text-sm font-bold uppercase tracking-widest text-[var(--gym-accent)]">
        Do not refresh
      </p>
    </div>
  );
}

type GymFamilyLookupProps = {
  onLinked: (request: GymCheckInRequest) => void;
  onNewFamily: () => void;
};

export function GymFamilyLookup({ onLinked, onNewFamily }: GymFamilyLookupProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const row = await findGymCheckInByLookup(supabase, code);
      if (!row) {
        setError("No check-in found. Ask the desk for your lobby code.");
        return;
      }
      onLinked(row);
    } catch {
      setError("Could not look up code. Check Supabase and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gym-glass-card rounded-2xl p-5 sm:p-6">
      <h2 className="font-[family-name:var(--font-gym-display)] text-lg font-bold uppercase tracking-tight text-[var(--gym-ink)]">
        Lobby screen
      </h2>
      <p className="mt-1 text-sm text-[var(--gym-muted)]">
        Enter the code from the front desk (one number and one letter, e.g. 7K).
      </p>
      <form onSubmit={handleLookup} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          className="gym-input flex-1"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. 7K"
          maxLength={2}
          inputMode="text"
          autoComplete="off"
          required
        />
        <button type="submit" disabled={loading} className="gym-btn-primary">
          {loading ? "Looking…" : "Watch my check-in"}
        </button>
      </form>
      {error && (
        <p className="mt-3 rounded-xl bg-[var(--gym-danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--gym-danger)]">
          {error}
        </p>
      )}

      <div className="mt-6 border-t border-[var(--gym-border)] pt-6">
        <p className="text-center text-sm text-[var(--gym-muted)]">
          First time here?
        </p>
        <button
          type="button"
          onClick={onNewFamily}
          className="gym-btn-primary mt-3 w-full"
        >
          We&apos;re new — ask to use the gym
        </button>
      </div>
    </div>
  );
}
