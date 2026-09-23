create policy "Anyone can update events"
  on public.events
  for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "Anyone can delete events"
  on public.events
  for delete
  to anon, authenticated
  using (true);
