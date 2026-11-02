-- Skate Drop: $1M per delivered package (client payout), raise credit cap

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
  v_max_per_pkg int := 1000000;
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
