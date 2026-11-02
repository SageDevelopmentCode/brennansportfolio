-- Favorite stocks for Ticker Tape watchlist (per-user)
create table public.favorite_stocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  name text not null,
  exchange text,
  created_at timestamptz not null default now(),
  unique (user_id, symbol)
);

alter table public.favorite_stocks enable row level security;

create policy "Users can read own favorite stocks"
  on public.favorite_stocks
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert own favorite stocks"
  on public.favorite_stocks
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can delete own favorite stocks"
  on public.favorite_stocks
  for delete
  to authenticated
  using (user_id = auth.uid());

create index favorite_stocks_user_id_idx on public.favorite_stocks (user_id);
