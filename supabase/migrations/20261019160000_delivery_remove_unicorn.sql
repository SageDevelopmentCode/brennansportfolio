-- Skate Drop: remove unicorn from store, ownership, and free-gift RPC

delete from public.delivery_skateboards where mount = 'unicorn';

delete from public.delivery_food_stock where mount_id = 'unicorn';

delete from public.delivery_owned_animals where mount_id = 'unicorn';

delete from public.delivery_animal_prices where mount_id = 'unicorn';

drop function if exists public.delivery_gift_unicorn();

notify pgrst, 'reload schema';
