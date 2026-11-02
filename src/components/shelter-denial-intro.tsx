"use client";

import { ShelterDeathGary } from "@/components/shelter-death-gary";
import {
  playShelterDeathSound,
  resumeShelterDeathAudio,
} from "@/lib/shelter-death-sounds";
import { useEffect, useRef, useState } from "react";

type ShelterDenialIntroProps = {
  onStartGame: () => void;
};

type IntroBeat = {
  durationMs: number;
  caption: string;
  sound: "drone" | "flicker" | "stamp" | "door" | "charge";
  garyLine: string | null;
  showGary: boolean;
  showStamp: boolean;
  showDoor: boolean;
};

const INTRO_SCRIPT: IntroBeat[] = [
  {
    durationMs: 1800,
    caption: "The lights die…",
    sound: "drone",
    garyLine: null,
    showGary: false,
    showStamp: false,
    showDoor: false,
  },
  {
    durationMs: 2200,
    caption: "Gary leans into the desk light.",
    sound: "flicker",
    garyLine: "Wrong customer.",
    showGary: true,
    showStamp: false,
    showDoor: false,
  },
  {
    durationMs: 1800,
    caption: "DENIED.",
    sound: "stamp",
    garyLine: "…no.",
    showGary: true,
    showStamp: true,
    showDoor: false,
  },
  {
    durationMs: 2000,
    caption: "RELEASE THE PIG",
    sound: "door",
    garyLine: "Oops. Wrong door.",
    showGary: true,
    showStamp: false,
    showDoor: true,
  },
  {
    durationMs: 1600,
    caption: "RUN!",
    sound: "charge",
    garyLine: null,
    showGary: false,
    showStamp: false,
    showDoor: false,
  },
];

const TOTAL_MS = INTRO_SCRIPT.reduce((sum, b) => sum + b.durationMs, 0);
const SKIP_AFTER_MS = 3000;

export function ShelterDenialIntro({ onStartGame }: ShelterDenialIntroProps) {
  const [elapsed, setElapsed] = useState(0);
  const [started, setStarted] = useState(false);

  const onStartRef = useRef(onStartGame);
  onStartRef.current = onStartGame;

  useEffect(() => {
    void resumeShelterDeathAudio();
    setStarted(true);
    const t0 = performance.now();
    let lastBeat = -1;
    let done = false;
    let raf = 0;

    const tick = () => {
      const ms = performance.now() - t0;
      setElapsed(ms);

      let acc = 0;
      let beatIndex = 0;
      for (let i = 0; i < INTRO_SCRIPT.length; i += 1) {
        acc += INTRO_SCRIPT[i].durationMs;
        if (ms < acc) {
          beatIndex = i;
          break;
        }
        beatIndex = i;
      }

      if (beatIndex !== lastBeat) {
        lastBeat = beatIndex;
        playShelterDeathSound(INTRO_SCRIPT[beatIndex].sound);
      }

      if (ms >= TOTAL_MS) {
        if (!done) {
          done = true;
          onStartRef.current();
        }
        return;
      }
      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  let acc = 0;
  let beat = INTRO_SCRIPT[0];
  for (const b of INTRO_SCRIPT) {
    if (elapsed < acc + b.durationMs) {
      beat = b;
      break;
    }
    acc += b.durationMs;
    beat = b;
  }

  const canSkip = elapsed >= SKIP_AFTER_MS && elapsed < TOTAL_MS;

  return (
    <div className="shelter-denial-intro shelter-death-movie-epic">
      <div className="shelter-death-movie-letterbox-top" />
      <div className="shelter-death-movie-letterbox-bottom" />
      <div className="shelter-death-movie-grain" />
      <div className="shelter-denial-intro-stage">
        <p className="shelter-denial-intro-caption">{beat.caption}</p>
        <ShelterDeathGary line={beat.garyLine} visible={beat.showGary} />
        {beat.showStamp && (
          <p className="shelter-denial-intro-stamp" aria-hidden>DENIED</p>
        )}
        {beat.showDoor && (
          <p className="shelter-denial-intro-door" aria-hidden>
            BACK DOOR OPEN
          </p>
        )}
        {canSkip && (
          <button
            type="button"
            className="shelter-denial-intro-skip shelter-death-btn"
            onClick={onStartGame}
          >
            Skip
          </button>
        )}
      </div>
      {!started && <p className="sr-only">Loading denial sequence</p>}
    </div>
  );
}
