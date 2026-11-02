import { getVehicleById } from "@/lib/hill-climb/vehicles";
import type { HillClimbProgress } from "@/lib/hill-climb/types";
import { getUpgradeLevel } from "@/lib/hill-climb/progress";

export type EffectiveVehicleStats = {
  torque: number;
  grip: number;
  fuelCapacity: number;
  suspension: number;
  downforce: number;
  fourWd: number;
  midAirControl: number;
};

const UPGRADE_COST_BASE = 200;

export function upgradeCost(partId: string, nextLevel: number): number {
  return Math.floor(UPGRADE_COST_BASE * Math.pow(1.55, nextLevel) * (partId === "fuel" ? 1.2 : 1));
}

export function computeEffectiveStats(
  vehicleId: string,
  progress: HillClimbProgress
): EffectiveVehicleStats {
  const vehicle = getVehicleById(vehicleId);
  const level = (part: string) => getUpgradeLevel(progress, vehicleId, part);

  const engineL = level("engine");
  const suspL = level("suspension");
  const tiresL = level("tires");
  const fuelL = level("fuel");
  const fourWdL = level("fourWd");
  const downL = level("downforce");
  const midL = level("midAirControl");

  return {
    torque: vehicle.base.torque * (1 + engineL * 0.08),
    grip: vehicle.base.grip * (1 + tiresL * 0.06),
    fuelCapacity: vehicle.base.fuelCapacity * (1 + fuelL * 0.1),
    suspension: vehicle.base.suspension * (1 + suspL * 0.07),
    downforce: downL * 0.02,
    fourWd: fourWdL * 0.1,
    midAirControl: 0.42 + midL * 0.06,
  };
}

const PART_DISPLAY_ORDER = [
  "engine",
  "suspension",
  "tires",
  "fourWd",
  "fuel",
  "downforce",
  "midAirControl",
  "battery",
  "brakes",
  "thruster",
  "screw",
  "seat",
  "fork",
  "friction",
  "aerodynamics",
  "rollCage",
  "reindeer",
  "food",
  "tireSize",
  "stiffness",
  "wealth",
] as const;

export function standardPartsForVehicle(vehicleId: string): string[] {
  const v = getVehicleById(vehicleId);
  const caps = v.upgradeCaps;
  const ordered = PART_DISPLAY_ORDER.filter((id) => (caps[id] ?? 0) > 0);
  const extras = Object.keys(caps).filter(
    (id) => (caps[id] ?? 0) > 0 && !PART_DISPLAY_ORDER.includes(id as (typeof PART_DISPLAY_ORDER)[number])
  );
  return [...ordered, ...extras.sort()];
}

export function partDisplayLabel(partId: string): string {
  const labels: Record<string, string> = {
    engine: "Engine",
    suspension: "Suspension",
    tires: "Tires",
    fourWd: "4WD",
    fuel: "Fuel tank",
    downforce: "Downforce",
    midAirControl: "Mid-air control",
    battery: "Battery",
    brakes: "Brakes",
    thruster: "Thruster",
    screw: "Screw drive",
    seat: "Seat",
    fork: "Fork",
    friction: "Friction",
    aerodynamics: "Aero",
    rollCage: "Roll cage",
    reindeer: "Reindeer",
    food: "Reindeer food",
    tireSize: "Tire size",
    stiffness: "Stiffness",
    wealth: "Wealth",
  };
  return labels[partId] ?? partId.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

export function maxLevelForPart(vehicleId: string, partId: string): number {
  const v = getVehicleById(vehicleId);
  return v.upgradeCaps[partId] ?? 0;
}
