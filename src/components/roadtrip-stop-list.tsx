"use client";

import type { OpenStatus, RouteStop } from "@/lib/roadtrip";

type RoadtripStopListProps = {
  stops: RouteStop[];
  selectedStopId: string | null;
  showGas: boolean;
  showGrocery: boolean;
  hideClosed: boolean;
  onSelectStop: (stopId: string) => void;
};

function openStatusLabel(status: OpenStatus): string {
  switch (status) {
    case "open":
      return "Open now";
    case "closed":
      return "Closed";
    default:
      return "Hours unknown";
  }
}

function openStatusClass(status: OpenStatus): string {
  switch (status) {
    case "open":
      return "roadtrip-badge-open";
    case "closed":
      return "roadtrip-badge-closed";
    default:
      return "roadtrip-badge-unknown";
  }
}

function formatDistance(km: number): string {
  const miles = km * 0.621371;
  if (miles < 1) return "< 1 mi from start";
  return `${Math.round(miles)} mi from start`;
}

export function RoadtripStopList({
  stops,
  selectedStopId,
  showGas,
  showGrocery,
  hideClosed,
  onSelectStop,
}: RoadtripStopListProps) {
  const filtered = stops.filter((stop) => {
    if (stop.type === "gas" && !showGas) return false;
    if (stop.type === "grocery" && !showGrocery) return false;
    if (hideClosed && stop.openStatus === "closed") return false;
    return true;
  });

  if (filtered.length === 0) {
    return (
      <div className="roadtrip-empty-card rounded-2xl p-6 text-center">
        <p className="text-sm font-semibold text-[var(--roadtrip-muted)]">
          No stops match your filters.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex max-h-[520px] flex-col gap-3 overflow-y-auto pr-1">
      {filtered.map((stop) => {
        const isSelected = stop.id === selectedStopId;
        return (
          <li key={stop.id}>
            <button
              type="button"
              onClick={() => onSelectStop(stop.id)}
              className={`roadtrip-stop-card w-full rounded-2xl p-4 text-left transition ${
                isSelected ? "roadtrip-stop-card-selected" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-base font-bold text-[var(--roadtrip-ink)]">
                    <span aria-hidden>{stop.type === "gas" ? "⛽" : "🛒"}</span>
                    <span className="truncate">{stop.name}</span>
                  </p>
                  {stop.address ? (
                    <p className="mt-1 truncate text-sm text-[var(--roadtrip-muted)]">
                      {stop.address}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[var(--roadtrip-muted)]">
                    {formatDistance(stop.distanceAlongRouteKm)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${openStatusClass(stop.openStatus)}`}
                >
                  {openStatusLabel(stop.openStatus)}
                </span>
              </div>
              {stop.openingHours ? (
                <p className="mt-2 text-xs text-[var(--roadtrip-muted)]">
                  {stop.openingHours}
                </p>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
