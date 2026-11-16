import { applyGrammarMatches, type GrammarMatch } from "@/lib/note-grammar";
import { NextResponse } from "next/server";

const LANGUAGE_TOOL = "https://api.languagetool.org/v2/check";
const MAX_CHARS = 4000;

type LanguageToolMatch = {
  offset: number;
  length: number;
  message: string;
  replacements: { value: string }[];
  rule?: { issueType?: string; id?: string };
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const text = typeof (body as { text?: unknown }).text === "string" ? (body as { text: string }).text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "Text is required." }, { status: 400 });
  }
  if (text.length > MAX_CHARS) {
    return NextResponse.json({ error: "Note is too long to check." }, { status: 400 });
  }

  const params = new URLSearchParams({
    text,
    language: "en-US",
    enabledOnly: "false",
  });

  let remote: Response;
  try {
    remote = await fetch(LANGUAGE_TOOL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    return NextResponse.json({ error: "Grammar service unreachable." }, { status: 502 });
  }

  if (!remote.ok) {
    return NextResponse.json({ error: "Grammar service error." }, { status: 502 });
  }

  let payload: { matches?: LanguageToolMatch[] };
  try {
    payload = await remote.json();
  } catch {
    return NextResponse.json({ error: "Invalid grammar service response." }, { status: 502 });
  }

  const rawMatches = Array.isArray(payload.matches) ? payload.matches : [];
  const matches: GrammarMatch[] = rawMatches
    .filter((match) => {
      if (match.rule?.issueType === "style") return false;
      return match.replacements?.length > 0;
    })
    .map((match) => ({
      offset: match.offset,
      length: match.length,
      message: match.message,
      replacements: match.replacements.map((row) => row.value),
    }));

  const { text: fixed, changes } = applyGrammarMatches(text, matches);

  return NextResponse.json({ text: fixed, changes });
}
