"use client";

import type { RouteStop, TripPlan } from "@/lib/roadtrip";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef, useState } from "react";

type RoadtripMapProps = {
  plan: TripPlan | null;
  selectedStopId: string | null;
  onSelectStop: (stopId: string) => void;
};

const DEFAULT_CENTER: [number, number] = [39.8283, -98.5795];
const DEFAULT_ZOOM = 4;
const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function getTripKey(plan: TripPlan): string {
  return `${plan.from.latitude},${plan.from.longitude}-${plan.to.latitude},${plan.to.longitude}`;
}

function stopIcon(stop: RouteStop, isSelected: boolean): L.DivIcon {
  const emoji = stop.type === "gas" ? "⛽" : "🛒";
  const ring = isSelected ? "ring-4 ring-[var(--roadtrip-accent)]" : "";

  return L.divIcon({
    className: "",
    html: `<div class="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-white text-lg shadow-lg ${ring}">${emoji}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function endpointIcon(label: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div class="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--roadtrip-accent)] text-xs font-extrabold text-white shadow-lg">${label}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function syncMapLayers(
  layerGroup: L.LayerGroup,
  plan: TripPlan,
  selectedStopId: string | null,
  onSelectStop: (stopId: string) => void,
): void {
  layerGroup.clearLayers();

  const positions = plan.route.coordinates.map(
    ([lng, lat]) => [lat, lng] as [number, number],
  );

  L.polyline(positions, {
    color: "#059669",
    weight: 5,
    opacity: 0.85,
  }).addTo(layerGroup);

  L.marker([plan.from.latitude, plan.from.longitude], {
    icon: endpointIcon("A"),
  })
    .bindPopup(plan.from.name)
    .addTo(layerGroup);

  L.marker([plan.to.latitude, plan.to.longitude], {
    icon: endpointIcon("B"),
  })
    .bindPopup(plan.to.name)
    .addTo(layerGroup);

  for (const stop of plan.stops) {
    const marker = L.marker([stop.latitude, stop.longitude], {
      icon: stopIcon(stop, stop.id === selectedStopId),
    })
      .bindPopup(
        `<strong>${stop.name}</strong><br>${stop.type === "gas" ? "Gas station" : "Grocery store"}`,
      )
      .addTo(layerGroup);

    marker.on("click", () => onSelectStop(stop.id));
  }
}

export function RoadtripMap({ plan, selectedStopId, onSelectStop }: RoadtripMapProps) {
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const onSelectStopRef = useRef(onSelectStop);
  const lastFitTripKeyRef = useRef<string | null>(null);

  const tripKey = plan?.route?.coordinates?.length ? getTripKey(plan) : null;

  useEffect(() => {
    onSelectStopRef.current = onSelectStop;
  }, [onSelectStop]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !tripKey || !containerRef.current) return;

    const map = L.map(containerRef.current).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerGroupRef.current = layerGroup;

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
      lastFitTripKeyRef.current = null;
    };
  }, [mounted, tripKey]);

  useEffect(() => {
    const map = mapRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup || !plan?.route?.coordinates?.length) return;

    syncMapLayers(layerGroup, plan, selectedStopId, (stopId) => {
      onSelectStopRef.current(stopId);
    });

    if (lastFitTripKeyRef.current !== tripKey) {
      const bounds = L.latLngBounds(
        plan.route.coordinates.map(
          ([lng, lat]) => [lat, lng] as [number, number],
        ),
      );
      map.fitBounds(bounds, { padding: [40, 40] });
      lastFitTripKeyRef.current = tripKey;
    }
  }, [plan, selectedStopId, tripKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !plan || !selectedStopId) return;

    const stop = plan.stops.find((item) => item.id === selectedStopId);
    if (!stop) return;

    map.panTo([stop.latitude, stop.longitude], { animate: true });
  }, [plan, selectedStopId]);

  if (!plan?.route?.coordinates?.length) {
    return (
      <div className="roadtrip-map-shell flex h-[420px] items-center justify-center rounded-2xl border border-[var(--roadtrip-border)] bg-[var(--roadtrip-glass)] sm:h-[520px]">
        <p className="text-sm font-semibold text-[var(--roadtrip-muted)]">
          Map will appear once the route is ready…
        </p>
      </div>
    );
  }

  if (!mounted) {
    return (
      <div className="roadtrip-map-shell flex h-[420px] items-center justify-center rounded-2xl border border-[var(--roadtrip-border)] bg-[var(--roadtrip-glass)] sm:h-[520px]">
        <p className="text-sm font-semibold text-[var(--roadtrip-muted)]">
          Loading map…
        </p>
      </div>
    );
  }

  return (
    <div className="roadtrip-map-shell overflow-hidden rounded-2xl border border-[var(--roadtrip-border)] shadow-lg">
      <div
        ref={containerRef}
        className="h-[420px] w-full sm:h-[520px]"
        key={tripKey ?? undefined}
      />
    </div>
  );
}
