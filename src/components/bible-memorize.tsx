"use client";

import {
  correctSpellingTowardExpected,
  isRecallMatch,
  isRecallMatchFuzzy,
} from "@/lib/bible-recall";
import {
  countDue,
  gradeMemoryVerse,
  practiceOrder,
  removeMemoryVerse,
  reviewLabel,
  streakLabel,
  type MemoryVerse,
} from "@/lib/bible-memory";
import { BiblePreferences } from "@/components/bible-preferences";
import { useBibleSettings, useMemoryVerses } from "@/components/use-bible-settings";
import { BibleAlert, BibleCopyright, scriptureStyle } from "@/components/bible-ui";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
  useState,
  type KeyboardEvent,
} from "react";

const TRAIL_LEN = 10;

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

type SpeechRecognitionResultEventLike = {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
};

type SpeechRecognitionResultListLike = {
  readonly length: number;
  [index: number]: { readonly isFinal: boolean; readonly 0: { readonly transcript: string } };
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window &
    typeof globalThis & {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function joinWithSpace(a: string, b: string): string {
  if (!a) return b;
  if (!b) return a;
  const needsSpace = !/\s$/.test(a) && !/^\s/.test(b);
  return needsSpace ? `${a} ${b}` : `${a}${b}`;
}

function verseWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

export function BibleMemorize() {
  const { settings, ready, update } = useBibleSettings();
  const verses = useMemoryVerses();
  const [queue, setQueue] = useState<string[] | null>(null);
  const [round, setRound] = useState(0);
  const [revealState, setRevealState] = useState<{
    id: string | null;
    round: number;
    revealed: boolean[];
  }>({ id: null, round: 0, revealed: [] });
  const [peekedThisVerse, setPeekedThisVerse] = useState(false);
  const [trailPosition, setTrailPosition] = useState(0);
  const [trailGoalReached, setTrailGoalReached] = useState(false);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [typedRecall, setTypedRecall] = useState("");
  const [recallError, setRecallError] = useState<string | null>(null);
  const [recallFocused, setRecallFocused] = useState(false);
  const [dictating, setDictating] = useState(false);
  const speechAvailable = useSyncExternalStore(
    () => () => {},
    () => getSpeechRecognitionCtor() !== null,
    () => false,
  );
  const [speechError, setSpeechError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const dictationCommittedRef = useRef("");
  const dictationInterimRef = useRef("");
  const blurTimeoutRef = useRef<number | null>(null);
  const dictatingRef = useRef(false);

  const syncDictating = useCallback((value: boolean) => {
    dictatingRef.current = value;
    setDictating(value);
  }, []);

  const stopDictation = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* noop */
    }
    recognitionRef.current = null;
    syncDictating(false);
  }, [syncDictating]);

  const currentId = queue?.[0] ?? null;
  const current = verses.find((verse) => verse.id === currentId) ?? null;
  const words = current ? verseWords(current.text) : [];
  const revealed =
    revealState.id === currentId && revealState.round === round ? revealState.revealed : [];

  /** Hide word blanks (not peek buttons) while the user is typing or dictating */
  const hideVerseWhileRecalling = recallFocused || dictating;
  const revealedAll =
    words.length > 0 && revealed.length === words.length && revealed.every(Boolean);
  const showVerseBlanks = !hideVerseWhileRecalling || revealedAll;
  const showVerseCopyright = !hideVerseWhileRecalling || revealedAll;

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
      try {
        recognitionRef.current?.stop();
      } catch {
        /* noop */
      }
      recognitionRef.current = null;
    };
  }, []);

  function resetTrail() {
    setTrailPosition(0);
    setTrailGoalReached(false);
  }

  function revealWords(next: boolean[]) {
    if (next.some(Boolean)) {
      setPeekedThisVerse(true);
    }
    setRevealState({ id: currentId, round, revealed: next });
  }

  function clearRecallInput() {
    stopDictation();
    setTypedRecall("");
    setRecallError(null);
    setRecallFocused(false);
    setSpeechError(null);
  }

  function start(mode: "due" | "all" | MemoryVerse) {
    const next = mode === "due" || mode === "all" ? practiceOrder(verses, mode) : [mode];
    setQueue(next.map((verse) => verse.id));
    setRound((value) => value + 1);
    resetTrail();
    setPeekedThisVerse(false);
    clearRecallInput();
    setActionError(null);
  }

  function exitPractice() {
    setQueue(null);
    resetTrail();
    setPeekedThisVerse(false);
    clearRecallInput();
  }

  function trySubmitRecall() {
    if (!current) return;
    const exact = isRecallMatch(typedRecall, current.text);
    const fuzzy = !exact && isRecallMatchFuzzy(typedRecall, current.text).ok;
    if (exact || fuzzy) {
      grade("good");
    } else {
      setRecallError("Not quite — try again, Fix spelling, or tap Still learning.");
    }
  }

  function applyFixSpelling() {
    if (!current) return;
    const result = correctSpellingTowardExpected(typedRecall, current.text);
    if (result.text === null) {
      setRecallError(
        "Word count doesn’t match the verse — adjust spacing or words first, then try Fix spelling again.",
      );
      return;
    }
    setTypedRecall(result.text);
    setRecallError(null);
  }

  function toggleDictation() {
    if (!speechAvailable) return;
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    if (dictatingRef.current) {
      stopDictation();
      setSpeechError(null);
      return;
    }
    setSpeechError(null);
    dictationCommittedRef.current = typedRecall;
    dictationInterimRef.current = "";
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = typeof navigator !== "undefined" ? navigator.language || "en-US" : "en-US";
    rec.onresult = (event: SpeechRecognitionResultEventLike) => {
      const { results, resultIndex } = event;
      let committed = dictationCommittedRef.current;
      let interim = "";
      for (let i = resultIndex; i < results.length; i++) {
        const alt = results[i]![0]!.transcript;
        if (results[i]!.isFinal) {
          committed = joinWithSpace(committed, alt);
        } else {
          interim = joinWithSpace(interim, alt);
        }
      }
      dictationCommittedRef.current = committed;
      dictationInterimRef.current = interim;
      setTypedRecall(joinWithSpace(committed, interim));
      if (recallError) setRecallError(null);
    };
    rec.onerror = (event: { error: string }) => {
      setSpeechError(event.error === "not-allowed" ? "Mic permission denied." : "Voice input error.");
      syncDictating(false);
      recognitionRef.current = null;
    };
    rec.onend = () => {
      syncDictating(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = rec;
    try {
      rec.start();
      syncDictating(true);
    } catch {
      setSpeechError("Could not start the microphone.");
      syncDictating(false);
      recognitionRef.current = null;
    }
  }

  function onRecallKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || (!event.metaKey && !event.ctrlKey)) return;
    event.preventDefault();
    trySubmitRecall();
  }

  function grade(result: "good" | "again") {
    const id = queue?.[0];
    if (!id) return;
    const usedPeek = peekedThisVerse;
    try {
      gradeMemoryVerse(id, result);
      if (result === "good" && !usedPeek && trailPosition < TRAIL_LEN) {
        setTrailPosition((previous) => {
          const next = previous + 1;
          if (next >= TRAIL_LEN) {
            setTrailGoalReached(true);
          }
          return Math.min(next, TRAIL_LEN);
        });
      }
      setQueue((currentQueue) => {
        if (!currentQueue) return currentQueue;
        const rest = currentQueue.slice(1);
        return result === "again" ? [...rest, id] : rest;
      });
      setRound((value) => value + 1);
      setPeekedThisVerse(false);
      clearRecallInput();
      setActionError(null);
    } catch {
      setActionError("Could not save that practice result on this device.");
    }
  }

  function remove(id: string) {
    if (pendingRemoveId !== id) {
      setPendingRemoveId(id);
      return;
    }
    try {
      removeMemoryVerse(id);
      setQueue((currentQueue) => currentQueue?.filter((item) => item !== id) ?? null);
      setPendingRemoveId(null);
      setActionError(null);
    } catch {
      setActionError("Could not remove that verse on this device.");
    }
  }

  if (!ready) {
    return <p className="text-[var(--bible-muted)]">Loading your verses…</p>;
  }

  const due = countDue(verses);
  const practicing = queue !== null;

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      {ready ? (
        <BiblePreferences settings={settings} onChange={update} showVersion={false} />
      ) : null}
      {actionError ? <BibleAlert>{actionError}</BibleAlert> : null}

      {practicing ? (
        <section className="rounded-3xl border border-[var(--bible-border)] bg-[var(--bible-glass)] p-6 sm:p-8">
          {current ? (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <p className="font-sans text-xs font-bold uppercase tracking-widest text-[var(--bible-accent)]">
                  {queue.length} left in this round
                </p>
                <div
                  className="font-sans text-xs sm:text-right"
                  aria-label={`Trail progress ${trailPosition} of ${TRAIL_LEN}`}
                >
                  <p className="font-semibold text-[var(--bible-scripture-number)]">Memory trail</p>
                  <div
                    className="mt-2 flex flex-wrap gap-1.5 transition-opacity"
                    role="list"
                  >
                    {Array.from({ length: TRAIL_LEN }, (_, index) => (
                      <span
                        key={index}
                        role="listitem"
                        className={`flex h-2.5 w-2.5 rounded-full border transition-colors duration-200 sm:h-3 sm:w-3 ${
                          index < trailPosition
                            ? "border-[var(--bible-scripture)] bg-[var(--bible-scripture)]"
                            : "border-[var(--bible-scripture-number)] bg-white/60"
                        }`}
                        aria-label={index < trailPosition ? "Step filled" : "Step empty"}
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-[var(--bible-muted)]">
                    {trailPosition} / {TRAIL_LEN} · Fill a step by typing the verse with no peek
                  </p>
                  {trailGoalReached ? (
                    <p className="mt-2 font-semibold text-[var(--bible-scripture)]">
                      You reached the end of the trail — keep going!
                    </p>
                  ) : null}
                  {peekedThisVerse ? (
                    <p className="mt-1 text-[var(--bible-muted)]">Peek used — this verse will not add a step.</p>
                  ) : null}
                </div>
              </div>
              <h2 className="mt-4 text-3xl font-bold">{current.reference}</h2>
              <p className="mt-1 font-sans text-sm text-[var(--bible-muted)]">
                {current.versionName} · {streakLabel(current)}
              </p>
              {showVerseBlanks ? (
                <div className="mt-6 flex flex-wrap gap-x-2 gap-y-3" style={scriptureStyle(settings.fontScale)}>
                  {words.map((word, index) =>
                    revealed[index] ? (
                      <span key={`${current.id}-${index}`}>{word}</span>
                    ) : (
                      <button
                        key={`${current.id}-${index}`}
                        type="button"
                        aria-label="Hidden word. Activate to peek."
                        onClick={() => {
                          const next = words.map((_, wordIndex) => revealed[wordIndex] === true);
                          next[index] = true;
                          revealWords(next);
                        }}
                        className="border-b-2 border-[var(--bible-scripture-number)]"
                        style={{ minWidth: `${Math.min(Math.max(word.length, 2), 14)}ch` }}
                      />
                    ),
                  )}
                </div>
              ) : (
                <p className="mt-6 rounded-2xl border border-dashed border-[var(--bible-border)] bg-white/40 px-4 py-3 font-sans text-sm text-[var(--bible-muted)]">
                  Verse hidden while you type or use the mic — tap Peek at the verse below if you need it.
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    revealWords(words.map(() => true));
                  }}
                  className="rounded-full border border-[var(--bible-border)] bg-white px-4 py-2 font-sans text-sm font-semibold"
                >
                  Peek at the verse
                </button>
                <button
                  type="button"
                  onClick={() => revealWords([])}
                  className="rounded-full border border-[var(--bible-border)] bg-white px-4 py-2 font-sans text-sm font-semibold"
                >
                  Hide the words
                </button>
              </div>
              {showVerseCopyright ? (
                <div className="mt-5">
                  <BibleCopyright notice={current.copyright} />
                </div>
              ) : null}
              <div className="mt-6">
                <label htmlFor="bible-recall" className="font-sans text-sm font-semibold text-[var(--bible-ink)]">
                  Type the verse from memory
                </label>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-stretch">
                  <textarea
                    id="bible-recall"
                    value={typedRecall}
                    onChange={(event) => {
                      setTypedRecall(event.target.value);
                      if (recallError) setRecallError(null);
                    }}
                    onKeyDown={onRecallKeyDown}
                    onFocus={() => {
                      if (blurTimeoutRef.current) {
                        clearTimeout(blurTimeoutRef.current);
                        blurTimeoutRef.current = null;
                      }
                      setRecallFocused(true);
                    }}
                    onBlur={() => {
                      blurTimeoutRef.current = window.setTimeout(() => {
                        if (!dictatingRef.current) {
                          setRecallFocused(false);
                        }
                        blurTimeoutRef.current = null;
                      }, 200);
                    }}
                    rows={5}
                    spellCheck={false}
                    autoComplete="off"
                    className="min-h-[120px] w-full flex-1 resize-y rounded-2xl border border-[var(--bible-border)] bg-white px-4 py-3 font-sans text-base text-[var(--bible-ink)] sm:min-h-0"
                    placeholder="Type every word, then tap Check…"
                  />
                  <button
                    type="button"
                    disabled={!speechAvailable}
                    aria-pressed={dictating}
                    title={
                      speechAvailable
                        ? dictating
                          ? "Stop dictation"
                          : "Speak the verse (Chrome / Edge — requires HTTPS)"
                        : "Voice input is not supported in this browser."
                    }
                    onClick={toggleDictation}
                    className="shrink-0 rounded-2xl border border-[var(--bible-border)] bg-white px-4 py-3 font-sans text-sm font-semibold disabled:opacity-50"
                  >
                    {dictating ? "Stop mic" : "Mic"}
                  </button>
                </div>
                <p className="mt-1 font-sans text-xs text-[var(--bible-muted)]">
                  Tip: press Ctrl+Enter or ⌘+Enter to check. Capital letters and punctuation don&apos;t
                  have to match; close spelling still counts.
                </p>
                <p className="sr-only" aria-live="polite">
                  {dictating ? "Listening for speech." : ""}
                </p>
                {speechError ? (
                  <p className="mt-2 font-sans text-sm text-[var(--bible-accent)]" role="status">
                    {speechError}
                  </p>
                ) : null}
                {recallError ? (
                  <p className="mt-2 font-sans text-sm text-[var(--bible-accent)]" role="alert">
                    {recallError}
                  </p>
                ) : null}
              </div>
              <div className="mt-4 flex flex-col flex-wrap gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={trySubmitRecall}
                  className="rounded-full bg-[var(--bible-success)] px-5 py-3 font-sans text-sm font-semibold text-white"
                >
                  Check
                </button>
                <button
                  type="button"
                  onClick={applyFixSpelling}
                  aria-label="Fix spelling: replace close misspellings with words from the saved verse"
                  className="rounded-full border border-[var(--bible-border)] bg-white px-5 py-3 font-sans text-sm font-semibold"
                >
                  Fix spelling
                </button>
                <button
                  type="button"
                  onClick={() => grade("again")}
                  className="rounded-full bg-[var(--bible-accent)] px-5 py-3 font-sans text-sm font-semibold text-white"
                >
                  Still learning
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-bold">You finished this round</h2>
              <p className="mt-3 text-[var(--bible-muted)]">
                Your memory trail this round:{" "}
                <span className="font-semibold text-[var(--bible-scripture-number)]">
                  {trailPosition} / {TRAIL_LEN}
                </span>{" "}
                steps (only a correct typed check without a peek fills a step).
              </p>
              <p className="mt-3 text-[var(--bible-muted)]">
                Verses you knew will come back in about a day, then three days, then a week.
                Verses you are still learning stay due today.
              </p>
            </>
          )}
          <button
            type="button"
            onClick={exitPractice}
            className="mt-6 font-sans text-sm font-semibold text-[var(--bible-accent)]"
          >
            Back to verses
          </button>
        </section>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row">
          <button
            type="button"
            disabled={due === 0}
            onClick={() => start("due")}
            className="rounded-full bg-[var(--bible-accent)] px-5 py-3 font-sans text-sm font-semibold text-white disabled:opacity-50"
          >
            Practice {due} due
          </button>
          <button
            type="button"
            disabled={verses.length === 0}
            onClick={() => start("all")}
            className="rounded-full border border-[var(--bible-border)] bg-white px-5 py-3 font-sans text-sm font-semibold disabled:opacity-50"
          >
            Practice all {verses.length}
          </button>
        </div>
      )}

      {!practicing && verses.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[var(--bible-border)] bg-[var(--bible-glass)] px-6 py-10">
          <p className="text-xl font-bold">No verses saved yet</p>
          <p className="mt-2 text-[var(--bible-muted)]">
            Open a chapter and tap Memorize, or save today&apos;s verse from the Bible Hub home.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/bible"
              className="rounded-full bg-[var(--bible-accent)] px-4 py-2 font-sans text-sm font-semibold text-white"
            >
              Today&apos;s verse
            </Link>
            <Link
              href="/bible/read"
              className="rounded-full border border-[var(--bible-border)] bg-white px-4 py-2 font-sans text-sm font-semibold"
            >
              Read a chapter
            </Link>
          </div>
        </div>
      ) : !practicing ? (
        <ul className="flex flex-col gap-4">
          {verses.map((verse) => (
            <li
              key={verse.id}
              className="rounded-3xl border border-[var(--bible-border)] bg-[var(--bible-glass)] p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold">{verse.reference}</h2>
                  <p className="mt-1 font-sans text-sm text-[var(--bible-muted)]">
                    {verse.versionName} · {reviewLabel(verse.nextReviewAt)} · {streakLabel(verse)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => start(verse)}
                    className="rounded-full border border-[var(--bible-border)] bg-white px-3 py-1.5 font-sans text-sm font-semibold"
                  >
                    Practice
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(verse.id)}
                    className="rounded-full border border-[var(--bible-border)] bg-white px-3 py-1.5 font-sans text-sm font-semibold text-[var(--bible-accent)]"
                  >
                    {pendingRemoveId === verse.id ? "Remove for sure" : "Remove"}
                  </button>
                </div>
              </div>
              <p className="mt-4" style={scriptureStyle(settings.fontScale)}>
                {verse.text}
              </p>
              <div className="mt-4">
                <BibleCopyright notice={verse.copyright} />
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
