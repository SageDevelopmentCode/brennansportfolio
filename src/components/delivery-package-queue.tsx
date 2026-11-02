"use client";

import type {
  DeliveryIdleCourier,
  DeliveryPackageBoard,
} from "@/lib/delivery-packages";
import {
  expectedTripEarnings,
  expectedTripSeconds,
  formatCountdown,
  MAX_UNDELIVERED,
  packagesPerTrip,
  payoutForPackage,
  RARE_PACKAGE_PAYOUT,
  type DeliveryPackagePending,
} from "@/lib/delivery-packages";
import { formatPrice, getAnimal } from "@/lib/delivery-mounts";
import { useState } from "react";

type DeliveryPackageQueueProps = {
  board: DeliveryPackageBoard;
  gameOver: boolean;
  assignError: string | null;
  onAssign: (packageId: string, skateboardId: string) => void;
  autoAssignEnabled: boolean;
  onAutoAssignEnabledChange: (enabled: boolean) => void;
  simNowMs: number;
};

function AssignCourierPicker({
  idleCouriers,
  pending,
  onPick,
  disabled,
}: {
  idleCouriers: DeliveryIdleCourier[];
  pending: DeliveryPackagePending[];
  onPick: (skateboardId: string) => void;
  disabled: boolean;
}) {
  const pendingCount = pending.length;
  if (idleCouriers.length === 0) {
    return (
      <p className="text-xs text-stone-600">No idle couriers — hire one or wait.</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {idleCouriers.map((courier) => {
        const animal = getAnimal(courier.mount);
        const trip = expectedTripSeconds(courier.mount);
        const haul = packagesPerTrip(animal, pendingCount);
        const earn = expectedTripEarnings(courier.mount, pending);
        return (
          <button
            key={courier.id}
            type="button"
            disabled={disabled}
            onClick={() => onPick(courier.id)}
            className="flex max-w-full flex-col items-start gap-0.5 rounded-xl border border-orange-300/60 bg-white/90 px-2.5 py-1.5 text-left text-xs font-bold text-stone-800 transition hover:bg-orange-50 disabled:opacity-50"
            title={`${courier.name} · ${haul} pkg${haul === 1 ? "" : "s"} · ${formatPrice(earn)} · ~${trip}s`}
          >
            <span className="flex items-center gap-1">
              <span aria-hidden>{animal.emoji}</span>
              <span className="max-w-[5rem] truncate">{courier.name}</span>
            </span>
            <span className="text-[10px] font-semibold text-teal-800">
              {haul} pkg{haul === 1 ? "" : "s"} · +{formatPrice(earn)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function DeliveryPackageQueue({
  board,
  gameOver,
  assignError,
  onAssign,
  autoAssignEnabled,
  onAutoAssignEnabledChange,
  simNowMs,
}: DeliveryPackageQueueProps) {
  const [pickPackageId, setPickPackageId] = useState<string | null>(null);

  const undelivered = board.pendingCount;

  return (
    <div
      className="pointer-events-auto absolute right-3 bottom-3 z-10 flex max-h-[min(52%,16rem)] w-[min(92%,18rem)] flex-col overflow-hidden rounded-2xl border border-orange-300/50 bg-amber-50/95 shadow-lg sm:right-4 sm:bottom-4"
    >
      <div className="shrink-0 border-b border-orange-200/80 px-3 py-2">
        <p className="text-[10px] font-bold tracking-widest text-orange-800/70 uppercase">
          Loading dock
        </p>
        <p
          className={`text-lg font-bold ${
            undelivered >= MAX_UNDELIVERED - 5
              ? "text-red-600"
              : undelivered > 0
                ? "text-orange-700"
                : "text-teal-700"
          }`}
        >
          Undelivered: {undelivered} / {MAX_UNDELIVERED}
        </p>
        {undelivered === 0 && !gameOver ? (
          <p className="text-xs font-semibold text-teal-700">All clear!</p>
        ) : null}
        <button
          type="button"
          disabled={gameOver}
          aria-pressed={autoAssignEnabled}
          onClick={() => {
            setPickPackageId(null);
            onAutoAssignEnabledChange(!autoAssignEnabled);
          }}
          className={`mt-2 flex w-full items-center justify-center gap-2 rounded-full px-2.5 py-1 text-xs font-bold transition disabled:opacity-50 ${
            autoAssignEnabled
              ? "bg-teal-600 text-white hover:bg-teal-500"
              : "bg-orange-500 text-stone-950 hover:bg-orange-400"
          }`}
        >
          <span
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] leading-none ${
              autoAssignEnabled
                ? "border-white/80 bg-white/20"
                : "border-stone-800/40 bg-white/90"
            }`}
            aria-hidden
          >
            {autoAssignEnabled ? "✓" : ""}
          </span>
          Auto assign
        </button>
        {autoAssignEnabled && !gameOver ? (
          <p className="mt-1 text-[10px] font-semibold text-teal-800">
            On — assigns when packages and couriers are free
          </p>
        ) : null}
      </div>

      {assignError ? (
        <p className="shrink-0 px-3 py-1 text-xs font-semibold text-red-600" role="alert">
          {assignError}
        </p>
      ) : null}

      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-2">
        {board.pending.length === 0 && board.inTransit.length === 0 ? (
          <p className="text-sm text-stone-600">Waiting for packages…</p>
        ) : null}

        {board.pending.map((pkg, index) => {
          const picking = pickPackageId === pkg.id;
          const isFront = index === 0;
          const isRare = pkg.kind === "rare";
          return (
            <div
              key={pkg.id}
              className={`rounded-xl border px-2.5 py-2 ${
                isRare
                  ? "border-violet-400 bg-gradient-to-r from-violet-100 to-amber-50"
                  : "border-orange-200 bg-white/80"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-stone-800">
                  {isRare ? "✨" : "📦"} Package {index + 1}
                  {isRare ? (
                    <span className="ml-1 text-xs font-bold text-violet-800">
                      Rare · {formatPrice(RARE_PACKAGE_PAYOUT)}
                    </span>
                  ) : null}
                  {!isFront ? (
                    <span className="ml-1 text-xs font-semibold text-stone-500">
                      (in line)
                    </span>
                  ) : null}
                </p>
                {!picking ? (
                  <button
                    type="button"
                    disabled={gameOver || !isFront}
                    onClick={() => setPickPackageId(pkg.id)}
                    className="rounded-full bg-orange-500 px-2.5 py-0.5 text-xs font-bold text-stone-950 hover:bg-orange-400 disabled:opacity-50"
                  >
                    Assign
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPickPackageId(null)}
                    className="text-xs font-semibold text-stone-500"
                  >
                    Cancel
                  </button>
                )}
              </div>
              {picking ? (
                <div className="mt-2">
                  <p className="mb-1.5 text-[10px] font-semibold text-stone-600">
                    Couriers load from the front — up to their capacity per trip.
                  </p>
                  <AssignCourierPicker
                    idleCouriers={board.idleCouriers}
                    pending={board.pending}
                    disabled={gameOver}
                    onPick={(skateboardId) => {
                      onAssign(pkg.id, skateboardId);
                      setPickPackageId(null);
                    }}
                  />
                </div>
              ) : null}
            </div>
          );
        })}

        {board.inTransit.length > 0 ? (
          <div className="space-y-1.5 pt-1">
            <p className="text-[10px] font-bold tracking-wide text-stone-500 uppercase">
              Out for delivery
            </p>
            {board.inTransit.map((trip) => {
              const animal = getAnimal(trip.mount);
              const haulSize =
                trip.packageIds.length > 0 ? trip.packageIds.length : 1;
              const kinds =
                trip.packageKinds.length > 0
                  ? trip.packageKinds
                  : trip.packageIds.map(() => "standard" as const);
              const tripCash = kinds.reduce(
                (sum, kind) => sum + payoutForPackage(kind, trip.mount),
                0,
              );
              const rareInHaul = kinds.filter((k) => k === "rare").length;
              return (
                <div
                  key={trip.id}
                  className="rounded-xl border border-teal-200/80 bg-teal-50/90 px-2.5 py-1.5 text-xs text-stone-700"
                >
                  <span className="font-bold">
                    {animal.emoji} {trip.courierName}
                  </span>
                  <span className="font-semibold text-teal-800">
                    {" "}
                    ×{haulSize} pkg{haulSize === 1 ? "" : "s"}
                  </span>
                  {rareInHaul > 0 ? (
                    <span className="font-semibold text-violet-800">
                      {" "}
                      · ✨{rareInHaul}
                    </span>
                  ) : null}
                  <span className="font-semibold text-emerald-800">
                    {" "}
                    · +{formatPrice(tripCash)}
                  </span>
                  <span className="text-stone-500">
                    {" "}
                    · back in {formatCountdown(trip.returnAt, simNowMs)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
