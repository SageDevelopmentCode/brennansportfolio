-- Family calendar: members and timed events per user

create table public.family_calendar_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.family_calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid not null references public.family_calendar_members(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  notes text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index family_calendar_members_user_id_idx
  on public.family_calendar_members (user_id, sort_order);

create index family_calendar_events_user_starts_idx
  on public.family_calendar_events (user_id, starts_at);

alter table public.family_calendar_members enable row level security;
alter table public.family_calendar_events enable row level security;

create policy "Users can read own family calendar members"
  on public.family_calendar_members for select to authenticated
  using (user_id = auth.uid());

create policy "Users can insert own family calendar members"
  on public.family_calendar_members for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own family calendar members"
  on public.family_calendar_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users can delete own family calendar members"
  on public.family_calendar_members for delete to authenticated
  using (user_id = auth.uid());

create policy "Users can read own family calendar events"
  on public.family_calendar_events for select to authenticated
  using (user_id = auth.uid());

create policy "Users can insert own family calendar events"
  on public.family_calendar_events for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own family calendar events"
  on public.family_calendar_events for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users can delete own family calendar events"
  on public.family_calendar_events for delete to authenticated
  using (user_id = auth.uid());
