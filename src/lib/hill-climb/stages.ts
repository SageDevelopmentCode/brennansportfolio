import type { StageDefinition } from "@/lib/hill-climb/types";

function stage(
  id: string,
  name: string,
  unlockCost: number,
  description: string,
  overrides: Partial<StageDefinition> = {}
): StageDefinition {
  const defaults: StageDefinition = {
    id,
    name,
    unlockCost,
    description,
    gravity: 1,
    groundFriction: 0.9,
    terrain: { amplitude: 80, frequency: 0.008, roughness: 0.35 },
    sky: { top: "#87ceeb", bottom: "#b8e4f9" },
    ground: { grass: "#5cb85c", dirt: "#8b6914" },
    hazards: [],
  };
  return {
    ...defaults,
    ...overrides,
    id,
    name,
    unlockCost,
    description,
    terrain: { ...defaults.terrain, ...overrides.terrain },
    sky: { ...defaults.sky, ...overrides.sky },
    ground: { ...defaults.ground, ...overrides.ground },
    hazards: overrides.hazards ?? defaults.hazards,
  };
}

export const STAGES: StageDefinition[] = [
  stage("countryside", "Countryside", 0, "Rolling green hills.", {
    terrain: { amplitude: 58, frequency: 0.0065, roughness: 0.16 },
    sky: { top: "#5fb4ee", bottom: "#bfe6fb" },
    ground: { grass: "#6bc93f", dirt: "#9a6b34" },
  }),
  stage("seasons", "Seasons", 6_000, "Hills through the seasons.", {
    terrain: { amplitude: 90, frequency: 0.009, roughness: 0.4 },
  }),
  stage("desert", "Desert", 5_000, "Hot sand dunes.", {
    groundFriction: 0.78,
    sky: { top: "#f4a460", bottom: "#ffe4b5" },
    ground: { grass: "#daa520", dirt: "#c19a6b" },
    terrain: { amplitude: 72, frequency: 0.0055, roughness: 0.22 },
  }),
  stage("arctic", "Arctic", 75_000, "Slippery snow.", {
    groundFriction: 0.55,
    sky: { top: "#e0f7fa", bottom: "#ffffff" },
    ground: { grass: "#f0f8ff", dirt: "#b0c4de" },
    terrain: { amplitude: 85, frequency: 0.008, roughness: 0.45 },
  }),
  stage("highway", "Highway", 125_000, "Fast tarmac.", {
    groundFriction: 1.1,
    terrain: { amplitude: 25, frequency: 0.004, roughness: 0.15 },
    ground: { grass: "#555", dirt: "#333" },
  }),
  stage("cave", "Cave", 150_000, "Watch your head.", {
    sky: { top: "#2d2d2d", bottom: "#1a1a1a" },
    ground: { grass: "#4a4a4a", dirt: "#2f2f2f" },
    hazards: ["ceiling"],
    terrain: { amplitude: 60, frequency: 0.01, roughness: 0.5 },
  }),
  stage("moon", "Moon", 175_000, "Low gravity.", {
    gravity: 0.35,
    sky: { top: "#000000", bottom: "#1a1a2e" },
    ground: { grass: "#c0c0c0", dirt: "#808080" },
    terrain: { amplitude: 100, frequency: 0.006, roughness: 0.4 },
  }),
  stage("boot-camp", "Boot Camp", 200_000, "Obstacle course.", {
    hazards: ["logs"],
    terrain: { amplitude: 75, frequency: 0.011, roughness: 0.55 },
  }),
  stage("mars", "Mars", 250_000, "Red planet tunnels.", {
    gravity: 0.45,
    sky: { top: "#8b2500", bottom: "#cd5c5c" },
    ground: { grass: "#b22222", dirt: "#8b0000" },
  }),
  stage("xmas", "Xmas", 300_000, "Ho ho ho.", {
    sky: { top: "#1e3a5f", bottom: "#2d5a87" },
    ground: { grass: "#fffafa", dirt: "#e8e8e8" },
  }),
  stage("alien-planet", "Alien Planet", 750_000, "Slimy slopes.", {
    gravity: 0.9,
    sky: { top: "#4b0082", bottom: "#9932cc" },
    ground: { grass: "#7cfc00", dirt: "#228b22" },
    hazards: ["asteroid"],
  }),
  stage("arctic-cave", "Arctic Cave", 800_000, "Icy cave.", {
    groundFriction: 0.5,
    hazards: ["ceiling"],
    sky: { top: "#2f4f4f", bottom: "#708090" },
  }),
  stage("forest", "Forest", 850_000, "Drive through trees.", {
    hazards: ["logs"],
    ground: { grass: "#228b22", dirt: "#654321" },
  }),
  stage("mountain", "Mountain", 850_000, "Steep peaks.", {
    terrain: { amplitude: 130, frequency: 0.009, roughness: 0.52 },
  }),
  stage("ragnarok", "Ragnarok", 1_000_000, "Chaos hills.", {
    terrain: { amplitude: 115, frequency: 0.01, roughness: 0.58 },
    hazards: ["lava", "logs"],
  }),
  stage("mudpool", "Mudpool", 1_000_000, "Get dirty.", {
    groundFriction: 0.7,
    ground: { grass: "#6b4423", dirt: "#4a3728" },
  }),
  stage("volcano", "Volcano", 1_000_000, "Lava pits.", {
    sky: { top: "#4a0000", bottom: "#ff4500" },
    ground: { grass: "#2f2f2f", dirt: "#1a1a1a" },
    hazards: ["lava"],
    diamondChance: 0.05,
  }),
  stage("beach", "Beach", 1_000_000, "Ocean breeze.", {
    sky: { top: "#00bfff", bottom: "#87cefa" },
    ground: { grass: "#f4a460", dirt: "#deb887" },
  }),
  stage("space", "Space", 900_000, "Beyond the galaxy.", {
    gravity: 0.25,
    hazards: ["asteroid"],
    sky: { top: "#000010", bottom: "#0a0a20" },
  }),
];

export function getStageById(id: string): StageDefinition {
  const s = STAGES.find((x) => x.id === id);
  if (!s) return STAGES[0];
  return s;
}
