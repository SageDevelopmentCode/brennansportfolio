"use client";

export type GymCheckInChildDraft = {
  name: string;
  age: string;
  height: string;
  size: string;
  favoriteFood: string;
};

export const emptyChildDraft = (): GymCheckInChildDraft => ({
  name: "",
  age: "",
  height: "",
  size: "",
  favoriteFood: "",
});

export function isChildDraftEmpty(child: GymCheckInChildDraft): boolean {
  return (
    !child.name.trim() &&
    !child.age.trim() &&
    !child.height.trim() &&
    !child.size.trim() &&
    !child.favoriteFood.trim()
  );
}

export function isChildDraftComplete(child: GymCheckInChildDraft): boolean {
  const age = Number(child.age);
  return (
    child.name.trim() !== "" &&
    child.height.trim() !== "" &&
    child.size.trim() !== "" &&
    child.favoriteFood.trim() !== "" &&
    child.age.trim() !== "" &&
    Number.isInteger(age) &&
    age >= 0 &&
    age <= 120
  );
}

type GymCheckInChildrenFieldsProps = {
  children: GymCheckInChildDraft[];
  onChange: (children: GymCheckInChildDraft[]) => void;
};

export function GymCheckInChildrenFields({
  children,
  onChange,
}: GymCheckInChildrenFieldsProps) {
  const updateChild = (index: number, patch: Partial<GymCheckInChildDraft>) => {
    onChange(
      children.map((child, i) => (i === index ? { ...child, ...patch } : child)),
    );
  };

  const removeChild = (index: number) => {
    onChange(children.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-3 border-t border-[var(--gym-border)] pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--gym-ink)]">Children</p>
        <button
          type="button"
          className="gym-btn-ghost text-sm"
          onClick={() => onChange([...children, emptyChildDraft()])}
        >
          Add child
        </button>
      </div>
      <p className="text-xs text-[var(--gym-muted)]">
        Optional — add each child&apos;s name, age, height, size, and favorite food.
      </p>

      {children.length === 0 ? (
        <p className="text-sm text-[var(--gym-muted)]">No children added yet.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {children.map((child, index) => (
            <li
              key={index}
              className="rounded-xl border border-[var(--gym-border)] bg-[var(--gym-panel)] p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--gym-accent)]">
                  Child {index + 1}
                </p>
                <button
                  type="button"
                  className="text-xs font-semibold text-[var(--gym-danger)]"
                  onClick={() => removeChild(index)}
                >
                  Remove
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--gym-ink)] sm:col-span-2">
                  Name
                  <input
                    className="gym-input"
                    value={child.name}
                    onChange={(e) => updateChild(index, { name: e.target.value })}
                    placeholder="Alex"
                    required={!isChildDraftEmpty(child)}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--gym-ink)]">
                  Age
                  <input
                    className="gym-input"
                    type="number"
                    min={0}
                    max={120}
                    value={child.age}
                    onChange={(e) => updateChild(index, { age: e.target.value })}
                    placeholder="8"
                    required={!isChildDraftEmpty(child)}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--gym-ink)]">
                  Height
                  <input
                    className="gym-input"
                    value={child.height}
                    onChange={(e) => updateChild(index, { height: e.target.value })}
                    placeholder={'4\'2" or 50 in'}
                    required={!isChildDraftEmpty(child)}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--gym-ink)]">
                  Size
                  <input
                    className="gym-input"
                    value={child.size}
                    onChange={(e) => updateChild(index, { size: e.target.value })}
                    placeholder="Youth M"
                    required={!isChildDraftEmpty(child)}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-[var(--gym-ink)] sm:col-span-2">
                  Favorite food
                  <input
                    className="gym-input"
                    value={child.favoriteFood}
                    onChange={(e) =>
                      updateChild(index, { favoriteFood: e.target.value })
                    }
                    placeholder="Pizza"
                    required={!isChildDraftEmpty(child)}
                  />
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
