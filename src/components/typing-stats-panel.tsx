"use client";

import { TypingKeyboard } from "@/components/typing-keyboard";
import {
  BADGE_DEFINITIONS,
  getFamilyLeaderboard,
  type KeyBlitzProgress,
  getActiveProfile,
} from "@/lib/typing-progress";
import { getPlayLevel } from "@/lib/typing-progress";
import { getDifficultyLevelForAge, getLevelConfig } from "@/lib/typing-words";

type TypingStatsPanelProps = {
  progress: KeyBlitzProgress;
};

function WpmChart({ history }: { history: { wpm: number }[] }) {
  if (history.length === 0) {
    return (
      <p className="text-sm text-[var(--typing-muted)]">
        Play Classic Blitz to start your WPM chart.
      </p>
    );
  }

  const maxWpm = Math.max(...history.map((entry) => entry.wpm), 1);
  const width = 320;
  const height = 120;
  const points = history.map((entry, index) => {
    const x = (index / Math.max(history.length - 1, 1)) * width;
    const y = height - (entry.wpm / maxWpm) * (height - 10) - 5;
    return `${x},${y}`;
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-32 w-full"
      aria-label="WPM history chart"
    >
      <polyline
        fill="none"
        stroke="#22d3ee"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points.join(" ")}
      />
      {history.map((entry, index) => {
        const x = (index / Math.max(history.length - 1, 1)) * width;
        const y = height - (entry.wpm / maxWpm) * (height - 10) - 5;
        return <circle key={index} cx={x} cy={y} r="3" fill="#e879f9" />;
      })}
    </svg>
  );
}

export function TypingStatsPanel({ progress }: TypingStatsPanelProps) {
  const profile = getActiveProfile(progress);
  const playLevel = getPlayLevel(profile);
  const levelConfig = getLevelConfig(playLevel);
  const leaderboard = getFamilyLeaderboard(progress);

  return (
    <div className="space-y-4">
      <div className="typing-glass-card rounded-2xl p-5">
        <h3 className="text-lg font-bold text-white">Your Stats</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-xs uppercase text-[var(--typing-muted)]">Best WPM</p>
            <p className="text-2xl font-bold text-[var(--typing-accent)]">
              {profile.classic.bestWpm}
            </p>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-xs uppercase text-[var(--typing-muted)]">Level</p>
            <p className="text-2xl font-bold text-[var(--typing-accent-2)]">
              {playLevel}
            </p>
            <p className="text-xs text-[var(--typing-muted)]">{levelConfig.label}</p>
            {profile.age !== null && (
              <p className="text-xs text-[var(--typing-muted)]">
                Age {profile.age}
                {profile.age !== null &&
                  ` · age baseline ${getDifficultyLevelForAge(profile.age)}`}
              </p>
            )}
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-xs uppercase text-[var(--typing-muted)]">Streak</p>
            <p className="text-2xl font-bold text-[var(--typing-success)]">
              {profile.streak.count} days
            </p>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-xs uppercase text-[var(--typing-muted)]">Rounds</p>
            <p className="text-2xl font-bold text-white">{profile.totalRounds}</p>
          </div>
        </div>
      </div>

      <div className="typing-glass-card rounded-2xl p-5">
        <h3 className="text-lg font-bold text-white">WPM History</h3>
        <WpmChart history={profile.classic.history} />
      </div>

      <div className="typing-glass-card rounded-2xl p-5">
        <h3 className="text-lg font-bold text-white">Family Leaderboard</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[var(--typing-muted)]">
                <th className="pb-2 pr-4">Player</th>
                <th className="pb-2 pr-4">WPM</th>
                <th className="pb-2 pr-4">Word Drop</th>
                <th className="pb-2 pr-4">Survival</th>
                <th className="pb-2">Streak</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, index) => (
                <tr
                  key={entry.name}
                  className={`border-t border-white/10 ${
                    entry.name === progress.activeProfile ? "text-[var(--typing-accent)]" : ""
                  }`}
                >
                  <td className="py-2 pr-4 font-semibold">
                    {index + 1}. {entry.name}
                  </td>
                  <td className="py-2 pr-4">{entry.bestWpm}</td>
                  <td className="py-2 pr-4">{entry.bestWordDrop}</td>
                  <td className="py-2 pr-4">{entry.bestSurvival}</td>
                  <td className="py-2">{entry.streak}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="typing-glass-card rounded-2xl p-5">
        <h3 className="text-lg font-bold text-white">Key Heatmap</h3>
        <p className="mt-1 text-sm text-[var(--typing-muted)]">
          Green = solid, red = needs practice
        </p>
        <div className="mt-4 flex justify-center">
          <TypingKeyboard profile={profile} compact />
        </div>
      </div>

      <div className="typing-glass-card rounded-2xl p-5">
        <h3 className="text-lg font-bold text-white">Badges</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {BADGE_DEFINITIONS.map((badge) => {
            const earned = profile.badges.includes(badge.id);
            return (
              <div
                key={badge.id}
                className={`rounded-xl border p-3 ${
                  earned
                    ? "border-[var(--typing-accent)] bg-[var(--typing-accent-soft)]"
                    : "border-white/10 bg-white/5 opacity-50"
                }`}
              >
                <p className="text-2xl">{badge.emoji}</p>
                <p className="font-bold text-white">{badge.label}</p>
                <p className="text-xs text-[var(--typing-muted)]">
                  {badge.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
