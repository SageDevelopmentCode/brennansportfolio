import type { SupabaseClient } from "@supabase/supabase-js";

export type TaskType = "homework" | "chore";
export type Priority = "urgent" | "normal" | "later";
export type Repeat = "none" | "daily" | "weekly";
export type HubMode = "parent" | "kid";

export type HomeworkTask = {
  id: string;
  title: string;
  taskType: TaskType;
  priority: Priority;
  dueDate: string | null;
  repeat: Repeat;
  completedAt: string | null;
  createdAt: string;
};

export type HomeworkSettings = {
  weeklyAllowanceCents: number;
  savingsGoalTitle: string;
  savingsGoalCents: number;
  savingsBalanceCents: number;
  totalCompletions: number;
};

export type WeeklyPayout = {
  id: string;
  weekStart: string;
  amountCents: number;
  depositedAt: string;
};

type TaskRow = {
  id: string;
  title: string;
  task_type: TaskType;
  priority: Priority;
  due_date: string | null;
  repeat: Repeat;
  completed_at: string | null;
  created_at: string;
};

type SettingsRow = {
  weekly_allowance_cents: number;
  savings_goal_title: string;
  savings_goal_cents: number;
  savings_balance_cents: number;
  total_completions: number;
};

type PayoutRow = {
  id: string;
  week_start: string;
  amount_cents: number;
  deposited_at: string;
};

export const PRIORITY_ORDER: Priority[] = ["urgent", "normal", "later"];

export const PRIORITY_LABELS: Record<Priority, string> = {
  urgent: "Urgent",
  normal: "Normal",
  later: "Later",
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  urgent: "border-rose-400 bg-rose-50 text-rose-700",
  normal: "border-amber-400 bg-amber-50 text-amber-800",
  later: "border-violet-300 bg-violet-50 text-violet-700",
};

export const CELEBRATION_MESSAGES = [
  "Nice job!",
  "Crushed it!",
  "You're on fire!",
  "Boom! Done!",
  "Superstar move!",
  "Nailed it!",
  "Way to go!",
  "That's how it's done!",
  "Legendary!",
  "Keep it up!",
];

export type Badge = {
  id: string;
  name: string;
  emoji: string;
  threshold: number;
};

export const BADGES: Badge[] = [
  { id: "first", name: "First Step", emoji: "🌱", threshold: 1 },
  { id: "ten", name: "Getting Started", emoji: "⭐", threshold: 10 },
  { id: "twentyfive", name: "On a Roll", emoji: "🔥", threshold: 25 },
  { id: "fifty", name: "Task Machine", emoji: "⚡", threshold: 50 },
  { id: "hundred", name: "Legend", emoji: "👑", threshold: 100 },
];

export const MODE_STORAGE_KEY = "homework-hub-mode";

function toTask(row: TaskRow): HomeworkTask {
  return {
    id: row.id,
    title: row.title,
    taskType: row.task_type,
    priority: row.priority,
    dueDate: row.due_date,
    repeat: row.repeat,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

function toSettings(row: SettingsRow): HomeworkSettings {
  return {
    weeklyAllowanceCents: row.weekly_allowance_cents,
    savingsGoalTitle: row.savings_goal_title,
    savingsGoalCents: row.savings_goal_cents,
    savingsBalanceCents: row.savings_balance_cents,
    totalCompletions: row.total_completions,
  };
}

function toPayout(row: PayoutRow): WeeklyPayout {
  return {
    id: row.id,
    weekStart: row.week_start,
    amountCents: row.amount_cents,
    depositedAt: row.deposited_at,
  };
}

export function randomCelebrationMessage(): string {
  return CELEBRATION_MESSAGES[
    Math.floor(Math.random() * CELEBRATION_MESSAGES.length)
  ];
}

export function sortTasksByPriority(tasks: HomeworkTask[]): HomeworkTask[] {
  return [...tasks].sort((a, b) => {
    const priorityDiff =
      PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority);
    if (priorityDiff !== 0) return priorityDiff;

    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

export function groupTasksByPriority(tasks: HomeworkTask[]) {
  const incomplete = tasks.filter((task) => !task.completedAt);
  const sorted = sortTasksByPriority(incomplete);

  return PRIORITY_ORDER.map((priority) => ({
    priority,
    tasks: sorted.filter((task) => task.priority === priority),
  })).filter((group) => group.tasks.length > 0);
}

export function formatDueDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export function parseDollarsToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const dollars = Number(trimmed);
  if (Number.isNaN(dollars) || dollars < 0) return null;
  return Math.round(dollars * 100);
}

export function savingsProgressPercent(settings: HomeworkSettings): number {
  if (settings.savingsGoalCents <= 0) return 0;
  return Math.min(
    100,
    Math.round(
      (settings.savingsBalanceCents / settings.savingsGoalCents) * 100,
    ),
  );
}

export function getMondayOfWeek(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function nextDueDate(
  current: string | null,
  repeat: Repeat,
): string | null {
  const base = current ? new Date(`${current}T12:00:00`) : new Date();
  if (repeat === "daily") {
    base.setDate(base.getDate() + 1);
  } else if (repeat === "weekly") {
    base.setDate(base.getDate() + 7);
  } else {
    return null;
  }
  return base.toISOString().slice(0, 10);
}

export async function getHomeworkTasks(
  supabase: SupabaseClient,
): Promise<HomeworkTask[]> {
  const { data, error } = await supabase
    .from("homework_hub_tasks")
    .select(
      "id, title, task_type, priority, due_date, repeat, completed_at, created_at",
    )
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(toTask);
}

export async function getHomeworkSettings(
  supabase: SupabaseClient,
): Promise<HomeworkSettings> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Must be logged in");
  }

  const { data, error } = await supabase
    .from("homework_hub_settings")
    .select(
      "weekly_allowance_cents, savings_goal_title, savings_goal_cents, savings_balance_cents, total_completions",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;

  if (data) return toSettings(data);

  const { data: created, error: insertError } = await supabase
    .from("homework_hub_settings")
    .insert({ user_id: user.id })
    .select(
      "weekly_allowance_cents, savings_goal_title, savings_goal_cents, savings_balance_cents, total_completions",
    )
    .single();

  if (insertError) throw insertError;
  return toSettings(created);
}

export async function getCurrentWeekPayout(
  supabase: SupabaseClient,
): Promise<WeeklyPayout | null> {
  const weekStart = getMondayOfWeek();
  const { data, error } = await supabase
    .from("homework_hub_weekly_payouts")
    .select("id, week_start, amount_cents, deposited_at")
    .eq("week_start", weekStart)
    .maybeSingle();

  if (error) throw error;
  return data ? toPayout(data) : null;
}

export type HomeworkPreview = {
  urgentCount: number;
  savingsPercent: number;
};

export async function getHomeworkPreview(
  supabase: SupabaseClient,
): Promise<HomeworkPreview | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [tasksResult, settingsResult] = await Promise.all([
    supabase
      .from("homework_hub_tasks")
      .select("priority, completed_at")
      .eq("task_type", "homework"),
    supabase
      .from("homework_hub_settings")
      .select("savings_goal_cents, savings_balance_cents")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (tasksResult.error) throw tasksResult.error;
  if (settingsResult.error) throw settingsResult.error;

  const urgentCount = (tasksResult.data ?? []).filter(
    (task) => task.priority === "urgent" && !task.completed_at,
  ).length;

  const settings = settingsResult.data;
  const savingsPercent =
    settings && settings.savings_goal_cents > 0
      ? Math.min(
          100,
          Math.round(
            (settings.savings_balance_cents / settings.savings_goal_cents) *
              100,
          ),
        )
      : 0;

  return { urgentCount, savingsPercent };
}
