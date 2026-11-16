/**
 * Normalize verse text for recall comparison (whitespace, case, unicode).
 */
export function normalizeForRecall(text: string): string {
  const collapsed = text
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
  return collapsed;
}

/**
 * Keep letters (Unicode), digits, and spaces only — drops punctuation so
 * "God," and "God" compare equal after normalization.
 */
function lettersDigitsAndSpaces(text: string): string {
  return text.replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();
}

/**
 * Words as split from normalized letter/digit-only text (punctuation stripped).
 */
export function tokenizeForRecall(text: string): string[] {
  const collapsed = lettersDigitsAndSpaces(normalizeForRecall(text));
  if (!collapsed.length) return [];
  return collapsed.split(" ");
}

/** Split like the memorize UI: whitespace-separated tokens (punctuation stays on words). */
function splitDisplayWords(text: string): string[] {
  return text.normalize("NFC").trim().split(/\s+/).filter(Boolean);
}

/**
 * Classic Levenshtein distance for short strings.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const row = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) row[j] = j;
  for (let i = 1; i <= m; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const insert = row[j - 1] + 1;
      const del = row[j] + 1;
      const sub =
        previous + (a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1);
      previous = row[j];
      row[j] = Math.min(insert, del, sub);
    }
  }
  return row[n]!;
}

/**
 * True when typed text matches expected verse after normalization and
 * punctuation-insensitive compare.
 */
export function isRecallMatch(typed: string, expected: string): boolean {
  const a = lettersDigitsAndSpaces(normalizeForRecall(typed));
  const b = lettersDigitsAndSpaces(normalizeForRecall(expected));
  return a.length > 0 && a === b;
}

export type RecallFuzzyOptions = {
  /** Max edits allowed per word (default 2). */
  maxPerWord?: number;
  /** Max sum of per-word distances (default scales with word count). */
  maxTotal?: number;
};

export type RecallFuzzyResult = { ok: true } | { ok: false; reason: "empty" | "mismatch" };

/**
 * Close spelling: same word count as expected; each word within maxPerWord
 * edits; total edits capped by maxTotal. Exact match handled by isRecallMatch first.
 */
export function isRecallMatchFuzzy(
  typed: string,
  expected: string,
  options?: RecallFuzzyOptions,
): RecallFuzzyResult {
  const maxPerWord = options?.maxPerWord ?? 2;
  const typedTokens = tokenizeForRecall(typed);
  const expectedTokens = tokenizeForRecall(expected);
  if (!typedTokens.length) {
    return { ok: false, reason: "empty" };
  }
  if (typedTokens.length !== expectedTokens.length) {
    return { ok: false, reason: "mismatch" };
  }
  const n = typedTokens.length;
  const defaultMaxTotal = Math.min(12, Math.max(3, n * 2));
  const maxTotal = options?.maxTotal ?? defaultMaxTotal;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const d = levenshtein(typedTokens[i]!, expectedTokens[i]!);
    if (d > maxPerWord) {
      return { ok: false, reason: "mismatch" };
    }
    sum += d;
    if (sum > maxTotal) {
      return { ok: false, reason: "mismatch" };
    }
  }
  return { ok: true };
}

export type CorrectSpellingResult =
  | { text: string; changed: boolean }
  | { text: null; error: "word_count_mismatch" };

const FIX_SPELLING_MAX_DISTANCE = 2;

/**
 * When typed and expected have the same word count, replace words that are
 * within FIX_SPELLING_MAX_DISTANCE of the expected with the verse wording.
 */
export function correctSpellingTowardExpected(
  typed: string,
  expected: string,
): CorrectSpellingResult {
  const typedRaw = splitDisplayWords(typed);
  const expectedRaw = splitDisplayWords(expected);
  if (typedRaw.length !== expectedRaw.length) {
    return { text: null, error: "word_count_mismatch" };
  }
  const typedNorm = typedRaw.map((word) =>
    lettersDigitsAndSpaces(normalizeForRecall(word)),
  );
  const expectedNorm = expectedRaw.map((word) =>
    lettersDigitsAndSpaces(normalizeForRecall(word)),
  );
  let changed = false;
  const out: string[] = [];
  for (let i = 0; i < typedRaw.length; i++) {
    const tn = typedNorm[i]!;
    const en = expectedNorm[i]!;
    const tr = typedRaw[i]!;
    const er = expectedRaw[i]!;
    if (levenshtein(tn, en) <= FIX_SPELLING_MAX_DISTANCE) {
      if (tr !== er) changed = true;
      out.push(er);
    } else {
      out.push(tr);
    }
  }
  return { text: out.join(" "), changed };
}
