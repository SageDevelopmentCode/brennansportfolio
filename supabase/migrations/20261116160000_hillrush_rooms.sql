-- Hill Rush room codes. Live car poses are Realtime broadcast on
-- topic hillrush:<room id>, not rows. These tables are the lobby,
-- who is still in, and the final standings.

create table public.hillrush_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid not null references auth.users (id) on delete cascade,
  mode text not null default 'survive',
  stage_id text not null default 'countryside',
  vehicle_id text not null default 'jeep',
  status text not null default 'lobby',
  winner_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  constraint hillrush_rooms_code_format check (code ~ '^[A-Z0-9]{4}$'),
  constraint hillrush_rooms_mode_check check (mode in ('survive', 'chase')),
  constraint hillrush_rooms_status_check check (status in ('lobby', 'racing', 'done')),
  constraint hillrush_rooms_stage_check check (stage_id ~ '^[a-z0-9]{1,32}$'),
  constraint hillrush_rooms_vehicle_check check (vehicle_id ~ '^[a-z0-9]{1,32}$')
);

create table public.hillrush_players (
  room_id uuid not null references public.hillrush_rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  nickname text not null,
  color text not null,
  role text not null,
  alive boolean not null default true,
  distance integer not null default 0,
  out_reason text,
  finished_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id),
  constraint hillrush_players_nick_len check (char_length(nickname) between 1 and 16),
  constraint hillrush_players_role_check check (role in ('hunter', 'runner')),
  constraint hillrush_players_color_check check (color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint hillrush_players_distance_check check (distance >= 0 and distance <= 1000000),
  constraint hillrush_players_reason_check check (
    out_reason is null
    or out_reason in ('crash', 'stuck', 'sink', 'fuel', 'tagged', 'left', 'disconnect')
  )
);

alter table public.hillrush_rooms replica identity full;
alter table public.hillrush_players replica identity full;

alter table public.hillrush_rooms enable row level security;
alter table public.hillrush_players enable row level security;

revoke all on public.hillrush_rooms from public, anon;
revoke all on public.hillrush_players from public, anon;
grant select on public.hillrush_rooms to authenticated;
grant select on public.hillrush_players to authenticated;

create or replace function public.hillrush_is_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.hillrush_players p
    where p.room_id = p_room_id
      and p.user_id = auth.uid()
  );
$$;

revoke all on function public.hillrush_is_member(uuid) from public, anon;
grant execute on function public.hillrush_is_member(uuid) to authenticated;

create policy "Members read their Hill Rush room"
  on public.hillrush_rooms
  for select
  to authenticated
  using (public.hillrush_is_member(id));

create policy "Members read Hill Rush drivers"
  on public.hillrush_players
  for select
  to authenticated
  using (public.hillrush_is_member(room_id));

create policy "Hill Rush members receive broadcast"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension in ('broadcast', 'presence')
    and exists (
      select 1
      from public.hillrush_players p
      where p.user_id = (select auth.uid())
        and (select realtime.topic()) = 'hillrush:' || p.room_id::text
    )
  );

create policy "Hill Rush members send broadcast"
  on realtime.messages
  for insert
  to authenticated
  with check (
    realtime.messages.extension in ('broadcast', 'presence')
    and exists (
      select 1
      from public.hillrush_players p
      where p.user_id = (select auth.uid())
        and (select realtime.topic()) = 'hillrush:' || p.room_id::text
    )
  );

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

create or replace function public.hillrush_maybe_finish(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mode text;
  v_status text;
  v_alive int;
  v_hunter_alive boolean;
  v_runners_alive int;
  v_winner uuid;
begin
  select mode, status
  into v_mode, v_status
  from public.hillrush_rooms
  where id = p_room_id
  for update;

  if v_status is distinct from 'racing' then
    return;
  end if;

  select count(*)
  into v_alive
  from public.hillrush_players
  where room_id = p_room_id
    and alive;

  if v_mode = 'survive' then
    if v_alive > 1 then
      return;
    end if;

    select user_id
    into v_winner
    from public.hillrush_players
    where room_id = p_room_id
      and alive
    order by distance desc, joined_at
    limit 1;

    if v_winner is null then
      select user_id
      into v_winner
      from public.hillrush_players
      where room_id = p_room_id
      order by distance desc, finished_at desc nulls last, joined_at
      limit 1;
    end if;
  else
    select exists (
      select 1
      from public.hillrush_players
      where room_id = p_room_id
        and role = 'hunter'
        and alive
    )
    into v_hunter_alive;

    select count(*)
    into v_runners_alive
    from public.hillrush_players
    where room_id = p_room_id
      and role = 'runner'
      and alive;

    if v_hunter_alive and v_runners_alive > 0 then
      return;
    end if;

    if not v_hunter_alive then
      select user_id
      into v_winner
      from public.hillrush_players
      where room_id = p_room_id
        and role = 'runner'
        and alive
      order by distance desc, joined_at
      limit 1;

      if v_winner is null then
        select user_id
        into v_winner
        from public.hillrush_players
        where room_id = p_room_id
          and role = 'runner'
        order by distance desc, joined_at
        limit 1;
      end if;
    else
      select user_id
      into v_winner
      from public.hillrush_players
      where room_id = p_room_id
        and role = 'hunter'
      limit 1;
    end if;
  end if;

  update public.hillrush_rooms
  set status = 'done',
      winner_id = v_winner,
      finished_at = now()
  where id = p_room_id;
end;
$$;

create or replace function public.hillrush_generate_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_i int;
  v_attempts int := 0;
begin
  loop
    v_code := '';
    for v_i in 1..4 loop
      v_code := v_code || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
    end loop;

    if not exists (select 1 from public.hillrush_rooms r where r.code = v_code) then
      return v_code;
    end if;

    v_attempts := v_attempts + 1;
    if v_attempts > 80 then
      raise exception 'could not allocate hill rush code';
    end if;
  end loop;
end;
$$;

create or replace function public.hillrush_clear_lobbies(p_uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.hillrush_rooms
  where host_id = p_uid
    and status = 'lobby';

  delete from public.hillrush_players p
  using public.hillrush_rooms r
  where p.room_id = r.id
    and p.user_id = p_uid
    and r.status = 'lobby';
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

  insert into public.hillrush_players (room_id, user_id, nickname, color, role)
  values (
    v_room_id,
    v_uid,
    v_nick,
    '#e8341c',
    case when v_mode = 'chase' then 'hunter' else 'runner' end
  );

  return public.hillrush_snapshot(v_room_id);
end;
$$;

create or replace function public.hillrush_join_room(
  p_code text,
  p_nickname text
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

  if char_length(v_nick) < 1 or v_nick ~ '[[:cntrl:]]' then
    return jsonb_build_object('ok', false, 'code', 'invalid_nickname');
  end if;

  if v_code !~ '^[A-Z0-9]{4}$' then
    return jsonb_build_object('ok', false, 'code', 'invalid_code');
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
    set nickname = v_nick
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

  insert into public.hillrush_players (room_id, user_id, nickname, color, role)
  values (v_room.id, v_uid, v_nick, v_color, 'runner');

  return public.hillrush_snapshot(v_room.id);
end;
$$;

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

  update public.hillrush_players
  set role = case
    when user_id = v_uid and v_mode = 'chase' then 'hunter'
    else 'runner'
  end
  where room_id = p_room_id;

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

  if v_room.status <> 'lobby' then
    return jsonb_build_object('ok', false, 'code', 'not_lobby');
  end if;

  select count(*)
  into v_count
  from public.hillrush_players
  where room_id = p_room_id;

  if v_count < 2 then
    return jsonb_build_object('ok', false, 'code', 'need_players');
  end if;

  update public.hillrush_rooms
  set status = 'racing',
      started_at = now()
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

create or replace function public.hillrush_distance(
  p_room_id uuid,
  p_distance integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_distance integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'not_authenticated');
  end if;

  if not public.hillrush_is_member(p_room_id) then
    return jsonb_build_object('ok', false, 'code', 'not_member');
  end if;

  v_distance := least(1000000, greatest(0, coalesce(p_distance, 0)));

  update public.hillrush_players p
  set distance = v_distance
  from public.hillrush_rooms r
  where p.room_id = p_room_id
    and p.user_id = v_uid
    and p.alive
    and p.distance is distinct from v_distance
    and r.id = p.room_id
    and r.status = 'racing';

  return public.hillrush_snapshot(p_room_id);
end;
$$;

create or replace function public.hillrush_out(
  p_room_id uuid,
  p_distance integer,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_reason text;
  v_distance integer;
  v_status text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'not_authenticated');
  end if;

  if not public.hillrush_is_member(p_room_id) then
    return jsonb_build_object('ok', false, 'code', 'not_member');
  end if;

  select status
  into v_status
  from public.hillrush_rooms
  where id = p_room_id
  for update;

  if v_status is distinct from 'racing' then
    return public.hillrush_snapshot(p_room_id);
  end if;

  v_reason := lower(trim(coalesce(p_reason, 'crash')));
  if v_reason not in ('crash', 'stuck', 'sink', 'fuel', 'tagged', 'left', 'disconnect') then
    v_reason := 'crash';
  end if;
  v_distance := least(1000000, greatest(0, coalesce(p_distance, 0)));

  update public.hillrush_players
  set alive = false,
      distance = v_distance,
      out_reason = v_reason,
      finished_at = coalesce(finished_at, now())
  where room_id = p_room_id
    and user_id = v_uid
    and alive;

  perform public.hillrush_maybe_finish(p_room_id);
  return public.hillrush_snapshot(p_room_id);
end;
$$;

create or replace function public.hillrush_tag(
  p_room_id uuid,
  p_target uuid,
  p_distance integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
  v_distance integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'not_authenticated');
  end if;

  if not exists (
    select 1
    from public.hillrush_players
    where room_id = p_room_id
      and user_id = v_uid
      and role = 'hunter'
      and alive
  ) then
    return jsonb_build_object('ok', false, 'code', 'not_hunter');
  end if;

  select status
  into v_status
  from public.hillrush_rooms
  where id = p_room_id
  for update;

  if v_status is distinct from 'racing' then
    return public.hillrush_snapshot(p_room_id);
  end if;

  v_distance := least(1000000, greatest(0, coalesce(p_distance, 0)));

  update public.hillrush_players
  set alive = false,
      distance = greatest(distance, v_distance),
      out_reason = 'tagged',
      finished_at = coalesce(finished_at, now())
  where room_id = p_room_id
    and user_id = p_target
    and role = 'runner'
    and alive;

  perform public.hillrush_maybe_finish(p_room_id);
  return public.hillrush_snapshot(p_room_id);
end;
$$;

create or replace function public.hillrush_forfeit(
  p_room_id uuid,
  p_target uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_host uuid;
  v_status text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'not_authenticated');
  end if;

  if not public.hillrush_is_member(p_room_id) then
    return jsonb_build_object('ok', false, 'code', 'not_member');
  end if;

  if p_target is null or p_target = v_uid then
    return jsonb_build_object('ok', false, 'code', 'not_allowed');
  end if;

  select host_id, status
  into v_host, v_status
  from public.hillrush_rooms
  where id = p_room_id
  for update;

  if v_status is distinct from 'racing' then
    return public.hillrush_snapshot(p_room_id);
  end if;

  if v_uid <> v_host and p_target <> v_host then
    return jsonb_build_object('ok', false, 'code', 'not_allowed');
  end if;

  update public.hillrush_players
  set alive = false,
      out_reason = 'disconnect',
      finished_at = coalesce(finished_at, now())
  where room_id = p_room_id
    and user_id = p_target
    and alive;

  perform public.hillrush_maybe_finish(p_room_id);
  return public.hillrush_snapshot(p_room_id);
end;
$$;

create or replace function public.hillrush_leave_room(p_room_id uuid)
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
    return jsonb_build_object('ok', true);
  end if;

  if not public.hillrush_is_member(p_room_id) and v_room.host_id <> v_uid then
    return jsonb_build_object('ok', false, 'code', 'not_member');
  end if;

  if v_room.status = 'lobby' then
    if v_room.host_id = v_uid then
      delete from public.hillrush_rooms where id = p_room_id;
    else
      delete from public.hillrush_players
      where room_id = p_room_id
        and user_id = v_uid;
    end if;
    return jsonb_build_object('ok', true);
  end if;

  if v_room.status = 'racing' then
    update public.hillrush_players
    set alive = false,
        out_reason = 'left',
        finished_at = coalesce(finished_at, now())
    where room_id = p_room_id
      and user_id = v_uid
      and alive;

    perform public.hillrush_maybe_finish(p_room_id);
    return public.hillrush_snapshot(p_room_id);
  end if;

  return public.hillrush_snapshot(p_room_id);
end;
$$;

revoke all on function public.hillrush_snapshot(uuid) from public, anon;
revoke all on function public.hillrush_maybe_finish(uuid) from public, anon, authenticated;
revoke all on function public.hillrush_generate_code() from public, anon, authenticated;
revoke all on function public.hillrush_clear_lobbies(uuid) from public, anon, authenticated;
revoke all on function public.hillrush_create_room(text, text, text, text) from public, anon;
revoke all on function public.hillrush_join_room(text, text) from public, anon;
revoke all on function public.hillrush_set_room(uuid, text, text, text) from public, anon;
revoke all on function public.hillrush_start_room(uuid) from public, anon;
revoke all on function public.hillrush_distance(uuid, integer) from public, anon;
revoke all on function public.hillrush_out(uuid, integer, text) from public, anon;
revoke all on function public.hillrush_tag(uuid, uuid, integer) from public, anon;
revoke all on function public.hillrush_forfeit(uuid, uuid) from public, anon;
revoke all on function public.hillrush_leave_room(uuid) from public, anon;

grant execute on function public.hillrush_snapshot(uuid) to authenticated;
grant execute on function public.hillrush_create_room(text, text, text, text) to authenticated;
grant execute on function public.hillrush_join_room(text, text) to authenticated;
grant execute on function public.hillrush_set_room(uuid, text, text, text) to authenticated;
grant execute on function public.hillrush_start_room(uuid) to authenticated;
grant execute on function public.hillrush_distance(uuid, integer) to authenticated;
grant execute on function public.hillrush_out(uuid, integer, text) to authenticated;
grant execute on function public.hillrush_tag(uuid, uuid, integer) to authenticated;
grant execute on function public.hillrush_forfeit(uuid, uuid) to authenticated;
grant execute on function public.hillrush_leave_room(uuid) to authenticated;

alter publication supabase_realtime add table public.hillrush_rooms;
alter publication supabase_realtime add table public.hillrush_players;
