"use client";

import { coverGradient, coverUrlForSize } from "@/lib/book-cover-utils";
import { useState } from "react";

type BookCoverProps = {
  title: string;
  coverUrl?: string | null;
  coverId?: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: "w-20",
  md: "w-28",
  lg: "w-44",
};

type CoverStage = "M" | "S" | "gradient";

function GeneratedCover({ title }: { title: string }) {
  return (
    <div
      className="library-generated-cover relative flex h-full w-full items-center justify-center p-2"
      style={{ background: coverGradient(title) }}
    >
      <div
        className="absolute left-0 top-0 h-full w-2 bg-black/20"
        aria-hidden
      />
      <p className="relative z-10 line-clamp-6 text-center text-xs font-bold leading-tight text-white drop-shadow-md sm:text-sm">
        {title}
      </p>
    </div>
  );
}

export function BookCover({
  title,
  coverUrl,
  coverId,
  size = "md",
  className = "",
}: BookCoverProps) {
  const widthClass = sizeClasses[size];
  const [stage, setStage] = useState<CoverStage>("M");

  if (!coverUrl && !coverId) {
    return (
      <div
        className={`library-book-cover-inner aspect-[2/3] ${widthClass} overflow-hidden rounded-md shadow-lg ${className}`}
      >
        <GeneratedCover title={title} />
      </div>
    );
  }

  const imageUrl =
    coverId && stage !== "gradient"
      ? coverUrlForSize(coverId, stage)
      : coverUrl ?? undefined;

  function handleError() {
    if (coverId && stage === "M") {
      setStage("S");
    } else {
      setStage("gradient");
    }
  }

  if (stage === "gradient" || !imageUrl) {
    return (
      <div
        className={`library-book-cover-inner aspect-[2/3] ${widthClass} overflow-hidden rounded-md shadow-lg ${className}`}
      >
        <GeneratedCover title={title} />
      </div>
    );
  }

  return (
    <div
      className={`library-book-cover-inner aspect-[2/3] ${widthClass} overflow-hidden rounded-md shadow-lg ${className}`}
      style={{ background: "#1a1035" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt=""
        className="h-full w-full object-contain"
        onError={handleError}
      />
    </div>
  );
}
