import { FamilyCalendarAppClient } from "@/components/family-calendar-app-client";
import {
  ensureFamilyRoster,
  getFamilyCalendarEventsForWeek,
  getWeekRange,
} from "@/lib/family-calendar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function FamilyCalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/family-calendar");
  }

  const weekRange = getWeekRange(new Date());
  let members: Awaited<ReturnType<typeof ensureFamilyRoster>> = [];
  let events: Awaited<ReturnType<typeof getFamilyCalendarEventsForWeek>> = [];
  let loadError: string | null = null;

  try {
    members = await ensureFamilyRoster(supabase, user.id);
    events = await getFamilyCalendarEventsForWeek(supabase, weekRange);
  } catch (err) {
    loadError =
      err instanceof Error ? err.message : "Could not load family calendar.";
  }

  if (loadError) {
    return (
      <main className="fcal-bg flex flex-1 flex-col items-center justify-center px-4 py-16">
        <p className="max-w-md rounded-2xl border-2 border-rose-200 bg-rose-50 px-6 py-4 text-center font-semibold text-rose-700">
          {loadError}
        </p>
        <p className="mt-4 max-w-md text-center text-sm text-[var(--fcal-muted)]">
          If tables are missing, apply the family calendar migration in Supabase.
        </p>
      </main>
    );
  }

  return (
    <FamilyCalendarAppClient
      initialMembers={members}
      initialEvents={events}
      initialWeekAnchor={new Date().toISOString()}
    />
  );
}
