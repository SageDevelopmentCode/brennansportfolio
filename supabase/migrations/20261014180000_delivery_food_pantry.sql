-- Skate Drop: per-species feed pantry and food store purchases

create table public.delivery_food_stock (
  mount_id text primary key references public.delivery_animal_prices (mount_id),
  quantity int not null default 0 check (quantity >= 0)
);

alter table public.delivery_food_stock enable row level security;

create policy "Anyone can read delivery food stock"
  on public.delivery_food_stock for select
  to anon, authenticated
  using (true);

create or replace function public.delivery_feed_unit_price(p_mount text)
returns int
language sql
stable
as $$
  select greatest(
    5,
    least(800, round(coalesce(p.price, 50) * 0.08)::int)
  )
  from public.delivery_animal_prices p
  where p.mount_id = p_mount;
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
  v_balance int;
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

create or replace function public.delivery_consume_food(p_mount text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mount text;
  v_qty int;
begin
  v_mount := lower(trim(coalesce(p_mount, '')));

  update public.delivery_food_stock
  set quantity = quantity - 1
  where mount_id = v_mount
    and quantity > 0
  returning quantity into v_qty;

  if v_qty is null then
    return jsonb_build_object('ok', false, 'code', 'empty');
  end if;

  if v_qty <= 0 then
    delete from public.delivery_food_stock where mount_id = v_mount;
    v_qty := 0;
  end if;

  return jsonb_build_object('ok', true, 'mount_id', v_mount, 'quantity', v_qty);
end;
$$;

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

grant execute on function public.delivery_feed_unit_price(text) to anon, authenticated;
grant execute on function public.delivery_buy_food(text, int) to anon, authenticated;
grant execute on function public.delivery_consume_food(text) to anon, authenticated;
