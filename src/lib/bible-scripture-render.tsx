import type { ReactNode } from "react";
import type { VerseHighlightSlice } from "@/lib/bible-marks";

export function renderScriptureWithMarks(
  text: string,
  slices: VerseHighlightSlice[],
): ReactNode[] {
  if (slices.length === 0) return [text];

  const finite = slices.map((slice) => ({
    charStart: slice.charStart,
    charEnd: slice.charEnd === Infinity ? text.length : Math.min(slice.charEnd, text.length),
  }));

  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  for (const slice of finite) {
    const start = Math.max(0, Math.min(slice.charStart, text.length));
    const end = Math.max(start, Math.min(slice.charEnd, text.length));
    if (start > cursor) {
      nodes.push(text.slice(cursor, start));
    }
    if (end > start) {
      nodes.push(
        <mark key={`hl-${key++}`} className="rounded-sm bg-[var(--bible-highlight)]">
          {text.slice(start, end)}
        </mark>,
      );
    }
    cursor = Math.max(cursor, end);
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}
