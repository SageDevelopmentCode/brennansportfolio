"use client";

import { BadgesRow } from "@/components/badges-row";
import { CreateTaskDialog } from "@/components/create-task-dialog";
import { SavingsTab } from "@/components/savings-tab";
import { TaskCompleteCelebration } from "@/components/task-complete-celebration";
import { TaskList } from "@/components/task-list";
import {
  MODE_STORAGE_KEY,
  nextDueDate,
  randomCelebrationMessage,
  type HomeworkSettings,
  type HomeworkTask,
  type HubMode,
  type WeeklyPayout,
} from "@/lib/homework-hub";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useEffect, useState } from "react";

type Tab = "homework" | "chores" | "savings";

type HomeworkHubClientProps = {
  initialTasks: HomeworkTask[];
  initialSettings: HomeworkSettings;
  initialWeekPayout: WeeklyPayout | null;
};

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "homework", label: "Homework", emoji: "📚" },
  { id: "chores", label: "Chores", emoji: "🧹" },
  { id: "savings", label: "Savings", emoji: "💰" },
];

export function HomeworkHubClient({
  initialTasks,
  initialSettings,
  initialWeekPayout,
}: HomeworkHubClientProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [settings, setSettings] = useState(initialSettings);
  const [currentWeekPayout, setCurrentWeekPayout] = useState(initialWeekPayout);
  const [activeTab, setActiveTab] = useState<Tab>("homework");
  const [mode, setMode] = useState<HubMode>("kid");
  const [celebration, setCelebration] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(MODE_STORAGE_KEY);
    if (stored === "parent" || stored === "kid") {
      setMode(stored);
    }
  }, []);

  function switchMode(nextMode: HubMode) {
    setMode(nextMode);
    localStorage.setItem(MODE_STORAGE_KEY, nextMode);
  }

  function handleTaskCreated(task: HomeworkTask) {
    setTasks((current) => [...current, task]);
  }

  async function handleComplete(taskId: string) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.completedAt) return;

    setCompletingId(taskId);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    const completedAt = new Date().toISOString();

    const { data: updatedSettings, error: settingsError } = await supabase
      .from("homework_hub_settings")
      .update({
        total_completions: settings.totalCompletions + 1,
      })
      .eq("user_id", user.id)
      .select(
        "weekly_allowance_cents, savings_goal_title, savings_goal_cents, savings_balance_cents, total_completions",
      )
      .single();

    if (settingsError) {
      setCompletingId(null);
      return;
    }

    const newSettings = {
      weeklyAllowanceCents: updatedSettings.weekly_allowance_cents,
      savingsGoalTitle: updatedSettings.savings_goal_title,
      savingsGoalCents: updatedSettings.savings_goal_cents,
      savingsBalanceCents: updatedSettings.savings_balance_cents,
      totalCompletions: updatedSettings.total_completions,
    };
    setSettings(newSettings);

    if (task.repeat === "none") {
      const { error } = await supabase
        .from("homework_hub_tasks")
        .update({ completed_at: completedAt })
        .eq("id", taskId);

      setCompletingId(null);
      if (error) return;

      setTasks((current) =>
        current.map((item) =>
          item.id === taskId ? { ...item, completedAt } : item,
        ),
      );
    } else {
      const newDueDate = nextDueDate(task.dueDate, task.repeat);
      const { error } = await supabase
        .from("homework_hub_tasks")
        .update({
          completed_at: null,
          due_date: newDueDate,
        })
        .eq("id", taskId);

      setCompletingId(null);
      if (error) return;

      setTasks((current) =>
        current.map((item) =>
          item.id === taskId
            ? { ...item, completedAt: null, dueDate: newDueDate }
            : item,
        ),
      );
    }

    setCelebration(randomCelebrationMessage());
  }

  async function handleDelete(taskId: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("homework_hub_tasks")
      .delete()
      .eq("id", taskId);

    if (error) return;
    setTasks((current) => current.filter((task) => task.id !== taskId));
  }

  return (
    <main className="homework-bg relative flex flex-1 flex-col gap-8 px-4 py-8 sm:px-8 sm:py-12">
      <TaskCompleteCelebration
        message={celebration}
        onDismiss={() => setCelebration(null)}
      />

      <Link
        href="/"
        className="relative z-10 inline-flex w-fit items-center gap-2 rounded-full border-2 border-violet-200 bg-white/90 px-4 py-2 text-sm font-bold text-violet-700 shadow-sm transition hover:border-violet-300 hover:shadow-md"
      >
        ← All projects
      </Link>

      <header className="relative z-10 max-w-3xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-block rounded-full bg-lime-200 px-3 py-1 text-xs font-bold uppercase tracking-widest text-lime-800">
              Family task tracker
            </span>
            <h1 className="mt-4 text-5xl font-extrabold leading-tight sm:text-6xl">
              <span className="homework-title-gradient">Homework Hub</span>
            </h1>
            <p className="mt-4 text-lg text-[var(--homework-muted)]">
              Crush homework, nail chores, and save up for your goals!
            </p>
          </div>
          <span className="text-6xl drop-shadow-lg" aria-hidden>📝</span>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-full border-2 border-violet-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => switchMode("kid")}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                mode === "kid"
                  ? "bg-violet-600 text-white shadow"
                  : "text-violet-700 hover:bg-violet-50"
              }`}
            >
              Kid mode
            </button>
            <button
              type="button"
              onClick={() => switchMode("parent")}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                mode === "parent"
                  ? "bg-violet-600 text-white shadow"
                  : "text-violet-700 hover:bg-violet-50"
              }`}
            >
              Parent mode
            </button>
          </div>
          <span className="text-sm font-semibold text-[var(--homework-muted)]">
            {mode === "parent"
              ? "You can add tasks and manage savings."
              : "Complete tasks and earn badges!"}
          </span>
        </div>
      </header>

      <BadgesRow totalCompletions={settings.totalCompletions} />

      <div className="relative z-10">
        <div className="flex flex-wrap gap-2 border-b-2 border-violet-200 pb-3">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                activeTab === tab.id
                  ? "bg-violet-600 text-white shadow-md"
                  : "bg-white/80 text-violet-700 hover:bg-violet-100"
              }`}
            >
              <span aria-hidden>{tab.emoji}</span> {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {activeTab === "homework" ? (
            <div className="space-y-4">
              {mode === "parent" ? (
                <CreateTaskDialog
                  taskType="homework"
                  onTaskCreated={handleTaskCreated}
                />
              ) : null}
              <TaskList
                tasks={tasks}
                taskType="homework"
                mode={mode}
                onComplete={handleComplete}
                onDelete={handleDelete}
                completingId={completingId}
              />
            </div>
          ) : null}

          {activeTab === "chores" ? (
            <div className="space-y-4">
              {mode === "parent" ? (
                <CreateTaskDialog
                  taskType="chore"
                  onTaskCreated={handleTaskCreated}
                />
              ) : null}
              <TaskList
                tasks={tasks}
                taskType="chore"
                mode={mode}
                onComplete={handleComplete}
                onDelete={handleDelete}
                completingId={completingId}
              />
            </div>
          ) : null}

          {activeTab === "savings" ? (
            <SavingsTab
              settings={settings}
              currentWeekPayout={currentWeekPayout}
              mode={mode}
              onSettingsUpdated={setSettings}
              onPayoutDeposited={(payout, updatedSettings) => {
                setCurrentWeekPayout(payout);
                setSettings(updatedSettings);
              }}
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}
