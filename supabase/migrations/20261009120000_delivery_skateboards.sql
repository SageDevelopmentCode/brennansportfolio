-- Skate Drop: shared delivery skateboard fleet (no auth)

create table public.delivery_skateboards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create index delivery_skateboards_created_at_idx
  on public.delivery_skateboards (created_at desc);

alter table public.delivery_skateboards enable row level security;

create policy "Anyone can read delivery skateboards"
  on public.delivery_skateboards for select
  to anon, authenticated
  using (true);

create or replace function public.delivery_add_skateboard(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_row public.delivery_skateboards%rowtype;
begin
  v_name := left(trim(p_name), 80);

  if v_name = '' then
    return jsonb_build_object('ok', false, 'code', 'invalid_name');
  end if;

  insert into public.delivery_skateboards (name)
  values (v_name)
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'skateboard', jsonb_build_object(
      'id', v_row.id,
      'name', v_row.name,
      'created_at', v_row.created_at
    )
  );
end;
$$;

grant execute on function public.delivery_add_skateboard(text) to anon, authenticated;
