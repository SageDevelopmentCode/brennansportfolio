export const PROGRESS_STORAGE_KEY = "spell-sound-progress";

export const MASTERY_STREAK = 3;

export type WordStat = {
  correct: number;
  attempts: number;
  streak: number;
  mastered: boolean;
  lastCorrect: boolean | null;
};

export type SpellingProgress = {
  totalCorrect: number;
  totalAttempts: number;
  words: Record<string, WordStat>;
};

const DEFAULT_WORD_STAT: WordStat = {
  correct: 0,
  attempts: 0,
  streak: 0,
  mastered: false,
  lastCorrect: null,
};

const DEFAULT_PROGRESS: SpellingProgress = {
  totalCorrect: 0,
  totalAttempts: 0,
  words: {},
};

export function loadProgress(): SpellingProgress {
  if (typeof window === "undefined") return DEFAULT_PROGRESS;

  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<SpellingProgress>;
    return {
      totalCorrect: parsed.totalCorrect ?? 0,
      totalAttempts: parsed.totalAttempts ?? 0,
      words: parsed.words ?? {},
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export function saveProgress(progress: SpellingProgress): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
}

export function getWordStat(
  progress: SpellingProgress,
  wordId: string
): WordStat {
  return progress.words[wordId] ?? DEFAULT_WORD_STAT;
}

export function recordAttempt(
  progress: SpellingProgress,
  wordId: string,
  correct: boolean
): SpellingProgress {
  const existing = getWordStat(progress, wordId);
  const streak = correct ? existing.streak + 1 : 0;
  const mastered =
    existing.mastered || (correct && streak >= MASTERY_STREAK);

  const updatedStat: WordStat = {
    correct: existing.correct + (correct ? 1 : 0),
    attempts: existing.attempts + 1,
    streak,
    mastered,
    lastCorrect: correct,
  };

  const updated: SpellingProgress = {
    totalAttempts: progress.totalAttempts + 1,
    totalCorrect: progress.totalCorrect + (correct ? 1 : 0),
    words: {
      ...progress.words,
      [wordId]: updatedStat,
    },
  };

  saveProgress(updated);
  return updated;
}

export function countMasteredInUnit(
  progress: SpellingProgress,
  wordIds: string[]
): number {
  return wordIds.filter((id) => getWordStat(progress, id).mastered).length;
}

export const CELEBRATION_MESSAGES = [
  "Nice spelling!",
  "Got it!",
  "Perfect!",
  "You nailed it!",
  "Word wizard!",
  "Keep going!",
  "Sharp!",
  "Crushed it!",
];

export function getCelebrationMessage(): string {
  return CELEBRATION_MESSAGES[
    Math.floor(Math.random() * CELEBRATION_MESSAGES.length)
  ];
}

export function speakWord(word: string): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.rate = 0.92;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}
