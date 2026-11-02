"use client";

import {
  ShelterListingFormFields,
  SHELTER_LISTING_ERROR_MESSAGES,
  type ShelterListingFormValues,
} from "@/components/shelter-listing-form-fields";
import { addShelterListing, parseShelterImageUrl, type ShelterPet } from "@/lib/shelter";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

type ShelterAddListingFormProps = {
  onAdded: (pet: ShelterPet) => void;
};

const EMPTY_VALUES: ShelterListingFormValues = {
  name: "",
  type: "",
  description: "",
  emoji: "",
  imageUrl: "",
};

export function ShelterAddListingForm({ onAdded }: ShelterAddListingFormProps) {
  const [values, setValues] = useState<ShelterListingFormValues>(EMPTY_VALUES);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setValues(EMPTY_VALUES);
  };

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
      const result = await addShelterListing(supabase, {
        name: values.name.trim(),
        type: values.type.trim(),
        description: values.description.trim(),
        emoji: values.emoji.trim(),
        imageUrl: normalizedUrl,
      });

      if (result.ok) {
        onAdded(result.pet);
        resetForm();
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
    <form
      onSubmit={handleSubmit}
      className="shelter-glass-card shelter-add-form rounded-2xl p-5 sm:p-6"
    >
      <h2 className="text-lg font-extrabold text-[var(--shelter-ink)]">
        Add to the floor
      </h2>
      <p className="mt-1 text-sm text-[var(--shelter-muted)]">
        Paste a picture link from the web — works for people, pets, or anything
        else.
      </p>

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

      <button
        type="submit"
        disabled={submitting}
        className="shelter-btn-primary mt-5"
      >
        {submitting ? "Adding…" : "Add listing"}
      </button>
    </form>
  );
}
