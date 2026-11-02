"use client";

import { GymFamilyChildrenManager } from "@/components/gym-family-children-manager";
import type { GymCheckInChild } from "@/lib/gym";

type GymApprovedScreenProps = {
  requestId: string;
  familyName: string;
  familyCode: string;
  passNumber: string;
  lobbyCode?: string | null;
  children: GymCheckInChild[];
  onChildrenUpdated: (children: GymCheckInChild[]) => void;
  onDone: () => void;
};

export function GymApprovedScreen({
  requestId,
  familyName,
  familyCode,
  passNumber,
  lobbyCode,
  children,
  onChildrenUpdated,
  onDone,
}: GymApprovedScreenProps) {
  return (
    <div className="gym-glass-card rounded-3xl p-8 text-center">
      <p className="text-5xl" aria-hidden>
        ✅
      </p>
      <h2 className="mt-6 font-[family-name:var(--font-gym-display)] text-2xl font-bold uppercase tracking-tight text-[var(--gym-ink)]">
        You&apos;re in!
      </h2>
      <p className="mt-3 text-[var(--gym-muted)]">
        <strong>{familyName}</strong> is cleared for the gym floor. Butt Face
        reluctantly handed over a towel.
      </p>
      <p className="mt-6 font-mono text-3xl font-bold tracking-widest text-[var(--gym-accent)]">
        Your code: {familyCode}
      </p>
      <p className="mt-3 font-mono text-lg font-bold text-[var(--gym-muted)]">
        Day pass #{passNumber}
      </p>
      {lobbyCode && (
        <p className="mt-2 text-xs text-[var(--gym-muted)]">
          Lobby code was {lobbyCode}
        </p>
      )}

      <GymFamilyChildrenManager
        requestId={requestId}
        children={children}
        onChildrenUpdated={onChildrenUpdated}
      />

      <button type="button" onClick={onDone} className="gym-btn-primary mt-8">
        Back to lobby
      </button>
    </div>
  );
}
