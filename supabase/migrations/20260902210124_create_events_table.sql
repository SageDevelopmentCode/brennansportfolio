-- Events table for portfolio
create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  description text,
  date date not null,
  time time not null,
  host text
);

-- Required for Supabase: lock down API access by default
alter table public.events enable row level security;

-- Public read (portfolio visitors can list events)
create policy "Anyone can read events"
  on public.events
  for select
  to anon, authenticated
  using (true);

-- Authenticated users can create events
create policy "Authenticated users can insert events"
  on public.events
  for insert
  to authenticated
  with check (true);

-- Authenticated users can update events
create policy "Authenticated users can update events"
  on public.events
  for update
  to authenticated
  using (true)
  with check (true);

-- Authenticated users can delete events
create policy "Authenticated users can delete events"
  on public.events
  for delete
  to authenticated
  using (true);
