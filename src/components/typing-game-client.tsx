"use client";

import { TypingCelebration } from "@/components/typing-celebration";
import { TypingClassicMode } from "@/components/typing-classic-mode";
import { TypingDrillMode } from "@/components/typing-drill-mode";
import { TypingProfilePicker } from "@/components/typing-profile-picker";
import { TypingStatsPanel } from "@/components/typing-stats-panel";
import { TypingSurvivalMode } from "@/components/typing-survival-mode";
import { TypingWordDrop } from "@/components/typing-word-drop";
import type { TypingMode } from "@/lib/typing";
import {
  getActiveProfile,
  getPlayLevel,
  loadProgress,
  recordRound,
  saveProgress,
  type KeyBlitzProgress,
} from "@/lib/typing-progress";
import { playCelebration, resumeAudio } from "@/lib/typing-sounds";
import { getLevelConfig } from "@/lib/typing-words";
import { useCallback, useEffect, useState } from "react";

type GamePhase = "menu" | "playing" | "gameover";
type MenuTab = "play" | "stats";

const MODES: { id: TypingMode; label: string; emoji: string; description: string }[] = [
  {
    id: "classic",
    label: "Classic Blitz",
    emoji: "⚡",
    description: "60-second WPM test with 3 lives",
  },
  {
    id: "worddrop",
    label: "Word Drop",
    emoji: "🌧️",
    description: "Type falling words before they hit the line",
  },
  {
    id: "survival",
    label: "Survival",
    emoji: "🔥",
    description: "Endless words — speed ramps every 10 clears",
  },
  {
    id: "drill",
    label: "Key Drills",
    emoji: "🎯",
    description: "30-second practice on your weakest keys",
  },
];

type GameOverSummary = {
  title: string;
  lines: string[];
};

export function TypingGameClient() {
  const [progress, setProgress] = useState<KeyBlitzProgress>(() => loadProgress());
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [menuTab, setMenuTab] = useState<MenuTab>("play");
  const [selectedMode, setSelectedMode] = useState<TypingMode>("classic");
  const [summary, setSummary] = useState<GameOverSummary | null>(null);
  const [celebration, setCelebration] = useState<{
    message: string;
    badges: string[];
  } | null>(null);

  const profile = getActiveProfile(progress);
  const level = getPlayLevel(profile);
  const levelConfig = getLevelConfig(level);
  const needsAge = profile.age === null;

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  const startMode = useCallback(async (mode: TypingMode) => {
    if (getActiveProfile(progress).age === null) return;
    await resumeAudio();
    setSelectedMode(mode);
    setPhase("playing");
    setSummary(null);
  }, [progress]);

  const returnToMenu = useCallback(() => {
    setPhase("menu");
    setSummary(null);
  }, []);

  const handleRoundComplete = useCallback(
    (
      mode: TypingMode,
      result: {
        wpm?: number;
        accuracy: number;
        score?: number;
        combo?: number;
        timeMs?: number;
        wordsCompleted?: number;
        ghostProgress?: number[];
        keyMistakes?: Record<string, number>;
        keyHits?: Record<string, number>;
      }
    ) => {
      const { progress: nextProgress, newBadges, records } = recordRound(
        progress,
        { mode, ...result }
      );
      setProgress(nextProgress);

      const lines: string[] = [];
      if (result.wpm !== undefined) {
        lines.push(`WPM: ${result.wpm}`);
      }
      if (result.score !== undefined) {
        lines.push(`Score: ${result.score}`);
      }
      if (result.combo !== undefined && result.combo > 0) {
        lines.push(`Best combo: x${result.combo}`);
      }
      if (result.wordsCompleted !== undefined) {
        lines.push(`Words cleared: ${result.wordsCompleted}`);
      }
      lines.push(`Accuracy: ${result.accuracy}%`);

      const titles: Record<TypingMode, string> = {
        classic: "Classic Blitz Complete",
        worddrop: "Word Drop Over",
        survival: "Survival Ended",
        drill: "Drill Complete",
      };

      setSummary({ title: titles[mode], lines });
      setPhase("gameover");

      if (records.length > 0) {
        const top = records[0];
        playCelebration();
        setCelebration({
          message: `${top.label}: ${top.value}`,
          badges: newBadges,
        });
      } else if (newBadges.length > 0) {
        playCelebration();
        setCelebration({
          message: "Badge unlocked!",
          badges: newBadges,
        });
      }
    },
    [progress]
  );

  if (phase === "playing") {
    if (selectedMode === "classic") {
      return (
        <TypingClassicMode
          level={level}
          profile={profile}
          ghostProgress={profile.classic.ghostProgress}
          onFinish={(result) => handleRoundComplete("classic", result)}
          onBack={returnToMenu}
        />
      );
    }
    if (selectedMode === "worddrop") {
      return (
        <TypingWordDrop
          level={level}
          profile={profile}
          onFinish={(result) => handleRoundComplete("worddrop", result)}
          onBack={returnToMenu}
        />
      );
    }
    if (selectedMode === "survival") {
      return (
        <TypingSurvivalMode
          level={level}
          profile={profile}
          onFinish={(result) => handleRoundComplete("survival", result)}
          onBack={returnToMenu}
        />
      );
    }
    return (
      <TypingDrillMode
        profile={profile}
        onFinish={(result) => handleRoundComplete("drill", result)}
        onBack={returnToMenu}
      />
    );
  }

  return (
    <div className="space-y-6">
      <TypingProfilePicker progress={progress} onChange={setProgress} />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMenuTab("play")}
          className={`typing-mode-tab ${
            menuTab === "play" ? "typing-mode-tab-active" : ""
          }`}
        >
          Play
        </button>
        <button
          type="button"
          onClick={() => setMenuTab("stats")}
          className={`typing-mode-tab ${
            menuTab === "stats" ? "typing-mode-tab-active" : ""
          }`}
        >
          Stats
        </button>
      </div>

      {menuTab === "stats" ? (
        <TypingStatsPanel progress={progress} />
      ) : (
        <>
          <div className="typing-glass-card rounded-2xl p-5">
            <p className="text-sm text-[var(--typing-muted)]">
              Playing as <strong className="text-[var(--typing-accent)]">{progress.activeProfile}</strong>
              {profile.age !== null && (
                <>
                  {" · "}
                  Age {profile.age}
                </>
              )}
              {" · "}
              Level {level} ({levelConfig.label})
              {" · "}
              Best WPM: {profile.classic.bestWpm}
            </p>
            {needsAge && (
              <p className="mt-2 text-sm font-semibold text-[var(--typing-accent-2)]">
                Enter an age above to unlock the game modes.
              </p>
            )}
          </div>

          {phase === "gameover" && summary && (
            <div className="typing-glass-card rounded-2xl p-6 text-center">
              <h2 className="text-2xl font-bold text-white">{summary.title}</h2>
              <div className="mt-3 space-y-1 text-[var(--typing-muted)]">
                {summary.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => startMode(selectedMode)}
                  className="typing-btn-primary"
                >
                  Play Again
                </button>
                <button
                  type="button"
                  onClick={() => setPhase("menu")}
                  className="typing-btn-secondary"
                >
                  Back to Menu
                </button>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => startMode(mode.id)}
                disabled={needsAge}
                className="typing-glass-card rounded-2xl p-5 text-left transition hover:border-[var(--typing-accent)] hover:shadow-[0_0_24px_rgba(34,211,238,0.15)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="text-3xl">{mode.emoji}</span>
                <h3 className="mt-3 text-xl font-bold text-white">{mode.label}</h3>
                <p className="mt-1 text-sm text-[var(--typing-muted)]">
                  {mode.description}
                </p>
              </button>
            ))}
          </div>
        </>
      )}

      <TypingCelebration
        show={celebration !== null}
        message={celebration?.message ?? ""}
        newBadges={celebration?.badges ?? []}
        onDismiss={() => setCelebration(null)}
      />
    </div>
  );
}
