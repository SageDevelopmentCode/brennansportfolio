"use client";

import type { GymCheckInChild, GymCheckInChildInput } from "@/lib/gym";
import { useState } from "react";

type GymChildCellProps = {
  child: GymCheckInChild;
  prison?: boolean;
  busy?: boolean;
  onSave: (childId: string, input: GymCheckInChildInput) => Promise<void>;
  onKick?: (child: GymCheckInChild) => void;
};

export function GymChildCell({
  child,
  prison = false,
  busy = false,
  onSave,
  onKick,
}: GymChildCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: child.name,
    age: String(child.age),
    height: child.height,
    size: child.size,
    favoriteFood: child.favoriteFood,
  });
  const [error, setError] = useState<string | null>(null);

  const startEdit = () => {
    setDraft({
      name: child.name,
      age: String(child.age),
      height: child.height,
      size: child.size,
      favoriteFood: child.favoriteFood,
    });
    setError(null);
    setEditing(true);
  };

  const handleSave = async () => {
    const age = Number(draft.age);
    if (
      !draft.name.trim() ||
      !draft.height.trim() ||
      !draft.size.trim() ||
      !draft.favoriteFood.trim() ||
      !Number.isInteger(age) ||
      age < 0 ||
      age > 120
    ) {
      setError("Fill in every field with a valid age.");
      return;
    }

    setError(null);
    await onSave(child.id, {
      name: draft.name.trim(),
      age,
      height: draft.height.trim(),
      size: draft.size.trim(),
      favoriteFood: draft.favoriteFood.trim(),
    });
    setEditing(false);
  };

  const cellClass = prison ? "gym-child-cell gym-child-cell-prison" : "gym-child-cell";

  if (editing) {
    return (
      <div className={cellClass}>
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--gym-accent)]">
          {prison ? "Prison cell — edit" : "Gym cell — edit"}
        </p>
        <div className="mt-3 grid gap-2 text-left text-sm">
          <input
            className="gym-input"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Name"
          />
          <input
            className="gym-input"
            type="number"
            min={0}
            max={120}
            value={draft.age}
            onChange={(e) => setDraft({ ...draft, age: e.target.value })}
            placeholder="Age"
          />
          <input
            className="gym-input"
            value={draft.height}
            onChange={(e) => setDraft({ ...draft, height: e.target.value })}
            placeholder="Height"
          />
          <input
            className="gym-input"
            value={draft.size}
            onChange={(e) => setDraft({ ...draft, size: e.target.value })}
            placeholder="Size"
          />
          <input
            className="gym-input"
            value={draft.favoriteFood}
            onChange={(e) => setDraft({ ...draft, favoriteFood: e.target.value })}
            placeholder="Favorite food"
          />
        </div>
        {error && (
          <p className="mt-2 text-xs font-semibold text-[var(--gym-danger)]">{error}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            className="gym-btn-primary text-xs"
            onClick={handleSave}
          >
            Save
          </button>
          <button
            type="button"
            disabled={busy}
            className="gym-btn-ghost text-xs"
            onClick={() => setEditing(false)}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cellClass}>
      <p className="text-xs font-bold uppercase tracking-widest text-[var(--gym-muted)]">
        {prison ? "Space prison" : "Gym floor"}
      </p>
      <p className="mt-2 font-[family-name:var(--font-gym-display)] text-lg font-bold text-[var(--gym-ink)]">
        {child.name}
      </p>
      <dl className="mt-2 space-y-1 text-left text-xs text-[var(--gym-muted)]">
        <div className="flex justify-between gap-2">
          <dt>Age</dt>
          <dd className="font-semibold text-[var(--gym-ink)]">{child.age}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Height</dt>
          <dd className="font-semibold text-[var(--gym-ink)]">{child.height}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Size</dt>
          <dd className="font-semibold text-[var(--gym-ink)]">{child.size}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Loves</dt>
          <dd className="font-semibold text-[var(--gym-ink)]">{child.favoriteFood}</dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          className="gym-btn-ghost text-xs"
          onClick={startEdit}
        >
          Edit
        </button>
        {!prison && onKick && (
          <button
            type="button"
            disabled={busy}
            className="gym-btn-deny text-xs"
            onClick={() => onKick(child)}
          >
            Kick to space
          </button>
        )}
      </div>
    </div>
  );
}
