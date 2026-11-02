"use client";

import { SolarSystemDetailPanel } from "@/components/solar-system-detail-panel";
import type { SolarSystemDetailPayload } from "@/components/solar-system-detail-panel";
import { SolarSystemNasaFeed } from "@/components/solar-system-nasa-feed";
import { SolarSystemScene } from "@/components/solar-system-scene";
import {
  SOLAR_BODIES,
  SOLAR_BODY_IDS,
  type BodyId,
} from "@/lib/solar-system/bodies";
import type { SolarSystemFeedPayload } from "@/lib/solar-system/types";
import { useCallback, useEffect, useState } from "react";

export function SolarSystemClient() {
  const [selectedBodyId, setSelectedBodyId] = useState<BodyId | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<SolarSystemDetailPayload | null>(null);

  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [feed, setFeed] = useState<SolarSystemFeedPayload | null>(null);

  const loadBody = useCallback(async (bodyId: BodyId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/solar-system/${bodyId}`);
      if (!response.ok) {
        throw new Error("Could not load this body. Try again.");
      }
      const data = (await response.json()) as SolarSystemDetailPayload;
      setPayload(data);
    } catch (err) {
      setPayload(null);
      setError(
        err instanceof Error ? err.message : "Could not load this body. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedBodyId) return;
    void loadBody(selectedBodyId);
  }, [selectedBodyId, loadBody]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setFeedLoading(true);
      setFeedError(null);
      try {
        const response = await fetch("/api/solar-system/feed");
        if (!response.ok) {
          throw new Error("Could not load NASA live feeds.");
        }
        const data = (await response.json()) as SolarSystemFeedPayload;
        if (!cancelled) setFeed(data);
      } catch (err) {
        if (!cancelled) {
          setFeed(null);
          setFeedError(
            err instanceof Error
              ? err.message
              : "Could not load NASA live feeds.",
          );
        }
      } finally {
        if (!cancelled) setFeedLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelect = (id: BodyId) => {
    setSelectedBodyId(id);
  };

  return (
    <div className="flex w-full max-w-6xl flex-col gap-6">
      <SolarSystemNasaFeed loading={feedLoading} error={feedError} feed={feed} />

      <SolarSystemScene
        selectedBodyId={selectedBodyId}
        onSelectBody={handleSelect}
      />

      <div
        className="flex flex-wrap justify-center gap-2 sm:justify-start"
        role="listbox"
        aria-label="Solar system bodies"
      >
        {SOLAR_BODY_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="option"
            aria-selected={selectedBodyId === id}
            className="solarsystem-body-chip"
            onClick={() => handleSelect(id)}
          >
            <span
              className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
              style={{ backgroundColor: SOLAR_BODIES[id].color }}
              aria-hidden
            />
            {SOLAR_BODIES[id].name}
          </button>
        ))}
      </div>

      <SolarSystemDetailPanel loading={loading} error={error} payload={payload} />
    </div>
  );
}
