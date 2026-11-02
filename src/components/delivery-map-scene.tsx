"use client";

import { DeliveryPackageQueue } from "@/components/delivery-package-queue";
import { DeliveryRushGameOver } from "@/components/delivery-rush-game-over";
import { DeliverySimSpeedControl } from "@/components/delivery-sim-speed-control";
import type { DeliveryCompanyState, DeliverySkateboard } from "@/lib/delivery";
import { MAX_UNDELIVERED, type DeliveryPackageBoard } from "@/lib/delivery-packages";
import { formatPrice } from "@/lib/delivery-mounts";
import { formatDifficultyLabel } from "@/lib/delivery-rush-difficulty";
import type { SimSpeed } from "@/lib/delivery-rush-difficulty";
import dynamic from "next/dynamic";

const DeliveryMapWorld = dynamic(
  () => import("@/components/delivery-map-world"),
  {
    ssr: false,
    loading: () => <div className="absolute inset-0 bg-sky-200" />,
  },
);

type DeliveryMapSceneProps = {
  company: DeliveryCompanyState;
  couriers: DeliverySkateboard[];
  depotCouriers: DeliverySkateboard[];
  board: DeliveryPackageBoard;
  gameOver: boolean;
  deliveredCount: number;
  earnFlashAmount: number;
  assignError: string | null;
  onAssign: (packageId: string, skateboardId: string) => void;
  autoAssignEnabled: boolean;
  onAutoAssignEnabledChange: (enabled: boolean) => void;
  simSpeed: SimSpeed;
  onSimSpeedChange: (speed: SimSpeed) => void;
  difficultyTier: number;
  simNowMs: number;
  onRestartRush: () => void;
  onOpenStore: () => void;
  onOpenHire: () => void;
};

export function DeliveryMapScene({
  company,
  couriers,
  depotCouriers,
  board,
  gameOver,
  deliveredCount,
  earnFlashAmount,
  assignError,
  onAssign,
  autoAssignEnabled,
  onAutoAssignEnabledChange,
  simSpeed,
  onSimSpeedChange,
  difficultyTier,
  simNowMs,
  onRestartRush,
  onOpenStore,
  onOpenHire,
}: DeliveryMapSceneProps) {
  const undelivered = board.pendingCount;

  return (
    <div className="relative aspect-[4/3] w-full max-w-[900px] overflow-hidden rounded-3xl border border-orange-300/40 bg-sky-200 shadow-inner">
      <DeliveryMapWorld
        depotCouriers={depotCouriers}
        pendingCount={board.pendingCount}
        onOpenStore={onOpenStore}
        onOpenHire={onOpenHire}
      />

      <div className="pointer-events-none absolute top-3 left-3 z-10 max-w-[46%] rounded-2xl border border-white/60 bg-white/85 px-3 py-2 shadow-sm backdrop-blur-sm sm:top-4 sm:left-4">
        <p className="text-[10px] font-bold tracking-widest text-orange-800/70 uppercase">
          Company cash
        </p>
        <p className="text-xl font-bold text-teal-700 sm:text-2xl">
          {formatPrice(company.balance)}
          {earnFlashAmount > 0 ? (
            <span className="ml-2 text-base font-bold text-emerald-600 animate-pulse sm:text-lg">
              +{formatPrice(earnFlashAmount)}
            </span>
          ) : null}
        </p>
        <p className="text-[11px] text-stone-600 sm:text-xs">
          {company.ownedMountIds.length} owned · {couriers.length} parked ·{" "}
          {board.inTransit.length} out
        </p>
        <p
          className={`mt-1 text-sm font-bold ${
            undelivered >= MAX_UNDELIVERED - 5
              ? "text-red-600"
              : undelivered > 0
                ? "text-orange-700"
                : "text-teal-700"
          }`}
        >
          Undelivered: {undelivered} / {MAX_UNDELIVERED}
        </p>
        {difficultyTier > 0 ? (
          <p className="mt-1 text-xs font-bold text-red-700">
            Rush: {formatDifficultyLabel(difficultyTier)}
          </p>
        ) : null}
        <div className="pointer-events-auto mt-2">
          <DeliverySimSpeedControl
            simSpeed={simSpeed}
            gameOver={gameOver}
            onSimSpeedChange={onSimSpeedChange}
          />
        </div>
      </div>

      <DeliveryPackageQueue
        board={board}
        gameOver={gameOver}
        assignError={assignError}
        onAssign={onAssign}
        autoAssignEnabled={autoAssignEnabled}
        onAutoAssignEnabledChange={onAutoAssignEnabledChange}
        simNowMs={simNowMs}
      />

      {gameOver ? (
        <DeliveryRushGameOver
          deliveredCount={deliveredCount}
          onRestart={onRestartRush}
        />
      ) : null}
    </div>
  );
}
