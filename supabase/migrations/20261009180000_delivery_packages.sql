-- Skate Drop: shared package queue and courier trips

create table public.delivery_packages (
  id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('pending', 'in_transit', 'delivered')),
  created_at timestamptz not null default now(),
  skateboard_id uuid references public.delivery_skateboards (id) on delete set null,
  assigned_at timestamptz,
  return_at timestamptz,
  delivered_at timestamptz
);

create index delivery_packages_status_created_idx
  on public.delivery_packages (status, created_at desc);

create index delivery_packages_in_transit_return_idx
  on public.delivery_packages (return_at)
  where status = 'in_transit';

alter table public.delivery_packages enable row level security;

create policy "Anyone can read delivery packages"
  on public.delivery_packages for select
  to anon, authenticated
  using (true);

create table public.delivery_spawn_meta (
  id int primary key default 1 check (id = 1),
  last_spawn_at timestamptz not null default '1970-01-01'::timestamptz
);

insert into public.delivery_spawn_meta (id, last_spawn_at)
values (1, '1970-01-01'::timestamptz)
on conflict (id) do nothing;

alter table public.delivery_spawn_meta enable row level security;

create policy "Anyone can read delivery spawn meta"
  on public.delivery_spawn_meta for select
  to anon, authenticated
  using (true);

create or replace function public.delivery_mount_speed(p_mount text)
returns int
language sql
immutable
as $$
  select case p_mount
    when 'mosquito' then 10
    when 'ant' then 4
    when 'snail' then 1
    when 'frog' then 6
    when 'bee' then 9
    when 'wasp' then 9
    when 'bat' then 8
    when 'rabbit' then 7
    when 'duck' then 6
    when 'chicken' then 5
    when 'crab' then 3
    when 'lobster' then 4
    when 'turtle' then 2
    when 'goose' then 5
    when 'goat' then 5
    when 'pig' then 4
    when 'snake' then 7
    when 'fox' then 8
    when 'raccoon' then 7
    when 'skunk' then 6
    when 'otter' then 7
    when 'beaver' then 3
    when 'turkey' then 4
    when 'owl' then 6
    when 'penguin' then 5
    when 'llama' then 5
    when 'kangaroo' then 8
    when 'koala' then 2
    when 'parrot' then 7
    when 'flamingo' then 6
    when 'peacock' then 5
    when 'cheetah' then 10
    when 'zebra' then 8
    when 'horse' then 8
    when 'cow' then 3
    when 'rhino' then 4
    when 'hippo' then 2
    when 'giraffe' then 6
    when 'sloth' then 1
    when 'elephant' then 1
    when 'unicorn' then 10
    else 5
  end;
$$;

create or replace function public.delivery_trip_seconds(p_mount text)
returns int
language sql
immutable
as $$
  select greatest(1, round(120.0 / greatest(1, public.delivery_mount_speed(p_mount))))::int;
$$;

create or replace function public.delivery_complete_due_trips()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.delivery_packages
  set
    status = 'delivered',
    delivered_at = now()
  where status = 'in_transit'
    and return_at is not null
    and return_at <= now();

  get diagnostics v_count = row_count;

  return jsonb_build_object('ok', true, 'completed', v_count);
end;
$$;

create or replace function public.delivery_try_spawn_package()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pending int;
  v_last timestamptz;
  v_row public.delivery_packages%rowtype;
begin
  select count(*)::int
  into v_pending
  from public.delivery_packages
  where status = 'pending';

  if v_pending >= 30 then
    return jsonb_build_object('ok', false, 'code', 'cap_reached');
  end if;

  select last_spawn_at into v_last
  from public.delivery_spawn_meta
  where id = 1;

  if v_last is null then
    insert into public.delivery_spawn_meta (id, last_spawn_at)
    values (1, '1970-01-01'::timestamptz)
    on conflict (id) do nothing;
    v_last := '1970-01-01'::timestamptz;
  end if;

  if now() - v_last < interval '5 seconds' then
    return jsonb_build_object('ok', false, 'code', 'too_soon');
  end if;

  insert into public.delivery_packages (status)
  values ('pending')
  returning * into v_row;

  update public.delivery_spawn_meta
  set last_spawn_at = now()
  where id = 1;

  return jsonb_build_object(
    'ok', true,
    'package', jsonb_build_object(
      'id', v_row.id,
      'created_at', v_row.created_at
    )
  );
end;
$$;

create or replace function public.delivery_assign_package(
  p_package_id uuid,
  p_skateboard_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pkg public.delivery_packages%rowtype;
  v_board public.delivery_skateboards%rowtype;
  v_seconds int;
begin
  select * into v_pkg
  from public.delivery_packages
  where id = p_package_id
  for update;

  if not found or v_pkg.status <> 'pending' then
    return jsonb_build_object('ok', false, 'code', 'not_pending');
  end if;

  select * into v_board
  from public.delivery_skateboards
  where id = p_skateboard_id;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'invalid_courier');
  end if;

  if exists (
    select 1
    from public.delivery_packages
    where status = 'in_transit'
      and skateboard_id = p_skateboard_id
  ) then
    return jsonb_build_object('ok', false, 'code', 'courier_busy');
  end if;

  v_seconds := public.delivery_trip_seconds(v_board.mount);

  update public.delivery_packages
  set
    status = 'in_transit',
    skateboard_id = p_skateboard_id,
    assigned_at = now(),
    return_at = now() + make_interval(secs => v_seconds)
  where id = p_package_id
  returning * into v_pkg;

  return jsonb_build_object(
    'ok', true,
    'package', jsonb_build_object(
      'id', v_pkg.id,
      'status', v_pkg.status,
      'return_at', v_pkg.return_at,
      'trip_seconds', v_seconds
    )
  );
end;
$$;

create or replace function public.delivery_list_package_board()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pending jsonb;
  v_in_transit jsonb;
  v_idle jsonb;
  v_busy jsonb;
begin
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'created_at', p.created_at
      )
      order by p.created_at asc
    ),
    '[]'::jsonb
  )
  into v_pending
  from public.delivery_packages p
  where p.status = 'pending';

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'skateboard_id', p.skateboard_id,
        'courier_name', s.name,
        'mount', s.mount,
        'assigned_at', p.assigned_at,
        'return_at', p.return_at
      )
      order by p.return_at asc
    ),
    '[]'::jsonb
  )
  into v_in_transit
  from public.delivery_packages p
  join public.delivery_skateboards s on s.id = p.skateboard_id
  where p.status = 'in_transit';

  select coalesce(jsonb_agg(s.id), '[]'::jsonb)
  into v_busy
  from public.delivery_packages p
  join public.delivery_skateboards s on s.id = p.skateboard_id
  where p.status = 'in_transit';

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'name', s.name,
        'mount', s.mount
      )
      order by s.created_at asc
    ),
    '[]'::jsonb
  )
  into v_idle
  from public.delivery_skateboards s
  where not exists (
    select 1
    from public.delivery_packages p
    where p.status = 'in_transit'
      and p.skateboard_id = s.id
  );

  return jsonb_build_object(
    'ok', true,
    'pending', v_pending,
    'in_transit', v_in_transit,
    'idle_couriers', v_idle,
    'busy_courier_ids', v_busy,
    'pending_count', jsonb_array_length(v_pending)
  );
end;
$$;

grant execute on function public.delivery_complete_due_trips() to anon, authenticated;
grant execute on function public.delivery_try_spawn_package() to anon, authenticated;
grant execute on function public.delivery_assign_package(uuid, uuid) to anon, authenticated;
grant execute on function public.delivery_list_package_board() to anon, authenticated;
