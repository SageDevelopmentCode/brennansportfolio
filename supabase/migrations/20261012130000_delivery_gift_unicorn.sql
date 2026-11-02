-- Skate Drop: free unicorn gift (one per company)

create or replace function public.delivery_gift_unicorn()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.delivery_animal_prices where mount_id = 'unicorn'
  ) then
    return jsonb_build_object('ok', false, 'code', 'invalid_mount');
  end if;

  if exists (
    select 1 from public.delivery_owned_animals where mount_id = 'unicorn'
  ) then
    return jsonb_build_object('ok', false, 'code', 'already_owned');
  end if;

  insert into public.delivery_owned_animals (mount_id)
  values ('unicorn');

  return jsonb_build_object('ok', true, 'mount_id', 'unicorn');
end;
$$;

grant execute on function public.delivery_gift_unicorn() to anon, authenticated;
