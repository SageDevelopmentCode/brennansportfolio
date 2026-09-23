export type GameMode = "practice" | "speed";
export type Difficulty = "easy" | "medium" | "hard";

export type MultiplicationProblem = {
  a: number;
  b: number;
  answer: number;
};

export type TableStat = {
  correct: number;
  attempts: number;
};

export type MathProgress = {
  totalCorrect: number;
  totalAttempts: number;
  bestStreak: number;
  bestSpeedScore: number;
  tableStats: Record<string, TableStat>;
};

export type Badge = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  check: (progress: MathProgress, sessionStreak?: number) => boolean;
};

export const PROGRESS_STORAGE_KEY = "math-blitz-progress";
export const SPEED_ROUND_SECONDS = 60;

export const DIFFICULTY_CONFIG: Record<
  Difficulty,
  { minTable: number; maxTable: number; label: string }
> = {
  easy: { minTable: 1, maxTable: 5, label: "Easy (×1–×5)" },
  medium: { minTable: 1, maxTable: 10, label: "Medium (×1–×10)" },
  hard: { minTable: 1, maxTable: 12, label: "Hard (×1–×12)" },
};

export const CELEBRATION_MESSAGES = [
  "Nice job!",
  "Crushed it!",
  "You're on fire!",
  "Boom! Got it!",
  "Superstar move!",
  "Nailed it!",
  "Way to go!",
  "Math wizard!",
  "Keep it up!",
  "Brilliant!",
];

export const BADGES: Badge[] = [
  {
    id: "ten-correct",
    name: "First Ten",
    emoji: "🌱",
    description: "Answer 10 problems correctly",
    check: (p) => p.totalCorrect >= 10,
  },
  {
    id: "twentyfive-correct",
    name: "Quarter Century",
    emoji: "⭐",
    description: "Answer 25 problems correctly",
    check: (p) => p.totalCorrect >= 25,
  },
  {
    id: "five-streak",
    name: "Hot Streak",
    emoji: "🔥",
    description: "Get 5 in a row",
    check: (p, streak) => (streak ?? 0) >= 5 || p.bestStreak >= 5,
  },
  {
    id: "ten-streak",
    name: "On Fire",
    emoji: "⚡",
    description: "Get 10 in a row",
    check: (p, streak) => (streak ?? 0) >= 10 || p.bestStreak >= 10,
  },
  {
    id: "table-master",
    name: "Table Master",
    emoji: "👑",
    description: "Master a table (80%+ over 10 tries)",
    check: (p) => hasMasteredTable(p),
  },
];

const DEFAULT_PROGRESS: MathProgress = {
  totalCorrect: 0,
  totalAttempts: 0,
  bestStreak: 0,
  bestSpeedScore: 0,
  tableStats: {},
};

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateProblem(options: {
  minTable: number;
  maxTable: number;
  focusTable?: number | null;
}): MultiplicationProblem {
  const { minTable, maxTable, focusTable } = options;

  let a: number;
  let b: number;

  if (focusTable != null) {
    a = focusTable;
    b = randomInt(minTable, maxTable);
    if (Math.random() < 0.5) {
      [a, b] = [b, a];
    }
  } else {
    a = randomInt(minTable, maxTable);
    b = randomInt(minTable, maxTable);
  }

  return { a, b, answer: a * b };
}

export function getCelebrationMessage(): string {
  return CELEBRATION_MESSAGES[
    Math.floor(Math.random() * CELEBRATION_MESSAGES.length)
  ];
}

export function hasMasteredTable(progress: MathProgress): boolean {
  return Object.values(progress.tableStats).some(
    (stat) => stat.attempts >= 10 && stat.correct / stat.attempts >= 0.8
  );
}

export function tableAccuracy(stat: TableStat): number {
  if (stat.attempts === 0) return 0;
  return Math.round((stat.correct / stat.attempts) * 100);
}

export function loadProgress(): MathProgress {
  if (typeof window === "undefined") return DEFAULT_PROGRESS;

  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<MathProgress>;
    return {
      totalCorrect: parsed.totalCorrect ?? 0,
      totalAttempts: parsed.totalAttempts ?? 0,
      bestStreak: parsed.bestStreak ?? 0,
      bestSpeedScore: parsed.bestSpeedScore ?? 0,
      tableStats: parsed.tableStats ?? {},
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export function saveProgress(progress: MathProgress): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
}

export function recordAnswer(
  progress: MathProgress,
  problem: MultiplicationProblem,
  correct: boolean
): MathProgress {
  const tableKey = String(Math.max(problem.a, problem.b));
  const existing = progress.tableStats[tableKey] ?? { correct: 0, attempts: 0 };

  const updated: MathProgress = {
    ...progress,
    totalAttempts: progress.totalAttempts + 1,
    totalCorrect: progress.totalCorrect + (correct ? 1 : 0),
    tableStats: {
      ...progress.tableStats,
      [tableKey]: {
        correct: existing.correct + (correct ? 1 : 0),
        attempts: existing.attempts + 1,
      },
    },
  };

  saveProgress(updated);
  return updated;
}

export function updateBestStreak(
  progress: MathProgress,
  streak: number
): MathProgress {
  if (streak <= progress.bestStreak) return progress;
  const updated = { ...progress, bestStreak: streak };
  saveProgress(updated);
  return updated;
}

export function updateBestSpeedScore(
  progress: MathProgress,
  score: number
): MathProgress {
  if (score <= progress.bestSpeedScore) return progress;
  const updated = { ...progress, bestSpeedScore: score };
  saveProgress(updated);
  return updated;
}

export function isBadgeUnlocked(
  badge: Badge,
  progress: MathProgress,
  sessionStreak?: number
): boolean {
  return badge.check(progress, sessionStreak);
}
