"use client";

import { parseShelterImageUrl } from "@/lib/shelter";
import { useMemo } from "react";

export type ShelterListingFormValues = {
  name: string;
  type: string;
  description: string;
  emoji: string;
  imageUrl: string;
};

export const SHELTER_LISTING_ERROR_MESSAGES: Record<string, string> = {
  duplicate_name: "That name is already on the floor. Pick another.",
  not_found: "That listing is gone. Refresh and try again.",
  invalid_name: "Enter a name for the listing.",
  invalid_type: "Enter a type (Person, Dog, anything).",
  invalid_image: "Paste a working picture link that starts with https://",
  unknown: "Could not save listing. Try again.",
};

type ShelterListingFormFieldsProps = {
  values: ShelterListingFormValues;
  onChange: (patch: Partial<ShelterListingFormValues>) => void;
  onClearError?: () => void;
};

export function ShelterListingFormFields({
  values,
  onChange,
  onClearError,
}: ShelterListingFormFieldsProps) {
  const previewUrl = useMemo(
    () => parseShelterImageUrl(values.imageUrl),
    [values.imageUrl],
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block sm:col-span-2">
        <span className="text-sm font-semibold text-[var(--shelter-ink)]">
          Picture link
        </span>
        <input
          type="url"
          value={values.imageUrl}
          onChange={(e) => {
            onChange({ imageUrl: e.target.value });
            onClearError?.();
          }}
          className="shelter-input mt-2"
          placeholder="https://…"
          inputMode="url"
          autoComplete="off"
          required
        />
        <p className="mt-2 text-xs text-[var(--shelter-muted)]">
          Tip: right-click an image online → copy image address, then paste here.
        </p>
        {previewUrl && (
          <img
            src={previewUrl}
            alt="Preview"
            className="shelter-listing-photo shelter-listing-photo-preview mt-3"
          />
        )}
      </label>
      <label className="block sm:col-span-1">
        <span className="text-sm font-semibold text-[var(--shelter-ink)]">Name</span>
        <input
          type="text"
          value={values.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="shelter-input mt-2"
          placeholder="Who or what?"
          maxLength={80}
          required
        />
      </label>
      <label className="block sm:col-span-1">
        <span className="text-sm font-semibold text-[var(--shelter-ink)]">Type</span>
        <input
          type="text"
          value={values.type}
          onChange={(e) => onChange({ type: e.target.value })}
          className="shelter-input mt-2"
          placeholder="Person, Dog, Mystery box…"
          maxLength={80}
          required
        />
      </label>
      <label className="block sm:col-span-2">
        <span className="text-sm font-semibold text-[var(--shelter-ink)]">
          Description
        </span>
        <textarea
          value={values.description}
          onChange={(e) => onChange({ description: e.target.value })}
          className="shelter-input mt-2 min-h-[5rem] resize-y"
          placeholder="Short blurb for the card"
          maxLength={500}
        />
      </label>
      <label className="block sm:col-span-1">
        <span className="text-sm font-semibold text-[var(--shelter-ink)]">
          Emoji backup
        </span>
        <input
          type="text"
          value={values.emoji}
          onChange={(e) => onChange({ emoji: e.target.value })}
          className="shelter-input mt-2"
          placeholder="🐾 (if the link breaks)"
          maxLength={8}
        />
      </label>
    </div>
  );
}
