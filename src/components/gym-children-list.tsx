import { isChildOnFloor, type GymCheckInChild } from "@/lib/gym";

type GymChildrenListProps = {
  children: GymCheckInChild[];
  compact?: boolean;
};

export function GymChildrenList({ children, compact }: GymChildrenListProps) {
  if (children.length === 0) return null;

  return (
    <ul className={`mt-2 flex flex-col gap-2 ${compact ? "text-xs" : "text-sm"}`}>
      {children.map((child) => (
        <li
          key={child.id}
          className="rounded-lg border border-[var(--gym-border)] bg-[var(--gym-glass)] px-3 py-2 text-[var(--gym-muted)]"
        >
          <span className="font-bold text-[var(--gym-ink)]">{child.name}</span>
          {!isChildOnFloor(child) && (
            <span className="ml-1 text-[var(--gym-danger)]">(space prison)</span>
          )}
          <span className="text-[var(--gym-muted)]">
            {" "}
            · age {child.age} · {child.height} · size {child.size} · loves{" "}
            {child.favoriteFood}
          </span>
        </li>
      ))}
    </ul>
  );
}
