"use client";

import {
  WORKER_DISPLAY_NAME,
  WORKER_TAGLINE,
} from "@/lib/shelter-worker-lines";

type ShelterWorkerBannerProps = {
  onSwitchRole: () => void;
};

export function ShelterWorkerBanner({ onSwitchRole }: ShelterWorkerBannerProps) {
  return (
    <div className="shelter-worker-banner flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="text-3xl" aria-hidden>🥸</span>
        <div>
          <p className="font-extrabold text-[var(--shelter-ink)]">
            Staff mode — {WORKER_DISPLAY_NAME}
          </p>
          <p className="text-sm text-[var(--shelter-muted)]">{WORKER_TAGLINE}</p>
        </div>
      </div>
      <button type="button" onClick={onSwitchRole} className="shelter-btn-ghost shrink-0 text-sm">
        Switch to visitor
      </button>
    </div>
  );
}
