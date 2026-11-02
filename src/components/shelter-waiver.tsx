"use client";

import { ShelterListingPhoto } from "@/components/shelter-listing-photo";
import { ShelterSignaturePad } from "@/components/shelter-signature-pad";
import type { ShelterPet } from "@/lib/shelter";
import { useState } from "react";

type ShelterWaiverProps = {
  pet: ShelterPet;
  submitting: boolean;
  onBack: () => void;
  onSubmit: (visitorName: string, signaturePng: string) => void;
};

export function ShelterWaiver({
  pet,
  submitting,
  onBack,
  onSubmit,
}: ShelterWaiverProps) {
  const [visitorName, setVisitorName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);

  const canSubmit =
    visitorName.trim().length > 0 && agreed && signature && !submitting;

  return (
    <div className="shelter-glass-card rounded-3xl p-6 sm:p-8">
      <button type="button" onClick={onBack} className="shelter-btn-ghost mb-4">
        ← Back
      </button>

      <div className="flex items-start gap-4">
        <ShelterListingPhoto pet={pet} size="large" />
        <div>
          <h2 className="text-2xl font-extrabold text-[var(--shelter-ink)]">
            Adoption waiver for {pet.name}
          </h2>
          <p className="mt-1 text-sm text-[var(--shelter-muted)]">
            Type: {pet.species} · Still in the shelter!
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3 text-sm leading-relaxed text-[var(--shelter-ink)]">
        <p>
          I promise to take good care of {pet.name}. I will not bring them back
          because they &quot;looked at me funny.&quot;
        </p>
        <p>
          I understand Gary (staff) must approve this after I sign — and denial
          may involve a pig. This is a pretend game; my signature is real (sort
          of).
        </p>
      </div>

      <label className="mt-6 block">
        <span className="text-sm font-semibold text-[var(--shelter-ink)]">
          Your name
        </span>
        <input
          type="text"
          value={visitorName}
          onChange={(e) => setVisitorName(e.target.value)}
          className="shelter-input mt-2"
          placeholder="Who is adopting?"
          autoComplete="name"
        />
      </label>

      <div className="mt-6">
        <ShelterSignaturePad onChange={setSignature} />
      </div>

      <label className="mt-6 flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1 h-5 w-5 rounded border-[var(--shelter-border)] accent-[var(--shelter-accent)]"
        />
        <span className="text-sm text-[var(--shelter-ink)]">
          I agree to the adoption waiver above.
        </span>
      </label>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => signature && onSubmit(visitorName.trim(), signature)}
        className="shelter-btn-primary mt-8 w-full sm:w-auto"
      >
        {submitting ? "Saving…" : "Sign & adopt"}
      </button>
    </div>
  );
}
