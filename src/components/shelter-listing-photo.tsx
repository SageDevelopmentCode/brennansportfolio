"use client";

import type { ShelterPet } from "@/lib/shelter";
import { useState } from "react";

type ShelterListingPhotoProps = {
  pet: ShelterPet;
  size?: "card" | "large";
  className?: string;
};

export function ShelterListingPhoto({
  pet,
  size = "card",
  className = "",
}: ShelterListingPhotoProps) {
  const [imageFailed, setImageFailed] = useState(false);

  const sizeClass =
    size === "large"
      ? "shelter-listing-photo-lg"
      : "shelter-listing-photo-card";

  const imageSrc = pet.imageUrl;
  const showImage = imageSrc && !imageFailed;

  if (showImage) {
    return (
      <img
        src={imageSrc}
        alt={`Photo of ${pet.name}`}
        className={`shelter-listing-photo ${sizeClass} ${className}`}
        onError={() => setImageFailed(true)}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center ${sizeClass} ${className}`}
      aria-hidden
    >
      <span className={size === "large" ? "text-5xl" : "text-4xl"}>
        {pet.emoji}
      </span>
    </span>
  );
}
