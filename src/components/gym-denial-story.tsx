"use client";

import {
  GYM_DENIAL_STORY,
  GYM_DESK_CHARACTER,
  GYM_DESK_TAGLINE,
} from "@/lib/gym-denial-story";
import {
  cancelLennySpeechPlayback,
  primeLennySpeechFromUserGesture,
  queueLennySpeechFromUserGesture,
  resumeLennySpeech,
  speakLennyLine,
  stopLennySpeech,
} from "@/lib/gym-lenny-speech";
import { useEffect, useRef, useState } from "react";

const PAUSE_AFTER_LINE_MS = 400;
const STAMP_HOLD_MS = 800;
const SKIP_AFTER_MS = 4000;

type GymDenialStoryProps = {
  familyName: string;
  onDone: () => void;
};

function sleep(ms: number, abortRef: { current: boolean }): Promise<void> {
  if (abortRef.current) return Promise.resolve();
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(), ms);
  });
}

export function GymDenialStory({ familyName, onDone }: GymDenialStoryProps) {
  const [storyStarted, setStoryStarted] = useState(false);
  const [beatIndex, setBeatIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [running, setRunning] = useState(false);
  const onDoneRef = useRef(onDone);
  const abortRef = useRef(false);
  const skipSpeakBeatIndexRef = useRef<number | null>(null);
  onDoneRef.current = onDone;

  const startStory = () => {
    // #region agent log
    fetch("http://127.0.0.1:7380/ingest/87f3419d-18bb-4b16-a6a8-dcdb1c7d5c46", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "503e96",
      },
      body: JSON.stringify({
        sessionId: "503e96",
        location: "gym-denial-story.tsx:startStory",
        message: "user tapped start story",
        data: { familyName },
        timestamp: Date.now(),
        hypothesisId: "A",
      }),
    }).catch(() => {});
    // #endregion
    resumeLennySpeech();

    const firstSpeakIndex = GYM_DENIAL_STORY.findIndex((beat) => beat.line);
    const firstLine =
      firstSpeakIndex >= 0 ? GYM_DENIAL_STORY[firstSpeakIndex].line : null;
    if (firstLine) {
      skipSpeakBeatIndexRef.current = firstSpeakIndex;
      queueLennySpeechFromUserGesture(firstLine);
      setSpeaking(true);
    }

    setStoryStarted(true);
    setRunning(true);
  };

  useEffect(() => {
    if (!storyStarted) return;

    // #region agent log
    fetch("http://127.0.0.1:7380/ingest/87f3419d-18bb-4b16-a6a8-dcdb1c7d5c46", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "503e96",
      },
      body: JSON.stringify({
        sessionId: "503e96",
        location: "gym-denial-story.tsx:useEffect:run",
        message: "story effect started",
        data: { storyStarted },
        timestamp: Date.now(),
        hypothesisId: "B",
      }),
    }).catch(() => {});
    // #endregion

    abortRef.current = false;

    const start = performance.now();
    const tick = window.setInterval(() => {
      setElapsed(performance.now() - start);
    }, 200);

    (async () => {
      for (let i = 0; i < GYM_DENIAL_STORY.length; i += 1) {
        if (abortRef.current) return;

        setBeatIndex(i);
        const beat = GYM_DENIAL_STORY[i];

        if (beat.line) {
          if (skipSpeakBeatIndexRef.current === i) {
            skipSpeakBeatIndexRef.current = null;
            // #region agent log
            fetch("http://127.0.0.1:7380/ingest/87f3419d-18bb-4b16-a6a8-dcdb1c7d5c46", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Debug-Session-Id": "503e96",
              },
              body: JSON.stringify({
                sessionId: "503e96",
                location: "gym-denial-story.tsx:skipDuplicateSpeak",
                message: "skipped beat speak (started from tap)",
                data: { beatIndex: i },
                timestamp: Date.now(),
                hypothesisId: "F",
                runId: "post-fix",
              }),
            }).catch(() => {});
            // #endregion
            await sleep(
              Math.max(1800, beat.line.length * 55),
              abortRef,
            );
            setSpeaking(false);
          } else {
            // #region agent log
            fetch("http://127.0.0.1:7380/ingest/87f3419d-18bb-4b16-a6a8-dcdb1c7d5c46", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Debug-Session-Id": "503e96",
              },
              body: JSON.stringify({
                sessionId: "503e96",
                location: "gym-denial-story.tsx:beforeSpeak",
                message: "about to speak beat",
                data: {
                  beatIndex: i,
                  abort: abortRef.current,
                  lineLen: beat.line.length,
                },
                timestamp: Date.now(),
                hypothesisId: "B,C",
              }),
            }).catch(() => {});
            // #endregion
            await speakLennyLine(beat.line, setSpeaking);
          }
          if (abortRef.current) return;
          if (beat.showStamp) {
            await sleep(STAMP_HOLD_MS, abortRef);
          } else {
            await sleep(PAUSE_AFTER_LINE_MS, abortRef);
          }
        } else {
          await sleep(beat.durationMs, abortRef);
        }
      }

      if (abortRef.current) return;
      setRunning(false);
      stopLennySpeech();
      setSpeaking(false);
      onDoneRef.current();
    })();

    return () => {
      // #region agent log
      fetch("http://127.0.0.1:7380/ingest/87f3419d-18bb-4b16-a6a8-dcdb1c7d5c46", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "503e96",
        },
        body: JSON.stringify({
          sessionId: "503e96",
          location: "gym-denial-story.tsx:useEffect:cleanup",
          message: "story effect cleanup",
          data: { storyStarted },
          timestamp: Date.now(),
          hypothesisId: "B",
        }),
      }).catch(() => {});
      // #endregion
      abortRef.current = true;
      window.clearInterval(tick);
      cancelLennySpeechPlayback();
      setSpeaking(false);
    };
  }, [storyStarted]);

  const beat = GYM_DENIAL_STORY[beatIndex] ?? GYM_DENIAL_STORY[0];
  const canSkip = storyStarted && running && elapsed >= SKIP_AFTER_MS;

  const handleSkip = () => {
    abortRef.current = true;
    setRunning(false);
    stopLennySpeech();
    setSpeaking(false);
    onDoneRef.current();
  };

  if (!storyStarted) {
    return (
      <div className="gym-denial-overlay fixed inset-0 z-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="gym-denial-panel max-w-lg">
          <p className="text-5xl" aria-hidden>
            🧔‍♂️
          </p>
          <h2 className="mt-4 font-[family-name:var(--font-gym-display)] text-2xl font-bold uppercase tracking-tight text-[var(--gym-ink)]">
            {GYM_DESK_CHARACTER} has something to say
          </h2>
          <p className="mt-3 text-sm text-[var(--gym-muted-on-dark)]">
            Your check-in was denied. Tap below so your browser allows sound.
          </p>
          <button
            type="button"
            className="gym-btn-primary mt-8"
            onClick={startStory}
          >
            Tap to hear {GYM_DESK_CHARACTER}
          </button>
          <button
            type="button"
            className="gym-btn-ghost-on-dark mt-4"
            onClick={() => onDoneRef.current()}
          >
            Skip (no sound)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="gym-denial-overlay fixed inset-0 z-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="gym-denial-panel max-w-lg">
        <p className="gym-denial-caption">{beat.caption}</p>
        {beat.showCharacter && (
          <div
            className={`gym-denial-character${speaking ? " gym-denial-character-speaking" : ""}`}
            aria-hidden
          >
            <span className="text-5xl">🧔‍♂️</span>
            <p className="gym-denial-name">{GYM_DESK_CHARACTER}</p>
            <p className="gym-denial-tagline">{GYM_DESK_TAGLINE}</p>
            {speaking && (
              <p className="gym-denial-speaking-badge">Speaking…</p>
            )}
            {beat.line && (
              <p className="gym-denial-line" aria-live="polite">
                &ldquo;{beat.line}&rdquo;
              </p>
            )}
          </div>
        )}
        {beat.showStamp && (
          <p className="gym-denial-stamp" aria-hidden>
            DENIED
          </p>
        )}
        <p className="mt-6 text-sm text-[var(--gym-muted-on-dark)]">
          {familyName} — better luck next time.
        </p>
        {canSkip && (
          <button
            type="button"
            className="gym-denial-skip gym-btn-ghost-on-dark mt-6"
            onClick={handleSkip}
          >
            Skip to lobby
          </button>
        )}
      </div>
    </div>
  );
}
