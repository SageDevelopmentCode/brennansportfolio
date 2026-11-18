alter table public.hillrush_players
  add column if not exists vehicle_id text not null default 'jeep';

alter table public.hillrush_players
  drop constraint if exists hillrush_players_vehicle_check;

alter table public.hillrush_players
  add constraint hillrush_players_vehicle_check
  check (vehicle_id ~ '^[a-z0-9]{1,32}$');

create or replace function public.hillrush_snapshot(p_room_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not public.hillrush_is_member(p_room_id) then
    return jsonb_build_object('ok', false, 'code', 'not_member');
  end if;

  return jsonb_build_object(
    'ok', true,
    'room', (
      select jsonb_build_object(
        'id', r.id,
        'code', r.code,
        'host_id', r.host_id,
        'mode', r.mode,
        'stage_id', r.stage_id,
        'vehicle_id', r.vehicle_id,
        'status', r.status,
        'winner_id', r.winner_id
      )
      from public.hillrush_rooms r
      where r.id = p_room_id
    ),
    'players', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'user_id', p.user_id,
          'nickname', p.nickname,
          'color', p.color,
          'vehicle_id', p.vehicle_id,
          'role', p.role,
          'alive', p.alive,
          'distance', p.distance,
          'out_reason', p.out_reason
        )
        order by p.joined_at
      )
      from public.hillrush_players p
      where p.room_id = p_room_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.hillrush_create_room(
  p_nickname text,
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
  v_nick text;
  v_mode text;
  v_stage text;
  v_vehicle text;
  v_code text;
  v_room_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'not_authenticated');
  end if;

  v_nick := left(trim(coalesce(p_nickname, '')), 16);
  v_mode := lower(trim(coalesce(p_mode, '')));
  v_stage := lower(trim(coalesce(p_stage_id, '')));
  v_vehicle := lower(trim(coalesce(p_vehicle_id, '')));

  if char_length(v_nick) < 1 or v_nick ~ '[[:cntrl:]]' then
    return jsonb_build_object('ok', false, 'code', 'invalid_nickname');
  end if;

  if v_mode not in ('survive', 'chase') then
    return jsonb_build_object('ok', false, 'code', 'invalid_mode');
  end if;

  if v_stage !~ '^[a-z0-9]{1,32}$' then
    return jsonb_build_object('ok', false, 'code', 'invalid_stage');
  end if;

  if v_vehicle !~ '^[a-z0-9]{1,32}$' then
    return jsonb_build_object('ok', false, 'code', 'invalid_vehicle');
  end if;

  perform public.hillrush_clear_lobbies(v_uid);
  v_code := public.hillrush_generate_code();

  insert into public.hillrush_rooms (code, host_id, mode, stage_id, vehicle_id)
  values (v_code, v_uid, v_mode, v_stage, v_vehicle)
  returning id into v_room_id;

  insert into public.hillrush_players (room_id, user_id, nickname, color, role, vehicle_id)
  values (
    v_room_id,
    v_uid,
    v_nick,
    '#e8341c',
    case when v_mode = 'chase' then 'hunter' else 'runner' end,
    v_vehicle
  );

  return public.hillrush_snapshot(v_room_id);
end;
$$;

drop function if exists public.hillrush_join_room(text, text);

create or replace function public.hillrush_join_room(
  p_code text,
  p_nickname text,
  p_vehicle_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_nick text;
  v_code text;
  v_vehicle text;
  v_room public.hillrush_rooms%rowtype;
  v_count int;
  v_color text;
  v_colors text[] := array['#e8341c', '#2e7fe8', '#3cae3a', '#f5c518'];
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'not_authenticated');
  end if;

  v_nick := left(trim(coalesce(p_nickname, '')), 16);
  v_code := upper(trim(replace(coalesce(p_code, ''), ' ', '')));
  v_vehicle := lower(trim(coalesce(p_vehicle_id, '')));

  if char_length(v_nick) < 1 or v_nick ~ '[[:cntrl:]]' then
    return jsonb_build_object('ok', false, 'code', 'invalid_nickname');
  end if;

  if v_code !~ '^[A-Z0-9]{4}$' then
    return jsonb_build_object('ok', false, 'code', 'invalid_code');
  end if;

  if v_vehicle !~ '^[a-z0-9]{1,32}$' then
    return jsonb_build_object('ok', false, 'code', 'invalid_vehicle');
  end if;

  select *
  into v_room
  from public.hillrush_rooms
  where code = v_code
    and status = 'lobby'
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  if exists (
    select 1
    from public.hillrush_players p
    where p.room_id = v_room.id
      and p.user_id = v_uid
  ) then
    update public.hillrush_players
    set nickname = v_nick,
        vehicle_id = v_vehicle
    where room_id = v_room.id
      and user_id = v_uid;
    return public.hillrush_snapshot(v_room.id);
  end if;

  select count(*)
  into v_count
  from public.hillrush_players
  where room_id = v_room.id;

  if v_count >= 4 then
    return jsonb_build_object('ok', false, 'code', 'full');
  end if;

  perform public.hillrush_clear_lobbies(v_uid);

  select c.color
  into v_color
  from unnest(v_colors) as c(color)
  where not exists (
    select 1
    from public.hillrush_players p
    where p.room_id = v_room.id
      and p.color = c.color
  )
  limit 1;

  if v_color is null then
    v_color := v_colors[1 + least(v_count, 3)];
  end if;

  insert into public.hillrush_players (room_id, user_id, nickname, color, role, vehicle_id)
  values (v_room.id, v_uid, v_nick, v_color, 'runner', v_vehicle);

  return public.hillrush_snapshot(v_room.id);
end;
$$;

create or replace function public.hillrush_set_vehicle(
  p_room_id uuid,
  p_vehicle_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_vehicle text;
  v_room public.hillrush_rooms%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'not_authenticated');
  end if;

  v_vehicle := lower(trim(coalesce(p_vehicle_id, '')));
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

  if v_room.status <> 'lobby' then
    return jsonb_build_object('ok', false, 'code', 'not_lobby');
  end if;

  if not public.hillrush_is_member(p_room_id) then
    return jsonb_build_object('ok', false, 'code', 'not_member');
  end if;

  update public.hillrush_players
  set vehicle_id = v_vehicle
  where room_id = p_room_id
    and user_id = v_uid;

  return public.hillrush_snapshot(p_room_id);
end;
$$;

revoke all on function public.hillrush_snapshot(uuid) from public, anon;
revoke all on function public.hillrush_create_room(text, text, text, text) from public, anon;
revoke all on function public.hillrush_join_room(text, text, text) from public, anon;
revoke all on function public.hillrush_set_vehicle(uuid, text) from public, anon;

grant execute on function public.hillrush_snapshot(uuid) to authenticated;
grant execute on function public.hillrush_create_room(text, text, text, text) to authenticated;
grant execute on function public.hillrush_join_room(text, text, text) to authenticated;
grant execute on function public.hillrush_set_vehicle(uuid, text) to authenticated;
