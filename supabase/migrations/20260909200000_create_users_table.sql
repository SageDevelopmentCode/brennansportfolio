create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now(),
  constraint users_username_lowercase check (username = lower(username)),
  constraint users_username_format check (username ~ '^[a-z0-9_]{3,20}$')
);

create unique index users_username_key on public.users (username);

alter table public.users enable row level security;

create policy "Users can insert own profile"
  on public.users for insert to authenticated
  with check (auth.uid() = id);

create policy "Users can read profiles"
  on public.users for select to anon, authenticated
  using (true);
