"use client";

import { CreateWorkoutDialog } from "@/components/create-workout-dialog";
import { WorkoutActiveSession } from "@/components/workout-active-session";
import { WorkoutSessionHistory } from "@/components/workout-session-history";
import { WorkoutTemplateList } from "@/components/workout-template-list";
import type { WorkoutSession, WorkoutTemplate } from "@/lib/workout";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useState } from "react";

type Tab = "templates" | "history";

type WorkoutAppClientProps = {
  initialTemplates: WorkoutTemplate[];
  initialSessions: WorkoutSession[];
  initialActiveSession: WorkoutSession | null;
};

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "templates", label: "Templates", emoji: "📋" },
  { id: "history", label: "History", emoji: "📈" },
];

export function WorkoutAppClient({
  initialTemplates,
  initialSessions,
  initialActiveSession,
}: WorkoutAppClientProps) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [sessions, setSessions] = useState(initialSessions);
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(
    initialActiveSession,
  );
  const [activeTab, setActiveTab] = useState<Tab>("templates");
  const [busyTemplateId, setBusyTemplateId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startTemplate(template: WorkoutTemplate) {
    if (activeSession) {
      setError("Finish your current workout before starting another.");
      return;
    }

    setError(null);
    setBusyTemplateId(template.id);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setBusyTemplateId(null);
      setError("You must be logged in.");
      return;
    }

    const { data: sessionRow, error: sessionError } = await supabase
      .from("workout_sessions")
      .insert({
        user_id: user.id,
        template_id: template.id,
        template_name: template.name,
      })
      .select(
        "id, template_id, template_name, started_at, ended_at, duration_ms",
      )
      .single();

    if (sessionError || !sessionRow) {
      setBusyTemplateId(null);
      setError(sessionError?.message ?? "Could not start session.");
      return;
    }

    let sessionExercises: WorkoutSession["exercises"] = [];

    if (template.exercises.length > 0) {
      const { data: exerciseRows, error: exerciseError } = await supabase
        .from("workout_session_exercises")
        .insert(
          template.exercises.map((exercise) => ({
            session_id: sessionRow.id,
            user_id: user.id,
            name: exercise.name,
            sets: exercise.sets,
            reps: exercise.reps,
            sort_order: exercise.sortOrder,
          })),
        )
        .select("id, name, sets, reps, sort_order, completed_at");

      if (exerciseError) {
        await supabase.from("workout_sessions").delete().eq("id", sessionRow.id);
        setBusyTemplateId(null);
        setError(exerciseError.message);
        return;
      }

      sessionExercises = (exerciseRows ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((row) => ({
          id: row.id,
          name: row.name,
          sets: row.sets,
          reps: row.reps,
          sortOrder: row.sort_order,
          completedAt: row.completed_at,
        }));
    }

    setBusyTemplateId(null);
    setActiveSession({
      id: sessionRow.id,
      templateId: sessionRow.template_id,
      templateName: sessionRow.template_name,
      startedAt: sessionRow.started_at,
      endedAt: sessionRow.ended_at,
      durationMs: sessionRow.duration_ms,
      exercises: sessionExercises,
    });
  }

  async function deleteTemplate(templateId: string) {
    setError(null);
    setDeletingId(templateId);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("workout_templates")
      .delete()
      .eq("id", templateId);

    setDeletingId(null);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setTemplates((current) => current.filter((template) => template.id !== templateId));
  }

  function handleTemplateCreated(template: WorkoutTemplate) {
    setTemplates((current) => [template, ...current]);
  }

  function handleSessionFinished(session: WorkoutSession) {
    setActiveSession(null);
    setSessions((current) => [session, ...current]);
    setActiveTab("history");
  }

  return (
    <main className="workout-bg relative flex flex-1 flex-col gap-8 px-4 py-8 sm:px-8 sm:py-12">
      <div className="relative z-10">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-full border-2 border-[var(--workout-border)] bg-[var(--workout-glass)] px-4 py-2 text-sm font-bold text-[var(--workout-ink)] transition hover:border-[var(--workout-accent)]"
        >
          ← All projects
        </Link>
      </div>

      <header className="relative z-10 max-w-3xl">
        <span className="inline-block rounded-full bg-[var(--workout-accent-soft)] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[var(--workout-accent)]">
          Train & track
        </span>
        <h1 className="mt-4 text-5xl font-extrabold leading-tight sm:text-6xl">
          <span className="workout-title-gradient">Rep Rack</span>
        </h1>
        <p className="mt-4 text-lg text-[var(--workout-muted)]">
          Build reusable workouts, run them with a built-in stopwatch, and log
          every session to your history.
        </p>
      </header>

      {activeSession ? (
        <div className="relative z-10 max-w-2xl">
          <WorkoutActiveSession
            session={activeSession}
            onFinished={handleSessionFinished}
          />
        </div>
      ) : (
        <>
          <div className="relative z-10 flex flex-wrap items-center gap-3">
            <CreateWorkoutDialog onCreated={handleTemplateCreated} />
          </div>

          <div
            className="relative z-10 flex flex-wrap gap-2"
            role="tablist"
            aria-label="Workout sections"
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full border-2 px-4 py-2 text-sm font-bold transition ${
                  activeTab === tab.id
                    ? "border-[var(--workout-accent)] bg-[var(--workout-accent)] text-white shadow-lg"
                    : "border-[var(--workout-border)] bg-white text-[var(--workout-ink)] hover:border-[var(--workout-accent)]"
                }`}
              >
                {tab.emoji} {tab.label}
              </button>
            ))}
          </div>

          {error ? (
            <p className="relative z-10 max-w-2xl rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">
              {error}
            </p>
          ) : null}

          <div className="relative z-10 max-w-4xl" role="tabpanel">
            {activeTab === "templates" ? (
              <WorkoutTemplateList
                templates={templates}
                onStart={startTemplate}
                onDelete={deleteTemplate}
                busyTemplateId={busyTemplateId}
                deletingId={deletingId}
              />
            ) : (
              <WorkoutSessionHistory sessions={sessions} />
            )}
          </div>
        </>
      )}
    </main>
  );
}
