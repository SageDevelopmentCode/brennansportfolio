-- Skate Drop: expanded animal catalog, mount speeds, variable delivery payouts

insert into public.delivery_animal_prices (mount_id, price) values
  ('squirrel', 102),
  ('hedgehog', 108),
  ('deer', 310),
  ('bald_eagle', 420),
  ('wolf', 520),
  ('bear', 680),
  ('moose', 750),
  ('seal', 820),
  ('walrus', 880),
  ('octopus', 920),
  ('dolphin', 1050),
  ('shark', 1250),
  ('tiger', 1350),
  ('lion', 1550),
  ('camel', 1650),
  ('bison', 1750),
  ('leopard', 1900),
  ('panda', 2050),
  ('gorilla', 2250),
  ('polar_bear', 2550),
  ('giant_squid', 4200),
  ('blue_whale', 9500),
  ('pegasus', 10500),
  ('phoenix', 15000),
  ('griffin', 25000),
  ('basilisk', 32000),
  ('hydra', 40000),
  ('kraken', 50000),
  ('dragon', 60000),
  ('leviathan', 75000),
  ('chimera', 88000),
  ('storm_serpent', 100000)
on conflict (mount_id) do update set price = excluded.price;

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
    when 'squirrel' then 8
    when 'hedgehog' then 5
    when 'deer' then 7
    when 'bald_eagle' then 9
    when 'wolf' then 9
    when 'bear' then 5
    when 'moose' then 6
    when 'seal' then 6
    when 'walrus' then 4
    when 'octopus' then 7
    when 'dolphin' then 9
    when 'shark' then 10
    when 'tiger' then 10
    when 'lion' then 9
    when 'camel' then 5
    when 'bison' then 6
    when 'leopard' then 10
    when 'panda' then 4
    when 'gorilla' then 7
    when 'polar_bear' then 6
    when 'giant_squid' then 5
    when 'blue_whale' then 3
    when 'pegasus' then 18
    when 'phoenix' then 11
    when 'griffin' then 10
    when 'basilisk' then 12
    when 'hydra' then 8
    when 'kraken' then 7
    when 'dragon' then 20
    when 'leviathan' then 6
    when 'chimera' then 17
    when 'storm_serpent' then 24
    else 5
  end;
$$;

create table if not exists public.delivery_credited_sources (
  source_id text primary key,
  credited_at timestamptz not null default now()
);

alter table public.delivery_credited_sources enable row level security;

drop policy if exists "Anyone can read delivery credited sources"
  on public.delivery_credited_sources;

create policy "Anyone can read delivery credited sources"
  on public.delivery_credited_sources for select
  to anon, authenticated
  using (true);

drop function if exists public.delivery_credit_deliveries(uuid[]);
drop function if exists public.delivery_credit_deliveries(text[]);

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
  v_balance int;
  v_max_per_pkg int := 500;
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

  if p_total is null or p_total < 0 or p_total > v_new_count * v_max_per_pkg then
    return jsonb_build_object('ok', false, 'code', 'invalid_total');
  end if;

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
  set balance = balance + p_total
  where id = 1
  returning balance into v_balance;

  if v_balance is null then
    insert into public.delivery_company_wallet (id, balance)
    values (1, p_total)
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

grant execute on function public.delivery_credit_deliveries(text[], int) to anon, authenticated;

notify pgrst, 'reload schema';
