-- Skate Drop: wallet balance was int (~$2.1B cap). $1M/pkg credits overflowed at max balance.

alter table public.delivery_company_wallet
  alter column balance type bigint using balance::bigint;

create or replace function public.delivery_credit_deliveries(
  p_source_ids text[],
  p_total int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_count int;
  v_balance bigint;
  v_earn_per_pkg bigint := 1000000;
  v_credit bigint;
begin
  if p_source_ids is null or array_length(p_source_ids, 1) is null then
    select balance into v_balance
    from public.delivery_company_wallet
    where id = 1;
    return jsonb_build_object(
      'ok', true,
      'balance', coalesce(v_balance, 0),
      'credited_count', 0
    );
  end if;

  select count(*)::int
  into v_new_count
  from (
    select distinct trim(id) as sid
    from unnest(p_source_ids) as id
    where trim(id) <> ''
  ) as incoming
  where not exists (
    select 1
    from public.delivery_credited_sources c
    where c.source_id = incoming.sid
  );

  if v_new_count = 0 then
    select balance into v_balance
    from public.delivery_company_wallet
    where id = 1;
    return jsonb_build_object(
      'ok', true,
      'balance', coalesce(v_balance, 0),
      'credited_count', 0
    );
  end if;

  v_credit := v_new_count::bigint * v_earn_per_pkg;

  insert into public.delivery_credited_sources (source_id)
  select incoming.sid
  from (
    select distinct trim(id) as sid
    from unnest(p_source_ids) as id
    where trim(id) <> ''
  ) as incoming
  where not exists (
    select 1
    from public.delivery_credited_sources c
    where c.source_id = incoming.sid
  );

  update public.delivery_company_wallet
  set balance = balance + v_credit
  where id = 1
  returning balance into v_balance;

  if v_balance is null then
    insert into public.delivery_company_wallet (id, balance)
    values (1, v_credit)
    on conflict (id) do update
    set balance = public.delivery_company_wallet.balance + excluded.balance
    returning balance into v_balance;
  end if;

  return jsonb_build_object(
    'ok', true,
    'balance', v_balance,
    'credited_count', v_new_count
  );
end;
$$;

create or replace function public.delivery_get_company_state()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance bigint;
  v_owned jsonb;
  v_assigned jsonb;
  v_food jsonb;
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

  select coalesce(
    jsonb_object_agg(mount_id, quantity),
    '{}'::jsonb
  )
  into v_food
  from public.delivery_food_stock
  where quantity > 0;

  return jsonb_build_object(
    'ok', true,
    'balance', v_balance,
    'owned_mount_ids', v_owned,
    'assigned_mount_ids', v_assigned,
    'food_stock', coalesce(v_food, '{}'::jsonb)
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
  v_balance bigint;
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

create or replace function public.delivery_buy_food(
  p_mount text,
  p_qty int default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mount text;
  v_qty int;
  v_unit int;
  v_total int;
  v_balance bigint;
  v_new_qty int;
begin
  v_mount := lower(trim(coalesce(p_mount, '')));
  v_qty := greatest(1, least(99, coalesce(p_qty, 1)));

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

  v_unit := public.delivery_feed_unit_price(v_mount);
  if v_unit is null then
    return jsonb_build_object('ok', false, 'code', 'invalid_mount');
  end if;

  v_total := v_unit * v_qty;

  select balance into v_balance
  from public.delivery_company_wallet
  where id = 1
  for update;

  if v_balance is null then
    insert into public.delivery_company_wallet (id, balance)
    values (1, 250)
    returning balance into v_balance;
  end if;

  if v_balance < v_total then
    return jsonb_build_object('ok', false, 'code', 'insufficient_funds');
  end if;

  update public.delivery_company_wallet
  set balance = balance - v_total
  where id = 1;

  insert into public.delivery_food_stock (mount_id, quantity)
  values (v_mount, v_qty)
  on conflict (mount_id) do update
  set quantity = public.delivery_food_stock.quantity + excluded.quantity
  returning quantity into v_new_qty;

  select balance into v_balance
  from public.delivery_company_wallet
  where id = 1;

  return jsonb_build_object(
    'ok', true,
    'mount_id', v_mount,
    'quantity', v_new_qty,
    'balance', v_balance
  );
end;
$$;

grant execute on function public.delivery_credit_deliveries(text[], int) to anon, authenticated;

notify pgrst, 'reload schema';
