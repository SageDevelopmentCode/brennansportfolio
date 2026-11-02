"use client";

import { useEffect, useRef } from "react";
import { drawVehiclePreview } from "@/lib/hill-climb/draw";
import {
  computeEffectiveStats,
  maxLevelForPart,
  partDisplayLabel,
  standardPartsForVehicle,
  upgradeCost,
} from "@/lib/hill-climb/upgrades";
import { discountedCoinCost, VEHICLE_DIAMOND_UNLOCK } from "@/lib/hill-climb/meta";
import { getUpgradeLevel, upgradeLevelsForVehicle } from "@/lib/hill-climb/progress";
import { VEHICLES } from "@/lib/hill-climb/vehicles";
import type { HillClimbProgress } from "@/lib/hill-climb/types";

type HillClimbGarageProps = {
  progress: HillClimbProgress;
  onSelectVehicle: (id: string) => void;
  onBuyVehicle: (id: string, useDiamonds?: boolean) => void;
  onUpgrade: (vehicleId: string, partId: string) => void;
  onBack: () => void;
};

function VehiclePreview({
  vehicleId,
  progress,
}: {
  vehicleId: string;
  progress: HillClimbProgress;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
    const w = 280;
    const h = 120;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawVehiclePreview(ctx, vehicleId, upgradeLevelsForVehicle(progress, vehicleId), w, h);
  }, [vehicleId, progress]);
  return (
    <canvas
      ref={canvasRef}
      className="hill-climb-preview-canvas mx-auto block rounded-xl border-2 border-[var(--hill-border)]"
      aria-label="Vehicle preview"
    />
  );
}

export function HillClimbGarage({
  progress,
  onSelectVehicle,
  onBuyVehicle,
  onUpgrade,
  onBack,
}: HillClimbGarageProps) {
  const vehicleId = progress.selectedVehicleId;
  const vehicle = VEHICLES.find((v) => v.id === vehicleId) ?? VEHICLES[0];
  const parts = standardPartsForVehicle(vehicleId);
  const stats = computeEffectiveStats(vehicleId, progress);
  const owned = progress.ownedVehicles;

  return (
    <div className="hill-climb-glass mx-auto max-w-lg rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Garage</h2>
        <button type="button" className="hill-climb-btn-ghost text-sm" onClick={onBack}>
          Back
        </button>
      </div>
      <p className="mb-3 text-sm text-[var(--hill-muted)]">
        🪙 {progress.coins.toLocaleString()} · 💎 {progress.diamonds.toLocaleString()}
      </p>

      <VehiclePreview vehicleId={vehicleId} progress={progress} />
      <p className="mt-2 text-center text-sm font-bold">{vehicle.name}</p>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {VEHICLES.map((v) => {
          const isOwned = owned.includes(v.id);
          const selected = v.id === vehicleId;
          return (
            <button
              key={v.id}
              type="button"
              disabled={!isOwned}
              onClick={() => isOwned && onSelectVehicle(v.id)}
              className={`hill-climb-garage-card shrink-0 rounded-lg border px-3 py-2 text-left text-xs ${selected ? "border-[var(--hill-accent)] bg-[var(--hill-accent-soft)]" : "border-[var(--hill-border)]"} ${!isOwned ? "opacity-45" : ""}`}
            >
              <span className="font-semibold">{v.name}</span>
              {!isOwned && (
                <span className="mt-1 block text-[10px] text-[var(--hill-muted)]">
                  🔒 {v.unlockCost.toLocaleString()}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!progress.ownedVehicles.includes(vehicleId) && (
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            className="hill-climb-btn-primary w-full"
            disabled={progress.coins < vehicle.unlockCost}
            onClick={() => onBuyVehicle(vehicleId)}
          >
            Unlock {vehicle.name} — {vehicle.unlockCost.toLocaleString()} coins
          </button>
          {vehicleId === VEHICLE_DIAMOND_UNLOCK.vehicleId && (
            <button
              type="button"
              className="hill-climb-btn-ghost w-full text-sm"
              disabled={
                progress.diamonds < VEHICLE_DIAMOND_UNLOCK.diamondsRequired ||
                progress.coins <
                  discountedCoinCost(vehicle.unlockCost, VEHICLE_DIAMOND_UNLOCK.coinMultiplier)
              }
              onClick={() => onBuyVehicle(vehicleId, true)}
            >
              Or{" "}
              {discountedCoinCost(vehicle.unlockCost, VEHICLE_DIAMOND_UNLOCK.coinMultiplier).toLocaleString()}{" "}
              coins + {VEHICLE_DIAMOND_UNLOCK.diamondsRequired} 💎
            </button>
          )}
        </div>
      )}

      <p className="mt-4 text-xs text-[var(--hill-muted)]">
        Torque ×{stats.torque.toFixed(4)} · Grip {stats.grip.toFixed(2)} · Fuel{" "}
        {Math.round(stats.fuelCapacity)}
      </p>

      <h3 className="mb-2 mt-4 font-semibold">Upgrades</h3>
      <ul className="space-y-2">
        {parts.map((partId) => {
          const level = getUpgradeLevel(progress, vehicleId, partId);
          const max = maxLevelForPart(vehicleId, partId);
          if (max <= 0) return null;
          const cost = upgradeCost(partId, level + 1);
          return (
            <li
              key={partId}
              className="flex items-center justify-between gap-2 rounded-lg border border-[var(--hill-border)] px-3 py-2"
            >
              <span className="text-sm">
                {partDisplayLabel(partId)}{" "}
                <span className="hill-climb-level-pips">
                  {Array.from({ length: max }, (_, i) => (
                    <span key={i} className={i < level ? "hill-climb-pip-on" : "hill-climb-pip-off"} />
                  ))}
                </span>
              </span>
              {level >= max ? (
                <span className="text-xs font-semibold text-[var(--hill-muted)]">MAX</span>
              ) : (
                <button
                  type="button"
                  className="hill-climb-btn-primary text-xs"
                  disabled={progress.coins < cost}
                  onClick={() => onUpgrade(vehicleId, partId)}
                >
                  +1 ({cost.toLocaleString()})
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
