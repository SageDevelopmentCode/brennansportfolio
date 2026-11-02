/** Split user text into normalized word tokens for dictionary lookup. */
export function tokenizeEnglish(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  return trimmed
    .split(/\s+/)
    .map((chunk) => chunk.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, "").toLowerCase())
    .filter((word) => word.length > 0);
}
