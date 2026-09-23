"use client";

import {
  formatCents,
  getMondayOfWeek,
  parseDollarsToCents,
  savingsProgressPercent,
  type HomeworkSettings,
  type HubMode,
  type WeeklyPayout,
} from "@/lib/homework-hub";
import { createClient } from "@/lib/supabase/client";
import { FormEvent, useState } from "react";

type SavingsTabProps = {
  settings: HomeworkSettings;
  currentWeekPayout: WeeklyPayout | null;
  mode: HubMode;
  onSettingsUpdated: (settings: HomeworkSettings) => void;
  onPayoutDeposited: (payout: WeeklyPayout, settings: HomeworkSettings) => void;
};

export function SavingsTab({
  settings,
  currentWeekPayout,
  mode,
  onSettingsUpdated,
  onPayoutDeposited,
}: SavingsTabProps) {
  const [allowanceInput, setAllowanceInput] = useState(
    (settings.weeklyAllowanceCents / 100).toString(),
  );
  const [goalTitle, setGoalTitle] = useState(settings.savingsGoalTitle);
  const [goalAmountInput, setGoalAmountInput] = useState(
    settings.savingsGoalCents > 0
      ? (settings.savingsGoalCents / 100).toString()
      : "",
  );
  const [saving, setSaving] = useState(false);
  const [depositing, setDepositing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const progress = savingsProgressPercent(settings);
  const weekStart = getMondayOfWeek();
  const canDeposit =
    mode === "parent" &&
    !currentWeekPayout &&
    settings.weeklyAllowanceCents > 0;

  async function handleSaveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const allowanceCents = parseDollarsToCents(allowanceInput);
    const goalCents = parseDollarsToCents(goalAmountInput);

    if (allowanceCents === null || goalCents === null) {
      setError("Enter valid dollar amounts.");
      return;
    }

    if (!goalTitle.trim()) {
      setError("Goal name is required.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      setError("You must be logged in.");
      return;
    }

    const { data, error: updateError } = await supabase
      .from("homework_hub_settings")
      .update({
        weekly_allowance_cents: allowanceCents,
        savings_goal_title: goalTitle.trim(),
        savings_goal_cents: goalCents,
      })
      .eq("user_id", user.id)
      .select(
        "weekly_allowance_cents, savings_goal_title, savings_goal_cents, savings_balance_cents, total_completions",
      )
      .single();

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    const updated = {
      weeklyAllowanceCents: data.weekly_allowance_cents,
      savingsGoalTitle: data.savings_goal_title,
      savingsGoalCents: data.savings_goal_cents,
      savingsBalanceCents: data.savings_balance_cents,
      totalCompletions: data.total_completions,
    };
    onSettingsUpdated(updated);
    setMessage("Settings saved!");
  }

  async function handleDeposit() {
    setError(null);
    setMessage(null);
    setDepositing(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setDepositing(false);
      setError("You must be logged in.");
      return;
    }

    const amount = settings.weeklyAllowanceCents;
    const newBalance = settings.savingsBalanceCents + amount;

    const { data: payout, error: payoutError } = await supabase
      .from("homework_hub_weekly_payouts")
      .insert({
        user_id: user.id,
        week_start: weekStart,
        amount_cents: amount,
      })
      .select("id, week_start, amount_cents, deposited_at")
      .single();

    if (payoutError) {
      setDepositing(false);
      setError(payoutError.message);
      return;
    }

    const { data: updatedSettings, error: settingsError } = await supabase
      .from("homework_hub_settings")
      .update({ savings_balance_cents: newBalance })
      .eq("user_id", user.id)
      .select(
        "weekly_allowance_cents, savings_goal_title, savings_goal_cents, savings_balance_cents, total_completions",
      )
      .single();

    setDepositing(false);

    if (settingsError) {
      setError(settingsError.message);
      return;
    }

    const settingsResult = {
      weeklyAllowanceCents: updatedSettings.weekly_allowance_cents,
      savingsGoalTitle: updatedSettings.savings_goal_title,
      savingsGoalCents: updatedSettings.savings_goal_cents,
      savingsBalanceCents: updatedSettings.savings_balance_cents,
      totalCompletions: updatedSettings.total_completions,
    };

    onPayoutDeposited(
      {
        id: payout.id,
        weekStart: payout.week_start,
        amountCents: payout.amount_cents,
        depositedAt: payout.deposited_at,
      },
      settingsResult,
    );
    setMessage(`Deposited ${formatCents(amount)} toward your goal!`);
  }

  return (
    <div className="space-y-6">
      <section className="homework-glass-card rounded-2xl p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--homework-muted)]">
          Savings goal
        </p>
        <h3 className="mt-2 text-2xl font-extrabold text-[var(--homework-ink)]">
          {settings.savingsGoalTitle}
        </h3>
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm font-bold">
            <span className="text-[var(--homework-ink)]">
              {formatCents(settings.savingsBalanceCents)} saved
            </span>
            <span className="text-[var(--homework-muted)]">
              Goal: {formatCents(settings.savingsGoalCents)}
            </span>
          </div>
          <div className="mt-2 h-4 overflow-hidden rounded-full bg-violet-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-lime-400 to-emerald-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-sm font-semibold text-[var(--homework-muted)]">
            {progress}% of your goal
          </p>
        </div>
      </section>

      <section className="homework-glass-card rounded-2xl p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--homework-muted)]">
          This week
        </p>
        <p className="mt-2 text-lg font-bold text-[var(--homework-ink)]">
          Weekly allowance: {formatCents(settings.weeklyAllowanceCents)}
        </p>
        {currentWeekPayout ? (
          <p className="mt-2 text-sm font-semibold text-lime-700">
            Allowance deposited this week ({formatCents(currentWeekPayout.amountCents)})
          </p>
        ) : mode === "parent" ? (
          <button
            type="button"
            onClick={handleDeposit}
            disabled={!canDeposit || depositing}
            className="homework-btn-primary mt-4 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {depositing
              ? "Depositing..."
              : canDeposit
                ? "Deposit this week's allowance"
                : "Set a weekly allowance first"}
          </button>
        ) : (
          <p className="mt-2 text-sm text-[var(--homework-muted)]">
            Parent can deposit allowance when chores are done.
          </p>
        )}
      </section>

      {mode === "parent" ? (
        <section className="homework-glass-card rounded-2xl p-6">
          <h3 className="text-lg font-extrabold text-[var(--homework-ink)]">
            Parent settings
          </h3>
          <form onSubmit={handleSaveSettings} className="mt-4 space-y-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-bold">Weekly allowance ($)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={allowanceInput}
                onChange={(event) => setAllowanceInput(event.target.value)}
                className="homework-input"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-bold">Savings goal name</span>
              <input
                type="text"
                value={goalTitle}
                onChange={(event) => setGoalTitle(event.target.value)}
                className="homework-input"
                placeholder="New game"
                maxLength={80}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-bold">Goal amount ($)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={goalAmountInput}
                onChange={(event) => setGoalAmountInput(event.target.value)}
                className="homework-input"
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="homework-btn-secondary disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save settings"}
            </button>
          </form>
        </section>
      ) : null}

      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg bg-lime-50 px-3 py-2 text-sm font-semibold text-lime-700">
          {message}
        </p>
      ) : null}
    </div>
  );
}
