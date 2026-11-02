import {
  fingerspellImageSrc,
  lookupDictionaryWord,
  wordSignImageSrc,
} from "@/lib/asl/dictionary";
import type { SignSequenceResult, SignToken } from "@/lib/asl/types";
import { tokenizeEnglish } from "@/lib/asl/tokenize";

function collectSkippedChars(raw: string): string[] {
  const skipped = new Set<string>();
  for (const char of raw) {
    if (/[a-z]/i.test(char)) continue;
    if (/\s/.test(char)) continue;
    skipped.add(char);
  }
  return [...skipped];
}

function fingerspellWord(word: string): SignToken[] {
  const tokens: SignToken[] = [];
  for (const char of word) {
    if (!/[a-z]/.test(char)) continue;
    const letter = char.toLowerCase();
    tokens.push({
      kind: "letter",
      gloss: letter.toUpperCase(),
      imageSrc: fingerspellImageSrc(letter),
      poseId: letter,
    });
  }
  return tokens;
}

export function textToSignSequence(text: string): SignSequenceResult {
  const words = tokenizeEnglish(text);
  const skippedChars = collectSkippedChars(text);
  const tokens: SignToken[] = [];

  for (const word of words) {
    const entry = lookupDictionaryWord(word);
    if (entry) {
      tokens.push({
        kind: "word",
        gloss: entry.gloss,
        imageSrc: wordSignImageSrc(entry.imageId),
        poseId: entry.imageId,
      });
    } else {
      tokens.push(...fingerspellWord(word));
    }
  }

  return { tokens, skippedChars };
}
