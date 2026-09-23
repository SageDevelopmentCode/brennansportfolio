-- Favorite cities for Skyline weather (per-user)
create table public.favorite_cities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  city_key text not null,
  name text not null,
  country text not null,
  latitude double precision not null,
  longitude double precision not null,
  timezone text not null,
  created_at timestamptz not null default now(),
  unique (user_id, city_key)
);

alter table public.favorite_cities enable row level security;

create policy "Users can read own favorite cities"
  on public.favorite_cities
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert own favorite cities"
  on public.favorite_cities
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can delete own favorite cities"
  on public.favorite_cities
  for delete
  to authenticated
  using (user_id = auth.uid());

create index favorite_cities_user_id_idx on public.favorite_cities (user_id);
