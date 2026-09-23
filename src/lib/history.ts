export type HistoryEvent = {
  id: string;
  title: string;
  year: number;
  wikipediaTitle: string;
  emoji?: string;
  isCustom?: boolean;
};

export const CURATED_US_EVENTS: HistoryEvent[] = [
  {
    id: "declaration-of-independence",
    title: "Declaration of Independence",
    year: 1776,
    wikipediaTitle: "United States Declaration of Independence",
    emoji: "📜",
  },
  {
    id: "us-constitution",
    title: "U.S. Constitution Ratified",
    year: 1787,
    wikipediaTitle: "Constitution of the United States",
    emoji: "⚖️",
  },
  {
    id: "louisiana-purchase",
    title: "Louisiana Purchase",
    year: 1803,
    wikipediaTitle: "Louisiana Purchase",
    emoji: "🗺️",
  },
  {
    id: "civil-war-begins",
    title: "Civil War Begins",
    year: 1861,
    wikipediaTitle: "American Civil War",
    emoji: "⚔️",
  },
  {
    id: "emancipation-proclamation",
    title: "Emancipation Proclamation",
    year: 1863,
    wikipediaTitle: "Emancipation Proclamation",
    emoji: "✊",
  },
  {
    id: "transcontinental-railroad",
    title: "Transcontinental Railroad",
    year: 1869,
    wikipediaTitle: "First transcontinental railroad",
    emoji: "🚂",
  },
  {
    id: "wright-brothers-flight",
    title: "Wright Brothers' First Flight",
    year: 1903,
    wikipediaTitle: "Wright brothers",
    emoji: "✈️",
  },
  {
    id: "wwi-entry",
    title: "U.S. Enters World War I",
    year: 1917,
    wikipediaTitle: "American entry into World War I",
    emoji: "🪖",
  },
  {
    id: "great-depression",
    title: "Great Depression Begins",
    year: 1929,
    wikipediaTitle: "Great Depression in the United States",
    emoji: "📉",
  },
  {
    id: "pearl-harbor",
    title: "Attack on Pearl Harbor",
    year: 1941,
    wikipediaTitle: "Attack on Pearl Harbor",
    emoji: "💥",
  },
  {
    id: "civil-rights-act",
    title: "Civil Rights Act Signed",
    year: 1964,
    wikipediaTitle: "Civil Rights Act of 1964",
    emoji: "🕊️",
  },
  {
    id: "moon-landing",
    title: "Apollo 11 Moon Landing",
    year: 1969,
    wikipediaTitle: "Apollo 11",
    emoji: "🌙",
  },
  {
    id: "berlin-wall-falls",
    title: "Berlin Wall Falls",
    year: 1989,
    wikipediaTitle: "Fall of the Berlin Wall",
    emoji: "🧱",
  },
  {
    id: "september-11",
    title: "September 11 Attacks",
    year: 2001,
    wikipediaTitle: "September 11 attacks",
    emoji: "🗽",
  },
];

export const CUSTOM_EVENTS_STORAGE_KEY = "history-custom-events";

export function sortEventsByYear(events: HistoryEvent[]): HistoryEvent[] {
  return [...events].sort((a, b) => a.year - b.year);
}

export function mergeEvents(
  curated: HistoryEvent[],
  custom: HistoryEvent[],
): HistoryEvent[] {
  const curatedIds = new Set(curated.map((event) => event.id));
  const uniqueCustom = custom.filter((event) => !curatedIds.has(event.id));
  return sortEventsByYear([...curated, ...uniqueCustom]);
}

export function formatEventYear(year: number): string {
  if (year < 0) return `${Math.abs(year)} BCE`;
  return String(year);
}

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function createCustomEvent(
  title: string,
  year: number,
  wikipediaTitle: string,
): HistoryEvent {
  const baseId = slugifyTitle(wikipediaTitle);
  return {
    id: `custom-${baseId}-${year}`,
    title,
    year,
    wikipediaTitle,
    isCustom: true,
  };
}

export type HistoryLinkType = "chronological" | "thematic";

export type HistoryLink = {
  source: string;
  target: string;
  type: HistoryLinkType;
  label?: string;
};

export type HistoryGraphNode = {
  event: HistoryEvent;
  x: number;
  y: number;
};

export type HistoryGraphData = {
  nodes: HistoryGraphNode[];
  links: HistoryLink[];
  width: number;
  height: number;
};

export const GRAPH_WIDTH = 1100;
export const GRAPH_HEIGHT = 420;

const GRAPH_PADDING_X = 80;
const GRAPH_ROW_OFFSET = 90;

export const CURATED_THEMATIC_LINKS: HistoryLink[] = [
  {
    source: "declaration-of-independence",
    target: "us-constitution",
    type: "thematic",
    label: "Founding era",
  },
  {
    source: "louisiana-purchase",
    target: "civil-war-begins",
    type: "thematic",
    label: "Expansion tensions",
  },
  {
    source: "civil-war-begins",
    target: "emancipation-proclamation",
    type: "thematic",
    label: "War leads to freedom",
  },
  {
    source: "emancipation-proclamation",
    target: "civil-rights-act",
    type: "thematic",
    label: "Rights movement",
  },
  {
    source: "wright-brothers-flight",
    target: "moon-landing",
    type: "thematic",
    label: "Flight to space",
  },
  {
    source: "wwi-entry",
    target: "pearl-harbor",
    type: "thematic",
    label: "World wars",
  },
  {
    source: "pearl-harbor",
    target: "moon-landing",
    type: "thematic",
    label: "Wartime innovation",
  },
  {
    source: "berlin-wall-falls",
    target: "september-11",
    type: "thematic",
    label: "Modern era",
  },
];

export function buildGraphData(events: HistoryEvent[]): HistoryGraphData {
  const sorted = sortEventsByYear(events);
  const eventIds = new Set(sorted.map((event) => event.id));

  if (sorted.length === 0) {
    return { nodes: [], links: [], width: GRAPH_WIDTH, height: GRAPH_HEIGHT };
  }

  const minYear = sorted[0].year;
  const maxYear = sorted[sorted.length - 1].year;
  const yearSpan = Math.max(maxYear - minYear, 1);
  const usableWidth = GRAPH_WIDTH - GRAPH_PADDING_X * 2;
  const centerY = GRAPH_HEIGHT / 2;

  const nodes: HistoryGraphNode[] = sorted.map((event, index) => ({
    event,
    x: GRAPH_PADDING_X + ((event.year - minYear) / yearSpan) * usableWidth,
    y:
      centerY +
      (index % 2 === 0 ? -GRAPH_ROW_OFFSET : GRAPH_ROW_OFFSET) +
      (index % 4 === 3 ? 20 : 0),
  }));

  const chronologicalLinks: HistoryLink[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    chronologicalLinks.push({
      source: sorted[i].id,
      target: sorted[i + 1].id,
      type: "chronological",
    });
  }

  const thematicLinks = CURATED_THEMATIC_LINKS.filter(
    (link) => eventIds.has(link.source) && eventIds.has(link.target),
  );

  return {
    nodes,
    links: [...chronologicalLinks, ...thematicLinks],
    width: GRAPH_WIDTH,
    height: GRAPH_HEIGHT,
  };
}
