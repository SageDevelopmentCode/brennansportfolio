"use client";

import {
  SIM_SPEED_MAX,
  SIM_SPEED_MIN,
  clampSimSpeed,
  type SimSpeed,
} from "@/lib/delivery-rush-difficulty";

type DeliverySimSpeedControlProps = {
  simSpeed: SimSpeed;
  gameOver: boolean;
  onSimSpeedChange: (speed: SimSpeed) => void;
};

export function DeliverySimSpeedControl({
  simSpeed,
  gameOver,
  onSimSpeedChange,
}: DeliverySimSpeedControlProps) {
  return (
    <div className="pointer-events-auto flex w-full flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-bold tracking-widest text-stone-600 uppercase">
          Sim speed
        </p>
        <p className="text-sm font-bold text-stone-900">{simSpeed}x</p>
      </div>
      <input
        type="range"
        min={SIM_SPEED_MIN}
        max={SIM_SPEED_MAX}
        step={1}
        value={simSpeed}
        disabled={gameOver}
        aria-label="Sim speed"
        aria-valuemin={SIM_SPEED_MIN}
        aria-valuemax={SIM_SPEED_MAX}
        aria-valuenow={simSpeed}
        onChange={(event) =>
          onSimSpeedChange(clampSimSpeed(Number(event.target.value)))
        }
        className="h-2 w-full cursor-pointer accent-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <div className="flex justify-between text-[9px] font-semibold text-stone-500">
        <span>{SIM_SPEED_MIN}x</span>
        <span>{SIM_SPEED_MAX}x</span>
      </div>
    </div>
  );
}
