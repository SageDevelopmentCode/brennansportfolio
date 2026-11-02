"use client";

import { GymClassAttributes } from "@/components/gym-class-attributes";
import { GymTeacherProfileView } from "@/components/gym-teacher-profile";
import { GYM_TEACHER_TAGLINE } from "@/lib/gym-teacher-lore";
import { getTeacherClasses, type GymTeacherProfile } from "@/lib/gym-teachers";
import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useState } from "react";

type GymTeacherDashboardProps = {
  teacher: GymTeacherProfile;
  onQuit: () => void;
};

export function GymTeacherDashboard({ teacher, onQuit }: GymTeacherDashboardProps) {
  const [classes, setClasses] = useState<
    Awaited<ReturnType<typeof getTeacherClasses>>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const supabase = createClient();
      setClasses(await getTeacherClasses(supabase, teacher.id));
      setError(null);
    } catch {
      setError("Could not load your classes.");
    } finally {
      setLoading(false);
    }
  }, [teacher.id]);

  useEffect(() => {
    refresh();
    const supabase = createClient();
    const channel = supabase
      .channel(`gym-teacher-${teacher.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gym_classes" },
        () => refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gym_class_enrollments" },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh, teacher.id]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[var(--gym-muted)]">
          Simulating{" "}
          <span className="font-bold text-[var(--gym-ink)]">
            {teacher.displayName}
          </span>
        </p>
        <button type="button" onClick={onQuit} className="gym-btn-ghost">
          Quit
        </button>
      </div>

      <GymTeacherProfileView teacher={teacher} />

      <div className="gym-glass-card rounded-2xl p-5 sm:p-6">
        <p className="text-sm font-semibold text-[var(--gym-accent)]">
          {GYM_TEACHER_TAGLINE}
        </p>
        <h3 className="mt-4 font-[family-name:var(--font-gym-display)] text-lg font-bold uppercase tracking-tight text-[var(--gym-ink)]">
          Your classes
        </h3>

        {error && (
          <p className="mt-4 rounded-xl bg-[var(--gym-danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--gym-danger)]">
            {error}
          </p>
        )}

        {loading ? (
          <p className="mt-4 text-sm text-[var(--gym-muted)]">Loading…</p>
        ) : classes.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--gym-muted)]">
            The owner has not assigned you a class yet. Stare at the taco fund.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-4">
            {classes.map((cls) => (
              <li
                key={cls.id}
                className="rounded-xl border border-[var(--gym-border)] bg-[var(--gym-panel)] p-4 text-left"
              >
                <p className="font-bold text-[var(--gym-ink)]">{cls.name}</p>
                <GymClassAttributes picks={cls} compact />
                {cls.enrolledChildren.length === 0 ? (
                  <p className="mt-2 text-sm text-[var(--gym-muted)]">
                    No students enrolled.
                  </p>
                ) : (
                  <ul className="mt-3 flex flex-col gap-2 text-sm text-[var(--gym-muted)]">
                    {cls.enrolledChildren.map((child) => (
                      <li
                        key={child.id}
                        className="rounded-lg border border-[var(--gym-border)] px-3 py-2"
                      >
                        <span className="font-bold text-[var(--gym-ink)]">
                          {child.name}
                        </span>
                        <span className="text-[var(--gym-muted)]">
                          {" "}
                          ({child.familyName}) · age {child.age} · loves{" "}
                          {child.favoriteFood}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
