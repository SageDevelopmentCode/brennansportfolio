export type VehicleUpgradeLevels = Partial<Record<string, number>>;

export type VehicleArchetype =
  | "car2"
  | "car4"
  | "bike"
  | "tank"
  | "hover"
  | "rocket"
  | "special";

export type StandardUpgradeId =
  | "engine"
  | "suspension"
  | "tires"
  | "fourWd"
  | "fuel"
  | "downforce";

export type VehicleDefinition = {
  id: string;
  name: string;
  unlockCost: number;
  archetype: VehicleArchetype;
  description: string;
  upgradeCaps: Partial<Record<StandardUpgradeId, number>> & Record<string, number>;
  base: {
    mass: number;
    wheelRadius: number;
    chassisWidth: number;
    chassisHeight: number;
    torque: number;
    grip: number;
    fuelCapacity: number;
    suspension: number;
  };
};

export type StageHazardKind = "ceiling" | "logs" | "lava" | "asteroid";

export type StageDefinition = {
  id: string;
  name: string;
  unlockCost: number;
  description: string;
  gravity: number;
  groundFriction: number;
  terrain: {
    amplitude: number;
    frequency: number;
    roughness: number;
  };
  sky: { top: string; bottom: string };
  ground: { grass: string; dirt: string };
  hazards: StageHazardKind[];
  /** Chance (0–1) that a coin-row slot becomes a diamond instead */
  diamondChance?: number;
};

export type HillClimbProgress = {
  coins: number;
  diamonds: number;
  ownedVehicles: string[];
  ownedStages: string[];
  selectedVehicleId: string;
  selectedStageId: string;
  upgrades: Record<string, Record<string, number>>;
  bestDistanceM: Record<string, number>;
  runCount: number;
};

export type GameInput = {
  gas: boolean;
  brake: boolean;
};

export type BonusKind = "airTime" | "backflip" | "frontflip" | "neckFlip";

export type BonusEvent = {
  kind: BonusKind;
  coins: number;
  /** Flips in one jump, or whole seconds of air time */
  count: number;
};

export type GameOverReason = "fuel" | "crash";

export type RunSnapshot = {
  distanceM: number;
  fuel: number;
  fuelMax: number;
  rpm: number;
  speedKmh: number;
  coinsThisRun: number;
  diamondsThisRun: number;
  distanceToNextFuelM: number;
  bonusTotals: Record<BonusKind, number>;
  alive: boolean;
  gameOverReason: GameOverReason | null;
};

export type PickupKind = "coin" | "fuel" | "diamond";

export type CoinDenomination = 5 | 25 | 100 | 500;
