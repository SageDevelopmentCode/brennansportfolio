export type BodyId =
  | "sun"
  | "mercury"
  | "venus"
  | "earth"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune";

export type SolarBodyFacts = {
  id: BodyId;
  name: string;
  kind: "Star" | "Planet";
  color: string;
  /** Stylized orbit radius for the 3D scene */
  orbitRadius: number;
  /** Stylized sphere radius */
  radius: number;
  /** Radians per second around the Sun */
  orbitSpeed: number;
  /** Radians per second spin on axis */
  spinSpeed: number;
  overview: string;
  diameter: string;
  mass: string;
  dayLength: string;
  yearLength: string;
  moons: string;
  atmosphere: string;
  distanceFromSun: string;
  nasaImageQuery: string;
  moonImageQueries?: { label: string; query: string }[];
};

export const SOLAR_BODY_IDS: BodyId[] = [
  "sun",
  "mercury",
  "venus",
  "earth",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
];

export const NASA_FACT_SHEET_URL =
  "https://nssdc.gsfc.nasa.gov/planetary/factsheet/";

export const SOLAR_BODIES: Record<BodyId, SolarBodyFacts> = {
  sun: {
    id: "sun",
    name: "Sun",
    kind: "Star",
    color: "#fbbf24",
    orbitRadius: 0,
    radius: 1.2,
    orbitSpeed: 0,
    spinSpeed: 0.15,
    overview:
      "The Sun is a G-type main-sequence star that contains more than 99% of the mass in our solar system. Nuclear fusion in its core powers sunlight, weather, and life on Earth.",
    diameter: "1,392,700 km",
    mass: "1.989 × 10³⁰ kg (333,000 × Earth)",
    dayLength: "~27 Earth days (equator)",
    yearLength: "N/A (center of system)",
    moons: "0",
    atmosphere: "Hot plasma (corona, chromosphere, photosphere)",
    distanceFromSun: "0 AU",
    nasaImageQuery: "Sun solar NASA",
  },
  mercury: {
    id: "mercury",
    name: "Mercury",
    kind: "Planet",
    color: "#a8a29e",
    orbitRadius: 3.2,
    radius: 0.22,
    orbitSpeed: 1.6,
    spinSpeed: 0.4,
    overview:
      "Mercury is the smallest planet and the closest to the Sun. Its cratered surface resembles Earth's Moon, with extreme temperature swings between blistering days and frigid nights.",
    diameter: "4,879 km",
    mass: "3.30 × 10²³ kg (0.055 × Earth)",
    dayLength: "59 Earth days",
    yearLength: "88 Earth days",
    moons: "0",
    atmosphere: "Exosphere (very thin)",
    distanceFromSun: "0.39 AU (58 million km)",
    nasaImageQuery: "Mercury planet MESSENGER",
  },
  venus: {
    id: "venus",
    name: "Venus",
    kind: "Planet",
    color: "#fcd34d",
    orbitRadius: 4.2,
    radius: 0.35,
    orbitSpeed: 1.2,
    spinSpeed: -0.08,
    overview:
      "Venus is similar in size to Earth but wrapped in a thick carbon dioxide atmosphere. Runaway greenhouse heating makes it the hottest planet in the solar system.",
    diameter: "12,104 km",
    mass: "4.87 × 10²⁴ kg (0.815 × Earth)",
    dayLength: "243 Earth days (retrograde)",
    yearLength: "225 Earth days",
    moons: "0",
    atmosphere: "Dense CO₂ with sulfuric acid clouds",
    distanceFromSun: "0.72 AU (108 million km)",
    nasaImageQuery: "Venus planet Magellan",
  },
  earth: {
    id: "earth",
    name: "Earth",
    kind: "Planet",
    color: "#38bdf8",
    orbitRadius: 5.2,
    radius: 0.38,
    orbitSpeed: 1,
    spinSpeed: 0.5,
    overview:
      "Earth is the only known world with stable liquid water on its surface and a protective oxygen-rich atmosphere. Its magnetic field and moderate climate support diverse life.",
    diameter: "12,742 km",
    mass: "5.97 × 10²⁴ kg",
    dayLength: "24 hours",
    yearLength: "365.25 days",
    moons: "1 (the Moon)",
    atmosphere: "N₂, O₂, trace gases",
    distanceFromSun: "1 AU (150 million km)",
    nasaImageQuery: "Earth Blue Marble NASA",
  },
  mars: {
    id: "mars",
    name: "Mars",
    kind: "Planet",
    color: "#f87171",
    orbitRadius: 6.4,
    radius: 0.28,
    orbitSpeed: 0.8,
    spinSpeed: 0.48,
    overview:
      "Mars is a cold desert world with the largest volcano and canyon in the solar system. Polar ice caps and ancient river valleys hint at a wetter past.",
    diameter: "6,779 km",
    mass: "6.42 × 10²³ kg (0.107 × Earth)",
    dayLength: "24.6 hours",
    yearLength: "687 Earth days",
    moons: "2 (Phobos, Deimos)",
    atmosphere: "Thin CO₂",
    distanceFromSun: "1.52 AU (228 million km)",
    nasaImageQuery: "Mars planet NASA",
    moonImageQueries: [
      { label: "Phobos", query: "Phobos Mars moon NASA" },
      { label: "Deimos", query: "Deimos Mars moon NASA" },
    ],
  },
  jupiter: {
    id: "jupiter",
    name: "Jupiter",
    kind: "Planet",
    color: "#d97706",
    orbitRadius: 8.5,
    radius: 0.85,
    orbitSpeed: 0.45,
    spinSpeed: 0.9,
    overview:
      "Jupiter is a gas giant more massive than all other planets combined. Its Great Red Spot is a storm larger than Earth, and dozens of moons orbit the planet.",
    diameter: "139,820 km",
    mass: "1.90 × 10²⁷ kg (318 × Earth)",
    dayLength: "9.9 hours",
    yearLength: "12 Earth years",
    moons: "95+ known",
    atmosphere: "Mostly H₂ and He with ammonia clouds",
    distanceFromSun: "5.20 AU (778 million km)",
    nasaImageQuery: "Jupiter Juno NASA",
    moonImageQueries: [
      { label: "Europa", query: "Europa Galileo NASA" },
      { label: "Ganymede", query: "Ganymede Galileo NASA" },
    ],
  },
  saturn: {
    id: "saturn",
    name: "Saturn",
    kind: "Planet",
    color: "#fde68a",
    orbitRadius: 10.5,
    radius: 0.72,
    orbitSpeed: 0.35,
    spinSpeed: 0.85,
    overview:
      "Saturn is famous for its bright ring system made of ice and rock. Like Jupiter, it is a hydrogen-rich gas giant with many moons, including Titan with a thick atmosphere.",
    diameter: "116,460 km",
    mass: "5.68 × 10²⁶ kg (95 × Earth)",
    dayLength: "10.7 hours",
    yearLength: "29 Earth years",
    moons: "146+ known",
    atmosphere: "Mostly H₂ and He",
    distanceFromSun: "9.58 AU (1.43 billion km)",
    nasaImageQuery: "Saturn rings Cassini NASA",
    moonImageQueries: [
      { label: "Titan", query: "Titan Cassini NASA" },
      { label: "Enceladus", query: "Enceladus Cassini NASA" },
    ],
  },
  uranus: {
    id: "uranus",
    name: "Uranus",
    kind: "Planet",
    color: "#67e8f9",
    orbitRadius: 12.5,
    radius: 0.52,
    orbitSpeed: 0.28,
    spinSpeed: 0.6,
    overview:
      "Uranus is an ice giant that rotates on its side, giving extreme seasons. Methane in its atmosphere absorbs red light and gives the planet a blue-green hue.",
    diameter: "50,724 km",
    mass: "8.68 × 10²⁵ kg (14.5 × Earth)",
    dayLength: "17.2 hours",
    yearLength: "84 Earth years",
    moons: "28 known",
    atmosphere: "H₂, He, methane",
    distanceFromSun: "19.2 AU (2.87 billion km)",
    nasaImageQuery: "Uranus planet Voyager NASA",
  },
  neptune: {
    id: "neptune",
    name: "Neptune",
    kind: "Planet",
    color: "#3b82f6",
    orbitRadius: 14.2,
    radius: 0.5,
    orbitSpeed: 0.22,
    spinSpeed: 0.58,
    overview:
      "Neptune is the windiest planet, with supersonic storms in its deep blue atmosphere. It was the first planet found through mathematical prediction before it was seen in a telescope.",
    diameter: "49,244 km",
    mass: "1.02 × 10²⁶ kg (17 × Earth)",
    dayLength: "16.1 hours",
    yearLength: "165 Earth years",
    moons: "16 known",
    atmosphere: "H₂, He, methane",
    distanceFromSun: "30.1 AU (4.5 billion km)",
    nasaImageQuery: "Neptune planet Voyager NASA",
  },
};

export function isBodyId(value: string): value is BodyId {
  return (SOLAR_BODY_IDS as string[]).includes(value);
}

export function getSolarBody(id: BodyId): SolarBodyFacts {
  return SOLAR_BODIES[id];
}
