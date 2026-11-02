"use client";

import { GymTeacherSignupFields } from "@/components/gym-teacher-signup-fields";
import { GYM_TEACHER_ROLE_BLURB } from "@/lib/gym-teacher-lore";
import {
  emptyGymTeacherSignupInput,
  listGymTeachers,
  registerGymTeacher,
  registerGymTeacherErrorMessage,
  type GymTeacherProfile,
  type GymTeacherSignupInput,
} from "@/lib/gym-teachers";
import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useState } from "react";

type GymTeacherPickerProps = {
  onSelect: (teacher: GymTeacherProfile) => void;
};

export function GymTeacherPicker({ onSelect }: GymTeacherPickerProps) {
  const [teachers, setTeachers] = useState<GymTeacherProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSignup, setShowSignup] = useState(false);
  const [signup, setSignup] = useState<GymTeacherSignupInput>(
    emptyGymTeacherSignupInput(),
  );
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const supabase = createClient();
      setTeachers(await listGymTeachers(supabase));
      setError(null);
    } catch {
      setError("Could not load teachers. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const supabase = createClient();
    const channel = supabase
      .channel("gym-teachers-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gym_teachers" },
        () => {
          void refresh();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  const handleTeacherSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupLoading(true);
    setSignupError(null);
    setSignupSuccess(null);
    try {
      const supabase = createClient();
      const result = await registerGymTeacher(supabase, signup);
      if (!result.ok) {
        setSignupError(registerGymTeacherErrorMessage(result.code));
        return;
      }
      setSignupSuccess(
        `${result.teacher.displayName} is on the roster. Tap their name to simulate.`,
      );
      setSignup(emptyGymTeacherSignupInput());
      setShowSignup(false);
      await refresh();
    } catch {
      setSignupError(registerGymTeacherErrorMessage("unknown"));
    } finally {
      setSignupLoading(false);
    }
  };

  return (
    <div className="gym-glass-card rounded-2xl p-5 sm:p-6">
      <h2 className="font-[family-name:var(--font-gym-display)] text-lg font-bold uppercase tracking-tight text-[var(--gym-ink)]">
        Teacher roster
      </h2>
      <p className="mt-1 text-sm text-[var(--gym-muted)]">{GYM_TEACHER_ROLE_BLURB}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--gym-ink)]">
        Pick a teacher to simulate them and read their full application.
      </p>

      {error && (
        <p className="mt-4 rounded-xl bg-[var(--gym-danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--gym-danger)]">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-[var(--gym-muted)]">Loading teachers…</p>
      ) : teachers.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--gym-muted)]">
          No teachers on the roster yet. Submit a new application below.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {teachers.map((teacher) => (
            <li key={teacher.id}>
              <button
                type="button"
                onClick={() => onSelect(teacher)}
                className="gym-role-card w-full text-left"
              >
                <span className="text-2xl" aria-hidden>🌮</span>
                <span className="mt-2 block font-bold text-[var(--gym-ink)]">
                  {teacher.displayName}
                </span>
                {(teacher.age != null || teacher.yearsTeaching != null) && (
                  <span className="mt-1 block text-sm text-[var(--gym-muted)]">
                    {teacher.age != null ? `Age ${teacher.age}` : ""}
                    {teacher.age != null && teacher.yearsTeaching != null
                      ? " · "
                      : ""}
                    {teacher.yearsTeaching != null
                      ? `${teacher.yearsTeaching} yr teaching`
                      : ""}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 border-t border-[var(--gym-border)] pt-5">
        {!showSignup ? (
          <button
            type="button"
            onClick={() => {
              setShowSignup(true);
              setSignupSuccess(null);
            }}
            className="gym-btn-ghost w-full"
          >
            New teacher application
          </button>
        ) : (
          <form onSubmit={handleTeacherSignup} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[var(--gym-ink)]">
                New teacher application
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowSignup(false);
                  setSignupError(null);
                }}
                className="gym-btn-ghost text-sm"
              >
                Back to roster
              </button>
            </div>

            <GymTeacherSignupFields
              value={signup}
              onChange={setSignup}
              disabled={signupLoading}
            />

            {signupError && (
              <p className="rounded-xl bg-[var(--gym-danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--gym-danger)]">
                {signupError}
              </p>
            )}

            <button
              type="submit"
              disabled={signupLoading}
              className="gym-btn-primary"
            >
              {signupLoading ? "Signing up…" : "Sign up as teacher"}
            </button>
          </form>
        )}
      </div>

      {signupSuccess && (
        <p className="mt-4 rounded-xl bg-[var(--gym-accent-soft)] px-4 py-3 text-sm font-semibold text-[var(--gym-accent)]">
          {signupSuccess}
        </p>
      )}
    </div>
  );
}
