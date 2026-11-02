"use client";

import { ShelterDenialIntro } from "@/components/shelter-denial-intro";
import {
  createDenialGameState,
  GARY_MAX_HP,
  type DenialGameState,
} from "@/lib/shelter-denial-game";
import {
  playShelterDeathSound,
  resumeShelterDeathAudio,
} from "@/lib/shelter-death-sounds";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

const ShelterDenial2dScene = dynamic(
  () => import("@/components/shelter-denial-2d-scene"),
  {
    ssr: false,
    loading: () => (
      <div className="shelter-denial-loading">Loading the back hallway…</div>
    ),
  },
);

type ShelterDenialGameClientProps = {
  visitorName?: string;
  petName?: string;
  onComplete: () => void;
};

type Screen = "intro" | "game" | "end";

const PIG_NEAR_DISTANCE = 8;

export function ShelterDenialGameClient({
  visitorName,
  petName,
  onComplete,
}: ShelterDenialGameClientProps) {
  const [screen, setScreen] = useState<Screen>("intro");
  const [gameState, setGameState] = useState<DenialGameState>(() =>
    createDenialGameState(),
  );
  const [focused, setFocused] = useState(false);
  const [pigDistance, setPigDistance] = useState(99);
  const [vignette, setVignette] = useState(0);
  const gameStateRef = useRef(gameState);
  const pigNearPlayedRef = useRef(false);

  gameStateRef.current = gameState;

  useEffect(() => {
    if (gameState.phase === "won") {
      playShelterDeathSound("garyDown");
    }
    if (gameState.phase === "lost") {
      playShelterDeathSound("impact");
    }
    if (gameState.phase === "won" || gameState.phase === "lost") {
      setScreen("end");
    }
  }, [gameState.phase]);

  useEffect(() => {
    if (gameState.phase !== "escape" || !gameState.pigActive) {
      setVignette(0);
      return;
    }
    if (pigDistance > PIG_NEAR_DISTANCE) {
      setVignette(0);
      pigNearPlayedRef.current = false;
      return;
    }
    const t = 1 - pigDistance / PIG_NEAR_DISTANCE;
    setVignette(Math.min(1, t * 1.2));
    if (!pigNearPlayedRef.current) {
      pigNearPlayedRef.current = true;
      playShelterDeathSound("pigNear");
    }
  }, [pigDistance, gameState.phase, gameState.pigActive]);

  const handleStartGame = useCallback(() => {
    void resumeShelterDeathAudio();
    setScreen("game");
    setGameState(createDenialGameState());
  }, []);

  const handleCaught = useCallback(() => {
    playShelterDeathSound("snort");
  }, []);

  const handleGaryHit = useCallback(() => {
    playShelterDeathSound("hit");
  }, []);

  if (screen === "intro") {
    return <ShelterDenialIntro onStartGame={handleStartGame} />;
  }

  const ended = gameState.phase === "won" || gameState.phase === "lost";

  return (
    <div className="shelter-denial-game">
      {screen === "game" && !ended && (
        <>
          <div className="shelter-denial-scene-wrap">
            <ShelterDenial2dScene
              gameStateRef={gameStateRef}
              onGameStateChange={setGameState}
              onPigDistance={setPigDistance}
              onCaught={handleCaught}
              onGaryHit={handleGaryHit}
              onFocusChange={setFocused}
            />
          </div>

          <div
            className="shelter-denial-vignette"
            style={{ opacity: vignette }}
            aria-hidden
          />

          {!focused && (
            <button
              type="button"
              className="shelter-denial-play-gate"
              onClick={() => {
                const canvas = document.querySelector(
                  ".shelter-denial-2d-canvas",
                ) as HTMLCanvasElement | null;
                canvas?.focus();
              }}
            >
              Click to play
              <span className="shelter-denial-play-hint">
                WASD or arrows to move · Click or Space to punch Gary
              </span>
            </button>
          )}

          <div className="shelter-denial-hud">
            <p className="shelter-denial-hud-objective">
              {gameState.phase === "escape"
                ? "Escape the pig — run to the green exit!"
                : "Finish Gary — get close and click (5 hits)"}
            </p>
            {visitorName && (
              <p className="shelter-denial-hud-sub">
                {visitorName}
                {petName ? ` · wanted ${petName}` : ""}
              </p>
            )}
            {gameState.phase === "fight" && (
              <div className="shelter-denial-gary-hp" aria-label="Gary health">
                {Array.from({ length: GARY_MAX_HP }).map((_, i) => (
                  <span
                    key={i}
                    className={
                      i < gameState.garyHp
                        ? "shelter-denial-gary-hp-pip"
                        : "shelter-denial-gary-hp-pip shelter-denial-gary-hp-pip--empty"
                    }
                  />
                ))}
              </div>
            )}
            {gameState.lastGaryLine && gameState.phase === "fight" && (
              <p className="shelter-denial-gary-quip">
                &ldquo;{gameState.lastGaryLine}&rdquo;
              </p>
            )}
          </div>
        </>
      )}

      {screen === "end" && (
        <div className="shelter-denial-end shelter-death-overlay">
          <div className="shelter-death-panel shelter-denial-end-panel">
            {gameState.phase === "won" ? (
              <>
                <h2 className="shelter-denial-end-title">Gary&apos;s out.</h2>
                <p className="shelter-denial-end-body">
                  The pig respects you now.
                </p>
                <p className="shelter-denial-end-note">
                  (This is revenge fantasy — adoption still needs Gary to hit
                  Approve on another device.)
                </p>
              </>
            ) : (
              <>
                <h2 className="shelter-denial-end-title">The pig got you.</h2>
                <p className="shelter-denial-end-body">
                  Maybe try the front door next time.
                </p>
              </>
            )}
            <button
              type="button"
              className="shelter-death-btn"
              onClick={onComplete}
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
