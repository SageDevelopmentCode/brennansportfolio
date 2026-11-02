"use client";

import dynamic from "next/dynamic";
import { resolvePoseIdForToken } from "@/lib/asl/hand-poses";
import type { SignTokenKind } from "@/lib/asl/types";

const SignHandScene = dynamic(() => import("@/components/sign-hand-scene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm font-semibold text-[var(--sign-muted)]">
      Loading 3D hand…
    </div>
  ),
});

type SignHandStageProps = {
  poseId: string;
  kind: SignTokenKind;
  gloss: string;
};

export function SignHandStage({ poseId, kind, gloss }: SignHandStageProps) {
  const resolved = resolvePoseIdForToken(poseId, kind);

  return (
    <div className="relative h-full w-full" aria-label={`3D hand showing ${gloss}`}>
      <SignHandScene poseId={resolved} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
