"use client";

import { GymChildrenList } from "@/components/gym-children-list";
import {
  decideGymCheckIn,
  getGymCheckInRoster,
  getPendingGymCheckIns,
  type GymCheckInRequest,
} from "@/lib/gym";
import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useState } from "react";

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function familyCodeLabel(request: GymCheckInRequest): string {
  if (request.familyCode) return request.familyCode;
  if (request.status === "approved") return "Waiting…";
  return "—";
}

export function GymOwnerQueue() {
  const [requests, setRequests] = useState<GymCheckInRequest[]>([]);
  const [roster, setRoster] = useState<GymCheckInRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const supabase = createClient();
      const [pending, all] = await Promise.all([
        getPendingGymCheckIns(supabase),
        getGymCheckInRoster(supabase),
      ]);
      setRequests(pending);
      setRoster(all);
      setError(null);
    } catch {
      setError("Could not load the queue. Apply the gym migrations and refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const supabase = createClient();

    const channel = supabase
      .channel("gym-check-in-queue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gym_check_in_requests" },
        () => {
          refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  const handleDecide = async (request: GymCheckInRequest, approve: boolean) => {
    setActingId(request.id);
    setError(null);
    try {
      const supabase = createClient();
      const result = await decideGymCheckIn(supabase, request.id, approve);
      if (!result.ok) {
        setError("That request was already handled. Refreshing…");
        await refresh();
        return;
      }
      await refresh();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="gym-glass-card rounded-2xl p-5 sm:p-6">
        <h2 className="font-[family-name:var(--font-gym-display)] text-lg font-bold uppercase tracking-tight text-[var(--gym-ink)]">
          Owner queue
        </h2>
        <p className="mt-1 text-sm text-[var(--gym-muted)]">
          Front desk sent these families. Accept lets them in. Deny sends Butt Face.
        </p>

        {error && (
          <p className="mt-4 rounded-xl bg-[var(--gym-danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--gym-danger)]">
            {error}
          </p>
        )}

        {loading ? (
          <p className="mt-4 text-sm text-[var(--gym-muted)]">Loading…</p>
        ) : requests.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--gym-muted)]">
            No pending check-ins. Tell the desk to send someone annoying.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-4">
            {requests.map((request) => (
              <li
                key={request.id}
                className="flex flex-col gap-3 rounded-xl border border-[var(--gym-border)] bg-[var(--gym-panel)] p-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[var(--gym-ink)]">
                    {request.familyName}
                    {request.lobbyCode && (
                      <span className="ml-2 font-mono text-sm font-bold text-[var(--gym-accent)]">
                        Lobby {request.lobbyCode}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-[var(--gym-muted)]">
                    {request.memberSummary}
                  </p>
                  <GymChildrenList children={request.children} />
                  {request.notes && (
                    <p className="mt-1 text-xs text-[var(--gym-muted)]">
                      Note: {request.notes}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={actingId === request.id}
                    onClick={() => handleDecide(request, true)}
                    className="gym-btn-primary text-sm"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={actingId === request.id}
                    onClick={() => handleDecide(request, false)}
                    className="gym-btn-deny text-sm"
                  >
                    Deny
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="gym-glass-card rounded-2xl p-5 sm:p-6">
        <h2 className="font-[family-name:var(--font-gym-display)] text-lg font-bold uppercase tracking-tight text-[var(--gym-ink)]">
          All families
        </h2>
        <p className="mt-1 text-sm text-[var(--gym-muted)]">
          Every check-in saved in the database — lobby codes, family codes, and
          details.
        </p>

        {loading ? (
          <p className="mt-4 text-sm text-[var(--gym-muted)]">Loading…</p>
        ) : roster.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--gym-muted)]">
            No families yet. The desk has not sent anyone.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {roster.map((row) => (
              <li
                key={row.id}
                className="rounded-xl border border-[var(--gym-border)] bg-[var(--gym-panel)] p-4 text-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-bold text-[var(--gym-ink)]">
                    {row.familyName}
                  </p>
                  <span className="rounded-full bg-[var(--gym-accent-soft)] px-2 py-0.5 text-xs font-bold uppercase text-[var(--gym-accent)]">
                    {row.status}
                  </span>
                </div>
                <p className="mt-1 text-[var(--gym-muted)]">{row.memberSummary}</p>
                <GymChildrenList children={row.children} compact />
                {row.notes && (
                  <p className="mt-1 text-xs text-[var(--gym-muted)]">
                    Note: {row.notes}
                  </p>
                )}
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
                  <div>
                    <dt className="font-semibold text-[var(--gym-muted)]">
                      Lobby
                    </dt>
                    <dd className="font-mono font-bold text-[var(--gym-ink)]">
                      {row.lobbyCode ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[var(--gym-muted)]">
                      Family code
                    </dt>
                    <dd className="font-mono font-bold text-[var(--gym-ink)]">
                      {familyCodeLabel(row)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[var(--gym-muted)]">
                      Checked in
                    </dt>
                    <dd className="text-[var(--gym-ink)]">
                      {formatWhen(row.createdAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[var(--gym-muted)]">
                      Decided
                    </dt>
                    <dd className="text-[var(--gym-ink)]">
                      {formatWhen(row.decidedAt)}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
