import {
  generateWordSequence,
  getWordsForLevel,
  pickRandomWord,
} from "@/lib/typing-words";

export const CLASSIC_DURATION_MS = 60_000;
export const DRILL_DURATION_MS = 30_000;
export const MAX_LIVES = 3;
export const CLASSIC_WORD_COUNT = 80;

export type TypingMode = "classic" | "worddrop" | "survival" | "drill";

export function calculateWpm(correctChars: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  const minutes = elapsedMs / 60_000;
  return Math.round((correctChars / 5) / minutes);
}

export function calculateAccuracy(correct: number, total: number): number {
  if (total <= 0) return 100;
  return Math.round((correct / total) * 100);
}

export function normalizeKey(key: string): string | null {
  if (key.length !== 1) return null;
  if (key === " ") return " ";
  const lower = key.toLowerCase();
  if (lower >= "a" && lower <= "z") return lower;
  if (key >= "0" && key <= "9") return key;
  if ([",", ".", ";", "'", "-", "/"].includes(key)) return key;
  return null;
}

export type ClassicRunState = {
  words: string[];
  wordIndex: number;
  charIndex: number;
  lives: number;
  correctChars: number;
  totalKeystrokes: number;
  mistakes: number;
  wordsCompleted: number;
  startedAt: number | null;
  endedAt: number | null;
  ghostProgress: number[];
};

export function createClassicRun(level: number): ClassicRunState {
  return {
    words: generateWordSequence(level, CLASSIC_WORD_COUNT),
    wordIndex: 0,
    charIndex: 0,
    lives: MAX_LIVES,
    correctChars: 0,
    totalKeystrokes: 0,
    mistakes: 0,
    wordsCompleted: 0,
    startedAt: null,
    endedAt: null,
    ghostProgress: [],
  };
}

export function getCurrentTarget(state: ClassicRunState): string {
  if (state.wordIndex >= state.words.length) return "";
  const word = state.words[state.wordIndex];
  return word[state.charIndex] ?? "";
}

export function getDisplayText(state: ClassicRunState): {
  completed: string;
  current: string;
  upcoming: string;
} {
  const currentWord = state.words[state.wordIndex] ?? "";
  const completedWords = state.words.slice(0, state.wordIndex).join(" ");
  const completedInWord = currentWord.slice(0, state.charIndex);
  const currentChar = currentWord[state.charIndex] ?? "";
  const upcomingInWord = currentWord.slice(state.charIndex + 1);
  const upcomingWords = state.words.slice(state.wordIndex + 1, state.wordIndex + 6).join(" ");

  const prefix = completedWords
    ? `${completedWords} ${completedInWord}`
    : completedInWord;

  return {
    completed: prefix,
    current: currentChar,
    upcoming: `${upcomingInWord}${upcomingWords ? ` ${upcomingWords}` : ""}`,
  };
}

export type ClassicKeystrokeResult = {
  state: ClassicRunState;
  correct: boolean;
  lifeLost: boolean;
  wordCompleted: boolean;
  finished: boolean;
};

export function applyClassicKeystroke(
  state: ClassicRunState,
  rawKey: string,
  now = Date.now()
): ClassicKeystrokeResult {
  const key = normalizeKey(rawKey);
  if (!key || state.endedAt !== null) {
    return {
      state,
      correct: false,
      lifeLost: false,
      wordCompleted: false,
      finished: state.endedAt !== null,
    };
  }

  let next: ClassicRunState = {
    ...state,
    totalKeystrokes: state.totalKeystrokes + 1,
    startedAt: state.startedAt ?? now,
  };

  const target = getCurrentTarget(next);
  if (!target) {
    return {
      state: { ...next, endedAt: next.endedAt ?? now },
      correct: false,
      lifeLost: false,
      wordCompleted: false,
      finished: true,
    };
  }

  const correct = key === target;
  let lifeLost = false;
  let wordCompleted = false;

  if (correct) {
    next = {
      ...next,
      correctChars: next.correctChars + 1,
      charIndex: next.charIndex + 1,
      ghostProgress: [...next.ghostProgress, next.correctChars],
    };

    const currentWord = next.words[next.wordIndex] ?? "";
    if (next.charIndex >= currentWord.length) {
      wordCompleted = true;
      next = {
        ...next,
        wordIndex: next.wordIndex + 1,
        charIndex: 0,
        wordsCompleted: next.wordsCompleted + 1,
      };

      if (next.wordIndex >= next.words.length) {
        next = { ...next, endedAt: now };
      }
    }
  } else {
    lifeLost = true;
    next = {
      ...next,
      mistakes: next.mistakes + 1,
      lives: Math.max(0, next.lives - 1),
    };
    if (next.lives <= 0) {
      next = { ...next, endedAt: now };
    }
  }

  const elapsed = now - (next.startedAt ?? now);
  if (next.endedAt === null && elapsed >= CLASSIC_DURATION_MS) {
    next = { ...next, endedAt: now };
  }

  return {
    state: next,
    correct,
    lifeLost,
    wordCompleted,
    finished: next.endedAt !== null,
  };
}

export function getClassicElapsedMs(state: ClassicRunState, now = Date.now()): number {
  if (!state.startedAt) return 0;
  const end = state.endedAt ?? now;
  return Math.min(end - state.startedAt, CLASSIC_DURATION_MS);
}

export function getClassicTimeLeftMs(state: ClassicRunState, now = Date.now()): number {
  return Math.max(0, CLASSIC_DURATION_MS - getClassicElapsedMs(state, now));
}

export type FallingWord = {
  id: string;
  word: string;
  x: number;
  y: number;
  speed: number;
  typedIndex: number;
};

export type WordDropState = {
  words: FallingWord[];
  activeId: string | null;
  lives: number;
  score: number;
  combo: number;
  bestCombo: number;
  level: number;
  mistakes: number;
  correctChars: number;
  totalKeystrokes: number;
  startedAt: number | null;
  endedAt: number | null;
  spawnTimer: number;
  nextId: number;
};

export const WORD_DROP_CANVAS_WIDTH = 640;
export const WORD_DROP_CANVAS_HEIGHT = 400;
export const WORD_DROP_DANGER_Y = 360;

export function createWordDropState(level: number): WordDropState {
  const firstWord = createFallingWord(0, level, 1);
  return {
    words: [firstWord],
    activeId: firstWord.id,
    lives: MAX_LIVES,
    score: 0,
    combo: 0,
    bestCombo: 0,
    level,
    mistakes: 0,
    correctChars: 0,
    totalKeystrokes: 0,
    startedAt: null,
    endedAt: null,
    spawnTimer: 0,
    nextId: 1,
  };
}

function createFallingWord(
  idNum: number,
  level: number,
  existingCount: number
): FallingWord {
  const margin = 60;
  const maxX = WORD_DROP_CANVAS_WIDTH - margin;
  return {
    id: `wd-${idNum}`,
    word: pickRandomWord(level + Math.min(2, Math.floor(existingCount / 5))),
    x: margin + Math.random() * (maxX - margin),
    y: -20 - Math.random() * 40,
    speed: 28 + level * 4 + Math.random() * 12,
    typedIndex: 0,
  };
}

export type WordDropTickResult = {
  state: WordDropState;
  wordMissed: boolean;
  lifeLost: boolean;
};

export function tickWordDrop(
  state: WordDropState,
  deltaMs: number,
  now = Date.now()
): WordDropTickResult {
  if (state.endedAt !== null) {
    return { state, wordMissed: false, lifeLost: false };
  }

  let next: WordDropState = {
    ...state,
    startedAt: state.startedAt ?? now,
    spawnTimer: state.spawnTimer + deltaMs,
  };

  const movedWords = next.words.map((word) => ({
    ...word,
    y: word.y + (word.speed * deltaMs) / 1000,
  }));

  const missed = movedWords.filter((word) => word.y >= WORD_DROP_DANGER_Y);
  let lifeLost = false;

  if (missed.length > 0) {
    lifeLost = true;
    const missedIds = new Set(missed.map((word) => word.id));
    const remaining = movedWords.filter((word) => !missedIds.has(word.id));
    next = {
      ...next,
      words: remaining,
      lives: Math.max(0, next.lives - missed.length),
      combo: 0,
      activeId:
        next.activeId && missedIds.has(next.activeId)
          ? remaining[0]?.id ?? null
          : next.activeId,
    };
    if (next.lives <= 0) {
      next = { ...next, endedAt: now };
    }
  } else {
    next = { ...next, words: movedWords };
  }

  const spawnInterval = Math.max(900 - next.level * 60, 450);
  if (next.spawnTimer >= spawnInterval) {
    const newWord = createFallingWord(next.nextId, next.level, next.words.length);
    next = {
      ...next,
      words: [...next.words, newWord],
      nextId: next.nextId + 1,
      spawnTimer: 0,
      activeId: next.activeId ?? newWord.id,
    };
  }

  return { state: next, wordMissed: missed.length > 0, lifeLost };
}

export type WordDropKeystrokeResult = {
  state: WordDropState;
  correct: boolean;
  lifeLost: boolean;
  wordCleared: boolean;
};

export function applyWordDropKeystroke(
  state: WordDropState,
  rawKey: string,
  now = Date.now()
): WordDropKeystrokeResult {
  const key = normalizeKey(rawKey);
  if (!key || state.endedAt !== null || !state.activeId) {
    return { state, correct: false, lifeLost: false, wordCleared: false };
  }

  let next: WordDropState = {
    ...state,
    totalKeystrokes: state.totalKeystrokes + 1,
    startedAt: state.startedAt ?? now,
  };

  const activeIndex = next.words.findIndex((word) => word.id === next.activeId);
  if (activeIndex < 0) {
    return { state: next, correct: false, lifeLost: false, wordCleared: false };
  }

  const active = next.words[activeIndex];
  const expected = active.word[active.typedIndex];
  const correct = key === expected;

  if (correct) {
    const typedIndex = active.typedIndex + 1;
    const updatedWord = { ...active, typedIndex };
    const words = [...next.words];
    words[activeIndex] = updatedWord;

    if (typedIndex >= active.word.length) {
      const combo = next.combo + 1;
      const comboBonus = Math.max(0, combo - 1);
      const points = 10 + comboBonus * 2;
      const remaining = words.filter((word) => word.id !== active.id);
      next = {
        ...next,
        words: remaining,
        activeId: remaining[0]?.id ?? null,
        score: next.score + points,
        combo,
        bestCombo: Math.max(next.bestCombo, combo),
        correctChars: next.correctChars + active.word.length,
      };
      return { state: next, correct: true, lifeLost: false, wordCleared: true };
    }

    next = {
      ...next,
      words,
      correctChars: next.correctChars + 1,
    };
    return { state: next, correct: true, lifeLost: false, wordCleared: false };
  }

  next = {
    ...next,
    lives: Math.max(0, next.lives - 1),
    combo: 0,
    mistakes: next.mistakes + 1,
  };
  if (next.lives <= 0) {
    next = { ...next, endedAt: now };
  }
  return { state: next, correct: false, lifeLost: true, wordCleared: false };
}

export type SurvivalState = {
  currentWord: string;
  typedIndex: number;
  lives: number;
  wordsCompleted: number;
  speedTier: number;
  level: number;
  mistakes: number;
  correctChars: number;
  totalKeystrokes: number;
  startedAt: number | null;
  endedAt: number | null;
};

export function createSurvivalState(level: number): SurvivalState {
  return {
    currentWord: pickRandomWord(level),
    typedIndex: 0,
    lives: MAX_LIVES,
    wordsCompleted: 0,
    speedTier: 1,
    level,
    mistakes: 0,
    correctChars: 0,
    totalKeystrokes: 0,
    startedAt: null,
    endedAt: null,
  };
}

export type SurvivalKeystrokeResult = {
  state: SurvivalState;
  correct: boolean;
  lifeLost: boolean;
  wordCompleted: boolean;
};

export function applySurvivalKeystroke(
  state: SurvivalState,
  rawKey: string,
  now = Date.now()
): SurvivalKeystrokeResult {
  const key = normalizeKey(rawKey);
  if (!key || state.endedAt !== null) {
    return {
      state,
      correct: false,
      lifeLost: false,
      wordCompleted: false,
    };
  }

  let next: SurvivalState = {
    ...state,
    totalKeystrokes: state.totalKeystrokes + 1,
    startedAt: state.startedAt ?? now,
  };

  const expected = next.currentWord[next.typedIndex];
  const correct = key === expected;

  if (correct) {
    const typedIndex = next.typedIndex + 1;
    if (typedIndex >= next.currentWord.length) {
      const wordsCompleted = next.wordsCompleted + 1;
      const speedTier = 1 + Math.floor(wordsCompleted / 10);
      next = {
        ...next,
        typedIndex: 0,
        wordsCompleted,
        speedTier,
        correctChars: next.correctChars + next.currentWord.length,
        currentWord: pickRandomWord(next.level, next.currentWord),
      };
      return {
        state: next,
        correct: true,
        lifeLost: false,
        wordCompleted: true,
      };
    }

    next = {
      ...next,
      typedIndex,
      correctChars: next.correctChars + 1,
    };
    return { state: next, correct: true, lifeLost: false, wordCompleted: false };
  }

  next = {
    ...next,
    mistakes: next.mistakes + 1,
    lives: Math.max(0, next.lives - 1),
  };
  if (next.lives <= 0) {
    next = { ...next, endedAt: now };
  }
  return { state: next, correct: false, lifeLost: true, wordCompleted: false };
}

export function getSurvivalElapsedMs(state: SurvivalState, now = Date.now()): number {
  if (!state.startedAt) return 0;
  const end = state.endedAt ?? now;
  return end - state.startedAt;
}

export function getSurvivalScore(state: SurvivalState, now = Date.now()): number {
  const seconds = Math.floor(getSurvivalElapsedMs(state, now) / 1000);
  return state.wordsCompleted * 15 + seconds * 2 + state.speedTier * 10;
}

export type DrillState = {
  patterns: string[];
  patternIndex: number;
  charIndex: number;
  targetKeys: string[];
  keyAttempts: Record<string, { correct: number; total: number }>;
  lives: number;
  mistakes: number;
  correctChars: number;
  totalKeystrokes: number;
  startedAt: number | null;
  endedAt: number | null;
};

export function createDrillState(patterns: string[], targetKeys: string[]): DrillState {
  return {
    patterns,
    patternIndex: 0,
    charIndex: 0,
    targetKeys,
    keyAttempts: Object.fromEntries(
      targetKeys.map((key) => [key, { correct: 0, total: 0 }])
    ),
    lives: MAX_LIVES,
    mistakes: 0,
    correctChars: 0,
    totalKeystrokes: 0,
    startedAt: null,
    endedAt: null,
  };
}

export function getDrillText(state: DrillState): string {
  return state.patterns[state.patternIndex] ?? "";
}

export type DrillKeystrokeResult = {
  state: DrillState;
  correct: boolean;
  lifeLost: boolean;
  patternCompleted: boolean;
  finished: boolean;
};

export function applyDrillKeystroke(
  state: DrillState,
  rawKey: string,
  now = Date.now()
): DrillKeystrokeResult {
  const key = normalizeKey(rawKey);
  if (!key || state.endedAt !== null) {
    return {
      state,
      correct: false,
      lifeLost: false,
      patternCompleted: false,
      finished: state.endedAt !== null,
    };
  }

  let next: DrillState = {
    ...state,
    totalKeystrokes: state.totalKeystrokes + 1,
    startedAt: state.startedAt ?? now,
  };

  const text = getDrillText(next);
  const expected = text[next.charIndex];
  if (!expected) {
    return {
      state: { ...next, endedAt: next.endedAt ?? now },
      correct: false,
      lifeLost: false,
      patternCompleted: false,
      finished: true,
    };
  }

  const correct = key === expected;
  const trackKey = expected.toLowerCase();
  const attempts = next.keyAttempts[trackKey] ?? { correct: 0, total: 0 };

  if (correct) {
    next = {
      ...next,
      charIndex: next.charIndex + 1,
      correctChars: next.correctChars + 1,
      keyAttempts: {
        ...next.keyAttempts,
        [trackKey]: {
          correct: attempts.correct + 1,
          total: attempts.total + 1,
        },
      },
    };

    if (next.charIndex >= text.length) {
      const patternCompleted = true;
      if (next.patternIndex + 1 >= next.patterns.length) {
        next = { ...next, endedAt: now };
        return {
          state: next,
          correct: true,
          lifeLost: false,
          patternCompleted,
          finished: true,
        };
      }
      next = {
        ...next,
        patternIndex: next.patternIndex + 1,
        charIndex: 0,
      };
      return {
        state: next,
        correct: true,
        lifeLost: false,
        patternCompleted,
        finished: false,
      };
    }

    return {
      state: next,
      correct: true,
      lifeLost: false,
      patternCompleted: false,
      finished: false,
    };
  }

  next = {
    ...next,
    mistakes: next.mistakes + 1,
    lives: Math.max(0, next.lives - 1),
    keyAttempts: {
      ...next.keyAttempts,
      [trackKey]: {
        correct: attempts.correct,
        total: attempts.total + 1,
      },
    },
  };
  if (next.lives <= 0) {
    next = { ...next, endedAt: now };
  }

  const elapsed = now - (next.startedAt ?? now);
  if (next.endedAt === null && elapsed >= DRILL_DURATION_MS) {
    next = { ...next, endedAt: now };
  }

  return {
    state: next,
    correct: false,
    lifeLost: true,
    patternCompleted: false,
    finished: next.endedAt !== null,
  };
}

export function getDrillElapsedMs(state: DrillState, now = Date.now()): number {
  if (!state.startedAt) return 0;
  const end = state.endedAt ?? now;
  return Math.min(end - state.startedAt, DRILL_DURATION_MS);
}

export function getDrillTimeLeftMs(state: DrillState, now = Date.now()): number {
  return Math.max(0, DRILL_DURATION_MS - getDrillElapsedMs(state, now));
}
