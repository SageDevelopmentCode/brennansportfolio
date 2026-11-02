export const MYTHIC_PRICE_THRESHOLD = 10_000;

export const DELIVERY_BASE_EARN_PER_PACKAGE = 1_000_000;

export const DELIVERY_ANIMAL_IDS = [
  "mosquito",
  "ant",
  "snail",
  "frog",
  "bee",
  "wasp",
  "bat",
  "rabbit",
  "duck",
  "chicken",
  "crab",
  "lobster",
  "turtle",
  "goose",
  "goat",
  "pig",
  "snake",
  "fox",
  "raccoon",
  "skunk",
  "otter",
  "beaver",
  "turkey",
  "owl",
  "penguin",
  "llama",
  "kangaroo",
  "koala",
  "parrot",
  "flamingo",
  "peacock",
  "cheetah",
  "zebra",
  "horse",
  "cow",
  "rhino",
  "hippo",
  "giraffe",
  "sloth",
  "elephant",
  "squirrel",
  "hedgehog",
  "deer",
  "bald_eagle",
  "wolf",
  "bear",
  "moose",
  "seal",
  "walrus",
  "octopus",
  "dolphin",
  "shark",
  "tiger",
  "lion",
  "camel",
  "bison",
  "leopard",
  "panda",
  "gorilla",
  "polar_bear",
  "giant_squid",
  "blue_whale",
  "pegasus",
  "phoenix",
  "griffin",
  "basilisk",
  "hydra",
  "kraken",
  "dragon",
  "leviathan",
  "chimera",
  "storm_serpent",
  "cosmic_serpent",
  "golden_kraken",
  "sky_titan",
] as const;

export type DeliveryAnimalId = (typeof DELIVERY_ANIMAL_IDS)[number];

export const DELIVERY_MOUNT_IDS = DELIVERY_ANIMAL_IDS;
export type DeliveryMountId = DeliveryAnimalId;

export type WeirdFoodId =
  | "moon_pepperoni"
  | "pickle_static"
  | "gravy_thunder"
  | "leftover_confetti"
  | "bug_juice"
  | "cranberry_alarm"
  | "waffle_sunbeam"
  | "sparkle_oatmeal"
  | "frozen_yell"
  | "nacho_mist"
  | "squid_confetti"
  | "lint_butter";

export const WEIRD_FOODS: Record<WeirdFoodId, { label: string; emoji: string }> = {
  moon_pepperoni: { label: "Moon pepperoni", emoji: "🌙" },
  pickle_static: { label: "Pickle static", emoji: "⚡" },
  gravy_thunder: { label: "Gravy thunder", emoji: "🌩️" },
  leftover_confetti: { label: "Leftover confetti", emoji: "🎊" },
  bug_juice: { label: "Bug juice", emoji: "🧃" },
  cranberry_alarm: { label: "Cranberry alarm", emoji: "🚨" },
  waffle_sunbeam: { label: "Waffle sunbeam", emoji: "☀️" },
  sparkle_oatmeal: { label: "Sparkle oatmeal", emoji: "✨" },
  frozen_yell: { label: "Frozen yell", emoji: "🧊" },
  nacho_mist: { label: "Nacho mist", emoji: "🌫️" },
  squid_confetti: { label: "Squid confetti", emoji: "🦑" },
  lint_butter: { label: "Lint butter", emoji: "🧈" },
};

export type DeliveryAnimalTier = "starter" | "standard" | "mythic";

export type DeliveryAnimalPower = {
  name: string;
  blurb: string;
};

export type DeliveryAnimal = {
  id: DeliveryAnimalId;
  label: string;
  emoji: string;
  price: number;
  speed: number;
  capacity: number;
  /** Deliver this many packages before the courier must eat at the farm. */
  feedAfterPackages: number;
  requiresWeirdFood: boolean;
  foodId?: WeirdFoodId;
  earnMultiplier?: number;
  speedMultiplier?: number;
  power?: DeliveryAnimalPower;
};

export type DeliveryMount = DeliveryAnimal;

type DeliveryAnimalSeed = Omit<DeliveryAnimal, "feedAfterPackages">;

/** Per-species overrides; others use resolveFeedAfterPackages. */
const FEED_AFTER_OVERRIDES: Partial<Record<DeliveryAnimalId, number>> = {
  mosquito: 1,
  wasp: 1,
  bee: 3,
  snail: 4,
  frog: 5,
  ant: 30,
  turtle: 18,
  elephant: 45,
  blue_whale: 50,
  pegasus: 12,
  phoenix: 10,
  griffin: 16,
  basilisk: 14,
  hydra: 20,
  kraken: 22,
  dragon: 15,
  leviathan: 24,
  chimera: 18,
  storm_serpent: 20,
  cosmic_serpent: 22,
  golden_kraken: 22,
  sky_titan: 22,
};

function resolveFeedAfterPackages(seed: DeliveryAnimalSeed): number {
  const override = FEED_AFTER_OVERRIDES[seed.id];
  if (override !== undefined) return override;
  if (seed.price > MYTHIC_PRICE_THRESHOLD) {
    return Math.max(10, Math.round(seed.capacity * 1.4));
  }
  if (seed.capacity <= 2) {
    return Math.max(1, seed.capacity);
  }
  return Math.max(3, Math.round(seed.capacity * 0.85 + seed.speed * 0.25));
}

function withFeedAfterPackages(
  seeds: Record<DeliveryAnimalId, DeliveryAnimalSeed>,
): Record<DeliveryAnimalId, DeliveryAnimal> {
  const out: Partial<Record<DeliveryAnimalId, DeliveryAnimal>> = {};
  for (const id of DELIVERY_ANIMAL_IDS) {
    const seed = seeds[id];
    out[id] = {
      ...seed,
      feedAfterPackages: resolveFeedAfterPackages(seed),
    };
  }
  return out as Record<DeliveryAnimalId, DeliveryAnimal>;
}

const DELIVERY_ANIMAL_SEEDS: Record<DeliveryAnimalId, DeliveryAnimalSeed> = {
  mosquito: { id: "mosquito", label: "Mosquito", emoji: "🦟", price: 25, speed: 10, capacity: 1, requiresWeirdFood: true, foodId: "bug_juice" },
  ant: { id: "ant", label: "Ant", emoji: "🐜", price: 20, speed: 4, capacity: 25, requiresWeirdFood: true, foodId: "leftover_confetti" },
  snail: { id: "snail", label: "Snail", emoji: "🐌", price: 18, speed: 1, capacity: 2, requiresWeirdFood: false },
  frog: { id: "frog", label: "Frog", emoji: "🐸", price: 35, speed: 6, capacity: 3, requiresWeirdFood: true, foodId: "gravy_thunder" },
  bee: { id: "bee", label: "Bee", emoji: "🐝", price: 28, speed: 9, capacity: 2, requiresWeirdFood: true, foodId: "bug_juice" },
  wasp: { id: "wasp", label: "Wasp", emoji: "🐝", price: 32, speed: 9, capacity: 1, requiresWeirdFood: true, foodId: "pickle_static" },
  bat: { id: "bat", label: "Bat", emoji: "🦇", price: 45, speed: 8, capacity: 3, requiresWeirdFood: true, foodId: "cranberry_alarm" },
  rabbit: { id: "rabbit", label: "Rabbit", emoji: "🐰", price: 50, speed: 7, capacity: 4, requiresWeirdFood: false },
  duck: { id: "duck", label: "Duck", emoji: "🦆", price: 55, speed: 6, capacity: 5, requiresWeirdFood: true, foodId: "cranberry_alarm" },
  chicken: { id: "chicken", label: "Chicken", emoji: "🐔", price: 60, speed: 5, capacity: 8, requiresWeirdFood: true, foodId: "moon_pepperoni" },
  crab: { id: "crab", label: "Crab", emoji: "🦀", price: 65, speed: 3, capacity: 6, requiresWeirdFood: true, foodId: "pickle_static" },
  lobster: { id: "lobster", label: "Lobster", emoji: "🦞", price: 70, speed: 4, capacity: 7, requiresWeirdFood: true, foodId: "gravy_thunder" },
  turtle: { id: "turtle", label: "Turtle", emoji: "🐢", price: 75, speed: 2, capacity: 15, requiresWeirdFood: true, foodId: "pickle_static" },
  goose: { id: "goose", label: "Goose", emoji: "🪿", price: 80, speed: 5, capacity: 7, requiresWeirdFood: true, foodId: "waffle_sunbeam" },
  goat: { id: "goat", label: "Goat", emoji: "🐐", price: 85, speed: 5, capacity: 9, requiresWeirdFood: false },
  pig: { id: "pig", label: "Pig", emoji: "🐷", price: 90, speed: 4, capacity: 11, requiresWeirdFood: false },
  snake: { id: "snake", label: "Snake", emoji: "🐍", price: 95, speed: 7, capacity: 6, requiresWeirdFood: true, foodId: "pickle_static" },
  fox: { id: "fox", label: "Fox", emoji: "🦊", price: 120, speed: 8, capacity: 4, requiresWeirdFood: true, foodId: "leftover_confetti" },
  raccoon: { id: "raccoon", label: "Raccoon", emoji: "🦝", price: 125, speed: 7, capacity: 5, requiresWeirdFood: true, foodId: "leftover_confetti" },
  skunk: { id: "skunk", label: "Skunk", emoji: "🦨", price: 130, speed: 6, capacity: 6, requiresWeirdFood: true, foodId: "sparkle_oatmeal" },
  otter: { id: "otter", label: "Otter", emoji: "🦦", price: 135, speed: 7, capacity: 8, requiresWeirdFood: false },
  beaver: { id: "beaver", label: "Beaver", emoji: "🦫", price: 140, speed: 3, capacity: 14, requiresWeirdFood: true, foodId: "nacho_mist" },
  turkey: { id: "turkey", label: "Turkey", emoji: "🦃", price: 110, speed: 4, capacity: 12, requiresWeirdFood: true, foodId: "bug_juice" },
  owl: { id: "owl", label: "Owl", emoji: "🦉", price: 150, speed: 6, capacity: 5, requiresWeirdFood: true, foodId: "frozen_yell" },
  penguin: { id: "penguin", label: "Penguin", emoji: "🐧", price: 155, speed: 5, capacity: 10, requiresWeirdFood: false },
  llama: { id: "llama", label: "Llama", emoji: "🦙", price: 160, speed: 5, capacity: 13, requiresWeirdFood: true, foodId: "waffle_sunbeam" },
  kangaroo: { id: "kangaroo", label: "Kangaroo", emoji: "🦘", price: 175, speed: 8, capacity: 9, requiresWeirdFood: true, foodId: "moon_pepperoni" },
  koala: { id: "koala", label: "Koala", emoji: "🐨", price: 180, speed: 2, capacity: 7, requiresWeirdFood: true, foodId: "sparkle_oatmeal" },
  parrot: { id: "parrot", label: "Parrot", emoji: "🦜", price: 185, speed: 7, capacity: 4, requiresWeirdFood: true, foodId: "cranberry_alarm" },
  flamingo: { id: "flamingo", label: "Flamingo", emoji: "🦩", price: 190, speed: 6, capacity: 6, requiresWeirdFood: true, foodId: "squid_confetti" },
  peacock: { id: "peacock", label: "Peacock", emoji: "🦚", price: 195, speed: 5, capacity: 8, requiresWeirdFood: true, foodId: "leftover_confetti" },
  cheetah: { id: "cheetah", label: "Cheetah", emoji: "🐆", price: 220, speed: 10, capacity: 5, requiresWeirdFood: false },
  zebra: { id: "zebra", label: "Zebra", emoji: "🦓", price: 240, speed: 8, capacity: 12, requiresWeirdFood: true, foodId: "lint_butter" },
  horse: { id: "horse", label: "Horse", emoji: "🐴", price: 260, speed: 8, capacity: 16, requiresWeirdFood: false },
  cow: { id: "cow", label: "Cow", emoji: "🐮", price: 280, speed: 3, capacity: 22, requiresWeirdFood: true, foodId: "gravy_thunder" },
  rhino: { id: "rhino", label: "Rhino", emoji: "🦏", price: 320, speed: 4, capacity: 28, requiresWeirdFood: true, foodId: "nacho_mist" },
  hippo: { id: "hippo", label: "Hippo", emoji: "🦛", price: 340, speed: 2, capacity: 30, requiresWeirdFood: true, foodId: "pickle_static" },
  giraffe: { id: "giraffe", label: "Giraffe", emoji: "🦒", price: 360, speed: 6, capacity: 18, requiresWeirdFood: true, foodId: "waffle_sunbeam" },
  sloth: { id: "sloth", label: "Sloth", emoji: "🦥", price: 400, speed: 1, capacity: 20, requiresWeirdFood: true, foodId: "sparkle_oatmeal" },
  elephant: { id: "elephant", label: "Elephant", emoji: "🐘", price: 500, speed: 1, capacity: 40, requiresWeirdFood: true, foodId: "gravy_thunder" },
  squirrel: { id: "squirrel", label: "Squirrel", emoji: "🐿️", price: 102, speed: 8, capacity: 3, requiresWeirdFood: false },
  hedgehog: { id: "hedgehog", label: "Hedgehog", emoji: "🦔", price: 108, speed: 5, capacity: 4, requiresWeirdFood: true, foodId: "bug_juice" },
  deer: { id: "deer", label: "Deer", emoji: "🦌", price: 310, speed: 7, capacity: 10, requiresWeirdFood: false },
  bald_eagle: { id: "bald_eagle", label: "Bald eagle", emoji: "🦅", price: 420, speed: 9, capacity: 5, requiresWeirdFood: true, foodId: "frozen_yell" },
  wolf: { id: "wolf", label: "Wolf", emoji: "🐺", price: 520, speed: 9, capacity: 8, requiresWeirdFood: true, foodId: "moon_pepperoni" },
  bear: { id: "bear", label: "Bear", emoji: "🐻", price: 680, speed: 5, capacity: 18, requiresWeirdFood: false },
  moose: { id: "moose", label: "Moose", emoji: "🫎", price: 750, speed: 6, capacity: 20, requiresWeirdFood: true, foodId: "nacho_mist" },
  seal: { id: "seal", label: "Seal", emoji: "🦭", price: 820, speed: 6, capacity: 9, requiresWeirdFood: false },
  walrus: { id: "walrus", label: "Walrus", emoji: "🦭", price: 880, speed: 4, capacity: 14, requiresWeirdFood: true, foodId: "pickle_static" },
  octopus: { id: "octopus", label: "Octopus", emoji: "🐙", price: 920, speed: 7, capacity: 12, requiresWeirdFood: true, foodId: "squid_confetti" },
  dolphin: { id: "dolphin", label: "Dolphin", emoji: "🐬", price: 1050, speed: 9, capacity: 7, requiresWeirdFood: false },
  shark: { id: "shark", label: "Shark", emoji: "🦈", price: 1250, speed: 10, capacity: 6, requiresWeirdFood: true, foodId: "cranberry_alarm" },
  tiger: { id: "tiger", label: "Tiger", emoji: "🐯", price: 1350, speed: 10, capacity: 9, requiresWeirdFood: true, foodId: "gravy_thunder" },
  lion: { id: "lion", label: "Lion", emoji: "🦁", price: 1550, speed: 9, capacity: 11, requiresWeirdFood: true, foodId: "moon_pepperoni" },
  camel: { id: "camel", label: "Camel", emoji: "🐫", price: 1650, speed: 5, capacity: 24, requiresWeirdFood: false },
  bison: { id: "bison", label: "Bison", emoji: "🦬", price: 1750, speed: 6, capacity: 26, requiresWeirdFood: true, foodId: "lint_butter" },
  leopard: { id: "leopard", label: "Leopard", emoji: "🐆", price: 1900, speed: 10, capacity: 8, requiresWeirdFood: false },
  panda: { id: "panda", label: "Panda", emoji: "🐼", price: 2050, speed: 4, capacity: 16, requiresWeirdFood: true, foodId: "sparkle_oatmeal" },
  gorilla: { id: "gorilla", label: "Gorilla", emoji: "🦍", price: 2250, speed: 7, capacity: 22, requiresWeirdFood: false },
  polar_bear: { id: "polar_bear", label: "Polar bear", emoji: "🐻‍❄️", price: 2550, speed: 6, capacity: 20, requiresWeirdFood: true, foodId: "frozen_yell" },
  giant_squid: { id: "giant_squid", label: "Giant squid", emoji: "🦑", price: 4200, speed: 5, capacity: 35, requiresWeirdFood: true, foodId: "squid_confetti" },
  blue_whale: { id: "blue_whale", label: "Blue whale", emoji: "🐋", price: 9500, speed: 3, capacity: 60, requiresWeirdFood: true, foodId: "gravy_thunder" },
  pegasus: {
    id: "pegasus",
    label: "Pegasus",
    emoji: "🐴",
    price: 10_500,
    speed: 12,
    capacity: 6,
    requiresWeirdFood: true,
    foodId: "sparkle_oatmeal",
    speedMultiplier: 1.5,
    power: { name: "Cloud sprint", blurb: "Wings cut trip time way down." },
  },
  phoenix: {
    id: "phoenix",
    label: "Phoenix",
    emoji: "🔥",
    price: 15_000,
    speed: 11,
    capacity: 5,
    requiresWeirdFood: true,
    foodId: "waffle_sunbeam",
    earnMultiplier: 1.5,
    power: { name: "Ash payday", blurb: "Each package pays 50% more cash." },
  },
  griffin: {
    id: "griffin",
    label: "Griffin",
    emoji: "🦅",
    price: 25_000,
    speed: 10,
    capacity: 10,
    requiresWeirdFood: true,
    foodId: "moon_pepperoni",
    power: { name: "Royal haul", blurb: "Carries up to 10 packages per run." },
  },
  basilisk: {
    id: "basilisk",
    label: "Basilisk",
    emoji: "🐍",
    price: 32_000,
    speed: 9,
    capacity: 7,
    requiresWeirdFood: true,
    foodId: "pickle_static",
    speedMultiplier: 1.35,
    earnMultiplier: 1.25,
    power: { name: "Stone stare", blurb: "Faster trips and a cash bonus." },
  },
  hydra: {
    id: "hydra",
    label: "Hydra",
    emoji: "🐉",
    price: 40_000,
    speed: 8,
    capacity: 12,
    requiresWeirdFood: true,
    foodId: "gravy_thunder",
    power: { name: "Many heads", blurb: "Hauls a dozen packages at once." },
  },
  kraken: {
    id: "kraken",
    label: "Kraken",
    emoji: "🦑",
    price: 50_000,
    speed: 7,
    capacity: 15,
    requiresWeirdFood: true,
    foodId: "squid_confetti",
    earnMultiplier: 1.75,
    power: { name: "Tentacle bonus", blurb: "Big loads and 75% extra pay." },
  },
  dragon: {
    id: "dragon",
    label: "Dragon",
    emoji: "🐲",
    price: 60_000,
    speed: 14,
    capacity: 8,
    requiresWeirdFood: true,
    foodId: "nacho_mist",
    speedMultiplier: 1.4,
    earnMultiplier: 2,
    power: { name: "Delivery flame", blurb: "Blazing speed and double cash." },
  },
  leviathan: {
    id: "leviathan",
    label: "Leviathan",
    emoji: "🌊",
    price: 75_000,
    speed: 6,
    capacity: 18,
    requiresWeirdFood: true,
    foodId: "frozen_yell",
    earnMultiplier: 2.25,
    power: { name: "Tsunami haul", blurb: "Massive capacity and huge payouts." },
  },
  chimera: {
    id: "chimera",
    label: "Chimera",
    emoji: "🦁",
    price: 88_000,
    speed: 13,
    capacity: 10,
    requiresWeirdFood: true,
    foodId: "leftover_confetti",
    speedMultiplier: 1.3,
    earnMultiplier: 2.5,
    power: { name: "Triple threat", blurb: "Fast, stacked, and rich." },
  },
  storm_serpent: {
    id: "storm_serpent",
    label: "Storm serpent",
    emoji: "⚡",
    price: 100_000,
    speed: 16,
    capacity: 12,
    requiresWeirdFood: true,
    foodId: "gravy_thunder",
    speedMultiplier: 1.5,
    earnMultiplier: 10,
    power: { name: "Sky courier", blurb: "The ultimate mythic delivery beast." },
  },
  cosmic_serpent: {
    id: "cosmic_serpent",
    label: "Cosmic serpent",
    emoji: "🌌",
    price: 500_000,
    speed: 100,
    capacity: 15,
    requiresWeirdFood: true,
    foodId: "sparkle_oatmeal",
    earnMultiplier: 100,
    power: {
      name: "Galaxy haul",
      blurb: "100 zoom and $1,000 per package.",
    },
  },
  golden_kraken: {
    id: "golden_kraken",
    label: "Golden kraken",
    emoji: "👑",
    price: 500_000,
    speed: 100,
    capacity: 15,
    requiresWeirdFood: true,
    foodId: "squid_confetti",
    earnMultiplier: 100,
    power: {
      name: "Treasure tentacles",
      blurb: "100 zoom and $1,000 per package.",
    },
  },
  sky_titan: {
    id: "sky_titan",
    label: "Sky titan",
    emoji: "☁️",
    price: 500_000,
    speed: 100,
    capacity: 15,
    requiresWeirdFood: true,
    foodId: "waffle_sunbeam",
    earnMultiplier: 100,
    power: {
      name: "Cloud express",
      blurb: "100 zoom and $1,000 per package.",
    },
  },
};

export const DELIVERY_ANIMALS = withFeedAfterPackages(DELIVERY_ANIMAL_SEEDS);

export const DELIVERY_MOUNTS = DELIVERY_ANIMALS;

export function isDeliveryAnimalId(value: string): value is DeliveryAnimalId {
  return (DELIVERY_ANIMAL_IDS as readonly string[]).includes(value);
}

export const isDeliveryMountId = isDeliveryAnimalId;

export function getAnimal(id: DeliveryAnimalId): DeliveryAnimal {
  return DELIVERY_ANIMALS[id];
}

export const getMount = getAnimal;

export function animalTier(animal: DeliveryAnimal): DeliveryAnimalTier {
  if (animal.price > MYTHIC_PRICE_THRESHOLD) return "mythic";
  if (animal.price < 100) return "starter";
  return "standard";
}

export function effectiveSpeed(animal: DeliveryAnimal): number {
  return Math.max(1, Math.round(animal.speed * (animal.speedMultiplier ?? 1)));
}

export function earnPerPackage(_animal: DeliveryAnimal): number {
  return DELIVERY_BASE_EARN_PER_PACKAGE;
}

export function getWeirdFood(foodId: WeirdFoodId) {
  return WEIRD_FOODS[foodId];
}

export function formatSpeed(speed: number): string {
  return `${speed} zoom`;
}

export function formatAnimalSpeed(animal: DeliveryAnimal): string {
  return formatSpeed(effectiveSpeed(animal));
}

export function formatCapacity(capacity: number): string {
  return capacity === 1 ? "1 package" : `${capacity} packages`;
}

export function formatFeedAfterPackages(animal: DeliveryAnimal): string {
  const n = animal.feedAfterPackages;
  return n === 1 ? "1 package" : `${n} packages`;
}

export function formatFoodNeed(foodId: WeirdFoodId): string {
  const food = WEIRD_FOODS[foodId];
  return `${food.emoji} ${food.label}`;
}

export function formatDietNeed(animal: DeliveryAnimal): string {
  if (!animal.requiresWeirdFood || !animal.foodId) {
    return `${animal.emoji} ${animal.label} chow`;
  }
  const food = WEIRD_FOODS[animal.foodId];
  return `${food.emoji} ${animal.label} ${food.label}`;
}

export function formatPrice(price: number): string {
  return `$${price.toLocaleString("en-US")}`;
}

export function formatEarnPerPackage(animal: DeliveryAnimal): string {
  return `${formatPrice(earnPerPackage(animal))}/pkg`;
}

export function animalsByPrice(): DeliveryAnimalId[] {
  return [...DELIVERY_ANIMAL_IDS].sort(
    (a, b) => DELIVERY_ANIMALS[a].price - DELIVERY_ANIMALS[b].price,
  );
}
