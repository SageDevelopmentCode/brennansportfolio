"use client";

import { GymChildCell } from "@/components/gym-child-cell";
import { GymChildKickOverlay } from "@/components/gym-child-kick-overlay";
import {
  emptyChildDraft,
  isChildDraftComplete,
} from "@/components/gym-check-in-children-fields";
import {
  addGymCheckInChild,
  ejectGymCheckInChild,
  getGymCheckIn,
  isChildOnFloor,
  updateGymCheckInChild,
  type GymCheckInChild,
  type GymCheckInChildInput,
} from "@/lib/gym";
import { createClient } from "@/lib/supabase/client";
import { useCallback, useState } from "react";

type GymFamilyChildrenManagerProps = {
  requestId: string;
  children: GymCheckInChild[];
  onChildrenUpdated: (children: GymCheckInChild[]) => void;
};

export function GymFamilyChildrenManager({
  requestId,
  children,
  onChildrenUpdated,
}: GymFamilyChildrenManagerProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addDraft, setAddDraft] = useState(emptyChildDraft());
  const [kickingChild, setKickingChild] = useState<GymCheckInChild | null>(null);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const row = await getGymCheckIn(supabase, requestId);
    if (row) onChildrenUpdated(row.children);
  }, [requestId, onChildrenUpdated]);

  const floorChildren = children.filter(isChildOnFloor);
  const prisonChildren = children.filter((c) => !isChildOnFloor(c));

  const handleSave = async (childId: string, input: GymCheckInChildInput) => {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const result = await updateGymCheckInChild(supabase, childId, input);
      if (!result.ok) {
        setError("Could not save child. Check the fields and try again.");
        return;
      }
      await refresh();
    } catch {
      setError("Could not save child. Check Supabase and try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isChildDraftComplete(addDraft)) {
      setError("Fill in every child field before adding.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const result = await addGymCheckInChild(supabase, requestId, {
        name: addDraft.name.trim(),
        age: Number(addDraft.age),
        height: addDraft.height.trim(),
        size: addDraft.size.trim(),
        favoriteFood: addDraft.favoriteFood.trim(),
      });
      if (!result.ok) {
        setError("Could not add child. Make sure you are still approved.");
        return;
      }
      setAddDraft(emptyChildDraft());
      setShowAdd(false);
      await refresh();
    } catch {
      setError("Could not add child. Check Supabase and try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleKick = (child: GymCheckInChild) => {
    if (
      !window.confirm(
        `Kick ${child.name} off Earth into space? They will survive in space prison. Probably.`,
      )
    ) {
      return;
    }
    setKickingChild(child);
  };

  const finishKick = async (childId: string) => {
    setKickingChild(null);
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const result = await ejectGymCheckInChild(supabase, childId);
      if (!result.ok) {
        setError("Could not eject child. Try again.");
        return;
      }
      await refresh();
    } catch {
      setError("Could not eject child. Check Supabase and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-8 border-t border-[var(--gym-border)] pt-8 text-left">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-[family-name:var(--font-gym-display)] text-lg font-bold uppercase tracking-tight text-[var(--gym-ink)]">
          Children
        </h3>
        <button
          type="button"
          className="gym-btn-ghost text-sm"
          disabled={busy}
          onClick={() => setShowAdd((v) => !v)}
        >
          {showAdd ? "Cancel add" : "Add child"}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="mt-4 rounded-xl border border-[var(--gym-border)] bg-[var(--gym-panel)] p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--gym-accent)]">
            New gym cell
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input
              className="gym-input sm:col-span-2"
              value={addDraft.name}
              onChange={(e) => setAddDraft({ ...addDraft, name: e.target.value })}
              placeholder="Name"
              required
            />
            <input
              className="gym-input"
              type="number"
              min={0}
              max={120}
              value={addDraft.age}
              onChange={(e) => setAddDraft({ ...addDraft, age: e.target.value })}
              placeholder="Age"
              required
            />
            <input
              className="gym-input"
              value={addDraft.height}
              onChange={(e) => setAddDraft({ ...addDraft, height: e.target.value })}
              placeholder="Height"
              required
            />
            <input
              className="gym-input"
              value={addDraft.size}
              onChange={(e) => setAddDraft({ ...addDraft, size: e.target.value })}
              placeholder="Size"
              required
            />
            <input
              className="gym-input sm:col-span-2"
              value={addDraft.favoriteFood}
              onChange={(e) =>
                setAddDraft({ ...addDraft, favoriteFood: e.target.value })
              }
              placeholder="Favorite food"
              required
            />
          </div>
          <button type="submit" disabled={busy} className="gym-btn-primary mt-3 text-sm">
            {busy ? "Adding…" : "Add to gym floor"}
          </button>
        </form>
      )}

      <p className="mt-4 text-xs font-bold uppercase tracking-widest text-[var(--gym-muted)]">
        Gym floor cells
      </p>
      {floorChildren.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--gym-muted)]">No kids on the floor yet.</p>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {floorChildren.map((child) => (
            <li key={child.id}>
              <GymChildCell
                child={child}
                busy={busy}
                onSave={handleSave}
                onKick={handleKick}
              />
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-xs font-bold uppercase tracking-widest text-[var(--gym-danger)]">
        Space prison
      </p>
      <p className="mt-1 text-xs text-[var(--gym-muted)]">
        Kicked off Earth. Still viewable. Still hungry for {floorChildren[0]?.favoriteFood ?? "snacks"}.
      </p>
      {prisonChildren.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--gym-muted)]">No inmates yet. Be gentle.</p>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {prisonChildren.map((child) => (
            <li key={child.id}>
              <GymChildCell
                child={child}
                prison
                busy={busy}
                onSave={handleSave}
              />
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="mt-4 rounded-xl bg-[var(--gym-danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--gym-danger)]">
          {error}
        </p>
      )}

      {kickingChild && (
        <GymChildKickOverlay
          childName={kickingChild.name}
          onComplete={() => finishKick(kickingChild.id)}
        />
      )}
    </div>
  );
}
