"use client";

import { useEffect, useRef } from "react";
import { drawStageThumbnail } from "@/lib/hill-climb/draw";
import { discountedCoinCost, STAGE_DIAMOND_DISCOUNT } from "@/lib/hill-climb/meta";
import { STAGES } from "@/lib/hill-climb/stages";
import type { HillClimbProgress, StageHazardKind } from "@/lib/hill-climb/types";

type HillClimbStageMapProps = {
  progress: HillClimbProgress;
  onSelect: (stageId: string) => void;
  onBuy: (stageId: string, useDiamondDiscount?: boolean) => void;
  onBack: () => void;
};

const HAZARD_TAGS: Record<StageHazardKind, string> = {
  logs: "Logs",
  ceiling: "Cave ceiling",
  lava: "Lava",
  asteroid: "Asteroids",
};

function StageThumb({ stageId }: { stageId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
    const w = 72;
    const h = 48;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawStageThumbnail(ctx, stageId, w, h);
  }, [stageId]);
  return (
    <canvas
      ref={canvasRef}
      className="hill-climb-stage-thumb shrink-0 rounded-md border border-[var(--hill-border)]"
      aria-hidden
    />
  );
}

export function HillClimbStageMap({ progress, onSelect, onBuy, onBack }: HillClimbStageMapProps) {
  return (
    <div className="hill-climb-glass mx-auto max-w-lg rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Stages</h2>
        <button type="button" className="hill-climb-btn-ghost text-sm" onClick={onBack}>
          Back
        </button>
      </div>
      <p className="mb-4 text-sm text-[var(--hill-muted)]">
        🪙 {progress.coins.toLocaleString()} · 💎 {progress.diamonds.toLocaleString()}
      </p>
      <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
        {STAGES.map((stage) => {
          const owned = progress.ownedStages.includes(stage.id);
          const selected = progress.selectedStageId === stage.id;
          const best = progress.bestDistanceM[stage.id];
          const hazardLabel =
            stage.hazards.length > 0
              ? stage.hazards.map((h) => HAZARD_TAGS[h]).join(" · ")
              : null;
          const diamondDeal =
            stage.id === STAGE_DIAMOND_DISCOUNT.stageId && stage.unlockCost > 0;
          const discountedCoins = discountedCoinCost(
            stage.unlockCost,
            STAGE_DIAMOND_DISCOUNT.coinMultiplier
          );
          return (
            <li
              key={stage.id}
              className={`flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2 ${selected ? "border-[var(--hill-accent)] bg-[var(--hill-accent-soft)]" : "border-[var(--hill-border)]"}`}
            >
              <StageThumb stageId={stage.id} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{stage.name}</p>
                <p className="text-xs text-[var(--hill-muted)]">{stage.description}</p>
                {hazardLabel && (
                  <p className="text-xs font-medium text-amber-800/90">Hazards: {hazardLabel}</p>
                )}
                {best != null && (
                  <p className="text-xs text-[var(--hill-accent)]">Best: {Math.floor(best)} m</p>
                )}
              </div>
              {owned ? (
                <button
                  type="button"
                  className="hill-climb-btn-primary text-sm"
                  onClick={() => onSelect(stage.id)}
                >
                  {selected ? "Selected" : "Select"}
                </button>
              ) : (
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    className="hill-climb-btn-primary text-sm"
                    onClick={() => onBuy(stage.id)}
                    disabled={progress.coins < stage.unlockCost}
                  >
                    {stage.unlockCost.toLocaleString()} 🪙
                  </button>
                  {diamondDeal && (
                    <button
                      type="button"
                      className="hill-climb-btn-ghost text-xs"
                      onClick={() => onBuy(stage.id, true)}
                      disabled={
                        progress.coins < discountedCoins ||
                        progress.diamonds < STAGE_DIAMOND_DISCOUNT.diamondsRequired
                      }
                    >
                      {discountedCoins.toLocaleString()} 🪙 + {STAGE_DIAMOND_DISCOUNT.diamondsRequired} 💎
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
