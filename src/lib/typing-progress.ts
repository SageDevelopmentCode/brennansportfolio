import {
  getDifficultyLevelForAge,
  getNextLevel,
  MAX_LEVEL,
} from "@/lib/typing-words";
import type { TypingMode } from "@/lib/typing";

export const PROGRESS_STORAGE_KEY = "key-blitz-progress";

export type ClassicHistoryEntry = {
  date: string;
  wpm: number;
  accuracy: number;
};

export type ProfileStats = {
  age: number | null;
  classic: {
    bestWpm: number;
    bestAccuracy: number;
    level: number;
    history: ClassicHistoryEntry[];
    ghostProgress: number[];
    ghostWpm: number;
  };
  wordDrop: {
    bestScore: number;
    bestCombo: number;
  };
  survival: {
    bestScore: number;
    bestTimeMs: number;
    bestWords: number;
  };
  drill: {
    rounds: number;
    bestAccuracy: number;
  };
  streak: {
    lastPlayedDate: string | null;
    count: number;
  };
  keyErrors: Record<string, number>;
  keyHits: Record<string, number>;
  badges: string[];
  totalRounds: number;
};

export type KeyBlitzProgress = {
  activeProfile: string;
  profiles: Record<string, ProfileStats>;
};

export type BadgeDefinition = {
  id: string;
  label: string;
  emoji: string;
  description: string;
};

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: "first-steps",
    label: "First Steps",
    emoji: "👟",
    description: "Complete your first round",
  },
  {
    id: "speed-demon",
    label: "Speed Demon",
    emoji: "⚡",
    description: "Hit 40 WPM in Classic Blitz",
  },
  {
    id: "untouchable",
    label: "Untouchable",
    emoji: "🔥",
    description: "Reach a 20-combo in Word Drop",
  },
  {
    id: "iron-fingers",
    label: "Iron Fingers",
    emoji: "💪",
    description: "Maintain a 7-day streak",
  },
  {
    id: "key-master",
    label: "Key Master",
    emoji: "🎯",
    description: "Drill a weak key below 5% error rate",
  },
  {
    id: "survivor",
    label: "Survivor",
    emoji: "🏆",
    description: "Score 500+ in Survival mode",
  },
  {
    id: "blitz-legend",
    label: "Blitz Legend",
    emoji: "👑",
    description: "Unlock level 7",
  },
];

export const DEFAULT_PROFILE_NAMES = ["Brennan", "Jonathan", "Guest"];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function createEmptyProfileStats(age: number | null = null): ProfileStats {
  const startingLevel = age !== null ? getDifficultyLevelForAge(age) : 1;
  return {
    age,
    classic: {
      bestWpm: 0,
      bestAccuracy: 0,
      level: startingLevel,
      history: [],
      ghostProgress: [],
      ghostWpm: 0,
    },
    wordDrop: {
      bestScore: 0,
      bestCombo: 0,
    },
    survival: {
      bestScore: 0,
      bestTimeMs: 0,
      bestWords: 0,
    },
    drill: {
      rounds: 0,
      bestAccuracy: 0,
    },
    streak: {
      lastPlayedDate: null,
      count: 0,
    },
    keyErrors: {},
    keyHits: {},
    badges: [],
    totalRounds: 0,
  };
}

export function createDefaultProgress(): KeyBlitzProgress {
  const profiles: Record<string, ProfileStats> = {};
  for (const name of DEFAULT_PROFILE_NAMES) {
    profiles[name] = createEmptyProfileStats();
  }
  return {
    activeProfile: DEFAULT_PROFILE_NAMES[0],
    profiles,
  };
}

export function loadProgress(): KeyBlitzProgress {
  if (typeof window === "undefined") {
    return createDefaultProgress();
  }

  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return createDefaultProgress();
    const parsed = JSON.parse(raw) as KeyBlitzProgress;
    if (!parsed.profiles || !parsed.activeProfile) {
      return createDefaultProgress();
    }
    const profiles: Record<string, ProfileStats> = {};
    for (const [name, stats] of Object.entries(parsed.profiles)) {
      profiles[name] = {
        ...createEmptyProfileStats(stats.age ?? null),
        ...stats,
        age: stats.age ?? null,
      };
    }
    return { ...parsed, profiles };
  } catch {
    return createDefaultProgress();
  }
}

export function saveProgress(progress: KeyBlitzProgress): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
}

export function getActiveProfile(progress: KeyBlitzProgress): ProfileStats {
  return (
    progress.profiles[progress.activeProfile] ?? createEmptyProfileStats()
  );
}

export function setActiveProfile(
  progress: KeyBlitzProgress,
  name: string
): KeyBlitzProgress {
  const trimmed = name.trim();
  if (!trimmed) return progress;

  const profiles = { ...progress.profiles };
  if (!profiles[trimmed]) {
    profiles[trimmed] = createEmptyProfileStats();
  }

  return {
    activeProfile: trimmed,
    profiles,
  };
}

export function setProfileAge(
  progress: KeyBlitzProgress,
  name: string,
  age: number
): KeyBlitzProgress {
  const trimmed = name.trim();
  if (!trimmed) return progress;

  const clampedAge = Math.min(Math.max(Math.round(age), 5), 99);
  const ageLevel = getDifficultyLevelForAge(clampedAge);
  const profiles = { ...progress.profiles };
  const existing = profiles[trimmed] ?? createEmptyProfileStats(clampedAge);

  profiles[trimmed] = {
    ...existing,
    age: clampedAge,
    classic: {
      ...existing.classic,
      level: Math.max(existing.classic.level, ageLevel),
    },
  };

  return {
    activeProfile: trimmed,
    profiles,
  };
}

/** Difficulty used in all game modes — age baseline plus earned progress. */
export function getPlayLevel(profile: ProfileStats): number {
  const earned = profile.classic.level;
  if (profile.age === null) return earned;
  return Math.max(getDifficultyLevelForAge(profile.age), earned);
}

function updateStreak(profile: ProfileStats): ProfileStats {
  const today = todayIso();
  const { lastPlayedDate, count } = profile.streak;

  if (lastPlayedDate === today) {
    return profile;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayIso = yesterday.toISOString().slice(0, 10);

  const nextCount =
    lastPlayedDate === yesterdayIso ? count + 1 : lastPlayedDate === null ? 1 : 1;

  return {
    ...profile,
    streak: {
      lastPlayedDate: today,
      count: nextCount,
    },
  };
}

function awardBadge(profile: ProfileStats, badgeId: string): string[] {
  if (profile.badges.includes(badgeId)) return profile.badges;
  return [...profile.badges, badgeId];
}

function evaluateBadges(profile: ProfileStats): ProfileStats {
  let badges = [...profile.badges];

  if (profile.totalRounds >= 1) {
    badges = awardBadge({ ...profile, badges }, "first-steps");
  }
  if (profile.classic.bestWpm >= 40) {
    badges = awardBadge({ ...profile, badges }, "speed-demon");
  }
  if (profile.wordDrop.bestCombo >= 20) {
    badges = awardBadge({ ...profile, badges }, "untouchable");
  }
  if (profile.streak.count >= 7) {
    badges = awardBadge({ ...profile, badges }, "iron-fingers");
  }
  if (profile.classic.level >= MAX_LEVEL) {
    badges = awardBadge({ ...profile, badges }, "blitz-legend");
  }
  if (profile.survival.bestScore >= 500) {
    badges = awardBadge({ ...profile, badges }, "survivor");
  }

  const weakKeys = getWeakestKeys(profile, 3);
  for (const key of weakKeys) {
    const errors = profile.keyErrors[key] ?? 0;
    const hits = profile.keyHits[key] ?? 0;
    const total = errors + hits;
    if (total >= 20 && errors / total < 0.05) {
      badges = awardBadge({ ...profile, badges }, "key-master");
      break;
    }
  }

  return { ...profile, badges };
}

export type RoundResult = {
  mode: TypingMode;
  wpm?: number;
  accuracy: number;
  score?: number;
  combo?: number;
  timeMs?: number;
  wordsCompleted?: number;
  ghostProgress?: number[];
  keyMistakes?: Record<string, number>;
  keyHits?: Record<string, number>;
  drillKeyAccuracy?: Record<string, number>;
};

export type RecordBreak = {
  mode: TypingMode;
  label: string;
  value: number;
};

export function recordRound(
  progress: KeyBlitzProgress,
  result: RoundResult
): { progress: KeyBlitzProgress; newBadges: string[]; records: RecordBreak[] } {
  const profile = getActiveProfile(progress);
  const previousBadges = new Set(profile.badges);
  const records: RecordBreak[] = [];

  let nextProfile: ProfileStats = {
    ...updateStreak(profile),
    totalRounds: profile.totalRounds + 1,
    keyErrors: { ...profile.keyErrors },
    keyHits: { ...profile.keyHits },
  };

  if (result.keyMistakes) {
    for (const [key, count] of Object.entries(result.keyMistakes)) {
      nextProfile.keyErrors[key] = (nextProfile.keyErrors[key] ?? 0) + count;
    }
  }
  if (result.keyHits) {
    for (const [key, count] of Object.entries(result.keyHits)) {
      nextProfile.keyHits[key] = (nextProfile.keyHits[key] ?? 0) + count;
    }
  }

  if (result.mode === "classic" && result.wpm !== undefined) {
    const historyEntry: ClassicHistoryEntry = {
      date: new Date().toISOString(),
      wpm: result.wpm,
      accuracy: result.accuracy,
    };
    const history = [...nextProfile.classic.history, historyEntry].slice(-30);
    const newLevel = getNextLevel(
      nextProfile.classic.level,
      result.wpm,
      result.accuracy
    );

    if (result.wpm > nextProfile.classic.bestWpm) {
      records.push({ mode: "classic", label: "Best WPM", value: result.wpm });
    }
    if (result.accuracy > nextProfile.classic.bestAccuracy) {
      records.push({
        mode: "classic",
        label: "Best Accuracy",
        value: result.accuracy,
      });
    }

    const ghostProgress =
      result.ghostProgress &&
      result.wpm > nextProfile.classic.ghostWpm
        ? result.ghostProgress
        : nextProfile.classic.ghostProgress;

    nextProfile = {
      ...nextProfile,
      classic: {
        bestWpm: Math.max(nextProfile.classic.bestWpm, result.wpm),
        bestAccuracy: Math.max(nextProfile.classic.bestAccuracy, result.accuracy),
        level: Math.max(nextProfile.classic.level, newLevel),
        history,
        ghostProgress,
        ghostWpm:
          result.wpm > nextProfile.classic.ghostWpm
            ? result.wpm
            : nextProfile.classic.ghostWpm,
      },
    };
  }

  if (result.mode === "worddrop" && result.score !== undefined) {
    if (result.score > nextProfile.wordDrop.bestScore) {
      records.push({
        mode: "worddrop",
        label: "Best Score",
        value: result.score,
      });
    }
    if ((result.combo ?? 0) > nextProfile.wordDrop.bestCombo) {
      records.push({
        mode: "worddrop",
        label: "Best Combo",
        value: result.combo ?? 0,
      });
    }
    nextProfile = {
      ...nextProfile,
      wordDrop: {
        bestScore: Math.max(nextProfile.wordDrop.bestScore, result.score),
        bestCombo: Math.max(
          nextProfile.wordDrop.bestCombo,
          result.combo ?? 0
        ),
      },
    };
  }

  if (result.mode === "survival" && result.score !== undefined) {
    if (result.score > nextProfile.survival.bestScore) {
      records.push({
        mode: "survival",
        label: "Best Score",
        value: result.score,
      });
    }
    nextProfile = {
      ...nextProfile,
      survival: {
        bestScore: Math.max(nextProfile.survival.bestScore, result.score),
        bestTimeMs: Math.max(
          nextProfile.survival.bestTimeMs,
          result.timeMs ?? 0
        ),
        bestWords: Math.max(
          nextProfile.survival.bestWords,
          result.wordsCompleted ?? 0
        ),
      },
    };
  }

  if (result.mode === "drill") {
    const drillAccuracy = result.accuracy;
    if (drillAccuracy > nextProfile.drill.bestAccuracy) {
      records.push({
        mode: "drill",
        label: "Best Drill Accuracy",
        value: drillAccuracy,
      });
    }
    nextProfile = {
      ...nextProfile,
      drill: {
        rounds: nextProfile.drill.rounds + 1,
        bestAccuracy: Math.max(nextProfile.drill.bestAccuracy, drillAccuracy),
      },
    };
  }

  nextProfile = evaluateBadges(nextProfile);
  const newBadges = nextProfile.badges.filter(
    (badge) => !previousBadges.has(badge)
  );

  const nextProgress: KeyBlitzProgress = {
    ...progress,
    profiles: {
      ...progress.profiles,
      [progress.activeProfile]: nextProfile,
    },
  };

  saveProgress(nextProgress);
  return { progress: nextProgress, newBadges, records };
}

export function getWeakestKeys(profile: ProfileStats, count = 3): string[] {
  const keys = new Set([
    ...Object.keys(profile.keyErrors),
    ...Object.keys(profile.keyHits),
  ]);

  const ranked = [...keys]
    .map((key) => {
      const errors = profile.keyErrors[key] ?? 0;
      const hits = profile.keyHits[key] ?? 0;
      const total = errors + hits;
      const errorRate = total > 0 ? errors / total : 0;
      return { key, errors, errorRate, total };
    })
    .filter((entry) => entry.total > 0)
    .sort((a, b) => {
      if (b.errorRate !== a.errorRate) return b.errorRate - a.errorRate;
      return b.errors - a.errors;
    });

  if (ranked.length === 0) {
    return ["j", "k", "f"];
  }

  return ranked.slice(0, count).map((entry) => entry.key);
}

export function getKeyHeat(
  profile: ProfileStats,
  key: string
): { errorRate: number; total: number } {
  const errors = profile.keyErrors[key] ?? 0;
  const hits = profile.keyHits[key] ?? 0;
  const total = errors + hits;
  return {
    errorRate: total > 0 ? errors / total : 0,
    total,
  };
}

export type LeaderboardEntry = {
  name: string;
  bestWpm: number;
  bestWordDrop: number;
  bestSurvival: number;
  streak: number;
};

export function getFamilyLeaderboard(
  progress: KeyBlitzProgress
): LeaderboardEntry[] {
  return Object.entries(progress.profiles)
    .map(([name, stats]) => ({
      name,
      bestWpm: stats.classic.bestWpm,
      bestWordDrop: stats.wordDrop.bestScore,
      bestSurvival: stats.survival.bestScore,
      streak: stats.streak.count,
    }))
    .sort((a, b) => b.bestWpm - a.bestWpm);
}
