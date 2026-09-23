"use client";

import { useEffect } from "react";

type ChessHintBurstProps = {
  onComplete: () => void;
};

const BURST_DURATION_MS = 800;

export function ChessHintBurst({ onComplete }: ChessHintBurstProps) {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, BURST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="chess-hint-burst" role="presentation" aria-hidden>
      <div className="chess-hint-burst-backdrop" />
      <div className="chess-hint-burst-ring chess-hint-burst-ring-1" />
      <div className="chess-hint-burst-ring chess-hint-burst-ring-2" />
      <div className="chess-hint-burst-ring chess-hint-burst-ring-3" />
      <p className="chess-hint-burst-text">HINT!</p>
    </div>
  );
}
