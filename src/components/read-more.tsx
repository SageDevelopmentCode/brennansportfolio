"use client";

import { useState } from "react";

type ReadMoreProps = {
  text: string;
  maxLength?: number;
};

export function ReadMore({ text, maxLength = 320 }: ReadMoreProps) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncation = text.length > maxLength;

  if (!needsTruncation) {
    return <p className="leading-relaxed text-[var(--library-ink)]">{text}</p>;
  }

  return (
    <div>
      <p className="leading-relaxed text-[var(--library-ink)]">
        {expanded ? text : `${text.slice(0, maxLength).trim()}…`}
      </p>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="mt-2 text-sm font-semibold text-[var(--library-accent)] hover:underline"
      >
        {expanded ? "Show less" : "Read more"}
      </button>
    </div>
  );
}
