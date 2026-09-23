create policy "Anyone can insert events"
  on public.events
  for insert
  to anon, authenticated
  with check (true);
