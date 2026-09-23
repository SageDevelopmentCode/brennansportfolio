import { HomeworkHubClient } from "@/components/homework-hub-client";
import {
  getCurrentWeekPayout,
  getHomeworkSettings,
  getHomeworkTasks,
} from "@/lib/homework-hub";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function HomeworkPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/homework");
  }

  const [tasks, settings, currentWeekPayout] = await Promise.all([
    getHomeworkTasks(supabase),
    getHomeworkSettings(supabase),
    getCurrentWeekPayout(supabase),
  ]);

  return (
    <HomeworkHubClient
      initialTasks={tasks}
      initialSettings={settings}
      initialWeekPayout={currentWeekPayout}
    />
  );
}
