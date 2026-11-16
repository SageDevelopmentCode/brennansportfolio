"use client";

import {
  getBibleSettingsServerSnapshot,
  getBibleSettingsSnapshot,
  getMemoryVersesServerSnapshot,
  getMemoryVersesSnapshot,
  saveBibleSettings,
  subscribeBibleSettings,
  subscribeMemoryVerses,
  type BibleSettings,
  type MemoryVerse,
} from "@/lib/bible-memory";
import { useSyncExternalStore } from "react";

function subscribeHydration(): () => void {
  return () => {};
}

export function useHasHydrated(): boolean {
  return useSyncExternalStore(subscribeHydration, () => true, () => false);
}

export function useBibleSettings() {
  const settings = useSyncExternalStore(
    subscribeBibleSettings,
    getBibleSettingsSnapshot,
    getBibleSettingsServerSnapshot,
  );
  const ready = useHasHydrated();

  function update(patch: Partial<BibleSettings>) {
    saveBibleSettings({ ...getBibleSettingsSnapshot(), ...patch });
  }

  return { settings, ready, update };
}

export function useMemoryVerses(): MemoryVerse[] {
  return useSyncExternalStore(
    subscribeMemoryVerses,
    getMemoryVersesSnapshot,
    getMemoryVersesServerSnapshot,
  );
}
