-- Workout app: templates, exercises, sessions

create table public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.workout_template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workout_templates(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sets integer check (sets is null or sets > 0),
  reps integer check (reps is null or reps > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid references public.workout_templates(id) on delete set null,
  template_name text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_ms integer check (duration_ms is null or duration_ms >= 0)
);

create table public.workout_session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sets integer check (sets is null or sets > 0),
  reps integer check (reps is null or reps > 0),
  sort_order integer not null default 0,
  completed_at timestamptz
);

create index workout_templates_user_id_idx on public.workout_templates (user_id);
create index workout_template_exercises_template_id_idx
  on public.workout_template_exercises (template_id);
create index workout_template_exercises_user_id_idx
  on public.workout_template_exercises (user_id);
create index workout_sessions_user_started_idx
  on public.workout_sessions (user_id, started_at desc);
create index workout_session_exercises_session_id_idx
  on public.workout_session_exercises (session_id);

alter table public.workout_templates enable row level security;
alter table public.workout_template_exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_session_exercises enable row level security;

create policy "Users can read own workout templates"
  on public.workout_templates for select to authenticated
  using (user_id = auth.uid());

create policy "Users can insert own workout templates"
  on public.workout_templates for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own workout templates"
  on public.workout_templates for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users can delete own workout templates"
  on public.workout_templates for delete to authenticated
  using (user_id = auth.uid());

create policy "Users can read own template exercises"
  on public.workout_template_exercises for select to authenticated
  using (user_id = auth.uid());

create policy "Users can insert own template exercises"
  on public.workout_template_exercises for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own template exercises"
  on public.workout_template_exercises for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users can delete own template exercises"
  on public.workout_template_exercises for delete to authenticated
  using (user_id = auth.uid());

create policy "Users can read own workout sessions"
  on public.workout_sessions for select to authenticated
  using (user_id = auth.uid());

create policy "Users can insert own workout sessions"
  on public.workout_sessions for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own workout sessions"
  on public.workout_sessions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users can delete own workout sessions"
  on public.workout_sessions for delete to authenticated
  using (user_id = auth.uid());

create policy "Users can read own session exercises"
  on public.workout_session_exercises for select to authenticated
  using (user_id = auth.uid());

create policy "Users can insert own session exercises"
  on public.workout_session_exercises for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own session exercises"
  on public.workout_session_exercises for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users can delete own session exercises"
  on public.workout_session_exercises for delete to authenticated
  using (user_id = auth.uid());
