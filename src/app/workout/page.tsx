import { WorkoutAppClient } from "@/components/workout-app-client";
import {
  getActiveWorkoutSession,
  getRecentWorkoutSessions,
  getWorkoutTemplates,
} from "@/lib/workout";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function WorkoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/workout");
  }

  const [templates, sessions, activeSession] = await Promise.all([
    getWorkoutTemplates(supabase),
    getRecentWorkoutSessions(supabase),
    getActiveWorkoutSession(supabase),
  ]);

  return (
    <WorkoutAppClient
      initialTemplates={templates}
      initialSessions={sessions}
      initialActiveSession={activeSession}
    />
  );
}
