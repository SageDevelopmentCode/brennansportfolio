create or replace function public.hillrush_set_room(
  p_room_id uuid,
  p_mode text,
  p_stage_id text,
  p_vehicle_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_mode text;
  v_stage text;
  v_vehicle text;
  v_room public.hillrush_rooms%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'not_authenticated');
  end if;

  v_mode := lower(trim(coalesce(p_mode, '')));
  v_stage := lower(trim(coalesce(p_stage_id, '')));
  v_vehicle := lower(trim(coalesce(p_vehicle_id, '')));

  if v_mode not in ('survive', 'chase') then
    return jsonb_build_object('ok', false, 'code', 'invalid_mode');
  end if;

  if v_stage !~ '^[a-z0-9]{1,32}$' then
    return jsonb_build_object('ok', false, 'code', 'invalid_stage');
  end if;

  if v_vehicle !~ '^[a-z0-9]{1,32}$' then
    return jsonb_build_object('ok', false, 'code', 'invalid_vehicle');
  end if;

  select *
  into v_room
  from public.hillrush_rooms
  where id = p_room_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  if v_room.host_id <> v_uid then
    return jsonb_build_object('ok', false, 'code', 'not_host');
  end if;

  if v_room.status <> 'lobby' then
    return jsonb_build_object('ok', false, 'code', 'not_lobby');
  end if;

  update public.hillrush_rooms
  set mode = v_mode,
      stage_id = v_stage,
      vehicle_id = v_vehicle
  where id = p_room_id;

  return public.hillrush_snapshot(p_room_id);
end;
$$;

create or replace function public.hillrush_set_role(
  p_room_id uuid,
  p_role text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_room public.hillrush_rooms%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'not_authenticated');
  end if;

  v_role := lower(trim(coalesce(p_role, '')));
  if v_role not in ('hunter', 'runner') then
    return jsonb_build_object('ok', false, 'code', 'invalid_mode');
  end if;

  select *
  into v_room
  from public.hillrush_rooms
  where id = p_room_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  if v_room.status <> 'lobby' then
    return jsonb_build_object('ok', false, 'code', 'not_lobby');
  end if;

  if not public.hillrush_is_member(p_room_id) then
    return jsonb_build_object('ok', false, 'code', 'not_member');
  end if;

  update public.hillrush_players
  set role = v_role
  where room_id = p_room_id
    and user_id = v_uid;

  return public.hillrush_snapshot(p_room_id);
end;
$$;

create or replace function public.hillrush_reopen_room(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.hillrush_rooms%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'not_authenticated');
  end if;

  select *
  into v_room
  from public.hillrush_rooms
  where id = p_room_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  if not public.hillrush_is_member(p_room_id) then
    return jsonb_build_object('ok', false, 'code', 'not_member');
  end if;

  if v_room.status = 'done' then
    update public.hillrush_rooms
    set status = 'lobby'
    where id = p_room_id;
  elsif v_room.status <> 'lobby' then
    return jsonb_build_object('ok', false, 'code', 'not_lobby');
  end if;

  return public.hillrush_snapshot(p_room_id);
end;
$$;

create or replace function public.hillrush_start_room(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.hillrush_rooms%rowtype;
  v_count int;
  v_hunters int;
  v_runners int;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'not_authenticated');
  end if;

  select *
  into v_room
  from public.hillrush_rooms
  where id = p_room_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  if v_room.host_id <> v_uid then
    return jsonb_build_object('ok', false, 'code', 'not_host');
  end if;

  if v_room.status not in ('lobby', 'done') then
    return jsonb_build_object('ok', false, 'code', 'not_lobby');
  end if;

  select count(*)
  into v_count
  from public.hillrush_players
  where room_id = p_room_id;

  if v_count < 2 then
    return jsonb_build_object('ok', false, 'code', 'need_players');
  end if;

  if v_room.mode = 'chase' then
    select count(*)
    into v_hunters
    from public.hillrush_players
    where room_id = p_room_id
      and role = 'hunter';

    select count(*)
    into v_runners
    from public.hillrush_players
    where room_id = p_room_id
      and role = 'runner';

    if v_hunters < 1 then
      return jsonb_build_object('ok', false, 'code', 'need_chaser');
    end if;

    if v_runners < 1 then
      return jsonb_build_object('ok', false, 'code', 'need_runner');
    end if;
  end if;

  update public.hillrush_rooms
  set status = 'racing',
      winner_id = null,
      started_at = now(),
      finished_at = null
  where id = p_room_id;

  update public.hillrush_players
  set alive = true,
      distance = 0,
      out_reason = null,
      finished_at = null
  where room_id = p_room_id;

  return public.hillrush_snapshot(p_room_id);
end;
$$;

revoke all on function public.hillrush_set_room(uuid, text, text, text) from public, anon;
revoke all on function public.hillrush_set_role(uuid, text) from public, anon;
revoke all on function public.hillrush_reopen_room(uuid) from public, anon;
revoke all on function public.hillrush_start_room(uuid) from public, anon;

grant execute on function public.hillrush_set_room(uuid, text, text, text) to authenticated;
grant execute on function public.hillrush_set_role(uuid, text) to authenticated;
grant execute on function public.hillrush_reopen_room(uuid) to authenticated;
grant execute on function public.hillrush_start_room(uuid) to authenticated;
