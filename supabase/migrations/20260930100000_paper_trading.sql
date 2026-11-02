-- Paper trading for Ticker Tape (practice money, logged-in users)

create table public.paper_portfolios (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cash_balance numeric(14, 2) not null default 100000 check (cash_balance >= 0),
  created_at timestamptz not null default now()
);

create table public.paper_holdings (
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  shares integer not null check (shares > 0),
  name text not null,
  primary key (user_id, symbol)
);

alter table public.paper_portfolios enable row level security;
alter table public.paper_holdings enable row level security;

create policy "Users can read own paper portfolio"
  on public.paper_portfolios
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert own paper portfolio"
  on public.paper_portfolios
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own paper portfolio"
  on public.paper_portfolios
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can read own paper holdings"
  on public.paper_holdings
  for select
  to authenticated
  using (user_id = auth.uid());

create index paper_holdings_user_id_idx on public.paper_holdings (user_id);

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

revoke all on function public.paper_trade(text, text, integer, numeric, text) from public;
grant execute on function public.paper_trade(text, text, integer, numeric, text) to authenticated;
