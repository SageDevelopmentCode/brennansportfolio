"use client";

import type { ForcastrStorm } from "@/lib/nhc-storms";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef, useState } from "react";

type SkylineForcastrMapProps = {
  storms: ForcastrStorm[];
};

const DEFAULT_CENTER: [number, number] = [25, -95];
const DEFAULT_ZOOM = 3;
const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function stormIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div class="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-lg shadow-lg" style="background:${color}">🌀</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function syncStormLayers(
  layerGroup: L.LayerGroup,
  storms: ForcastrStorm[],
): L.LatLngBounds | null {
  layerGroup.clearLayers();
  const boundsPoints: L.LatLngExpression[] = [];

  for (const storm of storms) {
    const center: L.LatLngExpression = [storm.latitude, storm.longitude];
    boundsPoints.push(center);

    if (storm.cone.length > 2) {
      L.polygon(storm.cone, {
        color: storm.color,
        weight: 1,
        fillColor: storm.color,
        fillOpacity: 0.15,
      }).addTo(layerGroup);
      for (const point of storm.cone) boundsPoints.push(point);
    }

    if (storm.track.length > 1) {
      L.polyline(storm.track, {
        color: storm.color,
        weight: 3,
        opacity: 0.9,
      }).addTo(layerGroup);
      for (const point of storm.track) boundsPoints.push(point);
    }

    const popupLines = [
      `<strong>${storm.name}</strong>`,
      `${storm.classificationLabel}`,
      `${storm.intensityKts} kt${storm.pressureMb ? ` · ${storm.pressureMb} mb` : ""}`,
    ];
    if (storm.graphicsUrl) {
      popupLines.push(
        `<a href="${storm.graphicsUrl}" target="_blank" rel="noopener noreferrer">NHC graphics</a>`,
      );
    }

    L.marker(center, { icon: stormIcon(storm.color) })
      .bindPopup(popupLines.join("<br>"))
      .addTo(layerGroup);
  }

  if (boundsPoints.length === 0) return null;
  return L.latLngBounds(boundsPoints);
}

export function SkylineForcastrMap({ storms }: SkylineForcastrMapProps) {
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !containerRef.current) return;

    const map = L.map(containerRef.current, {
      scrollWheelZoom: false,
      attributionControl: true,
    }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

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

    const bounds = syncStormLayers(layerGroup, storms);
    if (bounds?.isValid()) {
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 6 });
    } else {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
  }, [storms]);

  if (!mounted) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center">
        <p className="text-xs font-semibold text-[var(--skyline-muted)]">
          Loading map…
        </p>
      </div>
    );
  }

  return <div ref={containerRef} className="h-full min-h-[200px] w-full" />;
}
