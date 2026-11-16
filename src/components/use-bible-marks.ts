"use client";

import {
  getHighlightsServerSnapshot,
  getHighlightsSnapshot,
  getNotesServerSnapshot,
  getNotesSnapshot,
  subscribeHighlights,
  subscribeNotes,
  type BibleHighlight,
  type BibleNote,
} from "@/lib/bible-marks";
import { useSyncExternalStore } from "react";

export function useBibleHighlights(): BibleHighlight[] {
  return useSyncExternalStore(
    subscribeHighlights,
    getHighlightsSnapshot,
    getHighlightsServerSnapshot,
  );
}

export function useBibleNotes(): BibleNote[] {
  return useSyncExternalStore(subscribeNotes, getNotesSnapshot, getNotesServerSnapshot);
}
