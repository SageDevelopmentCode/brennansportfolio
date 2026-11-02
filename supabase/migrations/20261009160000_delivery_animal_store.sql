-- Skate Drop: shared company wallet, owned animals (one each), store prices

create table public.delivery_animal_prices (
  mount_id text primary key,
  price int not null check (price > 0)
);

insert into public.delivery_animal_prices (mount_id, price) values
  ('mosquito', 25),
  ('ant', 20),
  ('snail', 18),
  ('frog', 35),
  ('bee', 28),
  ('wasp', 32),
  ('bat', 45),
  ('rabbit', 50),
  ('duck', 55),
  ('chicken', 60),
  ('crab', 65),
  ('lobster', 70),
  ('turtle', 75),
  ('goose', 80),
  ('goat', 85),
  ('pig', 90),
  ('snake', 95),
  ('fox', 120),
  ('raccoon', 125),
  ('skunk', 130),
  ('otter', 135),
  ('beaver', 140),
  ('turkey', 110),
  ('owl', 150),
  ('penguin', 155),
  ('llama', 160),
  ('kangaroo', 175),
  ('koala', 180),
  ('parrot', 185),
  ('flamingo', 190),
  ('peacock', 195),
  ('cheetah', 220),
  ('zebra', 240),
  ('horse', 260),
  ('cow', 280),
  ('rhino', 320),
  ('hippo', 340),
  ('giraffe', 360),
  ('sloth', 400),
  ('elephant', 500);

alter table public.delivery_animal_prices enable row level security;

create policy "Anyone can read delivery animal prices"
  on public.delivery_animal_prices for select
  to anon, authenticated
  using (true);

create table public.delivery_company_wallet (
  id int primary key default 1 check (id = 1),
  balance int not null default 250 check (balance >= 0)
);

insert into public.delivery_company_wallet (id, balance)
values (1, 250)
on conflict (id) do nothing;

alter table public.delivery_company_wallet enable row level security;

create policy "Anyone can read delivery company wallet"
  on public.delivery_company_wallet for select
  to anon, authenticated
  using (true);

create table public.delivery_owned_animals (
  mount_id text primary key references public.delivery_animal_prices (mount_id),
  purchased_at timestamptz not null default now()
);

alter table public.delivery_owned_animals enable row level security;

create policy "Anyone can read delivery owned animals"
  on public.delivery_owned_animals for select
  to anon, authenticated
  using (true);

-- Grant ownership for couriers already on old mounts before stricter hire rules
insert into public.delivery_owned_animals (mount_id)
select distinct mount
from public.delivery_skateboards
where mount in (select mount_id from public.delivery_animal_prices)
on conflict (mount_id) do nothing;

alter table public.delivery_skateboards
  drop constraint if exists delivery_skateboards_mount_check;

create unique index if not exists delivery_skateboards_mount_unique_idx
  on public.delivery_skateboards (mount);

create or replace function public.delivery_get_company_state()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance int;
  v_owned jsonb;
  v_assigned jsonb;
begin
  select balance into v_balance
  from public.delivery_company_wallet
  where id = 1;

  if v_balance is null then
    insert into public.delivery_company_wallet (id, balance)
    values (1, 250)
    on conflict (id) do nothing;
    v_balance := 250;
  end if;

  select coalesce(jsonb_agg(mount_id order by mount_id), '[]'::jsonb)
  into v_owned
  from public.delivery_owned_animals;

  select coalesce(jsonb_agg(mount order by mount), '[]'::jsonb)
  into v_assigned
  from public.delivery_skateboards;

  return jsonb_build_object(
    'ok', true,
    'balance', v_balance,
    'owned_mount_ids', v_owned,
    'assigned_mount_ids', v_assigned
  );
end;
$$;

create or replace function public.delivery_buy_animal(p_mount text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mount text;
  v_price int;
  v_balance int;
begin
  v_mount := lower(trim(coalesce(p_mount, '')));

  select price into v_price
  from public.delivery_animal_prices
  where mount_id = v_mount;

  if v_price is null then
    return jsonb_build_object('ok', false, 'code', 'invalid_mount');
  end if;

  if exists (
    select 1 from public.delivery_owned_animals where mount_id = v_mount
  ) then
    return jsonb_build_object('ok', false, 'code', 'already_owned');
  end if;

  select balance into v_balance
  from public.delivery_company_wallet
  where id = 1
  for update;

  if v_balance is null then
    insert into public.delivery_company_wallet (id, balance)
    values (1, 250)
    returning balance into v_balance;
  end if;

  if v_balance < v_price then
    return jsonb_build_object('ok', false, 'code', 'insufficient_funds');
  end if;

  update public.delivery_company_wallet
  set balance = balance - v_price
  where id = 1;

  insert into public.delivery_owned_animals (mount_id)
  values (v_mount);

  return jsonb_build_object(
    'ok', true,
    'mount_id', v_mount,
    'balance', v_balance - v_price
  );
end;
$$;

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

  if not exists (
    select 1 from public.delivery_animal_prices where mount_id = v_mount
  ) then
    return jsonb_build_object('ok', false, 'code', 'invalid_mount');
  end if;

  if not exists (
    select 1 from public.delivery_owned_animals where mount_id = v_mount
  ) then
    return jsonb_build_object('ok', false, 'code', 'not_owned');
  end if;

  if exists (
    select 1 from public.delivery_skateboards where mount = v_mount
  ) then
    return jsonb_build_object('ok', false, 'code', 'mount_in_use');
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

grant execute on function public.delivery_get_company_state() to anon, authenticated;
grant execute on function public.delivery_buy_animal(text) to anon, authenticated;
grant execute on function public.delivery_add_skateboard(text, text) to anon, authenticated;
