-- Multiple family members per event (junction table)

create table public.family_calendar_event_members (
  event_id uuid not null references public.family_calendar_events(id) on delete cascade,
  member_id uuid not null references public.family_calendar_members(id) on delete cascade,
  primary key (event_id, member_id)
);

create index family_calendar_event_members_event_id_idx
  on public.family_calendar_event_members (event_id);

create index family_calendar_event_members_member_id_idx
  on public.family_calendar_event_members (member_id);

insert into public.family_calendar_event_members (event_id, member_id)
select id, member_id
from public.family_calendar_events
where member_id is not null;

alter table public.family_calendar_events
  drop column member_id;

alter table public.family_calendar_event_members enable row level security;

create policy "Users can read own event member assignments"
  on public.family_calendar_event_members for select to authenticated
  using (
    exists (
      select 1
      from public.family_calendar_events e
      where e.id = event_id and e.user_id = auth.uid()
    )
  );

create policy "Users can insert own event member assignments"
  on public.family_calendar_event_members for insert to authenticated
  with check (
    exists (
      select 1
      from public.family_calendar_events e
      where e.id = event_id and e.user_id = auth.uid()
    )
  );

create policy "Users can delete own event member assignments"
  on public.family_calendar_event_members for delete to authenticated
  using (
    exists (
      select 1
      from public.family_calendar_events e
      where e.id = event_id and e.user_id = auth.uid()
    )
  );
