export type SpellingWord = {
  id: string;
  text: string;
  hint?: string;
};

export type SpellingUnit = {
  id: string;
  grade: number;
  title: string;
  description: string;
  words: SpellingWord[];
};

const GRADE_6_UNITS: SpellingUnit[] = [
  {
    id: "g6-tion",
    grade: 6,
    title: "Unit 1: -tion & -sion",
    description: "Words ending in -tion, -sion, and -cian",
    words: [
      { id: "g6-tion-1", text: "accommodation" },
      { id: "g6-tion-2", text: "appreciation" },
      { id: "g6-tion-3", text: "concentration" },
      { id: "g6-tion-4", text: "discussion" },
      { id: "g6-tion-5", text: "expansion" },
      { id: "g6-tion-6", text: "extension" },
      { id: "g6-tion-7", text: "impression" },
      { id: "g6-tion-8", text: "musician" },
      { id: "g6-tion-9", text: "occasion" },
      { id: "g6-tion-10", text: "permission" },
      { id: "g6-tion-11", text: "profession" },
      { id: "g6-tion-12", text: "recommendation" },
      { id: "g6-tion-13", text: "suspicion" },
      { id: "g6-tion-14", text: "technician" },
      { id: "g6-tion-15", text: "transmission" },
      { id: "g6-tion-16", text: "vision" },
    ],
  },
  {
    id: "g6-double",
    grade: 6,
    title: "Unit 2: Double letters",
    description: "Consonants that double up in the middle or end",
    words: [
      { id: "g6-double-1", text: "address" },
      { id: "g6-double-2", text: "committee" },
      { id: "g6-double-3", text: "embarrass" },
      { id: "g6-double-4", text: "exaggerate" },
      { id: "g6-double-5", text: "immediately" },
      { id: "g6-double-6", text: "necessary" },
      { id: "g6-double-7", text: "occurrence" },
      { id: "g6-double-8", text: "parallel" },
      { id: "g6-double-9", text: "possession" },
      { id: "g6-double-10", text: "recommend" },
      { id: "g6-double-11", text: "successful" },
      { id: "g6-double-12", text: "tomorrow" },
      { id: "g6-double-13", text: "unnecessary" },
      { id: "g6-double-14", text: "vacuum" },
      { id: "g6-double-15", text: "written" },
    ],
  },
  {
    id: "g6-silent",
    grade: 6,
    title: "Unit 3: Tricky vowels",
    description: "Silent letters and irregular vowel sounds",
    words: [
      { id: "g6-silent-1", text: "achieve" },
      { id: "g6-silent-2", text: "ancient" },
      { id: "g6-silent-3", text: "believable" },
      { id: "g6-silent-4", text: "column" },
      { id: "g6-silent-5", text: "foreign" },
      { id: "g6-silent-6", text: "guarantee" },
      { id: "g6-silent-7", text: "height" },
      { id: "g6-silent-8", text: "knowledge" },
      { id: "g6-silent-9", text: "neighbor" },
      { id: "g6-silent-10", text: "rhythm" },
      { id: "g6-silent-11", text: "schedule" },
      { id: "g6-silent-12", text: "separate" },
      { id: "g6-silent-13", text: "surprise" },
      { id: "g6-silent-14", text: "temperature" },
      { id: "g6-silent-15", text: "weird" },
    ],
  },
  {
    id: "g6-prefix",
    grade: 6,
    title: "Unit 4: Prefixes & roots",
    description: "Words built from common prefixes and roots",
    words: [
      { id: "g6-prefix-1", text: "anticipate" },
      { id: "g6-prefix-2", text: "circumstance" },
      { id: "g6-prefix-3", text: "consequence" },
      { id: "g6-prefix-4", text: "deceive" },
      { id: "g6-prefix-5", text: "disappear" },
      { id: "g6-prefix-6", text: "especially" },
      { id: "g6-prefix-7", text: "interrupt" },
      { id: "g6-prefix-8", text: "misunderstand" },
      { id: "g6-prefix-9", text: "preparation" },
      { id: "g6-prefix-10", text: "recognize" },
      { id: "g6-prefix-11", text: "responsible" },
      { id: "g6-prefix-12", text: "submarine" },
      { id: "g6-prefix-13", text: "transportation" },
      { id: "g6-prefix-14", text: "uncomfortable" },
      { id: "g6-prefix-15", text: "unfortunately" },
    ],
  },
  {
    id: "g6-challenge",
    grade: 6,
    title: "Unit 5: Challenge list",
    description: "Longer words and tough spellings",
    words: [
      { id: "g6-challenge-1", text: "approximately" },
      { id: "g6-challenge-2", text: "catastrophe" },
      { id: "g6-challenge-3", text: "conscientious" },
      { id: "g6-challenge-4", text: "environment" },
      { id: "g6-challenge-5", text: "extraordinary" },
      { id: "g6-challenge-6", text: "independence" },
      { id: "g6-challenge-7", text: "maintenance" },
      { id: "g6-challenge-8", text: "pronunciation" },
      { id: "g6-challenge-9", text: "questionnaire" },
      { id: "g6-challenge-10", text: "refrigerator" },
      { id: "g6-challenge-11", text: "significance" },
      { id: "g6-challenge-12", text: "sophisticated" },
      { id: "g6-challenge-13", text: "accomplishment" },
      { id: "g6-challenge-14", text: "thoroughly" },
      { id: "g6-challenge-15", text: "unbelievable" },
    ],
  },
];

export const SPELLING_LISTS: Record<number, SpellingUnit[]> = {
  6: GRADE_6_UNITS,
};

export const DEFAULT_GRADE = 6;

export function getUnitsForGrade(grade: number): SpellingUnit[] {
  return SPELLING_LISTS[grade] ?? [];
}

export function getUnitById(unitId: string): SpellingUnit | undefined {
  for (const units of Object.values(SPELLING_LISTS)) {
    const found = units.find((u) => u.id === unitId);
    if (found) return found;
  }
  return undefined;
}

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pickSessionWords(unitId: string): SpellingWord[] {
  const unit = getUnitById(unitId);
  if (!unit) return [];
  return shuffle(unit.words);
}

export function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase();
}

export function answersMatch(typed: string, word: string): boolean {
  return normalizeAnswer(typed) === normalizeAnswer(word);
}
