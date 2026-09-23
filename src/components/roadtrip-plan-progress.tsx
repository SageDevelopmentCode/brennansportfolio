"use client";

import type { PlanProgressStage } from "@/lib/roadtrip";
import { useEffect, useState } from "react";

type StepState = "pending" | "active" | "done";

type RoadtripPlanProgressProps = {
  activeStage: PlanProgressStage | null;
  message: string;
  startedAt: number | null;
};

const STEPS: { id: PlanProgressStage; label: string }[] = [
  { id: "geocoding", label: "Locations" },
  { id: "routing", label: "Route" },
  { id: "stops", label: "Stops" },
  { id: "complete", label: "Ready" },
];

function stageIndex(stage: PlanProgressStage): number {
  return STEPS.findIndex((step) => step.id === stage);
}

function getStepState(
  stepId: PlanProgressStage,
  activeStage: PlanProgressStage | null,
): StepState {
  if (!activeStage) return "pending";

  const activeIndex = stageIndex(activeStage);
  const stepIndex = stageIndex(stepId);

  if (stepIndex < activeIndex) return "done";
  if (stepIndex === activeIndex) return "active";
  return "pending";
}

function formatElapsed(startedAt: number | null): string | null {
  if (startedAt === null) return null;
  const seconds = Math.floor((Date.now() - startedAt) / 1000);
  if (seconds < 5) return null;
  if (seconds < 60) return `${seconds}s elapsed`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s elapsed`;
}

export function RoadtripPlanProgress({
  activeStage,
  message,
  startedAt,
}: RoadtripPlanProgressProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (startedAt === null || activeStage === "complete") return;
    const interval = setInterval(() => setTick((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, [startedAt, activeStage]);

  const elapsed = formatElapsed(startedAt);

  return (
    <section
      className="roadtrip-progress-panel rounded-3xl p-6 sm:p-8"
      aria-live="polite"
      aria-busy={activeStage !== "complete"}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-[var(--roadtrip-accent)]">
            Planning your trip
          </p>
          <p className="mt-1 text-sm text-[var(--roadtrip-muted)]">
            This can take up to a minute on long routes.
          </p>
        </div>
        {elapsed ? (
          <p className="text-xs font-semibold text-[var(--roadtrip-muted)]">{elapsed}</p>
        ) : null}
      </div>

      <ol className="mt-6 space-y-0">
        {STEPS.map((step, index) => {
          const state = getStepState(step.id, activeStage);
          const isActive = state === "active";
          const isDone = state === "done";

          return (
            <li key={step.id}>
              <div
                className={`roadtrip-progress-step roadtrip-progress-step-${state}`}
              >
                <div className="roadtrip-progress-indicator" aria-hidden>
                  {isDone ? (
                    "✓"
                  ) : isActive ? (
                    <span className="roadtrip-progress-spinner" />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm font-bold text-[var(--roadtrip-ink)]">
                    {step.label}
                  </p>
                  {isActive && message ? (
                    <p className="mt-1 text-sm text-[var(--roadtrip-muted)]">
                      {message}
                    </p>
                  ) : null}
                  {isDone ? (
                    <p className="mt-1 text-xs font-semibold text-[var(--roadtrip-accent)]">
                      Done
                    </p>
                  ) : null}
                </div>
              </div>
              {index < STEPS.length - 1 ? (
                <div
                  className={`roadtrip-progress-connector ${
                    isDone ? "roadtrip-progress-connector-done" : ""
                  }`}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
