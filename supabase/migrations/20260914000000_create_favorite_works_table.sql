-- Favorite works from Open Library (per-user)
create table public.favorite_works (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  work_key text not null,
  title text not null,
  author_names text[] not null default '{}',
  cover_id integer,
  first_publish_year integer,
  created_at timestamptz not null default now(),
  unique (user_id, work_key)
);

alter table public.favorite_works enable row level security;

create policy "Users can read own favorites"
  on public.favorite_works
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert own favorites"
  on public.favorite_works
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can delete own favorites"
  on public.favorite_works
  for delete
  to authenticated
  using (user_id = auth.uid());

create index favorite_works_user_id_idx on public.favorite_works (user_id);
