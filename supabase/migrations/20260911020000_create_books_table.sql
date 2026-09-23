-- Books table for reading list / ratings project
create table public.books (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  score numeric(4, 1),
  pages integer,
  series boolean not null default false
);

alter table public.books enable row level security;

-- Public read (portfolio visitors can view the reading list)
create policy "Anyone can read books"
  on public.books
  for select
  to anon, authenticated
  using (true);

-- Authenticated users can manage books
create policy "Authenticated users can insert books"
  on public.books
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update books"
  on public.books
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete books"
  on public.books
  for delete
  to authenticated
  using (true);
