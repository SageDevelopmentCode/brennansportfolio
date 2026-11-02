"use client";

import { ShelterListingPhoto } from "@/components/shelter-listing-photo";
import { getWorkerQuip, WORKER_DISPLAY_NAME } from "@/lib/shelter-worker-lines";
import type { ShelterPet } from "@/lib/shelter";
import { useMemo } from "react";

type ShelterWorkerQuipProps = {
  pet: ShelterPet;
  available: boolean;
  onClose: () => void;
};

export function ShelterWorkerQuip({
  pet,
  available,
  onClose,
}: ShelterWorkerQuipProps) {
  const line = useMemo(
    () => getWorkerQuip(pet.name, available),
    [pet.name, available],
  );

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center px-4"
      role="dialog"
      aria-labelledby="shelter-quip-title"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[var(--shelter-ink)]/40"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="shelter-sus-panel relative z-10 w-full max-w-md p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-amber-700">
          {WORKER_DISPLAY_NAME} whispers
        </p>
        <div className="mt-4 flex items-start gap-3">
          <ShelterListingPhoto pet={pet} size="card" />
          <div>
            <h2
              id="shelter-quip-title"
              className="text-xl font-extrabold text-[var(--shelter-ink)]"
            >
              {pet.name}
            </h2>
            <p className="text-sm font-medium text-[var(--shelter-muted)]">
              {available ? "Still in the building" : "Already adopted"}
            </p>
          </div>
        </div>
        <p className="mt-4 text-base leading-relaxed text-[var(--shelter-ink)]">
          &ldquo;{line}&rdquo;
        </p>
        <button
          type="button"
          onClick={onClose}
          className="shelter-btn-primary mt-8 w-full"
        >
          Back to floor
        </button>
      </div>
    </div>
  );
}
