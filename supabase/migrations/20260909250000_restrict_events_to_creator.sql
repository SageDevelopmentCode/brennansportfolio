drop policy if exists "Anyone can insert events" on public.events;
drop policy if exists "Anyone can update events" on public.events;
drop policy if exists "Anyone can delete events" on public.events;
drop policy if exists "Authenticated users can insert events" on public.events;
drop policy if exists "Authenticated users can update events" on public.events;
drop policy if exists "Authenticated users can delete events" on public.events;

create or replace function public.current_username()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select username from public.users where id = auth.uid();
$$;

create policy "Creators can insert events"
  on public.events for insert to authenticated
  with check (
    created_by = public.current_username()
    and created_by is not null
  );

create policy "Creators can update own events"
  on public.events for update to authenticated
  using (created_by = public.current_username())
  with check (created_by = public.current_username());

create policy "Creators can delete own events"
  on public.events for delete to authenticated
  using (created_by = public.current_username());
