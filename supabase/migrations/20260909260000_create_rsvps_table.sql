create table public.rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  person text not null,
  created_at timestamptz not null default now(),
  constraint rsvps_person_not_blank check (char_length(trim(person)) > 0)
);

create index rsvps_event_id_idx on public.rsvps (event_id);

alter table public.rsvps enable row level security;

create policy "Anyone can read rsvps"
  on public.rsvps for select to anon, authenticated
  using (true);

create policy "Anyone can create rsvps"
  on public.rsvps for insert to anon, authenticated
  with check (true);
