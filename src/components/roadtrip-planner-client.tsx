"use client";

import { RoadtripPlanProgress } from "@/components/roadtrip-plan-progress";
import { RoadtripStopList } from "@/components/roadtrip-stop-list";
import type {
  PlanProgressStage,
  TripLocation,
  TripPlan,
  TripRoutePreview,
} from "@/lib/roadtrip";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const RoadtripMap = dynamic(
  () =>
    import("@/components/roadtrip-map").then((mod) => ({
      default: mod.RoadtripMap,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="roadtrip-map-shell flex h-[420px] items-center justify-center rounded-2xl border border-[var(--roadtrip-border)] bg-[var(--roadtrip-glass)] sm:h-[520px]">
        <p className="text-sm font-semibold text-[var(--roadtrip-muted)]">
          Loading map…
        </p>
      </div>
    ),
  },
);

type StreamProgressEvent = {
  type: "progress";
  stage: PlanProgressStage;
  message: string;
  batch?: number;
  totalBatches?: number;
};

type StreamRouteEvent = {
  type: "route";
} & TripRoutePreview;

type StreamCompleteEvent = {
  type: "complete";
  plan: TripPlan;
};

type StreamErrorEvent = {
  type: "error";
  message: string;
};

type StreamEvent =
  | StreamProgressEvent
  | StreamRouteEvent
  | StreamCompleteEvent
  | StreamErrorEvent;

type LocationFieldProps = {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSelect: (location: TripLocation) => void;
  selected: TripLocation | null;
};

function LocationField({
  id,
  label,
  value,
  placeholder,
  disabled = false,
  onChange,
  onSelect,
  selected,
}: LocationFieldProps) {
  const [suggestions, setSuggestions] = useState<TripLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!value.trim() || selected?.name === value.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/roadtrip/geocode?q=${encodeURIComponent(value)}`,
        );
        const data = await res.json();
        setSuggestions(data.locations ?? []);
        setOpen(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value, selected?.name]);

  return (
    <div className="relative flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-bold text-[var(--roadtrip-ink)]">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="roadtrip-input w-full disabled:cursor-not-allowed disabled:opacity-60"
        autoComplete="off"
      />
      {loading ? (
        <p className="text-xs font-semibold text-[var(--roadtrip-muted)]">
          Searching…
        </p>
      ) : null}
      {open && !disabled && suggestions.length > 0 ? (
        <ul className="absolute top-full z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-[var(--roadtrip-border)] bg-white shadow-lg">
          {suggestions.map((location) => (
            <li key={`${location.latitude}-${location.longitude}-${location.name}`}>
              <button
                type="button"
                className="w-full px-4 py-3 text-left text-sm hover:bg-[var(--roadtrip-accent-soft)]"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onSelect(location);
                  onChange(location.name);
                  setOpen(false);
                }}
              >
                {location.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}

function parseStreamLine(line: string): StreamEvent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  return JSON.parse(trimmed) as StreamEvent;
}

function routePreviewToPlan(preview: TripRoutePreview): TripPlan {
  return {
    from: preview.from,
    to: preview.to,
    route: preview.route,
    summary: preview.summary,
    stops: [],
  };
}

export function RoadtripPlannerClient() {
  const [fromQuery, setFromQuery] = useState("");
  const [toQuery, setToQuery] = useState("");
  const [fromLocation, setFromLocation] = useState<TripLocation | null>(null);
  const [toLocation, setToLocation] = useState<TripLocation | null>(null);
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [showGas, setShowGas] = useState(true);
  const [showGrocery, setShowGrocery] = useState(true);
  const [hideClosed, setHideClosed] = useState(false);
  const [progressStage, setProgressStage] = useState<PlanProgressStage | null>(
    null,
  );
  const [progressMessage, setProgressMessage] = useState("");
  const [planningStartedAt, setPlanningStartedAt] = useState<number | null>(
    null,
  );
  const [stopsLoading, setStopsLoading] = useState(false);

  async function handlePlanTrip() {
    setLoading(true);
    setStopsLoading(true);
    setError(null);
    setPlan(null);
    setSelectedStopId(null);
    setProgressStage("geocoding");
    setProgressMessage("Finding your start and destination…");
    setPlanningStartedAt(Date.now());

    try {
      const res = await fetch("/api/roadtrip/plan/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: fromQuery,
          to: toQuery,
          fromLat: fromLocation?.latitude,
          fromLng: fromLocation?.longitude,
          toLat: toLocation?.latitude,
          toLng: toLocation?.longitude,
        }),
      });

      if (!res.ok || !res.body) {
        setError("Could not plan this trip. Try again.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const event = parseStreamLine(line);
          if (!event) continue;

          if (event.type === "progress") {
            setProgressStage(event.stage);
            setProgressMessage(event.message);
            if (event.stage === "stops") {
              setStopsLoading(true);
            }
            continue;
          }

          if (event.type === "route") {
            setPlan(routePreviewToPlan(event));
            setStopsLoading(true);
            continue;
          }

          if (event.type === "complete") {
            setPlan(event.plan);
            setProgressStage("complete");
            setProgressMessage("Trip ready!");
            setStopsLoading(false);
            setPlanningStartedAt(null);
            continue;
          }

          if (event.type === "error") {
            setPlan(null);
            setError(event.message);
            setProgressStage(null);
            setProgressMessage("");
            setPlanningStartedAt(null);
            setStopsLoading(false);
            return;
          }
        }
      }
    } catch {
      setPlan(null);
      setError("Could not plan this trip. Try again.");
      setProgressStage(null);
      setProgressMessage("");
      setPlanningStartedAt(null);
      setStopsLoading(false);
    } finally {
      setLoading(false);
    }
  }

  const gasCount = plan?.stops.filter((stop) => stop.type === "gas").length ?? 0;
  const groceryCount =
    plan?.stops.filter((stop) => stop.type === "grocery").length ?? 0;
  const openCount =
    plan?.stops.filter((stop) => stop.openStatus === "open").length ?? 0;

  const showProgress =
    progressStage !== null && progressStage !== "complete";
  const showResults = plan !== null;
  const showEmptyState = !loading && !plan && progressStage === null;

  return (
    <div className="flex flex-col gap-8">
      <section className="roadtrip-glass-card rounded-3xl p-6 sm:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <LocationField
            id="roadtrip-from"
            label="From"
            value={fromQuery}
            placeholder="Cedar Park, TX"
            disabled={loading}
            onChange={(value) => {
              setFromQuery(value);
              setFromLocation(null);
            }}
            onSelect={setFromLocation}
            selected={fromLocation}
          />
          <LocationField
            id="roadtrip-to"
            label="To"
            value={toQuery}
            placeholder="La Porte, IN"
            disabled={loading}
            onChange={(value) => {
              setToQuery(value);
              setToLocation(null);
            }}
            onSelect={setToLocation}
            selected={toLocation}
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={handlePlanTrip}
            disabled={loading || !fromQuery.trim() || !toQuery.trim()}
            className="roadtrip-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? progressMessage || "Planning route…" : "Plan trip"}
          </button>
          <p className="text-sm text-[var(--roadtrip-muted)]">
            Hours come from OpenStreetMap when available — many stops show as
            &ldquo;Hours unknown&rdquo;.
          </p>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        ) : null}
      </section>

      {showProgress ? (
        <RoadtripPlanProgress
          activeStage={progressStage}
          message={progressMessage}
          startedAt={planningStartedAt}
        />
      ) : null}

      {showResults ? (
        <>
          {plan.stopsWarning ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              {plan.stopsWarning}
            </p>
          ) : null}

          <section className="grid gap-4 sm:grid-cols-3">
            <div className="roadtrip-stat-card rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--roadtrip-muted)]">
                Distance
              </p>
              <p className="mt-2 text-3xl font-extrabold text-[var(--roadtrip-accent)]">
                {plan.summary.distanceMi.toLocaleString()} mi
              </p>
            </div>
            <div className="roadtrip-stat-card rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--roadtrip-muted)]">
                Drive time
              </p>
              <p className="mt-2 text-3xl font-extrabold text-[var(--roadtrip-accent)]">
                {formatDuration(plan.summary.durationMin)}
              </p>
            </div>
            <div className="roadtrip-stat-card rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--roadtrip-muted)]">
                Stops found
              </p>
              <p className="mt-2 text-3xl font-extrabold text-[var(--roadtrip-accent)]">
                {stopsLoading ? "…" : plan.stops.length}
              </p>
              <p className="mt-1 text-xs text-[var(--roadtrip-muted)]">
                {stopsLoading
                  ? "Still searching along the route…"
                  : `${openCount} confirmed open now`}
              </p>
            </div>
          </section>

          <section className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <RoadtripMap
              plan={plan}
              selectedStopId={selectedStopId}
              onSelectStop={setSelectedStopId}
            />

            <div className="flex flex-col gap-4">
              <div className="roadtrip-glass-card rounded-2xl p-4">
                <p className="text-sm font-bold text-[var(--roadtrip-ink)]">
                  Filter stops
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowGas((value) => !value)}
                    className={`roadtrip-filter-btn ${showGas ? "roadtrip-filter-btn-active" : ""}`}
                    disabled={stopsLoading}
                  >
                    ⛽ Gas ({gasCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGrocery((value) => !value)}
                    className={`roadtrip-filter-btn ${showGrocery ? "roadtrip-filter-btn-active" : ""}`}
                    disabled={stopsLoading}
                  >
                    🛒 Grocery ({groceryCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHideClosed((value) => !value)}
                    className={`roadtrip-filter-btn ${hideClosed ? "roadtrip-filter-btn-active" : ""}`}
                    disabled={stopsLoading}
                  >
                    Hide closed
                  </button>
                </div>
              </div>

              {stopsLoading ? (
                <div className="roadtrip-empty-card rounded-2xl p-6 text-center">
                  <p className="text-sm font-semibold text-[var(--roadtrip-muted)]">
                    {progressMessage || "Searching for stops along your route…"}
                  </p>
                </div>
              ) : (
                <RoadtripStopList
                  stops={plan.stops}
                  selectedStopId={selectedStopId}
                  showGas={showGas}
                  showGrocery={showGrocery}
                  hideClosed={hideClosed}
                  onSelectStop={setSelectedStopId}
                />
              )}
            </div>
          </section>

          <p className="text-center text-xs text-[var(--roadtrip-muted)]">
            © OpenStreetMap contributors · Route by OSRM · Geocoding by Open-Meteo
          </p>
        </>
      ) : null}

      {showEmptyState ? (
        <div className="roadtrip-empty-card rounded-3xl p-10 text-center">
          <p className="text-5xl" aria-hidden>
            🛣️
          </p>
          <p className="mt-4 text-lg font-bold text-[var(--roadtrip-ink)]">
            Plan your next road trip
          </p>
          <p className="mt-2 text-sm text-[var(--roadtrip-muted)]">
            Enter a starting point and destination to see the route, gas stations,
            and grocery stores along the way.
          </p>
        </div>
      ) : null}
    </div>
  );
}
