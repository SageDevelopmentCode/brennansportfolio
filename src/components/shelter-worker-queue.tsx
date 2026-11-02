"use client";

import { ShelterListingPhoto } from "@/components/shelter-listing-photo";
import {
  decideShelterAdoptionRequest,
  getPendingShelterRequests,
  type ShelterAdoptionRequest,
} from "@/lib/shelter";
import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useState } from "react";

type ShelterWorkerQueueProps = {
  onRequestDecided: (petId: string, approved: boolean) => void;
};

export function ShelterWorkerQueue({ onRequestDecided }: ShelterWorkerQueueProps) {
  const [requests, setRequests] = useState<ShelterAdoptionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const supabase = createClient();
      const rows = await getPendingShelterRequests(supabase);
      setRequests(rows);
    } catch {
      setError("Could not load the queue. Check migrations and refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const supabase = createClient();

    const channel = supabase
      .channel("shelter-adoption-queue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shelter_adoption_requests" },
        () => {
          refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  const handleDecide = async (request: ShelterAdoptionRequest, approve: boolean) => {
    setActingId(request.id);
    setError(null);
    try {
      const supabase = createClient();
      const result = await decideShelterAdoptionRequest(
        supabase,
        request.id,
        approve,
      );
      if (!result.ok) {
        setError("That request was already handled. Refreshing…");
        await refresh();
        return;
      }
      onRequestDecided(request.petId, approve);
      await refresh();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="shelter-glass-card rounded-2xl p-5 sm:p-6">
      <h2 className="text-lg font-extrabold text-[var(--shelter-ink)]">
        Adoption queue
      </h2>
      <p className="mt-1 text-sm text-[var(--shelter-muted)]">
        Their fate is in your hands. Deny releases the pig.
      </p>

      {error && (
        <p className="mt-4 rounded-xl bg-[var(--shelter-danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--shelter-danger)]">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-[var(--shelter-muted)]">Loading…</p>
      ) : requests.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--shelter-muted)]">
          No pending waivers. Stand by for customers.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {requests.map((request) => (
            <li
              key={request.id}
              className="flex flex-col gap-3 rounded-xl border border-[var(--shelter-border)] bg-white/60 p-4 sm:flex-row sm:items-center"
            >
              {request.pet && (
                <ShelterListingPhoto pet={request.pet} size="card" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[var(--shelter-ink)]">
                  {request.visitorName}
                </p>
                <p className="text-sm text-[var(--shelter-muted)]">
                  Wants: {request.pet?.name ?? "Unknown listing"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={actingId === request.id}
                  onClick={() => handleDecide(request, true)}
                  className="shelter-btn-primary text-sm"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={actingId === request.id}
                  onClick={() => handleDecide(request, false)}
                  className="shelter-btn-deny text-sm"
                >
                  Deny (release the pig)
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
