"use client";

import { GymClassAttributes } from "@/components/gym-class-attributes";
import { GymClassCreateForm } from "@/components/gym-class-create-form";
import {
  assignClassTeacher,
  createGymClass,
  createGymClassErrorMessage,
  emptyGymClassCreateInput,
  listEnrollableChildren,
  listGymClassesWithRoster,
  listGymTeachers,
  listSimulatableFamilies,
  setClassEnrollments,
  type GymClassCreateInput,
  type GymClassWithRoster,
  type GymTeacherProfile,
} from "@/lib/gym-teachers";
import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useState } from "react";

export function GymOwnerClasses() {
  const [classes, setClasses] = useState<GymClassWithRoster[]>([]);
  const [teachers, setTeachers] = useState<GymTeacherProfile[]>([]);
  const [enrollable, setEnrollable] = useState<
    ReturnType<typeof listEnrollableChildren>
  >([]);
  const [createInput, setCreateInput] = useState<GymClassCreateInput>(
    emptyGymClassCreateInput(),
  );
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedChildIds, setSelectedChildIds] = useState<
    Record<string, string[]>
  >({});

  const refresh = useCallback(async () => {
    try {
      const supabase = createClient();
      const [classRows, teacherRows, families] = await Promise.all([
        listGymClassesWithRoster(supabase),
        listGymTeachers(supabase),
        listSimulatableFamilies(supabase),
      ]);
      setClasses(classRows);
      setTeachers(teacherRows);
      setEnrollable(listEnrollableChildren(families));
      setSelectedChildIds((prev) => {
        const next = { ...prev };
        for (const cls of classRows) {
          next[cls.id] = cls.enrolledChildren.map((c) => c.id);
        }
        return next;
      });
      setError(null);
    } catch {
      setError("Could not load classes. Apply gym teacher migrations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const supabase = createClient();
    const channel = supabase
      .channel("gym-owner-classes")
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gym_check_in_requests" },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setActing(true);
    setError(null);
    try {
      const supabase = createClient();
      const result = await createGymClass(supabase, createInput);
      if (!result.ok) {
        setError(createGymClassErrorMessage(result.code));
        return;
      }
      setCreateInput(emptyGymClassCreateInput());
      await refresh();
    } catch {
      setError("Could not create class.");
    } finally {
      setActing(false);
    }
  };

  const handleAssignTeacher = async (classId: string, teacherId: string) => {
    if (!teacherId) return;
    setActing(true);
    setError(null);
    try {
      const supabase = createClient();
      const result = await assignClassTeacher(supabase, classId, teacherId);
      if (!result.ok) {
        setError("Could not assign teacher.");
        return;
      }
      await refresh();
    } catch {
      setError("Could not assign teacher.");
    } finally {
      setActing(false);
    }
  };

  const toggleChild = (classId: string, childId: string) => {
    setSelectedChildIds((prev) => {
      const current = prev[classId] ?? [];
      const has = current.includes(childId);
      return {
        ...prev,
        [classId]: has
          ? current.filter((id) => id !== childId)
          : [...current, childId],
      };
    });
  };

  const handleSaveEnrollments = async (classId: string) => {
    setActing(true);
    setError(null);
    try {
      const supabase = createClient();
      const ids = selectedChildIds[classId] ?? [];
      const result = await setClassEnrollments(supabase, classId, ids);
      if (!result.ok) {
        setError(
          result.code === "invalid_child"
            ? "Only on-floor kids from approved families can enroll."
            : "Could not save enrollments.",
        );
        return;
      }
      await refresh();
    } catch {
      setError("Could not save enrollments.");
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="gym-glass-card rounded-2xl p-5 sm:p-6">
      <h2 className="font-[family-name:var(--font-gym-display)] text-lg font-bold uppercase tracking-tight text-[var(--gym-ink)]">
        Classes
      </h2>
      <p className="mt-1 text-sm text-[var(--gym-muted)]">
        Create a class with a teacher and seven Iron Desk settings, then enroll
        kids from other families (gym floor only).
      </p>

      <form onSubmit={handleCreateClass} className="mt-4 flex flex-col gap-3">
        <p className="text-sm font-semibold text-[var(--gym-ink)]">
          Create class
        </p>
        {teachers.length === 0 ? (
          <p className="text-sm text-[var(--gym-muted)]">
            Add a teacher first (Teacher role → new application).
          </p>
        ) : (
          <GymClassCreateForm
            value={createInput}
            onChange={setCreateInput}
            teachers={teachers}
            disabled={acting}
          />
        )}
        <button
          type="submit"
          disabled={acting || teachers.length === 0}
          className="gym-btn-primary text-sm"
        >
          Create class
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-xl bg-[var(--gym-danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--gym-danger)]">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-[var(--gym-muted)]">Loading classes…</p>
      ) : classes.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--gym-muted)]">No classes yet.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-6">
          {classes.map((cls) => (
            <li
              key={cls.id}
              className="rounded-xl border border-[var(--gym-border)] bg-[var(--gym-panel)] p-4"
            >
              <p className="font-bold text-[var(--gym-ink)]">{cls.name}</p>
              <GymClassAttributes picks={cls} compact />

              <label className="mt-3 flex flex-col gap-1 text-sm font-semibold text-[var(--gym-ink)]">
                Teacher
                <select
                  className="gym-input"
                  value={cls.teacherId ?? ""}
                  disabled={acting || teachers.length === 0}
                  onChange={(e) => handleAssignTeacher(cls.id, e.target.value)}
                >
                  <option value="">— Pick teacher —</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.displayName}
                    </option>
                  ))}
                </select>
              </label>

              <p className="mt-4 text-xs font-bold uppercase tracking-widest text-[var(--gym-muted)]">
                Enroll students
              </p>
              {enrollable.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--gym-muted)]">
                  No eligible kids — need approved families with children on the
                  floor.
                </p>
              ) : (
                <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-sm">
                  {enrollable.map((child) => {
                    const checked = (selectedChildIds[cls.id] ?? []).includes(
                      child.id,
                    );
                    return (
                      <li key={child.id}>
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 hover:bg-[var(--gym-glass)]">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={acting}
                            onChange={() => toggleChild(cls.id, child.id)}
                          />
                          <span>
                            <strong>{child.name}</strong> ({child.familyName})
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
              <button
                type="button"
                disabled={acting}
                className="gym-btn-primary mt-3 text-sm"
                onClick={() => handleSaveEnrollments(cls.id)}
              >
                Save roster
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
