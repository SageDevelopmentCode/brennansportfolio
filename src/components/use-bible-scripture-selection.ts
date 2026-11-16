"use client";

import {
  resolveScriptureSelection,
  type ScriptureSelection,
  type SelectionAnchorRect,
} from "@/lib/bible-scripture-selection";
import { useCallback, useEffect, useRef, useState } from "react";

export type LockedScriptureSelection = {
  selection: ScriptureSelection;
  rect: SelectionAnchorRect;
};

function isVerseActionsToolbar(node: Node | null): boolean {
  if (!(node instanceof Node)) return false;
  const el = node instanceof Element ? node : node.parentElement;
  return el?.closest('[role="toolbar"][aria-label="Verse actions"]') != null;
}

export function useBibleScriptureSelection(scriptureRoot: HTMLElement | null) {
  const [locked, setLocked] = useState<LockedScriptureSelection | null>(null);
  const noteComposing = useRef(false);

  const setNoteComposing = useCallback((open: boolean) => {
    noteComposing.current = open;
  }, []);

  const dismiss = useCallback(() => {
    setLocked(null);
    noteComposing.current = false;
  }, []);

  const lockFromDom = useCallback((root: HTMLElement) => {
    const resolved = resolveScriptureSelection(root);
    if (!resolved) {
      if (!noteComposing.current) setLocked(null);
      return;
    }
    setLocked(resolved);
  }, []);

  useEffect(() => {
    if (scriptureRoot === null) return;
    const root: HTMLElement = scriptureRoot;

    let debounce: ReturnType<typeof setTimeout> | undefined;

    function onSelectionChange() {
      const sel = window.getSelection();
      if (sel?.isCollapsed) {
        if (noteComposing.current) return;
        if (debounce) clearTimeout(debounce);
        debounce = setTimeout(() => {
          if (!noteComposing.current) setLocked(null);
        }, 50);
        return;
      }
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => lockFromDom(root), 50);
    }

    function onPointerUp(event: MouseEvent | TouchEvent) {
      const target = event.target;
      if (isVerseActionsToolbar(target instanceof Node ? target : null)) return;
      requestAnimationFrame(() => lockFromDom(root));
    }

    function onKeyUp(event: KeyboardEvent) {
      if (event.shiftKey || event.key.startsWith("Arrow")) {
        lockFromDom(root);
      }
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (isVerseActionsToolbar(target)) return;
      if (!root.contains(target)) {
        dismiss();
      }
    }

    root.addEventListener("mouseup", onPointerUp);
    root.addEventListener("touchend", onPointerUp);
    document.addEventListener("selectionchange", onSelectionChange);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      if (debounce) clearTimeout(debounce);
      root.removeEventListener("mouseup", onPointerUp);
      root.removeEventListener("touchend", onPointerUp);
      document.removeEventListener("selectionchange", onSelectionChange);
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [scriptureRoot, dismiss, lockFromDom]);

  return { locked, dismiss, setNoteComposing };
}
