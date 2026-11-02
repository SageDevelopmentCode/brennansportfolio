import type { HillClimbProgress, VehicleUpgradeLevels } from "@/lib/hill-climb/types";

const STORAGE_KEY = "hill-climb-progress-v1";

export const DEFAULT_VEHICLE_ID = "hill-climber";
export const DEFAULT_STAGE_ID = "countryside";

const DEFAULT_PROGRESS: HillClimbProgress = {
  coins: 0,
  diamonds: 0,
  ownedVehicles: [DEFAULT_VEHICLE_ID],
  ownedStages: [DEFAULT_STAGE_ID],
  selectedVehicleId: DEFAULT_VEHICLE_ID,
  selectedStageId: DEFAULT_STAGE_ID,
  upgrades: {},
  bestDistanceM: {},
  runCount: 0,
};

export function loadProgress(): HillClimbProgress {
  if (typeof window === "undefined") return DEFAULT_PROGRESS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    const parsed = JSON.parse(raw) as HillClimbProgress;
    return {
      ...DEFAULT_PROGRESS,
      ...parsed,
      ownedVehicles: parsed.ownedVehicles?.length
        ? parsed.ownedVehicles
        : DEFAULT_PROGRESS.ownedVehicles,
      ownedStages: parsed.ownedStages?.length
        ? parsed.ownedStages
        : DEFAULT_PROGRESS.ownedStages,
      runCount: parsed.runCount ?? 0,
    };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export function saveProgress(progress: HillClimbProgress): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function resetProgress(): HillClimbProgress {
  const fresh = { ...DEFAULT_PROGRESS };
  saveProgress(fresh);
  return fresh;
}

export const TUTORIAL_STORAGE_KEY = "hill-climb-tutorial-seen";

export function hasSeenTutorial(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(TUTORIAL_STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markTutorialSeen(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function getUpgradeLevel(
  progress: HillClimbProgress,
  vehicleId: string,
  partId: string
): number {
  return progress.upgrades[vehicleId]?.[partId] ?? 0;
}

export function upgradeLevelsForVehicle(
  progress: HillClimbProgress,
  vehicleId: string
): VehicleUpgradeLevels {
  const keys = ["engine", "suspension", "tires", "fourWd", "fuel"];
  const out: VehicleUpgradeLevels = {};
  for (const k of keys) out[k] = getUpgradeLevel(progress, vehicleId, k);
  return out;
}
