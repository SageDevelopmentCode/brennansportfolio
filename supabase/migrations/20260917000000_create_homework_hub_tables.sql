-- Homework Hub: tasks, settings, and weekly allowance payouts

create type public.homework_task_type as enum ('homework', 'chore');
create type public.homework_priority as enum ('urgent', 'normal', 'later');
create type public.homework_repeat as enum ('none', 'daily', 'weekly');

create table public.homework_hub_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  task_type public.homework_task_type not null,
  priority public.homework_priority not null default 'normal',
  due_date date,
  repeat public.homework_repeat not null default 'none',
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.homework_hub_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  weekly_allowance_cents integer not null default 0 check (weekly_allowance_cents >= 0),
  savings_goal_title text not null default 'My goal',
  savings_goal_cents integer not null default 0 check (savings_goal_cents >= 0),
  savings_balance_cents integer not null default 0 check (savings_balance_cents >= 0),
  total_completions integer not null default 0 check (total_completions >= 0)
);

create table public.homework_hub_weekly_payouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  amount_cents integer not null check (amount_cents >= 0),
  deposited_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create index homework_hub_tasks_user_id_idx on public.homework_hub_tasks (user_id);
create index homework_hub_tasks_user_type_idx on public.homework_hub_tasks (user_id, task_type);
create index homework_hub_weekly_payouts_user_id_idx on public.homework_hub_weekly_payouts (user_id);

alter table public.homework_hub_tasks enable row level security;
alter table public.homework_hub_settings enable row level security;
alter table public.homework_hub_weekly_payouts enable row level security;

create policy "Users can read own tasks"
  on public.homework_hub_tasks for select to authenticated
  using (user_id = auth.uid());

create policy "Users can insert own tasks"
  on public.homework_hub_tasks for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own tasks"
  on public.homework_hub_tasks for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users can delete own tasks"
  on public.homework_hub_tasks for delete to authenticated
  using (user_id = auth.uid());

create policy "Users can read own settings"
  on public.homework_hub_settings for select to authenticated
  using (user_id = auth.uid());

create policy "Users can insert own settings"
  on public.homework_hub_settings for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own settings"
  on public.homework_hub_settings for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users can read own payouts"
  on public.homework_hub_weekly_payouts for select to authenticated
  using (user_id = auth.uid());

create policy "Users can insert own payouts"
  on public.homework_hub_weekly_payouts for insert to authenticated
  with check (user_id = auth.uid());
