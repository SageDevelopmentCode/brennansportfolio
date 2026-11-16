export type GrammarMatch = {
  offset: number;
  length: number;
  message: string;
  replacements: string[];
};

export type GrammarCheckResult =
  | { ok: true; text: string; changes: number }
  | { ok: false; text: string; error: string };

/** Apply LanguageTool replacements from end to start so offsets stay valid. */
export function applyGrammarMatches(text: string, matches: GrammarMatch[]): { text: string; changes: number } {
  const applicable = matches.filter((match) => match.replacements.length > 0);
  if (applicable.length === 0) return { text, changes: 0 };

  const sorted = [...applicable].sort((a, b) => b.offset - a.offset);
  let result = text;
  let changes = 0;

  for (const match of sorted) {
    const replacement = match.replacements[0];
    if (replacement === undefined) continue;
    const before = result.slice(match.offset, match.offset + match.length);
    if (before === replacement) continue;
    result = result.slice(0, match.offset) + replacement + result.slice(match.offset + match.length);
    changes += 1;
  }

  return { text: result, changes };
}

export async function fixNoteGrammar(text: string): Promise<GrammarCheckResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, text: trimmed, error: "Note is empty." };
  }

  try {
    const response = await fetch("/api/bible/note-grammar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: trimmed }),
    });

    if (!response.ok) {
      return {
        ok: false,
        text: trimmed,
        error: "Grammar check is unavailable right now.",
      };
    }

    const data = (await response.json()) as {
      text?: string;
      changes?: number;
      error?: string;
    };

    if (typeof data.text === "string") {
      return { ok: true, text: data.text, changes: data.changes ?? 0 };
    }

    return {
      ok: false,
      text: trimmed,
      error: data.error ?? "Grammar check failed.",
    };
  } catch {
    return {
      ok: false,
      text: trimmed,
      error: "Grammar check could not run.",
    };
  }
}
