export type ProjectTheme =
  | "overlook"
  | "books"
  | "library"
  | "skyline"
  | "homework"
  | "roadtrip"
  | "math"
  | "snake"
  | "torch"
  | "eggs"
  | "chess"
  | "history";

export type ProjectGroup = "jonathan";

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
    id: "books",
    title: "Book Shelf",
    description: "Books read and ratings",
    emoji: "📚",
    theme: "books",
    href: "/books",
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
    id: "roadtrip",
    title: "Open Road",
    description: "Plan a route and find gas and grocery stops along the way",
    emoji: "🛣️",
    theme: "roadtrip",
    href: "/roadtrip",
  },
  {
    id: "math",
    title: "Math Blitz",
    description: "Practice times tables with streaks and badges",
    emoji: "✖️",
    theme: "math",
    href: "/math",
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
    id: "eggs",
    title: "Egg Whack",
    description: "Whack 100 falling eggs with your spatula — dodge the spikes",
    emoji: "🍳",
    theme: "eggs",
    href: "/eggs",
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
];

export const mainProjects = projects.filter((project) => project.group !== "jonathan");
export const jonathanProjects = projects.filter((project) => project.group === "jonathan");

export type OverlookPreview = {
  name: string;
  date: string;
} | null;

export type BookPreview = {
  count: number;
  topBook: { name: string; score: number } | null;
};

export type LibraryPreview = {
  favoriteCount: number;
};

export type SkylinePreview = {
  favoriteCount: number;
  latestCity: string | null;
};

export type HomeworkPreview = {
  urgentCount: number;
  savingsPercent: number;
};
