/**
 * Economy targets: ~250–450 coins per 400m countryside run (coins + stunt flips);
 * Engine L1 ≈200 coins; Seasons 6k / Motocross Bike 12k within ~5–10 skilled runs.
 */
/** Stage that accepts diamonds for a 10% coin discount on unlock */
export const STAGE_DIAMOND_DISCOUNT = {
  stageId: "seasons",
  diamondsRequired: 3,
  coinMultiplier: 0.9,
} as const;

/** High-tier vehicle: partial diamond + discounted coins */
export const VEHICLE_DIAMOND_UNLOCK = {
  vehicleId: "moonlander",
  diamondsRequired: 12,
  coinMultiplier: 0.9,
} as const;

export function discountedCoinCost(baseCost: number, multiplier: number): number {
  return Math.floor(baseCost * multiplier);
}
