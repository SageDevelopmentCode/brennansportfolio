export const DEFAULT_SPAWN_INTERVAL_MS = 6000;
export const DIFFICULTY_RAMP_MS = 10 * 60 * 1000;
export const MIN_SPAWN_INTERVAL_MS = 2500;

export const SIM_SPEED_MIN = 1;
export const SIM_SPEED_MAX = 100;

export type SimSpeed = number;

export function clampSimSpeed(value: number): SimSpeed {
  return Math.min(SIM_SPEED_MAX, Math.max(SIM_SPEED_MIN, Math.round(value)));
}

/** Max wall-clock delta applied per tick (avoids huge jumps after tab sleep). */
export const MAX_WALL_DELTA_MS = 2000;

/** Sim milliseconds processed per internal rush tick (higher sim speeds use more steps). */
export const SIM_ADVANCE_CHUNK_MS = 1000;

export function difficultyTierFromWallMs(
  startedAtWallMs: number,
  nowWallMs = Date.now(),
): number {
  if (nowWallMs <= startedAtWallMs) return 0;
  return Math.floor((nowWallMs - startedAtWallMs) / DIFFICULTY_RAMP_MS);
}

export function spawnIntervalForTier(tier: number): number {
  const scaled = DEFAULT_SPAWN_INTERVAL_MS * 0.9 ** Math.max(0, tier);
  return Math.max(MIN_SPAWN_INTERVAL_MS, Math.round(scaled));
}

export function formatDifficultyLabel(tier: number): string {
  if (tier <= 0) return "Normal";
  return `Heat ${tier}`;
}

export function isSimSpeed(value: number): value is SimSpeed {
  return (
    Number.isInteger(value) &&
    value >= SIM_SPEED_MIN &&
    value <= SIM_SPEED_MAX
  );
}
