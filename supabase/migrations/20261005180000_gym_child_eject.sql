-- Child CRUD after approval + soft eject to space prison

alter table public.gym_check_in_children
  add column ejected_at timestamptz;

create index gym_check_in_children_request_ejected_idx
  on public.gym_check_in_children (request_id, ejected_at);

create or replace function public.gym_parse_check_in_child(p_child jsonb)
returns table (
  name text,
  age smallint,
  height text,
  size text,
  favorite_food text
)
language plpgsql
immutable
as $$
declare
  v_name text;
  v_height text;
  v_size text;
  v_favorite_food text;
  v_age smallint;
begin
  v_name := trim(coalesce(p_child->>'name', ''));
  v_height := trim(coalesce(p_child->>'height', ''));
  v_size := trim(coalesce(p_child->>'size', ''));
  v_favorite_food := trim(coalesce(p_child->>'favorite_food', ''));

  if v_name = ''
    or v_height = ''
    or v_size = ''
    or v_favorite_food = ''
  then
    return;
  end if;

  begin
    v_age := (p_child->>'age')::smallint;
  exception
    when others then
      return;
  end;

  if v_age is null or v_age < 0 or v_age > 120 then
    return;
  end if;

  name := v_name;
  age := v_age;
  height := v_height;
  size := v_size;
  favorite_food := v_favorite_food;
  return next;
end;
$$;

create or replace function public.gym_add_check_in_child(
  p_request_id uuid,
  p_child jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.gym_check_in_requests%rowtype;
  v_parsed record;
  v_child_id uuid;
begin
  select * into v_req
  from public.gym_check_in_requests
  where id = p_request_id;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  if v_req.status <> 'approved' then
    return jsonb_build_object('ok', false, 'code', 'not_approved');
  end if;

  select * into v_parsed from public.gym_parse_check_in_child(p_child);

  if not found then
    return jsonb_build_object('ok', false, 'code', 'invalid_child');
  end if;

  insert into public.gym_check_in_children (
    request_id,
    name,
    age,
    height,
    size,
    favorite_food,
    ejected_at
  )
  values (
    p_request_id,
    v_parsed.name,
    v_parsed.age,
    v_parsed.height,
    v_parsed.size,
    v_parsed.favorite_food,
    null
  )
  returning id into v_child_id;

  return jsonb_build_object(
    'ok', true,
    'child_id', v_child_id,
    'family_name', v_req.family_name
  );
end;
$$;

create or replace function public.gym_update_check_in_child(
  p_child_id uuid,
  p_child jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.gym_check_in_children%rowtype;
  v_parsed record;
begin
  select * into v_row
  from public.gym_check_in_children
  where id = p_child_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  select * into v_parsed from public.gym_parse_check_in_child(p_child);

  if not found then
    return jsonb_build_object('ok', false, 'code', 'invalid_child');
  end if;

  update public.gym_check_in_children
  set
    name = v_parsed.name,
    age = v_parsed.age,
    height = v_parsed.height,
    size = v_parsed.size,
    favorite_food = v_parsed.favorite_food
  where id = p_child_id;

  return jsonb_build_object('ok', true, 'child_id', p_child_id);
end;
$$;

create or replace function public.gym_eject_check_in_child(p_child_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.gym_check_in_children%rowtype;
  v_family text;
begin
  select * into v_row
  from public.gym_check_in_children
  where id = p_child_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  select family_name into v_family
  from public.gym_check_in_requests
  where id = v_row.request_id;

  if v_row.ejected_at is null then
    update public.gym_check_in_children
    set ejected_at = now()
    where id = p_child_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'child_id', p_child_id,
    'family_name', v_family
  );
end;
$$;

grant execute on function public.gym_add_check_in_child(uuid, jsonb) to anon, authenticated;
grant execute on function public.gym_update_check_in_child(uuid, jsonb) to anon, authenticated;
grant execute on function public.gym_eject_check_in_child(uuid) to anon, authenticated;
