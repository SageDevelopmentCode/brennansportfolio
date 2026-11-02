"use client";

import { ShelterListingPhoto } from "@/components/shelter-listing-photo";
import { getShelterAdoptionRequest, type ShelterPet } from "@/lib/shelter";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useRef } from "react";

type ShelterPendingScreenProps = {
  requestId: string;
  pet: ShelterPet;
  petName: string;
  onApproved: (petName: string) => void;
  onDenied: () => void;
};

export function ShelterPendingScreen({
  requestId,
  pet,
  petName,
  onApproved,
  onDenied,
}: ShelterPendingScreenProps) {
  const onApprovedRef = useRef(onApproved);
  const onDeniedRef = useRef(onDenied);
  const decidedRef = useRef(false);
  onApprovedRef.current = onApproved;
  onDeniedRef.current = onDenied;

  useEffect(() => {
    const supabase = createClient();

    const handleDecision = (status: string) => {
      if (decidedRef.current) return;
      if (status === "approved") {
        decidedRef.current = true;
        onApprovedRef.current(petName);
      } else if (status === "denied") {
        decidedRef.current = true;
        onDeniedRef.current();
      }
    };

    const checkStatus = async () => {
      const row = await getShelterAdoptionRequest(supabase, requestId);
      if (!row) return;
      handleDecision(row.status);
    };

    checkStatus();
    const pollInterval = window.setInterval(checkStatus, 2000);

    const channel = supabase
      .channel(`shelter-request-${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "shelter_adoption_requests",
          filter: `id=eq.${requestId}`,
        },
        (payload) => {
          const status = (payload.new as { status?: string }).status;
          if (status) handleDecision(status);
        },
      )
      .subscribe();

    return () => {
      window.clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [requestId, petName]);

  return (
    <div className="shelter-glass-card rounded-3xl p-8 text-center">
      <ShelterListingPhoto pet={pet} size="large" className="mx-auto" />
      <h2 className="mt-6 text-2xl font-extrabold text-[var(--shelter-ink)]">
        Waiting on Gary…
      </h2>
      <p className="mt-3 text-[var(--shelter-muted)]">
        Your waiver for <strong>{petName}</strong> is in the queue. A staff
        member is deciding your fate on another screen.
      </p>
      <p className="mt-6 animate-pulse text-sm font-bold uppercase tracking-widest text-[var(--shelter-accent)]">
        Do not refresh
      </p>
    </div>
  );
}
