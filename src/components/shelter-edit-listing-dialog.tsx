"use client";

import {
  ShelterListingFormFields,
  SHELTER_LISTING_ERROR_MESSAGES,
  type ShelterListingFormValues,
} from "@/components/shelter-listing-form-fields";
import {
  parseShelterImageUrl,
  updateShelterListing,
  type ShelterPet,
} from "@/lib/shelter";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

type ShelterEditListingDialogProps = {
  pet: ShelterPet | null;
  open: boolean;
  onClose: () => void;
  onUpdated: (pet: ShelterPet) => void;
};

function valuesFromPet(pet: ShelterPet): ShelterListingFormValues {
  return {
    name: pet.name,
    type: pet.species,
    description: pet.description,
    emoji: pet.emoji,
    imageUrl: pet.imageUrl ?? "",
  };
}

export function ShelterEditListingDialog({
  pet,
  open,
  onClose,
  onUpdated,
}: ShelterEditListingDialogProps) {
  const [values, setValues] = useState<ShelterListingFormValues>(() =>
    pet ? valuesFromPet(pet) : { name: "", type: "", description: "", emoji: "", imageUrl: "" },
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pet && open) {
      setValues(valuesFromPet(pet));
      setError(null);
    }
  }, [pet, open]);

  if (!open || !pet) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedUrl = parseShelterImageUrl(values.imageUrl);
    if (!normalizedUrl) {
      setError(SHELTER_LISTING_ERROR_MESSAGES.invalid_image);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const result = await updateShelterListing(supabase, {
        petId: pet.id,
        name: values.name.trim(),
        type: values.type.trim(),
        description: values.description.trim(),
        emoji: values.emoji.trim(),
        imageUrl: normalizedUrl,
      });

      if (result.ok) {
        onUpdated(result.pet);
        onClose();
        return;
      }

      setError(
        SHELTER_LISTING_ERROR_MESSAGES[result.code] ??
          SHELTER_LISTING_ERROR_MESSAGES.unknown,
      );
    } catch {
      setError("Something went wrong. Is the database migration applied?");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="shelter-edit-dialog-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="shelter-edit-dialog shelter-glass-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shelter-edit-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2
                id="shelter-edit-dialog-title"
                className="text-lg font-extrabold text-[var(--shelter-ink)]"
              >
                Edit listing
              </h2>
              <p className="mt-1 text-sm text-[var(--shelter-muted)]">
                Update {pet.name}&apos;s card. Availability stays the same.
              </p>
            </div>
            <button
              type="button"
              className="shelter-btn-ghost shrink-0 text-sm"
              onClick={onClose}
              aria-label="Close"
            >
              Close
            </button>
          </div>

          {error && (
            <p className="mt-4 rounded-xl bg-[var(--shelter-danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--shelter-danger)]">
              {error}
            </p>
          )}

          <div className="mt-4">
            <ShelterListingFormFields
              values={values}
              onChange={(patch) => setValues((prev) => ({ ...prev, ...patch }))}
              onClearError={() => setError(null)}
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="shelter-btn-primary"
            >
              {submitting ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              className="shelter-btn-ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
