-- Event ownership: tie to auth user id
alter table public.events
  add column if not exists created_by_user_id uuid references auth.users(id);

update public.events e
set created_by_user_id = u.id
from public.users u
where e.created_by = u.username
  and e.created_by_user_id is null;

create index if not exists events_created_by_user_id_idx
  on public.events (created_by_user_id);

-- Replace event RLS policies with user-id aware checks
drop policy if exists "Creators can insert events" on public.events;
drop policy if exists "Creators can update own events" on public.events;
drop policy if exists "Creators can delete own events" on public.events;

create policy "Creators can insert events"
  on public.events for insert to authenticated
  with check (
    created_by = public.current_username()
    and created_by is not null
    and created_by_user_id = auth.uid()
  );

create policy "Creators can update own events"
  on public.events for update to authenticated
  using (
    created_by = public.current_username()
    or created_by_user_id = auth.uid()
  )
  with check (
    created_by = public.current_username()
    or created_by_user_id = auth.uid()
  );

create policy "Creators can delete own events"
  on public.events for delete to authenticated
  using (
    created_by = public.current_username()
    or created_by_user_id = auth.uid()
  );

-- Public RSVP view without addresses
create or replace view public.rsvp_public as
  select id, event_id, person, guest_count, created_at
  from public.rsvps;

grant select on public.rsvp_public to anon, authenticated;

-- RSVP read: creators see full rows; public uses rsvp_public view
drop policy if exists "Anyone can read rsvps" on public.rsvps;

create policy "Creators read rsvps for own events"
  on public.rsvps for select to authenticated
  using (
    exists (
      select 1
      from public.events e
      where e.id = event_id
        and (
          e.created_by = public.current_username()
          or e.created_by_user_id = auth.uid()
        )
    )
  );

-- RSVP insert: authenticated only, block event creators
drop policy if exists "Non-creators can create rsvps" on public.rsvps;
drop policy if exists "Anyone can create rsvps" on public.rsvps;

create policy "Authenticated non-creators can create rsvps"
  on public.rsvps for insert to authenticated
  with check (
    not exists (
      select 1
      from public.events e
      where e.id = event_id
        and (
          e.created_by = public.current_username()
          or e.created_by_user_id = auth.uid()
        )
    )
  );

-- RSVP integrity constraints
create unique index if not exists rsvps_event_person_unique
  on public.rsvps (event_id, lower(trim(person)));

alter table public.rsvps drop constraint if exists rsvps_guest_count_non_negative;

alter table public.rsvps
  add constraint rsvps_guest_count_range
  check (guest_count >= 0 and guest_count <= 20);

-- Realtime for multi-user sync
do $$
begin
  alter publication supabase_realtime add table public.events;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.rsvps;
exception
  when duplicate_object then null;
end $$;
