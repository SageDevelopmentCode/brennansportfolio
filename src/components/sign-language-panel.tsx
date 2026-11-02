"use client";

import { SignPlaybackPanel } from "@/components/sign-playback-panel";
import { dictionaryWordCount } from "@/lib/asl/dictionary";
import type { SignSequenceResult } from "@/lib/asl/types";

const EXAMPLE = "Hello! My name is Alex. Thank you please help.";

type SignLanguagePanelProps = {
  text: string;
  onTextChange: (value: string) => void;
  liveUpdate: boolean;
  onLiveUpdateChange: (enabled: boolean) => void;
  onShowSigns: () => void;
  sequence: SignSequenceResult;
};

export function SignLanguagePanel({
  text,
  onTextChange,
  liveUpdate,
  onLiveUpdateChange,
  onShowSigns,
  sequence,
}: SignLanguagePanelProps) {
  return (
    <div className="flex flex-col gap-8">
      <div
        className="sign-disclaimer rounded-2xl border border-[var(--sign-border)] bg-[var(--sign-accent-soft)] px-4 py-3 text-sm text-[var(--sign-ink)]"
        role="note"
      >
        <strong>Practice tool, not an interpreter.</strong> English typing is shown as
        word glosses plus fingerspelling — not full ASL grammar. About{" "}
        {dictionaryWordCount} common English words map to signs; everything else is
        spelled letter by letter.
      </div>

      <div className="sign-glass-card flex flex-col gap-4 p-6 sm:p-8">
        <label className="flex flex-col gap-2 text-sm font-semibold text-[var(--sign-ink)]">
          Type what you want to show in sign
          <textarea
            className="sign-textarea min-h-36 w-full resize-y"
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="Type here…"
            spellCheck
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          {!liveUpdate ? (
            <button type="button" className="sign-btn-primary" onClick={onShowSigns}>
              Show signs
            </button>
          ) : null}
          <button
            type="button"
            className="sign-btn-secondary"
            onClick={() => onTextChange(EXAMPLE)}
          >
            Try example
          </button>
          <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--sign-muted)]">
            <input
              type="checkbox"
              checked={liveUpdate}
              onChange={(e) => onLiveUpdateChange(e.target.checked)}
              className="size-4 accent-[var(--sign-accent)]"
            />
            Live update
          </label>
        </div>
      </div>

      <SignPlaybackPanel tokens={sequence.tokens} skippedChars={sequence.skippedChars} />
    </div>
  );
}
