"use client";

import type { Austin311MapPoint } from "@/lib/austin-311";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef, useState } from "react";

type Austin311MapProps = {
  points: Austin311MapPoint[];
  onSelectRequest?: (serviceRequestNumber: string) => void;
};

const AUSTIN_CENTER: [number, number] = [30.2672, -97.7431];
const DEFAULT_ZOOM = 11;
const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function requestIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div class="h-3 w-3 rounded-full border-2 border-white bg-[#0d9488] shadow-md"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

function syncMarkers(
  layerGroup: L.LayerGroup,
  points: Austin311MapPoint[],
  onSelectRequest?: (serviceRequestNumber: string) => void,
): void {
  layerGroup.clearLayers();

  for (const point of points) {
    const marker = L.marker([point.latitude, point.longitude], {
      icon: requestIcon(),
    })
      .bindPopup(
        `<strong>${point.serviceRequestNumber}</strong><br>${point.description}`,
      )
      .addTo(layerGroup);

    if (onSelectRequest) {
      marker.on("click", () => {
        onSelectRequest(point.serviceRequestNumber);
      });
    }
  }
}

export function Austin311Map({ points, onSelectRequest }: Austin311MapProps) {
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const onSelectRequestRef = useRef(onSelectRequest);

  useEffect(() => {
    onSelectRequestRef.current = onSelectRequest;
  }, [onSelectRequest]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !containerRef.current) return;

    const map = L.map(containerRef.current).setView(AUSTIN_CENTER, DEFAULT_ZOOM);
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerGroupRef.current = layerGroup;

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, [mounted]);

  useEffect(() => {
    const map = mapRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    syncMarkers(layerGroup, points, (sr) => {
      onSelectRequestRef.current?.(sr);
    });

    if (points.length > 0) {
      const bounds = L.latLngBounds(
        points.map((p) => [p.latitude, p.longitude] as [number, number]),
      );
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 13 });
    } else {
      map.setView(AUSTIN_CENTER, DEFAULT_ZOOM);
    }
  }, [points]);

  if (!mounted) {
    return (
      <div className="flex h-[360px] items-center justify-center rounded-2xl border border-[var(--austin311-border)] bg-[var(--austin311-glass)] sm:h-[440px]">
        <p className="text-sm font-semibold text-[var(--austin311-muted)]">
          Loading map…
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--austin311-border)] shadow-lg">
      <div ref={containerRef} className="h-[360px] w-full sm:h-[440px]" />
    </div>
  );
}
