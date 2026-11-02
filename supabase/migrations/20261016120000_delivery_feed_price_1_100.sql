-- Skate Drop: feed unit price $1–$100 per meal (scaled by animal store price)

create or replace function public.delivery_feed_unit_price(p_mount text)
returns int
language sql
stable
as $$
  select greatest(
    1,
    least(
      100,
      round(
        1 + (coalesce(p.price, 50) - 18.0) / (100000.0 - 18.0) * 99
      )::int
    )
  )
  from public.delivery_animal_prices p
  where p.mount_id = p_mount;
$$;
