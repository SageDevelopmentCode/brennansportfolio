export type LevelConfig = {
  level: number;
  label: string;
  words: string[];
  unlockWpm: number;
  unlockAccuracy: number;
};

export const LEVEL_CONFIGS: LevelConfig[] = [
  {
    level: 1,
    label: "Home Row",
    words: [
      "the", "and", "for", "are", "but", "not", "you", "all", "can", "had",
      "her", "was", "one", "our", "out", "day", "get", "has", "him", "his",
      "how", "its", "may", "new", "now", "old", "see", "two", "way", "who",
    ],
    unlockWpm: 0,
    unlockAccuracy: 0,
  },
  {
    level: 2,
    label: "Quick Keys",
    words: [
      "fast", "keys", "type", "word", "play", "game", "jump", "blue", "fire",
      "cool", "dash", "glow", "neon", "race", "beat", "best", "bold", "brag",
      "chip", "clip", "code", "deft", "drip", "flip", "flow", "funk", "glad",
    ],
    unlockWpm: 20,
    unlockAccuracy: 90,
  },
  {
    level: 3,
    label: "Speed Bump",
    words: [
      "quick", "brown", "foxes", "jumps", "laser", "blaze", "storm", "flash",
      "spark", "crisp", "swift", "brisk", "sharp", "punch", "boost", "turbo",
      "hyper", "sonic", "pixel", "ninja", "rocket", "comet", "orbit", "pulse",
    ],
    unlockWpm: 30,
    unlockAccuracy: 91,
  },
  {
    level: 4,
    label: "Five Star",
    words: [
      "apple", "brave", "candy", "dance", "eagle", "flame", "grape", "happy",
      "ivory", "jolly", "karma", "lemon", "magic", "noble", "ocean", "piano",
      "queen", "river", "sunny", "tiger", "ultra", "vivid", "witty", "yacht",
    ],
    unlockWpm: 35,
    unlockAccuracy: 92,
  },
  {
    level: 5,
    label: "Combo Pack",
    words: [
      "blitz", "champ", "drift", "elite", "frost", "ghost", "haven", "index",
      "joust", "knack", "lunar", "mirth", "nexus", "oxide", "prism", "quirk",
      "realm", "snare", "trace", "vault", "whirl", "xenon", "yield", "zesty",
    ],
    unlockWpm: 40,
    unlockAccuracy: 93,
  },
  {
    level: 6,
    label: "Tricky Bits",
    words: [
      "queue", "rhythm", "glyph", "lynch", "nymph", "psych", "synch", "wrath",
      "fjord", "knoll", "waltz", "yacht", "blitz", "crwth", "dwarf", "fjeld",
      "gawky", "hokey", "inbox", "jazzy", "kayak", "livid", "muzzy", "ninja",
    ],
    unlockWpm: 45,
    unlockAccuracy: 94,
  },
  {
    level: 7,
    label: "Blitz Master",
    words: [
      "velocity", "keyboard", "lightning", "champion", "practice", "accuracy",
      "blizzard", "catalyst", "dynamite", "electric", "firework", "galaxy",
      "hurricane", "infinity", "jubilant", "kinetic", "luminous", "momentum",
      "nebula", "overdrive", "phoenix", "quantum", "radiant", "stellar",
    ],
    unlockWpm: 50,
    unlockAccuracy: 95,
  },
];

export const MAX_LEVEL = LEVEL_CONFIGS.length;

/** Maps player age to a recommended starting difficulty (levels 1–7). */
export function getDifficultyLevelForAge(age: number): number {
  const clampedAge = Math.min(Math.max(Math.round(age), 5), 99);
  if (clampedAge <= 6) return 1;
  if (clampedAge <= 8) return 2;
  if (clampedAge <= 10) return 3;
  if (clampedAge <= 12) return 4;
  if (clampedAge <= 14) return 5;
  if (clampedAge <= 16) return 6;
  return 7;
}

export function getAgeDifficultyDescription(age: number): string {
  const level = getDifficultyLevelForAge(age);
  const config = getLevelConfig(level);
  return `Age ${age} → Level ${level} (${config.label})`;
}

export function getLevelConfig(level: number): LevelConfig {
  const clamped = Math.min(Math.max(level, 1), MAX_LEVEL);
  return LEVEL_CONFIGS[clamped - 1];
}

export function getWordsForLevel(level: number): string[] {
  return getLevelConfig(level).words;
}

export function pickRandomWord(level: number, exclude?: string): string {
  const pool = getWordsForLevel(level);
  if (pool.length === 0) return "type";

  let word = pool[Math.floor(Math.random() * pool.length)];
  if (exclude && pool.length > 1) {
    let attempts = 0;
    while (word === exclude && attempts < 8) {
      word = pool[Math.floor(Math.random() * pool.length)];
      attempts += 1;
    }
  }
  return word;
}

export function generateWordSequence(level: number, count: number): string[] {
  const sequence: string[] = [];
  for (let i = 0; i < count; i += 1) {
    sequence.push(pickRandomWord(level, sequence[sequence.length - 1]));
  }
  return sequence;
}

export function getNextLevel(
  currentLevel: number,
  wpm: number,
  accuracy: number
): number {
  if (currentLevel >= MAX_LEVEL) return MAX_LEVEL;

  const next = getLevelConfig(currentLevel + 1);
  if (wpm >= next.unlockWpm && accuracy >= next.unlockAccuracy) {
    return currentLevel + 1;
  }
  return currentLevel;
}

export function getDrillPatternsForKeys(keys: string[]): string[] {
  const normalized = keys
    .map((key) => key.toLowerCase())
    .filter((key) => key.length === 1);

  if (normalized.length === 0) {
    return ["fjf jfj fjf", "dkd kdk dkd", "sls lsl sls"];
  }

  const vowels = ["a", "e", "i", "o", "u"];
  return normalized.map((key) => {
    const vowel = vowels[Math.floor(Math.random() * vowels.length)];
    const left = String.fromCharCode(
      97 + Math.floor(Math.random() * 26)
    );
    const right = String.fromCharCode(
      97 + Math.floor(Math.random() * 26)
    );
    const chunk = `${left}${key}${vowel}${right}${key}`;
    return `${chunk} ${chunk} ${key}${vowel}${key}`;
  });
}
