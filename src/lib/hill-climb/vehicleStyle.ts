export type VehiclePalette = {
  body: string;
  cab: string;
  accent: string;
};

/** Starter jeep palette */
export const HILL_CLIMBER_PALETTE = {
  body: "#c23b2e",
  cab: "#f4e4c4",
  accent: "#3f2a22",
  tire: "#111827",
  rim: "#d6d3d1",
  headlight: "#fef08a",
} as const;

const FIXED_PALETTES: Record<string, VehiclePalette> = {
  "hill-climber": {
    body: HILL_CLIMBER_PALETTE.body,
    cab: HILL_CLIMBER_PALETTE.cab,
    accent: HILL_CLIMBER_PALETTE.accent,
  },
  "super-hill-climber": {
    body: "#b91c1c",
    cab: "#fef3c7",
    accent: "#1f2937",
  },
  "motocross-bike": { body: "#2563eb", cab: "#1e40af", accent: "#dc2626" },
  "monster-truck": { body: "#7c3aed", cab: "#fde047", accent: "#111827" },
  tractor: { body: "#15803d", cab: "#fef9c3", accent: "#78350f" },
  tank: { body: "#4d7c0f", cab: "#365314", accent: "#1a2e05" },
  "race-car": { body: "#dc2626", cab: "#111827", accent: "#fbbf24" },
  "tourist-bus": { body: "#f59e0b", cab: "#fef3c7", accent: "#1f2937" },
  "quad-bike": { body: "#059669", cab: "#111827", accent: "#f97316" },
  "trophy-truck": { body: "#ea580c", cab: "#fff7ed", accent: "#1c1917" },
  hovercraft: { body: "#0ea5e9", cab: "#bae6fd", accent: "#0369a1" },
  moonlander: { body: "#e5e7eb", cab: "#94a3b8", accent: "#475569" },
  "the-rocket": { body: "#f8fafc", cab: "#cbd5e1", accent: "#f97316" },
  chopper: { body: "#111827", cab: "#dc2626", accent: "#fbbf24" },
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function hsl(h: number, s: number, l: number): string {
  return `hsl(${h % 360} ${s}% ${l}%)`;
}

export function paletteForVehicle(vehicleId: string): VehiclePalette {
  const fixed = FIXED_PALETTES[vehicleId];
  if (fixed) return fixed;
  const h = hashString(vehicleId) % 360;
  return {
    body: hsl(h, 62, 42),
    cab: hsl(h, 55, 72),
    accent: hsl(h + 40, 70, 35),
  };
}
