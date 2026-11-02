import type { SupabaseClient } from "@supabase/supabase-js";

export type WorkoutExercise = {
  id: string;
  name: string;
  sets: number | null;
  reps: number | null;
  sortOrder: number;
};

export type WorkoutTemplate = {
  id: string;
  name: string;
  createdAt: string;
  exercises: WorkoutExercise[];
};

export type WorkoutSessionExercise = WorkoutExercise & {
  completedAt: string | null;
};

export type WorkoutSession = {
  id: string;
  templateId: string | null;
  templateName: string;
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
  exercises: WorkoutSessionExercise[];
};

type TemplateRow = {
  id: string;
  name: string;
  created_at: string;
  workout_template_exercises: TemplateExerciseRow[] | null;
};

type TemplateExerciseRow = {
  id: string;
  name: string;
  sets: number | null;
  reps: number | null;
  sort_order: number;
};

type SessionRow = {
  id: string;
  template_id: string | null;
  template_name: string;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
  workout_session_exercises: SessionExerciseRow[] | null;
};

type SessionExerciseRow = {
  id: string;
  name: string;
  sets: number | null;
  reps: number | null;
  sort_order: number;
  completed_at: string | null;
};

function toExercise(row: TemplateExerciseRow): WorkoutExercise {
  return {
    id: row.id,
    name: row.name,
    sets: row.sets,
    reps: row.reps,
    sortOrder: row.sort_order,
  };
}

function toTemplate(row: TemplateRow): WorkoutTemplate {
  const exercises = (row.workout_template_exercises ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(toExercise);

  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    exercises,
  };
}

function toSessionExercise(row: SessionExerciseRow): WorkoutSessionExercise {
  return {
    id: row.id,
    name: row.name,
    sets: row.sets,
    reps: row.reps,
    sortOrder: row.sort_order,
    completedAt: row.completed_at,
  };
}

function toSession(row: SessionRow): WorkoutSession {
  const exercises = (row.workout_session_exercises ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(toSessionExercise);

  return {
    id: row.id,
    templateId: row.template_id,
    templateName: row.template_name,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationMs: row.duration_ms,
    exercises,
  };
}

const TEMPLATE_SELECT = `
  id,
  name,
  created_at,
  workout_template_exercises (
    id,
    name,
    sets,
    reps,
    sort_order
  )
`;

const SESSION_SELECT = `
  id,
  template_id,
  template_name,
  started_at,
  ended_at,
  duration_ms,
  workout_session_exercises (
    id,
    name,
    sets,
    reps,
    sort_order,
    completed_at
  )
`;

export async function getWorkoutTemplates(
  supabase: SupabaseClient,
): Promise<WorkoutTemplate[]> {
  const { data, error } = await supabase
    .from("workout_templates")
    .select(TEMPLATE_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => toTemplate(row as TemplateRow));
}

export async function getRecentWorkoutSessions(
  supabase: SupabaseClient,
  limit = 20,
): Promise<WorkoutSession[]> {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select(SESSION_SELECT)
    .not("ended_at", "is", null)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map((row) => toSession(row as SessionRow));
}

export async function getActiveWorkoutSession(
  supabase: SupabaseClient,
): Promise<WorkoutSession | null> {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select(SESSION_SELECT)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return toSession(data as SessionRow);
}

export function formatDurationMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatSessionDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function exerciseDetailLabel(exercise: {
  sets: number | null;
  reps: number | null;
}): string | null {
  const parts: string[] = [];
  if (exercise.sets != null) parts.push(`${exercise.sets} set${exercise.sets === 1 ? "" : "s"}`);
  if (exercise.reps != null) parts.push(`${exercise.reps} rep${exercise.reps === 1 ? "" : "s"}`);
  return parts.length > 0 ? parts.join(" · ") : null;
}
