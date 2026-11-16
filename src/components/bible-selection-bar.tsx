"use client";

import { fixNoteGrammar } from "@/lib/note-grammar";
import type { ScriptureSelection, SelectionAnchorRect } from "@/lib/bible-scripture-selection";
import { useEffect, useRef, useState } from "react";

type BibleSelectionBarProps = {
  rect: SelectionAnchorRect;
  selection: ScriptureSelection;
  highlightActive: boolean;
  onMemorize: () => void;
  onHighlight: () => void;
  onSaveNote: (body: string) => void;
  onDismiss: () => void;
  onNoteComposingChange: (open: boolean) => void;
};

export function BibleSelectionBar({
  rect,
  selection,
  highlightActive,
  onMemorize,
  onHighlight,
  onSaveNote,
  onDismiss,
  onNoteComposingChange,
}: BibleSelectionBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [grammarBusy, setGrammarBusy] = useState(false);
  const [grammarHint, setGrammarHint] = useState<string | null>(null);
  const [position, setPosition] = useState({ top: rect.top, left: rect.left });

  useEffect(() => {
    setNoteOpen(false);
    setNoteDraft("");
    setGrammarHint(null);
    onNoteComposingChange(false);
  }, [selection.quote, selection.verseStart, selection.charStart, onNoteComposingChange]);

  useEffect(() => {
    return () => onNoteComposingChange(false);
  }, [onNoteComposingChange]);

  useEffect(() => {
    function place() {
      const bar = barRef.current;
      const barHeight = bar?.offsetHeight ?? 44;
      const barWidth = bar?.offsetWidth ?? 280;
      const gap = 8;
      const margin = 8;
      let top = rect.top - barHeight - gap;
      if (top < margin) top = rect.bottom + gap;
      let left = rect.left + rect.width / 2 - barWidth / 2;
      left = Math.max(margin, Math.min(left, window.innerWidth - barWidth - margin));
      top = Math.max(margin, Math.min(top, window.innerHeight - barHeight - margin));
      setPosition({ top, left });
    }
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [rect, noteOpen]);

  function closeNoteEditor() {
    setNoteOpen(false);
    setGrammarHint(null);
    onNoteComposingChange(false);
  }

  async function runGrammarFix(updateDraft: boolean): Promise<string | null> {
    const trimmed = noteDraft.trim();
    if (!trimmed) return null;
    setGrammarBusy(true);
    setGrammarHint(null);
    const result = await fixNoteGrammar(trimmed);
    setGrammarBusy(false);
    if (!result.ok) {
      setGrammarHint(result.error);
      return updateDraft ? null : trimmed;
    }
    if (updateDraft) {
      setNoteDraft(result.text);
      setGrammarHint(
        result.changes > 0
          ? `Fixed ${result.changes} grammar ${result.changes === 1 ? "issue" : "issues"}.`
          : "No grammar issues found.",
      );
      return null;
    }
    if (result.changes > 0) {
      setGrammarHint(`Fixed ${result.changes} grammar ${result.changes === 1 ? "issue" : "issues"} before saving.`);
    }
    return result.text;
  }

  async function saveNote() {
    const trimmed = noteDraft.trim();
    if (!trimmed || grammarBusy) return;
    setGrammarBusy(true);
    setGrammarHint(null);
    const result = await fixNoteGrammar(trimmed);
    setGrammarBusy(false);
    const toSave = result.ok ? result.text : trimmed;
    if (!result.ok) {
      setGrammarHint(`${result.error} Saved your original wording.`);
    } else if (result.changes > 0) {
      setGrammarHint(`Fixed ${result.changes} grammar ${result.changes === 1 ? "issue" : "issues"} before saving.`);
    }
    onSaveNote(toSave);
    setNoteDraft("");
    closeNoteEditor();
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (noteOpen) {
          closeNoteEditor();
        } else {
          onDismiss();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [noteOpen, onDismiss]);

  function handlePointerDown(event: React.MouseEvent) {
    if (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement) {
      return;
    }
    const target = event.target;
    if (target instanceof Element && target.closest("[data-add-note]")) {
      return;
    }
    event.preventDefault();
  }

  return (
    <div
      ref={barRef}
      role="toolbar"
      aria-label="Verse actions"
      style={{ top: position.top, left: position.left }}
      className="fixed z-[60] w-[min(320px,calc(100vw-16px))] rounded-2xl border border-[var(--bible-border)] bg-[var(--bible-glass)] p-2 shadow-lg backdrop-blur-sm"
      onMouseDown={handlePointerDown}
    >
      {noteOpen ? (
        <div className="flex flex-col gap-2 p-1">
          <p className="font-sans text-xs text-[var(--bible-muted)] line-clamp-2">&ldquo;{selection.quote}&rdquo;</p>
          <textarea
            value={noteDraft}
            onChange={(event) => {
              setNoteDraft(event.target.value);
              setGrammarHint(null);
            }}
            rows={3}
            placeholder="Your note…"
            spellCheck
            className="w-full resize-y rounded-xl border border-[var(--bible-border)] bg-white px-3 py-2 font-sans text-sm text-[var(--bible-ink)]"
            autoFocus
          />
          {grammarHint ? (
            <p className="font-sans text-xs text-[var(--bible-muted)]" role="status">
              {grammarHint}
            </p>
          ) : (
            <p className="font-sans text-xs text-[var(--bible-muted)]">
              Grammar is checked when you save; tap Fix grammar to preview.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={grammarBusy || !noteDraft.trim()}
              onClick={() => void saveNote()}
              className="rounded-full bg-[var(--bible-accent)] px-4 py-2 font-sans text-sm font-semibold text-white disabled:opacity-50"
            >
              {grammarBusy ? "Checking…" : "Save note"}
            </button>
            <button
              type="button"
              disabled={grammarBusy || !noteDraft.trim()}
              onClick={() => void runGrammarFix(true)}
              className="rounded-full border border-[var(--bible-border)] bg-white px-4 py-2 font-sans text-sm font-semibold disabled:opacity-50"
            >
              Fix grammar
            </button>
            <button
              type="button"
              disabled={grammarBusy}
              onClick={closeNoteEditor}
              className="rounded-full border border-[var(--bible-border)] bg-white px-4 py-2 font-sans text-sm font-semibold disabled:opacity-50"
            >
              Back
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={onMemorize}
            className="rounded-full bg-[var(--bible-accent)] px-4 py-2 font-sans text-sm font-semibold text-white"
          >
            Memorize
          </button>
          <button
            type="button"
            onClick={onHighlight}
            className={`rounded-full border px-4 py-2 font-sans text-sm font-semibold ${
              highlightActive
                ? "border-[var(--bible-accent)] bg-[var(--bible-accent-soft)] text-[var(--bible-accent)]"
                : "border-[var(--bible-border)] bg-white text-[var(--bible-ink)]"
            }`}
          >
            {highlightActive ? "Unhighlight" : "Highlight"}
          </button>
          <button
            type="button"
            data-add-note
            onMouseDownCapture={() => onNoteComposingChange(true)}
            onClick={() => setNoteOpen(true)}
            className="rounded-full border border-[var(--bible-border)] bg-white px-4 py-2 font-sans text-sm font-semibold text-[var(--bible-ink)]"
          >
            Add note
          </button>
        </div>
      )}
    </div>
  );
}
