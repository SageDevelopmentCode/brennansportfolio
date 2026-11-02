"use client";

const EXAMPLE = "Hello! My name is Alex. Thank you please help.";

type SignAudioPanelProps = {
  text: string;
  onTextChange: (value: string) => void;
  speechSupported: boolean;
  speakAsYouType: boolean;
  onSpeakAsYouTypeChange: (enabled: boolean) => void;
  onReadAloud: () => void;
  onSing: () => void;
  bandOn: boolean;
  announcement: string;
};

export function SignAudioPanel({
  text,
  onTextChange,
  speechSupported,
  speakAsYouType,
  onSpeakAsYouTypeChange,
  onReadAloud,
  onSing,
  bandOn,
  announcement,
}: SignAudioPanelProps) {
  return (
    <div className="flex flex-col gap-8">
      <div
        className="sign-disclaimer rounded-2xl border border-[var(--sign-border)] bg-[var(--sign-accent-soft)] px-4 py-3 text-sm text-[var(--sign-ink)]"
        role="note"
      >
        <strong>Text to audio.</strong> Your browser reads what you type in English.
        Useful if you cannot see the screen well — but it is not the same as a human
        reader or screen reader app in every situation.
      </div>

      <div className="sign-glass-card flex flex-col gap-4 p-6 sm:p-8">
        <label className="flex flex-col gap-2 text-sm font-semibold text-[var(--sign-ink)]">
          Type what you want to hear
          <textarea
            className="sign-textarea min-h-36 w-full resize-y"
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="Type here…"
            spellCheck
          />
        </label>

        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="sign-btn-secondary"
            onClick={() => onTextChange(EXAMPLE)}
          >
            Try example
          </button>
          {speechSupported ? (
            <>
              <button
                type="button"
                className="sign-btn-primary"
                onClick={onReadAloud}
                disabled={!text.trim()}
              >
                Read aloud
              </button>
              <button
                type="button"
                className="sign-btn-secondary"
                onClick={onSing}
                disabled={!text.trim()}
              >
                Rock star
              </button>
              {bandOn ? (
                <p className="sign-band" role="status">
                  <span className="sign-band-bars" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                  Band is playing what you spelled
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-[var(--sign-warn)]">
              This browser can&apos;t read text aloud.
            </p>
          )}
          {speechSupported ? (
            <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--sign-muted)]">
              <input
                type="checkbox"
                checked={speakAsYouType}
                onChange={(e) => onSpeakAsYouTypeChange(e.target.checked)}
                className="size-4 accent-[var(--sign-accent)]"
              />
              Speak as I type
            </label>
          ) : null}
        </div>
      </div>
    </div>
  );
}
