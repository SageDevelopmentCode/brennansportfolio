drop policy if exists "Authenticated non-creators can create rsvps" on public.rsvps;

create policy "Non-creators can create rsvps"
  on public.rsvps for insert to anon, authenticated
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
