-- Trade ledger for portfolio performance charts (logged on each paper_trade RPC call).
-- Existing holdings without trades can be backfilled in app code using EOD prices.

create table public.paper_trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  action text not null check (action in ('buy', 'sell')),
  shares integer not null check (shares > 0),
  price numeric(14, 4) not null check (price > 0),
  name text not null,
  traded_at timestamptz not null default now()
);

create index paper_trades_user_traded_at_idx
  on public.paper_trades (user_id, traded_at asc);

alter table public.paper_trades enable row level security;

create policy "Users can read own paper trades"
  on public.paper_trades
  for select
  to authenticated
  using (user_id = auth.uid());

-- Inserts only via security definer RPCs (paper_trade, paper_backfill_trades).

create or replace function public.paper_trade(
  p_action text,
  p_symbol text,
  p_shares integer,
  p_price numeric,
  p_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_action text;
  v_symbol text;
  v_name text;
  v_cost numeric(14, 2);
  v_cash numeric(14, 2);
  v_held integer;
  v_new_shares integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'code', 'not_authenticated');
  end if;

  v_action := lower(trim(coalesce(p_action, '')));
  v_symbol := upper(trim(coalesce(p_symbol, '')));
  v_name := left(trim(coalesce(p_name, v_symbol)), 120);

  if v_symbol = '' then
    return jsonb_build_object('ok', false, 'code', 'invalid_symbol');
  end if;

  if p_shares is null or p_shares < 1 then
    return jsonb_build_object('ok', false, 'code', 'invalid_shares');
  end if;

  if p_price is null or p_price <= 0 then
    return jsonb_build_object('ok', false, 'code', 'invalid_price');
  end if;

  insert into public.paper_portfolios (user_id, cash_balance)
  values (v_user_id, 100000)
  on conflict (user_id) do nothing;

  select cash_balance into v_cash
  from public.paper_portfolios
  where user_id = v_user_id
  for update;

  v_cost := round((p_shares * p_price)::numeric, 2);

  if v_action = 'buy' then
    if v_cash < v_cost then
      return jsonb_build_object('ok', false, 'code', 'insufficient_cash');
    end if;

    update public.paper_portfolios
    set cash_balance = cash_balance - v_cost
    where user_id = v_user_id
    returning cash_balance into v_cash;

    insert into public.paper_holdings (user_id, symbol, shares, name)
    values (v_user_id, v_symbol, p_shares, v_name)
    on conflict (user_id, symbol) do update
      set shares = paper_holdings.shares + excluded.shares,
          name = excluded.name;

    select shares into v_new_shares
    from public.paper_holdings
    where user_id = v_user_id and symbol = v_symbol;

    insert into public.paper_trades (user_id, symbol, action, shares, price, name)
    values (v_user_id, v_symbol, 'buy', p_shares, p_price, v_name);

    return jsonb_build_object(
      'ok', true,
      'cash_balance', v_cash,
      'shares', v_new_shares
    );
  elsif v_action = 'sell' then
    select shares into v_held
    from public.paper_holdings
    where user_id = v_user_id and symbol = v_symbol
    for update;

    if v_held is null or v_held < p_shares then
      return jsonb_build_object('ok', false, 'code', 'insufficient_shares');
    end if;

    update public.paper_portfolios
    set cash_balance = cash_balance + v_cost
    where user_id = v_user_id
    returning cash_balance into v_cash;

    v_new_shares := v_held - p_shares;
    if v_new_shares = 0 then
      delete from public.paper_holdings
      where user_id = v_user_id and symbol = v_symbol;
    else
      update public.paper_holdings
      set shares = v_new_shares
      where user_id = v_user_id and symbol = v_symbol;
    end if;

    insert into public.paper_trades (user_id, symbol, action, shares, price, name)
    values (v_user_id, v_symbol, 'sell', p_shares, p_price, v_name);

    return jsonb_build_object(
      'ok', true,
      'cash_balance', v_cash,
      'shares', case when v_new_shares = 0 then 0 else v_new_shares end
    );
  else
    return jsonb_build_object('ok', false, 'code', 'invalid_action');
  end if;
end;
$$;

-- Backfill synthetic buy rows for users who traded before the ledger existed.
create or replace function public.paper_backfill_trades(
  p_trades jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_existing integer;
  v_row jsonb;
  v_symbol text;
  v_shares integer;
  v_price numeric;
  v_name text;
  v_traded_at timestamptz;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'code', 'not_authenticated');
  end if;

  select count(*)::integer into v_existing
  from public.paper_trades
  where user_id = v_user_id;

  if v_existing > 0 then
    return jsonb_build_object('ok', true, 'inserted', 0);
  end if;

  if p_trades is null or jsonb_typeof(p_trades) <> 'array' then
    return jsonb_build_object('ok', false, 'code', 'invalid_trades');
  end if;

  for v_row in select * from jsonb_array_elements(p_trades)
  loop
    v_symbol := upper(trim(coalesce(v_row->>'symbol', '')));
    v_shares := (v_row->>'shares')::integer;
    v_price := (v_row->>'price')::numeric;
    v_name := left(trim(coalesce(v_row->>'name', v_symbol)), 120);
    v_traded_at := coalesce((v_row->>'traded_at')::timestamptz, '2026-09-30 16:00:00+00'::timestamptz);

    if v_symbol = '' or v_shares is null or v_shares < 1 or v_price is null or v_price <= 0 then
      continue;
    end if;

    insert into public.paper_trades (user_id, symbol, action, shares, price, name, traded_at)
    values (v_user_id, v_symbol, 'buy', v_shares, v_price, v_name, v_traded_at);
  end loop;

  return jsonb_build_object('ok', true, 'inserted', jsonb_array_length(p_trades));
end;
$$;

revoke all on function public.paper_backfill_trades(jsonb) from public;
grant execute on function public.paper_backfill_trades(jsonb) to authenticated;
