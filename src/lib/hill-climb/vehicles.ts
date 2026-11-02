import type { VehicleDefinition } from "@/lib/hill-climb/types";

const defaultCaps = {
  engine: 13,
  suspension: 14,
  tires: 16,
  fourWd: 10,
  fuel: 0,
  downforce: 0,
};

function car(
  id: string,
  name: string,
  unlockCost: number,
  archetype: VehicleDefinition["archetype"],
  description: string,
  overrides: {
    archetype?: VehicleDefinition["archetype"];
    upgradeCaps?: VehicleDefinition["upgradeCaps"];
    base?: Partial<VehicleDefinition["base"]>;
  } = {}
): VehicleDefinition {
  const baseDefaults = {
    mass: 1,
    wheelRadius: 22,
    chassisWidth: 88,
    chassisHeight: 28,
    torque: 0.0018,
    grip: 0.9,
    fuelCapacity: 100,
    suspension: 0.35,
  };
  return {
    id,
    name,
    unlockCost,
    archetype: overrides.archetype ?? archetype,
    description,
    upgradeCaps: { ...defaultCaps, ...overrides.upgradeCaps },
    base: { ...baseDefaults, ...overrides.base },
  };
}

export const VEHICLES: VehicleDefinition[] = [
  car("hill-climber", "Hill Climber", 0, "car2", "Free starter jeep.", {
    upgradeCaps: { engine: 13, suspension: 14, tires: 16, fourWd: 10 },
  }),
  car("motocross-bike", "Motocross Bike", 12_000, "bike", "Light bike; mid-air control upgrades.", {
    base: { wheelRadius: 18, chassisWidth: 52, torque: 0.0015, mass: 0.55 },
    upgradeCaps: { engine: 12, suspension: 14, tires: 16, midAirControl: 10 },
  }),
  car("monster-truck", "Monster Truck", 18_000, "car4", "Big wheels and 4WD.", {
    base: { wheelRadius: 32, chassisWidth: 110, torque: 0.0022, mass: 1.4 },
    upgradeCaps: { engine: 14, suspension: 16, tires: 18, fourWd: 10 },
  }),
  car("tractor", "Tractor", 120_000, "car2", "Slow but strong.", {
    base: { torque: 0.0025, mass: 1.6, wheelRadius: 26 },
    upgradeCaps: { engine: 16, tires: 15, downforce: 15, fuel: 20 },
  }),
  car("hippie-van", "Hippie Van", 130_000, "car2", "Big tank, groovy ride.", {
    upgradeCaps: { engine: 15, suspension: 15, fuel: 20, tires: 15 },
  }),
  car("onewheeler", "Onewheeler", 150_000, "bike", "One wheel challenge.", {
    base: { wheelRadius: 20, chassisWidth: 40, mass: 0.5 },
    upgradeCaps: { engine: 16, suspension: 14, tires: 25, battery: 20 },
  }),
  car("quad-bike", "Quad Bike", 160_000, "car4", "Four wheel ATV.", {
    base: { wheelRadius: 20, chassisWidth: 70, mass: 0.85 },
    upgradeCaps: { engine: 12, suspension: 14, tires: 16, fourWd: 10 },
  }),
  car("trophy-truck", "Trophy Truck", 180_000, "car4", "Desert racer.", {
    base: { wheelRadius: 28, torque: 0.002 },
    upgradeCaps: { engine: 16, suspension: 15, tires: 25, fuel: 20 },
  }),
  car("tourist-bus", "Tourist Bus", 200_000, "car2", "Long and heavy.", {
    base: { chassisWidth: 140, chassisHeight: 40, mass: 2, fuelCapacity: 120 },
    upgradeCaps: { engine: 15, suspension: 15, tires: 20, fuel: 25 },
  }),
  car("race-car", "Race Car", 220_000, "car2", "Low and fast.", {
    base: { chassisHeight: 20, torque: 0.0021, grip: 1.05 },
    upgradeCaps: { engine: 12, suspension: 14, tires: 16, downforce: 10 },
  }),
  car("finger-screw", "Finger Screw", 250_000, "special", "Screw drive.", {
    archetype: "special",
    upgradeCaps: { engine: 18, suspension: 15, fuel: 20, screw: 15 },
  }),
  car("police-car", "Police Car", 260_000, "car2", "Siren not included.", {}),
  car("ambulance", "Ambulance", 280_000, "car2", "Heavy duty.", {
    base: { mass: 1.3, fuelCapacity: 115 },
    upgradeCaps: { engine: 16, suspension: 16, tires: 20, fuel: 25 },
  }),
  car("electric-car", "Electric Car", 300_000, "car2", "Battery powered.", {
    upgradeCaps: { battery: 20, tires: 16 },
  }),
  car("super-diesel", "Super Diesel 4x4", 320_000, "car4", "Diesel torque.", {
    upgradeCaps: { engine: 15, suspension: 15, tires: 20, fuel: 20 },
  }),
  car("rally-car", "Rally Car", 340_000, "car2", "All-rounder.", {
    upgradeCaps: { engine: 13, suspension: 14, tires: 17, fuel: 10 },
  }),
  car("dune-buggy", "Dune Buggy", 360_000, "car2", "Sand specialist.", {
    base: { grip: 0.85, wheelRadius: 24 },
    upgradeCaps: { engine: 16, suspension: 15, tires: 25, fuel: 20 },
  }),
  car("dragster", "Dragster", 380_000, "car2", "Huge engine.", {
    base: { torque: 0.003, chassisWidth: 100 },
    upgradeCaps: { engine: 20, suspension: 15, downforce: 18, fuel: 20 },
  }),
  car("fire-truck", "Fire Truck", 400_000, "car2", "Brakes matter.", {
    base: { mass: 2.2, fuelCapacity: 130 },
    upgradeCaps: { engine: 20, fuel: 25, brakes: 20, tireSize: 10 },
  }),
  car("chopper", "Chopper", 420_000, "bike", "Motorcycle.", {
    base: { chassisWidth: 60, wheelRadius: 20 },
    upgradeCaps: { engine: 14, suspension: 10, fuel: 19, seat: 10, fork: 10 },
  }),
  car("lowrider", "Lowrider", 440_000, "car2", "Low suspension.", {}),
  car("tank", "Tank", 460_000, "tank", "Tracks for grip.", {
    archetype: "tank",
    upgradeCaps: { engine: 16, suspension: 15, tires: 20, fuel: 20 },
  }),
  car("snowmobile", "Snowmobile", 480_000, "bike", "Arctic fun.", {
    upgradeCaps: { engine: 17, suspension: 15, tires: 20, fuel: 20 },
  }),
  car("truck", "Truck", 500_000, "car4", "Heavy hauler.", {
    base: { mass: 1.8, chassisWidth: 120 },
    upgradeCaps: { engine: 15, suspension: 15, tires: 20, fuel: 25 },
  }),
  car("hovercraft", "Hovercraft", 520_000, "hover", "Glides low.", {
    archetype: "hover",
    upgradeCaps: { engine: 14, downforce: 20, fuel: 0, friction: 16, aerodynamics: 20 },
  }),
  car("minibike", "MiniBike", 540_000, "bike", "Tiny but mighty.", {
    base: { mass: 0.45, wheelRadius: 16 },
    upgradeCaps: { engine: 20, suspension: 15, tires: 20, fuel: 25 },
  }),
  car("big-finger", "Big Finger", 560_000, "special", "Giant finger car.", {
    archetype: "special",
    upgradeCaps: { engine: 16, downforce: 18, fuel: 25, rollCage: 10 },
  }),
  car("kiddie-express", "Kiddie Express", 580_000, "car4", "Train of cars.", {
    base: { chassisWidth: 160, mass: 2.5 },
    upgradeCaps: { engine: 16, suspension: 14, tires: 25, fuel: 25 },
  }),
  car("moonlander", "Moonlander", 600_000, "rocket", "Moon vehicle.", {
    archetype: "rocket",
    upgradeCaps: { engine: 20, suspension: 15, downforce: 25, thruster: 8 },
  }),
  car("hot-rod", "Hot Rod", 620_000, "car2", "Classic hot rod.", {
    upgradeCaps: { engine: 20, fourWd: 20, fuel: 0 },
  }),
  car("the-rocket", "The Rocket", 640_000, "rocket", "Pure thrust.", {
    archetype: "rocket",
    upgradeCaps: { engine: 15, suspension: 15, tires: 25 },
  }),
  car("mutant", "Mutant", 660_000, "car2", "Strange machine.", {
    upgradeCaps: { engine: 12, suspension: 14, tires: 16, downforce: 10 },
  }),
  car("luxury-car", "Luxury Car", 680_000, "car2", "Smooth ride.", {
    upgradeCaps: { engine: 12, suspension: 14, tires: 16, wealth: 10 },
  }),
  car("carantula", "Carantula", 700_000, "special", "Spider wheels.", {
    archetype: "special",
    upgradeCaps: { engine: 10, tires: 10, fuel: 10, wealth: 10 },
  }),
  car("fast-car", "Fast Car", 720_000, "car2", "Speed demon.", {
    upgradeCaps: { engine: 15, suspension: 15, tires: 15, stiffness: 10 },
  }),
  car("sleigh", "Sleigh", 740_000, "special", "Holiday ride.", {
    archetype: "special",
    upgradeCaps: { suspension: 15, reindeer: 4, food: 25 },
  }),
  car("super-offroad", "Super Offroad", 760_000, "car4", "Ultimate offroad.", {
    upgradeCaps: { engine: 20, tires: 20, downforce: 15, fuel: 15 },
  }),
  car("super-hill-climber", "Super Hill Climber", 800_000, "car2", "Upgraded jeep.", {
    base: { torque: 0.002, grip: 1 },
    upgradeCaps: { engine: 16, suspension: 18, tires: 20, fourWd: 12 },
  }),
  car("car-car", "Car Car", 850_000, "special", "Meta vehicle.", { archetype: "special" }),
];

export function getVehicleById(id: string): VehicleDefinition {
  const v = VEHICLES.find((x) => x.id === id);
  if (!v) return VEHICLES[0];
  return v;
}
