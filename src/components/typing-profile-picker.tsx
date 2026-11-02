"use client";

import {
  DEFAULT_PROFILE_NAMES,
  getActiveProfile,
  getPlayLevel,
  type KeyBlitzProgress,
  setActiveProfile,
  setProfileAge,
} from "@/lib/typing-progress";
import {
  getAgeDifficultyDescription,
  getDifficultyLevelForAge,
} from "@/lib/typing-words";
import { useState } from "react";

type TypingProfilePickerProps = {
  progress: KeyBlitzProgress;
  onChange: (progress: KeyBlitzProgress) => void;
};

export function TypingProfilePicker({
  progress,
  onChange,
}: TypingProfilePickerProps) {
  const [customName, setCustomName] = useState("");
  const [customAge, setCustomAge] = useState("");
  const [ageInput, setAgeInput] = useState("");
  const [editingAge, setEditingAge] = useState(false);

  const activeName = progress.activeProfile;
  const activeProfile = getActiveProfile(progress);
  const profileNames = [
    ...new Set([
      ...DEFAULT_PROFILE_NAMES,
      ...Object.keys(progress.profiles),
    ]),
  ];

  const needsAge = activeProfile.age === null || editingAge;

  function selectProfile(name: string) {
    setEditingAge(false);
    setAgeInput("");
    onChange(setActiveProfile(progress, name));
  }

  function saveAge() {
    const age = Number.parseInt(ageInput, 10);
    if (!Number.isFinite(age) || age < 5 || age > 99) return;
    onChange(setProfileAge(progress, activeName, age));
    setAgeInput("");
    setEditingAge(false);
  }

  function addCustomProfile() {
    const trimmed = customName.trim();
    const age = Number.parseInt(customAge, 10);
    if (!trimmed || !Number.isFinite(age) || age < 5 || age > 99) return;
    onChange(setProfileAge(setActiveProfile(progress, trimmed), trimmed, age));
    setCustomName("");
    setCustomAge("");
  }

  const previewAge = Number.parseInt(ageInput, 10);
  const showAgePreview =
    Number.isFinite(previewAge) && previewAge >= 5 && previewAge <= 99;
  const customAgeNum = Number.parseInt(customAge, 10);

  return (
    <div className="typing-glass-card rounded-2xl p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--typing-muted)]">
        Who&apos;s playing?
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {profileNames.map((name) => {
          const profile = progress.profiles[name];
          const isActive = progress.activeProfile === name;

          return (
            <button
              key={name}
              type="button"
              onClick={() => selectProfile(name)}
              className={`typing-mode-tab ${
                isActive ? "typing-mode-tab-active" : ""
              }`}
            >
              {name}
              {profile?.age != null && (
                <span className="ml-1 text-xs opacity-70">({profile.age})</span>
              )}
            </button>
          );
        })}
      </div>

      {needsAge && (
        <div className="mt-4 rounded-xl border border-[var(--typing-accent)] bg-[var(--typing-accent-soft)] p-4">
          <p className="text-sm font-semibold text-white">
            {editingAge
              ? `Update age for ${activeName}`
              : `How old is ${activeName}?`}
          </p>
          <p className="mt-1 text-xs text-[var(--typing-muted)]">
            We&apos;ll pick word difficulty and speed based on age.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              type="number"
              min={5}
              max={99}
              value={ageInput}
              onChange={(event) => setAgeInput(event.target.value)}
              placeholder="Age"
              className="w-24 rounded-xl border border-[var(--typing-border-soft)] bg-black/20 px-3 py-2 text-sm text-[var(--typing-ink)] outline-none focus:border-[var(--typing-accent)]"
              onKeyDown={(event) => {
                if (event.key === "Enter") saveAge();
              }}
            />
            <button
              type="button"
              onClick={saveAge}
              disabled={!showAgePreview}
              className="typing-btn-primary px-4 py-2 text-sm disabled:opacity-40"
            >
              Save age
            </button>
            {editingAge && (
              <button
                type="button"
                onClick={() => {
                  setEditingAge(false);
                  setAgeInput("");
                }}
                className="typing-btn-secondary px-4 py-2 text-sm"
              >
                Cancel
              </button>
            )}
          </div>
          {showAgePreview && (
            <p className="mt-2 text-xs font-semibold text-[var(--typing-accent)]">
              {getAgeDifficultyDescription(previewAge)}
            </p>
          )}
        </div>
      )}

      {activeProfile.age !== null && !needsAge && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--typing-muted)]">
          <span>
            {activeName} · age {activeProfile.age} · level{" "}
            {getPlayLevel(activeProfile)} difficulty
          </span>
          <button
            type="button"
            onClick={() => {
              setEditingAge(true);
              setAgeInput(String(activeProfile.age));
            }}
            className="font-semibold text-[var(--typing-accent)] underline"
          >
            Change age
          </button>
        </div>
      )}

      <div className="mt-4 border-t border-white/10 pt-4">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--typing-muted)]">
          Add someone new
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            type="text"
            value={customName}
            onChange={(event) => setCustomName(event.target.value)}
            placeholder="Name"
            className="min-w-[8rem] flex-1 rounded-xl border border-[var(--typing-border-soft)] bg-black/20 px-3 py-2 text-sm text-[var(--typing-ink)] outline-none focus:border-[var(--typing-accent)]"
          />
          <input
            type="number"
            min={5}
            max={99}
            value={customAge}
            onChange={(event) => setCustomAge(event.target.value)}
            placeholder="Age"
            className="w-24 rounded-xl border border-[var(--typing-border-soft)] bg-black/20 px-3 py-2 text-sm text-[var(--typing-ink)] outline-none focus:border-[var(--typing-accent)]"
          />
          <button
            type="button"
            onClick={addCustomProfile}
            disabled={
              !customName.trim() ||
              !Number.isFinite(customAgeNum) ||
              customAgeNum < 5
            }
            className="typing-btn-secondary px-4 py-2 text-sm disabled:opacity-40"
          >
            Add
          </button>
        </div>
        {customName.trim() && Number.isFinite(customAgeNum) && customAgeNum >= 5 && (
          <p className="mt-2 text-xs text-[var(--typing-muted)]">
            {getAgeDifficultyDescription(customAgeNum)}
          </p>
        )}
      </div>
    </div>
  );
}
