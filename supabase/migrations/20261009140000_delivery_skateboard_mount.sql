-- Skate Drop: animal mounts per courier

alter table public.delivery_skateboards
  add column mount text not null default 'frog';

alter table public.delivery_skateboards
  add constraint delivery_skateboards_mount_check
  check (
    mount in (
      'frog',
      'turtle',
      'elephant',
      'snake',
      'ant',
      'fox',
      'turkey',
      'mosquito',
      'duck',
      'goose',
      'chicken'
    )
  );

drop function if exists public.delivery_add_skateboard(text);

create or replace function public.delivery_add_skateboard(
  p_name text,
  p_mount text default 'frog'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_mount text;
  v_row public.delivery_skateboards%rowtype;
begin
  v_name := left(trim(p_name), 80);
  v_mount := lower(trim(coalesce(p_mount, '')));

  if v_name = '' then
    return jsonb_build_object('ok', false, 'code', 'invalid_name');
  end if;

  if v_mount not in (
    'frog',
    'turtle',
    'elephant',
    'snake',
    'ant',
    'fox',
    'turkey',
    'mosquito',
    'duck',
    'goose',
    'chicken'
  ) then
    return jsonb_build_object('ok', false, 'code', 'invalid_mount');
  end if;

  insert into public.delivery_skateboards (name, mount)
  values (v_name, v_mount)
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'skateboard', jsonb_build_object(
      'id', v_row.id,
      'name', v_row.name,
      'mount', v_row.mount,
      'created_at', v_row.created_at
    )
  );
end;
$$;

grant execute on function public.delivery_add_skateboard(text, text) to anon, authenticated;
