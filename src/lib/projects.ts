export type ProjectTheme =
  | "overlook"
  | "library"
  | "skyline"
  | "homework"
  | "roadtrip"
  | "math"
  | "typing"
  | "snake"
  | "torch"
  | "rocketfist"
  | "eggs"
  | "chess"
  | "history"
  | "workout"
  | "spelling"
  | "blockrealm"
  | "shelter"
  | "gym"
  | "market"
  | "delivery"
  | "physics"
  | "austin311"
  | "hillclimb"
  | "solarsystem"
  | "familycalendar"
  | "sign"
  | "allergies"
  | "squad";

export type ProjectGroup = "jonathan" | "physics";

export type Project = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  theme: ProjectTheme;
  href?: string;
  comingSoon?: boolean;
  group?: ProjectGroup;
};

export const projects: Project[] = [
  {
    id: "overlook",
    title: "Overlook Events",
    description: "Neighborhood events & RSVPs",
    emoji: "🎉",
    theme: "overlook",
    href: "/overlook",
  },
  {
    id: "library",
    title: "The Stacks",
    description: "Explore authors, discover books, save favorites",
    emoji: "📖",
    theme: "library",
    href: "/library",
  },
  {
    id: "skyline",
    title: "Skyline",
    description: "Search cities, check the weather, save favorites",
    emoji: "🌤",
    theme: "skyline",
    href: "/weather",
  },
  {
    id: "homework",
    title: "Homework Hub",
    description: "Homework, chores, badges, and savings goals",
    emoji: "📝",
    theme: "homework",
    href: "/homework",
  },
  {
    id: "family-calendar",
    title: "Home Week",
    description: "Neon week grid — plot plans, color-coded crew, tap to add chaos",
    emoji: "📅",
    theme: "familycalendar",
    href: "/family-calendar",
  },
  {
    id: "roadtrip",
    title: "Open Road",
    description: "Plan a route and find gas and grocery stops along the way",
    emoji: "🛣️",
    theme: "roadtrip",
    href: "/roadtrip",
  },
  {
    id: "math",
    title: "Multiplication Mastery",
    description: "Times-table drills with levels, focus tables, and progress stats",
    emoji: "✖️",
    theme: "math",
    href: "/math",
  },
  {
    id: "typing",
    title: "Key Blitz",
    description: "Neon typing arcade — WPM tests, word drops, and key drills",
    emoji: "⚡",
    theme: "typing",
    href: "/typing",
  },
  {
    id: "squad-ping",
    title: "Squad Ping",
    description: "Secret base codes — live chat with your crew",
    emoji: "📡",
    theme: "squad",
    href: "/squad",
  },
  {
    id: "hill-climb",
    title: "Hill Run",
    description: "Hill-climb racing — fuel, coins, garage upgrades, and unlockable stages",
    emoji: "🏔️",
    theme: "hillclimb",
    href: "/hill-climb",
  },
  {
    id: "workout",
    title: "Rep Rack",
    description: "Workout templates, built-in stopwatch, and session history",
    emoji: "💪",
    theme: "workout",
    href: "/workout",
  },
  {
    id: "spelling",
    title: "Spell Sound",
    description: "Hear 6th-grade words, type the spelling, and track mastery",
    emoji: "🔤",
    theme: "spelling",
    href: "/spelling",
  },
  {
    id: "food-allergies",
    title: "Allergy Plate",
    description: "Allergens, worldwide food search, and daily meal planning on this device",
    emoji: "🥜",
    theme: "allergies",
    href: "/food-allergies",
  },
  {
    id: "sign",
    title: "Sign Bridge",
    description: "Type text and play ASL on a 3D hand — dictionary words plus fingerspelling",
    emoji: "🤟",
    theme: "sign",
    href: "/sign",
  },
  {
    id: "snake",
    title: "Dot Snake",
    description: "Grow your snake inside the red-dot box",
    emoji: "🐍",
    theme: "snake",
    href: "/snake",
    group: "jonathan",
  },
  {
    id: "torch",
    title: "Torch Pop",
    description: "Throw torches to pop bubbles — 1 point each",
    emoji: "🔥",
    theme: "torch",
    href: "/torch",
    group: "jonathan",
  },
  {
    id: "rocket-fist",
    title: "Rocket Fist",
    description: "Junkyard arena — punch monsters, dash, survive the bosses",
    emoji: "👊",
    theme: "rocketfist",
    href: "/rocket-fist",
    group: "jonathan",
  },
  {
    id: "eggs",
    title: "Hungry Ape Run",
    description: "Jungle runner — strafe, jump, grab bananas, don’t starve",
    emoji: "🦍",
    theme: "eggs",
    href: "/eggs",
    group: "jonathan",
  },
  {
    id: "blockrealm",
    title: "Block Realm",
    description: "Place blocks, break blocks, survive the night",
    emoji: "🟫",
    theme: "blockrealm",
    href: "/blockrealm",
    group: "jonathan",
  },
  {
    id: "shelter",
    title: "Paw Shelter",
    description: "Adopt anything — animals, people, or chaos. Staff adds listings.",
    emoji: "🐾",
    theme: "shelter",
    href: "/shelter",
    group: "jonathan",
  },
  {
    id: "gym",
    title: "Iron Desk",
    description: "Front desk check-ins — you own the gym, families wait, Butt Face talks.",
    emoji: "🏋️",
    theme: "gym",
    href: "/gym",
    group: "jonathan",
  },
  {
    id: "chess",
    title: "Royal Check",
    description: "Play full-rule chess against the computer",
    emoji: "♟️",
    theme: "chess",
    href: "/chess",
  },
  {
    id: "history",
    title: "US History",
    description: "Explore a timeline of American milestones with Wikipedia details",
    emoji: "📜",
    theme: "history",
    href: "/history",
  },
  {
    id: "solar-system",
    title: "Solar System Explorer",
    description: "Fly through the Sun and planets — tap any world for NASA facts and photos",
    emoji: "🪐",
    theme: "solarsystem",
    href: "/solar-system",
  },
  {
    id: "market",
    title: "Ticker Tape",
    description: "Search US stocks, check prices, and chart end-of-day moves",
    emoji: "📈",
    theme: "market",
    href: "/stocks",
  },
  {
    id: "delivery",
    title: "Skate Drop",
    description: "You own the company. Hire skateboards by name.",
    emoji: "🛹",
    theme: "delivery",
    href: "/delivery",
  },
  {
    id: "physics-ramp",
    title: "Ramp Lab",
    description: "Angle, friction, ramp length, and ball material — roll it down",
    emoji: "⚗️",
    theme: "physics",
    href: "/physics",
    group: "physics",
  },
  {
    id: "austin-311",
    title: "City Calls",
    description: "Austin Transportation 311 requests — live charts and an open-requests map",
    emoji: "📞",
    theme: "austin311",
    href: "/austin-311",
  },
];

export const mainProjects = projects.filter(
  (project) => project.group !== "jonathan" && project.group !== "physics"
);
export const jonathanProjects = projects.filter((project) => project.group === "jonathan");
export const physicsProjects = projects.filter((project) => project.group === "physics");

export type OverlookPreview = {
  name: string;
  date: string;
} | null;

export type LibraryPreview = {
  favoriteCount: number;
};

export type SkylinePreview = {
  favoriteCount: number;
  latestCity: string | null;
};

export type MarketPreview = {
  watchlistCount: number;
  latestSymbol: string | null;
};

export type HomeworkPreview = {
  urgentCount: number;
  savingsPercent: number;
};
